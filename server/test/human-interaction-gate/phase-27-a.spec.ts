/**
 * FLOW-27 Phase A — Engine Contracts + Seed Prompts (T413–T422).
 *
 * Tests:
 *   F27A-1:  HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES exports exactly 10 factories
 *   F27A-2:  All task-type IDs are unique
 *   F27A-3:  All factory IDs are unique across all factories
 *   F27A-4:  T413 is ApprovalRequestCreator with ORCHESTRATION archetype
 *   F27A-5:  T414 is ApprovalDecisionCapture with ARBITRATION archetype
 *   F27A-6:  T415 is ApprovalTimeoutHandler with GOVERNANCE archetype
 *   F27A-7:  T416 is HumanTaskAssigner with ORCHESTRATION archetype
 *   F27A-8:  T417 is TaskCompletionTracker with LEARNING archetype
 *   F27A-9:  T418 is ScheduledTaskTrigger with BUILD archetype
 *   F27A-10: T419 is ApprovalChainOrchestrator with ORCHESTRATION archetype
 *   F27A-11: T420 is GateEnforcementService with GUARD archetype
 *   F27A-12: T421 is HumanTaskAuditTrail with GOVERNANCE archetype
 *   F27A-13: T422 is DelegationManager with ORCHESTRATION archetype
 *   F27A-14: Every contract validates successfully (DNA-3)
 *   F27A-15: HUMAN_APPROVAL_GATE_SEED_PROMPTS exports exactly 10 prompts
 *   F27A-16: All seed prompts have FLOW_SCOPED connection_type
 *   F27A-17: All seed prompts have flow_id FLOW-27
 *   F27A-18: All seed promptText values are non-empty
 *   F27A-19: Seed prompt task types match contract task types (same 10)
 *   F27A-20: Every contract toDict() returns Record<string,unknown> (DNA-1)
 */

import { HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES } from '../../src/engine-contracts/human-approval-gate-contracts';
import { HUMAN_APPROVAL_GATE_SEED_PROMPTS } from '../../src/engine-contracts/human-approval-gate-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

describe('FLOW-27 Phase A — Engine Contracts + Seed Prompts', () => {
  it('F27A-1: HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES exports exactly 10 factories', () => {
    expect(HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES).toHaveLength(10);
  });

  it('F27A-2: All task-type IDs are unique', () => {
    const contracts = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f());
    const ids = contracts.map((c) => c.taskTypeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('F27A-3: All factory IDs are unique across all factories', () => {
    const contracts = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f());
    const factoryIds = contracts.flatMap((c) => c.factoryDependencies.map((d: any) => d.factoryId));
    expect(new Set(factoryIds).size).toBe(factoryIds.length);
  });

  it('F27A-4: T413 is ApprovalRequestCreator with ORCHESTRATION archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T413',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ApprovalRequestCreator');
    expect(contract!.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F27A-5: T414 is ApprovalDecisionCapture with ARBITRATION archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T414',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ApprovalDecisionCapture');
    expect(contract!.archetype).toBe(ContractArchetype.ARBITRATION);
  });

  it('F27A-6: T415 is ApprovalTimeoutHandler with GOVERNANCE archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T415',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ApprovalTimeoutHandler');
    expect(contract!.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F27A-7: T416 is HumanTaskAssigner with ORCHESTRATION archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T416',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('HumanTaskAssigner');
    expect(contract!.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F27A-8: T417 is TaskCompletionTracker with LEARNING archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T417',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TaskCompletionTracker');
    expect(contract!.archetype).toBe(ContractArchetype.LEARNING);
  });

  it('F27A-9: T418 is ScheduledTaskTrigger with BUILD archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T418',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ScheduledTaskTrigger');
    expect(contract!.archetype).toBe(ContractArchetype.BUILD);
  });

  it('F27A-10: T419 is ApprovalChainOrchestrator with ORCHESTRATION archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T419',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ApprovalChainOrchestrator');
    expect(contract!.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F27A-11: T420 is GateEnforcementService with GUARD archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T420',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('ApprovalGateEnforcer');
    expect(contract!.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F27A-12: T421 is HumanTaskAuditTrail with GOVERNANCE archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T421',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('HumanTaskAuditTrail');
    expect(contract!.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F27A-13: T422 is DelegationManager with ORCHESTRATION archetype', () => {
    const contract = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).find(
      (c) => c.taskTypeId === 'T422',
    );
    expect(contract).toBeDefined();
    expect(contract!.name).toBe('TaskDelegationOrchestrator');
    expect(contract!.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F27A-14: Every contract validates successfully (DNA-3)', () => {
    const contracts = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f());
    for (const contract of contracts) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F27A-15: HUMAN_APPROVAL_GATE_SEED_PROMPTS exports exactly 10 prompts', () => {
    expect(HUMAN_APPROVAL_GATE_SEED_PROMPTS).toHaveLength(10);
  });

  it('F27A-16: All seed prompts have FLOW_SCOPED connection_type', () => {
    for (const p of HUMAN_APPROVAL_GATE_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
    }
  });

  it('F27A-17: All seed prompts have flow_id FLOW-27', () => {
    for (const p of HUMAN_APPROVAL_GATE_SEED_PROMPTS) {
      expect(p.flow_id).toBe('FLOW-27');
    }
  });

  it('F27A-18: All seed promptText values are non-empty', () => {
    for (const p of HUMAN_APPROVAL_GATE_SEED_PROMPTS) {
      expect(p.promptText.length).toBeGreaterThan(0);
    }
  });

  it('F27A-19: Seed prompt task types match contract task types (same 10)', () => {
    const contractIds = new Set(HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f().taskTypeId));
    const promptIds = new Set(HUMAN_APPROVAL_GATE_SEED_PROMPTS.map((p) => p.taskType));
    for (const id of promptIds) {
      expect(contractIds.has(id)).toBe(true);
    }
    expect(promptIds.size).toBe(10);
  });

  it('F27A-20: Every contract toDict() returns Record<string,unknown> (DNA-1)', () => {
    const contracts = HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f());
    for (const contract of contracts) {
      const dict = contract.toDict();
      expect(typeof dict).toBe('object');
      expect(dict).not.toBeNull();
    }
  });
});
