---
name: decision-reopening-protocol
sk: SK-417
description: >
  Governs when a locked decision may be challenged and how to do it correctly.
  Prevents re-litigating settled choices while still allowing the architecture
  to evolve. Use when a planning session suggests an existing decision is wrong,
  incomplete, or needs to change.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-424]
---

# DecisionReopeningProtocol [SK-417]

## Purpose

Locked decisions exist to prevent a recurring failure mode: every session
re-derives the same conclusions from first principles, wastes time, and
sometimes arrives at different answers due to context differences. But
architecture must evolve. This skill defines the narrow gate through which
a decision legitimately changes.

## When AF-4 RAG Retrieves This Skill

- "I think we should reconsider..."
- "This decision doesn't work for the new context"
- "Mode C has a problem we didn't see"
- "The SDK decision needs to change because..."
- Any message that challenges a D-series or SDK/CLIENT/E2E decision

## Pattern

**Four-step test. A decision may only be reopened if it passes.**

### Step 1 — Is this decision in DECISIONS-LOCKED.md?

```
Read DECISIONS-LOCKED.md.
If NOT in the document: not a locked decision. Proceed freely.
If IN the document: locked. Apply steps 2–4.
```

### Step 2 — What is the trigger for reopening?

Valid triggers (any one is sufficient):
```
□ New information that did not exist when the decision was made
  Example: "Mode C assumes bidirectional events, but SQS is
   one-directional — D7 needs an exception for SQS tenants"

□ The decision causes a concrete failure in the current plan
  Example: "D8 says NestJS primary, but this flow only has
   a React client — there's no NestJS component"

□ The decision's rationale has been invalidated by subsequent decisions
  Example: "D5 chose DeepSeek-Coder but D8 chose NestJS primary —
   DeepSeek is weaker on NestJS than on Python, the rationale changed"
```

Invalid triggers (do not reopen):
```
✗ "I just think there's a better way"
✗ "This would be simpler if we changed it"
✗ "The other approach is more familiar"
✗ Re-examining without new information
```

### Step 3 — Write the ADR entry BEFORE changing anything

```
Format (append to DECISIONS-LOCKED.md → Decision Change Log):
  Date:      [today]
  Decision:  D## or SK-## or CLIENT-## or E2E-##
  Change:    [what is changing]
  Rationale: [the valid trigger from step 2]
  Impact:    [which flows/sessions/documents need updating]

The ADR entry must exist as a written record BEFORE
any document is edited or any session file is changed.
```

### Step 4 — Scope the impact and update all affected documents

```
After writing the ADR entry:
  1. List every document that references this decision
  2. Update each one — no partial updates
  3. If any flow reference plans reference this decision,
     re-run FLOW-REEXAMINATION-ALGORITHM.md Pass 7 on them
  4. Update DECISIONS-LOCKED.md itself with the new decision text
```

## Positive Example

```
Trigger: "D15 says execution unit owns retry, but in FLOW-09 T96
  CalendarReminderScheduler, the platform EP-2 timer fires retries
  directly — the execution unit never sees the retry event"

CORRECT:
  Step 1: D15 is in DECISIONS-LOCKED.md → locked decision
  Step 2: Valid trigger — concrete failure in current plan.
          EP-2 timer is a platform-level retry mechanism that
          doesn't go through the execution unit.
  Step 3: Write ADR:
          "D15 amended: execution unit owns retry for event-driven paths.
           Platform EP-2 timer owns retry for scheduled/timer paths.
           D15 now distinguishes: event retries (execution unit) vs
           timer retries (platform EP-2)."
  Step 4: Update DECISIONS-LOCKED.md D15, update PLATFORM-SPEC-CONSOLIDATED.md
          Section 3 (Execution Fabric), re-run Pass 4 on FLOW-07 and FLOW-09
          reference plans (both use EP-2 timers).
```

## Negative Example

```
Trigger: "I think Mode C is too complex. Maybe Mode A is simpler."

WRONG:
  → Re-debating D3 without new information
  → No concrete failure cited
  → No ADR entry written
  → Producing a document that contradicts FLOW-INTEGRATION-MODE-C.md
```

## RECONCILE — core `decision-reopening` parity (G02 refresh from llm_mvp_core)

SK-417 already carries the 4-step gate, the "**ADR entry BEFORE any edit**" rule, and
Step 4 scope-impact. Two core completions to reconcile:

**(A) Step 4 finishes with a build + test run.** After writing the ADR and updating
every referencing document, run `npm run build` (TypeScript, 0 errors) and `npx jest`
(server ≥2342, client ≥220) before the change is considered done — a decision change
that breaks the build/tests is not a completed reopening. (Core Step 4 runs
`dotnet build && dotnet test`; the mvp equivalent is npm/jest.)

**(B) Find ALL references, then update each — no partial updates.** Before declaring
scope complete, grep the repo so no referencing file is missed:

```bash
grep -rn "D[0-9]\+\|SK-[0-9]\+\|CLIENT-[0-9]\+\|E2E-[0-9]\+" \
  docs/ server/src/ client/src/ .agents/ .claude/ \
  --include="*.md" --include="*.ts" --include="*.tsx" --include="*.json"
```

**(C) This skill exists in TWO buckets** (`.agents/skills/planning/` and
`.claude/skills/planning/`). When SK-417 itself is edited, update BOTH copies in the
same change so they do not drift.

---

## Integration

```
requires:    SK-416 (session startup — must verify decision is locked first)
complements: SK-424 (blast radius — after reopening, assess impact scope)
```

## Test

```
Given: planning session where D7 (bidirectional events) is challenged
       with reason "SQS doesn't support bidirectional natively"

Expected behavior:
  - Recognize D7 is a locked decision
  - Validate the trigger: new technical constraint (SQS limitation)
  - Write ADR entry before any document changes
  - Scope impact: FLOW-INTEGRATION-MODE-C.md, PLATFORM-SPEC-CONSOLIDATED.md,
    any flow that uses SQS as transport
  - Update all affected documents after ADR written

Failure: Re-debating D7 without writing ADR entry first
```
