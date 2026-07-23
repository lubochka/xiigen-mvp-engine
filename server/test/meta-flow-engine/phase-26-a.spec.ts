/**
 * FLOW-26 Phase A — Engine Contracts + Seed Prompts.
 *
 * Verifies all 24 EngineContract factories and 24 seed prompts
 * for the Self-Developing Meta-Flow Engine (T389–T412).
 */

import { FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES } from '../../src/engine-contracts/flow-extension-engine-contracts';
import { FLOW_EXTENSION_ENGINE_SEED_PROMPTS } from '../../src/engine-contracts/flow-extension-engine-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

describe('FLOW-26 Phase A — Engine Contracts + Seed Prompts', () => {
  it('F26A-1: FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES exports exactly 24 factories', () => {
    expect(FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES).toHaveLength(24);
  });

  it('F26A-2: All task-type IDs are unique', () => {
    const ids = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES.map((f) => f().taskTypeId);
    expect(new Set(ids).size).toBe(24);
  });

  it('F26A-3: All factory IDs are unique across all factories', () => {
    const allFactoryIds: string[] = [];
    for (const f of FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES) {
      const c = f();
      for (const dep of c.factoryDependencies) {
        allFactoryIds.push(dep.factoryId);
      }
    }
    expect(new Set(allFactoryIds).size).toBe(allFactoryIds.length);
  });

  it('F26A-4: T389 is FlowSpecParser with INGESTION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[0]();
    expect(c.taskTypeId).toBe('T389');
    expect(c.name).toBe('FlowSpecParser');
    expect(c.archetype).toBe(ContractArchetype.INGESTION);
  });

  it('F26A-5: T393 is CodeScaffoldGenerator with BUILD archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[4]();
    expect(c.taskTypeId).toBe('T393');
    expect(c.name).toBe('CodeScaffoldGenerator');
    expect(c.archetype).toBe(ContractArchetype.BUILD);
  });

  it('F26A-6: T397 is CodeAssemblyOrchestrator with ORCHESTRATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[8]();
    expect(c.taskTypeId).toBe('T397');
    expect(c.name).toBe('CodeAssemblyOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F26A-7: T398 is DnaComplianceChecker with ARBITRATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[9]();
    expect(c.taskTypeId).toBe('T398');
    expect(c.name).toBe('DnaComplianceChecker');
    expect(c.archetype).toBe(ContractArchetype.ARBITRATION);
  });

  it('F26A-8: T399 is BfaConflictScanner with ARBITRATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[10]();
    expect(c.taskTypeId).toBe('T399');
    expect(c.name).toBe('BfaConflictScanner');
    expect(c.archetype).toBe(ContractArchetype.ARBITRATION);
  });

  it('F26A-9: T400 is FlowQualityGate with GUARD archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[11]();
    expect(c.taskTypeId).toBe('T400');
    expect(c.name).toBe('FlowQualityGate');
    expect(c.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F26A-10: T402 is CrossFlowImpactAnalyzer with IMPACT_ANALYSIS archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[13]();
    expect(c.taskTypeId).toBe('T402');
    expect(c.name).toBe('CrossFlowImpactAnalyzer');
    expect(c.archetype).toBe(ContractArchetype.IMPACT_ANALYSIS);
  });

  it('F26A-11: T403 is FlowRegistrationOrchestrator with ORCHESTRATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[14]();
    expect(c.taskTypeId).toBe('T403');
    expect(c.name).toBe('FlowRegistrationOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F26A-12: T407 is FlowDeploymentGate with GUARD archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[18]();
    expect(c.taskTypeId).toBe('T407');
    expect(c.name).toBe('FlowDeploymentGate');
    expect(c.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F26A-13: T408 is SelfExtensionLearner with LEARNING archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[19]();
    expect(c.taskTypeId).toBe('T408');
    expect(c.name).toBe('SelfExtensionLearner');
    expect(c.archetype).toBe(ContractArchetype.LEARNING);
  });

  it('F26A-14: T409 is FlowEvolutionTracker with GOVERNANCE archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[20]();
    expect(c.taskTypeId).toBe('T409');
    expect(c.name).toBe('FlowEvolutionTracker');
    expect(c.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F26A-15: T411 is ExtensionHealthScorer with EVALUATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[22]();
    expect(c.taskTypeId).toBe('T411');
    expect(c.name).toBe('ExtensionHealthScorer');
    expect(c.archetype).toBe(ContractArchetype.EVALUATION);
  });

  it('F26A-16: T412 is MetaFlowOrchestrator with ORCHESTRATION archetype', () => {
    const c = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES[23]();
    expect(c.taskTypeId).toBe('T412');
    expect(c.name).toBe('MetaFlowOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F26A-17: Every contract validates successfully (DNA-3)', () => {
    for (const factory of FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES) {
      const result = factory().validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F26A-18: FLOW_EXTENSION_ENGINE_SEED_PROMPTS exports exactly 24 prompts', () => {
    expect(FLOW_EXTENSION_ENGINE_SEED_PROMPTS).toHaveLength(24);
  });

  it('F26A-19: All seed prompts have FLOW_SCOPED connection_type', () => {
    for (const p of FLOW_EXTENSION_ENGINE_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
    }
  });

  it('F26A-20: All seed prompts have flow_id FLOW-26', () => {
    for (const p of FLOW_EXTENSION_ENGINE_SEED_PROMPTS) {
      expect(p.flow_id).toBe('FLOW-26');
    }
  });

  it('F26A-21: All seed promptText values are non-empty', () => {
    for (const p of FLOW_EXTENSION_ENGINE_SEED_PROMPTS) {
      expect(p.promptText.length).toBeGreaterThan(50);
    }
  });

  it('F26A-22: Seed prompt task types match contract task types (same 24)', () => {
    const contractIds = new Set(
      FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES.map((f) => f().taskTypeId),
    );
    const promptIds = new Set(FLOW_EXTENSION_ENGINE_SEED_PROMPTS.map((p) => p.taskType));
    expect(contractIds).toEqual(promptIds);
  });

  it('F26A-23: Every contract toDict() returns Record<string,unknown> (DNA-1)', () => {
    for (const factory of FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES) {
      const dict = factory().toDict();
      expect(typeof dict).toBe('object');
      expect(dict).not.toBeNull();
    }
  });

  it('F26A-24: Task type IDs span T389–T412 (24 sequential IDs)', () => {
    const ids = FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES.map((f) => f().taskTypeId).sort();
    expect(ids[0]).toBe('T389');
    expect(ids[ids.length - 1]).toBe('T412');
  });
});
