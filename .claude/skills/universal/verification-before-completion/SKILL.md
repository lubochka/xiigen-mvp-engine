---
title: Verification Before Completion
purpose: Require fresh evidence before any completion claim.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Verification Before Completion

## Purpose
Use this to prevent stale, assumed, or aspirational status from becoming the session result.

## When to Use
Invoke before saying done, complete, passing, created, fixed, synced, or ready.

## Actions
- Identify the exact claim to verify.
- Choose the smallest reliable verification for that claim: file existence, content search, parser check, targeted test, build, or manual readback.
- Run or perform the verification after the final edit.
- Read the result and compare it to the claim.
- Report the evidence and any limits honestly.

## XIIGen Adaptation
- For XIIGen runtime changes, use targeted build/tests when appropriate and inspect conventions affected by the change.
- For docs-only skills work, use file counts, path checks, content greps, and Markdown readback as verification evidence.

## Avoid
- Do not rely on earlier command output after additional edits.
- Do not use likely, should, or appears as a completion claim.
- Do not run broad verification that violates the user workstream or wastes time when a precise check is enough.

## Completion Signal
- Every completion claim in the final response is backed by fresh verification evidence.
