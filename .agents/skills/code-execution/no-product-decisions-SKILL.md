# No Product Decisions — XIIGen

> ABSOLUTE constraint — priority 2 in governance chain. Cannot be overridden.

**Priority:** ABSOLUTE — second only to agent-constitution

---

## What This Skill Does

Prevents Claude Code from making product decisions that belong to Luba. Every DNA threshold, every scoring weight, every quality gate criterion is a product decision. Claude Code executes — it does not decide.

---

## The Core Rule

**Claude Code may not change behavior that affects engine output without Luba's explicit approval.**

Product decisions include, but are not limited to:
- DNA pattern thresholds (e.g., compliance score cutoffs in quality-scorer.ts)
- Quality scoring weights (test_quality, spec_adherence, etc.)
- AF station activation logic (which archetypes trigger which stations)
- BFA severity classification
- Task type contract requirements (which fields are mandatory)
- Flow promotion criteria (what score constitutes "ready")
- Model selection logic (when to use Claude vs GPT-4o vs Gemini)

---

## The XIIGen Analog of FIX-27

**What happened with FIX-27 (translated to XIIGen context):**

A developer changed the DNA compliance threshold in `quality-scorer.ts` from `0.7` to `0.8` to "improve quality." The change broke backward compatibility with FLOW-01 through FLOW-05 — six flows that previously passed were now marked as FAILURE overnight, with no warning and no rollback path. The engine was generating the same output it always had; the scorer's criteria had changed beneath it.

**The pattern:**
- Symptom: Flows that worked yesterday fail today
- Root cause: A "small" threshold/weight change that seemed like a bugfix
- Why it happened: Developer confused "fixing a bug in the scorer" with "deciding what score is acceptable"
- The rule that emerged: Scoring behavior is product behavior. Fix the code, not the criteria.

---

## What Claude Code CAN Do (Without Approval)

- Fix a bug where the scorer returns `NaN` (that's a code defect)
- Fix a bug where a DNA check crashes with a null pointer (code defect)
- Fix a bug where AF-9 calculates quality score using the wrong task type's contract (code defect)
- Add new test coverage for existing behavior
- Refactor code that doesn't change observable output

## What Claude Code CANNOT Do (Requires Luba Approval)

- Change any numeric threshold that affects pass/fail outcomes
- Change scoring weight distributions
- Add or remove required fields from engine contracts
- Change which AF stations run for a given archetype
- Change which DNA patterns apply to which generated code types
- Modify BFA conflict rules
- Add new quality layers without approval

---

## Baseline Regression Check

Before any change to guardrails/, learning/, or engine-contracts/, run:

```bash
# Record current output shapes for existing flows
grep -r "StationOutput\|DataProcessResult\|qualityScore\|dnaCompliance" \
  server/src/guardrails/ server/src/learning/ | head -50

# Check which flows will be affected
grep -r "FLOW-0[1-9]\|FLOW-[12][0-9]\|FLOW-3[01]" \
  server/src/engine-contracts/ server/src/factories/
```

If the change touches anything that affects the above output shapes: **STOP and escalate.**

---

## Decision Log Requirement

Every time Claude Code is tempted to change a threshold and does not (because this rule applies), log it:

```
AVOIDED-PRODUCT-DECISION: [date]
File: [file]
What I almost changed: [description]
Why I didn't: no-product-decisions rule
What Luba should decide: [the actual question]
```

Write this to DECISIONS.md so Luba can review and decide explicitly.

---

## Reference Files

| File | Read When |
|------|-----------|
| [rules/no-product-decisions.md](rules/no-product-decisions.md) | Language rules for identifying product decisions |
| [rules/baseline-regression-check.md](rules/baseline-regression-check.md) | Protocol for regression baseline before guardrail changes |
| [rules/session-completeness-rule.md](rules/session-completeness-rule.md) | What "done" means under this constraint |
