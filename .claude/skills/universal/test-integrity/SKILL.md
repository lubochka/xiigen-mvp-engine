---
title: Test Integrity
purpose: Keep tests behavior-focused, honest, and resistant to false confidence.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Test Integrity

## Purpose
Use this when adding, changing, reviewing, or relying on tests.

## When to Use
Invoke for bug fixes, behavior changes, regression coverage, test failures, or any claim that tests prove completion.

## Actions
- Understand what behavior the test is supposed to protect before editing it.
- Prefer testing public behavior and contracts over internal mechanics.
- Do not weaken assertions to match broken behavior.
- For bug fixes, reproduce the failure or document why reproduction is not available.
- Run the smallest relevant test set after test edits and read the result.

## XIIGen Adaptation
- Tests for services should verify DataProcessResult status and data/error semantics, not just non-null results.
- Where relevant, test local async controls such as AbortSignal pass-through, NestJS provider or injection-token wiring, config helper defaults, logging-adjacent behavior without depending on log text, dynamic Record<string, unknown>/unknown payload handling, and buildSearchFilter/buildSearchFilterFlat empty-value behavior.

## Avoid
- Do not delete, skip, or relax tests without explicit authority.
- Do not claim full coverage from a narrow test.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- Tests remain meaningful, behavior-aligned, and their results support the claims made.
