---
title: Session Execution Log
purpose: Keep a compact trace of decisions, actions, and evidence during longer work.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Session Execution Log

## Purpose
Use this as a working discipline for multi-step tasks; persist a log only when the user or repository workflow asks for one.

## When to Use
Invoke when work spans multiple phases, many files, repeated verification, or agent handoff.

## Actions
- Track major actions in order: context read, edits made, verification run, issues found, decisions made.
- Record exact artifact paths and verification commands.
- Update the log when scope changes or blockers appear.
- Keep entries factual and short.
- Use the log to assemble the final response and handoff evidence.

## XIIGen Adaptation
- For XIIGen work, record convention checks that materially affected decisions.
- When no file log is requested, keep the trace internal and summarize only the useful evidence to the user.

## Avoid
- Do not create extra log files in prohibited paths.
- Do not treat the log as a substitute for actual verification.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The session has enough traceability to explain what changed, why, and how it was verified.
