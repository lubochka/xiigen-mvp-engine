/**
 * FLOW-35 Phase B — SpendAndSecurity
 *
 * SK-402 SpendGovernorPattern: reads spend limit, accumulates cost, emits spend.limit.exceeded
 * SK-403 SecurityCircuitBreakerPattern: scans bundle code for credential/import violations
 */

import { SpendGovernorService } from '../../src/engine/flows/generation-loop/spend-governor.service';
import { SecurityCircuitBreakerService } from '../../src/engine/flows/generation-loop/security-circuit-breaker.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(docs: any[] = []) {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any) => {
      stored.push(doc);
      return DataProcessResult.success(doc);
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(docs)),
    _stored: stored,
  } as any;
}
function makeConfig(value: any) {
  return { getConfig: jest.fn(async () => DataProcessResult.success(value)) } as any;
}
function makeFailingConfig() {
  return {
    getConfig: jest.fn(async () => DataProcessResult.failure('CONFIG_ERROR', 'config unavailable')),
  } as any;
}

const SESSION = {
  sessionId: 'session-001',
  flowId: 'FLOW-01',
  accumulatedCostUsd: 0,
  roundCount: 0,
  startedAt: '2026-01-01T00:00:00Z',
};

describe('FLOW-35 Phase B — SpendAndSecurity', () => {
  describe('SK-402 SpendGovernorService', () => {
    it('F35B-1: CONTINUE when accumulated cost is below limit', async () => {
      const svc = new SpendGovernorService(makeDb(), makeConfig(10));
      const result = await svc.checkSpend({ ...SESSION, accumulatedCostUsd: 5 });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.verdict).toBe('CONTINUE');
    });

    it('F35B-2: HALT when accumulated cost equals limit', async () => {
      const db = makeDb();
      const svc = new SpendGovernorService(db, makeConfig(10));
      const result = await svc.checkSpend({ ...SESSION, accumulatedCostUsd: 10 });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.verdict).toBe('HALT');
    });

    it('F35B-3: HALT stores spend.limit.exceeded event (DNA-8)', async () => {
      const db = makeDb();
      const svc = new SpendGovernorService(db, makeConfig(5));
      await svc.checkSpend({ ...SESSION, accumulatedCostUsd: 6 });
      expect(db.storeDocument).toHaveBeenCalledWith(
        'spend-events',
        expect.objectContaining({ event: 'spend.limit.exceeded' }),
      );
    });

    it('F35B-4: HALT reason includes limit and actual cost', async () => {
      const svc = new SpendGovernorService(makeDb(), makeConfig(5));
      const result = await svc.checkSpend({ ...SESSION, accumulatedCostUsd: 7.5 });
      expect(result.data?.reason).toContain('$5');
      expect(result.data?.reason).toContain('$7.5');
    });

    it('F35B-5: config failure propagates as DataProcessResult failure', async () => {
      const svc = new SpendGovernorService(makeDb(), makeFailingConfig());
      const result = await svc.checkSpend(SESSION);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONFIG_ERROR');
    });

    it('F35B-6: recordRoundCost stores round cost and returns accumulated total', async () => {
      const db = makeDb([{ costUsd: 2 }, { costUsd: 3 }]);
      const svc = new SpendGovernorService(db, makeConfig(50));
      const result = await svc.recordRoundCost('session-001', 1.5);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(6.5); // 2 + 3 + 1.5
    });
  });

  describe('SK-403 SecurityCircuitBreakerService', () => {
    it('F35B-7: CONTINUE for clean code with no violations', async () => {
      const svc = new SecurityCircuitBreakerService(makeDb(), makeConfig([]));
      const result = await svc.scanBundle('const x = 1;', 'session-001');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.verdict).toBe('CONTINUE');
      expect(result.data?.violations).toHaveLength(0);
    });

    it('F35B-8: HALT on forbidden Elasticsearch SDK import (CF-790)', async () => {
      const db = makeDb();
      const svc = new SecurityCircuitBreakerService(db, makeConfig([]));
      const code = `import { Client } from '@elastic/elasticsearch'`;
      const result = await svc.scanBundle(code, 'session-001');
      expect(result.data?.verdict).toBe('HALT');
      expect(result.data?.violations.length).toBeGreaterThan(0);
    });

    it('F35B-9: HALT stores violation record before returning (DNA-8)', async () => {
      const db = makeDb();
      const svc = new SecurityCircuitBreakerService(db, makeConfig([]));
      await svc.scanBundle(`const SECRET = 'my-secret-key-here'`, 'session-002');
      expect(db.storeDocument).toHaveBeenCalledWith(
        'security-violations',
        expect.objectContaining({ sessionId: 'session-002' }),
      );
    });

    it('F35B-10: HALT on FREEDOM-config custom forbidden import', async () => {
      const svc = new SecurityCircuitBreakerService(makeDb(), makeConfig(['some-forbidden-lib']));
      const result = await svc.scanBundle(`import x from 'some-forbidden-lib'`, 'session-003');
      expect(result.data?.verdict).toBe('HALT');
      expect(result.data?.violations[0]).toContain('some-forbidden-lib');
    });
  });
});
