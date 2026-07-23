---
name: session-mode-declaration
version: "1.0.0"
sk_number: SK-535
priority: MANDATORY
load_order: 1
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-535 Session Mode Declaration — Mode drift caught at declaration, not mid-session

A session that drifts from one mode to another mid-stream produces a contaminated output. The contamination is invisible when it happens and costly to unwind later. This skill makes mode an explicit, declared property with enforceable scope boundaries.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). The session was operating as ARCHITECT but repeatedly drifted into EXECUTOR mode — Luba would ask an architectural question and the session would respond with file paths, line numbers, and 6-step implementation plans. Each drift required an explicit correction ("stop DOING that"). The correction came from Luba, not from the session. The session had no mechanism to detect its own drift because no mode was declared in the first place. SK-535 installs the declaration + detection mechanism.

## When to Invoke

- At session start, after SK-529 (reconnaissance threshold met) but before first synthesis
- When a session's output visibly leaves its declared mode's scope
- When a user correction about "wrong level of output" suggests mode drift

One explicit declaration at session start = zero slow-drift correction cycles mid-session.

---

## Section 1 — Purpose

Sessions can produce work at five distinct abstraction levels. The same question at the wrong level produces the wrong answer, even if the answer is internally correct.

Asking "resolve the lock" of an ARCHITECT mode session means "make the conceptual decision about what the lock represents." Asking the same question of an EXECUTOR mode session means "write the diff that removes the constraint." Both answers can be well-formed. Only one is the right answer for any given question.

Mode drift is the failure where a session shifts abstraction level mid-output without noticing. The session decides it's been asked one question, answers a different question, and the user has to correct it. This skill prevents that by making mode explicit, testable, and enforceable.

---

## Section 2 — The 5 Session Modes

Every session declares exactly one of these modes.

| Mode | Produces | Scope-in | Scope-out |
|------|----------|----------|-----------|
| **ARCHITECT** | decisions, conceptual frames, trade-off analyses | goals, flows, user actions, acceptance criteria, round-trip stories, system-level invariants | file paths, line numbers, specific test code, field-level schemas, implementation diffs |
| **PLANNER** | turn lists, phase sequences, dependency graphs, session files | turns, gates, session files, phase sequences, dependencies, scope declarations | new design work, speculative capabilities, code implementation |
| **REVIEWER** | verdicts, gap reports, approval/rejection decisions | plan evaluation, gate checks, FC classes, arbiter verdicts, evidence verification | plan authoring, code changes, new design proposals |
| **EXECUTOR** | file changes, diffs, test runs, build outputs | file changes, line-precise edits, test runs, build checks, specific commands | new design decisions, scope changes, architectural trade-offs |
| **MATERIALIZATION** | 1-5 wiring tasks against existing design | inventory of existing artifacts, wiring gaps, round-trip verification, user-visible surface connections | re-design of already-designed artifacts, new task types, new archetypes |

**The scope boundaries are not preferences. They are enforceable gates.**

If ARCHITECT mode output contains file:line references above the SK-530 specificity threshold multiplied by 2, that is scope-out content and the session has drifted. If EXECUTOR mode output proposes a new architectural pattern, that is scope-out content and the session has drifted. Drift is detected, not tolerated.

---

## Section 3 — Declaration Protocol

At session start, after SK-529 reconnaissance threshold is met:

1. **Session declares exactly one mode** — not two, not "mostly X but also Y"
2. **Declaration requires written justification** — 1-2 sentences explaining why this mode fits the user's question
3. **Declaration is logged immutably to STATE.mode** — mode cannot silently change mid-session
4. **No synthesis output permitted before declaration** — declaration is a prerequisite, not a late-added annotation

Declaration template:

```markdown
## Session Mode (SK-535)

Declared mode: [ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION]

Justification:
[1-2 sentences. What about the user's question makes this mode correct?
Why is the adjacent mode wrong?]

Scope-out reminder:
[explicit list of what this session will NOT produce, drawn from the
scope-out column for the declared mode]
```

If Luba asks a question that does not fit any single mode cleanly — stop and ask. Don't guess. Multi-mode sessions are exactly how drift happens.

---

## Section 4 — Drift Detection (per-mode signals)

Each mode has specific signals that indicate the session has shifted to an adjacent mode. The session self-checks against these signals before every ⛔ STOP.

### ARCHITECT drifting to EXECUTOR

- Output contains file:line references exceeding SK-530 specificity threshold × 2
- Output proposes a specific diff, patch, or file change
- Output names a function to write or a test to add
- Output prescribes an execution order ("first do X, then Y, then Z")

### ARCHITECT drifting to PLANNER

- Output produces a turn list or phase sequence
- Output proposes session files, session types, or session sequences
- Output mentions specific gates, FCs, or arbiter configurations

### PLANNER drifting to ARCHITECT

- Output contains more scope-setting prose than plan content
- Output proposes new design decisions rather than orchestrating existing ones
- Output reconsiders a decision that was already settled upstream

### PLANNER drifting to EXECUTOR

- Output contains diffs or file contents
- Output runs or proposes running commands
- Output prescribes test assertions at the code level

### REVIEWER drifting to PLANNER

- Output proposes new turns instead of evaluating existing ones
- Output rewrites the plan rather than returning verdicts on it
- Output adds scope that the plan didn't have

### REVIEWER drifting to ARCHITECT

- Output reconsiders the architectural decision underlying the plan
- Output produces trade-off analyses outside of gap reports
- Output questions the goal rather than whether the plan delivers the goal

### EXECUTOR drifting to PLANNER

- Output changes the task sequence rather than executing tasks
- Output proposes new tasks mid-execution
- Output defers a task with a rationale instead of doing it

### EXECUTOR drifting to ARCHITECT

- Output proposes a design pattern instead of implementing one
- Output introduces a new concept to justify the implementation
- Output debates the approach instead of executing the approach

### MATERIALIZATION drifting to GENERATION (new design)

- Output proposes new task types, contracts, or topology nodes
- Output exceeds 5 tasks
- Output re-designs an artifact that already has a valid design
- Output adds design-reasoning decisions instead of wiring existing ones

---

## Section 5 — Resolution on Drift

**Detected drift is NOT corrected slowly mid-session.**

Slow-drift correction produces bad output — the whole session's context is already biased toward the drifted mode. Continuing in the "now correct" mode after 3000 tokens of drifted output doesn't produce a clean result; it produces a hybrid with the wrong frame baked in.

### Resolution steps

1. **Session ⛔ STOPs immediately** when drift is detected, even mid-response
2. **Session logs the drift event to STATE.mode.driftEvents** with:
   - The scope-out signal that was detected
   - The exact output excerpt that triggered the detection
   - Timestamp
3. **Luba decides**:
   - **Restart the session in the correct mode** (fastest path to clean output)
   - **Change the STATE.mode declaration** (with new justification — rare, indicates initial declaration was wrong)
   - **Proceed with current mode, accept known deviation** (records the deviation, downstream reviewers know to discount it)

A fresh session with explicit mode declaration is faster than correcting mid-course. The cost of restart is small; the cost of hybrid output is large (invisible contamination that shows up as reviewer confusion weeks later).

---

## Section 6 — STATE.mode Schema

```json
{
  "mode": {
    "declared": "ARCHITECT",
    "justification": "Luba asked for architectural review of XIIGen governance gaps. The question is about conceptual frames and decisions, not implementation paths.",
    "declaredAt": "2026-04-16T07:30:00Z",
    "scopeOutReminder": [
      "file paths",
      "line numbers",
      "specific test code",
      "field-level schemas",
      "implementation diffs"
    ],
    "driftEvents": [
      {
        "detectedAt": "2026-04-16T07:45:00Z",
        "signal": "Output contains file:line references exceeding threshold (8 references vs threshold of 4 for ARCHITECT)",
        "triggerExcerpt": "[verbatim 1-2 sentences from the output that contained the drift]",
        "resolution": "LUBA_RESTART",
        "resolutionTimestamp": "2026-04-16T07:46:00Z"
      }
    ]
  }
}
```

Every synthesis output can be validated against STATE.mode.declared + scope-out list. Reviewers (Gate 0g in CODE-REVIEW-PROTOCOL-v1.3) verify that session output matches its declared mode.

---

## Section 7 — Worked Examples

### Example A — FAIL (drift not caught, from this session)

**Declared mode:** ARCHITECT (implicit — no SK-535 yet existed to force declaration)

**Luba's question:** "Resolve the lock" (sidebar about FLOW_SCOPED+tenantId tension)

**Session output:**
- 6-file implementation plan
- Specific file path `server/src/rag-init/connection-types.ts:82-86`
- Step sequence ("first update validator, then refactor 388 locations, then migrate data...")
- Concrete diff proposals

**Drift signals detected in retrospect:**
- file:line references: 1 (connection-types.ts:82-86) — EXCEEDS architect threshold for this type of question
- diff proposals: present — SCOPE-OUT for ARCHITECT
- execution order prescribed: "first X, then Y, then Z" — SCOPE-OUT for ARCHITECT

**What SK-535 would have produced:**
- STATE.mode.declared = ARCHITECT
- Output would self-check before ⛔ STOP
- Drift detected: 6-file plan with execution order → EXECUTOR scope
- ⛔ STOP triggered, Luba informed of drift
- Luba's correction ("stop DOING that") arrives as automatic skill-level detection, not as human-level intervention

**What Luba got instead:** the session drifted, Luba corrected manually, session eventually produced the three-orthogonal-fields architect decision. The architect answer was correct in the end, but it took two rounds of explicit correction to arrive at.

### Example B — PASS (mode declared, drift prevented)

**Declared mode:** MATERIALIZATION

**Justification:** "Luba uploaded existing codebase + historyRag. Question is about inventorying existing design and identifying wiring gaps to user-visible surfaces. New design is out of scope by SK-532 default."

**Scope-out reminder:** no new design, no new task types, no new archetypes, no >5-task plans.

**Session output:**
- Inventory: 14 topology files, 10 empty, 40+ services, MarketplacePackageController found
- Gap: marketplace bootstrap doesn't call publish (0 grep hits); FlowLibraryPage:147 hardcoded disabled
- 4 tasks: enrich 10 empty topologies / bootstrap auto-publish / marketplace client page / re-enable Fork
- Round-trip verification (from SK-533)

**Self-check against scope-out:**
- New task types proposed? NO
- New archetypes? NO
- >5 tasks? NO (4 tasks)
- Re-design of artifacts with valid design? NO (wiring, not re-design)

**Result:** clean MATERIALIZATION output. No drift. No Luba correction needed. This is what the parallel instance produced in two minutes.

---

## Section 8 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** runs first. SK-535 runs immediately after reconnaissance threshold is met. Mode cannot be declared before reconnaissance because the mode depends on what the reconnaissance reveals (e.g., if design exists → MATERIALIZATION by default).

- **SK-536 Goal Context Persistence (load_order 2):** runs immediately after SK-535. Goal statement is loaded after mode is declared because the mode affects how the goal is decomposed (ARCHITECT decomposes into conceptual questions; MATERIALIZATION decomposes into round-trip steps).

- **SK-528 Pipeline Position Check:** Q0 answers depend on mode. Q0d consumer requirement reads differently for ARCHITECT vs MATERIALIZATION — architect consumers need decisions; materialization consumers need wiring.

- **SK-530 Specificity Calibration:** thresholds per session type are derived from mode. ARCHITECT threshold is 11 concrete references; MATERIALIZATION is 20. Mode declaration sets the threshold SK-530 enforces.

- **SK-532 Materialization Session Type:** triggers automatic mode declaration when design exists. Rule 28 in SESSION-LOAD-PLAN-v23 installs the automatic routing.

- **Rule 29 in SESSION-LOAD-PLAN-v23:** formalizes SK-535 as mandatory at session start. Phase 08 installs Rule 29.

- **Gate 0d in CODE-REVIEW-PROTOCOL-v1.3:** reviewer verifies session output matches declared mode. Spot-checks 3 random output segments against the scope-out list. Phase 09 installs Gate 0d.

---

## Section 9 — Anti-patterns

1. **"I'll pick the mode as I go"** — mode declaration is before first synthesis, not inferred from output retrospectively. Retrospective mode labels are rationalization, not discipline.

2. **"It's multi-mode"** — no session is multi-mode. If a question genuinely requires two modes, the session handles one and punts the other to a follow-up session with its own declaration.

3. **"Implicit mode"** — implicit modes drift. Declare explicitly or get drift.

4. **"Mode changed mid-session because the question evolved"** — if the question genuinely evolved, stop the current session and restart with the new mode. Mid-session mode changes contaminate the existing context.

5. **"Let me correct the drift in the next response"** — corrections at the response level leave drifted context intact. Restart is faster than correction.

6. **"The user didn't mind the extra specificity"** — scope-out content degrades the output even when the user doesn't flag it. The flag may come 4 rounds later when the contamination compounds.

---

## Universal Bits (UUS G07) — single-mode enforcement, TS executor outputs, one canonical file

These are the universal cross-project bits this skill must carry (imported from core via the universal-skills mapping). They are TS-adapted for the mvp stack (NestJS + React, Jest/Playwright, `DataProcessResult<T>` as the domain wrapper — the core `OperationResult<T>` stays in `llm_mvp_core` and never leaks here).

### Exactly one of five modes, declared before first synthesis (enforceable, not a preference)

Every session declares exactly one of **ARCHITECT / PLANNER / REVIEWER / EXECUTOR / MATERIALIZATION** before the first synthesis output. No multi-mode session. `scope-in` / `scope-out` is an enforceable gate: drift is **detected and the session STOPs**, it is not "stretched" to fit. This is the universal anti-drift rule; Sections 2–5 above are its mvp implementation.

### Mode scope-out mapped to the mvp stack

- **EXECUTOR output** = a real `git diff` plus Jest / Playwright run output (`cd server && npx jest`, `cd client && npx jest`, `npx playwright test`). EXECUTOR never proposes a new architectural pattern or a new NestJS module boundary.
- **ARCHITECT output** = decisions about NestJS module boundaries / RAG-pipeline shape **without** method signatures, file paths, or line numbers. ARCHITECT never emits a copy-paste diff.
- The declared mode is recorded in the project STATE-JSON (the `GUIDE-B0x-*-STATE-JSON` family), under a `mode` object — not in a `STATE-Pn.json` snapshot.

### One canonical file (de-duplication is part of this skill)

This skill exists in more than one place in the mvp tree (`.claude/skills/planning--session-mode-declaration-SKILL.md`, `.agents/skills/...`, and dir-skill variants). The universal rule is **one canonical source** so drift-detection does not diverge between competing indexes. When two copies disagree, reconcile to this canonical file and treat the others as mirrors, never as independent authorities. Do not fork the drift-signal table.

## END OF SK-535
