/**
 * P6.3 Tests — Sample Contracts (T44, T45)
 *
 * Tests: T44 validates, correct structure, factory deps with fabric types.
 * T45 validates, different archetype, uses AI_ENGINE fabric.
 * Both: toDict DNA-1, iron rules present, quality gates valid.
 */

import { FabricType } from '../../src/factories/fabric-type';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';

describe('T44 — Inventory Management Data Pipeline', () => {
  const t44 = createT44Contract();

  it('should validate successfully', () => {
    const result = t44.validate();
    expect(result.isSuccess).toBe(true);
  });

  it('should have taskTypeId T44', () => {
    expect(t44.taskTypeId).toBe('T44');
  });

  it('should have archetype DATA_PIPELINE', () => {
    expect(t44.archetype).toBe(ContractArchetype.DATA_PIPELINE);
  });

  it('should have 4 factory dependencies', () => {
    expect(t44.factoryDependencies).toHaveLength(4);
  });

  it('should have factory IDs F166–F169', () => {
    const ids = t44.factoryDependencies.map((d) => d.factoryId);
    expect(ids).toEqual(['F166', 'F167', 'F168', 'F169']);
  });

  it('should use DATABASE and QUEUE fabrics only', () => {
    const fabrics = new Set(t44.factoryDependencies.map((d) => d.fabricType));
    expect(fabrics.size).toBe(2);
    expect(fabrics.has(FabricType.DATABASE)).toBe(true);
    expect(fabrics.has(FabricType.QUEUE)).toBe(true);
  });

  it('should have all factory dependencies with valid fabric types', () => {
    for (const dep of t44.factoryDependencies) {
      expect(dep.fabricType).toBeTruthy();
      expect(Object.values(FabricType)).toContain(dep.fabricType);
    }
  });

  it('should have 5 quality gates', () => {
    expect(t44.qualityGates).toHaveLength(5);
  });

  it('should have at least one error-severity quality gate', () => {
    const errors = t44.qualityGates.filter((g) => g.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should have iron rules', () => {
    expect(t44.ironRules.length).toBeGreaterThan(0);
  });

  it('should have BFA entities', () => {
    expect(t44.bfaRegistration.entities.length).toBeGreaterThan(0);
  });

  it('should have BFA events', () => {
    expect(t44.bfaRegistration.events.length).toBeGreaterThan(0);
  });

  it('should have BFA API routes', () => {
    expect(t44.bfaRegistration.apiRoutes.length).toBeGreaterThan(0);
  });

  it('should have machine components', () => {
    expect(t44.machineComponents.length).toBeGreaterThan(0);
  });

  it('should have freedom components', () => {
    expect(t44.freedomComponents.length).toBeGreaterThan(0);
  });

  it('should produce DNA-1 compliant toDict', () => {
    const dict = t44.toDict();
    expect(dict.task_type_id).toBe('T44');
    expect(dict).toHaveProperty('factory_dependencies');
    expect(dict).toHaveProperty('af_stations');
    expect(dict).toHaveProperty('quality_gates');
    expect(dict).toHaveProperty('bfa_registration');
    expect(dict).not.toHaveProperty('taskTypeId');
  });
});

describe('T45 — Marketplace Listing Generator', () => {
  const t45 = createT45Contract();

  it('should validate successfully', () => {
    const result = t45.validate();
    expect(result.isSuccess).toBe(true);
  });

  it('should have taskTypeId T45', () => {
    expect(t45.taskTypeId).toBe('T45');
  });

  it('should have archetype ORCHESTRATION', () => {
    expect(t45.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('should have a different archetype from T44', () => {
    const t44 = createT44Contract();
    expect(t45.archetype).not.toBe(t44.archetype);
  });

  it('should have 4 factory dependencies', () => {
    expect(t45.factoryDependencies).toHaveLength(4);
  });

  it('should have factory IDs F170–F173', () => {
    const ids = t45.factoryDependencies.map((d) => d.factoryId);
    expect(ids).toEqual(['F170', 'F171', 'F172', 'F173']);
  });

  it('should use AI_ENGINE fabric (unlike T44)', () => {
    const fabrics = new Set(t45.factoryDependencies.map((d) => d.fabricType));
    expect(fabrics.has(FabricType.AI_ENGINE)).toBe(true);
  });

  it('should use AI_ENGINE + DATABASE + QUEUE fabrics', () => {
    const fabrics = new Set(t45.factoryDependencies.map((d) => d.fabricType));
    expect(fabrics.size).toBe(3);
    expect(fabrics.has(FabricType.AI_ENGINE)).toBe(true);
    expect(fabrics.has(FabricType.DATABASE)).toBe(true);
    expect(fabrics.has(FabricType.QUEUE)).toBe(true);
  });

  it('should have all factory dependencies with valid fabric types', () => {
    for (const dep of t45.factoryDependencies) {
      expect(dep.fabricType).toBeTruthy();
      expect(Object.values(FabricType)).toContain(dep.fabricType);
    }
  });

  it('should have 5 quality gates', () => {
    expect(t45.qualityGates).toHaveLength(5);
  });

  it('should have iron rules', () => {
    expect(t45.ironRules.length).toBeGreaterThan(0);
  });

  it('should have AF stations including multi_model role', () => {
    const roles = t45.afStations.map((s) => s.role);
    expect(roles).toContain('multi_model');
  });

  it('should have AF stations including prompt_library role', () => {
    const roles = t45.afStations.map((s) => s.role);
    expect(roles).toContain('prompt_library');
  });

  it('should produce DNA-1 compliant toDict', () => {
    const dict = t45.toDict();
    expect(dict.task_type_id).toBe('T45');
    expect(dict).toHaveProperty('factory_dependencies');
    expect(dict).not.toHaveProperty('taskTypeId');
  });
});

describe('T44 vs T45 — Contract Integrity', () => {
  const t44 = createT44Contract();
  const t45 = createT45Contract();

  it('should have different task type IDs', () => {
    expect(t44.taskTypeId).not.toBe(t45.taskTypeId);
  });

  it('should have different family IDs', () => {
    expect(t44.familyId).not.toBe(t45.familyId);
  });

  it('should have non-overlapping factory IDs', () => {
    const t44Ids = new Set(t44.factoryDependencies.map((d) => d.factoryId));
    const t45Ids = new Set(t45.factoryDependencies.map((d) => d.factoryId));
    for (const id of t44Ids) {
      expect(t45Ids.has(id)).toBe(false);
    }
  });

  it('should both validate successfully', () => {
    expect(t44.validate().isSuccess).toBe(true);
    expect(t45.validate().isSuccess).toBe(true);
  });
});

describe('Archetypes', () => {
  it('should have 65 archetype values (5 original + 6 FLOW-25 + 10 FLOW-29 + 4 FLOW-33 + 2 FLOW-35 + 1 FLOW-36 + 1 FLOW-00 + 1 FLOW-01 + 11 additional + 3 FLOW-10 + 5 FLOW-13 + 3 FLOW-14 + 10 FLOW-15 + 1 FLOW-20 + 4 FLOW-18 + 1 FLOW-41/42/43/44)', () => {
    expect(Object.values(ContractArchetype)).toHaveLength(65);
  });

  it('should include SERVICE, DATA_PIPELINE, ORCHESTRATION, AI_GENERATION, COMPOSITE', () => {
    expect(ContractArchetype.SERVICE).toBe('service');
    expect(ContractArchetype.DATA_PIPELINE).toBe('data_pipeline');
    expect(ContractArchetype.ORCHESTRATION).toBe('orchestration');
    expect(ContractArchetype.AI_GENERATION).toBe('ai_generation');
    expect(ContractArchetype.COMPOSITE).toBe('composite');
  });
});
