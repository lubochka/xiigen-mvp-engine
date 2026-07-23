/**
 * BootstrapStatusBadge — displays orchestration completion status (FLOW-45).
 * Status: COMPLETE | PARTIAL | FAILED
 */

import React from 'react';

export type BootstrapCompletionStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';

export interface BootstrapStatusBadgeProps {
  bootstrapRunId: string;
  completionStatus: BootstrapCompletionStatus;
}

const STATUS_LABELS: Record<BootstrapCompletionStatus, string> = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
};

const STATUS_TONES: Record<BootstrapCompletionStatus, string> = {
  COMPLETE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<BootstrapCompletionStatus, string> = {
  COMPLETE: '✓',
  PARTIAL: '…',
  FAILED: '✕',
};

export function BootstrapStatusBadge({
  bootstrapRunId,
  completionStatus,
}: BootstrapStatusBadgeProps): React.ReactElement {
  const tone = STATUS_TONES[completionStatus];
  const icon = STATUS_ICONS[completionStatus];
  return (
    <div
      className={`bootstrap-status-badge bootstrap-status-badge--${completionStatus.toLowerCase()} flex items-center gap-3`}
      data-testid={`bootstrap-status-${bootstrapRunId}`}
      data-status={completionStatus}
      aria-label={`Bootstrap run ${bootstrapRunId}: ${STATUS_LABELS[completionStatus]}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${tone}`}
      >
        <span aria-hidden="true">{icon}</span>
        {STATUS_LABELS[completionStatus]}
      </span>
      <span className="font-mono text-xs text-gray-500">{bootstrapRunId}</span>
    </div>
  );
}
