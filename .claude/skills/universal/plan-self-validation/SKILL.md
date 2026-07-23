---
title: Plan Self Validation
purpose: Force the author of a plan to test it against requirements before presenting or executing it.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Plan Self Validation

## Purpose
Use this as a private quality gate for plans so contradictions, missing steps, and unverifiable claims are removed early.

## When to Use
Invoke after plan drafting and before asking for approval, executing, or assigning work.

## Actions
- Map each requested deliverable to at least one plan step and one completion check.
- Ask what would make the plan fail: missing context, forbidden paths, concurrent edits, unavailable tooling, or ambiguous ownership.
- Check that each claim can be verified with a file read, command, test, or explicit user confirmation.
- Remove decorative process language that does not change execution.
- Revise the plan until it is shorter, stricter, and easier to audit.

## XIIGen Adaptation
- When planning XIIGen implementation, validate that conventions are placed where they matter rather than pasted everywhere.
- Include DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown payloads, structured logging or local logger patterns, NestJS providers/injection tokens, and existing config helpers/defaults only for affected surfaces.

## Avoid
- Do not treat plan self-validation as final verification of code or docs.
- Do not keep steps that cannot be observed or tested.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The plan has no orphan requirements, no unverifiable completion claims, and no unnecessary source-derived assumptions.
