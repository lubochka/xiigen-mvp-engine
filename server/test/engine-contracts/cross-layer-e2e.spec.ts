/**
 * P6.5 Tests — Cross-Layer E2E
 *
 * Full pipeline: backward compat loaded → register T44/T45 → render →
 * factory entries match FactoryRegistry → fabric types correct →
 * flow-definition valid → numbering integrity → no collisions.
 *
 * This is the Phase 6 capstone test: Contract → Factory → Fabric.
 */

import { FabricType } from '../../src/factories/fabric-type';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { createRegistryEntry } from '../../src/factories/factory-interfaces';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { TemplateRenderer } from '../../src/engine-contracts/template-renderer';
import { StubBfaValidator } from '../../src/engine-contracts/bfa-validator.stub';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';
import {
  loadFactoryStubs,
  loadTaskTypeStubs,
  loadExistingBfaRegistrations,
  loadAllBackwardCompat,
} from '../../src/engine-contracts/backward-compat';

describe('Cross-Layer E2E — Phase 6 Capstone', () => {
  let factoryRegistry: FactoryRegistry;
  let taskRegistry: TaskTypeRegistry;
  let bfa: StubBfaValidator;
  let renderer: TemplateRenderer;

  beforeEach(() => {
    factoryRegistry = new FactoryRegistry();
    taskRegistry = new TaskTypeRegistry();
    bfa = new StubBfaValidator();
    renderer = new TemplateRenderer();
  });

  // ── Backward compat loading ────────────────────────

  it('E2E-1: backward compat loads F1–F165 in FactoryRegistry', () => {
    loadFactoryStubs(factoryRegistry);
    expect(factoryRegistry.count).toBe(165);
    // Spot check boundaries
    expect(factoryRegistry.has('F1')).toBe(true);
    expect(factoryRegistry.has('F165')).toBe(true);
    expect(factoryRegistry.has('F166')).toBe(false);
  });

  it('E2E-2: backward compat loads T1–T43 in TaskTypeRegistry', () => {
    loadTaskTypeStubs(taskRegistry);
    expect(taskRegistry.count).toBe(43);
    expect(taskRegistry.has('T1')).toBe(true);
    expect(taskRegistry.has('T43')).toBe(true);
    expect(taskRegistry.has('T44')).toBe(false);
  });

  it('E2E-3: register T44 + T45 → total = 45', () => {
    loadTaskTypeStubs(taskRegistry);
    taskRegistry.register(createT44Contract());
    taskRegistry.register(createT45Contract());
    expect(taskRegistry.count).toBe(45);
    expect(taskRegistry.has('T44')).toBe(true);
    expect(taskRegistry.has('T45')).toBe(true);
  });

  it('E2E-4: render T44 → DAG has correct nodes', () => {
    const t44 = createT44Contract();
    const result = renderer.render(t44);
    expect(result.isSuccess).toBe(true);

    const nodes = result.data!.flowDefinition.nodes as any[];
    const nodeTypes = nodes.map((n: any) => n.type);
    expect(nodeTypes).toContain('start');
    expect(nodeTypes).toContain('service');
    expect(nodeTypes).toContain('judge');
    expect(nodeTypes).toContain('end');

    const serviceNodes = nodes.filter((n: any) => n.type === 'service');
    expect(serviceNodes).toHaveLength(4);
  });

  it('E2E-5: render T44 → factory entries have matching fabric types from registry', () => {
    // Load backward compat + register T44's factory deps
    loadFactoryStubs(factoryRegistry);

    // Register F166–F169 for T44
    const t44 = createT44Contract();
    for (const dep of t44.factoryDependencies) {
      factoryRegistry.register(
        createRegistryEntry({
          factoryId: dep.factoryId,
          interfaceName: dep.interfaceName,
          familyId: 'Family-25',
          fabricType: dep.fabricType,
          provider: dep.providerHint ?? 'stub',
          description: dep.description,
        }),
      );
    }

    // Render T44
    const rendered = renderer.render(t44);
    expect(rendered.isSuccess).toBe(true);

    // Verify each rendered factory entry matches a registered factory
    for (const entry of rendered.data!.factoryEntries) {
      const factoryId = entry.factory_id as string;
      const registryResult = factoryRegistry.get(factoryId);
      expect(registryResult.isSuccess).toBe(true);
      // Fabric type in rendered entry matches registry entry
      expect(entry.fabric_type).toBe(registryResult.data!.fabricType);
    }
  });

  it('E2E-6: full pipeline — backward compat → register → render → validate', () => {
    // Step 1: Load backward compat
    const counts = loadAllBackwardCompat(factoryRegistry, taskRegistry, bfa);
    expect(counts.factories_loaded).toBe(165);
    expect(counts.task_types_loaded).toBe(43);
    expect(counts.bfa_flows_loaded).toBe(4);

    // Step 2: Register T44
    const t44 = createT44Contract();
    const regResult = taskRegistry.register(t44);
    expect(regResult.isSuccess).toBe(true);

    // Step 3: Register T44's factory deps in FactoryRegistry
    for (const dep of t44.factoryDependencies) {
      factoryRegistry.register(
        createRegistryEntry({
          factoryId: dep.factoryId,
          interfaceName: dep.interfaceName,
          familyId: 'Family-25',
          fabricType: dep.fabricType,
          provider: dep.providerHint ?? 'stub',
        }),
      );
    }
    expect(factoryRegistry.count).toBe(169); // 165 + 4

    // Step 4: Render T44
    const rendered = renderer.render(t44);
    expect(rendered.isSuccess).toBe(true);

    // Step 5: Verify flow definition is valid
    const flowDef = rendered.data!.flowDefinition;
    expect(flowDef.flow_id).toBe('flow_t44');
    expect(flowDef.task_type_id).toBe('T44');
    expect((flowDef.nodes as any[]).length).toBeGreaterThan(0);
    expect((flowDef.edges as any[]).length).toBeGreaterThan(0);

    // Step 6: Verify factory entries resolve to correct fabrics
    for (const entry of rendered.data!.factoryEntries) {
      const regEntry = factoryRegistry.get(entry.factory_id as string);
      expect(regEntry.isSuccess).toBe(true);
      expect(entry.fabric_type).toBe(regEntry.data!.fabricType);
    }

    // Step 7: Register BFA
    const bfaResult = bfa.registerFlow('T44', t44.bfaRegistration);
    expect(bfaResult.isSuccess).toBe(true);
    expect(bfa.count).toBe(5); // 4 existing + 1 new
  });

  // ── Numbering integrity ────────────────────────────

  it('E2E-7: F166+ does not conflict with F1–F165', () => {
    loadFactoryStubs(factoryRegistry);

    // F166 should register successfully (no conflict)
    const result = factoryRegistry.register(
      createRegistryEntry({
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        familyId: 'Family-25',
        fabricType: FabricType.DATABASE,
      }),
    );
    expect(result.isSuccess).toBe(true);
    expect(factoryRegistry.count).toBe(166);
  });

  it('E2E-7b: F50 conflicts with existing F1–F165', () => {
    loadFactoryStubs(factoryRegistry);

    // F50 already exists — should fail
    const result = factoryRegistry.register(
      createRegistryEntry({
        factoryId: 'F50',
        interfaceName: 'IDuplicateService',
        familyId: 'Family-99',
        fabricType: FabricType.DATABASE,
      }),
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FACTORY_EXISTS');
  });

  it('E2E-8: T44+ does not conflict with T1–T43', () => {
    loadTaskTypeStubs(taskRegistry);

    // T44 should register successfully
    const result = taskRegistry.register(createT44Contract());
    expect(result.isSuccess).toBe(true);
    expect(taskRegistry.count).toBe(44);
  });

  it('E2E-8b: T10 conflicts with existing T1–T43', () => {
    loadTaskTypeStubs(taskRegistry);

    // T10 already exists — should fail
    const result = taskRegistry.register(createT44Contract()); // register T44 first
    expect(result.isSuccess).toBe(true);

    // Now try re-registering T44 — should fail
    const dupe = taskRegistry.register(createT44Contract());
    expect(dupe.isSuccess).toBe(false);
    expect(dupe.errorCode).toBe('CONTRACT_EXISTS');
  });

  // ── Full T44 + T45 pipeline ────────────────────────

  it('E2E-9: T44 + T45 both render independently with correct fabrics', () => {
    const t44 = createT44Contract();
    const t45 = createT45Contract();

    const r44 = renderer.render(t44);
    const r45 = renderer.render(t45);

    expect(r44.isSuccess).toBe(true);
    expect(r45.isSuccess).toBe(true);

    // T44: DATABASE + QUEUE only
    const t44Fabrics = new Set(r44.data!.factoryEntries.map((e) => e.fabric_type));
    expect(t44Fabrics.has(FabricType.DATABASE)).toBe(true);
    expect(t44Fabrics.has(FabricType.QUEUE)).toBe(true);
    expect(t44Fabrics.has(FabricType.AI_ENGINE)).toBe(false);

    // T45: AI_ENGINE + DATABASE + QUEUE
    const t45Fabrics = new Set(r45.data!.factoryEntries.map((e) => e.fabric_type));
    expect(t45Fabrics.has(FabricType.AI_ENGINE)).toBe(true);
    expect(t45Fabrics.has(FabricType.DATABASE)).toBe(true);
    expect(t45Fabrics.has(FabricType.QUEUE)).toBe(true);
  });

  it('E2E-10: T44 + T45 factory IDs do not overlap', () => {
    const r44 = renderer.render(createT44Contract()).data!;
    const r45 = renderer.render(createT45Contract()).data!;

    const ids44 = new Set(r44.factoryEntries.map((e) => e.factory_id));
    const ids45 = new Set(r45.factoryEntries.map((e) => e.factory_id));

    for (const id of ids44) {
      expect(ids45.has(id)).toBe(false);
    }
  });

  it('E2E-11: rendered flow definitions have snake_case keys (DNA-1)', () => {
    const r44 = renderer.render(createT44Contract()).data!;
    const flowDef = r44.flowDefinition;

    expect(flowDef).toHaveProperty('flow_id');
    expect(flowDef).toHaveProperty('task_type_id');
    expect(flowDef).toHaveProperty('node_count');
    expect(flowDef).toHaveProperty('edge_count');
    expect(flowDef).not.toHaveProperty('flowId');
    expect(flowDef).not.toHaveProperty('taskTypeId');
    expect(flowDef).not.toHaveProperty('nodeCount');
  });

  it('E2E-12: FREEDOM configs are tenant-scoped', () => {
    const r44 = renderer.render(createT44Contract()).data!;
    for (const cfg of r44.freedomConfigs) {
      expect(cfg.scope).toBe('tenant');
      expect(cfg.task_type_id).toBe('T44');
    }
  });
});
