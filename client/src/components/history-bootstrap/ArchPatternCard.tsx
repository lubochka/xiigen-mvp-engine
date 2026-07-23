/**
 * ArchPatternCard — displays a single ARCH_PATTERN record (FLOW-45).
 * Shows patternId, patternType, and description.
 * CF-804: always GLOBAL scope — no tenant badge needed.
 */

import React from 'react';

export type ArchPatternType =
  | 'FABRIC_FIRST'
  | 'DATA_INTEGRITY'
  | 'MULTI_TENANT'
  | 'RESULT_PATTERN'
  | 'QUEUE_FIRST'
  | 'CONFIG_OVER_CODE'
  | 'UNKNOWN';

export interface ArchPatternCardProps {
  patternId: string;
  patternType: ArchPatternType | string;
  description: string;
}

const PATTERN_TYPE_TONES: Record<string, string> = {
  FABRIC_FIRST: 'bg-blue-50 text-blue-700 border-blue-200',
  DATA_INTEGRITY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MULTI_TENANT: 'bg-purple-50 text-purple-700 border-purple-200',
  RESULT_PATTERN: 'bg-amber-50 text-amber-700 border-amber-200',
  QUEUE_FIRST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  CONFIG_OVER_CODE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  UNKNOWN: 'bg-gray-50 text-gray-700 border-gray-200',
};

export function ArchPatternCard({
  patternId,
  patternType,
  description,
}: ArchPatternCardProps): React.ReactElement {
  const tone = PATTERN_TYPE_TONES[patternType] ?? PATTERN_TYPE_TONES.UNKNOWN;
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
      data-testid={`arch-pattern-${patternId}`}
      data-pattern-type={patternType}
      aria-label={`Pattern ${patternId}: ${patternType}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700"
          data-testid={`arch-pattern-id-${patternId}`}
        >
          {patternId}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${tone}`}
          data-testid={`arch-pattern-type-${patternId}`}
        >
          {patternType}
        </span>
      </div>
      <p
        className="text-sm text-gray-600 leading-relaxed"
        data-testid={`arch-pattern-desc-${patternId}`}
      >
        {description}
      </p>
    </div>
  );
}
