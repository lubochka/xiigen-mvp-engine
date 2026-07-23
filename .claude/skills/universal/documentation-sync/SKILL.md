---
title: Documentation Sync
purpose: Keep docs, indexes, and guidance aligned with actual delivered behavior and conventions.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Documentation Sync

## Purpose
Use this when docs are the deliverable or when code changes alter public contracts, setup, behavior, or operational expectations.

## When to Use
Invoke after creating skills, changing APIs, altering conventions, or updating user-facing behavior.

## Actions
- Identify docs that must reflect the change: indexes, skill lists, README sections, API notes, or operational guidance.
- Update only authorized documentation surfaces.
- Use exact names for files, slugs, commands, and conventions.
- Remove stale or conflicting statements discovered during the task.
- Verify links, paths, and counts after edits.

## XIIGen Adaptation
- Reference XIIGen conventions generically and accurately: DataProcessResult<T>, buildSearchFilter/buildSearchFilterFlat, Record<string, unknown>/unknown dynamic payloads, structured logging or local logger patterns, NestJS providers and injection tokens, and existing config helpers/defaults.
- Do not document source project internals as XIIGen requirements.

## Avoid
- Do not touch root docs, docs/ai-skills, or runtime docs when the workstream excludes them.
- Do not leave generated artifacts unlisted in an index.
- Do not add unfinished marker language to canonical docs.

## Completion Signal
- The relevant authorized docs match the created or changed artifacts and no stale contradictions remain in scope.
