/**
 * FLOW-29-A — Contract Registration Tests (T441–T467).
 *
 * Tests:
 *   F29A-1:  All 27 contract factories instantiate without error
 *   F29A-2:  All task type IDs are unique (no collisions)
 *   F29A-3:  All task type IDs are in T441–T467 range
 *   F29A-4:  All contracts validate() successfully
 *   F29A-5:  All contracts have the expected archetype values
 *   F29A-6:  ContractArchetype has all 9 new FLOW-29 archetypes
 *   F29A-7:  All genesis prompts have taskType in T441–T467
 *   F29A-8:  RAG_OPTIMIZATION_GENESIS_PROMPTS has 27 entries
 *   F29A-9:  All genesis prompts are FLOW_SCOPED with flow_id FLOW-29
 *   F29A-10: T447 (RoutingPolicyUpdater) — iron rules contain score-0 async guard
 *   F29A-11: T448 (TraceSpanCapture) — iron rules contain score-0 no-sdk guard
 *   F29A-12: T461 (ImprovementSuggestionEngine) — iron rules contain score-0 human-gated guard
 *   F29A-13: T444 (HybridRetrievalFusion) — iron rules reference CF-606 shape compatibility
 *   F29A-14: RAG_OPTIMIZATION_CONTRACT_FACTORIES array has 27 entries
 *   F29A-15: All contracts have non-empty iron rules
 *   F29A-16: All contracts have at least one quality gate
 *   F29A-17: All contracts have bfaRegistration with entities array
 */

import {
  RAG_OPTIMIZATION_CONTRACT_FACTORIES,
  createT441Contract,
  createT444Contract,
  createT447Contract,
  createT448Contract,
  createT461Contract,
} from '../../src/engine-contracts/rag-optimization-contracts';
import { RAG_OPTIMIZATION_GENESIS_PROMPTS } from '../../src/engine-contracts/rag-optimization-seed-prompts';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

const EXPECTED_TASK_IDS = new Set([
  'T441',
  'T442',
  'T443',
  'T444',
  'T445',
  'T446',
  'T447',
  'T448',
  'T449',
  'T450',
  'T451',
  'T452',
  'T453',
  'T454',
  'T455',
  'T456',
  'T457',
  'T458',
  'T459',
  'T460',
  'T461',
  'T462',
  'T463',
  'T464',
  'T465',
  'T466',
  'T467',
]);

describe('FLOW-29-A — Contract Registration (T441–T467)', () => {
  const allContracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((factory) => factory());

  it('F29A-1: all 27 contract factories instantiate without error', () => {
    expect(allContracts).toHaveLength(27);
    for (const contract of allContracts) {
      expect(contract).toBeDefined();
    }
  });

  it('F29A-2: all task type IDs are unique', () => {
    const ids = allContracts.map((c) => c.taskTypeId);
    const unique = new Set(ids);
    expect(unique.size).toBe(27);
  });

  it('F29A-3: all task type IDs are in T441–T467 range', () => {
    for (const contract of allContracts) {
      expect(EXPECTED_TASK_IDS.has(contract.taskTypeId)).toBe(true);
    }
  });

  it('F29A-4: all contracts validate() successfully', () => {
    for (const contract of allContracts) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('F29A-5: all contracts have valid ContractArchetype values', () => {
    const validArchetypes = new Set(Object.values(ContractArchetype));
    for (const contract of allContracts) {
      expect(validArchetypes.has(contract.archetype as ContractArchetype)).toBe(true);
    }
  });

  it('F29A-6: ContractArchetype has all 9 new FLOW-29 archetypes', () => {
    expect(ContractArchetype.RETRIEVAL).toBe('retrieval');
    expect(ContractArchetype.GUARD).toBe('guard');
    expect(ContractArchetype.LEARNING).toBe('learning');
    expect(ContractArchetype.OBSERVABILITY).toBe('observability');
    expect(ContractArchetype.BUILD).toBe('build');
    expect(ContractArchetype.EVALUATION).toBe('evaluation');
    expect(ContractArchetype.EXPERIMENTATION).toBe('experimentation');
    expect(ContractArchetype.ANALYSIS).toBe('analysis');
    expect(ContractArchetype.UI).toBe('ui');
  });

  it('F29A-7: all genesis prompts have taskType in T441–T467', () => {
    for (const prompt of RAG_OPTIMIZATION_GENESIS_PROMPTS) {
      expect(EXPECTED_TASK_IDS.has(prompt.taskType)).toBe(true);
    }
  });

  it('F29A-8: RAG_OPTIMIZATION_GENESIS_PROMPTS has 27 entries', () => {
    expect(RAG_OPTIMIZATION_GENESIS_PROMPTS).toHaveLength(27);
  });

  it('F29A-9: all genesis prompts are FLOW_SCOPED with flow_id FLOW-29', () => {
    for (const prompt of RAG_OPTIMIZATION_GENESIS_PROMPTS) {
      expect(prompt.connection_type).toBe('FLOW_SCOPED');
      expect(prompt.flow_id).toBe('FLOW-29');
    }
  });

  it('F29A-10: T447 iron rules contain score-0 async guard', () => {
    const t447 = createT447Contract();
    const asyncRule = t447.ironRules.some(
      (r) => r.toLowerCase().includes('async') || r.toLowerCase().includes('live path'),
    );
    expect(asyncRule).toBe(true);
  });

  it('F29A-11: T448 iron rules contain score-0 no-sdk import guard', () => {
    const t448 = createT448Contract();
    const noSdkRule = t448.ironRules.some(
      (r) => r.toLowerCase().includes('sdk') || r.toLowerCase().includes('otel'),
    );
    expect(noSdkRule).toBe(true);
  });

  it('F29A-12: T461 iron rules contain score-0 human-gated apply guard', () => {
    const t461 = createT461Contract();
    const humanRule = t461.ironRules.some(
      (r) => r.toLowerCase().includes('human') || r.toLowerCase().includes('auto'),
    );
    expect(humanRule).toBe(true);
  });

  it('F29A-13: T444 iron rules reference CF-606 output shape compatibility', () => {
    const t444 = createT444Contract();
    const cfRule = t444.ironRules.some((r) => r.includes('CF-606'));
    expect(cfRule).toBe(true);
  });

  it('F29A-14: RAG_OPTIMIZATION_CONTRACT_FACTORIES has 27 entries', () => {
    expect(RAG_OPTIMIZATION_CONTRACT_FACTORIES).toHaveLength(27);
  });

  it('F29A-15: all contracts have non-empty iron rules', () => {
    for (const contract of allContracts) {
      expect(contract.ironRules.length).toBeGreaterThan(0);
    }
  });

  it('F29A-16: all contracts have at least one quality gate', () => {
    for (const contract of allContracts) {
      expect(contract.qualityGates.length).toBeGreaterThan(0);
    }
  });

  it('F29A-17: all contracts have bfaRegistration with entities array', () => {
    for (const contract of allContracts) {
      expect(contract.bfaRegistration).toBeDefined();
      expect(Array.isArray(contract.bfaRegistration.entities)).toBe(true);
    }
  });

  it('F29A-18: T441 (AdaptiveRagRouter) has ORCHESTRATION archetype', () => {
    const t441 = createT441Contract();
    expect(t441.archetype).toBe(ContractArchetype.ORCHESTRATION);
  });
});
