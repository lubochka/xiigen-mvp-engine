/**
 * FLOW-23 GAP-23-5: CloudEvents F969 Mandatory Wrapper
 * BFA Rules: CF-448
 * Error Correction: score-zero
 * Task Types: All 20 (CloudEvents applies to all async events)
 * Factory: F969 (ICloudEventsEnvelopeService) — PLATFORM-ONLY
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const CLOUD_EVENTS_ENVELOPE = 'CLOUD_EVENTS_ENVELOPE';

/**
 * CloudEvents 1.0 envelope service — PLATFORM-ONLY.
 * CF-448: ALL async events MUST use this service.
 * Automatically injects: tenantId, traceparent, id, time.
 * Never emit events directly — always use this service.
 */
export interface ICloudEventsEnvelopeService {
  /**
   * Emit a single event via CloudEvents 1.0 envelope.
   * CF-448: This is the ONLY permitted way to emit async events.
   * Injects all 8 SK-419 required fields automatically.
   */
  emit(event: CloudEventPayload): Promise<
    DataProcessResult<{
      eventId: string;
      emittedAt: string;
      type: string;
    }>
  >;

  /**
   * Emit multiple events atomically (transactional outbox).
   */
  emitBatch(events: CloudEventPayload[]): Promise<
    DataProcessResult<{
      eventIds: string[];
      count: number;
    }>
  >;
}

/**
 * CloudEvent payload — caller provides type, source, data.
 * F969 injects: id, time, tenantId (from AsyncLocalStorage), traceparent.
 */
export interface CloudEventPayload {
  type: string; // e.g., 'com.xiigen.canvas.node.created'
  source: string; // e.g., 'FLOW-23/T347'
  data: Record<string, unknown>; // DNA-1: typed data forbidden
  datacontenttype?: string; // default: 'application/json'
  subject?: string; // optional: sub-resource identifier
}

/**
 * Helper function — creates a CloudEventPayload with validation.
 * Use with cloudEvents.emit(createCloudEvent({ ... })).
 */
export function createCloudEvent(payload: CloudEventPayload): CloudEventPayload {
  if (!payload.type) throw new Error('CloudEvent: type is required');
  if (!payload.source) throw new Error('CloudEvent: source is required');
  if (!payload.data) throw new Error('CloudEvent: data is required');
  // Note: id, time, tenantId, traceparent injected by F969 emit() — not here
  return payload;
}
