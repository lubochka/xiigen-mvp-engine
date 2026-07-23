/**
 * MetaFlowEnginePage — FLOW-26 admin console for Meta Flow Engine.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → role-scoped view (RUN-35)
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   FLOW_REGISTERED → GENERATION_RUNNING → REVIEW_GATE → PUBLISHED → FAILED
 * Plus states derived from server services under engine/flows/flow-extension-engine/
 * (code-assembly-orchestrator, five-arbiter-consensus-gate, dna-compliance-checker).
 *
 * Role-aware (RUN-35, engine-internal two-role-minimum — no tenant-admin branch):
 *   - platform-admin   → full management (trigger, create, pause/resume, execution log)
 *   - platform-support → same data, all action controls DISABLED (aria-disabled)
 *   - others           → fallback "internal platform tool" notice
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Workflow, Play, Pause, Plus, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { MetaFlowEngineTopologyCanvas } from '../../components/meta-flow-engine/MetaFlowEngineTopologyCanvas';
import { useViewerRole } from '../../hooks/useViewerRole';
import { flowHumanName } from '../../utils/flowHumanName';

const MOCK_STATES: Record<string, BusinessState> = {
  'flow-registered': {
    idx: 1,
    label: 'Flow specification registered — awaiting generation',
    status: 'REGISTERED',
    fields: {
      flow: 'Canva adapter',
      specId: 'SPEC-2026-0419-001',
      familyId: '211',
      registeredAt: '2026-04-19 09:00',
    },
  },
  'generation-queued': {
    idx: 2,
    label: 'Code assembly queued — scaffolds pending',
    status: 'QUEUED',
    fields: {
      flow: 'Canva adapter',
      assemblyId: 'ASM-2026-0419-001',
      taskTypes: 'parser, orchestrator, validator',
      queueKey: 'code-assembly',
    },
  },
  'generation-running': {
    idx: 3,
    label: 'Service code generation in progress — 2 of 3 services emitted',
    status: 'GENERATING',
    fields: {
      flow: 'Canva adapter',
      assemblyId: 'ASM-2026-0419-001',
      completedServices: '2',
      totalServices: '3',
      startedAt: '2026-04-19 09:05',
    },
  },
  'review-gate': {
    idx: 4,
    label: '5-policy-evaluator consensus gate \u2014 awaiting verdicts',
    status: 'REVIEW_PENDING',
    fields: {
      flow: 'Canva adapter',
      gateId: 'GATE-2026-0419-001',
      evaluatorCount: '5',
      verdictsReceived: '3',
      pendingEvaluators: 'tenant-boundary, branch-honest',
    },
  },
  'review-needs-revision': {
    idx: 5,
    label: 'Evaluators returned NEEDS_REVISION \u2014 regenerate required',
    status: 'REJECTED',
    fields: {
      flow: 'Canva adapter',
      gateId: 'GATE-2026-0419-001',
      failingEvaluator: 'goal-delivery',
      reason: '2 of 8 goal items uncovered by topology',
    },
  },
  published: {
    idx: 6,
    label: 'Flow PUBLISHED — active in engine registry',
    status: 'PUBLISHED',
    fields: {
      flow: 'Canva adapter',
      version: '1.0.0',
      publishedAt: '2026-04-19 11:45',
      publishedBy: 'meta-flow-orchestrator',
    },
  },
  failed: {
    idx: 7,
    label: 'Flow generation FAILED \u2014 design convention violation',
    status: 'FAILED',
    fields: {
      flow: 'Canva adapter',
      assemblyId: 'ASM-2026-0419-002',
      failedAt: '2026-04-19 10:20',
      errorCode: 'DESIGN_CONVENTION_VIOLATION',
      reason: 'Generated service used a typed model where the convention requires dynamic data',
    },
  },
};

interface MetaFlow {
  id: string;
  name: string;
  description: string;
  orchestrates: string[];
  status: 'active' | 'paused' | 'draft';
}

interface ExecutionLogEntry {
  runId: string;
  metaFlowId: string;
  metaFlowName: string;
  startedAt: string;
  durationMs: number;
  outcome: 'success' | 'failure' | 'in-progress';
  steps: { name: string; status: 'done' | 'failed' | 'pending' }[];
}

const SAMPLE_META_FLOWS: MetaFlow[] = [
  {
    id: 'MF-001',
    name: 'Tenant provisioning pipeline',
    description: 'Registers a new tenant and runs onboarding flows in order.',
    orchestrates: ['FLOW-01', 'FLOW-15', 'FLOW-33'],
    status: 'active',
  },
  {
    id: 'MF-004',
    name: 'Ads campaign cold-start',
    description: 'Bootstraps an ads workspace for a new marketplace tenant.',
    orchestrates: ['FLOW-20', 'FLOW-36', 'FLOW-13'],
    status: 'active',
  },
  {
    id: 'MF-007',
    name: 'Freelancer onboarding chain',
    description: 'Registers a freelancer profile and enrols them in the marketplace.',
    orchestrates: ['FLOW-01', 'FLOW-02', 'FLOW-17'],
    status: 'paused',
  },
  {
    id: 'MF-010',
    name: 'Compliance sweep (quarterly)',
    description: 'Runs design-convention audits, policy-evaluator re-checks, and cross-flow conflict scan.',
    orchestrates: ['FLOW-19', 'FLOW-25', 'FLOW-35'],
    status: 'draft',
  },
];

const SAMPLE_EXECUTION_LOG: ExecutionLogEntry[] = [
  {
    runId: 'MFR-2026-0419-0017',
    metaFlowId: 'MF-001',
    metaFlowName: 'Tenant provisioning pipeline',
    startedAt: '2026-04-19 14:22',
    durationMs: 4820,
    outcome: 'success',
    steps: [
      { name: 'User registration', status: 'done' },
      { name: 'Tenant lifecycle', status: 'done' },
      { name: 'System bootstrap', status: 'done' },
    ],
  },
  {
    runId: 'MFR-2026-0419-0012',
    metaFlowId: 'MF-004',
    metaFlowName: 'Ads campaign cold-start',
    startedAt: '2026-04-19 12:08',
    durationMs: 7210,
    outcome: 'failure',
    steps: [
      { name: 'Ads platform setup', status: 'done' },
      { name: 'Feature registry', status: 'failed' },
      { name: 'Data warehouse', status: 'pending' },
    ],
  },
  {
    runId: 'MFR-2026-0419-0009',
    metaFlowId: 'MF-001',
    metaFlowName: 'Tenant provisioning pipeline',
    startedAt: '2026-04-19 09:45',
    durationMs: 3980,
    outcome: 'success',
    steps: [
      { name: 'User registration', status: 'done' },
      { name: 'Tenant lifecycle', status: 'done' },
      { name: 'System bootstrap', status: 'done' },
    ],
  },
];

function MetaFlowStatusBadge({ status }: { status: MetaFlow['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'paused'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-800 border-slate-200';
  return (
    <span
      data-testid={`mf-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function OutcomeIcon({ outcome }: { outcome: ExecutionLogEntry['outcome'] }) {
  if (outcome === 'success') {
    return (
      <CheckCircle2 size={16} strokeWidth={2} className="text-emerald-600" aria-label="Success" />
    );
  }
  if (outcome === 'failure') {
    return <XCircle size={16} strokeWidth={2} className="text-red-600" aria-label="Failure" />;
  }
  return <Clock size={16} strokeWidth={2} className="text-blue-600" aria-label="In progress" />;
}

function renderMetaFlowList(disabled: boolean, testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {SAMPLE_META_FLOWS.map((mf) => (
        <li
          key={mf.id}
          data-testid={`${testIdPrefix}-row-${mf.id}`}
          className="p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <MetaFlowStatusBadge status={mf.status} />
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">{mf.name}</p>
            <p className="text-xs text-gray-600 mt-1">{mf.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              Orchestrates:{' '}
              <span>{mf.orchestrates.map(flowHumanName).join(' → ')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`${testIdPrefix}-trigger-${mf.id}`}
              aria-label={`Trigger meta-flow ${mf.name}${disabled ? ' (disabled for support)' : ''}`}
              aria-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              className={
                disabled
                  ? 'inline-flex items-center justify-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed'
                  : 'inline-flex items-center justify-center border border-blue-300 text-blue-700 bg-blue-50 rounded px-3 py-2 text-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <Play size={14} strokeWidth={2} aria-hidden="true" />
            </button>
            {mf.status === 'active' ? (
              <button
                type="button"
                data-testid={`${testIdPrefix}-pause-${mf.id}`}
                aria-label={`Pause meta-flow ${mf.name}${disabled ? ' (disabled for support)' : ''}`}
                aria-disabled={disabled ? 'true' : undefined}
                disabled={disabled}
                className={
                  disabled
                    ? 'inline-flex items-center justify-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed'
                    : 'inline-flex items-center justify-center border border-amber-300 text-amber-800 bg-amber-50 rounded px-3 py-2 text-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500'
                }
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Pause size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                data-testid={`${testIdPrefix}-resume-${mf.id}`}
                aria-label={`Resume meta-flow ${mf.name}${disabled ? ' (disabled for support)' : ''}`}
                aria-disabled={disabled ? 'true' : undefined}
                disabled={disabled}
                className={
                  disabled
                    ? 'inline-flex items-center justify-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed'
                    : 'inline-flex items-center justify-center border border-emerald-300 text-emerald-800 bg-emerald-50 rounded px-3 py-2 text-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                }
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Play size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderExecutionLog(testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {SAMPLE_EXECUTION_LOG.map((run) => (
        <li key={run.runId} data-testid={`${testIdPrefix}-run-${run.runId}`} className="p-4">
          <div className="flex items-center gap-2">
            <OutcomeIcon outcome={run.outcome} />
            <span className="text-xs text-gray-700">{run.startedAt}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-700">{(run.durationMs / 1000).toFixed(2)}s</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">{run.metaFlowName}</p>
          {/* UX-23: automated steps shown as a read-only timeline, not interactive */}
          <ol
            className="mt-2 space-y-1 text-xs"
            aria-label={`Execution steps for run ${run.runId}`}
          >
            {run.steps.map((step, si) => (
              <li
                key={si}
                data-testid={`${testIdPrefix}-step-${run.runId}-${si}`}
                className="flex items-center gap-2"
              >
                {step.status === 'done' && (
                  <CheckCircle2
                    size={12}
                    strokeWidth={2}
                    className="text-emerald-600"
                    aria-hidden="true"
                  />
                )}
                {step.status === 'failed' && (
                  <XCircle size={12} strokeWidth={2} className="text-red-600" aria-hidden="true" />
                )}
                {step.status === 'pending' && (
                  <Clock size={12} strokeWidth={2} className="text-gray-400" aria-hidden="true" />
                )}
                <span
                  className={
                    step.status === 'failed'
                      ? 'text-red-700'
                      : step.status === 'pending'
                        ? 'text-gray-400'
                        : 'text-gray-700'
                  }
                >
                  {step.name}
                </span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

export function MetaFlowEnginePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole('platform-admin');

  const [triggeredRun, setTriggeredRun] = useState<string | null>(null);

  // Preserve ?mock= early-return (outside role branching).
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="meta-flow-engine"
        flowId="FLOW-26"
        title="Meta Flow Engine"
        state={MOCK_STATES[mockState]}
        description="Admin view of flow registration, code generation, policy-evaluator review, publication, and failures."
      />
    );
  }

  return (
    <div data-testid="page-meta-flow-engine" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="mfe-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full management ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="mfe-admin-console" className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Workflow size={20} strokeWidth={2} aria-hidden="true" />
                  Meta-Flow Engine
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Register, trigger, and monitor flows-about-flows. Manage multi-flow
                  orchestration pipelines.
                </p>
              </div>
              <button
                type="button"
                data-testid="mfe-create-button"
                aria-label="Create a new meta-flow"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Create meta-flow
              </button>
            </header>

            {triggeredRun && (
              <div
                data-testid="mfe-trigger-status"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
              >
                Run {triggeredRun} triggered — execution log will refresh shortly.
              </div>
            )}

            {/* RUN-69: Grammar 4 Topology Canvas (FLOW-26 rebuild per FLOW-29 recipe).
                Renders the 24-process meta-flow lifecycle as a ReactFlow DAG grouped
                by 6 phases (Intake → Generation → Validation → Registration →
                Deployment → Observation). Side panel on node click shows the
                human-readable description + event emitted. Reference: n8n
                meta-workflow view + Temporal UI + Airflow DAG (MARKET-REFERENCE-CATALOG §4). */}
            <section
              data-testid="mfe-admin-topology-section"
              aria-labelledby="mfe-admin-topology-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2
                  id="mfe-admin-topology-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Meta-flow lifecycle ·{' '}
                  <span className="font-normal text-gray-500 normal-case">
                    24 processes across 6 phases
                  </span>
                </h2>
                <span className="text-xs text-gray-500">Click any node for details</span>
              </div>
              <MetaFlowEngineTopologyCanvas />
            </section>

            <section
              data-testid="mfe-admin-flows-list"
              aria-labelledby="mfe-admin-flows-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="mfe-admin-flows-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Registered meta-flows ({SAMPLE_META_FLOWS.length})
              </h2>
              {/* reuse list render, with trigger wired up via onClick delegate */}
              <div
                onClickCapture={(e) => {
                  const target = e.target as HTMLElement;
                  const btn = target.closest<HTMLButtonElement>(
                    '[data-testid^="mfe-admin-flows-trigger-"]',
                  );
                  if (btn) {
                    const id = btn
                      .getAttribute('data-testid')!
                      .replace('mfe-admin-flows-trigger-', '');
                    setTriggeredRun(id);
                  }
                }}
              >
                {renderMetaFlowList(false, 'mfe-admin-flows')}
              </div>
            </section>

            <section
              data-testid="mfe-admin-execution-log"
              aria-labelledby="mfe-admin-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="mfe-admin-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Recent executions ({SAMPLE_EXECUTION_LOG.length})
              </h2>
              {renderExecutionLog('mfe-admin-log')}
            </section>

            <section data-testid="mfe-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="meta-flow-engine"
                indexName="xiigen-meta-flow-engine"
                title="Meta Flow Engine — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-meta-flow-engine."
                classification="ENGINE_INTERNAL"
                defaultExpanded={true}
                pageTestId="meta-flow-engine-crud-panel-page"
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
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — PLATFORM-SUPPORT: read-only, controls DISABLED ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="mfe-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Workflow size={20} strokeWidth={2} aria-hidden="true" />
                Meta-Flow Engine (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Read-only inspector for investigating out-of-order meta-flow runs.
                Escalate to platform-admin for any trigger or configuration change.
              </p>
            </header>

            <div
              data-testid="mfe-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Trigger and edit controls are disabled for support access. Layout is preserved so
                you can describe the exact remediation steps to a platform-admin when escalating.
              </span>
            </div>

            <section
              data-testid="mfe-support-flows-list"
              aria-labelledby="mfe-support-flows-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="mfe-support-flows-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Registered meta-flows ({SAMPLE_META_FLOWS.length})
              </h2>
              {renderMetaFlowList(true, 'mfe-support-flows')}
            </section>

            <section
              data-testid="mfe-support-execution-log"
              aria-labelledby="mfe-support-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="mfe-support-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Recent executions ({SAMPLE_EXECUTION_LOG.length})
              </h2>
              {renderExecutionLog('mfe-support-log')}
            </section>

            <a
              href="/support/escalate?topic=meta-flow-engine"
              data-testid="mfe-support-escalate"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to platform-admin →
            </a>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — any other role ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="mfe-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              The Meta-Flow Engine is an internal platform tool. This page is not available for your
              current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
