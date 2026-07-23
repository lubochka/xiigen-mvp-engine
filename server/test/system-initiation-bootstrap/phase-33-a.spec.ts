/**
 * FLOW-33 Phase A — Engine Contracts + Seed Prompts + New Archetypes.
 *
 * 14 tests covering:
 *   - 4 new ContractArchetype enum values (STATE_MACHINE, AI_GENERATION_LOOP, AI_CONSENSUS, CHANGE_DETECTION)
 *   - 7 EngineContract factories (T536–T542)
 *   - 7 genesis seed prompts (all FLOW_SCOPED)
 *   - Critical iron rule encoding (CF-739, CF-742, CF-743, CF-746, CF-747, CF-750, IR-DRY-1)
 */

import {
  META_ARBITRATION_CONTRACT_FACTORIES,
  META_ARBITRATION_CONTRACTS,
} from '../../src/engine-contracts/system-initiation-bootstrap-contracts';
import { META_ARBITRATION_SEED_PROMPTS } from '../../src/engine-contracts/system-initiation-bootstrap-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { FabricType } from '../../src/factories/fabric-type';

describe('FLOW-33 Phase A — Engine Contracts + Seed Prompts', () => {
  // ── Archetypes ─────────────────────────────────────────────────────────

  it('F33A-1: 4 new archetypes exist in ContractArchetype enum', () => {
    expect(ContractArchetype.STATE_MACHINE).toBe('state_machine');
    expect(ContractArchetype.AI_GENERATION_LOOP).toBe('ai_generation_loop');
    expect(ContractArchetype.AI_CONSENSUS).toBe('ai_consensus');
    expect(ContractArchetype.CHANGE_DETECTION).toBe('change_detection');
  });

  it('F33A-2: RAG_ORCHESTRATION archetype does NOT exist (T542 uses ORCHESTRATION)', () => {
    expect((ContractArchetype as Record<string, unknown>)['RAG_ORCHESTRATION']).toBeUndefined();
  });

  // ── Contract factories ─────────────────────────────────────────────────

  it('F33A-3: META_ARBITRATION_CONTRACT_FACTORIES exports exactly 7 factories', () => {
    expect(META_ARBITRATION_CONTRACT_FACTORIES).toHaveLength(7);
  });

  it('F33A-4: All task-type IDs are T536–T542 and unique', () => {
    const ids = META_ARBITRATION_CONTRACT_FACTORIES.map((f) => f().taskTypeId);
    expect(ids).toEqual(['T536', 'T537', 'T538', 'T539', 'T540', 'T541', 'T542']);
    expect(new Set(ids).size).toBe(7);
  });

  it('F33A-5: T536 BootstrapOrchestrator has ORCHESTRATION archetype and F1339 + F1346 dependencies', () => {
    const c = createT536();
    expect(c.taskTypeId).toBe('T536');
    expect(c.name).toBe('BootstrapOrchestrator');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
    const factoryIds = c.factoryDependencies.map((d) => d.factoryId);
    expect(factoryIds).toContain('F1339');
    expect(factoryIds).toContain('F1346');
  });

  it('F33A-6: T537 GraphRAGTwoLayerSeeder has DATA_PIPELINE archetype and uses RAG FABRIC', () => {
    const c = createT537();
    expect(c.taskTypeId).toBe('T537');
    expect(c.archetype).toBe(ContractArchetype.DATA_PIPELINE);
    const ragDep = c.factoryDependencies.find((d) => d.fabricType === FabricType.RAG);
    expect(ragDep).toBeDefined();
    expect(ragDep!.factoryId).toBe('F1348');
  });

  it('F33A-7: T538 ImplementationStatusRegistry has STATE_MACHINE archetype', () => {
    const c = createT538();
    expect(c.taskTypeId).toBe('T538');
    expect(c.name).toBe('ImplementationStatusRegistry');
    expect(c.archetype).toBe(ContractArchetype.STATE_MACHINE);
    expect(c.familyId).toBe('Family-200');
  });

  it('F33A-8: T539 ImplementFamilyMetaLoop has AI_GENERATION_LOOP archetype and AI_ENGINE FABRIC', () => {
    const c = createT539();
    expect(c.taskTypeId).toBe('T539');
    expect(c.archetype).toBe(ContractArchetype.AI_GENERATION_LOOP);
    const aiDep = c.factoryDependencies.find((d) => d.fabricType === FabricType.AI_ENGINE);
    expect(aiDep).toBeDefined();
    expect(aiDep!.factoryId).toBe('F1343');
  });

  it('F33A-9: T540 FiveArbiterConsensusGate has AI_CONSENSUS archetype and encodes quorum iron rule', () => {
    const c = createT540();
    expect(c.taskTypeId).toBe('T540');
    expect(c.archetype).toBe(ContractArchetype.AI_CONSENSUS);
    const quorumRule = c.ironRules.find((r) => r.includes('4/5'));
    expect(quorumRule).toBeDefined();
    const parallelRule = c.ironRules.find(
      (r) => r.includes('Promise.allSettled') || r.includes('sequential'),
    );
    expect(parallelRule).toBeDefined();
  });

  it('F33A-10: T541 RegressionImpactAnalyzer has CHANGE_DETECTION archetype and CF-746 iron rule', () => {
    const c = createT541();
    expect(c.taskTypeId).toBe('T541');
    expect(c.archetype).toBe(ContractArchetype.CHANGE_DETECTION);
    const regressionRule = c.ironRules.find(
      (r) => r.includes('CF-746') || r.includes('regression'),
    );
    expect(regressionRule).toBeDefined();
  });

  it('F33A-11: T542 ContextPackAssembler has ORCHESTRATION archetype and Family-201', () => {
    const c = createT542();
    expect(c.taskTypeId).toBe('T542');
    expect(c.name).toBe('ContextPackAssembler');
    expect(c.archetype).toBe(ContractArchetype.ORCHESTRATION);
    expect(c.familyId).toBe('Family-201');
  });

  it('F33A-12: All contracts pass validate() with no errors', () => {
    for (const contract of META_ARBITRATION_CONTRACTS) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  // ── Seed prompts ───────────────────────────────────────────────────────

  it('F33A-13: META_ARBITRATION_SEED_PROMPTS exports exactly 7 prompts, all FLOW_SCOPED to FLOW-33', () => {
    expect(META_ARBITRATION_SEED_PROMPTS).toHaveLength(7);
    for (const p of META_ARBITRATION_SEED_PROMPTS) {
      expect(p.connection_type).toBe('FLOW_SCOPED');
      expect(p.flow_id).toBe('FLOW-33');
    }
    const taskTypes = META_ARBITRATION_SEED_PROMPTS.map((p) => p.taskType);
    expect(taskTypes).toEqual(['T536', 'T537', 'T538', 'T539', 'T540', 'T541', 'T542']);
  });

  it('F33A-14: Critical iron rules encoded in seed prompts (CF-739, CF-742, CF-743, CF-746, CF-747, CF-750, IR-DRY-1)', () => {
    const t516prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T536')!.promptText;
    const t517prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T537')!.promptText;
    const t519prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T539')!.promptText;
    const t520prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T540')!.promptText;
    const t521prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T541')!.promptText;
    const t522prompt = META_ARBITRATION_SEED_PROMPTS.find((p) => p.taskType === 'T542')!.promptText;

    // CF-739: sentinel-not-read-first (T536)
    expect(t516prompt).toMatch(/CF-739|sentinel/i);
    // CF-742: partial-import-committed (T536)
    expect(t516prompt).toMatch(/CF-742|rollback/i);
    // IR-DRY-1: DRY_RUN isolation (T536)
    expect(t516prompt).toMatch(/DRY_RUN|IR-DRY-1/);
    // CF-743: GraphRAG Layer 2 before Layer 1 (T537)
    expect(t517prompt).toMatch(/CF-743|Layer 2/i);
    // CF-750: evolved-prompt-applied-to-inflight (T539)
    expect(t519prompt).toMatch(/CF-750|in-flight/i);
    // Hardcoded retry = score-0 (T539)
    expect(t519prompt).toMatch(/FREEDOM|flow33_max_family_retries/);
    // Promise.allSettled parallel + ≥4/5 quorum (T540)
    expect(t520prompt).toMatch(/Promise\.allSettled|allSettled/);
    expect(t520prompt).toMatch(/≥4\/5|4\/5|quorum/);
    // CF-746: regression-check-skipped (T541)
    expect(t521prompt).toMatch(/CF-746|regression/i);
    // CF-747: stale-ContextPack-reused (T542)
    expect(t522prompt).toMatch(/CF-747|stale/i);
  });
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function createT536() {
  return META_ARBITRATION_CONTRACT_FACTORIES[0]();
}
function createT537() {
  return META_ARBITRATION_CONTRACT_FACTORIES[1]();
}
function createT538() {
  return META_ARBITRATION_CONTRACT_FACTORIES[2]();
}
function createT539() {
  return META_ARBITRATION_CONTRACT_FACTORIES[3]();
}
function createT540() {
  return META_ARBITRATION_CONTRACT_FACTORIES[4]();
}
function createT541() {
  return META_ARBITRATION_CONTRACT_FACTORIES[5]();
}
function createT542() {
  return META_ARBITRATION_CONTRACT_FACTORIES[6]();
}
