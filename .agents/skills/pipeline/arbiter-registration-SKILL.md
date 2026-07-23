---
name: arbiter-registration
sk_number: SK-440
version: "1.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Protocol for registering flow-specific arbiters in Phase A:
  creating arbiter fixture documents, seeding to xiigen-arbiters, verifying
  the validate handler's NAMED_CHECKS registry contains matching implementations,
  running the arbiter replay gate (V18), and testing each arbiter in isolation.
triggers:
  - "register arbiter"
  - "arbiter replay"
  - "Phase A gate V18"
  - "named check"
  - "validate handler arbiter"
  - "arbiter fixture"
---

# arbiter-registration

## Purpose

Phase A (INJECT) includes arbiter seeding as gate step NEW-A6.
P6 of xiigen-core-principles requires "5 arbiters configured per new T-XXX."
The flow-completeness-checker V18 checks "Phase A gate includes arbiter replay."

No prior skill defines the arbiter fixture format, the available named check IDs,
how to verify the validate handler loads them, or what "arbiter replay" means.
This skill provides all of that.

---

## When to Invoke

Auto-fire at Phase A start for any flow that declares arbiters in its
ARBITER COUPLING ANNOTATIONS section.
Check: `contract.arbiters[]` — if non-empty, run this skill.

---

## Step 1 — Extract Arbiter Requirements

From the reference plan's ARBITER COUPLING ANNOTATIONS section, extract:
- Arbiter name (e.g., `routing::auth-security`)
- Task types it applies to
- What it checks (the business rule)
- Severity (score-0 / BUILD_FAILURE / warning)

Map each arbiter name to a `check` value (named check ID from the registry below).

---

## Step 2 — Available Named Checks

These named check IDs are implemented in `validate.handler.ts` NAMED_CHECKS:

| Named Check ID | What it detects |
|---------------|----------------|
| `throttle_decorator_present` | `@Throttle()` decorator or explicit rate limit check in registration handler |
| `completedSteps_guard_before_emit` | `completedSteps[]` guard present before OnboardingCompleted emit |
| `delayed_job_scheduled` | Delayed job scheduler call (Bull/BullMQ/schedule/addJob) for TTL-based expiry |
| `try_catch_around_f178_call` | try/catch around email delivery (F178/IEmailDelivery) call |
| `property_type_scan` | PII detected in event payload (email/password/phone/name) — returns FAIL if found |
| `event_listener_order` | T47→T48→T49 event listener registration order |

**If the arbiter requires a check not in this list:**
→ This is a new named check that must be added to `validate.handler.ts` NAMED_CHECKS before Phase A seeding.
→ Document it as a new gap entry: "validate.handler missing named check: {check_id}"
→ Specify the detection logic: `(code: string, contract: Record<string, unknown>) => { pass: boolean, message: string }`

---

## Step 3 — Arbiter Fixture Format

One JSON document per arbiter, in `server/fixtures/arbiters/flow-NN-arbiters.json`:

```json
{
  "arbiterId": "FLOW-01-routing-auth-security-001",
  "flowId": "FLOW-01",
  "taskTypes": ["T47"],
  "rule": "Registration endpoint must have rate limiting before any business logic executes",
  "check": "throttle_decorator_present",
  "checkTarget": "generated_code",
  "severity": "score-0",
  "description": "T47 must have @Throttle() decorator — rate limiting must be visible in generated code"
}
```

**Required fields (all mandatory):**
- `arbiterId` — format: `{flowId}-{arbiter-name}-{NNN}`
- `flowId` — which flow registered this arbiter
- `taskTypes[]` — which task types this arbiter applies to
- `rule` — human-readable description of the business rule
- `check` — must exactly match a key in NAMED_CHECKS (see Step 2)
- `checkTarget` — always `"generated_code"` for code validation arbiters
- `severity` — `score-0` | `BUILD_FAILURE` | `warning`
- `description` — what the check looks for in the code

---

## Step 4 — Seeding + Verification

```bash
# Seed arbiter fixtures
npx ts-node server/src/bootstrap/engine-bootstrapper.ts --only=arbiters

# Verify seeding
curl -s 'localhost:9200/xiigen-arbiters/_search?q=flowId:FLOW-01' | jq '.hits.total.value'
# Expected: N (one per arbiter defined in fixtures/arbiters/flow-01-arbiters.json)

# Verify each named check is registered in validate.handler
grep -n "throttle_decorator_present\|completedSteps_guard" \
  server/src/engine/node-handlers/validate.handler.ts
# Expected: at least N matches (one per named check used)
```

---

## Step 5 — Arbiter Replay Gate (V18)

The arbiter replay gate verifies each arbiter fires correctly before Phase B.

**For each arbiter, run a replay test:**
```typescript
// Test: arbiter fires on BAD code
const badCodeResult = await validateHandler.execute({
  ruleset: 'arbiters',
  taskTypeId: 'T47'
}, {
  ...context,
  outputs: {
    'n4': { generated_code: '// register() { return this.db.save(user); }' } // no @Throttle
  }
});
// Expected: violations contains { arbiterId: "FLOW-01-routing-auth-security-001", severity: "score-0" }

// Test: arbiter PASSES on GOOD code
const goodCodeResult = await validateHandler.execute({
  ruleset: 'arbiters',
  taskTypeId: 'T47'
}, {
  ...context,
  outputs: {
    'n4': { generated_code: '@Throttle(10, 60000)\nregister() { return this.db.save(user); }' }
  }
});
// Expected: violations is empty for this arbiter
```

**Phase A gate V18 passes when:** all arbiters fire on violating code AND pass on compliant code.

---

## Step 6 — Severity Levels and Scoring Impact

| Severity | Effect on Score |
|----------|----------------|
| `score-0` | The component containing this arbiter scores 0 regardless of other checks. Iron rules + arbiters component becomes 0. |
| `BUILD_FAILURE` | Same as score-0 but flagged with a BUILD_FAILURE label in the trace. Used for DNA-8 (enqueue before store) violations. |
| `warning` | Score is reduced by arbiter weight (defined in quality gates) but not zeroed. Used for style/recommendation violations. |

---

## Hard Rules

- NEVER create an arbiter fixture with a `check` value that doesn't exist in NAMED_CHECKS — validate.handler silently skips unknown checks
- NEVER use "warning" severity for iron rule violations — use "score-0" or "BUILD_FAILURE"
- NEVER skip the arbiter replay test — a check that looks registered but returns incorrect results will corrupt all Phase B scoring
- The arbiter replay gate MUST run before Phase B, not just at Phase A end
