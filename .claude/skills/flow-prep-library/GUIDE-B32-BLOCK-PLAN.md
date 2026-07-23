# GUIDE-B32 — How to Produce `FLOW-XX-BLOCK-PLAN.json`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 42 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-BLOCK-PLAN.json):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the BLOCK-PLAN.json guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance, it will
produce a machine-readable block plan that serves as the programmatic execution
manifest for the gap-translate process — the JSON counterpart to GAPS-MASTER-PLAN.md.

---

## WHAT THIS FILE IS

`FLOW-XX-BLOCK-PLAN.json` is the **machine-readable execution manifest** for the
gap-translate process. Where GAPS-MASTER-PLAN.md is the human-readable narrative
sequencer, BLOCK-PLAN.json is the compact JSON structure that tooling, automation,
and Claude Code sessions consume to:

- Query which rounds belong to which block
- Determine the execution order of rounds
- Look up inter-gap dependencies programmatically
- Identify safe parallel execution groups
- Track which `session_file` implements each round

**Position in the gap translation system:**
```
GAPS-MASTER-PLAN.md    → human-readable execution narrative (GUIDE-B31)
BLOCK-PLAN.json        → this file — machine-readable execution manifest
SESSION-GAP-RN.md      → individual fix files (GUIDE-B34)
```

**Two use patterns:**
1. **Automation:** A script reads BLOCK-PLAN.json, filters rounds by block and severity,
   and generates an execution checklist or tracks completion.
2. **Authoring:** Claude Code reads BLOCK-PLAN.json to know which SESSION-GAP-RN.md
   files to produce and in what order, without consulting the full GAPS-MASTER-PLAN.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-41-BLOCK-PLAN.json` — **minimal format** (917 bytes): 2 blocks, gap ID arrays only, `mustCompleteBeforePhase` / `canDeferTo`, `estimatedHours`, `rationale`. Shows the compact-adequate schema when flows have few gaps. |
| ZIP-17 | PRIMARY | `FLOW-10-BLOCK-PLAN.json` — **richest format** (12KB, 23 rounds): full schema with `blocks` (dict, keys "1"/"2"/"3"/"DEFERRED"), `rounds[]` (per-round objects with 9 fields), `dependencies` (dict, gap_id → array of prerequisite gap_ids), `safeParallelGroups[]` (array of gate+description+gaps objects) |
| ZIP-17 | COMPARISON | `FLOW-07-BLOCK-PLAN.json` — mature format (26 rounds): same as FLOW-10 but without `safeParallelGroups`; includes block "4" |
| ZIP-17 | COMPARISON | `FLOW-03-BLOCK-PLAN.json` — early v1 format: rounds use old v1 gap schema (ID/verdict/phase/Description/blocking/priority) instead of v2 (round/gap_id/block/layer/severity/fix_group/before/file/session_file/one_action) |
| ZIP-12 | REFERENCE | `GAP-PREP-MASTER-PLAN.md` — defines GAP-TRANSLATE-PROCESS: the process that produces these files from a gap registry |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-BLOCK-PLAN.json`

Same `last-phase-testing-plan/` subdirectory as all other gap preparation files.

---

## TWO FORMATS

**Minimal format (FLOW-41 style):** For flows with few gaps (≤5). Uses a `blocks[]`
array with simple gap ID lists, estimates, and rationale. No per-round objects, no
dependency dict, no parallel groups. Appropriate when the dependency structure is
simple enough to state in the rationale fields.

**Full format (FLOW-10 style):** For flows with 6+ gaps. Uses the complete schema
with `rounds[]` array, `blocks` dict, `dependencies` dict, and `safeParallelGroups[]`.
This is the default for most flows.

---

## THE FULL SCHEMA (v2 — current)

### Top-level structure

```json
{
  "flowId": "FLOW-XX",
  "generated": "YYYY-MM-DD",
  "total_rounds": N,
  "blocks": {
    "1": ["GAP-ID-1", "GAP-ID-2", ...],
    "2": ["GAP-ID-N", ...],
    "3": [],
    "DEFERRED": []
  },
  "rounds": [ ... ],
  "dependencies": {
    "GAP-ID-B": ["GAP-ID-A"],
    "GAP-ID-C": ["GAP-ID-A", "GAP-ID-B"],
    ...
  },
  "safeParallelGroups": [ ... ]
}
```

### Top-level field rules

| Field | Type | Rule |
|-------|------|------|
| `flowId` | string | "FLOW-XX" |
| `generated` | string | ISO date YYYY-MM-DD |
| `total_rounds` | number | Equals `rounds[]` array length |
| `blocks` | object | Keys: "1", "2", "3", "DEFERRED" — values are arrays of gap IDs |
| `rounds` | array | One entry per gap, ordered by round number (0-indexed) |
| `dependencies` | object | Keys: gap IDs that have prerequisites; values: arrays of prerequisite gap IDs |
| `safeParallelGroups` | array | Optional — groups of gaps that can run concurrently |

### Per-round entry (9 fields)

```json
{
  "round": 0,
  "gap_id": "EC-1",
  "block": 1,
  "layer": "INTERFACE",
  "severity": "CRITICAL",
  "fix_group": "FIX-1",
  "before": "FLOW-XX",
  "file": "server/src/engine-contracts/index.ts",
  "session_file": "SESSION-GAP-R0.md",
  "one_action": "Add 5 TypeScript sub-interfaces + 5 optional fields to EngineContract type"
}
```

### Per-round field rules

| Field | Type | Values / Rules |
|-------|------|---------------|
| `round` | number | 0-indexed integer matching position in `rounds[]` |
| `gap_id` | string | Canonical gap ID from GAP-REGISTRY.json |
| `block` | number | 1, 2, or 3 — matching the block assignment in `blocks` dict |
| `layer` | string | "INTERFACE" / "ARCHETYPE" / "CONTENT" / "DATA/TOPOLOGY" / "EXECUTOR" / "SCORE" / "FEEDBACK" / "REGISTRY" / "DPO TRAINING" / "INFRASTRUCTURE" / "GUARDRAIL" / "RAG SEEDING" |
| `severity` | string | severity_normalized from GAP-REGISTRY.json |
| `fix_group` | string | "FIX-1" through "FIX-7" — logical fix group from GAPS-MASTER-PLAN execution_order_raw |
| `before` | string | "FLOW-XX" (must fix before any session) or "FLOW-XX Block 2" |
| `file` | string | Target file path(s) — may be comma-separated or "(new)" for new files |
| `session_file` | string | "SESSION-GAP-RN.md" where N matches `round` |
| `one_action` | string | Imperative verb phrase ≤70 chars — exactly what the session does |

### Dependencies structure

```json
"dependencies": {
  "W1-1": ["EC-1"],
  "E3-1": ["EC-1", "W1-1"],
  "T1-1_F10": ["L1-1_F10", "W1-1"]
}
```

Only gaps WITH prerequisites appear as keys. Gaps with no prerequisites (level-0 gaps)
are not listed. The value is always an array of gap_ids that must complete first.

### Safe parallel groups structure

```json
"safeParallelGroups": [
  {
    "gate": "none",
    "description": "Level 0 — no prerequisites; all can start immediately",
    "gaps": ["EC-1", "L1-1_F10", "V1-1_F10", "X1-3", "X2-4"]
  },
  {
    "gate": "EC-1",
    "description": "After EC-1 passes: S2-1 and W1-1 can start",
    "gaps": ["S2-1", "W1-1"]
  }
]
```

---

## THE MINIMAL SCHEMA (FLOW-41 style)

For flows with ≤5 gaps, a simpler format is appropriate:

```json
{
  "flowId": "FLOW-XX",
  "generated": "YYYY-MM-DD",
  "blocks": [
    {
      "block": 1,
      "name": "[Description of what this block fixes]",
      "gaps": ["GAP-ID-1", "GAP-ID-2"],
      "mustCompleteBeforePhase": "P[N]",
      "estimatedHours": N,
      "rationale": "[Why these gaps are in Block 1 and why they must complete before phase P[N]]"
    },
    {
      "block": 2,
      "name": "[Description]",
      "gaps": ["GAP-ID-3"],
      "canDeferTo": "after-P[N]",
      "estimatedHours": N,
      "rationale": "[Why these gaps can be deferred and what degrades if they are]"
    }
  ]
}
```

Key difference from full format:
- `blocks` is an **array** (not an object with string keys)
- No `rounds[]` array
- No `dependencies` dict
- No `safeParallelGroups[]`
- Each block entry has: `block`, `name`, `gaps` (array of IDs), `mustCompleteBeforePhase` / `canDeferTo`, `estimatedHours`, `rationale`

Use minimal format when: total gaps ≤5, no complex cross-gap dependencies, gaps are
ordered obviously by severity (all CRITICAL first, then SILENT_FAILURE).

---

## HOW TO PRODUCE THE FILE (FULL FORMAT)

### Step 1 — Read the gap registry

```bash
python3 -c "
import json
with open('FLOW-XX-GAP-REGISTRY.json') as f:
    data = json.load(f)

rounds = sorted(data['gaps'], key=lambda g: (g['block'], g['round']))
print(f'Total gaps: {len(rounds)}')
print(f'Total rounds: {data[\"total_gaps\"]}')
for r in rounds:
    print(f'  R{r[\"round\"]:2d} block={r[\"block\"]} {r[\"ID\"]:15s} {r[\"severity_normalized\"]:18s} {r[\"Description\"][:40]}')
"
```

### Step 2 — Build the blocks dict

The `blocks` dict is keyed by string block number ("1", "2", "3", "DEFERRED").
Each value is an array of gap IDs in round order:

```python
blocks = {"1": [], "2": [], "3": [], "DEFERRED": []}
for gap in sorted(data['gaps'], key=lambda g: g['round']):
    block_key = str(gap['block'])
    blocks[block_key].append(gap['ID'])
# advisory_deferred gaps go into DEFERRED key
for gap_id in data.get('advisory_deferred', []):
    blocks['DEFERRED'].append(gap_id)
```

### Step 3 — Build the rounds array

Map each gap entry from the registry to a round object:

```python
rounds = []
for gap in sorted(data['gaps'], key=lambda g: g['round']):
    rounds.append({
        "round": gap['round'],
        "gap_id": gap['ID'],
        "block": gap['block'],
        "layer": map_layer(gap['Layer']),      # TypeScript → INTERFACE/CONTENT/etc.
        "severity": gap['severity_normalized'],
        "fix_group": derive_fix_group(gap),    # FIX-1 through FIX-7 from execution_order_raw
        "before": gap['Before'],
        "file": gap['file'],
        "session_file": gap['session_file'],
        "one_action": derive_one_action(gap)   # Imperative from Description + fix_excerpt
    })
```

**Layer mapping from registry `Layer` to round `layer`:**

| Registry `Layer` | Round `layer` |
|-----------------|--------------|
| TypeScript (interface) | INTERFACE |
| TypeScript (archetype/contract) | ARCHETYPE / CONTRACT |
| TypeScript (executor) | EXECUTOR |
| TypeScript (score/scorer) | SCORE |
| TypeScript (feedback) | FEEDBACK |
| TypeScript (registry) | REGISTRY |
| Content (named checks / session text) | CONTENT |
| Infrastructure (fixtures / verify) | INFRASTRUCTURE |
| — (DPO, training) | DPO TRAINING |

**Fix group derivation:**
The `fix_group` maps to the FIX-N groups in `execution_order_raw`. Read that string and
assign the gap to the appropriate FIX-N group based on what the gap changes:
- FIX-1: Interface extensions (new TypeScript interfaces + fabric tokens)
- FIX-2: Contract files (new task type contracts)
- FIX-3: Executor extensions (GenericNodeExecutor changes)
- FIX-4: Quality gates (named checks, scoring)
- FIX-5: Infrastructure and seeding (fixture files, ensureIndex)
- FIX-6: DPO and training (calibration triples, DPO format)
- FIX-7: Post-execution (deferred items)

### Step 4 — Build the dependencies dict

Only gaps WITH prerequisites appear. Derive from the dependency map in GAPS-MASTER-PLAN:

```python
dependencies = {}
# Read from GAPS-MASTER-PLAN dependency matrix section
# E.g.: "EC-1 → W1-1, E3-1, E4-1" means W1-1/E3-1/E4-1 each depend on EC-1
# Invert: dependencies["W1-1"] = ["EC-1"]
# For multi-dependency: dependencies["E4-2"] = ["EC-1", "E4-1"]
```

### Step 5 — Build safeParallelGroups (if needed)

Extract from the GAPS-MASTER-PLAN "SAFE PARALLEL GROUPS" section:

```python
safeParallelGroups = [
    {
        "gate": "none",
        "description": "Level 0 — no prerequisites; all can start immediately",
        "gaps": [g['ID'] for g in data['gaps'] if g['ID'] not in dependencies]
    },
    # ... additional groups derived from dependency gates
]
```

### Step 6 — Validate and write

```python
import json

plan = {
    "flowId": "FLOW-XX",
    "generated": "YYYY-MM-DD",
    "total_rounds": len(rounds),
    "blocks": blocks,
    "rounds": rounds,
    "dependencies": dependencies,
    "safeParallelGroups": safeParallelGroups
}

# Validate
assert plan['total_rounds'] == len(plan['rounds'])
assert sum(len(v) for v in plan['blocks'].values() if isinstance(v, list)) == plan['total_rounds']

with open('FLOW-XX-BLOCK-PLAN.json', 'w') as f:
    json.dump(plan, f, indent=2)
print('✅ BLOCK-PLAN.json written')
```

---

## CHOOSING BETWEEN MINIMAL AND FULL FORMAT

| Condition | Format |
|-----------|--------|
| Total gaps ≤ 5 | Minimal (FLOW-41 style) |
| Total gaps 6+ | Full (FLOW-10 style) |
| No cross-gap dependencies | Minimal acceptable |
| Multiple parallel execution groups | Full required |
| Automation tooling will consume this | Full required |
| Manual execution only | Minimal sufficient |

---

## KEY RULES

**1. `total_rounds` must equal `rounds[]` array length.**
This is a structural invariant. Any mismatch means a round was dropped or duplicated.

**2. `blocks` dict must contain all gap IDs from `rounds[]`.**
Every gap ID in the rounds array must appear in exactly one block key. Gaps in
`advisory_deferred` appear in the "DEFERRED" block key AND in `rounds[]` with their
original block number.

**3. `round` field in each round entry must match its 0-indexed position.**
Round R0 is at index 0, R1 at index 1, etc. No gaps in the sequence.

**4. `session_file` must be consistent with `round`.**
If `round: 7`, then `session_file: "SESSION-GAP-R7.md"`. These are always consistent.

**5. `one_action` is an imperative verb phrase.**
Not a description of the problem — an instruction for the session file author.
"Add 4 archetype enum values" not "Archetypes are missing".

**6. Dependencies only list direct prerequisites.**
`dependencies["E4-2"] = ["EC-1", "E4-1"]` — not the transitive closure. If E4-1
depends on EC-1, you don't list EC-1 again as a dependency of E4-2 just because
E4-1 → E4-2.

---

## ACCEPTANCE CRITERIA FOR BLOCK-PLAN.JSON

Before BLOCK-PLAN.json is considered complete:

- [ ] JSON is valid (no syntax errors, no trailing commas)
- [ ] `flowId` matches the target flow
- [ ] `total_rounds` equals `rounds[]` array length
- [ ] All gap IDs from GAP-REGISTRY.json appear in `blocks` and `rounds[]`
- [ ] Each round's `round` field matches its 0-indexed position in the array
- [ ] Each round's `session_file` matches "SESSION-GAP-R[round].md"
- [ ] `dependencies` dict contains only gaps that have actual prerequisites
- [ ] `one_action` fields are imperative verb phrases ≤70 chars
- [ ] Format matches the gap count: minimal for ≤5, full for 6+

---

## RELATIONSHIP TO ADJACENT DOCUMENTS

- **GAP-REGISTRY.json (B-30):** BLOCK-PLAN.json is derived from the registry. Every
  gap in the registry has a corresponding round entry in BLOCK-PLAN.json.

- **GAPS-MASTER-PLAN.md (B-31):** BLOCK-PLAN.json is the machine-readable version
  of the GAPS-MASTER-PLAN's round table, dependency map, and parallel groups sections.

- **SESSION-GAP-RN.md (B-34):** Each round entry in BLOCK-PLAN.json drives the
  authoring of one SESSION-GAP-RN.md. The `one_action` field is what the session
  file implements.

---

*End of GUIDE-B32 — FLOW-XX-BLOCK-PLAN.json*
*List A sources: ZIP-17 (FLOW-03/07/10/41 BLOCK-PLAN.json samples — minimal, mature, richest),*
*ZIP-12 GAP-PREP-MASTER-PLAN.md (gap-translate process reference)*
*Target B-type: B-32 — FLOW-XX-BLOCK-PLAN.json*
*Round: 42 of 72*
