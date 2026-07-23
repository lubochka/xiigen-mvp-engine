/**
 * MetaArbiterRegistry — registry for meta-layer arbiters.
 *
 * Separate from standard ArbiterRegistry. Meta-arbiters operate at the
 * session level (across rounds), not at the code-review level.
 *
 * layer = "meta" distinguishes these from standard per-round arbiters.
 *
 * 5 slots (SK-402–SK-406):
 *   SK-402: meta::spend-governor
 *   SK-403: meta::security-circuit-breaker
 *   SK-404: meta::improvement-detector
 *   SK-405: meta::model-fitness
 *   SK-406: meta::round-controller
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export type MetaVerdict = 'CONTINUE' | 'ESCALATE' | 'HALT' | 'ACCEPT';

export interface MetaArbiterDefinition {
  readonly id: string; // 'meta::spend-governor'
  readonly concern: string; // Human description
  readonly layer: 'meta'; // Always 'meta'
  readonly skillRef: string; // SK-402 ... SK-406
  readonly possibleVerdicts: readonly MetaVerdict[];
  readonly haltOnVerdicts: readonly MetaVerdict[]; // Verdicts that immediately halt
  readonly promptTemplate: string; // Template with {{ROUND_SUMMARY}} placeholder
}

export const EMPTY_META_ARBITER_SLOTS: readonly MetaArbiterDefinition[] = [
  {
    id: 'meta::spend-governor',
    concern: 'Enforce per-session spend limit from FREEDOM config — CF-789',
    layer: 'meta',
    skillRef: 'SK-402',
    possibleVerdicts: ['CONTINUE', 'HALT'],
    haltOnVerdicts: ['HALT'],
    promptTemplate:
      '// SK-402 SpendGovernorPattern — stub, implemented in FLOW-35 Phase B.\n// {{ROUND_SUMMARY}}',
  },
  {
    id: 'meta::security-circuit-breaker',
    concern: 'Pattern match generated code for credential leaks, forbidden imports — CF-790',
    layer: 'meta',
    skillRef: 'SK-403',
    possibleVerdicts: ['CONTINUE', 'HALT'],
    haltOnVerdicts: ['HALT'],
    promptTemplate:
      '// SK-403 SecurityCircuitBreakerPattern — stub, implemented in FLOW-35 Phase B.\n// {{ROUND_SUMMARY}}',
  },
  {
    id: 'meta::improvement-detector',
    concern: 'Detect IMPROVING / PLATEAUED / REGRESSING trend across rounds',
    layer: 'meta',
    skillRef: 'SK-404',
    possibleVerdicts: ['CONTINUE', 'ESCALATE'],
    haltOnVerdicts: [],
    promptTemplate:
      '// SK-404 ImprovementDetectorPattern — stub, implemented in FLOW-35 Phase C.\n// {{ROUND_SUMMARY}}',
  },
  {
    id: 'meta::model-fitness',
    concern: 'Per-model acceptance rate and cost efficiency tracking',
    layer: 'meta',
    skillRef: 'SK-405',
    possibleVerdicts: ['CONTINUE', 'ESCALATE'],
    haltOnVerdicts: [],
    promptTemplate:
      '// SK-405 ModelFitnessPattern — stub, implemented in FLOW-35 Phase D.\n// {{ROUND_SUMMARY}}',
  },
  {
    id: 'meta::round-controller',
    concern: 'Combine all meta-arbiter verdicts into final RoundDecision',
    layer: 'meta',
    skillRef: 'SK-406',
    possibleVerdicts: ['CONTINUE', 'ESCALATE', 'HALT', 'ACCEPT'],
    haltOnVerdicts: ['HALT'],
    promptTemplate:
      '// SK-406 RoundControllerPattern — stub, implemented in FLOW-35 Phase E.\n// {{ROUND_SUMMARY}}',
  },
];

export class MetaArbiterRegistry {
  private readonly registry: Map<string, MetaArbiterDefinition>;

  constructor(definitions: readonly MetaArbiterDefinition[] = EMPTY_META_ARBITER_SLOTS) {
    this.registry = new Map(definitions.map((d) => [d.id, d]));
  }

  get count(): number {
    return this.registry.size;
  }

  getById(id: string): DataProcessResult<MetaArbiterDefinition> {
    const def = this.registry.get(id);
    if (!def)
      return DataProcessResult.failure(
        'META_ARBITER_NOT_FOUND',
        `Meta-arbiter '${id}' not registered`,
      );
    return DataProcessResult.success(def);
  }

  getAll(): readonly MetaArbiterDefinition[] {
    return [...this.registry.values()];
  }

  getBySkillRef(skillRef: string): DataProcessResult<MetaArbiterDefinition> {
    const def = [...this.registry.values()].find((d) => d.skillRef === skillRef);
    if (!def)
      return DataProcessResult.failure(
        'META_ARBITER_NOT_FOUND',
        `No meta-arbiter with skillRef '${skillRef}'`,
      );
    return DataProcessResult.success(def);
  }

  hasAllSlots(): boolean {
    return this.registry.size === 5;
  }
}
