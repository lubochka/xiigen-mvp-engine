/**
 * SeverityAggregator — Aggregation Logic Tests (T379, IR-379-2).
 *
 * IR-379-2: Static CRITICAL always overrides AI advisory — no exceptions.
 *
 * Tests:
 *   AG-1: static CRITICAL → final CRITICAL (IR-379-2 override)
 *   AG-2: static CRITICAL overrides AI LOW → final CRITICAL + staticOverrodeAi=true
 *   AG-3: static HIGH + AI CRITICAL → final CRITICAL (AI wins non-CRITICAL static)
 *   AG-4: static TRUE_CONFLICT + AI MEDIUM → takes highest severity
 *   AG-5: static NO_CONFLICT + AI HIGH → AI advisory used
 *   AG-6: static POTENTIAL + AI NONE → static POTENTIAL severity kept
 *   AG-7: staticOverrideApplied=true when any entry had static CRITICAL override
 *   AG-8: staticOverrideApplied=false when no static CRITICAL override applied
 *   AG-9: multiple entries — finalMaxSeverity = highest across all entries
 */

import { SeverityAggregator } from '../../src/engine/flows/bfa-conflict-arbitration/severity-aggregator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import {
  StaticConflictReport,
  ConflictVerdict,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';
import {
  SemanticAnalysisResult,
  SemanticNodeResult,
} from '../../src/engine/flows/bfa-conflict-arbitration/semantic-impact-analyzer.service';

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
  } as any;
}

function makeQueue() {
  return {
    enqueue: jest.fn(async () => DataProcessResult.success('msg-1')),
  } as any;
}

function makeStatic(
  verdict: ConflictVerdict,
  severity: DependencySeverity,
  nodeId = 'node-1',
): StaticConflictReport {
  return {
    changeType: 'SCHEMA_CHANGE',
    entityId: 'OrderSchema',
    conflicts: [
      {
        nodeId,
        entityId: 'ServiceA',
        verdict,
        cfRule: verdict === ConflictVerdict.TRUE_CONFLICT ? 'CF-473' : '',
        severity,
        reason: 'test',
        overridesAi:
          verdict === ConflictVerdict.TRUE_CONFLICT && severity === DependencySeverity.CRITICAL,
      },
    ],
    maxSeverity: severity,
    hasStaticCritical:
      verdict === ConflictVerdict.TRUE_CONFLICT && severity === DependencySeverity.CRITICAL,
    totalEvaluated: 1,
  };
}

function makeAi(aiSeverity: DependencySeverity, nodeId = 'node-1'): SemanticAnalysisResult {
  const nodeResult: SemanticNodeResult = {
    nodeId,
    entityId: 'ServiceA',
    rawSeverity: aiSeverity,
    severity: aiSeverity,
    confidenceScore: 0.8,
    evidenceLinks: [],
    wasDowngraded: false,
    reasoning: 'AI test',
    isAdvisory: true,
  };
  return {
    changeType: 'SCHEMA_CHANGE',
    entityId: 'OrderSchema',
    nodeResults: [nodeResult],
    advisoryMaxSeverity: aiSeverity,
    totalAnalyzed: 1,
    downgradedCount: 0,
    resultType: 'advisory',
  };
}

const THRESHOLDS = {};

describe('SeverityAggregator — Aggregation Logic (IR-379-2)', () => {
  it('AG-1: static CRITICAL → final CRITICAL (IR-379-2 override)', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.TRUE_CONFLICT, DependencySeverity.CRITICAL),
      makeAi(DependencySeverity.CRITICAL),
      THRESHOLDS,
    );
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.CRITICAL);
  });

  it('AG-2: static CRITICAL overrides AI LOW → final CRITICAL + staticOverrodeAi=true', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.TRUE_CONFLICT, DependencySeverity.CRITICAL),
      makeAi(DependencySeverity.LOW),
      THRESHOLDS,
    );
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.CRITICAL);
    expect(result.data!.entries[0].staticOverrodeAi).toBe(true);
  });

  it('AG-3: static HIGH + AI CRITICAL → final CRITICAL (AI wins over non-CRITICAL static)', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.TRUE_CONFLICT, DependencySeverity.HIGH),
      makeAi(DependencySeverity.CRITICAL),
      THRESHOLDS,
    );
    // static is HIGH (TRUE_CONFLICT) → take max(HIGH, CRITICAL) = CRITICAL
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.CRITICAL);
  });

  it('AG-4: static TRUE_CONFLICT HIGH + AI MEDIUM → HIGH (static wins)', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.TRUE_CONFLICT, DependencySeverity.HIGH),
      makeAi(DependencySeverity.MEDIUM),
      THRESHOLDS,
    );
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.HIGH);
  });

  it('AG-5: static NO_CONFLICT + AI HIGH → AI advisory used', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.NO_CONFLICT, DependencySeverity.NONE),
      makeAi(DependencySeverity.HIGH),
      THRESHOLDS,
    );
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.HIGH);
  });

  it('AG-6: static POTENTIAL + AI NONE → static POTENTIAL HIGH severity kept', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.POTENTIAL, DependencySeverity.HIGH),
      makeAi(DependencySeverity.NONE),
      THRESHOLDS,
    );
    expect(result.data!.entries[0].finalSeverity).toBe(DependencySeverity.HIGH);
  });

  it('AG-7: staticOverrideApplied=true when any entry had static CRITICAL override', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.TRUE_CONFLICT, DependencySeverity.CRITICAL),
      makeAi(DependencySeverity.LOW),
      THRESHOLDS,
    );
    expect(result.data!.staticOverrideApplied).toBe(true);
  });

  it('AG-8: staticOverrideApplied=false when no static CRITICAL override', async () => {
    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(
      makeStatic(ConflictVerdict.POTENTIAL, DependencySeverity.HIGH),
      makeAi(DependencySeverity.MEDIUM),
      THRESHOLDS,
    );
    expect(result.data!.staticOverrideApplied).toBe(false);
  });

  it('AG-9: multiple entries — finalMaxSeverity = highest across all entries', async () => {
    const staticReport: StaticConflictReport = {
      changeType: 'SCHEMA_CHANGE',
      entityId: 'OrderSchema',
      conflicts: [
        {
          nodeId: 'n1',
          entityId: 'S1',
          verdict: ConflictVerdict.NO_CONFLICT,
          cfRule: '',
          severity: DependencySeverity.NONE,
          reason: 'ok',
          overridesAi: false,
        },
        {
          nodeId: 'n2',
          entityId: 'S2',
          verdict: ConflictVerdict.TRUE_CONFLICT,
          cfRule: 'CF-473',
          severity: DependencySeverity.CRITICAL,
          reason: 'conflict',
          overridesAi: true,
        },
        {
          nodeId: 'n3',
          entityId: 'S3',
          verdict: ConflictVerdict.POTENTIAL,
          cfRule: 'CF-486',
          severity: DependencySeverity.HIGH,
          reason: 'potential',
          overridesAi: false,
        },
      ],
      maxSeverity: DependencySeverity.CRITICAL,
      hasStaticCritical: true,
      totalEvaluated: 3,
    };

    const aiResult: SemanticAnalysisResult = {
      changeType: 'SCHEMA_CHANGE',
      entityId: 'OrderSchema',
      nodeResults: [
        {
          nodeId: 'n1',
          entityId: 'S1',
          rawSeverity: DependencySeverity.LOW,
          severity: DependencySeverity.LOW,
          confidenceScore: 0.5,
          evidenceLinks: [],
          wasDowngraded: false,
          reasoning: '',
          isAdvisory: true,
        },
        {
          nodeId: 'n2',
          entityId: 'S2',
          rawSeverity: DependencySeverity.LOW,
          severity: DependencySeverity.LOW,
          confidenceScore: 0.5,
          evidenceLinks: [],
          wasDowngraded: false,
          reasoning: '',
          isAdvisory: true,
        },
        {
          nodeId: 'n3',
          entityId: 'S3',
          rawSeverity: DependencySeverity.MEDIUM,
          severity: DependencySeverity.MEDIUM,
          confidenceScore: 0.6,
          evidenceLinks: [],
          wasDowngraded: false,
          reasoning: '',
          isAdvisory: true,
        },
      ],
      advisoryMaxSeverity: DependencySeverity.MEDIUM,
      totalAnalyzed: 3,
      downgradedCount: 0,
      resultType: 'advisory',
    };

    const svc = new SeverityAggregator(makeDb(), makeQueue());
    const result = await svc.aggregateSeverity(staticReport, aiResult, THRESHOLDS);

    expect(result.data!.finalMaxSeverity).toBe(DependencySeverity.CRITICAL);
    expect(result.data!.entries).toHaveLength(3);
  });
});
