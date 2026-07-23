---
title: Session Output Contract
purpose: Define what the final response and handoff must contain.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Session Output Contract

## Purpose
Use this to make session endings predictable, especially in multi-agent or constrained workstreams.

## When to Use
Invoke at session start to define the contract and at session end to verify the final response.

## Actions
- Capture the requested output type: files, plan, review, diagnosis, generated docs, or verification report.
- At completion, list changed artifacts and the verification performed.
- State blockers, skipped work, and residual risk plainly.
- Avoid mentioning internal process unless it affects the user.
- Keep the final answer proportional to the task size.

## XIIGen Adaptation
- For XIIGen work, include relevant convention checks only when they were part of the touched surface.
- For constrained workstreams, explicitly confirm no runtime code, git operations, or excluded docs were touched when that was required.

## Avoid
- Do not end with an ambiguous invitation instead of a status.
- Do not omit verification failures.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The final response gives status, artifacts, evidence, and limits in a compact form.
