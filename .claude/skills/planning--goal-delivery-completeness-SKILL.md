---
name: goal-delivery-completeness
version: "1.0.0"
sk_number: SK-534
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-534 Goal Delivery Completeness — The first arbiter in every panel

A plan's internal consistency can be strong while its coverage of the user's goals is incomplete. v27 of User Journey Reconnection passed 22 review rounds on internal consistency and shipped missing 3 of 4 goals. This skill installs the arbiter that catches that class — the one that asks, before any other arbiter runs, whether the plan actually delivers what the user asked for.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). v27 accumulated 55 findings across 22 arbiter rounds. Every finding was about plan-internal properties: count drift, path errors, skill inversion, fabric compliance, iron rule adherence. Zero findings asked "does Turn X deliver Goal Y?" for any of the user's four original goals. The plan was approved. Execution would have discovered the 3-goals-unmapped gap during integration, at enormous cost. SK-534 makes that gap visible at review round 1.

## When to Invoke

- At every plan review, as the FIRST arbiter — before Business Logic, before Security, before any correctness arbiter
- When a plan changes its turn list — re-run SK-534 to confirm goal coverage still holds
- At the end of every MATERIALIZATION session before handoff — confirm the round-trip step(s) nominated actually map to the user's stated goals
- As part of the 9-arbiter minimum panel (installed in SK-442 modification, Phase 07)

One pass before plan approval = zero "shipped missing goals" failures.

---

## Section 1 — Purpose

A plan review has historically asked: "is this plan internally consistent?" (FC-1 count drift, FC-2 path errors, FC-3 skill inversion, etc.) That question assumes the plan, if internally consistent, solves the user's problem. v27 proved the assumption wrong. A plan can be internally consistent about the wrong problem.

SK-534 adds a prior question: "does this plan deliver the user's stated goals?" The question is scoped narrowly on purpose. SK-534 does not evaluate quality, elegance, efficiency, or correctness of any specific turn. It answers one thing: given the user's goal statement verbatim and the plan's turn list, is every goal mapped to turns that have a verification step?

Narrow scope makes the arbiter reliable. Broad arbiters with many inputs produce nuanced verdicts that are hard to audit. A coverage check with two inputs produces a verdict that is mechanically checkable. A reviewer can verify SK-534's verdict themselves in minutes.

---

## Section 2 — Arbiter Position (runs FIRST)

SK-534 is the FIRST arbiter invoked in every plan review panel. Before:
- Business Logic arbiter
- Security arbiter
- Skills & Patterns arbiter
- Prompts Compliance arbiter
- Principles arbiter
- Iron Rules arbiter
- Completeness arbiter
- Scope Isolation arbiter (FC-32 / SK-526)

If SK-534 returns BLOCK, **no other arbiter runs**. The plan is rejected before correctness review. Reason: auditing the internal consistency of a plan that misses the user's goals is wasted effort. Fix coverage first, then review correctness.

**Precedence rule (from SK-410 v2.0, Phase 06):**

```
FC-14 (Goal Delivery — SK-534) runs before FC-1..FC-13.
FC-15 (Artifact Populated — SK-537) runs in parallel with FC-14.
If FC-14 BLOCKs, FC-1..FC-13 are not evaluated.
```

---

## Section 3 — Inputs (strict isolation)

SK-534 receives exactly two inputs. Nothing else. The isolation is intentional.

### Input 1: user goal statement

Verbatim from `STATE.goalContext.statement` (loaded by SK-536 at session start).

- Not paraphrased
- Not summarized
- Not filtered
- Exact characters as the user typed

If STATE.goalContext.statement is absent, SK-534 cannot run. The arbiter returns CANNOT_EVALUATE and the plan review halts with a request to Luba for an explicit goal statement.

### Input 2: plan turn list

The plan's turns as declared — just the turn names and 1-line purposes, not their full details.

- Turn 1: [name + 1-line purpose]
- Turn 2: [name + 1-line purpose]
- ...

**Input 2 does not include:** per-turn acceptance criteria, per-turn file lists, per-turn skill references, arbiter configurations, session file contents. SK-534 evaluates coverage at the turn-name level, not the turn-implementation level. Whether Turn 3 is correctly implemented is a different arbiter's question.

### Inputs explicitly NOT received by SK-534

- Codebase context
- Prior plan versions
- Skill compliance data from other arbiters
- Arbiter verdicts from other arbiters
- Reconnaissance reports
- User comments on the plan
- Session history

This isolation is the discipline. SK-534 asks: given only these two things, can this plan's turns deliver these goals? Nothing else should influence the answer.

---

## Section 4 — Processing Protocol

Five steps.

### Step 1 — Decompose the user goal statement into discrete deliverables

Parse the verbatim goal statement into a list of distinct goal elements. Example:

Goal statement: "I want: (1) design simulation, teach/QA produce decision flows visible in user's flow menu; (2) teach/QA workflow visible to each user; (3) each flow reflected in tenant admin panel, private to tenant; (4) each tenant can adapt and export flows through marketplace."

Decomposed:
- GE-1: design simulation / teach/QA produce decision flows visible in user's flow menu
- GE-2: teach/QA workflow visible to each user
- GE-3: each flow reflected in tenant admin panel, private to tenant
- GE-4: each tenant can adapt and export flows through marketplace

Single-goal statements produce 1 goal element. Multi-goal statements like above produce N elements, each to be verified independently.

### Step 2 — Parse plan turns

Extract the turn list. Each turn has a name and 1-line purpose. Example:

- T1: "Enrich 10 empty topology files (topology completion)"
- T2: "Bootstrap auto-publish (engine-bootstrapper.ts adds publish call)"
- T3: "MarketplacePage client component (new file)"
- T4: "Re-enable Fork button (remove hardcoded disabled at FlowLibraryPage.tsx:147)"

### Step 3 — Build Goal → Turn(s) mapping

For each goal element, identify which turn(s), if any, deliver it. Map bi-directionally:

```
GE-1 (design sim → flow menu) → T1 (enriches design), T2 (publishes), T3 (shows in UI)
GE-2 (teach/QA workflow visible) → [none — not addressed by this plan]
GE-3 (admin panel, private to tenant) → [none]
GE-4 (adapt + export via marketplace) → T3 (marketplace browse), T4 (install/Fork)
```

### Step 4 — Verify each mapped goal has a verification step

For each (goal, turn-set) pair, the plan must specify HOW goal delivery is verified:
- A round-trip step reference from SK-533 ("verifies step 3 of round-trip")
- An explicit acceptance test ("curl X returns Y")
- A concrete observable ("user can click Fork and flow installs")

Verification steps are checked at the turn-list level. SK-534 does not evaluate whether the verification commands are correct (that's a different arbiter's question). It checks only that a verification exists.

### Step 5 — Produce verdict table

One row per goal element. Four columns:

| Goal | Mapped to turn(s) | Verification step present | Verdict |
|------|-------------------|---------------------------|---------|
| GE-1 | T1, T2, T3 | round-trip step 2 → step 3 | APPROVED |
| GE-2 | — | — | BLOCK_UNMAPPED |
| GE-3 | — | — | BLOCK_UNMAPPED |
| GE-4 | T3, T4 | round-trip steps 4→5 | APPROVED |

Arbiter verdict: **BLOCK** (any BLOCK_UNMAPPED or BLOCK_UNVERIFIED rejects the plan).

---

## Section 5 — Verdict Classes

Four possible verdicts per goal element. The arbiter's aggregate verdict is the worst per-goal verdict.

### APPROVED

Goal element has:
- ≥1 turn assigned
- Verification step specified for the mapped turn(s)
- Verification step is a reference to round-trip, acceptance test, or concrete observable

### BLOCK_UNMAPPED

Goal element has zero turns assigned. The plan does not address this goal.

Resolution: add turns that deliver the goal, OR explicitly declare the goal out-of-scope with Luba approval (which becomes a STATE.goalContext deferral).

### BLOCK_UNVERIFIED

Goal element has turns assigned but no verification step. The plan claims delivery without saying how to confirm it.

Resolution: add a verification step (round-trip reference, acceptance test, or observable) to the relevant turn(s).

### CHALLENGE

Goal element's turn assignments are ambiguous — SK-534 cannot tell from turn names/purposes whether the turn delivers the goal. The plan's turn descriptions are unclear.

Resolution: re-state the ambiguous turns' purposes more concretely, then re-run SK-534.

### Aggregate verdict

- Any BLOCK_* → plan rejected
- Any CHALLENGE without any BLOCK → plan returned for clarification
- All APPROVED → plan proceeds to FC-1..FC-13 and other arbiters

---

## Section 6 — Output Format

```markdown
## SK-534 Goal Delivery Completeness Verdict

Goal statement (verbatim from STATE.goalContext.statement):
"[exact verbatim string]"

Goal elements decomposed:
  GE-1: [text]
  GE-2: [text]
  ...

Plan turns:
  T1: [name — purpose]
  T2: [name — purpose]
  ...

Goal → Turn mapping:

| Goal | Mapped to turn(s) | Verification step | Verdict |
|------|-------------------|-------------------|---------|
| GE-1 | T1, T2 | [spec] | APPROVED |
| GE-2 | — | — | BLOCK_UNMAPPED |
| ...

Aggregate verdict: [APPROVED | BLOCK | CHALLENGE]
Unmapped goals: [count] of [total]
Unverified goals: [count] of [total]
Ambiguous assignments: [count] of [total]

Next action: [continue to FC-1..FC-13 | reject plan | return for clarification]
```

---

## Section 7 — Integration with Round-Trip (SK-533)

When the plan is tenant-facing work, verification steps should map to specific round-trip steps from SK-533's 8-step canonical sequence.

Example mapping:
- GE-1 "design flow visible in user's flow menu" → verified by round-trip step 2 (visible in master library) + step 6 (visible in tenant library)
- GE-4 "tenant adapts and exports via marketplace" → verified by round-trip steps 3 (publish) + 4 (browse) + 5 (install) + 7 (run)

The arbiter can cross-check that the plan's verification claims match SK-533 step definitions. If a plan claims "Turn 3 verifies step 5 of round-trip" but Turn 3 does not touch the install flow, the cross-check surfaces the mismatch as CHALLENGE.

For non-tenant-facing work (e.g., internal engine improvements, governance work), verification uses other observable criteria — unit test results, build checks, documentation artifacts.

### mvp verification-step idioms (universal pattern, stack-adapted)

A goal's verification step must be a real mvp signal, never a .NET command:
- NestJS server behavior → `npx jest --testPathPatterns "<spec>"` shows `0 failed`;
- React UI behavior → `npx playwright test <spec>.spec.ts` shows `0 failed`;
- RAG retrieval quality → a NUMERIC FastAPI eval/health run (not "looks better");
- a `.xiigen` / manifest goal → LOADED through the loader/locator (not file presence).

### Runtime-rejection list (universal, from core)

A goal row is NOT verified — even if a turn cites a step — when the cited
evidence is `validation_only: true`, `metric_type` static/contract/mixed, or
`cpu_ms`/`ram_mb`/`accuracy = UNKNOWN`, or a build/static-contract check with no
runtime/library integration. Such a row is `BLOCK_UNVERIFIED`, not APPROVED.

### Final completion coverage matrix (universal, from core)

At final delivery (not just plan review), every goal element must appear in a
**completion coverage matrix** with `requirement_id`, `literal_requirement`,
`expected_literal_set`, `actual_artifact`, `actual_value`, `comparison_operator`,
`passed`, `gap`, `next_plan_action`. "at least one" is forbidden where the goal
says "all"/"every"/lists exact items. Any failed row → `IN_PROGRESS_NEXT_STEP_KNOWN`
with the first gap as `next_action`, never a final report.

---

## Section 8 — Worked Examples

### Example A — v27 retrospective under SK-534

**Goal statement verbatim:** "I want: (1) design simulation, teach/QA produce decision flows visible in user's flow menu; (2) teach/QA workflow visible to each user; (3) each flow reflected in tenant admin panel, private to tenant; (4) each tenant can adapt and export flows through marketplace."

**Goal elements:**
- GE-1: design sim → flow menu
- GE-2: teach/QA workflow visible
- GE-3: admin panel + tenant private
- GE-4: tenant adapts + exports via marketplace

**v27 plan turns (abbreviated):**
- T1-T7: fabric infrastructure decisions
- T8-T10: adapter wiring for flow generation
- T11: subflow capture mechanism
- T12: marketplace packaging (no session file)
- T13-T15: additional infrastructure

**Goal → Turn mapping:**

| Goal | Mapped to turn(s) | Verification step present | Verdict |
|------|-------------------|---------------------------|---------|
| GE-1 | T1-T11 partial | mixed — some ok some missing | CHALLENGE |
| GE-2 | — | — | BLOCK_UNMAPPED |
| GE-3 | — | — | BLOCK_UNMAPPED |
| GE-4 | T12 only | no session file, no verification | BLOCK_UNVERIFIED |

**Aggregate verdict: BLOCK.** 3 of 4 goal elements are BLOCK (2 unmapped, 1 unverified). v27 plan rejected at review round 1 under SK-534.

**Consequence:** v27's 22 review rounds never happen under v23+v1.3 governance. SK-534 rejects at round 1, plan is re-authored to cover GE-2 and GE-3, verification step added for GE-4. 21 review rounds saved.

### Example B — 4-task MATERIALIZATION plan under SK-534

**Goal statement (simplified for MATERIALIZATION scope):** "Make master-tenant-authored flows visible to other tenants via marketplace."

**Goal elements:**
- GE-1: master-authored flows exist as shippable packages
- GE-2: other tenants can browse and install
- GE-3: installed flows run and produce observable results

**Plan turns:**
- T1: Enrich 10 empty topology files
- T2: Bootstrap auto-publish (adds publish call to engine-bootstrapper)
- T3: MarketplacePage client component (new)
- T4: Re-enable Fork button at FlowLibraryPage.tsx:147

**Goal → Turn mapping:**

| Goal | Mapped to turn(s) | Verification step present | Verdict |
|------|-------------------|---------------------------|---------|
| GE-1 | T1, T2 | round-trip steps 1→3 | APPROVED |
| GE-2 | T3, T4 | round-trip steps 4→5 | APPROVED |
| GE-3 | — | — | BLOCK_UNMAPPED |

**Aggregate verdict: BLOCK.** GE-3 is unmapped — "installed flows run and produce observable results" corresponds to round-trip steps 6-8, which are not advanced by this plan.

**Resolution options:**
1. Add T5 for running installed flow + T6 for observing results (expands plan — but then task count hits 6, violating SK-532 ≤5 constraint → decompose into 2 sessions)
2. **Explicitly defer GE-3 to a follow-up session with Luba approval** — update STATE.goalContext to mark GE-3 as deferred, then re-run SK-534 which approves the remaining 2 goals
3. Re-scope the session to match the 4-task plan (goal becomes 2 elements: authoring visibility + install; running deferred)

Option 2 is most common — acknowledge the scope is narrower than stated, get Luba's explicit approval, proceed with partial coverage that is explicit rather than silent.

### Example C — CHALLENGE verdict (ambiguous turn)

**Goal:** "Tenant can customize flow behavior per environment."

**Plan turns include:** "T7: Add flow config layer."

**Mapping attempt:**

| Goal | Mapped to turn(s) | Verification step present | Verdict |
|------|-------------------|---------------------------|---------|
| GE-1 | T7 (maybe) | ambiguous — "config layer" doesn't specify per-environment behavior | CHALLENGE |

**Resolution:** re-state T7 as "Add per-environment flow config override (reads ENV var to scope config)." Re-run SK-534 → APPROVED.

CHALLENGE is distinct from BLOCK because it's a clarity problem, not a coverage problem. Fast to resolve.

---

## Section 9 — Integration Notes

- **SK-536 Goal Context Persistence:** provides `STATE.goalContext.statement` as SK-534's primary input. Without SK-536, SK-534 has no goal to evaluate against.

- **SK-533 MVP Round-Trip Verification:** provides the verification step vocabulary for tenant-facing work. A plan's verification claims referencing round-trip steps are checkable against SK-533's step definitions.

- **SK-530 Specificity Calibration:** SK-534's own output (the verdict table) must meet PLAN-REVIEW threshold (20 concrete references). Abstract verdicts fail both.

- **SK-442 Arbiter Panel Design (modified in Phase 07):** SK-534 is installed as the 9th mandatory arbiter in every archetype's panel. Runs FIRST. Phase 07 updates SK-442 to include it.

- **SK-410 Plan Review Skill (modified in Phase 06):** FC-14 (Goal Delivery Completeness) is installed by Phase 06 as a new failure class governed by SK-534. FC-14 runs before FC-1..FC-13.

- **Rule 31 in SESSION-LOAD-PLAN-v23:** multi-goal plans must declare lanes. SK-534 runs per-lane when lanes are declared.

- **Gate 0g in CODE-REVIEW-PROTOCOL-v1.3 (Phase 09):** invokes SK-534 as the first gate in the review protocol. Same skill, review-time application.

- **Abbreviated panel for MATERIALIZATION (from SK-532):** MATERIALIZATION sessions run only two arbiters at the end — scope_isolation (FC-32) + goal_delivery (SK-534). Other correctness arbiters skipped because no new design. SK-534 is the minimum review discipline.

---

## Section 10 — Anti-patterns

1. **"The goal is obviously covered, skip the mapping table"** — obvious coverage is where coverage drift hides. The mapping is mechanical on purpose. Skipping it means trusting intuition, which has a 3-of-4 track record.

2. **"Let SK-534 see the full plan so it can judge better"** — more inputs make SK-534's verdict less checkable. The two-input isolation is the feature. A verdict that can be reproduced by anyone with two pieces of paper is more robust than a verdict from a nuanced multi-input judge.

3. **"If a goal is BLOCK_UNMAPPED, I'll add a placeholder turn to cover it"** — placeholder turns without real delivery are still BLOCK_UNMAPPED after the placeholder is removed, just delayed. Either deliver the goal or explicitly defer with Luba approval.

4. **"CHALLENGE is easier to resolve than BLOCK, so aim for CHALLENGE"** — that's gaming, not resolving. Don't write ambiguous turns to dodge BLOCK_UNMAPPED. Write clear turns that either deliver or don't.

5. **"The plan has 22 arbiter rounds, surely one caught coverage"** — v27 had 22. None caught. Correctness arbiters do not audit coverage. SK-534 is the skill that audits coverage; without SK-534, no one does.

6. **"I'll add the verification step in implementation, not in the plan"** — verification described in the plan is a commitment. Verification "in implementation" is a wish. SK-534 checks the plan, not the wish.

7. **"Multi-goal plans are complex, simplify by ignoring the minor goals"** — Rule 31 exists because multi-goal plans must declare lanes. All goals get mapped. Ignoring the "minor" ones is how v27's GE-3 (admin panel) disappeared from 22 rounds of review.

---

## END OF SK-534
