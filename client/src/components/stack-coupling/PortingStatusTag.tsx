/**
 * PortingStatusTag — displays the completion status of a porting run.
 *
 * Statuses:
 *   COMPLETE → green
 *   PARTIAL  → yellow
 *   FAILED   → red
 */

import React from 'react';

export type PortingCompletionStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';

export interface PortingStatusTagProps {
  portingRunId: string;
  status: PortingCompletionStatus;
}

const STATUS_LABELS: Record<PortingCompletionStatus, string> = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
};

export function PortingStatusTag({
  portingRunId,
  status,
}: PortingStatusTagProps): React.ReactElement {
  return (
    <span
      className={`porting-status-tag porting-status-tag--${status.toLowerCase()}`}
      data-testid={`porting-status-${portingRunId}`}
      data-status={status}
      aria-label={`Porting run ${portingRunId}: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
