/**
 * FLOW-30 Phase A — Engine Contracts + Seed Prompts (T468–T477).
 *
 * Tests:
 *   F30A-1:  TENANT_LIFECYCLE_CONTRACT_FACTORIES exports exactly 10 factories
 *   F30A-2:  All task-type IDs are unique
 *   F30A-3:  All factory IDs are unique across all factories
 *   F30A-4:  T468 is TenantProvisionOrchestrator with ORCHESTRATION archetype
 *   F30A-5:  T469 is ResourceQuotaAllocator with BUILD archetype
 *   F30A-6:  T470 is TenantConfigInheritance with BUILD archetype
 *   F30A-7:  T471 is QuotaEnforcementGate with GUARD archetype
 *   F30A-8:  T472 is CrossTenantIsolationCheck with GUARD archetype
 *   F30A-9:  T473 is TenantAuditEmitter with GOVERNANCE archetype
 *   F30A-10: T474 is TenantOffboardingHandler with GOVERNANCE archetype
 *   F30A-11: T475 is TenantHealthScorer with EVALUATION archetype
 *   F30A-12: T476 is UsageMetricsAggregator with LEARNING archetype
 *   F30A-13: T477 is TenantPolicyEnforcer with GUARD archetype
 *   F30A-14: Every contract validates successfully (DNA-3)
 *   F30A-15: TENANT_LIFECYCLE_SEED_PROMPTS exports exactly 10 prompts
 *   F30A-16: All seed prompts have FLOW_SCOPED connection_type
 *   F30A-17: All seed prompts have flow_id FLOW-30
 *   F30A-18: All seed promptText values are non-empty
 *   F30A-19: Seed prompt task types match contract task types (same 10)
 *   F30A-20: Every contract toDict() returns Record<string,unknown> (DNA-1)
 */

import { TENANT_LIFECYCLE_CONTRACT_FACTORIES } from '../../src/engine-contracts/tenant-lifecycle-contracts';
import { TENANT_LIFECYCLE_SEED_PROMPTS } from '../../src/engine-contracts/tenant-lifecycle-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

describe('FLOW-30 Phase A — Engine Contracts + Seed Prompts', () => {
  it('F30A-1: TENANT_LIFECYCLE_CONTRACT_FACTORIES exports exactly 10 factories', () => {
    expect(TENANT_LIFECYCLE_CONTRACT_FACTORIES).toHaveLength(10);
  });

  it('F30A-2: All task-type IDs are unique', () => {
    const contracts = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f());
    const ids = contracts.map((c) => c.taskTypeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('F30A-3: All factory IDs are unique across all factories', () => {
    const contracts = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f());
    const factoryIds = contracts.flatMap((c) => c.factoryDependencies.map((d: any) => d.factoryId));
    expect(new Set(factoryIds).size).toBe(factoryIds.length);
  });

  it('F30A-4: T468 is TenantProvisionOrchestrator with ORCHESTRATION archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T468',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantProvisionOrchestrator');
    expect(contract!.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F30A-5: T469 is ResourceQuotaAllocator with BUILD archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T469',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ResourceQuotaAllocator');
    expect(contract!.archetype).toBe(ContractArchetype.BUILD);
  });

  it('F30A-6: T470 is TenantConfigInheritance with BUILD archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T470',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantConfigInheritance');
    expect(contract!.archetype).toBe(ContractArchetype.BUILD);
  });

  it('F30A-7: T471 is QuotaEnforcementGate with GUARD archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T471',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('QuotaEnforcementGate');
    expect(contract!.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F30A-8: T472 is CrossTenantIsolationCheck with GUARD archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T472',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('CrossTenantIsolationCheck');
    expect(contract!.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F30A-9: T473 is TenantAuditEmitter with GOVERNANCE archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T473',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantAuditEmitter');
    expect(contract!.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F30A-10: T474 is TenantOffboardingHandler with GOVERNANCE archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T474',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantOffboardingHandler');
    expect(contract!.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F30A-11: T475 is TenantHealthScorer with EVALUATION archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T475',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantHealthScorer');
    expect(contract!.archetype).toBe(ContractArchetype.EVALUATION);
  });

  it('F30A-12: T476 is UsageMetricsAggregator with LEARNING archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T476',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('UsageMetricsAggregator');
    expect(contract!.archetype).toBe(ContractArchetype.LEARNING);
  });

  it('F30A-13: T477 is TenantPolicyEnforcer with GUARD archetype', () => {
    const contract = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T477',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TenantPolicyEnforcer');
    expect(contract!.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F30A-14: Every contract validates successfully (DNA-3)', () => {
    const contracts = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f());
    for (const contract of contracts) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F30A-15: TENANT_LIFECYCLE_SEED_PROMPTS exports exactly 10 prompts', () => {
    expect(TENANT_LIFECYCLE_SEED_PROMPTS).toHaveLength(10);
  });

  it('F30A-16: All seed prompts have FLOW_SCOPED connection_type', () => {
    for (const p of TENANT_LIFECYCLE_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
    }
  });

  it('F30A-17: All seed prompts have flow_id FLOW-30', () => {
    for (const p of TENANT_LIFECYCLE_SEED_PROMPTS) {
      expect(p.flow_id).toBe('FLOW-30');
    }
  });

  it('F30A-18: All seed promptText values are non-empty', () => {
    for (const p of TENANT_LIFECYCLE_SEED_PROMPTS) {
      expect(p.promptText.length).toBeGreaterThan(0);
    }
  });

  it('F30A-19: Seed prompt task types match contract task types (same 10)', () => {
    const contractIds = new Set(TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f().taskTypeId));
    const promptIds = new Set(TENANT_LIFECYCLE_SEED_PROMPTS.map((p) => p.taskType));
    for (const id of promptIds) {
      expect(contractIds.has(id)).toBe(true);
    }
    expect(promptIds.size).toBe(10);
  });

  it('F30A-20: Every contract toDict() returns Record<string,unknown> (DNA-1)', () => {
    const contracts = TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f());
    for (const contract of contracts) {
      const dict = contract.toDict();
      expect(typeof dict).toBe('object');
      expect(dict).not.toBeNull();
    }
  });
});
