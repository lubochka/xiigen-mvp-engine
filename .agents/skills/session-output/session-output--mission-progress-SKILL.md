---
name: mission-progress
sk_number: SK-445
version: "1.0.0"
priority: CRITICAL
load_order: 99
category: session-output
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  Produces the mandatory ENGINE PROGRESS report that answers the one question
  Luba asks after every session: "Are we closer to the goal than before?"
  Loaded before every stop. Its output is the FIRST section of every
  PHASE-COMPLETE-N.md, SESSION-BRIEF-N.md, and session output package.
triggers:
  - "before stop"
  - "mission progress"
  - "engine progress"
  - "are we closer"
  - "graduation timeline"
  - "DPO triple count"
  - "shadow gap score"
  - "phase complete"
  - "session brief"
---

# Mission Progress Skill (SK-445) v1.0

## WHY THIS SKILL EXISTS

After every session, Luba needs to know one thing: are we closer to an
independent, cost-effective engine than we were before? The answer must arrive
unsolicited, as the FIRST thing in every session output — not buried after
200 lines of test results and file lists.

This skill answers that question with five mandatory questions backed by ES
queries, not estimates. If data does not exist: state PENDING and why. Never
omit, never estimate, never say "we will track this when FLOW-39 is built."

---

## WHEN TO INVOKE

Load before every stop in every session type:
- Before writing PHASE-COMPLETE-N.md (any generation phase)
- Before writing SESSION-BRIEF-N.md
- Before the session output package is finalized
- Before ⛔ STOP

**The report is the FIRST section.** Gate results, file lists, and test counts
follow after ENGINE PROGRESS — never before.

---

## THE FIVE MANDATORY QUESTIONS

Answer all five. State PENDING with a reason if data is unavailable.

---

### Question 1: Did the engine LEARN this session? (Layer 1 — TEACH)

```bash
# Count valid DPO triples (cross-model + curriculumTier set)
curl -sf localhost:9200/xiigen-training-data/_count   -H "Content-Type: application/json"   -d '{"query":{"bool":{"must":[
    {"exists":{"field":"curriculumTier"}},
    {"script":{"script":"doc["chosen.model.keyword"].value != doc["rejected.model.keyword"].value"}}
  ]}}}' | jq .count

# Count pending triples (single-provider, waiting for comparison)
curl -sf localhost:9200/xiigen-training-data-pending/_count | jq .count

# Count per curriculum tier
curl -sf localhost:9200/xiigen-training-data/_search   -H "Content-Type: application/json"   -d '{"size":0,"aggs":{"by_tier":{"terms":{"field":"curriculumTier"}}}}'   | jq ".aggregations.by_tier.buckets"
```

Report format:
```
LAYER 1 — TEACH
  Valid DPO triples this session:  +N (cross-model, curriculumTier set)
  Invalid triples this session:    +N (null tier or same-model) — P18 violation if > 0
  Cumulative valid triples:        N / 80 graduation threshold
  Tier coverage:
    Tier 1 (ROUTING):        N triples
    Tier 2 (DATA_PIPELINE):  N triples
    Tier 3 (TRANSACTION):    N triples
    Tier 4 (ORCHESTRATION):  N triples
    Tier 5 (SCHEDULED):      N triples
  Missing tiers (no data):   [list tiers with 0 triples]
```

---

### Question 2: Did the engine IMPROVE this session? (Layer 2 — IMPROVE)

```bash
# Prompt versions advanced
curl -sf localhost:9200/xiigen-prompts/_search   -H "Content-Type: application/json"   -d '{"query":{"range":{"updatedAt":{"gte":"NOW/d"}}}}'   | jq "[.hits.hits[]._source | {taskTypeId, version, updatedAt}]"

# RAG patterns with quality score updated
curl -sf localhost:9200/xiigen-rag-patterns/_search   -H "Content-Type: application/json"   -d '{"query":{"range":{"qualityScore":{"gte":0.60}}}}' | jq .hits.total.value

# Skills triggered by GAP_SIGNAL
curl -sf localhost:9200/xiigen-capability-gap-signals/_count   -H "Content-Type: application/json"   -d '{"query":{"range":{"capturedAt":{"gte":"NOW/d"}}}}' | jq .count
```

Report format:
```
LAYER 2 — IMPROVE
  Prompt versions advanced:    N (list: T47 v1.0→v1.1, ...)
  RAG patterns score ≥ 0.60:   N of M total
  GAP_SIGNALS emitted:         N (new skills proposed)
  Arbiter verdicts recorded:   N (feeds arbiter calibration)
  Nothing improved:            [state explicitly if true — acceptable early on, must be visible]
```

---

### Question 3: How close to REPLACE this session? (Layer 3 — REPLACE)

```bash
# Shadow gap scores per archetype tier
curl -sf localhost:9200/xiigen-shadow-runs/_search   -H "Content-Type: application/json"   -d '{"size":100,"query":{"match_all":{}}}'   | jq "[.hits.hits[]._source | {taskTypeId, archetypeTier, paidScore, ossScore, scoreDelta, shadowStatus}]"
```

Report format:
```
LAYER 3 — REPLACE
  Gap scores (paidScore - ossScore per task type):
    T47 (ROUTING/Tier1):    N% gap | null (PENDING — no local model)
    T48 (SCHEDULED/Tier5):  N% gap | null (PENDING)
    T49 (ORCH/Tier4):       N% gap | null (PENDING)
  Sessions until graduation test (at current triple production rate):
    Current rate:      N valid triples per session
    Remaining needed:  N triples (80 - current cumulative)
    Estimated:         N sessions
  Estimated cost savings at graduation: $N per project
    (current cost: ~$0.15/run × N runs/project × N flows)
    (projected cost: ~$0.002/run × N runs/project × N flows at local model)
```

**If no shadow run data exists:**
```
  Shadow gap: PENDING — xiigen-shadow-runs not initialised (BUG-7)
  Action needed: create placeholder records before next Phase B run
```

---

### Question 4: What BLOCKED improvement this session?

State each blocked dimension explicitly. Acceptable blockers:
- "FLOW-38C not built — prompt auto-evolution not running"
- "FLOW-39 not active — curriculum sequencer not assigning tiers"
- "Single provider key — DPO triples stored to pending index"
- "Phase A session — no generation ran, no teaching data produced"

**Not acceptable as a blocker:** omitting this section entirely.

Report format:
```
BLOCKING
  [Dimension]: [specific blocker and what would unblock it]
  ...
  None: [state explicitly if nothing blocked]
```

---

### Question 5: What does LUBA DECIDE next?

One specific decision with 2-3 options and their timeline impact. If no decision
is needed: state that explicitly with the reason.

Report format:
```
DECISION NEEDED
  Question: [one specific question]
  Option A: [description] → [impact on graduation timeline]
  Option B: [description] → [impact on graduation timeline]
  Recommendation: [if any, with reasoning]

  OR

  No decision needed this session: [reason]
```

---

## DECISION THRESHOLDS (turn metrics into actions)

These thresholds convert ENGINE PROGRESS numbers into explicit actions:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Shadow gap score | > 15% | Do not start local model phase — local model not ready |
| Curriculum Tier 1 triples | < 5 | Do not proceed past FLOW-03 — foundation missing |
| Prompt version not advancing | 3+ flows without change | Genesis prompt structural redesign needed |
| Valid DPO triples | < 10 with no improvement trend | Review multi-model setup — single-provider fallback stuck |
| Invalid triples > valid | Any session | Immediate: fix DPO structure before next Phase B |
| Shadow gap narrowing | < 1% per session | Model switch timeline longer than expected — review |

---

## ENGINE PROGRESS TABLE TEMPLATE

Copy this into every PHASE-COMPLETE-N.md as the FIRST section:

```markdown
## ENGINE PROGRESS — Phase [X] Complete
*(Query ES — never estimate. State PENDING if index absent.)*

| Metric | This Phase | Cumulative | Target | Gap |
|--------|-----------|------------|--------|-----|
| Valid DPO triples | +N | TOTAL | 80 | REMAINING |
| Pending DPO triples | +N | TOTAL | 0 | — |
| Shadow gap T47 (ROUTING/Tier1) | N% / PENDING | N% / PENDING | <5% | N%/PENDING |
| Shadow gap T48 (SCHEDULED/Tier5) | N% / PENDING | N% / PENDING | <5% | N%/PENDING |
| Shadow gap T49 (ORCH/Tier4) | N% / PENDING | N% / PENDING | <5% | N%/PENDING |
| Prompt versions improved | N | N total | continuous | — |
| RAG patterns score ≥0.60 | N | N total | all | MISSING N |
| Flows to graduation test | — | — | 24 | N remaining |
| Estimated cost this phase | $N | $N total | $0 (local) | $N/run |

### What improved this phase (required — not optional)
- [ ] At least one prompt version advanced
- [ ] At least one RAG pattern quality score updated
- [ ] DPO triple count increased (verified by ES query)

### What is blocked (required — state explicitly if nothing blocked)
- [Dimension]: [specific blocker]

### Decision needed
[Question, options, recommendation OR "No decision needed: [reason]"]
```

---

## PLACEMENT RULE

This report is the **FIRST** section of every PHASE-COMPLETE-N.md.

The ordering is:
1. ENGINE PROGRESS (this skill's output)
2. Phase gate results (test counts, FC checks, DNA compliance)
3. Files changed
4. ISSUE INVENTORY

Never place ENGINE PROGRESS after gate results. Luba reads PHASE-COMPLETE to
understand mission progress, not test counts. Test counts are secondary.

---

## WHAT THIS SKILL PREVENTS

- Luba working blind after every session: "no idea if we are closer or farther away"
- PHASE-COMPLETE files that show "5,386 tests passing" with no graduation metric
- Silent assumption that FLOW-39 being unbuilt means progress cannot be reported
- Shadow gap staying PENDING indefinitely without a named owner or action
- Decision thresholds existing nowhere — metrics visible but actions unclear
