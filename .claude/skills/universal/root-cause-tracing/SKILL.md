---
title: Root Cause Tracing
purpose: Trace a symptom backward through evidence until the real cause is identified.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Root Cause Tracing

## Purpose
Use this to avoid treating symptoms as causes during bug fixes, test failures, data issues, and integration problems.

## When to Use
Invoke when behavior is wrong, tests fail, data is missing, logs disagree with expectations, or multiple fixes have not resolved the issue.

## Actions
- State the symptom precisely with observed evidence.
- Trace backward through inputs, transformations, dependencies, configuration, persistence, and outputs.
- Compare broken behavior with a nearby working example in the same project.
- Form one hypothesis at a time and test it with the smallest reliable check.
- Only fix after the root cause is supported by evidence.

## XIIGen Adaptation
- Common XIIGen trace points include DataProcessResult<T> status propagation, Promise/AbortSignal flow where locally present, NestJS provider or injection-token wiring, config helper defaults, structured logging evidence, Record<string, unknown>/unknown serialization, and buildSearchFilter/buildSearchFilterFlat empty-value behavior.
- Use local XIIGen code as the reference, not source project internals.

## Avoid
- Do not stack speculative fixes.
- Do not stop at the first visible exception if upstream data or config caused it.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The cause is evidence-backed, the fix targets that cause, and verification checks the original symptom.
