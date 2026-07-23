---
name: difficulty-prediction
sk_number: SK-461
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  For any new flow, compute the cycle budget per task type before writing session
  files. Formula: archetype baseline + first-occurrence penalty + novelty sum
  - clarity discount. Doc 8 correction included: T64=1 (not 2) because the FIFO
  + distributed lock pattern is mechanically unambiguous from iron rules — clarity
  discount applies. Output is taskTypeCycleBudgets table ready for STATE.json.
  Without this skill, budgets are derived from judgment: T51=2 instead of 3,
  T64=2 instead of 1, BUG-4 empty dicts, calibration errors compounding at Wave 2.
triggers:
  - "cycle budget"
  - "cycleBudget"
  - "taskTypeCycleBudgets"
  - "how many cycles"
  - "difficulty prediction"
  - "STATE.json cycle"
  - "budget for this task type"
  - "novelty factor"
  - "P-4"
---

# Difficulty Prediction Skill (SK-461) v1.0

## THE FORMULA

```
cycleBudget(T) =
  archetype_baseline(T)
  + first_occurrence_penalty(T)
  + novelty_sum(T)
  − clarity_discount(T)
  + inversion_bonus(T)
```

Minimum result: 1. Maximum: 4 (rare — multi-pattern inversion cases only).

---

## STEP 1: ARCHETYPE BASELINE

All archetypes: baseline = **1**.

---

## STEP 2: FIRST OCCURRENCE PENALTY — QUERY RAG FIRST

```bash
ARCHETYPE="ROUTING"  # substitute each task type's archetype
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"bool": {"filter": [
      {"term": {"patternType.keyword": "ARCH_PATTERN"}},
      {"term": {"archetype.keyword": "'"${ARCHETYPE}"'"}}
    ]}},
    "_source": ["archetype", "flowId"],
    "size": 5
  }' | jq '.hits.total.value'
```

| RAG hits | Penalty |
|----------|---------|
| 0 (never seen) | +1 |
| 1+ (seen before) | +0 |

---

## STEP 3: NOVELTY SUM

For each **new named pattern** introduced simultaneously in this task type:

```
+0.5 per new named pattern, rounded up
Two new patterns simultaneously = +1
```

**Counts as new:** new fabric interface (ISchedulerService), new behavioral invariant
(atomic capacity, degraded-path terminal, wave gate), new domain concept with 0 RAG hits.

**Does not count:** standard DNA patterns, archetype-standard behavior, iron rules
already present in prior flow RAG patterns.

---

## STEP 4: CLARITY DISCOUNT (Doc 8 correction)

```
Clarity test: can the pattern be implemented correctly from iron rules and
DNA patterns alone, with no novel judgment required?

YES → −1 (clarity discount)
NO  → −0
```

This prevents over-budgeting for task types that are new archetypes but have
completely clear implementations. **This is why T64 = 1, not 2.**

---

## STEP 5: INVERSION BONUS

For task types where correct behavior **inverts** the DNA default:

```
machineConstants[].neverFromConfig: true in the contract → +1 (minimum budget 3)
Note in session file: "cycle 1 score-0 is expected — do not escalate before cycle 3"
```

---

## WORKED EXAMPLES (all canonical)

```
T47 (ROUTING, FLOW-01 first flow, 0 ROUTING patterns in RAG)
  1 + 1 + 0 − 0 + 0 = 2
  "P-4 rule: 0 prior occurrences → budget 2 for well-understood archetypes"

T48 (ROUTING + new ISchedulerService — same flow as T47)
  1 + 0 + 1 − 0 + 0 = 2
  "new fabric interface ISchedulerService = +1 novelty"

T49 (ORCHESTRATION, well-established from FLOW-01 plan context)
  1 + 0 + 0 − 0 + 0 = 1

T51 (CONVERGENCE, entry guard + degraded terminal simultaneously)
  1 + 1 + 1 − 0 + 0 = 3
  "two new patterns simultaneously: entry guard + degraded terminal"
  "Do not escalate before cycle 3 — 0.50–0.70 on cycle 1 is expected"

T60 (REGISTRATION, atomic capacity + concurrency invariant, first occurrence)
  1 + 1 + 1 − 0 + 0 = 3
  "first REGISTRATION + atomic capacity new named pattern"

T64 (ATTENDANCE, FIFO + distributed lock — first occurrence)
  1 + 1 + 0 − 1 + 0 = 1
  "clarity discount: FIFO + distributed lock is mechanically unambiguous from iron rules"
  "even though archetype is new, no novel judgment required"

T65 (VALIDATION with MACHINE constant inversion)
  1 + 1 + 0 − 0 + 1 = 3
  "neverFromConfig: true in contract → inversion bonus"
  "cycle 1 score-0 = correct behavior — verify DPO has config.get() as rejected"
```

---

## OUTPUT FORMAT

```json
"taskTypeCycleBudgets": { "T47": 2, "T48": 2, "T49": 1 }
```

Paste into Gate STATE.json **before Phase A** (not after Phase B — BUG-4 fix).
Also populate FLOW-XX-LEARNING-HANDOFF.json `cycleBudgetBaseline` field.

---

## CALIBRATION FEEDBACK

After Phase C, record in STATE.json:
```json
"difficultyPredictionCalibration": {
  "T47": {"predicted": 2, "actual": 1, "accurate": false},
  "T51": {"predicted": 3, "actual": 3, "accurate": true}
}
```

Feeds R-1 retrospective (SK-464). MAE > 1.0 → recalibrate before Wave 2.

---

## GATE B PER BUDGET CARD (universal, from core)

Every budget card must carry a **Gate B** — the exact passing command/output that
proves the cycles delivered the capability — not just a cycle number. A budget
without a Gate B is not actionable.

mvp Gate-B form (TS):
```text
Budget card: T-XX, archetype ROUTING, budget 2
Gate B: npx jest --testPathPatterns "t-xx" → N passed, 0 failed
```
- For a UI capability: `npx playwright test <spec>.spec.ts → 0 failed`.
- For a RAG-quality capability: a numeric FastAPI eval threshold.

## mvp ADAPTATION OF THE FORMULA INPUTS (stack-mapped)

- **first_occurrence_penalty** — "+0 (seen before)" applies when a STRUCTURALLY
  IDENTICAL capability already exists in mvp: an analogous NestJS provider/module
  or React component. The "RAG hits" query is replaced by a module-inventory
  check:
  ```bash
  rg -l "extends .*Service|@Injectable\(\)" server/src   # analogous provider exists?
  rg -l "export (default )?function" client/src          # analogous component exists?
  ```
- **novelty_sum** — "+0.5 per new named pattern" counts a new fabric interface
  (NestJS DI token), a new behavioral invariant, or a new domain concept with no
  analogous mvp module.
- **clarity_discount / inversion_bonus** — unchanged in meaning; "inverts the DNA
  default" maps to a typed-Result/config-source inversion that must be proven by a
  fail-path Jest test, not assumed.

## MAE RECALIBRATION (universal, from core)

`MAE > 1.0` across recent budget cards → recalibrate the inputs BEFORE the next
wave/batch. A predicted-vs-actual gap that is silently ignored is a calibration
failure that compounds.

## INTEGRATION

```
Invoke before:  Session file authoring — Phase A seeding
Feeds into:     STATE.json taskTypeCycleBudgets
                planning--adaptation-map-SKILL.md (SK-462) — expected score ranges
                planning--flow-retrospective-SKILL.md (SK-464) — calibration data
```
