/**
 * IReviewOwnershipService — Fabric interface for review response ownership verification.
 *
 * FLOW-10 T-[+3] ReviewResponseOrchestrator uses this interface to verify that the
 * entity responding to a review is the legitimate owner of the reviewed listing/event.
 * IR-1 mandates that ownership is checked before any response is persisted or emitted.
 *
 * Injection token: REVIEW_OWNERSHIP_SERVICE
 */
export const REVIEW_OWNERSHIP_SERVICE = 'REVIEW_OWNERSHIP_SERVICE';

export interface IReviewOwnershipService {
  /**
   * Check whether responderId is the legitimate owner of the entity that reviewId
   * was written about.
   *
   * @param tenantId  - Tenant scope (also available via AsyncLocalStorage in impl)
   * @param reviewId  - The review being responded to
   * @param responderId - The entity attempting to post a response
   * @returns DataProcessResult-compatible shape: { isSuccess, data?: { owned } }
   */
  isOwner(
    tenantId: string,
    reviewId: string,
    responderId: string,
  ): Promise<{ isSuccess: boolean; data?: { owned: boolean } }>;
}
