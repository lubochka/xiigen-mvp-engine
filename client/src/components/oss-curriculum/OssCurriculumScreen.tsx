/**
 * OssCurriculumScreen — root screen for the OSS curriculum teaching pipeline dashboard.
 *
 * Displays:
 *   - Curriculum tier assignments
 *   - Shadow run records (with CF-804 ossModel + cycleId)
 *   - Empty states when lists are empty
 */

import React from 'react';
import { CurriculumTierBadge } from './CurriculumTierBadge';
import { ShadowRunStatusCard, ShadowRunStatus } from './ShadowRunStatusCard';

export interface TierAssignmentItem {
  dpoTripleId: string;
  curriculumTier: number;
}

export interface ShadowRunItem {
  shadowRunId: string;
  ossModel: string;
  cycleId: string;
  status: ShadowRunStatus;
  grade?: number | null;
}

export interface OssCurriculumScreenProps {
  tierAssignments: TierAssignmentItem[];
  shadowRuns: ShadowRunItem[];
}

export function OssCurriculumScreen({
  tierAssignments,
  shadowRuns,
}: OssCurriculumScreenProps): React.ReactElement {
  // Tier distribution for the header summary.
  const tierCounts = tierAssignments.reduce<Record<number, number>>((acc, t) => {
    acc[t.curriculumTier] = (acc[t.curriculumTier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6" data-testid="oss-curriculum-screen">
      <section data-testid="tier-assignments-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Curriculum tier assignments
          <span className="ml-2 text-xs font-normal text-gray-400">
            {tierAssignments.length} DPO triples classified
          </span>
        </h2>

        {/* Tier distribution summary (T1..T5) */}
        {tierAssignments.length > 0 && (
          <div className="flex items-stretch gap-2 mb-3" data-testid="tier-distribution-summary">
            {[1, 2, 3, 4, 5].map((tier) => {
              const count = tierCounts[tier] ?? 0;
              const pct = tierAssignments.length
                ? Math.round((count / tierAssignments.length) * 100)
                : 0;
              return (
                <div
                  key={tier}
                  className="flex-1 rounded border border-gray-200 bg-white px-3 py-2"
                >
                  <div className="text-xs text-gray-500">Tier {tier}</div>
                  <div className="text-lg font-semibold text-gray-900 tabular-nums">{count}</div>
                  <div className="text-xs text-gray-400 tabular-nums">{pct}%</div>
                </div>
              );
            })}
          </div>
        )}

        {tierAssignments.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="tier-assignments-empty"
          >
            No tier assignments yet. DPO triples will be classified on generation-round completion.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2 list-none" data-testid="tier-assignments-list">
            {tierAssignments.map((item) => (
              <li key={item.dpoTripleId} data-testid={`tier-item-${item.dpoTripleId}`}>
                <CurriculumTierBadge
                  dpoTripleId={item.dpoTripleId}
                  curriculumTier={item.curriculumTier}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="shadow-runs-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Shadow runs
          <span className="ml-2 text-xs font-normal text-gray-400">
            {shadowRuns.length} OSS-model comparisons
          </span>
        </h2>
        {shadowRuns.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="shadow-runs-empty"
          >
            No shadow runs yet.
          </p>
        ) : (
          <ul className="space-y-2 list-none" data-testid="shadow-runs-list">
            {shadowRuns.map((item) => (
              <li key={item.shadowRunId} data-testid={`shadow-run-item-${item.shadowRunId}`}>
                <ShadowRunStatusCard
                  shadowRunId={item.shadowRunId}
                  ossModel={item.ossModel}
                  cycleId={item.cycleId}
                  status={item.status}
                  grade={item.grade}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
