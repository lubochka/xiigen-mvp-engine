/**
 * StaticConflictDetector — Ordering Gate Tests (T377, IR-377-1).
 *
 * IR-377-1: Static detection MUST complete before T378 (AI semantic analysis).
 * These tests verify the service is synchronous/deterministic and produces
 * a complete report that can be used as an ordering gate.
 *
 * Tests:
 *   OG-1: detectConflicts is synchronous — returns DataProcessResult (not Promise<void>)
 *   OG-2: report always includes totalEvaluated matching node count
 *   OG-3: report always includes changeType and entityId fields
 *   OG-4: first-match-wins — earlier CF rule takes precedence for overlapping conditions
 *   OG-5: all nodes are evaluated — no early exit on first conflict
 *   OG-6: report structure is complete with all required fields
 */

import {
  StaticConflictDetector,
  ConflictVerdict,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';
import {
  DependencySeverity,
  DependencyNode,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';

function makeNode(overrides: Partial<DependencyNode> = {}): DependencyNode {
  return {
    nodeId: 'node-og',
    entityId: 'OrderingService',
    entityClass: 'service',
    accessType: 'read',
    dependsOn: 'OrderSchema',
    severity: DependencySeverity.MEDIUM,
    flowId: 'FLOW-01',
    taskType: 'T375',
    metadata: {},
    ...overrides,
  };
}

describe('StaticConflictDetector — Ordering Gate (IR-377-1)', () => {
  let detector: StaticConflictDetector;

  beforeEach(() => {
    detector = new StaticConflictDetector();
  });

  it('OG-1: detectConflicts returns DataProcessResult synchronously (no async needed)', () => {
    const node = makeNode();
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);
    // Must be a DataProcessResult — not a Promise
    expect(result).toBeDefined();
    expect(result.isSuccess).toBeDefined();
    expect(typeof (result as any).then).toBe('undefined');
  });

  it('OG-2: report always includes totalEvaluated matching node count', () => {
    const nodes = [
      makeNode({ nodeId: 'n1' }),
      makeNode({ nodeId: 'n2' }),
      makeNode({ nodeId: 'n3' }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);
    expect(result.data!.totalEvaluated).toBe(3);
    expect(result.data!.conflicts).toHaveLength(3);
  });

  it('OG-3: report always includes changeType and entityId fields', () => {
    const result = detector.detectConflicts('API_BREAK', 'SomeEntity', []);
    expect(result.data!.changeType).toBe('API_BREAK');
    expect(result.data!.entityId).toBe('SomeEntity');
  });

  it('OG-4: first-match-wins — CF-473 fires before CF-486 for SCHEMA_CHANGE + write + CRITICAL', () => {
    // SCHEMA_CHANGE + write + CRITICAL matches CF-473 first (before CF-486 which matches HIGH)
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    // CF-473 takes priority — not CF-486 (HIGH POTENTIAL)
    expect(conflict.cfRule).toBe('CF-473');
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
  });

  it('OG-5: all nodes are evaluated — no early exit on first conflict', () => {
    const nodes = [
      makeNode({ nodeId: 'n1', accessType: 'write', severity: DependencySeverity.CRITICAL }),
      makeNode({
        nodeId: 'n2',
        severity: DependencySeverity.LOW,
        accessType: 'read',
        entityClass: 'service',
      }),
      makeNode({ nodeId: 'n3', severity: DependencySeverity.HIGH, accessType: 'read' }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);

    // All 3 nodes must produce a conflict record
    expect(result.data!.conflicts).toHaveLength(3);
    expect(result.data!.totalEvaluated).toBe(3);

    const nodeIds = result.data!.conflicts.map((c) => c.nodeId);
    expect(nodeIds).toContain('n1');
    expect(nodeIds).toContain('n2');
    expect(nodeIds).toContain('n3');
  });

  it('OG-6: report structure has all required fields', () => {
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);
    const report = result.data!;

    expect(report).toHaveProperty('changeType');
    expect(report).toHaveProperty('entityId');
    expect(report).toHaveProperty('conflicts');
    expect(report).toHaveProperty('maxSeverity');
    expect(report).toHaveProperty('hasStaticCritical');
    expect(report).toHaveProperty('totalEvaluated');

    const conflict = report.conflicts[0];
    expect(conflict).toHaveProperty('nodeId');
    expect(conflict).toHaveProperty('entityId');
    expect(conflict).toHaveProperty('verdict');
    expect(conflict).toHaveProperty('cfRule');
    expect(conflict).toHaveProperty('severity');
    expect(conflict).toHaveProperty('reason');
    expect(conflict).toHaveProperty('overridesAi');
  });
});
