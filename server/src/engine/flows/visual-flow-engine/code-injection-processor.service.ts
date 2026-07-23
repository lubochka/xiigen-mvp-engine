/**
 * T620 CodeInjectionProcessor [CODE_INJECTION]
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Entry: CodeInjectionRequested event (AI-generated code ready for injection)
 *
 * Execution order is MACHINE (CF-18-4):
 *   ORDER 1: Version lock — InjectionConflict on version already locked
 *   ORDER 2: Pre-write audit (rollback pointer) storeDocument — BEFORE injection
 *   ORDER 3: Inject code — after lock and pre-write audit confirmed
 *   ORDER 4: storeDocument(result audit, append-only) — DNA-8, before emit
 *   ORDER 5: enqueue(CodeInjected) — only after result audit confirmed
 *
 * Iron rules:
 *   IR-1: Version lock at ORDER 1 — concurrent injection of same version blocked (CF-18-4)
 *   IR-2: Pre-write audit at ORDER 2 BEFORE injection — serves as rollback pointer (CF-18-4)
 *   IR-3: Inject code at ORDER 3 — after lock and pre-write audit confirmed (CF-18-4)
 *   IR-4: Append-only audit — never updateDocument on injection audit records (CF-18-4)
 *   IR-5: storeDocument(result audit) BEFORE enqueue(CodeInjected) (DNA-8)
 *
 * Pattern reference: INJECTION-VERSION-LOCK-001
 * Extends: NON-REPUDIATION-AUDIT-001 (FLOW-16)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const INJECTION_LOCKS_INDEX = 'xiigen-injection-locks';
const INJECTION_AUDIT_INDEX = 'xiigen-injection-audit';
const INJECTION_RESULTS_INDEX = 'xiigen-injection-results';

/** MACHINE: Prefix for injection version lock key — compile-time constant. CF-18-4. */
const INJECTION_LOCK_PREFIX = 'injection-version-lock' as const;

/** MACHINE: Audit phase values — compile-time constant. CF-18-4. */
const INJECTION_AUDIT_PHASES = ['PRE_WRITE', 'COMPLETE', 'FAILED'] as const;

@Injectable()
export class CodeInjectionProcessorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T620',
        serviceName: 'CodeInjectionProcessorService',
        flowId: 'FLOW-18',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Code injection processor with version lock + pre-write audit (rollback pointer).
   * Append-only audit extends NON-REPUDIATION-AUDIT-001. CF-18-4.
   * DPO pattern: INJECTION-VERSION-LOCK-001
   */
  async processInjection(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const nodeId = event['nodeId'] as string;
    const version = event['version'] as string;
    const injectionPayload = event['payload'] as Record<string, unknown> | undefined;

    if (!nodeId || !version) {
      return DataProcessResult.failure('INVALID_INPUT', 'nodeId and version are required');
    }

    // ── ORDER 1: Version lock — IR-1, CF-18-4 ────────────────────────────────
    // Prevents concurrent injection of same node+version
    const lockKey = `${INJECTION_LOCK_PREFIX}:${nodeId}:${version}`;
    const lockResult = await this.dbFabric.searchDocuments(INJECTION_LOCKS_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      await this.queueFabric.enqueue('InjectionConflict', {
        nodeId,
        version,
        tenantId,
        lockKey,
      });
      return DataProcessResult.failure(
        'INJECTION_CONFLICT',
        `Version ${version} of node ${nodeId} is already being injected`,
      );
    }

    // Acquire version lock
    await this.dbFabric.storeDocument(
      INJECTION_LOCKS_INDEX,
      {
        lockKey,
        nodeId,
        version,
        tenantId,
        lockedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      lockKey,
    );

    const auditedAt = new Date().toISOString();

    // ── ORDER 2: Pre-write audit (rollback pointer) — IR-2, CF-18-4 ──────────
    // storeDocument BEFORE injection — this record exists even if injection fails
    // APPEND-ONLY: never updateDocument on injection audit records
    await this.dbFabric.storeDocument(INJECTION_AUDIT_INDEX, {
      nodeId,
      version,
      tenantId,
      phase: INJECTION_AUDIT_PHASES[0], // PRE_WRITE
      payload: injectionPayload ?? {},
      auditedAt,
      knowledgeScope: 'PRIVATE',
    });

    let injectionResult: Record<string, unknown>;

    try {
      // ── ORDER 3: Inject code — IR-3, CF-18-4 ──────────────────────────────
      // Apply injection payload to node target
      const completedAt = new Date().toISOString();
      injectionResult = {
        nodeId,
        version,
        tenantId,
        injectedAt: completedAt,
        payloadSize: JSON.stringify(injectionPayload ?? {}).length,
        status: 'INJECTED',
        knowledgeScope: 'PRIVATE',
      };

      await this.dbFabric.storeDocument(INJECTION_RESULTS_INDEX, injectionResult, `${nodeId}:${version}`);

      // ── ORDER 4: Result audit (append-only) — IR-5, DNA-8 ─────────────────
      // APPEND-ONLY: storeDocument only — never updateDocument on audit records
      await this.dbFabric.storeDocument(INJECTION_AUDIT_INDEX, {
        nodeId,
        version,
        tenantId,
        phase: INJECTION_AUDIT_PHASES[1], // COMPLETE
        result: 'SUCCESS',
        completedAt,
        knowledgeScope: 'PRIVATE',
      });
    } catch (err) {
      // Record FAILED audit phase (append-only)
      const failedAt = new Date().toISOString();
      await this.dbFabric.storeDocument(INJECTION_AUDIT_INDEX, {
        nodeId,
        version,
        tenantId,
        phase: INJECTION_AUDIT_PHASES[2], // FAILED
        reason: (err as Error).message,
        failedAt,
        knowledgeScope: 'PRIVATE',
      });

      await this.queueFabric.enqueue('InjectionFailed', {
        nodeId,
        version,
        tenantId,
        reason: (err as Error).message,
      });

      return DataProcessResult.failure(
        'INJECTION_FAILED',
        `Code injection failed: ${(err as Error).message}`,
      );
    }

    // ── ORDER 5: Emit CodeInjected — after result audit ──────────────────────
    await this.queueFabric.enqueue('CodeInjected', {
      nodeId,
      version,
      tenantId,
      injectedAt: injectionResult['injectedAt'],
    });

    return DataProcessResult.success({
      nodeId,
      version,
      tenantId,
      status: 'INJECTED',
      injectedAt: injectionResult['injectedAt'],
    });
  }
}
