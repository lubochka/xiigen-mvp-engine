---
title: Coverage Completeness Gate
purpose: Ensure all requested items, surfaces, and edge obligations are covered before completion.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Coverage Completeness Gate

## Purpose
Use this when a task has a list of deliverables, multiple files, or a high risk of partial completion being mistaken for done.

## When to Use
Invoke before final response, before handoff, and after generating repeated artifacts such as skill files, tests, or docs.

## Actions
- Build a checklist directly from the user request and governing instructions.
- Compare produced artifacts against the checklist by exact slug, path, feature, or behavior.
- Check for missing, duplicate, or misnamed outputs.
- Confirm each output has meaningful content rather than an empty wrapper.
- Record any intentionally omitted item with the authority that allowed omission.

## XIIGen Adaptation
- For XIIGen convention coverage, verify only relevant touched surfaces: services, async APIs, NestJS providers and injection tokens, configuration helpers, structured logging, persistence, search, tests, and docs.
- When generating skill docs, confirm every canonical slug has one SKILL.md and is listed in the index.

## Avoid
- Do not count a partially created directory as a completed skill.
- Do not substitute broad summary language for item-by-item coverage.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- Every required item is present, correctly named, and either verified or explicitly reported as blocked.
