/**
 * AiSelfModificationPage — FLOW-44 admin console for AI Self-Modification.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-39)
 *
 * Role-aware (RUN-39 — COMPLIANCE-GRADE read-only cluster, 2 cells):
 *   - platform-admin   → full proposal console: approve/reject with mandatory reason
 *   - platform-support → COMPLIANCE-GRADE append-only audit log (GDPR Art. 30 / SOC2).
 *                        NO edit/delete controls ANYWHERE — not even as disabled —
 *                        because the log must be legally mandated as non-alterable.
 *   - others           → fallback "restricted to authorised platform personnel" notice
 *
 * Derived states: PROPOSAL_DRAFTED → VALIDATED → APPLIED → ROLLED_BACK / REJECTED.
 *
 * Required testids for compliance gate (plan spec):
 *   data-testid="ai-mod-compliance-readonly-notice"
 *   data-testid="ai-mod-export-audit"
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
  Zap,
} from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'proposal-drafted': {
    idx: 1,
    label: 'Self-modification proposal drafted by engine',
    status: 'DRAFT',
    fields: {
      proposalId: 'SMP-2026-0418-001',
      target: 'skill:SK-512',
      changeType: 'prompt_update',
      draftedBy: 'ai-self-modification-agent',
      draftedAt: '2026-04-18 07:30',
    },
  },
  'proposal-validated': {
    idx: 2,
    label: 'Proposal validated — cross-model simulation passed',
    status: 'VERIFIED',
    fields: {
      proposalId: 'SMP-2026-0418-001',
      simulationRuns: '24',
      regressionCount: '0',
      blastRadius: 'LOW',
      validatedAt: '2026-04-18 07:55',
    },
  },
  'proposal-review-pending': {
    idx: 3,
    label: 'Awaiting human review — top-manager gate',
    status: 'REVIEW_PENDING',
    fields: {
      proposalId: 'SMP-2026-0418-001',
      gate: 'TopManagerGapDetector',
      reviewerGroup: 'engine-architects',
      escalatedAt: '2026-04-18 08:00',
    },
  },
  'proposal-applied': {
    idx: 4,
    label: 'Proposal applied — new skill version live',
    status: 'ACTIVE',
    fields: {
      proposalId: 'SMP-2026-0418-001',
      appliedAt: '2026-04-18 09:10',
      previousVersion: 'SK-512@v3',
      newVersion: 'SK-512@v4',
      appliedBy: 'engine-architect-01',
    },
  },
  'proposal-rolled-back': {
    idx: 5,
    label: 'Applied proposal rolled back — regression detected in production',
    status: 'ROLLBACK_TRIGGERED',
    fields: {
      proposalId: 'SMP-2026-0418-001',
      rollbackReason: 'quality_score_drop_7pct',
      restoredVersion: 'SK-512@v3',
      rolledBackAt: '2026-04-18 11:45',
    },
  },
  'proposal-rejected': {
    idx: 6,
    label: 'Proposal rejected at review — blast radius too broad',
    status: 'REJECTED',
    fields: {
      proposalId: 'SMP-2026-0418-002',
      rejectedBy: 'engine-architect-02',
      rejectionReason: 'BLAST_RADIUS_EXCEEDED',
      rejectedAt: '2026-04-18 12:00',
    },
  },
};

interface Proposal {
  id: string;
  changeDescription: string;
  reasoning: string;
  target: string;
  predictedQualityDelta: string;
  draftedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AuditEntry {
  id: string;
  timestamp: string;
  decisionType:
    | 'PROPOSAL_DRAFTED'
    | 'PROPOSAL_APPROVED'
    | 'PROPOSAL_REJECTED'
    | 'PROPOSAL_APPLIED'
    | 'PROPOSAL_ROLLED_BACK';
  description: string;
  modelVersion: string;
  actor: string;
  /** Article 30 legal basis citation — every AI decision MUST carry one. */
  legalBasis: string;
}

const SAMPLE_PROPOSALS: Proposal[] = [
  {
    id: 'SMP-2026-0418-001',
    changeDescription:
      'Lower retrieval temperature for the "product-search" skill from 0.8 to 0.5 to reduce hallucination rate observed over the last 7 days.',
    reasoning:
      'Cross-model simulation shows a 12% reduction in fabrication on held-out queries with no measurable loss in coverage.',
    target: 'Product-search skill',
    predictedQualityDelta: '+0.12 quality, +0% coverage',
    draftedAt: '2026-04-18 07:30',
    status: 'pending',
  },
  {
    id: 'SMP-2026-0419-004',
    changeDescription:
      'Add a "citation-freshness" policy evaluator to the deep-research flow to penalise responses citing sources older than 24 months.',
    reasoning:
      'User feedback shows that 18% of complaints on the deep-research flow cite outdated sources. Blast-radius analysis: low (1 flow affected).',
    target: 'Deep-research flow',
    predictedQualityDelta: '+0.07 quality, -2% latency',
    draftedAt: '2026-04-19 11:40',
    status: 'pending',
  },
];

const SAMPLE_AUDIT_LOG: AuditEntry[] = [
  {
    id: 'AUD-2026-0419-0087',
    timestamp: '2026-04-19 11:40:15Z',
    decisionType: 'PROPOSAL_DRAFTED',
    description: 'Engine drafted citation-freshness policy evaluator proposal for the deep-research flow.',
    modelVersion: 'xiigen-self-mod-v2.3.1',
    actor: 'ai-self-modification-agent',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in system performance; logged per Art. 30',
  },
  {
    id: 'AUD-2026-0418-0074',
    timestamp: '2026-04-18 09:10:02Z',
    decisionType: 'PROPOSAL_APPLIED',
    description: 'Product-search skill prompt applied (version 3 to version 4).',
    modelVersion: 'xiigen-self-mod-v2.3.1',
    actor: 'engine-architect-01 (approved)',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in system performance; logged per Art. 30',
  },
  {
    id: 'AUD-2026-0418-0072',
    timestamp: '2026-04-18 08:00:30Z',
    decisionType: 'PROPOSAL_APPROVED',
    description: 'Product-search temperature-reduction proposal approved by engine-architect-01.',
    modelVersion: 'xiigen-self-mod-v2.3.1',
    actor: 'engine-architect-01',
    legalBasis:
      'GDPR Art. 22 — human review of automated proposal prior to effect; logged per Art. 30',
  },
  {
    id: 'AUD-2026-0418-0070',
    timestamp: '2026-04-18 07:30:00Z',
    decisionType: 'PROPOSAL_DRAFTED',
    description: 'Engine drafted product-search skill temperature-adjust proposal.',
    modelVersion: 'xiigen-self-mod-v2.3.1',
    actor: 'ai-self-modification-agent',
    legalBasis:
      'GDPR Art. 6(1)(f) — legitimate interests in system performance; logged per Art. 30',
  },
];

const DECISION_TYPE_LABELS: Record<AuditEntry['decisionType'], string> = {
  PROPOSAL_DRAFTED: 'Proposal drafted',
  PROPOSAL_APPROVED: 'Proposal approved',
  PROPOSAL_REJECTED: 'Proposal rejected',
  PROPOSAL_APPLIED: 'Proposal applied',
  PROPOSAL_ROLLED_BACK: 'Proposal rolled back',
};

function formatDecisionType(type: AuditEntry['decisionType']): string {
  return DECISION_TYPE_LABELS[type] ?? type;
}

function DecisionTypeIcon({ type }: { type: AuditEntry['decisionType'] }) {
  const map: Record<
    AuditEntry['decisionType'],
    { icon: React.ReactNode; label: string }
  > = {
    PROPOSAL_DRAFTED: {
      icon: <Clock size={14} strokeWidth={2} className="text-blue-600" aria-hidden="true" />,
      label: 'drafted',
    },
    PROPOSAL_APPROVED: {
      icon: (
        <CheckCircle2
          size={14}
          strokeWidth={2}
          className="text-emerald-600"
          aria-hidden="true"
        />
      ),
      label: 'approved',
    },
    PROPOSAL_REJECTED: {
      icon: <XCircle size={14} strokeWidth={2} className="text-red-600" aria-hidden="true" />,
      label: 'rejected',
    },
    PROPOSAL_APPLIED: {
      icon: (
        <Zap size={14} strokeWidth={2} className="text-purple-600" aria-hidden="true" />
      ),
      label: 'applied',
    },
    PROPOSAL_ROLLED_BACK: {
      icon: (
        <AlertTriangle
          size={14}
          strokeWidth={2}
          className="text-amber-600"
          aria-hidden="true"
        />
      ),
      label: 'rolled back',
    },
  };
  return <span aria-label={map[type].label}>{map[type].icon}</span>;
}

export function AiSelfModificationPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  const [decisionModal, setDecisionModal] = useState<{
    proposal: Proposal;
    action: 'approve' | 'reject';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [decisionResult, setDecisionResult] = useState<string | null>(null);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="ai-self-modification"
        flowId="FLOW-44"
        title="AI Self-Modification"
        state={MOCK_STATES[mockState]}
        description="Operator view of engine self-modification proposals — drafting, validation, review, apply, rollback, and rejection."
      />
    );
  }

  function openDecision(proposal: Proposal, action: 'approve' | 'reject') {
    setDecisionModal({ proposal, action });
    setReason('');
    setReasonError('');
  }

  function confirmDecision() {
    if (!decisionModal) return;
    if (!reason.trim()) {
      setReasonError('A written reason is required for every decision (UX-27).');
      return;
    }
    setDecisionResult(
      `${decisionModal.action === 'approve' ? 'Approved' : 'Rejected'} ${decisionModal.proposal.id}.`,
    );
    setDecisionModal(null);
    setReason('');
  }

  function cancelDecision() {
    setDecisionModal(null);
    setReason('');
    setReasonError('');
  }

  return (
    <div data-testid="page-ai-self-modification" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="ai-mod-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full console ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="ai-mod-admin-console" className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Bot size={20} strokeWidth={2} aria-hidden="true" />
                  AI Self-Modification Console
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Review pending engine self-modification proposals.
                  Approvals and rejections both require a written justification.
                </p>
              </div>
              <button
                type="button"
                data-testid="ai-mod-trigger-audit"
                aria-label="Trigger an on-demand audit of recent AI decisions"
                className="inline-flex items-center gap-2 border border-blue-300 bg-blue-50 text-blue-800 px-4 py-2 rounded text-sm font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                <Zap size={16} strokeWidth={2} aria-hidden="true" />
                Trigger audit
              </button>
            </header>

            {decisionResult && (
              <div
                data-testid="ai-mod-decision-result"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
              >
                {decisionResult}
              </div>
            )}

            <section
              data-testid="ai-mod-proposals-list"
              aria-labelledby="ai-mod-proposals-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ai-mod-proposals-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Pending proposals (
                {SAMPLE_PROPOSALS.filter((p) => p.status === 'pending').length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_PROPOSALS.map((p) => (
                  <li
                    key={p.id}
                    data-testid={`ai-mod-proposal-${p.id}`}
                    className="p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Drafted {p.draftedAt}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {p.changeDescription}
                    </p>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Target:</span> {p.target}
                    </p>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">AI reasoning:</span> {p.reasoning}
                    </p>
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">Predicted impact:</span>{' '}
                      {p.predictedQualityDelta}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        data-testid={`ai-mod-approve-${p.id}`}
                        onClick={() => openDecision(p, 'approve')}
                        className="inline-flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        style={{ minHeight: '44px' }}
                      >
                        <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                        Approve
                      </button>
                      <button
                        type="button"
                        data-testid={`ai-mod-reject-${p.id}`}
                        onClick={() => openDecision(p, 'reject')}
                        className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        style={{ minHeight: '44px' }}
                      >
                        <XCircle size={14} strokeWidth={2} aria-hidden="true" />
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="ai-mod-performance-panel"
              aria-labelledby="ai-mod-perf-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="ai-mod-perf-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
              >
                Performance — before vs after recent approvals
              </h2>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2 border border-gray-200 rounded">
                  <dt className="text-gray-500 uppercase">Quality (before)</dt>
                  <dd className="text-base font-bold text-gray-900">0.78</dd>
                </div>
                <div className="p-2 border border-emerald-200 bg-emerald-50 rounded">
                  <dt className="text-emerald-700 uppercase">Quality (after)</dt>
                  <dd className="text-base font-bold text-emerald-900">0.85</dd>
                </div>
                <div className="p-2 border border-gray-200 rounded">
                  <dt className="text-gray-500 uppercase">Latency (before)</dt>
                  <dd className="text-base font-bold text-gray-900">312ms</dd>
                </div>
                <div className="p-2 border border-emerald-200 bg-emerald-50 rounded">
                  <dt className="text-emerald-700 uppercase">Latency (after)</dt>
                  <dd className="text-base font-bold text-emerald-900">298ms</dd>
                </div>
              </dl>
            </section>

            {/* Approve / Reject modal */}
            {decisionModal && (
              <div
                data-testid="ai-mod-decision-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ai-mod-decision-title"
                aria-describedby="ai-mod-decision-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="ai-mod-decision-title"
                    className={`text-lg font-bold flex items-center gap-2 ${decisionModal.action === 'approve' ? 'text-emerald-900' : 'text-red-900'}`}
                  >
                    {decisionModal.action === 'approve' ? (
                      <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <XCircle size={18} strokeWidth={2} aria-hidden="true" />
                    )}
                    {decisionModal.action === 'approve' ? 'Approve proposal' : 'Reject proposal'}
                  </h3>
                  <p
                    id="ai-mod-decision-desc"
                    className="text-sm text-gray-700 mt-2"
                  >
                    {decisionModal.proposal.changeDescription}
                  </p>
                  <label
                    htmlFor="ai-mod-reason"
                    className="block text-sm font-medium text-gray-700 mt-4 mb-1"
                  >
                    Written reason <span className="text-red-600">(required)</span>
                  </label>
                  <textarea
                    id="ai-mod-reason"
                    data-testid="ai-mod-reason-input"
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (reasonError) setReasonError('');
                    }}
                    rows={3}
                    aria-invalid={reasonError ? 'true' : 'false'}
                    aria-describedby={reasonError ? 'ai-mod-reason-err' : undefined}
                    placeholder={
                      decisionModal.action === 'approve'
                        ? 'e.g., simulation results acceptable; blast radius low'
                        : 'e.g., blast radius exceeds 1-flow threshold'
                    }
                    className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {reasonError && (
                    <p
                      id="ai-mod-reason-err"
                      data-testid="ai-mod-reason-error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {reasonError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="ai-mod-decision-cancel"
                      onClick={cancelDecision}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="ai-mod-decision-confirm"
                      onClick={confirmDecision}
                      className={
                        decisionModal.action === 'approve'
                          ? 'px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                          : 'px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
                      }
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      {decisionModal.action === 'approve'
                        ? 'Confirm approval'
                        : 'Confirm rejection'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section data-testid="ai-mod-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="ai-self-modification"
                indexName="xiigen-ai-self-modification"
                title="AI Self-Modification — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-ai-self-modification."
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
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — PLATFORM-SUPPORT: COMPLIANCE-GRADE READ-ONLY ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="ai-mod-compliance-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Shield size={20} strokeWidth={2} aria-hidden="true" />
                AI Modification Audit Log
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Append-only record of every AI self-modification decision.
                For regulatory submissions, use the export below.
              </p>
            </header>

            {/* Compliance notice — REQUIRED, non-dismissable, visible without scrolling. */}
            <div
              data-testid="ai-mod-compliance-readonly-notice"
              role="note"
              className="p-4 rounded border-2 border-amber-400 bg-amber-50 text-sm text-amber-900 flex items-start gap-3"
            >
              <Shield size={20} strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wide">
                  Legally-binding change record — read-only per SOC2 / GDPR Article 30
                </p>
                <p className="text-xs mt-1">
                  This audit log is append-only by design. Entries cannot be edited,
                  deleted, or redacted. Every record is accompanied by its Article 30
                  legal-basis citation for regulatory traceability.
                </p>
              </div>
            </div>

            {/* Required export button */}
            <div>
              <button
                type="button"
                data-testid="ai-mod-export-audit"
                aria-label="Download the complete audit log as a PDF for regulatory submission"
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                <FileDown size={16} strokeWidth={2} aria-hidden="true" />
                Download audit log (PDF)
              </button>
            </div>

            <section
              data-testid="ai-mod-audit-log"
              aria-labelledby="ai-mod-audit-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ai-mod-audit-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Audit log ({SAMPLE_AUDIT_LOG.length} entries)
              </h2>
              <ol className="divide-y divide-gray-100" aria-label="Chronological audit log">
                {SAMPLE_AUDIT_LOG.map((entry) => (
                  <li
                    key={entry.id}
                    data-testid={`ai-mod-audit-entry-${entry.id}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <DecisionTypeIcon type={entry.decisionType} />
                      <time
                        dateTime={entry.timestamp}
                        className="text-xs text-gray-700 tabular-nums"
                      >
                        {entry.timestamp}
                      </time>
                      <span className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-700 font-semibold capitalize">
                        {formatDecisionType(entry.decisionType)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{entry.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Actor: <span className="font-medium">{entry.actor}</span> · Model:{' '}
                      <span className="font-mono">{entry.modelVersion}</span>
                    </p>
                    <p
                      data-testid={`ai-mod-legal-basis-${entry.id}`}
                      className="text-xs text-slate-700 mt-1 italic border-l-2 border-slate-300 pl-2"
                    >
                      <span className="font-semibold not-italic">Processing basis:</span>{' '}
                      {entry.legalBasis}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/*
              Deliberately ZERO edit / delete / pause / redact controls on this branch.
              The complete absence of action controls is legally correct, not a
              design oversight. The log is append-only by mandate, not by access
              control.
            */}
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — any other role ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="ai-mod-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Restricted — authorised personnel only
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              The AI Self-Modification console is restricted to authorised platform
              personnel. This page is not available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
