/**
 * StaticConflictDetector — CF Citation Tests (IR-377-3, CF-479).
 *
 * CRITICAL: Every TRUE_CONFLICT MUST cite a specific CF rule.
 * An uncited TRUE_CONFLICT is a protocol violation that fails BFA arbitration.
 *
 * Tests:
 *   CC-1: every TRUE_CONFLICT has a non-empty cfRule field
 *   CC-2: NO_CONFLICT records have empty cfRule (no false citation)
 *   CC-3: validateCfCitations passes for a compliant report
 *   CC-4: validateCfCitations fails when a TRUE_CONFLICT lacks cfRule
 *   CC-5: cfRule values match known CF rule identifiers
 *   CC-6: multiple nodes — all TRUE_CONFLICTs must have cfRule
 *   CC-7: POTENTIAL conflicts may cite a cfRule (non-empty acceptable)
 */

import {
  StaticConflictDetector,
  ConflictVerdict,
  ConflictRecord,
  StaticConflictReport,
} from '../../src/engine/flows/bfa-conflict-arbitration/static-conflict-detector.service';
import {
  DependencySeverity,
  DependencyNode,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';

function makeNode(overrides: Partial<DependencyNode> = {}): DependencyNode {
  return {
    nodeId: 'node-test',
    entityId: 'TestService',
    entityClass: 'service',
    accessType: 'write',
    dependsOn: 'OrderSchema',
    severity: DependencySeverity.CRITICAL,
    flowId: 'FLOW-01',
    taskType: 'T375',
    metadata: {},
    ...overrides,
  };
}

/** Build a synthetic report for validateCfCitations tests. */
function makeSyntheticReport(conflicts: ConflictRecord[]): StaticConflictReport {
  return {
    changeType: 'SCHEMA_CHANGE',
    entityId: 'OrderSchema',
    conflicts,
    maxSeverity: DependencySeverity.CRITICAL,
    hasStaticCritical: true,
    totalEvaluated: conflicts.length,
  };
}

const KNOWN_CF_RULES = ['CF-473', 'CF-476', 'CF-479', 'CF-485', 'CF-486', 'CF-488'];

describe('StaticConflictDetector — CF-479 Citation Enforcement (IR-377-3)', () => {
  let detector: StaticConflictDetector;

  beforeEach(() => {
    detector = new StaticConflictDetector();
  });

  it('CC-1: every TRUE_CONFLICT has a non-empty cfRule field', () => {
    const nodes = [
      makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL }),
      makeNode({ nodeId: 'node-2', entityClass: 'shared-entity' }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);

    const trueConflicts = result.data!.conflicts.filter(
      (c) => c.verdict === ConflictVerdict.TRUE_CONFLICT,
    );
    expect(trueConflicts.length).toBeGreaterThan(0);
    for (const tc of trueConflicts) {
      expect(tc.cfRule).toBeTruthy();
      expect(tc.cfRule.trim()).not.toBe('');
    }
  });

  it('CC-2: NO_CONFLICT records have empty cfRule (no false citation)', () => {
    // A LOW-severity node with read access and DEPENDENCY_UPDATE shouldn't match any rule → NO_CONFLICT
    const node = makeNode({
      severity: DependencySeverity.LOW,
      accessType: 'read',
      entityClass: 'service',
    });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    const noConflicts = result.data!.conflicts.filter(
      (c) => c.verdict === ConflictVerdict.NO_CONFLICT,
    );
    for (const nc of noConflicts) {
      expect(nc.cfRule).toBe('');
    }
  });

  it('CC-3: validateCfCitations passes for a compliant report', () => {
    const validConflict: ConflictRecord = {
      nodeId: 'node-1',
      entityId: 'ServiceA',
      verdict: ConflictVerdict.TRUE_CONFLICT,
      cfRule: 'CF-473',
      severity: DependencySeverity.CRITICAL,
      reason: 'Schema change conflicts',
      overridesAi: true,
    };
    const report = makeSyntheticReport([validConflict]);
    const validation = detector.validateCfCitations(report);
    expect(validation.isSuccess).toBe(true);
  });

  it('CC-4: validateCfCitations fails when a TRUE_CONFLICT lacks cfRule', () => {
    const invalidConflict: ConflictRecord = {
      nodeId: 'node-bad',
      entityId: 'ServiceB',
      verdict: ConflictVerdict.TRUE_CONFLICT,
      cfRule: '', // ← violation of CF-479
      severity: DependencySeverity.HIGH,
      reason: 'Some reason',
      overridesAi: false,
    };
    const report = makeSyntheticReport([invalidConflict]);
    const validation = detector.validateCfCitations(report);
    expect(validation.isSuccess).toBe(false);
    expect(validation.errorCode).toBe('CF_CITATION_MISSING');
    expect(validation.errorMessage).toContain('CF-479');
    expect(validation.errorMessage).toContain('node-bad');
  });

  it('CC-5: cfRule values match known CF rule identifiers', () => {
    const nodes = [
      makeNode({ nodeId: 'n1', accessType: 'write', severity: DependencySeverity.CRITICAL }),
      makeNode({ nodeId: 'n2', entityClass: 'shared-entity', severity: DependencySeverity.MEDIUM }),
      makeNode({ nodeId: 'n3', accessType: 'write', severity: DependencySeverity.MEDIUM }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);

    const citedRules = result.data!.conflicts.filter((c) => c.cfRule !== '').map((c) => c.cfRule);

    for (const rule of citedRules) {
      expect(KNOWN_CF_RULES).toContain(rule);
    }
  });

  it('CC-6: multiple nodes — all TRUE_CONFLICTs have non-empty cfRule', () => {
    const nodes = [
      makeNode({ nodeId: 'n1', accessType: 'write', severity: DependencySeverity.CRITICAL }),
      makeNode({ nodeId: 'n2', severity: DependencySeverity.CRITICAL }), // DEPENDENCY_UPDATE + CRITICAL
      makeNode({ nodeId: 'n3', entityClass: 'shared-entity', severity: DependencySeverity.LOW }),
    ];
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', nodes);

    const trueConflicts = result.data!.conflicts.filter(
      (c) => c.verdict === ConflictVerdict.TRUE_CONFLICT,
    );
    for (const tc of trueConflicts) {
      expect(tc.cfRule).toBeTruthy();
    }
  });

  it('CC-7: POTENTIAL conflicts cite a cfRule (non-empty — CF-486 or CF-488)', () => {
    const node = makeNode({
      severity: DependencySeverity.HIGH,
      accessType: 'read',
      entityClass: 'service',
    });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    const potentials = result.data!.conflicts.filter(
      (c) => c.verdict === ConflictVerdict.POTENTIAL,
    );
    for (const p of potentials) {
      expect(p.cfRule).toBeTruthy();
    }
  });
});
