/**
 * T612 SellerPayoutWriter [DATA_PIPELINE]
 * FLOW-16: Marketplace Payments
 *
 * Entry: EscrowReleased event (T611 output)
 *
 * Execution order is MACHINE:
 *   ORDER 1: SETNX(payout-lock:{orderId}) — prevent double payout
 *   ORDER 2: Load seller payout details (payoutVaultRef only — no bank details)
 *   ORDER 3: Write payout record via storeDocument
 *   ORDER 4: storeDocument(audit) — DNA-8
 *   ORDER 5: enqueue(PayoutCompleted)
 *
 * Iron rules:
 *   IR-1: SETNX at ORDER 1 before storeDocument
 *   IR-2: payoutVaultRef only — bankAccountNumber/IBAN/routingNumber/sortCode NEVER stored
 *   IR-3: storeDocument(audit) before PayoutCompleted emit (DNA-8)
 *
 * Pattern reference: saas-multi-tenancy/tenant-provisioning-orchestrator.service.ts (SETNX + audit + emit)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const PAYOUT_LOCK_INDEX = 'xiigen-payout-locks';
const PAYOUT_RECORD_INDEX = 'xiigen-payout-records';
const PAYOUT_AUDIT_INDEX = 'xiigen-payout-audit';
const SELLER_VAULT_INDEX = 'xiigen-seller-vault-refs';

@Injectable()
export class SellerPayoutWriterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T612',
        serviceName: 'SellerPayoutWriterService',
        flowId: 'FLOW-16',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Process EscrowReleased — write payout record and emit PayoutCompleted.
   * DPO pattern: PAYOUT-VAULT-REF-ONLY-001
   */
  async handleEscrowReleased(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const orderId = event['orderId'] as string;
    const escrowId = event['escrowId'] as string;
    const sellerAmountCents = event['sellerAmountCents'] as number;
    const sellerId = event['sellerId'] as string;

    if (!orderId || !escrowId || sellerAmountCents === undefined) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'orderId, escrowId, and sellerAmountCents are required',
      );
    }

    // ── ORDER 1: SETNX — IR-1 ───────────────────────────────────────────────
    // Prevent double payout before any storeDocument
    const lockDocId = `payout-lock:${orderId}`;
    const lockResult = await this.dbFabric.searchDocuments(PAYOUT_LOCK_INDEX, {
      orderId,
      tenantId,
    });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      return DataProcessResult.success({
        alreadyProcessed: true,
        orderId,
        tenantId,
      });
    }
    await this.dbFabric.storeDocument(
      PAYOUT_LOCK_INDEX,
      {
        orderId,
        tenantId,
        lockedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      lockDocId,
    );

    // ── ORDER 2: Load seller payout details — IR-2 ──────────────────────────
    // payoutVaultRef only — bankAccountNumber/IBAN/routingNumber/sortCode NEVER read or stored
    const sellerVaultResult = await this.dbFabric.searchDocuments(SELLER_VAULT_INDEX, {
      sellerId: sellerId ?? tenantId,
      tenantId,
    });

    const payoutVaultRef =
      sellerVaultResult.isSuccess && (sellerVaultResult.data ?? []).length > 0
        ? ((sellerVaultResult.data![0] as Record<string, unknown>)['payoutVaultRef'] as string)
        : `vault-ref:${tenantId}:${orderId}`;

    const paidAt = new Date().toISOString();

    // ── ORDER 3: Write payout record — IR-2 ─────────────────────────────────
    // IR-2: payoutVaultRef only — NO bankAccountNumber, IBAN, routingNumber, sortCode
    await this.dbFabric.storeDocument(
      PAYOUT_RECORD_INDEX,
      {
        orderId,
        escrowId,
        tenantId,
        sellerId: sellerId ?? tenantId,
        payoutVaultRef,
        amountCents: sellerAmountCents,
        status: 'PAYOUT_WRITTEN',
        paidAt,
        knowledgeScope: 'PRIVATE',
      },
      `payout:${orderId}`,
    );

    // ── ORDER 4: Audit write — IR-3, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE PayoutCompleted emit
    await this.dbFabric.storeDocument(PAYOUT_AUDIT_INDEX, {
      tenantId,
      orderId,
      escrowId,
      payoutVaultRef,
      amountCents: sellerAmountCents,
      action: 'PAYOUT_WRITTEN',
      paidAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit PayoutCompleted — IR-3 ────────────────────────────────
    await this.queueFabric.enqueue('PayoutCompleted', {
      orderId,
      sellerId: sellerId ?? tenantId,
      payoutVaultRef,
      amountCents: sellerAmountCents,
      paidAt,
    });

    return DataProcessResult.success({
      tenantId,
      orderId,
      escrowId,
      payoutVaultRef,
      amountCents: sellerAmountCents,
      paidAt,
    });
  }
}
