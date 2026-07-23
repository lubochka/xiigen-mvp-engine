# Flow UI examination — FLOW-46 platform-agent

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List + compound Grammar 6 Dashboard)

## One-sentence spec (from DESIGN-SIMULATION-R1.md goal)
> Design a super system engine assistant that has access to all tenant and
> community shared assets, is capable to change/edit any flow, has admin access
> to any tenant keys and tools, has the same node structure (several models +
> arbiters + super judge), communicates with the tenant through the chat
> interface, is able to use any skills from the skill library, manages its own
> flows visible only to itself and super admin, and enables the admin to see
> the super engine flows alongside any tenant's flows using the same visual
> design.

## Task types (F2 derived)
T650 AgentRunOrchestrator · T651 TenantScopeGateway · T652 PlatformContextEnricher · T653 SuperJudgeArbiter · T654 AgentActionPublisher · T655 PatternContributor · T656 AgentChatClient (7 nodes × 4 dimensions)

## Roles (F3 — `ROLE-ANALYSIS-BATCH-10.md`)
- **platform-admin** — primary; operates the super-engine agent
- **platform-support** — read-only
- **tenant-admin** — sees super-engine flows alongside tenant flows in same visual
- **tenant-user** — interacts via existing chat interface (inherited, not new)

## Grammar (compound)
- **G3 Card List** for agent-run log (recent runs with status badge)
- **G6 Dashboard** for metrics (runs/day, action distribution, judge verdict rate)
- **G4 Topology Canvas** embedded when viewing flows alongside tenant flows (reuses FLOW-29 pattern — per design-sim "same visual design")

## Reference
**Intercom / Zendesk agent console** (conversation + action history + metrics) + **Cursor / Claude Code terminal** (agent action log).

## Classification
- **Q1 CRUD?** 🟡 `PlatformAgentPage.tsx` likely AdminCrudPanel default. 34 existing PNGs suggest extensive mock coverage.
- **Q2 Error/empty?** Empty agent-run log with onboarding copy.
- **Q3 Engineering leak?** Task-type IDs (T650..T656), "SuperJudgeArbiter" must not appear.
- **Q4 Role-correct?** 4 roles, chat interface is inherited from FLOW-46 Phase B/C (ChatPage) — need to verify ChatPage handles agent vs plain chat.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — card list for agent runs + dashboard for metrics + topology canvas for flow alongside.

## 34 existing PNGs

Largest single-flow inventory. Needs dedicated examination sweep.

## Planned fixes
- **Agent runs list** at `/admin/platform-agent/runs`: card per run (timestamp / trigger / outcome badge / judge verdict / "Inspect" CTA)
- **Metrics dashboard** at `/admin/platform-agent`: tiles (runs today, action success rate, avg judge confidence) + 30-day chart
- **Flow-alongside viewer**: embed topology canvas rendering both tenant flow + super-engine-generated flow in same visual (reuses FLOW-29 ReactFlow pattern)
- **Chat interface**: already exists at `/chat` (FLOW-46 Phase B/C); verify agent-mode vs normal-tenant-chat branch
