---
title: Subproject Examination
purpose: Pre-implementation gate — produce the three examination documents and a decision tree before the first line of code.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Subproject Examination

## Purpose
Use this before implementing a new or growing module/feature so that the infrastructure
decision, the missing-infrastructure build specs, and the learning impact are all known and
approved before any code exists.

## When to Use
Invoke at the start of any non-trivial new module/feature/RAG-route, before the first file is
written.

## Why this exists for mvp
mvp's pre-implementation examination is fragmented across `planning--flow-completeness-checker`,
`flow-ui-examination-protocol`, `SUB-EPISODE-EXAMINATION-GUIDANCE`, and per-entity protocols —
all flow/ui-specific. This is the general module/feature examination gate (any unit, not only a
FLOW), TS-adapted.

---

## G08 universal content from llm_mvp_core — three documents + decision tree (it is a tree, not a checklist)

Before the first line of code, produce three documents:

### Document 1 — MASTER (infrastructure decision tree + capability contract + phase plan)

```
Infrastructure decision tree (answer in order; the answer routes the build):
  Q1 Does a NestJS provider under an existing interface already satisfy this?  → ADAPTATION (build a provider)
  Q2 Else, does a one-method EXTENSION of an existing service satisfy it?      → EXTENSION
  Q3 Else, is a NEW module + contract + provider + spec required?              → NEW COMPONENT
  Q4 Does it touch retrieval? then the rag/ sidecar contract is a tree node    → discover it before deciding
Capability contract : inputs, outputs, the typed DataProcessResult<T>/Result<T> shape, failure modes.
Phase plan          : ordered phases, each with a measurable Gate-B.
```

A flat checklist is not a decision tree. The tree's answers determine the build shape; record
which branch was taken and why the earlier branches did not apply.

### Document 2 — MISSING-INFRASTRUCTURE (BUILD specs)

For each prerequisite that does NOT yet exist, a BUILD spec: the interface/DTO to define, the
provider to implement, the DI registration target (`*.module.ts`), and the `*.spec.ts` to add.
A `BLOCKER` here is a STOP — the examination does not pass while a required prerequisite has no
build spec.

### Document 3 — LEARNING-SPEC

What this unit teaches/changes for the adaptive layer, and (if retrieval-touching) what it adds
to the domain model that the `.xiigen` wiki-domain manifests track. If nothing is learned,
state that explicitly — do not leave it blank.

### CHECK commands (mvp)

```
build       : cd server && npm run build         → 0 errors
types       : npx tsc --noEmit                    → 0 errors
provider?   : grep -rn "implements I<X>" server/src ; grep -rn "<X>" server/src/**/*.module.ts
interface?  : grep -rn "interface I<X>" server/src client/src
retrieval?  : grep -rn "APIRouter\|@app\." rag/   (discover the sidecar contract before deciding)
Gate-B      : npx jest --testPathPattern=<unit>   → N passed, 0 failed
UI unit     : npx playwright test <spec>          → passed   (mvp HAS a frontend)
```

### Approval before code

The three documents are the input to approval, not permission to start. No implementation
begins until the MASTER decision-tree branch, the MISSING-INFRASTRUCTURE specs, and the
LEARNING-SPEC are reviewed. A `BLOCKER` halts; it is not deferrable.

## Avoid
- Do not start coding before the three documents exist and are approved.
- Do not collapse the decision tree into a yes/no checklist.
- Do not mark examination passed while a required prerequisite has no build spec (BLOCKER).
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains,
  source classes, or source-specific paths.

## Completion Signal
- MASTER (tree + contract + phases), MISSING-INFRASTRUCTURE (build specs), and LEARNING-SPEC
  exist, every Gate-B is measurable, no BLOCKER remains, and approval to code is recorded.

## Note-only (NOT ported — stays in G12, R5)
The trainable-unit examination (checkpoint/locator/fresh-load/continue-training lifecycle for
shared models) belongs to `llm_mvp_core`; here LEARNING-SPEC stops at the `.xiigen` manifest
contract to the shared model.
