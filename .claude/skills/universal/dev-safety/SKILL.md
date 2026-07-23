---
title: Dev Safety
purpose: Protect the repository, user work, secrets, and concurrent-agent boundaries during development.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Dev Safety

## Purpose
Use this before edits, before verification commands with side effects, and whenever the user gives strict workstream limits.

## When to Use
Invoke for implementation, generated artifacts, cleanup, or any operation that could overwrite, delete, move, commit, push, or expose sensitive data.

## Actions
- Verify allowed paths before writing.
- Inspect existing files before overwriting and preserve unrelated user changes.
- Avoid destructive commands unless the user explicitly requested them.
- Keep secrets, tokens, local env files, and machine-specific data out of generated output.
- Respect no-git and no-runtime-code instructions exactly.

## XIIGen Adaptation
- For XIIGen code changes, safety includes convention-preserving edits and targeted verification rather than broad risky rewrites.
- For documentation workstreams, safety includes staying in the authorized docs tree and not touching runtime code or excluded docs.

## Avoid
- Do not run git operations when prohibited.
- Do not delete or reset user work.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- All actions stayed inside authorized boundaries and no unrelated user or repository state was disturbed.
