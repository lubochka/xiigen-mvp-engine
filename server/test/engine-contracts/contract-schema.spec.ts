/**
 * P6.3 Tests — Engine Contract Schema
 *
 * Tests: FactoryDependency toDict, AfStationMapping toDict, QualityGate toDict,
 * BfaRegistration toDict, EngineContract construction/validation/toDict,
 * validation failures (missing fields, invalid fabric types, empty gates).
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FabricType } from '../../src/factories/fabric-type';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import {
  EngineContract,
  FactoryDependency,
  AfStationMapping,
  QualityGate,
  BfaRegistration,
  factoryDependencyToDict,
  afStationMappingToDict,
  qualityGateToDict,
  bfaRegistrationToDict,
} from '../../src/engine-contracts/contract-schema';

// ── Helper: minimal valid contract params ────────────

function minimalParams() {
  return {
    taskTypeId: 'T99',
    name: 'Test Contract',
    archetype: ContractArchetype.SERVICE,
    entry: 'test trigger',
    purpose: 'test purpose',
    factoryDependencies: [
      {
        factoryId: 'F999',
        interfaceName: 'ITestService',
        fabricType: FabricType.DATABASE,
        description: 'test dep',
      },
    ] as FactoryDependency[],
    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: {},
      },
    ] as AfStationMapping[],
    qualityGates: [
      {
        gateId: 'QG-01',
        description: 'test gate',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ] as QualityGate[],
    bfaRegistration: {
      entities: ['test_entity'],
      events: ['test.event'],
      apiRoutes: ['/api/test'],
    } as BfaRegistration,
    ironRules: ['rule 1'],
    machineComponents: ['component 1'],
    freedomComponents: ['config 1'],
  };
}

// ══════════════════════════════════════════════════════
// FactoryDependency
// ══════════════════════════════════════════════════════

describe('FactoryDependency', () => {
  it('should serialize to snake_case dict (DNA-1)', () => {
    const dep: FactoryDependency = {
      factoryId: 'F166',
      interfaceName: 'IInventoryService',
      fabricType: FabricType.DATABASE,
      providerHint: 'postgresql',
      description: 'inventory storage',
    };
    const dict = factoryDependencyToDict(dep);
    expect(dict.factory_id).toBe('F166');
    expect(dict.interface_name).toBe('IInventoryService');
    expect(dict.fabric_type).toBe('database');
    expect(dict.provider_hint).toBe('postgresql');
    expect(dict.description).toBe('inventory storage');
  });

  it('should serialize null provider_hint when not set', () => {
    const dep: FactoryDependency = {
      factoryId: 'F167',
      interfaceName: 'IStockService',
      fabricType: FabricType.QUEUE,
      description: 'stock events',
    };
    const dict = factoryDependencyToDict(dep);
    expect(dict.provider_hint).toBeNull();
  });

  it('should NOT have camelCase keys', () => {
    const dep: FactoryDependency = {
      factoryId: 'F168',
      interfaceName: 'IAudit',
      fabricType: FabricType.DATABASE,
      description: 'audit',
    };
    const dict = factoryDependencyToDict(dep);
    expect(dict).not.toHaveProperty('factoryId');
    expect(dict).not.toHaveProperty('interfaceName');
    expect(dict).not.toHaveProperty('fabricType');
    expect(dict).not.toHaveProperty('providerHint');
  });
});

// ══════════════════════════════════════════════════════
// AfStationMapping
// ══════════════════════════════════════════════════════

describe('AfStationMapping', () => {
  it('should serialize to snake_case dict (DNA-1)', () => {
    const m: AfStationMapping = {
      stationId: 'AF-1',
      role: 'generate',
      modelHint: 'claude-opus-4-5',
      config: { max_tokens: 4000 },
    };
    const dict = afStationMappingToDict(m);
    expect(dict.station_id).toBe('AF-1');
    expect(dict.role).toBe('generate');
    expect(dict.model_hint).toBe('claude-opus-4-5');
    expect(dict.config).toEqual({ max_tokens: 4000 });
  });

  it('should support all valid roles', () => {
    const roles = ['generate', 'review', 'judge', 'multi_model', 'rag_context', 'prompt_library'];
    for (const role of roles) {
      const m: AfStationMapping = { stationId: 'AF-X', role, config: {} };
      const dict = afStationMappingToDict(m);
      expect(dict.role).toBe(role);
    }
  });

  it('should serialize null model_hint when not set', () => {
    const m: AfStationMapping = { stationId: 'AF-4', role: 'rag_context', config: {} };
    const dict = afStationMappingToDict(m);
    expect(dict.model_hint).toBeNull();
  });
});

// ══════════════════════════════════════════════════════
// QualityGate
// ══════════════════════════════════════════════════════

describe('QualityGate', () => {
  it('should serialize to snake_case dict (DNA-1)', () => {
    const gate: QualityGate = {
      gateId: 'QG-01',
      description: 'DNA-4 compliance',
      severity: 'error',
      checkType: 'dna_compliance',
    };
    const dict = qualityGateToDict(gate);
    expect(dict.gate_id).toBe('QG-01');
    expect(dict.description).toBe('DNA-4 compliance');
    expect(dict.severity).toBe('error');
    expect(dict.check_type).toBe('dna_compliance');
  });

  it('should support warning severity', () => {
    const gate: QualityGate = {
      gateId: 'QG-02',
      description: 'advisory check',
      severity: 'warning',
      checkType: 'code_structure',
    };
    const dict = qualityGateToDict(gate);
    expect(dict.severity).toBe('warning');
  });
});

// ══════════════════════════════════════════════════════
// BfaRegistration
// ══════════════════════════════════════════════════════

describe('BfaRegistration', () => {
  it('should serialize to snake_case dict (DNA-1)', () => {
    const bfa: BfaRegistration = {
      entities: ['inventory_item', 'stock_level'],
      events: ['inventory.updated'],
      apiRoutes: ['/api/inventory'],
    };
    const dict = bfaRegistrationToDict(bfa);
    expect(dict.entities).toEqual(['inventory_item', 'stock_level']);
    expect(dict.events).toEqual(['inventory.updated']);
    expect(dict.api_routes).toEqual(['/api/inventory']);
  });

  it('should NOT have camelCase keys', () => {
    const bfa: BfaRegistration = { entities: [], events: [], apiRoutes: [] };
    const dict = bfaRegistrationToDict(bfa);
    expect(dict).not.toHaveProperty('apiRoutes');
    expect(dict).toHaveProperty('api_routes');
  });

  it('should produce independent arrays (no shared references)', () => {
    const entities = ['a', 'b'];
    const bfa: BfaRegistration = { entities, events: [], apiRoutes: [] };
    const dict = bfaRegistrationToDict(bfa);
    (dict.entities as string[]).push('c');
    expect(entities).toHaveLength(2); // original not mutated
  });
});

// ══════════════════════════════════════════════════════
// EngineContract — Construction
// ══════════════════════════════════════════════════════

describe('EngineContract — Construction', () => {
  it('should construct with all required fields', () => {
    const contract = new EngineContract(minimalParams());
    expect(contract.taskTypeId).toBe('T99');
    expect(contract.name).toBe('Test Contract');
    expect(contract.archetype).toBe(ContractArchetype.SERVICE);
  });

  it('should default optional fields', () => {
    const contract = new EngineContract(minimalParams());
    expect(contract.distinctFrom).toBe('');
    expect(contract.familyId).toBe('');
    expect(contract.version).toBe('1.0.0');
  });

  it('should accept optional fields when provided', () => {
    const contract = new EngineContract({
      ...minimalParams(),
      distinctFrom: 'T10',
      familyId: 'Family-99',
      version: '2.0.0',
    });
    expect(contract.distinctFrom).toBe('T10');
    expect(contract.familyId).toBe('Family-99');
    expect(contract.version).toBe('2.0.0');
  });
});

// ══════════════════════════════════════════════════════
// EngineContract — Validation
// ══════════════════════════════════════════════════════

describe('EngineContract — Validation', () => {
  it('should validate successfully with all required fields', () => {
    const contract = new EngineContract(minimalParams());
    const result = contract.validate();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const contract = new EngineContract(minimalParams());
    const result = contract.validate();
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should fail when taskTypeId is missing', () => {
    const contract = new EngineContract({ ...minimalParams(), taskTypeId: '' });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('taskTypeId is required');
  });

  it('should fail when name is missing', () => {
    const contract = new EngineContract({ ...minimalParams(), name: '' });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('name is required');
  });

  it('should fail when factoryDependencies is empty', () => {
    const contract = new EngineContract({ ...minimalParams(), factoryDependencies: [] });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('At least one factory dependency');
  });

  it('should fail when a factory dependency has no fabricType', () => {
    const contract = new EngineContract({
      ...minimalParams(),
      factoryDependencies: [
        {
          factoryId: 'F1',
          interfaceName: 'ITest',
          fabricType: '' as any,
          description: 'bad dep',
        },
      ],
    });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('missing fabric_type');
  });

  it('should fail when a factory dependency has invalid fabricType', () => {
    const contract = new EngineContract({
      ...minimalParams(),
      factoryDependencies: [
        {
          factoryId: 'F1',
          interfaceName: 'ITest',
          fabricType: 'invalid_fabric' as any,
          description: 'bad dep',
        },
      ],
    });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('invalid fabric_type');
  });

  it('should fail when qualityGates is empty', () => {
    const contract = new EngineContract({ ...minimalParams(), qualityGates: [] });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('At least one quality gate');
  });

  it('should collect multiple validation errors', () => {
    const contract = new EngineContract({
      ...minimalParams(),
      taskTypeId: '',
      name: '',
      factoryDependencies: [],
      qualityGates: [],
    });
    const result = contract.validate();
    expect(result.isSuccess).toBe(false);
    // Should have at least 4 errors separated by ';'
    const errors = result.errorMessage!.split(';');
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it('should use error code CONTRACT_VALIDATION_FAILED', () => {
    const contract = new EngineContract({ ...minimalParams(), taskTypeId: '' });
    const result = contract.validate();
    expect(result.errorCode).toBe('CONTRACT_VALIDATION_FAILED');
  });
});

// ══════════════════════════════════════════════════════
// EngineContract — toDict (DNA-1)
// ══════════════════════════════════════════════════════

describe('EngineContract — toDict', () => {
  it('should produce snake_case keys', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    expect(dict).toHaveProperty('task_type_id');
    expect(dict).toHaveProperty('factory_dependencies');
    expect(dict).toHaveProperty('af_stations');
    expect(dict).toHaveProperty('quality_gates');
    expect(dict).toHaveProperty('bfa_registration');
    expect(dict).toHaveProperty('iron_rules');
    expect(dict).toHaveProperty('machine_components');
    expect(dict).toHaveProperty('freedom_components');
    expect(dict).toHaveProperty('family_id');
    expect(dict).toHaveProperty('distinct_from');
  });

  it('should NOT have camelCase keys', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    expect(dict).not.toHaveProperty('taskTypeId');
    expect(dict).not.toHaveProperty('factoryDependencies');
    expect(dict).not.toHaveProperty('afStations');
    expect(dict).not.toHaveProperty('qualityGates');
    expect(dict).not.toHaveProperty('bfaRegistration');
    expect(dict).not.toHaveProperty('ironRules');
  });

  it('should nest factory dependencies as snake_case dicts', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    const deps = dict.factory_dependencies as Array<Record<string, unknown>>;
    expect(deps[0]).toHaveProperty('factory_id');
    expect(deps[0]).toHaveProperty('fabric_type');
    expect(deps[0]).not.toHaveProperty('factoryId');
  });

  it('should nest AF stations as snake_case dicts', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    const stations = dict.af_stations as Array<Record<string, unknown>>;
    expect(stations[0]).toHaveProperty('station_id');
    expect(stations[0]).toHaveProperty('model_hint');
    expect(stations[0]).not.toHaveProperty('stationId');
  });

  it('should nest quality gates as snake_case dicts', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    const gates = dict.quality_gates as Array<Record<string, unknown>>;
    expect(gates[0]).toHaveProperty('gate_id');
    expect(gates[0]).toHaveProperty('check_type');
    expect(gates[0]).not.toHaveProperty('gateId');
  });

  it('should nest BFA registration with snake_case keys', () => {
    const contract = new EngineContract(minimalParams());
    const dict = contract.toDict();
    const bfa = dict.bfa_registration as Record<string, unknown>;
    expect(bfa).toHaveProperty('api_routes');
    expect(bfa).not.toHaveProperty('apiRoutes');
  });
});
