/**
 * IReviewNotificationService — Fabric interface for reviewer notification dispatch.
 *
 * FLOW-10 T-[+3] ReviewResponseOrchestrator uses this interface to notify the original
 * reviewer when an owner response is published. Notification is dispatched via queue
 * (CloudEvents envelope) — the implementation must not call HTTP directly.
 *
 * Injection token: REVIEW_NOTIFICATION_SERVICE
 */
export const REVIEW_NOTIFICATION_SERVICE = 'REVIEW_NOTIFICATION_SERVICE';

export interface IReviewNotificationService {
  /**
   * Notify the reviewer that their review has received a response.
   *
   * @param tenantId  - Tenant scope
   * @param reviewId  - The review that received a response
   * @param event     - CloudEvent type string for the notification (e.g. 'review.response.published')
   * @returns DataProcessResult-compatible shape: { isSuccess }
   */
  notifyReviewer(
    tenantId: string,
    reviewId: string,
    event: string,
  ): Promise<{ isSuccess: boolean }>;
}
