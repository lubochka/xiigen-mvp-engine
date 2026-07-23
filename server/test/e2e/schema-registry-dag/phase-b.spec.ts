/**
 * FLOW-11 Phase B — T191 DagCycleDetector Tests
 * T191-1 through T191-4
 */
import 'reflect-metadata';
import { DagCycleDetectorService } from '../../../src/engine/flows/schema-registry-dag/dag-cycle-detector.service';
import { IDatabaseService } from '../../../src/fabrics/interfaces/database.interface';
import { IQueueService } from '../../../src/fabrics/interfaces/queue.interface';

describe('T191 DagCycleDetector', () => {
  let detector: DagCycleDetectorService;

  beforeEach(() => {
    detector = new DagCycleDetectorService();
  });

  test('T191-1: direct cycle A→B→A detected; cyclePath contains both nodes', () => {
    const result = detector.check({
      schemaType: 'A',
      newDeps: ['B'],
      existingGraph: { B: ['A'] }, // B depends on A → A depends on B → cycle
      tenantId: 'test',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CYCLE_DETECTED');
    expect(result.data!.cyclePath).toBeDefined();
    expect(result.data!.cyclePath!.length).toBeGreaterThanOrEqual(2);
    // Both A and B should appear in cyclePath
    const pathContainsA = result.data!.cyclePath!.includes('A');
    const pathContainsB = result.data!.cyclePath!.includes('B');
    expect(pathContainsA).toBe(true);
    expect(pathContainsB).toBe(true);
  });

  test('T191-2: transitive cycle A→B→C→A detected; all three nodes in cyclePath', () => {
    const result = detector.check({
      schemaType: 'A',
      newDeps: ['B'],
      existingGraph: { B: ['C'], C: ['A'] }, // A→B→C→A
      tenantId: 'test',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CYCLE_DETECTED');
    expect(result.data!.cyclePath).toBeDefined();
    expect(result.data!.cyclePath!.length).toBeGreaterThanOrEqual(3);
    expect(result.data!.cyclePath!).toContain('A');
    expect(result.data!.cyclePath!).toContain('B');
    expect(result.data!.cyclePath!).toContain('C');
  });

  test('T191-3: acyclic graph (A→B→C) returns PASS; cyclePath empty', () => {
    const result = detector.check({
      schemaType: 'A',
      newDeps: ['B'],
      existingGraph: { B: ['C'], C: [] },
      tenantId: 'test',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('PASS');
    expect(result.data!.cyclePath).toEqual([]);
  });

  test('T191-4: T191 has no ES read/write or queue calls — pure function verified', () => {
    // DagCycleDetectorService should not depend on IDatabaseService or IQueueService
    const service = new DagCycleDetectorService();
    // Verify constructor takes no db/queue parameters
    const constructorLength = DagCycleDetectorService.length;
    expect(constructorLength).toBe(0);

    // Verify check() is synchronous (returns DataProcessResult, not Promise)
    const result = service.check({
      schemaType: 'X',
      newDeps: [],
      existingGraph: {},
      tenantId: 'test',
    });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.isSuccess).toBe(true);
  });
});
