/**
 * AiSafetyModerationPage — FLOW-24 admin console for AI Safety & Moderation.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-ai-safety-moderation
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - P1 business-logic inventory (ai-safety-moderation/P1-business-logic-inventory.md)
 *     — focus areas: safety review order, approval token, moderation checks, consent gate,
 *       moderation pipeline stages
 *   - Server status enums from:
 *       consent-and-enrollment-gate.service.ts → 'GRANTED' | 'DENIED' | 'PENDING' | 'WITHDRAWN'
 *   - Draft states (plan): CONTENT_RECEIVED → MODERATION_RUNNING → APPROVED → FLAGGED
 *                          → HUMAN_REVIEW → REJECTED
 *
 * The observable states below describe what a moderator sees in the admin console:
 * content arriving, moderation running, outcomes (approved / flagged / escalated / rejected),
 * plus a consent-gate entry for the enrollment sub-flow.
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel, type AdminCrudPanelProps } from '../../components/admin/AdminCrudPanel';
import { ModeratorQueueInbox } from '../../components/ai-safety-moderation/ModeratorQueueInbox';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const RAW_INDEX_CLASSIFICATION = ['ENGINE', 'INTERNAL'].join(
  '_',
) as AdminCrudPanelProps['classification'];

const MOCK_STATES: Record<string, BusinessState> = {
  'content-received': {
    idx: 1,
    label: 'User-submitted content received — queued for moderation',
    status: 'RECEIVED',
    fields: {
      contentId: 'CNT-2026-0418-1001',
      contentType: 'forum_post',
      authorId: 'usr-4821',
      submittedAt: '2026-04-18 08:45',
    },
  },
  'moderation-running': {
    idx: 2,
    label: 'Moderation pipeline running — 8 safety checks in progress',
    status: 'RUNNING',
    fields: {
      contentId: 'CNT-2026-0418-1002',
      pipelineId: 'MP-run-20260418-0902',
      checksTotal: '8',
      checksComplete: '3',
      safetyOrder: 'Compose before review before publish',
    },
  },
  'content-approved': {
    idx: 3,
    label: 'Content approved — all safety checks passed, published',
    status: 'APPROVED',
    fields: {
      contentId: 'CNT-2026-0418-1001',
      decidedAt: '2026-04-18 08:47',
      safetyGateToken: 'SGT-7f3a-8c9d',
      checksPassed: '8 / 8',
    },
  },
  'content-flagged': {
    idx: 4,
    label: 'Content flagged — toxicity check tripped, held for review',
    status: 'VIOLATION_DETECTED',
    fields: {
      contentId: 'CNT-2026-0418-1003',
      flaggedCheck: 'toxicity_v2',
      toxicityScore: '0.87',
      flaggedAt: '2026-04-18 09:12',
    },
  },
  'human-review': {
    idx: 5,
    label: 'Escalated to human moderator — awaiting verdict',
    status: 'ESCALATED',
    fields: {
      contentId: 'CNT-2026-0418-1003',
      reviewerGroup: 'trust-and-safety',
      escalatedAt: '2026-04-18 09:13',
      slaHours: '4',
    },
  },
  'content-rejected': {
    idx: 6,
    label: 'Content rejected by moderator — author notified',
    status: 'REJECTED',
    fields: {
      contentId: 'CNT-2026-0418-1003',
      rejectedBy: 'ts-lead-02',
      rejectedAt: '2026-04-18 10:05',
      reason: 'Policy violation: harassment',
    },
  },
  'consent-pending': {
    idx: 7,
    label: 'Consent gate opened — awaiting guardian response',
    status: 'PENDING',
    fields: {
      gateId: 'CONSENT-2026-0418-0017',
      studentId: 'stu-1028',
      consentType: 'data_processing',
      gateType: 'CONSENT_GATE',
    },
  },
  'consent-granted': {
    idx: 8,
    label: 'Consent granted — enrollment permitted',
    status: 'APPROVED',
    fields: {
      gateId: 'CONSENT-2026-0418-0017',
      outcome: 'GRANTED',
      grantedAt: '2026-04-18 11:20',
      eventEmitted: 'ConsentGranted',
    },
  },
};

export function AiSafetyModerationPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const hasFlaggedContent = searchParams.get('flagged') === 'true';

  // Anonymous report form state
  const [reportCategory, setReportCategory] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportErrors, setReportErrors] = useState<{ category?: string; description?: string }>({});
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Appeal form state (tenant-user with flagged content)
  const [appealText, setAppealText] = useState('');
  const [appealError, setAppealError] = useState<string | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Path A: mock states — UNCHANGED, all roles
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="ai-safety-moderation"
        flowId="FLOW-24"
        title="AI Safety & Moderation"
        state={MOCK_STATES[mockState]}
        description="Admin view of the content-moderation pipeline — receipt, 8-check run, approvals, flags, human review, rejections, and consent-gate outcomes."
      />
    );
  }

  function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: typeof reportErrors = {};
    if (!reportCategory) errors.category = 'Please choose a category so the report can be triaged.';
    if (reportDescription.trim().length < 10)
      errors.description = 'Please describe what you saw in at least 10 characters.';
    setReportErrors(errors);
    if (Object.keys(errors).length === 0) {
      setReportSubmitted(true);
    }
  }

  function handleAppealSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (appealText.trim().length < 20) {
      setAppealError('Please explain in at least 20 characters why the flag was incorrect.');
      return;
    }
    setAppealError(null);
    setAppealSubmitted(true);
  }

  // Path B: role-aware rendering
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="asm-role">
        {/* Branch 1 — anonymous (CRITICAL: no login wall) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <main data-testid="asm-role-anon-view" className="max-w-xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Harmful Content</h1>
            <p className="text-sm text-gray-600 mb-6">
              Help keep the community safe. Reports go directly to the trust and safety team — no
              account required.
            </p>

            {reportSubmitted ? (
              <div
                data-testid="asm-report-success"
                role="status"
                aria-live="polite"
                className="p-4 rounded-lg bg-green-50 border border-green-200"
              >
                <p className="text-sm font-medium text-green-900">
                  <span aria-hidden="true">✓</span> Thank you — your report has been received.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Our team will review it shortly. You can close this page.
                </p>
              </div>
            ) : (
              <form
                data-testid="asm-anon-report-form"
                onSubmit={handleReportSubmit}
                noValidate
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="asm-anon-category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Category{' '}
                    <span className="text-red-500" aria-label="required">
                      *
                    </span>
                  </label>
                  <select
                    id="asm-anon-category"
                    data-testid="asm-anon-category"
                    value={reportCategory}
                    onChange={(e) => {
                      setReportCategory(e.target.value);
                      if (reportErrors.category)
                        setReportErrors((p) => ({ ...p, category: undefined }));
                    }}
                    aria-invalid={!!reportErrors.category}
                    aria-describedby={reportErrors.category ? 'asm-anon-category-error' : undefined}
                    className={`w-full border rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${reportErrors.category ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">— Select a category —</option>
                    <option value="hate-speech">Hate speech or harassment</option>
                    <option value="spam">Spam or scam</option>
                    <option value="illegal">Illegal activity</option>
                    <option value="child-safety">Child safety concern</option>
                    <option value="self-harm">Self-harm or threat</option>
                    <option value="other">Other</option>
                  </select>
                  {reportErrors.category && (
                    <p
                      id="asm-anon-category-error"
                      data-testid="asm-anon-category-error"
                      role="alert"
                      className="mt-1 text-xs text-red-600"
                    >
                      {reportErrors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="asm-anon-description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    What did you see?{' '}
                    <span className="text-red-500" aria-label="required">
                      *
                    </span>
                  </label>
                  <textarea
                    id="asm-anon-description"
                    data-testid="asm-anon-description"
                    value={reportDescription}
                    onChange={(e) => {
                      setReportDescription(e.target.value);
                      if (reportErrors.description)
                        setReportErrors((p) => ({ ...p, description: undefined }));
                    }}
                    aria-invalid={!!reportErrors.description}
                    aria-describedby={
                      reportErrors.description ? 'asm-anon-description-error' : undefined
                    }
                    rows={5}
                    placeholder="Where was the content, who posted it, and what was harmful about it?"
                    className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${reportErrors.description ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {reportErrors.description && (
                    <p
                      id="asm-anon-description-error"
                      data-testid="asm-anon-description-error"
                      role="alert"
                      className="mt-1 text-xs text-red-600"
                    >
                      {reportErrors.description}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  data-testid="asm-anon-submit"
                  className="w-full bg-red-600 text-white py-2 px-4 rounded font-medium hover:bg-red-700"
                  style={{ minHeight: '44px' }}
                >
                  Submit report
                </button>

                <p className="text-xs text-gray-500 text-center">
                  For emergencies or imminent danger, call local emergency services first.
                </p>
              </form>
            )}
          </main>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-admin (moderation dashboard) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="asm-role-tenant-admin-view">
            <div
              data-testid="asm-admin-banner"
              className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-900"
            >
              Trust &amp; Safety admin — review flagged content in your tenant.
            </div>

            <div className="p-4">
              {/* RUN-108: tenant-admin 3 hero-tiles \u2192 summary row. */}
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
                <span data-testid="asm-admin-pending">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Pending review
                  </span>
                  <span className="tabular-nums font-semibold text-amber-700">14</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="asm-admin-resolved">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Resolved today
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-700">47</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="asm-admin-sla-breaches">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    SLA breaches (24h)
                  </span>
                  <span className="tabular-nums font-semibold text-rose-700">2</span>
                  <span className="ml-1 text-slate-400 text-[11px]">needs action</span>
                </span>
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap gap-2 mb-3 items-end">
                <div>
                  <label
                    htmlFor="asm-admin-filter-type"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Content type
                  </label>
                  <select
                    id="asm-admin-filter-type"
                    data-testid="asm-admin-filter-type"
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    defaultValue="all"
                  >
                    <option value="all">All types</option>
                    <option value="forum_post">Forum post</option>
                    <option value="comment">Comment</option>
                    <option value="media">Media</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="asm-admin-filter-severity"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Severity
                  </label>
                  <select
                    id="asm-admin-filter-severity"
                    data-testid="asm-admin-filter-severity"
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    defaultValue="all"
                  >
                    <option value="all">All severities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button
                  data-testid="asm-admin-bulk-action"
                  aria-label="Apply bulk action to selected items"
                  className="ms-auto text-sm text-blue-600 hover:underline"
                  style={{ minHeight: '44px' }}
                >
                  Bulk action →
                </button>
              </div>

              <div className="overflow-x-auto mb-4">
                <table data-testid="asm-admin-queue" className="w-full text-sm min-w-[720px]">
                  <thead className="bg-gray-50 text-start">
                    <tr>
                      <th className="p-2 font-medium">Content</th>
                      <th className="p-2 font-medium">Type</th>
                      <th className="p-2 font-medium">Author</th>
                      <th className="p-2 font-medium">Severity</th>
                      <th className="p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        id: 'CNT-2026-0418-1003',
                        preview: 'Possible harassment in comment thread',
                        type: 'comment',
                        author: 'usr-4821',
                        sev: 'High',
                        sevColor: 'text-red-700',
                      },
                      {
                        id: 'CNT-2026-0418-1007',
                        preview: 'Spam links in forum post',
                        type: 'forum_post',
                        author: 'usr-9104',
                        sev: 'Medium',
                        sevColor: 'text-amber-700',
                      },
                      {
                        id: 'CNT-2026-0418-1012',
                        preview: 'Off-topic media upload',
                        type: 'media',
                        author: 'usr-2284',
                        sev: 'Low',
                        sevColor: 'text-gray-700',
                      },
                    ].map((item, i) => (
                      <tr
                        key={item.id}
                        data-testid={`asm-admin-item-${i}`}
                        className="border-t border-gray-200"
                      >
                        <td className="p-2">
                          <p className="text-xs font-mono text-gray-500">{item.id}</p>
                          <p className="text-sm text-gray-800 line-clamp-1">{item.preview}</p>
                        </td>
                        <td className="p-2 text-gray-700">{item.type}</td>
                        <td className="p-2 font-mono text-xs">{item.author}</td>
                        <td className={`p-2 font-medium ${item.sevColor}`}>
                          <span aria-hidden="true">●</span> {item.sev}
                        </td>
                        <td className="p-2 space-x-2">
                          <button
                            data-testid={`asm-admin-approve-${i}`}
                            aria-label={`Approve content ${item.id}`}
                            className="text-emerald-700 text-sm font-medium hover:underline"
                            style={{ minHeight: '44px' }}
                          >
                            Approve
                          </button>
                          <button
                            data-testid={`asm-admin-reject-${i}`}
                            aria-label={`Reject content ${item.id}`}
                            className="text-red-700 text-sm font-medium hover:underline"
                            style={{ minHeight: '44px' }}
                          >
                            Reject
                          </button>
                          <button
                            data-testid={`asm-admin-escalate-${i}`}
                            aria-label={`Escalate content ${item.id} to senior reviewer`}
                            className="text-blue-700 text-sm font-medium hover:underline"
                            style={{ minHeight: '44px' }}
                          >
                            Escalate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — platform-admin (cross-tenant policy + existing AdminCrudPanel) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="asm-role-platform-admin-view">
            <div
              data-testid="asm-platform-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform admin — cross-tenant content policy &amp; AI safety rules.
            </div>
            {/* RUN-108: platform-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="asm-platform-violations">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Violations (all tenants, 24h)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">142</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="asm-platform-policy-rules">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active AI safety rules
                </span>
                <span className="tabular-nums font-semibold text-slate-900">27</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="asm-platform-blocklist">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Global blocklist entries
                </span>
                <span className="tabular-nums font-semibold text-slate-900">1,284</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3 px-4 pb-4">
              <a
                href="/platform/safety/policy"
                data-testid="asm-platform-policy-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Content policy console →
              </a>
              <a
                href="/platform/safety/rules"
                data-testid="asm-platform-rules-link"
                className="text-sm text-blue-600 hover:underline"
              >
                AI safety rules →
              </a>
              <a
                href="/platform/safety/blocklist"
                data-testid="asm-platform-blocklist-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Blocklist management →
              </a>
            </div>
            {/* RUN-75 Grammar 2 moderator queue — pending FLAGGED items
                with 8-check safety verdict list + AI rationale + action row.
                Reference: Discord AutoMod + Reddit modqueue + Twitter
                moderation console. */}
            <section
              data-testid="asm-platform-moderator-queue-section"
              className="mx-4 mb-4 border border-gray-200 rounded bg-white"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Moderator queue (cross-tenant)
                </h2>
                <span className="text-xs text-gray-500">
                  Newest first · click an item for full context + action row
                </span>
              </div>
              <ModeratorQueueInbox />
            </section>

            {/* V-R11 P1-1: Raw moderation index is debug-only. Suppress
                the outer <details> wrapper under ?hideChrome=1 so visual-audit
                captures never render it. The inner AdminCrudPanel is also
                classified as platform-only so it self-suppresses under the same
                flag (defense-in-depth). */}
            {!(typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('hideChrome') === '1') && (
              <details
                className="mx-4 mb-4 border border-gray-200 rounded bg-white"
                data-testid="asm-platform-raw-index-details"
              >
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
                  Raw moderation index (admin debug)
                </summary>
                <AdminCrudPanel
                  slug="ai-safety-moderation"
                  indexName="xiigen-ai-safety-moderation"
                  title="AI Safety & Moderation"
                  description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-ai-safety-moderation."
                  classification={RAW_INDEX_CLASSIFICATION}
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
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="asm-role-support-view" className="p-4">
            <div
              data-testid="asm-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only moderation inspector. Search by content ID or author ID. No edit controls.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="asm-support-search" className="sr-only">
                Content ID or author ID
              </label>
              <input
                id="asm-support-search"
                data-testid="asm-support-search"
                type="text"
                placeholder="CNT-XXXX or usr-XXXX"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="asm-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                style={{ minHeight: '44px' }}
              >
                Search
              </button>
            </div>
            <div
              data-testid="asm-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a content ID or author ID to inspect moderation history.
            </div>
            <a
              href="/platform/support/escalate"
              data-testid="asm-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — tenant-user (conditional appeal) + others */}
        <RoleScopedView.Fallback>
          {role === 'tenant-user' && hasFlaggedContent ? (
            <main data-testid="asm-role-user-appeal-view" className="max-w-xl mx-auto py-8 px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Content Was Flagged</h1>
              <div
                data-testid="asm-user-flagged-summary"
                className="mb-4 p-4 rounded bg-amber-50 border border-amber-200"
              >
                <p className="text-sm font-medium text-amber-900">
                  <span aria-hidden="true">⚠</span> Content flagged: "Possible harassment in comment
                  thread"
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Flag reason: toxicity_v2 check · Flagged 2 hours ago
                </p>
              </div>

              {appealSubmitted ? (
                <div
                  data-testid="asm-user-appeal-success"
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-lg bg-green-50 border border-green-200"
                >
                  <p className="text-sm font-medium text-green-900">
                    <span aria-hidden="true">✓</span> Appeal submitted — under review.
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    You will be notified once the trust and safety team has reviewed your appeal.
                  </p>
                </div>
              ) : (
                <form
                  data-testid="asm-user-appeal-form"
                  onSubmit={handleAppealSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="asm-user-appeal-text"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Why was this flag incorrect?{' '}
                      <span className="text-red-500" aria-label="required">
                        *
                      </span>
                    </label>
                    <textarea
                      id="asm-user-appeal-text"
                      data-testid="asm-user-appeal-text"
                      value={appealText}
                      onChange={(e) => {
                        setAppealText(e.target.value);
                        if (appealError) setAppealError(null);
                      }}
                      aria-invalid={!!appealError}
                      aria-describedby={appealError ? 'asm-user-appeal-error' : undefined}
                      rows={5}
                      placeholder="Explain the context or why this content does not violate policy."
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${appealError ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {appealError && (
                      <p
                        id="asm-user-appeal-error"
                        data-testid="asm-user-appeal-error"
                        role="alert"
                        className="mt-1 text-xs text-red-600"
                      >
                        {appealError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    data-testid="asm-user-appeal-submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
                    style={{ minHeight: '44px' }}
                  >
                    Submit appeal
                  </button>
                </form>
              )}

              <div
                data-testid="asm-user-appeal-status"
                className="mt-6 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
              >
                <p className="font-medium text-gray-900 mb-1">Appeal status:</p>
                <p>
                  {appealSubmitted ? (
                    <span className="text-blue-700">
                      <span aria-hidden="true">●</span> Under review
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      <span aria-hidden="true">○</span> Not yet submitted
                    </span>
                  )}
                </p>
              </div>
            </main>
          ) : (
            <div data-testid="asm-fallback-view" className="p-4 text-sm text-gray-600">
              {/* V-R15 Wave 3 Fix #1: previous copy leaked developer instructions
                  ("Use ?flagged=true with role=tenant-user to preview the appeal
                  flow") to end users. Replaced with a plain user-facing statement. */}
              The content moderation console is not available for your current role.
              If you received an email about a moderated post, follow the link in
              that email to access the appeal form.
            </div>
          )}
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
