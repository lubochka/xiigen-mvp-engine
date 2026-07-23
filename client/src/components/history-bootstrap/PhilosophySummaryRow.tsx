/**
 * PhilosophySummaryRow — displays a philosophy summary group (FLOW-45).
 * Shows patternType, count of patterns, and summarizationRunId.
 */

import React from 'react';

export interface PhilosophySummaryRowProps {
  summarizationRunId: string;
  patternType: string;
  patternCount: number;
}

export function PhilosophySummaryRow({
  summarizationRunId,
  patternType,
  patternCount,
}: PhilosophySummaryRowProps): React.ReactElement {
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded border border-gray-200 bg-white"
      data-testid={`summary-row-${summarizationRunId}-${patternType}`}
      data-pattern-type={patternType}
      aria-label={`Summary for ${patternType}: ${patternCount} patterns`}
    >
      <span
        className="text-sm font-medium text-gray-700"
        data-testid={`summary-type-${summarizationRunId}-${patternType}`}
      >
        {patternType}
      </span>
      <span
        className="inline-flex items-center justify-center min-w-8 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700"
        data-testid={`summary-count-${summarizationRunId}-${patternType}`}
        aria-label={`${patternCount} patterns for ${patternType}`}
      >
        {patternCount}
      </span>
    </div>
  );
}
