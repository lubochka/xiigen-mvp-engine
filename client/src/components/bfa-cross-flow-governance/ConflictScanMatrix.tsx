/**
 * ConflictScanMatrix — FLOW-25 Grammar 2 Verdict Grid for BFA cross-flow
 * conflict detection.
 *
 * Shows pending flow registrations as rows × 7 conflict dimensions (entity /
 * route / factory / event / data / schema / policy) as columns. Per-cell
 * verdict is NONE ✓ (green) / MINOR ~ (amber) / BLOCKING ✕ (red) / PENDING …
 * Click a row to see the deployment gate detail on the right (which existing
 * flow conflicts with, in plain English, plus the block/override/waive
 * action row).
 *
 * Ref platform (MARKET-REFERENCE-CATALOG §2): GitHub PR review + Linear
 * issue approval + Gerrit code review.
 *
 * REPAIR-GUIDANCE mandate: BFA / CF-XX jargon must NOT appear in the UI.
 * All dimension labels and gate copy are plain English.
 */

import React, { useState } from 'react';

type Verdict = 'NONE' | 'MINOR' | 'BLOCKING' | 'PENDING';

const VERDICT_STYLES: Record<Verdict, { chip: string; icon: string; label: string }> = {
  NONE: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '✓',
    label: 'Clean',
  },
  MINOR: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '~',
    label: 'Minor',
  },
  BLOCKING: {
    chip: 'bg-red-50 text-red-700 border-red-200',
    icon: '✕',
    label: 'Blocking',
  },
  PENDING: {
    chip: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: '…',
    label: 'Scanning',
  },
};

type DimensionKey = 'entity' | 'route' | 'factory' | 'event' | 'data' | 'schema' | 'policy';

interface DimensionDef {
  key: DimensionKey;
  label: string;
  tooltip: string;
}

const DIMENSIONS: DimensionDef[] = [
  { key: 'entity', label: 'Entity', tooltip: 'Overlapping entity names or record shapes.' },
  { key: 'route', label: 'Route', tooltip: 'URL-path conflict between flows.' },
  { key: 'factory', label: 'Factory', tooltip: 'Shared factory interface / provider.' },
  { key: 'event', label: 'Event', tooltip: 'Duplicate or contradicting event name.' },
  { key: 'data', label: 'Data', tooltip: 'Cross-tenant data visibility leak.' },
  { key: 'schema', label: 'Schema', tooltip: 'Incompatible payload schema for the same event.' },
  {
    key: 'policy',
    label: 'Policy',
    tooltip: 'Scope-isolation or guardrail-rule conflict (CF-32 family).',
  },
];

interface Registration {
  registrationId: string;
  candidateFlow: string; // e.g. "FLOW-41 meta-arbitration-extension"
  submittedBy: string;
  submittedAt: string;
  verdicts: Record<DimensionKey, Verdict>;
  conflicts: { flow: string; dimension: DimensionKey; detail: string }[];
  decision: string; // summary
}

const SEED_REGISTRATIONS: Registration[] = [
  {
    registrationId: 'REG-2026-0420-041',
    candidateFlow: 'FLOW-41 canva-export-adapter',
    submittedBy: 'generation-round-A17',
    submittedAt: '2026-04-20 14:22',
    verdicts: {
      entity: 'NONE',
      route: 'NONE',
      factory: 'NONE',
      event: 'NONE',
      data: 'NONE',
      schema: 'NONE',
      policy: 'NONE',
    },
    conflicts: [],
    decision:
      'All 7 dimensions clean. Safe to deploy. This flow introduces no entity, route, factory, event, or schema overlap with existing flows.',
  },
  {
    registrationId: 'REG-2026-0420-040',
    candidateFlow: 'FLOW-42 loyalty-points-ledger',
    submittedBy: 'generation-round-A15',
    submittedAt: '2026-04-20 13:48',
    verdicts: {
      entity: 'MINOR',
      route: 'NONE',
      factory: 'NONE',
      event: 'MINOR',
      data: 'NONE',
      schema: 'NONE',
      policy: 'NONE',
    },
    conflicts: [
      {
        flow: 'FLOW-05 completion-gamification',
        dimension: 'entity',
        detail:
          'Both flows use a "points-ledger" entity shape. Rename or merge recommended before deploy.',
      },
      {
        flow: 'FLOW-05 completion-gamification',
        dimension: 'event',
        detail:
          '"ledger.points.credited" event signature differs slightly (new "source" field). Schema-evolution path required.',
      },
    ],
    decision:
      'Deploy allowed with minor conflicts flagged. Recommend renaming the candidate ledger or aligning the event schema before first use.',
  },
  {
    registrationId: 'REG-2026-0420-039',
    candidateFlow: 'FLOW-43 cross-tenant-analytics-export',
    submittedBy: 'generation-round-A12',
    submittedAt: '2026-04-20 12:31',
    verdicts: {
      entity: 'NONE',
      route: 'NONE',
      factory: 'NONE',
      event: 'NONE',
      data: 'BLOCKING',
      schema: 'NONE',
      policy: 'BLOCKING',
    },
    conflicts: [
      {
        flow: 'FLOW-15 saas-multi-tenancy',
        dimension: 'data',
        detail:
          'Candidate flow reads records across tenant boundaries — violates scope-isolation rule used by FLOW-15.',
      },
      {
        flow: 'CORE scope-isolation rule',
        dimension: 'policy',
        detail:
          'Candidate registers a query handler that bypasses the scope-isolation policy. Deployment blocked until rewritten.',
      },
    ],
    decision:
      'Deployment blocked. Two blocking conflicts on the tenant-isolation boundary: candidate must be rewritten before it can register.',
  },
  {
    registrationId: 'REG-2026-0420-038',
    candidateFlow: 'FLOW-44 adaptive-cache-invalidation',
    submittedBy: 'generation-round-A11',
    submittedAt: '2026-04-20 11:58',
    verdicts: {
      entity: 'NONE',
      route: 'PENDING',
      factory: 'PENDING',
      event: 'NONE',
      data: 'NONE',
      schema: 'NONE',
      policy: 'NONE',
    },
    conflicts: [],
    decision:
      'Scan in progress. Route + factory scanners pending — estimated completion 90 seconds. Other 5 dimensions are clean.',
  },
  {
    registrationId: 'REG-2026-0420-037',
    candidateFlow: 'FLOW-45 billing-reconciliation',
    submittedBy: 'generation-round-A08',
    submittedAt: '2026-04-20 10:32',
    verdicts: {
      entity: 'NONE',
      route: 'MINOR',
      factory: 'NONE',
      event: 'NONE',
      data: 'NONE',
      schema: 'NONE',
      policy: 'NONE',
    },
    conflicts: [
      {
        flow: 'FLOW-12 subscription-billing',
        dimension: 'route',
        detail:
          'Candidate claims POST /billing/reconcile/:month but FLOW-12 uses POST /billing/reconcile. Minor path-prefix overlap — low risk.',
      },
    ],
    decision:
      'Deploy allowed with a minor route-prefix warning. Recommend namespacing the candidate under /billing/v2/reconcile/:month.',
  },
];

function consensusTone(reg: Registration): {
  label: 'Clean' | 'Deploy with warnings' | 'Blocked' | 'Scanning';
  tone: string;
} {
  const vs = Object.values(reg.verdicts);
  if (vs.includes('BLOCKING')) {
    return { label: 'Blocked', tone: 'bg-red-50 text-red-700 border-red-200' };
  }
  if (vs.includes('PENDING')) {
    return { label: 'Scanning', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
  if (vs.includes('MINOR')) {
    return {
      label: 'Deploy with warnings',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return { label: 'Clean', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function VerdictCell({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-6 rounded border text-xs font-bold ${style.chip}`}
      aria-label={style.label}
      data-verdict={verdict}
    >
      {style.icon}
    </span>
  );
}

export function ConflictScanMatrix(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(SEED_REGISTRATIONS[0].registrationId);
  const selected =
    SEED_REGISTRATIONS.find((r) => r.registrationId === selectedId) ?? SEED_REGISTRATIONS[0];
  const cons = consensusTone(selected);
  const blocked = cons.label === 'Blocked';

  return (
    <div
      className="flex border border-gray-200 rounded-lg overflow-hidden bg-white"
      data-testid="bfa-conflict-scan-matrix"
    >
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm" data-testid="bfa-scan-table">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="text-start px-3 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide w-52">
                Candidate flow
              </th>
              {DIMENSIONS.map((d) => (
                <th
                  key={d.key}
                  className="text-center px-2 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide"
                  title={d.tooltip}
                >
                  {d.label}
                </th>
              ))}
              <th className="text-start px-3 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide w-44">
                Deploy decision
              </th>
            </tr>
          </thead>
          <tbody>
            {SEED_REGISTRATIONS.map((reg) => {
              const isSelected = reg.registrationId === selectedId;
              const c = consensusTone(reg);
              return (
                <tr
                  key={reg.registrationId}
                  data-testid={`bfa-scan-row-${reg.registrationId}`}
                  data-row-selected={isSelected ? 'true' : 'false'}
                  className={`border-b border-gray-100 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedId(reg.registrationId)}
                >
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-semibold text-gray-800">
                      {reg.candidateFlow}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{reg.registrationId}</div>
                  </td>
                  {DIMENSIONS.map((d) => (
                    <td key={d.key} className="text-center px-2 py-2">
                      <VerdictCell verdict={reg.verdicts[d.key]} />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.tone}`}
                    >
                      {c.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <aside
        className="w-96 border-l border-gray-200 bg-slate-50 p-4 overflow-y-auto"
        data-testid="bfa-scan-detail-panel"
        data-registration-selected={selected.registrationId}
      >
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Deployment decision
        </div>
        <h3 className="font-mono text-sm font-semibold text-slate-900 mb-0.5">
          {selected.candidateFlow}
        </h3>
        <div className="text-xs text-gray-500 mb-3 tabular-nums">
          {selected.registrationId} · submitted by {selected.submittedBy} · {selected.submittedAt}
        </div>

        <div
          className={`mb-4 px-3 py-2 rounded border ${cons.tone}`}
          data-testid="bfa-scan-detail-decision"
        >
          <div className="text-xs font-semibold mb-1">{cons.label}</div>
          <p className="text-xs leading-relaxed">{selected.decision}</p>
        </div>

        {selected.conflicts.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Conflicts ({selected.conflicts.length})
            </div>
            <ul className="space-y-2 list-none">
              {selected.conflicts.map((c, i) => {
                const dim = DIMENSIONS.find((d) => d.key === c.dimension);
                return (
                  <li key={i} className="bg-white border border-gray-200 rounded px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        {dim?.label ?? c.dimension}
                      </span>
                      <span className="text-xs text-gray-400">vs</span>
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {c.flow}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{c.detail}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-200">
          <button
            type="button"
            disabled={blocked}
            className="w-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="bfa-action-approve-deploy"
          >
            {blocked ? 'Cannot deploy (blocked)' : 'Approve deployment'}
          </button>
          <button
            type="button"
            className="w-full text-sm text-amber-700 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded"
            data-testid="bfa-action-waive-warnings"
          >
            Waive warnings & deploy
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded"
            data-testid="bfa-action-regenerate"
          >
            Regenerate candidate
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded"
            data-testid="bfa-action-defer"
          >
            Defer to senior reviewer
          </button>
        </div>
      </aside>
    </div>
  );
}
