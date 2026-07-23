/**
 * P9.4 Tests — EngineController + EngineModule + BootstrapModule + ApiModule
 *
 * EngineController: POST generate valid/invalid contract, history, status,
 *   contracts list, get single contract, DNA-5 check.
 * Module wiring: all 4 modules instantiable with correct imports/exports.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { EngineContract, EngineContractParams } from '../../src/engine-contracts/contract-schema';
import { FabricType } from '../../src/factories/fabric-type';
import { FlowGenerator } from '../../src/engine/flow-generator';
import { EngineController } from '../../src/api/engine.controller';
import { EngineModule } from '../../src/engine/engine.module';
import { BootstrapModule } from '../../src/bootstrap/bootstrap.module';
import { ApiModule } from '../../src/api/api.module';

// ── Mock pass executor ──────────────────────────────

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

// ── Valid contract params ───────────────────────────

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
    freedomComponents: ['batch_size'],
    familyId: 'Family-25',
  };
}

function createEngineAndController(): { engine: FlowGenerator; controller: EngineController } {
  const engine = new FlowGenerator({ afPipeline: new AfPipeline(makePassExecutor()) });
  // Downstream services (intake, extractor, crud, tests, difficulty) are not
  // exercised by these controller tests — pass null stubs for the extra args.
  const controller = new EngineController(
    engine,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any,
  );
  return { engine, controller };
}

// ══════════════════════════════════════════════════════
// EngineController
// ══════════════════════════════════════════════════════

describe('EngineController', () => {
  it('should generate with valid contract', async () => {
    const { controller } = createEngineAndController();
    const result = await controller.generate('tenant-1', validContractParams());
    expect(result.isSuccess).toBe(true);
    expect(result.data!.contract_id).toBe('T44');
    expect(result.data!.flow_id).toBeDefined();
  });

  it('should fail with invalid contract', async () => {
    const { controller } = createEngineAndController();
    const result = await controller.generate('tenant-1', {
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
    expect(result.isSuccess).toBe(true);
    // FlowGenerator returns success with errors in the GenerationResult
    expect(result.data!.success).toBe(false);
    expect((result.data!.errors as string[]).length).toBeGreaterThan(0);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const { controller } = createEngineAndController();
    const result = await controller.generate('', validContractParams());
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should return generation history', async () => {
    const { controller } = createEngineAndController();
    await controller.generate('tenant-1', validContractParams());

    const history = await controller.history();
    expect(history.isSuccess).toBe(true);
    expect(history.data!.length).toBe(1);
    expect(history.data![0].contract_id).toBe('T44');
    expect(history.data![0].tenant_id).toBe('tenant-1');
  });

  it('should return empty history when no runs', async () => {
    const { controller } = createEngineAndController();
    const history = await controller.history();
    expect(history.isSuccess).toBe(true);
    expect(history.data!.length).toBe(0);
  });

  it('should return engine status', async () => {
    const { controller } = createEngineAndController();
    await controller.generate('tenant-1', validContractParams());

    const status = await controller.status();
    expect(status.isSuccess).toBe(true);
    expect(status.data!.generation_count).toBe(1);
    expect(status.data!.factory_count).toBeGreaterThanOrEqual(1);
    expect(status.data!.task_type_count).toBeGreaterThanOrEqual(1);
    expect(status.data!.timestamp).toBeDefined();
  });

  it('should return zero counts initially', async () => {
    const { controller } = createEngineAndController();
    const status = await controller.status();
    expect(status.isSuccess).toBe(true);
    expect(status.data!.generation_count).toBe(0);
    expect(status.data!.task_type_count).toBe(0);
  });

  it('should list registered contracts after generation', async () => {
    const { controller } = createEngineAndController();
    await controller.generate('tenant-1', validContractParams());

    const contracts = await controller.listContracts();
    expect(contracts.isSuccess).toBe(true);
    expect(contracts.data!.length).toBeGreaterThanOrEqual(1);
    expect(contracts.data![0].task_type_id).toBe('T44');
  });

  it('should list empty contracts initially', async () => {
    const { controller } = createEngineAndController();
    const contracts = await controller.listContracts();
    expect(contracts.isSuccess).toBe(true);
    expect(contracts.data!.length).toBe(0);
  });

  it('should get single contract by ID', async () => {
    const { controller } = createEngineAndController();
    await controller.generate('tenant-1', validContractParams());

    const result = await controller.getContract('T44');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.task_type_id).toBe('T44');
    expect(result.data!.archetype).toBe(ContractArchetype.DATA_PIPELINE);
  });

  it('should fail getting non-existent contract', async () => {
    const { controller } = createEngineAndController();
    const result = await controller.getContract('T999');
    expect(result.isSuccess).toBe(false);
  });

  it('should reject missing ID on getContract', async () => {
    const { controller } = createEngineAndController();
    const result = await controller.getContract('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ID');
  });

  it('should track multiple generations in history', async () => {
    const { controller } = createEngineAndController();

    // First generation
    await controller.generate('tenant-1', validContractParams());

    // Second generation with different task type
    const params2 = { ...validContractParams(), taskTypeId: 'T45', name: 'Second Flow' };
    params2.factoryDependencies = [
      {
        factoryId: 'F170',
        interfaceName: 'ICooperatorService',
        fabricType: FabricType.RAG,
        description: 'Coop',
      },
    ];
    params2.bfaRegistration = {
      entities: ['coop'],
      events: ['coop.created'],
      apiRoutes: ['/api/coop'],
    };
    await controller.generate('tenant-2', params2);

    const history = await controller.history();
    expect(history.data!.length).toBe(2);
    expect(history.data![0].contract_id).toBe('T44');
    expect(history.data![1].contract_id).toBe('T45');
  });

  it('should return DataProcessResult on all operations (DNA-3)', async () => {
    const { controller } = createEngineAndController();
    expect(await controller.generate('t1', validContractParams())).toBeInstanceOf(
      DataProcessResult,
    );
    expect(await controller.history()).toBeInstanceOf(DataProcessResult);
    expect(await controller.status()).toBeInstanceOf(DataProcessResult);
    expect(await controller.listContracts()).toBeInstanceOf(DataProcessResult);
    expect(await controller.getContract('T44')).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// Module Wiring
// ══════════════════════════════════════════════════════

describe('Module Wiring', () => {
  it('EngineModule should be importable and have correct metadata', () => {
    expect(EngineModule).toBeDefined();
    const imports = Reflect.getMetadata('imports', EngineModule);
    expect(imports).toBeDefined();
    expect(imports.length).toBe(10); // FabricsModule, Guardrails, Freedom, Factories, EngineContracts, CalibrationModule, ScopePortabilityModule, FeatureRegistryPhaseAModule, EngineSelfAwarenessPhaseAModule, RagQualityFeedbackPhaseAModule
  });

  it('BootstrapModule should be importable and export HealthReporter + BootstrapSequence', () => {
    expect(BootstrapModule).toBeDefined();
    const exports = Reflect.getMetadata('exports', BootstrapModule);
    expect(exports).toBeDefined();
    expect(exports.length).toBe(7); // BootstrapSequence, HealthReporter, BootstrapSeeder, BootstrapFromDocumentsService, ArchPhilosophyRetriever, PhilosophyPatternSummarizer, HistoryBootstrapOrchestrator
  });

  it('ApiModule should be importable and import BootstrapModule', () => {
    expect(ApiModule).toBeDefined();
    const imports = Reflect.getMetadata('imports', ApiModule);
    expect(imports).toBeDefined();
    expect(imports.length).toBeGreaterThanOrEqual(1);
  });

  it('ApiModule should export HealthController and TenantController', () => {
    // S21: FlowHttpController is a @Controller (not a provider) — cannot be exported from ApiModule.
    // Only providers/modules can be exported: HealthController and TenantController.
    const exports = Reflect.getMetadata('exports', ApiModule);
    expect(exports).toBeDefined();
    expect(exports.length).toBe(2); // HealthController, TenantController
  });
});
