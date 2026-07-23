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

## Reference Files

| File | Read When |
|------|-----------|
| [rules/build-gate.md](rules/build-gate.md) | Before running any build gate step |
| [rules/git-discipline.md](rules/git-discipline.md) | Before any git operation |
