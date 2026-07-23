# FLOW-46 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/platform-agent.topology.json`

**Topology shape:** 7 nodes, 13 edges. Minimum inventory items: 20.

## Business States & Transitions

1. AgentRunOrchestrator — orchestration step entered via `POST /api/agent/run`
2. TenantScopeGateway — governance step entered via `Inline — called by T650 / T654`
3. PlatformContextEnricher — data_pipeline step entered via `Inline — between AF-4 and AF-5`
4. SuperJudgeArbiter — validation step entered via `Inline — after AF-9 (CF-840 zero-cost path)`
5. AgentActionPublisher — transaction step entered via `AF-9 accepted output → branch by actionType`
6. PatternContributor — data_pipeline step entered via `Super judge verdict + solution quality ok → Path A/B`
7. AgentChatClient — routing step entered via `/chat page — user input box`
8. AgentRunRequested → AgentRunOrchestrator when `` (emits `xiigen.platform-agent.run-requested.v1`)
9. AgentRunOrchestrator → TenantScopeGateway when `cross-tenant read needed` (emits `xiigen.platform-agent.scope-switch-requested.v1`)
10. AgentRunOrchestrator → PlatformContextEnricher when `between AF-4 and AF-5` (emits `xiigen.platform-agent.enrich-context.v1`)
11. AgentRunOrchestrator → SuperJudgeArbiter when `after AF-9` (emits `xiigen.platform-agent.super-judge-invoked.v1`)
12. AgentRunOrchestrator → AgentActionPublisher when `AF-9 + super judge accepted` (emits `xiigen.platform-agent.action-dispatched.v1`)
13. AgentRunOrchestrator → PatternContributor when `solution quality meets contribution threshold` (emits `xiigen.platform-agent.contribute-requested.v1`)
14. AgentActionPublisher → AgentActionRecorded when `` (emits `xiigen.platform-agent.action-proposed.v1`)
15. PatternContributor → ContributionWritten when `Path A OR Path B Share` (emits `xiigen.platform-agent.contribution-recorded.v1`)
16. PatternContributor → ConsentRequested when `Path B awaiting consent` (emits `xiigen.platform-agent.consent-requested.v1`)
17. AgentRunOrchestrator → AgentSessionCompleted when `terminal — all branches` (emits `xiigen.platform-agent.session-completed.v1`) [TERMINAL]
18. AgentChatClient → AgentRunOrchestrator when `user sent userIntent` (emits `xiigen.platform-agent.chat-submit.v1`)
19. confirmationEvent → promoteDraft when `tenant approved PROPOSE_EDIT / CREATE_FLOW` (emits ``)
20. rollbackEvent → deleteDraft when `tenant dismissed action` (emits ``)

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 13+7=20):** PASS — 20 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
