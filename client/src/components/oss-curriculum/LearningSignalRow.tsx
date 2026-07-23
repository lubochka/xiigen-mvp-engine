/**
 * LearningSignalRow — displays the 3 canonical learning signals for a shadow run.
 *
 * IRON-3-SIGNAL: exactly grade_trend, rag_context_size, graph_context_size displayed.
 */

import React from 'react';

export type GradeTrend = 'IMPROVING' | 'DECLINING' | 'STATIC';

export interface LearningSignalRowProps {
  signalRecordId: string;
  gradeTrend: GradeTrend;
  ragContextSize: number;
  graphContextSize: number;
}

const TREND_LABELS: Record<GradeTrend, string> = {
  IMPROVING: 'Improving',
  DECLINING: 'Declining',
  STATIC: 'Static',
};

export function LearningSignalRow({
  signalRecordId,
  gradeTrend,
  ragContextSize,
  graphContextSize,
}: LearningSignalRowProps): React.ReactElement {
  return (
    <div className="learning-signal-row" data-testid={`signal-row-${signalRecordId}`}>
      <span
        className={`learning-signal-row__trend learning-signal-row__trend--${gradeTrend.toLowerCase()}`}
        data-testid={`signal-trend-${signalRecordId}`}
        data-trend={gradeTrend}
        aria-label={`Grade trend: ${TREND_LABELS[gradeTrend]}`}
      >
        {TREND_LABELS[gradeTrend]}
      </span>
      <span
        data-testid={`signal-rag-${signalRecordId}`}
        aria-label={`RAG context size: ${ragContextSize}`}
      >
        RAG: {ragContextSize}
      </span>
      <span
        data-testid={`signal-graph-${signalRecordId}`}
        aria-label={`Graph context size: ${graphContextSize}`}
      >
        Graph: {graphContextSize}
      </span>
    </div>
  );
}
