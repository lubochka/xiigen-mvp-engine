---
name: run-trace-reader
sk_number: SK-441
version: "1.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Systematic protocol for reading GET /api/runs/:runId/trace output after Phase B.
  Diagnoses which node failed, maps the failure to a root cause, and routes
  to the correct fix: prompt patch, handler escalation, or arbiter addition.
  Without this skill, score interpretation is guesswork.
triggers:
  - "read the trace"
  - "what failed in Phase B"
  - "trace shows"
  - "/api/runs/"
  - "n5 failed"
  - "n7 score"
  - "run trace"
  - "after Phase B run"
---

# run-trace-reader

## Purpose

Every Phase B run produces a trace at `GET /api/runs/:runId/trace`.
This trace is the self-test report. It shows exactly what each node produced
and why the score is what it is.

Without a systematic reading protocol, sub-0.85 scores result in generic
debugging rather than targeted fixes.

---

## When to Invoke

Auto-fire after every `engine.generate()` call in Phase B.
Required reading before ANY attempt to iterate or patch.

---

## The 8 Nodes and What to Check in Each

### n1 — rag-retrieve (genesis prompt)

**What to check:**
- `promptId` — is it the correct task type's prompt? (e.g., T47-genesis)
- `version` — is it the latest version? (if patched prompt not picked up: cache issue)
- `tier` — which tier served the prompt (tenant / global / fallback)?

**Failure signature:**
- `tier: "fallback"` and `content` is the hardcoded default → PromptLibraryStation not seeded correctly
- `promptId: null` → no prompt found for this task type + role → Phase A gate didn't verify this

**Fix:** Re-seed the prompt fixture. Verify `GET /api/prompts/T47?role=genesis` returns content.

---

### n2 — rag-retrieve (patterns)

**What to check:**
- Pattern IDs retrieved (should include this flow's factory patterns)
- Top-1 relevance score (should be >= 0.75)
- Pattern types retrieved (SERVICE_PATTERN, CONFLICT_PREVENTION, etc.)

**Failure signature:**
- `results: []` → xiigen-rag-patterns empty or tags mismatch → re-seed + check tags
- Top-1 score < 0.50 → irrelevant patterns retrieved → fix tags in rag-pattern fixture
- Wrong factory patterns → fix `taskTypeRefs` and `tags` in fixture

**Fix:** Update RAG pattern fixture tags to match what the rag-retrieve config searches for.

---

### n3 — decompose

**What to check:**
- `plan_steps[]` — are these named methods? (`register()`, `checkDuplicate()`) or generic? (`implement core logic`)
- Count — matches the handlers[] in the contract?

**Failure signature (GENERIC STEPS):**
```
plan_steps: ["implement core logic", "add error handling", "return result"]
```
→ contract.handlers[] is empty OR decompose.handler AI fallback fired

**Fix (deterministic):** Add `handlers[]` to the contract fixture (GAP-02). Re-seed.
**Fix (AI fallback):** If contract.handlers[] present but AI fired anyway → decompose.handler bug → ESCALATE (not a prompt fix)

---

### n4 — ai-generate

**What to check:**
- `model_used` — correct model? (matches `config.modelHint`)
- `token_count` — reasonable? (too low = truncated, too high = verbose)
- `generated_code` — check for these patterns:
  - SETNX pattern present? (`await this.cache.setNX(...)`)
  - Config reads present? (`await this.config.get(...)`, no hardcoded values)
  - Store-before-enqueue? (`storeDocument` line appears BEFORE `enqueue` line)
  - Method names match n3 plan steps?

**Failure signature:**
- Missing SETNX → genesis prompt IR-6 section missing negative example
- Hardcoded values (`const TTL = 86400`) → genesis prompt IR-3 negative example missing
- Wrong method structure → n3 generic steps bled through

---

### n5 — validate (DNA compliance)

**What to check:**
- A 9/9 table: DNA-1 through DNA-9 each pass or fail
- If any FAIL: which pattern and what was found

**DNA patterns and what they check:**
| DNA | What it checks in generated code |
|-----|----------------------------------|
| DNA-1 | No typed models — no `class X { name: string }` |
| DNA-2 | BuildSearchFilter — no inline query objects |
| DNA-3 | DataProcessResult — no `throw`, returns `DataProcessResult` |
| DNA-4 | MicroserviceBase — extends MicroserviceBase |
| DNA-5 | Scope isolation — no tenantId param, reads from ALS |
| DNA-6 | DynamicController — no entity-specific controller |
| DNA-7 | Idempotency — SETNX check present |
| DNA-8 | Outbox — storeDocument before enqueue |
| DNA-9 | CloudEvents — uses createCloudEvent() |

**Fix routing:**
- DNA-3 FAIL → genesis prompt Section 2 Architecture Constraints missing "never throw"
- DNA-7 FAIL → genesis prompt IR-6 NEGATIVE EXAMPLE missing — **promptops-cycle**
- DNA-8 FAIL → genesis prompt IR-5 NEGATIVE EXAMPLE missing — **promptops-cycle**

---

### n6 — validate (iron rules + arbiters)

**What to check:**
- Each iron rule by ID: `IR-1: PASS`, `IR-2: PASS`, etc.
- Each arbiter: `FLOW-01-routing-auth-security-001: PASS`
- Any `FAIL` entry: note the message — it specifies exactly what's missing

**Failure signature:**
```
IR-3: FAIL — "hardcoded TTL found: const TOKEN_TTL = 86400"
```
→ genesis prompt missing IR-3 NEGATIVE EXAMPLE

```
FLOW-01-routing-auth-security-001: FAIL — "Rate limit check not found on registration handler"
```
→ genesis prompt missing throttle example OR arbiter check too strict

**Fix:** **promptops-cycle** for prompt fixes.
**Escalate if:** same IR fails after 3 prompt cycles → handler or decompose issue, not prompt.

---

### n7 — score

**What to check:**
- Score components (each with weight and sub-score)
- Total score and verdict
- Which component is the lowest → that's where to focus

**Standard score components:**
| Component | Weight | What determines it |
|-----------|--------|-------------------|
| dna_compliance | 0.30 | n5 pass rate (9/9 = 1.0, 8/9 = 0.89, etc.) |
| iron_rule_compliance | 0.30 | n6 pass rate across all IRs |
| arbiter_compliance | 0.20 | n6 arbiter pass rate |
| code_quality | 0.10 | structural analysis (method count, type safety) |
| testability | 0.10 | independently testable methods |

**Total score = weighted sum.**

---

### n8 — feedback

**What to check:**
- `dpo_triple_id` — was a DPO triple captured?
- `p5_metrics` — quality, cost, latencyMs, retryCount, dpoTriples, modelUsed
- `prompt_version_used` — matches what n1 retrieved?

If `dpo_triple_id: null` → feedback.handler not capturing triples → check GAP-08 status.

---

## Score Band → Action Mapping

| Score | Status | Action |
|-------|--------|--------|
| >= 0.85 | PASS | Promote to INJECTED. DPO triple captured. Done. |
| 0.70–0.84 | MINIMAL | Promote to MINIMAL. Run **promptops-cycle** for lowest component. Re-run. |
| 0.60–0.69 | PATCH | Run Run **promptops-cycle**. Re-run. If same score after 2 cycles → ESCALATE. Max 3 cycles total. |
| < 0.60 | ⛔ STOP | Do NOT run another cycle. This is a handler issue, not a prompt issue. |

---

## Escalation Triggers (score < 0.60 OR plateau)

**ESCALATE (do not run another cycle) when:**
1. Score < 0.60 on any cycle
2. Score is the same or worse after 2 prompt patch cycles (plateau)
3. n3 output shows generic steps despite contract.handlers[] being seeded
4. n5 shows DNA-4 FAIL (MicroserviceBase not extended) — this is architecture, not prompt

**Escalation report format:**
```
ESCALATION REQUIRED
Run ID:        run-FLOW01-T47-003
Task type:     T47
Final score:   0.61 (cycle 3)
Lowest component: iron_rule_compliance (0.45)
Still failing: IR-3 (hardcoded TTL) — 3 cycles did not fix this
Root cause assessment: handler-level or decompose issue
Prompt versions tried: v1.1.0 → v1.2.0 → v1.3.0
Last generated code: [attach n4 output]
Recommended action: Review decompose.handler method resolution logic
```

---

## Diagnosis Quick Reference

| Symptom in trace | Root cause | Fix |
|-----------------|-----------|-----|
| n1: tier=fallback | Prompt not seeded or index empty | Re-seed, verify GET /api/prompts |
| n2: results=[] | RAG patterns not seeded or tags mismatch | Re-seed, check tags |
| n3: generic plan steps | handlers[] missing from contract | Add handlers[], re-seed (GAP-02) |
| n4: hardcoded value | IR-3 missing negative example in genesis | **promptops-cycle** prompt patch |
| n4: no SETNX | IR-6/DNA-7 missing negative example | **promptops-cycle** prompt patch |
| n4: enqueue before store | DNA-8 missing negative example | **promptops-cycle** prompt patch |
| n5: DNA-3 FAIL | No DataProcessResult return pattern | **promptops-cycle** + check genesis Section 2 |
| n6: same IR fails after 3 cycles | Handler or decompose logic issue | Escalate |
| n7: code_quality < 0.5 | Generic method names from n3 | Fix handlers[] in contract |
| n8: dpo_triple_id=null | feedback.handler not capturing | Check GAP-08 status |
