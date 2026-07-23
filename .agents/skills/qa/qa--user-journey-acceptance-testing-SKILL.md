---
name: user-journey-acceptance-testing
sk_number: SK-499
version: "1.0.0"
priority: HIGH
load_order: 99
category: qa
layer: product
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  Derives end-to-end acceptance test scripts from UML sequence diagrams, written
  BEFORE implementation begins (diagram's "Think about test cases" Phase A step).
  Each UML guard condition becomes a test branch. Each alternative path becomes
  a test scenario. Produces test stubs that are executable shell scripts or
  Jest scenarios that verify business outcomes, not service internals.
  Load at Phase A of any flow that has a corresponding UML sequence diagram.
triggers:
  - "derive tests from UML"
  - "user journey test"
  - "end to end test from sequence diagram"
  - "acceptance test"
  - "test before implementation"
  - "E2E test script"
  - "UML guard condition test"
  - "test the whole flow"
  - "does the platform work for users"
---

# User Journey Acceptance Testing Skill (SK-499)

## WHAT THIS SKILL PREVENTS

The "all services pass but the platform doesn't work" failure. Individual Phase D
behavioral tests validate services. This skill validates the user's experience of
the entire flow. The information to write these tests exists in the UML before any
code is written — this skill uses it.

---

## WHEN TO RUN

At Phase A of any flow that has a UML sequence diagram. Produce test stubs
BEFORE the genesis prompts are written. The stubs become acceptance criteria
(SK-482) that constrain what the generated code must produce.

---

## STEP 1 — EXTRACT SCENARIOS FROM THE UML

Every UML sequence diagram contains:
- **The happy path** (main flow, no errors)
- **Guard conditions** `[Payment Failed]`, `[Email Invalid]`, `[Quota Exceeded]`
- **Alt/opt fragments** — alternative paths
- **Loop fragments** — repeated operations (polling, batch processing)

Map each to a test scenario:

```
Registration UML → scenarios:

HAPPY PATH:
  Scenario R-01: User registers with email, verifies, completes questionnaire
  Expected: OnboardingCompleted event emitted, API key active

GUARD CONDITIONS:
  Scenario R-02: Email already registered
    Guard: [Email Already Exists]
    Expected: HTTP 409, no duplicate member record, no email sent

  Scenario R-03: Email verification link expires
    Guard: [Token Expired]
    Expected: ResendVerification endpoint works, new token issued, old token invalid

  Scenario R-04: Questionnaire submitted incomplete
    Guard: [Incomplete Answers]
    Expected: 422 validation error, questionnaire state preserved for resume

SSO ALTERNATIVE PATH:
  Scenario R-05: User registers via SSO provider
    Alt: [SSO Path]
    Expected: T48 (email verification) skipped, goes directly to T49

EDGE CASES FROM DOMAIN KNOWLEDGE:
  Scenario R-06: Same registration submitted twice (idempotency)
    Expected: Second request returns same result, no duplicate records
```

---

## STEP 2 — WRITE TEST STUBS IN EXECUTABLE FORMAT

Each scenario becomes an executable shell script stub or Jest test stub.
Write the stub BEFORE implementation — fill in expected values from the UML.
Leave the actual HTTP calls as `# TODO: implement` until services are ACTIVE.

```bash
#!/bin/bash
# R-01: Happy path registration → onboarding completion
# UML: Registration page, main flow
# Expected terminal event: OnboardingCompleted

TENANT="xiigen-community"
EMAIL="test-$(date +%s)@example.com"

echo "=== R-01: Happy path registration ==="

# Step 1: Register
echo "Step 1: Register"
# TODO: STEP 1 EXECUTE (replace with actual once FLOW-01 T47 is ACTIVE)
# RESPONSE=$(curl -sf -X POST localhost:3000/api/auth/register \
#   -H "Content-Type: application/json" -H "X-Tenant-Id: $TENANT" \
#   -d "{\"email\":\"$EMAIL\",\"preferences\":{\"projectType\":\"community\"}}")
# TRACE_ID=$(echo $RESPONSE | jq -r '.data.traceId')
TRACE_ID="placeholder-trace-id"

# Step 2: Verify email
echo "Step 2: Verify email"
# TODO: Get token from email mock, call /auth/verify/:token

# Step 3: Complete questionnaire
echo "Step 3: Complete questionnaire"
# TODO: POST /api/questionnaire/complete with 3 answers

# VERIFY: Terminal event emitted
echo "Verify: OnboardingCompleted emitted"
# TODO: Once services are ACTIVE
# EVENT_COUNT=$(curl -sf "localhost:9200/xiigen-events/_search" \
#   -d "{\"query\":{\"bool\":{\"must\":[{\"term\":{\"type.keyword\":\"OnboardingCompleted\"}},{\"term\":{\"traceId.keyword\":\"$TRACE_ID\"}}]}}}" \
#   | jq '.hits.total.value')
# [[ "$EVENT_COUNT" -eq 1 ]] && echo "✅ R-01 PASS" || echo "❌ R-01 FAIL: OnboardingCompleted missing"
echo "TODO: Activate after FLOW-01 ACTIVE"
```

---

## STEP 3 — WRITE GUARD CONDITION TESTS

Guard conditions in UMLs are the most valuable tests. They are the failure modes
the system architect thought about. Each one deserves a test that:
1. Sets up the guard condition (duplicate email, expired token, etc.)
2. Executes the user action
3. Verifies the SPECIFIC expected behavior in the UML (not just "returns an error")

```typescript
// R-02: Email already registered
describe('Registration — duplicate email guard', () => {
  it('should return 409 and not create a duplicate member record', async () => {
    // Setup: member already exists
    await createMemberFixture({ email: 'existing@example.com' });

    // Action: attempt second registration
    const response = await request(app)
      .post('/api/auth/register')
      .set('X-Tenant-Id', 'xiigen-community')
      .send({ email: 'existing@example.com', preferences: {} });

    // Verify: HTTP status
    expect(response.status).toBe(409);

    // Verify: No duplicate record (this is the business outcome, not just status)
    const memberCount = await esClient.count({
      index: 'xiigen-community-members',
      body: { query: { term: { 'email.keyword': 'existing@example.com' } } }
    });
    expect(memberCount.count).toBe(1);  // exactly one, not two

    // Verify: No email sent (idempotent — no spam to existing users)
    const emailJobCount = await queueClient.getJobCount('email-verification');
    expect(emailJobCount).toBe(0);
  });
});
```

---

## STEP 4 — ATTACH TO QUALITY GATES

The test scenarios from this skill become the `qualityGates[]` entries in the
EngineContract (SK-485 + FC-16):

```json
{
  "qualityGates": [
    {
      "scenarioId": "R-01",
      "criterion": "User can register with email, verify, complete questionnaire, and receive OnboardingCompleted",
      "verifyCommand": "bash ./acceptance-tests/FLOW-01/R-01-happy-path.sh",
      "sourcedFrom": "Registration UML — main flow",
      "phase": "product-acceptance"
    },
    {
      "scenarioId": "R-02",
      "criterion": "Duplicate email returns 409 and does not create duplicate member",
      "verifyCommand": "npx jest --testPathPattern=R-02-duplicate-email",
      "sourcedFrom": "Registration UML — [Email Already Exists] guard",
      "phase": "phase-d"
    }
  ]
}
```

---

## SCENARIO FILE STRUCTURE

One file per flow, in `acceptance-tests/FLOW-XX/`:

```
acceptance-tests/
  FLOW-01/
    R-01-happy-path.sh          ← executes the terminal event trace
    R-02-duplicate-email.spec.ts ← guard condition test
    R-03-token-expired.spec.ts   ← guard condition test
    R-04-incomplete-questionnaire.spec.ts
    R-05-sso-path.spec.ts       ← alt path test
    R-06-idempotency.spec.ts    ← domain knowledge edge case
    SCENARIO-MANIFEST.md        ← lists all scenarios, source UML, pass/fail status
```

---

## ANTI-PATTERNS

```
❌ Writing acceptance tests after implementation ("tests to match the code")
❌ Guard condition tests that only check HTTP status, not business state
❌ Happy path only — guard conditions are where most bugs live
❌ Tests that require manual steps ("now open the email and click the link")
   → Every step must be executable via API or ES query
❌ Test scenarios that depend on each other's state
   → Each scenario must set up its own fixtures
```
