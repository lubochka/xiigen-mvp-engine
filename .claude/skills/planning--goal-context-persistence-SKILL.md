---
name: goal-context-persistence
version: "1.0.0"
sk_number: SK-536
priority: MANDATORY
load_order: 2
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-536 Goal Context Persistence — User goal as first-class session state

In a long session, the user's original goal statement drifts out of active attention. By turn 10 the session is answering proxies for the goal rather than the goal itself. This skill prevents that by making the goal a persistent, re-read, first-class session artifact.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16) and from retrospective analysis of the User Journey Reconnection plan (v1 through v27). v27 went through 22 review rounds with 55 findings applied, converged on internal correctness, and silently missed 3 of 4 user-stated goals. Zero findings in any of the 22 rounds referenced the original 4-goal statement verbatim. The goal existed in the user's head. It existed in the first message of the first session. It did not exist in the active context of rounds 3-22. SK-536 fixes this by anchoring the goal to every ⛔ STOP.

## When to Invoke

- At session start, after SK-529 (reconnaissance) and SK-535 (mode declaration), before first synthesis
- At every ⛔ STOP gate (Goal reminder block required at top of output)
- At designated turn checkpoints for sessions exceeding 10 turns
- Whenever the session's output direction feels unclear (re-read the goal)

One explicit goal load at session start + reminder at every STOP = zero "we forgot what you were asking for" cycles.

---

## Section 1 — Purpose

Human working memory is limited, and so is a session's active context. Across a long session:

- Round 1 output is framed around the user's goal because the goal was just stated.
- Round 3 output is framed around Round 2 output because Round 2 is fresher.
- Round 7 output is framed around Round 5-6 synthesis.
- By Round 15, the session is answering a question two or three hops removed from what the user actually asked.

Each individual hop feels rational in the moment. The cumulative drift is invisible from inside the session and obvious from outside. v27's 22-round drift is a textbook example: each round responded competently to the previous round, and the cumulative output missed three of four goals.

SK-536 anchors the goal. The verbatim goal statement is re-read at every ⛔ STOP. Every session output explicitly ties back to the goal. Drift gets surfaced as soon as it starts, not after 20 rounds.

---

## Section 2 — Goal Loading Protocol

At session start, after SK-529 reconnaissance threshold is met and SK-535 mode is declared:

1. **Capture user's goal statement verbatim** into STATE.goalContext.statement. Verbatim means the exact characters the user typed, not a cleaner paraphrase. Preserving original word choice is important — the user's specific language often encodes constraints that a paraphrase would smooth away.

2. **If no explicit goal is stated**, ask Luba for one before proceeding. Don't infer. Don't guess. A session without a declared goal has no anchor against which drift can be detected.

3. **If multiple goals are stated**, capture them as a list and require lane structure per Rule 31 (from SESSION-LOAD-PLAN-v23). Multi-goal sessions where the goals are not decomposed into lanes are exactly how 3-of-4 coverage failures happen.

4. **Goal statement is immutable** for the duration of the session. If Luba restates or refines the goal, that is a new session (new STATE.goalContext), not an edit to the current one.

---

## Section 3 — Goal Reminder Block (required at every ⛔ STOP)

Every session output at a ⛔ STOP gate begins with:

```markdown
## Goal reminder (SK-536)

Luba's stated goal for this session:
"[verbatim goal statement from STATE.goalContext.statement]"

Session mode: [declared mode from STATE.mode.declared]

This round advances the goal by:
[ONE SENTENCE — concrete observable progress, not abstract framing]
"By [verb] [specific artifact], [specific goal element] moves from [prior state] to [new state]."

Round-trip step(s) advanced (if tenant-facing work): [SK-533 step references]
Round-trip step(s) still blocked: [step references, or "N/A"]
```

**The "This round advances the goal by" field is mandatory.** If the round cannot state concrete observable progress toward the goal, the round produced no goal-relevant output. That's a useful thing to know — surface it explicitly rather than hide it in output the user has to interpret.

Phrases that FAIL the concrete-progress test:
- "Working on goal X" (no verb of completion)
- "Making progress on Y" (no observable delta)
- "Explored implications of Z" (no state change)
- "Considered options for W" (no decision recorded)

Phrases that PASS:
- "By authoring SK-529, load-order-0 gate for reconnaissance moves from NOT_EXIST to EXISTS."
- "By verifying topology contracts, 'design is done' claim moves from PENDING to DISCONFIRMED (10 of 14 empty)."
- "By drafting round-trip steps 2→3 wiring, marketplace advancement moves from 0/8 steps to 1/8 steps."

mvp product-delta examples (observable, stack-concrete):
- "By adding the BM25 stage, retrieval moves from vector-only to BM25+vector (FastAPI eval recall@10: 0.61→0.74)."
- "By adding the provider spec, FLOW-XX moves from 0→1 tested (`npx jest --testPathPatterns flow-XX` → 12 passed)."
- "By wiring the controller route, the React panel moves from 404 to rendering data (`npx playwright test panel.spec.ts` → 0 failed)."
The delta must be a concrete observable in mvp terms, backed by the actual
test/eval command — not "improved RAG" or "made progress".

---

## Section 4 — Goal Refresh Protocol for Long Sessions

Sessions exceeding 10 turns are subject to drift regardless of individual turn quality. SK-536 requires explicit re-reading at checkpoints:

| Turn | Action |
|------|--------|
| N/2 | Re-read STATE.goalContext.statement in full. Produce "goalCheckpoint" entry with current alignment verdict. |
| N   | Re-read. Checkpoint. |
| 3N/2, 2N, 5N/2, ... | Re-read. Checkpoint. |

Where N = 10 for standard sessions, N = 5 for high-stakes sessions (explicit governance work, multi-goal plans).

### goalCheckpoint entry

```json
{
  "turn": 15,
  "timestamp": "2026-04-16T08:30:00Z",
  "goalStatementRelativelyRelevantToRecentRounds": "[PARTIAL | FULLY | LOW]",
  "roundsSinceLastGoalReference": 7,
  "progressStatement": "[what has objectively changed toward the goal]",
  "alignmentVerdict": "ON_GOAL | DRIFTING | OFF_GOAL",
  "driftReason": "[if drifting or off-goal, the specific proxy the session has been answering instead]"
}
```

### Alignment verdicts

- **ON_GOAL**: recent rounds produced output traceable to the goal. Continue.
- **DRIFTING**: recent rounds are responding to prior-round output rather than the goal. Warning. Next round must re-anchor.
- **OFF_GOAL**: recent rounds are answering a different question entirely. Stop and ask Luba for redirection — do not silently continue.

---

## Section 5 — STATE.goalContext Schema

```json
{
  "goalContext": {
    "statement": "Make XIIGen architecture sessions produce proper planning and reviewing at the level grounded in file counts and line numbers, not abstract lanes. Close the 9 governance gaps identified in the session-load / skill / review layers so that future sessions reach the 4-task answer the other instance produced.",
    "capturedAt": "2026-04-16T07:25:00Z",
    "capturedFrom": "Luba message at turn 42 of session XIIGEN-GOVERNANCE-AUTHORING-R1",
    "multiGoal": false,
    "goalElements": [
      "Governance produces proper planning at architect level",
      "Governance produces proper reviewing",
      "Future sessions reach 4-task concrete answer (not 4-lane abstraction)",
      "9 governance gaps closed"
    ],
    "goalCheckpoints": [
      {
        "turn": 5,
        "timestamp": "2026-04-16T07:40:00Z",
        "progressStatement": "Master plan and STATE.json authored; SK-529 authored; Phase 01 COMPLETE.",
        "alignmentVerdict": "ON_GOAL"
      }
    ],
    "goalComplete": false,
    "refreshIntervalTurns": 5
  }
}
```

---

## Section 6 — Goal Drift Signals

The session self-checks these signals and escalates if detected:

| Signal | Threshold | Action |
|--------|-----------|--------|
| Output references artifacts/concepts the goal does not mention | >30% of output by word count | STOP, re-anchor |
| Rounds since last goal reference in output | ≥ N/2 (5 for governance work) | STOP, re-anchor |
| Consecutive rounds with alignmentVerdict = DRIFTING | ≥2 | STOP, re-anchor |
| Session length exceeds N turns without a goalCheckpoint | yes | STOP, force checkpoint |
| Output's "This round advances the goal by" field is empty or abstract | yes | STOP, rewrite round |
| Luba's recent messages contain corrective language ("no — X", "stop doing Y", "you forgot W") | any | STOP, re-anchor immediately |

Last signal is critical: user correction is the most reliable drift detector. If Luba corrects direction, the session has drifted, regardless of the session's internal sense of alignment.

---

## Section 7 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** runs first. Goal context is loaded after reconnaissance because the goal's relevance is evaluated against what reconnaissance revealed. A goal of "make X visible" means different things if reconnaissance shows X exists vs if reconnaissance shows X doesn't exist.

- **SK-535 Session Mode Declaration (load_order 1):** runs before SK-536. Mode affects how the goal is decomposed (ARCHITECT decomposes into conceptual questions; MATERIALIZATION decomposes into round-trip steps). STATE.mode must be set before STATE.goalContext.goalElements is derived.

- **SK-531 Claim-as-Hypothesis:** user statements about the goal itself (e.g., "we already solved this goal") are claims that require verification via reconnaissance.

- **SK-532 Materialization Session Type:** in MATERIALIZATION mode, goalElements decompose into SK-533 round-trip steps. Each element maps to one or more round-trip step advances.

- **SK-533 MVP Round-Trip Verification:** provides the vocabulary ("step 3 of round-trip") for the "This round advances the goal by" field when sessions do tenant-facing work.

- **SK-534 Goal Delivery Completeness Arbiter:** reads STATE.goalContext.statement as its primary input. SK-534 is the review-time mechanism that verifies plans deliver what SK-536 captures at session start.

- **SK-443 Gate D (session-file-authoring):** requires every session file to reference STATE.goalContext.statement. Phase 07 installs Gate D.

- **Rule 30 in SESSION-LOAD-PLAN-v23:** formalizes SK-536 as mandatory at session start. Phase 08 installs Rule 30.

---

## Section 8 — Worked Examples

### Example A — FAIL (goal drift in long session, from v27 retrospective)

**Original goal statement (session 1, turn 1):**
"I want: (1) design simulation, teach/QA produce decision flows visible in user's flow menu; (2) teach/QA workflow visible to each user; (3) each flow reflected in tenant admin panel, private to tenant; (4) each tenant can adapt and export flows through marketplace."

**Session count:** 22 review rounds, 55 findings applied.

**Goal references in rounds 3-22:** zero verbatim references. Multiple references to "the plan" and "the turns" and "the gates." No references to the 4 original goal elements.

**Round 22 output:**
"Plan approved. 15 turns covering infrastructure, adapters, marketplace packaging. Arbiter panel verdicts: APPROVED on all 8 arbiters. Ready for execution."

**Acceptance result:** 3 of 4 goals silently missing from plan. Review rounds confirmed what the plan contained, never checked what the goal required.

**What SK-536 would have produced:**
- STATE.goalContext.statement captured verbatim at round 1
- Round 5 goalCheckpoint: alignmentVerdict = DRIFTING (plan is about infrastructure, goal is about visibility)
- Round 10 goalCheckpoint: alignmentVerdict = DRIFTING (2nd consecutive — triggers STOP)
- Round 10 STOP presents goal reminder block showing only Goal 1 has turns; Goals 2, 3, 4 unmapped
- Luba informed at round 10, not round 22

### Example B — PASS (goal persistence in active session)

**Original goal statement (session XIIGEN-GOVERNANCE-AUTHORING-R1, turn 42):**
"Make XIIGen architecture sessions produce proper planning and reviewing at the level grounded in file counts and line numbers."

**Session 2 (Phase 01 execution):**
- STATE.goalContext.statement copied from master plan file at session start
- Every ⛔ STOP begins with Goal reminder block quoting the statement
- "This round advances the goal by: authoring SK-529 as load-order-0 skill, which installs reconnaissance-grounded evidence as a prerequisite for all future architect and materialization sessions."
- Round-trip step advanced: n/a (governance work, not tenant-facing)
- Round-trip step still blocked: n/a

**Session 3 (Phase 02 execution):**
- Same STATE.goalContext.statement loaded
- Round 1 begins with same Goal reminder block
- "This round advances the goal by: authoring SK-535 and SK-536, which install session-mode declaration and goal context persistence — together closing governance gaps 2 and 3 of 9."
- Goal element progress: 2 of 9 gaps closed (SK-529 in session 2, SK-535+SK-536 this session)

Result: every session is explicitly anchored to the same goal. Progress is observable round-to-round. Drift is detectable from the Goal reminder block alone.

---

## Section 9 — Anti-patterns

1. **"The goal is obvious, I don't need to quote it"** — obvious goals drift fastest because no one watches them. The verbatim quote is the anchor; no quote means no anchor.

2. **"I'll paraphrase the goal for cleanliness"** — the user's word choice matters. "Make X visible" and "surface X" look synonymous; they can encode different constraints. Capture verbatim.

3. **"The goal can evolve during the session"** — if the goal evolves, the session ends and a new one begins with a new STATE.goalContext. Mid-session goal edits produce goal-version ambiguity.

4. **"Round 15 output is obviously on-topic"** — the whole point of checkpoints is that "obviously on-topic" is unreliable after many rounds. Mechanical re-reading catches what intuition misses.

5. **"I'll write 'advances the goal by' abstractly since the progress is abstract"** — if the progress is abstract, the round produced little goal-relevant output. Surface that, don't hide it in vague language.

6. **"Luba hasn't objected, so we must be on-track"** — silence is not alignment. Luba may be deferring to session judgment, or may not have read round 12 carefully yet. Checkpoint anyway.

---

## END OF SK-536
