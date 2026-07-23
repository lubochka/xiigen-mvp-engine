---
name: plan-restructure
version: "1.0.0"
sk_number: SK-564
priority: HIGH
load_order: 8
category: planning
contexts: ["web-session", "claude-code"]
origin: ported from llm_mvp_core/docs/skills/plan-restructure-SKILL.md (Universal-Skills refresh, UpdateUniversalSkills)
---

# plan-restructure — Delta-restructure an existing plan, do not rewrite it

> Ported universal standard. The mvp planning library had no explicit delta-restructure
> skill — when new infrastructure was added (new engine-contracts, QUEUE FABRIC, new
> SK-43x), the risk was rewriting correct SESSION phases from scratch and breaking
> downstream assumptions. This skill replaces full rewrites with a controlled delta.
> TS adaptation for this mvp project: applies to FLOW-XX-REFERENCE-PLAN / SESSION files;
> preserve correct phases, add only new gates; Gate B stays `npx jest` / `tsc`.

## When to Invoke

- When an existing, partially-correct plan must absorb a new requirement, contract,
  fabric layer, or skill — instead of being rewritten.
- After a correction that names a specific plan file to amend (not replace).

## The rule

Read the WHOLE plan as if you were about to execute it BEFORE editing a single line.
Then produce two explicit lists and change only what List 2 names.

```
List 1 — WHAT DOES NOT CHANGE
  Every phase/section/gate that is still correct and must be preserved verbatim.
  These keep their numbers, their Gate B, their SESSION files, their order.

List 2 — WHAT CHANGES
  Every phase/section/gate that is added, edited, or re-ordered, and WHY.
  For each: the exact insertion point, the exact new content, and the new Gate B.
```

Only List 2 items are touched. List 1 is frozen. A restructure that re-numbers or
rewrites a List 1 phase has failed — it reintroduced risk the delta was meant to avoid.

## Procedure

```
1. Read the full plan top to bottom (execution simulation; no edits yet).
2. Identify the trigger (new contract / QUEUE FABRIC / new SK-43x / new requirement).
3. Build List 1 (frozen) and List 2 (delta). Record both visibly in the plan.
4. Check downstream assumptions: does any neighboring flow/manifest depend on a phase
   you are about to move? If yes, the move goes into List 2 with the dependency named.
5. Apply ONLY List 2 changes — insert new phases/gates, edit named sections.
6. Re-run plan-review (FC battery + Gate 0 + FC-13/FC-14) on the restructured plan.
7. Confirm List 1 phases are byte-stable where they should be (diff shows only List 2).
```

## Example (mvp)

```
Trigger: add a QUEUE FABRIC dependency to FLOW-07.

List 1 (frozen):
  - Phase 0 (plan self-validation) — unchanged
  - Phases 1–3 (intake, validate, create) — unchanged, Gate B = npx jest filters unchanged
  - SESSION-1..3 files — unchanged

List 2 (delta):
  - Insert Phase 3.5 "enqueue confirmation via IQueueService"
      insertion point: after Phase 3 (create), before Phase 4 (respond)
      new content: storeDocument BEFORE enqueue (DNA-8); dedup-id = userId (DNA-7)
      new Gate B: cd server && npx jest --testPathPattern="flow-07.*queue" → failures===0
  - Reason: new fabric dependency; neighboring FLOW-08 consumes the same queue — verified
    its assumptions are unaffected (different dedup namespace).
```

## Anti-patterns

- Rewriting the whole plan when only one phase changed — discards working structure.
- Editing before reading the whole plan — you cannot freeze List 1 you haven't read.
- Moving a List 1 phase without recording the downstream dependency in List 2.
- Skipping the post-restructure plan-review pass.

## Integration

- Pairs with `plan-review` (re-run FC battery + FC-13/FC-14 on the restructured plan).
- Pairs with `planning-session-startup` (Conversation Delta Ledger feeds List 2).
- Pairs with `plan-self-validation` (Phase 0 re-runs after the delta).
