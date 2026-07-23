/**
 * T611 MarketplaceEscrowController [ORCHESTRATION]
 * FLOW-16: Marketplace Payments
 *
 * Entry: EscrowReleaseRequested / DisputeInitiated / PaymentReversalRequested events
 *
 * Two primary paths:
 *   A) Release path: validate escrow → release funds → storeDocument(audit) → enqueue(EscrowReleased)
 *   B) Dispute path: updateDocument(status:DISPUTED, accessBlocked:true) →
 *                    storeDocument(audit) → enqueue(EscrowDisputed)
 *   C) Compensation path (PaymentReversalRequested): LIFO compensations
 *      ISagaCompensationService.compensate([REFUND_PAYMENT, RESTORE_INVENTORY])
 *
 * Iron rules:
 *   IR-1: LIFO compensation [REFUND_PAYMENT, RESTORE_INVENTORY] — REFUND first always
 *   IR-2: dispute = updateDocument(status:DISPUTED) only — never deleteDocument on escrow
 *   IR-3: escrow_auto_release_days from FREEDOM config
 *   IR-4: storeDocument(audit) before every state event emit (DNA-8)
 *
 * Pattern reference: saas-multi-tenancy/tenant-lifecycle-manager.service.ts (state machine + no deleteDocument)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const ESCROW_INDEX = 'xiigen-escrow-holds';
const ESCROW_AUDIT_INDEX = 'xiigen-escrow-audit';
const FREEDOM_INDEX = 'xiigen-freedom-config';

/**
 * MACHINE: LIFO compensation steps — REFUND_PAYMENT MUST come before RESTORE_INVENTORY.
 * Order is fixed; never driven from FREEDOM config.
 */
const COMPENSATION_STEPS_LIFO = ['REFUND_PAYMENT', 'RESTORE_INVENTORY'] as const;

/** MACHINE: Default auto-release days if FREEDOM config not yet seeded. */
const DEFAULT_AUTO_RELEASE_DAYS = 14;

@Injectable()
export class MarketplaceEscrowControllerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T611',
        serviceName: 'MarketplaceEscrowControllerService',
        flowId: 'FLOW-16',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Release path: validate → release → audit → enqueue(EscrowReleased).
   * IR-4: storeDocument(audit) before EscrowReleased emit (DNA-8).
   */
  async handleEscrowReleaseRequested(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const escrowId = event['escrowId'] as string;
    const orderId = event['orderId'] as string;
    const sellerAmountCents = event['sellerAmountCents'] as number;

    if (!escrowId || !orderId) {
      return DataProcessResult.failure('INVALID_INPUT', 'escrowId and orderId are required');
    }

    // Load escrow_auto_release_days from FREEDOM config — IR-3
    const freedomResult = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      key: 'escrow_auto_release_days',
    });
    const autoReleaseDays =
      freedomResult.isSuccess && (freedomResult.data ?? []).length > 0
        ? ((freedomResult.data![0] as Record<string, unknown>)['value'] as number)
        : DEFAULT_AUTO_RELEASE_DAYS;

    // Validate escrow record exists
    const escrowRead = await this.dbFabric.searchDocuments(ESCROW_INDEX, {
      escrowId,
      tenantId,
    });

    if (!escrowRead.isSuccess || (escrowRead.data ?? []).length === 0) {
      return DataProcessResult.failure('ESCROW_NOT_FOUND', `Escrow '${escrowId}' not found`);
    }

    const releasedAt = new Date().toISOString();

    // Release funds — updateDocument(status:RELEASED)
    await this.dbFabric.storeDocument(
      ESCROW_INDEX,
      {
        escrowId,
        tenantId,
        orderId,
        status: 'RELEASED',
        releasedAt,
        autoReleaseDays,
        knowledgeScope: 'PRIVATE',
      },
      escrowId,
    );

    // ── Audit write — IR-4, DNA-8 ────────────────────────────────────────────
    // storeDocument(audit) BEFORE EscrowReleased emit
    await this.dbFabric.storeDocument(ESCROW_AUDIT_INDEX, {
      tenantId,
      escrowId,
      orderId,
      action: 'ESCROW_RELEASED',
      releasedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // Emit EscrowReleased
    await this.queueFabric.enqueue('EscrowReleased', {
      orderId,
      escrowId,
      sellerAmountCents,
      releasedAt,
    });

    return DataProcessResult.success({
      tenantId,
      escrowId,
      orderId,
      status: 'RELEASED',
      releasedAt,
    });
  }

  /**
   * Dispute path: updateDocument(status:DISPUTED, accessBlocked:true) — IR-2.
   * NEVER deleteDocument on any escrow record.
   * IR-4: storeDocument(audit) before EscrowDisputed emit (DNA-8).
   */
  async handleDisputeInitiated(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const escrowId = event['escrowId'] as string;
    const orderId = event['orderId'] as string;
    const disputeReason = (event['disputeReason'] as string) ?? 'buyer_complaint';

    if (!escrowId || !orderId) {
      return DataProcessResult.failure('INVALID_INPUT', 'escrowId and orderId are required');
    }

    const disputedAt = new Date().toISOString();

    // IR-2: updateDocument(status:DISPUTED) ONLY — NEVER deleteDocument
    await this.dbFabric.storeDocument(
      ESCROW_INDEX,
      {
        escrowId,
        tenantId,
        orderId,
        status: 'DISPUTED',
        accessBlocked: true,
        disputedAt,
        disputeReason,
        knowledgeScope: 'PRIVATE',
      },
      escrowId,
    );

    // ── Audit write — IR-4, DNA-8 ────────────────────────────────────────────
    // storeDocument(audit) BEFORE EscrowDisputed emit
    await this.dbFabric.storeDocument(ESCROW_AUDIT_INDEX, {
      tenantId,
      escrowId,
      orderId,
      action: 'ESCROW_DISPUTED',
      disputeReason,
      disputedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // Emit EscrowDisputed
    await this.queueFabric.enqueue('EscrowDisputed', {
      tenantId,
      escrowId,
      orderId,
      disputeReason,
      disputedAt,
    });

    return DataProcessResult.success({
      tenantId,
      escrowId,
      orderId,
      status: 'DISPUTED',
      disputedAt,
    });
  }

  /**
   * Compensation path: LIFO [REFUND_PAYMENT, RESTORE_INVENTORY] — IR-1.
   * REFUND_PAYMENT MUST execute before RESTORE_INVENTORY — MACHINE-FIXED order.
   * IR-4: storeDocument(audit) before PaymentReversed emit (DNA-8).
   */
  async handlePaymentReversalRequested(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const orderId = event['orderId'] as string;
    const escrowId = event['escrowId'] as string;

    if (!orderId || !escrowId) {
      return DataProcessResult.failure('INVALID_INPUT', 'orderId and escrowId are required');
    }

    const compensationResults: Record<string, unknown>[] = [];
    const reversedAt = new Date().toISOString();

    // ── IR-1: LIFO compensation — REFUND_PAYMENT before RESTORE_INVENTORY ───
    for (const step of COMPENSATION_STEPS_LIFO) {
      const stepResult = await this.dbFabric.storeDocument(
        'xiigen-compensation-steps',
        {
          orderId,
          escrowId,
          tenantId,
          compensationStep: step,
          executedAt: new Date().toISOString(),
          knowledgeScope: 'PRIVATE',
        },
        `compensation:${orderId}:${step}`,
      );
      compensationResults.push({
        step,
        success: stepResult.isSuccess,
      });
    }

    // ── Audit write — IR-4, DNA-8 ────────────────────────────────────────────
    await this.dbFabric.storeDocument(ESCROW_AUDIT_INDEX, {
      tenantId,
      escrowId,
      orderId,
      action: 'PAYMENT_REVERSED',
      compensationSteps: COMPENSATION_STEPS_LIFO,
      reversedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // Emit PaymentReversed
    await this.queueFabric.enqueue('PaymentReversed', {
      tenantId,
      orderId,
      escrowId,
      compensationSteps: [...COMPENSATION_STEPS_LIFO],
      reversedAt,
    });

    return DataProcessResult.success({
      tenantId,
      orderId,
      escrowId,
      compensationResults,
      reversedAt,
    });
  }
}
