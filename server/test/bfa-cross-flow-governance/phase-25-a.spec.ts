/**
 * FLOW-25 Phase A Tests — Archetypes + Contracts + Genesis Prompts + Arbiters.
 *
 * SESSION FLOW-25-A: Gate = 14 contracts registered, 12 arbiters defined, compiles.
 *
 * Tests:
 *   A-1: 6 new ContractArchetype values registered
 *   A-2: ALL_ARCHETYPES includes all 11 values (5 original + 6 new)
 *   A-3: isValidArchetype works for all 6 new values
 *   A-4: All 14 contracts validate successfully (T375–T388)
 *   A-5: All 14 contracts belong to correct family (147–152)
 *   A-6: Factory IDs F1028–F1062 all registered (35 total across 14 contracts)
 *   A-7: BFA_CONFLICT_ARBITRATION_CONTRACTS array has exactly 14 entries
 *   A-8: T375 uses QUEUE FABRIC for IChangeEventEmitter (F1029)
 *   A-9: T378 uses AI_ENGINE FABRIC for ISemanticAnalysisRunner (F1034)
 *   A-10: T381 (ArbitrationStateMachine) archetype is ARBITRATION
 *   A-11: T380 (BlastRadiusCalculator) archetype is BLAST_RADIUS
 *   A-12: T382 (ImpactReportGenerator) archetype is SYNTHESIS
 *   A-13: T385 has ironRules referencing insert-only constraint
 *   A-14: T381 has 4 factory dependencies (most complex contract)
 *
 *   P-1: All 14 genesis prompts have connection_type=FLOW_SCOPED
 *   P-2: All 14 genesis prompts have flow_id=FLOW-25
 *   P-3: BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS has exactly 14 entries
 *   P-4: T381 genesis prompt mentions DNA-8 and score 0 critical rule
 *   P-5: T382 genesis prompt mentions CF-489 (FORCE_PROCEED permission)
 *   P-6: T380 genesis prompt mentions visited set + cycle detection
 *   P-7: Each task type has exactly one genesis prompt
 *
 *   R-1: BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS has exactly 12 entries
 *   R-2: All 6 archetype pairs present (2 per archetype)
 *   R-3: arbitration::state-machine-integrity has criticalRules in prompt (IR-381-1, CF-487)
 *   R-4: synthesis::report-safety has criticalRules in prompt (CF-489)
 *   R-5: All 12 arbiters have minPassScore >= 70
 *   R-6: All 12 arbiters contain {{CODE}} placeholder in promptTemplate
 *   R-7: Extending BASE_ARBITERS with BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS → 16 total
 *   R-8: ArbiterRegistry lookup works for all 12 FLOW-25 arbiters by id
 */

import {
  ContractArchetype,
  ALL_ARCHETYPES,
  isValidArchetype,
} from '../../src/engine-contracts/archetypes';
import {
  BFA_CONFLICT_ARBITRATION_CONTRACTS,
  createT375Contract,
  createT376Contract,
  createT377Contract,
  createT378Contract,
  createT379Contract,
  createT380Contract,
  createT381Contract,
  createT382Contract,
  createT383Contract,
  createT384Contract,
  createT385Contract,
  createT386Contract,
  createT387Contract,
  createT388Contract,
} from '../../src/engine-contracts/bfa-conflict-arbitration-contracts';
import {
  BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS,
  T381_GENESIS_PROMPT,
  T382_GENESIS_PROMPT,
  T380_GENESIS_PROMPT,
} from '../../src/engine-contracts/bfa-conflict-arbitration-seed-prompts';
import {
  BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS,
  BFA_CONFLICT_ARBITRATION_INGESTION_ARBITERS,
  BFA_CONFLICT_ARBITRATION_IMPACT_ANALYSIS_ARBITERS,
  BFA_CONFLICT_ARBITRATION_BLAST_RADIUS_ARBITERS,
  BFA_CONFLICT_ARBITRATION_ARBITRATION_ARBITERS,
  BFA_CONFLICT_ARBITRATION_SYNTHESIS_ARBITERS,
  BFA_CONFLICT_ARBITRATION_GOVERNANCE_ARBITERS,
} from '../../src/engine/arbitration/bfa-cross-flow-governance-arbiters';
import { ArbiterRegistry, BASE_ARBITERS } from '../../src/engine/arbitration/arbiter-registry';
import { FabricType } from '../../src/factories/fabric-type';

// ── Archetype tests ────────────────────────────────────────────────────────

describe('FLOW-25 Phase A — Archetypes', () => {
  it('A-1: 6 new ContractArchetype values registered', () => {
    expect(ContractArchetype.INGESTION).toBe('ingestion');
    expect(ContractArchetype.IMPACT_ANALYSIS).toBe('impact_analysis');
    expect(ContractArchetype.BLAST_RADIUS).toBe('blast_radius');
    expect(ContractArchetype.ARBITRATION).toBe('arbitration');
    expect(ContractArchetype.SYNTHESIS).toBe('synthesis');
    expect(ContractArchetype.GOVERNANCE).toBe('governance');
  });

  it('A-2: ALL_ARCHETYPES includes all 65 values (5 original + 6 FLOW-25 + 10 FLOW-29 + 4 FLOW-33 + 2 FLOW-35 + 1 FLOW-36 + 1 FLOW-00 + 1 FLOW-01 + 11 additional + 3 FLOW-10 + 5 FLOW-13 + 3 FLOW-14 + 10 FLOW-15 + 1 FLOW-20 + 4 FLOW-18 + 1 FLOW-41/42/43/44)', () => {
    expect(ALL_ARCHETYPES).toHaveLength(65);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.SERVICE);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.DATA_PIPELINE);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.ORCHESTRATION);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.AI_GENERATION);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.COMPOSITE);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.INGESTION);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.IMPACT_ANALYSIS);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.BLAST_RADIUS);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.ARBITRATION);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.SYNTHESIS);
    expect(ALL_ARCHETYPES).toContain(ContractArchetype.GOVERNANCE);
  });

  it('A-3: isValidArchetype works for all 6 new values', () => {
    expect(isValidArchetype('ingestion')).toBe(true);
    expect(isValidArchetype('impact_analysis')).toBe(true);
    expect(isValidArchetype('blast_radius')).toBe(true);
    expect(isValidArchetype('arbitration')).toBe(true);
    expect(isValidArchetype('synthesis')).toBe(true);
    expect(isValidArchetype('governance')).toBe(true);
    expect(isValidArchetype('unknown_type')).toBe(false);
  });
});

// ── Contract tests ─────────────────────────────────────────────────────────

describe('FLOW-25 Phase A — Contracts', () => {
  it('A-4: All 14 contracts validate successfully', () => {
    for (const contract of BFA_CONFLICT_ARBITRATION_CONTRACTS) {
      const result = contract.validate();
      expect(result.isSuccess).toBe(true);
    }
  });

  it('A-5: All 14 contracts belong to correct families (147–152)', () => {
    const familyMap: Record<string, string> = {
      T375: 'Family-147',
      T376: 'Family-148',
      T377: 'Family-148',
      T378: 'Family-148',
      T379: 'Family-148',
      T380: 'Family-149',
      T381: 'Family-150',
      T383: 'Family-150',
      T384: 'Family-150',
      T382: 'Family-151',
      T385: 'Family-152',
      T386: 'Family-152',
      T387: 'Family-152',
      T388: 'Family-152',
    };
    for (const contract of BFA_CONFLICT_ARBITRATION_CONTRACTS) {
      expect(contract.familyId).toBe(familyMap[contract.taskTypeId]);
    }
  });

  it('A-6: Factory IDs F1028–F1062 all registered (35 factories across 14 contracts)', () => {
    const allFactoryIds = BFA_CONFLICT_ARBITRATION_CONTRACTS.flatMap((c) =>
      c.factoryDependencies.map((f) => f.factoryId),
    );
    // All factory IDs must be within F1028–F1074 range
    for (const fid of allFactoryIds) {
      const num = parseInt(fid.replace('F', ''), 10);
      expect(num).toBeGreaterThanOrEqual(1028);
      expect(num).toBeLessThanOrEqual(1074);
    }
    // Verify specific key factories
    expect(allFactoryIds).toContain('F1028'); // ChangeIntakeStore (T375)
    expect(allFactoryIds).toContain('F1034'); // SemanticAnalysisRunner (T378)
    expect(allFactoryIds).toContain('F1042'); // ArbitrationSessionStore (T381)
    expect(allFactoryIds).toContain('F1054'); // AuditTrailStore (T385)
    expect(allFactoryIds).toContain('F1061'); // AnalyticsEventStore (T388)
  });

  it('A-7: BFA_CONFLICT_ARBITRATION_CONTRACTS array has exactly 14 entries', () => {
    expect(BFA_CONFLICT_ARBITRATION_CONTRACTS).toHaveLength(14);
    const taskTypes = BFA_CONFLICT_ARBITRATION_CONTRACTS.map((c) => c.taskTypeId);
    for (const t of [
      'T375',
      'T376',
      'T377',
      'T378',
      'T379',
      'T380',
      'T381',
      'T382',
      'T383',
      'T384',
      'T385',
      'T386',
      'T387',
      'T388',
    ]) {
      expect(taskTypes).toContain(t);
    }
  });

  it('A-8: T375 uses QUEUE FABRIC for IChangeEventEmitter (F1029)', () => {
    const contract = createT375Contract();
    const queueDep = contract.factoryDependencies.find((f) => f.factoryId === 'F1029');
    expect(queueDep).toBeDefined();
    expect(queueDep!.fabricType).toBe(FabricType.QUEUE);
    expect(queueDep!.interfaceName).toBe('IChangeEventEmitter');
  });

  it('A-9: T378 uses AI_ENGINE FABRIC for ISemanticAnalysisRunner (F1034)', () => {
    const contract = createT378Contract();
    const aiDep = contract.factoryDependencies.find((f) => f.factoryId === 'F1034');
    expect(aiDep).toBeDefined();
    expect(aiDep!.fabricType).toBe(FabricType.AI_ENGINE);
    expect(aiDep!.interfaceName).toBe('ISemanticAnalysisRunner');
  });

  it('A-10: T381 (ArbitrationStateMachine) archetype is ARBITRATION', () => {
    const contract = createT381Contract();
    expect(contract.archetype).toBe(ContractArchetype.ARBITRATION);
    expect(contract.taskTypeId).toBe('T381');
    expect(contract.name).toBe('ArbitrationStateMachine');
  });

  it('A-11: T380 (BlastRadiusCalculator) archetype is BLAST_RADIUS', () => {
    const contract = createT380Contract();
    expect(contract.archetype).toBe(ContractArchetype.BLAST_RADIUS);
    expect(contract.taskTypeId).toBe('T380');
  });

  it('A-12: T382 (ImpactReportGenerator) archetype is SYNTHESIS', () => {
    const contract = createT382Contract();
    expect(contract.archetype).toBe(ContractArchetype.SYNTHESIS);
    expect(contract.taskTypeId).toBe('T382');
    expect(contract.name).toBe('ImpactReportGenerator');
  });

  it('A-13: T385 ironRules reference insert-only constraint (IR-385-1)', () => {
    const contract = createT385Contract();
    const rulesText = contract.ironRules.join(' ');
    expect(rulesText.toLowerCase()).toContain('insert');
    expect(rulesText).toContain('IR-385-1');
  });

  it('A-14: T381 (ArbitrationStateMachine) has 4 factory dependencies', () => {
    const contract = createT381Contract();
    expect(contract.factoryDependencies).toHaveLength(4);
    const ids = contract.factoryDependencies.map((f) => f.factoryId);
    expect(ids).toContain('F1042');
    expect(ids).toContain('F1043');
    expect(ids).toContain('F1044');
    expect(ids).toContain('F1045');
  });
});

// ── Genesis prompt tests ───────────────────────────────────────────────────

describe('FLOW-25 Phase A — Genesis Prompts', () => {
  it('P-1: All 14 genesis prompts have connection_type=FLOW_SCOPED', () => {
    for (const prompt of BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS) {
      expect(prompt.connection_type).toBe('FLOW_SCOPED');
    }
  });

  it('P-2: All 14 genesis prompts have flow_id=FLOW-25', () => {
    for (const prompt of BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS) {
      expect(prompt.flow_id).toBe('FLOW-25');
    }
  });

  it('P-3: BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS has exactly 14 entries', () => {
    expect(BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS).toHaveLength(14);
    const taskTypes = BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS.map((p) => p.taskType);
    for (const t of [
      'T375',
      'T376',
      'T377',
      'T378',
      'T379',
      'T380',
      'T381',
      'T382',
      'T383',
      'T384',
      'T385',
      'T386',
      'T387',
      'T388',
    ]) {
      expect(taskTypes).toContain(t);
    }
  });

  it('P-4: T381 genesis prompt mentions DNA-8 and score 0 critical rule (CF-487)', () => {
    expect(T381_GENESIS_PROMPT.promptText).toContain('DNA-8');
    expect(T381_GENESIS_PROMPT.promptText).toContain('CF-487');
    expect(T381_GENESIS_PROMPT.promptText).toContain('score 0');
  });

  it('P-5: T382 genesis prompt mentions CF-489 (FORCE_PROCEED permission)', () => {
    expect(T382_GENESIS_PROMPT.promptText).toContain('CF-489');
    expect(T382_GENESIS_PROMPT.promptText).toContain('FORCE_PROCEED');
    expect(T382_GENESIS_PROMPT.promptText).toContain('bfa:override');
  });

  it('P-6: T380 genesis prompt mentions visited set + cycle detection (CF-486)', () => {
    expect(T380_GENESIS_PROMPT.promptText).toContain('visited');
    expect(T380_GENESIS_PROMPT.promptText).toContain('CF-486');
    expect(T380_GENESIS_PROMPT.promptText).toContain('circular');
  });

  it('P-7: Each task type has exactly one genesis prompt', () => {
    const taskTypes = BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS.map((p) => p.taskType);
    const uniqueTaskTypes = new Set(taskTypes);
    expect(uniqueTaskTypes.size).toBe(14);
  });
});

// ── Arbiter tests ──────────────────────────────────────────────────────────

describe('FLOW-25 Phase A — Arbiters', () => {
  it('R-1: BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS has exactly 12 entries', () => {
    expect(BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS).toHaveLength(12);
  });

  it('R-2: All 6 archetype pairs present (2 per archetype)', () => {
    expect(BFA_CONFLICT_ARBITRATION_INGESTION_ARBITERS).toHaveLength(2);
    expect(BFA_CONFLICT_ARBITRATION_IMPACT_ANALYSIS_ARBITERS).toHaveLength(2);
    expect(BFA_CONFLICT_ARBITRATION_BLAST_RADIUS_ARBITERS).toHaveLength(2);
    expect(BFA_CONFLICT_ARBITRATION_ARBITRATION_ARBITERS).toHaveLength(2);
    expect(BFA_CONFLICT_ARBITRATION_SYNTHESIS_ARBITERS).toHaveLength(2);
    expect(BFA_CONFLICT_ARBITRATION_GOVERNANCE_ARBITERS).toHaveLength(2);

    const ids = BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS.map((a) => a.id);
    expect(ids).toContain('ingestion::immutability');
    expect(ids).toContain('ingestion::schema-validation');
    expect(ids).toContain('impact_analysis::scope-isolation');
    expect(ids).toContain('impact_analysis::ordering-gate');
    expect(ids).toContain('blast_radius::graph-traversal');
    expect(ids).toContain('blast_radius::report-completeness');
    expect(ids).toContain('arbitration::state-machine-integrity');
    expect(ids).toContain('arbitration::decision-validation');
    expect(ids).toContain('synthesis::report-safety');
    expect(ids).toContain('synthesis::decision-completeness');
    expect(ids).toContain('governance::immutable-audit');
    expect(ids).toContain('governance::tenant-safety');
  });

  it('R-3: arbitration::state-machine-integrity references critical rules IR-381-1 and CF-487', () => {
    const arbiter = BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS.find(
      (a) => a.id === 'arbitration::state-machine-integrity',
    )!;
    expect(arbiter).toBeDefined();
    expect(arbiter.promptTemplate).toContain('IR-381-1');
    expect(arbiter.promptTemplate).toContain('CF-487');
    expect(arbiter.promptTemplate).toContain('score 0');
  });

  it('R-4: synthesis::report-safety references critical rule CF-489', () => {
    const arbiter = BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS.find(
      (a) => a.id === 'synthesis::report-safety',
    )!;
    expect(arbiter).toBeDefined();
    expect(arbiter.promptTemplate).toContain('CF-489');
    expect(arbiter.promptTemplate).toContain('score 0');
    expect(arbiter.promptTemplate).toContain('bfa:override');
  });

  it('R-5: All 12 arbiters have minPassScore >= 70', () => {
    for (const arbiter of BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS) {
      expect(arbiter.minPassScore).toBeGreaterThanOrEqual(70);
    }
  });

  it('R-6: All 12 arbiters contain {{CODE}} placeholder in promptTemplate', () => {
    for (const arbiter of BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS) {
      expect(arbiter.promptTemplate).toContain('{{CODE}}');
    }
  });

  it('R-7: Extending BASE_ARBITERS with BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS → 16 total', () => {
    const registry = new ArbiterRegistry([
      ...BASE_ARBITERS,
      ...BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS,
    ]);
    expect(registry.count).toBe(19); // 7 base (G2: +business_logic, key_principles, iron_rules) + 12 FLOW-25
  });

  it('R-8: ArbiterRegistry lookup works for all 12 FLOW-25 arbiters by id', () => {
    const registry = new ArbiterRegistry([
      ...BASE_ARBITERS,
      ...BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS,
    ]);
    const arbiterIds = BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS.map((a) => a.id);
    for (const id of arbiterIds) {
      const result = registry.getById(id);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.id).toBe(id);
    }
  });
});
