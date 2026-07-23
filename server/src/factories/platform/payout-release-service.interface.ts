// file: server/src/factories/platform/payout-release-service.interface.ts
// F575 — IPayoutReleaseService (PLATFORM-ONLY)
// DI token: PLATFORM_PAYOUT_SERVICE

export const PLATFORM_PAYOUT_SERVICE = Symbol('PLATFORM_PAYOUT_SERVICE');

export type PayoutStatus = 'PENDING' | 'HELD' | 'RELEASED' | 'FROZEN' | 'FAILED';

export interface PayoutHoldRequest {
  payoutId: string;
  sellerId: string;
  /**
   * Amount is NOT included in event payloads (PII rule).
   * Amount is stored in secure payout record only.
   */
  holdReason: 'DISPUTE_WINDOW' | 'KYC_REQUIRED' | 'COMPLIANCE_REVIEW' | 'DISPUTE_ACTIVE';
  correlationId: string;
  idempotencyKey: string;
}

export interface PayoutReleaseRequest {
  payoutId: string;
  sellerId: string;
  correlationId: string;
  idempotencyKey: string;
}

export interface PayoutFreezeRequest {
  sellerId: string;
  reason: string;
  disputeRef?: string;
  frozenBy: 'DISPUTE' | 'COMPLIANCE' | 'PLATFORM';
}

export interface PayoutStatusRecord {
  payoutId: string;
  sellerId: string;
  status: PayoutStatus;
  heldAt?: string;
  releasedAt?: string;
  frozenAt?: string;
  frozenReason?: string;
}

/**
 * F575 — IPayoutReleaseService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: PLATFORM_PAYOUT_SERVICE
 *
 * NOTE: Payout amounts must NEVER appear in event payloads.
 * Amount is stored only in the secure payout record (accessed via payoutId).
 *
 * CF-265: holdPayout and notifySeller must be called in the same synchronous handler.
 * CF-262: freezeSellerPayouts must be called synchronously when dispute is initiated.
 */
export interface IPayoutReleaseService {
  /**
   * Place a hold on a payout pending fulfillment of release conditions.
   * After calling holdPayout, the handler MUST call seller notification
   * in the same synchronous execution (CF-265).
   */
  holdPayout(request: PayoutHoldRequest): Promise<{ payoutId: string; heldAt: string }>;

  /**
   * Release a held payout to the seller's account.
   * Requires: KYC clear (T220 complete) + dispute window closed + payment captured.
   */
  releasePayout(request: PayoutReleaseRequest): Promise<{ payoutId: string; releasedAt: string }>;

  /**
   * Get current payout status.
   */
  getPayoutStatus(payoutId: string): Promise<PayoutStatusRecord>;

  /**
   * Freeze ALL pending payouts for a seller.
   * CF-262: called synchronously when buyer dispute is initiated.
   * Returns list of frozen payoutIds.
   */
  freezeSellerPayouts(
    request: PayoutFreezeRequest,
  ): Promise<{ frozenPayoutIds: string[]; frozenAt: string }>;

  /**
   * Unfreeze seller payouts after dispute resolution.
   */
  unfreezeSellerPayouts(
    sellerId: string,
    disputeRef: string,
  ): Promise<{ unfrozenPayoutIds: string[] }>;
}

export const F575_FACTORY_DESCRIPTOR = {
  factoryId: 'F575',
  token: PLATFORM_PAYOUT_SERVICE,
  interfaceName: 'IPayoutReleaseService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  bfaRules: ['CF-262', 'CF-265', 'CF-266'],
};
