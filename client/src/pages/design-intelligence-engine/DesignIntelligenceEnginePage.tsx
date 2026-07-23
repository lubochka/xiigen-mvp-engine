/**
 * DesignIntelligenceEnginePage — FLOW-31 admin console for Design Intelligence Engine.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-37)
 *
 * Derived states (UX-FIX Track UX-2). Source:
 *   - P1 inventory is TOPOLOGY_MISSING + SPEC_MISSING — no server flow dir.
 *   - Draft lifecycle: PROPOSAL_DRAFTED → CONFIDENCE_SCORED → APPROVED → APPLIED → ROLLED_BACK.
 *
 * Role-aware + FREEDOM-gated (RUN-37, 3 cells):
 *   - platform-admin            → cross-tenant audits + pattern registry management
 *   - tenant-admin (flag ON)    → own-tenant audit console
 *   - tenant-admin (flag OFF)   → friendly "Enable in Tenant Settings" upsell screen (NOT an error)
 *   - platform-support          → read-only audit log + pattern registry
 *   - others                    → fallback "internal platform tool" notice
 *
 * FREEDOM gate (design-intelligence flag) resolution order:
 *   1. URL param ?freedom-design-intelligence=on|off (Playwright mock driver)
 *   2. useFreedomConfig() sections — look for field key 'design-intelligence'
 *   3. Default: OFF (add-on feature)
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Palette, Sparkles, Lock, BookOpen, ArrowRight } from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';
import { useFreedomConfig } from '../../hooks/useFreedomConfig';

const MOCK_STATES: Record<string, BusinessState> = {
  'proposal-drafted': {
    idx: 1,
    label: 'AI-drafted design proposal — awaiting confidence scoring',
    status: 'DRAFT',
    fields: {
      proposalId: 'DIE-2026-0419-001',
      topic: 'event-attendance capacity-overflow',
      author: 'design-intelligence-engine',
      draftedAt: '2026-04-19 09:00',
    },
  },
  'confidence-scored': {
    idx: 2,
    label: 'Proposal scored — pending reviewer approval',
    status: 'PENDING',
    fields: {
      proposalId: 'DIE-2026-0419-001',
      confidence: '0.82',
      scorer: 'graph-rag-v3',
      scoredAt: '2026-04-19 09:12',
    },
  },
  'proposal-approved': {
    idx: 3,
    label: 'Reviewer approved design proposal — queued for application',
    status: 'APPROVED',
    fields: {
      proposalId: 'DIE-2026-0419-001',
      reviewer: 'ops-lead-03',
      approvedAt: '2026-04-19 10:30',
      targetFlow: 'Event attendance',
    },
  },
  'proposal-rejected': {
    idx: 4,
    label: 'Reviewer rejected proposal — confidence below floor',
    status: 'REJECTED',
    fields: {
      proposalId: 'DIE-2026-0419-002',
      reviewer: 'ops-lead-03',
      reason: 'Confidence 0.41 below 0.60 floor',
      rejectedAt: '2026-04-19 10:45',
    },
  },
  'proposal-applied': {
    idx: 5,
    label: 'Proposal applied — design change live in flow config',
    status: 'ACTIVE',
    fields: {
      proposalId: 'DIE-2026-0419-001',
      targetFlow: 'Event attendance',
      appliedAt: '2026-04-19 11:00',
      revisionId: 'REV-0419-001',
    },
  },
  'proposal-rolled-back': {
    idx: 6,
    label: 'Proposal reverted — rollback triggered by regression alarm',
    status: 'ROLLBACK_TRIGGERED',
    fields: {
      proposalId: 'DIE-2026-0419-001',
      revisionId: 'REV-0419-001',
      trigger: 'Regression alarm from post-release checks',
      rolledBackAt: '2026-04-19 12:15',
    },
  },
};

interface CrossTenantFinding {
  id: string;
  tenantId: string;
  tenantName: string;
  category: 'contrast' | 'pattern-drift' | 'token-mismatch';
  summary: string;
  severity: 'low' | 'medium' | 'high';
}

interface DesignPattern {
  id: string;
  name: string;
  status: 'approved' | 'deprecated' | 'draft';
  adoptionPct: number;
}

interface TenantFinding {
  id: string;
  title: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}

const SAMPLE_CROSS_TENANT_FINDINGS: CrossTenantFinding[] = [
  {
    id: 'CTF-001',
    tenantId: 'TNT-acme-corp',
    tenantName: 'Acme Corp',
    category: 'contrast',
    summary: 'Primary CTA colour fails AA contrast against dark-mode background.',
    severity: 'high',
  },
  {
    id: 'CTF-002',
    tenantId: 'TNT-bluebird',
    tenantName: 'Bluebird Media',
    category: 'pattern-drift',
    summary: 'Custom card component diverges from core pattern spec (shadow + radius).',
    severity: 'medium',
  },
  {
    id: 'CTF-003',
    tenantId: 'TNT-castle',
    tenantName: 'Castle Analytics',
    category: 'token-mismatch',
    summary: 'Brand colour token not registered — hard-coded hex values in 4 components.',
    severity: 'medium',
  },
];

const SAMPLE_PATTERNS: DesignPattern[] = [
  { id: 'PTN-button-primary', name: 'Primary CTA Button', status: 'approved', adoptionPct: 92 },
  { id: 'PTN-card-surface', name: 'Card Surface', status: 'approved', adoptionPct: 78 },
  { id: 'PTN-modal-alertdialog', name: 'Alert Dialog Modal', status: 'approved', adoptionPct: 64 },
  { id: 'PTN-toast-legacy', name: 'Legacy Toast', status: 'deprecated', adoptionPct: 12 },
];

const SAMPLE_TENANT_FINDINGS: TenantFinding[] = [
  {
    id: 'TF-001',
    title: 'Primary CTA contrast failure (dark mode)',
    suggestion: 'Use design token color.action.primary.dark instead of custom hex #3c6e71.',
    severity: 'high',
  },
  {
    id: 'TF-002',
    title: 'Card component diverges from pattern',
    suggestion: 'Reduce custom shadow to token shadow.sm; radius should be token radius.lg.',
    severity: 'medium',
  },
  {
    id: 'TF-003',
    title: 'Toast uses deprecated pattern',
    suggestion: 'Migrate to the new snackbar pattern. 3 usages detected.',
    severity: 'low',
  },
];

// V-R7 cleanup: category taxonomy renders as human-readable label in body copy,
// not as hyphenated DSL value.
const CATEGORY_LABELS: Record<CrossTenantFinding['category'], string> = {
  contrast: 'Contrast',
  'pattern-drift': 'Pattern drift',
  'token-mismatch': 'Token mismatch',
};

function SeverityBadge({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const cls =
    severity === 'high'
      ? 'bg-red-100 text-red-800 border-red-200'
      : severity === 'medium'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-800 border-slate-200';
  return (
    <span
      data-testid={`die-severity-${severity}`}
      data-severity-code={severity.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase()}
    </span>
  );
}

function PatternStatusBadge({ status }: { status: DesignPattern['status'] }) {
  const cls =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'deprecated'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-slate-100 text-slate-800 border-slate-200';
  return (
    <span
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function renderPatternRegistry(readOnly: boolean, testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {SAMPLE_PATTERNS.map((p) => (
        <li
          key={p.id}
          data-testid={`${testIdPrefix}-pattern-${p.id}`}
          data-pattern-id={p.id}
          className="p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <PatternStatusBadge status={p.status} />
              <span className="text-xs text-gray-600">{p.adoptionPct}% adoption</span>
            </div>
          </div>
          {!readOnly ? (
            <button
              type="button"
              data-testid={`${testIdPrefix}-pattern-edit-${p.id}`}
              aria-label={`Edit pattern ${p.name}`}
              className="inline-flex items-center border border-gray-300 text-gray-700 rounded px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Edit
            </button>
          ) : (
            <button
              type="button"
              data-testid={`${testIdPrefix}-pattern-edit-${p.id}`}
              aria-label={`Edit pattern ${p.name} (disabled for support)`}
              aria-disabled="true"
              disabled
              className="inline-flex items-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              Edit
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Resolve the design-intelligence FREEDOM flag. URL override wins for Playwright drivers. */
function useDesignIntelligenceFlag(): { enabled: boolean; loading: boolean } {
  const [searchParams] = useSearchParams();
  const urlOverride = searchParams.get('freedom-design-intelligence');
  const { sections, loading } = useFreedomConfig();

  if (urlOverride === 'on') return { enabled: true, loading: false };
  if (urlOverride === 'off') return { enabled: false, loading: false };

  // Flatten sections and hunt for the flag. Default = disabled (add-on).
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.key === 'design-intelligence' || field.key === 'design_intelligence') {
        return {
          enabled: Boolean(field.value),
          loading: false,
        };
      }
    }
  }
  return { enabled: false, loading };
}

export function DesignIntelligenceEnginePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();
  const { enabled: designIntelligenceOn, loading: flagLoading } = useDesignIntelligenceFlag();

  // Preserve ?mock= early-return
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="design-intelligence-engine"
        flowId="FLOW-31"
        title="Design Intelligence Engine"
        state={MOCK_STATES[mockState]}
        description="Admin view of AI-drafted design proposals, confidence scoring, approval, application, and rollback."
      />
    );
  }

  return (
    <div data-testid="page-design-intelligence-engine" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="die-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: cross-tenant ops ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="die-admin-console" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Palette size={20} strokeWidth={2} aria-hidden="true" />
                Design Intelligence
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Cross-tenant design audits, pattern registry management, and per-tenant health
                scoring.
              </p>
            </header>

            <section
              data-testid="die-cross-tenant-findings"
              aria-labelledby="die-findings-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="die-findings-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Cross-tenant findings ({SAMPLE_CROSS_TENANT_FINDINGS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_CROSS_TENANT_FINDINGS.map((f) => (
                  <li
                    key={f.id}
                    data-testid={`die-finding-${f.id}`}
                    data-finding-id={f.id}
                    data-tenant-id={f.tenantId}
                    className="p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900">{f.summary}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs text-gray-700">{f.tenantName}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-500">
                        Category: {CATEGORY_LABELS[f.category]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="die-pattern-registry"
              aria-labelledby="die-patterns-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <h2
                  id="die-patterns-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2"
                >
                  <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
                  Pattern registry ({SAMPLE_PATTERNS.length})
                </h2>
                <button
                  type="button"
                  data-testid="die-pattern-add"
                  aria-label="Add a new design pattern"
                  className="inline-flex items-center bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ minHeight: '44px' }}
                >
                  Add pattern
                </button>
              </div>
              {renderPatternRegistry(false, 'die-admin')}
            </section>

            <section data-testid="die-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="design-intelligence-engine"
                indexName="xiigen-design-intelligence-engine"
                title="Design Intelligence Engine — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-design-intelligence-engine."
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
                pageTestId="design-intelligence-engine-raw-index-panel"
                defaultExpanded
              />
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — TENANT-ADMIN: FREEDOM-gated ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          {flagLoading ? (
            <div
              data-testid="die-tenant-loading"
              role="status"
              aria-live="polite"
              className="p-4 text-sm text-gray-500"
            >
              Loading your workspace settings…
            </div>
          ) : designIntelligenceOn ? (
            /* Flag ON — tenant console */
            <main data-testid="die-tenant-console" className="space-y-4">
              <header>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Palette size={20} strokeWidth={2} aria-hidden="true" />
                  Design Intelligence
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Audit results and suggestions for your workspace only.
                </p>
              </header>

              <section
                data-testid="die-tenant-findings"
                aria-labelledby="die-tenant-findings-heading"
                className="border border-gray-200 rounded bg-white"
              >
                <h2
                  id="die-tenant-findings-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
                >
                  Findings ({SAMPLE_TENANT_FINDINGS.length})
                </h2>
                <ul className="divide-y divide-gray-100">
                  {SAMPLE_TENANT_FINDINGS.map((f) => (
                    <li key={f.id} data-testid={`die-tenant-finding-${f.id}`} className="p-4">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{f.title}</p>
                      <p className="text-xs text-gray-700 mt-2">
                        <span className="font-medium">Suggested fix:</span> {f.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </main>
          ) : (
            /* Flag OFF — friendly upsell screen (NOT an error) */
            <main
              data-testid="die-tenant-upsell"
              className="max-w-xl mx-auto mt-8 p-6 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-50 text-blue-700">
                  <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Design Intelligence — Available as an add-on
                </h1>
              </div>
              <p className="text-sm text-gray-700 mt-4">
                Design Intelligence scans your workspace for design inconsistencies and
                accessibility issues, and suggests fixes aligned with the approved pattern registry.
              </p>
              <ul className="text-sm text-gray-700 mt-3 space-y-1 pl-5 list-disc">
                <li>Automated colour-contrast and pattern-drift checks</li>
                <li>Suggestions that reference your own brand tokens</li>
                <li>Severity-scored findings ready for your design team</li>
              </ul>
              <a
                href="/settings/freedom?highlight=design-intelligence"
                data-testid="die-tenant-enable-cta"
                className="inline-flex items-center gap-2 mt-6 bg-blue-600 text-white px-5 py-3 rounded-md text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                Enable in Tenant Settings
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
              <p className="text-xs text-gray-500 mt-3">
                This feature is optional and can be switched on or off at any time.
              </p>
            </main>
          )}
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: read-only audit log ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="die-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Palette size={20} strokeWidth={2} aria-hidden="true" />
                Design Intelligence (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Read-only audit log and pattern registry. Use to investigate tenant concerns about
                flagged customisations.
              </p>
            </header>

            <div
              data-testid="die-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Pattern management controls are disabled for support access. Escalate to
                platform-admin for any pattern change.
              </span>
            </div>

            <section
              data-testid="die-support-findings"
              aria-labelledby="die-support-findings-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="die-support-findings-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Cross-tenant findings ({SAMPLE_CROSS_TENANT_FINDINGS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_CROSS_TENANT_FINDINGS.map((f) => (
                  <li
                    key={f.id}
                    data-testid={`die-support-finding-${f.id}`}
                    data-finding-id={f.id}
                    data-tenant-id={f.tenantId}
                    className="p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900">{f.summary}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <SeverityBadge severity={f.severity} />
                      <span className="text-xs text-gray-700">{f.tenantName}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="die-support-pattern-registry"
              aria-labelledby="die-support-patterns-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="die-support-patterns-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200 flex items-center gap-2"
              >
                <BookOpen size={14} strokeWidth={2} aria-hidden="true" />
                Pattern registry (read-only)
              </h2>
              {renderPatternRegistry(true, 'die-support')}
            </section>

            <a
              href="/support/escalate?topic=design-intelligence"
              data-testid="die-support-escalate"
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
            data-testid="die-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              The Design Intelligence Engine is an internal platform tool. This page is not
              available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
