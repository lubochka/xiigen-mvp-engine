# GUIDE-B30 — How to Produce `FLOW-XX-GAP-REGISTRY.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 40 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-GAP-REGISTRY.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the GAP-REGISTRY.json guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance, it will
produce a structured machine-readable gap registry that enables automated tracking
and execution of all gaps identified in the ENGINE-GAP-LIST.

---

## WHAT THIS FILE IS

`FLOW-XX-GAP-REGISTRY.json` is the **structured JSON counterpart to ENGINE-GAP-LIST.md**.
Where the ENGINE-GAP-LIST is human-readable narrative with code blocks and priority
context, the GAP-REGISTRY is a compact, machine-readable record of every gap that can
be programmatically consumed — filtered by severity, sorted by block/round, and
cross-referenced to session files.

**Position in the gap preparation family:**
```
ENGINE-GAP-LIST.md    → human-readable narrative (GUIDE-B29)
GAP-REGISTRY.json     → this file — machine-readable record
GAPS-MASTER-PLAN.md   → execution plan per round (GUIDE-B31)
```

**Who uses GAP-REGISTRY.json:**
- The GAPS-MASTER-PLAN.md references gap IDs from the registry as task identifiers
- Automated tooling can filter by `block`, `severity_normalized`, or `round` to
  identify which gaps to work on next
- Cross-flow gap analysis compares registries to identify systemic gaps that recur
  across flows (same root cause, different flow)

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-10-GAP-REGISTRY.json` — mature v2 schema (23 gaps): top-level fields (flowId, source, generated, total_gaps, advisory_deferred, execution_order_raw, gaps[]), per-gap fields (ID, Layer, Description, Severity, Scope, Before, problem, impact, fix_excerpt, file, severity_normalized, block, round, session_file) |
| ZIP-17 | PRIMARY | `FLOW-07-GAP-REGISTRY.json` — mature v2 schema (26 gaps): same field set, different severity vocabulary for simulation gaps (SILENT_FAILURE, BREAKS, PARTIAL, VERIFY) |
| ZIP-17 | COMPARISON | `FLOW-03-GAP-REGISTRY.json` — early v1 schema (10 gaps): different structure with root_causes object, blocking_count, blocking_sequence, verdict/phase/root_cause_id per gap — shows schema evolution |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-GAP-REGISTRY.json`

Note: same `last-phase-testing-plan/` subdirectory as the ENGINE-GAP-LIST.

---

## THE SCHEMA (v2 — current)

### Top-level structure

```json
{
  "flowId": "FLOW-XX",
  "source": "docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-ENGINE-GAP-LIST.md",
  "generated": "YYYY-MM-DD",
  "total_gaps": N,
  "advisory_deferred": [],
  "execution_order_raw": "FIX-1 (description) → FIX-2 (description) → ...",
  "gaps": [ ... ]
}
```

**Top-level field rules:**

| Field | Type | Rule |
|-------|------|------|
| `flowId` | string | FLOW-XX format, e.g. "FLOW-10" |
| `source` | string | Full path to the ENGINE-GAP-LIST.md this registry was built from |
| `generated` | string | ISO date YYYY-MM-DD |
| `total_gaps` | number | Count of all items in `gaps[]` |
| `advisory_deferred` | array | Gap IDs that were explicitly deferred to a future session; empty `[]` is the default |
| `execution_order_raw` | string | Human-readable ordered fix sequence, e.g. "FIX-1 (Interface extensions) → FIX-2 (Contract files) → ..." |
| `gaps` | array | The canonical gap entry array — one entry per gap |

### Per-gap entry fields (v2 schema)

```json
{
  "ID": "EC-1",
  "Layer": "TypeScript",
  "Description": "One-sentence summary of what is missing or wrong",
  "Severity": "CRITICAL",
  "Scope": "FLOW-XX",
  "Before": "FLOW-XX",
  "problem": "Full technical description of the gap — what file, what is absent, what breaks",
  "impact": "What fails at runtime — sessions, training signal, or code quality",
  "fix_excerpt": "Concise description of the fix — what to add, where, approximate size",
  "file": "server/path/to/file.ts",
  "severity_normalized": "CRITICAL",
  "block": 1,
  "round": 0,
  "session_file": "SESSION-GAP-R0.md"
}
```

### Per-gap field rules

| Field | Type | Values / Rules |
|-------|------|---------------|
| `ID` | string | Canonical gap ID from R6 deduplication — format: `[PREFIX]-[N]` or `[PREFIX]-[N]_F[XX]` |
| `Layer` | string | "TypeScript" / "Content" / "Infrastructure" / "—" (governance/deferred) |
| `Description` | string | One sentence max — what is missing or broken |
| `Severity` | string | Original severity label from ENGINE-GAP-LIST (may differ from normalized) |
| `Scope` | string | "FLOW-XX" — which flow this gap affects |
| `Before` | string | "FLOW-XX" or "FLOW-XX Block N" — when must be fixed (before the flow starts, or before a specific block) |
| `problem` | string | Full technical explanation — file path, missing item, runtime consequence |
| `impact` | string | Observable effect: what breaks, what training signal is corrupted |
| `fix_excerpt` | string | Concise fix — what TypeScript/JSON to add, approximate line count |
| `file` | string | Target file path (or comma-separated paths if multi-file) |
| `severity_normalized` | string | Normalized severity — one of: CRITICAL / HIGH / SILENT_FAILURE / PARTIAL / BREAKS / VERIFY / PRODUCT_DECISION |
| `block` | number | Execution block (1 = must-fix-before-any-session, 2 = fix-before-specific-session) |
| `round` | number | Which SESSION-GAP-RN.md round fixes this gap (0-indexed) |
| `session_file` | string | "SESSION-GAP-RN.md" — the session file that implements this fix |

---

## SEVERITY VOCABULARY

Two severity systems exist across flows. The normalized system is used in `severity_normalized`:

**FLOW-10 style (engine architecture gaps):**
| `severity_normalized` | Meaning |
|----------------------|---------|
| `CRITICAL` | Unblocks all sessions — without this, Phase A or Phase B cannot start |
| `HIGH` | Blocks specific phases or corrupts specific training dimensions |
| `SILENT_FAILURE` | Engine continues but learning data is silently wrong |
| `VERIFY` | Requires verification that a fix is correctly applied |
| `PRODUCT_DECISION` | Needs a product decision before the gap can be closed |

**FLOW-07 style (simulation gap vocabulary from GAP-PREP-MASTER-PLAN):**
| `severity_normalized` | Meaning |
|----------------------|---------|
| `SILENT_FAILURE` | Code runs, quality signal wrong (highest priority after BREAKS) |
| `BREAKS` | Visible failure — execution stops, 0 triples stored |
| `PARTIAL` | Execution proceeds, signal degraded or incomplete |
| `VERIFY` | Needs confirmation after fix applied |

Both vocabularies appear in production registries. The guidance authoring round (R8)
normalizes to whichever vocabulary fits the flow's gap class distribution.

---

## HOW TO PRODUCE THE FILE

### Step 1 — Read the ENGINE-GAP-LIST.md

```bash
cat docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-ENGINE-GAP-LIST.md
```

Identify:
- Total gap count
- All gap IDs from the SUMMARY TABLE
- Execution order from the EXECUTION ORDER section
- Any gaps marked as advisory_deferred (typically ⬜ ADVISORY items deferred to later)

### Step 2 — Build the registry skeleton

```bash
cat > docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-GAP-REGISTRY.json << 'EOF'
{
  "flowId": "FLOW-XX",
  "source": "docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-ENGINE-GAP-LIST.md",
  "generated": "YYYY-MM-DD",
  "total_gaps": N,
  "advisory_deferred": [],
  "execution_order_raw": "[from ENGINE-GAP-LIST EXECUTION ORDER section]",
  "gaps": []
}
EOF
```

### Step 3 — Populate gaps array from ENGINE-GAP-LIST

For each item in the SUMMARY TABLE of the ENGINE-GAP-LIST, create one gap entry.
The data maps from the ENGINE-GAP-LIST sections:

| Registry field | Source in ENGINE-GAP-LIST |
|---------------|--------------------------|
| `ID` | Gap ID from SUMMARY TABLE column `Gap` (e.g., `GAP-SIM-1`) |
| `Layer` | Section header (Section 1=Infrastructure, Section 2-6=TypeScript, Section 7=Content) |
| `Description` | Concise title from the section item header |
| `Severity` | Color emoji converted: 🔴=CRITICAL/BLOCKING, 🟡=SILENT_FAILURE, 🟢=PARTIAL, ⬜=ADVISORY |
| `Scope` | "FLOW-XX" |
| `Before` | "FLOW-XX" (or "FLOW-XX Block 2" for items in Execution Phase 2 or 3) |
| `problem` | The "Why:" paragraph from the gap item |
| `impact` | Derived from "Why:" — what fails at runtime |
| `fix_excerpt` | The concise description from "What to add/change:" |
| `file` | The file path from "Register in:" or the section header |
| `severity_normalized` | Normalized severity label |
| `block` | 1 for Phase 1 (unblocking), 2 for Phase 2/3 (silents and quality) |
| `round` | Which SESSION-GAP-R[N].md round implements this fix |
| `session_file` | "SESSION-GAP-R[N].md" |

### Step 4 — Assign round numbers

The `round` field and `session_file` field require knowing the gap execution order.
The GAPS-MASTER-PLAN.md (B-31) defines this — but when building the registry first,
use this default assignment rule:

- Phase 1 gaps (BLOCKING/CRITICAL): rounds 0, 1, 2, ... — one round per gap or one round per logical group
- Phase 2 gaps (SILENT_FAILURE/HIGH): rounds N+1, N+2, ... continuing from Phase 1
- Phase 3 gaps (PARTIAL/QUALITY): final rounds

The specific round assignment can be refined when authoring GAPS-MASTER-PLAN.md (B-31).
For the registry, the round is the best estimate from the gap's complexity and dependencies.

### Step 5 — Validate the registry

```bash
# Count matches total_gaps
python3 -c "
import json
with open('FLOW-XX-GAP-REGISTRY.json') as f:
    data = json.load(f)
assert len(data['gaps']) == data['total_gaps'], f'Count mismatch: {len(data[\"gaps\"])} vs {data[\"total_gaps\"]}'
print('✅ Gap count validated:', data['total_gaps'])
print('Severity distribution:', {s: sum(1 for g in data['gaps'] if g['severity_normalized']==s) for s in set(g['severity_normalized'] for g in data['gaps'])})
print('Block distribution:', {b: sum(1 for g in data['gaps'] if g['block']==b) for b in set(g['block'] for g in data['gaps'])})
"
```

---

## EXAMPLE ENTRIES BY GAP TYPE

### Fixture file gap (Layer: Infrastructure, block: 1)

```json
{
  "ID": "GAP-SIM-1",
  "Layer": "Infrastructure",
  "Description": "xiigen-decision-graph ES index not provisioned — fixture file missing",
  "Severity": "BLOCKING",
  "Scope": "FLOW-XX",
  "Before": "FLOW-XX",
  "problem": "server/fixtures/indices/xiigen-decision-graph.json does not exist. SESSION-A Step A0 checks for this index before proceeding. All Phase A graph writes fail with HTTP 404.",
  "impact": "Phase A cannot start — all graph edge seeding for FLOW-XX is blocked.",
  "fix_excerpt": "Create server/fixtures/indices/xiigen-decision-graph.json with full field mappings. Register in engine-bootstrapper.ts index creation sequence.",
  "file": "server/fixtures/indices/xiigen-decision-graph.json",
  "severity_normalized": "CRITICAL",
  "block": 1,
  "round": 0,
  "session_file": "SESSION-GAP-R0.md"
}
```

### Named check gap (Layer: TypeScript, block: 1, SILENT_FAILURE)

```json
{
  "ID": "GAP-CHK-1",
  "Layer": "TypeScript",
  "Description": "NAMED_CHECK_[FLOW_SPECIFIC] not registered in validate.handler.ts",
  "Severity": "SILENT_FAILURE",
  "Scope": "FLOW-XX",
  "Before": "FLOW-XX",
  "problem": "server/src/af-stations/validate.handler.ts NAMED_CHECKS does not contain '[check_name]'. FLOW-XX T[NNN] iron rule is never evaluated. Generated code violating this rule passes all quality gates.",
  "impact": "T[NNN] code with [violation pattern] passes scoring silently. DPO triple records wrong quality signal.",
  "fix_excerpt": "Import NAMED_CHECK_[NAME] from contracts file. Add to NAMED_CHECKS: { [check_key]: { default: NAMED_CHECK_[NAME].check, message: NAMED_CHECK_[NAME].teachingPoint } }",
  "file": "server/src/af-stations/validate.handler.ts",
  "severity_normalized": "SILENT_FAILURE",
  "block": 1,
  "round": 2,
  "session_file": "SESSION-GAP-R2.md"
}
```

### Session file correction (Layer: Content, block: 1, CRITICAL)

```json
{
  "ID": "GAP-SES-1",
  "Layer": "Content",
  "Description": "SESSION-E GAP-08 ES query uses wrong field names for DPO triple schema",
  "Severity": "CRITICAL",
  "Scope": "FLOW-XX",
  "Before": "FLOW-XX",
  "problem": "SESSION-E Step E3 queries {exists: {field: 'chosen.code'}} — DpoTriple schema stores chosen as top-level string 'chosen', not nested 'chosen.code'. Query always returns 0, permanently blocking Phase E.",
  "impact": "Phase E arbiter panel cannot proceed — DPO count gate never passes regardless of triple quality.",
  "fix_excerpt": "Replace {exists: {field: 'chosen.code'}} with {exists: {field: 'chosen'}} and {exists: {field: 'rejected.code'}} with {exists: {field: 'rejected'}} in SESSION-E Step E3.",
  "file": "docs/sessions/FLOW-XX/FLOW-XX-SESSION-E.md",
  "severity_normalized": "CRITICAL",
  "block": 1,
  "round": 1,
  "session_file": "SESSION-GAP-R1.md"
}
```

### Product decision gap (Layer: —, block: 2)

```json
{
  "ID": "P1-1_FXX",
  "Layer": "—",
  "Description": "PRODUCT GATE: [strategy decision] for T-[NNN] not decided; T-[NNN] contract cannot be seeded until Luba specifies strategy",
  "Severity": "PRODUCT_DECISION",
  "Scope": "FLOW-XX",
  "Before": "FLOW-XX Block 2",
  "problem": "T-[NNN] requires a product strategy decision: [option A], [option B], or [option C]. This is not an engineering decision. The T-[NNN] contract cannot be completed without knowing the chosen strategy.",
  "impact": "T-[NNN] contract file is incomplete. R[N]-[N] cannot be executed.",
  "fix_excerpt": "Luba specifies strategy. Engineer updates T-[NNN] contract with correct strategy field. Then R[N]-[N] can be executed.",
  "file": "docs/sessions/FLOW-XX/FLOW-XX-STATE.json (record decision) + server/src/engine-contracts/FLOW-XX-contracts.ts",
  "severity_normalized": "PRODUCT_DECISION",
  "block": 2,
  "round": 22,
  "session_file": "SESSION-GAP-R22.md"
}
```

---

## SCHEMA EVOLUTION NOTE (v1 → v2)

The FLOW-03 GAP-REGISTRY uses the early v1 schema which has:
- A `root_causes` object at the top level (key: RC-X, value: title/gap_ids/root/fix_path)
- A `blocking_count` field
- A `blocking_sequence` array
- Per-gap: `verdict`, `phase`, `root_cause_id`, `fix_path` instead of `problem`/`impact`/`fix_excerpt`/`file`

The v2 schema (FLOW-07, FLOW-10) eliminates the `root_causes` object — root cause
information is embedded per-gap in the `problem` and `impact` fields. Use v2 for all
new flows. The v1 schema is documented here only for backward compatibility awareness.

---

## ACCEPTANCE CRITERIA FOR GAP-REGISTRY.JSON

Before GAP-REGISTRY.json is considered complete:

- [ ] `flowId` matches the target flow (e.g., "FLOW-XX")
- [ ] `source` points to the correct ENGINE-GAP-LIST.md path
- [ ] `generated` is today's date
- [ ] `total_gaps` equals the count of items in `gaps[]`
- [ ] `execution_order_raw` matches the EXECUTION ORDER from ENGINE-GAP-LIST
- [ ] Every gap entry has all 14 required fields populated (no nulls or empty strings)
- [ ] All `session_file` values follow the "SESSION-GAP-RN.md" pattern
- [ ] `block` values are 1 or 2 only
- [ ] `severity_normalized` uses one of the recognized vocabulary values
- [ ] PRODUCT_DECISION gaps have `block: 2` and a `Before` value indicating which block
- [ ] Python validation script passes (count match, no missing fields)
- [ ] JSON is valid (no trailing commas, no syntax errors)

---

## KEY RULES

**1. One gap entry per gap ID — no duplicates.**
If the same root cause appears in multiple files (e.g., wrong event name in 3 session
files), it may be one gap ID with a combined `file` field listing all affected files,
or it may be multiple gap IDs — this is decided in R6 (deduplication round). The
registry mirrors R6's deduplication decisions exactly.

**2. `round` and `session_file` must be internally consistent.**
If a gap has `round: 3`, its `session_file` must be "SESSION-GAP-R3.md". These two
fields are derived from the same source — the GAPS-MASTER-PLAN.md (B-31).

**3. `total_gaps` must exactly equal `gaps[]` length.**
A mismatch between `total_gaps` and the actual array length means either a gap entry
was dropped during authoring or `total_gaps` wasn't updated. The validation script
checks this.

**4. PRODUCT_DECISION gaps get block: 2.**
A product decision gap can't be fixed by Claude Code alone — it requires Luba's input
before the engineering work can proceed. These always go in Block 2 (after any Block 1
unblocking work is done and Luba has reviewed).

**5. advisory_deferred contains gap IDs, not descriptions.**
Items in `advisory_deferred` are gap IDs that were identified but explicitly deferred
to a future session. They must still appear in `gaps[]` with `severity_normalized:
"ADVISORY"` — the `advisory_deferred` array is just a quick-reference list of those IDs.

---

## RELATIONSHIP TO ADJACENT GAP DOCUMENTS

- **ENGINE-GAP-LIST.md (B-29):** The source narrative. GAP-REGISTRY.json is built
  from the SUMMARY TABLE of the ENGINE-GAP-LIST. Every gap in the registry has a
  corresponding narrative entry in the list.

- **GAPS-MASTER-PLAN.md (B-31):** Uses the registry's `round` and `session_file`
  fields to structure the execution plan. The registry is the machine-readable input
  to the master plan's round table.

- **SESSION-GAP-RN.md files:** Each `session_file` entry in the registry corresponds
  to an actual SESSION-GAP-RN.md that implements the fix. The session files are the
  work products; the registry is the index.

---

*End of GUIDE-B30 — FLOW-XX-GAP-REGISTRY.json*
*List A sources: ZIP-17 (FLOW-03/07/10 GAP-REGISTRY.json samples — v1 and v2 schemas)*
*Target B-type: B-30 — FLOW-XX-GAP-REGISTRY.json*
*Round: 40 of 72*
