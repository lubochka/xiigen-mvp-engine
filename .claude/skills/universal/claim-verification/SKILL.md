---
title: Claim Verification
purpose: Make every factual claim traceable to evidence.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Claim Verification

## Purpose
Use this whenever the output names status, counts, paths, behavior, tests, source facts, or constraints.

## When to Use
Invoke before final responses, reviews, generated indexes, and any statement that could guide future work.

## Actions
- Extract factual claims from the draft output.
- For each claim, identify the supporting evidence: file read, command output, code inspection, test result, or explicit instruction.
- Remove or soften claims that cannot be verified.
- Preserve uncertainty where evidence is incomplete.
- Prefer exact counts and paths over broad assertions.

## XIIGen Adaptation
- Claims about XIIGen conventions must be backed by touched-file inspection or scoped wording.
- Claims about buildSearchFilter/buildSearchFilterFlat behavior, Record<string, unknown> payloads, or skipped empty search criteria require direct code/doc evidence when asserted as current behavior.

## Avoid
- Do not convert assumptions into facts.
- Do not cite source project behavior as XIIGen behavior.
- Do not claim universal coverage if only representative files were checked.

## Completion Signal
- The final output contains only verified claims, scoped inferences, and clearly labeled limitations.
