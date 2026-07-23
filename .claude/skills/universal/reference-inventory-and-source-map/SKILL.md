---
title: Reference Inventory and Source Map
purpose: Trace every plan/review claim to an exact source, and gate by license, disjoint evidence, and population proof.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Reference Inventory and Source Map

## Purpose
Use this so no claim in a plan, review, or report is unsourced, no cited library/artifact is
asserted to exist without proof, and no external material is used without a license check.

## When to Use
Invoke when authoring or reviewing any plan/review/report that states facts about the
codebase, cites a library or artifact, or imports external material.

## Why this exists for mvp
Today mvp has only a FLOW-specific source map (`flow-prep-library/A-TO-B-SOURCE-MAP*.md`).
There is no UNIFIED source-map gate over the whole TS monorepo, and no explicit
license/source boundary for Anthropic/OpenAI/Google SDK material. This skill is that unified
gate; the A-TO-B map remains a flow-scoped specialization of it.

---

## G08 universal content from llm_mvp_core — the unified source map

### 1. Every claim traces to a source row

Each factual claim in a plan/review/report gets a row:

```
| claim | source_id | path | line_range | source_layer |
```

```
source_layer (provenance, NOT authority):
  IMPLEMENTATION  — server/src/**.ts, client/src/**.tsx, rag/**.py  (actual code)
  TEST            — **/*.spec.ts (Jest), **/*.e2e.ts (Playwright), rag/test_*.py (pytest)
  DESIGN_DOC      — a plan / manifest / .xiigen wiki-domain doc (intent, not proof)
  RECONCILIATION  — a STATE / registry / index file asserting status
```

A `DESIGN_DOC` row may NOT be reported as an `IMPLEMENTATION` fact. When layers disagree,
code (`IMPLEMENTATION`/`TEST`) wins and the disagreement is itself a finding.

### 2. Benchmark / foreign / transcript material is evidence-only

Another model's plan, an attached benchmark, a pasted transcript, an old plan, a STATE file,
or a sub-agent packet is `allowed_use=evidence_only` and `may_create_requirement=false`
unless the current human instruction explicitly reactivates a specific line. A benchmark
detail enters the plan only through an explicit accept/reject/defer row, never silently.

### 3. License / source gate (mvp)

External material used to justify a design or, especially, to seed any shared learning, must
pass a license check before use:

```
PREFERRED for shared/common use : MIT / Apache-2.0 (record upstream URL + LICENSE reference).
NOT common-training material     : unknown-license, GPL, or private/user material — evidence-only
                                   or user-adaptive/private, never common, without explicit approval.
SDK material (Anthropic/OpenAI/Google) : cite the SDK's own license + the exact API surface used;
                                   do NOT copy SDK-licensed source text into mvp skills/code as if
                                   it were mvp-owned. Route through the fabric interface, not a copy.
```

Private user prompts/chats/local project files train the adaptive/user leg only, never the
common leg, unless explicitly redacted and approved.

### 4. Disjoint evidence

A claim and the evidence that proves it must not be the same artifact. "The plan says X, and
the proof is that the plan says X" is circular. Proof for an `IMPLEMENTATION` claim is code or
a test, from a different source row than the claim's own statement.

### 5. Population proof for named artifacts/libraries

When a claim names an artifact set or library ("the wiki-domain docs cover N topics", "library
L is used across the server"), prove the population with a real command this session:

```
grep -rc "<symbol>" server/src | <count>            # usage population
find rag -name "test_*.py" | wc -l                  # test population
ls .xiigen/wiki-domain/documentation/*.md | wc -l   # generated-doc population (hundreds — count it)
```

A named-population claim without a count is unsupported. For `.xiigen/wiki-domain` material
(hundreds of auto-generated `.md`), population proof is mandatory before any "covers/complete"
claim.

## mvp evidence specifics
- `path` + `line_range` on `.ts` / `.tsx` (server/client) and `.py` (rag sidecar).
- Verify counts with `grep -rc`, `npx jest` ("Tests:" line), `find ... | wc -l`.
- The `.xiigen/wiki-domain` manifests are `DESIGN_DOC`/third-party-derived evidence, not
  `IMPLEMENTATION` of mvp behavior.

## Avoid
- Do not state a codebase fact without a `path`+`line_range` row.
- Do not promote a `DESIGN_DOC`/benchmark line into a requirement without an explicit accept row.
- Do not seed common learning from unknown/GPL/private material.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains,
  source classes, or source-specific paths.

## Completion Signal
- Every claim has a source row, every named population has a count, license/disjoint/population
  gates pass, and benchmark material is quarantined as evidence-only.

## Note-only (NOT ported — stays in G12, R5)
The trainable-model source roots (DPO pair roots, checkpoint/training-data pointers) are owned
by `llm_mvp_core`; here the source map records the `.xiigen` manifest/locator pointer to the
shared model, not its training-data inventory.
