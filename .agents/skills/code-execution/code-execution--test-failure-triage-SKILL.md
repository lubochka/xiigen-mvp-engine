---
name: test-failure-triage
sk_number: SK-473
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  When `npx jest` returns failures, classify each failure before acting.
  Four failure classes (generation regression, infrastructure regression,
  test fragility, pipeline infrastructure failure) require completely
  different responses. P19 absolute gate (failures===0) without this skill
  produces "fix everything until tests pass" — which can corrupt code that
  was previously correct. Load at first sight of any test failure.
triggers:
  - "tests are failing"
  - "jest returns failures"
  - "triage failures"
  - "which test failed"
  - "test regression"
  - "infrastructure failure"
  - "failures === 0 failing"
  - "npx jest"
---

# Test Failure Triage Skill (SK-473)

## WHAT THIS SKILL PREVENTS

The P19 gate requires `failures === 0`. Without classification, ALL failures get
the same response (patch the code). This is wrong when: the test is fragile, the
infrastructure changed, or the AF pipeline itself threw an exception. Patching code
to satisfy a fragile test produces a codebase where tests pass but code is wrong.

---

## STEP 1 — CAPTURE THE FAILURE REPORT

```bash
cd server && npx jest 2>&1 | tee /tmp/jest-output.txt
# Capture: failure count, test names, error messages, stack traces
grep -E "FAIL|PASS|●|Tests:|Time:" /tmp/jest-output.txt | head -30
```

---

## STEP 2 — CLASSIFY EACH FAILURE

For each failing test, apply this classification decision tree:

```
Was this test passing in the previous session?

  YES (regression) → Was code changed in this session?
    YES → CLASS 1: Generation regression
    NO  → Was any infrastructure/dependency changed?
      YES → CLASS 2: Infrastructure regression
      NO  → CLASS 4: Pipeline infrastructure failure (investigate AF pipeline)

  NO (new test) → Is this test code correct?
    NO  → CLASS 3: Test fragility (the test was written incorrectly)
    YES → Was the generated code supposed to satisfy this test?
      YES → CLASS 1: Generation regression
      NO  → Review: is this test for the right task type?
```

---

## CLASS 1 — GENERATION REGRESSION

**Definition:** The AF pipeline generated code that was worse than the previous
cycle. A test that was previously passing now fails because the new generated
service file broke a behavioral invariant.

**Detection:**
```bash
# Compare current service file to previous passing version
git diff HEAD~1 server/src/engine/flows/FLOW-XX/*.service.ts | head -50
# If diff is non-empty → generation regression confirmed
```

**Response:**
1. DO NOT patch the test — the test is correct
2. Classify: is this a DNA violation, iron rule violation, or logic error?
3. Load SK-471 (score-interpretation) to interpret the current score
4. Load SK-472 (prompt-patch-authoring) and target the specific violated constraint
5. Re-run Phase B for this task type with the patch

---

## CLASS 2 — INFRASTRUCTURE REGRESSION

**Definition:** A dependency, environment variable, fabric mock, or external service
changed. The test and the generated code are both correct; the test fails because
the environment changed beneath them.

**Detection:**
```bash
# Check if any package.json dependency changed
git diff HEAD~1 package.json | grep "^[+-]" | grep -v "^---\|^+++"

# Check if any environment variable was added/removed
grep -rn "process.env\." server/src/ | diff - <(git show HEAD~1:server/src/**/*.ts | grep "process.env\." 2>/dev/null) | head -20

# Check if any fabric mock in test setup changed
git diff HEAD~1 server/src/**/__tests__/*.spec.ts | grep "provide\|mock\|jest.fn" | head -20
```

**Response:**
1. DO NOT patch the generated code
2. Fix the infrastructure: update mock, add environment variable, update dependency
3. Re-run tests after infrastructure fix only
4. Record in ISSUE INVENTORY: "FIXED: infrastructure regression — [what changed]"

---

## CLASS 3 — TEST FRAGILITY

**Definition:** The test was always wrong. It passed by accident (relying on
implicit assumptions) or it tests implementation details instead of behavior.

**Detection markers:**
- Test asserts on specific SDK call counts (`expect(redis.set).toHaveBeenCalledTimes(3)`)
- Test asserts on internal state that shouldn't be observable
- Test passes only when tests run in a specific order (order-dependent)
- Test uses `setTimeout` without proper mocking
- Test checks exact error message strings that may change

```bash
# Look for SDK-level assertions (fragility indicator)
grep -rn "toHaveBeenCalledWith\|toHaveBeenCalledTimes\|\.mock\.calls" \
  server/src/**/__tests__/*.spec.ts | head -20
# Expected for behavioral tests: behavioral outcomes, not call counts
```

**Response:**
1. Fix the test to assert behavior, not implementation
2. Load `code-execution--behavioral-test-generation-SKILL.md` (SK-477) for guidance
3. After fixing: run only this test to confirm the fix didn't mask a real failure
4. Record in ISSUE INVENTORY: "FIXED: test fragility — rewritten to assert behavior"

---

## CLASS 4 — PIPELINE INFRASTRUCTURE FAILURE

**Definition:** The AF pipeline itself threw an exception, timed out, or produced
an error during Phase B generation. This is NOT a generation quality failure and
NOT a test failure — the code was never generated correctly because the pipeline
didn't complete.

**Detection:**
```bash
# Look for pipeline error markers in jest output
grep -E "TimeoutError|ECONNREFUSED|ElasticsearchClientError|Cannot connect" /tmp/jest-output.txt

# Check AF pipeline health
curl -sf localhost:3000/api/engine/status | jq '.data | {status, queueDepth, errorRate}'

# Check if ES indices are reachable
curl -sf "localhost:9200/xiigen-engine-contracts/_count" | jq '.count'
# If error: infrastructure issue, not generation issue
```

**Response:**
1. DO NOT apply PromptPatch — code was not generated, patch has nothing to target
2. Diagnose the infrastructure failure: ES connection? Queue depth? Provider timeout?
3. Fix the infrastructure
4. Re-run Phase B from the beginning for this task type — do NOT resume mid-cycle
5. Record in ISSUE INVENTORY: "FIXED: pipeline infrastructure failure — [root cause]"

**Key distinction:** A Class 4 failure produces a service file that is EMPTY or
INCOMPLETE — it was never generated. A Class 1 failure produces a service file
that is present but wrong. Check file size and content before classifying:

```bash
wc -l server/src/engine/flows/FLOW-XX/t47-user-registration-initiator.service.ts
# < 20 lines → likely Class 4 (incomplete generation)
# > 20 lines → likely Class 1 (generated but wrong)
```

---

## STEP 3 — RECORD CLASSIFICATION

Before fixing anything, record each failure's class:

```bash
cat > /tmp/failure-triage.json << 'EOF'
{
  "failures": [
    {
      "testName": "T47 should prevent duplicate registration",
      "class": "CLASS_1_GENERATION_REGRESSION",
      "evidence": "service file diff shows scope_id check removed",
      "response": "PromptPatch targeting iron_rules sub-score"
    }
  ]
}
EOF
```

---

## ANTI-PATTERNS

```
❌ Running PromptPatch on a Class 3 failure — makes tests pass but code is now wrong
❌ Fixing infrastructure to make a Class 1 failure pass — masks a real generation bug
❌ Not classifying before acting — fixing the wrong layer every time
❌ Marking a Class 4 failure as "test fragility" — pipeline failures recur
❌ Treating all failures as the same class — the default failure of this gate
```
