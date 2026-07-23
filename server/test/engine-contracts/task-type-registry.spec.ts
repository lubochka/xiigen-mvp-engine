/**
 * P6.4 Tests — TaskTypeRegistry
 *
 * Tests: register (valid, invalid, duplicate), get (found, not found),
 * listAll, listByArchetype, listByFamily, count, DNA compliance.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FabricType } from '../../src/factories/fabric-type';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { EngineContract } from '../../src/engine-contracts/contract-schema';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';

function makeMinimalContract(
  id: string,
  archetype: ContractArchetype = ContractArchetype.SERVICE,
  familyId = 'Family-99',
) {
  return new EngineContract({
    taskTypeId: id,
    name: `Test ${id}`,
    archetype,
    entry: 'test',
    purpose: 'test',
    familyId,
    factoryDependencies: [
      {
        factoryId: `F${id.replace('T', '')}`,
        interfaceName: 'ITestService',
        fabricType: FabricType.DATABASE,
        description: 'test',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      { gateId: 'QG-01', description: 'test', severity: 'error', checkType: 'dna_compliance' },
    ],
    bfaRegistration: { entities: ['test'], events: ['test.event'], apiRoutes: ['/api/test'] },
    ironRules: ['rule'],
    machineComponents: ['comp'],
    freedomComponents: ['config'],
  });
}

describe('TaskTypeRegistry', () => {
  let registry: TaskTypeRegistry;

  beforeEach(() => {
    registry = new TaskTypeRegistry();
  });

  describe('register', () => {
    it('should register a valid contract successfully', () => {
      const t44 = createT44Contract();
      const result = registry.register(t44);
      expect(result.isSuccess).toBe(true);
    });

    it('should reject duplicate registration', () => {
      const t44 = createT44Contract();
      registry.register(t44);
      const result = registry.register(t44);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONTRACT_EXISTS');
    });

    it('should reject invalid contract (missing name)', () => {
      const bad = new EngineContract({
        taskTypeId: 'T999',
        name: '',
        archetype: ContractArchetype.SERVICE,
        entry: 'test',
        purpose: 'test',
        factoryDependencies: [
          {
            factoryId: 'F1',
            interfaceName: 'I',
            fabricType: FabricType.DATABASE,
            description: 'x',
          },
        ],
        afStations: [],
        qualityGates: [
          { gateId: 'QG-01', description: 'x', severity: 'error', checkType: 'dna_compliance' },
        ],
        bfaRegistration: { entities: [], events: [], apiRoutes: [] },
        ironRules: [],
        machineComponents: [],
        freedomComponents: [],
      });
      const result = registry.register(bad);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONTRACT_INVALID');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const t44 = createT44Contract();
      const result = registry.register(t44);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('get', () => {
    it('should return contract when found', () => {
      const t44 = createT44Contract();
      registry.register(t44);
      const result = registry.get('T44');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.taskTypeId).toBe('T44');
    });

    it('should return failure when not found', () => {
      const result = registry.get('T999');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONTRACT_NOT_FOUND');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = registry.get('T999');
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('listAll', () => {
    it('should return empty array when no contracts', () => {
      expect(registry.listAll()).toHaveLength(0);
    });

    it('should return all contracts as dicts (DNA-1)', () => {
      registry.register(createT44Contract());
      registry.register(createT45Contract());
      const all = registry.listAll();
      expect(all).toHaveLength(2);
      expect(all[0]).toHaveProperty('task_type_id');
      expect(all[0]).not.toHaveProperty('taskTypeId');
    });
  });

  describe('listByArchetype', () => {
    it('should filter by archetype', () => {
      registry.register(createT44Contract()); // DATA_PIPELINE
      registry.register(createT45Contract()); // ORCHESTRATION
      const pipelines = registry.listByArchetype(ContractArchetype.DATA_PIPELINE);
      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].taskTypeId).toBe('T44');
    });

    it('should return empty array when no matches', () => {
      registry.register(createT44Contract());
      const result = registry.listByArchetype(ContractArchetype.AI_GENERATION);
      expect(result).toHaveLength(0);
    });
  });

  describe('listByFamily', () => {
    it('should filter by family', () => {
      registry.register(createT44Contract()); // Family-25
      registry.register(createT45Contract()); // Family-26
      const fam25 = registry.listByFamily('Family-25');
      expect(fam25).toHaveLength(1);
      expect(fam25[0].taskTypeId).toBe('T44');
    });

    it('should return empty array when no matches', () => {
      const result = registry.listByFamily('Family-999');
      expect(result).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should be 0 initially', () => {
      expect(registry.count).toBe(0);
    });

    it('should increment on register', () => {
      registry.register(createT44Contract());
      expect(registry.count).toBe(1);
      registry.register(createT45Contract());
      expect(registry.count).toBe(2);
    });

    it('should not increment on failed register', () => {
      registry.register(createT44Contract());
      registry.register(createT44Contract()); // duplicate
      expect(registry.count).toBe(1);
    });
  });

  describe('has', () => {
    it('should return true for registered', () => {
      registry.register(createT44Contract());
      expect(registry.has('T44')).toBe(true);
    });

    it('should return false for unregistered', () => {
      expect(registry.has('T999')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      registry.register(createT44Contract());
      registry.register(createT45Contract());
      registry.clear();
      expect(registry.count).toBe(0);
    });
  });
});
