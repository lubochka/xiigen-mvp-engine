/**
 * P6.4 Tests — TemplateRenderer + BFA Stub + Module Wiring
 *
 * Tests: render T44 (DAG nodes/edges, factory entries, freedom configs),
 * render T45 (different archetype, AI_ENGINE entries),
 * render invalid contract → failure, DNA-1 compliance on all outputs,
 * StubBfaValidator behavior, EngineContractsModule wiring.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FabricType } from '../../src/factories/fabric-type';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { EngineContract } from '../../src/engine-contracts/contract-schema';
import { TemplateRenderer } from '../../src/engine-contracts/template-renderer';
import { StubBfaValidator } from '../../src/engine-contracts/bfa-validator.stub';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';

// ══════════════════════════════════════════════════════
// TemplateRenderer — T44
// ══════════════════════════════════════════════════════

describe('TemplateRenderer — T44', () => {
  let renderer: TemplateRenderer;
  const t44 = createT44Contract();

  beforeEach(() => {
    renderer = new TemplateRenderer();
  });

  it('should render successfully', () => {
    const result = renderer.render(t44);
    expect(result.isSuccess).toBe(true);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = renderer.render(t44);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  // ── Flow Definition ──

  it('should produce flow_definition with correct flow_id', () => {
    const output = renderer.render(t44).data!;
    expect(output.flowDefinition.flow_id).toBe('flow_t44');
  });

  it('should produce flow_definition with task_type_id', () => {
    const output = renderer.render(t44).data!;
    expect(output.flowDefinition.task_type_id).toBe('T44');
  });

  it('should produce flow_definition with archetype', () => {
    const output = renderer.render(t44).data!;
    expect(output.flowDefinition.archetype).toBe(ContractArchetype.DATA_PIPELINE);
  });

  it('should produce DAG with correct node count (start + 4 services + judge + end = 7)', () => {
    const output = renderer.render(t44).data!;
    const nodes = output.flowDefinition.nodes as any[];
    expect(nodes).toHaveLength(7);
    expect(output.flowDefinition.node_count).toBe(7);
  });

  it('should have start node', () => {
    const nodes = renderer.render(t44).data!.flowDefinition.nodes as any[];
    const start = nodes.find((n: any) => n.node_id === 'start');
    expect(start).toBeDefined();
    expect(start.type).toBe('start');
  });

  it('should have 4 service nodes (one per factory dep)', () => {
    const nodes = renderer.render(t44).data!.flowDefinition.nodes as any[];
    const serviceNodes = nodes.filter((n: any) => n.type === 'service');
    expect(serviceNodes).toHaveLength(4);
  });

  it('should have service nodes with factory_id and fabric_type', () => {
    const nodes = renderer.render(t44).data!.flowDefinition.nodes as any[];
    const serviceNodes = nodes.filter((n: any) => n.type === 'service');
    for (const node of serviceNodes) {
      expect(node.factory_id).toBeTruthy();
      expect(node.fabric_type).toBeTruthy();
    }
  });

  it('should have judge_gate node', () => {
    const nodes = renderer.render(t44).data!.flowDefinition.nodes as any[];
    const judge = nodes.find((n: any) => n.node_id === 'judge_gate');
    expect(judge).toBeDefined();
    expect(judge.type).toBe('judge');
    expect(judge.quality_gates).toHaveLength(5);
  });

  it('should have end node', () => {
    const nodes = renderer.render(t44).data!.flowDefinition.nodes as any[];
    const end = nodes.find((n: any) => n.node_id === 'end');
    expect(end).toBeDefined();
    expect(end.type).toBe('end');
  });

  it('should produce correct edge count (4 start→svc + 4 svc→judge + 1 judge→end = 9)', () => {
    const output = renderer.render(t44).data!;
    const edges = output.flowDefinition.edges as any[];
    expect(edges).toHaveLength(9);
    expect(output.flowDefinition.edge_count).toBe(9);
  });

  it('should have edges from start to each service', () => {
    const edges = renderer.render(t44).data!.flowDefinition.edges as any[];
    const startEdges = edges.filter((e: any) => e.from === 'start');
    expect(startEdges).toHaveLength(4);
  });

  it('should have edges from each service to judge_gate', () => {
    const edges = renderer.render(t44).data!.flowDefinition.edges as any[];
    const judgeEdges = edges.filter((e: any) => e.to === 'judge_gate');
    expect(judgeEdges).toHaveLength(4);
  });

  it('should have edge from judge_gate to end', () => {
    const edges = renderer.render(t44).data!.flowDefinition.edges as any[];
    const endEdge = edges.find((e: any) => e.from === 'judge_gate' && e.to === 'end');
    expect(endEdge).toBeDefined();
  });

  // ── Factory Entries ──

  it('should produce 4 factory entries', () => {
    const output = renderer.render(t44).data!;
    expect(output.factoryEntries).toHaveLength(4);
  });

  it('should produce factory entries with snake_case keys (DNA-1)', () => {
    const entries = renderer.render(t44).data!.factoryEntries;
    for (const entry of entries) {
      expect(entry).toHaveProperty('factory_id');
      expect(entry).toHaveProperty('interface_name');
      expect(entry).toHaveProperty('fabric_type');
      expect(entry).toHaveProperty('resolution');
      expect(entry).not.toHaveProperty('factoryId');
    }
  });

  it('should produce factory entries with status GENERATED', () => {
    const entries = renderer.render(t44).data!.factoryEntries;
    for (const entry of entries) {
      expect(entry.status).toBe('GENERATED');
    }
  });

  it('should produce factory entries with resolution string', () => {
    const entries = renderer.render(t44).data!.factoryEntries;
    const first = entries[0];
    expect(first.resolution).toContain('F166');
    expect(first.resolution).toContain('DATABASE FABRIC');
  });

  // ── FREEDOM Configs ──

  it('should produce 4 freedom configs (one per freedom_component)', () => {
    const output = renderer.render(t44).data!;
    expect(output.freedomConfigs).toHaveLength(4);
  });

  it('should produce freedom configs with snake_case keys', () => {
    const configs = renderer.render(t44).data!.freedomConfigs;
    for (const cfg of configs) {
      expect(cfg).toHaveProperty('config_id');
      expect(cfg).toHaveProperty('task_type_id');
      expect(cfg).toHaveProperty('component_name');
      expect(cfg).toHaveProperty('scope');
      expect(cfg.scope).toBe('tenant');
    }
  });

  it('should produce freedom config IDs with task type prefix', () => {
    const configs = renderer.render(t44).data!.freedomConfigs;
    for (const cfg of configs) {
      expect((cfg.config_id as string).startsWith('freedom_t44_')).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════
// TemplateRenderer — T45
// ══════════════════════════════════════════════════════

describe('TemplateRenderer — T45', () => {
  let renderer: TemplateRenderer;
  const t45 = createT45Contract();

  beforeEach(() => {
    renderer = new TemplateRenderer();
  });

  it('should render successfully', () => {
    const result = renderer.render(t45);
    expect(result.isSuccess).toBe(true);
  });

  it('should have different archetype from T44 in flow definition', () => {
    const output = renderer.render(t45).data!;
    expect(output.flowDefinition.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('should have AI_ENGINE fabric entries', () => {
    const entries = renderer.render(t45).data!.factoryEntries;
    const aiEntries = entries.filter((e) => e.fabric_type === FabricType.AI_ENGINE);
    expect(aiEntries.length).toBeGreaterThan(0);
  });

  it('should produce 4 factory entries for F170–F173', () => {
    const entries = renderer.render(t45).data!.factoryEntries;
    const ids = entries.map((e) => e.factory_id);
    expect(ids).toEqual(['F170', 'F171', 'F172', 'F173']);
  });

  it('should produce 4 freedom configs', () => {
    const configs = renderer.render(t45).data!.freedomConfigs;
    expect(configs).toHaveLength(4);
  });
});

// ══════════════════════════════════════════════════════
// TemplateRenderer — Invalid Contract
// ══════════════════════════════════════════════════════

describe('TemplateRenderer — Invalid Contract', () => {
  let renderer: TemplateRenderer;

  beforeEach(() => {
    renderer = new TemplateRenderer();
  });

  it('should return failure for invalid contract', () => {
    const bad = new EngineContract({
      taskTypeId: '',
      name: '',
      archetype: ContractArchetype.SERVICE,
      entry: '',
      purpose: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
    });
    const result = renderer.render(bad);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RENDER_VALIDATION_FAILED');
  });

  it('should include contract ID in error message', () => {
    const bad = new EngineContract({
      taskTypeId: 'T999',
      name: '',
      archetype: ContractArchetype.SERVICE,
      entry: '',
      purpose: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
    });
    const result = renderer.render(bad);
    expect(result.errorMessage).toContain('T999');
  });
});

// ══════════════════════════════════════════════════════
// StubBfaValidator
// ══════════════════════════════════════════════════════

describe('StubBfaValidator', () => {
  let bfa: StubBfaValidator;

  beforeEach(() => {
    bfa = new StubBfaValidator();
  });

  it('should return no conflicts on checkConflicts', () => {
    const result = bfa.checkConflicts('T44', {
      entities: ['test'],
      events: ['test.event'],
      apiRoutes: ['/api/test'],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('should register flow successfully', () => {
    const reg = { entities: ['e1'], events: ['ev1'], apiRoutes: ['/api/e1'] };
    const result = bfa.registerFlow('T44', reg);
    expect(result.isSuccess).toBe(true);
  });

  it('should track registered flows', () => {
    const reg = { entities: ['e1'], events: ['ev1'], apiRoutes: ['/api/e1'] };
    bfa.registerFlow('T44', reg);
    bfa.registerFlow('T45', reg);
    expect(bfa.count).toBe(2);
  });

  it('should return registered data', () => {
    const reg = { entities: ['e1'], events: ['ev1'], apiRoutes: ['/api/e1'] };
    bfa.registerFlow('T44', reg);
    const registered = bfa.getRegistered();
    expect(registered.has('T44')).toBe(true);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = bfa.checkConflicts('T44', { entities: [], events: [], apiRoutes: [] });
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
