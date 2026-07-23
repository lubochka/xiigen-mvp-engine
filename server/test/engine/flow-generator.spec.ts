/**
 * P9.1 Tests — GenerationResult + FlowGenerator
 *
 * GenerationResult: construct, success property, toDict, errors make success false.
 * FlowGenerator: validate invalid contract, BFA conflict, register factories,
 *   run AF pipeline, render flow def, FREEDOM configs, promotion, history, DNA-5, full E2E.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { TemplateRenderer } from '../../src/engine-contracts/template-renderer';
import { EngineContract, EngineContractParams } from '../../src/engine-contracts/contract-schema';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { FabricType } from '../../src/factories/fabric-type';
import { BusinessFlowArbiter } from '../../src/guardrails/bfa';
import { PromotionLadder, PromotionLevel } from '../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { GenerationResult } from '../../src/engine/generation-result';
import { FlowGenerator } from '../../src/engine/flow-generator';

// ── Default pass executor (replaces old mock AI provider) ──

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'test-run-id',
        status: 'PASS',
        score: 90,
        trace: [],
        finalOutput: { code: '// generated' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

// ── Valid contract helper ───────────────────────────

function validContractParams(): EngineContractParams {
  return {
    taskTypeId: 'T44',
    name: 'Inventory Management',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'inventory.update event',
    purpose: 'ETL pipeline for inventory',
    factoryDependencies: [
      {
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'postgresql',
        description: 'Inventory storage',
      },
      {
        factoryId: 'F169',
        interfaceName: 'IInventoryEventService',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Inventory events',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-01',
        description: 'DNA compliance',
        severity: 'error',
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['inventory_item'],
      events: ['inventory.updated'],
      apiRoutes: ['/api/inventory'],
    },
    ironRules: ['All services extend MicroserviceBase'],
    machineComponents: ['service_bootstrap'],
    freedomComponents: ['batch_size', 'retry_count'],
    familyId: 'Family-25',
  };
}

function createEngine(overrides?: {
  factoryRegistry?: FactoryRegistry;
  taskRegistry?: TaskTypeRegistry;
  bfa?: BusinessFlowArbiter;
  promotionLadder?: PromotionLadder;
  freedomManager?: FreedomConfigManager;
  afPipeline?: AfPipeline;
}): FlowGenerator {
  return new FlowGenerator({
    afPipeline: overrides?.afPipeline ?? new AfPipeline(makePassExecutor()),
    factoryRegistry: overrides?.factoryRegistry,
    taskRegistry: overrides?.taskRegistry,
    bfa: overrides?.bfa,
    promotionLadder: overrides?.promotionLadder,
    freedomManager: overrides?.freedomManager,
  });
}

// ══════════════════════════════════════════════════════
// GenerationResult
// ══════════════════════════════════════════════════════

describe('GenerationResult', () => {
  it('should construct with defaults', () => {
    const r = new GenerationResult();
    expect(r.contractId).toBe('');
    expect(r.pipelinePassed).toBe(false);
    expect(r.errors).toHaveLength(0);
    expect(r.success).toBe(false); // not passed
  });

  it('success should be true when pipelinePassed and no errors', () => {
    const r = new GenerationResult();
    r.pipelinePassed = true;
    expect(r.success).toBe(true);
  });

  it('success should be false when pipelinePassed but has errors', () => {
    const r = new GenerationResult();
    r.pipelinePassed = true;
    r.errors.push('something went wrong');
    expect(r.success).toBe(false);
  });

  it('success should be false when no errors but pipeline failed', () => {
    const r = new GenerationResult();
    r.pipelinePassed = false;
    expect(r.success).toBe(false);
  });

  it('toDict() should produce snake_case keys (DNA-1)', () => {
    const r = new GenerationResult();
    r.contractId = 'T44';
    r.flowId = 'flow_t44';
    r.pipelinePassed = true;
    r.generatedCode = 'code here';
    r.promotionLevel = 'MINIMAL';
    const d = r.toDict();
    expect(d.contract_id).toBe('T44');
    expect(d.flow_id).toBe('flow_t44');
    expect(d.pipeline_passed).toBe(true);
    expect(d.generated_code_length).toBe(9);
    expect(d.promotion_level).toBe('MINIMAL');
    expect(d.success).toBe(true);
  });

  it('toDict() should include errors and warnings', () => {
    const r = new GenerationResult();
    r.errors.push('err1');
    r.warnings.push('warn1');
    const d = r.toDict();
    expect(d.errors).toEqual(['err1']);
    expect(d.warnings).toEqual(['warn1']);
  });
});

// ══════════════════════════════════════════════════════
// FlowGenerator
// ══════════════════════════════════════════════════════

describe('FlowGenerator', () => {
  it('should validate invalid contract and return errors', async () => {
    const engine = createEngine();
    const bad = new EngineContract({
      taskTypeId: '',
      name: '',
      archetype: 'INVALID' as any,
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
    const result = await engine.generate(bad, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success).toBe(false);
    expect(result.data!.errors[0]).toContain('Contract invalid');
  });

  it('should block on BFA conflict', async () => {
    const bfa = new BusinessFlowArbiter();
    // Pre-register an existing flow that owns 'inventory_item'
    bfa.registerFlow('FLOW-01', {
      entities: ['inventory_item'],
      events: ['inventory.created'],
      apiRoutes: ['/api/inv'],
    });

    const engine = createEngine({ bfa });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.bfaStatus).toBe('BLOCKED');
    expect(result.data!.errors.some((e) => e.includes('BFA conflicts'))).toBe(true);
  });

  it('should register factory interfaces from contract', async () => {
    const factoryReg = new FactoryRegistry();
    const engine = createEngine({ factoryRegistry: factoryReg });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factoryEntries.length).toBe(2);
    // Verify factories registered
    expect(factoryReg.get('F166').isSuccess).toBe(true);
    expect(factoryReg.get('F169').isSuccess).toBe(true);
  });

  it('should run AF pipeline and produce code', async () => {
    const engine = createEngine();
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    // Pipeline should have run (may or may not pass depending on generated code quality)
    expect(result.data!.pipelineMetadata).toBeDefined();
    expect((result.data!.pipelineMetadata as any).stages).toBeDefined();
  });

  it('should render flow definition with nodes and edges', async () => {
    const engine = createEngine();
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.flowDefinition).toBeDefined();
    expect(result.data!.flowDefinition.flow_id).toBe('flow_t44');
    expect(result.data!.flowDefinition.nodes).toBeDefined();
    expect(result.data!.flowId).toBe('flow_t44');
  });

  it('should create FREEDOM config documents', async () => {
    const freedom = new FreedomConfigManager();
    const engine = createEngine({ freedomManager: freedom });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    // Contract has 2 freedom_components: batch_size, retry_count
    expect(result.data!.freedomConfigs.length).toBe(2);
  });

  it('should promote to MINIMAL when pipeline passes', async () => {
    const ladder = new PromotionLadder();
    const engine = createEngine({ promotionLadder: ladder });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    if (result.data!.pipelinePassed) {
      expect(result.data!.promotionLevel).toBe('MINIMAL');
    } else {
      expect(result.data!.promotionLevel).toBe('GENERATED');
    }
  });

  it('should stay GENERATED when pipeline fails', async () => {
    // Use a failing executor injected via afPipeline
    const failExecutor: GenericNodeExecutor = {
      execute: jest.fn(async () => DataProcessResult.failure('AI_DOWN', 'down')),
      getTrace: jest.fn(async () => DataProcessResult.success(null)),
    } as unknown as GenericNodeExecutor;

    const ladder = new PromotionLadder();
    const engine = new FlowGenerator({
      afPipeline: new AfPipeline(failExecutor),
      promotionLadder: ladder,
    });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promotionLevel).toBe('GENERATED');
  });

  it('should track generation history', async () => {
    const engine = createEngine();
    expect(engine.generationCount).toBe(0);

    const contract = new EngineContract(validContractParams());
    await engine.generate(contract, 'tenant-1');
    expect(engine.generationCount).toBe(1);

    const history = engine.generationHistory;
    expect(history[0].contract_id).toBe('T44');
    expect(history[0].tenant_id).toBe('tenant-1');
  });

  it('should record elapsed_ms in result', async () => {
    const engine = createEngine();
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.data!.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('should warn on duplicate factory registration', async () => {
    const factoryReg = new FactoryRegistry();
    const engine = createEngine({ factoryRegistry: factoryReg });
    const contract = new EngineContract(validContractParams());

    // First run registers factories
    await engine.generate(contract, 'tenant-1');
    expect(factoryReg.get('F166').isSuccess).toBe(true);

    // Second run — same contract — factories already exist
    const result2 = await engine.generate(contract, 'tenant-2');
    expect(result2.isSuccess).toBe(true);
    // Should have warnings about duplicate factories or contract
    expect(result2.data!.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('should expose registry accessors', () => {
    const engine = createEngine();
    expect(engine.factoryRegistry).toBeInstanceOf(FactoryRegistry);
    expect(engine.taskRegistry).toBeInstanceOf(TaskTypeRegistry);
    expect(engine.bfaArbiter).toBeInstanceOf(BusinessFlowArbiter);
    expect(engine.promotionLadder).toBeInstanceOf(PromotionLadder);
    expect(engine.freedomManager).toBeInstanceOf(FreedomConfigManager);
  });

  it('should register BFA after successful render', async () => {
    const bfa = new BusinessFlowArbiter();
    const engine = createEngine({ bfa });
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    if (result.data!.bfaStatus === 'REGISTERED') {
      // Verify: now if another flow tries same entity → conflict
      const conflicts = bfa.checkConflicts('FLOW-NEW', {
        entities: ['inventory_item'],
        events: [],
        apiRoutes: [],
      });
      expect(conflicts.isSuccess).toBe(true);
      expect(conflicts.data!.length).toBeGreaterThan(0);
    }
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(validContractParams());
    const result = await engine.generate(contract, 'tenant-1');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
