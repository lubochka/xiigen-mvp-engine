# CARRY-FORWARD ISSUES — v1.0.3 Skill Files
## Found during: S1 cross-check audit | Date: 2026-03-25
## These must be fixed in their respective sessions before S7 packages them

---

## CRITICAL (blocks correct execution)

### C-1: FC-12 grep loop — FIXED S4
> Updated to M1-M5 + P1-P22 range. Verified: grep "M1 M2 M3" plan-review-SKILL.md → hit ✓
**File:** `planning--plan-review-SKILL.md` lines 138-143
**Problem:** The detection bash loop `for p in P1 P2 P3 ... P13` was the complete
principle range when written. After S1 adds M1-M5 and P17-P22, any plan that
references only P1-P13 will pass FC-12 even though it violates M1-M5 and P17-P22.
**Fix in:** S4 (FC checks session) — update loop to:
`for p in M1 M2 M3 M4 M5 P1 P2 P3 P4 P5 P6 P7 P8 P9 P10 P11 P12 P13 P14 P15 P16 P17 P18 P19 P20 P21 P22`
Also update FC-12 title from "P1-P13" to "M1-M5 + P1-P22".
**Impact if not fixed:** Plans that ignore M1-M5 pass Gate A. The mission layer
principles have no enforcement gate.

### C-2: V9 skip condition — FIXED S4
> Skip removed. V9 NEVER skips. Manual path added. Verified: grep "Skip if: FLOW-39" flow-implementation-guide → 0 hits ✓
**File:** `code-execution--flow-implementation-guide-SKILL.md` lines 300-302
**Problem:** Diagnosed and confirmed. V9 teaching health checks are disabled for
every flow until FLOW-39 activates. This means FLOW-01 through FLOW-24+ run with
no teaching quality enforcement. All DPO triples from real flows are currently
unvalidated for curriculumTier and cross-model provenance.
**Fix in:** S4 (V-gates session) — remove skip condition, add interim manual path.
Already in the session plan. Confirmed worst-case: every triple from FLOW-01
Phase B is currently in ES with curriculumTier=null.

### C-3: `code-execution--flow-restructure-SKILL.md` PHASE-COMPLETE template missing ENGINE PROGRESS and ISSUE INVENTORY — FIXED S6: ENGINE PROGRESS template added to PHASE-COMPLETE in flow-restructure
**File:** `code-execution--flow-restructure-SKILL.md`
**Problem:** This skill produces the template for PHASE-COMPLETE-N.md and
SESSION-BRIEF-N.md. It has no ENGINE PROGRESS section and no ISSUE INVENTORY
section. P22 and P19 require both in every phase completion. Since Claude Code
reads this skill to write PHASE-COMPLETE files, every future phase completion
produced from this template will be missing these mandatory sections.
**Fix in:** S5 (execution infrastructure session) — add ENGINE PROGRESS template
and ISSUE INVENTORY template to the PHASE-COMPLETE document architecture section.
**Impact if not fixed:** Even after S1-S4 encode the principles and FC checks,
every generated PHASE-COMPLETE file will still be wrong because the template skill
doesn't include the mandatory sections.

### C-4a: check-catalog DPO schema gaps — FIXED S4
> LEARNING-003..007, HEALTH-001, ISSUE-001, ARBITER-001..003 all added. Verified in S4 gate check ✓
**Files:** `code-execution--flow-design-check-catalog.md`, `code-execution--flow-implementation-guide-SKILL.md`
**Problem:** These two files are in S4 scope (FC checks + V-gates session). FC-26/FC-27
reference LEARNING-006 and LEARNING-007 checks that enforce DPO schema fields. If
check-catalog doesn't have those checks yet when FC-26/27 land in plan-review, the
FC gates enforce rules the catalog doesn't know about.
**Fix in:** S4 — update both files alongside FC checks. Do NOT defer to S5.
**Impact if split wrong:** FC-26 in plan-review references LEARNING-006 in check-catalog.
If check-catalog is fixed in S5 but FC-26 is added in S4, Gate A will reference a
check that doesn't exist yet in the catalog.

### C-4b: DPO triple schema missing `modelComparison` and `curriculumTier` — S5 files — FIXED S6: DPO v2.0.0 note added to bootstrap-boundary, flow-vs-service-gate, flow-design-rag-seeds, flow-restructure
**Files:** `planning--bootstrap-boundary-SKILL.md`, `planning--flow-design-cycle-SKILL.md`, `code-execution--flow-design-rag-seeds.md`, `code-execution--flow-restructure-SKILL.md`
**Note:** `code-execution--topology-structure-SKILL.md` was updated in S2 (multi-generate.handler node format with modelComparison output). That file is already done.
**Note:** `code-execution--flow-restructure-SKILL.md` appears in BOTH C-3 (PHASE-COMPLETE
template fix) AND C-4b (DPO schema fix) — two distinct fixes in one file, both required.
Do not treat them as duplicates.
**Fix in:** S5 — update remaining 4 files with full P17+P18 DPO required field schema.

### C-5: simulation-protocol SILENT_FAILURE patterns — FIXED S4
> 3 patterns added: single-model DPO, same-model score, FLOW-39 masking. Verified in S4 gate check ✓
**File:** `planning--simulation-protocol-SKILL.md` (SK-441)
**Problem:** The master plan added 3 SILENT_FAILURE patterns to S4 scope during plan
review. These patterns were never added to this carry-forward register. Without them:
1. Single-model DPO triple stored as valid training data — silent because LEARNING-003
   currently only checks prompt.system, chosen, rejected, teachingPoint. No check for
   cross-model provenance.
2. Same-model score.handler producing inflated scores — silent because the current
   V-gates don't check whether the judge is the same model as the generator.
3. FLOW-39-not-active masking all teaching quality gates — silent because V9 skip
   condition makes this the default state.
**Fix in:** S4 — add 3 SILENT_FAILURE patterns to SK-441.
**Impact if not fixed:** Future sessions that encounter these failures will re-derive
the root cause from scratch, expensively.

---

## SIGNIFICANT (causes confusion or incorrect behavior)

### S-1: V10 skip condition — FIXED S5 (post-review)
> Merged as V12. Skip condition removed. Verified: `grep "Skip if: convergence.handler" flow-implementation-guide` → 0 hits.
**File:** `PATCH--flow-implementation-guide-V10-PhaseF.md`
**Problem:** V10 (NODE REPRESENTATION INTEGRITY from the patch file) is skipped until
convergence.handler is active. The automated V10 cannot run, but the manual check must.
**Status:** PARTIALLY ADDRESSED in S4. S4 added a new V10 (MISSION PROGRESS) that
always runs. The original V10 (NODE REPRESENTATION INTEGRITY) from
`PATCH--flow-implementation-guide-V10-PhaseF.md` was not merged — its skip condition
remains in the patch file but the patch was never applied to the working guide.
**Fix in:** S5 — apply the V10-NODE-REPRESENTATION section from the patch file to
`code-execution--flow-implementation-guide-SKILL.md` with skip condition replaced by:
"convergence.handler required for automated V10. Until active: verify NODE completeness
manually using the checklist below. Do NOT skip entirely."
**Note:** The new V10 (MISSION PROGRESS) and the original V10 (NODE REPRESENTATION)
will coexist — rename original to V10-NODE or use V12 to avoid conflict.

### S-2: plan-review P1-P8 reference — FIXED S4
> Updated to "M1-M5 + P1-P22 not answered". Verified: grep "P1-P8" plan-review-SKILL.md → 0 hits ✓
**File:** `planning--plan-review-SKILL.md`
**Problem:** Contains a reference to "P1-P8" (the codebase chain's principle range).
The project skills chain currently uses P1-P16 (extended to P1-P22 after S1).
A plan reviewer loading this skill would apply the wrong range when checking
codebase artifacts vs web session plans.
**Fix in:** S4 — use the following command to locate the reference:
```bash
grep -n "P1-P8\|P1..P8\|P1-P8" .claude/skills/planning--plan-review-SKILL.md
```
Then replace with the correct project-chain range (M1-M5 + P1-P22 post-S1) or add
a clarification comment distinguishing the two chains.

### S-3: `planning--flow-vs-service-gate-SKILL.md` P1-P13 reference + no verification step — FIXED S6: P1-P13 → M1-M5+P1-P22; infra file verification note added
**File:** `planning--flow-vs-service-gate-SKILL.md`
**Two problems:**
1. References "P1-P13" as the principle gate (Gate 0) — will miss M1-M5 and P17-P22
2. Has 9 `.ts` file references (CapabilityGapRepository.ts, RagQualityEvolver.ts,
   etc.) with no verification step — Claude Code may try to resolve these files
   and fail silently if they don't exist yet
**Fix in:** S5 — update P-range reference; add "Before referencing these files:
verify they exist in the codebase. These are planned infrastructure files.
If absent: this skill's FLOW/SERVICE classification is informational only for
the planning session — no execution dependency."

### S-4: learning-signal-capture missing modelComparison — FIXED S3
> Full P17+P18 DPO schema added including modelComparison, targetModelFamily, instructionFormat, distillationReadiness. Verified in S3 gate check ✓
**File:** `code-execution--learning-signal-capture-SKILL.md`
**Problem:** Has `curriculumTier` (manual assignment) but missing `modelComparison`.
This is the primary DPO triple schema document. All other files that reference
DPO triple format look to this skill as the authoritative source. If
`modelComparison` is absent here, the field will never appear in any generated
triple regardless of what other files say.
**Fix in:** S3 — already in the S3 plan. Confirmed as highest priority DPO schema
update.

### S-5: `PATCH--how-to-prepare-a-plan-NODE-prereq-Gate-C.md` cross-ref at execution time — FIXED S6: DESIGN_REASONING excerpt inlined in patch; cross-reference removed
**File:** `PATCH--how-to-prepare-a-plan-NODE-prereq-Gate-C.md`
**Problem:** Contains "(see code-execution--learning-signal-capture-SKILL.md,
DESIGN_REASONING section)" — this is a cross-document reference in a patch that
Claude Code loads during Gate C. Claude Code cannot load and read a second skill
file mid-execution.
**Fix in:** S5 — inline the relevant DESIGN_REASONING excerpt into the patch
itself so the reference becomes self-contained. One paragraph maximum.

---

## COSMETIC (won't cause errors but creates confusion)

### K-1: FLOW-DESIGN-SKILL-INDEX.md + INTEGRATION-INSTRUCTIONS.md — FIXED S6 (complete)
> Index: v2.0.0 header, Gap 6/7/8 added, Gap 3 RESOLVED, SK-442..446, FC-26..31.
> Instructions: both patches with apply order, arbiter-config patch, v2.0.0 cp commands, AGENTS.md v2.0.0, SKILL-INDEX v2.0.0.
> Verified: grep "Apply FIRST" INTEGRATION-INSTRUCTIONS.md → hit ✓
**Files:** Both reference `PATCH--xiigen-core-principles-P14-P15-P16.md`
**Problem:** After S1 produces `PATCH--xiigen-core-principles-M1-M5-P17-P22.md`,
the old P14-P16 patch still needs to be applied first (it adds P14-P16), then the
new patch adds M1-M5 and P17-P22. The index and instructions need to reference
both patches in order, not just the old one.
**Fix in:** S6 (assembly session) — update both files to reference both patches
with correct apply order: P14-P16 patch first, then M1-M5+P17-P22 patch.

### K-2: `planning--flow-design-cycle-SKILL.md` + `planning--bootstrap-boundary-SKILL.md` reference DPO without required fields — FIXED S6: DPO schema note added to flow-design-cycle and bootstrap-boundary
**Files:** Both mention DPO triples in planning context
**Problem:** These planning-session skills will produce planning artifacts that
assume the old DPO schema. After S3/S5 update the schema, planning sessions using
these skills will have stale DPO field expectations.
**Fix in:** S5 — add a one-line note to each: "DPO triple required fields: see
`code-execution--learning-signal-capture-SKILL.md` for current schema (P17+P18
fields required as of v2.0.0). The schema in this file is abbreviated."
This cross-reference is acceptable ONLY in planning-session skills (web session use,
`planning--*.md` files). A human or web session Claude can follow a pointer.
Claude Code execution session files (`SESSION-N.md`) must NEVER use cross-references —
inline all required content. FC-28 and SK-443 enforce this for execution session files.


### C-6: No SK uniqueness guard before session delivery
**File:** HOW-TO-USE-SKILLS.md + S7 verification checklist
**Problem:** The SK-443→SK-446 rename was applied to registry files (master plan) but
not propagated to the actual skill files, causing the collision to appear in 5
consecutive reviews. No pre-delivery check runs `grep -rn "SK-NNN" *.md` across all
output files to verify an SK number doesn't appear with two different skill names.
**Fix in:** S5 (HOW-TO-USE session) and S7 (verification checklist) — add:
```bash
# SK uniqueness guard (run before every session delivery)
grep -rn "SK-44[0-9]" .claude/skills/ *.md | grep -v "SKILL-INDEX" | sort > /tmp/sk_audit.txt
# Manually verify: each SK number maps to exactly one skill name
# Any number appearing with two different names = collision, block delivery
```
Add as a mandatory exit step in S7 packaging checklist.
**Structural guard:** This is FC-10 (propagation sweep) applied specifically to SK number
renames. After any SK number change: grep all deliverable files for the old number,
verify every remaining hit is the intended new skill name.

### C-7: Fixture path in principles-arbiter — FIXED S5
> Updated to flat convention `fixtures/prompts/principles-arbiter--v1.0.0.prompt.json`. Verified by review ✓
**File:** `planning--principles-arbiter-SKILL.md` line ~150
**Problem:** Specifies path `fixtures/prompts/arbiters/dna-principles-arbiter--v1.0.0.prompt.json`
The `arbiters/` subdirectory doesn't exist in the codebase fixture convention.
Real convention (from actual fixtures): `fixtures/prompts/{role}-{name}-v{version}.json` — no subdirectory.
Claude Code following this path will either create a non-standard directory or fail silently.
**Fix in:** S5 — change to `fixtures/prompts/principles-arbiter--v1.0.0.prompt.json`
(matching the flat convention: `{role}--v{version}.json`).
**Impact if not fixed:** Phase A fixture generation for any flow with a Principles Arbiter
will create the wrong path, breaking the arbiter registration pipeline.


### C-8: FC-31 command inconsistency — FIXED S5
> Session start FC-31 now matches golden rule exactly (api.anthropic.com, openai.com, localhost pattern). Verified by review ✓
**Files:** `XIIGEN-SESSION-START-PROMPT-v2.md`, `XIIGEN-GOLDEN-RULE.md`
**Problem:** Golden rule FC-31 detection includes `api.anthropic.com`, `openai.com`,
`googleapis.com`, `localhost:[0-9]`. Session start FC-31 command checks only model name
strings. Two documents define the same check differently — running them produces
different results.
**Canonical source:** `XIIGEN-GOLDEN-RULE.md` (Gap A: golden rule = canonical home for
overarching governance rules). Session start must reference or match exactly.
**Note on localhost pattern:** `localhost:[0-9]` will produce false positives on
legitimate test commands like `localhost:3000`. Refine to `localhost:[0-9]{4,5}/api/`
to catch hardcoded service URLs while excluding variable-based localhost patterns.
**Fix in:** S5 (HOW-TO-USE session) — update session start FC-31 to match golden rule
exactly, with the localhost refinement applied to both documents simultaneously.
**Impact:** Session running the start FC-31 will miss hardcoded API endpoints; session
reading the golden rule gets broader results. Inconsistency erodes trust in the guard.

### C-9: topology-structure SK number — ✅ FIXED 2026-03-26
> SK-428 confirmed. Cross-referenced with FLOW-DESIGN-SKILL-INDEX — SK-428 is the assigned
> number per the index. No codebase registry check was needed; the project skill index IS
> the authoritative registry for web session work. File header already has SK-428.
**Resolved:** SK-428 confirmed correct. No update needed. C-9 closed.


### S-6: DESIGN_REASONING `principleApplied` range — FIXED S5 (post-review)
> Updated to `M1-M5, P1-P22 or CF-N`. Verified: `grep "P1-P16 or CF-N" learning-signal-capture` → 0 hits.
**File:** `code-execution--learning-signal-capture-SKILL.md` (line ~637)
**Problem:** The DESIGN_REASONING signal template has:
`"principleApplied": "${P1-P16 or CF-N reference}"`
After S1 added M1-M5 and P17-P22, this range is stale. A session producing a
DESIGN_REASONING triple that references M3 or P18 would not match the template's
implied range.
**Fix in:** S5 — same section (v1.0.3 additions) that S5 touches for other DPO
updates. Change to: `"${M1-M5, P1-P22 or CF-N reference}"`.
**Same class as:** S-2 (stale P-ranges) — both are stale principle range references.


### C-10: SK placeholders in carry-forward skills — ✅ FIXED 2026-03-26
> All 6 placeholder SK numbers resolved without Claude Code:
> - planning--bootstrap-boundary-SKILL.md → SK-426 (per SKILL-INDEX)
> - planning--flow-vs-service-gate-SKILL.md → SK-427 (per SKILL-INDEX)
> - code-execution--self-questioning-SKILL.md → SK-429 (per SKILL-INDEX)
> - code-execution--learning-signal-capture-SKILL.md → SK-468 (new assignment, next available)
> - planning--flow-design-cycle-SKILL.md → SK-469 (new assignment)
> - code-execution--flow-restructure-SKILL.md → SK-470 (new assignment)
> Deferral classifier: these were willingness blockers (5-minute grep), not capability blockers.
> The "REQUIRES CLAUDE CODE SESSION" label was a description of difficulty, not a valid deferral reason.
**Resolved:** All SK numbers assigned. C-6 sweep will now find no placeholder collisions.

### C-11: XIIGEN-SESSION-START-PROMPT-v2.md deprecation — DEFERRED
> **Authorization:** Luba: "Problems 4 and 5 are noted" → reclassified per deferral classifier.
> Willingness blocker (file rename). Must be resolved before v2 is referenced in a new session.
> **Blocking reason:** v2 is not in the skills package — it lives in the project only.
> Cannot rename a project file from within a packaging session.
> **This IS a genuine capability blocker** (project-level file rename, not a code edit).
> **Verification command:** Search project for XIIGEN-SESSION-START-PROMPT-v2.md references.
> **Action:** In next project maintenance session, rename to XIIGEN-SESSION-START-PROMPT-v2--DEPRECATED.md
> or delete. Update DOCUMENT-AUTHORITY-MAP to point to v3 explicitly.
> **Target session:** Next project cleanup session (not blocked on code changes).

---

## SESSION ASSIGNMENT SUMMARY

| Session | Issues to fix |
|---------|--------------|
| S3 | S-4 (learning-signal-capture DPO schema — `modelComparison`) |
| S4 | C-1 (FC-12 P-range), C-2 (V9 skip), C-4a (check-catalog + flow-implementation-guide DPO), C-5 (simulation-protocol SILENT_FAILURE), S-1 (V10 skip — MOVED TO S5), S-2 (P1-P8 ref) |
| S5 (carried from S4) | S-1 (V12 NODE REPRESENTATION — FIXED S5 post-review), S-6 (principleApplied range — FIXED S5 post-review) |
| S5 | C-3 (flow-restructure template), C-4b (DPO in 4 remaining files), C-7 (fixture path), C-8 (FC-31 consistency), S-3 (flow-vs-service-gate), S-5 (patch cross-ref), S-6 (principleApplied range) |
| S6 | K-1 (index + integration-instructions patch reference order), K-2 (DPO note in planning skills) |
| S5/S7 | C-6 (SK uniqueness guard in HOW-TO-USE + S7 checklist) |
| S7 | C-9 (topology-structure SK number), C-10 (4 carry-forward skills SK placeholders) — all verified against `.claude/skills/SKILL-INDEX.md` |

No issues require a new session. All fit within existing session scope.
