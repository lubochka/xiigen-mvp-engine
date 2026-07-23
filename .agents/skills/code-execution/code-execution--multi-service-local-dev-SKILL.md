---
name: multi-service-local-dev
sk_number: SK-501
version: "1.0.0"
priority: MEDIUM
load_order: 0
category: code-execution
layer: product
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  How to run a local development environment when a flow under development
  depends on services from earlier flows. Covers: which services must be
  running, how to mock event-bus dependencies, how to seed reference data
  from prior flows, and how to isolate the target service without running
  the entire platform. Required before Phase B of any Wave 1+ flow.
triggers:
  - "local dev environment"
  - "run the flow locally"
  - "services not running"
  - "how to test this service locally"
  - "event bus mock"
  - "upstream service mock"
  - "development setup for FLOW"
---

# Multi-Service Local Development Skill (SK-501)

## WHAT THIS SKILL PREVENTS

Spending a Phase B cycle discovering that the flow under development requires
FLOW-01's member records to exist before it can produce any valid output — and
those records don't exist in the local environment. Or discovering that the
event bus mock doesn't emit the upstream events the new service listens to.

---

## STEP 1 — MAP THE RUNTIME DEPENDENCIES

Before starting any local dev session for a new flow, answer:

```
1. What events does this flow CONSUME on startup?
   → These must be emitted by a running upstream service or a mock producer

2. What data does this flow READ at start?
   → These records must exist in Elasticsearch before the flow executes

3. What fabric interfaces does this flow USE?
   → These must have active providers (real or mock)

4. What events does this flow EMIT that other services consume?
   → Nothing to mock here — but verify the downstream service isn't running
      (to avoid triggering Wave 2 flows accidentally)
```

---

## STEP 2 — MINIMUM RUNNING SET

Determine the minimum services that must be running:

```
For FLOW-05 (Post Creation) development:

REQUIRED RUNNING:
  - API Gateway (accepts POST /content/post)
  - Elasticsearch (xiigen-community-members, xiigen-posts indices)
  - Redis Streams (local instance — for queue)

REQUIRED SEEDED DATA:
  - At least 1 member record with status=ACTIVE (from FLOW-01)
  - Feed index stub (xiigen-community-feed) — can be empty

REQUIRED MOCKS (event bus):
  - MemberActivated event producer (so FLOW-05 has a member to process)

NOT REQUIRED:
  - NLP Service (can be fabric mock)
  - Content Moderation Service (can be fabric mock)
  - FLOW-01 full stack (only the data it would have produced is needed)
```

---

## STEP 3 — SEED REFERENCE DATA

Produce the minimum seed data needed before the flow runs:

```bash
# Seed a member record that FLOW-01 would have created
curl -X POST localhost:9200/xiigen-community-members/_doc/member-test-001 \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "member-test-001",
    "email": "dev@test.com",
    "status": "ACTIVE",
    "profileType": "individual",
    "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Seed the feed index stub
curl -X PUT localhost:9200/xiigen-community-feed \
  -H "Content-Type: application/json" \
  -d '{"mappings":{"properties":{"postId":{"type":"keyword"},"memberId":{"type":"keyword"},"score":{"type":"float"}}}}'
```

---

## STEP 4 — MOCK EVENT PRODUCERS

For each upstream event the new flow consumes, create a mock producer:

```bash
# Mock: produce a PostCreated event as if FLOW-05 T_PostOrchestrator emitted it
# (for testing T_NLPAnalyzer which consumes PostCreated)
curl -X POST localhost:3000/api/test/emit-event \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: xiigen-community" \
  -d '{
    "type": "com.xiigen.community.PostCreated",
    "source": "/mock/FLOW-05/T_PostOrchestrator",
    "data": {
      "postId": "post-test-001",
      "authorId": "member-test-001",
      "content": "Test post for NLP analysis",
      "tenantId": "xiigen-community"
    },
    "tenantId": "xiigen-community",
    "traceId": "trace-local-test-001"
  }'
```

---

## STEP 5 — ISOLATE WITH FABRIC MOCKS

For services not needed in the current development session, use mock fabric providers
rather than real ones:

```typescript
// In test module for FLOW-05 T_NLPAnalyzer:
// Use mock providers for services not under test
providers: [
  { provide: FEED_SERVICE,         useValue: { insert: jest.fn().mockResolvedValue({ id: 'mock-feed-001' }) } },
  { provide: NOTIFICATION_SERVICE, useValue: { send: jest.fn().mockResolvedValue({ messageId: 'mock-msg-001' }) } },
  // Real provider for the service under test
  { provide: NLP_SERVICE,          useClass: OpenAINlpProvider },
]
```

---

## STEP 6 — TEARDOWN SCRIPT

Always clean up test data after a local dev session to prevent cross-session contamination:

```bash
# Remove test data created during session
curl -X DELETE "localhost:9200/xiigen-community-members/_doc/member-test-001"
curl -X DELETE "localhost:9200/xiigen-posts/_doc/post-test-001"

# Verify no test records remain
curl -sf "localhost:9200/xiigen-community-members/_count" \
  -d '{"query":{"term":{"email.keyword":"dev@test.com"}}}' | jq '.count'
# Expected: 0
```
