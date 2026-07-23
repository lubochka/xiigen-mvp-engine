/**
 * FLOW-46 Platform Agent — Design Contract Tests (DC-01..DC-10)
 *
 * Authored from FLOW-46-TEACH-QA-R0.md Phase 4 §4.1.
 * Validates the structure of PLATFORM_AGENT_CONTRACTS + FLOW_46_BFA_RULES
 * shipped in Phase A. These guard the design surface — every change to a
 * contract must update both the source and these specs together.
 *
 * Scope: structure-only (no runtime). SNAP-01..SNAP-21 + INT-1..INT-4 are
 * deferred — they require helpers (buildAgentSessionSnapshot, runAgentSession)
 * and live infrastructure (ES + queue) that are not yet wired.
 */

import { PLATFORM_AGENT_CONTRACTS } from '../../../../engine-contracts/platform-agent-contracts';
import { FLOW_46_BFA_RULES } from '../../../../engine-contracts/platform-agent-bfa-rules';

describe('FLOW-46 platform-agent — Design Contract Tests (DC-01..DC-10)', () => {
  it('DC-01: contracts count equals design spec (7 task types T650-T656)', () => {
    expect(PLATFORM_AGENT_CONTRACTS).toHaveLength(7);
    expect(PLATFORM_AGENT_CONTRACTS.map((c) => c.taskTypeId)).toEqual([
      'T650',
      'T651',
      'T652',
      'T653',
      'T654',
      'T655',
      'T656',
    ]);
  });

  it('DC-02: each contract declares required iron rules (min 3 per node per master plan)', () => {
    for (const c of PLATFORM_AGENT_CONTRACTS) {
      const ironRules = (c as { ironRules?: unknown[] }).ironRules;
      expect(Array.isArray(ironRules)).toBe(true);
      expect(ironRules!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('DC-03: archetype assignments match DESIGN-SIMULATION-R1', () => {
    const expected: Record<string, string> = {
      T650: 'orchestration',
      T651: 'governance',
      T652: 'data_pipeline',
      T653: 'validation',
      T654: 'transaction',
      T655: 'data_pipeline',
      T656: 'routing',
    };
    for (const c of PLATFORM_AGENT_CONTRACTS) {
      const id = c.taskTypeId as string;
      expect(c.archetype).toBe(expected[id]);
    }
  });

  it('DC-04: T651 + T653 + T655 declare their BFA rules (CF-839/840/841)', () => {
    const t651 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T651');
    const t653 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T653');
    const t655 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T655');
    expect((t651 as { bfaRules: string[] }).bfaRules).toEqual(['CF-839']);
    expect((t653 as { bfaRules: string[] }).bfaRules).toEqual(['CF-840']);
    expect((t655 as { bfaRules: string[] }).bfaRules).toEqual(['CF-841']);
  });

  it('DC-05: BFA rules file declares exactly 3 rules with correct task bindings', () => {
    const baseRules = FLOW_46_BFA_RULES.filter((r) =>
      ['CF-839', 'CF-840', 'CF-841'].includes(r.ruleId as string),
    );
    expect(baseRules).toHaveLength(3);
    const byId = new Map(FLOW_46_BFA_RULES.map((r) => [r.ruleId as string, r]));
    expect((byId.get('CF-839') as { taskTypeId: string }).taskTypeId).toBe('T651');
    expect((byId.get('CF-840') as { taskTypeId: string }).taskTypeId).toBe('T653');
    expect((byId.get('CF-841') as { taskTypeId: string }).taskTypeId).toBe('T655');
  });

  it('DC-06: T650 arbiterConfig declares goal_delivery with runsFirst=true + isolated=true + governedBy=SK-534', () => {
    const t650 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T650');
    const arbiterConfig = (t650 as { arbiterConfig: { evaluatorArbiters: Record<string, Record<string, unknown>> } })
      .arbiterConfig;
    const gd = arbiterConfig.evaluatorArbiters.goal_delivery;
    expect(gd.runsFirst).toBe(true);
    expect(gd.isolated).toBe(true);
    expect(gd.governedBy).toBe('SK-534');
  });

  it('DC-07: T650 arbiterConfig declares scope_isolation with governedBy=SK-526', () => {
    const t650 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T650');
    const arbiterConfig = (t650 as { arbiterConfig: { evaluatorArbiters: Record<string, Record<string, unknown>> } })
      .arbiterConfig;
    const si = arbiterConfig.evaluatorArbiters.scope_isolation;
    expect(si.governedBy).toBe('SK-526');
  });

  it('DC-08: T650 ORCHESTRATION declares all 9 correctness arbiters + super_judge_meta (10 total)', () => {
    const t650 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T650');
    const evaluators = Object.keys(
      (t650 as { arbiterConfig: { evaluatorArbiters: Record<string, unknown> } }).arbiterConfig.evaluatorArbiters,
    );
    expect(evaluators).toEqual(
      expect.arrayContaining([
        'goal_delivery',
        'scope_isolation',
        'business_logic',
        'security',
        'skills_patterns',
        'prompts_compliance',
        'key_principles',
        'iron_rules',
        'completeness',
        'super_judge_meta',
      ]),
    );
    expect(evaluators.length).toBe(10);
  });

  it('DC-09: blockSemanticsBehavior is ANY_BLOCK_CLASS_REJECTS across all contracts that declare it', () => {
    for (const c of PLATFORM_AGENT_CONTRACTS) {
      const arbiterConfig = (c as { arbiterConfig?: { blockSemanticsBehavior?: unknown } }).arbiterConfig;
      const bsb = arbiterConfig?.blockSemanticsBehavior;
      if (bsb !== undefined) expect(bsb).toBe('ANY_BLOCK_CLASS_REJECTS');
    }
  });

  it('DC-10: T656 AgentChatClient archetype is routing + executionModel is client', () => {
    const t656 = PLATFORM_AGENT_CONTRACTS.find((c) => c.taskTypeId === 'T656');
    expect((t656 as { archetype: string }).archetype).toBe('routing');
    expect((t656 as { executionModel: string }).executionModel).toBe('client');
  });
});
