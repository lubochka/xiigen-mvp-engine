/**
 * FLOW-37 Phase D — StackCompatibilityReporter (T592) Tests.
 *
 * 11 tests covering:
 *   AD-1: CF-799 — INCOMPATIBLE classification is detected synchronously
 *   AD-2: COMPATIBLE stack returns compatibility=COMPATIBLE
 *   AD-3: STACK_COUPLED stack returns compatibility=DEGRADED
 *   AD-4: stack not in audit → STACK_NOT_IN_AUDIT failure
 *   AD-5: INCOMPATIBLE → emits IncompatibleStackDetected (not CompatibilityReportReady)
 *   AD-6: COMPATIBLE → emits CompatibilityReportReady (not IncompatibleStackDetected)
 *   AD-7: reportId present in result
 *   AD-8: DNA-8 — storeDocument before enqueue
 *
 *   MT-1: missing taskTypeId → MISSING_REQUIRED_FIELDS failure
 *   MT-2: missing stackId → MISSING_REQUIRED_FIELDS failure
 *   MT-3: DNA-3 — throws internally → DataProcessResult.failure
 */

import 'reflect-metadata';
import { StackCompatibilityReporter } from '../../src/engine/flows/engine-self-awareness/stack-compatibility-reporter.service';
import type { CouplingClassification } from '../../src/engine/flows/engine-self-awareness/stack-coupling-auditor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

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

function makeMockQueue() {
  return {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-1')),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-1')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
  } as any;
}

function makeClassification(
  stackId: string,
  category: CouplingClassification['category'],
): CouplingClassification {
  const dims: Record<string, string> = {};
  for (const d of [
    'data_model',
    'event_schema',
    'api_surface',
    'state_management',
    'error_handling',
    'authentication',
    'tenant_isolation',
    'observability',
    'deployment_target',
    'runtime_model',
  ]) {
    dims[d] = category === 'INCOMPATIBLE' ? 'INCOMPATIBLE' : 'CONCEPT_NEUTRAL';
  }
  return { stackId, category, dimensions: dims as any };
}

beforeEach(() => jest.clearAllMocks());

describe('FLOW-37 Phase D — StackCompatibilityReporter', () => {
  it('AD-1: CF-799 — INCOMPATIBLE classification detected', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());

    const result = await svc.report({
      taskTypeId: 'T-020',
      stackId: 'stack-legacy',
      couplingClassifications: [makeClassification('stack-legacy', 'INCOMPATIBLE')],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.compatibility).toBe('INCOMPATIBLE');
  });

  it('AD-2: COMPATIBLE stack returns compatibility=COMPATIBLE', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());

    const result = await svc.report({
      taskTypeId: 'T-021',
      stackId: 'stack-react',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.compatibility).toBe('COMPATIBLE');
  });

  it('AD-3: STACK_COUPLED stack returns compatibility=DEGRADED', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());

    const result = await svc.report({
      taskTypeId: 'T-022',
      stackId: 'stack-angular',
      couplingClassifications: [makeClassification('stack-angular', 'STACK_COUPLED')],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.compatibility).toBe('DEGRADED');
  });

  it('AD-4: stack not in audit → STACK_NOT_IN_AUDIT failure', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());

    const result = await svc.report({
      taskTypeId: 'T-023',
      stackId: 'stack-unknown',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STACK_NOT_IN_AUDIT');
  });

  it('AD-5: INCOMPATIBLE → emits IncompatibleStackDetected, not CompatibilityReportReady', async () => {
    const queue = makeMockQueue();
    const svc = new StackCompatibilityReporter(makeMockDb(), queue);

    await svc.report({
      taskTypeId: 'T-024',
      stackId: 'stack-legacy',
      couplingClassifications: [makeClassification('stack-legacy', 'INCOMPATIBLE')],
    });

    expect(queue.enqueue).toHaveBeenCalledWith('IncompatibleStackDetected', expect.any(Object));
    const eventTypes = (queue.enqueue as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(eventTypes).not.toContain('CompatibilityReportReady');
  });

  it('AD-6: COMPATIBLE → emits CompatibilityReportReady, not IncompatibleStackDetected', async () => {
    const queue = makeMockQueue();
    const svc = new StackCompatibilityReporter(makeMockDb(), queue);

    await svc.report({
      taskTypeId: 'T-025',
      stackId: 'stack-react',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(queue.enqueue).toHaveBeenCalledWith('CompatibilityReportReady', expect.any(Object));
    const eventTypes = (queue.enqueue as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
    expect(eventTypes).not.toContain('IncompatibleStackDetected');
  });

  it('AD-7: reportId present in result', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());

    const result = await svc.report({
      taskTypeId: 'T-026',
      stackId: 'stack-vue',
      couplingClassifications: [makeClassification('stack-vue', 'IMPL_VARIES')],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.reportId).toBeTruthy();
    expect(result.data!.reportId).toContain('REPORT-');
  });

  it('AD-8: DNA-8 — storeDocument before enqueue', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCompatibilityReporter(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.report({
      taskTypeId: 'T-027',
      stackId: 'stack-react',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('MT-1: missing taskTypeId → MISSING_REQUIRED_FIELDS failure', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());
    const result = await svc.report({
      taskTypeId: '',
      stackId: 'stack-react',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('MT-2: missing stackId → MISSING_REQUIRED_FIELDS failure', async () => {
    const svc = new StackCompatibilityReporter(makeMockDb(), makeMockQueue());
    const result = await svc.report({
      taskTypeId: 'T-028',
      stackId: '',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_REQUIRED_FIELDS');
  });

  it('MT-3: DNA-3 — throws internally → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('crash'));
    const svc = new StackCompatibilityReporter(db, queue);

    const result = await svc.report({
      taskTypeId: 'T-029',
      stackId: 'stack-react',
      couplingClassifications: [makeClassification('stack-react', 'CONCEPT_NEUTRAL')],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('REPORTER_ERROR');
  });
});
