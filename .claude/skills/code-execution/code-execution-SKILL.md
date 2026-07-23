---
name: code-execution
sk_number: SK-470
version: "1.0.0"
priority: HIGH
load_order: 1
category: code-execution
author: luba
updated: "2026-06-29"
contexts: ["claude-code"]
description: >
  The execution floor for any code-touching session in xiigen mvp. Defines
  Gate-B as an EXECUTABLE pass condition (not "works correctly"), the
  test-before-after metric rule (one test = one metric), and the experiment
  tier system (1-10 / 11-100 / 100+). Universal capability ported from
  llm_mvp_core code-execution-SKILL; TS-adapted to NestJS server + React client
  (Jest + Playwright). Common ML/DPO logic stays in llm_mvp_core (R5/R6); this
  skill governs how the mvp itself is built and verified.
triggers:
  - "run the gate"
  - "is this phase done"
  - "Gate-B"
  - "before commit"
  - "before/after metric"
  - "experiment tier"
  - "is this test enough"
---

# Code Execution Skill (SK-470)

## Why This Skill Exists

A phase is not "done" because the code looks right. It is done when an
**executable condition** with a number passes. "Works correctly", "should be
fine", and "I think the build is green" are not Gate-B. A command, an exit code,
and a count are.

This skill is the mvp-local execution floor. It pairs with `dev-safety`
(the BLOCKING build/test gate) and `dna-compliance-guard` (the 9-DNA pre-commit
gate). Where dev-safety says *the session is blocked on a red build*, this skill
says *here is exactly what "green" must measure for THIS change*.

---

## Rule A — Gate-B Is an Executable Condition, Not "Works Correctly"

Every placement / phase carries one Gate-B written as a **comparison, count, or
assertion** that a command produces. Forbidden Gate-B wording: "works", "is
correct", "looks good", "should pass".

### mvp Gate-B (TS): server + client, not a single subproject number

```bash
# SERVER gate
cd server && npm run build
# Gate-B: exit 0, 0 TypeScript errors

cd server && npx jest --verbose 2>&1 | tail -5
# Gate-B: "Tests: N passed, N total", N ≥ 2342, 0 failed

# CLIENT gate — REQUIRED, not optional
cd client && npm run build
# Gate-B: exit 0, 0 errors

cd client && npx jest --verbose 2>&1 | tail -5
# Gate-B: "Tests: N passed, N total", N ≥ 220, 0 failed
```

In llm_mvp_core the gate is "subproject number / `dotnet build`+`dotnet test`".
In mvp that single subproject gate is **replaced by the server+client gate**
above. There is no such thing as "server green, client skipped" — both halves
are the gate.

### e2e Gate-B (when the change is user-facing)

```bash
cd client && npx playwright test 2>&1 | tail -5
# Gate-B: "N passed", 0 failed; the named scenario reaches the asserted UI state
```

A Gate-B such as "the flow works end to end" is invalid. The valid form names
the Playwright spec, the route, and the asserted visible state.

---

## Rule B — Test-Before-After (One Test = One Metric)

Every placement has a metric measurable **before and after** the change. The
metric may be a Jest assertion, a test count, a build result, an eval number, or
a schema check — but it must exist and be readable both before and after.

**One test = one metric.** A test that asserts five unrelated things measures
nothing cleanly. In Jest:

```typescript
// ✅ one metric per test
it('rejects duplicate registration when email already verified', () => {
  const result = service.register(verifiedEmailInput);
  expect(result.isSuccess).toBe(false);          // the single metric
  expect(result.errorCode).toBe('REG_DUPLICATE'); // its diagnostic, same metric
});

// ❌ one test asserting many independent metrics — split it
```

**No metric = not done.** If you cannot state the before number and the after
number from a command, the placement is not complete regardless of how the code
reads.

For RAG-retrieval quality the metric is a **numeric eval run** (FastAPI eval
endpoint or `pytest tests/rag_eval.py`), reported as recall/precision
before→after — never "retrieval looks better".

---

## Rule C — Experiment Tier System

Scale the verification effort to the change size. Do not run a 100+ ceremony for
a one-line fix, and do not ship a routing change on a single happy-path test.

| Tier | Scope | Required verification |
|------|-------|-----------------------|
| **1–10** (tiny) | ≤ 10 lines, single function, no contract change | the one targeted Jest spec + `npm run build` (the touched side) |
| **11–100** (normal) | a service / station / component, internal contract | full server+client Gate-B (build + jest both sides) |
| **100+** (structural) | new flow, DNA-touching, fabric/interface change, cross-flow | full Gate-B + e2e Playwright + DNA pre-commit gate + before/after eval where retrieval/scoring is involved + phase-git-report |

The tier is chosen by **blast radius**, not by how many lines you typed. A
one-line change to a DNA guard or a fabric interface is Tier 100+.

---

## Rule D — Sub-Agent-Only Execution Boundary

When the parent session is architect/governance-owned, the parent does **not**
run `npm run build`, `npx jest`, `npx playwright`, `dotnet`, training runners, or
`Start-Process`. Execution is delegated to a bounded sub-agent whose work order
names the exact Gate-B commands, the exact allowed files, and the expected
numeric output. The sub-agent returns an evidence packet (commands run, exit
codes, before/after counts) and stops. The parent reviews the packet against
this skill's Gate-B before accepting the phase.

A sub-agent's own "looks complete" is not parent review. Parent review compares
the returned numbers to Rule A/B/C.

---

## Rule E — Human-Readable Plan Precondition

A code phase may begin only when its plan step is readable: it states, in plain
language, what the step builds/proves, the exact Gate-B command(s), and the
before/after metric. A step that says only "implement X" or "make it work" is
not executable — it returns to planning repair, not to the keyboard. (Mirrors
the mvp planning admission gate; do not start coding from an unreadable step.)

---

## Rule F — Concrete Repair Blueprint Gate (when a verification fails)

When Gate-B fails or review finds a defect, the fix is not "I'll adjust it". The
repair names: the exact file:line, what the code does now, why that is wrong,
what it must become, and which test proves the fix. A vague "wrap it / handle it
better" is not a repair. For any value that looks like a security constant routed
through tenant config, the repair must classify it MACHINE vs FREEDOM (see
`generated-code-review`) before re-running the gate.

---

## What This Skill Prevents

- "Done" claimed from reading code instead of from a green command + count.
- Server-green-client-skipped passing as a full gate.
- A routing/DNA change shipped on one happy-path test (wrong tier).
- The parent architect running builds/tests directly under a sub-agent-only
  instruction.
- A failing gate "fixed" by adjusting the assertion instead of the engine
  (that belongs to `dev-safety` / `test-integrity` — this skill defers to them).

---

## Integration

```
code-execution
  → dev-safety        (BLOCKING build/test gate — the floor this skill measures against)
  → dna-compliance-guard (9-DNA pre-commit gate for Tier 100+ / any new .ts)
  → generated-code-review (Layer 1-5 for generated/DPO-candidate code)
  → test-integrity    (assertion honesty — never change the assert to pass)
  → phase-git-report  (Tier 100+ trace plan→commits→files with before/after counts)
```
