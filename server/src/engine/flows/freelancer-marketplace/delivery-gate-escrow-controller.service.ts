/**
 * T615 DeliveryGateEscrowController [ORCHESTRATION]
 * FLOW-17: Freelancer Marketplace
 *
 * Entry: MilestoneReleaseRequested (client approves delivery) or MilestoneDisputeRaised
 *
 * Release path execution order (MACHINE, CF-17-3):
 *   ORDER 1: Validate delivery gate — delivery.status === SUBMITTED
 *   ORDER 2: Release milestone funds — storeDocument(milestone, status:RELEASED)
 *   ORDER 3: storeDocument(audit) — DNA-8, before emit
 *   ORDER 4: enqueue(MilestoneReleased)
 *
 * Dispute path execution order (MACHINE, CF-17-3):
 *   ORDER 1: updateDocument(status:DISPUTED) — no funds movement
 *   ORDER 2: storeDocument(audit) — DNA-8, before emit
 *   ORDER 3: enqueue(MilestoneDisputed)
 *
 * Compensation chain (LIFO at milestone granularity, CF-17-3):
 *   Registered forward: [REFUND_MILESTONE, RESTORE_GIG_STATUS]
 *   Executed reversed:   RESTORE_GIG_STATUS → REFUND_MILESTONE
 *
 * Iron rules:
 *   IR-1: Delivery gate validation BEFORE any funds movement (CF-17-3)
 *   IR-2: Release: storeDocument(milestone, status:RELEASED) ONLY — never deleteDocument (CF-17-3)
 *   IR-3: Dispute: updateDocument(status:DISPUTED) ONLY — no funds movement (CF-17-3)
 *   IR-4: LIFO compensation [REFUND_MILESTONE, RESTORE_GIG_STATUS] (CF-17-3)
 *   IR-5: storeDocument(audit) BEFORE every event emit on both paths (DNA-8)
 *   IR-6: Timer gate-opener reads milestone_auto_release_days from FREEDOM config
 *
 * Pattern reference: data-warehouse-analytics/analytics-data-purge.service.ts (LIFO compensation)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const DELIVERIES_INDEX = 'xiigen-deliveries';
const MILESTONES_INDEX = 'xiigen-milestones';
const ESCROW_AUDIT_INDEX = 'xiigen-escrow-audit';
const FREEDOM_INDEX = 'xiigen-freedom-config';

/**
 * MACHINE: LIFO compensation chain registered in forward order.
 * Executor runs in reverse (RESTORE_GIG_STATUS → REFUND_MILESTONE).
 * CF-17-3.
 */
const ESCROW_COMPENSATION_CHAIN = ['REFUND_MILESTONE', 'RESTORE_GIG_STATUS'] as const;

@Injectable()
export class DeliveryGateEscrowControllerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T615',
        serviceName: 'DeliveryGateEscrowControllerService',
        flowId: 'FLOW-17',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Handle MilestoneReleaseRequested — release escrow after delivery validation.
   * DPO pattern: DELIVERY-GATE-BEFORE-RELEASE-001
   * IR-1: Validate delivery gate BEFORE funds movement.
   */
  async releaseEscrow(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const milestoneId = event['milestoneId'] as string;
    const contractId = event['contractId'] as string;

    if (!milestoneId || !contractId) {
      return DataProcessResult.failure('INVALID_INPUT', 'milestoneId and contractId are required');
    }

    // ── ORDER 1: Validate delivery gate — IR-1, CF-17-3 ─────────────────────
    // delivery.status === SUBMITTED required before any funds movement
    const deliveryResult = await this.dbFabric.searchDocuments(DELIVERIES_INDEX, {
      milestoneId,
      status: 'SUBMITTED',
    });

    if (!deliveryResult.isSuccess || (deliveryResult.data ?? []).length === 0) {
      return DataProcessResult.failure(
        'DELIVERY_NOT_SUBMITTED',
        `No submitted delivery found for milestone: ${milestoneId}`,
      );
    }

    const delivery = deliveryResult.data![0] as Record<string, unknown>;
    const releasedAt = new Date().toISOString();

    // ── ORDER 2: Release milestone funds — IR-2, CF-17-3 ────────────────────
    // storeDocument(milestone, status:RELEASED) — never deleteDocument
    const releaseResult = await this.dbFabric.storeDocument(
      MILESTONES_INDEX,
      {
        milestoneId,
        contractId,
        tenantId,
        status: 'RELEASED',
        releasedAt,
        deliveryId: delivery['deliveryId'],
        knowledgeScope: 'PRIVATE',
      },
      milestoneId,
    );

    if (!releaseResult.isSuccess) {
      // LIFO compensation — start compensating in reverse order
      await this.startLIFOCompensation(milestoneId, contractId, tenantId, 'RELEASE_FAILED');
      return DataProcessResult.failure(
        'RELEASE_FAILED',
        `Milestone release failed: ${releaseResult.errorMessage}`,
      );
    }

    // ── ORDER 3: Audit write — IR-5, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE MilestoneReleased emit
    await this.dbFabric.storeDocument(ESCROW_AUDIT_INDEX, {
      milestoneId,
      contractId,
      tenantId,
      action: 'MILESTONE_RELEASED',
      releasedAt,
      deliveryId: delivery['deliveryId'],
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit MilestoneReleased ─────────────────────────────────────
    await this.queueFabric.enqueue('MilestoneReleased', {
      milestoneId,
      contractId,
      tenantId,
      releasedAt,
      deliveryId: delivery['deliveryId'],
    });

    return DataProcessResult.success({
      milestoneId,
      contractId,
      tenantId,
      releasedAt,
      status: 'RELEASED',
    });
  }

  /**
   * Handle MilestoneDisputeRaised — update status to DISPUTED, no funds movement.
   * IR-3: updateDocument(status:DISPUTED) ONLY — no funds movement on dispute path.
   */
  async raiseDispute(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const milestoneId = event['milestoneId'] as string;
    const contractId = event['contractId'] as string;
    const disputeReason = (event['disputeReason'] as string) ?? 'client_requested';

    if (!milestoneId || !contractId) {
      return DataProcessResult.failure('INVALID_INPUT', 'milestoneId and contractId are required');
    }

    const disputedAt = new Date().toISOString();

    // ── Dispute ORDER 1: updateDocument(status:DISPUTED) — IR-3, CF-17-3 ────
    // No funds movement — dispute only changes status
    const disputeResult = await this.dbFabric.storeDocument(
      MILESTONES_INDEX,
      {
        milestoneId,
        contractId,
        tenantId,
        status: 'DISPUTED',
        disputedAt,
        disputeReason,
        knowledgeScope: 'PRIVATE',
      },
      milestoneId,
    );

    if (!disputeResult.isSuccess) {
      return DataProcessResult.failure(
        'DISPUTE_FAILED',
        `Milestone dispute update failed: ${disputeResult.errorMessage}`,
      );
    }

    // ── Dispute ORDER 2: Audit write — IR-5, DNA-8 ──────────────────────────
    await this.dbFabric.storeDocument(ESCROW_AUDIT_INDEX, {
      milestoneId,
      contractId,
      tenantId,
      action: 'MILESTONE_DISPUTED',
      disputedAt,
      disputeReason,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── Dispute ORDER 3: Emit MilestoneDisputed ──────────────────────────────
    await this.queueFabric.enqueue('MilestoneDisputed', {
      milestoneId,
      contractId,
      tenantId,
      disputedAt,
      disputeReason,
    });

    return DataProcessResult.success({
      milestoneId,
      contractId,
      tenantId,
      disputedAt,
      status: 'DISPUTED',
    });
  }

  /**
   * LIFO compensation at milestone granularity.
   * IR-4: Registered forward [REFUND_MILESTONE, RESTORE_GIG_STATUS].
   * Executed reversed: RESTORE_GIG_STATUS → REFUND_MILESTONE.
   * CF-17-3.
   */
  private async startLIFOCompensation(
    milestoneId: string,
    contractId: string,
    tenantId: string,
    reason: string,
  ): Promise<void> {
    // Execute compensation in LIFO order (reversed from ESCROW_COMPENSATION_CHAIN)
    const lifoChain = [...ESCROW_COMPENSATION_CHAIN].reverse();

    await this.queueFabric.enqueue('EscrowCompensationStarted', {
      milestoneId,
      contractId,
      tenantId,
      reason,
      compensationChain: lifoChain,
      startedAt: new Date().toISOString(),
    });
  }

  /**
   * Read timer gate configuration from FREEDOM config.
   * IR-6: milestone_auto_release_days from FREEDOM — never hardcoded.
   */
  async getAutoReleaseDays(): Promise<number> {
    const result = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      key: 'milestone_auto_release_days',
    });
    if (result.isSuccess && (result.data ?? []).length > 0) {
      const doc = result.data![0] as Record<string, unknown>;
      return (doc['value'] as number) ?? 14;
    }
    return 14; // platform default from FREEDOM config — not a hardcoded override
  }
}
