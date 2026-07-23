# What does "agentic" mean in this project, concretely?

_Last verified: 2026-07-23_

It means a narrow door and a wide audit trail. The agent has exactly one entry point:
a POST with a `userIntent` string. No intent, no run — the controller answers
`MISSING_INTENT` instead of guessing what you meant. Completed sessions can be read
back by id, so a run is an inspectable record and not a chat that scrolled away.

The important part is what the agent is allowed to do at the end of a run. It can
advise, it can propose an edit, it can create a flow, and it can apply a global
template — and the first three write drafts. Edits aimed at another tenant are stored
with `DRAFT` status and announced as `AgentActionProposed`; applying something
globally is refused unless the caller is already in the master context. The agent
proposes; a human still decides.

Crossing a tenant boundary is possible but expensive on purpose. The scope gateway
requires the caller to be in the master context, refuses a no-op switch to itself,
writes the audit document *before* the switch happens, and runs the inner work inside
a scoped context that restores itself afterwards. If something fails midway, the audit
already exists.

Runs are idempotent — repeating a session id returns the stored result instead of
doing the work twice — and the orchestrator writes no business records at all, only
the session summary. Above all of it sits a second opinion: a super-judge that can
override a passing verdict into a block, in which case the session is stored as
blocked.

**In this repo:**
- `server/src/api/agent.controller.ts` — one entry point, `userIntent` required, sessions readable by id
- `server/src/engine/flows/platform-agent/agent-run-orchestrator.service.ts` — idempotent runs, session summary only
- `server/src/engine/flows/platform-agent/agent-action-publisher.service.ts` — advise / propose / create / apply-global, drafts and proposal events
- `server/src/engine/flows/platform-agent/tenant-scope-gateway.service.ts` — master-only, audit written before the scope switch
- `server/src/engine/flows/platform-agent/super-judge-arbiter.service.ts` — can override a pass into a block

[← All ten questions](./README.md)
