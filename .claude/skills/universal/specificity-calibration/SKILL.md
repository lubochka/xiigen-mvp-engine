---
title: Specificity Calibration
purpose: Set the right level of detail for instructions, plans, checks, and reports.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Specificity Calibration

## Purpose
Use this to avoid both vague guidance that cannot be executed and over-specific guidance that freezes the wrong implementation.

## When to Use
Invoke when writing reusable skills, plans, reviews, or user-facing technical explanations.

## Actions
- Match specificity to risk: exact paths and commands for verification, flexible wording for reusable judgment.
- Name project conventions exactly but avoid unnecessary implementation prescriptions.
- Replace vague words with observable criteria where completion matters.
- Remove excessive detail that belongs to source internals, runtime design, or one-off implementation.
- Check whether a future agent can use the guidance without asking what it means.

## XIIGen Adaptation
- Use precise XIIGen convention names where useful, including DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown payloads, structured logging/local logger patterns, NestJS providers/injection tokens, and existing config helpers/defaults.
- Keep guidance universal enough to apply across XIIGen layers without dictating source-derived algorithms.

## Avoid
- Do not say handle properly without defining the observable result.
- Do not force a fixed schema, architecture, or algorithm where XIIGen requires dynamic or local patterns.
- Do not include unfinished marker language or source-domain examples.

## Completion Signal
- The artifact is concrete enough to execute and general enough to remain canonical.

---

## G08 universal addition from llm_mvp_core — specificity is a MECHANICAL score, with anti-gaming

The guidance above is qualitative. The core `specificity-calibration` standard makes
specificity a *counted* property with thresholds by session type and explicit anti-gaming
rules, so "be specific" stops being a matter of taste. This is the universal home (it
extends the rich mvp `planning--specificity-calibration-SKILL.md`).

### 1. The score formula

```
SpecificityScore = count(file:line refs) + count(N-of-M claims) + count(verbatim excerpts)

file:line ref  : a real path + line, e.g. server/src/foo.service.ts:42 or
                 client/src/Foo.tsx:17 or rag/router.py:30
N-of-M claim   : a counted statement, e.g. "9 of 14 handlers register a provider",
                 "Tests: 2342 passed", produced by a command this session
verbatim       : an exact short quote of code / a rule / a compiler error
                 (e.g. "TS2345: Argument of type ...")
```

### 2. Thresholds by session type (minimum score before STOP)

```
EXECUTOR  : high — every edited file cited file:line; the failing test quoted verbatim.
PLANNING  : high — each codebase claim carries a file:line or an N-of-M from a real grep.
REVIEW    : medium-high — the gate text quoted verbatim beside the artifact line it judges.
ARCHITECT : medium — the prior decision being extended quoted verbatim with its location.
```

A self-check block before STOP states the three counts and whether the threshold is met. If
below threshold, the artifact is not specific enough to ship — add real references, do not
round up.

### 3. Anti-gaming rules (a score is only honest under these)

```
- The SAME ref counted twice = 1, not 2.
- verbatim means the EXACT characters, copied — not paraphrase, not "approximately".
- Every path must be REAL (it resolves in this repo); invented paths score 0 and are a defect.
- Every count must come from a command run in THIS session's reconnaissance, not memory,
  not a prior plan, not a stale STATE file.
- A high score built from repeated/invented/paraphrased refs is worse than a low honest one:
  it manufactures false confidence.
```

### mvp specifics

```
file:line on .ts/.tsx (server/client) and .py (rag sidecar);
verbatim from *.ts / *.spec.ts / `npx tsc --noEmit` errors / Playwright logs;
N-of-M from `npx jest` ("Tests:" line) and `grep -c` over server/src|client/src|rag.
```

### Note-only (NOT ported — stays in G12, R5)

Specificity scoring of shared-model training artifacts (DPO row provenance) belongs to
`llm_mvp_core`; here scoring covers product code/plan/review references only.
