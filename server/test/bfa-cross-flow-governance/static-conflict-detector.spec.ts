/**
 * StaticConflictDetector — Unit Tests (T377).
 *
 * Tests:
 *   C-1: returns NO_CONFLICT for node with no matching CF rule
 *   C-2: SCHEMA_CHANGE + write + CRITICAL → TRUE_CONFLICT citing CF-473
 *   C-3: API_BREAK + shared-entity → TRUE_CONFLICT citing CF-476
 *   C-4: FLOW_MODIFICATION + write → TRUE_CONFLICT citing CF-479
 *   C-5: DEPENDENCY_UPDATE + CRITICAL severity → TRUE_CONFLICT citing CF-485
 *   C-6: HIGH severity node → POTENTIAL citing CF-486
 *   C-7: SCHEMA_CHANGE + read + non-CRITICAL → POTENTIAL citing CF-488
 *   C-8: returns DataProcessResult.isSuccess=true for valid inputs
 *   C-9: missing changeType returns failure
 *   C-10: missing entityId returns failure
 *   C-11: empty nodes array returns report with no conflicts
 *   C-12: hasStaticCritical true when any CRITICAL TRUE_CONFLICT exists
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
    nodeId: 'node-1',
    entityId: 'SomeService',
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

describe('StaticConflictDetector — Unit (T377)', () => {
  let detector: StaticConflictDetector;

  beforeEach(() => {
    detector = new StaticConflictDetector();
  });

  it('C-1: returns NO_CONFLICT for node with no matching CF rule', () => {
    const node = makeNode({ severity: DependencySeverity.LOW, accessType: 'read' });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.conflicts[0].verdict).toBe(ConflictVerdict.NO_CONFLICT);
  });

  it('C-2: SCHEMA_CHANGE + write + CRITICAL → TRUE_CONFLICT citing CF-473', () => {
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.cfRule).toBe('CF-473');
    expect(conflict.severity).toBe(DependencySeverity.CRITICAL);
  });

  it('C-3: API_BREAK + shared-entity → TRUE_CONFLICT citing CF-476', () => {
    const node = makeNode({ entityClass: 'shared-entity' });
    const result = detector.detectConflicts('API_BREAK', 'SharedEntity', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.cfRule).toBe('CF-476');
    expect(conflict.severity).toBe(DependencySeverity.CRITICAL);
  });

  it('C-4: FLOW_MODIFICATION + write → TRUE_CONFLICT citing CF-479', () => {
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.MEDIUM });
    const result = detector.detectConflicts('FLOW_MODIFICATION', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.cfRule).toBe('CF-479');
    expect(conflict.severity).toBe(DependencySeverity.HIGH);
  });

  it('C-5: DEPENDENCY_UPDATE + CRITICAL severity → TRUE_CONFLICT citing CF-485', () => {
    const node = makeNode({ severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.TRUE_CONFLICT);
    expect(conflict.cfRule).toBe('CF-485');
    expect(conflict.severity).toBe(DependencySeverity.CRITICAL);
  });

  it('C-6: HIGH severity node → POTENTIAL citing CF-486', () => {
    const node = makeNode({ severity: DependencySeverity.HIGH, accessType: 'read' });
    const result = detector.detectConflicts('DEPENDENCY_UPDATE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.POTENTIAL);
    expect(conflict.cfRule).toBe('CF-486');
    expect(conflict.severity).toBe(DependencySeverity.HIGH);
  });

  it('C-7: SCHEMA_CHANGE + read + non-CRITICAL → POTENTIAL citing CF-488', () => {
    const node = makeNode({ accessType: 'read', severity: DependencySeverity.MEDIUM });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);

    const conflict = result.data!.conflicts[0];
    expect(conflict.verdict).toBe(ConflictVerdict.POTENTIAL);
    expect(conflict.cfRule).toBe('CF-488');
  });

  it('C-8: returns isSuccess=true for valid inputs', () => {
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', []);
    expect(result.isSuccess).toBe(true);
  });

  it('C-9: missing changeType returns failure', () => {
    const result = detector.detectConflicts('', 'OrderSchema', []);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_CHANGE_TYPE');
  });

  it('C-10: missing entityId returns failure', () => {
    const result = detector.detectConflicts('SCHEMA_CHANGE', '', []);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ENTITY_ID');
  });

  it('C-11: empty nodes array returns report with no conflicts and NONE severity', () => {
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', []);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.conflicts).toHaveLength(0);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.NONE);
    expect(result.data!.hasStaticCritical).toBe(false);
    expect(result.data!.totalEvaluated).toBe(0);
  });

  it('C-12: hasStaticCritical true when any CRITICAL TRUE_CONFLICT exists', () => {
    const node = makeNode({ accessType: 'write', severity: DependencySeverity.CRITICAL });
    const result = detector.detectConflicts('SCHEMA_CHANGE', 'OrderSchema', [node]);

    expect(result.data!.hasStaticCritical).toBe(true);
  });
});
