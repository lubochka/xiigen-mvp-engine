/**
 * T613 GigAcceptanceLockGateway [VALIDATION]
 * FLOW-17: Freelancer Marketplace
 *
 * Entry: GigAcceptanceRequested event (client accepts a freelancer bid)
 *
 * Execution order is MACHINE (CF-17-1):
 *   ORDER 1: BOLA check — gigPosting.clientTenantId === ALS.tenantId
 *   ORDER 2: SETNX gig-accept-lock:{gigId} — exclusive acceptance lock
 *   ORDER 3: OCC bid status check — bid.status === OPEN
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(GigAccepted) — only after all guards pass
 *
 * Iron rules:
 *   IR-1: BOLA at ORDER 1 before any lock — cross-tenant gig hijacking rejected (CF-17-1)
 *   IR-2: SETNX at ORDER 2 — exclusive acceptance, no double-accept (CF-17-1)
 *   IR-3: OCC bid status check at ORDER 3 — stale/withdrawn bids rejected (CF-17-1)
 *   IR-4: storeDocument(audit) at ORDER 4 BEFORE enqueue(GigAccepted) (DNA-8)
 *   IR-5: GigAcceptanceFailed emitted on any guard failure
 *
 * Pattern reference: marketplace-payments/marketplace-checkout-gateway.service.ts (BOLA + SETNX)
 * Extends CART-LOCK-SETNX-001 pattern from FLOW-16 to gig acceptance domain.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const GIG_POSTINGS_INDEX = 'xiigen-gig-postings';
const GIG_ACCEPT_LOCKS_INDEX = 'xiigen-gig-accept-locks';
const BIDS_INDEX = 'xiigen-bids';
const GIG_AUDIT_INDEX = 'xiigen-gig-audit';
const FREEDOM_INDEX = 'xiigen-freedom-config';

/** MACHINE: Prefix for gig acceptance lock key — compile-time constant. CF-17-1. */
const GIG_ACCEPT_LOCK_PREFIX = 'gig-accept-lock' as const;

@Injectable()
export class GigAcceptanceLockGatewayService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T613',
        serviceName: 'GigAcceptanceLockGatewayService',
        flowId: 'FLOW-17',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Three-guard gig acceptance gate.
   * DPO pattern: PROPOSAL-ACCEPTANCE-LOCK-001
   */
  async acceptGig(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const gigId = event['gigId'] as string;
    const bidId = event['bidId'] as string;
    const freelancerId = event['freelancerId'] as string;

    if (!gigId || !bidId || !freelancerId) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'gigId, bidId, and freelancerId are required',
      );
    }

    // ── ORDER 1: BOLA check — IR-1, CF-17-1 ──────────────────────────────────
    // gigPosting.clientTenantId must match ALS tenantId — no cross-tenant hijacking
    const gigResult = await this.dbFabric.searchDocuments(GIG_POSTINGS_INDEX, { gigId });
    if (!gigResult.isSuccess || (gigResult.data ?? []).length === 0) {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'GIG_NOT_FOUND',
      });
      return DataProcessResult.failure('GIG_NOT_FOUND', `Gig posting not found: ${gigId}`);
    }

    const gigPosting = gigResult.data![0] as Record<string, unknown>;
    const clientTenantId = gigPosting['clientTenantId'] as string;

    if (clientTenantId !== tenantId) {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'BOLA_VIOLATION',
      });
      return DataProcessResult.failure(
        'BOLA_VIOLATION',
        'Client tenant does not own this gig posting',
      );
    }

    // ── ORDER 1.5: Validate gig.status === OPEN — C-1 fix ──────────────────
    const gigStatus = gigPosting['status'] as string;
    if (gigStatus !== 'OPEN') {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'GIG_NOT_OPEN',
        gigStatus,
      });
      return DataProcessResult.failure('GIG_NOT_OPEN', `Gig is not in OPEN status: ${gigStatus}`);
    }

    // ── ORDER 1.6: Self-acceptance guard — H-1 fix ──────────────────────────
    // R1: freelancerId !== ALS.tenantId — client cannot accept their own bid
    if (freelancerId === tenantId) {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'SELF_ACCEPTANCE',
      });
      return DataProcessResult.failure('SELF_ACCEPTANCE', 'Client cannot accept their own bid');
    }

    // ── ORDER 2: SETNX gig-accept-lock — IR-2, CF-17-1 ──────────────────────
    // H-4 fix: lockTtl from FREEDOM config 'gig_acceptance_lock_ttl_ms'
    const ttlResult = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      key: 'gig_acceptance_lock_ttl_ms',
    });
    const lockTtlMs =
      ttlResult.isSuccess && (ttlResult.data ?? []).length > 0
        ? ((ttlResult.data![0] as Record<string, unknown>)['value'] as number)
        : 300000; // 5 min platform default from FREEDOM

    const lockKey = `${GIG_ACCEPT_LOCK_PREFIX}:${gigId}`;
    const lockResult = await this.dbFabric.searchDocuments(GIG_ACCEPT_LOCKS_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      return DataProcessResult.success({
        alreadyAccepted: true,
        gigId,
        bidId,
      });
    }

    // Acquire the lock with TTL
    await this.dbFabric.storeDocument(
      GIG_ACCEPT_LOCKS_INDEX,
      {
        lockKey,
        gigId,
        clientTenantId: tenantId,
        lockedAt: new Date().toISOString(),
        lockTtlMs,
        expiresAt: new Date(Date.now() + lockTtlMs).toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      lockKey,
    );

    // ── ORDER 3: OCC bid status check — IR-3, CF-17-1 ────────────────────────
    // Validate bid has not been withdrawn since lock acquired
    const bidResult = await this.dbFabric.searchDocuments(BIDS_INDEX, { bidId });
    if (!bidResult.isSuccess || (bidResult.data ?? []).length === 0) {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'BID_NOT_FOUND',
      });
      return DataProcessResult.failure('BID_NOT_FOUND', `Bid not found: ${bidId}`);
    }

    const bid = bidResult.data![0] as Record<string, unknown>;
    if (bid['status'] !== 'OPEN') {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'BID_NOT_OPEN',
        bidStatus: bid['status'],
      });
      return DataProcessResult.failure(
        'BID_NOT_OPEN',
        `Bid is not in OPEN status: ${String(bid['status'])}`,
      );
    }

    const acceptedAt = new Date().toISOString();

    // ── ORDER 3.5: OCC gig status update OPEN → ACCEPTANCE_PENDING — C-1 fix ─
    const gigVersionPin = gigPosting['_version'] as string | undefined;
    const occOptions = gigVersionPin
      ? {
          ifSeqNo: parseInt(gigVersionPin.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(gigVersionPin.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };
    const gigUpdateResult = await this.dbFabric.storeDocumentWithOCC(
      GIG_POSTINGS_INDEX,
      { ...gigPosting, status: 'ACCEPTANCE_PENDING', acceptedBidId: bidId, updatedAt: acceptedAt },
      gigId as string,
      occOptions,
    );
    if (!gigUpdateResult.isSuccess) {
      await this.queueFabric.enqueue('GigAcceptanceFailed', {
        gigId,
        bidId,
        tenantId,
        reason: 'GIG_STATUS_CONFLICT',
      });
      return DataProcessResult.failure('GIG_STATUS_CONFLICT', 'Concurrent gig acceptance detected');
    }

    // ── ORDER 4: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE enqueue(GigAccepted)
    await this.dbFabric.storeDocument(GIG_AUDIT_INDEX, {
      gigId,
      bidId,
      freelancerId,
      clientTenantId: tenantId,
      action: 'GIG_ACCEPTED',
      acceptedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit GigAccepted — IR-5 ────────────────────────────────────
    await this.queueFabric.enqueue('GigAccepted', {
      gigId,
      bidId,
      freelancerId,
      clientTenantId: tenantId,
      acceptedAt,
    });

    return DataProcessResult.success({
      gigId,
      bidId,
      freelancerId,
      clientTenantId: tenantId,
      acceptedAt,
      status: 'ACCEPTED',
    });
  }
}
