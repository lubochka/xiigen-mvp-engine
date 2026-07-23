# Rule 4: Boundary Data Lifecycle

## What It Catches

Data shape changes at component boundaries — AF station input ≠ output, fabric provider input ≠ DataProcessResult shape, or a field that exists at one station is absent at the next.

## The Problem

Each AF station transforms `StationInput` and produces `StationOutput`. Each fabric provider accepts a query and returns `DataProcessResult<T>`. At these boundaries, the data shape can change in ways that downstream consumers do not expect. The bug is often at the boundary — not in the consuming code.

## XIIGen Boundary Map

```
AF-2 Planning     → StationInput  → AF-4 RAG Context
AF-4 RAG Context  → StationInput  → AF-1 Genesis      (skill blocks attached here)
AF-1 Genesis      → StationOutput → AF-9 Judge        (generated code + metadata)
AF-9 Judge        → StationOutput → AF-11 Feedback    (quality scores + verdict)

Fabric boundary:
  AF station → FabricProvider.execute(query) → DataProcessResult<T>
                                                   ├── .data  (the result)
                                                   ├── .success (bool)
                                                   └── .error  (if failed)
```

## Checklist

```
☐ What is the exact shape of StationInput entering this station?
☐ What fields does this station READ from StationInput?
☐ What fields does this station WRITE to StationOutput?
☐ Does the NEXT station read any field this station writes? Confirm field name matches exactly.
☐ For fabric calls: is the return type DataProcessResult<T> or a raw type?
☐ Is .data accessed before checking .success? (accessing .data when .success=false → undefined)
☐ Does this station mutate StationInput in place, or create a new object?
☐ Is there a field that is Optional in the type but assumed present in downstream code?
```

## Common Boundary Failures

**Failure 1: Field at wrong level**
AF-4 writes `output.qualityScores = [...]` (top-level).
AF-9 reads `input.context.qualityScores` (nested). → undefined.
Fix: align the field path. One write, one read, same path.

**Failure 2: Raw type instead of DataProcessResult**
Provider returns `{ hits: [] }` instead of `DataProcessResult<SearchResult>`.
Caller reads `.data.hits` → `.data` is undefined. No error raised.
Fix: provider must always return `DataProcessResult<T>`. Audit with Rule 12.

**Failure 3: Optional field treated as required**
`StationInput.archetype` is `string | undefined` but selector assumes `string`.
When archetype is absent, selector falls through to wrong skill set.
Fix: explicit guard — `if (!input.archetype) return DataProcessResult.failure(...)`.

**Failure 4: Mutation side effect**
Station A mutates `StationInput.context` in place.
Station B (running in parallel via `Promise.all`) reads the mutated context.
Fix: always clone before mutation in concurrent paths.

## Trace Protocol

1. Find the write point: where is the field set?
2. Find the read point: where is the field consumed?
3. Log both: confirm value written equals value read
4. Check for mutation in concurrent paths
5. Check for Optional typing — does the consumer guard against undefined?
