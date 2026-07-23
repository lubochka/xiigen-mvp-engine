/**
 * EventDeliveryTag — displays CF-797 compliant event delivery status.
 * CF-797: shows events from user-facing flow domains (read-only display).
 */

import React from 'react';

export type EventDeliveryStatus = 'DELIVERED' | 'DISCARDED' | 'FAILED';

export interface EventDeliveryTagProps {
  eventId: string;
  eventType: string;
  status: EventDeliveryStatus;
}

const STATUS_LABELS: Record<EventDeliveryStatus, string> = {
  DELIVERED: 'Delivered',
  DISCARDED: 'Discarded',
  FAILED: 'Failed',
};

const STATUS_TONES: Record<EventDeliveryStatus, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISCARDED: 'bg-gray-100 text-gray-600 border-gray-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<EventDeliveryStatus, string> = {
  DELIVERED: '✓',
  DISCARDED: '–',
  FAILED: '✕',
};

export function EventDeliveryTag({
  eventId,
  eventType,
  status,
}: EventDeliveryTagProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2"
      data-testid={`event-delivery-${eventId}`}
      data-status={status}
      data-event-type={eventType}
      aria-label={`Event ${eventId}: ${STATUS_LABELS[status]}`}
    >
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_TONES[status]}`}
      >
        <span aria-hidden="true">{STATUS_ICONS[status]}</span>
        {STATUS_LABELS[status]}
      </span>
      <span className="font-mono text-xs text-gray-700">{eventType}</span>
      <span className="font-mono text-xs text-gray-400 ms-auto">{eventId}</span>
    </div>
  );
}
