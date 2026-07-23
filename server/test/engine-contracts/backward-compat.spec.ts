/**
 * P6.5 Tests — Backward Compatibility Loaders
 *
 * Tests: loadFactoryStubs (F1–F165, 24 families, correct fabric types),
 * loadTaskTypeStubs (T1–T43, 5 archetypes), loadExistingBfaRegistrations (FLOW-01–FLOW-05),
 * loadAllBackwardCompat (combined), numbering integrity.
 */

import { FabricType } from '../../src/factories/fabric-type';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { StubBfaValidator } from '../../src/engine-contracts/bfa-validator.stub';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import {
  loadFactoryStubs,
  loadTaskTypeStubs,
  loadExistingBfaRegistrations,
  loadAllBackwardCompat,
  FAMILIES,
  FLOW_BFA_DATA,
} from '../../src/engine-contracts/backward-compat';

describe('loadFactoryStubs', () => {
  let registry: FactoryRegistry;

  beforeEach(() => {
    registry = new FactoryRegistry();
  });

  it('should load exactly 165 factory stubs', () => {
    const count = loadFactoryStubs(registry);
    expect(count).toBe(165);
    expect(registry.count).toBe(165);
  });

  it('should register F1 through F165 without gaps', () => {
    loadFactoryStubs(registry);
    for (let f = 1; f <= 165; f++) {
      expect(registry.has(`F${f}`)).toBe(true);
    }
  });

  it('should NOT register F166 or above', () => {
    loadFactoryStubs(registry);
    expect(registry.has('F166')).toBe(false);
    expect(registry.has('F167')).toBe(false);
    expect(registry.has('F0')).toBe(false);
  });

  it('should distribute across 24 families', () => {
    loadFactoryStubs(registry);
    const families = new Set<string>();
    for (let f = 1; f <= 165; f++) {
      const result = registry.get(`F${f}`);
      if (result.isSuccess) families.add(result.data!.familyId);
    }
    expect(families.size).toBe(24);
  });

  it('should assign valid fabric types to all entries', () => {
    loadFactoryStubs(registry);
    const validFabrics = Object.values(FabricType);
    for (let f = 1; f <= 165; f++) {
      const result = registry.get(`F${f}`);
      expect(validFabrics).toContain(result.data!.fabricType);
    }
  });

  it('should assign DATABASE fabric to Family-01 (F1–F7)', () => {
    loadFactoryStubs(registry);
    for (let f = 1; f <= 7; f++) {
      const result = registry.get(`F${f}`);
      expect(result.data!.fabricType).toBe(FabricType.DATABASE);
      expect(result.data!.familyId).toBe('Family-01');
    }
  });

  it('should assign QUEUE fabric to Family-05 (F29–F35)', () => {
    loadFactoryStubs(registry);
    for (let f = 29; f <= 35; f++) {
      const result = registry.get(`F${f}`);
      expect(result.data!.fabricType).toBe(FabricType.QUEUE);
      expect(result.data!.familyId).toBe('Family-05');
    }
  });

  it('should assign AI_ENGINE fabric to Family-11 (F71–F77)', () => {
    loadFactoryStubs(registry);
    for (let f = 71; f <= 77; f++) {
      const result = registry.get(`F${f}`);
      expect(result.data!.fabricType).toBe(FabricType.AI_ENGINE);
    }
  });

  it('should assign SECRETS fabric to Family-19 (F127–F133)', () => {
    loadFactoryStubs(registry);
    for (let f = 127; f <= 133; f++) {
      const result = registry.get(`F${f}`);
      expect(result.data!.fabricType).toBe(FabricType.SECRETS);
    }
  });

  it('should set all stubs to status CORE', () => {
    loadFactoryStubs(registry);
    const coreEntries = registry.findByStatus('CORE');
    expect(coreEntries).toHaveLength(165);
  });

  it('should be idempotent — second call adds 0', () => {
    loadFactoryStubs(registry);
    const count2 = loadFactoryStubs(registry);
    expect(count2).toBe(0);
    expect(registry.count).toBe(165);
  });
});

describe('loadTaskTypeStubs', () => {
  let registry: TaskTypeRegistry;

  beforeEach(() => {
    registry = new TaskTypeRegistry();
  });

  it('should load exactly 43 task type stubs', () => {
    const count = loadTaskTypeStubs(registry);
    expect(count).toBe(43);
    expect(registry.count).toBe(43);
  });

  it('should register T1 through T43 without gaps', () => {
    loadTaskTypeStubs(registry);
    for (let t = 1; t <= 43; t++) {
      expect(registry.has(`T${t}`)).toBe(true);
    }
  });

  it('should NOT register T44 or above', () => {
    loadTaskTypeStubs(registry);
    expect(registry.has('T44')).toBe(false);
    expect(registry.has('T0')).toBe(false);
  });

  it('should distribute across all 5 archetypes', () => {
    loadTaskTypeStubs(registry);
    const archetypes = new Set<ContractArchetype>();
    for (let t = 1; t <= 43; t++) {
      const result = registry.get(`T${t}`);
      if (result.isSuccess) archetypes.add(result.data!.archetype as ContractArchetype);
    }
    expect(archetypes.size).toBe(5);
    expect(archetypes.has(ContractArchetype.SERVICE)).toBe(true);
    expect(archetypes.has(ContractArchetype.DATA_PIPELINE)).toBe(true);
    expect(archetypes.has(ContractArchetype.ORCHESTRATION)).toBe(true);
    expect(archetypes.has(ContractArchetype.AI_GENERATION)).toBe(true);
    expect(archetypes.has(ContractArchetype.COMPOSITE)).toBe(true);
  });

  it('should assign valid fabric types to all task type dependencies', () => {
    loadTaskTypeStubs(registry);
    const validFabrics = Object.values(FabricType);
    for (let t = 1; t <= 43; t++) {
      const result = registry.get(`T${t}`);
      for (const dep of result.data!.factoryDependencies) {
        expect(validFabrics).toContain(dep.fabricType);
      }
    }
  });

  it('should be idempotent — second call adds 0', () => {
    loadTaskTypeStubs(registry);
    const count2 = loadTaskTypeStubs(registry);
    expect(count2).toBe(0);
    expect(registry.count).toBe(43);
  });
});

describe('loadExistingBfaRegistrations', () => {
  let bfa: StubBfaValidator;

  beforeEach(() => {
    bfa = new StubBfaValidator();
  });

  it('should load exactly 4 BFA registrations (FLOW-02 through FLOW-05)', () => {
    const count = loadExistingBfaRegistrations(bfa);
    expect(count).toBe(4);
    expect(bfa.count).toBe(4);
  });

  it('should register all 4 flows', () => {
    loadExistingBfaRegistrations(bfa);
    const registered = bfa.getRegistered();
    expect(registered.has('FLOW-01')).toBe(false);
    expect(registered.has('FLOW-02')).toBe(true);
    expect(registered.has('FLOW-03')).toBe(true);
    expect(registered.has('FLOW-04')).toBe(true);
    expect(registered.has('FLOW-05')).toBe(true);
  });

  it('each flow should have entities, events, and apiRoutes', () => {
    loadExistingBfaRegistrations(bfa);
    const registered = bfa.getRegistered();
    for (const [, reg] of registered) {
      expect(reg.entities.length).toBeGreaterThan(0);
      expect(reg.events.length).toBeGreaterThan(0);
      expect(reg.apiRoutes.length).toBeGreaterThan(0);
    }
  });
});

describe('loadAllBackwardCompat', () => {
  it('should load all three categories and return counts', () => {
    const factoryRegistry = new FactoryRegistry();
    const taskRegistry = new TaskTypeRegistry();
    const bfa = new StubBfaValidator();

    const counts = loadAllBackwardCompat(factoryRegistry, taskRegistry, bfa);

    expect(counts.factories_loaded).toBe(165);
    expect(counts.task_types_loaded).toBe(43);
    expect(counts.bfa_flows_loaded).toBe(4);
    expect(counts.total_loaded).toBe(212);
  });
});

describe('FAMILIES metadata', () => {
  it('should have exactly 24 families', () => {
    expect(FAMILIES).toHaveLength(24);
  });

  it('should cover F1–F165 contiguously', () => {
    let expectedStart = 1;
    for (const family of FAMILIES) {
      expect(family.factoryRange[0]).toBe(expectedStart);
      expectedStart = family.factoryRange[1] + 1;
    }
    expect(expectedStart - 1).toBe(165);
  });

  it('should have unique family IDs', () => {
    const ids = FAMILIES.map((f) => f.familyId);
    expect(new Set(ids).size).toBe(24);
  });
});

describe('FLOW_BFA_DATA metadata', () => {
  it('should have exactly 4 flows', () => {
    expect(FLOW_BFA_DATA).toHaveLength(4);
  });

  it('should have unique flow IDs', () => {
    const ids = FLOW_BFA_DATA.map((f) => f.flowId);
    expect(new Set(ids).size).toBe(4);
  });
});
