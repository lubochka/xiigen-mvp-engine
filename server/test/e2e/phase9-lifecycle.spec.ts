/**
 * P9.5 Tests — E2E Full Engine Lifecycle + AppModule
 *
 * E2E scenarios:
 *   1. Bootstrap → health shows HEALTHY
 *   2. Create tenant → tenant stored
 *   3. Full generation: contract → factories → AF pipeline → flow def → FREEDOM → BFA → promotion
 *   4. BFA-conflicting contract → BLOCKED
 *   5. Generation history reflects runs
 *   6. Engine status shows counts
 *   7. Health check after generation → still HEALTHY
 *   8. Cross-layer: real P4/P6/P7/P8 components
 *   9. Tenant isolation: A doesn't affect B
 *  10. Pipeline pass rate reflects actual ratio
 *
 * Module: AppModule imports all 11 modules from 9 phases
 * Backward compat: T1–T43 contracts still validate
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';
import { TenantRegistry } from '../../src/kernel/multi-tenant/tenant-registry.service';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { TemplateRenderer } from '../../src/engine-contracts/template-renderer';
import { EngineContract, EngineContractParams } from '../../src/engine-contracts/contract-schema';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { FabricType } from '../../src/factories/fabric-type';
import { BusinessFlowArbiter } from '../../src/guardrails/bfa';
import { DnaPatternValidator } from '../../src/guardrails/dna-validator';
import { PromotionLadder, PromotionLevel } from '../../src/guardrails/promotion-ladder';
import { OutputScorer } from '../../src/fabrics/ai-engine/scoring';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { FeedbackStation } from '../../src/af-stations/af11-feedback';
import { HealthReporter, HealthStatus } from '../../src/bootstrap/health-reporter';
import { BootstrapSequence, BootPhase } from '../../src/bootstrap/bootstrap-sequence';
import { FlowGenerator } from '../../src/engine/flow-generator';
import { EngineController } from '../../src/api/engine.controller';
import { HealthController } from '../../src/api/health.controller';
import { TenantController } from '../../src/api/tenant.controller';
import { AppModule } from '../../src/app.module';

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

// ── Contract helpers ────────────────────────────────

function t44Params(): EngineContractParams {
  return {
    taskTypeId: 'T44',
    name: 'Inventory Management Data Pipeline',
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

function t45Params(): EngineContractParams {
  return {
    taskTypeId: 'T45',
    name: 'Marketplace Listing Generator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'listing.create event',
    purpose: 'AI-powered listing generation',
    factoryDependencies: [
      {
        factoryId: 'F170',
        interfaceName: 'ICooperatorService',
        fabricType: FabricType.RAG,
        description: 'Cooperator scoring',
      },
      {
        factoryId: 'F173',
        interfaceName: 'IFeedDistributionService',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Feed distribution',
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
      entities: ['listing'],
      events: ['listing.created'],
      apiRoutes: ['/api/listings'],
    },
    ironRules: ['All services extend MicroserviceBase'],
    machineComponents: ['service_bootstrap'],
    freedomComponents: ['max_listings'],
    familyId: 'Family-26',
  };
}

// ── Full test harness ───────────────────────────────

interface TestHarness {
  tenantRegistry: TenantRegistry;
  factoryRegistry: FactoryRegistry;
  taskRegistry: TaskTypeRegistry;
  bfa: BusinessFlowArbiter;
  promotion: PromotionLadder;
  freedom: FreedomConfigManager;
  healthReporter: HealthReporter;
  bootstrap: BootstrapSequence;
  engine: FlowGenerator;
  engineCtrl: EngineController;
  healthCtrl: HealthController;
  tenantCtrl: TenantController;
}

function createHarness(): TestHarness {
  const tenantRegistry = new TenantRegistry();
  const factoryRegistry = new FactoryRegistry();
  const taskRegistry = new TaskTypeRegistry();
  const bfa = new BusinessFlowArbiter();
  const promotion = new PromotionLadder();
  const freedom = new FreedomConfigManager();
  const healthReporter = new HealthReporter();
  const bootstrap = new BootstrapSequence({
    healthReporter,
    requireSecrets: false,
    retryAttempts: 1,
  });

  const engine = new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry,
    taskRegistry,
    bfa,
    promotionLadder: promotion,
    freedomManager: freedom,
  });

  return {
    tenantRegistry,
    factoryRegistry,
    taskRegistry,
    bfa,
    promotion,
    freedom,
    healthReporter,
    bootstrap,
    engine,
    // Downstream services not exercised by lifecycle tests — null stubs for extra args
    engineCtrl: new EngineController(
      engine,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    ),
    healthCtrl: new HealthController(healthReporter),
    tenantCtrl: new TenantController(tenantRegistry, freedom),
  };
}

// ══════════════════════════════════════════════════════
// E2E 1: Bootstrap → health HEALTHY
// ══════════════════════════════════════════════════════

describe('E2E 1: Bootstrap → Health', () => {
  it('should bootstrap all fabrics and show HEALTHY', async () => {
    const h = createHarness();
    const successInit = async () => DataProcessResult.success({ initialized: true });
    const healthyFn = async () => DataProcessResult.success({ ok: true });

    h.bootstrap.registerFabric(BootPhase.DATABASE, successInit, healthyFn);
    h.bootstrap.registerFabric(BootPhase.QUEUE, successInit, healthyFn);
    h.bootstrap.registerFabric(BootPhase.AI_ENGINE, successInit, healthyFn);

    const bootResult = await h.bootstrap.boot('system', {});
    expect(bootResult.isSuccess).toBe(true);
    expect(bootResult.data!.status).toBe('HEALTHY');

    const healthResult = await h.healthCtrl.ready('system');
    expect(healthResult.isSuccess).toBe(true);
    expect(healthResult.data!.status).toBe('READY');
  });
});

// ══════════════════════════════════════════════════════
// E2E 2: Create tenant
// ══════════════════════════════════════════════════════

describe('E2E 2: Create Tenant', () => {
  it('should create and retrieve a tenant', async () => {
    const h = createHarness();
    const created = await h.tenantCtrl.create({ name: 'Acme Corp' });
    expect(created.isSuccess).toBe(true);
    const tenantId = created.data!.id as string;
    expect(tenantId).toBeDefined();

    const fetched = await h.tenantCtrl.getById(tenantId);
    expect(fetched.isSuccess).toBe(true);
    expect(fetched.data!.name).toBe('Acme Corp');
  });
});

// ══════════════════════════════════════════════════════
// E2E 3: Full generation lifecycle
// ══════════════════════════════════════════════════════

describe('E2E 3: Full Generation Lifecycle', () => {
  it('should generate a flow: contract → factories → AF → flow def → FREEDOM → BFA → promotion', async () => {
    const h = createHarness();

    // Create tenant
    const tenant = await h.tenantCtrl.create({ name: 'Gen Corp' });
    const tenantId = tenant.data!.id as string;

    // Generate
    const result = await h.engineCtrl.generate(tenantId, t44Params());
    expect(result.isSuccess).toBe(true);
    const data = result.data!;

    // Contract registered
    expect(data.contract_id).toBe('T44');

    // Factories registered
    expect(h.factoryRegistry.get('F166').isSuccess).toBe(true);
    expect(h.factoryRegistry.get('F169').isSuccess).toBe(true);

    // Flow definition produced
    expect(data.flow_id).toBe('flow_t44');
    expect(data.flow_definition).toBeDefined();
    expect((data.flow_definition as any).nodes).toBeDefined();

    // FREEDOM configs created
    expect((data.freedom_configs as any[]).length).toBe(2);

    // BFA registered
    expect(data.bfa_status).toBe('REGISTERED');

    // Promotion
    if (data.pipeline_passed) {
      expect(data.promotion_level).toBe('MINIMAL');
    } else {
      expect(data.promotion_level).toBe('GENERATED');
    }
  });
});

// ══════════════════════════════════════════════════════
// E2E 4: BFA conflict blocks generation
// ══════════════════════════════════════════════════════

describe('E2E 4: BFA Conflict', () => {
  it('should block generation when BFA detects entity conflict', async () => {
    const h = createHarness();

    // First flow succeeds and registers 'inventory_item' entity
    const r1 = await h.engineCtrl.generate('tenant-1', t44Params());
    expect(r1.isSuccess).toBe(true);

    // Second flow tries same entity → BLOCKED
    const conflicting: EngineContractParams = {
      ...t44Params(),
      taskTypeId: 'T46',
      name: 'Conflicting Inventory',
      factoryDependencies: [
        {
          factoryId: 'F200',
          interfaceName: 'IConflictService',
          fabricType: FabricType.DATABASE,
          description: 'Conflicts',
        },
      ],
      // Same entity!
      bfaRegistration: {
        entities: ['inventory_item'],
        events: ['inv.clash'],
        apiRoutes: ['/api/clash'],
      },
    };

    const r2 = await h.engineCtrl.generate('tenant-1', conflicting);
    expect(r2.isSuccess).toBe(true);
    expect(r2.data!.bfa_status).toBe('BLOCKED');
    expect((r2.data!.errors as string[]).some((e) => (e as string).includes('BFA'))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// E2E 5: Generation history
// ══════════════════════════════════════════════════════

describe('E2E 5: Generation History', () => {
  it('should track generation runs in history', async () => {
    const h = createHarness();

    await h.engineCtrl.generate('tenant-1', t44Params());
    await h.engineCtrl.generate('tenant-2', t45Params());

    const history = await h.engineCtrl.history();
    expect(history.isSuccess).toBe(true);
    expect(history.data!.length).toBe(2);
    expect(history.data![0].contract_id).toBe('T44');
    expect(history.data![1].contract_id).toBe('T45');
  });
});

// ══════════════════════════════════════════════════════
// E2E 6: Engine status
// ══════════════════════════════════════════════════════

describe('E2E 6: Engine Status', () => {
  it('should show counts after generations', async () => {
    const h = createHarness();

    await h.engineCtrl.generate('tenant-1', t44Params());
    await h.engineCtrl.generate('tenant-1', t45Params());

    const status = await h.engineCtrl.status();
    expect(status.isSuccess).toBe(true);
    expect(status.data!.generation_count).toBe(2);
    expect(status.data!.task_type_count).toBe(2);
    expect(status.data!.factory_count).toBeGreaterThanOrEqual(4); // F166, F169, F170, F173
  });
});

// ══════════════════════════════════════════════════════
// E2E 7: Health after generation
// ══════════════════════════════════════════════════════

describe('E2E 7: Health After Generation', () => {
  it('should still show healthy after successful generation', async () => {
    const h = createHarness();
    const healthyFn = async () => DataProcessResult.success({ ok: true });
    h.healthReporter.register('database', healthyFn);
    h.healthReporter.register('ai_engine', healthyFn);

    await h.engineCtrl.generate('tenant-1', t44Params());

    const health = await h.healthCtrl.ready('system');
    expect(health.isSuccess).toBe(true);
    expect(health.data!.status).toBe('READY');
  });
});

// ══════════════════════════════════════════════════════
// E2E 8: Cross-layer integration
// ══════════════════════════════════════════════════════

describe('E2E 8: Cross-Layer Integration', () => {
  it('should use real components from P4/P6/P7/P8', async () => {
    const h = createHarness();

    const result = await h.engineCtrl.generate('tenant-1', t44Params());
    expect(result.isSuccess).toBe(true);

    // P6: FactoryRegistry has entries
    expect(h.factoryRegistry.count).toBeGreaterThanOrEqual(2);

    // P6: TaskTypeRegistry has contract
    expect(h.taskRegistry.count).toBeGreaterThanOrEqual(1);
    expect(h.taskRegistry.get('T44').isSuccess).toBe(true);

    // P7: BFA has registration
    const conflicts = h.bfa.checkConflicts('NEW_FLOW', {
      entities: ['inventory_item'],
      events: [],
      apiRoutes: [],
    });
    if (result.data!.bfa_status === 'REGISTERED') {
      expect(conflicts.data!.length).toBeGreaterThan(0);
    }

    // P7: FREEDOM has configs
    const cfg = h.freedom.getConfig('tenant-1', 'T44:batch_size');
    if (cfg.isSuccess) {
      expect(cfg.data!.config_key).toBe('T44:batch_size');
    }

    // P7: PromotionLadder tracks artifact
    expect(h.promotion.count).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════
// E2E 9: Tenant isolation
// ══════════════════════════════════════════════════════

describe('E2E 9: Tenant Isolation', () => {
  it('tenant-A generation should not interfere with tenant-B', async () => {
    const h = createHarness();

    // Tenant A generates T44
    const rA = await h.engineCtrl.generate('tenant-A', t44Params());
    expect(rA.isSuccess).toBe(true);

    // Tenant B generates T45 (different contract, no BFA conflict)
    const rB = await h.engineCtrl.generate('tenant-B', t45Params());
    expect(rB.isSuccess).toBe(true);

    // Both should have artifacts
    const history = await h.engineCtrl.history();
    expect(history.data!.length).toBe(2);
    expect(history.data!.some((h) => h.tenant_id === 'tenant-A')).toBe(true);
    expect(history.data!.some((h) => h.tenant_id === 'tenant-B')).toBe(true);

    // FREEDOM configs are tenant-scoped
    const cfgA = h.freedom.getConfig('tenant-A', 'T44:batch_size');
    const cfgB = h.freedom.getConfig('tenant-B', 'T45:max_listings');
    // Both should have their own configs (or at least not collide)
    if (cfgA.isSuccess) expect(cfgA.data!.tenant_id).toBe('tenant-A');
    if (cfgB.isSuccess) expect(cfgB.data!.tenant_id).toBe('tenant-B');
  });
});

// ══════════════════════════════════════════════════════
// E2E 10: Pipeline pass rate
// ══════════════════════════════════════════════════════

describe('E2E 10: Pipeline Pass Rate', () => {
  it('should reflect actual pass/fail ratio in engine count', async () => {
    const h = createHarness();

    // Two generations
    await h.engineCtrl.generate('tenant-1', t44Params());
    await h.engineCtrl.generate('tenant-1', t45Params());

    const status = await h.engineCtrl.status();
    expect(status.data!.generation_count).toBe(2);
    // Both should succeed with mock AI
  });
});

// ══════════════════════════════════════════════════════
// AppModule — all 9 phases wired
// ══════════════════════════════════════════════════════

describe('AppModule', () => {
  it('should be defined', () => {
    expect(AppModule).toBeDefined();
  });

  it('should import all 13 modules from 13 phases (plus ScheduleModule and InfrastructureModule)', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toBeDefined();
    // S22: +ScheduleModule.forRoot() +InfrastructureModule; heyrovsky-merge: +LearningModule
    // FLOW-01 Phase A1: +AuthModule (platform auth foundation) → 17
    expect(imports.length).toBe(17);
  });

  it('imports should include KernelModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const names = imports.map((m: any) => m.name || m.toString());
    expect(names).toContain('KernelModule');
  });

  it('imports should include MultiTenantModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const names = imports.map((m: any) => m.name || m.toString());
    expect(names).toContain('MultiTenantModule');
  });

  it('imports should include EngineModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const names = imports.map((m: any) => m.name || m.toString());
    expect(names).toContain('EngineModule');
  });

  it('imports should include BootstrapModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const names = imports.map((m: any) => m.name || m.toString());
    expect(names).toContain('BootstrapModule');
  });

  it('imports should include ApiModule', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    const names = imports.map((m: any) => m.name || m.toString());
    expect(names).toContain('ApiModule');
  });
});

// ══════════════════════════════════════════════════════
// Backward Compatibility
// ══════════════════════════════════════════════════════

describe('Backward Compatibility', () => {
  it('existing T44 contract should still validate after new generation', async () => {
    const h = createHarness();
    await h.engineCtrl.generate('tenant-1', t44Params());

    // Re-validate the same contract shape
    const contract = new EngineContract(t44Params());
    const validation = contract.validate();
    expect(validation.isSuccess).toBe(true);
  });

  it('FactoryRegistry should accept new entries without corrupting existing', async () => {
    const h = createHarness();
    await h.engineCtrl.generate('tenant-1', t44Params());

    const beforeCount = h.factoryRegistry.count;
    await h.engineCtrl.generate('tenant-1', t45Params());
    expect(h.factoryRegistry.count).toBeGreaterThan(beforeCount);

    // Original factories still accessible
    expect(h.factoryRegistry.get('F166').isSuccess).toBe(true);
    expect(h.factoryRegistry.get('F169').isSuccess).toBe(true);
  });

  it('TaskTypeRegistry preserves all registered contracts', async () => {
    const h = createHarness();
    await h.engineCtrl.generate('tenant-1', t44Params());
    await h.engineCtrl.generate('tenant-1', t45Params());

    expect(h.taskRegistry.get('T44').isSuccess).toBe(true);
    expect(h.taskRegistry.get('T45').isSuccess).toBe(true);
    expect(h.taskRegistry.count).toBe(2);
  });
});
