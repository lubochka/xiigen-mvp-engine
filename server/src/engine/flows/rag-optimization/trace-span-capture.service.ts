/**
 * TraceSpanCapture — T448 OBSERVABILITY service for FLOW-29.
 *
 * Emits trace spans via QUEUE FABRIC only.
 *
 * SCORE-0 iron rules (any violation = contract rejection):
 *   NO_SDK:     ZERO OpenTelemetry SDK imports — not even @opentelemetry/api
 *   QUEUE_ONLY: ZERO direct HTTP to observability endpoint — queue fabric only
 *   FIRE_FORGET: span emission failures MUST NOT propagate to caller
 *   EPHEMERAL:  ALL span data flows via IQueueService — never storeDocument (spans are ephemeral)
 *   CF-476:     tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:      All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface SpanCaptureResult {
  readonly captured: boolean;
  readonly spanId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SPAN_CHANNEL = 'observability.trace.span';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TraceSpanCapture {
  constructor(private readonly queue: IQueueService) {}

  /**
   * Capture a trace span and emit via queue.
   *
   * SCORE-0: ZERO OpenTelemetry SDK imports.
   * Fire-and-forget: queue failures swallowed — ALWAYS returns success.
   * Ephemeral: never storeDocument — spans are not persisted.
   */
  async captureSpan(
    tenantId: string,
    traceId: string,
    spanName: string,
    durationMs: number,
    attributes: Record<string, unknown> = {},
  ): Promise<DataProcessResult<SpanCaptureResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!traceId || traceId.trim() === '') {
      return DataProcessResult.failure('MISSING_TRACE_ID', 'traceId is required');
    }
    if (!spanName || spanName.trim() === '') {
      return DataProcessResult.failure('MISSING_SPAN_NAME', 'spanName is required');
    }

    const spanId = `span-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    try {
      await this.queue.enqueue(SPAN_CHANNEL, {
        span_id: spanId,
        trace_id: traceId,
        tenant_id: tenantId,
        span_name: spanName,
        duration_ms: durationMs,
        attributes,
        timestamp,
      });
    } catch {
      // SCORE-0: fire-and-forget — queue failures must NOT propagate to caller
      // Span loss is acceptable for observability data
    }

    return DataProcessResult.success({ captured: true, spanId });
  }
}
