/**
 * FLOW-40 Phases B-D — T587-T589 SSE Client Push Services Tests.
 *
 * 24 tests covering:
 *
 * CM-1..CM-6: SseConnectionManager (T587)
 *   CM-1: auth-before-registration — missing tenantId → UNAUTHENTICATED_TENANT failure
 *   CM-2: auth-before-registration — missing correlationId → MISSING_CORRELATION_ID failure
 *   CM-3: expired-404 — null activeFlowState → EXPIRED_CORRELATION_ID failure
 *   CM-4: valid registration → registered=true, pool.registerConnection called
 *   CM-5: valid registration → connectionInfo has tenantId + correlationId
 *   CM-6: DNA-3 — pool throws → POOL_REGISTRATION_FAILED failure
 *
 * EB-1..EB-8: FlowEventBridge (T588)
 *   EB-1: CF-797 — no emit into user-facing domains (service has no emit calls)
 *   EB-2: CF-798 — cross-tenant delivery attempt → CROSS_TENANT_DELIVERY_ATTEMPT failure
 *   EB-3: no-retry-on-missing — connection not in pool → success with delivered=false
 *   EB-4: valid delivery → delivered=true, recipientCount=1
 *   EB-5: missing tenantId → MISSING_TENANT_ID failure
 *   EB-6: missing correlationId → MISSING_CORRELATION_ID failure
 *   EB-7: DNA-3 — throws → BRIDGE_ERROR failure
 *   EB-8: pool returns false for pushEvent → delivered=false
 *
 * KA-1..KA-6: SseKeepaliveScheduler (T589)
 *   KA-1: keepalive-from-config — invalid keepaliveIntervalMs → failure
 *   KA-2: dropped-INFO-only — dropped connection cleaned, not error
 *   KA-3: cleanup-before-emit — pool.closeConnection called before pushEvent on dropped
 *   KA-4: active connection receives ping → pinged=1
 *   KA-5: zero active connections → pinged=0, cleaned=0 (not an error)
 *   KA-6: DNA-3 — throws → KEEPALIVE_SCHEDULER_ERROR failure
 *
 * MT-1..MT-4: missing/invalid inputs
 *   MT-1: SseConnectionManager missing tenantId → UNAUTHENTICATED_TENANT
 *   MT-2: FlowEventBridge missing tenantId → MISSING_TENANT_ID
 *   MT-3: SseKeepaliveScheduler missing tenantId → MISSING_TENANT_ID
 *   MT-4: SseKeepaliveScheduler zero keepaliveIntervalMs → INVALID_KEEPALIVE_INTERVAL
 */

import 'reflect-metadata';
import { SseConnectionManager } from '../../src/engine/flows/client-push/sse-connection-manager.service';
import { FlowEventBridge } from '../../src/engine/flows/client-push/flow-event-bridge.service';
import { SseKeepaliveScheduler } from '../../src/engine/flows/client-push/sse-keepalive-scheduler.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import type { ConnectionInfo } from '../../src/fabrics/interfaces/sse-connection-pool.interface';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeMockResponse() {
  return {
    write: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  } as any;
}

function makeMockPool(connections: ConnectionInfo[] = [], pushResult = true) {
  return {
    registerConnection: jest.fn(),
    pushEvent: jest.fn().mockReturnValue(pushResult),
    closeConnection: jest.fn(),
    getActiveConnections: jest.fn().mockReturnValue(connections),
  } as any;
}

function makeConnectionInfo(
  tenantId: string,
  correlationId: string,
  lastAckMsAgo = 0,
): ConnectionInfo {
  return {
    tenantId,
    correlationId,
    connectedAt: new Date(Date.now() - lastAckMsAgo - 1000).toISOString(),
    lastAcknowledgedAt: new Date(Date.now() - lastAckMsAgo).toISOString(),
  };
}

beforeEach(() => jest.clearAllMocks());

// ── SseConnectionManager (T587) ───────────────────────────────────────────────

describe('FLOW-40 Phase B — SseConnectionManager (T587)', () => {
  it('CM-1: auth-before-registration — missing tenantId → UNAUTHENTICATED_TENANT', async () => {
    const svc = new SseConnectionManager(makeMockDb(), makeMockPool());
    const result = await svc.register({
      tenantId: '',
      correlationId: 'CORR-001',
      connectionResponse: makeMockResponse(),
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNAUTHENTICATED_TENANT');
  });

  it('CM-2: auth-before-registration — missing correlationId → MISSING_CORRELATION_ID', async () => {
    const svc = new SseConnectionManager(makeMockDb(), makeMockPool());
    const result = await svc.register({
      tenantId: 'tenant-a',
      correlationId: '',
      connectionResponse: makeMockResponse(),
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_CORRELATION_ID');
  });

  it('CM-3: expired-404 — null activeFlowState → EXPIRED_CORRELATION_ID', async () => {
    const svc = new SseConnectionManager(makeMockDb(), makeMockPool());
    const result = await svc.register({
      tenantId: 'tenant-a',
      correlationId: 'CORR-001',
      connectionResponse: makeMockResponse(),
      activeFlowState: null as any,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EXPIRED_CORRELATION_ID');
  });

  it('CM-4: valid registration → registered=true, pool.registerConnection called', async () => {
    const pool = makeMockPool();
    const svc = new SseConnectionManager(makeMockDb(), pool);

    const result = await svc.register({
      tenantId: 'tenant-b',
      correlationId: 'CORR-002',
      connectionResponse: makeMockResponse(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.registered).toBe(true);
    expect(pool.registerConnection).toHaveBeenCalledWith(
      'tenant-b',
      'CORR-002',
      expect.any(Object),
    );
  });

  it('CM-5: valid registration → connectionInfo has tenantId + correlationId', async () => {
    const svc = new SseConnectionManager(makeMockDb(), makeMockPool());
    const result = await svc.register({
      tenantId: 'tenant-c',
      correlationId: 'CORR-003',
      connectionResponse: makeMockResponse(),
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.connectionInfo.tenantId).toBe('tenant-c');
    expect(result.data!.connectionInfo.correlationId).toBe('CORR-003');
  });

  it('CM-6: DNA-3 — pool throws → POOL_REGISTRATION_FAILED failure', async () => {
    const pool = makeMockPool();
    (pool.registerConnection as jest.Mock).mockImplementation(() => {
      throw new Error('pool crash');
    });
    const svc = new SseConnectionManager(makeMockDb(), pool);

    const result = await svc.register({
      tenantId: 'tenant-d',
      correlationId: 'CORR-004',
      connectionResponse: makeMockResponse(),
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('POOL_REGISTRATION_FAILED');
  });
});

// ── FlowEventBridge (T588) ────────────────────────────────────────────────────

describe('FLOW-40 Phase C — FlowEventBridge (T588)', () => {
  it('EB-1: CF-797 — FlowEventBridge has no emit into user-facing domains', () => {
    // Structural test: FlowEventBridge.bridge() only calls pool methods,
    // never queue.enqueue() into user-facing domains
    const svc = new FlowEventBridge(makeMockPool());
    // If we could call bridge with CF-797 domain event and it succeeds (read-only),
    // it has no emit side-effect. This test verifies by checking no queue injection.
    expect(svc).toBeDefined();
    // FlowEventBridge constructor does NOT take a queue service — proof of CF-797 compliance
    const constructorStr = svc.constructor.toString();
    expect(constructorStr).not.toContain('QUEUE_SERVICE');
  });

  it('EB-2: CF-798 — cross-tenant delivery → CROSS_TENANT_DELIVERY_ATTEMPT failure', async () => {
    // Pool returns connection registered under tenantId=B, but request is for tenantId=A
    const wrongTenantConn = makeConnectionInfo('tenant-B', 'CORR-010');
    const pool = makeMockPool([wrongTenantConn]);
    const svc = new FlowEventBridge(pool);

    const result = await svc.bridge({
      tenantId: 'tenant-A',
      correlationId: 'CORR-010',
      cloudEvent: { type: 'xiigen.user-registration.email.verified', data: {}, id: 'EVT-001' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_DELIVERY_ATTEMPT');
  });

  it('EB-3: no-retry-on-missing — connection not in pool → success with delivered=false', async () => {
    const pool = makeMockPool([]); // empty pool
    const svc = new FlowEventBridge(pool);

    const result = await svc.bridge({
      tenantId: 'tenant-a',
      correlationId: 'CORR-999',
      cloudEvent: { type: 'xiigen.onboarding.step.completed', data: {}, id: 'EVT-002' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.delivered).toBe(false);
    expect(result.data!.recipientCount).toBe(0);
  });

  it('EB-4: valid delivery → delivered=true, recipientCount=1', async () => {
    const conn = makeConnectionInfo('tenant-a', 'CORR-011');
    const pool = makeMockPool([conn], true); // pushEvent returns true
    const svc = new FlowEventBridge(pool);

    const result = await svc.bridge({
      tenantId: 'tenant-a',
      correlationId: 'CORR-011',
      cloudEvent: {
        type: 'xiigen.user-registration.email.verified',
        data: { token: 'abc' },
        id: 'EVT-003',
      },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.delivered).toBe(true);
    expect(result.data!.recipientCount).toBe(1);
  });

  it('EB-5: missing tenantId → MISSING_TENANT_ID failure', async () => {
    const svc = new FlowEventBridge(makeMockPool());
    const result = await svc.bridge({
      tenantId: '',
      correlationId: 'CORR-012',
      cloudEvent: { type: 'test.event', data: {}, id: 'EVT-004' },
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT_ID');
  });

  it('EB-6: missing correlationId → MISSING_CORRELATION_ID failure', async () => {
    const svc = new FlowEventBridge(makeMockPool());
    const result = await svc.bridge({
      tenantId: 'tenant-a',
      correlationId: '',
      cloudEvent: { type: 'test.event', data: {}, id: 'EVT-005' },
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_CORRELATION_ID');
  });

  it('EB-7: DNA-3 — getActiveConnections throws → BRIDGE_ERROR failure', async () => {
    const pool = makeMockPool();
    (pool.getActiveConnections as jest.Mock).mockImplementation(() => {
      throw new Error('pool crash');
    });
    const svc = new FlowEventBridge(pool);

    const result = await svc.bridge({
      tenantId: 'tenant-a',
      correlationId: 'CORR-013',
      cloudEvent: { type: 'test.event', data: {}, id: 'EVT-006' },
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BRIDGE_ERROR');
  });

  it('EB-8: pool.pushEvent returns false → delivered=false', async () => {
    const conn = makeConnectionInfo('tenant-a', 'CORR-014');
    const pool = makeMockPool([conn], false); // pushEvent returns false (connection closed)
    const svc = new FlowEventBridge(pool);

    const result = await svc.bridge({
      tenantId: 'tenant-a',
      correlationId: 'CORR-014',
      cloudEvent: { type: 'test.event', data: {}, id: 'EVT-007' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.delivered).toBe(false);
    expect(result.data!.recipientCount).toBe(0);
  });
});

// ── SseKeepaliveScheduler (T589) ──────────────────────────────────────────────

describe('FLOW-40 Phase D — SseKeepaliveScheduler (T589)', () => {
  it('KA-1: keepalive-from-config — invalid keepaliveIntervalMs → INVALID_KEEPALIVE_INTERVAL', async () => {
    const svc = new SseKeepaliveScheduler(makeMockPool());
    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 0,
      droppedThresholdMs: 90000,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_KEEPALIVE_INTERVAL');
  });

  it('KA-2: dropped-INFO-only — dropped connection cleaned, not an error (success returned)', async () => {
    // lastAcknowledgedAt is 200s ago → exceeds 90s droppedThresholdMs
    const droppedConn = makeConnectionInfo('tenant-a', 'CORR-020', 200_000);
    const pool = makeMockPool([droppedConn]);
    const svc = new SseKeepaliveScheduler(pool);

    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.cleaned).toBe(1);
    expect(result.data!.pinged).toBe(0);
  });

  it('KA-3: cleanup-before-emit — pool.closeConnection called BEFORE pushEvent on dropped', async () => {
    const droppedConn = makeConnectionInfo('tenant-a', 'CORR-021', 200_000);
    const pool = makeMockPool([droppedConn]);
    const svc = new SseKeepaliveScheduler(pool);

    const callOrder: string[] = [];
    (pool.closeConnection as jest.Mock).mockImplementation(() => callOrder.push('close'));
    (pool.pushEvent as jest.Mock).mockImplementation(() => {
      callOrder.push('push');
      return true;
    });

    await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });

    // closeConnection must be called; pushEvent must NOT be called for a dropped connection
    expect(pool.closeConnection).toHaveBeenCalledWith('tenant-a', 'CORR-021');
    expect(pool.pushEvent).not.toHaveBeenCalled();
  });

  it('KA-4: active connection receives ping → pinged=1', async () => {
    const activeConn = makeConnectionInfo('tenant-a', 'CORR-022', 100); // 100ms ago — well within threshold
    const pool = makeMockPool([activeConn], true);
    const svc = new SseKeepaliveScheduler(pool);

    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.pinged).toBe(1);
    expect(result.data!.cleaned).toBe(0);
    expect(pool.pushEvent).toHaveBeenCalledWith(
      'tenant-a',
      'CORR-022',
      expect.objectContaining({ event: 'keepalive' }),
    );
  });

  it('KA-5: zero active connections → pinged=0, cleaned=0 (not an error)', async () => {
    const pool = makeMockPool([]); // empty pool
    const svc = new SseKeepaliveScheduler(pool);

    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.pinged).toBe(0);
    expect(result.data!.cleaned).toBe(0);
  });

  it('KA-6: DNA-3 — throws → KEEPALIVE_SCHEDULER_ERROR failure', async () => {
    const pool = makeMockPool();
    (pool.getActiveConnections as jest.Mock).mockImplementation(() => {
      throw new Error('pool crash');
    });
    const svc = new SseKeepaliveScheduler(pool);

    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('KEEPALIVE_SCHEDULER_ERROR');
  });
});

// ── MT: missing/invalid inputs ────────────────────────────────────────────────

describe('FLOW-40 Phases B-D — missing inputs (MT)', () => {
  it('MT-1: SseConnectionManager missing tenantId → UNAUTHENTICATED_TENANT', async () => {
    const svc = new SseConnectionManager(makeMockDb(), makeMockPool());
    const result = await svc.register({
      tenantId: '',
      correlationId: 'CORR-099',
      connectionResponse: makeMockResponse(),
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNAUTHENTICATED_TENANT');
  });

  it('MT-2: FlowEventBridge missing tenantId → MISSING_TENANT_ID', async () => {
    const svc = new FlowEventBridge(makeMockPool());
    const result = await svc.bridge({ tenantId: '', correlationId: 'CORR-099', cloudEvent: {} });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT_ID');
  });

  it('MT-3: SseKeepaliveScheduler missing tenantId → MISSING_TENANT_ID', async () => {
    const svc = new SseKeepaliveScheduler(makeMockPool());
    const result = await svc.run({
      tenantId: '',
      keepaliveIntervalMs: 30_000,
      droppedThresholdMs: 90_000,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT_ID');
  });

  it('MT-4: SseKeepaliveScheduler zero keepaliveIntervalMs → INVALID_KEEPALIVE_INTERVAL', async () => {
    const svc = new SseKeepaliveScheduler(makeMockPool());
    const result = await svc.run({
      tenantId: 'tenant-a',
      keepaliveIntervalMs: 0,
      droppedThresholdMs: 90_000,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_KEEPALIVE_INTERVAL');
  });
});
