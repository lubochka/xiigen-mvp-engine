/**
 * FLOW-31 Phase A — Engine Contracts + Seed Prompts.
 *
 * Verifies all 27 EngineContract factories and 27 seed prompts
 * for the Design Intelligence Engine (T489–T515).
 */

import { DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES } from '../../src/engine-contracts/design-system-governance-contracts';
import { DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS } from '../../src/engine-contracts/design-system-governance-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

describe('FLOW-31 Phase A — Engine Contracts + Seed Prompts', () => {
  it('F31A-1: DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES exports exactly 27 factories', () => {
    expect(DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES).toHaveLength(27);
  });

  it('F31A-2: All task-type IDs are unique', () => {
    const ids = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES.map((f) => f().taskTypeId);
    expect(new Set(ids).size).toBe(27);
  });

  it('F31A-3: All factory IDs are unique across all factories', () => {
    const allFactoryIds: string[] = [];
    for (const f of DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES) {
      const c = f();
      for (const dep of c.factoryDependencies) {
        allFactoryIds.push(dep.factoryId);
      }
    }
    expect(new Set(allFactoryIds).size).toBe(allFactoryIds.length);
  });

  it('F31A-4: T489 is DesignSpecIngester with INGESTION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[0]();
    expect(c.taskTypeId).toBe('T489');
    expect(c.name).toBe('DesignSpecIngester');
    expect(c.archetype).toBe(ContractArchetype.INGESTION);
  });

  it('F31A-5: T493 is DesignPatternParser with INGESTION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[4]();
    expect(c.taskTypeId).toBe('T493');
    expect(c.name).toBe('DesignPatternParser');
    expect(c.archetype).toBe(ContractArchetype.INGESTION);
  });

  it('F31A-6: T494 is DesignConflictDetector with ARBITRATION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[5]();
    expect(c.taskTypeId).toBe('T494');
    expect(c.name).toBe('DesignConflictDetector');
    expect(c.archetype).toBe(ContractArchetype.ARBITRATION);
  });

  it('F31A-7: T498 is DesignDebtAnalyzer with IMPACT_ANALYSIS archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[9]();
    expect(c.taskTypeId).toBe('T498');
    expect(c.name).toBe('DesignDebtAnalyzer');
    expect(c.archetype).toBe(ContractArchetype.IMPACT_ANALYSIS);
  });

  it('F31A-8: T499 is DesignQualityGate with GUARD archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[10]();
    expect(c.taskTypeId).toBe('T499');
    expect(c.name).toBe('DesignQualityGate');
    expect(c.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F31A-9: T502 is DesignComplexityAnalyzer with EVALUATION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[13]();
    expect(c.taskTypeId).toBe('T502');
    expect(c.name).toBe('DesignComplexityAnalyzer');
    expect(c.archetype).toBe(ContractArchetype.EVALUATION);
  });

  it('F31A-10: T504 is DesignDecisionLogger with GOVERNANCE archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[15]();
    expect(c.taskTypeId).toBe('T504');
    expect(c.name).toBe('DesignDecisionLogger');
    expect(c.archetype).toBe(ContractArchetype.GOVERNANCE);
  });

  it('F31A-11: T510 is DesignFeedbackLearner with LEARNING archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[21]();
    expect(c.taskTypeId).toBe('T510');
    expect(c.name).toBe('DesignFeedbackLearner');
    expect(c.archetype).toBe(ContractArchetype.LEARNING);
  });

  it('F31A-12: T511 is CrossDesignImpactAnalyzer with IMPACT_ANALYSIS archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[22]();
    expect(c.taskTypeId).toBe('T511');
    expect(c.name).toBe('CrossDesignImpactAnalyzer');
    expect(c.archetype).toBe(ContractArchetype.IMPACT_ANALYSIS);
  });

  it('F31A-13: T513 is DesignPublishOrchestrator with ORCHESTRATION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[24]();
    expect(c.taskTypeId).toBe('T513');
    expect(c.name).toBe('DesignPublishOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F31A-14: T514 is DesignDeploymentGate with GUARD archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[25]();
    expect(c.taskTypeId).toBe('T514');
    expect(c.name).toBe('DesignDeploymentGate');
    expect(c.archetype).toBe(ContractArchetype.GUARD);
  });

  it('F31A-15: T515 is MetaDesignOrchestrator with ORCHESTRATION archetype', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[26]();
    expect(c.taskTypeId).toBe('T515');
    expect(c.name).toBe('MetaDesignOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });

  it('F31A-16: Every contract validates successfully (DNA-3)', () => {
    for (const factory of DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES) {
      const result = factory().validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F31A-17: DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS exports exactly 27 prompts', () => {
    expect(DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS).toHaveLength(27);
  });

  it('F31A-18: All seed prompts have FLOW_SCOPED connection_type', () => {
    for (const p of DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
    }
  });

  it('F31A-19: All seed prompts have flow_id FLOW-31', () => {
    for (const p of DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS) {
      expect(p.flow_id).toBe('FLOW-31');
    }
  });

  it('F31A-20: All seed promptText values are non-empty', () => {
    for (const p of DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS) {
      expect(p.promptText.length).toBeGreaterThan(50);
    }
  });

  it('F31A-21: Seed prompt task types match contract task types (same 27)', () => {
    const contractIds = new Set(
      DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES.map((f) => f().taskTypeId),
    );
    const promptIds = new Set(DESIGN_SYSTEM_GOVERNANCE_SEED_PROMPTS.map((p) => p.taskType));
    expect(contractIds).toEqual(promptIds);
  });

  it('F31A-22: Every contract toDict() returns Record<string,unknown> (DNA-1)', () => {
    for (const factory of DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES) {
      const dict = factory().toDict();
      expect(typeof dict).toBe('object');
      expect(dict).not.toBeNull();
    }
  });

  it('F31A-23: Task type IDs span T489–T515 (27 sequential IDs)', () => {
    const ids = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES.map((f) => f().taskTypeId).sort();
    expect(ids[0]).toBe('T489');
    expect(ids[ids.length - 1]).toBe('T515');
  });

  it('F31A-24: All 5 ingestion contracts are in Family-191', () => {
    const ingestionContracts = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES.slice(0, 5).map((f) =>
      f(),
    );
    for (const c of ingestionContracts) {
      expect(c.familyId).toBe('Family-191');
    }
  });

  it('F31A-25: BFA registrations have non-empty entities and events for all contracts', () => {
    for (const factory of DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES) {
      const c = factory();
      expect(c.bfaRegistration.entities.length + c.bfaRegistration.events.length).toBeGreaterThan(
        0,
      );
    }
  });

  it('F31A-26: T510 (DesignFeedbackLearner) has no apiRoutes (SCORE-0 async)', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[21]();
    expect(c.bfaRegistration.apiRoutes).toHaveLength(0);
  });

  it('F31A-27: Factory ID range starts at F1271 for T489', () => {
    const c = DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES[0]();
    const firstFactoryId = c.factoryDependencies[0].factoryId;
    expect(firstFactoryId).toBe('F1271');
  });
});
