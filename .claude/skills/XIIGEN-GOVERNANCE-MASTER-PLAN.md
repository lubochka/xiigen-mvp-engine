# XIIGEN ARCHITECTURE GOVERNANCE — MASTER PLAN

**Version:** 1.0.0
**Date:** 2026-04-16
**Author:** XIIGen architect session
**Owner:** Luba

---

## GOAL

Make XIIGen architecture sessions produce proper planning and reviewing at the level the other instance demonstrated (4 concrete tasks grounded in file counts and line numbers) — not at the level this session kept defaulting to (abstract lanes with structural gaps).

This plan adds governance layers — skills, session rules, review gates, design review protocol — that channel future sessions toward evidence-grounded, goal-anchored, specific output.

---

## WHY THIS PLAN EXISTS

v1-v27 of the User Journey Reconnection plan went through 22 review rounds with 55 findings applied. The plan converged on internal correctness AND silently missed 3 of 4 user goals. The arbiter panel caught every correctness bug and no completeness bug. This was not a failure of any individual skill; it was a structural gap in the panel's coverage.

Five specific behaviors were missing from session discipline:
1. Reconnaissance before reasoning (read files, count things, quote specifics — not essay first)
2. User claims treated as hypotheses, not facts
3. Specificity calibrated as the architect signal (MORE specific, not less)
4. Wide-scope requests interpreted as more evidence, not more abstraction
5. Materialization work (wiring existing design) distinguished from Generation work (new design)

Plus four review-discipline gaps:
1. Goal Delivery Completeness never validated
2. Session mode drift tolerated rather than caught at declaration
3. User goal not held as first-class context across long sessions
4. Design artifacts checked for existence, never for completeness

Nine new skills + four modified skills + session-load v23 + code-review v1.3 + new design-review protocol close these gaps. Split into 10 phases, one phase per session.

---

## PHASE SEQUENCE

| Phase | Focus | Primary Deliverable | Depends On |
|-------|-------|--------------------|------------|
| 01 | Reconnaissance Gate | SK-529 | nothing — root cause fix, author first |
| 02 | Session Mode + Goal Context | SK-535 + SK-536 | Phase 01 |
| 03 | Claim Verification + Artifact Completeness | SK-531 + SK-537 | Phase 01 |
| 04 | Materialization + MVP Round-Trip | SK-532 + SK-533 | Phases 01-03 |
| 05 | Specificity + Goal Delivery | SK-530 + SK-534 | Phases 01, 04 |
| 06 | Modify plan-review-skill | SK-410 v2.0 | Phase 05 (needs SK-534) |
| 07 | Modify completeness + arbiter + session file | SK-441, SK-442, SK-443 | Phase 05 |
| 08 | Session-load plan v23 | XIIGEN-SESSION-LOAD-PLAN-v23 | All skill phases |
| 09 | Code review protocol v1.3 | XIIGEN-CODE-REVIEW-PROTOCOL-v1.3 | Phase 06, Phase 08 |
| 10 | Design review protocol v1 | XIIGEN-DESIGN-REVIEW-PROTOCOL-v1 | Phase 07 |

Parallelization opportunities:
- Phases 02 and 03 can run in parallel after Phase 01 lands
- Phases 06 and 07 can run in parallel after Phase 05 lands
- Phases 09 and 10 can run in parallel after Phase 08 lands

Serial critical path: 01 → 04 → 05 → 06 → 08 → 09. Six phases minimum if nothing parallelizes. Ten phases if each runs alone, which is the default.

---

## PHASE 01 — Reconnaissance Gate (SK-529)

**Why first:** every other gap stems from "didn't read the files before answering." Until reconnaissance is mandatory and threshold-gated, the other skills can't be enforced because the session won't have evidence to apply them against.

**Deliverable:** `planning--reconnaissance-gate-SKILL.md` (SK-529)

**Expected contents:**
- Load order: 0 (runs before SK-528 Q0)
- Thresholds per session type: PLANNING=10 file reads, MATERIALIZATION=20, ARCHITECT=20, REVIEW=15, EXECUTOR=5
- RECON REPORT template with required fields (raw counts, filenames with sizes, specific line references, verbatim excerpts)
- Integration with STATE.recon (saved before any synthesis)
- Synthesis-to-evidence linkage rule (every hypothesis in synthesis must point back to a RECON REPORT line)
- Examples of good and bad reconnaissance (from the Luba correction that produced this plan)
- Integration with existing SESSION-START-GATE (runs before Q0)

**Gate criteria (session cannot close without):**
- Skill file exists at `planning--reconnaissance-gate-SKILL.md`
- All thresholds specified
- STATE.recon schema defined
- At least two worked examples (one PASS, one FAIL)
- Integration note to be added to HOW-TO-USE-SKILLS at Phase 08

**Round output:** Phase 01 completion = ⛔ STOP with ONE file committed and one STATE update.

---

## PHASE 02 — Session Mode Declaration + Goal Context Persistence (SK-535, SK-536)

**Why second:** foundational session governance. Both run at session start and both are small enough to pair in one session.

**Deliverables:**
1. `planning--session-mode-declaration-SKILL.md` (SK-535)
2. `planning--goal-context-persistence-SKILL.md` (SK-536)

**SK-535 expected contents:**
- Mode types: ARCHITECT | PLANNER | REVIEWER | EXECUTOR | MATERIALIZATION
- Scope-in / scope-out lists per mode
- Mode drift detection patterns (e.g., ARCHITECT mode starting to reference file:line is drift)
- Resolution: stop-and-restart, not slow-drift correction
- STATE.mode schema

**SK-536 expected contents:**
- User's original goal statement loaded as STATE.goalContext at session start
- Goal reminder block format (emitted at every ⛔ STOP gate)
- Goal refresh protocol for long sessions
- Examples of goal drift and how persistence prevents it

**Gate criteria:**
- Both files exist
- Both skills have YAML header with load_order, priority, triggers
- STATE schema additions documented
- Mode drift and goal drift examples included

---

## PHASE 03 — Claim-as-Hypothesis + Design Artifact Completeness (SK-531, SK-537)

**Why third:** verification safety nets. Pair because both prevent false-positive completeness signals.

**Deliverables:**
1. `planning--claim-as-hypothesis-SKILL.md` (SK-531)
2. `planning--design-artifact-completeness-SKILL.md` (SK-537)

**SK-531 expected contents:**
- User assertion triggers ("the design is done," "X already exists," "this already works," "we already produced Y")
- STATE.claims schema (status: PENDING_VERIFICATION | VERIFIED | DISCONFIRMED)
- Required verification action per claim (file read, grep, count)
- Gate rule: session cannot ⛔ STOP with any PENDING_VERIFICATION claim
- Example: "the design is documented" → read 14 topology files → 10 empty → claim DISCONFIRMED

**SK-537 expected contents:**
- 5 checks: files exist, required fields populated, content specific (not copy-paste), matches implementation, seeded to RAG
- Per-artifact-type rules (topology, contract, design-reasoning, arbiters, event-schemas)
- Empty-array detection ("nodes: []" = design-incomplete, not design-done)
- Output format: table with PASS/FAIL/PARTIAL per check per artifact

**Gate criteria:**
- Both files exist
- Check logic specified (can be run as a script)
- Example run against current codebase (10-of-14-empty finding reproducible)

---

## PHASE 04 — Materialization Session Type + MVP Round-Trip Verification (SK-532, SK-533)

**Why fourth:** product discipline. Requires claim verification (Phase 03) to verify "this already exists" before classifying the session as Materialization.

**Deliverables:**
1. `planning--materialization-session-type-SKILL.md` (SK-532)
2. `planning--mvp-round-trip-verification-SKILL.md` (SK-533)

**SK-532 expected contents:**
- New session type definition (alongside GENERATION, PLANNING, INVESTIGATION, DEBUG, QA, TRANSFORMATION)
- Purpose: wire existing designed artifacts into user-visible surfaces
- Mandatory inputs: pointer to design docs + pointer to fixtures + pointer to user-facing surface
- Process: inventory → gap identify → minimal wiring → verify round-trip
- Output shape constraint: 1-5 tasks, not 10-15 turns
- Default trigger: any work touching an artifact with existing design/fixture/contract

**SK-533 expected contents:**
- Canonical round-trip: master tenant → publish → another tenant installs → another tenant runs → result observable
- XIIGen-specific instantiation: master tenant authors flow → xiigen-flow-templates → marketplace package → tenant install → tenant library → flow runs
- Verification protocol per round-trip step
- Integration: every session claiming to deliver a user goal nominates which round-trip it moves

**Gate criteria:**
- Both files exist
- Session type registered in HOW-TO-USE-SKILLS (note added for Phase 08)
- Round-trip acceptance test template produced
- Integration example showing how a user goal maps to round-trip progress

---

## PHASE 05 — Specificity Calibration + Goal Delivery Completeness Arbiter (SK-530, SK-534)

**Why fifth:** review discipline. These two skills enforce answer quality and plan coverage — the layer that catches "abstract answer" and "unmapped goal."

**Deliverables:**
1. `planning--specificity-calibration-SKILL.md` (SK-530)
2. `planning--goal-delivery-completeness-SKILL.md` (SK-534)

**SK-530 expected contents:**
- Scoring formula: count of file:line references + count of N-of-M integer claims + count of verbatim quoted excerpts
- Thresholds per session type (ARCHITECT=10 concrete references minimum, PLAN-REVIEW=20)
- Self-check before ⛔ STOP
- Rejection criteria for abstract output
- Example: "4 lanes with structural gaps" (score 0) vs "10 of 14 empty, line 147 disabled" (score 8) — one passes, one fails

**SK-534 expected contents:**
- First arbiter in every plan review panel
- Input: user's goal statement verbatim + plan's turn list
- Output: Goal → Turn mapping table with verification per goal
- Plan REJECTED if any goal has zero turns or no verification
- Runs BEFORE correctness arbiters — pointless to audit turns for bugs if turn set doesn't deliver goals
- Integration with SK-442 arbiter-panel-design (as 9th mandatory arbiter — delivered in Phase 07)

**Gate criteria:**
- Both files exist
- Scoring rubric published and reproducible
- Goal-to-turn mapping template specified
- Examples showing v27 would have been flagged at round 1 with SK-534 present

---

## PHASE 06 — Modify plan-review-skill (SK-410 v1.1 → v2.0)

**Why sixth:** integrate SK-534 into the existing 13-failure-class battery. Requires Phase 05 to have authored SK-534.

**Deliverable:** updated `planning--plan-review-SKILL.md` (version 2.0.0)

**Expected changes:**
- Add FC-14: Goal Delivery Completeness (runs FIRST before FC-1..13)
- Add FC-15: Design Artifact Populated (runs FIRST before FC-1..13)
- Both new FCs reference SK-534 and SK-537 as their governing skills
- Battery expanded from 13 to 15 failure classes
- Detection patterns per new FC
- Integration with 3-Gate Approval (A/B/C)
- Version bump to 2.0.0 (major — because ordering changed: new gates run first)

**Gate criteria:**
- File updated, version 2.0.0 in header
- FC-14 and FC-15 specified with detection patterns
- Ordering rule documented (14/15 before 1-13)
- Backward-compatibility note for plans produced under v1.1

---

## PHASE 07 — Modify flow-completeness-checker + arbiter-panel-design + session-file-authoring

**Why seventh:** integrate goal-delivery discipline into the three skills that govern completeness checks, arbiter panels, and session file authoring. Can run in parallel with Phase 06.

**Deliverables:**
1. Updated `planning--flow-completeness-checker-SKILL.md` (v1.5 → v2.0) — add V32, V33
2. Updated `planning--arbiter-panel-design-SKILL.md` — 9th mandatory arbiter
3. Updated `planning--session-file-authoring-SKILL.md` — Gate D

**SK-441 v2.0 expected changes:**
- V32: Goal-to-Turn Mapping (derived from SK-534)
- V33: Artifact Populated (derived from SK-537)
- Checklist expanded from 33 to 35 items
- V32/V33 run at same time as V0-MODE, V0-SCOPE (structural gates)

**SK-442 expected changes:**
- 9th mandatory arbiter: Goal Delivery (derived from SK-534)
- Minimum panel table updated — every archetype now has 9 arbiters
- Goal Delivery context package defined (receives user goal + plan; nothing else)

**SK-443 expected changes:**
- Gate D: session file must reference the user goal it advances
- Session files without goal reference are rejected
- Goal reference format specified

**Gate criteria:**
- All three files updated, versions bumped
- New rules integrate cleanly with existing structure
- No contradictions with SK-410 v2.0 from Phase 06

---

## PHASE 08 — Session-Load Plan v22 → v23

**Why eighth:** integrate all new skills into the load order. Requires all skill phases (01-07) to have authored the skills being loaded.

**Deliverable:** `XIIGEN-SESSION-LOAD-PLAN-v23.md`

**Expected rule additions:**
- Rule 25: Reconnaissance before synthesis (SK-529)
- Rule 26: Wide-scope mode — user signals "see the whole picture" / "don't save tokens" → double reconnaissance threshold
- Rule 27: Claims require verification (SK-531)
- Rule 28: Default session type = MATERIALIZATION when design exists (SK-532)
- Rule 29: Session mode declaration (SK-535)
- Rule 30: Goal context loading (SK-536)
- Rule 31: Multi-goal plans must declare lanes

**Load order update:**
- SK-529 at position 0 (before SK-528 Q0)
- SK-535, SK-536 at session start
- SK-531 as a verification layer
- SK-532 as default session type trigger
- SK-534 as first arbiter in every plan review

**Gate criteria:**
- File exists, v23 in header
- All 7 rules have triggers and examples
- Load order reproducible
- Backward-compatibility note for sessions started under v22

---

## PHASE 09 — Code Review Protocol v1.2 → v1.3

**Why ninth:** integrate review-side gates. Requires Phase 06 (plan-review-skill v2.0) and Phase 08 (session-load v23) to have landed.

**Deliverable:** `XIIGEN-CODE-REVIEW-PROTOCOL-v1.3.md`

**Expected gate additions:**
- Gate 0d: Reconnaissance Evidence — plan has grounded evidence base
- Gate 0e: Already-Exists Check — before approving "build X," verify X doesn't exist
- Gate 0f: Minimal-wiring preference — Materialization plans have ≤5 tasks
- Gate 0g: Goal Delivery Completeness — runs FIRST, before all other gates
- Gate 0h: Artifact Populated Check — verify referenced artifacts have non-empty content

**Integration:**
- Gate 0g takes precedence over Gates 0a, 0b, 0c
- Gate 0d precedes all review passes
- Gate 0e, 0f, 0h run per-turn during review
- Version bump to 1.3

**Gate criteria:**
- File exists, v1.3 in header
- All 5 gates specified with detection patterns
- Ordering rule documented
- Example: v27 plan re-run through v1.3 protocol — would fail Gate 0g immediately

---

## PHASE 10 — Design Review Protocol v1 (NEW DOCUMENT)

**Why tenth:** design review is a new parallel track to code review. Doesn't block anything upstream. Runs last as the capstone.

**Deliverable:** `XIIGEN-DESIGN-REVIEW-PROTOCOL-v1.md`

**Expected contents:**
- Purpose: review design artifacts as standalone artifacts, not as inputs to a plan
- Check 1: Files exist (all expected fixtures present)
- Check 2: Fields populated (required fields non-empty — catches `nodes: []`)
- Check 3: Content specific (not copy-pasted across flows)
- Check 4: Matches implementation (design ↔ service alignment)
- Check 5: Seeded to RAG (design artifacts reach xiigen-rag-patterns as FLOW_SCOPED)
- Output format: table per flow, one row, one cell per check, PASS/FAIL/PARTIAL
- Integration with code review (parallel tracks, both run in review phase)
- Relationship to SK-537 (same underlying check logic, different aggregation)

**Gate criteria:**
- File exists, v1 in header
- All 5 checks specified with detection patterns
- Example run against current codebase: would produce the 10-of-14 table the other instance generated
- Documented as "runs alongside code review" — parallel tracks, not sequential

---

## VALIDATION OF THE WHOLE PLAN

After all 10 phases land, re-run the test that prompted this plan:

**Test input:** fresh session, armed with v23 session-load + v1.3 code-review + v1 design-review + all new skills, receives Luba's original question: "During the flow design we already produced the proper teaching sets, and the design flows. We need to make them visible."

**Expected output:** the 4-task list the other instance produced (enrich 10 empty topology files / bootstrap auto-publish / marketplace client page / re-enable Fork button) — NOT the 4-lane abstraction this session defaulted to.

If the fresh session produces the 4-task list: plan worked, governance works.
If the fresh session produces abstraction: plan has a remaining gap, iterate.

---

## DELIVERABLES CHECKLIST

- [ ] Phase 01: SK-529 reconnaissance-gate
- [ ] Phase 02: SK-535 session-mode-declaration + SK-536 goal-context-persistence
- [ ] Phase 03: SK-531 claim-as-hypothesis + SK-537 design-artifact-completeness
- [ ] Phase 04: SK-532 materialization-session-type + SK-533 mvp-round-trip-verification
- [ ] Phase 05: SK-530 specificity-calibration + SK-534 goal-delivery-completeness
- [ ] Phase 06: SK-410 plan-review-skill v2.0
- [ ] Phase 07: SK-441 v2.0 + SK-442 + SK-443 modifications
- [ ] Phase 08: XIIGEN-SESSION-LOAD-PLAN-v23
- [ ] Phase 09: XIIGEN-CODE-REVIEW-PROTOCOL-v1.3
- [ ] Phase 10: XIIGEN-DESIGN-REVIEW-PROTOCOL-v1

Nine new skill files, four modified skill files, three modified/new governance documents. Thirteen artifacts, ten phases.

---

## SESSION DISCIPLINE FOR THIS PLAN

Each phase is exactly one session. One session = one phase = one ⛔ STOP gate.

Phase session starts by reading:
1. This master plan
2. The phase-specific detail file (`XIIGEN-GOVERNANCE-PHASE-{NN}-*.md`)
3. The session state file (`XIIGEN-GOVERNANCE-STATE.json`)

Phase session ends by:
1. Producing the phase deliverable(s)
2. Updating `XIIGEN-GOVERNANCE-STATE.json` (status: PENDING → COMPLETE)
3. Declaring the next phase as READY
4. Issuing ⛔ STOP for Luba approval before starting next phase

No phase combines with another. No phase is skipped. No phase advances without Luba explicit "yes."

---

## END OF MASTER PLAN
