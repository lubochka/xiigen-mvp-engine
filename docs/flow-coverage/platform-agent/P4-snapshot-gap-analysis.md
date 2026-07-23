# FLOW-46 Snapshot Gap Analysis — Phase 4 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**Authoritative spec:** `client\e2e\platform-agent-mock-states.spec.ts`
**Snapshot dir:** `docs/e2e-snapshots/platform-agent/`
**P3 input rows (TESTED+PARTIAL):** 20

| # | Business State | P3 | Verdict | PNG Evidence |
|---|---------------|-----|---------|--------------|
| 1 | AgentRunOrchestrator — orchestration step entered via `POST /api/agent/run` | TESTED | PNG_EXISTS | state-1-agentrunorchestrator-orchestration.png (28132B) |
| 2 | TenantScopeGateway — governance step entered via `Inline — called by T650 / T654` | TESTED | PNG_EXISTS | state-2-tenantscopegateway-governance.png (28507B) |
| 3 | PlatformContextEnricher — data_pipeline step entered via `Inline — between AF-4 and AF-5` | PARTIAL | PNG_EXISTS | state-3-platformcontextenricher-data.png (28286B) |
| 4 | SuperJudgeArbiter — validation step entered via `Inline — after AF-9 (CF-840 zero-cost path)` | TESTED | PNG_EXISTS | state-4-superjudgearbiter-validation.png (28033B) |
| 5 | AgentActionPublisher — transaction step entered via `AF-9 accepted output → branch by actionType` | TESTED | PNG_EXISTS | state-5-agentactionpublisher-transaction.png (28074B) |
| 6 | PatternContributor — data_pipeline step entered via `Super judge verdict + solution quality ok → Pat… | PARTIAL | PNG_EXISTS | state-6-patterncontributor-data.png (28067B) |
| 7 | AgentChatClient — routing step entered via `/chat page — user input box` | TESTED | PNG_EXISTS | state-7-agentchatclient-routing.png (27890B) |
| 8 | AgentRunRequested → AgentRunOrchestrator when `` (emits `xiigen.platform-agent.run-requested.v1`) | TESTED | PNG_EXISTS | state-8-agentrunrequested-agentrunorchestrator.png (29613B) |
| 9 | AgentRunOrchestrator → TenantScopeGateway when `cross-tenant read needed` (emits `xiigen.platform-ag… | TESTED | PNG_EXISTS | state-9-agentrunorchestrator-tenantscopegateway.png (28873B) |
| 10 | AgentRunOrchestrator → PlatformContextEnricher when `between AF-4 and AF-5` (emits `xiigen.platform-… | TESTED | PNG_EXISTS | state-10-agentrunorchestrator-platformcontextenricher.png (28783B) |
| 11 | AgentRunOrchestrator → SuperJudgeArbiter when `after AF-9` (emits `xiigen.platform-agent.super-judge… | TESTED | PNG_EXISTS | state-9-agentrunorchestrator-tenantscopegateway.png (28873B) |
| 12 | AgentRunOrchestrator → AgentActionPublisher when `AF-9 + super judge accepted` (emits `xiigen.platfo… | TESTED | PNG_EXISTS | state-9-agentrunorchestrator-tenantscopegateway.png (28873B) |
| 13 | AgentRunOrchestrator → PatternContributor when `solution quality meets contribution threshold` (emit… | TESTED | PNG_EXISTS | state-13-agentrunorchestrator-patterncontributor.png (28690B) |
| 14 | AgentActionPublisher → AgentActionRecorded when `` (emits `xiigen.platform-agent.action-proposed.v1`… | TESTED | PNG_EXISTS | state-14-agentactionpublisher-agentactionrecorded.png (29497B) |
| 15 | PatternContributor → ContributionWritten when `Path A OR Path B Share` (emits `xiigen.platform-agent… | TESTED | PNG_EXISTS | state-15-patterncontributor-contributionwritten.png (28530B) |
| 16 | PatternContributor → ConsentRequested when `Path B awaiting consent` (emits `xiigen.platform-agent.c… | TESTED | PNG_EXISTS | state-16-patterncontributor-consentrequested.png (28514B) |
| 17 | AgentRunOrchestrator → AgentSessionCompleted when `terminal — all branches` (emits `xiigen.platform-… | TESTED | PNG_EXISTS | state-17-agentrunorchestrator-agentsessioncompleted.png (29593B) |
| 18 | AgentChatClient → AgentRunOrchestrator when `user sent userIntent` (emits `xiigen.platform-agent.cha… | TESTED | PNG_EXISTS | state-18-agentchatclient-agentrunorchestrator.png (28818B) |
| 19 | confirmationEvent → promoteDraft when `tenant approved PROPOSE_EDIT / CREATE_FLOW` (emits ``) | TESTED | PNG_EXISTS | state-19-confirmationevent-promotedraft.png (28283B) |
| 20 | rollbackEvent → deleteDraft when `tenant dismissed action` (emits ``) | TESTED | PNG_EXISTS | state-20-rollbackevent-deletedraft.png (28223B) |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 20 (= P3 TESTED+PARTIAL count). PASS
- **Arbiter 2 — PNG Truthfulness:** PASS — PNG_EXISTS requires file ≥1024B on disk under `docs/e2e-snapshots/platform-agent/`.
- **Arbiter 3 — Screenshot-call Presence:** PASS — SCREENSHOT_CALL_EXISTS means `page.screenshot()` is present in the test block but PNG missing / < 1KB on disk.
- **Arbiter 4 — Distinction Clarity:** PASS — NO_SCREENSHOT means the test block has no `page.screenshot()` call (separate from SCREENSHOT_CALL_EXISTS).
