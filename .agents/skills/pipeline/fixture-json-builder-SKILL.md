---
name: fixture-json-builder
sk_number: SK-439
version: "1.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Exact schema and rules for creating all 6 types of fixture JSON files
  that Phase A (INJECT) produces. Each type has required fields, validation
  rules, and common mistakes to avoid. Without this skill, seeding fails
  silently or produces fixtures the engine can't read.
triggers:
  - "create fixture"
  - "seed contract"
  - "t47.contract.json"
  - "flow-definitions"
  - "Phase A seeding"
  - "write fixture"
  - "author fixture"
---

# fixture-json-builder

## Purpose

Phase A's primary deliverable is fixture JSON files. The EngineBootstrapper
validates these against 5 schemas before writing to ES. Getting the format
wrong means Phase A gate fails before any generation runs.

This skill provides the exact field requirements for all 6 fixture types.

---

## When to Invoke

Auto-fire at the start of Phase A (INJECT) for any flow.
Invoke for each fixture type as it is authored.

---

## Type 1: Contract Fixtures (`fixtures/contracts/tNN.contract.json`)

**Location:** `server/fixtures/contracts/`
**One file per task type:** `t47.contract.json`, `t48.contract.json`, `t49.contract.json`

**Required fields:**
```json
{
  "taskTypeId": "T47",
  "taskName": "UserRegistrationInitiator",
  "flowId": "FLOW-01",
  "domainId": "user-registration",
  "archetype": "SERVICE",
  "version": "1.0.0",
  "entry": { "event": "RegistrationRequested", "source": "client" },
  "exit":  { "event": "UserRegistrationInitiated", "emittedBy": "T47" },
  "serviceFileName": "user-registration-initiator.service.ts",
  "className": "UserRegistrationInitiatorService",
  "factoryDependencies": [
    {
      "factoryId": "F174",
      "interfaceName": "IAuthenticationService",
      "fabric": "DATABASE",
      "provider": "ElasticsearchProvider"
    }
  ],
  "ironRules": [
    { "id": "IR-1", "rule": "...", "violation": "what happens if violated" }
  ],
  "qualityGates": [
    { "id": "QG-01", "gate": "dna_compliance", "weight": 0.3, "threshold": 1.0 }
  ],
  "arbiters": ["routing::auth-security", "processing::rate-limit"],
  "handlers": [
    {
      "name": "register",
      "description": "validate payload, check SETNX idempotency, check rate limit",
      "ironRuleRefs": ["IR-2","IR-6"],
      "isPublic": true,
      "returnType": "DataProcessResult<RegistrationResult>"
    }
  ],
  "gateEvent": null,
  "machineFreedom": {
    "machine": ["idempotency key format", "event payload structure"],
    "freedom": ["rate limit threshold", "token TTL hours"]
  },
  "stackCoupling": "CONCEPT_NEUTRAL",
  "bfaRules": ["CF-1", "CF-2"]
}
```

**gateEvent field (ORCHESTRATION archetype only):**
```json
"gateEvent": {
  "event": "OnboardingCompleted",
  "unlocksFlows": ["FLOW-02", "FLOW-03"],
  "bfaRule": "CF-4",
  "payload": { "userId": "string", "profileScore": "number" },
  "payloadMustNotContain": ["email", "password", "name"]
}
```

**Validation rules:**
- Every `ironRuleRefs` ID in `handlers[]` must exist in `ironRules[]`
- Every arbiter string must match a document in `xiigen-arbiters` index
- `serviceFileName` must follow kebab-case: `{domain}-{capability}.service.ts` — no task type ID prefix
- `archetype` must be one of: SERVICE, ORCHESTRATION, ROUTING, WAIT_STATE, GATE_EVENT, ENUMERATION_PREVENTION

---

## Type 2: Prompt Fixtures (`fixtures/prompts/flow-NN/tNN-{role}-v{version}.json`)

**Location:** `server/fixtures/prompts/flow-01/`
**4 per task type:** genesis, review, compliance, judge

**Required fields:**
```json
{
  "promptId": "T47-genesis-v1.1.0",
  "domainId": "user-registration",
  "taskType": "T47",
  "role": "genesis",
  "version": "1.1.0",
  "tenantId": "",
  "connectionType": "FLOW_SCOPED",
  "isDefault": true,
  "isActive": true,
  "content": "...",
  "createdAt": "2026-03-23T00:00:00Z",
  "updatedAt": "2026-03-23T00:00:00Z"
}
```

**Genesis prompt `content` structure (mandatory sections):**
```
Section 1 — Iron Rules (one per rule, with POSITIVE and NEGATIVE EXAMPLE):
  Rule IR-N: [rule statement]
  POSITIVE EXAMPLE (score-1):
    [code that correctly implements the rule]
  NEGATIVE EXAMPLE (score-0):
    [code that violates the rule] // ← WRONG: [why]
    CORRECT: [what to do instead]

Section 2 — Architecture Constraints:
  [DNA patterns, fabric interfaces to use]

Section 3 — Method Structure:
  [method names from contract.handlers[]]

Section 4 — Implementation:
  [stack-specific generation frame, from **hybrid-prompt-builder**]
```

**Validation rules:**
- Every iron rule in the contract MUST have a POSITIVE EXAMPLE and NEGATIVE EXAMPLE in content
- No `.service.ts` file creation instruction in content (genesis is AF-1 INPUT, not Claude Code instruction)
- No hardcoded values in POSITIVE EXAMPLE that should be FREEDOM config
- version format: `{major}.{minor}.{patch}` — bump minor for prompt patches

---

## Type 3: RAG Pattern Fixtures (`fixtures/rag-patterns/flow-NN/`)

**Naming:** `{business-capability}--{specific-pattern}.{document-type}.json`
**Document types:** `.service.json`, `.conflict.json`, `.decision.json`, `.orchestration.json`, `.plan.json`, `.dependency.json`

**Required fields:**
```json
{
  "patternId": "F174-IAuthenticationService-sso-registration",
  "domainId": "user-registration",
  "patternType": "SERVICE_PATTERN",
  "factoryId": "F174",
  "interfaceName": "IAuthenticationService",
  "fabric": "DATABASE",
  "fabricProvider": "ElasticsearchProvider",
  "archetype": "SERVICE",
  "taskTypeRefs": ["T47"],
  "flowRef": "FLOW-01",
  "what_this_solves": "One paragraph: what business problem this solves",
  "service_behavior": "One paragraph: what the service does",
  "key_patterns": {
    "pattern_name": "description of the pattern and why it matters"
  },
  "codeSnippet": "// Minimal code example showing the key DNA patterns",
  "ironRules": ["IR-2", "IR-6"],
  "qualityScore": 0.0,
  "qualityScoreHistory": [],
  "tags": ["registration", "sso", "idempotency", "rate-limiting"],
  "keywords": ["setnx", "tenant-scoped", "duplicate-detection"],
  "when_to_reuse_this_pattern": ["list", "of", "reuse", "contexts"],
  "createdAt": "2026-03-23T00:00:00Z"
}
```

**Validation rules:**
- `tags` must match the terms AF-4 (rag-retrieve) will use to search for this pattern
- `codeSnippet` must demonstrate DNA compliance (no imports of SDK directly, DataProcessResult returns)
- `patternType` must be one of: SERVICE_PATTERN, BFA_RULE, DESIGN_RECORD, TASK_CONTRACT, FLOW_PLAN_EXEMPLAR, ORCHESTRATION_PATTERN, CROSS_FLOW_DEPENDENCY, TEST_SCENARIO
- Every factory in the flow's F-range must have at least one RAG pattern

---

## Type 4: Flow Topology Fixtures (`fixtures/flow-definitions/flow-NN-tNN.flow.json`)

**Location:** `server/fixtures/flow-definitions/`
**Standard 8-node topology:**

```json
{
  "topologyId": "FLOW-01-T47",
  "flowId": "FLOW-01",
  "taskTypeId": "T47",
  "version": "1.0.0",
  "nodes": [
    { "id": "n1", "node_type": "rag-retrieve", "label": "retrieve genesis prompt",
      "config": { "namespace": "xiigen-prompts", "filter": { "taskType": "T47", "role": "genesis" } } },
    { "id": "n2", "node_type": "rag-retrieve", "label": "retrieve RAG patterns",
      "config": { "namespace": "xiigen-rag-patterns", "filter": { "taskTypeRefs": "T47" }, "topK": 5 } },
    { "id": "n3", "node_type": "decompose", "label": "decompose into methods",
      "config": { "method_source": "contract.handlers" } },
    { "id": "n4", "node_type": "ai-generate", "label": "generate service code",
      "config": { "modelHint": "claude-sonnet-4-6", "max_tokens": 6000, "template": "service" } },
    { "id": "n5", "node_type": "validate", "label": "validate DNA compliance",
      "config": { "ruleset": "dna-9" } },
    { "id": "n6", "node_type": "validate", "label": "validate iron rules + arbiters",
      "config": { "ruleset": "iron-rules+arbiters", "taskTypeId": "T47" } },
    { "id": "n7", "node_type": "score", "label": "score output",
      "config": { "taskTypeId": "T47", "promotionThreshold": 0.85 } },
    { "id": "n8", "node_type": "feedback", "label": "capture DPO + metrics",
      "config": { "taskTypeId": "T47", "flowId": "FLOW-01" } }
  ],
  "edges": [
    ["n1","n3"], ["n2","n3"], ["n3","n4"], ["n4","n5"], ["n5","n6"],
    ["n6","n7"], ["n7","n8"]
  ],
  "retry_policy": {
    "trigger": "n7.score_result.score < 0.70",
    "reroute_from": "n4",
    "max_retries": 2,
    "action_on_hold": "checkpoint_report"
  },
  "promotion_policy": {
    "promote_to": "INJECTED",
    "requires_score": 0.85,
    "requires_dna_pass": true
  }
}
```

**WAIT_STATE archetype — n3 config override:**
```json
{ "method_source": "wait-state-handlers",
  "required_handlers": ["issueToken", "verifyToken", "resendToken", "expireToken", "changeEmail"] }
```

**ORCHESTRATION with gate event — n7 config addition:**
```json
{ "taskTypeId": "T49", "promotionThreshold": 0.85,
  "gateEventQualityGate": { "check": "completedSteps_guard_before_emit", "weight": 0.15 } }
```

---

## Type 5: Arbiter Fixtures (`fixtures/arbiters/flow-NN-arbiters.json`)

**One document per arbiter.**

```json
{
  "arbiterId": "FLOW-01-routing-auth-security-001",
  "flowId": "FLOW-01",
  "taskTypes": ["T47"],
  "rule": "Registration endpoint must have rate limiting before any business logic",
  "check": "throttle_decorator_present",
  "checkTarget": "generated_code",
  "severity": "score-0",
  "description": "T47 registration handler must have @Throttle() decorator or explicit rate limit check"
}
```

**Named check IDs (must exist in validate.handler NAMED_CHECKS registry):**
```
throttle_decorator_present
completedSteps_guard_before_emit
delayed_job_scheduled
try_catch_around_f178_call
property_type_scan
event_listener_order
```

**Severity values:**
- `score-0` — the component containing this arbiter scores 0 regardless of other checks
- `BUILD_FAILURE` — same effect as score-0 but flagged separately in trace
- `warning` — score reduced but not zeroed

**Validation rule:** Every `check` value must have a matching entry in
`validate.handler.ts` NAMED_CHECKS registry. If the check doesn't exist there:
that is **GAP-01** — add it before Phase A gate can pass.

---

## Type 6: Event Schema Fixtures (`fixtures/event-schemas/flow-NN/`)

**Naming:** `{EventName}.schema.json`

**Required fields (Mode C CloudEvents):**
```json
{
  "eventType": "UserRegistrationInitiated",
  "flowId": "FLOW-01",
  "source": "T47",
  "description": "Emitted when a new user registration is accepted and persisted",
  "required": ["eventType", "flowId", "correlationId", "tenantId", "timestamp", "source", "traceparent", "data"],
  "properties": {
    "correlationId": { "type": "string", "description": "opaque registration ID" },
    "tenantId": { "type": "string" },
    "timestamp": { "type": "string", "format": "date-time" },
    "source": { "type": "string", "const": "T47" },
    "traceparent": { "type": "string" },
    "data": {
      "type": "object",
      "description": "MUST NOT contain PII",
      "properties": {
        "registrationId": { "type": "string" }
      },
      "additionalProperties": false
    }
  },
  "piiCheck": "PASS — no email/password/name/phone in data"
}
```

**Client event additions:**
```json
"sessionId": { "type": "string" },
"clientTimestamp": { "type": "string", "format": "date-time" }
```

**Validation rules:**
- `data` must NOT contain: email, password, name, phone, firstName, lastName
- `source` must be the task type ID that emits this event, or "client" for client events
- Every event referenced in any task type's iron rules must have a schema file

---

## Common Mistakes (Do Not Make These)

| Mistake | Detection | Fix |
|---------|-----------|-----|
| Service file named `t47-user-registration.service.ts` | Phase D lint gate fails | Use `user-registration-initiator.service.ts` — no task type prefix |
| Genesis prompt says "write a service that..." | Wrong — AF-1 input, not Claude Code instruction | Reframe as code generation instructions for AI |
| Arbiter `check` value not in NAMED_CHECKS | validate.handler silently skips it | Add named check implementation first (GAP-01) |
| Iron rule in `handlers[].ironRuleRefs` not in `ironRules[]` | EngineBootstrapper validation fails | Iron rule IDs must match exactly |
| Genesis prompt has no NEGATIVE EXAMPLE | Score < 0.85 on first cycle | Every iron rule needs both examples |
| `gateEvent` present on SERVICE archetype | EngineBootstrapper schema validation fails | gateEvent is ORCHESTRATION only |
