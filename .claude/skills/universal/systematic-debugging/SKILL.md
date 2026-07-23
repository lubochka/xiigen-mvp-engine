---
title: Systematic Debugging
purpose: Debug through reproduction, evidence, hypothesis, fix, and verification.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Systematic Debugging

## Purpose
Use this for technical failures where guessing would risk churn or regressions.

## When to Use
Invoke for build errors, test failures, runtime bugs, integration failures, flaky behavior, performance surprises, or confusing generated output.

## Actions
- Reproduce or isolate the failure before changing code.
- Read the full relevant error output, stack trace, logs, or failing assertion.
- Inspect recent changes and nearby working examples.
- Create one evidence-backed hypothesis and test it with one focused change or check.
- After fixing, rerun the verification that proves the original failure is gone.

## XIIGen Adaptation
- For XIIGen services, inspect DataProcessResult<T> wrapping, Promise/AbortSignal behavior where locally present, NestJS provider or injection-token wiring, config helper defaults, structured logging, dynamic Record<string, unknown>/unknown payload handling, and buildSearchFilter/buildSearchFilterFlat construction when relevant.
- Scale verification to the change: targeted test, build, content check, or manual artifact review.

## Avoid
- Do not guess-fix under time pressure.
- Do not bundle refactors into a bug fix.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The issue is reproduced or isolated, root cause is known, the fix is focused, and verification proves the failure path is resolved.
