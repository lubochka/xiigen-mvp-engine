/**
 * StaticConflictDetector — Severity Precedence Tests (T377, IR-377-2).
 *
 * IR-377-2: Static CRITICAL verdict overrides any AI result — not negotiable.
 * Tests that severity is computed correctly and the override flag is set.
 *
 * Tests:
 *   SV-1: CRITICAL TRUE_CONFLICT sets overridesAi=true
 *   SV-2: HIGH TRUE_CONFLICT sets overridesAi=false (only CRITICAL overrides)
 *   SV-3: POTENTIAL conflicts set overridesAi=false
 *   SV-4: maxSeverity is CRITICAL when any CRITICAL conflict exists
 *   SV-5: maxSeverity is NONE when only NO_CONFLICT records
 *   SV-6: maxSeverity is HIGH when highest is HIGH
 *   SV-7: hasStaticCritical false when no CRITICAL TRUE_CONFLICT
 *   SV-8: hasStaticCritical true when at least one CRITICAL TRUE_CONFLICT
 *   SV-9: mixed severity nodes — maxSeverity = highest
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
    nodeId: 'node-sv',
    entityId: 'SeverityService',
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

describe('StaticConflictDetector — Severity Precedence (IR-377-2)', () => {
  let detector: StaticConflictDetector;

  beforeEach(() => {
    detector = new StaticConflictDetector();
  });

  it('SV-1: CRITICAL TRUE_CONFLICT sets overridesAi=true (IR-377-2)', () => {
    // CF-473: SCHEMA_CHANGE + write + CRITICAL → overridesAi=true
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.severity).toBe(DependencySeverity.CRITICAL);
    expect(conflict.overridesAi).toBe(true);
  });

  it('SV-2: HIGH TRUE_CONFLICT sets overridesAi=false (only CRITICAL overrides AI)', () => {
    // CF-479: FLOW_MODIFICATION + write → TRUE_CONFLICT at HIGH severity
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.MEDIUM });
    const result = detector.detectConflicts('FLOW_MODIFICATION', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.severity).toBe(DependencySeverity.HIGH);
    expect(conflict.overridesAi).toBe(false);
  });

  it('SV-3: POTENTIAL conflicts set overridesAi=false', () => {
    const node = makeNode({ severity: DependencySeverity.HIGH, accessType: 'read' });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.POTENTIAL);
    expect(conflict.overridesAi).toBe(false);
  });

  it('SV-4: maxSeverity is CRITICAL when any CRITICAL conflict exists', () => {
    const nodes = [
      makeNode({ nodeId: 'n1', accessType: 'write', severity: DependencySeverity.CRITICAL }),
      makeNode({ nodeId: 'n2', severity: DependencySeverity.MEDIUM, accessType: 'read' }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.CRITICAL);
  });

  it('SV-5: maxSeverity is NONE when only NO_CONFLICT records', () => {
    // LOW read, DEPENDENCY_UPDATE — no rules match → NO_CONFLICT
    const node = makeNode({
      severity: DependencySeverity.LOW,
      accessType: 'read',
      entityClass: 'service',
    });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.NONE);
  });

  it('SV-6: maxSeverity is HIGH when highest conflict is HIGH', () => {
    // CF-486: HIGH severity node → POTENTIAL at HIGH
    const node = makeNode({ severity: DependencySeverity.HIGH, accessType: 'read' });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.HIGH);
  });

  it('SV-7: hasStaticCritical false when no CRITICAL TRUE_CONFLICT', () => {
    const node = makeNode({ severity: DependencySeverity.HIGH, accessType: 'read' });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);
    expect(result.data!.hasStaticCritical).toBe(false);
  });

  it('SV-8: hasStaticCritical true when at least one CRITICAL TRUE_CONFLICT exists', () => {
    const nodes = [
      makeNode({
        nodeId: 'n1',
        severity: DependencySeverity.LOW,
        accessType: 'read',
        entityClass: 'service',
      }),
      makeNode({ nodeId: 'n2', accessType: 'write', severity: DependencySeverity.CRITICAL }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);
    expect(result.data!.hasStaticCritical).toBe(true);
  });

  it('SV-9: mixed severity nodes — maxSeverity equals highest severity', () => {
    const nodes = [
      makeNode({ nodeId: 'n1', severity: DependencySeverity.MEDIUM, accessType: 'read' }),
      makeNode({ nodeId: 'n2', severity: DependencySeverity.HIGH, accessType: 'read' }),
      makeNode({ nodeId: 'n3', severity: DependencySeverity.CRITICAL, accessType: 'write' }),
    ];
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', nodes);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.CRITICAL);
  });
});
