# GUIDE-B37 — How to Produce `PHASE-COMPLETE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 47 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-24
## v2 amendment: Protocol status block added to Gate results section (Phase G/H/I).
##   portabilityStatus, authStatus, tenantCertTier rows added to ENGINE PROGRESS.
##   GOAL_REACHED rule: portabilityStatus=TBD or authStatus=TBD blocks verdict.
##   Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 21.

---

## FINAL GOAL (re-read before authoring any PHASE-COMPLETE.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the PHASE-COMPLETE.md guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance, it will
produce a correct PHASE-COMPLETE.md that provides a structured record of everything
achieved in a completed phase or implementation session.

---

## WHAT THIS FILE IS

`PHASE-COMPLETE.md` is governed by **SK-427** in the XIIGen session output skills.
It is the structured completion record for a phase or full implementation — more
detailed than SESSION-BRIEF.md, less narrative than session logs.

**Distinction from SESSION-BRIEF.md:**
- `SESSION-BRIEF.md` (SK-428) = handoff document for the NEXT session (30-second read)
- `PHASE-COMPLETE.md` (SK-427) = completion record for the CURRENT phase (detailed audit)

The brief is forward-looking ("here's what the next session needs"). The phase-complete
is backward-looking ("here's what this phase produced, with evidence").

**Always produced together:** SK-426 (EXECUTION-LOG.json) + SK-427 (PHASE-COMPLETE.md)
+ SK-428 (SESSION-BRIEF.md) are the three mandatory session-end outputs. All three
appear in the "Artifacts produced" section of any complete session.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-46/PHASE-COMPLETE.md` — full implementation record (all 6 phases A-F): per-phase summary table, What was done, Gate results (9 checks), Documented deferrals, Next phase, ⛔ STOP, ENGINE PROGRESS metrics table |
| ZIP-17 | PRIMARY | `FLOW-47/PHASE-COMPLETE.md` — partial-completion record (all 9 phases): per-phase summary with PASS/FAIL/CAVEAT gates, gate results with specific failing metrics, 5-step remediation plan, ENGINE PROGRESS with actuals vs plan-min |
| ZIP-11 | COMPARISON | `FLOW-01/final-flow-testing/PHASE-COMPLETE-B.md` — phase-scoped record: scores table, gate checks (prescriptiveness, DNA compliance, DPO format), fixes applied, calibration data, next-phase instructions |
| ZIP-11 | COMPARISON | `FLOW-00.2/PHASE-COMPLETE-phase-A.md` — minimal format: What Was Built, gate results table, What's Next, ENGINE PROGRESS (UNKNOWN values) |

**SK-427** governs PHASE-COMPLETE.md authoring. It is referenced in the FLOW-46
and FLOW-47 Artifacts produced sections.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/PHASE-COMPLETE.md`

Phase-scoped variants use: `PHASE-COMPLETE-A.md`, `PHASE-COMPLETE-B.md`, etc. (FLOW-01 pattern)
Or: `PHASE-COMPLETE-phase-A.md`, `PHASE-COMPLETE-phase-B.md` (FLOW-00.2 pattern)

The modern single-file format (FLOW-46/47) uses one `PHASE-COMPLETE.md` per
implementation session, not per phase.

---

## THE THREE FORMATS

**Format 1 — Full implementation record (FLOW-46 style):**
All phases A-F in one document. Used when the full implementation is complete or
a major multi-phase session ends.

**Format 2 — Partial/goal-not-reached record (FLOW-47 style):**
All phases documented but with explicit FAIL gates and a remediation plan.
Used when `GOAL_PARTIALLY_REACHED`.

**Format 3 — Phase-scoped record (FLOW-01/00.2 style):**
One document per phase. Used during iterative development where each phase
gets its own completion record. More granular than Format 1/2.

---

## FULL IMPLEMENTATION RECORD STRUCTURE (FLOW-46 style)

```markdown
## FLOW-XX PHASE-COMPLETE — [flow human name] ([brief accomplishment])

**Context:** FLOW-XX [flow human name] — [N] task types (T[NNN]-T[NNN+M]), [N] factories (F[N]-F[N]), [N] BFA rules (CF-[N]/[N]/[N]), family [N].
**Branch:** `[branch-name]` · **Captured:** [YYYY-MM-DD] · **Overall verdict:** [GOAL_REACHED / GOAL_PARTIALLY_REACHED]

---

### Per-phase summary

| Phase | Name | Gate | Commit | Evidence |
|---|---|---|---|---|
| A | [Phase A name] | ✅ PASS | [hash](url) | [N] artifacts: [specific counts] |
| B+C | [Phase B+C name] | ✅ PASS | [hash](url) | [specific artifacts and counts] |
| D | [Phase D name] | ✅ PASS | [hash](url) | [specific artifacts] |
| E | [Phase E name] | ✅ PASS | [hash](url) | [specific test counts] |
| F | [Phase F name] | ✅ PASS | [hash](url) | [specific gate results] |

### What was done
- [Specific deliverable 1 with numbers]
- [Specific deliverable 2 with numbers]
[... one bullet per significant deliverable, always with counts]

### Gate results
- [Gate name]: **[result]** ✅/⚠/❌
- Server tsc: **0 errors** ✅
- Client tsc: **0 errors** ✅
- Client build: **0 errors** ✅
- Server unit tests ([scope]): **[N]/[N] pass** ✅
- [Additional test suites with counts]
- [Flow-specific gate — CF rule collision, namespace uniqueness, etc.]

**Protocol status (NEW v2 — include when Phase G/H/I ran this session):**
- portabilityStatus: **[MOBILE | PARTIAL_GAP | NOT_PORTABLE | AUTH_DEFERRED | N/A]** ✅/⚠/❌
- authStatus: **[AUTH_READY | AUTH_DEFERRED | AUTH_GAP | NOT_APPLICABLE]** ✅/⚠/❌
- tenantCertTier: **[NONE | TIER_A | TIER_B | TIER_C | TIER_D | NOT_DISTRIBUTABLE]** ✅/⚠/❌

_If Phase G/H/I did not run this session: declare `Protocol status: N/A — gates deferred to Phase G/H/I session`._

### Documented deferrals (per IMPL-STATE.json)
1. **[Deferral title]** — [description + what must happen to close]
[... numbered list]

### Next phase — [name] ([driver: operator-driven / auto / next-session])
[Numbered steps for the next phase]

## ⛔ STOP — [reason why a STOP gate exists here]

---

## ENGINE PROGRESS

| Metric | Value | Notes |
|--------|-------|-------|
| Task types implemented | [N] | [T range] |
| Factories registered | [N] | [F range] |
| BFA rules added | [N] | [CF numbers and names] |
| Family ID | [N] | [family name] |
| [Domain-specific metrics] | [value] | [notes] |
| Commits this implementation | [N] | [phases covered] |
```

---

## PARTIAL/GOAL-NOT-REACHED RECORD STRUCTURE (FLOW-47 style)

```markdown
## FLOW-XX PHASE-COMPLETE — [flow name] (all [N] phases)

**Context:** FLOW-XX [flow name] — [N] turns, [N] factories, [N] BFA rules.
**Branch:** `[branch]` · **Captured:** [date] · **Overall verdict:** GOAL_PARTIALLY_REACHED

---

### Per-phase summary (from [Test Plan name])

| Phase | Name | Gate | Evidence |
|---|---|---|---|
| 1 | [name] | ✅ PASS | [evidence] |
| 2 | [name] | ❌ FAIL | [what failed with numbers] |
| 3 | [name] | ⚠ PASS_WITH_CAVEAT | [caveat description] |
[... one row per phase, honest FAIL/PASS_WITH_CAVEAT gates]

### What was done
[What completed successfully — honest about what did and didn't work]

### Gate results
- [Things that passed]: ✅
- [Specific failing gate with exact numbers]: **FAIL** ❌
- [Weakened assertion caveat]: ⚠
- portabilityStatus: **[value or TBD]** ✅/⚠/❌
- authStatus: **[value or TBD]** ✅/⚠/❌
- tenantCertTier: **[value or NONE]** ✅/⚠/❌

_portabilityStatus=TBD or authStatus=TBD on a GOAL_PARTIALLY_REACHED session
→ overall verdict cannot be upgraded to GOAL_REACHED until these are set._

### Next phase — remediation (pre-shippable)
1. [Specific numbered remediation step — what to restore/fix with file name]
2. [Specific numbered step]
[...]
[N]. Re-run validation, re-capture evidence, flip verdict to GOAL_REACHED.

## ⛔ STOP — do not start remediation without explicit approval

---

## ENGINE PROGRESS

| Metric | Value | Notes |
|--------|-------|-------|
| [Metric] | [actual] | plan-min [expected] ([+/-delta]) |
[... actuals vs plan-min with delta for failing metrics]
```

**Key difference from FLOW-46:** Gate table uses PASS/FAIL/PASS_WITH_CAVEAT (not just PASS),
and ENGINE PROGRESS shows actuals vs plan-min with delta for transparency.

---

## PHASE-SCOPED RECORD STRUCTURE (FLOW-01 style)

```markdown
## FLOW-XX Phase [X] Complete [— optional subtitle]

**Context:** [brief context — stack, projectId, provider]
**Completed:** [YYYY-MM-DD]
[Optional: **AI Provider:** [model used and whether real API or mock]]

---

## Scores

| Task Type | Score | Cycles | Status |
|-----------|-------|--------|--------|
| T[NNN] | [score] | [cycles] | [ACCEPTED / RERUN] |
[...]

**All >= 0.80:** YES / NO

---

## Gate Checks

### [Gate check 1 — e.g., Prescriptiveness]
[Details of what was checked and whether it passed]

### [Gate check 2 — e.g., DNA Compliance]
[Specific DNA rule results]

### [Gate check 3 — e.g., DPO Triple Format]
[Specific field check results with ⚠️ or ✅]

---

## Fixes Applied This Phase (if any)
1. **[Fix title]**: [What was fixed and how]
[...]

---

## [Optional: Calibration/learning data — MAE, cycle predictions vs actuals]

---

## Next Phase: [X+1] ([PHASE NAME])
[Specific numbered instructions for the next phase]

## ⛔ STOP — wait for "yes" before Phase [X+1]

---

## ENGINE PROGRESS

| Metric | Value | Notes |
|--------|-------|-------|
| [Metric] | [UNKNOWN or value] | [requirement for measurement] |
```

---

## THE ENGINE PROGRESS TABLE

Every PHASE-COMPLETE.md ends with an ENGINE PROGRESS table. This is a standardized
section that tracks the platform's learning progress toward graduation thresholds.

For early phases or phases without wired metrics, the values are "UNKNOWN":
```markdown
## ENGINE PROGRESS

> Populated by B-2 (EngineProgressService) when available. Until then: UNKNOWN.

| Metric | Value | Notes |
|--------|-------|-------|
| Valid DPO triples (countsTowardThreshold:true) | UNKNOWN | Requires A-1 + A-3 wired |
| MONO_MODEL_CALIBRATION triples | UNKNOWN | Requires A-1 wired |
| Tier 1 (ROUTING) coverage | UNKNOWN | T47 candidates |
| Tier 4 (ORCHESTRATION) coverage | UNKNOWN | T49, T51 candidates |
| Shadow gap score | UNKNOWN | Requires B-1 + FLOW-39D |
| DESIGN_REASONING docs in RAG | UNKNOWN | Requires A-7 seed |
| Flows to graduation (est.) | UNKNOWN | Requires 80 valid triples |
| portabilityStatus | TBD | Requires Phase G (V9 gate) to run |
| authStatus | TBD | Requires Phase H (V10 gate) to run |
| tenantCertTier | NONE | Requires Phase I (V11 gate) to run |
```

**Rule (v2):** `portabilityStatus = TBD` or `authStatus = TBD` in ENGINE PROGRESS
blocks `GOAL_REACHED` verdict. If PHASE-COMPLETE is closing a Phase F or later session
where V9/V10 were not run, the overall verdict must be `GOAL_PARTIALLY_REACHED` and
the next phase (Phase G/H) must be listed in **Next phase**.

**Protocol status icon rules:**
| Value | Icon | Condition |
|-------|------|-----------|
| MOBILE / AUTH_READY | ✅ | Gate ran and passed |
| PARTIAL_GAP / AUTH_DEFERRED | ⚠ | Gate ran; partial or deferred — acceptable |
| NOT_PORTABLE / AUTH_GAP | ❌ | Gate ran and found blocking gap |
| TBD | ❌ | Gate never ran — GOAL_REACHED blocked |
| NOT_APPLICABLE / NOT_DISTRIBUTABLE | — | Not applicable; no icon needed |

For implementations with live metrics (FLOW-46/47), the table shows actual values:
```markdown
| Task types implemented | 7 | T650-T656 |
| Factories registered | 5 | F1601-F1605 |
| BFA rules added | 3 | CF-839 (TENANT_ISOLATION), CF-840 (COST_GATE), CF-841 (PRIVACY) |
| Server unit tests | 58/58 | 48 service specs + 10 design-contract specs |
| portabilityStatus | MOBILE | V9 gate PASS — P-1..P-5 + D-HIST-001 all 0 |
| authStatus | AUTH_READY | V10 gate PASS — all controllers guarded, 401/403 tests present |
| tenantCertTier | TIER_A | SK-553 Layer 1 PASS |
```

For GOAL_PARTIALLY_REACHED (FLOW-47), the table shows actuals vs plan-min:
```markdown
| xiigen-rag-patterns docs | 215 | plan-min 531 (−316) |
| Packages with arbiterConfigIds populated | 0/30 | 0% (FAIL) |
```

---

## GATE ICONS AND VERDICTS

The per-phase summary table uses three gate icons:

| Icon | Verdict | Meaning |
|------|---------|---------|
| ✅ | PASS | Gate fully satisfied, no caveats |
| ⚠ | PASS_WITH_CAVEAT | Gate numerically passed but with known weakness (e.g., weakened assertions) |
| ❌ | FAIL | Gate did not pass — a specific metric or criterion failed |

**Rules for caveats:**
- ⚠ is used when the gate passes numerically but the test assertions were weakened below plan thresholds, or when known constraints were accepted
- The caveat must be stated in the Evidence column: "86 tests green, but assertions weakened vs plan"
- ⚠ gates cannot become ✅ without addressing the caveat in a subsequent session

---

## THE ⛔ STOP AT THE END OF NEXT-PHASE SECTION

Every PHASE-COMPLETE.md ends with a ⛔ STOP before the ENGINE PROGRESS table.
The STOP governs when the next phase begins:

**For complete implementations:**
```markdown
## ⛔ STOP — runtime promotion requires explicit operator approval
```

**For partial completions:**
```markdown
## ⛔ STOP — do not start remediation without explicit approval
```

**For phase-scoped briefs:**
```markdown
## ⛔ STOP — wait for "yes" before Phase [X+1]
```

The STOP is not decorative — it marks the explicit gate where human approval is
required before execution continues. The PHASE-COMPLETE.md is typically read at the
end of a session; the STOP ensures the next session doesn't start automatically.

---

## FIELD-BY-FIELD AUTHORING RULES

### Context/header line
For full records: "FLOW-XX [name] — N task types (T[range]), N factories, N BFA rules (CF-N/N/N), family N."
For phase-scoped: "XIIGen Community. NestJS. projectId=[value]." — minimal, just what Phase Y needs.

### Per-phase summary table
The Commit column is only in the full implementation record — phase-scoped records
don't include commit hashes in the per-phase table.

Evidence column must be specific: "15 DR triples, 7 contracts, 3 BFA rules, topology" not
"artifacts seeded."

### What was done
Written in bullet form, each bullet ends with a count or measurement:
- "7 task-type services shipped with 48 server unit tests + 10 design-contract tests (58 total)" ✅
- "Services shipped" ❌ — no counts

### Gate results
For the absolute gates (server tsc, client tsc, client build), format is consistent:
```
- Server tsc: **0 errors** ✅
- Client tsc: **0 errors** ✅  
- Client build: **0 errors** ✅
```
For test suites: `**N/N pass**` format with scope in parentheses.
For flow-specific gates: `**OK**` or `**FAIL (specific reason)**`.

### Next phase
Numbered steps, not a paragraph. Each step starts with a verb and names a specific file
or component:
```
1. Stand up live ES + bootstrap xiigen-flow-registry
2. Run BfaCrossFlowValidator.validate('FLOW-46', registration) against loaded registry
3. On PASS, write FLOW-46 record with status:'ACTIVE' to xiigen-flow-registry
```

---

## ACCEPTANCE CRITERIA FOR PHASE-COMPLETE.MD

Before PHASE-COMPLETE.md is considered complete:

- [ ] Title (h2) has flow name and brief accomplishment description
- [ ] Header has: branch, captured date, overall verdict
- [ ] Per-phase summary table has all phases with honest PASS/FAIL/CAVEAT gates
- [ ] Evidence column has specific counts (not generic "artifacts")
- [ ] What was done has bullet list with numbers
- [ ] Gate results has explicit ✅/⚠/❌ for each gate with specific counts
- [ ] Documented deferrals are numbered with actionable descriptions (if any)
- [ ] Next phase has numbered steps
- [ ] ⛔ STOP is present with specific reason
- [ ] ENGINE PROGRESS table is present (values or UNKNOWN with measurement requirements)
- [ ] **[v2] Protocol status rows present in ENGINE PROGRESS** (portabilityStatus, authStatus, tenantCertTier)
- [ ] **[v2] If Phase G/H/I ran: Gate results section includes protocol status block with verdicts**
- [ ] **[v2] GOAL_REACHED verdict only used when portabilityStatus ≠ TBD AND authStatus ≠ TBD**

---

## KEY RULES

**1. Gate honesty — FAIL means FAIL.**
If an assertion failed, the gate is ❌ FAIL — not ⚠ PASS_WITH_CAVEAT. ⚠ is only for
cases where the test numerically passed but with known weaknesses. "86 tests green
but assertions weakened vs plan thresholds" is ⚠. "ironRules 0/30 — the check never
ran" is ❌.

**2. ENGINE PROGRESS is always present — UNKNOWN is acceptable.**
The ENGINE PROGRESS table must be present in every PHASE-COMPLETE.md. For early
phases where metrics can't be measured yet, all values are UNKNOWN with the
requirement stated. This is the consistent schema that allows progress to be
tracked across sessions even when instrumentation isn't yet wired.

**3. Evidence is specific — counts, not descriptions.**
"15 DR triples, 7 contracts, 3 BFA rules" is evidence. "Design artifacts seeded" is not.
The Evidence column in the per-phase table must have actual numbers that can be
verified by querying ES or counting files.

**4. The ⛔ STOP governs execution, not the author.**
The ⛔ STOP is written by the author but acts as a gate for the executor. The STOP
must name specifically what requires approval or what condition must be met. "⛔ STOP"
alone is not sufficient — "⛔ STOP — do not start remediation without explicit approval"
is sufficient.

**5. Protocol status TBD blocks GOAL_REACHED. (NEW v2)**
`portabilityStatus = TBD` means Phase G never ran. `authStatus = TBD` means Phase H
never ran. A PHASE-COMPLETE.md that issues `GOAL_REACHED` while either field is TBD
is claiming a goal is reached when two mandatory gates were skipped. The correct
verdict in that case is `GOAL_PARTIALLY_REACHED` with Phase G/H listed as the next
phase. The ENGINE PROGRESS table is the visible record — TBD values there are the
signal that the verdict cannot be GOAL_REACHED.

---

*End of GUIDE-B37 — PHASE-COMPLETE.md v2*
*List A sources: ZIP-17 (FLOW-46/47 PHASE-COMPLETE.md production examples),*
*ZIP-11 (FLOW-01 PHASE-COMPLETE-B.md, FLOW-00.2 PHASE-COMPLETE-phase-A.md)*
*Governed by: SK-427*
*Target B-type: B-37 — PHASE-COMPLETE.md*
*Round: 47 of 72*
*v2 amendment: protocol status block in Gate results (portabilityStatus, authStatus,*
*tenantCertTier with ✅/⚠/❌ icons); rows added to ENGINE PROGRESS template.*
*GOAL_REACHED blocker: TBD values in either portabilityStatus or authStatus*
*mandate GOAL_PARTIALLY_REACHED + Phase G/H in Next phase.*
*Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 21.*
