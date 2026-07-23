/**
 * PlatformAgentPage — FLOW-46 admin console for Platform Agent.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-40)
 *
 * Role-aware (RUN-40 — COMPLIANCE-GRADE read-only cluster, 3 cells):
 *   - platform-admin    → full agent management: status, tenant-scope, config, history
 *   - tenant-admin      → own-tenant permissions + own action log; CAN restrict permissions
 *   - platform-support  → COMPLIANCE-GRADE append-only audit log (GDPR Art. 30 / SOC2).
 *                         NO edit/delete controls present. Cross-tenant agent actions are
 *                         legally significant processing records for every tenant touched.
 *   - others            → fallback "restricted to authorised platform personnel" notice
 *
 * Required testid for compliance gate (plan spec):
 *   data-testid="agent-compliance-readonly-notice"
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  Lock,
  Shield,
  FileDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Settings,
  ToggleLeft,
  ToggleRight,
  Activity,
} from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'agent-idle': {
    idx: 1,
    label: 'Agent idle — awaiting user intent from chat',
    status: 'IDLE',
    fields: {
      agentId: 'PA-runner-01',
      lastSessionAt: '2026-04-19 08:55',
      queueKey: 'xiigen.platform-agent.run-requested.v1',
    },
  },
  'task-received': {
    idx: 2,
    label: 'Agent run requested — intent captured from chat client',
    status: 'RECEIVED',
    fields: {
      sessionId: 'PA-2026-0419-001',
      userIntent: 'Create a booking reminder flow',
      submittedBy: 'admin-user-07',
      receivedAt: '2026-04-19 09:00',
    },
  },
  'agent-executing': {
    idx: 3,
    label: 'Agent is running \u2014 gathering tenant context and invoking the planner',
    status: 'RUNNING',
    fields: {
      sessionId: 'PA-2026-0419-001',
      stage: 'Gathering tenant context \u2192 Planning',
      startedAt: '2026-04-19 09:00',
      elapsedSec: '18',
    },
  },
  'action-dispatched': {
    idx: 4,
    label: 'Quality check passed \u2014 action dispatched to the publisher',
    status: 'DISPATCHED',
    fields: {
      sessionId: 'PA-2026-0419-001',
      actionType: 'Propose edit',
      qualityVerdict: 'Pass',
      dispatchedAt: '2026-04-19 09:02',
    },
  },
  'action-blocked': {
    idx: 5,
    label: 'Quality check blocked \u2014 action halted, nothing published',
    status: 'BLOCKED',
    fields: {
      sessionId: 'PA-2026-0419-002',
      actionType: 'Apply to all tenants',
      qualityVerdict: 'Block (operator override)',
      reason: 'Policy drift detected',
    },
  },
  'agent-complete': {
    idx: 6,
    label: 'Agent session complete — contribution recorded',
    status: 'COMPLETE',
    fields: {
      sessionId: 'PA-2026-0419-001',
      contribution: 'RECORDED',
      consent: 'SHARE',
      completedAt: '2026-04-19 09:05',
    },
  },
  'agent-failed': {
    idx: 7,
    label: 'Agent run failed \u2014 tenant-context lookup returned no data',
    status: 'FAILED',
    fields: {
      sessionId: 'PA-2026-0419-003',
      errorCode: 'Context lookup failed',
      failedStage: 'Gathering tenant context',
      failedAt: '2026-04-19 09:07',
    },
  },
};

interface TenantScope {
  tenantId: string;
  tenantName: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface AgentAction {
  id: string;
  timestamp: string;
  actionType: 'ADVISE' | 'PROPOSE_EDIT' | 'CREATE_FLOW' | 'APPLY_GLOBAL';
  affectedTenants: string[];
  trigger: string;
  outcome: 'success' | 'failure' | 'blocked';
  errorMessage?: string;
  legalBasis: string;
}

function tenantDisplayName(tenantId: string): string {
  const match = SAMPLE_TENANT_SCOPES.find((t) => t.tenantId === tenantId);
  return match?.tenantName ?? tenantId;
}

const SAMPLE_TENANT_SCOPES: TenantScope[] = [
  {
    tenantId: 'TNT-acme-corp',
    tenantName: 'Acme Corp',
    canRead: true,
    canWrite: true,
    canDelete: false,
  },
  {
    tenantId: 'TNT-bluebird',
    tenantName: 'Bluebird Media',
    canRead: true,
    canWrite: false,
    canDelete: false,
  },
  {
    tenantId: 'TNT-castle',
    tenantName: 'Castle Analytics',
    canRead: true,
    canWrite: true,
    canDelete: true,
  },
];

const SAMPLE_AGENT_ACTIONS: AgentAction[] = [
  {
    id: 'PA-LOG-2026-0419-0087',
    timestamp: '2026-04-19 14:22:15Z',
    actionType: 'PROPOSE_EDIT',
    affectedTenants: ['TNT-acme-corp'],
    trigger: 'user chat intent: "optimise booking reminder timings"',
    outcome: 'success',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in automated assistance; logged per Art. 30',
  },
  {
    id: 'PA-LOG-2026-0419-0082',
    timestamp: '2026-04-19 13:05:01Z',
    actionType: 'APPLY_GLOBAL',
    affectedTenants: ['TNT-acme-corp', 'TNT-bluebird', 'TNT-castle'],
    trigger: 'scheduled: weekly compliance sweep',
    outcome: 'blocked',
    errorMessage: 'Quality check blocked by operator override — policy drift detected in rollout plan.',
    legalBasis:
      'GDPR Art. 6(1)(c) — compliance with legal obligation; logged per Art. 30',
  },
  {
    id: 'PA-LOG-2026-0419-0079',
    timestamp: '2026-04-19 12:44:32Z',
    actionType: 'CREATE_FLOW',
    affectedTenants: ['TNT-bluebird'],
    trigger: 'user chat intent: "I need a weekly digest flow"',
    outcome: 'success',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in automated assistance; logged per Art. 30',
  },
  {
    id: 'PA-LOG-2026-0418-0214',
    timestamp: '2026-04-18 10:15:22Z',
    actionType: 'ADVISE',
    affectedTenants: ['TNT-castle'],
    trigger: 'health probe: low engagement rate in analytics flow',
    outcome: 'success',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in automated assistance; logged per Art. 30',
  },
];

function ActionTypeBadge({ type }: { type: AgentAction['actionType'] }) {
  // RUN-152 V-R2: sentence-case presenter for user-facing badge; keep the
  // enum as the semantic value in data/testids but render a human label.
  const cls: Record<AgentAction['actionType'], string> = {
    ADVISE: 'bg-slate-100 text-slate-800 border-slate-200',
    PROPOSE_EDIT: 'bg-blue-100 text-blue-800 border-blue-200',
    CREATE_FLOW: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    APPLY_GLOBAL: 'bg-amber-100 text-amber-800 border-amber-200',
  };
  const label: Record<AgentAction['actionType'], string> = {
    ADVISE: 'Advise',
    PROPOSE_EDIT: 'Propose edit',
    CREATE_FLOW: 'Create flow',
    APPLY_GLOBAL: 'Apply to all tenants',
  };
  return (
    <span
      data-action-type={type}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls[type]}`}
    >
      {label[type]}
    </span>
  );
}

function OutcomeIcon({ outcome }: { outcome: AgentAction['outcome'] }) {
  if (outcome === 'success') {
    return (
      <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-600" aria-label="Success" />
    );
  }
  if (outcome === 'failure') {
    return <XCircle size={14} strokeWidth={2} className="text-red-600" aria-label="Failure" />;
  }
  return (
    <AlertTriangle
      size={14}
      strokeWidth={2}
      className="text-amber-600"
      aria-label="Blocked"
    />
  );
}

export function PlatformAgentPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  // Tenant-admin permission state (initialised from own-tenant sample)
  const selfTenantScope: TenantScope = SAMPLE_TENANT_SCOPES[0];
  const [tenantPerms, setTenantPerms] = useState({
    canRead: selfTenantScope.canRead,
    canWrite: selfTenantScope.canWrite,
    canDelete: selfTenantScope.canDelete,
  });
  const [permSaved, setPermSaved] = useState<string | null>(null);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="platform-agent"
        flowId="FLOW-46"
        title="Platform Agent"
        state={MOCK_STATES[mockState]}
        description="Admin view of platform agent runs — intent capture, context enrichment, super-judge verdicts, action dispatch, contribution recording."
      />
    );
  }

  function toggleTenantPerm(key: 'canRead' | 'canWrite' | 'canDelete') {
    setTenantPerms((p) => {
      const next = { ...p, [key]: !p[key] };
      if (!next[key]) {
        setPermSaved(
          `Agent is no longer permitted to ${key.replace('can', '').toLowerCase()} data in your workspace.`,
        );
      } else {
        setPermSaved(
          `Agent is now permitted to ${key.replace('can', '').toLowerCase()} data in your workspace.`,
        );
      }
      return next;
    });
  }

  const selfTenantActions = SAMPLE_AGENT_ACTIONS.filter((a) =>
    a.affectedTenants.includes(selfTenantScope.tenantId),
  );

  return (
    <div data-testid="page-platform-agent" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="agent-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="agent-admin-console" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bot size={20} strokeWidth={2} aria-hidden="true" />
                Platform Agent
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configure agent scope, monitor current operations, and
                review cross-tenant action history.
              </p>
            </header>

            <section
              data-testid="agent-admin-status"
              aria-labelledby="agent-admin-status-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="agent-admin-status-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2"
              >
                Agent status
              </h2>
              <div className="flex items-center gap-2">
                <Activity size={14} strokeWidth={2} className="text-emerald-600" aria-hidden="true" />
                <span
                  className="text-sm font-semibold text-emerald-800"
                  data-status-code="ACTIVE"
                >
                  Active
                </span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-700">3 sessions in last hour</span>
              </div>
            </section>

            <section
              data-testid="agent-admin-tenant-scope"
              aria-labelledby="agent-admin-scope-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="agent-admin-scope-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Tenant scope ({SAMPLE_TENANT_SCOPES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_TENANT_SCOPES.map((s) => (
                  <li
                    key={s.tenantId}
                    data-testid={`agent-scope-row-${s.tenantId}`}
                    data-tenant-id={s.tenantId}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{s.tenantName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-700">
                        <span>Read: {s.canRead ? '✓' : '—'}</span>
                        <span>Write: {s.canWrite ? '✓' : '—'}</span>
                        <span>Delete: {s.canDelete ? '✓' : '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`agent-scope-edit-${s.tenantId}`}
                        aria-label={`Edit permissions for ${s.tenantName}`}
                        className="inline-flex items-center gap-1 border border-gray-300 text-gray-700 rounded px-3 py-2 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ minHeight: '44px' }}
                      >
                        <Settings size={12} strokeWidth={2} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        data-testid={`agent-scope-remove-${s.tenantId}`}
                        aria-label={`Remove ${s.tenantName} from agent scope`}
                        className="inline-flex items-center gap-1 border border-red-300 text-red-800 bg-red-50 rounded px-3 py-2 text-xs hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        style={{ minHeight: '44px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="agent-admin-action-log"
              aria-labelledby="agent-admin-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="agent-admin-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Recent agent actions ({SAMPLE_AGENT_ACTIONS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_AGENT_ACTIONS.map((a) => (
                  <li
                    key={a.id}
                    data-testid={`agent-action-${a.id}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <OutcomeIcon outcome={a.outcome} />
                      <span className="text-xs font-mono text-gray-500">{a.id}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <time
                        dateTime={a.timestamp}
                        className="text-xs font-mono text-gray-700"
                      >
                        {a.timestamp}
                      </time>
                      <ActionTypeBadge type={a.actionType} />
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{a.trigger}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Affected: {a.affectedTenants.map(tenantDisplayName).join(', ')}
                    </p>
                    {a.errorMessage && (
                      <p className="text-xs text-red-700 mt-1" role="note">
                        {a.errorMessage}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* V-R15 Wave 1 Fix #5: Raw Index admin-debug moved behind a
                collapsible <details> so it does not render by default
                on the primary-platform-admin capture. Previous capture
                leaked /api/dynamic path + ui-NNNN IDs + Delete actions
                directly on the production admin surface. */}
            <details
              className="mt-6 border border-gray-200 rounded bg-white"
              data-testid="agent-admin-raw-details"
            >
              <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50">
                Open raw platform-agent index (admin debug)
              </summary>
              <AdminCrudPanel
                slug="platform-agent"
                indexName="xiigen-platform-agent"
                title="Platform Agent — Raw Index"
                description="Raw index browser — reads /api/dynamic/xiigen-platform-agent."
                classification="ENGINE_INTERNAL"
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
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — TENANT-ADMIN: own-tenant permissions + own log ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="agent-tenant-panel" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bot size={20} strokeWidth={2} aria-hidden="true" />
                Agent Permissions
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and restrict what the Platform Agent is allowed to do inside
                your workspace. You can revoke permissions at any time; you cannot
                grant new permissions (those are platform-managed).
              </p>
            </header>

            {permSaved && (
              <div
                data-testid="agent-tenant-perm-saved"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
              >
                {permSaved}
              </div>
            )}

            <section
              data-testid="agent-tenant-permissions"
              aria-labelledby="agent-tenant-perms-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="agent-tenant-perms-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
              >
                Your workspace — agent permissions
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Tenant: <span className="font-semibold">{selfTenantScope.tenantName}</span>
              </p>

              {(
                [
                  {
                    key: 'canRead' as const,
                    label: 'Read data',
                    desc: 'Agent can read content, users, and flows in your workspace.',
                  },
                  {
                    key: 'canWrite' as const,
                    label: 'Write data',
                    desc: 'Agent can create or edit content and flows on your behalf.',
                  },
                  {
                    key: 'canDelete' as const,
                    label: 'Delete data',
                    desc: 'Agent can delete records. Revoking this is recommended unless required.',
                  },
                ]
              ).map((perm) => (
                <div
                  key={perm.key}
                  className="flex items-start justify-between gap-3 py-3 border-t border-gray-100 first:border-t-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{perm.label}</p>
                    <p className="text-xs text-gray-600">{perm.desc}</p>
                  </div>
                  <button
                    type="button"
                    data-testid={`agent-tenant-toggle-${perm.key}`}
                    role="switch"
                    aria-checked={tenantPerms[perm.key]}
                    aria-label={`${tenantPerms[perm.key] ? 'Revoke' : 'Restore'} ${perm.label.toLowerCase()} permission`}
                    onClick={() => toggleTenantPerm(perm.key)}
                    className={
                      tenantPerms[perm.key]
                        ? 'inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-3 py-2 text-xs font-medium hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                        : 'inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-300 rounded px-3 py-2 text-xs font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500'
                    }
                    style={{ minHeight: '44px', minWidth: '44px' }}
                  >
                    {tenantPerms[perm.key] ? (
                      <ToggleRight size={14} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <ToggleLeft size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                    {tenantPerms[perm.key] ? 'Allowed' : 'Revoked'}
                  </button>
                </div>
              ))}
            </section>

            <section
              data-testid="agent-tenant-own-log"
              aria-labelledby="agent-tenant-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="agent-tenant-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Agent actions in your workspace ({selfTenantActions.length})
              </h2>
              {selfTenantActions.length === 0 ? (
                <p
                  data-testid="agent-tenant-log-empty"
                  className="p-4 text-sm text-gray-500"
                >
                  No agent actions recorded for your workspace yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {selfTenantActions.map((a) => (
                    <li
                      key={a.id}
                      data-testid={`agent-tenant-action-${a.id}`}
                      className="p-4"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <OutcomeIcon outcome={a.outcome} />
                        <time dateTime={a.timestamp} className="text-xs text-gray-700">
                          {a.timestamp}
                        </time>
                        <ActionTypeBadge type={a.actionType} />
                      </div>
                      <p className="text-sm text-gray-900 mt-1">{a.trigger}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: COMPLIANCE-GRADE ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="agent-compliance-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield size={20} strokeWidth={2} aria-hidden="true" />
                Agent Audit Log
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Append-only record of every Platform Agent action, including
                all cross-tenant operations. For regulatory submissions, use the
                export below.
              </p>
            </header>

            {/* Compliance notice — REQUIRED, non-dismissable, visible above fold */}
            <div
              data-testid="agent-compliance-readonly-notice"
              role="note"
              className="p-4 rounded border-2 border-amber-400 bg-amber-50 text-sm text-amber-900 flex items-start gap-3"
            >
              <Shield
                size={20}
                strokeWidth={2}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="font-bold uppercase tracking-wide">
                  Legally-binding change record — read-only per SOC2 / GDPR Article 30
                </p>
                <p className="text-xs mt-1">
                  Agent actions cross tenant boundaries. Every entry is a processing
                  record subject to Art. 30 retention. Entries cannot be edited,
                  deleted, or redacted — append-only by mandate.
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                data-testid="agent-export-audit"
                aria-label="Download the complete agent audit log as a PDF for regulatory submission"
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                <FileDown size={16} strokeWidth={2} aria-hidden="true" />
                Download audit log (PDF)
              </button>
            </div>

            <section
              data-testid="agent-support-audit-log"
              aria-labelledby="agent-support-audit-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="agent-support-audit-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Audit log ({SAMPLE_AGENT_ACTIONS.length} entries)
              </h2>
              <ol
                className="divide-y divide-gray-100"
                aria-label="Chronological audit log of platform agent actions"
              >
                {SAMPLE_AGENT_ACTIONS.map((a) => (
                  <li
                    key={a.id}
                    data-testid={`agent-audit-entry-${a.id}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <OutcomeIcon outcome={a.outcome} />
                      <span className="text-xs font-mono text-gray-500">{a.id}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <time
                        dateTime={a.timestamp}
                        className="text-xs font-mono text-gray-700"
                      >
                        {a.timestamp}
                      </time>
                      <ActionTypeBadge type={a.actionType} />
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{a.trigger}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      <Clock
                        size={10}
                        strokeWidth={2}
                        className="inline text-gray-400"
                        aria-hidden="true"
                      />{' '}
                      Affected tenants: {a.affectedTenants.map(tenantDisplayName).join(', ')}
                    </p>
                    {a.errorMessage && (
                      <p className="text-xs text-red-700 mt-1" role="note">
                        {a.errorMessage}
                      </p>
                    )}
                    <p
                      data-testid={`agent-legal-basis-${a.id}`}
                      className="text-xs text-slate-700 mt-1 italic border-l-2 border-slate-300 pl-2"
                    >
                      <span className="font-semibold not-italic">Processing basis:</span>{' '}
                      {a.legalBasis}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/*
              Deliberately ZERO management controls on this branch. The audit log is
              append-only by GDPR mandate, not by access control — showing disabled
              edit buttons would misrepresent the legal nature of the record.
            */}
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — any other role ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="agent-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Restricted — authorised personnel only
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              The Platform Agent console is restricted to authorised platform
              personnel. This page is not available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
