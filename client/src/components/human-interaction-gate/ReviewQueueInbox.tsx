/**
 * ReviewQueueInbox — FLOW-27 Grammar 2 queue inbox.
 *
 * Shows pending human-review items as a two-pane inbox:
 *   Left pane: list of pending items (one card per item, newest first)
 *   Right pane: selected item's full context (AI recommendation, confidence,
 *               original input, proposed output) + action row
 *
 * Ref platform (MARKET-REFERENCE-CATALOG §2 queue variant):
 *   Intercom inbox + Linear triage inbox + GitHub PR review + Gerrit.
 *
 * Hard rule per REPAIR-GUIDANCE: inbox-zero is a celebrated state, not a
 * cryptic empty table. Copy says "All caught up" with a timestamp when the
 * queue is empty.
 */

import React, { useState } from 'react';

type Recommendation = 'APPROVE' | 'REJECT' | 'ESCALATE';
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type SlaZone = 'green' | 'amber' | 'red';

const RECOMMENDATION_STYLES: Record<Recommendation, { chip: string; label: string; icon: string }> =
  {
    APPROVE: {
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'AI suggests: approve',
      icon: '✓',
    },
    REJECT: {
      chip: 'bg-red-50 text-red-700 border-red-200',
      label: 'AI suggests: reject',
      icon: '✕',
    },
    ESCALATE: {
      chip: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'AI suggests: escalate',
      icon: '↑',
    },
  };

const SEVERITY_TONES: Record<Severity, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SLA_STYLES: Record<SlaZone, { bar: string; label: string; note: string }> = {
  green: { bar: 'bg-emerald-500', label: 'Within SLA', note: 'text-emerald-700' },
  amber: { bar: 'bg-amber-500', label: 'Approaching SLA', note: 'text-amber-700' },
  red: { bar: 'bg-red-500', label: 'Overdue', note: 'text-red-700' },
};

interface QueueItem {
  id: string;
  title: string; // one-line summary
  origin: string; // which flow / system raised the gate
  raisedAt: string; // tabular-nums timestamp
  slaRemaining: string; // human-readable, e.g. "42 min"
  slaZone: SlaZone;
  severity: Severity;
  recommendation: Recommendation;
  recommendationConfidence: number; // 0..1
  originalInput: string;
  proposedOutput: string;
  rationale: string;
}

// Seed: 5 pending review items spanning severities + SLA zones + recommendations.
const SEED_ITEMS: QueueItem[] = [
  {
    id: 'HIG-2026-0420-0217',
    title: 'Escrow release request — milestone #3 for gig GIG-8412',
    origin: 'Freelancer marketplace · milestone approval',
    raisedAt: '2026-04-20 14:12',
    slaRemaining: '42 min',
    slaZone: 'amber',
    severity: 'HIGH',
    recommendation: 'APPROVE',
    recommendationConfidence: 0.84,
    originalInput:
      'Freelancer submitted deliverable: deliverables/redesign-v2.zip (3.2 MB). Milestone acceptance window: 7 days. Current window: 2 days remaining.',
    proposedOutput:
      'Release $420.00 to freelancer. Mark milestone #3 as COMPLETED. Emit flow.milestone.released event.',
    rationale:
      'Deliverable quality score 0.91; 0 prior disputes between these parties; freelancer trust score 4.7/5. Recommend approval.',
  },
  {
    id: 'HIG-2026-0420-0216',
    title: 'Cross-tenant data export — 1,240 records requested',
    origin: 'Durable sagas · GDPR compliance',
    raisedAt: '2026-04-20 13:47',
    slaRemaining: '18 min',
    slaZone: 'red',
    severity: 'CRITICAL',
    recommendation: 'ESCALATE',
    recommendationConfidence: 0.61,
    originalInput:
      'Tenant "acme-corp-42" requested full data export covering 2024-01-01 to 2026-04-20 across 7 indices.',
    proposedOutput:
      'Escalate to senior compliance officer. Export size (1,240 records) exceeds automated-approval threshold (500 records).',
    rationale:
      'Export size 2.5× automated threshold. Recent tenant activity shows pattern of escalated data requests (3 in last 14 days). Recommend escalation for senior review.',
  },
  {
    id: 'HIG-2026-0420-0215',
    title: 'Content moderation override — flagged post requested reinstatement',
    origin: 'AI safety moderation · moderation appeal',
    raisedAt: '2026-04-20 13:22',
    slaRemaining: '3h 12min',
    slaZone: 'green',
    severity: 'MEDIUM',
    recommendation: 'REJECT',
    recommendationConfidence: 0.77,
    originalInput:
      'Author "tenant-user-7612" appealed moderation decision on post POST-2026-0420-042. Automated review flagged a possible community policy issue.',
    proposedOutput:
      'Uphold original moderation decision. Keep post status flagged. Notify the author with the specific policy clause referenced.',
    rationale:
      'Post matches 2 of 8 review triggers; author has 3 prior flagged posts in the last 90 days. Recommend rejection of the appeal.',
  },
  {
    id: 'HIG-2026-0420-0214',
    title: 'Refund request over $200 — requires manual review',
    origin: 'Marketplace payments · refund review',
    raisedAt: '2026-04-20 12:58',
    slaRemaining: '1h 48min',
    slaZone: 'green',
    severity: 'LOW',
    recommendation: 'APPROVE',
    recommendationConfidence: 0.92,
    originalInput:
      'Buyer "tenant-user-3304" requested refund for order ORD-2026-0420-087 ($247.50). Reason: item-not-as-described.',
    proposedOutput:
      'Approve refund. Restore $247.50 to buyer. Debit from seller "vendor-acme-42" escrow. Emit flow.payment.refunded event.',
    rationale:
      'Buyer history clean (0 prior refunds); seller has 2 prior valid refunds in 30 days; deliverable photos support "not as described" claim.',
  },
  {
    id: 'HIG-2026-0420-0213',
    title: 'Meta-flow deployment — auto-generated Canva adapter flow ready for publish',
    origin: 'Meta flow engine · deployment approval',
    raisedAt: '2026-04-20 12:31',
    slaRemaining: '47 min',
    slaZone: 'amber',
    severity: 'HIGH',
    recommendation: 'APPROVE',
    recommendationConfidence: 0.88,
    originalInput:
      'The Canva adapter flow was prepared from a capability-gap proposal. All reviewers approved it and tests are passing.',
    proposedOutput:
      'Publish the Canva adapter flow (version 1.0.0). Register with flow registry. Notify downstream consumers.',
    rationale:
      'All required quality checks passed; 23/23 generated tests are passing; reviewer consensus is 5/5 approve; no conflicts with existing flows.',
  },
];

function SlaBar({ zone }: { zone: SlaZone }) {
  const widthByZone: Record<SlaZone, string> = {
    green: 'w-8/12',
    amber: 'w-3/12',
    red: 'w-1/12',
  };
  return (
    <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full rounded-full ${SLA_STYLES[zone].bar} ${widthByZone[zone]}`} />
    </div>
  );
}

export function ReviewQueueInbox(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(SEED_ITEMS[0].id);
  const selected = SEED_ITEMS.find((i) => i.id === selectedId) ?? SEED_ITEMS[0];
  const selectedRec = RECOMMENDATION_STYLES[selected.recommendation];

  return (
    <div
      className="flex border border-gray-200 rounded-lg overflow-hidden bg-white h-[640px]"
      data-testid="hig-review-queue"
    >
      {/* Left: queue list */}
      <div className="w-96 border-r border-gray-200 overflow-y-auto" data-testid="hig-queue-list">
        <div className="px-3 py-2 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Pending review
          </div>
          <span className="text-xs text-gray-500 tabular-nums">{SEED_ITEMS.length} items</span>
        </div>
        <ul className="list-none divide-y divide-gray-100">
          {SEED_ITEMS.map((item) => {
            const isSelected = item.id === selectedId;
            const sla = SLA_STYLES[item.slaZone];
            const rec = RECOMMENDATION_STYLES[item.recommendation];
            return (
              <li
                key={item.id}
                data-testid={`hig-queue-item-${item.id}`}
                data-item-selected={isSelected ? 'true' : 'false'}
                className={`cursor-pointer px-3 py-3 ${
                  isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedId(item.id)}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SEVERITY_TONES[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <span className={`text-[11px] font-medium tabular-nums ${sla.note}`}>
                    {item.slaRemaining}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-900 leading-snug mb-1">
                  {item.title}
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] text-gray-500">{item.origin}</span>
                </div>
                <SlaBar zone={item.slaZone} />
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${rec.chip}`}
                  >
                    <span aria-hidden="true">{rec.icon}</span>
                    {rec.label.replace('AI suggests: ', '')}
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {Math.round(item.recommendationConfidence * 100)}% confidence
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right: selected item detail */}
      <aside
        className="flex-1 overflow-y-auto p-5 bg-slate-50"
        data-testid="hig-queue-detail-panel"
        data-item-selected={selected.id}
      >
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {selected.origin}
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-1">{selected.title}</h2>
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 tabular-nums">
          <span>raised {selected.raisedAt}</span>
          <span>·</span>
          <span className={SLA_STYLES[selected.slaZone].note}>
            {SLA_STYLES[selected.slaZone].label} · {selected.slaRemaining}
          </span>
        </div>

        <div
          className={`mb-4 px-3 py-2.5 rounded-lg border ${selectedRec.chip}`}
          data-testid="hig-queue-detail-recommendation"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full font-bold"
              aria-hidden="true"
            >
              {selectedRec.icon}
            </span>
            <span className="text-sm font-semibold">{selectedRec.label}</span>
            <span className="text-xs font-normal ms-auto tabular-nums opacity-80">
              {Math.round(selected.recommendationConfidence * 100)}% confident
            </span>
          </div>
          <p className="text-xs mt-1 leading-relaxed">{selected.rationale}</p>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Original input
          </div>
          <p className="text-sm text-slate-700 bg-white rounded border border-gray-200 px-3 py-2 leading-relaxed">
            {selected.originalInput}
          </p>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Proposed output
          </div>
          <p className="text-sm text-slate-700 bg-white rounded border border-gray-200 px-3 py-2 leading-relaxed">
            {selected.proposedOutput}
          </p>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded"
            data-testid="hig-action-approve"
          >
            Approve
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-red-700 border border-red-300 hover:bg-red-50 px-4 py-1.5 rounded"
            data-testid="hig-action-reject"
          >
            Reject
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-amber-700 border border-amber-300 hover:bg-amber-50 px-4 py-1.5 rounded"
            data-testid="hig-action-escalate"
          >
            Escalate
          </button>
          <button
            type="button"
            className="ms-auto text-sm text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded"
            data-testid="hig-action-defer"
          >
            Defer
          </button>
          <button
            type="button"
            className="text-sm text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded"
            data-testid="hig-action-request-info"
          >
            Request info
          </button>
        </div>
      </aside>
    </div>
  );
}
