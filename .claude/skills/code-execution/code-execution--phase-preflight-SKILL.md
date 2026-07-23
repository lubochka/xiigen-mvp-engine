---
name: phase-preflight
sk_number: SK-457
version: "1.0.0"
priority: MANDATORY
load_order: -1
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  At the start of every Claude Code session, before writing a single line of code,
  run every verification command in the session file's STEP 0 assumption registry.
  A failed assumption is BLOCKING unless a fallback is specified. BLOCKING + no fallback
  = STOP and escalate before any code is written. This skill prevents the three blocking
  issue classes found in every review cycle: wrong method signatures, missing registrations,
  and stale assumptions about prior session completions.
triggers:
  - "STEP 0"
  - "preflight"
  - "before writing any code"
  - "assumption verification"
  - "verify assumptions"
  - "start of session"
  - "check preconditions"
  - "verify prerequisites"
---

# Phase Preflight Skill (SK-457) v1.0

## WHEN TO INVOKE

At the start of every Claude Code execution session, before any code is written.
This is the execution-time counterpart to `planning--assumption-registry-SKILL.md` (SK-456).

If a session file has no STEP 0 assumption registry: run the default preflight checks
below before proceeding. Then flag the missing registry in ISSUE INVENTORY.

---

## THE PREFLIGHT PROTOCOL

### Step 1: Run every assumption verification command

For each row in the session file's STEP 0 assumption registry:
```bash
# Run the verification command
RESULT=$(command_from_row)

# Compare against expected output
if [expected condition not met]; then
  echo "ASSUMPTION FAILED: [description]"
  echo "Expected: [expected]"
  echo "Actual:   ${RESULT}"
  echo "Fallback: [fallback from row]"
fi
```

### Step 2: Triage failures

For each failed assumption:

```
Has fallback → apply fallback immediately
              note in ISSUE INVENTORY: EXCEPTION — fallback applied, reason documented
              continue to Step 3

No fallback (BLOCKING) → STOP
                         Do NOT proceed to any implementation step
                         Escalate: provide exact failure output + expected output
                         Claude Code cannot proceed until the blocking assumption is resolved
```

### Step 3: Record results before first implementation step

```markdown
## PREFLIGHT RESULTS

| Assumption | Result | Action |
|-----------|--------|--------|
| A1: createFeedbackRecord exists | ✅ PASS | No action |
| A2: LightRagProvider registration | ❌ FAIL | BLOCKING — stopped session |
| A3: arbiterConfig camelCase | ✅ PASS | No action |
| A4: Group A changes present | ✅ PASS | No action |
```

Only proceed to implementation after all BLOCKING assumptions pass
or have approved fallbacks applied.

---

## DEFAULT PREFLIGHT CHECKS (when no registry exists)

When a session file has no assumption registry, run these defaults:

```bash
echo "=== DEFAULT PREFLIGHT — No assumption registry in session file ==="

# 1. Test baseline
cd server && npx jest 2>&1 | tail -5
# Expected: failures === 0

# 2. Prior group completeness (for sessions that depend on previous groups)
# Fill in based on the dependency declared in the session file header:
# "Prerequisite: GROUP A must be complete"
echo "Manual check required: verify prerequisite group completion"

# 3. Target files exist
for FILE in $(grep "server/src" SESSION-GROUP-*.md | grep -oE "server/src[^ ']+" | sort -u); do
  if [ ! -f "$FILE" ]; then echo "MISSING FILE: $FILE"; fi
done

# 4. No compilation errors in current state
cd server && npx tsc --noEmit 2>&1 | head -10
# Expected: 0 errors

echo "=== DEFAULT PREFLIGHT COMPLETE — Add assumption registry to plan for more coverage ==="
```

Flag in ISSUE INVENTORY: "No assumption registry in session file — default preflight run only. Add SK-456 assumption registry to next plan."

---

## THREE PREFLIGHT PATTERNS BY FIX TYPE

Different types of fixes have different assumption risks.

### Pattern 1: Handler injection fix (adding a new @Optional() dependency)

The assumption that is almost always wrong: the class being injected has the expected
method signature and is registered in the NestJS DI container.

```bash
# Verify method exists with exact signature
grep -n "methodName(" server/src/path/to/service.ts
# Expected: 1 hit with the exact parameter types

# Verify service is exported from its module
grep -n "exports:" server/src/module/module.ts | grep "ServiceName"
# Expected: 1 hit

# Verify module is imported by the target handler's module
grep -n "ServiceName\|ModuleName" server/src/engine/engine.module.ts
# Expected: 1+ hits
```

### Pattern 2: TypeScript field access (reading a field from an object)

The assumption that is almost always wrong: the field name (camelCase vs snake_case)
and the TypeScript type that exposes it.

```bash
# Verify field name on TypeScript interface
grep -n "readonly fieldName\|fieldName:" server/src/path/to/schema.ts
# Expected: 1 hit — confirms camelCase

# Verify the handler receives the TypeScript object, not the ES-serialized dict
grep -n "contract\.\|contractDoc\[" server/src/path/to/handler.ts | head -5
# Review output: does the access pattern match what the field name check found?
```

### Pattern 3: Module registration (adding a new provider)

The assumption that is almost always wrong: the provider is not already registered
and the module exports the right token.

```bash
# Check if provider is already registered
grep -n "ProviderName\|PROVIDER_TOKEN" server/src/fabrics/module.ts
# Expected: 0 hits (not yet registered) OR already registered (skip this fix)

# Verify the token is defined
grep -n "export const TOKEN_NAME" server/src/fabrics/interfaces/interface.ts
# Expected: 1 hit

# Verify existing tests still pass after registration
cd server && npx jest --testPathPattern="module-name" 2>&1 | tail -5
# Expected: 0 failures
```

---

## ESCALATION FORMAT

When a BLOCKING assumption fails:

```
PREFLIGHT BLOCKED: Cannot proceed with [session name]

Blocking assumption: [A-N from registry]
Description: [what was assumed]
Verification command: [the command that was run]
Expected: [what was expected]
Actual: [what was found]

Implication: [what this means for the plan — which fixes depend on this assumption]
Resolution needed: [what must be true before this session can proceed]

Options:
  Option A: [fix the assumption — what would that require?]
  Option B: [rewrite the fix to not depend on this assumption]
  Option C: [escalate — this requires a decision that changes the plan]
```

---

## RELATIONSHIP TO ISSUE INVENTORY

Preflight results that reveal planning errors belong in ISSUE INVENTORY as FIXED
(if a fallback was applied) or BLOCKING (if escalated):

```markdown
## ISSUE INVENTORY (populated from preflight)

| Issue | Status | Guard added |
|-------|--------|-------------|
| createFeedbackRecord not present in feedback-types.ts | FIXED: inlined FeedbackRecord construction instead of factory | SK-456 assumption registry now includes this for future A-4a plans |
| LightRagProvider not registered in rag.module.ts | BLOCKING: session not started — escalated to Luba | Add rag.module.ts registration to Group A session file |
```

---

## WHAT THIS SKILL PREVENTS

- Blocking issues discovered mid-session (after code is written but before tests run)
- Review cycles caused by wrong assumptions about method signatures
- Claude Code writing code against a wrong camelCase/snake_case assumption
- Sessions blocked by missing registrations that were not in the session file

These are the three classes that caused blocking issues in the planning files review.
Each would have been caught by a 30-second preflight check.

---

## INTEGRATION

```
Invoke at:   START of every Claude Code session — before any code is written
Reads from:  SESSION-GROUP-*.md STEP 0 assumption registry (produced by SK-456)
Produces:    PREFLIGHT RESULTS table in ISSUE INVENTORY
Feeds into:  Determination of whether to proceed, apply fallback, or escalate
References:  planning--assumption-registry-SKILL.md (SK-456) — produces the registry
             HOW-TO-USE-SKILLS-v2.3.0.md — MANDATORY CHECKS section
```
