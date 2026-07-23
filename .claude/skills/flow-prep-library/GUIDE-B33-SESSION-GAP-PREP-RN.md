# GUIDE-B33 — How to Produce the `SESSION-GAP-PREP-RN` Family
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 43 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-GAP-PREP-RN files):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file covers the SESSION-GAP-PREP-RN family: the 9-round investigation and
authoring pipeline that produces `FLOW-XX-ENGINE-GAP-LIST.md` as its deliverable.
When Claude Code applies this guidance, it will produce a complete set of
SESSION-GAP-PREP-R0 through SESSION-GAP-PREP-R8 files that systematically identify,
classify, and document all engine gaps for a new flow.

---

## WHAT THIS FAMILY IS

The `SESSION-GAP-PREP-RN` family is a **9-round investigation pipeline**. Each round
is a self-contained session file with bash commands and structured output templates.
The family runs end-to-end before the teaching sessions (Phase A-F) for any new flow.

**Family members:**

| File | Round | Phase | Output |
|------|-------|-------|--------|
| `SESSION-GAP-PREP-R0.md` | R0 | INTAKE | `FLOW-XX-INTAKE.json` |
| `SESSION-GAP-PREP-R1.md` | R1 | PLANNING-LAYER SIM | `FLOW-XX-GAPS-E-RAW.json` |
| `SESSION-GAP-PREP-R2.md` | R2 | EXECUTION SIM | Raw ENG/DATA/SESSION gap candidates |
| `SESSION-GAP-PREP-R3.md` | R3 | SESSION FILE AUDIT | Raw SES-layer gap list |
| `SESSION-GAP-PREP-R4.md` | R4 | NAMED CHECK + SEED AUDIT | Raw CHK/SEED/INFRA gap list |
| `SESSION-GAP-PREP-R5.md` | R5 | GAP CLASSIFICATION | `FLOW-XX-GAPS-CLASSIFIED.json` |
| `SESSION-GAP-PREP-R6.md` | R6 | DEDUPLICATION | `FLOW-XX-GAPS-DEDUP.json` |
| `SESSION-GAP-PREP-R7.md` | R7 | ROOT CAUSE LADDER | `FLOW-XX-ROOT-CAUSE-MAP.json` |
| `SESSION-GAP-PREP-R8.md` | R8 | GAP DOC AUTHORING | ✅ `FLOW-XX-ENGINE-GAP-LIST.md` |

**Two naming conventions exist:** The generic template process uses `SESSION-GAPPREP-RN.md`
(no dash, from GAP-PREP-PROCESS-R0.zip). The FLOW-10+ format uses `SESSION-GAP-PREP-RN.md`
(with dashes). Both refer to the same family. New flows should use `SESSION-GAP-PREP-RN.md`.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-12 | PRIMARY | `GAP-PREP-PROCESS-R0.zip` → `SESSION-GAPPREP-R0.md` through `SESSION-GAPPREP-R8.md` — generic parameterized templates with CONFIGURE blocks, bash commands, output formats |
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-PREP-R0.md` — real production example: verification-first format (SCENARIO SETUP, DIAGNOSIS TABLE, TRACE DETAIL), gap signals from 35 simulation rounds |
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-PREP-R2.md` — R2 execution simulation with step table and raw gap candidates |
| ZIP-17 | COMPARISON | `SESSION-GAPPREP-R0-FLOW09.md` — FLOW-09 intake round (20KB): shows E-group checks inline |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/SESSION-GAP-PREP-RN.md`

One file per round (R0–R8 = 9 files total). All in the same directory.

---

## UNIVERSAL SESSION FILE RULES

Every SESSION-GAP-PREP-RN.md, regardless of round, must follow these rules:

**1. Self-contained — zero cross-references.**
No "see SESSION-GAP-PREP-R3 for context." No "as noted in R1." Every session file
states its own context — what round it is, what it does, what it depends on, what
its output is — without requiring any other file to be open.

**2. CONFIGURE block at the top.**
Every session begins with `export FLOW_ID="FLOW-XX"` and related path variables.
The `FLOW_ID` is the only parameter that changes between flows.

**3. Bash commands are literal.**
No "run the validation script" — the actual bash command is written inline. No
references to scripts not present in the file. Every command is copy-paste executable.

**4. ISSUE INVENTORY table at the bottom.**
Every session ends with an `| Issue | Status | Guard added |` table. This is where
findings that don't close a gap (informational, already-fixed, etc.) are recorded.

**5. ⛔ STOP at the end.**
Every session ends with a ⛔ STOP line naming the output that must be delivered
before the next round can proceed.

**6. Output written as a file, not just printed.**
Every round writes its output (JSON or Markdown) to a named path derived from
`$SESSIONS_DIR/${FLOW_ID}-[SUFFIX]`.

---

## R0 — INTAKE

**Purpose:** Produce `FLOW-XX-INTAKE.json` — the inventory that all subsequent
rounds depend on for scope.

**What it collects:**
- Task type IDs and archetypes (e.g., T63=ATTENDANCE, T64=TICKETING)
- CloudEvent names emitted and consumed by this flow
- Session file inventory (SESSION-A.md through SESSION-F.md plus TEACH files)
- Whether topology.json has Phase B execution nodes
- Architecture decisions from ARCHITECTURE-DECISIONS.json
- BFA CF rules applicable to this flow
- New archetypes this flow introduces for the first time

**File structure:**
```markdown
# SESSION-GAP-PREP-R0.md
## Round: R0 | Phase: INTAKE
## Action: Read flow contracts + topology + session file inventory
##         → produce FLOW-XX-INTAKE.json
## Self-contained: all commands literal, zero cross-references

---

## CONFIGURE FOR TARGET FLOW
```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."
export CONTRACTS_DIR="$BASE_DIR/server/src/engine-contracts"
export SESSIONS_DIR="$BASE_DIR/docs/sessions/$FLOW_ID/last-phase-testing-plan"
export OUT="$SESSIONS_DIR/${FLOW_ID}-INTAKE.json"
mkdir -p "$SESSIONS_DIR"
```

## WHY FIRST (inline)
[One paragraph explaining what R1-R4 need from this file and why without it they guess scope]

## STEP 1 — Locate contract files
[bash: find in engine-contracts dir for FLOW-ID]

## STEP 2 — Extract task type IDs and archetypes
[bash: grep contracts for taskTypeId and archetype fields]

## STEP 3 — Extract CloudEvent names
[bash: grep for type strings in contracts and topology]

## STEP 4 — List all session files
[bash: find session files matching FLOW-ID pattern]

## STEP 5 — Check topology.json Phase B nodes
[bash: read topology.json and verify Phase B execution nodes]

## STEP 6 — Check ARCHITECTURE-DECISIONS.json
[bash: find and read architecture decisions file]

## STEP 7 — Check BFA rules
[bash: grep for CF-NNN rules in server/src related to this flow]

## STEP 8 — Write FLOW-XX-INTAKE.json
[bash: produce JSON with all collected fields]

## STEP 9 — Verify intake is complete
[bash: check all required fields are non-empty]

## ISSUE INVENTORY
| Issue | Status | Guard added |
|-------|--------|-------------|
| (populate from steps above) | — | — |

⛔ STOP — all STEP 9 checks must be GREEN before R1.
```

**Output:** `FLOW-XX-INTAKE.json` with keys:
`flowId`, `taskTypes[]`, `cloudEvents{emitted[], consumed[]}`,
`sessionFiles[]`, `topologyHasPhaseB`, `architectureDecisions[]`,
`bfaRules[]`, `newArchetypes[]`

---

## R1 — PLANNING LAYER SIMULATION (E-group)

**Purpose:** Test whether the planning layer infrastructure (ES index, cycle router,
interfaces, DPO schema) correctly handles this flow's archetypes.

**What it checks (E1–E9 checks):**
- E1: ES keyword mapping round-trip (`xiigen-decision-graph` `fromEntity` is keyword, not text)
- E2: BootstrapCycleRouter queries graph before applying hardcoded boundaries
- E3: IDatabaseService interface has required methods for this flow
- E4: DPO schema (`xiigen-planning-decisions`) has fields for new triple types
- E5: Retrospective persistence is connected (runR1 is called by controller)
- E6: Teaching session reachability (SESSION-TEACH-* accessible from flow path)
- E7: Named check registry has entries for this flow's iron rules
- E8: Schema alignment between planning-decisions and feedback.handler expectations
- E9: Infrastructure index existence (decision-graph + planning-decisions both 200)

**File structure:**
```markdown
# SESSION-GAP-PREP-R1.md
## Round: R1 | Phase: PLANNING LAYER SIMULATION (E-group)
## Action: Run E1–E9 checks
## Output: FLOW-XX-GAPS-E-RAW.json (raw J/K/H-class gap list)
## Rule: if E1 or E3 BREAKS → flag all R2 traces as "planning layer unreliable"

---

## CONFIGURE
[export FLOW_ID + paths, reference INTAKE.json]

## STEP TABLE FORMAT
| Check | What tested | Handler | Input ✅/⚠️/❌ | Verdict | Gap class | Gap ID |
Verdict: WORKS | PARTIAL | BREAKS | WRONG | SILENT_FAILURE

## E1 — Graph edge round-trip
[curl seed + term-query + delete + verdict]

## E2 — Archetype bracket routing
[node: read bootstrap-cycle-router.ts, check graph query before boundary]

## E3 — IDatabaseService interface completeness
[node: check interface file for required method signatures]

[... E4 through E9 similar bash/node checks ...]

## WRITE FLOW-XX-GAPS-E-RAW.json
[bash: produce JSON from step table results]

## ISSUE INVENTORY
⛔ STOP — FLOW-XX-GAPS-E-RAW.json written, E1+E3 verdict recorded.
```

---

## R2 — FLOW EXECUTION SIMULATION (A-group trace)

**Purpose:** Trace the AF pipeline execution for each of this flow's task types
to find gaps in GenericNodeExecutor dispatch, topology node handling, and event routing.

**What it checks:**
Per task type, trace the A-group: AF-1 (genesis), AF-3 (prompt-library), AF-4 (rag-context),
AF-5 (multi-generate), AF-6 (validate), AF-7 (compliance), AF-9 (score/judge), AF-feedback.
For each step: does the handler exist? Does it handle this archetype? Does it emit the
correct events?

**File structure:**
```markdown
# SESSION-GAP-PREP-R2.md
## Round: R2 | Phase: FLOW EXECUTION SIMULATION (A-group trace)
## Output: Raw ENG/DATA/SESSION gap candidates per task type

---

[One sub-section per task type from INTAKE.json]

### T[NNN] — [ArchetypeName] trace

| Step | Handler | Exists? | Handles archetype? | Gap? |
|------|---------|---------|-------------------|------|
| AF-1 genesis | ai-generate.handler | ✅/❌ | ✅/❌ | [GAP-ID or none] |
...

[bash: grep relevant handlers for this archetype + task type]
```

---

## R3 — SESSION FILE AUDIT

**Purpose:** Audit all session files from INTAKE.json for FC-8/FC-28/FC-29 class errors:
cross-references to non-existent variables, V9-003 check failures, field path errors in
ES queries (e.g., `chosen.code` instead of `chosen`), and ISSUE INVENTORY gaps.

**What it checks:**
- FC-8: Cross-references — grep session files for "see", "refer to", "per the plan" phrases
- FC-28: V9-003 compliance — check that NODE seeding steps exist in SESSION-A
- FC-29: ISSUE INVENTORY completeness — every ISSUE INVENTORY table has Status filled
- Field paths: ES query field names match the actual DpoTriple schema
- Event names: CloudEvent type strings match between session files and contracts

---

## R4 — NAMED CHECK + SEED AUDIT

**Purpose:** Verify that all iron rules from the flow's contracts are registered in
validate.handler.ts, and that SESSION-A has the correct Phase A graph seeding commands.

**What it checks:**
- PC-5: Named check registry — for each iron rule in contracts, is a named check registered?
- PC-1: Graph fixture seeding — does SESSION-A Step A0 seed xiigen-decision-graph?
- SEED-01: Phase A curl commands seed ARCH_NODE edges for this flow's task types
- SEED-02: Phase A curl commands seed REQUIRES_CHECK edges for this flow's named checks

---

## R5 — GAP CLASSIFICATION

**Purpose:** Take all raw gap candidates from R1-R4 and assign each a class (A-L),
severity (🔴/🟠/🟡/⬜), and fix class.

**Gap classes (from GAP-PREP-MASTER-PLAN):**
A=fixture, B=bootstrap, C=archetype, D=named_check, E=scorer,
F=feedback, G=session, H=schema, J=planning_layer, K=graph_seeding, L=governance

**Output:** `FLOW-XX-GAPS-CLASSIFIED.json` with each gap having:
`gap_id`, `gap_class`, `severity` (SILENT_FAILURE/BREAKS/PARTIAL/ADVISORY),
`file`, `problem`, `impact`, `fix`, `scope`, `layer`, `before`

---

## R6 — DEDUPLICATION

**Purpose:** Merge gaps with the same root cause into canonical gap IDs.

**Deduplication rules:**
- Same root cause in 2+ files → one canonical gap ID with multiple file paths
- Same gap found in R1, R2, and R3 → one canonical gap ID
- FLOW-07 inherited gaps that carry forward → note the source flow

**Output:** `FLOW-XX-GAPS-DEDUP.json` with `canonical_gaps[]` array.

---

## R7 — ROOT CAUSE LADDER

**Purpose:** For each canonical gap, ask WHY three times and estimate session cost.

**Output format per gap:**
```json
{
  "gap_id": "GAP-SIM-9",
  "level_1": "What is the immediate symptom?",
  "level_2": "What architectural cause produced it?",
  "level_3": "What pattern category produced this class of gap?",
  "session_estimate": 1,
  "fix_class": "CONVENTION / ADAPTATION / EXTENSION / NEW"
}
```

**Output:** `FLOW-XX-ROOT-CAUSE-MAP.json`

---

## R8 — GAP DOCUMENT AUTHORING

**Purpose:** Write `FLOW-XX-ENGINE-GAP-LIST.md` from the deduplicated canonical gap list.
This is the deliverable of the entire 9-round pipeline.

**File structure:**
```markdown
# SESSION-GAP-PREP-R8.md
## Round: R8 | Phase: GAP DOCUMENT AUTHORING
## Action: Write FLOW-XX-ENGINE-GAP-LIST.md
## Output: ✅ FLOW-XX-ENGINE-GAP-LIST.md — the deliverable

---

## CONFIGURE
[export FLOW_ID, SESSIONS_DIR, ROOT_MAP, DEDUP, INTAKE, OUT paths]

## STEP 1 — Assemble gap document sections
[bash/python: read GAPS-DEDUP.json, write 7-layer ENGINE-GAP-LIST.md sections]

## STEP 2 — Self-containment verification
[bash: verify all required sections present, body/table counts match]

## STEP 3 — Copy to sessions directory
[bash: cp $OUT to canonical path]

## ISSUE INVENTORY
⛔ STOP — FLOW-XX-ENGINE-GAP-LIST.md delivered.
```

**R8 produces the ENGINE-GAP-LIST.md documented in GUIDE-B29.** The script in R8
reads the deduplicated gaps from R6 and the root cause map from R7, and assembles
the 7-layer ENGINE-GAP-LIST.md with all gap entries, priority legend, execution
order summary, and summary table.

---

## DEPENDENCY AND EXECUTION RULES

**Execution order is strict:**
```
R0 → R1 → R2 ─┐
     R0 → R3  ├→ R5 → R6 → R7 → R8 (deliverable)
     R0 → R4 ─┘
```

Each round depends on R0 (INTAKE.json). R1-R4 can run in any order after R0.
R5 cannot start until R1, R2, R3, and R4 are all complete.

**If E1 or E3 BREAKS in R1:**
Flag all R2 execution traces as "planning layer unreliable." The gap list will
contain planning layer infrastructure gaps that must be fixed before R2 traces
can be trusted. Note this in R2's ISSUE INVENTORY.

**Cadence:** One file per response. ⛔ STOP after each file, await confirmation before
proceeding to the next round.

---

## THE TWO PRODUCTION MODES

**Mode 1 — Template mode (for new flows):**
Use the generic templates from GAP-PREP-PROCESS-R0.zip, filling in `FLOW_ID`
and the flow-specific values discovered in R0. Template structure: CONFIGURE block,
numbered STEPs with bash commands, verification check, ISSUE INVENTORY, STOP.

**Mode 2 — Verification mode (for flows with prior simulation runs):**
When 20+ simulation rounds already exist (like FLOW-10 with 35 rounds), R0 becomes
a verification round that counts gap signals from prior simulation output rather than
running live E-group checks. Structure: SCENARIO SETUP, DIAGNOSIS TABLE, TRACE DETAIL,
PROCEED/HALT verdict.

The FLOW-10-SESSION-GAP-PREP-R0.md is Mode 2. The generic template is Mode 1.
For flows where simulation ran first → use Mode 2 from R0. For new flows without
prior simulation → use Mode 1.

---

## ACCEPTANCE CRITERIA FOR SESSION-GAP-PREP-RN FILES

Before any SESSION-GAP-PREP-RN.md is considered complete:

- [ ] Round header states: Round, Phase, Action, Output, Self-contained flag
- [ ] CONFIGURE block with `export FLOW_ID="FLOW-XX"` as the only parameter to change
- [ ] All bash commands are literal (no references to external scripts)
- [ ] Output file is explicitly written to `$SESSIONS_DIR/${FLOW_ID}-[SUFFIX]`
- [ ] ISSUE INVENTORY table present
- [ ] ⛔ STOP at end names the output file that must exist before next round
- [ ] No cross-references to other session files ("see R3", "as in R1")
- [ ] R8 specifically produces `FLOW-XX-ENGINE-GAP-LIST.md` as the deliverable

---

## KEY RULES

**1. R0 is the dependency bottleneck — it must complete before R1-R4 can start.**
R0's INTAKE.json defines the scope for all subsequent rounds. Without it, R1-R4
must guess which task types, events, and session files to check.

**2. R8 is the deliverable round — not R7.**
The root cause map (R7) is an intermediate artifact. The ENGINE-GAP-LIST.md (R8)
is what feeds directly into GUIDE-B29 and the gap translation process.

**3. Session files are self-contained, not narrative.**
Each SESSION-GAP-PREP-RN.md must be independently executable by Claude Code
in a new session with no prior context. This means no "as established in R1" or
"using the classification from R5" — restate the relevant context inline.

**4. STOP cadence: one file per response.**
The master plan uses a ⛔ STOP after each round. This is not optional. It prevents
R2 from running before R0's INTAKE.json has been confirmed complete.

---

*End of GUIDE-B33 — SESSION-GAP-PREP-RN family*
*List A sources: ZIP-12 GAP-PREP-PROCESS-R0.zip (SESSION-GAPPREP-R0..R8 generic templates),*
*ZIP-17 (FLOW-10 SESSION-GAP-PREP-R0.md, SESSION-GAP-PREP-R2.md production examples),*
*ZIP-17 (SESSION-GAPPREP-R0-FLOW09.md — E-group checks inline format)*
*Target B-type: B-33 — SESSION-GAP-PREP-RN family (9 files)*
*Round: 43 of 72*
