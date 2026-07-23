/**
 * T622 CompensationEngine [ORCHESTRATION]
 * FLOW-19: Durable Sagas & Compliance
 *
 * Entry: SagaFailed event (T621 delegates compensation to this service)
 *
 * Execution order is MACHINE (CF-19-2):
 *   For each step in REVERSED compensationStack (LIFO):
 *   ORDER 1: SETNX(comp-lock:{sagaId}:{stepIndex}) — idempotent crash restart
 *   ORDER 2: Execute compensation body
 *   ORDER 3: storeDocument(compensationRecord) — DNA-8, BEFORE emit
 *   ORDER 4: enqueue(CompensationStepExecuted) — after persist
 *   On failure: emit CompensationFailed with failedStep and HALT
 *
 * Iron rules:
 *   IR-1: LIFO reverse order — compensationStack reversed before iteration
 *   IR-2: Serial execution — no Promise.all, no concurrent compensation
 *   IR-3: SETNX comp-lock:{sagaId}:{stepIndex} per step before compensation body
 *   IR-4: stop-on-first-failure — emit CompensationFailed with failedStep, HALT
 *   IR-5: storeDocument(compensationRecord) BEFORE enqueue per step — DNA-8
 *   IR-6: compensationStack immutable — no modifications during execution
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { SAGA_STEP_LOCK_SERVICE, COMPENSATION_REGISTRY } from './durable-sagas-platform-tokens';

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

const COMPENSATIONS_INDEX = 'xiigen-saga-compensations';

export interface CompensationInput {
  sagaId: string;
  sagaType: string;
  failedStep: number;
  compensationStack: Array<{
    stepIndex: number;
    stepName: string;
    strategy: string;
    payload: Record<string, unknown>;
  }>;
}

@Injectable()
export class CompensationEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(SAGA_STEP_LOCK_SERVICE) private readonly stepLockService: ISagaStepLockService,
    @Inject(COMPENSATION_REGISTRY) private readonly compensationRegistry: ICompensationRegistry,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T622',
        serviceName: 'CompensationEngineService',
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
   * Execute compensations in serial LIFO (reverse) order.
   *
   * CF-19-2: reversed compensationStack (LIFO); serial loop (no Promise.all);
   *   SETNX comp-lock:{sagaId}:{stepIndex} per step; stop-on-first-failure;
   *   storeDocument(compensationRecord) BEFORE enqueue per step (DNA-8).
   */
  async compensate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const sagaId = event['sagaId'] as string;
    const sagaType = event['sagaType'] as string;
    const rawStack = (event['compensationStack'] as CompensationInput['compensationStack']) ?? [];

    if (!sagaId) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'sagaId is required');
    }

    if (rawStack.length === 0) {
      // No compensation steps — emit empty CompensationCompleted
      await this.queueFabric.enqueue('CompensationCompleted', {
        sagaId,
        tenantId,
        sagaType,
        compensatedSteps: 0,
      });
      return DataProcessResult.success({ sagaId, compensatedSteps: 0 });
    }

    // ── IR-1: LIFO reverse order — immutable copy reversed ────────────────────
    // IR-6: compensationStack must not be mutated during execution
    const reversedStack = [...rawStack].reverse();

    let compensatedSteps = 0;

    // ── IR-2: Serial execution — for...of loop (not Promise.all) ─────────────
    for (const step of reversedStack) {
      const { stepIndex, stepName, strategy, payload } = step;

      // ── ORDER 1 (per step): SETNX comp-lock — IR-3, CF-19-2 ────────────────
      const lockResult = await this.stepLockService.acquireStepLock(sagaId, -(stepIndex + 1));
      if (!lockResult.acquired) {
        // Compensation lock already held — this step was already compensated (idempotent restart)
        compensatedSteps++;
        continue;
      }

      // ── ORDER 2 (per step): Execute compensation body ──────────────────────
      const compResult = await this.executeCompensationBody(
        sagaId,
        stepIndex,
        stepName,
        strategy,
        payload,
        tenantId,
      );

      if (!compResult.isSuccess) {
        // ── IR-4: stop-on-first-failure — emit CompensationFailed, HALT ───────
        await this.queueFabric.enqueue('CompensationFailed', {
          sagaId,
          tenantId,
          sagaType,
          failedStep: stepIndex,
          failedStepName: stepName,
          reason: compResult.errorMessage,
          compensatedStepsSoFar: compensatedSteps,
        });
        return DataProcessResult.failure(
          'COMPENSATION_STEP_FAILED',
          compResult.errorMessage ?? 'Compensation step failed',
        );
      }

      compensatedSteps++;

      // ── ORDER 3 (per step): storeDocument(compensationRecord) — IR-5, DNA-8 ─
      const compRecordId = `comp:${sagaId}:${stepIndex}:${Date.now()}`;
      await this.dbFabric.storeDocument(
        COMPENSATIONS_INDEX,
        {
          compRecordId,
          sagaId,
          tenantId,
          stepIndex,
          stepName,
          strategy,
          compensatedAt: new Date().toISOString(),
          status: 'COMPENSATED',
          knowledgeScope: 'PRIVATE',
        },
        compRecordId,
      );

      // ── ORDER 4 (per step): enqueue(CompensationStepExecuted) — after persist ─
      await this.queueFabric.enqueue('CompensationStepExecuted', {
        sagaId,
        tenantId,
        sagaType,
        stepIndex,
        stepName,
        compensatedSteps,
        totalSteps: rawStack.length,
      });

      await this.stepLockService.releaseStepLock(sagaId, -(stepIndex + 1));
    }

    // All steps compensated — emit CompensationCompleted
    const completedAt = new Date().toISOString();
    await this.dbFabric.storeDocument(
      COMPENSATIONS_INDEX,
      {
        sagaId,
        tenantId,
        sagaType,
        status: 'COMPENSATION_COMPLETED',
        completedAt,
        compensatedSteps,
        knowledgeScope: 'PRIVATE',
      },
      `${sagaId}-comp-completed`,
    );

    await this.queueFabric.enqueue('CompensationCompleted', {
      sagaId,
      tenantId,
      sagaType,
      compensatedSteps,
      completedAt,
    });

    return DataProcessResult.success({
      sagaId,
      status: 'COMPENSATION_COMPLETED',
      compensatedSteps,
    });
  }

  private async executeCompensationBody(
    sagaId: string,
    stepIndex: number,
    stepName: string,
    strategy: string,
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!sagaId || !strategy) {
      return DataProcessResult.failure('COMP_INVALID', 'sagaId and strategy required');
    }

    // Verify strategy is registered before executing
    const registeredStrategy = await this.compensationRegistry.getCompensationStrategy(
      sagaId,
      stepIndex,
    );
    if (!registeredStrategy) {
      return DataProcessResult.failure(
        'COMPENSATION_NOT_REGISTERED',
        `No compensation registered for sagaId=${sagaId} stepIndex=${stepIndex}`,
      );
    }

    // Execute compensation via database record (no direct HTTP — Rule 11)
    const execId = `comp-exec:${sagaId}:${stepIndex}:${Date.now()}`;
    await this.dbFabric.storeDocument(
      'xiigen-saga-compensation-executions',
      {
        execId,
        sagaId,
        tenantId,
        stepIndex,
        stepName,
        strategy,
        payload,
        executedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      execId,
    );

    return DataProcessResult.success({ stepIndex, stepName, strategy, status: 'COMPENSATED' });
  }
}
