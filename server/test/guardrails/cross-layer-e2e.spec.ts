/**
 * P7.5 Tests — Cross-Layer E2E
 *
 * Full pipeline: BFA + DNA + Promotion + FREEDOM working together.
 * Tests real BFA replacing stub, DNA validation on code, promotion gating,
 * tenant-scoped FREEDOM config, ConfigBuilder $env resolution,
 * and the integrated pipeline.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FabricType } from '../../src/factories/fabric-type';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { TemplateRenderer } from '../../src/engine-contracts/template-renderer';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';
import {
  loadFactoryStubs,
  loadTaskTypeStubs,
  loadExistingBfaRegistrations,
} from '../../src/engine-contracts/backward-compat';

import { BusinessFlowArbiter } from '../../src/guardrails/bfa';
import { DnaPatternValidator } from '../../src/guardrails/dna-validator';
import { PromotionLadder, PromotionLevel } from '../../src/guardrails/promotion-ladder';

import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { ConfigBuilder } from '../../src/freedom/config-builder';
import { makeConfigDoc } from '../../src/freedom/config-schema';

describe('Cross-Layer E2E — Phase 7 Capstone', () => {
  let bfa: BusinessFlowArbiter;
  let dna: DnaPatternValidator;
  let ladder: PromotionLadder;
  let freedom: FreedomConfigManager;
  let factoryRegistry: FactoryRegistry;
  let taskRegistry: TaskTypeRegistry;
  let renderer: TemplateRenderer;

  beforeEach(() => {
    bfa = new BusinessFlowArbiter();
    dna = new DnaPatternValidator();
    ladder = new PromotionLadder();
    freedom = new FreedomConfigManager();
    factoryRegistry = new FactoryRegistry();
    taskRegistry = new TaskTypeRegistry();
    renderer = new TemplateRenderer();
  });

  // ── BFA: backward compat + new flow ────────────────

  it('E2E-1: load backward compat → BFA has 4 flows → T44 has no conflicts', () => {
    loadExistingBfaRegistrations(bfa);
    expect(bfa.flowCount).toBe(4);

    const t44 = createT44Contract();
    const conflicts = bfa.checkConflicts('T44', t44.bfaRegistration);
    expect(conflicts.data!.filter((c) => c.severity === 'error')).toHaveLength(0);

    const regResult = bfa.registerFlow('T44', t44.bfaRegistration);
    expect(regResult.isSuccess).toBe(true);
    expect(bfa.flowCount).toBe(5);
  });

  it('E2E-2: register T44 → flow with same entity → BFA blocks', () => {
    const t44 = createT44Contract();
    bfa.registerFlow('T44', t44.bfaRegistration);

    // Try to register a flow that claims 'inventory_item' (owned by T44)
    const result = bfa.registerFlow('T99', {
      entities: ['inventory_item'],
      events: ['other.event'],
      apiRoutes: ['/api/other'],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONFLICTS_DETECTED');
  });

  it('E2E-3: register T44 → flow with same event → BFA allows (warning)', () => {
    const t44 = createT44Contract();
    bfa.registerFlow('T44', t44.bfaRegistration);

    // Same event but different entities/routes → warning only, allowed
    const result = bfa.registerFlow('T99', {
      entities: ['other_entity'],
      events: ['inventory.updated'], // same event as T44
      apiRoutes: ['/api/other'],
    });
    expect(result.isSuccess).toBe(true); // warnings don't block
  });

  // ── DNA validation ─────────────────────────────────

  it('E2E-4: compliant code → empty violations', () => {
    const code = `
      import { DataProcessResult } from '../kernel';
      import { MicroserviceBase } from '../kernel';
      
      class InventoryService extends MicroserviceBase {
        async getItems(tenantId: string) {
          const filter = buildSearchFilter({ tenantId });
          return DataProcessResult.success(items);
        }
      }
    `;
    const result = dna.validate(code, { isService: true });
    expect(result.isSuccess).toBe(true);
    const errors = result.data!.filter((v) => v.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('E2E-4b: non-compliant code → violations found', () => {
    const code = `
      class OrderModel { id: string; name: string; }
      class OrderController { getOrders() { return []; } }
    `;
    const result = dna.validate(code);
    expect(result.isSuccess).toBe(true);
    const errors = result.data!.filter((v) => v.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);

    const patternIds = errors.map((v) => v.patternId);
    expect(patternIds).toContain('DNA-1'); // typed model
    expect(patternIds).toContain('DNA-6'); // entity controller
  });

  // ── Promotion ladder ───────────────────────────────

  it('E2E-5: register → promote to MINIMAL → canDeploy = true', () => {
    ladder.register('F166');
    expect(ladder.canDeploy('F166')).toBe(false);

    ladder.promote('F166'); // INJECTED
    expect(ladder.canDeploy('F166')).toBe(false);

    ladder.promote('F166'); // MINIMAL
    expect(ladder.canDeploy('F166')).toBe(true);
  });

  // ── FREEDOM config: tenant-scoped ──────────────────

  it('E2E-6: set config for tenant-A → tenant-A gets value, tenant-B gets default', () => {
    freedom.setDefault('ai.model', 'default-model');

    freedom.setConfig(
      'tenant-A',
      makeConfigDoc({
        configKey: 'ai.model',
        taskType: 'T44',
        value: 'claude',
      }),
    );

    expect(freedom.getValue('tenant-A', 'ai.model')).toBe('claude');
    expect(freedom.getValue('tenant-B', 'ai.model')).toBe('default-model');
  });

  // ── ConfigBuilder: $env resolution ─────────────────

  it('E2E-7: config with $env:TEST_VAR → resolved to env value', async () => {
    const builder = new ConfigBuilder({
      environ: { TEST_VAR: 'resolved-value', NODE_ENV: 'test' },
    });

    const config = {
      name: 'my-service',
      secret: '$env:TEST_VAR',
      env: '$env:NODE_ENV',
    };

    const result = await builder.resolve('tenant-A', config);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.secret).toBe('resolved-value');
    expect(result.data!.env).toBe('test');
    expect(result.data!.name).toBe('my-service'); // plain value unchanged
  });

  // ── Full integrated pipeline ───────────────────────

  it('E2E-8: full pipeline — backward compat → register → validate → promote → FREEDOM', () => {
    // Step 1: Load backward compat
    loadFactoryStubs(factoryRegistry);
    loadTaskTypeStubs(taskRegistry);
    loadExistingBfaRegistrations(bfa);
    expect(factoryRegistry.count).toBe(165);
    expect(taskRegistry.count).toBe(43);
    expect(bfa.flowCount).toBe(4);

    // Step 2: Register T44 in task registry
    const t44 = createT44Contract();
    expect(taskRegistry.register(t44).isSuccess).toBe(true);
    expect(taskRegistry.count).toBe(44);

    // Step 3: BFA check — no conflicts with existing flows
    const bfaResult = bfa.registerFlow('T44', t44.bfaRegistration);
    expect(bfaResult.isSuccess).toBe(true);

    // Step 4: Render T44 → get generated code structure
    const rendered = renderer.render(t44);
    expect(rendered.isSuccess).toBe(true);

    // Step 5: DNA validate the "generated" code (simulated)
    const simulatedCode = `
      import { DataProcessResult } from '../kernel';
      import { MicroserviceBase } from '../kernel';
      export class InventoryService extends MicroserviceBase {
        async query(tenantId: string) {
          const filter = buildSearchFilter({ tenantId });
          return DataProcessResult.success(result);
        }
      }
    `;
    expect(dna.isCompliant(simulatedCode, { isService: true })).toBe(true);

    // Step 6: Promote through ladder
    ladder.register('T44', PromotionLevel.GENERATED);
    ladder.promote('T44'); // INJECTED
    ladder.promote('T44'); // MINIMAL
    expect(ladder.canDeploy('T44')).toBe(true);

    // Step 7: Set FREEDOM config for tenant
    freedom.setConfig(
      'tenant-A',
      makeConfigDoc({
        configKey: 'inventory.low_threshold',
        taskType: 'T44',
        value: 10,
        valueType: 'int',
      }),
    );
    expect(freedom.getValue('tenant-A', 'inventory.low_threshold')).toBe(10);

    // Full pipeline complete!
  });

  // ── BFA replaces stub in cross-layer context ───────

  it('E2E-9: real BFA works in place of StubBfaValidator for existing flows', () => {
    // Load all 4 existing flows (FLOW-01 removed — reset to NOT_STARTED)
    loadExistingBfaRegistrations(bfa);

    // Verify existing flows are registered
    const flows = bfa.registeredFlows;
    expect(flows.has('FLOW-01')).toBe(false);
    expect(flows.has('FLOW-02')).toBe(true);
    expect(flows.has('FLOW-05')).toBe(true);

    // Verify we can get registration data back
    const flow02 = bfa.getFlowRegistration('FLOW-02');
    expect((flow02.entities as string[]).length).toBeGreaterThan(0);

    // Register T44 + T45 (no conflicts with existing flows)
    expect(bfa.registerFlow('T44', createT44Contract().bfaRegistration).isSuccess).toBe(true);
    expect(bfa.registerFlow('T45', createT45Contract().bfaRegistration).isSuccess).toBe(true);
    expect(bfa.flowCount).toBe(6); // 4 existing + T44 + T45
  });

  // ── DNA + Promotion gating ─────────────────────────

  it('E2E-10: non-compliant code → DNA errors → should not promote past INJECTED', () => {
    const badCode = 'class OrderModel { } class OrderController { }';
    const isCompliant = dna.isCompliant(badCode);
    expect(isCompliant).toBe(false);

    // In a real pipeline: non-compliant → stays at GENERATED, cannot reach MINIMAL
    ladder.register('bad-artifact');
    // Promotion to INJECTED is allowed (basic tests pass)
    ladder.promote('bad-artifact');
    // But INJECTED → MINIMAL should be gated by DNA compliance
    // (enforcement logic lives in P9 engine, but the primitives work now)
    expect(ladder.canDeploy('bad-artifact')).toBe(false); // still INJECTED
  });
});
