---
name: api-shape-verification
version: "1.0.0"
sk_number: SK-426
priority: MANDATORY
load_order: 26
---

# API Shape Verification Skill

For every import in a planned test file, verifies the export shape, parameter types, and return type from the actual source file before any test code is written. Front-loads API discovery to G0 instead of find-and-fix during execution.

## When to Invoke

- At G0, after infrastructure discovery identifies the source files to be imported
- Before writing any test file that imports from engine source files
- After any session that had WF discovery rate > 120% (indicates API assumptions were wrong)

## Verification Protocol

For each planned import:

```bash
# Step 1: Find the export — do NOT assume function vs const
grep -n "export.*SymbolName\|SymbolName" source_file.ts | head -10

# Step 2: For methods/functions — confirm param order and types
grep -n "async SymbolName\|SymbolName(" source_file.ts | head -5

# Step 3: For getters — confirm getter vs method
grep -n "get SymbolName\b" source_file.ts | head -5
```

## Verification Table

Produce this table before writing any test code:

| Symbol | Source File | Export Shape | Params | Return Type | Notes | Verified |
|--------|-------------|-------------|--------|-------------|-------|---------|
| `FlowGenerator` | `engine/flow-generator.ts` | class | `{aiProvider}` | instance | constructor options | ✅ |
| `generate` | method on FlowGenerator | async method | `(contract, tenantId)` | `Promise<DataProcessResult>` | order matters | ✅ |
| `generationHistory` | method on FlowGenerator | getter | none | `Array<Record<string,unknown>>` | NOT a method call | ✅ |
| `createT44Contract` | `engine-contracts/sample-contracts.ts` | ? | `()` | `EngineContract` | grep to confirm | ⬜ |

## Rules

1. **Never use `^export function`** — misses `export const`, `export class`, default exports, arrow functions
2. Use `grep "export.*SymbolName"` without anchors to catch all export forms
3. If symbol not found in the named file: search the barrel index (`index.ts`) for re-exports
4. If shape differs from plan: create a FIX-AT-WRITE entry with the real shape
5. If symbol not found at all: **STOP** — do not write the test, report to Luba
6. Complete the full verification table before writing the first line of test code

## XIIGen Discovery History

| Session | WF Fixes | Type | Root Cause |
|---------|----------|------|-----------|
| S2 WF-1 | `useFlowDefinition` initial state | API assumption | Plan assumed eager load |
| S2 WF-2 | `useModelPerformance` import path | API assumption | Wrong file extension |
| S3 WF-2 | `getQueueDepth` sync vs async | API assumption | Plan assumed async |
| S3 WF-3 | `ElasticsearchProvider` constructor | API assumption | Wrong second arg type |
| S3 WF-5 | `dequeue` second param type | API assumption | Plan used string not number |
| S3 WF-6 | `getSecret` return envelope | API assumption | Plan accessed wrong field |

All 6 were API shape discoveries. This skill would have caught them at G0.
