# Skill Advisor — XIIGen

> Governs how governance skill blocks are selected, validated, and injected into AF-1 Genesis.

**SK Number:** SK-405
**Load Order:** 4 (ADVISOR — after governance chain, before planning)

---

## What This Skill Does

Maps the skill injection pipeline across three AF stations:
- **AF-4 (RAG Context):** Selects which skill blocks to inject based on context
- **AF-9 (Judge):** Cross-validates the selection using a different model
- **AF-11 (Feedback):** Tracks skill effectiveness to improve future selections

The Skill Advisor is the mechanism by which governance rules become part of every AI generation call. Without it, the engine generates code that may violate DNA patterns, miss BFA registrations, or skip required test layers.

---

## Architecture: Advisor → Judge → Memory

```
StationInput
    ↓
AF-4 selectSkillsForContext()
  → reads archetype, quality scores, iteration count
  → picks ≤ 3 skill blocks from: SK-PLAN, SK-TEST, SK-DNA, SK-BFA, SK-DOCS
  → returns SkillBlock[] with rationale
    ↓
AF-9 cross-validate (different model)
  → PRIMARY: Claude (advises selection)
  → CROSS_VALIDATE: GPT-4o or Gemini (judges selection quality)
  → if judge rejects: select different blocks
  → returns validated SkillBlock[]
    ↓
AF-1 Genesis
  → receives injected skill blocks as prompt context
  → generates code with governance context active
    ↓
AF-11 trackSkillEffectiveness()
  → records: skillsActive[], scoreDelta, passedDNACheck, passedBFACheck
  → feeds back to AF-4 via getSkillEffectiveness(key): number
```

---

## The 5 Injectable Skill Blocks

### SK-PLAN — Planning Governance
**Content type:** Planning gates reference + artifact number protocol
**Token budget:** ≤ 800 tokens

### SK-TEST — Testing Requirements
**Content type:** Three-level verification (unit + simulation + e2e) requirements
**Token budget:** ≤ 800 tokens

### SK-DNA — DNA Compliance
**Content type:** 9 DNA patterns, detection rules, fix patterns
**Token budget:** ≤ 800 tokens

### SK-BFA — BFA Registration
**Content type:** Cross-flow conflict prevention, entity/event/route registration protocol
**Token budget:** ≤ 800 tokens

### SK-DOCS — Documentation Sync
**Content type:** Which canonical docs to update for each change type
**Token budget:** ≤ 800 tokens

---

## Activation Rules (MACHINE — not configurable)

```
SK-PLAN: iteration ≤ 2  OR  archetype === 'ORCHESTRATION'
SK-DNA:  dna_compliance < 0.7  OR  new service being generated
SK-TEST: test_quality < 0.5
SK-BFA:  new entities/events/routes in spec
SK-DOCS: last step of generation cycle
```

**Hard limit: maximum 3 skill blocks per AF call.**

Rationale: token budget. AF-1 prompt already includes the engine contract, factory interfaces, and generation instructions. Adding more than 3 skill blocks causes the core instructions to be truncated by the context window.

---

## Selection Algorithm

```typescript
function selectSkillsForContext(input: StationInput): SkillBlock[] {
  const candidates: SkillBlock[] = [];

  // Apply activation rules
  if (input.iteration <= 2 || input.archetype === 'ORCHESTRATION') {
    candidates.push(SK_PLAN);
  }
  if (input.dna_compliance < 0.7 || input.isNewService) {
    candidates.push(SK_DNA);
  }
  if (input.test_quality < 0.5) {
    candidates.push(SK_TEST);
  }
  if (input.hasNewEntities || input.hasNewEvents || input.hasNewRoutes) {
    candidates.push(SK_BFA);
  }
  if (input.isLastStep) {
    candidates.push(SK_DOCS);
  }

  // Enforce max 3 blocks
  // Priority order when > 3 candidates: DNA > BFA > PLAN > TEST > DOCS
  return candidates
    .sort(byPriority)
    .slice(0, 3);
}
```

Priority order when candidates exceed 3:
1. SK-DNA (highest — DNA violations corrupt generated output)
2. SK-BFA (second — cross-flow conflicts are hard to detect later)
3. SK-PLAN (third — planning governance prevents artifact collisions)
4. SK-TEST (fourth — test coverage gaps are recoverable)
5. SK-DOCS (lowest — doc sync can run after generation)

---

## Cross-Validation Protocol (AF-9)

AF-9 uses a **different model** than AF-1 to judge the skill selection. This is deliberate — a model that generates code should not also evaluate its own governance context selection.

### Model Assignment
| Role | Model |
|------|-------|
| PRIMARY (advisor) | Claude (same model as AF-1) |
| CROSS_VALIDATE (judge) | GPT-4o or Gemini (configured in FREEDOM layer) |

### Judge Criteria
The cross-validation model evaluates:
1. Are the selected blocks appropriate for the archetype?
2. Would missing any non-selected block risk a DNA or BFA violation?
3. Is the rationale coherent with the activation rules?

### If Judge Rejects
If AF-9's cross-validation model rejects the selection:
1. Record the rejection with `scoreDelta` = negative
2. Re-run AF-4 with the judge's feedback as additional context
3. If re-selection also rejected: escalate (do not loop indefinitely)
4. Maximum 2 re-selection attempts before escalating

---

## Effectiveness Tracking (AF-11)

After each generation cycle, AF-11 records:
```typescript
interface SkillEffectivenessRecord {
  skillKey: string;           // 'SK-PLAN', 'SK-DNA', etc.
  taskType: string;           // T-XXX
  archetype: string;          // 'ORCHESTRATION', etc.
  scoreDelta: number;         // quality score change after injection
  passedDNACheck: boolean;
  passedBFACheck: boolean;
  iteration: number;
  tenantId: string;
}
```

`getSkillEffectiveness(skillKey: string): number` returns the rolling average `scoreDelta` for that skill key, used to inform AF-4's priority ordering for future calls.

---

## GSD Patterns

### context-hygiene.md
Each AF station call receives a CLEAN prompt — no state leaked from previous calls. Skill blocks are re-injected fresh each time, not accumulated. Old effectiveness data informs selection priority but does NOT appear in the prompt.

### parallel-wave-protocol.md
Routing based on quality score:
- `score < 0.7` → parallel model calls (Claude + cross-validate simultaneously)
- `score > 0.7` → single model call (Claude only, no cross-validation overhead)

This prevents the overhead of cross-validation becoming a bottleneck for high-confidence generations.

---

## Anti-Patterns

1. **Injecting all 5 blocks every call** — context window overflow truncates core instructions
2. **Skipping cross-validation when score is low** — low-score generations need the second opinion most
3. **Letting effectiveness scores go stale** — AF-11 tracks per-tenant, so multi-tenant sessions need separate effectiveness records
4. **Changing activation thresholds without Luba approval** — those are product decisions (see no-product-decisions)
5. **Using same model for advisor AND judge** — defeats the purpose of cross-validation

---

## Reference Files

| File | When to Read |
|------|-------------|
| [references/skill-blocks.md](references/skill-blocks.md) | Full content of each injectable block |
| [references/activation-rules.md](references/activation-rules.md) | When each block activates (with examples) |
| [references/cross-validation.md](references/cross-validation.md) | AF-9 judge protocol |
| [references/effectiveness-tracking.md](references/effectiveness-tracking.md) | AF-11 metrics format |
| [references/context-hygiene.md](references/context-hygiene.md) | Clean prompt discipline |
| [references/parallel-wave-protocol.md](references/parallel-wave-protocol.md) | Multi-model routing logic |
