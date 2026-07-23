/**
 * ShadowRunStatusCard — displays a shadow run record for an OSS model.
 *
 * CF-804: ossModel and cycleId are required display fields.
 */

import React from 'react';

export type ShadowRunStatus = 'PENDING' | 'COMPLETE' | 'FAILED';

export interface ShadowRunStatusCardProps {
  shadowRunId: string;
  ossModel: string;
  cycleId: string;
  status: ShadowRunStatus;
  grade?: number | null;
}

const STATUS_TONES: Record<ShadowRunStatus, string> = {
  COMPLETE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<ShadowRunStatus, string> = {
  COMPLETE: '✓',
  PENDING: '…',
  FAILED: '✕',
};

export function ShadowRunStatusCard({
  shadowRunId,
  ossModel,
  cycleId,
  status,
  grade,
}: ShadowRunStatusCardProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
      data-testid={`shadow-run-card-${shadowRunId}`}
      data-status={status}
    >
      <span
        className="font-mono text-xs font-semibold text-gray-700"
        data-testid={`shadow-run-model-${shadowRunId}`}
      >
        {ossModel}
      </span>
      <span
        className="font-mono text-xs text-gray-500"
        data-testid={`shadow-run-cycle-${shadowRunId}`}
      >
        {cycleId}
      </span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_TONES[status]}`}
        data-testid={`shadow-run-status-${shadowRunId}`}
        aria-label={`Shadow run ${shadowRunId}: ${status}`}
      >
        <span aria-hidden="true">{STATUS_ICONS[status]}</span>
        {status}
      </span>
      {grade !== null && grade !== undefined && (
        <span
          className="ms-auto text-xs font-semibold text-gray-700 tabular-nums"
          data-testid={`shadow-run-grade-${shadowRunId}`}
          data-grade={grade}
        >
          {(grade * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
