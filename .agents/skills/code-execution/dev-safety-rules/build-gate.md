# Build Gate — Step by Step

## Gate Execution Order

Run in this exact order. Do not skip steps. Do not reorder.

### Step 1 — Verify Branch
```bash
git branch --show-current
```
Expected: branch name that is NOT `main`, `master`, or `develop`.
If main: STOP immediately. Do not run any other commands. Escalate.

### Step 2 — Server Build
```bash
cd server && npm run build 2>&1
```
Expected: process exits with code 0, no TypeScript errors in output.

Failure modes:
- `error TS2345: Argument of type X is not assignable` → fix the type mismatch
- `error TS2339: Property 'X' does not exist on type 'Y'` → check DNA-1 (probably using typed model instead of Record<string,unknown>)
- `error TS2554: Expected N arguments, but got M` → check function signature changed
- `Module not found` → check import path, check npm install ran

### Step 3 — Server Tests
```bash
cd server && npx jest --verbose 2>&1 | tail -10
```
Expected: `Tests: N passed, N total` where N ≥ 2,342. Zero failures.

Failure modes:
- Count dropped: check if a test file was accidentally deleted or renamed
- Failures: fix the engine, not the test assertion
- Timeout: check if an async test is missing `await`

### Step 4 — Client Build
```bash
cd client && npm run build 2>&1
```
Expected: process exits with code 0. Vite build succeeds.

Common failures:
- TypeScript errors in React components: fix types
- Missing import: check component tree for broken imports after engine changes

### Step 5 — Client Tests
```bash
cd client && npx jest --verbose 2>&1 | tail -10
```
Expected: `Tests: N passed, N total` where N ≥ 220. Zero failures.

## Gate Pass/Fail Recording

After each gate, record in session notes:
```
Gate result: [PASS / FAIL]
Server: [N] tests passed
Client: [N] tests passed
Any new failures: [list or "none"]
```

## When Gate Fails

1. DO NOT proceed to the next phase
2. Fix the failure in the current context
3. Re-run the complete gate from Step 1
4. Gate must pass fully before ⛔ STOP

If gate cannot be fixed within session: record failure in STATE-Pn.json with `status: "GATE_FAILED"` and escalate.
