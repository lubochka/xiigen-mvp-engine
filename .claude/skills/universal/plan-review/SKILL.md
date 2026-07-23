---
title: Plan Review
purpose: Review a proposed plan for correctness, scope fit, risks, and verifiable completion.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Plan Review

## Purpose
Use this before executing a plan or handing it to another agent so weak assumptions are caught while they are cheap to fix.

## When to Use
Invoke after drafting a plan, before implementation, before multi-agent handoff, or when a plan changes due to new evidence.

## Actions
- Check that every user requirement appears in the plan or is explicitly ruled out with a reason.
- Confirm the plan uses only authorized files and avoids prohibited areas.
- Verify ordering: reconnaissance before edits, contract changes before dependents, tests/docs after behavior changes.
- Look for missing gates, rollback options, and ambiguous completion language.
- Record review findings as required fixes, optional improvements, or accepted risks.

## XIIGen Adaptation
- For XIIGen plans, ensure service/API work includes DataProcessResult<T> outcomes, Promise/AbortSignal behavior where locally present, NestJS provider or injection-token wiring, existing config helpers/defaults, structured logging, and test impact where relevant.
- For search or persistence plans, confirm buildSearchFilter/buildSearchFilterFlat behavior and Record<string, unknown>/unknown payload assumptions are not replaced by fixed schemas.

## Avoid
- Do not approve a plan because it sounds plausible; bind it to files, commands, and evidence.
- Do not reopen settled user constraints unless the user asks.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The plan is executable, scoped, evidence-backed, and any remaining risk is named before work proceeds.
