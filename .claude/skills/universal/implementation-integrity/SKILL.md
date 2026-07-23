---
title: Implementation Integrity
purpose: Ensure implementation work is real, scoped, convention-aligned, and not cosmetic.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Implementation Integrity

## Purpose
Use this when editing code or reviewing code changes for behavioral completeness.

## When to Use
Invoke before and after implementation, especially for services, APIs, data access, queues, AI providers, flow execution, RAG, chat, notifications, and security surfaces.

## Actions
- Confirm the change addresses the requested behavior at the correct layer.
- Read nearby patterns and use existing project style before introducing new abstractions.
- Reject no-op wrappers, hidden stubs, swallowed failures, and broad catch blocks without meaningful DataProcessResult errors.
- Check dependency boundaries, async flow, and cancellation propagation.
- Verify that tests or targeted checks exercise the changed behavior.

## XIIGen Adaptation
- Service and fabric methods should return DataProcessResult<T> where local contracts use it and handle expected/business outcomes through result failures rather than thrown exceptions.
- Preserve Promise-based async APIs and any existing AbortSignal or similar local control instead of introducing a new async shape.
- Use existing config helpers/defaults, structured logging or local logger patterns, NestJS providers/injection tokens, Record<string, unknown>/unknown dynamic payloads, and buildSearchFilter/buildSearchFilterFlat where the touched surface requires them.

## Avoid
- Do not change assertions, interfaces, or schemas just to make code compile.
- Do not introduce fixed document schemas for dynamic object storage.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The implementation performs the requested behavior, follows affected XIIGen conventions, and has supporting verification.
