---
title: Work Scope Inventory
purpose: Make in-scope and out-of-scope work explicit before editing or reviewing.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Work Scope Inventory

## Purpose
Use this to coordinate constrained workstreams, parallel agents, and tasks with strict file boundaries.

## When to Use
Invoke when the user names allowed paths, excluded areas, workstream ownership, no-git rules, or concurrent writers.

## Actions
- List allowed paths exactly and normalize them before use.
- List prohibited paths and operations.
- Identify expected artifacts and any index or registry updates required inside scope.
- Check existing files in scope so generated work does not collide accidentally.
- Before final response, compare changed files against the inventory.

## XIIGen Adaptation
- For XIIGen workstreams, keep runtime code, root docs, docs/ai-skills, or other agent-owned areas out of scope unless explicitly allowed.
- If the scope includes only skills docs, verify only skill paths and skill indexes.

## Avoid
- Do not rely on memory for path boundaries.
- Do not create helper files outside the allowed tree.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The active work is limited to the authorized paths and every required in-scope artifact is accounted for.

---

## G08 universal addition from llm_mvp_core — the DENOMINATOR, the 6-count protocol, Claim Authority

The path-boundary guidance above is one half of `work-scope-inventory`. The other, stronger
half from the core standard is the **denominator discipline**: establish how many total units
exist BEFORE the first edit, so a "pipeline improved" claim cannot be made from a handful of
touched files. This is the universal home (it pairs with the mvp coverage-completeness gate).

### 1. Establish the denominator before the first line

```
scope tracking record (write before any edit):
  totalSubprojects   : count of ALL units in the relevant tree (the denominator)
  complete           : units green by their gate + evidence
  partial            : started, not green
  blocked            : cannot start (missing prerequisite)
  notStarted         : remainder
  thisSessionCovers  : the units THIS session touches (the numerator)
```

For mvp a "subproject/unit" is a NestJS module, an engine node-handler, a React feature, or a
RAG sidecar route. `totalSubprojects` comes from the monorepo root index / actual tree
enumeration (NOT a `docs/SUBPROJECT-MAP.md` — mvp does not use that file for the count).

### 2. The 6-count protocol

```
Count, this session, with real commands:
  1 total units         (e.g. enumerate server/src modules + node-handlers + client features + rag routes)
  2 complete            (npx jest per unit → 0 failed, + DNA/contract evidence)
  3 partial
  4 blocked             (prerequisite-chain BLOCKING)
  5 notStarted
  6 thisSessionCovers   (the numerator)
```

### 3. Claim Authority table

```
WITHOUT a scope record        → only UNIT-LEVEL claims allowed ("module X now passes").
                                 No pipeline/overall claim permitted.
WITH a record, numerator <20% → still unit-level; a "pipeline improved" claim is NOT authorized.
WITH a record, numerator ≥20% → pipeline-level claim allowed ONLY after the
                                 coverage-completeness gate confirms the denominator and the
                                 remaining counts. A bare "X% of files" is not authority.
```

A "the pipeline is better" claim with no denominator is the exact failure this gate stops.
Integrates with `coverage-completeness-gate` and `goal-delivery-completeness`.

### Note-only (NOT ported — stays in G12, R5)

Scope accounting for shared-model training sets (DPO row coverage) belongs to `llm_mvp_core`;
here the denominator counts product units only.
