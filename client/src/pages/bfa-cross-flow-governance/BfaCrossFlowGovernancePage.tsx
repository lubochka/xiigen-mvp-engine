/**
 * BfaCrossFlowGovernancePage — FLOW-25 "Cross-Flow Policy Review".
 *
 * RUN-122 Luba directive (2026-04-20): the user-visible terminology has been
 * audited. "BFA" (Business-Flow Arbitration) is XIIGen-internal vocabulary
 * that reads as meaningless acronym salad to anyone operating the platform,
 * including developer humans. Replaced on every visible string:
 *   "BFA Cross-Flow Governance"        → "Cross-Flow Policy Review"
 *   "BFA Policy Console"               → "Policy Console"
 *   "BFA rules"                        → "cross-flow policies" / "policies"
 *   "BFA audit run"                    → "policy audit run"
 *   "Trigger BFA audit run"            → "Run policy audit"
 *   "CF-{NNN}" rule IDs                → paired with a plain-language rule name
 * Internal-slug retention: the `slug`, `flowId`, `data-testid` values still use
 * bfa-cross-flow-governance so routes, tests and analytics continue to work.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-34)
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - P1 business-logic inventory: change-intake-parse, blast-radius-traversal,
 *     arbitration-state-machine, cross-tenant-guard
 *   - Draft states (plan): DRAFT → PUBLISHED → VIOLATION_DETECTED → ENFORCED → SUSPENDED
 *
 * Role-aware (RUN-34 + RUN-122):
 *   - platform-admin   → full Policy Console (rule list, edit controls, audit-run, conflict resolution)
 *   - tenant-admin     → read-only filtered view; rule-IDs hidden (UX-21); request-rule-change link only
 *   - platform-support → full rule list, edit controls DISABLED (not hidden) so layout is visible
 *   - others           → fallback "not available for your role"
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shield, Pause, Play, AlertTriangle, Eye, Lock, Zap, FileEdit } from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { ConflictScanMatrix } from '../../components/bfa-cross-flow-governance/ConflictScanMatrix';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'rule-draft': {
    idx: 1,
    label: 'Cross-flow rule drafted — awaiting blast-radius traversal',
    status: 'DRAFT',
    fields: {
      ruleId: 'CF-841',
      ruleType: 'FLOW_ORDERING',
      scope: 'engine',
      draftedBy: 'governance-ops',
      draftedAt: '2026-04-18 08:00',
    },
  },
  'change-ingested': {
    idx: 2,
    label: 'Change intake parsed — content hash captured, deduplicated',
    status: 'CAPTURED',
    fields: {
      changeId: 'CHG-2026-0418-0042',
      contentHash: 'sha256:3f8a…9c2e',
      parsedBy: 'Change intake parser',
      ingestedAt: '2026-04-18 08:02',
    },
  },
  'blast-radius-computed': {
    idx: 3,
    label: 'Blast-radius traversal complete — 7 flows impacted',
    status: 'RUNNING',
    fields: {
      changeId: 'CHG-2026-0418-0042',
      affectedFlows: '7',
      maxDepth: '4',
      cycleSafe: 'true',
      traversalAlgo: 'Depth-first blast-radius scan',
    },
  },
  'rule-published': {
    idx: 4,
    label: 'Policy published \u2014 effective immediately across all tenants',
    status: 'PUBLISHED',
    fields: {
      ruleId: 'CF-841',
      publishedAt: '2026-04-18 09:30',
      publishedBy: 'bfa-architect-01',
      affectedFlows: '7',
    },
  },
  'violation-detected': {
    idx: 5,
    label: 'Arbitration state machine — violation detected in flow run',
    status: 'VIOLATION_DETECTED',
    fields: {
      ruleId: 'CF-841',
      violatingFlow: 'FLOW-17',
      runId: 'run-20260418-1015',
      arbitrationState: 'HUMAN_CAPTURE',
      detectedAt: '2026-04-18 10:15',
    },
  },
  'rule-enforced': {
    idx: 6,
    label: 'Rule enforced — violating flow run halted',
    status: 'ENFORCED',
    fields: {
      ruleId: 'CF-841',
      runId: 'run-20260418-1015',
      enforcedAt: '2026-04-18 10:16',
      action: 'HALT_AND_ROLLBACK',
    },
  },
  'cross-tenant-guard': {
    idx: 7,
    label: 'Cross-tenant guard tripped — isolation gate blocked bleed',
    status: 'VIOLATION_DETECTED',
    fields: {
      ruleId: 'CF-841',
      sourceTenant: 'tenant-A',
      targetTenant: 'tenant-B',
      guardCheck: 'Cross-tenant isolation guard',
      blockedAt: '2026-04-18 10:45',
    },
  },
  'rule-suspended': {
    idx: 8,
    label: 'Rule suspended — overridden by ADR review',
    status: 'SUSPENDED',
    fields: {
      ruleId: 'CF-841',
      suspendedBy: 'engine-architect-03',
      suspendReason: 'ADR-2026-014',
      suspendedAt: '2026-04-18 14:00',
    },
  },
};

interface BfaRule {
  ruleId: string; // engine-internal CF-number (NOT shown to tenant-admin)
  humanName: string; // human-readable name safe for any role
  flowA: string;
  flowB: string;
  condition: string;
  status: 'active' | 'paused' | 'draft';
  affectsTenant: boolean; // filter flag for tenant-admin view
}

const SAMPLE_RULES: BfaRule[] = [
  {
    ruleId: 'CF-841',
    humanName: 'Payment dispute blocks gig completion',
    flowA: 'Marketplace payments',
    flowB: 'Freelancer marketplace',
    condition: 'If a payment is in DISPUTE, the related gig cannot be marked complete.',
    status: 'active',
    affectsTenant: true,
  },
  {
    ruleId: 'CF-821',
    humanName: 'Subscription gate before ads spend',
    flowA: 'Subscription billing',
    flowB: 'Ads platform',
    condition: 'If the subscription is SUSPENDED, the ads platform blocks outbound spend.',
    status: 'active',
    affectsTenant: false,
  },
  {
    ruleId: 'CF-814',
    humanName: 'Fraud flag halts review posting',
    flowA: 'AI safety moderation',
    flowB: 'Reviews & reputation',
    condition: 'If moderation flags a user as fraudulent, review posting is blocked for 24h.',
    status: 'paused',
    affectsTenant: true,
  },
  {
    ruleId: 'CF-803',
    humanName: 'Cross-tenant data isolation (draft)',
    flowA: 'SaaS multi-tenancy',
    flowB: 'Data warehouse analytics',
    condition: 'Tenant-scoped exports must not be ingested into another tenant’s warehouse.',
    status: 'draft',
    affectsTenant: false,
  },
];

interface PolicyConflict {
  conflictId: string;
  ruleA: string;
  ruleB: string;
  summary: string;
}

const SAMPLE_CONFLICTS: PolicyConflict[] = [
  {
    conflictId: 'CC-202604-001',
    ruleA: 'CF-841',
    ruleB: 'CF-829',
    summary: 'Both rules trigger on gig completion with opposing actions (halt vs. allow).',
  },
];

function StatusBadge({ status }: { status: BfaRule['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'paused'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-800 border-slate-200';
  return (
    <span
      data-testid={`bfa-rule-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

export function BfaCrossFlowGovernancePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole('platform-admin');

  const [auditState, setAuditState] = useState<'idle' | 'running' | 'complete'>('idle');

  // Preserve the ?mock= early-return path verbatim (outside role branching).
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="bfa-cross-flow-governance"
        flowId="FLOW-25"
        title="Cross-Flow Policy Review"
        state={MOCK_STATES[mockState]}
        description="Operator view of cross-flow policy drafting, publishing, impact analysis, violation detection, enforcement, and suspension."
      />
    );
  }

  function handleTriggerAudit() {
    setAuditState('running');
    window.setTimeout(() => setAuditState('complete'), 1200);
  }

  // Tenant-admin view: only rules that affect this tenant, and CF-IDs stripped (UX-21).
  const tenantRules = SAMPLE_RULES.filter((r) => r.affectsTenant);

  return (
    <div data-testid="page-bfa-cross-flow-governance" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="bfa-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full BFA policy console ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="bfa-admin-console" className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield size={20} strokeWidth={2} aria-hidden="true" />
                  Cross-Flow Policy Console
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Manage cross-flow policies across all tenants. Run a policy audit to surface
                  conflicts between flows.
                </p>
              </div>
              <button
                type="button"
                data-testid="bfa-audit-run-button"
                onClick={handleTriggerAudit}
                disabled={auditState === 'running'}
                aria-label="Run policy audit across all active rules"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Zap size={16} strokeWidth={2} aria-hidden="true" />
                {auditState === 'running' ? 'Running audit…' : 'Run policy audit'}
              </button>
            </header>

            {auditState === 'running' && (
              <div
                data-testid="bfa-audit-status"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
              >
                Audit run in progress — scanning all active rules for conflicts…
              </div>
            )}

            {auditState === 'complete' && (
              <div
                data-testid="bfa-audit-complete"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
              >
                Audit run complete — {SAMPLE_CONFLICTS.length} conflict(s) found. See panel below.
              </div>
            )}

            <section
              data-testid="bfa-rules-list"
              aria-labelledby="bfa-rules-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="bfa-rules-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Active cross-flow rules ({SAMPLE_RULES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_RULES.map((rule) => (
                  <li
                    key={rule.ruleId}
                    data-testid={`bfa-rule-row-${rule.ruleId}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          data-testid={`bfa-rule-id-${rule.ruleId}`}
                          className="text-xs font-mono text-gray-500"
                        >
                          {rule.ruleId}
                        </span>
                        <StatusBadge status={rule.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{rule.humanName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">{rule.flowA}</span> ↔{' '}
                        <span className="font-medium">{rule.flowB}</span>
                      </p>
                      <p className="text-xs text-gray-700 mt-1 italic">{rule.condition}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`bfa-rule-edit-${rule.ruleId}`}
                        aria-label={`Edit rule ${rule.humanName}`}
                        className="inline-flex items-center justify-center border border-gray-300 text-gray-700 rounded px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <FileEdit size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                      {rule.status === 'active' ? (
                        <button
                          type="button"
                          data-testid={`bfa-rule-pause-${rule.ruleId}`}
                          aria-label={`Pause rule ${rule.humanName}`}
                          className="inline-flex items-center justify-center border border-amber-300 text-amber-800 bg-amber-50 rounded px-3 py-2 text-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <Pause size={14} strokeWidth={2} aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`bfa-rule-activate-${rule.ruleId}`}
                          aria-label={`Activate rule ${rule.humanName}`}
                          className="inline-flex items-center justify-center border border-emerald-300 text-emerald-800 bg-emerald-50 rounded px-3 py-2 text-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          style={{ minHeight: '44px', minWidth: '44px' }}
                        >
                          <Play size={14} strokeWidth={2} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="bfa-conflicts-panel"
              aria-labelledby="bfa-conflicts-heading"
              className="border border-amber-200 rounded bg-amber-50"
            >
              <h2
                id="bfa-conflicts-heading"
                className="text-sm font-semibold text-amber-900 uppercase tracking-wide px-4 py-3 border-b border-amber-200 flex items-center gap-2"
              >
                <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
                Policy conflicts ({SAMPLE_CONFLICTS.length})
              </h2>
              {SAMPLE_CONFLICTS.length === 0 ? (
                <p data-testid="bfa-conflicts-empty" className="p-4 text-sm text-amber-800">
                  No conflicts currently detected.
                </p>
              ) : (
                <ul className="divide-y divide-amber-200">
                  {SAMPLE_CONFLICTS.map((conflict) => (
                    <li
                      key={conflict.conflictId}
                      data-testid={`bfa-conflict-${conflict.conflictId}`}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          {conflict.ruleA} ↔ {conflict.ruleB}
                        </p>
                        <p className="text-xs text-amber-800 mt-1">{conflict.summary}</p>
                      </div>
                      <button
                        type="button"
                        data-testid={`bfa-conflict-resolve-${conflict.conflictId}`}
                        aria-label={`Resolve conflict between ${conflict.ruleA} and ${conflict.ruleB}`}
                        className="inline-flex items-center border border-amber-400 bg-white text-amber-900 rounded px-3 py-2 text-sm font-medium hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        Resolve
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* RUN-74 Grammar 2 Verdict Grid — candidate flow registrations
                × 7 conflict-scan dimensions (entity/route/factory/event/
                data/schema/policy) with NONE / MINOR / BLOCKING / PENDING
                per cell. Jargon-free per REPAIR-GUIDANCE. */}
            <section
              data-testid="bfa-admin-conflict-matrix-section"
              className="border border-gray-200 rounded bg-white"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Cross-flow conflict scan
                </h2>
                <span className="text-xs text-gray-500">
                  Candidate flows pending deployment · click a row for detail
                </span>
              </div>
              <ConflictScanMatrix />
            </section>

            {/* V-R11 P1-2: Raw governance index is engine-debug only.
                Suppress the outer <details> wrapper under ?hideChrome=1 so
                visual-audit captures never render it. The inner AdminCrudPanel
                is already classified ENGINE_INTERNAL (defense-in-depth). */}
            {!(typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('hideChrome') === '1') && (
              <details
                data-testid="bfa-admin-crud-panel"
                open
                className="mt-4 border border-gray-200 rounded bg-white"
              >
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
                  Raw governance index (admin debug)
                </summary>
                <AdminCrudPanel
                  slug="bfa-cross-flow-governance"
                  indexName="xiigen-bfa-cross-flow-governance"
                  title="Cross-Flow Policies \u2014 Raw Index"
                  description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-bfa-cross-flow-governance."
                  classification="ENGINE_INTERNAL"
                  defaultExpanded={true}
                  pageTestId="bfa-cross-flow-governance-crud-panel-page"
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
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — TENANT-ADMIN: read-only filtered, CF-IDs hidden ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="bfa-tenant-admin-view" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Eye size={20} strokeWidth={2} aria-hidden="true" />
                Flow Governance Rules
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Cross-flow rules that affect your workspace. If a rule is causing unexpected
                behaviour in your flows, you can request a change from the platform team.
              </p>
            </header>

            <div
              data-testid="bfa-tenant-readonly-notice"
              role="note"
              className="p-3 rounded border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                These rules are managed by the platform team. This is a read-only view; you cannot
                edit or pause rules here.
              </span>
            </div>

            <section
              data-testid="bfa-tenant-rules-list"
              aria-labelledby="bfa-tenant-rules-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="bfa-tenant-rules-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Rules affecting your workspace ({tenantRules.length})
              </h2>
              {tenantRules.length === 0 ? (
                <p data-testid="bfa-tenant-rules-empty" className="p-4 text-sm text-gray-500">
                  No cross-flow rules currently affect your workspace.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {tenantRules.map((rule, idx) => (
                    // Deliberately NOT using rule.ruleId as key/testid suffix (UX-21 — hide CF-IDs)
                    <li
                      key={`tenant-rule-${idx}`}
                      data-testid={`bfa-tenant-rule-${idx}`}
                      className="p-4"
                    >
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rule.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{rule.humanName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">{rule.flowA}</span> ↔{' '}
                        <span className="font-medium">{rule.flowB}</span>
                      </p>
                      <p className="text-xs text-gray-700 mt-1 italic">{rule.condition}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <a
              href="/support/new?topic=bfa-rule-change"
              data-testid="bfa-tenant-request-change"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Request a rule change →
            </a>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: full list, edit controls DISABLED ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="bfa-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Eye size={20} strokeWidth={2} aria-hidden="true" />
                Rule Inspector (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Full cross-flow policy set. Use this view to investigate blocked flow runs reported
                by tenants. Escalate to a platform-admin for any rule change.
              </p>
            </header>

            <div
              data-testid="bfa-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Edit controls below are disabled for support access. Layout is preserved so you can
                describe the exact remediation to a platform-admin when escalating.
              </span>
            </div>

            <section
              data-testid="bfa-support-rules-list"
              aria-labelledby="bfa-support-rules-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="bfa-support-rules-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                All cross-flow rules ({SAMPLE_RULES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_RULES.map((rule) => (
                  <li
                    key={rule.ruleId}
                    data-testid={`bfa-support-rule-row-${rule.ruleId}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{rule.ruleId}</span>
                        <StatusBadge status={rule.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{rule.humanName}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">{rule.flowA}</span> ↔{' '}
                        <span className="font-medium">{rule.flowB}</span>
                      </p>
                      <p className="text-xs text-gray-700 mt-1 italic">{rule.condition}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`bfa-support-rule-edit-${rule.ruleId}`}
                        aria-label={`Edit rule ${rule.humanName} (disabled for support)`}
                        aria-disabled="true"
                        disabled
                        className="inline-flex items-center justify-center border border-gray-200 text-gray-400 rounded px-3 py-2 text-sm cursor-not-allowed bg-gray-50"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        <FileEdit size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        data-testid={`bfa-support-rule-toggle-${rule.ruleId}`}
                        aria-label={`Toggle rule ${rule.humanName} (disabled for support)`}
                        aria-disabled="true"
                        disabled
                        className="inline-flex items-center justify-center border border-gray-200 text-gray-400 rounded px-3 py-2 text-sm cursor-not-allowed bg-gray-50"
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        {rule.status === 'active' ? (
                          <Pause size={14} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <Play size={14} strokeWidth={2} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <a
              href="/support/escalate?topic=bfa-rule-change"
              data-testid="bfa-support-escalate"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to platform-admin →
            </a>
          </main>
        </RoleScopedView.Case>

        {/*
          No Fallback branch declared — RoleScopedView's built-in fallback renders
          "This view is not available for your role" for anonymous, tenant-user,
          referral-user, freelancer, etc. That matches the plan's expected behaviour
          for `?role=tenant-user`.
        */}
      </RoleScopedView>
    </div>
  );
}
