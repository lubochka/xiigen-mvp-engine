/**
 * FLOW-40 Phase A — InMemorySseConnectionPool multi-tenant isolation tests
 *
 * MT-1: tenant A connection → push to tenant A → received (happy path)
 * MT-2: tenant A connection → push to tenant B same correlationId → NOT received (CF-798)
 * MT-3: tenant A and B share correlationId → push to A → B receives nothing
 * MT-4: pushEvent without prior registerConnection returns false (DNA-3: no throw)
 * MT-5: closeConnection removes from pool — subsequent push returns false
 * MT-6: getActiveConnections(tenantA) does not include tenantB connections
 * MT-7: pushEvent is idempotent on unknown correlationId (returns false, no throw)
 * MT-8: registerConnection with same tenantId+correlationId twice: idempotent (no error)
 */

import 'reflect-metadata';
import { InMemorySseConnectionPool } from '../../src/fabrics/providers/in-memory-sse-connection-pool';
import { SseEvent } from '../../src/fabrics/interfaces/sse-connection-pool.interface';

const TENANT_A = 'tenant-alpha-flow40';
const TENANT_B = 'tenant-beta-flow40';
const CORR_ID = 'corr-id-shared-001';

function makeMockResponse() {
  const written: string[] = [];
  let ended = false;
  return {
    write: jest.fn((chunk: string) => {
      written.push(chunk);
    }),
    end: jest.fn(() => {
      ended = true;
    }),
    written,
    get ended() {
      return ended;
    },
  };
}

const testEvent: SseEvent = {
  event: 'node.complete',
  data: { stepText: 'Validate email uniqueness', grade: 0.9 },
  id: 'evt-001',
};

describe('FLOW-40 Phase A — InMemorySseConnectionPool', () => {
  it('MT-1: tenant A connection → pushEvent to tenant A → event delivered', () => {
    const pool = new InMemorySseConnectionPool();
    const res = makeMockResponse();

    pool.registerConnection(TENANT_A, CORR_ID, res as any);
    const delivered = pool.pushEvent(TENANT_A, CORR_ID, testEvent);

    expect(delivered).toBe(true);
    expect(res.write).toHaveBeenCalledTimes(1);
    const payload = res.written[0];
    expect(payload).toContain('event: node.complete');
    expect(payload).toContain('Validate email uniqueness');
  });

  it('MT-2: [CF-798] push to tenant B same correlationId → NOT delivered when only tenant A registered', () => {
    const pool = new InMemorySseConnectionPool();
    const resA = makeMockResponse();

    pool.registerConnection(TENANT_A, CORR_ID, resA as any);
    // Attempt delivery scoped to TENANT_B — tenant B has no connection registered
    const delivered = pool.pushEvent(TENANT_B, CORR_ID, testEvent);

    expect(delivered).toBe(false);
    expect(resA.write).not.toHaveBeenCalled();
  });

  it('MT-3: tenant A and B share correlationId → push to A → B connection receives nothing', () => {
    const pool = new InMemorySseConnectionPool();
    const resA = makeMockResponse();
    const resB = makeMockResponse();

    pool.registerConnection(TENANT_A, CORR_ID, resA as any);
    pool.registerConnection(TENANT_B, CORR_ID, resB as any);

    pool.pushEvent(TENANT_A, CORR_ID, testEvent);

    expect(resA.write).toHaveBeenCalledTimes(1);
    expect(resB.write).not.toHaveBeenCalled();
  });

  it('MT-4: pushEvent without prior registerConnection returns false (DNA-3: no throw)', () => {
    const pool = new InMemorySseConnectionPool();

    let result: boolean | undefined;
    expect(() => {
      result = pool.pushEvent(TENANT_A, 'never-registered-corr', testEvent);
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it('MT-5: closeConnection removes from pool — subsequent push returns false', () => {
    const pool = new InMemorySseConnectionPool();
    const res = makeMockResponse();

    pool.registerConnection(TENANT_A, CORR_ID, res as any);
    pool.closeConnection(TENANT_A, CORR_ID);

    const delivered = pool.pushEvent(TENANT_A, CORR_ID, testEvent);
    expect(delivered).toBe(false);
  });

  it('MT-6: getActiveConnections(tenantA) does not include tenantB connections', () => {
    const pool = new InMemorySseConnectionPool();
    const resA = makeMockResponse();
    const resB = makeMockResponse();

    pool.registerConnection(TENANT_A, 'corr-a-001', resA as any);
    pool.registerConnection(TENANT_B, 'corr-b-001', resB as any);

    const conns = pool.getActiveConnections(TENANT_A);

    expect(conns).toHaveLength(1);
    expect(conns[0].tenantId).toBe(TENANT_A);
    expect(conns[0].correlationId).toBe('corr-a-001');
    expect(conns.some((c) => c.tenantId === TENANT_B)).toBe(false);
  });

  it('MT-7: pushEvent on unknown correlationId returns false without throwing', () => {
    const pool = new InMemorySseConnectionPool();

    let result: boolean | undefined;
    expect(() => {
      result = pool.pushEvent('nonexistent-tenant', 'nonexistent-corr', testEvent);
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it('MT-8: registerConnection with same tenantId+correlationId twice: idempotent (no error)', () => {
    const pool = new InMemorySseConnectionPool();
    const res1 = makeMockResponse();
    const res2 = makeMockResponse();

    expect(() => {
      pool.registerConnection(TENANT_A, CORR_ID, res1 as any);
      pool.registerConnection(TENANT_A, CORR_ID, res2 as any);
    }).not.toThrow();

    // Second registration replaces the first — push goes to res2
    const delivered = pool.pushEvent(TENANT_A, CORR_ID, testEvent);
    expect(delivered).toBe(true);
    expect(res2.write).toHaveBeenCalledTimes(1);
    expect(res1.write).not.toHaveBeenCalled();
  });
});
