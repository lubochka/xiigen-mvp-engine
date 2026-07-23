/**
 * DNA-9: CloudEvents
 * Every inter-service message uses CloudEvents envelope format.
 * Ensures consistent event structure across all fabrics.
 */

import { randomUUID } from 'crypto';

/**
 * Create a CloudEvents v1.0 compliant envelope.
 *
 * DNA-9 Rule: Every event through Queue Fabric MUST use this format.
 * No raw message bodies — always wrapped in CloudEvents envelope.
 */
export function createCloudEvent(params: {
  eventType: string;
  source: string;
  data: Record<string, unknown>;
  tenantId: string;
  subject?: string;
  correlationId?: string;
}): Record<string, unknown> {
  const eventId = randomUUID();
  const event: Record<string, unknown> = {
    specversion: '1.0',
    id: eventId,
    type: params.eventType,
    source: `${params.source}/${params.tenantId}`,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data: params.data,
    // XIIGen extensions
    tenantid: params.tenantId,
  };

  if (params.subject) {
    event['subject'] = params.subject;
  }

  event['correlationid'] = params.correlationId ?? eventId;

  return event;
}

/**
 * Validate that a dict conforms to CloudEvents v1.0 spec.
 * Returns [isValid, errors].
 */
export function validateCloudEvent(event: Record<string, unknown>): [boolean, string[]] {
  const errors: string[] = [];
  const required = ['specversion', 'id', 'type', 'source'];

  for (const field of required) {
    if (!(field in event)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (event['specversion'] !== '1.0') {
    errors.push(`Unsupported specversion: ${event['specversion']}`);
  }

  // XIIGen extension: tenantid is required (DNA-5)
  if (!('tenantid' in event)) {
    errors.push('Missing XIIGen extension: tenantid (DNA-5 scope isolation)');
  }

  return [errors.length === 0, errors];
}

/** Serialize CloudEvent to JSON string for queue transport. */
export function serializeCloudEvent(event: Record<string, unknown>): string {
  return JSON.stringify(event);
}

/** Deserialize CloudEvent from JSON string. */
export function deserializeCloudEvent(raw: string | Buffer): Record<string, unknown> {
  const str = typeof raw === 'string' ? raw : raw.toString('utf-8');
  return JSON.parse(str) as Record<string, unknown>;
}

/** Extract the data payload from a CloudEvent. */
export function extractEventData(event: Record<string, unknown>): Record<string, unknown> {
  const data = event['data'];
  if (data === undefined || data === null) {
    return {};
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return { raw: data };
    }
  }
  if (typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}
