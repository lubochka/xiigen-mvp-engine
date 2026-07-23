---
name: xiigen-core-principles-skill
version: "3.0.0"
description: >
  The 11 non-negotiable architectural principles every XIIGen plan, flow, and
  code modification must satisfy. P1–P8 established after FLOW-33. P9–P10
  established in the Mode C / Client Architecture session (2026-03-20).
  P11 Stack Coupling Awareness established in FLOW-00.2 (2026-03-22).
  Any plan that violates any principle is REJECTED regardless of FC checks.
author: luba
updated: "2026-03-22"
priority: SUPREME
triggers:
  - "plan a new flow"
  - "design a new feature"
  - "new task type"
  - "architecture decision"
  - "plan review"
---

# XIIGen Core Principles v3.0
## 11 Non-Negotiable Requirements for Every Plan

> P1–P8 established after FLOW-25–33.
> P9–P10 established in Mode C / Client Architecture session (2026-03-20).
> P11 established in FLOW-00.2 Stack Coupling Base (2026-03-22).
> All 11 must have explicit design answers. "TBD" = plan is INCOMPLETE.

**Authoritative source: DECISIONS-LOCKED.md**

---

## PRINCIPLE 1 — Multi-Tenant by Default

Every entity, query, event, config, RAG index, prompt store, local model,
and background job is tenant-scoped from day one.

**Plan must show:**
```
□ tenantId on every new entity, index, cache key, event
□ Multi-tenant isolation test (tenant A cannot see tenant B)
□ RAG retrieval filtered by tenantId
□ Quota and rate-limit strategy per tenant
```

---

## PRINCIPLE 2 — Configs in Safe Environments

No secret or credential lives in code or git. All tenant-specific values
live in the FREEDOM layer, resolved via ISecretsService.

**Plan must show:**
```
□ ISecretsService for all credentials
□ FREEDOM config for all tenant-configurable values
□ No hardcoded limits, thresholds, or keys
```

---

## PRINCIPLE 3 — Always Improve Prompts

Every genesis prompt has a versioning lifecycle. AF-9 judges quality.
Feedback produces PromptPatches.

**Plan must show:**
```
□ PromptAsset version declared
□ AF-9 quality gate in generation loop
□ DPO triple export on ACCEPT
```

---

## PRINCIPLE 4 — RAG Is Always Dual: Global + Local

Two RAG tiers. Global: ES-backed shared patterns. Local: docker-backed
per-tenant patterns. Both must be designed.

**Plan must show:**
```
□ Global RAG tier usage (cross-flow patterns)
□ Local RAG tier usage (tenant-specific patterns)
□ Both layers in docker-compose test environment
```

---

## PRINCIPLE 5 — Always Improve (Self-Learning Loop)

Every generation run captures 6 metrics. Every flow contributes to the
improvement cycle.

**Plan must show:**
```
□ 6 metrics captured per run: quality, cost, latency, retry_count, dpo_triples, model_used
□ Improvement cycle defined (how feedback re-enters the system)
```

---

## PRINCIPLE 6 — Plan and Arbitrate Every Decision Node

Every task type has 5 arbiters. No arbiter is optional.

**Plan must show:**
```
□ 5 arbiters configured per new T-XXX
□ Arbiter replay test in Phase A gate
□ BFA rules seeded and validated
```

---

## PRINCIPLE 7 — Test Everything Locally

All 4 test layers pass with zero cloud credentials.

**Plan must show:**
```
□ Unit, integration, e2e, and multi-tenant isolation tests
□ docker-compose covers all dependencies
□ No cloud SDK calls in test suite
```

---

## PRINCIPLE 8 — Open Source Local Model: Learn, Save, Reuse

Local model endpoint via FREEDOM config. Training capture on every run.
Per-tenant isolation.

**Plan must show:**
```
□ FREEDOM config key for local model endpoint
□ Training capture on ACCEPT decisions
□ Per-tenant model isolation
```

---

## PRINCIPLE 9 — Mode C Event-First Architecture

All inter-service communication via QUEUE FABRIC. No direct HTTP calls
between services. Events have contracts in contracts/events/FLOW-XX/.

**Plan must show:**
```
□ Event contracts in contracts/events/FLOW-XX/
□ All CONSUMES reference QUEUE FABRIC events (no HTTP)
□ No PII in any event payload
□ correlationId, tenantId, timestamp, source in every schema required[]
```

---

## PRINCIPLE 10 — Client-Side Architecture

Every user-facing flow has a complete client state model: optimistic
contracts, app reopen behavior, offline queue, background signals.

**Plan must show:**
```
□ Client state map per DAG node (screen, actions, appReopenBehavior)
□ FlowStateSnapshot endpoint defined
□ offlineQueue.queueable[] and notQueueable[] with reasons
□ backgroundSteps[] and signal types
□ requiresDraftState declared
□ Client integration tests (C1–C5) in Phase E gate
```

---

## PRINCIPLE 11 — Stack Coupling Awareness (NEW — 2026-03-22)

Every flow plan must declare, for every task type and client node, exactly
what is stack-neutral and what requires stack-specific implementation.
A plan that assumes one stack without declaring it is INCOMPLETE.

**Plan must show:**
```
□ stackTargets declared in STATE.json (min: ['node-nestjs'])
□ clientTargets declared in STATE.json (min: ['react-web'])

□ All genesis prompts in HybridGenesisPrompt format (D-STACK-2):
    Section 1 neutralIronRules[]: no framework names, no stack syntax
    Section 4 stackImplementations: per StackKey generation frames

□ stackCoupling annotation on all task types (V29):
    entries map with 'node-nestjs:server' as minimum
    tier: CONCEPT_NEUTRAL | IMPL_VARIES | STACK_COUPLED
    neutralConcepts[]: non-empty, framework-neutral language only

□ All ⛔ INCOMPATIBLE stacks flagged before implementation (V30):
    incompatibleReason present
    mitigation present (alternative stack or workaround)

□ Client nodes with reactive state have stateNotes per framework (V31):
    stateHolderType: framework-specific term (e.g. "BehaviorSubject", "useState", "StateFlow")
    stateScope: 'feature-scoped' | 'root-scoped'
    propagationRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    routeGuardRequired: boolean
```

**The two questions for P11:**
1. "If a Python developer picks up this plan, can they implement the server
   without reading any other document?"
2. "If an Angular developer picks up this plan, do they know the stateHolderType,
   stateScope, and propagationRisk for every node with reactive state?"

**Priority stacks (D-STACK-3):** `node-nestjs` server, `react-web` client.
Full IMPL_VARIES annotation for these. Other stacks: INCOMPATIBLE flags
where structural constraints exist; stubs otherwise.

**Red flags — P11 violations:**
```
✗ "Generate a NestJS service..." in a genesis prompt Section 1
✗ Framework name (NestJS, Laravel, FastAPI) in neutralIronRules[]
✗ stackTargets / clientTargets absent from STATE.json
✗ stackCoupling absent on any task type introduced by this flow
✗ INCOMPATIBLE stack not flagged before implementation begins
✗ Client node with optimisticActions but no stateNotes in topology
✗ T48-equivalent (long-running scheduled task) targeting WordPress without ⛔ flag
```

---

## Quick Reference — P11 by Element Type

| Element | What P11 requires |
|---------|------------------|
| EngineContractParams | stackCoupling with entries map |
| Genesis prompt | HybridGenesisPrompt 4-section format |
| topology.json node | stackCoupling with stateNotes if reactive |
| STATE.json | flow_name, stackTargets, clientTargets |
| Jira comment (SK-429) | 5-section format: business purpose, flow context, delivery, arch fit |
| Service file names | {verb}-{domain-noun}.service.ts (SK-430 Rule 1) |
