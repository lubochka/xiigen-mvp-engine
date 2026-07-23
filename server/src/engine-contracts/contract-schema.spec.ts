/**
 * contract-schema.spec.ts — S1 schema extension tests.
 *
 * Verifies that all new optional fields on EngineContract are accepted
 * without breaking existing contracts.
 */
import {
  IronRuleSpec,
  MachineConstantSpec,
  HandlerSpec,
  CrossFlowFactorySpec,
  GateEventSpec,
  EngineContract,
  EngineContractParams,
} from './contract-schema';
import { ContractArchetype } from './archetypes';
import { FabricType } from '../factories/fabric-type';

// ── Minimal valid params shared across tests ──────────────────────────────────
const minimalParams: EngineContractParams = {
  taskTypeId: 'T-SPEC-1',
  name: 'Schema Spec Contract',
  archetype: ContractArchetype.SERVICE,
  entry: 'HTTP POST /test',
  purpose: 'Spec validation only',
  factoryDependencies: [
    {
      factoryId: 'F-SPEC-1',
      interfaceName: 'ISpecService',
      fabricType: FabricType.DATABASE,
      description: 'Test dependency',
    },
  ],
  afStations: [],
  qualityGates: [
    {
      gateId: 'QG-SPEC-1',
      description: 'Spec gate',
      severity: 'error',
      checkType: 'dna_compliance',
    },
  ],
  bfaRegistration: { entities: [], events: [], apiRoutes: [] },
  ironRules: ['No direct DB imports'],
  machineComponents: [],
  freedomComponents: [],
};

// ── IronRuleSpec ──────────────────────────────────────────────────────────────
describe('IronRuleSpec', () => {
  it('accepts minimal required fields', () => {
    const rule: IronRuleSpec = {
      id: 'IR-1',
      description: 'Test rule',
    };
    expect(rule.id).toBe('IR-1');
    expect(rule.description).toBe('Test rule');
  });

  it('accepts full IronRuleSpec with all optional fields', () => {
    const rule: IronRuleSpec = {
      id: 'IR-2',
      description: 'Full rule',
      check: 'throttle_decorator_present',
      parameters: { minMs: 100 },
      scopeRequirement: { fields: ['tenantId'], appliesTo: ['user'] },
      authorizationGate: { requiredCallerRole: 'admin', selfActionBlocked: true },
      enumConstraint: { field: 'status', values: ['active', 'inactive'] },
    };
    expect(rule.check).toBe('throttle_decorator_present');
    expect(rule.scopeRequirement?.fields).toContain('tenantId');
    expect(rule.authorizationGate?.selfActionBlocked).toBe(true);
    expect(rule.enumConstraint?.values).toHaveLength(2);
  });
});

// ── MachineConstantSpec ───────────────────────────────────────────────────────
describe('MachineConstantSpec', () => {
  it('accepts numeric constant with neverFromConfig', () => {
    const mc: MachineConstantSpec = {
      key: 'ttl',
      value: 60,
      type: 'constant',
      neverFromConfig: true,
    };
    expect(mc.neverFromConfig).toBe(true);
    expect(mc.value).toBe(60);
  });

  it('accepts string array value', () => {
    const mc: MachineConstantSpec = {
      key: 'stages',
      value: ['pending', 'active', 'closed'],
      type: 'ordering',
    };
    expect(Array.isArray(mc.value)).toBe(true);
  });

  it('accepts state_machine type', () => {
    const mc: MachineConstantSpec = {
      key: 'transitions',
      value: 'DRAFT->ACTIVE',
      type: 'state_machine',
    };
    expect(mc.type).toBe('state_machine');
  });
});

// ── HandlerSpec ───────────────────────────────────────────────────────────────
describe('HandlerSpec', () => {
  it('accepts minimal handler', () => {
    const h: HandlerSpec = { name: 'ValidationHandler' };
    expect(h.name).toBe('ValidationHandler');
  });

  it('accepts full handler with conditionBehavior', () => {
    const h: HandlerSpec = {
      name: 'OptionalEnrichmentHandler',
      order: 3,
      condition: 'input.hasAddress',
      conditionBehavior: 'skip_if_false',
    };
    expect(h.conditionBehavior).toBe('skip_if_false');
    expect(h.order).toBe(3);
  });

  it('accepts fail_if_false conditionBehavior', () => {
    const h: HandlerSpec = {
      name: 'RequiredGateHandler',
      conditionBehavior: 'fail_if_false',
    };
    expect(h.conditionBehavior).toBe('fail_if_false');
  });
});

// ── CrossFlowFactorySpec ──────────────────────────────────────────────────────
describe('CrossFlowFactorySpec', () => {
  it('accepts required fields only', () => {
    const spec: CrossFlowFactorySpec = { factoryId: 'F200', fromFlow: 'FLOW-29' };
    expect(spec.factoryId).toBe('F200');
  });

  it('accepts all optional fields', () => {
    const spec: CrossFlowFactorySpec = {
      factoryId: 'F300',
      fromFlow: 'FLOW-33',
      fallback: 'register_if_absent',
      dependencyType: 'cross-wave-hard',
    };
    expect(spec.fallback).toBe('register_if_absent');
    expect(spec.dependencyType).toBe('cross-wave-hard');
  });
});

// ── GateEventSpec ─────────────────────────────────────────────────────────────
describe('GateEventSpec', () => {
  it('accepts gate event with blocksDownstream', () => {
    const ev: GateEventSpec = {
      eventType: 'user.registered',
      emittedBy: 'T47',
      blocksDownstream: true,
    };
    expect(ev.blocksDownstream).toBe(true);
  });
});

// ── EngineContract S1 extensions ──────────────────────────────────────────────
describe('EngineContract S1 extensions', () => {
  it('constructs without any S1 fields (backward compat)', () => {
    const contract = new EngineContract(minimalParams);
    expect(contract.taskTypeId).toBe('T-SPEC-1');
    expect(contract.ironRulesStructured).toBeUndefined();
    expect(contract.handlers).toBeUndefined();
    expect(contract.machineConstants).toBeUndefined();
    expect(contract.arbiters).toBeUndefined();
    expect(contract.gateEvent).toBeUndefined();
    expect(contract.executionModel).toBeUndefined();
    expect(contract.entryType).toBeUndefined();
    expect(contract.pureFunction).toBeUndefined();
    expect(contract.failureBehavior).toBeUndefined();
    expect(contract.machineFreedom).toBeUndefined();
  });

  it('stores ironRulesStructured alongside string ironRules', () => {
    const structured: IronRuleSpec[] = [
      { id: 'IR-1', description: 'No direct DB imports', check: 'no_direct_db_import' },
    ];
    const contract = new EngineContract({ ...minimalParams, ironRulesStructured: structured });
    expect(contract.ironRules).toContain('No direct DB imports');
    expect(contract.ironRulesStructured).toHaveLength(1);
    expect(contract.ironRulesStructured![0].id).toBe('IR-1');
  });

  it('stores all S1 optional fields', () => {
    const contract = new EngineContract({
      ...minimalParams,
      handlers: [{ name: 'ValidationHandler', order: 1 }],
      machineConstants: [{ key: 'ttl', value: 3600, type: 'constant', neverFromConfig: true }],
      arbiters: ['ARB-1', 'ARB-2'],
      gateEvent: { eventType: 'user.registered', emittedBy: 'T47', blocksDownstream: true },
      crossFlowFactoryDependencies: [{ factoryId: 'F200', fromFlow: 'FLOW-29', fallback: 'error' }],
      executionModel: 'pipeline',
      entryType: 'HTTP',
      pureFunction: false,
      failureBehavior: 'FAIL_CLOSED',
      machineFreedom: { machine: ['state-transitions'], freedom: ['timeout_ms'] },
    });

    expect(contract.handlers).toHaveLength(1);
    expect(contract.machineConstants![0].neverFromConfig).toBe(true);
    expect(contract.arbiters).toEqual(['ARB-1', 'ARB-2']);
    expect(contract.gateEvent?.blocksDownstream).toBe(true);
    expect(contract.crossFlowFactoryDependencies![0].fallback).toBe('error');
    expect(contract.executionModel).toBe('pipeline');
    expect(contract.entryType).toBe('HTTP');
    expect(contract.pureFunction).toBe(false);
    expect(contract.failureBehavior).toBe('FAIL_CLOSED');
    expect(contract.machineFreedom?.freedom).toContain('timeout_ms');
  });

  it('toDict() includes S1 fields only when set', () => {
    const contract = new EngineContract({
      ...minimalParams,
      executionModel: 'inline-pure',
      arbiters: ['ARB-99'],
    });
    const dict = contract.toDict();
    expect(dict['execution_model']).toBe('inline-pure');
    expect(dict['arbiters']).toEqual(['ARB-99']);
    // fields not set should be absent
    expect(dict['handlers']).toBeUndefined();
    expect(dict['machine_constants']).toBeUndefined();
  });

  it('archetype accepts unknown string without validation error', () => {
    const contract = new EngineContract({
      ...minimalParams,
      archetype: 'FUTURE_ARCHETYPE_2035',
    });
    // validate() should not return failure due to unknown archetype
    const result = contract.validate();
    expect(result.isSuccess).toBe(true);
    expect(typeof contract.archetype).toBe('string');
  });

  it('toDict() serialises S1 cross_flow_factory_dependencies', () => {
    const contract = new EngineContract({
      ...minimalParams,
      crossFlowFactoryDependencies: [
        {
          factoryId: 'F300',
          fromFlow: 'FLOW-33',
          fallback: 'register_if_absent',
          dependencyType: 'flow-owned',
        },
      ],
    });
    const dict = contract.toDict();
    const deps = dict['cross_flow_factory_dependencies'] as CrossFlowFactorySpec[];
    expect(deps).toHaveLength(1);
    expect(deps[0].dependencyType).toBe('flow-owned');
  });
});
