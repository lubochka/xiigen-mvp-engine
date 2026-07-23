/**
 * SseConnectionStatusBadge — displays SSE connection registration status.
 */

import React from 'react';

export type SseConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'FAILED';

export interface SseConnectionStatusBadgeProps {
  correlationId: string;
  status: SseConnectionStatus;
}

const STATUS_LABELS: Record<SseConnectionStatus, string> = {
  CONNECTED: 'Connected',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
};

const STATUS_TONES: Record<SseConnectionStatus, string> = {
  CONNECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EXPIRED: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_DOTS: Record<SseConnectionStatus, string> = {
  CONNECTED: 'bg-emerald-500',
  EXPIRED: 'bg-amber-500',
  FAILED: 'bg-red-500',
};

export function SseConnectionStatusBadge({
  correlationId,
  status,
}: SseConnectionStatusBadgeProps): React.ReactElement {
  return (
    <div
      className={`sse-connection-badge sse-connection-badge--${status.toLowerCase()} flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2`}
      data-testid={`sse-status-${correlationId}`}
      data-status={status}
      aria-label={`SSE connection ${correlationId}: ${STATUS_LABELS[status]}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_TONES[status]}`}
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`}
          aria-hidden="true"
        />
        {STATUS_LABELS[status]}
      </span>
      <span className="font-mono text-xs text-gray-600">{correlationId}</span>
    </div>
  );
}
