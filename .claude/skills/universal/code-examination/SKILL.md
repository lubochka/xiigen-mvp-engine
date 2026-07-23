---
title: Code Examination
purpose: Read code deeply enough to understand behavior before changing or reviewing it.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Code Examination

## Purpose
Use this whenever the task depends on current implementation details.

## When to Use
Invoke before edits, reviews, refactors, bug fixes, interface changes, or tests that assume code behavior.

## Actions
- Identify entry points, interfaces, implementations, tests, and configuration related to the behavior.
- Read complete relevant methods or components rather than isolated search hits.
- Trace data and control flow across boundaries.
- Note local patterns and invariants before proposing changes.
- Distinguish observed code facts from inferred intent.

## XIIGen Adaptation
- When examining XIIGen code, check affected conventions directly: DataProcessResult<T>, NestJS providers and injection tokens, existing config helpers/defaults, structured logging or local logger patterns, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown payloads, and skipped empty search criteria.
- Prefer repository-local examples over source project examples.

## Avoid
- Do not edit based on filename search alone.
- Do not assume a fixed schema or architecture when code uses dynamic objects or local abstractions.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The relevant behavior and local patterns are understood well enough to make a scoped change or review finding.
