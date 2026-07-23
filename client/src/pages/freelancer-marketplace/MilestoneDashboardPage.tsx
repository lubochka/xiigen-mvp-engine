/**
 * MilestoneDashboardPage — FLOW-17 T615/T616
 * Milestone escrow dashboard: delivery submission, release, dispute.
 * Shows delivery gate status before release button is enabled.
 * Review submission with direction selection.
 *
 * Role-aware (RUN-47g secondary-page sweep):
 *   - freelancer                      → can submit delivery; sees client actions disabled
 *   - tenant-user + business-partner  → can release funds / raise dispute
 *                                        (delivery is freelancer-only)
 *   - platform-admin                  → sees + does everything + cross-tenant banner
 *   - platform-support                → read-only banner; all actions disabled
 *   - Fallback                        → existing behaviour preserved
 *
 * All existing data-testid attributes preserved exactly.
 */
import React, { useState } from 'react';
import { Briefcase, Shield, Lock } from 'lucide-react';
import { useViewerRole } from '../../hooks/useViewerRole';

type MilestoneStatus = 'FUNDED' | 'SUBMITTED' | 'RELEASED' | 'DISPUTED';

interface MilestoneItem {
  milestoneId: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  deliverySubmitted: boolean;
}

export function MilestoneDashboardPage() {
  const { role } = useViewerRole();
  const [milestones, setMilestones] = useState<MilestoneItem[]>([
    { milestoneId: 'ms-1', description: 'Design Phase', amount: 500, status: 'FUNDED', deliverySubmitted: false },
    { milestoneId: 'ms-2', description: 'Implementation', amount: 500, status: 'FUNDED', deliverySubmitted: false },
  ]);
  const [reviewDirection, setReviewDirection] = useState<'CLIENT_TO_FREELANCER' | 'FREELANCER_TO_CLIENT'>('CLIENT_TO_FREELANCER');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

  // Role capability matrix
  const isFreelancer = role === 'freelancer';
  const isClient = role === 'tenant-user' || role === 'business-partner';
  const isAdmin = role === 'platform-admin';
  const isSupport = role === 'platform-support';
  const readOnly = isSupport;
  const canSubmitDelivery = (isFreelancer || isAdmin) && !readOnly;
  const canReleaseOrDispute = (isClient || isAdmin) && !readOnly;

  function submitDelivery(milestoneId: string) {
    setMilestones(prev => prev.map(m =>
      m.milestoneId === milestoneId ? { ...m, deliverySubmitted: true } : m
    ));
  }

  function releaseMilestone(milestoneId: string) {
    setActionStatus(prev => ({ ...prev, [milestoneId]: 'loading' }));
    setTimeout(() => {
      setMilestones(prev => prev.map(m =>
        m.milestoneId === milestoneId ? { ...m, status: 'RELEASED' } : m
      ));
      setActionStatus(prev => ({ ...prev, [milestoneId]: 'released' }));
    }, 300);
  }

  function disputeMilestone(milestoneId: string) {
    setActionStatus(prev => ({ ...prev, [milestoneId]: 'loading' }));
    setTimeout(() => {
      setMilestones(prev => prev.map(m =>
        m.milestoneId === milestoneId ? { ...m, status: 'DISPUTED' } : m
      ));
      setActionStatus(prev => ({ ...prev, [milestoneId]: 'disputed' }));
    }, 300);
  }

  function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewError(null);
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError('Rating must be between 1 and 5');
      return;
    }
    setReviewStatus('loading');
    setTimeout(() => {
      setReviewStatus('success');
    }, 300);
  }

  const statusColor: Record<MilestoneStatus, string> = {
    FUNDED: 'bg-blue-100 text-blue-700',
    SUBMITTED: 'bg-yellow-100 text-yellow-700',
    RELEASED: 'bg-green-100 text-green-700',
    DISPUTED: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className="p-6 max-w-2xl"
      data-testid="milestone-dashboard-page"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Milestone Dashboard</h1>

      {/* Role-contextual banner */}
      {isFreelancer && (
        <div
          data-testid="milestone-role-banner-freelancer"
          role="note"
          className="mb-6 p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900 flex items-start gap-2"
        >
          <Briefcase size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
          <span>
            You're viewing as <span className="font-semibold">freelancer</span>.
            You can submit delivery when your work is ready; the client releases funds.
          </span>
        </div>
      )}
      {isClient && (
        <div
          data-testid="milestone-role-banner-client"
          role="note"
          className="mb-6 p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex items-start gap-2"
        >
          <Briefcase size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
          <span>
            You're viewing as the <span className="font-semibold">client</span>.
            Release funds once delivery is verified, or raise a dispute if there's an
            issue.
          </span>
        </div>
      )}
      {isAdmin && (
        <div
          data-testid="milestone-role-banner-admin"
          role="note"
          className="mb-6 p-3 rounded border border-purple-200 bg-purple-50 text-sm text-purple-900 flex items-start gap-2"
        >
          <Shield size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
          <span>
            Platform-admin view. You can take any action on behalf of either party
            (use sparingly; escalations should go through dispute flow).
          </span>
        </div>
      )}
      {readOnly && (
        <div
          data-testid="milestone-role-banner-support"
          role="note"
          className="mb-6 p-3 rounded border border-slate-300 bg-slate-50 text-sm text-slate-800 flex items-start gap-2"
        >
          <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
          <span>
            Read-only for support. Escalate to a platform-admin for any change.
          </span>
        </div>
      )}

      {/* Milestones */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Milestones</h2>
        {milestones.map((m) => (
          <div key={m.milestoneId} className="border border-gray-200 rounded p-4 mb-3"
            data-testid={`milestone-${m.milestoneId}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">{m.description}</span>
              <span className={`text-xs px-2 py-1 rounded ${statusColor[m.status]}`}
                data-testid={`milestone-status-${m.milestoneId}`}>
                {m.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">${m.amount}</p>

            {m.status === 'FUNDED' && !m.deliverySubmitted && canSubmitDelivery && (
              <button
                data-testid={`submit-delivery-${m.milestoneId}`}
                onClick={() => submitDelivery(m.milestoneId)}
                className="text-sm bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                style={{ minHeight: '44px' }}>
                Submit Delivery
              </button>
            )}

            {m.status === 'FUNDED' && canReleaseOrDispute && (
              <>
                <button
                  data-testid={`release-${m.milestoneId}`}
                  onClick={() => releaseMilestone(m.milestoneId)}
                  disabled={!m.deliverySubmitted || actionStatus[m.milestoneId] === 'loading'}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded mr-2 hover:bg-green-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{ minHeight: '44px' }}>
                  Release Funds
                </button>
                <button
                  data-testid={`dispute-${m.milestoneId}`}
                  onClick={() => disputeMilestone(m.milestoneId)}
                  disabled={actionStatus[m.milestoneId] === 'loading'}
                  className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ minHeight: '44px' }}>
                  Raise Dispute
                </button>
              </>
            )}

            {readOnly && m.status === 'FUNDED' && (
              <p className="text-xs text-slate-500 italic">
                Actions disabled for support access.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Review submission — not shown to support */}
      {!readOnly && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Submit Review</h2>

          {reviewStatus === 'success' && (
            <div data-testid="review-success" role="status" aria-live="polite" className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
              Review submitted!
            </div>
          )}

          {reviewError && (
            <div data-testid="review-error" role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
              {reviewError}
            </div>
          )}

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Direction</label>
              <select data-testid="review-direction-select"
                value={reviewDirection}
                onChange={e => setReviewDirection(e.target.value as typeof reviewDirection)}
                className="w-full border border-gray-300 rounded px-3 py-2">
                <option value="CLIENT_TO_FREELANCER">Client → Freelancer</option>
                <option value="FREELANCER_TO_CLIENT">Freelancer → Client</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
              <input data-testid="review-rating-input" type="number" value={reviewRating}
                onChange={e => setReviewRating(parseInt(e.target.value) || 1)}
                min="1" max="5"
                className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comment (private)</label>
              <textarea data-testid="review-comment-input" value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                placeholder="Optional comment (not included in platform audit)" />
              <p className="text-xs text-gray-400 mt-1">Comment is stored privately and excluded from platform audit exports.</p>
            </div>
            <button data-testid="submit-review-btn" type="submit" disabled={reviewStatus === 'loading'}
              className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ minHeight: '44px' }}>
              {reviewStatus === 'loading' ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
