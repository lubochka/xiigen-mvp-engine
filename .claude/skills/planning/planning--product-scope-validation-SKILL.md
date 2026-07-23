---
name: product-scope-validation
sk_number: SK-493
version: "1.0.0"
priority: HIGH
load_order: 99
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  After generated flows are ACTIVE, validate that the platform as a whole
  satisfies the original product intent — not individual service tests but
  the business outcome the customer or product description specified.
  Different from QA session (SK-481) which validates a single phase. This
  skill validates the assembled product across all delivered flows.
triggers:
  - "does the platform work as a product"
  - "validate the whole system"
  - "product acceptance"
  - "does this match what was described"
  - "platform review"
  - "end to end product check"
  - "customer delivery validation"
---

# Product Scope Validation Skill (SK-493)

## WHAT THIS SKILL PREVENTS

The "all services pass but the platform doesn't work" failure. Individual Phase D
behavioral tests and Phase E DPO capture validate services. No existing check
validates the product story: a user can sign up, get onboarded, create an event,
and have another user find that event and register for it. If any of those cross-
flow connections is broken, every individual service test still passes.

---

## WHEN TO RUN

After each Wave completes (all flows in the wave are ACTIVE). Run before claiming
the wave is deliverable to a customer.

---

## STEP 1 — RETRIEVE THE ORIGINAL PRODUCT INTENT

Read the decomposition document produced by SK-492 (requirement-to-flow). The
`TERMINAL EVENT` field is the product's done definition.

If no decomposition document exists, derive it now:
- What user story started this product?
- What does a user see / receive when the product is working correctly?
- What event would you never see if the product was broken?

Write this as a single check: `[Actor] can [action] and receive [outcome]`.

Example: `A developer can register, verify their email, complete onboarding, and
receive an API key that works against the platform.`

---

## STEP 2 — DEFINE THE PRODUCT SCENARIO

Translate the product intent into a concrete end-to-end scenario with real data:

```
Scenario: Developer Registration and Onboarding
Actor:    new_developer@example.com
Steps:
  1. POST /auth/register with email + preferences
  2. Click verification link from email
  3. Complete questionnaire (3 questions, 3 answers)
  4. Receive onboarding package (API key, workspace setup, tutorial links)
Expected outcome:
  - Member record exists in DB with status = ACTIVE
  - API key exists in IScopedMemoryService with 90d TTL
  - OnboardingCompleted event emitted to event stream
  - Wave 2 flows can begin for this member
Failure indicator:
  - Any step returns an error
  - Final state missing (member active but no API key)
  - OnboardingCompleted never emitted (Wave 2 flows don't trigger)
```

---

## STEP 3 — TRACE THE SCENARIO AGAINST LIVE FLOW STATE

For each step in the scenario, verify that the active services can execute it:

```bash
# Step 1: Registration service is ACTIVE
curl -sf "localhost:9200/xiigen-flow-lifecycle/_doc/FLOW-01" | jq '.status'
# Expected: "ACTIVE"

# Step 2: Task types are promoted
for TT in T47 T48 T49; do
  curl -sf "localhost:9200/xiigen-task-types/_doc/${TT}" | jq '{id: ._id, status: ._source.status}'
done
# Expected: all "INJECTED" or "ACTIVE"

# Step 3: Cross-flow events are registered
curl -sf "localhost:9200/xiigen-cross-flow-deps/_search" \
  -d '{"query":{"term":{"sourceFlowId.keyword":"FLOW-01"}}}' \
  | jq '.hits.hits[]._source | {targetFlowId, event, type}'
# Expected: OnboardingCompleted → Wave 2 gate registered

# Step 4: Execute the scenario (use the correct execute format from BUG-9 fix)
CONTRACT=$(curl -sf localhost:9200/xiigen-engine-contracts/_doc/T47 | jq ._source)
RESULT=$(curl -sf -X POST localhost:3000/api/flow/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: xiigen-community" \
  -d "{\"contract\":${CONTRACT},\"inputs\":{\"email\":\"test@example.com\",\"preferences\":{}},\"tenantId\":\"xiigen-community\",\"projectId\":\"xiigen-community\"}")
echo $RESULT | jq '{status: .status, traceId: .data.traceId}'
```

---

## STEP 4 — VALIDATE BUSINESS OUTCOMES (NOT TECHNICAL OUTPUTS)

For each step, validate the business outcome, not the HTTP status code.

```
Business outcome check vs technical check:

Technical: POST /auth/register returns 200 OK  ← not sufficient
Business:  Member record exists with correct status, API key issued, 
           email queued for delivery, idempotency key prevents duplicate

Technical: GET /api/members/me returns the member object  ← not sufficient
Business:  Member's profile is queryable by OTHER members via the matching engine,
           member appears in recommendation results for relevant criteria
```

For each intended business outcome:
```bash
# Example: verify API key was issued (not just that the service ran)
API_KEY_COUNT=$(curl -sf "localhost:9200/xiigen-community-keys/_count" \
  -d '{"query":{"term":{"memberId.keyword":"test@example.com"}}}' | jq '.count')
[[ "$API_KEY_COUNT" -gt 0 ]] && echo "✅ API key issued" || echo "❌ No API key"

# Example: verify OnboardingCompleted was emitted (not just that T49 ran)
EVENT_COUNT=$(curl -sf "localhost:9200/xiigen-events/_count" \
  -d '{"query":{"bool":{"must":[{"term":{"type.keyword":"OnboardingCompleted"}},{"term":{"sourceFlowId.keyword":"FLOW-01"}}]}}}' | jq '.count')
[[ "$EVENT_COUNT" -gt 0 ]] && echo "✅ OnboardingCompleted emitted" || echo "❌ Terminal event missing"
```

---

## STEP 5 — PRODUCE THE PRODUCT VALIDATION REPORT

```markdown
# PRODUCT VALIDATION REPORT — Wave [N]
## Date: [date]
## Flows validated: [list]
## Scenario tested: [one-line description]

## PRODUCT INTENT
[The original product intent statement from SK-492]

## SCENARIO RESULTS
| Step | Business outcome | Check command | Result |
|------|-----------------|---------------|--------|
| [step] | [outcome] | [command] | PASS / FAIL |

## CROSS-FLOW CONNECTIONS VERIFIED
| Source flow | Event | Target flow | Connected? |
|-------------|-------|------------|------------|

## VERDICT: PRODUCT-READY | INCOMPLETE | BROKEN_DEPENDENCY

## If INCOMPLETE or BROKEN_DEPENDENCY:
### Missing connections:
### Broken business outcomes:
### Recommended fix sessions:
```

---

## ANTI-PATTERNS

```
❌ Running this before all flows in the wave are ACTIVE
❌ Treating HTTP 200 as a business outcome pass
❌ Skipping cross-flow connection verification ("each flow tested separately")
❌ Testing with artificial data that bypasses the actual business rules
❌ Claiming the product is ready without verifying the terminal event
```
