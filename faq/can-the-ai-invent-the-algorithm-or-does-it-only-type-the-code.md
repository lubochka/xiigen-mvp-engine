# Can the AI invent the algorithm, or does it only type the code?

_Last verified: 2026-07-23_

The design step is deliberately separated from the coding step. A planner node turns
an intent into a technology-neutral plan: it scans the model's output for technology
names — frameworks, databases, libraries — and, if any appear, re-asks the model
with a reinforced instruction to stay at the level of business intent rather than a
stack. The plan is then reviewed by a second model — a two-call pattern, planner then
reviewer — before it is scored.

Decomposition is intentionally deterministic. A decompose node reads the contract's
handler list and sorts the steps by their declared `order` field, so the model does
not improvise the sequence where reproducibility matters. Creativity is allowed where
it helps and denied where it would cost repeatability.

Code generation is a blind contest, not a single pass. An ai-generate node runs the
available providers in parallel; when more than one succeeds it shuffles the labels
(Fisher–Yates) and hands them to a judge as "Output A/B/C", so the judge cannot tell
who wrote which.

The whole thing is assembled from named node handlers registered explicitly —
`rag-retrieve`, `decompose`, `ai-generate`, `validate`, `score`, `planner`, and the
rest. The "algorithm for inventing an algorithm" is written down as a registry, not
left implicit.

**In this repo:**
- `server/src/engine/node-handlers/planner.handler.ts` — technology-neutral plan, re-ask on technology names, planner-then-reviewer two-call pattern
- `server/src/engine/node-handlers/decompose.handler.ts` — deterministic step order from `contract.handlers[]` sorted by `order`
- `server/src/engine/node-handlers/ai-generate.handler.ts` — parallel providers, Fisher–Yates label shuffle, blind A/B/C judging
- `server/src/engine/node-handlers/score.handler.ts` — scoring of generated output
- `server/src/engine/node-handlers/node-registry.ts` — the named handlers, registered explicitly

[← All ten questions](./README.md)
