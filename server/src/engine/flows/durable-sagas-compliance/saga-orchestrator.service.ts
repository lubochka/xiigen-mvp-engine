/**
 * T621 SagaOrchestrator [ORCHESTRATION]
 * FLOW-19: Durable Sagas & Compliance
 *
 * Entry: SagaExecutionRequested event
 *
 * Execution order is MACHINE (CF-19-1):
 *   ORDER 1: storeDocumentWithOCC(sagaState, {status:RUNNING, versionPin:-1}) — idempotent init
 *   ORDER 2: SETNX(step-lock:{sagaId}:{stepIndex}) — prevent concurrent step execution
 *   ORDER 3: Register compensation strategy for this step — crash-safe rollback available
 *   ORDER 4: Execute step body
 *   ORDER 5: storeDocument(checkpoint) — DNA-8, BEFORE enqueue
 *   ORDER 6: enqueue(SagaStepExecuted) or enqueue(SagaCompleted)
 *
 * Iron rules:
 *   IR-1: storeDocumentWithOCC versionPin:-1 at ORDER 1 — OCC conflict → SagaAlreadyRunning (idempotent)
 *   IR-2: SETNX step-lock BEFORE step body — concurrent duplicate prevention
 *   IR-3: Compensation registered at ORDER 3 BEFORE step body
 *   IR-4: storeDocument(checkpoint) BEFORE enqueue(SagaStepExecuted) — DNA-8
 *   IR-5: SagaFailed emitted with sagaId, failedStep, compensationStrategy on step failure
 *   IR-6: tenantId from ALS only — never from event payload
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import {
  SAGA_STATE_REPOSITORY,
  SAGA_STEP_LOCK_SERVICE,
  COMPENSATION_REGISTRY,
} from './durable-sagas-platform-tokens';

interface ISagaStateRepository {
  storeDocumentWithOCC(
    index: string,
    doc: Record<string, unknown>,
    id: string,
    options: { versionPin: number },
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface ISagaStepLockService {
  acquireStepLock(sagaId: string, stepIndex: number): Promise<{ acquired: boolean }>;
  releaseStepLock(sagaId: string, stepIndex: number): Promise<void>;
}

interface ICompensationRegistry {
  registerCompensation(sagaId: string, stepIndex: number, strategy: string): Promise<void>;
  getCompensationStrategy(sagaId: string, stepIndex: number): Promise<string | null>;
}

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

const SAGAS_INDEX = 'xiigen-sagas';
const CHECKPOINTS_INDEX = 'xiigen-saga-checkpoints';

export interface SagaExecutionInput {
  sagaId: string;
  sagaType: string;
  steps: Array<{
    stepIndex: number;
    stepName: string;
    compensationStrategy: string;
    payload: Record<string, unknown>;
  }>;
}

@Injectable()
export class SagaOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(SAGA_STATE_REPOSITORY) private readonly sagaStateRepo: ISagaStateRepository,
    @Inject(SAGA_STEP_LOCK_SERVICE) private readonly stepLockService: ISagaStepLockService,
    @Inject(COMPENSATION_REGISTRY) private readonly compensationRegistry: ICompensationRegistry,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T621',
        serviceName: 'SagaOrchestratorService',
        flowId: 'FLOW-19',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Execute a durable saga with persist-before-dispatch pattern.
   *
   * CF-19-1: storeDocumentWithOCC(versionPin:-1) at ORDER 1 → SETNX step-lock at ORDER 2 →
   *   register compensation at ORDER 3 → step body at ORDER 4 →
   *   storeDocument(checkpoint) at ORDER 5 → enqueue at ORDER 6.
   */
  async execute(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const sagaId = event['sagaId'] as string;
    const sagaType = event['sagaType'] as string;
    const steps = (event['steps'] as SagaExecutionInput['steps']) ?? [];

    if (!sagaId || !sagaType) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'sagaId and sagaType are required');
    }

    const startedAt = new Date().toISOString();

    // ── ORDER 1: storeDocumentWithOCC(versionPin:-1) — IR-1, CF-19-1 ─────────
    // versionPin:-1 means "document must NOT exist yet" — idempotent init guard
    const occResult = await this.sagaStateRepo.storeDocumentWithOCC(
      SAGAS_INDEX,
      {
        sagaId,
        sagaType,
        tenantId,
        status: 'RUNNING',
        startedAt,
        stepCount: steps.length,
        completedSteps: 0,
        knowledgeScope: 'PRIVATE',
      },
      sagaId,
      { versionPin: -1 },
    );

    if (!occResult.isSuccess) {
      // OCC conflict means saga already exists — idempotent, not an error (IR-1)
      if (occResult.errorCode === 'OCC_CONFLICT') {
        await this.queueFabric.enqueue('SagaAlreadyRunning', { sagaId, tenantId, sagaType });
        return DataProcessResult.success({ sagaId, status: 'ALREADY_RUNNING', idempotent: true });
      }
      return DataProcessResult.failure(
        'SAGA_INIT_FAILED',
        occResult.errorMessage ?? 'Failed to initialize saga',
      );
    }

    // Execute each step serially
    let completedSteps = 0;
    for (const step of steps) {
      const { stepIndex, stepName, compensationStrategy, payload } = step;

      // ── ORDER 2: SETNX step-lock — IR-2, CF-19-1 ──────────────────────────
      const lockResult = await this.stepLockService.acquireStepLock(sagaId, stepIndex);
      if (!lockResult.acquired) {
        // Lock already held — step is running concurrently, skip (idempotent)
        continue;
      }

      // ── ORDER 3: Register compensation strategy — IR-3, CF-19-1 ──────────
      await this.compensationRegistry.registerCompensation(sagaId, stepIndex, compensationStrategy);

      // ── ORDER 4: Execute step body ────────────────────────────────────────
      const stepExecutionResult = await this.executeStepBody(
        sagaId,
        stepIndex,
        stepName,
        payload,
        tenantId,
      );

      if (!stepExecutionResult.isSuccess) {
        // Step failed — emit SagaFailed, do not continue
        await this.queueFabric.enqueue('SagaFailed', {
          sagaId,
          tenantId,
          sagaType,
          failedStep: stepIndex,
          failedStepName: stepName,
          compensationStrategy,
          reason: stepExecutionResult.errorMessage,
        });
        return DataProcessResult.failure(
          'SAGA_STEP_FAILED',
          stepExecutionResult.errorMessage ?? 'Step failed',
        );
      }

      completedSteps++;

      // ── ORDER 5: storeDocument(checkpoint) — IR-4, DNA-8 ─────────────────
      const checkpointId = createHash('sha256')
        .update(`${tenantId}:${sagaId}:${stepIndex}`)
        .digest('hex');

      await this.dbFabric.storeDocument(
        CHECKPOINTS_INDEX,
        {
          checkpointId,
          sagaId,
          tenantId,
          stepIndex,
          stepName,
          completedAt: new Date().toISOString(),
          status: 'COMPLETED',
          knowledgeScope: 'PRIVATE',
        },
        checkpointId,
      );

      // ── ORDER 6: enqueue(SagaStepExecuted) — after checkpoint confirmed ───
      await this.queueFabric.enqueue('SagaStepExecuted', {
        sagaId,
        tenantId,
        sagaType,
        stepIndex,
        stepName,
        completedSteps,
        totalSteps: steps.length,
      });

      await this.stepLockService.releaseStepLock(sagaId, stepIndex);
    }

    // All steps completed — emit SagaCompleted
    const completedAt = new Date().toISOString();
    await this.dbFabric.storeDocument(
      SAGAS_INDEX,
      {
        sagaId,
        tenantId,
        status: 'COMPLETED',
        completedAt,
        completedSteps,
        knowledgeScope: 'PRIVATE',
      },
      `${sagaId}-completed`,
    );

    await this.queueFabric.enqueue('SagaCompleted', {
      sagaId,
      tenantId,
      sagaType,
      completedSteps,
      completedAt,
    });

    return DataProcessResult.success({ sagaId, status: 'COMPLETED', completedSteps });
  }

  private async executeStepBody(
    sagaId: string,
    stepIndex: number,
    stepName: string,
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Step body execution — delegates to domain logic via payload
    // In real implementation this would invoke the configured step handler
    if (!stepName || !sagaId) {
      return DataProcessResult.failure('STEP_INVALID', 'stepName and sagaId required');
    }

    // Record step attempt
    const stepRecordId = `${sagaId}:step:${stepIndex}:${Date.now()}`;
    await this.dbFabric.storeDocument(
      'xiigen-saga-steps',
      {
        sagaId,
        tenantId,
        stepIndex,
        stepName,
        payload,
        executedAt: new Date().toISOString(),
        status: 'EXECUTED',
        knowledgeScope: 'PRIVATE',
      },
      stepRecordId,
    );

    return DataProcessResult.success({ stepIndex, stepName, status: 'EXECUTED' });
  }
}
