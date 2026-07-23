/**
 * MetaArbitrationVerdictGrid — FLOW-35 Grammar 2 Verdict Grid.
 *
 * Shows pending generation rounds as a matrix: rows = rounds, columns = the
 * 5 meta-arbiter policies (Cost / Security / Quality / Drift / Improvement).
 * Per-cell verdict: APPROVED ✓ / REJECTED ✕ / NEEDS_REVISION ~ / PENDING …
 * Click a row → right panel shows round detail + arbiter rationale + action row.
 *
 * Ref platform (MARKET-REFERENCE-CATALOG §2): GitHub PR review (reviewers ×
 * files), Linear issue approval, Gerrit code review.
 */

import React, { useState } from 'react';
import { flowHumanName } from '../../utils/flowHumanName';

type Verdict = 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'PENDING';

const VERDICT_STYLES: Record<Verdict, { chip: string; icon: string; label: string }> = {
  APPROVED: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: '✓',
    label: 'Approved',
  },
  REJECTED: {
    chip: 'bg-red-50 text-red-700 border-red-200',
    icon: '✕',
    label: 'Rejected',
  },
  NEEDS_REVISION: {
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '~',
    label: 'Revise',
  },
  PENDING: {
    chip: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: '…',
    label: 'Pending',
  },
};

type PolicyKey = 'cost' | 'security' | 'quality' | 'drift' | 'improvement';

interface PolicyDef {
  key: PolicyKey;
  label: string;
  description: string; // human-readable policy summary
}

const POLICIES: PolicyDef[] = [
  {
    key: 'cost',
    label: 'Cost',
    description: 'Token-spend limit versus approved budget for this cycle.',
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Scope-isolation + secret-redaction + SSRF guards.',
  },
  { key: 'quality', label: 'Quality', description: 'Arbiter quality score ≥ promotion threshold.' },
  {
    key: 'drift',
    label: 'Drift',
    description: 'Generation drift from canonical examples ≤ acceptable delta.',
  },
  {
    key: 'improvement',
    label: 'Improvement',
    description: 'Positive quality delta vs. previous round.',
  },
];

interface Round {
  roundId: string;
  flowId: string;
  model: string;
  submittedAt: string; // displayed tabular-nums
  verdicts: Record<PolicyKey, Verdict>;
  rationale: string; // plain-English summary when a row is selected
}

// Seed: 6 pending rounds. Covers all four verdict outcomes across the grid.
const SEED_ROUNDS: Round[] = [
  {
    roundId: 'GEN-2026-0420-A17',
    flowId: 'FLOW-09',
    model: 'claude-opus-4.6',
    submittedAt: '2026-04-20 14:32',
    verdicts: {
      cost: 'APPROVED',
      security: 'APPROVED',
      quality: 'APPROVED',
      drift: 'APPROVED',
      improvement: 'APPROVED',
    },
    rationale:
      'All 5 policies passed. Quality delta +0.18 over previous round; spend within budget (63 %). Safe to promote.',
  },
  {
    roundId: 'GEN-2026-0420-A16',
    flowId: 'FLOW-17',
    model: 'gpt-5',
    submittedAt: '2026-04-20 13:48',
    verdicts: {
      cost: 'APPROVED',
      security: 'APPROVED',
      quality: 'NEEDS_REVISION',
      drift: 'APPROVED',
      improvement: 'APPROVED',
    },
    rationale:
      'Quality arbiter requested revision — 2 of 8 goal items are covered by shallow topology only. Action: expand n4 + n8 coverage and re-submit.',
  },
  {
    roundId: 'GEN-2026-0420-A15',
    flowId: 'FLOW-20',
    model: 'claude-opus-4.6',
    submittedAt: '2026-04-20 13:07',
    verdicts: {
      cost: 'APPROVED',
      security: 'REJECTED',
      quality: 'APPROVED',
      drift: 'APPROVED',
      improvement: 'APPROVED',
    },
    rationale:
      'Security gate rejected: scope-isolation arbiter detected cross-tenant leak in sponsored-content event payload. Action: add tenant-scope filter before emit.',
  },
  {
    roundId: 'GEN-2026-0420-A14',
    flowId: 'FLOW-29',
    model: 'gpt-5',
    submittedAt: '2026-04-20 12:22',
    verdicts: {
      cost: 'PENDING',
      security: 'APPROVED',
      quality: 'PENDING',
      drift: 'PENDING',
      improvement: 'PENDING',
    },
    rationale:
      'Partial verdicts received. Waiting on 4 of 5 arbiters (cost / quality / drift / improvement). Estimated completion in 3 min.',
  },
  {
    roundId: 'GEN-2026-0420-A13',
    flowId: 'FLOW-36',
    model: 'llama3:70b',
    submittedAt: '2026-04-20 11:41',
    verdicts: {
      cost: 'NEEDS_REVISION',
      security: 'APPROVED',
      quality: 'APPROVED',
      drift: 'APPROVED',
      improvement: 'APPROVED',
    },
    rationale:
      'Cost arbiter requested revision — 107 % of approved budget. Action: reduce retrieval fan-out by 1 hop or request a budget variance.',
  },
  {
    roundId: 'GEN-2026-0420-A12',
    flowId: 'FLOW-24',
    model: 'claude-opus-4.6',
    submittedAt: '2026-04-20 10:58',
    verdicts: {
      cost: 'APPROVED',
      security: 'APPROVED',
      quality: 'APPROVED',
      drift: 'REJECTED',
      improvement: 'NEEDS_REVISION',
    },
    rationale:
      'Drift arbiter rejected: regression on 3 of 12 canonical CF-465 test cases. Improvement arbiter requested revision — quality delta -0.04 vs. prior round. Action: rollback or regenerate with tighter sampling.',
  },
];

// Compute a consensus summary per round for the row highlight.
function consensusLabel(round: Round): {
  label: 'Approve all' | 'Needs revision' | 'Blocked' | 'Pending';
  tone: string;
} {
  const verdicts = Object.values(round.verdicts);
  if (verdicts.includes('REJECTED')) {
    return { label: 'Blocked', tone: 'bg-red-50 text-red-700 border-red-200' };
  }
  if (verdicts.includes('PENDING')) {
    return { label: 'Pending', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
  if (verdicts.includes('NEEDS_REVISION')) {
    return {
      label: 'Needs revision',
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }
  return { label: 'Approve all', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
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

export function MetaArbitrationVerdictGrid(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>(SEED_ROUNDS[0].roundId);
  const selected = SEED_ROUNDS.find((r) => r.roundId === selectedId) ?? SEED_ROUNDS[0];

  return (
    <div
      className="flex border border-gray-200 rounded-lg overflow-hidden bg-white"
      data-testid="mae-verdict-grid"
    >
      {/* Main grid */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm" data-testid="mae-verdict-table">
          <thead className="bg-slate-50 border-b border-gray-200">
            <tr>
              <th className="text-start px-3 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide w-44">
                Round
              </th>
              {POLICIES.map((p) => (
                <th
                  key={p.key}
                  className="text-center px-2 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide"
                  title={p.description}
                >
                  {p.label}
                </th>
              ))}
              <th className="text-start px-3 py-2 font-semibold text-gray-700 text-xs uppercase tracking-wide w-36">
                Consensus
              </th>
            </tr>
          </thead>
          <tbody>
            {SEED_ROUNDS.map((round) => {
              const isSelected = round.roundId === selectedId;
              const cons = consensusLabel(round);
              return (
                <tr
                  key={round.roundId}
                  data-testid={`mae-round-row-${round.roundId}`}
                  data-row-selected={isSelected ? 'true' : 'false'}
                  className={`border-b border-gray-100 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedId(round.roundId)}
                >
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs font-semibold text-gray-800">
                      {round.roundId}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {flowHumanName(round.flowId)} · {round.model}
                    </div>
                  </td>
                  {POLICIES.map((p) => (
                    <td key={p.key} className="text-center px-2 py-2">
                      <VerdictCell verdict={round.verdicts[p.key]} />
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cons.tone}`}
                    >
                      {cons.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Side detail panel */}
      <aside
        className="w-80 border-l border-gray-200 bg-slate-50 p-4 overflow-y-auto"
        data-testid="mae-detail-panel"
        data-round-selected={selected.roundId}
      >
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Round detail
        </div>
        <h3 className="font-mono text-sm font-semibold text-slate-900 mb-1">{selected.roundId}</h3>
        <div className="text-xs text-gray-600 mb-3 tabular-nums">
          {flowHumanName(selected.flowId)} · {selected.model} · submitted {selected.submittedAt}
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Rationale</div>
          <p className="text-sm text-slate-700 leading-relaxed" data-testid="mae-detail-rationale">
            {selected.rationale}
          </p>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-2">Policy verdicts</div>
          <ul className="space-y-1 list-none">
            {POLICIES.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700">{p.label}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    VERDICT_STYLES[selected.verdicts[p.key]].chip
                  }`}
                >
                  <span aria-hidden="true">{VERDICT_STYLES[selected.verdicts[p.key]].icon}</span>
                  {VERDICT_STYLES[selected.verdicts[p.key]].label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-200">
          <button
            type="button"
            className="w-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40"
            data-testid="mae-action-approve"
            disabled={Object.values(selected.verdicts).some((v) => v !== 'APPROVED')}
          >
            Approve
          </button>
          <button
            type="button"
            className="w-full text-sm text-amber-700 border border-amber-300 hover:bg-amber-50 px-3 py-1.5 rounded"
            data-testid="mae-action-override"
          >
            Override
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-700 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded"
            data-testid="mae-action-escalate"
          >
            Escalate to human
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded"
            data-testid="mae-action-defer"
          >
            Defer
          </button>
        </div>
      </aside>
    </div>
  );
}
