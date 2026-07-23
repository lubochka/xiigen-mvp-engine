/**
 * FeedbackWidget — FLOW-38 cross-cutting substrate.
 *
 * Role-aware shared component for AI-generated content feedback. Any host page
 * (FLOW-29 deep research, FLOW-13 analytics, etc.) can render `<FeedbackWidget />`
 * and the widget picks the right variant for the current viewer role internally.
 *
 * Variants:
 *   - tenant-user (default)   thumbs up/down + optional comment, low friction
 *   - tenant-admin            baseline + aggregated workspace score beneath
 *   - platform-admin          baseline + cross-tenant analytics panel
 *   - platform-support        read-only feedback log (no voting)
 *   - Fallback (anon, etc.)   baseline (same as tenant-user)
 *
 * Icons: lucide-react SVG (ThumbsUp/ThumbsDown). No emoji as functional icons.
 *
 * Created for RUN-32. Fleet impact: any page importing this widget automatically
 * becomes role-aware — no per-page change needed.
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useViewerRole } from '../../hooks/useViewerRole';

export interface FeedbackWidgetProps {
  /** Identifier for the content being rated (e.g., response ID, cycle ID). */
  contentId?: string;
  /** Optional label displayed above the widget (e.g., "Was this answer helpful?"). */
  prompt?: string;
  /** Submit handler — host page can intercept for analytics. Defaults to a no-op log. */
  onSubmit?: (vote: 'up' | 'down', comment: string) => void;
}

type VoteState = 'idle' | 'up' | 'down' | 'submitted';

interface FeedbackLogEntry {
  id: string;
  vote: 'up' | 'down';
  comment: string;
  timestamp: string;
  tenant: string; // anonymised
}

const SAMPLE_FEEDBACK_LOG: FeedbackLogEntry[] = [
  {
    id: 'FB-0417-001',
    vote: 'up',
    comment: 'Great summary, saved me time.',
    timestamp: '2026-04-17 09:12',
    tenant: 'tenant-***-a1b2',
  },
  {
    id: 'FB-0417-007',
    vote: 'down',
    comment: 'Response cited an outdated source.',
    timestamp: '2026-04-17 14:40',
    tenant: 'tenant-***-c3d4',
  },
  {
    id: 'FB-0418-003',
    vote: 'up',
    comment: '',
    timestamp: '2026-04-18 10:02',
    tenant: 'tenant-***-e5f6',
  },
];

export function FeedbackWidget({
  contentId,
  prompt = 'Was this helpful?',
  onSubmit,
}: FeedbackWidgetProps) {
  const { role } = useViewerRole();
  const [vote, setVote] = useState<VoteState>('idle');
  const [comment, setComment] = useState('');

  function handleVote(choice: 'up' | 'down') {
    setVote(choice);
  }

  function handleSubmit() {
    if (vote !== 'up' && vote !== 'down') return;
    if (onSubmit) {
      onSubmit(vote, comment);
    } else {
      // eslint-disable-next-line no-console
      console.log('[FeedbackWidget] vote submitted', { contentId, vote, comment });
    }
    setVote('submitted');
  }

  // Platform-support: read-only feedback log (no voting UI)
  if (role === 'platform-support') {
    return (
      <div
        data-testid="feedback-widget"
        data-viewer-role={role}
        className="mt-4 p-3 border border-gray-200 rounded bg-gray-50"
      >
        <p
          data-testid="feedback-support-heading"
          className="text-xs font-semibold text-gray-700 uppercase mb-2"
        >
          Feedback log (read-only)
        </p>
        <ul
          data-testid="feedback-support-log"
          className="space-y-2 text-xs text-gray-700"
        >
          {SAMPLE_FEEDBACK_LOG.map((entry, i) => (
            <li
              key={entry.id}
              data-testid={`feedback-support-entry-${i}`}
              className="flex gap-3 items-start"
            >
              <span
                className={`inline-flex items-center gap-1 font-semibold ${entry.vote === 'up' ? 'text-emerald-700' : 'text-red-700'}`}
                aria-hidden="true"
              >
                {entry.vote === 'up' ? (
                  <ThumbsUp size={14} strokeWidth={2} />
                ) : (
                  <ThumbsDown size={14} strokeWidth={2} />
                )}
              </span>
              <div className="flex-1">
                <p className="text-gray-800">
                  {entry.comment || <span className="italic text-gray-400">No comment</span>}
                </p>
                <p className="text-gray-500 mt-0.5">
                  {entry.tenant} · {entry.timestamp}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // All other roles: voting UI + variant-specific extras
  return (
    <div
      data-testid="feedback-widget"
      data-viewer-role={role}
      className="mt-4 p-3 border border-gray-200 rounded bg-white"
    >
      {vote === 'submitted' ? (
        <p
          data-testid="feedback-thanks"
          role="status"
          aria-live="polite"
          className="text-sm text-emerald-700 font-medium"
        >
          <span aria-hidden="true">✓</span> Thanks for your feedback.
        </p>
      ) : (
        <>
          <p
            data-testid="feedback-prompt"
            className="text-sm font-medium text-gray-700 mb-2"
          >
            {prompt}
          </p>

          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              data-testid="feedback-vote-up"
              aria-label="Helpful"
              aria-pressed={vote === 'up'}
              onClick={() => handleVote('up')}
              className={`inline-flex items-center justify-center border rounded px-3 ${vote === 'up' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <ThumbsUp size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              data-testid="feedback-vote-down"
              aria-label="Not helpful"
              aria-pressed={vote === 'down'}
              onClick={() => handleVote('down')}
              className={`inline-flex items-center justify-center border rounded px-3 ${vote === 'down' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <ThumbsDown size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {(vote === 'up' || vote === 'down') && (
            <div data-testid="feedback-comment-wrapper" className="mt-2">
              <label
                htmlFor="feedback-comment"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Tell us more <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="feedback-comment"
                data-testid="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="What worked — or didn't?"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                data-testid="feedback-submit"
                onClick={handleSubmit}
                className="mt-2 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Submit feedback
              </button>
            </div>
          )}
        </>
      )}

      {/* Tenant-admin: workspace aggregate beneath the widget */}
      {role === 'tenant-admin' && (
        <div
          data-testid="feedback-workspace-score"
          className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600"
        >
          <span className="font-medium">Workspace rating:</span>{' '}
          <span className="text-emerald-700 font-semibold">4.2 / 5</span> from{' '}
          <span className="font-semibold">18 users</span> on this response type
        </div>
      )}

      {/* Platform-admin: full cross-tenant analytics */}
      {role === 'platform-admin' && (
        <div
          data-testid="feedback-analytics-panel"
          className="mt-3 pt-3 border-t border-gray-200"
        >
          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
            Cross-tenant feedback analytics
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div
              data-testid="feedback-analytics-overall"
              className="p-2 rounded bg-emerald-50 border border-emerald-200"
            >
              <p className="text-emerald-700 uppercase">Overall</p>
              <p className="text-base font-bold text-emerald-900">4.1 / 5</p>
            </div>
            <div
              data-testid="feedback-analytics-votes"
              className="p-2 rounded bg-blue-50 border border-blue-200"
            >
              <p className="text-blue-700 uppercase">Votes (7d)</p>
              <p className="text-base font-bold text-blue-900">2,847</p>
            </div>
            <div
              data-testid="feedback-analytics-trend"
              className="p-2 rounded bg-purple-50 border border-purple-200"
            >
              <p className="text-purple-700 uppercase">Trend</p>
              <p className="text-base font-bold text-purple-900">
                ↑ +0.12
              </p>
            </div>
            <div
              data-testid="feedback-analytics-model"
              className="p-2 rounded bg-slate-50 border border-slate-200"
            >
              <p className="text-slate-700 uppercase">Model</p>
              <p className="text-base font-bold text-slate-900">gpt-4o-mini</p>
            </div>
          </div>
          <a
            href="/platform/rag-quality"
            data-testid="feedback-analytics-link"
            className="inline-block mt-2 text-xs text-blue-600 hover:underline"
          >
            Open full RAG quality dashboard →
          </a>
        </div>
      )}
    </div>
  );
}

export default FeedbackWidget;
