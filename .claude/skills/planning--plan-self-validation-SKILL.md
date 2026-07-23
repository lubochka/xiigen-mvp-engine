---
name: plan-self-validation
version: "1.0.0"
sk_number: SK-548
priority: MANDATORY
load_order: 0
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-548 Plan Self-Validation — A plan must gate itself before executing

SK-410 v2.0 (plan-review-skill) states: "Run BEFORE handing any plan to Claude Code."
Every plan that has ever been executed against without a prior SK-410 pass was handed
to Claude Code on trust. This skill enforces the gate mechanically: every plan document
must contain a Phase 0 that runs SK-410 on the plan itself before Phase 1 executes.

## Origin

Extracted from ARCHITECT-SESSION-INFRASTRUCTURE-FIX-PLAN v9.1. The plan:
- Specified SK-543..SK-547 in Phases 11–15 but wrote them as design briefs, not
  execution phases — producing FC-3 Phantom Skills violations
- Had Part 2 (Phases 11–15) execute independently of Part 1 with no HOW-TO-USE
  registration step for the new skills — an SK-440 blast radius miss
- Had Phase 8 (HOW-TO-USE) precede Phases 11–15 in the original ordering,
  meaning HOW-TO-USE could not reference skills that didn't exist yet
- Had no Phase 0 running SK-410 on the plan before Phase 1 began

All four failures would have been caught by a single SK-410 pass before execution.
None were caught because no mechanism required the pass to happen.

## Relationship to SK-410

SK-410 (plan-review-skill) is the review instrument. SK-548 is the enforcement
mechanism that makes SK-410 mandatory. SK-410 defines the FC battery. SK-548
says: "The plan must contain a phase that runs that battery before anything else."

Neither substitutes for the other. SK-410 without SK-548 produces a review instrument
that may or may not be used. SK-548 without SK-410 produces an empty gate. Both are
required.

## When to Invoke

- When authoring any multi-phase plan
- When reviewing a plan for readiness before execution
- When a plan is handed to Claude Code and no Phase 0 is present — halt, add it

---

## Section 1 — The Phase 0 Requirement

Every plan document that will be handed to Claude Code or executed in a web session
must contain a Phase 0 with this structure:

```
## PHASE 0 — Plan Self-Validation (SK-410 v2.0 + SK-548)

**Operation type: REVIEW — no files produced**

**Runs before Phase 1. Phase 1 does not begin until Phase 0 passes.**

**FC-14 (Goal Delivery Completeness — runs first):**
  Goal stated: "[verbatim from STATE.goalContext.statement]"
  Goal elements: [G1, G2, G3 ...]
  Phase that delivers each element: [phase number per goal element]
  Verification step per element: [how completion is confirmed]
  FC-14 verdict: APPROVED | BLOCK_UNMAPPED | BLOCK_UNVERIFIED | CHALLENGE

**FC-15 (Design Artifact Populated — runs first alongside FC-14):**
  For each artifact referenced in the plan:
    [artifact path]: [Check 1 pass/fail — file exists] + [Check 2 pass/fail — populated]
  FC-15 verdict: PASS | FAIL

  If FC-14 or FC-15 returns BLOCK: plan is rejected. Phases 1–N do not execute.
  Resolve the blocking gap before proceeding.

**FC-3 (Phantom Skills):**
  For each skill referenced in the plan (including in load orders and indices):
    [skill name]: Phase [N] creates it — CONFIRMED | PHANTOM
  FC-3 verdict: PASS | FAIL

**FC-5 (Skill Presence Matrix):**
  For each new skill the plan creates:
    | skill-name | Phase creates it | HOW-TO-USE registers it | Load plan registers it |
  FC-5 verdict: PASS (all cells filled) | FAIL (empty cells)

**SK-440 Blast Radius (for each new skill created):**
  For each new skill in Phases N..M:
    □ FLOW-DESIGN-SKILL-INDEX updated (which phase?)
    □ HOW-TO-USE activation triggers updated (which phase?)
    □ SESSION-LOAD-PLAN layer summary updated (which phase?)
  If any item is unassigned: PHANTOM registration — add a phase or add to an existing phase

**Execution order check:**
  HOW-TO-USE phase number: [N]
  Latest phase that creates a skill HOW-TO-USE must reference: [M]
  Is N > M? YES → order correct | NO → HOW-TO-USE will reference non-existent skills

**Phase 0 verdict:**
  ALL PASS → Phase 1 may begin
  ANY FAIL → resolve the failing check before Phase 1
```

---

## Section 2 — The Four Checks Phase 0 Must Run

### Check 1 — FC-14 Goal Delivery Completeness

For every goal element the plan claims to deliver, a phase must be assigned and
a verification step must be specified. No goal element is implicitly covered.

FC-14 returns BLOCK_UNMAPPED if a goal element has no assigned phase.
FC-14 returns BLOCK_UNVERIFIED if a goal element has a phase but no verification step.

Either BLOCK stops all subsequent phases.

### Check 2 — FC-3 Phantom Skills

For every skill number or name that appears in the plan's load orders, layer summaries,
or skill index sections, verify that a phase in the plan creates that skill file.

A skill that is referenced in the plan but has no creating phase is a phantom.
Phantoms produce execution sessions that reference files that don't exist.

```
Detection:
  List every skill referenced in the plan's load orders / indices.
  For each: grep the plan for "Phase N ... [skill-name]" or "CREATE [skill-name]".
  If no creating phase found → FC-3 FAIL for that skill.
```

### Check 3 — FC-5 Skill Presence Matrix + SK-440 Blast Radius

For every new skill the plan creates (CREATE phases), verify that:
- A phase updates HOW-TO-USE activation triggers to include the new skill
- A phase updates FLOW-DESIGN-SKILL-INDEX or SESSION-LOAD-PLAN layer summary
- The HOW-TO-USE phase executes AFTER the skill-creating phase (not before)

If any registration is unassigned: the skill will be created but invisible to sessions.

### Check 4 — Execution Order Consistency

If the plan contains a HOW-TO-USE update phase and skill-creating phases:
- The HOW-TO-USE phase must execute AFTER the last skill-creating phase
- The HOW-TO-USE phase must reference the correct final versions of all created skills
- Verify the critical path: skill phases → HOW-TO-USE phase → snapshot phase

---

## Section 3 — Why Phases 11–15 Were Design Briefs, Not Execution Phases

The specific failure in ARCHITECT-SESSION-INFRASTRUCTURE-FIX-PLAN v9.1:

Phases 11–15 contained:
- Operation type: CREATE ✅
- Gap it closes: ✅
- What this skill must contain: ✅ (content specification)

Phases 11–15 were missing:
- Output filename: ❌ (executor had to infer `planning--{name}-SKILL.md`)
- YAML frontmatter spec: ❌ (sk_number, load_order, version, contexts)
- Post-condition check: ❌ (no verification command)
- SK-440 blast radius assignment: ❌ (HOW-TO-USE registration not assigned to any phase)

A phase that specifies what a file must contain but not what file to create, where
to put it, or how to verify it was created correctly is a design brief, not an
execution instruction. An execution phase requires all four.

**The full execution phase template for CREATE phases:**

```
## PHASE N — [filename].md ([SK-XXX])

**Operation type: CREATE**

**Output file:** `planning--[name]-SKILL.md`

**YAML frontmatter:**
  name: [name]
  version: "1.0.0"
  sk_number: SK-XXX
  priority: MANDATORY
  load_order: [N]
  category: planning
  updated: "[date]"
  contexts: ["web-session", "claude-code"]

**Pre-condition check:**
  [bash command to verify concept does not already exist]
  Expected: [what absence looks like]

**What this skill must contain:**
  [content specification]

**SK-440 blast radius (assign to a specific phase):**
  □ HOW-TO-USE activation trigger row: assigned to Phase [M]
  □ Layer summary entry: assigned to Phase [M]
  □ SESSION-LOAD-PLAN next-available-SK update: assigned to Phase [M]

**Post-condition check:**
  [bash commands to verify the file was created correctly]
  Expected: [specific output]
```

---

## Section 4 — The Missing Skill Gap

The conversation that produced this skill identified a deeper gap:

> "The real gap in the planning skills library: there is no skill-authoring skill
> that specifies the standard format for a phase that creates a new skill file —
> the frontmatter schema, the canonical file path pattern, the post-condition
> verification command, the blast radius checklist."

SK-548 closes one half of that gap: it requires the Phase 0 self-validation gate.
The other half — a canonical phase template for CREATE skill phases — is embedded
in Section 3 above and should be promoted to a standalone skill (SK-549,
plan-phase-authoring) when the pattern recurs.

---

## Section 5 — Integration with SK-410 and the FC Battery

Phase 0 runs a focused subset of the SK-410 battery. It does not run all 14 FCs —
only the ones that catch structural gaps before execution begins:

| FC | What it catches | Phase 0 check |
|----|----------------|---------------|
| FC-14 | Goal unmapped or unverified | Check 1 |
| FC-15 | Artifact referenced but empty | Check 1 (part) |
| FC-3 | Skill referenced but no phase creates it | Check 2 |
| FC-5 | Skill created but not in required lists | Check 3 |
| SK-440 | Blast radius unassigned | Check 3 |
| Execution order | HOW-TO-USE before skills it references | Check 4 |

FC-1 (count drift), FC-2 (stale numbers), FC-6 through FC-12 are internal
consistency checks — they run as a full SK-410 pass is warranted, but Phase 0
focuses on the structural gaps that would cause the plan to fail silently
during execution.

---

## Section 6 — Anti-patterns

1. **"Phase 0 runs after Phase 1"** — Phase 0 is not a phase in the normal sequence.
   It is a gate that must pass before Phase 1 begins. A plan where Phase 0 is listed
   as Phase 10 or at the end has missed the point.

2. **"The plan was reviewed so it doesn't need Phase 0"** — a review that happened in
   conversation is not a gate that appears in the plan document. Phase 0 must be
   IN the plan, not in the session history. If the executor doesn't see Phase 0,
   the executor skips it.

3. **"Phase 0 only needs FC-14"** — FC-14 catches unmapped goals. FC-3 catches
   phantom skills. A plan can pass FC-14 (goals mapped) and fail FC-3 (skill
   referenced but no phase creates it). Both are needed.

4. **"The blast radius will be handled in a follow-up session"** — SK-440 states
   explicitly: "Same task. Not the next session. Not when noticed. Same task."
   The blast radius assignment must appear in the plan before Phase 1 executes.

5. **"Phases 11–15 have 'What this skill must contain' so they're execution phases"** —
   content specification is a design brief, not an execution phase. An execution
   phase specifies the output filename, frontmatter, pre-condition check,
   post-condition check, and blast radius. Without these, the executor has to
   infer the missing pieces — and inferring produces variation.

---

## Section 7 — Failure Modes This Skill Prevents

| Failure mode | How Phase 0 catches it |
|--------------|------------------------|
| Skill referenced in load order but no phase creates it (FC-3) | Check 2: every referenced skill must have a creating phase |
| New skill created but not registered in HOW-TO-USE (SK-440) | Check 3: HOW-TO-USE registration must be assigned to a phase |
| HOW-TO-USE phase executes before skill-creating phases | Check 4: execution order verified before Phase 1 |
| Goal elements unmapped to phases (FC-14) | Check 1: every goal element needs an assigned phase and verification |
| Design briefs passed off as execution phases | Section 3 template: execution phases require all four fields |
| Plan reviewed in conversation but not in document | Phase 0 must be IN the plan document, not in session history |

---

## Changelog

- **v1.0.0** — initial skill. Four Phase 0 checks (FC-14/15, FC-3, FC-5/SK-440,
  execution order); full execution phase template for CREATE phases; integration
  with SK-410 FC battery; anti-patterns 1–5; failure-mode table. Origin: four
  structural failures found in ARCHITECT-SESSION-INFRASTRUCTURE-FIX-PLAN v9.1
  that a single Phase 0 would have caught before Phase 1 executed.

---

## UNIVERSAL STANDARD ADDENDUM — Authority Ledger + Replacement Mapping + Contradiction Sweep (ported from llm_mvp_core)

> Added by the Universal-Skills refresh (UpdateUniversalSkills). Source standard:
> `llm_mvp_core/docs/skills/plan-self-validation-SKILL.md`. The Phase 0 requirement
> and the four Phase-0 checks above are kept. mvp's Phase 0 validated structure
> (phantom skills, blast radius, execution order) but did not require an Authority
> Requirements Ledger, a Replacement Mapping Register, an explicit contradiction
> sweep, or verification that plan references resolve against live TS source.
> TS adaptation: plan refs resolve to `server/src/**.ts` (NestJS `@Injectable`/
> `providers`, React hooks, FastAPI routes); Gate B = `npx jest`; domain return type
> is `DataProcessResult<T>` (not core-`OperationResult<T>`).

### Phase 0 also runs (before Phase 1)

```
1) Authority Requirements Ledger
   | # | requirement (verbatim) | binding? | plan § | Gate B (jest/playwright) | artifact |
   Built from the active authority (current operator instruction / approved work order /
   accepted reviewer gate). Binding unless explicitly marked optional/exploratory.

2) Replacement Mapping Register
   | removed/superseded mechanism | required replacement capability | named in plan? |
   RULE: removing an old mechanism is NOT coverage for a required replacement. If a
   trainable/learned unit is required, the plan must name unit + trained state +
   checkpoint/manifest + export/import + locator + fresh-load + continue-training +
   ablation/leakage gate. A deterministic helper (regex/BM25/dictionary/direct lookup)
   in a production route is not coverage for a trainable requirement.

3) Contradiction Sweep
   Using terms from the ledger, scan the whole plan: any sentence contradicting a
   binding requirement is invalid. Any unmapped, deletion-only, or contradicted
   requirement BLOCKS Phase 1.

4) Plan-reference resolution (TS)
   Every `SK-xxx` / FC reference and every cited `server/src/...:line` must resolve.
   A reference to a non-existent skill, phase, or file:line FAILS Phase 0.
```

**Phase 0 verdict gains these rows:** `authority_ledger_complete`,
`replacement_mapping_no_deletion_only_gap`, `contradiction_sweep_clean`,
`all_plan_refs_resolve`. Any false → Phase 1 does not begin; repair the plan first.
This is a repair loop, not a stop and not "executor may proceed anyway".

---

## END OF SK-548
