/**
 * HistoryBootstrapScreen — root screen for the history bootstrap dashboard (FLOW-45).
 *
 * Displays:
 *   - Bootstrap run status (BootstrapStatusBadge)
 *   - Seeded ARCH_PATTERN list (ArchPatternCard per pattern)
 *   - Philosophy summaries (PhilosophySummaryRow per group)
 *   - Empty states when lists are empty
 */

import React from 'react';
import { ArchPatternCard, ArchPatternCardProps } from './ArchPatternCard';
import { PhilosophySummaryRow, PhilosophySummaryRowProps } from './PhilosophySummaryRow';
import { BootstrapStatusBadge, BootstrapCompletionStatus } from './BootstrapStatusBadge';

export interface HistoryBootstrapScreenProps {
  bootstrapRunId: string;
  completionStatus: BootstrapCompletionStatus;
  patterns: Array<ArchPatternCardProps>;
  summaries: Array<PhilosophySummaryRowProps>;
}

export function HistoryBootstrapScreen({
  bootstrapRunId,
  completionStatus,
  patterns,
  summaries,
}: HistoryBootstrapScreenProps): React.ReactElement {
  return (
    <div className="p-6 space-y-6" data-testid="history-bootstrap-screen">
      <section data-testid="bootstrap-status-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Bootstrap status
        </h2>
        <BootstrapStatusBadge bootstrapRunId={bootstrapRunId} completionStatus={completionStatus} />
      </section>

      <section data-testid="patterns-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Architecture patterns
          <span className="ml-2 text-xs font-normal text-gray-400">{patterns.length} seeded</span>
        </h2>
        {patterns.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="patterns-empty"
          >
            No patterns seeded yet. The bootstrap orchestrator will populate this on first run.
          </p>
        ) : (
          <ul className="space-y-2 list-none" data-testid="patterns-list">
            {patterns.map((p) => (
              <li key={p.patternId} data-testid={`pattern-item-${p.patternId}`}>
                <ArchPatternCard {...p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="summaries-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Philosophy summaries
          <span className="ml-2 text-xs font-normal text-gray-400">
            {summaries.length} distilled
          </span>
        </h2>
        {summaries.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="summaries-empty"
          >
            No summaries distilled yet.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none" data-testid="summaries-list">
            {summaries.map((s) => (
              <li
                key={`${s.summarizationRunId}-${s.patternType}`}
                data-testid={`summary-item-${s.patternType}`}
              >
                <PhilosophySummaryRow {...s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
