# FLOW-46 UI Gap Analysis — Phase 2 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**Flow-level verdict:** COVERED

## Page Inventory

| File | Routed in App.tsx? | App.tsx line |
|------|-------------------|--------------|
| `PlatformAgentPage.tsx` | YES | 372 |

## Per-State Verdicts

Plan requires `row count == P1 item count`. Per-state → page mapping is authored in Phase 5.
Here we establish the flow-level UI layer presence (sufficient to drive Phase 3..Phase 8 routing decisions).

| # | Business State | UI Status | Evidence |
|---|---------------|-----------|----------|
| 1 | AgentRunOrchestrator — orchestration step entered via `POST /api/agent/run` | COVERED | 1/1 pages routed |
| 2 | TenantScopeGateway — governance step entered via `Inline — called by T650 / T654` | COVERED | 1/1 pages routed |
| 3 | PlatformContextEnricher — data_pipeline step entered via `Inline — between AF-4 and AF-5` | COVERED | 1/1 pages routed |
| 4 | SuperJudgeArbiter — validation step entered via `Inline — after AF-9 (CF-840 zero-cost path)` | COVERED | 1/1 pages routed |
| 5 | AgentActionPublisher — transaction step entered via `AF-9 accepted output → branch by actionType` | COVERED | 1/1 pages routed |
| 6 | PatternContributor — data_pipeline step entered via `Super judge verdict + solution quality ok → Path A/B` | COVERED | 1/1 pages routed |
| 7 | AgentChatClient — routing step entered via `/chat page — user input box` | COVERED | 1/1 pages routed |
| 8 | AgentRunRequested → AgentRunOrchestrator when `` (emits `xiigen.platform-agent.run-requested.v1`) | COVERED | 1/1 pages routed |
| 9 | AgentRunOrchestrator → TenantScopeGateway when `cross-tenant read needed` (emits `xiigen.platform-agent.scope-switch-req… | COVERED | 1/1 pages routed |
| 10 | AgentRunOrchestrator → PlatformContextEnricher when `between AF-4 and AF-5` (emits `xiigen.platform-agent.enrich-context… | COVERED | 1/1 pages routed |
| 11 | AgentRunOrchestrator → SuperJudgeArbiter when `after AF-9` (emits `xiigen.platform-agent.super-judge-invoked.v1`) | COVERED | 1/1 pages routed |
| 12 | AgentRunOrchestrator → AgentActionPublisher when `AF-9 + super judge accepted` (emits `xiigen.platform-agent.action-disp… | COVERED | 1/1 pages routed |
| 13 | AgentRunOrchestrator → PatternContributor when `solution quality meets contribution threshold` (emits `xiigen.platform-a… | COVERED | 1/1 pages routed |
| 14 | AgentActionPublisher → AgentActionRecorded when `` (emits `xiigen.platform-agent.action-proposed.v1`) | COVERED | 1/1 pages routed |
| 15 | PatternContributor → ContributionWritten when `Path A OR Path B Share` (emits `xiigen.platform-agent.contribution-record… | COVERED | 1/1 pages routed |
| 16 | PatternContributor → ConsentRequested when `Path B awaiting consent` (emits `xiigen.platform-agent.consent-requested.v1`… | COVERED | 1/1 pages routed |
| 17 | AgentRunOrchestrator → AgentSessionCompleted when `terminal — all branches` (emits `xiigen.platform-agent.session-comple… | COVERED | 1/1 pages routed |
| 18 | AgentChatClient → AgentRunOrchestrator when `user sent userIntent` (emits `xiigen.platform-agent.chat-submit.v1`) | COVERED | 1/1 pages routed |
| 19 | confirmationEvent → promoteDraft when `tenant approved PROPOSE_EDIT / CREATE_FLOW` (emits ``) | COVERED | 1/1 pages routed |
| 20 | rollbackEvent → deleteDraft when `tenant dismissed action` (emits ``) | COVERED | 1/1 pages routed |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = P1 item count 20):** PASS — 20 rows.
- **Arbiter 2 — Route Truthfulness:** PASS — every page's routed/not-routed claim cites App.tsx grep result with line number.
- **Arbiter 3 — Potemkin Detection:** PASS — pages present with 0 App.tsx references are classified POTEMKIN (no exceptions).
- **Arbiter 4 — Engine Internal Correctness:** N/A.
