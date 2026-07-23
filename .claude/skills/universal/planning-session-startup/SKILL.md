---
title: Planning Session Startup
purpose: Start XIIGen work with scope, authority, evidence, and output expectations aligned.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Planning Session Startup

## Purpose
Use this at the beginning of a planning or execution session to prevent stale assumptions, wrong scope, and unverified constraints from shaping the work.

## When to Use
Invoke when a new session starts, after context compaction, when continuing a prior phase, or when the request names restricted paths, owners, or allowed outputs.

## Actions
- Restate the user goal in one sentence and separate requested outcomes from inferred convenience work.
- Identify the work mode: planning, implementation, review, documentation, verification, or handoff.
- Record explicit allowed paths, prohibited paths, no-git rules, and concurrent-agent constraints.
- Inventory required local context before proposing changes: governing instructions, relevant files, current state, and verification expectations.
- Declare the session output contract: files changed, evidence gathered, blockers, and final response shape.

## XIIGen Adaptation
- For XIIGen code work, check whether the task touches service/fabric contracts, async Promise APIs, NestJS providers or injection tokens, existing config helpers/defaults, structured logging, dynamic payload boundaries, or search filtering behavior.
- Treat DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown payloads, local logger patterns, and existing NestJS wiring as project conventions to verify when relevant.

## Avoid
- Do not begin editing or writing plans from memory when live repository context is available.
- Do not broaden scope beyond the user-authorized files or workstream.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The session has a clear goal, boundaries, required evidence, and a known verification path before execution starts.
