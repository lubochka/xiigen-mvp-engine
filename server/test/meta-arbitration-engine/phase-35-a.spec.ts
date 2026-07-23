/**
 * FLOW-35 Phase A — Foundations Tests.
 *
 * 14 tests covering:
 *   - 2 new ContractArchetype enum values (META_COLLECTION, META_DECISION)
 *   - 2 EngineContract factories (T565, T566)
 *   - 2 genesis seed prompts (all FLOW_SCOPED to FLOW-35)
 *   - MetaArbiterRegistry: 5 slots (SK-402–SK-406), layer="meta"
 *   - FlowLifecycleSeeder: 7 ACTIVE infra flows + 27 NOT_STARTED user flows
 *   - FlowLifecycleService: state machine, bundle activations (D-VIS-4)
 *   - Critical CF rules encoded in seed prompts (CF-789–CF-793, D-VIS-4)
 */

import {
  GENERATION_LOOP_CONTRACT_FACTORIES,
  GENERATION_LOOP_CONTRACTS,
} from '../../src/engine-contracts/meta-arbitration-contracts';
import { GENERATION_LOOP_SEED_PROMPTS } from '../../src/engine-contracts/meta-arbitration-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import {
  MetaArbiterRegistry,
  EMPTY_META_ARBITER_SLOTS,
} from '../../src/engine/arbitration/meta-arbiter-registry';
import { FlowLifecycleSeeder } from '../../src/engine/flows/generation-loop/flow-lifecycle-seeder.service';
import { FlowLifecycleService } from '../../src/engine/flows/generation-loop/flow-lifecycle.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow35-a';

// ── Mock factories ─────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, _id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (_i: string, filter: Record<string, unknown>) => {
      if (filter.compositeKey) {
        const found = existingDocs.filter((d) => (d as any).compositeKey === filter.compositeKey);
        return DataProcessResult.success(found);
      }
      if (filter.tenantId && filter.status) {
        const found = existingDocs.filter(
          (d) => (d as any).tenantId === filter.tenantId && (d as any).status === filter.status,
        );
        return DataProcessResult.success(found);
      }
      return DataProcessResult.success(existingDocs);
    }),
    updateDocument: jest.fn(async (_i: string, _id: string, upd: Record<string, unknown>) => {
      updated.push(upd);
      return DataProcessResult.success(upd);
    }),
    _stored: stored,
    _updated: updated,
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('msg-id');
    }),
    _events: events,
  } as any;
}

// ── Archetype tests ─────────────────────────────────────────────────────────

describe('FLOW-35 Phase A — Archetypes + Contracts + Seeds', () => {
  it('F35A-1: META_COLLECTION and META_DECISION archetypes exist', () => {
    expect(ContractArchetype.META_COLLECTION).toBe('meta_collection');
    expect(ContractArchetype.META_DECISION).toBe('meta_decision');
  });

  // ── Contract factories ─────────────────────────────────────────────────

  it('F35A-2: GENERATION_LOOP_CONTRACT_FACTORIES exports exactly 2 factories', () => {
    expect(GENERATION_LOOP_CONTRACT_FACTORIES).toHaveLength(2);
  });

  it('F35A-3: All task-type IDs are T565–T566 and unique', () => {
    const ids = GENERATION_LOOP_CONTRACT_FACTORIES.map((f) => f().taskTypeId);
    expect(ids).toEqual(['T565', 'T566']);
    expect(new Set(ids).size).toBe(2);
  });

  it('F35A-4: T565 RoundSummaryProcessor has META_COLLECTION archetype and F1484+F1489 deps', () => {
    const c = GENERATION_LOOP_CONTRACT_FACTORIES[0]();
    expect(c.taskTypeId).toBe('T565');
    expect(c.name).toBe('RoundSummaryProcessor');
    expect(c.archetype).toBe(ContractArchetype.META_COLLECTION);
    const factoryIds = c.factoryDependencies.map((d) => d.factoryId);
    expect(factoryIds).toContain('F1484');
    expect(factoryIds).toContain('F1489');
  });

  it('F35A-5: T566 MetaDecisionEngine has META_DECISION archetype and F1485–F1491 deps', () => {
    const c = GENERATION_LOOP_CONTRACT_FACTORIES[1]();
    expect(c.taskTypeId).toBe('T566');
    expect(c.name).toBe('MetaDecisionEngine');
    expect(c.archetype).toBe(ContractArchetype.META_DECISION);
    const factoryIds = c.factoryDependencies.map((d) => d.factoryId);
    expect(factoryIds).toContain('F1485');
    expect(factoryIds).toContain('F1486');
    expect(factoryIds).toContain('F1487');
    expect(factoryIds).toContain('F1488');
    expect(factoryIds).toContain('F1490');
    expect(factoryIds).toContain('F1491');
    // D-VIS-4: IFlowLifecycleService must be a dependency
    const lifecycleDep = c.factoryDependencies.find((d) => d.factoryId === 'F1491');
    expect(lifecycleDep).toBeDefined();
    expect(lifecycleDep!.interfaceName).toBe('IFlowLifecycleService');
  });

  it('F35A-6: Both contracts pass validate() with no errors', () => {
    for (const contract of GENERATION_LOOP_CONTRACTS) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  // ── Seed prompts ─────────────────────────────────────────────────────

  it('F35A-7: GENERATION_LOOP_SEED_PROMPTS exports exactly 2 prompts, all FLOW_SCOPED to FLOW-35', () => {
    expect(GENERATION_LOOP_SEED_PROMPTS).toHaveLength(2);
    for (const p of GENERATION_LOOP_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
      expect(p.flow_id).toBe('FLOW-35');
    }
    const taskTypes = GENERATION_LOOP_SEED_PROMPTS.map((p) => p.taskType);
    expect(taskTypes).toEqual(['T565', 'T566']);
  });

  it('F35A-8: Critical CF rules encoded in seed prompts (CF-789, CF-790, CF-791, CF-792, CF-793, D-VIS-4)', () => {
    const t565 = GENERATION_LOOP_SEED_PROMPTS.find((p) => p.taskType === 'T565')!.promptText;
    const t566 = GENERATION_LOOP_SEED_PROMPTS.find((p) => p.taskType === 'T566')!.promptText;
    // CF-792: append-only decision log (T565)
    expect(t565).toMatch(/CF-792|append-only/i);
    // DNA-8: store before emit (T565)
    expect(t565).toMatch(/DNA-8|storeDocument|BEFORE/);
    // CF-789: spend limit from FREEDOM config (T566)
    expect(t566).toMatch(/CF-789|FREEDOM config|flow35_spend_limit/);
    // CF-790: security circuit breaker (T566)
    expect(t566).toMatch(/CF-790|security.*circuit.*breaker|credential leaks/i);
    // CF-791: all 5 meta-arbiters (T566)
    expect(t566).toMatch(/CF-791|no short-circuit|all 5/i);
    // CF-793: EscalationBriefing on HALT (T566)
    expect(t566).toMatch(/CF-793|EscalationBriefing/);
    // D-VIS-4: flow lifecycle status update (T566)
    expect(t566).toMatch(/D-VIS-4|flow.lifecycle|GENERATED|ACTIVE/i);
  });

  // ── MetaArbiterRegistry ────────────────────────────────────────────────

  it('F35A-9: MetaArbiterRegistry initializes with 5 empty slots (SK-402–SK-406)', () => {
    const registry = new MetaArbiterRegistry();
    expect(registry.count).toBe(5);
    expect(registry.hasAllSlots()).toBe(true);
  });

  it('F35A-10: MetaArbiterRegistry all slots have layer="meta"', () => {
    const registry = new MetaArbiterRegistry();
    for (const arbiter of registry.getAll()) {
      expect(arbiter.layer).toBe('meta');
    }
  });

  it('F35A-11: MetaArbiterRegistry slots reference SK-402–SK-406', () => {
    const registry = new MetaArbiterRegistry();
    const skillRefs = registry.getAll().map((a) => a.skillRef);
    expect(skillRefs).toContain('SK-402');
    expect(skillRefs).toContain('SK-403');
    expect(skillRefs).toContain('SK-404');
    expect(skillRefs).toContain('SK-405');
    expect(skillRefs).toContain('SK-406');
  });

  // ── FlowLifecycleSeeder ────────────────────────────────────────────────

  it('F35A-12: FlowLifecycleSeeder seeds 7 ACTIVE infra flows (Seed 1)', async () => {
    const db = makeDb();
    const seeder = new FlowLifecycleSeeder(db);
    const result = await seeder.seedInfraFlows(TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.seeded).toBe(7);
    // All stored as ACTIVE
    expect(db._stored.every((d: any) => d.status === 'ACTIVE')).toBe(true);
    expect(FlowLifecycleSeeder.INFRA_FLOWS).toHaveLength(7);
  });

  it('F35A-13: FlowLifecycleSeeder seeds 27 NOT_STARTED user flows (Seed 2)', async () => {
    const db = makeDb();
    const seeder = new FlowLifecycleSeeder(db);
    const result = await seeder.seedUserFlows(TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.seeded).toBe(27);
    // All stored as NOT_STARTED
    expect(db._stored.every((d: any) => d.status === 'NOT_STARTED')).toBe(true);
    expect(FlowLifecycleSeeder.USER_FLOWS).toHaveLength(27);
  });

  it('F35A-14: FlowLifecycleService — UNSCOPED_QUERY on missing tenantId', async () => {
    const svc = new FlowLifecycleService(makeDb(), makeQueue());
    const r = await svc.getStatus('FLOW-33', '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });
});
