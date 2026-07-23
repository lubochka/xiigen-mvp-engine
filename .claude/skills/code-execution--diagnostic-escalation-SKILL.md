---
name: diagnostic-escalation
sk_number: SK-501
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
layer: product
author: luba
updated: "2026-06-29"
contexts: ["web-session", "claude-code"]
description: >
  When a Gate-B verification fails (a test goes red, a build breaks, an
  expected outcome is missing), diagnose the failure layer in a FIXED ORDER
  and stop at the first layer that matches: Step 1 TEST_DATA, Step 2 WIRING,
  Step 3 STUB, Step 4 ALGORITHM / IRON_RULE. The first three layers are fixed
  WITHOUT human escalation. Only Step 4 (and changes to a DNA rule, an
  interface contract, a locked decision, or a 3+ cycle stall) escalates to
  Luba. This is the engineering-failure counterpart to SK-446
  (escalation-orchestrator), which governs arbiter-panel verdict escalation —
  this skill governs a single failing Gate-B, not a panel of arbiters. Do not
  duplicate SK-446's 6 decision rules here.
triggers:
  - "gate b failed"
  - "test went red"
  - "build broke"
  - "why is this test failing"
  - "diagnostic escalation"
  - "should I escalate this"
  - "is this a wiring bug or a logic bug"
  - "test data wiring stub algorithm"
  - "do I need Luba for this fix"
  - "failure layer"
---

# Diagnostic Escalation Skill (SK-501)

## WHAT THIS SKILL PREVENTS

- Escalating a TEST_DATA or WIRING bug to Luba when the agent could and should
  have fixed it without a decision.
- The opposite failure: silently "fixing" an ALGORITHM or IRON_RULE violation by
  editing the test, deleting a named check, or relaxing a contract — when that
  change actually required a human decision.
- Guessing the failure layer. The four layers are diagnosed in a FIXED ORDER,
  and you stop at the first one that matches. A test that fails because of bad
  fixture data is never an "algorithm bug" — you would only reach Step 4 after
  Steps 1–3 came back clean.

This skill answers one question: **"My Gate B is red — which of the four layers
broke it, and may I fix it myself or must I escalate to Luba?"**

It is the engineering-failure peer of **SK-446 (escalation-orchestrator)**.
SK-446 collects arbiter-panel verdicts (BLOCK/PASS/CHALLENGE across multiple
arbiters) and routes ACCEPT/CYCLE/ESCALATE. This skill is narrower: a single
failing test/build/outcome, diagnosed by layer. When a panel of arbiters
disagrees, use SK-446. When one Gate B is red, use this skill. Do not copy
SK-446's six rules into this protocol.

---

## THE FOUR LAYERS — DIAGNOSE IN ORDER, STOP AT FIRST MATCH

```
Gate B is red.
  │
  ▼
Step 1 — TEST_DATA   → the fixture / mock / seed is wrong (not the code)   → FIX (no escalation)
  │ clean?
  ▼
Step 2 — WIRING      → DI registration / module / import / provider wrong  → FIX (no escalation)
  │ clean?
  ▼
Step 3 — STUB        → the code under test is unimplemented (throws/TODO)  → FIX (no escalation)
  │ clean?
  ▼
Step 4 — ALGORITHM / IRON_RULE → the logic is genuinely wrong, OR the test
         encodes a DNA rule / interface contract / locked decision that the
         code violates                                                     → ESCALATE if the fix
                                                                              changes a rule/contract/
                                                                              decision, or 3+ cycles
```

You may not skip a step. A failure that "looks like" an algorithm bug is
investigated through Steps 1–3 first, because a wrong fixture or an unwired
provider produces the exact same red test as a wrong algorithm.

---

## STEP 1 — TEST_DATA (the fixture lies, not the code)

The test fails because the input data, the mock return value, the seed, or the
expected value in the assertion is wrong — the production code is correct.

**TypeScript / Jest checks:**

```bash
# Find the failing spec and read its arrange block
npx jest --testNamePattern "the failing test name" --verbose 2>&1 | head -40

# Inspect the fixture/factory the spec uses (do NOT trust it — read it)
grep -rn "createFixture\|makeMock\|seed(\|buildTestUser\|fakeTenant" \
  server/src/**/*.spec.ts server/test/**/*.ts | head -20
```

**Confirm TEST_DATA (not code) by:**
- The expected value in the `expect(...)` is wrong for the real contract.
- A mock returns a shape the real provider never returns (e.g. mock returns a
  bare object where the real `DataProcessResult<T>` / typed `Result<T>` wraps it).
- A seed omits a field the code legitimately requires.

**Fix (no escalation):** correct the fixture / mock / expected value. The
production code and the test intent are both fine; only the data was wrong.

**Do NOT:** change production code to satisfy a wrong fixture. That converts a
TEST_DATA bug into a real regression.

---

## STEP 2 — WIRING (DI / module / import, not logic)

The test fails because the code under test was never wired: a NestJS provider is
not registered, the wrong implementation is injected, a module does not import
the module that exports the provider, or a relative import points at the wrong
file.

**TypeScript / NestJS checks (replaces C# `Program.cs AddSingleton`):**

```bash
# Is the provider actually registered in a module?
grep -rn "providers:\s*\[" server/src/**/*.module.ts | head
grep -rn "MarketplacePaymentsService\|<ServiceUnderTest>" \
  server/src/**/*.module.ts

# Is the interface bound to the intended implementation (token → class)?
grep -rn "provide:\s*['\"]\?I[A-Z][A-Za-z]*\b\|useClass\|useFactory\|@Inject(" \
  server/src/**/*.module.ts | head -20

# Does the consuming module import the module that EXPORTS the provider?
grep -rn "imports:\s*\[" server/src/**/<feature>.module.ts
```

**Confirm WIRING (not logic) by:**
- The provider is absent from `providers: []` (or absent from `exports: []` so
  the consumer cannot see it).
- Two implementations of the same interface exist and the wrong one is bound.
- `@Injectable()` is missing on the class, so Nest never constructs it.
- A Jest `Test.createTestingModule({...})` omits the provider the SUT depends on,
  so the SUT gets `undefined` and throws.

**Fix (no escalation):** register/export the provider, bind the correct
token→class, add the missing `@Injectable()`, or add the dependency to the
testing module. No algorithm changes.

---

## STEP 3 — STUB (the code is not implemented yet)

The test fails because the method under test is a placeholder: it throws "not
implemented", returns a hard-coded default, or carries a `TODO`/`FIXME` where the
real logic belongs. The wiring is correct and the fixture is correct — the body
is empty.

**TypeScript checks (replaces C# `NotImplementedException`):**

```bash
# Stubs in the production path (NOT in *.spec.ts)
grep -rn "throw new Error(['\"]not impl\|throw new Error(['\"]TODO\|NotImplemented\|FIXME\|// TODO\|return null; *// stub\|return {} as any" \
  server/src/**/*.ts | grep -v "\.spec\.ts" | head -20
```

**Confirm STUB by:** the method body is the placeholder, and the failing
assertion is exactly the behavior the placeholder does not yet produce.

**Fix (no escalation when the contract already exists):** implement the method to
satisfy the existing contract/iron-rule the test encodes. You are filling in
known, already-decided behavior — no new product decision is being made.

**Escalate only if** implementing the stub requires a product/architecture
decision that is not already fixed in the contract (then it is really a Step 4 /
IRON_RULE situation — see below).

---

## STEP 4 — ALGORITHM / IRON_RULE (genuine logic error OR a rule the code violates)

Steps 1–3 came back clean: the fixture is right, the wiring is right, the method
is implemented. The test is still red. Now exactly one of two things is true:

**4a — ALGORITHM:** the implemented logic is simply wrong (off-by-one, wrong
branch, wrong accumulation, wrong comparison). The contract is fine; the code
does not meet it.
→ **Fix the algorithm (no escalation)** — you are making the code meet an
existing, agreed contract. Root-cause first (see
`systematic-debugging` and `root-cause-tracing`); do not patch the symptom.

**4b — IRON_RULE / CONTRACT / LOCKED DECISION:** the test encodes a DNA rule, an
interface contract, or a locked decision, and the code violates it. The
"failure" is the code being caught doing the wrong thing. Changing the test, the
DNA rule, the interface signature, or the locked decision to make the test pass
is a **decision**, not a fix.
→ **ESCALATE to Luba** (see escalation list). Never delete the named check or
relax the contract to turn the test green. (This mirrors
`score-zero-investigation` Rule 0: a named check is never removed to silence it.)

---

## THE ESCALATION LIST — WHEN LUBA IS REQUIRED

Escalate to Luba (do NOT self-fix) when the only way to make Gate B pass is to:

1. Change a **DNA rule** (DNA-1 … DNA-9) or any named iron-rule check.
2. Change an **interface / contract signature** that other code depends on
   (a fabric interface, a public method shape, a `DataProcessResult<T>` /
   typed-`Result` contract).
3. Change a **locked architectural decision** (a D-NN / A-NN decision, a
   `DECISIONS-LOCKED`-class record).
4. You have run **3 or more diagnose-fix cycles** on the same Gate B without it
   going green (3+ cycles = the problem is structural/architectural, not the
   next fix — cross-reference `systematic-debugging` Phase 4.5).

Everything else — TEST_DATA, WIRING, STUB, and a plain ALGORITHM error against an
existing contract — is fixed WITHOUT escalation.

**Escalation proposal format (TypeScript Gate-B framing):**

```markdown
## ESCALATION — Gate B cannot pass without a decision
Gate B (red):      npx jest --testNamePattern "<test>"   → expected "N passed, 0 failed", got "<actual>"
Layers cleared:    Step 1 TEST_DATA ✅  Step 2 WIRING ✅  Step 3 STUB ✅
Layer reached:     Step 4b — IRON_RULE
Rule/contract:     DNA-5 (tenant scope on every write) — file:line server/src/.../x.service.ts:34
What passing requires: relax DNA-5 OR change ITenantWriter.write() signature
Why I cannot decide: this is a locked DNA rule / interface contract
Options:           (a) keep DNA-5, change the generator;  (b) amend DNA-5 (needs your decision)
Blocked until:     your decision on (a) vs (b)
```

---

## GATE-B COMMAND MAPPING (this repo: NestJS + React + FastAPI sidecar)

| Surface | Gate-B command | Green looks like |
|---------|----------------|------------------|
| Server (NestJS) | `npm test` / `npx jest --testNamePattern "<t>"` (in `server/`) | `Tests: N passed, 0 failed` |
| Client (React) | `npx playwright test -g "<title>"` (in `client/`) | `N passed` |
| RAG sidecar (FastAPI) | `pytest -k "<test>"` (where applicable) | `N passed` |
| Build | `npm run build` (server/client) | exit 0, no TS errors |

Any C# `dotnet test` / `Src/*.cs` framing from the upstream `llm_mvp_core`
standard is replaced by the table above for this repo.

---

## QUICK REFERENCE — LAYER BY SYMPTOM

| Symptom | Likely layer | First check | Escalate? |
|---------|-------------|-------------|-----------|
| Assertion expected value looks wrong | Step 1 TEST_DATA | read the `expect(...)` and the fixture | No |
| Mock returns a shape the real provider never returns | Step 1 TEST_DATA | compare mock vs real return type | No |
| SUT dependency is `undefined` at runtime | Step 2 WIRING | `providers: []` / testing-module providers | No |
| Two impls of one interface, wrong one runs | Step 2 WIRING | `provide:`/`useClass` binding | No |
| Method throws "not implemented" / has TODO | Step 3 STUB | grep stubs in `*.ts` (excl. `*.spec.ts`) | No (unless undecided behavior) |
| Logic is implemented but result is wrong | Step 4a ALGORITHM | root-cause trace the value | No |
| Passing requires editing a DNA rule / interface / locked decision | Step 4b IRON_RULE | identify the rule/contract | YES |
| Same Gate B still red after 3 fix cycles | Step 4 (architectural) | stop, question architecture | YES |

---

## ANTI-PATTERNS

```
❌ Jumping to "the algorithm is wrong" before clearing TEST_DATA and WIRING
   → A bad fixture and an unwired provider produce the same red test.

❌ Editing production code to satisfy a wrong fixture (Step 1 misdiagnosed)
   → That turns a test-data bug into a real regression.

❌ Deleting a named check / relaxing a contract to make a Step 4b test green
   → That is a decision disguised as a fix. Escalate. (See SK-475 Rule 0.)

❌ Escalating a TEST_DATA / WIRING / STUB fix to Luba
   → Those three layers are fixed without escalation. Only Step 4b + rule/contract/
     decision changes + 3-cycle stalls escalate.

❌ Re-implementing SK-446's arbiter-panel rules here
   → SK-446 handles multi-arbiter verdict escalation; this skill handles one
     failing Gate B by layer. Keep them separate; cross-reference, do not merge.

❌ Reordering the four steps "because this one is obvious"
   → The fixed order is the protocol. Obvious-looking failures are exactly where
     a skipped Step 1/2 hides the real cause.
```

---

## INTEGRATION

```
Use when:    a single Gate B (test/build/expected outcome) is red and you must
             decide the failure layer and whether to escalate.
Prerequisite:a Gate B exists (see remediation-session-design SK-466 — every
             remediation group must carry an explicit Gate B).
Pairs with:  systematic-debugging        — Phase 1 root cause; Phase 4.5 = 3+ cycles
             root-cause-tracing           — backward trace for Step 4a ALGORITHM
             score-zero-investigation SK-475 — Rule 0: never delete a named check
             debug-session-skill SK-430   — persist hypotheses if it spans sessions
Distinct from: escalation-orchestrator SK-446 — arbiter-panel verdict escalation,
             NOT single-Gate-B layer diagnosis. Do not duplicate its rules.
```
