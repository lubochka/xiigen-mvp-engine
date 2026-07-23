/**
 * IHumanReviewService (F1403) — Fraud Detection Human Review Gate
 *
 * T534 fraud detection must route ALL fraud signals to human review.
 * Automated account actions (suspend, ban, revoke) are PROHIBITED (CF-736).
 *
 * BFA: CF-736 — T534 fraud detection requires human review before any account action.
 * ST:  ST-454 (Human Review Gate for Automated Decisions)
 */
import { DataProcessResult } from '../../kernel/data-process-result';

export const HUMAN_REVIEW_SERVICE = 'HUMAN_REVIEW_SERVICE';

/**
 * F1403 — IHumanReviewService
 *
 * Routes fraud signals and other automated decisions to human review queues.
 * T534 MUST use this interface before any account enforcement action.
 * Permitted automated actions: flag, score, alert, createReviewCase.
 * Prohibited automated actions: suspend, ban, revoke, terminate, disable.
 */
export interface IHumanReviewService {
  /**
   * Creates a human review case for a fraud signal or compliance event.
   * Returns the case ID and queue position.
   * Reviewers are notified asynchronously via the review queue.
   * This is the ONLY permitted path to account action in T534 (CF-736).
   */
  createReviewCase(params: {
    caseType: 'FRAUD_DETECTION' | 'ABUSE_REPORT' | 'COMPLIANCE_REVIEW';
    subjectTenantId: string;
    signals: Record<string, unknown>[];
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    evidence: Record<string, unknown>;
    cfRef: string;
  }): Promise<
    DataProcessResult<{
      caseId: string;
      queuePosition: number;
      estimatedReviewTime: string;
    }>
  >;

  /**
   * Gets the current status of a review case.
   */
  getCaseStatus(caseId: string): Promise<
    DataProcessResult<{
      status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
      reviewerId?: string;
      decision?: 'NO_ACTION' | 'WARNING' | 'SUSPENSION' | 'BAN';
      resolvedAt?: string;
    }>
  >;
}
