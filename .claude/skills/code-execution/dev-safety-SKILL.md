# Dev Safety — XIIGen

> BLOCKING constraint — priority 3 in governance chain. TypeScript errors = session blocked.

**Priority:** BLOCKING — overrides any "let's skip the build to save time" impulse

---

## What This Skill Does

Enforces the hard technical safety floor for every XIIGen session:
- TypeScript build must be green before and after every code change
- Both server AND client test suites must pass at or above baseline
- Git discipline prevents accidental main/production branch contamination
- npm (not yarn) everywhere

---

## SESSION GATE (Run at Start AND End of Every Phase)

```bash
# SERVER gate
cd server && npm run build
# Expected: Exit 0, 0 TypeScript errors

cd server && npx jest --verbose 2>&1 | tail -5
# Expected: Tests: N passed, N total  (N ≥ 2,342)

# CLIENT gate — REQUIRED, not optional
cd client && npm run build
# Expected: Exit 0, 0 errors

cd client && npx jest --verbose 2>&1 | tail -5
# Expected: Tests: N passed, N total  (N ≥ 220)
```

**If either fails: session is BLOCKED. Do not proceed to next phase.**

---

## Build Discipline

### TypeScript Compile Errors = BLOCKED

A TypeScript error is not a warning. It is not "close enough." It is not "the type is slightly wrong but the logic is fine."

TypeScript errors in the engine often hide real runtime failures because:
- DNA-3 depends on correct `DataProcessResult<T>` generics — wrong type → wrong error handling
- Fabric interface mismatches cause silent fallback to in-memory providers
- Tenant scoping relies on correct interface types in middleware — wrong types → data leaks

**Protocol when you encounter a compile error:**
1. STOP all other work
2. Fix the TypeScript error completely
3. Re-run `npm run build` — must show 0 errors
4. Then continue

### Never Skip the Build Check

Anti-patterns to reject immediately:
- "I'll fix the types later, the logic is right" → **REJECT**
- "It's just a `any` cast, harmless" → **REJECT** — any casts mask DNA violations
- "TypeScript is being overly strict here" → **REJECT** — fix the code, not the compiler

---

## Test Suite Discipline

### Count Must Never Decrease

Session-start count is the floor. If tests drop:
1. DO NOT proceed
2. Identify which tests disappeared and why
3. If a test was accidentally deleted: restore it
4. If a test file was renamed: update imports
5. Re-run until count is ≥ baseline

### Never Change an Assertion to Make a Test Pass

Changing `expect(result.isSuccess).toBe(true)` to `expect(result.isSuccess).toBe(false)` because the code returns failure — that is fixing the test to accept wrong output. Fix the engine.

Exception: if Luba explicitly says "the old behavior was wrong, update the test." That requires explicit approval.

### Test Baseline Numbers

| Suite | Minimum passing |
|-------|----------------|
| server (`cd server && npx jest`) | ≥ 2,342 |
| client (`cd client && npx jest`) | ≥ 220 |

---

## Git Discipline

### Branches

Never commit directly to `main`. Every session works on the designated worktree branch (`claude/hardcore-cohen` or equivalent).

```bash
# Always verify branch before any code change
git branch --show-current
# Must NOT be: main, master, develop
```

### Commit Hygiene

- Commit message must reference the session and deliverable: `P1: agent-constitution skill files`
- Never commit `node_modules/`, build artifacts, or `.env` files
- One logical change per commit — do not batch unrelated files

### Sensitive Files

Never commit:
- `.env` or `.env.*` files
- Any file containing API keys, tokens, or credentials
- `*.pem`, `*.key`, `*.cert` files

---

## Package Manager: npm Only

**No yarn.** The codebase uses npm. Mixed package managers create lockfile conflicts that cause silent version divergence.

```bash
# Always
npm install          # not: yarn install
npm run build        # not: yarn build
npm test             # not: yarn test
npx jest --verbose   # not: yarn jest
```

If you see a `yarn.lock` file in the repo, do NOT run yarn — that lockfile is stale. Use npm.

---

## Why a Compile Error Is Dangerous (G04 universal addition from llm_mvp_core, consolidated)

A TypeScript error is not cosmetic. In this engine it routinely hides a real
runtime failure, because the type system is load-bearing for the DNA:

- **Generics — `DataProcessResult<T>`:** DNA-3 routes every business error through
  `DataProcessResult.failure()`. A wrong `T` or an `any` cast means the failure
  shape is wrong → callers branch on the wrong field → the error is silently
  swallowed. The compiler is the only thing catching that before runtime.
- **DI resolve:** a fabric/provider interface mismatch compiles only when the
  types line up. When it does not, Nest can silently fall back to an in-memory
  provider, and the bug surfaces only under a real backend — far from the edit.
- **Namespace / type mix:** mixing a DTO/event shape with a service-port
  interface (the `I`-prefix split — see `naming-conventions-enforcer`) produces a
  type the compiler rejects; forcing it through with `as` masks a contract break.
- **Tenant scoping:** middleware relies on correct interface types to read
  `tenantId` from `AsyncLocalStorage` (DNA-5). Wrong types → scope leak → one
  tenant reads another's data.

Protocol on a compile error (unchanged, restated as one block): **STOP** all
other work → fix the error completely → re-run `npm run build` to **0 errors** →
only then continue. "Fix the types later, the logic is right" is **REJECT**.

## Zero Failures = Zero (no pre-existing carve-out)

The session-start count is the floor and **0 failed means 0 failed** — there is
no "those N were already failing" exemption. If the suite shows any failure
after your change, the phase is failed even if some of those failures predate
you: either they are now in scope (fix them) or you must prove, with the
before-snapshot, that the count did not regress and no failure is attributable
to this change. A green build that prints test failures is not a pass.

## DNA Pre-Commit Checklist (single block, run before every commit)

Before committing any new/modified `.ts`, run the `dna-compliance-guard` gate as
one pass (full detectors live in `dna-guard-patterns.md` / the
`dna-compliance-guard` skill):

```
□ DNA-1  no entity-specific model class (data is Record<string, unknown>)
□ DNA-2  no hardcoded field selector (.find({hardcoded}) → BuildSearchFilter)
□ DNA-3  business errors via DataProcessResult.failure(), no top-level throw
□ DNA-4  services extend MicroserviceBase
□ DNA-5  tenantId read from AsyncLocalStorage/TenantContext, never a parameter
□ DNA-6  no entity-specific @Controller (DynamicController only)
□ DNA-7  every @Subscribe / queue consumer carries a dedup/idempotency id
□ DNA-8  storeDocument() BEFORE enqueue() (outbox-before-queue)
□ DNA-9  inter-service events wrapped in CloudEvents
□ build  cd server && npm run build  → 0 errors;  cd client && npm run build → 0 errors
□ tests  server jest ≥ 2342 (0 failed);  client jest ≥ 220 (0 failed)
```

Any unchecked box → do not commit. (Rule 10 "no external ML frameworks" is
**note-only** for mvp: trainable/ML logic stays in `llm_mvp_core` per R5/R6;
mvp consumes models via manifest/locator, so there is no ML framework to ban
here — but do not introduce one.)

---

## Reference Files

| File | Read When |
|------|-----------|
| [rules/build-gate.md](rules/build-gate.md) | Before running any build gate step |
| [rules/git-discipline.md](rules/git-discipline.md) | Before any git operation |
