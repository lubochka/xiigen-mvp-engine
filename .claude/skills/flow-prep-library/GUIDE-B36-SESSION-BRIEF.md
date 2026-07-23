# GUIDE-B36 — How to Produce `SESSION-BRIEF.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 46 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-BRIEF.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the SESSION-BRIEF.md guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance, it will
produce a correct SESSION-BRIEF.md that gives the next session everything it needs
to continue work on a flow without re-reading all prior session history.

---

## WHAT THIS FILE IS

`SESSION-BRIEF.md` is governed by **SK-428** in the XIIGen session output skills.
It is written at the end of each significant work session — after a phase completes
or at a natural stopping point — and serves as the handoff document for the next
session.

**The brief answers three questions for the next session:**
1. Where are we? (context: flow, phase status, branch, date)
2. What happened? (key facts: test results, scores, state values, decisions locked)
3. What's next? (carry-forward items, deferrals, known constraints)

**Key property:** SESSION-BRIEF.md must be fully readable in 30 seconds and give a
new session enough context to start work immediately without consulting STATE.json,
PHASE-COMPLETE.md, or any session logs.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-46/SESSION-BRIEF.md` — full implementation-complete brief: context line, state verdict, key facts (branch/date/test gates), documented deferrals (5 items), architectural decisions locked (7 ADs), artifacts produced, commit chain, known constraint |
| ZIP-17 | PRIMARY | `FLOW-47/SESSION-BRIEF.md` — partial-completion brief (`GOAL_PARTIALLY_REACHED`): 3 specific defect items with exact numbers, assertion weakening to reverse, artifacts produced, known constraint acknowledged |
| ZIP-11 | COMPARISON | `FLOW-01/final-flow-testing/SESSION-BRIEF-A.md` — phase-scoped brief (Phase A → Phase B): minimal key facts for next phase, score bracket reminder, fixture counts |
| ZIP-11 | COMPARISON | `FLOW-01/final-flow-testing/SESSION-BRIEF-B.md` — phase-scoped brief (Phase B → Phase D): run IDs from STATE.json, specific Phase D instructions (D0 extract code, D1 wire module, D2 tests), server startup command, gaps noted |

**SK-428** is the skill that governs SESSION-BRIEF.md authoring. It is referenced
in the Artifacts produced section of both FLOW-46 and FLOW-47 briefs.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/SESSION-BRIEF.md`

A flow may have multiple SESSION-BRIEF files if there are multiple work sessions:
- `SESSION-BRIEF.md` — latest brief (overwrites or is the canonical single brief)
- `SESSION-BRIEF-A.md`, `SESSION-BRIEF-B.md`, etc. — phase-specific briefs (FLOW-01 pattern)
- `FLOW-XX-SESSION-BRIEF.md` — flow-prefixed variant (older format)

The modern format (FLOW-46/47) uses a single `SESSION-BRIEF.md` per session endpoint.

---

## THE TWO FORMATS

**Format 1 — Full implementation brief (FLOW-46 style):**
Used when a complete phase or the full implementation is done. Contains all sections.
Written at: Phase F completion, major milestone, session endpoint with GOAL_REACHED.

**Format 2 — Partial/phase-scoped brief (FLOW-01/47 style):**
Used for intermediate phases or when goal was not fully reached. May include specific
defects, assertion fixes needed, or instructions for the next phase.
Written at: End of Phase A, B, C, D, E; or when `GOAL_PARTIALLY_REACHED`.

---

## FULL IMPLEMENTATION BRIEF STRUCTURE (FLOW-46 style)

```markdown
## FLOW-XX SESSION-BRIEF — [one-line description of what was accomplished]

**Context:** FLOW-XX ([flow human name]) — [N task types T[NNN]-T[NNN+M]], [N factories F[N]-F[N]], [N BFA rules CF-[N]/[N]/[N]], family [N]. Phases A→F complete on `[branch-name]`.
**State:** [`FLOW-XX-IMPL-STATE.json`](FLOW-XX-IMPL-STATE.json) — `phase_status: PHASE_F_COMPLETE`, `overallVerdict: GOAL_REACHED`
**Next:** [one sentence on what must happen next — runtime promotion, carry-forward items, next flow, etc.]

### Key facts for next session
- Branch: `[branch]` · Date captured: [YYYY-MM-DD]
- All gates green: [specific test counts and gate results]
- [Additional key fact — e.g., no CF rule collision, namespace confirmed]
- [Additional key fact — e.g., UI route live]
- [Additional key fact — e.g., tenant-scoped feature behavior]

### Documented deferrals (carry into next session)
1. **[Deferral title]** — [what it is and why deferred; what must happen to close it]
2. **[Deferral title]** — [same]
[... numbered list, one per deferral]

### Architectural decisions locked (per IMPL-STATE.architectural_decisions_locked)
- **[decision key]:** [decision value and brief rationale] — [AD-N]
[... one bullet per locked architectural decision]

### Artifacts produced this implementation (`docs/sessions/FLOW-XX/`)
- Planning docs ([N]): `FLOW-XX-DESIGN-SIMULATION-R1.md`, `FLOW-XX-IMPLEMENTATION-PLAN-v1.md`, [etc.]
- Session-end outputs (3): `EXECUTION-LOG.json` (SK-426 schema, [N] phases) · `PHASE-COMPLETE.md` (SK-427) · `SESSION-BRIEF.md` (SK-428)

### Commit chain on `[branch]`
- A: [hash](link) [commit description]
- B+C: [hash](link) [commit description]
[... one entry per commit or commit group]

### Known constraint acknowledged
- [Single most important constraint that is known but accepted for this release]
```

---

## PARTIAL/GOAL-NOT-REACHED BRIEF STRUCTURE (FLOW-47 style)

```markdown
## FLOW-XX SESSION-BRIEF — [title describing what partial state was reached]

**Context:** FLOW-XX ([flow human name]) — [N turns T[NNN]-T[NNN+M]], [N factories], [N BFA rules]. [Brief status context].
**State:** `FLOW-XX-STATE.json` — `verdict: GOAL_PARTIALLY_REACHED`
**Next:** [what must happen to reach GOAL_REACHED — specific defects to remediate]

### Key facts for next session
- Branch: `[branch]` · Date captured: [YYYY-MM-DD]
- Tests green: [specific counts] but [caveat — e.g., "committed assertions are weaker than plan thresholds"]
- [Additional key fact about what worked]

### [N] "[goal not reached]" items (from FLOW-XX-GOAL-GAP-REPORT.md)
1. **[Metric name] [actual] vs ≥[expected]** — [what caused it] ([where to fix it]).
2. **[Metric name] [actual]/[total] [expected]** — [what caused it].
3. **[Metric name] [actual]/[total]** — [what caused it].

### [Assertion/state] to reverse
[Description of what was weakened or left partial, and how to restore it.]

### Artifacts produced this session (`docs/sessions/FLOW-XX/`)
- `FLOW-XX-STATE.json` · `FLOW-XX-LIVE-RUN-RESULTS.json` · `FLOW-XX-GOAL-GAP-REPORT.md`
- `EXECUTION-LOG.json` (SK-426 schema, [N] phases) · `PHASE-COMPLETE.md` (SK-427) · `SESSION-BRIEF.md` (SK-428)
- [Any evidence files — SNAPSHOTS/, etc.]

### Known constraint acknowledged
- [What is known to be incomplete but accepted for now]
```

---

## PHASE-SCOPED BRIEF STRUCTURE (FLOW-01 style)

Used when writing a brief at the end of a specific phase (not full implementation).

```markdown
## FLOW-XX SESSION-BRIEF: Phase [X] Complete [→ Phase [Y] Ready]

**Context:** [brief context — stack, projectId]
**State:** FLOW-XX-STATE.json current_phase: "[phase-key]"
[Optional: **AI:** [model used]]
**Next:** [Load SESSION-[Y].md — Phase Y: [PHASE NAME]] OR [specific next action]

**Key facts for Phase [Y]:**
- [Fact 1 — critical values from STATE.json that Phase Y needs]
- [Fact 2]
- [Score/metric reminder if relevant]

---

## What Phase [Y] Must Do

[One or more subsections with specific instructions for Phase Y.
Each subsection has: heading, bash command or TypeScript snippet, brief explanation.
This section is more prescriptive than the full brief — it's giving Phase Y its instructions.]

---

## [Optional: gaps noted / known constraints for Phase Y]
```

---

## FIELD-BY-FIELD AUTHORING RULES

### Context line
The context line is one dense sentence capturing: flow ID, human name, task types
with range, factories with range, BFA rules, family number, and phase status.

```
Good: "FLOW-46 (platform-agent / Super Engine Assistant) — 7 task types T650-T656,
       5 factories F1601-F1605, 3 BFA rules CF-839/840/841, family 210. Phases A→F
       complete on `claude/vigorous-margulis`."

Bad:  "FLOW-46 has 7 task types and is complete."
      — missing factories, BFA rules, family number, branch
```

### State line
Links directly to the state JSON file and states the two most important verdict fields:

```
**State:** [`FLOW-XX-IMPL-STATE.json`](FLOW-XX-IMPL-STATE.json) — `phase_status: PHASE_F_COMPLETE`, `overallVerdict: GOAL_REACHED`
```

For partial completion:
```
**State:** `FLOW-XX-STATE.json` — `verdict: GOAL_PARTIALLY_REACHED`
```

### Key facts
Each key fact is one bullet: `- Branch: \`[branch]\` · Date captured: [date]`

The branch + date bullet is always first. Subsequent bullets capture the most
important observable facts from the just-completed session — test counts, gate
results, specific metrics.

**Anti-patterns:**
- "Everything looks good" — not a fact
- "Tests pass" — too vague; state exact counts
- "See STATE.json for details" — defeats the purpose of the brief

### Documented deferrals
Each deferral is numbered and titled in bold. The title names the feature or metric.
The body explains what it is and what must happen to close it.

**The brief's deferral list is not a complete bug tracker** — it captures only the
items that must be carried forward explicitly because they affect correctness or
completeness of the next session's work.

### Architectural decisions locked
This section exists only in the full implementation brief. It captures decisions
that were made during implementation that are now locked — things that affect how
future sessions extend this flow.

Each bullet: `- **[decision key]:** [decision value] — [AD-N]`

The `AD-N` reference is to the architecture decision number in IMPL-STATE.json's
`architectural_decisions_locked` array.

### Artifacts produced
Three categories: planning docs (simulation, implementation plan, teach-QA, states),
session-end outputs (always: EXECUTION-LOG.json + PHASE-COMPLETE.md + SESSION-BRIEF.md),
and evidence files (SNAPSHOTS/, live run results, goal gap reports).

The artifacts list is the inventory of what this session produced — it tells the
next session what artifacts it can reference.

### Commit chain
Each commit gets one line: `- [Phase label]: [shortened-hash](url) [brief description]`
Groups of commits from the same phase can be on one line: `- B+C: [hash](url) description`.
This section is only in the full implementation brief — phase-scoped briefs don't
include commit chains.

### Known constraint acknowledged
One sentence max. The single most important constraint that is known to be incomplete
or non-ideal but is accepted for this release. This is not a bug list — it's the
explicitly acknowledged architectural or coverage gap that the team has decided to
carry forward.

---

## ACCEPTANCE CRITERIA FOR SESSION-BRIEF.MD

Before SESSION-BRIEF.md is considered complete:

- [ ] Title line (h2) has a one-line description of what was accomplished
- [ ] Context line has: flow ID, human name, task type range, factory range, BFA rule numbers, family number, phase status, branch
- [ ] State line links to the state JSON and states phase_status + overallVerdict (or equivalent verdict)
- [ ] Next line states what the next session must do in one sentence
- [ ] Key facts has branch + date as first bullet
- [ ] Key facts has specific numbers (test counts, gate results) — not generic "passes"
- [ ] Documented deferrals are numbered and titled (if any deferrals exist)
- [ ] Artifacts produced lists all three categories (planning, session-end, evidence)
- [ ] Known constraint acknowledged is present (full brief) or known constraints stated (phase brief)

---

## KEY RULES

**1. The brief is written for the NEXT session, not as a completion report.**
Every section answers: "what does the next session need to know?" A completion report
would document what happened. The brief documents what the next session needs.

**2. Test counts must be specific, not generic.**
"All tests pass" is not acceptable. "58 server platform-agent specs pass / 10 client
platform-agent specs pass / bfa-cross-flow suite 32-suite/360-test green" is. The
next session needs to know the baseline to verify regressions.

**3. Deferrals are actionable, not complaints.**
"Per-tenant filter on Agent Sessions tab — sessions are MASTER-scoped today; need
targetTenantIds[] denormalisation or join with xiigen-agent-actions" describes the
problem and the fix approach. "Should have better tenant support" does not.

**4. The state line always links or references the state JSON.**
The next session starts from the state. If the brief says `GOAL_PARTIALLY_REACHED`
but the state JSON says `GOAL_REACHED`, there's a conflict. The state JSON is the
authoritative source; the brief reports what it says.

**5. Architectural decisions locked are permanent — write them as if they will
never change.**
The `AD-N` references in the brief correspond to locked decisions. Writing them in
the brief makes them visible without requiring the next session to read IMPL-STATE.json.

---

*End of GUIDE-B36 — SESSION-BRIEF.md*
*List A sources: ZIP-17 (FLOW-46/47 SESSION-BRIEF.md production examples),*
*ZIP-11 (FLOW-01 SESSION-BRIEF-A.md and SESSION-BRIEF-B.md phase-scoped examples)*
*Governed by: SK-428*
*Target B-type: B-36 — SESSION-BRIEF.md*
*Round: 46 of 72*
