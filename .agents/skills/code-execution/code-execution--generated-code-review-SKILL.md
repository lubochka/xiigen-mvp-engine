---
name: generated-code-review
sk_number: SK-474
version: "1.0.0"
priority: HIGH
load_order: 3
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  Systematic four-layer human inspection of generated service code for
  the SILENT_FAILURE class — code that compiles, passes all tests, and scores
  high, but embeds a pattern that will contaminate DPO training data. The
  machine scoring pipeline catches known violations. This skill catches the
  class of violation that looks correct to the machine: the T65 `config.get()`
  pattern, where the code functionally works but teaches the wrong invariant.
triggers:
  - "review generated code"
  - "check for silent failures"
  - "inspect this service"
  - "does this code look right"
  - "MACHINE vs FREEDOM check on code"
  - "generated service review"
  - "after Phase B generates"
---

# Generated Code Review Skill (SK-474)

## WHAT THIS SKILL PREVENTS

The T65 class: `config.get('qrTokenTtl', 60)` compiles, passes all functional
tests, scores 0.90, and teaches every future generation that configurable security
TTLs are correct. Without this review, that pattern enters the training corpus as
`chosen` and degrades all future security-sensitive generation.

The scoring pipeline catches violations of known named checks. This review catches
violations that have no named check yet — the unknown unknowns.

---

## WHEN TO RUN

After Phase B produces any service file that will become a DPO triple.
Specifically: after cycle-1 scores come back ≥ 0.65 and the code is a candidate
for `chosen` — before Phase E capture.

---

## LAYER 1 — SEMANTIC REVIEW

Does the code communicate what it does?

```bash
# Load the generated service file
cat server/src/engine/flows/FLOW-XX/t47-user-registration-initiator.service.ts
```

Checks:
- Function names match their behavior (not generic: `processEvent` should be `registerMember`)
- Variable names are concept-level: `memberRecord`, not `obj` or `data`
- Error messages identify the failure: `"Registration duplicate: email already verified"`, not `"Error"`
- Comments reference the iron rule being enforced, not implementation mechanics

**Pass condition:** A developer unfamiliar with the flow can understand what the
function does and why from reading the code alone.

---

## LAYER 2 — DNA COMPLIANCE

Nine patterns must hold. Check each:

```bash
# DNA-6: No SDK imports
grep -n "import.*redis\|import.*ioredis\|import.*elasticsearch\|import.*pg\|import.*aws-sdk\|import.*anthropic\|import.*openai" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: 0 hits

# DNA-5: scope_id never constructed by caller
grep -n "scope_id\|scopeId" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Acceptable: receiving tenantId from payload
# Violation: constructing scope prefix: "${tenantId}:reg:" ← caller must not do this

# DNA-8: Store before emit (outbox-before-queue pattern)
# Verify: database write appears before any queue publish in every success path
grep -n "queue\|emit\|publish\|sendMessage\|produce" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# These lines must come AFTER the database write lines in the same function

# DNA-7: Idempotency key present for all queue operations
grep -n "idempotencyKey\|idempotency_key\|messageDeduplicationId" \
  server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Expected: at least 1 hit per queue operation

# DNA-4: DataProcessResult used (not raw throw)
grep -n "throw\|reject(" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Review each hit: is this in an error boundary or at the top level?
# Top-level throw is a DNA-4 violation (should be DataProcessResult.failure())
```

**Pass condition:** 0 SDK imports, scope_id not constructed by caller, store-before-emit
holds, idempotency keys present, no top-level throws.

---

## LAYER 3 — SILENT FAILURE CHECK (highest priority)

This layer finds code that LOOKS correct but teaches the wrong pattern.

**The MACHINE constant test:**

For every value in the generated code that is a number, string constant, or
threshold — apply the security-break test:

> "If a tenant sets this value to the maximum reasonable value, does a security
> guarantee break?"

```bash
# Extract all numeric constants and string literals from the service
grep -n "[0-9]\{2,\}\|'[a-zA-Z_-]\+'" server/src/engine/flows/FLOW-XX/t47-*.service.ts \
  | grep -v "import\|\/\/"
```

For each extracted constant, classify using SK-451 (freedom-machine-classification):

| Constant | Security-break test | Classification | Correct code |
|----------|--------------------|-----------------|-|
| `60` (QR TTL) | Tenant sets 600 → replay window destroyed | MACHINE | `const QR_TOKEN_TTL_SECONDS = 60` |
| `0.80` (confidence) | Tenant sets 0.30 → lower-quality matching | FREEDOM | `config.get('matchingThreshold', 0.80)` |
| `86400` (verification TTL) | Tenant sets 604800 → longer window, no security break | FREEDOM | `config.get('verificationTtlSeconds', 86400)` |
| `3` (max attempts) | Tenant sets 100 → brute force possible | MACHINE | `const MAX_LOGIN_ATTEMPTS = 3` |

**CRITICAL:** Any MACHINE constant that appears as `config.get(...)` in the
generated code is a SILENT_FAILURE. The code works. Tests pass. But training
data will teach the wrong pattern. This MUST be flagged before Phase E capture.

```bash
# Check every config.get call — are any of them MACHINE constants?
grep -n "config\.get\|freedomConfig\.get" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# For each hit: apply the security-break test manually
```

---

## LAYER 4 — TRAINING DATA IMPACT

If this code becomes `chosen` in a DPO triple, what does it teach?

For each pattern in the code, ask:
1. Is this pattern one we want all future ROUTING/ORCHESTRATION/REGISTRATION code to follow?
2. Does this pattern generalize correctly to other task types in the same archetype?
3. If a model learned ONLY from this triple, would it produce correct code for similar task types?

**Red flags:**
- Code that uses a workaround specific to this task type (workarounds teach wrong patterns)
- Code that handles a race condition in a non-generic way
- Code with inline comments that say "special case for this flow" — the model will generalize that special case

**Pass condition:** Every pattern in the `chosen` code is one you would want the model
to use for any future task type of this archetype.

---

## LAYER 5 — TRAINABLE-vs-STUB (G04 universal addition from llm_mvp_core — V20 anti-stub)

Layers 1–4 above assume the reviewed code is deterministic engine code. **Layer 5
applies when the code CLAIMS a learned/trainable capability** (a scorer, router,
selector, retriever, classifier, ranking, or "smart" unit). The masquerade class
is the most dangerous false positive: a deterministic shortcut (BM25, regex,
dictionary, direct lookup, counter) dressed as a trained model. The project then
plans from a capability that does not exist.

Two legitimate PASS states — never report them as the same thing:

- **`PASS_AS_HONEST_UNTRAINED_SCAFFOLD`** — the contract/skeleton exists, it
  honestly reports `not_ready`, hides no deterministic shortcut, and its honesty
  is PROVEN by a test (no semantic claim; no regex/BM25/dictionary answer dressed
  as smart; no fake metrics/checkpoint). A real milestone, **not** a feature.
- **`PASS_AS_TRAINED_FEATURE`** — the learned capability is real: numeric
  **held-out** metrics + ablation + fresh-load + continue-training + e2e through
  the real entrypoint.

```bash
# Hunt the masquerade in a unit that claims to be "learned/smart":
grep -nE "BM25|jaccard|levenshtein|\.test\(|RegExp|new RegExp|\.match\(|Dictionary|Map<|countBy|TryDecide|ChooseBest|SelectBest" \
  server/src/engine/**/<claimed-trainable>.ts
# If a "trained" decision actually comes from any of these → it is deterministic.
# Verdict: downgrade to scaffold OR require a real trained-state path.
```

Layer-5 PASS for a **trained** claim requires NUMERIC metrics — never `UNKNOWN`,
never `validation_only:true`, never static/contract-only. mvp note (R5/R6 / G12):
common trainable units live in `llm_mvp_core`; an mvp file that claims to BE a
trained model is itself a boundary smell — the unit belongs in core and is
consumed via manifest/locator. Inside mvp, Layer-5 almost always resolves to
`PASS_AS_HONEST_UNTRAINED_SCAFFOLD` or "this should live in core".

## LAYER 5A — ALLOWED ARCHITECTURE + CONCRETE REPAIR BLUEPRINT

If Layer 5 finds a deterministic mechanism posing as trainable, the repair is
**not** "wrap it in a unit later". It is a filled, per-field blueprint:

```
quote:            file:line + the exact Dictionary/counter/BM25/TryDecide line
now:              what this code computes now
why it is wrong:  why that signal is wrong/weak (e.g. position leakage, exact-replay)
must become:      the allowed level + concrete class/record/method names
                  (in mvp terms: a typed service-port interface + DataProcessResult<T>,
                   or — for a real trainable unit — defer to llm_mvp_core)
training:         input row → typed state mutation → checkpoint save (or "n/a, core owns it")
tests:            the exact Jest spec(s) that prove the fix
```

A schema-only row ("add chosen/rejected/quarantine", "make typed state") is a
**failed** repair — it leaves the executor to invent the architecture.

## DETERMINISTIC-BOUNDARY GATE

Every reviewed slice explicitly searches for a hidden deterministic
scorer/router/lookup/counter/exact-replay posing as a trainable unit, and labels
any genuinely-deterministic helper as **eval-only / helper / internal baseline**
(not the production decision authority). A deterministic helper used for corpus
labeling, fixtures, or evaluation is fine **only** when labeled as such.

## MULTI-CYCLE FLOOR + BOUNDED-SUBAGENT EVIDENCE

When the review is the gate for a trainable/phase-done claim, one pass is not
enough: run the agreed independent review/fix cycles, each naming the reviewer,
the artifact before/after, findings (or a no-fix justification), and recheck
evidence. A generated table of rows is **not** N cycles; parent self-review is
not a sub-agent review. Sub-agent evidence must include the **real code path**
and artifact-class match — not only JSON/report/contract-check presence.

## HUMAN-READABLE REPORT GATE

The Layer-5 verdict must be readable by a human architect in plain language first
(machine labels after). Minimum:

```text
Unit: <name>. Claimed: trainable | scaffold.
Layer 5: PASS_AS_HONEST_UNTRAINED_SCAFFOLD | PASS_AS_TRAINED_FEATURE | DOWNGRADE.
Why: <one phrase — are there numeric held-out metrics, is there hidden determinism>.
If downgrade: what exactly is deterministic (file:line), what replaces it, which test proves it.
Metrics: <numbers or "n/a — an honest untrained scaffold">.
```

---

## REVIEW OUTPUT

Record the review result before Phase E:

```bash
jq --argjson review '{
  "taskTypeId": "T47",
  "reviewedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "layer1_semantic": "PASS",
  "layer2_dna": "PASS",
  "layer3_silent_failure": "PASS — no MACHINE constants via config.get",
  "layer4_training_impact": "PASS — setIfAbsent pattern generalizes correctly",
  "layer5_trainable_vs_stub": "PASS_AS_HONEST_UNTRAINED_SCAFFOLD — no learned claim; no hidden BM25/dict",
  "layer5_numeric_metrics": "n/a — not a trained feature (training lives in llm_mvp_core)",
  "deterministic_boundary_clean": true,
  "approved_for_dpo_capture": true
}' '.reviews.T47 = $review' FLOW-XX-STATE.json > tmp.json && mv tmp.json FLOW-XX-STATE.json
```

If any layer FAILS: do NOT capture the DPO triple. Apply the fix first, then re-run
the cycle to get a clean `chosen` candidate.

---

## ANTI-PATTERNS

```
❌ Skipping Layer 3 because the score is above 0.85 — SILENT_FAILURE scores high
❌ Approving a MACHINE constant via config.get() because "it defaults to the right value"
❌ Running this review after Phase E capture — the triple is already stored
❌ Applying this review to rejected.code — only chosen.code teaches patterns
❌ Treating a workaround as acceptable because it "fixes the immediate problem"
❌ Reporting a scaffold as PASS_AS_TRAINED_FEATURE — that is the masquerade class
❌ Layer-5 PASS for a trained claim with UNKNOWN / validation_only / static metrics
❌ Letting a deterministic BM25/regex/dictionary decision pose as a learned unit
❌ Counting a generated table of rows as N independent review cycles
```
