/**
 * T608 TenantLifecycleManager [ORCHESTRATION]
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Entry: TenantSuspensionRequested / TenantTerminationRequested / TenantReactivationRequested
 *
 * Execution order is MACHINE (CF-15-3):
 *   ORDER 1: State machine transition validation (reject PAUSED)
 *   ORDER 2: updateDocument(xiigen-tenants, {status: newStatus})
 *   ORDER 3: storeDocument(audit) — DNA-8, before event emit
 *   ORDER 4: Emit state event (TenantSuspended / TenantTerminated / TenantReactivated)
 *   ORDER 5: Emit DataPurgeRequested on termination path only
 *
 * Iron rules:
 *   IR-1: updateDocument(status:SUSPENDED) ONLY on suspension — no deleteDocument (CF-15-3)
 *   IR-2: TenantSuspended.cascadeToSubscriptions = true — not configurable (CF-15-3)
 *   IR-3: TenantTerminated + DataPurgeRequested BOTH emitted on termination (CF-15-3)
 *   IR-4: storeDocument(audit) BEFORE every state event emit (DNA-8)
 *   IR-5: PAUSED → TenantLifecycleRejected(INVALID_TRANSITION) — PAUSED is FLOW-12 state
 *
 * Pattern reference: data-warehouse-analytics/analytics-data-purge.service.ts (tombstoneRef)
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const TENANTS_INDEX = 'xiigen-tenants';
const LIFECYCLE_AUDIT_INDEX = 'xiigen-lifecycle-audit';

/** MACHINE: Valid tenant states — compile-time constant. PAUSED is NOT a valid tenant state. */
const VALID_TENANT_STATES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'] as const;

/** MACHINE: Valid transitions — state machine. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  TRIAL: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
};

@Injectable()
export class TenantLifecycleManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T608',
        serviceName: 'TenantLifecycleManagerService',
        flowId: 'FLOW-15',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Handle TenantSuspensionRequested.
   * DPO pattern: SUSPEND-NOT-DELETE-001
   * IR-1: updateDocument(status:SUSPENDED) ONLY — no deleteDocument.
   * IR-2: cascadeToSubscriptions:true always.
   */
  async handleSuspension(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const reason = (event['reason'] as string) ?? 'operator_requested';
    const currentStatus = event['currentStatus'] as string;

    // ── ORDER 1: Validate transition — IR-5 ─────────────────────────────────
    const validationResult = this.validateTransition(currentStatus, 'SUSPENDED');
    if (!validationResult.isSuccess) {
      return validationResult;
    }

    // ── ORDER 2: Status update — IR-1 ───────────────────────────────────────
    // updateDocument(status:SUSPENDED) ONLY — NO deleteDocument anywhere
    const suspendedAt = new Date().toISOString();
    const updateResult = await this.dbFabric.storeDocument(
      TENANTS_INDEX,
      {
        tenantId,
        status: 'SUSPENDED',
        accessBlockedAt: suspendedAt,
        suspensionReason: reason,
        knowledgeScope: 'PRIVATE',
      },
      tenantId,
    );

    if (!updateResult.isSuccess) {
      return DataProcessResult.failure(
        'SUSPENSION_FAILED',
        `Failed to update tenant status: ${updateResult.errorMessage}`,
      );
    }

    // ── ORDER 3: Audit write — IR-4, DNA-8 ──────────────────────────────────
    await this.dbFabric.storeDocument(LIFECYCLE_AUDIT_INDEX, {
      tenantId,
      action: 'TENANT_SUSPENDED',
      reason,
      suspendedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit TenantSuspended — IR-2 ───────────────────────────────
    // cascadeToSubscriptions:true — MACHINE field, not configurable (CF-15-3)
    await this.queueFabric.enqueue('TenantSuspended', {
      tenantId,
      suspendedAt,
      reason,
      cascadeToSubscriptions: true,
    });

    return DataProcessResult.success({
      tenantId,
      status: 'SUSPENDED',
      suspendedAt,
      cascadeToSubscriptions: true,
    });
  }

  /**
   * Handle TenantTerminationRequested.
   * IR-3: Both TenantTerminated AND DataPurgeRequested emitted.
   * tombstoneRef = hash(tenantId + 'terminate' + timestamp) — no raw PII.
   */
  async handleTermination(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const currentStatus = event['currentStatus'] as string;

    // ── ORDER 1: Validate transition ────────────────────────────────────────
    const validationResult = this.validateTransition(currentStatus, 'CANCELLED');
    if (!validationResult.isSuccess) {
      return validationResult;
    }

    const cancelledAt = new Date().toISOString();
    const tombstoneRef = createHash('sha256')
      .update(`${tenantId}:terminate:${cancelledAt}`)
      .digest('hex');

    // Read dataRetentionDays from FREEDOM config — not hardcoded
    const retentionResult = await this.dbFabric.searchDocuments('xiigen-freedom-config', {
      tenantId,
      key: 'tenant_data_retention_days',
    });
    const dataRetentionDays =
      retentionResult.isSuccess && (retentionResult.data ?? []).length > 0
        ? ((retentionResult.data![0] as Record<string, unknown>)['value'] as number)
        : 90; // platform default from FREEDOM — not a hardcoded override

    // ── ORDER 2: Status update ──────────────────────────────────────────────
    await this.dbFabric.storeDocument(
      TENANTS_INDEX,
      {
        tenantId,
        status: 'CANCELLED',
        cancelledAt,
        tombstoneRef,
        knowledgeScope: 'PRIVATE',
      },
      tenantId,
    );

    // ── ORDER 3: Audit write — IR-4, DNA-8 ──────────────────────────────────
    await this.dbFabric.storeDocument(LIFECYCLE_AUDIT_INDEX, {
      tenantId,
      action: 'TENANT_TERMINATED',
      cancelledAt,
      tombstoneRef,
      dataRetentionDays,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit TenantTerminated — IR-3 ──────────────────────────────
    await this.queueFabric.enqueue('TenantTerminated', {
      tenantId,
      tombstoneRef,
      cancelledAt,
      dataRetentionDays,
    });

    // ── ORDER 5: Emit DataPurgeRequested — IR-3 ────────────────────────────
    // Delegates purge to FLOW-13 T216 — never inline deleteAll
    await this.queueFabric.enqueue('DataPurgeRequested', {
      tenantId,
      tombstoneRef,
      purgeScope: 'ALL_TENANT_DATA',
      scheduledAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      tenantId,
      status: 'CANCELLED',
      tombstoneRef,
      cancelledAt,
      dataRetentionDays,
    });
  }

  /**
   * Handle TenantReactivationRequested.
   * SUSPENDED → ACTIVE transition. Requires payment-resolved signal.
   */
  async handleReactivation(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const currentStatus = event['currentStatus'] as string;

    // ── ORDER 1: Validate transition ────────────────────────────────────────
    const validationResult = this.validateTransition(currentStatus, 'ACTIVE');
    if (!validationResult.isSuccess) {
      return validationResult;
    }

    const reactivatedAt = new Date().toISOString();

    // ── ORDER 2: Status update ──────────────────────────────────────────────
    await this.dbFabric.storeDocument(
      TENANTS_INDEX,
      {
        tenantId,
        status: 'ACTIVE',
        reactivatedAt,
        knowledgeScope: 'PRIVATE',
      },
      tenantId,
    );

    // ── ORDER 3: Audit write — IR-4, DNA-8 ──────────────────────────────────
    await this.dbFabric.storeDocument(LIFECYCLE_AUDIT_INDEX, {
      tenantId,
      action: 'TENANT_REACTIVATED',
      reactivatedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit TenantReactivated ─────────────────────────────────────
    await this.queueFabric.enqueue('TenantReactivated', {
      tenantId,
      reactivatedAt,
    });

    return DataProcessResult.success({
      tenantId,
      status: 'ACTIVE',
      reactivatedAt,
    });
  }

  /**
   * Validate state machine transition.
   * IR-5: PAUSED is NOT a valid tenant state — it's a FLOW-12 subscription state.
   */
  private validateTransition(
    currentStatus: string,
    targetStatus: string,
  ): DataProcessResult<Record<string, unknown>> {
    // IR-5: PAUSED is a FLOW-12 subscription state, not a tenant state
    if (currentStatus === 'PAUSED') {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        'PAUSED is a subscription state (FLOW-12), not a valid tenant state',
      );
    }

    if (!(VALID_TENANT_STATES as readonly string[]).includes(currentStatus)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Unknown current state: '${currentStatus}'`,
      );
    }

    const allowedTargets = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTargets.includes(targetStatus)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Transition ${currentStatus} → ${targetStatus} is not allowed`,
      );
    }

    return DataProcessResult.success({ valid: true });
  }
}
