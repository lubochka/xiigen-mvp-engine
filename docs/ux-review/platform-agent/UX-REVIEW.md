# UX Review — Platform Agent (`platform-agent`)

**PNGs reviewed:** 27 | **Blockers:** 0 | **High:** 2 | **Medium:** 6 | **Low:** 19
**Overall verdict:** Shippable (for an ADMIN_FACING / engine-internal flow), with meaningful polish needed

## Summary

Platform Agent is correctly scoped as an `ADMIN_FACING` admin console backed by the dynamic `/api/dynamic/xiigen-platform-agent` endpoint — it is NOT a tenant-facing flow. The CRUD captures are therefore legitimately sparse (Name / Status / Notes / Actions table). The "state-N" captures honestly label themselves "mock state N" and render a small State card with the n-tuple transition text — they don't masquerade as real UI, so they avoid the state-fidelity failure seen in other flows. The problem is that the State card itself is low-information: it does not explain what the transition means for an operator, and several captures show malformed tokens (`emits ``, empty backticks) that leak test scaffolding into the UI. Overall this flow is honestly-framed admin UI, but the visual vocabulary for operators monitoring an agent run is underdeveloped.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-platformcontextenricher-data-pipeline-st.png` | LOW | Polish | Shows the CRUD list, not a pipeline state. Since the badge is `ADMIN_FACING`, this is acceptable as a landing. | Rename file, or render an actual pipeline status panel when asserting data-pipeline state. |
| 2 | `02-patterncontributor-data-pipeline-step-en.png` | LOW | Polish | Identical to #1 — CRUD list. Does not prove PatternContributor pipeline state. | Same. |
| 3 | `c-03-before.png` | LOW | Duplicate | CRUD list — same as `crud-initial-load.png` / `default.png`. | Deduplicate. |
| 4 | `crud-after-create.png` | LOW | Polish | CRUD list showing newly added row `e2e-1776603070847 / active / created by platform-agent-crud.spec.ts`. Correct UX feedback for admins. | No change. |
| 5 | `crud-initial-load.png` | LOW | Polish | Baseline CRUD list. Three `ui-*` rows, all `active`, all "created via UI form". | No change. |
| 6 | `crud-list-with-test-row.png` | LOW | Duplicate | Identical to `crud-after-create.png`. | Deduplicate or distinguish by test-row highlighting. |
| 7 | `default.png` | LOW | Duplicate | Same CRUD list without the test row. Same as `crud-initial-load.png`. | Deduplicate. |
| 8 | `state-1-agentrunorchestrator-orchestration.png` | MEDIUM | Info density | "State 1 / AgentRunOrchestrator — orchestration step entered via". Truncated sentence ("via" at end). The state card does not explain what this means for a human operator. | Finish the sentence (e.g. "entered via agentRunRequested event"). Add a short operator-facing explanation per state. |
| 9 | `state-10-agentrunorchestrator-platformcontextenricher.png` | MEDIUM | Info density | Same minimal card pattern. No timestamps, no tenant, no run ID. | Show runId / tenant / timestamp so operators can correlate. |
| 10 | `state-11-agentrunorchestrator-superjudgearbiter.png` | MEDIUM | Info density | Same. | Same. |
| 11 | `state-12-agentrunorchestrator-agentactionpublisher.png` | MEDIUM | Info density | Same. | Same. |
| 12 | `state-13-agentrunorchestrator-patterncontributor.png` | MEDIUM | Info density | Same. | Same. |
| 13 | `state-14-agentactionpublisher-agentactionrecorded.png` | LOW | Polish | Same minimal card. "emits agentActionRecorded" is reasonably clear. | Add affordance to view the recorded action payload. |
| 14 | `state-15-patterncontributor-contributionwritten.png` | LOW | Polish | "PatternContributor → ContributionWritten when (emits )" — parens with empty content looks like a template hole. | Render `(emits contributionWritten)` or drop the empty parens. |
| 15 | `state-16-patterncontributor-consentrequested.png` | HIGH | Copy | "consentRequested" is a user-gating event but there is no operator UI here to actually approve/deny consent. The flow appears to block but the console gives the operator no action. | Render a consent-pending queue with approve/deny affordances, or link from this state to the Human Interaction Gate. |
| 16 | `state-17-agentrunorchestrator-agentsessioncompleted.png` | LOW | Polish | "agentSessionCompleted" — minimal card. No success summary, no session length, no token count. | Add session-summary panel for terminal state. |
| 17 | `state-18-agentchatclient-agentrunorchestrator.png` | LOW | Polish | "AgentChatClient → AgentRunOrchestrator when (emits )" — empty parens again. | Same as row 14. |
| 18 | `state-19-confirmationevent-promotedraft.png` | HIGH | Bug surface | Card shows "confirmationEvent → promoteDraft (emits `)". Stray backtick / truncated emit name bleeds into the UI. This is a rendering bug an operator would file. | Fix the template — escape or unquote the emit name; never render a raw backtick. |
| 19 | `state-1-agentrunorchestrator-orchestration.png` | (dup counted above) | — | — | — |
| 20 | `state-2-tenantscopegateway-governance.png` | LOW | Polish | "TenantScopeGateway — governance step entered via" — truncated, same pattern. | Same as row 8. |
| 21 | `state-20-rollbackevent-deletedraft.png` | MEDIUM | Copy | "rollbackEvent → deleteDraft when (emits `)" — empty emit + backtick again. Rollback is critical; the copy should explain what the operator should do next. | Expand to: "rollback completed — draft deleted; no further action required". |
| 22 | `state-3-platformcontextenricher-data.png` | LOW | Polish | Minimal pipeline-state card. | Same as row 8. |
| 23 | `state-4-superjudgearbiter-validation.png` | LOW | Polish | Same minimal card. "superJudgeArbiter validation step" — no pass/fail result shown. | Show arbiter verdict (pass/fail/reasons) for operator review. |
| 24 | `state-5-agentactionpublisher-transaction.png` | LOW | Polish | Same minimal card. | Same. |
| 25 | `state-6-patterncontributor-data.png` | LOW | Polish | Same minimal card. | Same. |
| 26 | `state-7-agentchatclient-routing.png` | LOW | Polish | "AgentChatClient — routing step entered via" — truncated. | Same as row 8. |
| 27 | `state-8-agentrunrequested-agentrunorchestrator.png` | LOW | Polish | "agentRunRequested → AgentRunOrchestrator" — minimal card. | Same. |
| 28 | `state-9-agentrunorchestrator-tenantscopegateway.png` | LOW | Polish | Same minimal card. | Same. |

## Cross-PNG patterns (flow-level)

- **Honest mock framing.** Every state-* file is labeled "mock state N" — this is the correct discipline and avoids the state-fidelity failure seen in `completion-gamification`. Credit for not claiming these are real.
- **Every state card is near-identical in shape** — one-line title, one-line transition text. This is a reasonable placeholder for engine-internal tooling but provides too little information for an operator who actually needs to monitor an agent run.
- **Template-hole leaks.** Multiple captures (`state-14`, `state-18`, `state-19`, `state-20`) show raw backticks and empty parentheses. This is a real rendering bug that would embarrass in front of an operator.
- **Consent-gated state (`state-16`) has no actionable UI.** If the agent halts on a consent request, the admin console should expose approve/deny, not just describe the transition.
- **Truncated sentences** ("entered via" with nothing after) in at least 5 captures suggest an unfinished template string somewhere upstream.

## Business-logic phase coverage

Topology surfaces referenced by filenames:
- AgentRunOrchestrator, TenantScopeGateway, PlatformContextEnricher, SuperJudgeArbiter, AgentActionPublisher, PatternContributor, AgentChatClient, + 22 transition edges.

**Visually covered:** CRUD admin console (initial + after-create + with test row), and 22 transition states as honestly-labeled mock cards.

**Missing/misrepresented:** no real visualization of agent-run flow (no timeline, no topology graph, no live-state highlight). For a flow named "Platform Agent" in an admin console, an operator would expect to see a current-run dashboard with steps lighting up — instead they see a CRUD table of generic `ui-*` rows unrelated to the agent-run semantics. The generic CRUD pattern is appropriate for record management but inappropriate as the ONLY operator UI for this flow.
