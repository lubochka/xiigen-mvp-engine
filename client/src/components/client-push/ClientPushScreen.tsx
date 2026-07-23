/**
 * ClientPushScreen — root screen for the SSE client push dashboard.
 *
 * Displays:
 *   - Active SSE connections (from ISseConnectionPool)
 *   - Event delivery log (FlowEventBridge outcomes)
 *   - Empty states when lists are empty
 */

import React from 'react';
import { SseConnectionStatusBadge, SseConnectionStatus } from './SseConnectionStatusBadge';
import { EventDeliveryTag, EventDeliveryStatus } from './EventDeliveryTag';

export interface SseConnectionItem {
  correlationId: string;
  status: SseConnectionStatus;
}

export interface EventDeliveryItem {
  eventId: string;
  eventType: string;
  status: EventDeliveryStatus;
}

export interface ClientPushScreenProps {
  connections: SseConnectionItem[];
  eventDeliveries: EventDeliveryItem[];
}

export function ClientPushScreen({
  connections,
  eventDeliveries,
}: ClientPushScreenProps): React.ReactElement {
  const connectedCount = connections.filter((c) => c.status === 'CONNECTED').length;
  const deliveredCount = eventDeliveries.filter((e) => e.status === 'DELIVERED').length;

  return (
    <div className="p-6 space-y-6" data-testid="client-push-screen">
      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Active connections</div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {connectedCount}
            <span className="text-xs font-normal text-gray-400 ml-1">/ {connections.length}</span>
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Recent deliveries</div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {deliveredCount}
            <span className="text-xs font-normal text-gray-400 ml-1">
              / {eventDeliveries.length}
            </span>
          </div>
        </div>
        <div className="rounded border border-gray-200 bg-white px-3 py-2">
          <div className="text-xs text-gray-500">Delivery success rate</div>
          <div className="text-lg font-semibold text-gray-900 tabular-nums">
            {eventDeliveries.length
              ? Math.round((deliveredCount / eventDeliveries.length) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      <section data-testid="connections-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Active SSE connections
        </h2>
        {connections.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="connections-empty"
          >
            No active connections — clients will appear here when they subscribe.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none" data-testid="connections-list">
            {connections.map((item) => (
              <li key={item.correlationId} data-testid={`connection-item-${item.correlationId}`}>
                <SseConnectionStatusBadge correlationId={item.correlationId} status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="events-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Event deliveries
          <span className="ml-2 text-xs font-normal text-gray-400">recent first</span>
        </h2>
        {eventDeliveries.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="events-empty"
          >
            No event deliveries yet.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none" data-testid="events-list">
            {eventDeliveries.map((item) => (
              <li key={item.eventId} data-testid={`event-item-${item.eventId}`}>
                <EventDeliveryTag
                  eventId={item.eventId}
                  eventType={item.eventType}
                  status={item.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
