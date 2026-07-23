---
title: Phase Planning
purpose: Break a goal into bounded phases with deliverables, gates, and handoff evidence.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Phase Planning

## Purpose
Use this to convert a broad XIIGen task into small phases that can be implemented or reviewed independently without hidden dependencies.

## When to Use
Invoke when work spans multiple files, teams, skills, or verification gates, or when the user asks for phased delivery.

## Actions
- Define each phase by outcome, not by vague activity.
- List inputs, allowed files, expected edits, and acceptance checks for each phase.
- Place prerequisite discovery before design or implementation.
- Attach a verification gate to every phase, scaled to risk and change size.
- Mark handoff evidence: changed paths, commands run, decisions made, and remaining risk.

## XIIGen Adaptation
- When a phase touches NestJS services, fabrics, providers, or factories, include checks for DataProcessResult<T> outcomes, Promise-based async shape, structured logging or local logger patterns, and provider/injection-token wiring.
- When a phase touches data/search behavior, include buildSearchFilter/buildSearchFilterFlat use, Record<string, unknown>/unknown payload boundaries, and skipped empty criteria as acceptance checks.

## Avoid
- Do not mix unrelated refactors into a phase.
- Do not use phase names that hide deliverables without concrete acceptance checks.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- Every phase has a bounded outcome, entry assumptions, exit evidence, and no hidden dependency on excluded source internals.
