---
title: Goal Delivery Completeness
purpose: Confirm the delivered result satisfies the actual user goal, not only the easiest visible subset.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Goal Delivery Completeness

## Purpose
Use this before marking any work complete, especially when the goal combines creation, adaptation, verification, and constraints.

## When to Use
Invoke before final response or before handing off completed work.

## Actions
- Restate the user goal and compare it with actual artifacts or behavior.
- Confirm that constraints were obeyed as part of delivery, not treated as side notes.
- Check hidden obligations: index updates, naming consistency, verification, and blocked-item disclosure.
- Differentiate completed work from remaining recommendations.
- Only claim completion for work supported by fresh evidence.

## XIIGen Adaptation
- For XIIGen implementation goals, completion may require conventions, tests, docs, and configuration checks depending on touched files.
- For documentation-only goals, completion may require path/count/content verification rather than runtime tests.

## Avoid
- Do not claim the goal is done because a command succeeded if requested artifacts are missing.
- Do not complete a goal by changing unauthorized files.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains, source classes, or source-specific paths.

## Completion Signal
- The final state matches the requested goal, all constraints are satisfied, and evidence is available.
