/**
 * SemanticImpactAnalyzer — CF-481 Downgrade Tests (T378).
 *
 * CF-481: AI HIGH/CRITICAL WITHOUT evidence_links MUST be downgraded to LOW.
 * AI HIGH/CRITICAL WITH evidence_links is kept as-is.
 *
 * Tests:
 *   DG-1: AI HIGH without evidence_links → downgraded to LOW (CF-481)
 *   DG-2: AI CRITICAL without evidence_links → downgraded to LOW (CF-481)
 *   DG-3: AI HIGH WITH evidence_links → kept as HIGH (CF-481 does not apply)
 *   DG-4: AI CRITICAL WITH evidence_links → kept as CRITICAL (CF-481 does not apply)
 *   DG-5: AI MEDIUM without evidence_links → NOT downgraded (CF-481 only applies to HIGH/CRITICAL)
 *   DG-6: AI LOW without evidence_links → NOT downgraded
 *   DG-7: wasDowngraded=true when CF-481 applied
 *   DG-8: wasDowngraded=false when CF-481 not applied
 *   DG-9: downgradedCount reflects number of downgraded nodes
 *   DG-10: rawSeverity preserves original AI value after downgrade
 */

import { SemanticImpactAnalyzer } from '../../src/engine/flows/bfa-conflict-arbitration/semantic-impact-analyzer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  DependencySeverity,
  DependencyNode,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { StaticConflictReport } from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';

const FAKE_DOC_ID = 'evidence-doc-001';

function makeAiWithSeverity(severity: string, evidenceDocIds: string[] = []) {
  return {
    // IAiProvider.generate() returns { text, model, tokens_used, cost }
    generate: jest.fn(async () =>
      DataProcessResult.success({
        text: JSON.stringify({
          severity,
          confidence: 0.9,
          evidence_doc_ids: evidenceDocIds,
          reasoning: `AI assessed ${severity}`,
        }),
      }),
    ),
  } as any;
}

function makeDbWithEvidence(evidenceExists: boolean) {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      // Return the evidence doc if it exists
      if (evidenceExists && filters['_id'] === FAKE_DOC_ID) {
        return DataProcessResult.success([
          { _id: FAKE_DOC_ID, excerpt: 'test evidence', relevance_score: 0.9 },
        ]);
      }
      return DataProcessResult.success([]);
    }),
  } as any;
}

function makeNode(id = 'node-1'): DependencyNode {
  return {
    nodeId: id,
    entityId: 'ServiceA',
    entityClass: 'service',
    accessType: 'write',
    dependsOn: 'OrderSchema',
    severity: DependencySeverity.HIGH,
    flowId: 'FLOW-01',
    taskType: 'T377',
    metadata: {},
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

describe('SemanticImpactAnalyzer — CF-481 Downgrade (T378)', () => {
  it('DG-1: AI HIGH without evidence_links → downgraded to LOW (CF-481)', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('HIGH', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.LOW);
  });

  it('DG-2: AI CRITICAL without evidence_links → downgraded to LOW (CF-481)', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('CRITICAL', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.LOW);
  });

  it('DG-3: AI HIGH WITH evidence_links → kept as HIGH (CF-481 does not apply)', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('HIGH', [FAKE_DOC_ID]),
      makeDbWithEvidence(true),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.HIGH);
    expect(result.data!.nodeResults[0].wasDowngraded).toBe(false);
  });

  it('DG-4: AI CRITICAL WITH evidence_links → kept as CRITICAL (CF-481 does not apply)', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('CRITICAL', [FAKE_DOC_ID]),
      makeDbWithEvidence(true),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.CRITICAL);
    expect(result.data!.nodeResults[0].wasDowngraded).toBe(false);
  });

  it('DG-5: AI MEDIUM without evidence_links → NOT downgraded (CF-481 only HIGH/CRITICAL)', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('MEDIUM', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.MEDIUM);
    expect(result.data!.nodeResults[0].wasDowngraded).toBe(false);
  });

  it('DG-6: AI LOW without evidence_links → NOT downgraded', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('LOW', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].severity).toBe(DependencySeverity.LOW);
    expect(result.data!.nodeResults[0].wasDowngraded).toBe(false);
  });

  it('DG-7: wasDowngraded=true when CF-481 applied', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('HIGH', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].wasDowngraded).toBe(true);
  });

  it('DG-8: wasDowngraded=false when CF-481 not applied', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('MEDIUM', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    expect(result.data!.nodeResults[0].wasDowngraded).toBe(false);
  });

  it('DG-9: downgradedCount reflects number of downgraded nodes', async () => {
    const nodes = [makeNode('n1'), makeNode('n2'), makeNode('n3')];
    // All HIGH without evidence → all downgraded
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('HIGH', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      nodes,
      makeStaticReport(),
    );

    expect(result.data!.downgradedCount).toBe(3);
  });

  it('DG-10: rawSeverity preserves original AI value after downgrade', async () => {
    const svc = new SemanticImpactAnalyzer(
      makeAiWithSeverity('CRITICAL', []),
      makeDbWithEvidence(false),
    );
    const result = await svc.analyzeImpact(
      'SCHEMA_CHANGE',
      'OrderSchema',
      [makeNode()],
      makeStaticReport(),
    );

    const nodeResult = result.data!.nodeResults[0];
    expect(nodeResult.rawSeverity).toBe(DependencySeverity.CRITICAL);
    expect(nodeResult.severity).toBe(DependencySeverity.LOW); // downgraded
    expect(nodeResult.wasDowngraded).toBe(true);
  });
});
