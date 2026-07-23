/**
 * HumanInteractionGatePage — FLOW-27 admin console for Human Interaction Gate.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-human-interaction-gate
 *
 * Derived states (UX-FIX Track UX-2, plan worked example). Sources:
 *   - P1 business-logic inventory (human-interaction-gate/P1-business-logic-inventory.md)
 *   - Server status enums from:
 *       approval-decision-capture.service.ts     → 'APPROVED' | 'REJECTED'
 *       approval-chain-orchestrator.service.ts   → 'SEQUENTIAL' | 'PARALLEL'
 *       approval-request-creator.service.ts      → 'PENDING' | 'QUEUED'
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { ReviewQueueInbox } from '../../components/human-interaction-gate/ReviewQueueInbox';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'request-pending': {
    idx: 1,
    label: 'Approval request created — awaiting reviewer',
    status: 'PENDING',
    fields: {
      requestId: 'APR-2026-0418-001',
      workflowId: 'WF-ticket-refund',
      reviewerGroup: 'compliance-team',
      createdAt: '2026-04-18 09:00',
    },
  },
  'chain-sequential': {
    idx: 2,
    label: 'Sequential approval chain started — step 1 of 3',
    status: 'SEQUENTIAL',
    fields: {
      chainId: 'CHN-2026-0418-001',
      mode: 'SEQUENTIAL',
      stepCount: '3',
      currentStep: '1',
      startedAt: '2026-04-18 09:02',
    },
  },
  'chain-parallel': {
    idx: 3,
    label: 'Parallel approval chain — 3 reviewers notified',
    status: 'PARALLEL',
    fields: {
      chainId: 'CHN-2026-0418-002',
      mode: 'PARALLEL',
      stepCount: '3',
      notifiedAt: '2026-04-18 09:05',
    },
  },
  'decision-approved': {
    idx: 4,
    label: 'Decision: approved — chain advancing',
    status: 'APPROVED',
    fields: {
      requestId: 'APR-2026-0418-001',
      decision: 'APPROVED',
      reviewer: 'ops-lead-01',
      capturedAt: '2026-04-18 10:30',
    },
  },
  'decision-rejected': {
    idx: 5,
    label: 'Decision: REJECTED — workflow halted',
    status: 'REJECTED',
    fields: {
      requestId: 'APR-2026-0418-002',
      decision: 'REJECTED',
      reviewer: 'compliance-lead',
      reason: 'Policy violation detected in line 4',
    },
  },
  'timeout-escalated': {
    idx: 6,
    label: 'Approval window expired — escalated to senior reviewer',
    status: 'ESCALATED',
    fields: {
      requestId: 'APR-2026-0418-003',
      escalatedAt: '2026-04-18 11:00',
      originalReviewer: 'mgr-team-a',
      newReviewer: 'senior-ops-lead',
    },
  },
  'task-delegated': {
    idx: 7,
    label: 'Task delegated — new assignee notified',
    status: 'DELEGATED',
    fields: {
      requestId: 'APR-2026-0418-004',
      originalAssignee: 'john.doe',
      newAssignee: 'ops-lead-02',
      delegatedAt: '2026-04-18 11:15',
    },
  },
  'request-queued': {
    idx: 8,
    label: 'Approval request queued for fan-out',
    status: 'QUEUED',
    fields: {
      requestId: 'APR-2026-0418-005',
      queueKey: 'approval-fanout',
      enqueuedAt: '2026-04-18 11:30',
    },
  },
};

export function HumanInteractionGatePage() {
  const { role } = useViewerRole('platform-admin');
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const claimed = searchParams.get('claimed') === 'true';

  // Path A: mock states — UNCHANGED
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="human-interaction-gate"
        flowId="FLOW-27"
        title="Human Interaction Gate"
        state={MOCK_STATES[mockState]}
        description="Admin view of approval requests, decisions, escalations, and delegations."
      />
    );
  }

  // Path B: role-aware approval queue and gate administration
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="hig-role">
        {/* Branch 1 — tenant-user (KEY NEW SURFACE: pending approvals inbox) */}
        <RoleScopedView.Case when="tenant-user">
          <main data-testid="hig-role-user-view" className="max-w-2xl mx-auto py-6 px-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">My Pending Approvals</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tasks waiting for your decision across all active workflows.
            </p>

            {claimed && (
              <div
                data-testid="hig-claimed-banner"
                className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-700"
              >
                <strong>You claimed this task</strong> — you are now the designated reviewer. The
                original assignee was notified.
              </div>
            )}

            <div
              data-testid="hig-task-list"
              role="list"
              aria-label="Pending approval tasks"
              className="space-y-3"
            >
              {/* Task 0 — URGENT (SLA expiring) */}
              <div
                data-testid="hig-task-0"
                role="listitem"
                className="p-4 rounded-lg border border-gray-200 bg-white"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Approve ticket refund
                </h2>
                <p className="text-xs text-gray-600 mt-1">Ticket refund workflow · Compliance team</p>
                <p
                  data-testid="hig-task-sla-0"
                  className="text-xs font-medium text-amber-700 mt-2 flex items-center gap-1"
                >
                  <span aria-hidden="true">⏱</span> 2h 14min remaining
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    data-testid="hig-approve-0"
                    aria-label="Approve: ticket refund request APR-2026-0418-001"
                    className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700"
                    style={{ minHeight: '44px' }}
                  >
                    Approve
                  </button>
                  <button
                    data-testid="hig-reject-0"
                    aria-label="Reject: ticket refund request APR-2026-0418-001"
                    className="border border-red-400 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-50"
                    style={{ minHeight: '44px' }}
                  >
                    Reject
                  </button>
                  <button
                    data-testid="hig-delegate-0"
                    aria-label="Delegate ticket refund approval to another reviewer"
                    className="text-sm text-blue-600 hover:underline self-center"
                  >
                    Delegate →
                  </button>
                </div>
              </div>

              {/* Task 1 — comfortable SLA */}
              <div
                data-testid="hig-task-1"
                role="listitem"
                className="p-4 rounded-lg border border-gray-200 bg-white"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Review content policy decision
                </h2>
                <p className="text-xs text-gray-600 mt-1">CMS compliance workflow · Legal team</p>
                <p
                  data-testid="hig-task-sla-1"
                  className="text-xs font-medium text-green-700 mt-2 flex items-center gap-1"
                >
                  <span aria-hidden="true">✓</span> 3d 6h remaining
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    data-testid="hig-approve-1"
                    aria-label="Approve: content policy decision APR-2026-0419-007"
                    className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700"
                    style={{ minHeight: '44px' }}
                  >
                    Approve
                  </button>
                  <button
                    data-testid="hig-reject-1"
                    aria-label="Reject: content policy decision APR-2026-0419-007"
                    className="border border-red-400 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-50"
                    style={{ minHeight: '44px' }}
                  >
                    Reject
                  </button>
                  <button
                    data-testid="hig-delegate-1"
                    aria-label="Delegate content policy review to another reviewer"
                    className="text-sm text-blue-600 hover:underline self-center"
                  >
                    Delegate →
                  </button>
                </div>
              </div>

              {/* Task 2 — SLA BREACHED (escalated, actions disabled) */}
              <div
                data-testid="hig-task-2"
                role="listitem"
                className="p-4 rounded-lg border border-red-300 bg-red-50"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Vendor contract approval
                </h2>
                <p className="text-xs text-gray-600 mt-1">Vendor contracts workflow · Procurement</p>
                <p
                  data-testid="hig-task-sla-2"
                  className="text-xs font-bold text-red-700 mt-2 flex items-center gap-1"
                >
                  <span aria-hidden="true">⚠</span> SLA breached — auto-escalation in progress
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    disabled
                    data-testid="hig-approve-2"
                    aria-label="Approve disabled — task has been auto-escalated"
                    className="bg-gray-200 text-gray-500 px-3 py-2 rounded text-sm font-medium cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    Approve
                  </button>
                </div>
                <p data-testid="hig-escalated-note-2" className="text-xs text-red-700 mt-2 italic">
                  This task has been escalated. Contact your manager.
                </p>
              </div>
            </div>
          </main>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-admin (gate configuration) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="hig-role-admin-view" className="max-w-4xl mx-auto p-4">
            <div
              data-testid="hig-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Approval gate admin — configure workflows and reviewer groups.
            </div>
            {/* RUN-101: tenant-admin hero tiles \u2192 compact summary row (RUN-91 pattern) */}
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4"
            >
              <span data-testid="hig-admin-active">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active approval gates
                </span>
                <span className="tabular-nums font-semibold text-slate-900">7</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="hig-admin-sla-breaches">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  SLA breaches (24h)
                </span>
                <span className="tabular-nums font-semibold text-amber-700">2</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs review</span>
              </span>
            </div>

            <div className="overflow-x-auto mb-4">
              <table data-testid="hig-admin-gates" className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Gate</th>
                    <th className="p-2 font-medium">Reviewer Group</th>
                    <th className="p-2 font-medium">Mode</th>
                    <th className="p-2 font-medium">SLA</th>
                    <th className="p-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      gate: 'WF-ticket-refund',
                      gateLabel: 'Ticket refund',
                      group: 'Compliance team',
                      mode: 'SEQUENTIAL',
                      modeLabel: 'Sequential',
                      sla: '4h',
                    },
                    {
                      gate: 'WF-cms-compliance',
                      gateLabel: 'CMS compliance',
                      group: 'Legal team',
                      mode: 'PARALLEL',
                      modeLabel: 'Parallel',
                      sla: '72h',
                    },
                    {
                      gate: 'WF-vendor-contracts',
                      gateLabel: 'Vendor contracts',
                      group: 'Procurement',
                      mode: 'SEQUENTIAL',
                      modeLabel: 'Sequential',
                      sla: '24h',
                    },
                  ].map((g, i) => (
                    <tr
                      key={i}
                      data-testid={`hig-admin-gate-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 text-sm text-gray-900">{g.gateLabel}</td>
                      <td className="p-2 text-gray-700">{g.group}</td>
                      <td className="p-2 font-medium">{g.modeLabel}</td>
                      <td className="p-2 text-gray-600">{g.sla}</td>
                      <td className="p-2 space-x-2">
                        <button
                          data-testid={`hig-admin-edit-${i}`}
                          aria-label={`Edit gate: ${g.gate}`}
                          className="text-blue-600 hover:underline text-sm font-medium"
                          style={{ minHeight: '44px' }}
                        >
                          Edit
                        </button>
                        <button
                          data-testid={`hig-admin-disable-${i}`}
                          aria-label={`Disable gate: ${g.gate}`}
                          className="text-red-600 hover:underline text-sm font-medium"
                          style={{ minHeight: '44px' }}
                        >
                          Disable
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/admin/gates/new"
                data-testid="hig-admin-add"
                className="inline-flex items-center bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-700"
                style={{ minHeight: '44px' }}
              >
                Add new approval gate →
              </a>
              <a
                href="/admin/gates/notifications"
                data-testid="hig-admin-notify"
                className="text-sm text-blue-600 hover:underline self-center"
              >
                Configure SLA breach notifications →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — platform-admin (cross-tenant audit + existing AdminCrudPanel) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="hig-role-platform-admin-view">
            <div
              data-testid="hig-platform-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform admin — cross-tenant approval gate oversight.
            </div>
            {/* RUN-101: platform-admin hero tiles \u2192 compact summary row */}
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200"
            >
              <span data-testid="hig-platform-active">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active gates (all tenants)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="hig-platform-breaches">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  SLA breaches (24h)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">12</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs action</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="hig-platform-avg-sla">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Avg resolution (7d)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">3h 22min</span>
              </span>
            </div>
            {/* RUN-73: Grammar 2 queue inbox — pending review items with
                AI recommendation + rationale + action row. Reference:
                Intercom inbox + Linear triage + GitHub PR review + Gerrit. */}
            <section
              data-testid="hig-platform-admin-queue-section"
              className="mx-4 mb-4 border border-gray-200 rounded bg-white"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Pending review queue
                </h2>
                <span className="text-xs text-gray-500">
                  Newest first · click an item for context + actions
                </span>
              </div>
              <ReviewQueueInbox />
            </section>

            {/* Preserved: raw index available for platform administration */}
            <details
              open
              className="mx-4 mb-4 border border-gray-200 rounded bg-white"
              data-testid="hig-platform-raw-index-details"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
                Gate record browser
              </summary>
              <AdminCrudPanel
                slug="human-interaction-gate"
                indexName="xiigen-human-interaction-gate"
                title="Human Interaction Gate"
                description="Record browser for approval gate entries."
                classification="ADMIN_FACING"
                defaultExpanded
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'status', label: 'Status' },
                  { key: 'notes', label: 'Notes' },
                ]}
                formFields={[
                  { name: 'name', label: 'Name', required: true },
                  { name: 'status', label: 'Status', required: true },
                  { name: 'notes', label: 'Notes', type: 'textarea' },
                ]}
              />
            </details>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-support (V-R12-A1: read-only review-queue inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="hig-role-platform-support-view">
            <div
              data-testid="hig-support-readonly-banner"
              role="note"
              className="mx-4 mt-4 mb-3 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <span aria-hidden="true" className="mt-0.5 flex-shrink-0">🔒</span>
              <span>
                <span className="font-semibold">Human Interaction Gate</span> — read-only for
                support access. Controls are disabled. Escalate to a platform-admin for any
                change.
              </span>
            </div>
            {/* RUN-101 platform summary row rendered read-only. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="hig-support-active">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active gates (all tenants)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="hig-support-breaches">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  SLA breaches (24h)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">12</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs action</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="hig-support-avg-sla">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Avg resolution (7d)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">3h 22min</span>
              </span>
            </div>
            {/* Disabled fieldset — natively disables every nested button/input.
                V-R15 Wave 5 Fix #7: bumped visual dim from opacity-75 → 55 and
                added a subtle desaturate + grayscale so disabled buttons read
                as obviously non-interactive, not just "slightly faded". */}
            <fieldset
              data-testid="hig-support-readonly-queue"
              disabled
              aria-disabled="true"
              aria-label="Pending review queue (read-only)"
              className="m-0 p-0 border-0 opacity-55 saturate-50"
              style={{ pointerEvents: 'none', filter: 'grayscale(0.4)' }}
            >
              <section
                data-testid="hig-support-queue-section"
                className="mx-4 mb-4 border border-gray-200 rounded bg-white"
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Pending review queue
                  </h2>
                  <span className="text-xs text-gray-500">
                    Read-only inspector · click an item for context
                  </span>
                </div>
                <ReviewQueueInbox />
              </section>
            </fieldset>
            <div className="mx-4 mb-4">
              <a
                href="/support/escalate?topic=human-interaction-gate"
                data-testid="hig-support-escalate"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                style={{ minHeight: '44px' }}
              >
                Escalate to platform-admin →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — anonymous, referral-user, freelancer, business-partner, event-organiser */}
        <RoleScopedView.Fallback>
          <div data-testid="hig-fallback-view" className="p-4 text-sm text-gray-400">
            Approval gates are not available for your current role.
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
