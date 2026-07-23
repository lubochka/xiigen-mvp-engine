/**
 * TraceSpanCapture — Unit Tests (T448).
 *
 * Tests:
 *   TSC-1:  missing tenantId → UNSCOPED_QUERY
 *   TSC-2:  missing traceId → MISSING_TRACE_ID
 *   TSC-3:  missing spanName → MISSING_SPAN_NAME
 *   TSC-4:  valid span → success with captured=true
 *   TSC-5:  queue failure does NOT propagate — always returns success (score-0 fire-and-forget)
 *   TSC-6:  spanId is non-empty string
 *   TSC-7:  span emitted to observability.trace.span channel
 *   TSC-8:  no storeDocument called — spans are ephemeral (score-0)
 */

import { TraceSpanCapture } from '../../src/engine/flows/rag-optimization/trace-span-capture.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-tsc-test';
const TRACE = 'trace-abc-123';
const SPAN = 'retrieval.vector';

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

function makeFailingQueue() {
  return {
    enqueue: jest.fn(async () => {
      throw new Error('Queue unavailable');
    }),
  } as any;
}

describe('TraceSpanCapture — Unit (T448)', () => {
  it('TSC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TraceSpanCapture(makeQueue());
    const r = await svc.captureSpan('', TRACE, SPAN, 42);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('TSC-2: missing traceId → MISSING_TRACE_ID', async () => {
    const svc = new TraceSpanCapture(makeQueue());
    const r = await svc.captureSpan(TENANT, '', SPAN, 42);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TRACE_ID');
  });

  it('TSC-3: missing spanName → MISSING_SPAN_NAME', async () => {
    const svc = new TraceSpanCapture(makeQueue());
    const r = await svc.captureSpan(TENANT, TRACE, '', 42);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SPAN_NAME');
  });

  it('TSC-4: valid span → success with captured=true', async () => {
    const svc = new TraceSpanCapture(makeQueue());
    const r = await svc.captureSpan(TENANT, TRACE, SPAN, 150, { op: 'test' });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.captured).toBe(true);
  });

  it('TSC-5: queue failure does NOT propagate — returns success (score-0 fire-and-forget)', async () => {
    const svc = new TraceSpanCapture(makeFailingQueue());
    const r = await svc.captureSpan(TENANT, TRACE, SPAN, 42);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.captured).toBe(true);
  });

  it('TSC-6: spanId is non-empty string', async () => {
    const svc = new TraceSpanCapture(makeQueue());
    const r = await svc.captureSpan(TENANT, TRACE, SPAN, 42);
    expect(r.isSuccess).toBe(true);
    expect(typeof r.data!.spanId).toBe('string');
    expect(r.data!.spanId.length).toBeGreaterThan(0);
  });

  it('TSC-7: span emitted to observability.trace.span channel', async () => {
    const queue = makeQueue();
    const svc = new TraceSpanCapture(queue);
    await svc.captureSpan(TENANT, TRACE, SPAN, 42);
    expect(queue.enqueue).toHaveBeenCalledWith('observability.trace.span', expect.any(Object));
  });

  it('TSC-8: no storeDocument called — spans are ephemeral (score-0)', async () => {
    // TraceSpanCapture only takes IQueueService — no IDatabaseService injected
    // This test verifies the constructor signature enforces queue-only
    const queue = makeQueue();
    const svc = new TraceSpanCapture(queue);
    await svc.captureSpan(TENANT, TRACE, SPAN, 42);
    // Only queue was called, never db.storeDocument
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });
});
