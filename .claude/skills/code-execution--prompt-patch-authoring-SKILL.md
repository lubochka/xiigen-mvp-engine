---
name: prompt-patch-authoring
sk_number: SK-472
version: "1.0.0"
priority: HIGH
load_order: 3
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  How to write a PromptPatch that improves the target sub-score without
  regressing other sub-scores. Covers: WRONG/CORRECT format, specificity
  calibration, regression prevention, and when to patch vs rewrite entirely.
  The most common PromptPatch failure is patching one thing and regressing
  another — this skill prevents that.
triggers:
  - "write a prompt patch"
  - "PromptPatch"
  - "fix this score"
  - "add WRONG CORRECT example"
  - "genesis prompt correction"
  - "prompt patch regression"
  - "prompt iteration"
---

# Prompt Patch Authoring Skill (SK-472)

## WHAT THIS SKILL PREVENTS

Patching one sub-score (iron_rules) and causing a regression in another (dna_compliance).
Over-specifying the patch → score 0.90+ that leaves no room for model understanding →
high-quality score that produces low-value training data (both chosen and rejected
look identical). Under-specifying → score doesn't move.

---

## RULE 0 — PATCH ONLY THE BOTTLENECK

A PromptPatch must target exactly ONE failing check. If multiple sub-scores are low,
fix the lowest one per cycle. Patching multiple issues in one cycle makes it impossible
to know which patch caused which score change.

```bash
# Before patching, confirm the bottleneck sub-score
# from SK-471 score-interpretation output
echo "Patching: [sub-score]  Current value: [X]  Target: ≥ 0.85"
```

---

## RULE 1 — FORMAT: ONE BLOCK, WRONG/CORRECT PAIR

Every PromptPatch is a single targeted block appended to the genesis prompt.

```
## NAMED CHECK: [check-id]

WRONG (what the model generates without this guidance):
[Exact code/pattern that triggers the failing check]
Reason wrong: [one sentence — why this violates the constraint]

CORRECT (what the model should generate instead):
[Exact code/pattern that satisfies the check]
Reason correct: [one sentence — what invariant this preserves]
```

**The WRONG example must be the exact failure mode observed**, not a generalization.
If the model wrote `config.get('qrTokenTtl', 60)` for a MACHINE constant, the WRONG
example is exactly `config.get('qrTokenTtl', 60)` — not "avoid using config.get for
constants."

---

## RULE 2 — SPECIFICITY CALIBRATION

The relationship between prompt specificity and expected cycle-1 score:

| Specificity level | Cycle-1 score | Training data value |
|-------------------|---------------|---------------------|
| Vague (principles only) | 0.40–0.60 | High — model demonstrates understanding |
| Moderate (named checks listed, concept examples) | 0.65–0.80 | Good |
| High (concrete WRONG/CORRECT, full examples) | 0.80–0.90 | Moderate |
| Prescriptive (line-by-line instructions, complete code) | 0.90–1.0 | Low — both chosen/rejected near-identical |

**Target zone: 0.80–0.90** after patching. If a patch brings a score above 0.90,
the patch is over-specified. Loosen it: replace concrete code fragments with
concept-level descriptions.

```python
# Check if patch is in the target zone after the next cycle
score = float(input("post-patch score: "))
if score > 0.90:
    print("OVER-SPECIFIED — loosen: replace code with concept description")
elif score < 0.80:
    print("STILL LOW — check: did the patch target the right sub-score?")
else:
    print("TARGET ZONE — keep this patch")
```

---

## RULE 3 — REGRESSION PREVENTION BEFORE SUBMITTING

Before adding the patch to the genesis prompt, run this check:

```bash
# Step A: Find all existing NAMED CHECK sections in the genesis prompt
grep -n "NAMED CHECK:" fixtures/prompts/t47-genesis-*.json

# Step B: For each existing check, verify the patch WRONG example doesn't
# contradict the existing check's CORRECT example
# Example conflict: existing check says "use IScopedMemoryService.increment()"
# New patch says (in WRONG): "raw Redis INCR is wrong" — this is fine
# Conflict: existing check says X is correct; new patch WRONG example is X

# Step C: Does the new CORRECT example use any raw SDK calls?
echo "New patch correct example:" 
grep -A 5 "CORRECT" <patch-text>
# Expected: only fabric interface calls (IScopedMemoryService, ISchedulerService, etc.)
# SDK imports in a CORRECT example = DNA violation in training data
```

---

## RULE 4 — WHEN TO PATCH VS REWRITE

**Patch if:**
- Score is in DETAIL_GAP (0.65–0.84)
- Only 1 sub-score is below threshold
- The genesis prompt has correct structure, only a specific case is missing
- Cycle budget has ≥ 1 remaining

**Rewrite the genesis section if:**
- Score is PATTERN_MISSING (0.50–0.64)
- Multiple sub-scores are below threshold for the same archetype dimension
- The existing patch history shows 2+ patches targeting the same check without improvement
- The NODE intent doesn't match what the genesis prompt communicates

**Full genesis rewrite if:**
- Score is STRUCTURAL (<0.50)
- The model has clearly misunderstood the capability
- Genesis Section 1 (purpose) doesn't match the NODE intent statement

---

## RULE 5 — MULTI-GENERATE CONTEXT (when A-4 is active)

When `multi-generate.handler` is active, the PromptPatch applies to the genesis
prompt shared by all generator models. A patch that improves one model's output
may not improve another's — the patch targets the prompt, not the model.

After patching, verify: do BOTH generators now avoid the WRONG pattern?

```bash
# Check both chosen and rejected from the patched cycle
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -d '{"query":{"term":{"flowId.keyword":"FLOW-XX"}},
       "sort":[{"timestamp":"desc"}],"size":1}' \
  | jq '.hits.hits[0]._source | {
      chosenModel: .chosen.model,
      rejectedModel: .rejected.model,
      sameModel: (.chosen.model == .rejected.model)
    }'
# sameModel: false confirms multi-generate is active and valid
```

---

## RULE 6 — RECORD THE PATCH

```bash
# Append to patch history in STATE.json
jq --argjson patch '{
  "cycle": 2,
  "taskTypeId": "T47",
  "targetSubScore": "iron_rules",
  "scoreBeforePatch": 0.60,
  "checkTargeted": "scope-id-isolation",
  "patchType": "NAMED_CHECK_ADDITION",
  "specificity": "MODERATE"
}' '.patchHistory += [$patch]' FLOW-XX-STATE.json > tmp.json && mv tmp.json FLOW-XX-STATE.json
```

---

## ANTI-PATTERNS

```
❌ Patching multiple sub-scores in one cycle — impossible to attribute improvement
❌ CORRECT example contains IScopedMemoryService.setIfAbsent(key, val) ← correct
   but also has: this.redis.set(key, val) ← DNA violation in training data
❌ Patch brings score from 0.65 to 0.95 — over-specified; strip detail
❌ Writing 5 WRONG/CORRECT pairs in one patch — one pair per cycle
❌ Patching after cycle budget exhausted — escalate to human, don't extend budget
```
