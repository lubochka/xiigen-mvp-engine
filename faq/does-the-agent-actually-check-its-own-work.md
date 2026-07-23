# Does the agent actually check its own work, or does it just say it did?

_Last verified: 2026-07-23_

It checks it, and the check is a separate stage of the pipeline rather than a
sentence in a prompt. After the generation node produces code, a validation node
picks that output up, loads the arbiter records that apply to the task type, and
runs executable checks against the text that was actually produced. If there is no
generated code, the node fails loudly with `VALIDATE_NO_CODE` instead of reporting
success on an empty result.

The checks themselves are code, not advice. One arbiter forbids the "pure
computation" task types from injecting an AI provider or writing to the database at
all — so the model cannot quietly turn a deterministic calculation into another
model call. Another one refuses any money settlement that reaches for `parseFloat`,
`toFixed` or `Math.round`, and requires integer arithmetic (`BigInt`, cents, basis
points) instead. A failed arbiter of this class is not a warning: its severity is
score-zero.

The judging is deliberately not done by the author. The arbiter service injects a
dedicated judge provider precisely so that the model which wrote the code is not the
model that grades it, and when no judge is configured the service logs a visible
warning that scores may be inflated before falling back. Evaluator arbiters are
configured as blind and isolated, and the goal-delivery arbiter runs first, before
it can be influenced by the others.

The same discipline is written down for the human-facing agents. The verification
skills require three levels — unit, simulation against real engine contracts, and
end-to-end — and explicitly forbid calling a fix done because a unit test went
green. The shortest line in that skill is also the most honest one: "Looks correct
to me" is not a verification.

**In this repo:**
- `server/src/engine/node-handlers/validate.handler.ts` — the validation node: loads arbiters, runs named checks against generated code
- `server/fixtures/arbiters/flow-23-pure-computation-no-ai.json` — no AI injection, no side effects, severity `score-zero`
- `server/fixtures/arbiters/flow-32-integer-arithmetic-settlement.json` — float arithmetic banned in settlement code
- `server/src/engine/arbitration/arbiter.service.ts` — dedicated judge provider, warning on fallback
- `server/src/engine-contracts/platform-agent-contracts.ts` — `blind: true, isolated: true, runsFirst: true`
- `.agents/skills/code-execution/three-level-verification-SKILL.md`, `.agents/skills/code-execution/self-verification-SKILL.md`

[← All ten questions](./README.md)
