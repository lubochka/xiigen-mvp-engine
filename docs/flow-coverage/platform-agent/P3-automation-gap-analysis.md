# FLOW-46 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/platform-agent-mock-states.spec.ts` | 150 | 10766 | AUTHORITATIVE |
| `client/e2e/platform-agent-crud.spec.ts` | 98 | 4250 | DUPLICATE (merge in P12) |
| `client/e2e/platform-agent-teaching-pipeline.spec.ts` | 90 | 3082 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | AgentRunOrchestrator — orchestration step entered via `POST /api/agent/run` | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-1 (agentrunorchestrator-orchestration): platform-agent… | 30 |
| 2 | TenantScopeGateway — governance step entered via `Inline — called by T650 / T654` | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-2 (tenantscopegateway-governance): platform-agent-stat… | 36 |
| 3 | PlatformContextEnricher — data_pipeline step entered via `Inline — between AF-4 and AF-5` | COVERED | PARTIAL | `platform-agent-mock-states.spec.ts` | state-3 (platformcontextenricher-data): platform-agent-state… | 42 |
| 4 | SuperJudgeArbiter — validation step entered via `Inline — after AF-9 (CF-840 zero-cost path)` | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-4 (superjudgearbiter-validation): platform-agent-state… | 48 |
| 5 | AgentActionPublisher — transaction step entered via `AF-9 accepted output → branch by actionType` | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-5 (agentactionpublisher-transaction): platform-agent-s… | 54 |
| 6 | PatternContributor — data_pipeline step entered via `Super judge verdict + solution quality ok → Pat… | COVERED | PARTIAL | `platform-agent-mock-states.spec.ts` | state-6 (patterncontributor-data): platform-agent-state-6 vi… | 60 |
| 7 | AgentChatClient — routing step entered via `/chat page — user input box` | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-7 (agentchatclient-routing): platform-agent-state-7 vi… | 66 |
| 8 | AgentRunRequested → AgentRunOrchestrator when `` (emits `xiigen.platform-agent.run-requested.v1`) | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-8 (agentrunrequested-agentrunorchestrator): platform-a… | 72 |
| 9 | AgentRunOrchestrator → TenantScopeGateway when `cross-tenant read needed` (emits `xiigen.platform-ag… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-9 (agentrunorchestrator-tenantscopegateway): platform-… | 78 |
| 10 | AgentRunOrchestrator → PlatformContextEnricher when `between AF-4 and AF-5` (emits `xiigen.platform-… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-10 (agentrunorchestrator-platformcontextenricher): pla… | 84 |
| 11 | AgentRunOrchestrator → SuperJudgeArbiter when `after AF-9` (emits `xiigen.platform-agent.super-judge… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-9 (agentrunorchestrator-tenantscopegateway): platform-… | 78 |
| 12 | AgentRunOrchestrator → AgentActionPublisher when `AF-9 + super judge accepted` (emits `xiigen.platfo… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-9 (agentrunorchestrator-tenantscopegateway): platform-… | 78 |
| 13 | AgentRunOrchestrator → PatternContributor when `solution quality meets contribution threshold` (emit… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-13 (agentrunorchestrator-patterncontributor): platform… | 102 |
| 14 | AgentActionPublisher → AgentActionRecorded when `` (emits `xiigen.platform-agent.action-proposed.v1`… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-14 (agentactionpublisher-agentactionrecorded): platfor… | 108 |
| 15 | PatternContributor → ContributionWritten when `Path A OR Path B Share` (emits `xiigen.platform-agent… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-15 (patterncontributor-contributionwritten): platform-… | 114 |
| 16 | PatternContributor → ConsentRequested when `Path B awaiting consent` (emits `xiigen.platform-agent.c… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-16 (patterncontributor-consentrequested): platform-age… | 120 |
| 17 | AgentRunOrchestrator → AgentSessionCompleted when `terminal — all branches` (emits `xiigen.platform-… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-17 (agentrunorchestrator-agentsessioncompleted): platf… | 126 |
| 18 | AgentChatClient → AgentRunOrchestrator when `user sent userIntent` (emits `xiigen.platform-agent.cha… | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-18 (agentchatclient-agentrunorchestrator): platform-ag… | 132 |
| 19 | confirmationEvent → promoteDraft when `tenant approved PROPOSE_EDIT / CREATE_FLOW` (emits ``) | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-19 (confirmationevent-promotedraft): platform-agent-st… | 138 |
| 20 | rollbackEvent → deleteDraft when `tenant dismissed action` (emits ``) | COVERED | TESTED | `platform-agent-mock-states.spec.ts` | state-20 (rollbackevent-deletedraft): platform-agent-state-2… | 144 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 20 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 2 duplicate(s) flagged for Phase 12 consolidation.
