/**
 * IReviewEligibilityService — Fabric interface for cross-flow eligibility checks.
 *
 * FLOW-10 T-[+0] ReviewSubmissionGateway uses this interface to verify that a
 * reviewer is eligible to submit a review for the target entity. Eligibility data
 * originates from FLOW-04 (purchase/attendance verification) and FLOW-09 (reviewer
 * standing). This interface is GET_ONLY: implementations must not write to peer flows.
 *
 * Injection token: REVIEW_ELIGIBILITY_SERVICE
 * Access pattern: GET_ONLY (crossFlowReadDependency, peerFlowMustBeActive: true)
 */
export const REVIEW_ELIGIBILITY_SERVICE = 'REVIEW_ELIGIBILITY_SERVICE';

export interface EligibilityCheckInput {
  /** Tenant scope — read from AsyncLocalStorage by the implementation */
  tenantId: string;
  /** The reviewer's user ID */
  reviewerId: string;
  /** The entity being reviewed (product, event, listing, etc.) */
  targetEntityId: string;
  /** Category of the target entity */
  targetEntityType: 'EVENT' | 'LISTING';
}

export interface EligibilityCheckResult {
  /** True if the reviewer is eligible to submit a review */
  eligible: boolean;
  /** Human-readable reason when eligible is false */
  reason?: string;
  /** Flow ID that was the source of the eligibility determination */
  sourceFlorId?: string;
}

export interface IReviewEligibilityService {
  /**
   * Check whether a reviewer is eligible to submit a review for the given entity.
   * Must be GET_ONLY — no writes to FLOW-04 or FLOW-09 indices.
   *
   * @returns DataProcessResult-compatible shape: { isSuccess, data?, errorCode? }
   */
  check(input: EligibilityCheckInput): Promise<{
    isSuccess: boolean;
    data?: EligibilityCheckResult;
    errorCode?: string;
  }>;
}
