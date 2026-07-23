# Is this a real system, or a demo?

_Last verified: 2026-07-23_

The honest measure is what you can count in the repository, not what a slide claims.
There are dozens of flow directories under the engine, a large set of top-level
business-flow write-ups, and hundreds of fixtures organised by purpose — arbiters,
index descriptions, factories, templates, and RAG patterns named by rule and scenario.

There are end-to-end browser scenarios too, including a dedicated tenant-isolation
test and a flow-generation test, so the behaviour is exercised, not only asserted.

One honesty note: the headline counts that appear in the README — server and client
test totals, task-type and flow counts — were not re-measured for this document, so
treat those specific numbers as *stated*, not verified here. Everything cited below is
a directory or file you can list for yourself.

**In this repo:**
- `docs/business-flows/` — the top-level business-flow write-ups
- `server/src/engine/flows/` — the per-flow service implementations
- `fixtures/` — the fixture corpus (arbiters, schemas, patterns, and more)
- `server/fixtures/` — arbiters, index descriptions, factories and templates
- `e2e/tests/flow-generation.spec.ts` — an end-to-end flow-generation scenario
- `e2e/tests/tenant-isolation.spec.ts` — an end-to-end tenant-isolation scenario

[← All ten questions](./README.md)
