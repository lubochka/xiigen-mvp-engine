# FLOW-46 UI Spec — Phase 5 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `PlatformAgentPage.tsx` | `/admin/platform-agent/platform-agent` | `page-platform-agent` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | AgentRunOrchestrator — orchestration step entered via `POST /api/agent/run` | `PlatformAgentPage.tsx` | `page-platformagent` |
| 2 | TenantScopeGateway — governance step entered via `Inline — called by T650 / T654` | `PlatformAgentPage.tsx` | `page-platformagent` |
| 3 | PlatformContextEnricher — data_pipeline step entered via `Inline — between AF-4 and AF-5` | `PlatformAgentPage.tsx` | `page-platformagent` |
| 4 | SuperJudgeArbiter — validation step entered via `Inline — after AF-9 (CF-840 zero-cost pat… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 5 | AgentActionPublisher — transaction step entered via `AF-9 accepted output → branch by acti… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 6 | PatternContributor — data_pipeline step entered via `Super judge verdict + solution qualit… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 7 | AgentChatClient — routing step entered via `/chat page — user input box` | `PlatformAgentPage.tsx` | `page-platformagent` |
| 8 | AgentRunRequested → AgentRunOrchestrator when `` (emits `xiigen.platform-agent.run-request… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 9 | AgentRunOrchestrator → TenantScopeGateway when `cross-tenant read needed` (emits `xiigen.p… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 10 | AgentRunOrchestrator → PlatformContextEnricher when `between AF-4 and AF-5` (emits `xiigen… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 11 | AgentRunOrchestrator → SuperJudgeArbiter when `after AF-9` (emits `xiigen.platform-agent.s… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 12 | AgentRunOrchestrator → AgentActionPublisher when `AF-9 + super judge accepted` (emits `xii… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 13 | AgentRunOrchestrator → PatternContributor when `solution quality meets contribution thresh… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 14 | AgentActionPublisher → AgentActionRecorded when `` (emits `xiigen.platform-agent.action-pr… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 15 | PatternContributor → ContributionWritten when `Path A OR Path B Share` (emits `xiigen.plat… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 16 | PatternContributor → ConsentRequested when `Path B awaiting consent` (emits `xiigen.platfo… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 17 | AgentRunOrchestrator → AgentSessionCompleted when `terminal — all branches` (emits `xiigen… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 18 | AgentChatClient → AgentRunOrchestrator when `user sent userIntent` (emits `xiigen.platform… | `PlatformAgentPage.tsx` | `page-platformagent` |
| 19 | confirmationEvent → promoteDraft when `tenant approved PROPOSE_EDIT / CREATE_FLOW` (emits … | `PlatformAgentPage.tsx` | `page-platformagent` |
| 20 | rollbackEvent → deleteDraft when `tenant dismissed action` (emits ``) | `PlatformAgentPage.tsx` | `page-platformagent` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 20 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
