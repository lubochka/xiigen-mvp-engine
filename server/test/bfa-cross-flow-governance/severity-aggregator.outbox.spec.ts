/**
 * SeverityAggregator — Outbox Pattern Tests (T379, DNA-8, IR-379-1).
 *
 * CRITICAL: storeDocument() MUST be called BEFORE enqueue() on every path.
 *
 * Tests:
 *   OB-1: storeDocument is called BEFORE enqueue (call order verified)
 *   OB-2: enqueue is NOT called if storeDocument fails
 *   OB-3: storeDocument failure propagates — no enqueue
 *   OB-4: enqueue payload includes report_id, change_type, entity_id, final_max_severity
 *   OB-5: enqueue event type is 'conflict.severity.resolved'
 */

import { SeverityAggregator } from '../../src/engine/flows/bfa-conflict-arbitration/severity-aggregator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import {
  StaticConflictReport,
  ConflictVerdict,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';
import { SemanticAnalysisResult } from '../../src/engine/flows/bfa-conflict-arbitration/semantic-impact-analyzer.service';

const STATIC: StaticConflictReport = {
  changeType: 'API_BREAK',
  entityId: 'PaymentService',
  conflicts: [],
  maxSeverity: DependencySeverity.NONE,
  hasStaticCritical: false,
  totalEvaluated: 0,
};

const AI: SemanticAnalysisResult = {
  changeType: 'API_BREAK',
  entityId: 'PaymentService',
  nodeResults: [],
  advisoryMaxSeverity: DependencySeverity.NONE,
  totalAnalyzed: 0,
  downgradedCount: 0,
  resultType: 'advisory',
};

const THRESHOLDS = {};

describe('SeverityAggregator — Outbox Pattern (DNA-8, IR-379-1)', () => {
  it('OB-1: storeDocument is called BEFORE enqueue — call order verified', async () => {
    const callOrder: string[] = [];

    const db: any = {
      storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
      }),
    };

    const queue: any = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new SeverityAggregator(db, queue);
    await svc.aggregateSeverity(STATIC, AI, THRESHOLDS);

    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('OB-2: enqueue is NOT called if storeDocument fails', async () => {
    const db: any = {
      storeDocument: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Storage failed')),
    };
    const queue: any = {
      enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
    };

    const svc = new SeverityAggregator(db, queue);
    const result = await svc.aggregateSeverity(STATIC, AI, THRESHOLDS);

    expect(result.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('OB-3: storeDocument failure propagates — errorCode forwarded', async () => {
    const db: any = {
      storeDocument: jest.fn(async () =>
        DataProcessResult.failure('STORAGE_UNAVAILABLE', 'ES unreachable'),
      ),
    };
    const queue: any = {
      enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
    };

    const svc = new SeverityAggregator(db, queue);
    const result = await svc.aggregateSeverity(STATIC, AI, THRESHOLDS);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORAGE_UNAVAILABLE');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('OB-4: enqueue payload includes report_id, change_type, entity_id, final_max_severity', async () => {
    const emitted: any[] = [];
    const db: any = {
      storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
      ),
    };
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new SeverityAggregator(db, queue);
    const result = await svc.aggregateSeverity(STATIC, AI, THRESHOLDS);

    expect(emitted).toHaveLength(1);
    const payload = emitted[0].data;
    expect(payload).toHaveProperty('report_id', result.data!.reportId);
    expect(payload).toHaveProperty('change_type', 'API_BREAK');
    expect(payload).toHaveProperty('entity_id', 'PaymentService');
    expect(payload).toHaveProperty('final_max_severity');
  });

  it("OB-5: enqueue event type is 'conflict.severity.resolved'", async () => {
    const emitted: any[] = [];
    const db: any = {
      storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
      ),
    };
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new SeverityAggregator(db, queue);
    await svc.aggregateSeverity(STATIC, AI, THRESHOLDS);

    expect(emitted[0].evt).toBe('conflict.severity.resolved');
  });
});
