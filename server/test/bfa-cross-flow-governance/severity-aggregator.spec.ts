/**
 * SeverityAggregator — Unit Tests (T379).
 *
 * Tests:
 *   SA-1: returns isSuccess=true for valid inputs
 *   SA-2: report has status='pending_arbitration'
 *   SA-3: report includes reportId, changeType, entityId
 *   SA-4: missing staticReport returns failure
 *   SA-5: missing aiResult returns failure
 *   SA-6: storeDocument failure propagates as DataProcessResult.failure
 *   SA-7: empty node conflicts produces empty entries report
 *   SA-8: finalMaxSeverity is NONE when no conflicts
 *   SA-9: staticOverrideApplied=false when no static CRITICAL override
 */

import { SeverityAggregator } from '../../src/engine/flows/bfa-conflict-arbitration/severity-aggregator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import {
  StaticConflictReport,
  ConflictVerdict,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';
import { SemanticAnalysisResult } from '../../src/engine/flows/bfa-conflict-arbitration/semantic-impact-analyzer.service';

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Write failed')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

const EMPTY_STATIC: StaticConflictReport = {
  changeType: 'SCHEMA_CHANGE',
  entityId: 'OrderSchema',
  conflicts: [],
  maxSeverity: DependencySeverity.NONE,
  hasStaticCritical: false,
  totalEvaluated: 0,
};

const EMPTY_AI: SemanticAnalysisResult = {
  changeType: 'SCHEMA_CHANGE',
  entityId: 'OrderSchema',
  nodeResults: [],
  advisoryMaxSeverity: DependencySeverity.NONE,
  totalAnalyzed: 0,
  downgradedCount: 0,
  resultType: 'advisory',
};

const THRESHOLDS: Record<string, unknown> = { critical: 0.9, high: 0.7, medium: 0.5 };

describe('SeverityAggregator — Unit (T379)', () => {
  it('SA-1: returns isSuccess=true for valid inputs', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.isSuccess).toBe(true);
  });

  it("SA-2: report has status='pending_arbitration'", async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.data!.status).toBe('pending_arbitration');
  });

  it('SA-3: report includes reportId, changeType, entityId', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.data!.reportId).toBeTruthy();
    expect(result.data!.changeType).toBe('SCHEMA_CHANGE');
    expect(result.data!.entityId).toBe('OrderSchema');
  });

  it('SA-4: missing staticReport returns failure', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(null as any, EMPTY_AI, THRESHOLDS);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_STATIC_REPORT');
  });

  it('SA-5: missing aiResult returns failure', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, null as any, THRESHOLDS);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_AI_RESULT');
  });

  it('SA-6: storeDocument failure propagates as DataProcessResult.failure', async () => {
    const svc = new SeverityAggregator(makeFailingDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('SA-7: empty node conflicts produces report with empty entries', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.data!.entries).toHaveLength(0);
  });

  it('SA-8: finalMaxSeverity is NONE when no conflicts', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.data!.finalMaxSeverity).toBe(DependencySeverity.NONE);
  });

  it('SA-9: staticOverrideApplied=false when no static CRITICAL override', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(EMPTY_STATIC, EMPTY_AI, THRESHOLDS);
    expect(result.data!.staticOverrideApplied).toBe(false);
  });
});
