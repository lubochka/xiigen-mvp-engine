# GUIDE-B29 — How to Produce `FLOW-XX-ENGINE-GAP-LIST.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 39 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-ENGINE-GAP-LIST.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the ENGINE-GAP-LIST guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
contracts and simulation findings, it will produce a correct ENGINE-GAP-LIST that
identifies every infrastructure, engine, and session file gap needed before the flow
can be correctly taught to the XIIGen engine.

---

## WHAT THIS FILE IS

`FLOW-XX-ENGINE-GAP-LIST.md` belongs to the **gap preparation family** — a set of
documents that describe what must be changed, added, or fixed in the engine and
session files before a new flow can run its teaching sessions successfully.

Unlike the Steps 1-10 documents (which define the simulation pipeline), the
ENGINE-GAP-LIST is a **practical action list**: every item is specific (a named file,
a specific change, the gap ID it closes), ordered by execution priority, and color-
coded by severity.

**Position in the flow documentation set:**
```
Simulation pipeline (Steps 1-10) → defines HOW to design the flow
Gap preparation documents         → defines WHAT must be fixed before teaching begins
  ├── ENGINE-GAP-LIST.md    (this file — what changes needed)
  ├── GAP-REGISTRY.json     (B-30 — structured registry of all gaps)
  └── GAPS-MASTER-PLAN.md   (B-31 — execution plan for fixing them)
```

**When ENGINE-GAP-LIST is used:**
After the simulation pipeline (Steps 1-8) completes and the design is locked, but
before the teaching sessions (Phase A-F) run. The gap list identifies everything the
engine needs to correctly handle the new flow's archetypes, contracts, and events.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-02-ENGINE-GAP-LIST.md` — full example: 7 sections (fixture files, bootstrapper, archetypes, validate.handler, quality-scorer, feedback.handler, session file corrections), color-coded severity, summary table, execution order |
| ZIP-17 | PRIMARY | `FLOW-04-ENGINE-GAP-LIST.md` — second full example with different archetypes, showing how the layer structure adapts per flow |
| ZIP-12 | PRIMARY | `GAP-PREP-MASTER-PLAN.md` (from `GAP-PREP-PROCESS-R0.zip`) — the 9-round process that produces ENGINE-GAP-LIST: R0 (intake), R1 (planning-layer sim), R2 (execution sim), R3 (session audit), R4 (check+seed audit), R5 (classification), R6 (dedup), R7 (root cause), R8 (authoring = deliverable) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-ENGINE-GAP-LIST.md`

Note the path: this file lives inside `last-phase-testing-plan/` — a subdirectory
within the flow's session folder, not at the top level.

---

## THE 9-ROUND GAP PREPARATION PROCESS (GAP-PREP-MASTER-PLAN)

The ENGINE-GAP-LIST is not authored from scratch in one step — it is the output of
an 8-round investigation + 1 authoring round. Claude Code follows this process:

| Round | Session file | What it does | Output |
|-------|-------------|-------------|--------|
| R0 | SESSION-GAPPREP-R0.md | INTAKE: read flow contracts, topology, session file inventory | FLOW-XX-INTAKE.json |
| R1 | SESSION-GAPPREP-R1.md | PLANNING-LAYER SIM: E-group (ES mapping, cycle router, interface, DPO schema) | Raw J/K/H-class gap list |
| R2 | SESSION-GAPPREP-R2.md | FLOW EXECUTION SIM: A-group trace for all task types | Raw ENG/DATA/SESSION gap candidates |
| R3 | SESSION-GAPPREP-R3.md | SESSION FILE AUDIT: FC-8/FC-28/FC-29 scan | Raw SES-layer gap list |
| R4 | SESSION-GAPPREP-R4.md | NAMED CHECK + SEED AUDIT: PC-5, PC-1, SEED-01/02 | Raw CHK/SEED/INFRA gap list |
| R5 | SESSION-GAPPREP-R5.md | GAP CLASSIFICATION: assign class A-L, severity 🔴/🟠/🟡/⬜ | Classified gap table |
| R6 | SESSION-GAPPREP-R6.md | DEDUPLICATION: merge same-root gaps, promote to canonical GAP IDs | Deduplicated canonical list |
| R7 | SESSION-GAPPREP-R7.md | ROOT CAUSE LADDER: 3-level WHY per gap, session count estimate | Root cause map |
| R8 | SESSION-GAPPREP-R8.md | GAP DOC AUTHORING: write FLOW-XX-ENGINE-GAP-LIST.md | ✅ **Deliverable** |

**Dependency chain:**
```
R0 → R1 → R2 ─┐
     R0 → R3  ├→ R5 → R6 → R7 → R8 (deliverable)
     R0 → R4 ─┘
```

Each round has a cadence: one session file per response, stop after file presented,
await confirmation before proceeding to next round.

---

## THE 7-LAYER GAP STRUCTURE

Every ENGINE-GAP-LIST uses the same 7-layer structure, populated with only the
layers that have gaps for this specific flow:

| Layer | Section header | Gap ID prefix | What goes here |
|-------|---------------|--------------|---------------|
| 1 | ENGINE CODE CHANGES | GAP-ENG-N | TypeScript source file changes |
| 2 | DATA + TOPOLOGY | GAP-DATA-N | topology.json, ES documents, fixture files |
| 3 | SESSION FILE ADDITIONS | GAP-SESSION-N | Amendments to SESSION-N.md bash files |
| 4 | NAMED CHECK CATALOG | GAP-CHK-N | Additions to validate.handler NAMED_CHECKS |
| 5 | GRAPH SEEDING | GAP-SEED-N | Phase A curl commands for xiigen-decision-graph |
| 6 | NEW FILES REQUIRED | GAP-FILES-N | New .spec.ts stubs, new session files |
| 7 | GOVERNANCE | GAP-GOV-N | AGENTS.md, skill updates, process rules |

**Gap ID system:** Each gap gets a canonical ID (e.g., `GAP-SIM-9`) during the R6
deduplication round. The same gap ID is used across ENGINE-GAP-LIST, GAP-REGISTRY.json,
and GAPS-MASTER-PLAN.md for cross-reference.

---

## THE SEVERITY SYSTEM

Every item in the gap list has one of four severity markers:

| Color | Label | Meaning | Effect on sessions |
|-------|-------|---------|-------------------|
| 🔴 | BLOCKING | Sessions cannot proceed without this | Phase A or Phase B will not start |
| 🟡 | SILENT | Sessions run but training signal is wrong or unenforced | Code compiles, DPO triple is corrupted |
| 🟢 | QUALITY | Sessions run correctly but OSS teaching signal is degraded | Curriculum tier wrong, distillation readiness misjudged |
| ⬜ | ADVISORY | Correct today; architectural gap for future flows | No immediate effect |

**Priority rule:** Fix in order: 🔴 first (blocking), then 🟡 (silent failures), then 🟢, then ⬜.

---

## THE FILE STRUCTURE

A well-formed ENGINE-GAP-LIST has this structure:

```markdown
# FLOW-XX Engine Gap List
## What must be added/changed to successfully teach XIIGen with FLOW-XX
## Derived from: R[N]-R[N] simulation findings | [worktree] | [date]

---

## HOW TO READ THIS LIST
[Key with color meanings]

---

## SECTION 1 — NEW FIXTURE FILES (infrastructure)
[Infrastructure gaps — fixture JSONs, index mappings — BLOCKING items first]

## SECTION 2 — ENGINE-BOOTSTRAPPER.TS
[Bootstrap seeding gaps — task type registration, topology registration]

## SECTION 3 — [DOMAIN-SPECIFIC ENGINE FILE]
[Flow-specific engine file — archetypes.ts, contracts.ts, or similar]

## SECTION 4 — VALIDATE.HANDLER.TS
[Named check registration gaps — SILENT failure class]

## SECTION 5 — QUALITY-SCORER.TS
[Scoring dimension gaps — archetype gate dispatchers]

## SECTION 6 — FEEDBACK.HANDLER.TS
[Curriculum tier and feedback gaps]

## SECTION 7 — SESSION FILE CORRECTIONS
[Session file text changes — field names, event names, threshold values]

---

## SUMMARY TABLE
| # | File | Change | Gap | Priority |
[All gaps in one table, ordered by priority]

---

## EXECUTION ORDER
Phase 1 — Unblock (no engine code changes): [list BLOCKING items]
Phase 2 — Silent failure elimination (engine changes): [list SILENT items]
Phase 3 — Calibration (QUALITY + ADVISORY items)
```

---

## HOW TO PRODUCE THE FILE (COMPLETE PROCESS)

### Step 1 — Run R0 INTAKE: read contracts and inventory

```bash
# Read the flow's contracts file
cat server/src/engine-contracts/FLOW-XX-contracts.ts

# Inventory session files
ls docs/sessions/FLOW-XX/

# Inventory fixture files for existing flows
ls server/fixtures/indices/ | grep -v "FLOW-0[1-9]"  # new indices needed?

# Check which archetypes are already registered
grep -n "= '" server/src/engine-contracts/archetypes.ts | head -30

# Read FLOW-XX topology.json
cat server/fixtures/topologies/FLOW-XX-topology.json 2>/dev/null || echo "Missing topology"
```

Output: `FLOW-XX-INTAKE.json` with keys:
```json
{
  "flowId": "FLOW-XX",
  "taskTypes": ["T[NNN]", "T[NNN+1]", ...],
  "archetypes": ["[archetype1]", "[archetype2]"],
  "events": ["[event1]", "[event2]"],
  "sessionFiles": ["SESSION-A.md", "SESSION-B.md", ...],
  "newIndicesNeeded": [],
  "unregisteredArchetypes": []
}
```

### Step 2 — Run R1-R4: investigation rounds

Each round follows the same pattern:
1. Read the relevant source (simulation log, session file, named check registry)
2. Identify gaps against the expectation
3. Record raw gap candidate with: location, what's missing, why it matters

**R1 Planning-layer simulation** checks E-group items:
- E1: ES mapping — does `xiigen-decision-graph` index have fields for this flow's archetypes?
- E3: Cycle router — does the router handle this flow's archetype correctly?
- E4: Interface — are fabric interfaces available for new external systems?
- E7: DPO schema — does `xiigen-planning-decisions` have fields for new triple types?

**R2 Execution simulation** traces the A-group for each task type:
- Per task type: what nodes does the AF pipeline hit? Are they all registered?
- GenericNodeExecutor: does it fall back to `defaultNodes()` for any task type?
- What events are emitted? Do downstream consumers exist?

**R3 Session file audit** runs FC-8/FC-28/FC-29 checks:
- FC-8: Are there cross-references to undefined variables in session files?
- FC-28: Are V9-003 checks present where needed?
- Are field paths in ES queries correct? (e.g., `chosen.code` vs `chosen`)

**R4 Named check + seed audit**:
- PC-5: Are all iron rules from the flow's contracts registered in validate.handler?
- PC-1: Does SESSION-A seed the correct graph fixture (xiigen-decision-graph)?
- SEED-01/02: Are phase A seed curl commands present and pointing to correct indices?

### Step 3 — Run R5-R7: classification, dedup, root cause

**R5 Classification**: assign each raw gap candidate:
- Gap class: A (fixture), B (bootstrap), C (archetype), D (named check), E (scorer), F (feedback), G (session), H (schema), J (planning layer), K (graph seeding), L (governance)
- Severity: 🔴 BLOCKING / 🟡 SILENT / 🟢 QUALITY / ⬜ ADVISORY

**R6 Deduplication**: merge gaps with the same root cause into a single canonical gap.
Format: `GAP-SIM-N` for simulation gaps, `GAP-ENG-N` for engine gaps.
Multi-location gaps (same problem in 3+ files) become one systemic gap.

**R7 Root cause ladder**: for each canonical gap, ask WHY three times:
- Level 1: What is the immediate symptom?
- Level 2: What is the architectural cause?
- Level 3: What pattern led to this category of gap?
Estimate the number of session rounds needed to fix each root cause cluster.

### Step 4 — Run R8: write the ENGINE-GAP-LIST document

Using the canonical gap list from R6 and root cause map from R7, author the
ENGINE-GAP-LIST following the 7-layer structure and summary table format shown above.

Each gap entry contains:
```markdown
### [Section].N [Concise title] [Severity emoji]

**Gap closed:** GAP-SIM-N
**Why:** [One paragraph — what breaks, what the effect is on sessions]

**What to add/change:**
[Code block with exact TypeScript, JSON, or bash command]

**Register in:** [file path] — [where exactly in that file]
```

---

## FLOW-SPECIFIC SECTIONS (what varies per flow)

The 7-layer structure is universal. What varies per flow:

| Section | What changes | How to determine |
|---------|-------------|-----------------|
| Section 1 (fixtures) | New ES index JSONs needed | Check R0 intake — which indices are referenced in contracts but not in `fixtures/indices/` |
| Section 2 (bootstrapper) | Task type topology registration | R0: which task types are not in `seedShadowRunPlaceholders()`? |
| Section 3 (archetypes) | New ContractArchetype enum values | R0: which archetypes in contracts use type coercions `as ContractArchetype`? |
| Section 4 (validate.handler) | New NAMED_CHECKS | R4 audit: which iron rules from contracts are NOT imported in validate.handler? |
| Section 5 (quality-scorer) | Archetype gate dispatcher | R5: does spec_adherence check flow-specific archetype patterns? |
| Section 6 (feedback.handler) | Curriculum tier tierMap | R0: what tier should new archetypes be at? (ROUTING=1, DATA_PIPELINE=2, SERVICE=3, ORCHESTRATION=4, SCHEDULED=5) |
| Section 7 (session corrections) | Field names, event names, thresholds | R3 audit: what field path errors or mismatched event names exist? |

---

## KEY RULES

**1. Every item is actionable — file + change + gap ID.**
A gap entry that says "the engine needs to handle this better" is not actionable.
Every entry states: which file to change, what to add/change (with code), and which
gap ID from R6 it closes.

**2. BLOCKING items come first in both their section and the summary table.**
The execution order section groups items by phase: Phase 1 = unblocking fixes first
(no engine code changes), Phase 2 = SILENT failure elimination (engine code), Phase 3
= calibration. This is not alphabetical — it is functional priority.

**3. DNA rules are NOT gaps.**
If generated code violates DNA-1 through DNA-9, that is not an ENGINE-GAP-LIST item.
DNA rules are enforced by AF-7 (compliance station) which already runs for every flow.
ENGINE-GAP-LIST covers flow-specific gaps: new archetypes, new indices, new named
checks for this flow's iron rules, and session file corrections specific to this flow.

**4. The SILENT failure class is the highest-priority class after BLOCKING.**
A gap that lets the engine continue while producing wrong training data is more damaging
than a gap that causes a visible failure. A visible failure stops execution and gets
fixed immediately. A SILENT gap persists through all teaching sessions, corrupting
the DPO triples silently.

**5. Session file corrections are gaps too.**
The gap list covers not just engine code but session files — bash scripts with wrong
field names, wrong event names, wrong ES query paths, incorrect threshold values.
These are BLOCKING severity because they prevent Phase E or Phase F from completing.

---

## ACCEPTANCE CRITERIA FOR ENGINE-GAP-LIST

Before the ENGINE-GAP-LIST is considered complete:

- [ ] Header states: "Derived from: R[N]–R[N] simulation findings"
- [ ] HOW TO READ section explains the three severity levels
- [ ] At least Sections 1, 2, 4, 7 are present (universal gaps found in every flow)
- [ ] Every gap entry has: Gap ID, Why, code block, file path
- [ ] SUMMARY TABLE lists all gaps with severity emoji and priority
- [ ] EXECUTION ORDER groups Phase 1 (blocking), Phase 2 (silent), Phase 3 (calibration)
- [ ] No gap says "DNA rule violation" — those are not engine gaps
- [ ] All new archetypes in the flow are covered in Section 3

---

## RELATIONSHIP TO SUBSEQUENT GAP DOCUMENTS

- **GAP-REGISTRY.json (B-30):** The canonical JSON registry of every gap. Uses the
  same GAP-SIM-N IDs from the ENGINE-GAP-LIST. Claude Code populates the registry
  from the gap list.

- **GAPS-MASTER-PLAN.md (B-31):** The execution plan for actually implementing the
  fixes. References the ENGINE-GAP-LIST's execution order and uses the gap IDs as
  task identifiers.

---

*End of GUIDE-B29 — FLOW-XX-ENGINE-GAP-LIST.md*
*List A sources: ZIP-17 (FLOW-02/04 ENGINE-GAP-LIST examples),*
*ZIP-12 GAP-PREP-PROCESS-R0.zip (GAP-PREP-MASTER-PLAN.md — 9-round process,*
*7-layer gap structure, severity system, gap ID format)*
*Target B-type: B-29 — FLOW-XX-ENGINE-GAP-LIST.md*
*Round: 39 of 72*
