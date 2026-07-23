/**
 * SemanticImpactAnalyzer — Unit Tests (T378).
 *
 * Tests:
 *   A-1: returns isSuccess=true for valid inputs
 *   A-2: returned result has resultType='advisory' (IR-378-2)
 *   A-3: node result has isAdvisory=true on every entry
 *   A-4: totalAnalyzed matches node count
 *   A-5: missing changeType returns failure
 *   A-6: missing entityId returns failure
 *   A-7: missing staticReport returns failure (IR-378-1)
 *   A-8: AI failure on a node is non-fatal (result uses NONE severity)
 *   A-9: storeDocument called once per analyzeImpact call
 *   A-10: empty nodes returns empty result with NONE advisoryMaxSeverity
 */

import { SemanticImpactAnalyzer } from '../../src/engine/flows/bfa-conflict-arbitration/semantic-impact-analyzer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  DependencySeverity,
  DependencyNode,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import {
  StaticConflictReport,
  ConflictVerdict,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';

function makeAi(
  responseJson: Record<string, unknown> = {
    severity: 'MEDIUM',
    confidence: 0.8,
    evidence_doc_ids: [],
    reasoning: 'test',
  },
) {
  return {
    // IAiProvider.generate() returns { text, model, tokens_used, cost }
    generate: jest.fn(async () =>
      DataProcessResult.success({ text: JSON.stringify(responseJson) }),
    ),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_UNAVAILABLE', 'AI service down')),
  } as any;
}

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeNode(overrides: Partial<DependencyNode> = {}): DependencyNode {
  return {
    nodeId: 'node-1',
    entityId: 'ServiceA',
    entityClass: 'service',
    accessType: 'write',
    dependsOn: 'OrderSchema',
    severity: DependencySeverity.MEDIUM,
    flowId: 'FLOW-01',
    taskType: 'T375',
    metadata: {},
    ...overrides,
  };
}

function makeStaticReport(): StaticConflictReport {
  return {
    changeType: 'SCHEMA_CHANGE',
    entityId: 'OrderSchema',
    conflicts: [],
    maxSeverity: DependencySeverity.NONE,
    hasStaticCritical: false,
    totalEvaluated: 0,
  };
}

describe('SemanticImpactAnalyzer — Unit (T378)', () => {
  it('A-1: returns isSuccess=true for valid inputs', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );
    expect(result.isSuccess).toBe(true);
  });

  it('A-2: returned result has resultType="advisory" (IR-378-2)', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );
    expect(result.data!.resultType).toBe('advisory');
  });

  it('A-3: every node result has isAdvisory=true', async () => {
    const nodes = [makeNode({ nodeId: 'n1' }), makeNode({ nodeId: 'n2' })];
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      nodes,
      makeStaticReport(),
    );
    for (const nr of result.data!.nodeResults) {
      expect(nr.isAdvisory).toBe(true);
    }
  });

  it('A-4: totalAnalyzed matches node count', async () => {
    const nodes = [
      makeNode({ nodeId: 'n1' }),
      makeNode({ nodeId: 'n2' }),
      makeNode({ nodeId: 'n3' }),
    ];
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact('API_BREAK', 'OrderSchema', nodes, makeStaticReport());
    expect(result.data!.totalAnalyzed).toBe(3);
  });

  it('A-5: missing changeType returns failure', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact('', 'OrderSchema', [], makeStaticReport());
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_CHANGE_TYPE');
  });

  it('A-6: missing entityId returns failure', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact('SCHEMA_CHANGE', '', [], makeStaticReport());
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ENTITY_ID');
  });

  it('A-7: missing staticReport returns failure (IR-378-1)', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact('SCHEMA_CHANGE', 'OrderSchema', [], null as any);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STATIC_REPORT_REQUIRED');
    expect(result.errorMessage).toContain('IR-378-1');
  });

  it('A-8: AI failure on a node is non-fatal — node gets NONE severity', async () => {
    const svc = new SemanticImpactAnalyzer(makeFailingAi(), makeDb());
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.NONE);
    expect(result.data!.nodeResults[0].isAdvisory).toBe(true);
  });

  it('A-9: storeDocument called once per analyzeImpact call', async () => {
    const db = makeDb();
    const svc = new SemanticImpactAnalyzer(makeAi(), db);
    await svc.analyzeImpact('SCHEMA_CHANGE', 'OrderSchema', [makeNode()], makeStaticReport());
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('A-10: empty nodes returns empty result with NONE advisoryMaxSeverity', async () => {
    const svc = new SemanticImpactAnalyzer(makeAi(), makeDb());
    const result = await svc.analyzeImpact('SCHEMA_CHANGE', 'OrderSchema', [], makeStaticReport());
    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodeResults).toHaveLength(0);
    expect(result.data!.advisoryMaxSeverity).toBe(DependencySeverity.NONE);
    expect(result.data!.totalAnalyzed).toBe(0);
  });
});
