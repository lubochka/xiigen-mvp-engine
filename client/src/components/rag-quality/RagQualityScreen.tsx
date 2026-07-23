/**
 * RagQualityScreen — lists RAG patterns with quality scores and recent cycle outcomes.
 *
 * Empty state: "No patterns found" message.
 * Each pattern row: RagQualityBadge + pattern ID + type.
 * Each outcome row: CycleOutcomeTag + cycleId + timestamp.
 */

import React from 'react';
import { RagQualityBadge } from './RagQualityBadge';
import { CycleOutcomeTag, type CycleOutcome } from './CycleOutcomeTag';
import { flowHumanName } from '../../utils/flowHumanName';

const PATTERN_TYPE_LABELS: Record<string, string> = {
  RETRIEVAL_CONTEXT: 'Retrieval context',
  DISTILLED_RULE: 'Distilled rule',
  NODE_TEMPLATE: 'Node template',
  ARCHETYPE_HINT: 'Archetype hint',
  CROSS_FLOW_RULE: 'Cross-flow rule',
};

function formatPatternType(raw: string): string {
  return (
    PATTERN_TYPE_LABELS[raw] ??
    raw
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

export interface RagPatternRecord {
  patternId: string;
  patternType: string;
  qualityScore: number;
  flowId: string;
}

export interface CycleOutcomeRecord {
  cycleId: string;
  outcome: CycleOutcome;
  flowId: string;
  createdAt: string;
}

export interface RagQualityScreenProps {
  patterns: RagPatternRecord[];
  outcomes: CycleOutcomeRecord[];
}

export function RagQualityScreen({
  patterns,
  outcomes,
}: RagQualityScreenProps): React.ReactElement {
  return (
    <div className="p-6 space-y-6" data-testid="rag-quality-screen">
      <section data-testid="patterns-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          RAG patterns
          <span className="ml-2 text-xs font-normal text-gray-400">{patterns.length} scored</span>
        </h2>
        {patterns.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="no-patterns-message"
          >
            No patterns found. Generation rounds will populate this list as they complete.
          </p>
        ) : (
          <ul className="space-y-2 list-none" data-testid="pattern-list">
            {patterns.map((pattern) => (
              <li
                key={pattern.patternId}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
                data-testid={`pattern-item-${pattern.patternId}`}
              >
                <RagQualityBadge
                  patternId={pattern.patternId}
                  qualityScore={pattern.qualityScore}
                />
                <span
                  className="text-sm font-medium text-gray-800"
                  data-testid={`pattern-id-${pattern.patternId}`}
                >
                  {formatPatternType(pattern.patternType)}
                </span>
                <span className="text-xs text-gray-500 ms-auto">
                  {flowHumanName(pattern.flowId)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="outcomes-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent cycle outcomes
          <span className="ml-2 text-xs font-normal text-gray-400">
            {outcomes.length} in the last 24h
          </span>
        </h2>
        {outcomes.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="no-outcomes-message"
          >
            No outcomes recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none" data-testid="outcome-list">
            {outcomes.map((co) => (
              <li
                key={co.cycleId}
                className="flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2"
                data-testid={`outcome-item-${co.cycleId}`}
              >
                <CycleOutcomeTag cycleId={co.cycleId} outcome={co.outcome} />
                <span
                  className="text-sm text-gray-800"
                  data-testid={`outcome-cycle-${co.cycleId}`}
                >
                  {flowHumanName(co.flowId)}
                </span>
                <span className="text-xs text-gray-400 ms-auto tabular-nums">
                  {co.createdAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
