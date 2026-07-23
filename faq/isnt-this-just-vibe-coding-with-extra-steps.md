# Isn't this just vibe coding with extra steps?

_Last verified: 2026-07-23_

Vibe coding is "ask, glance, accept". The extra steps here are the point: between the
request and the acceptance there is a validator, a scorer, a judge and an audit
protocol, and each of them can say no.

The house style is enforced by a validator rather than a style guide. Nine structural
rules are checked on generated code — dictionaries instead of typed models, result
wrappers instead of thrown exceptions for business logic, tenant scope on every query,
store-before-enqueue, and so on — and each violation carries a severity, where `error`
blocks. On top of that the scoring node subtracts concrete fractions for concrete
findings, and hands the contract's iron rules to a judge model to decide whether each
one is actually implemented.

The reviews of the reviews are also written down. The audit protocol is a fixed
ten-point checklist that forbids vague thresholds ("no ~approximately"), demands an
explicit severity on every finding, and requires a section listing what was *not*
checked and why. A separate skill audits the arithmetic of reports themselves:
baseline plus the sum of deltas must equal the final number across a whole chain of
sessions, and any gap is a failure with an exact location.

None of this makes the output automatically correct. It makes the failure modes that
vibe coding is famous for — plausible code with float money math, a missing tenant
filter, a confident report whose numbers do not add up — into things a machine refuses
rather than things a human might happen to notice.

**In this repo:**
- `server/src/guardrails/dna-validator.ts` — nine structural patterns checked on generated code, blocking severity
- `server/src/engine/node-handlers/score.handler.ts` — scoring evaluators, iron rules passed to a judge model
- `server/src/engine/node-handlers/validate.handler.ts` — the validation node that runs the arbiter checks
- `server/fixtures/arbiters/flow-32-integer-arithmetic-settlement.json` — float money arithmetic refused outright
- `.agents/skills/audit-protocol/SKILL.md` — ten-point audit checklist, mandatory "not checked" section
- `.agents/skills/chain-arithmetic-audit/SKILL.md` — report numbers must add up end to end

[← All ten questions](./README.md)
