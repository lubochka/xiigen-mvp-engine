# Activation Rules — When Each Block Fires

## Rule Table

| Block | Activates When | Example |
|-------|---------------|---------|
| SK-PLAN | `iteration ≤ 2` OR `archetype === 'ORCHESTRATION'` | First or second generation attempt; any orchestration archetype |
| SK-DNA | `dna_compliance < 0.7` OR `isNewService === true` | Prior generation scored 0.65 on DNA; generating a new service file |
| SK-TEST | `test_quality < 0.5` | Generated output had only 1 of 3 required test levels |
| SK-BFA | `hasNewEntities OR hasNewEvents OR hasNewRoutes` | Spec introduces a new entity type, publishes a new event, or adds a REST route |
| SK-DOCS | `isLastStep === true` | Final step of the generation cycle |

## Priority When > 3 Candidates Active

Priority order (highest first):
1. **SK-DNA** — DNA violations in generated code are the most costly to fix post-generation
2. **SK-BFA** — Cross-flow conflicts discovered after generation require rollback
3. **SK-PLAN** — Planning governance prevents artifact collisions before they happen
4. **SK-TEST** — Test coverage gaps are recoverable in a follow-up session
5. **SK-DOCS** — Documentation can sync after generation without blocking the output

## Worked Examples

### Example 1: First-iteration ORCHESTRATION task, DNA score 0.65, new service
- SK-PLAN: YES (`iteration ≤ 2` AND `archetype === 'ORCHESTRATION'`)
- SK-DNA: YES (`dna_compliance < 0.7` AND `isNewService`)
- SK-TEST: NO (`test_quality` not specified as < 0.5)
- SK-BFA: NO (no new entities/events/routes)
- SK-DOCS: NO (not last step)

**Result:** [SK-DNA, SK-PLAN] — 2 blocks (both fit under 3 limit)

### Example 2: Third-iteration DATA_PIPELINE, test quality 0.3, new route added
- SK-PLAN: NO (`iteration = 3 > 2`, archetype not ORCHESTRATION)
- SK-DNA: NO (assume dna_compliance ≥ 0.7)
- SK-TEST: YES (`test_quality = 0.3 < 0.5`)
- SK-BFA: YES (`hasNewRoutes = true`)
- SK-DOCS: NO (not last step)

**Result:** [SK-BFA, SK-TEST] — 2 blocks

### Example 3: Last step of cycle, 4 blocks all active
- SK-DNA active (score 0.6), SK-BFA active (new event), SK-PLAN active (iteration 1), SK-DOCS active (last step)

**Result:** [SK-DNA, SK-BFA, SK-PLAN] — SK-DOCS dropped (lowest priority)

## What NOT to Do

- Do NOT activate SK-PLAN on every call "just in case" — the planning governance should be resolved before generation starts, not during
- Do NOT activate SK-DOCS mid-cycle — it signals "update docs now" which interrupts generation flow
- Do NOT skip SK-DNA even at high-confidence (score 0.9) if `isNewService` is true — new services always need DNA governance active
