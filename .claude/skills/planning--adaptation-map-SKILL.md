---
name: adaptation-map
sk_number: SK-462
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Per-archetype expected failure modes and score-bracket action table. Prevents
  Phase B from starting blind. Claude Code knows what to expect on cycle 1 and
  what to do about it per score bracket per task type. The score bracket Python
  one-liner is already in SESSION-START-PROMPT — this skill adds the remediation
  action layer and cycle-specific escalation triggers.
triggers:
  - "adaptation map"
  - "expected score"
  - "cycle 1 score"
  - "what to do when score is"
  - "remediation action"
  - "PRESCRIPTIVE"
  - "PATTERN_MISSING"
  - "STRUCTURAL"
  - "do not escalate"
---

# Adaptation Map Skill (SK-462) v1.0

## SCORE BRACKET → ACTION TABLE

```
PRESCRIPTIVE  ≥0.90 → Accept. Store DPO triple. Proceed.
PASS          ≥0.85 → Accept. Store DPO triple. Proceed.
DETAIL_GAP    0.65–0.84 → Add targeted PromptPatch for the specific gap. One re-run.
                          Escalate if still DETAIL_GAP after 1 patch.
PATTERN_MISSING 0.50–0.64 → Bump genesis version. Add ARCH_PATTERN to RAG for this archetype.
                             Escalate if still PATTERN_MISSING after budget exhausted.
STRUCTURAL    <0.50 → Stop immediately. Root cause required before cycling again.
                      Escalate — do not waste cycles.
```

**Exception — inversion patterns (T65 class):**
Score-0 on cycle 1 is CORRECT. Verify DPO has `config.get()` as rejected and literal
as chosen. Proceed to cycle 2. Escalate only if cycle 2 also scores 0.

---

## PER-ARCHETYPE EXPECTED FAILURE MODES

### ROUTING (T47 class)
Expected cycle 1 score: **0.75–0.90**
Common failure: dedup via DB constraint instead of IScopedMemoryService.setIfAbsent()
Fix: add iron rule — "ephemeral dedup must use IScopedMemoryService, not database constraint"
Escalate if: < 0.65 on cycle 1

---

### CONVERGENCE (T51 class — entry guard + degraded terminal)
Expected cycle 1 score: **0.50–0.70**
Common failure: entry guard missing OR degraded path returns error instead of success
Fix cycle 1: "degraded path MUST return DataProcessResult.success({matchStatus:'pending'})"
Fix cycle 2: separate PromptPatch per remaining pattern gap
Escalate if: < 0.85 after cycle 3

**Do not escalate before cycle 3.** Two new patterns simultaneously = 3 cycles expected.

---

### REGISTRATION (T60 class — atomic capacity)
Expected cycle 1 score: **0.50–0.70**
Common failure: capacity check not atomic — read-then-decrement instead of atomic operation
Fix: add iron rule — "capacity check MUST be atomic — use IScopedMemoryService.decrement()
     or DB transaction with SELECT FOR UPDATE"
Escalate if: < 0.85 after cycle 3

**Do not escalate before cycle 3.**

---

### ANALYTICS (T62 class — best-effort)
Expected cycle 1 score: **0.65–0.80**
Common failure: raw ioredis.incr() instead of IScopedMemoryService.increment()
Fix: add iron rule — "analytics MUST use IScopedMemoryService.increment() — never raw Redis"
Note: try/catch must cover entire handler body — uncaught exception = score-0 = correct
Escalate if: < 0.85 after cycle 2

---

### ORCHESTRATION (T49, T59 class — established)
Expected cycle 1 score: **0.75–0.90**
Common failure: missing outbox-before-queue for side effects
Fix: add outbox check to genesis
Escalate if: < 0.65 on cycle 1 (ORCHESTRATION should not be STRUCTURAL)

---

### VALIDATION — MACHINE constant inversion (T65 class)
Expected cycle 1 score: **0.00**
Cycle 1 score-0 = CORRECT behavior. Do not escalate.
Verify: DPO triple has config.get() as rejected, literal as chosen.
Escalate if: cycle 2 score < 0.85 OR if cycle 1 score > 0.5 (rule not enforced)

---

### FAN_IN (T50 class — Promise.allSettled, not parallel)
Expected cycle 1 score: **0.65–0.80**
Common failure: archetype coded as PARALLEL instead of FAN_IN
Fix: add iron rule — "T50 archetype is FAN_IN — uses Promise.allSettled, not Promise.all"
Note: D-02-1 canonical decision — do not reopen
Escalate if: < 0.85 after cycle 2

---

### BROADCAST (T52 class — always emits, consent gates nudge only)
Expected cycle 1 score: **0.75–0.90**
Common failure: broadcast gated on consent — event not emitted if consent absent
Fix: "broadcast MUST always emit; consent controls downstream nudge, not the event itself"
Escalate if: < 0.65 on cycle 1

---

## CYCLE-SPECIFIC ESCALATION TRIGGERS

**Always escalate:**
- STRUCTURAL on ANY cycle
- PATTERN_MISSING after budget exhausted
- Score DECREASES between consecutive cycles (regression)
- Expected-failure archetype still failing after its full budget

**Never escalate:**
- Sub-0.85 on cycle 1 for CONVERGENCE, REGISTRATION, T65
- Sub-0.85 on cycle 1 for any archetype on its first flow in the project
- PRESCRIPTIVE then PASS on retry (acceptable drift)

---

## PRODUCING THE ADAPTATION MAP FOR A NEW FLOW

Fill one row per task type using the archetype templates above:

```markdown
| Task type | Archetype | Cycle 1 expected | Known failure | Fix action | Escalate trigger |
|-----------|-----------|-----------------|---------------|-----------|-----------------|
| T59 | ORCHESTRATION | 0.75–0.90 | Missing outbox | Add outbox to genesis | < 0.65 cycle 1 |
| T60 | REGISTRATION | 0.50–0.70 | Non-atomic capacity | Atomic capacity iron rule | < 0.85 cycle 3 |
| T61 | PROMOTION | 0.75–0.90 | Missing scope isolation | scope_id iron rule | < 0.65 cycle 1 |
| T62 | ANALYTICS | 0.65–0.80 | Raw Redis | IScopedMemoryService iron rule | < 0.85 cycle 2 |
```

This table belongs in the flow master plan adaptation map section.
It is not optional even when counts are low — it determines what Claude Code does
per score bracket without requiring human diagnosis on each cycle.

---

## INTEGRATION

```
Invoke before:  Session file authoring — Phase B section design
Reads from:     planning--difficulty-prediction-SKILL.md (SK-461) — cycle budgets
Produces:       Adaptation map table for flow master plan
Feeds into:     Phase B cycle loop logic (what to do per score bracket)
                planning--flow-retrospective-SKILL.md (SK-464) — calibration check
```
