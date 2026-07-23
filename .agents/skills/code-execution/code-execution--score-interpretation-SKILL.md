---
name: score-interpretation
sk_number: SK-471
version: "1.0.0"
priority: HIGH
load_order: 2
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  When Phase B produces a score, interpret each sub-score and determine the
  correct response. The adaptation-map (SK-462) has score brackets at planning
  time. This skill operates during execution: given a breakdown, identify the
  bottleneck sub-score and route to the correct action. Prevents wasting a
  cycle patching the wrong dimension.
triggers:
  - "score is"
  - "how to interpret this result"
  - "what does testability:0.20 mean"
  - "score bracket analysis"
  - "why did this score low"
  - "Phase B result"
  - "cycle score"
---

# Score Interpretation Skill (SK-471)

## WHAT THIS SKILL PREVENTS

Treating all low-score results identically. Wasting a cycle adding WRONG/CORRECT
examples to a prompt when the problem is a missing fabric mock that the test
cannot even reach. Applying PromptPatch to a score that was low due to
infrastructure state, not generation quality.

---

## STEP 1 — READ THE SCORE BREAKDOWN

Phase B scoring produces a breakdown across sub-domains. Request it explicitly
if not shown:

```bash
# Get the score breakdown from the last run
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"term": {"flowId.keyword": "FLOW-XX"}},
    "sort": [{"timestamp": "desc"}],
    "size": 1
  }' | jq '.hits.hits[0]._source | {
    score: .score,
    iron_rules: .scoreBreakdown.iron_rules,
    dna_compliance: .scoreBreakdown.dna_compliance,
    testability: .scoreBreakdown.testability,
    machine_constant: .scoreBreakdown.machine_constant,
    fail_open_behavior: .scoreBreakdown.fail_open_behavior
  }'
```

---

## STEP 2 — IDENTIFY THE BOTTLENECK

The aggregate score is the MINIMUM of sub-scores in ALL-BLOCK semantics, or a
weighted combination in standard scoring. In either case, find the lowest sub-score
first — that is the bottleneck.

```python
# Score bracket quick classifier
score = float(input("aggregate score: "))
print("PRESCRIPTIVE" if score>=0.90 else
      "PASS"          if score>=0.85 else
      "DETAIL_GAP"    if score>=0.65 else
      "PATTERN_MISSING" if score>=0.50 else
      "STRUCTURAL")
```

---

## STEP 3 — DIAGNOSE PER SUB-SCORE

### iron_rules (0.0–1.0)
What it measures: Does the generated code respect all CF-N constraints?

| Range | Meaning | Action |
|-------|---------|--------|
| 0.85+ | All iron rules respected | No action needed |
| 0.65–0.84 | 1–2 rules violated | PromptPatch: add specific WRONG/CORRECT for the violated rule |
| 0.50–0.64 | Multiple rules violated | Add NAMED CHECK section to genesis prompt; list all CF rules |
| <0.50 | Iron rules not understood | Rewrite genesis Section 3 (constraints); verify rules are concept-level not mechanism-level |

### dna_compliance (0.0–1.0)
What it measures: DNA-1..9 pattern adherence.

| Range | Meaning | Action |
|-------|---------|--------|
| 0.85+ | DNA patterns intact | No action |
| 0.65–0.84 | 1 DNA violation | Patch the specific DNA pattern (check: raw SDK import? hardcoded value? missing outbox?) |
| <0.65 | Multiple DNA violations | Load `code-execution--generated-code-review-SKILL.md` (SK-474). Layer 2 review. |

### testability (0.0–1.0)
What it measures: Can this code be tested in isolation with fabric mocks?

**Key insight:** Low testability usually means a missing mock pattern, not a
logic error. The code may be correct — the problem is it cannot be reached
by the test suite.

| Range | Meaning | Action |
|-------|---------|--------|
| 0.85+ | Testable | No action |
| 0.65–0.84 | Partially testable | Check for: constructor dependencies that can't be mocked; side effects in constructors |
| <0.50 | Hard to test | Check for: static method calls, direct ES/Redis calls bypassing fabric, missing dependency injection |

When testability < 0.50, **do NOT immediately patch the genesis prompt**.
First verify: is the test environment correctly configured with all fabric mocks?
A test that cannot REACH the code produces a 0.0 testability score even when
the code is correct.

```bash
# Check if fabric mocks are registered in the test module
grep -rn "IScopedMemoryService\|ISchedulerService\|IDatabaseService" \
  server/src/**/__tests__/*.spec.ts | head -10
# If not found: the mock is missing, not the code
```

### machine_constant (0.0–1.0)
What it measures: MACHINE constants are literal; FREEDOM values use config.get().

Low score here is the highest-priority finding. This is the SILENT_FAILURE class.

| Range | Meaning | Action |
|-------|---------|--------|
| 0.85+ | Constants correctly classified | No action |
| Any score with a score-0 named check | MACHINE constant used config.get() | Load SK-475 (score-zero-investigation). Do NOT skip. |
| 0.65–0.84 | Borderline — mixed classification | Load SK-474 Layer 3. Apply security-break test to every constant. |

### fail_open_behavior (0.0–1.0)
What it measures: Does the code fail safely on error? Best-effort observers return
success on error. Security gates fail closed.

| Range | Meaning | Action |
|-------|---------|--------|
| 0.85+ | Fail behavior correct | No action |
| <0.65 | Fail behavior wrong | Check: is this an observer archetype? Observer must return success on catch. Is this a security gate? Gate must fail closed. |

---

## STEP 4 — DECISION TREE

```
Bottleneck sub-score identified →

  Is any sub-score score-0?
  YES → STOP. Load SK-475 (score-zero-investigation) BEFORE anything else.

  Is machine_constant < 0.85?
  YES → Load SK-474 (generated-code-review) Layer 3 immediately.
       This is silent-failure risk. Do not skip.

  Is testability < 0.50?
  YES → Verify mocks before patching genesis prompt.
       Run: grep -rn "provide.*{provide:" server/__tests__ to check mock setup.

  Is score in DETAIL_GAP (0.65–0.84)?
  → PromptPatch targeting the specific bottleneck sub-score.
    Load SK-472 (prompt-patch-authoring) for patch construction.

  Is score in PATTERN_MISSING (0.50–0.64)?
  → Major genesis prompt revision needed.
    Review genesis Section 3 (constraints) and Section 4 (examples).
    Budget: this will consume most of the remaining cycle budget.

  Is score STRUCTURAL (<0.50)?
  → The genesis prompt does not convey the capability correctly.
    Rebuild from NODE intent. Do NOT patch — full rewrite.
    Check: did the NODE convergence produce a clear intent statement?
```

---

## STEP 5 — RECORD THE INTERPRETATION

Before acting, write the interpretation into STATE.json:

```bash
jq --argjson result '{
  "taskTypeId": "T47",
  "cycle": 1,
  "aggregateScore": 0.55,
  "bottleneck": "testability",
  "bottleneckScore": 0.20,
  "diagnosis": "fabric mock missing in test module — not a code problem",
  "action": "add IScopedMemoryService mock to test setup before PromptPatch"
}' '.generation_results.T47 = $result' FLOW-XX-STATE.json > tmp.json && mv tmp.json FLOW-XX-STATE.json
```

This prevents re-diagnosing the same score in a future session that loads STATE.json
without conversation history.
