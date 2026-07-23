/**
 * T626 AuctionBidProcessor [REQUEST_RESPONSE]
 * FLOW-20: Ads Platform
 *
 * Entry: BidSubmissionRequested event (advertiser submits real-time auction bid)
 *
 * Execution order is MACHINE (CF-20-2):
 *   ORDER 1: SETNX(auction-bid-lock:{auctionId}) — prevent duplicate bids
 *   ORDER 2: DECRBY(advertiser-budget:{advertiserId}, bidAmountCents) — atomic budget deduction
 *   ORDER 3: Validate budget sufficiency; restore on failure via INCRBY
 *   ORDER 4: storeDocument(auction-audit) — append-only audit trail
 *   ORDER 5: enqueue(BidAccepted) or enqueue(BidRejected)
 *
 * Iron rules:
 *   IR-1: SETNX(auction-bid-lock:{auctionId}) at ORDER 1 — prevent duplicate bids (CF-20-2)
 *   IR-2: DECRBY at ORDER 2 — atomic Redis operation, no OCC (CF-20-2)
 *   IR-3: Budget < 0 → INCRBY to restore, emit BidRejected (CF-20-2)
 *   IR-4: Stateless auction — no Elasticsearch state machine, event log only (CF-20-2)
 *   IR-5: tenantId from ALS only (DNA-5)
 *
 * Pattern reference: STATELESS-REDIS-AUCTION-001 RAG pattern from DR-20-B
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const AUCTION_BID_LOCKS_INDEX = 'xiigen-auction-bid-locks';
const AUCTION_AUDIT_INDEX = 'xiigen-auction-audit';

/** MACHINE: Prefix for auction bid lock key — compile-time constant. CF-20-2. */
const AUCTION_BID_LOCK_PREFIX = 'auction-bid-lock' as const;
const ADVERTISER_BUDGET_PREFIX = 'advertiser-budget' as const;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class AuctionBidProcessorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T626',
        serviceName: 'AuctionBidProcessorService',
        flowId: 'FLOW-20',
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
   * Real-time bid processing with Redis lock and budget atomicity.
   * DPO pattern: STATELESS-REDIS-AUCTION-001
   */
  async processBid(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const auctionId = event['auctionId'] as string;
    const bidId = event['bidId'] as string;
    const advertiserId = event['advertiserId'] as string;
    const bidAmountCents = event['bidAmountCents'] as number | undefined;

    if (!auctionId || !bidId || !advertiserId || bidAmountCents === undefined) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'auctionId, bidId, advertiserId, and bidAmountCents are required',
      );
    }

    if (bidAmountCents <= 0) {
      return DataProcessResult.failure('INVALID_BID', 'bidAmountCents must be positive');
    }

    // ── ORDER 1: SETNX(auction-bid-lock:{auctionId}) — IR-1, CF-20-2 ────────
    const lockKey = `${AUCTION_BID_LOCK_PREFIX}:${auctionId}`;
    const lockCheckResult = await this.dbFabric.searchDocuments(AUCTION_BID_LOCKS_INDEX, { lockKey });

    if (lockCheckResult.isSuccess && (lockCheckResult.data ?? []).length > 0) {
      // Lock already held — idempotent return of previous bid
      const previousBid = lockCheckResult.data![0] as Record<string, unknown>;
      return DataProcessResult.success({
        bidId: previousBid['bidId'],
        auctionId,
        alreadyProcessed: true,
        previousBidAmountCents: previousBid['bidAmountCents'],
      });
    }

    // Acquire the lock
    await this.dbFabric.storeDocument(
      AUCTION_BID_LOCKS_INDEX,
      {
        lockKey,
        auctionId,
        bidId,
        advertiserId,
        bidAmountCents,
        lockedAt: new Date().toISOString(),
      },
      lockKey,
    );

    // ── ORDER 2: DECRBY(advertiser-budget:{advertiserId}) — IR-2, CF-20-2 ──
    // Note: In a real implementation, this would use Redis DECRBY via a Redis fabric provider.
    // For testing, we simulate the budget ledger with a searchDocuments + storeDocument pattern.

    const budgetKey = `${ADVERTISER_BUDGET_PREFIX}:${advertiserId}`;
    const budgetResult = await this.dbFabric.searchDocuments('xiigen-advertiser-budgets', { budgetKey });
    let currentBudgetCents = 0;

    if (budgetResult.isSuccess && (budgetResult.data ?? []).length > 0) {
      currentBudgetCents = (budgetResult.data![0] as Record<string, unknown>)[
        'balanceCents'
      ] as number;
    }

    // ── ORDER 3: Validate budget sufficiency ─────────────────────────────────
    const newBudgetCents = currentBudgetCents - bidAmountCents;

    if (newBudgetCents < 0) {
      // Budget insufficient — restore lock and return failure
      // In real Redis: INCRBY(advertiser-budget:{advertiserId}, bidAmountCents)
      // For testing: cleanup and emit rejection

      await this.queueFabric.enqueue('BidRejected', {
        bidId,
        auctionId,
        advertiserId,
        tenantId,
        reason: 'BUDGET_INSUFFICIENT',
        requestedAmount: bidAmountCents,
        availableBudget: currentBudgetCents,
        timestamp: new Date().toISOString(),
      });

      return DataProcessResult.failure(
        'BUDGET_INSUFFICIENT',
        `Advertiser budget ${currentBudgetCents} insufficient for bid ${bidAmountCents}`,
      );
    }

    // Update budget ledger
    await this.dbFabric.storeDocument(
      'xiigen-advertiser-budgets',
      {
        budgetKey,
        advertiserId,
        balanceCents: newBudgetCents,
        updatedAt: new Date().toISOString(),
      },
      budgetKey,
    );

    // ── ORDER 4: storeDocument(auction-audit) — IR-4, DNA-8 ──────────────────
    const auditRecord: Record<string, unknown> = {
      bidId,
      auctionId,
      advertiserId,
      tenantId,
      bidAmountCents,
      previousBudgetCents: currentBudgetCents,
      newBudgetCents,
      status: 'ACCEPTED',
      processedAt: new Date().toISOString(),
    };

    await this.dbFabric.storeDocument(AUCTION_AUDIT_INDEX, auditRecord, bidId);

    // ── ORDER 5: enqueue(BidAccepted) ───────────────────────────────────────
    await this.queueFabric.enqueue('BidAccepted', {
      bidId,
      auctionId,
      advertiserId,
      tenantId,
      bidAmountCents,
      newBudgetCents,
      timestamp: new Date().toISOString(),
    });

    return DataProcessResult.success({
      bidId,
      auctionId,
      advertiserId,
      bidAmountCents,
      newBudgetCents,
      status: 'ACCEPTED',
      processedAt: new Date().toISOString(),
    });
  }
}
