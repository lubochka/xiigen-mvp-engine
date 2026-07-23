---
name: Defense-in-Depth Validation
description: Validate at every layer data passes through to make bugs impossible
when_to_use: when invalid data causes failures deep in execution, requiring validation at multiple system layers
version: 1.1.0
languages: all
---

# Defense-in-Depth Validation

## Overview

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed by different code paths, refactoring, or mocks.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

## Why Multiple Layers

Single validation: "We fixed the bug"
Multiple layers: "We made the bug impossible"

Different layers catch different cases:
- Entry validation catches most bugs
- Business logic catches edge cases
- Environment guards prevent context-specific dangers
- Debug logging helps when other layers fail

## XIIGen idiom: return Fail, do NOT throw (universal)

> The `throw new Error(...)` snippets below are illustrative of WHERE each layer
> sits. In XIIGen production code the engine standard is **return a typed
> `DataProcessResult<T>` failure with an error code, never throw for business
> logic** (DNA Rule 1, fabric-first). Each échelon returns an error result; the
> caller inspects `result.isSuccess` / `result.errorCode` and short-circuits.

```typescript
import { DataProcessResult } from '../kernel/data-process-result';

// Layer 1 entry-point validation, XIIGen-correct form (NestJS controller/service):
createProject(name: string, workingDirectory: string): DataProcessResult<Project> {
  if (!workingDirectory || workingDirectory.trim() === '') {
    return DataProcessResult.fail<Project>('workingDirectory cannot be empty', 'WORKDIR_EMPTY');
  }
  if (!existsSync(workingDirectory)) {
    return DataProcessResult.fail<Project>(`workingDirectory does not exist: ${workingDirectory}`, 'WORKDIR_MISSING');
  }
  // ... proceed → return DataProcessResult.ok(project)
}
```

Each of the four layers below follows the SAME rule: on a guard hit, **return a
`DataProcessResult` failure carrying a specific error code** so the failure is
typed, testable, and tenant-safe — not an exception that unwinds the stack.

## The Four Layers

### Layer 1: Entry Point Validation
**Purpose:** Reject obviously invalid input at API boundary

```typescript
function createProject(name: string, workingDirectory: string) {
  if (!workingDirectory || workingDirectory.trim() === '') {
    throw new Error('workingDirectory cannot be empty');
  }
  if (!existsSync(workingDirectory)) {
    throw new Error(`workingDirectory does not exist: ${workingDirectory}`);
  }
  if (!statSync(workingDirectory).isDirectory()) {
    throw new Error(`workingDirectory is not a directory: ${workingDirectory}`);
  }
  // ... proceed
}
```

### Layer 2: Business Logic Validation
**Purpose:** Ensure data makes sense for this operation

```typescript
function initializeWorkspace(projectDir: string, sessionId: string) {
  if (!projectDir) {
    throw new Error('projectDir required for workspace initialization');
  }
  // ... proceed
}
```

### Layer 3: Environment Guards
**Purpose:** Prevent dangerous operations in specific contexts

```typescript
async function gitInit(directory: string) {
  // In tests, refuse git init outside temp directories
  if (process.env.NODE_ENV === 'test') {
    const normalized = normalize(resolve(directory));
    const tmpDir = normalize(resolve(tmpdir()));

    if (!normalized.startsWith(tmpDir)) {
      throw new Error(
        `Refusing git init outside temp dir during tests: ${directory}`
      );
    }
  }
  // ... proceed
}
```

### Layer 4: Debug Instrumentation
**Purpose:** Capture context for forensics

```typescript
async function gitInit(directory: string) {
  const stack = new Error().stack;
  logger.debug('About to git init', {
    directory,
    cwd: process.cwd(),
    stack,
  });
  // ... proceed
}
```

## Applying the Pattern

When you find a bug:

1. **Trace the data flow** - Where does bad value originate? Where used?
2. **Map all checkpoints** - List every point data passes through
3. **Add validation at each layer** - Entry, business, environment, debug
4. **Test each layer** - Try to bypass layer 1, verify layer 2 catches it

## Example from Session

Bug: Empty `projectDir` caused `git init` in source code

**Data flow:**
1. Test setup → empty string
2. `Project.create(name, '')`
3. `WorkspaceManager.createWorkspace('')`
4. `git init` runs in `process.cwd()`

**Four layers added:**
- Layer 1: `Project.create()` validates not empty/exists/writable
- Layer 2: `WorkspaceManager` validates projectDir not empty
- Layer 3: `WorktreeManager` refuses git init outside tmpdir in tests
- Layer 4: Stack trace logging before git init

**Result:** All 1847 tests passed, bug impossible to reproduce

## Key Insight

All four layers were necessary. During testing, each layer caught bugs the others missed:
- Different code paths bypassed entry validation
- Mocks bypassed business logic checks
- Edge cases on different platforms needed environment guards
- Debug logging identified structural misuse

**Don't stop at one validation point.** Add checks at every layer.

## One Échelon → One Failing Test (universal, ties to bug-to-tests)

Each layer is added test-first. Before you add a guard, write the test that
fails because the guard is missing; then add the guard and watch it pass.

| Échelon | Test that must FAIL before the guard exists | Asserts on |
|---|---|---|
| Layer 1 entry-point | feed empty/invalid input at the boundary | `result.isSuccess === false` AND `result.errorCode === 'WORKDIR_EMPTY'` |
| Layer 2 business-logic | feed input that is shape-valid but violates an operation invariant | specific `result.errorCode` for that invariant |
| Layer 3 environment guard | run the destructive op with `NODE_ENV='test'` outside the temp root | guard returns Fail / refuses; nothing is written outside `tmpdir()` |
| Layer 4 debug instrumentation | trigger the path and assert the debug record (directory, cwd, stack) is captured | log/record contains the forensic context |

Rules:
- One test case **per** échelon (do not collapse four guards into one assertion).
- Assert on the **specific error code**, not merely `isSuccess === false`
  (behavioral-assertion-gate; mirrors `test-integrity` Rule 6).
- Changing or removing an échelon's assertion needs Luba approval (Iron Rule,
  see `bug-to-tests`).

## Explicit Data-Flow Checkpoint Map (required artifact)

Before adding layers, write the data-flow with EVERY checkpoint marked. The map
is the proof that no path bypasses a guard.

```
entry DTO ──▶ [L1 controller/service guard] ──▶ application service
   │                                                    │
   ▼                                              [L2 invariant guard]
 (rejected: WORKDIR_EMPTY)                               │
                                                         ▼
                                         infrastructure / fabric call
                                                         │
                                                 [L3 env guard: test vs prod]
                                                         │
                                                 [L4 debug: dir, cwd, stack]
                                                         ▼
                                                   real side-effect
```

For every arrow, confirm: can any caller reach the next node WITHOUT crossing the
checkpoint? If yes, the bug is still reachable — add the missing guard (and its
failing test) on that path. Map all callers (blast-radius) before declaring the
bug structurally impossible.
