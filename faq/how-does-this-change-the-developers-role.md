# How does this change the developer's role?

_Last verified: 2026-07-23_

The developer becomes the architect who owns the decisions, and the AI agent is a
bounded executor that is explicitly forbidden from making product decisions. This is
written down as governance the session loads, not left to habit.

The priority order is fixed at the very top of the agent instructions: a human's
direct instruction always wins over every governance document and over the model's own
defaults, and when they conflict the agent must state the contradiction and never
self-resolve it.

"Executes, does not decide" is a rule of its own. Every DNA threshold, scoring weight
and quality-gate criterion is treated as a product decision that belongs to the human;
rather than guess, the agent records an avoided-decision for a human to settle later.

The governance is a loaded constitution with an explicit order — the constitution
first, before any code — with the repo-level rules (Rules 0 through 17) layered on
top. And the method leaves a trail on disk: a single feature's coverage record runs
from a business-logic inventory through UI, automation and snapshot gap analyses to an
implementation-readiness check and a QA run report — the history of the decision, not
just the final code.

**In this repo:**
- `AGENTS.md` — the human-override priority order; the human's instruction always wins
- `CLAUDE.md` — repo-level architecture rules (Rules 0 through 17)
- `.agents/skills/agent-constitution/SKILL.md` — the constitution, loaded first, before any code
- `.agents/skills/code-execution/no-product-decisions-SKILL.md` — the agent executes; it does not make product decisions
- `docs/flow-coverage/platform-agent/` — one feature's full coverage trail (phase reports P1–P13): business-logic inventory, gap analyses, impl-readiness, QA run report

[← All ten questions](./README.md)
