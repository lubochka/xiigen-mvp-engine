---
name: promptops-cycle
sk_number: SK-442
version: "1.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Exact operational procedure for running a PromptOps improvement cycle when
  Phase B score is 0.60–0.79. Reads failing iron rules from the run trace,
  generates NEGATIVE EXAMPLES, updates the genesis prompt via API, verifies
  the version bump, re-runs the pipeline, and captures the DPO triple.
  Multiple skills reference "iterate with PromptPatch" but none specify HOW — this skill does.
triggers:
  - "score 60-79"
  - "score 70-84"
  - "PromptPatch"
  - "prompt update"
  - "re-run cycle"
  - "genesis patch"
  - "promptops"
  - "iterate phase B"
---

# promptops-cycle

## Purpose

Phase B score of 0.60–0.79 means the generated code violates iron rules that
the genesis prompt didn't prevent. The fix is adding a NEGATIVE EXAMPLE to the
genesis prompt — not re-running without changing anything.

This skill defines the exact 9-step procedure.

---

## When to Invoke

Auto-fire when Phase B score is 0.60–0.79.
Required: **run-trace-reader** must have been run first to identify the failing rules.
Do NOT run if score < 0.60 — that requires escalation, not prompt patching.

---

## Step 1 — Confirm Score Band

```
Score 0.85+: DO NOT RUN THIS SKILL — promote directly
Score 0.70–0.84: run this skill, promote to MINIMAL after patch
Score 0.60–0.69: run this skill, max 2 retries before escalation
Score < 0.60: DO NOT RUN THIS SKILL — escalate
```

Record: `cycleN_score = X.XX` for the cycle about to be patched.

---

## Step 2 — Read Failing Rules from n6 Trace

From the n6 (validate iron rules + arbiters) node output:
```
IR-3: FAIL — "hardcoded TTL found: const TOKEN_TTL = 86400"
IR-6: FAIL — "SETNX key check missing — no setNX call found"
```

Extract:
- Rule IDs: `["IR-3", "IR-6"]`
- Failure messages: `["hardcoded TTL found", "SETNX key check missing"]`

---

## Step 3 — Generate NEGATIVE EXAMPLE for Each Failing Rule

Use this template for each violated rule:

```
NEGATIVE EXAMPLE — score-0 violation:
  [bad code line] // ← WRONG: [why it's wrong]
  CORRECT: [good code showing the right pattern]
```

**Rule-to-example map (FLOW-01):**

**IR-3 (config over code — no hardcoded TTLs):**
```
NEGATIVE EXAMPLE — score-0:
  const TOKEN_TTL = 86400; // ← WRONG: never hardcode TTL
  const TOKEN_TTL = 24 * 60 * 60; // ← WRONG: same violation, just obscured
  CORRECT: const ttl = await this.config.get('flow01_verification_token_ttl_hours');
```

**IR-4 (store before enqueue — DNA-8):**
```
NEGATIVE EXAMPLE — BUILD_FAILURE:
  await this.queue.enqueue(event); // ← WRONG: enqueue BEFORE storeDocument
  await this.db.storeDocument(...); // ← this must come FIRST
  CORRECT: await this.db.storeDocument(...) THEN await this.queue.enqueue(event)
```

**IR-6 (SETNX idempotency key):**
```
NEGATIVE EXAMPLE — score-0:
  // No SETNX check — registrations will duplicate
  CORRECT:
  const isNew = await this.cache.setNX(
    `registration:${tenantId}:${hash(email)}`,
    '1',
    { ttl: await this.config.get('flow01_registration_idempotency_ttl_seconds') }
  );
  if (!isNew) return DataProcessResult.failure('DUPLICATE_REGISTRATION_IN_PROGRESS');
```

**For rules not in this map:**
Construct from the failure message:
- Bad pattern = what the generated code did wrong (from failure message)
- Good pattern = what the iron rule specifies should happen instead

---

## Step 4 — Read Current Genesis Prompt

```bash
curl -s 'localhost:3000/api/prompts/T47?role=genesis' | jq '{promptId, version, content}'
```

Record: `current_version = "1.1.0"`, `current_content = "..."`

---

## Step 5 — Compute New Version

Version bump rule: increment the `minor` segment.
```
1.0.0 → 1.1.0 (first patch)
1.1.0 → 1.2.0 (second patch)
1.2.0 → 1.3.0 (third patch)
```

After 3 minor bumps without reaching 0.85: escalate (not a prompt issue).

---

## Step 6 — Update the Prompt

Append the NEGATIVE EXAMPLE(s) to the relevant iron rule sections in the prompt content.
Place each example immediately after the rule statement, before the next rule.

```bash
curl -X PUT 'localhost:3000/api/prompts/T47/genesis' \
  -H 'Content-Type: application/json' \
  -d '{
    "version": "1.2.0",
    "content": "...[updated prompt with negative examples appended]...",
    "updatedBy": "promptops-cycle",
    "patchReason": "IR-3 hardcoded TTL + IR-6 SETNX missing after cycle 2"
  }'
```

---

## Step 7 — Verify Version Bump

```bash
curl -s 'localhost:3000/api/prompts/T47?role=genesis' | jq '.version'
# Expected: "1.2.0" (not the old version)
```

If old version returned: PromptLibraryStation cache issue. Clear cache and retry.

---

## Step 8 — Re-Run Phase B

```typescript
// Re-run with same inputs — the updated prompt will be retrieved by n1
const engineContract = new EngineContract(contractParams);
const result = await engine.generate(engineContract, tenantId);
const newRunId = result.data?.pipelineMetadata?.['artifact_id'] ?? null;
```

Read new trace: `GET /api/runs/${newRunId}/trace`
Apply **run-trace-reader** to read the new trace.

---

## Step 9 — Compare and Decide

| New score | Action |
|-----------|--------|
| >= 0.85 | PASS — promote to INJECTED. DPO triple captured automatically (rejected=old, chosen=new). |
| >= 0.70 but < 0.85 | Promote to MINIMAL. If cycle count < 3: run another patch cycle. |
| Same as before (±0.02) | SCORE PLATEAU — not a prompt issue. Escalate. |
| Worse than before | REGRESSION — escalate immediately, note which new example may have confused the model. |
| < 0.60 | ESCALATE — prompt patching is not sufficient. |

---

## Cycle Tracking

Maintain a cycle log per task type:

```
T47 Cycle Log:
  Cycle 1: score=0.68, violations=[IR-3, IR-6], patch=v1.1.0
  Cycle 2: score=0.74, violations=[IR-6], patch=v1.2.0
  Cycle 3: score=0.87, violations=[], PASSED → promote to INJECTED
```

**Maximum 3 cycles per task type.** After 3 cycles without 0.85: escalate.

---

## DPO Triple Captured Automatically

When a cycle produces a score >= 0.85 after patching:
- The feedback.handler captures the DPO triple automatically
- `rejected`: code from the cycle that scored < 0.85
- `chosen`: code from the cycle that scored >= 0.85
- No additional action needed — verify in n8 trace: `dpo_triple_id: "dpo-T47-..."` (not null)

---

## Hard Rules

- NEVER run a second cycle without actually patching the prompt (same prompt = same output)
- NEVER patch a prompt that scored >= 0.85 (it's passing — leave it alone)
- NEVER continue after 3 cycles without escalating — the model is learning a bad lesson
- NEVER edit the generated `.service.ts` file directly — fix the prompt or handler, then regenerate
- NEVER call this a "PromptPatch" without actually updating the prompt version — version bump is mandatory
