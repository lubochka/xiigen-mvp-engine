# GUIDE-B15 — How to Produce `FLOW-XX-R1-STATE-INIT.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 25 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-R1-STATE-INIT.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the R1-STATE-INIT guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance to a new flow's spec,
it will produce a correct, evidence-backed `FLOW-XX-R1-STATE-INIT.md` for that flow.

---

## WHAT THIS FILE IS

`FLOW-XX-R1-STATE-INIT.md` (also named `SESSION-R1-STATE-INIT.md` in older flows) is
the **STATE.json bootstrap session** for a flow. It runs immediately after R0-PRECHECK
clears and produces a fully initialized `STATE.json` that all subsequent session rounds
will read and write to.

The file exists because STATE.json accumulates tracking data across Phase A through
Phase F. Without pre-declared keys for `taskTypeArchetypes`, `nodeCompleteness`,
`genesisScoreHistory`, `routing_decisions`, and any flow-specific tracking fields,
every Phase B write attempt will silently discard data — the write finds no target
key, the data is lost, and no error is raised. This is the same SILENT_FAILURE pattern
seen in GUIDE-B13 (SESSION-SIM-RN): no crash, just wrong results.

**This is a "consumed by Claude Code" document.** Every bash command and Node.js
script must be literal and copy-pasteable. No pseudo-code. No cross-references.

**Position in flow lifecycle:**
1. R0-PRECHECK (B-14) — infrastructure gate ← DONE BEFORE THIS
2. **R1-STATE-INIT (B-15) — STATE.json bootstrap** ← THIS FILE
3. SESSION-SIM-R0..RN (B-13) — simulation rounds ← FOLLOW AFTER

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-03 | PRIMARY + STRUCTURE | `FLOW-PREP-R0.zip` — FLOW-PREP-MASTER-PLAN.md §STATE.json initialization, MANDATORY STATE.json INIT section |
| ZIP-11 | FIXTURE | `FLOW-10 SESSION-R1-STATE-INIT.md` — early/mid variant: 4 fields, placeholder task type IDs (T-[+N]), Node.js patch script pattern |
| ZIP-11 | FIXTURE | `FLOW-13 SESSION-R1-STATE-INIT.md` — mid-period: 6 fields, 20 task types (real IDs), 2 flow-specific extras (inline_schema_status, platform_only_verification) |
| ZIP-11 | FIXTURE | `FLOW-41 FLOW-41-R1-STATE-INIT.md` — late-cycle: full STATE.json creation (not patch), rich metadata (phases, graphContributionInventory, namedChecks, knownBlockers, hardConstraints) |
| ZIP-11 | FIXTURE | `FLOW-42 FLOW-42-SESSION-R1-STATE-INIT.md` — simulation-era: taskTypeArchetypes as objects (name, phase, description, source_file, status), factories and bfa_rules inline |
| ZIP-11 | FIXTURE | `FLOW-43 FLOW-43-SESSION-R1-STATE-INIT.md` — simulation-era: full heredoc STATE.json write, artifact_range, current_stage |
| ZIP-16 | PRIMARY | Flow's business spec — drives task types (IDs, names, archetypes), artifact ranges, PLATFORM-ONLY factories, inline services |

**C30 split note:** For FLOW-35..47, primary spec comes from ZIP-09/10/13 fixtures and
project docs. Artifact IDs (T, F, CF ranges) come from CLAUDE.md canonical counter at
authoring time.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-R1-STATE-INIT.md`

Older flows (FLOW-10 through FLOW-20) use `SESSION-R1-STATE-INIT.md` (no flow prefix).
For new flows (FLOW-41+) use `FLOW-XX-R1-STATE-INIT.md`. Both are valid in List B.

**What it produces:** A single `STATE.json` file at `docs/sessions/FLOW-XX/STATE.json`
(or `FLOW-XX-STATE.json` for early flows) with all tracking fields initialized.

---

## THE THREE GENERATIONS OF THIS FILE

The file has evolved across three recognizable generations. Understanding which
generation a new flow belongs to determines which template to use.

### Generation 1 — Patch style (FLOW-10 through FLOW-20 era)
STATE.json already exists from prior work. R1 adds missing tracking fields via a
Node.js patch script. Uses placeholder T-IDs (`T-[+0]`, `T-[+1]`...) if pre-allocation
hasn't run yet.

**4 required fields:**
- `taskTypeArchetypes` — maps each task type placeholder to its archetype string
- `nodeCompleteness` — `{grade: null, score: null, outOf: null, recordedAt: null}`
- `genesisScoreHistory` — `[]`
- `routing_decisions` — `[]`

### Generation 2 — Extended patch (FLOW-13 through FLOW-20 era)
Same as Gen 1 but with 2+ flow-specific extras beyond the 4 core fields:
- `inline_schema_status` — for flows with inline event schema requirements
- `platform_only_verification` — for flows with PLATFORM-ONLY factories
- Other flow-specific tracking objects as needed

### Generation 3 — Full creation (FLOW-41+ simulation era)
STATE.json does not exist yet. R1 creates it from scratch via heredoc or Node.js write.
Contains rich metadata including: flowId, name, targetPlatform, eventModel,
artifactBoundaries, taskTypeArchetypes (as objects with name/phase/description),
factories, bfa_rules, named_checks, phases (with status/estHours), hardConstraints,
knownBlockers, testBaseline, graphContributionInventory.

---

## HOW TO DETERMINE WHICH GENERATION TO USE

| Condition | Generation |
|-----------|-----------|
| Flow has fewer than 8 task types AND pre-allocation used placeholder IDs | Gen 1 |
| Flow has 10+ task types OR has PLATFORM-ONLY factories OR inline services | Gen 2 |
| Flow is FLOW-41 or later; or is a standalone adaptation/plugin flow | Gen 3 |
| New flow spec with real T/F/CF IDs from CLAUDE.md | Gen 3 |

For any new flow produced by this library, **use Generation 3** — it is the most
complete and prevents the silent data loss that prompted Generations 1 and 2.

---

## HOW TO PRODUCE THE FILE — GENERATION 3 (canonical for new flows)

### Step 1 — Derive the file header

```markdown
# FLOW-XX-R1-STATE-INIT.md
## Flow: FLOW-XX ([Flow human name])
## Round: R1 | Action: Initialize STATE.json (taskTypeArchetypes + tracking arrays)
## Source: FLOW-XX master plan + FLOW-PREP-MASTER-PLAN §STATE.json initialization
## Self-contained: zero cross-references, all commands literal, all vars exported here
## Prerequisite: R0-PRECHECK reviewed. Open blockers noted in knownBlockers.
```

### Step 2 — Write the CONTEXT block

Export all artifact IDs that appear in the STATE.json. These come from the flow's
business spec (ZIP-16 for FLOW-01..34) or from CLAUDE.md counter at authoring time:

```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."
export STATE_FILE="$BASE_DIR/docs/sessions/FLOW-XX/STATE.json"
export FLOW_TITLE="[Flow human name]"
export ARCHETYPE="[primary archetype: ROUTING|ORCHESTRATION|ADAPTATION|...]"

# Artifact IDs — from CLAUDE.md canonical counter
export T_START="T[NNN]"           # first task type ID
export T_END="T[NNN]"             # last task type ID
export CF_START="CF-[NNN]"        # first BFA rule ID
export CF_END="CF-[NNN]"          # last BFA rule ID
export F_START="F[NNNN]"          # first factory ID
export F_END="F[NNNN]"            # last factory ID
export TEST_BASELINE="[N]"        # server jest test count before this flow
```

### Step 3 — Write STEP 1 (existence check)

```bash
echo "=== STEP 1: STATE.json existence check ==="
[ -f "$STATE_FILE" ] \
  && { echo "✅ STATE.json exists — reading current content"; cat "$STATE_FILE"; } \
  || echo "⚠️  STATE.json missing — will create in STEP 2"
```

### Step 4 — Write STEP 2 (full STATE.json creation via heredoc)

This is the core of the file. The heredoc creates STATE.json from scratch with all
required fields pre-populated from the flow's spec.

```bash
mkdir -p "$(dirname $STATE_FILE)"

cat > "$STATE_FILE" << 'STATEEOF'
{
  "flow_id": "FLOW-XX",
  "flow_title": "[Flow human name]",
  "source_plan": "[slug of master plan file, e.g. transactional-event-participation]",
  "target_platform": "[engine service | Canva Apps SDK | Miro Web SDK | etc.]",
  "archetype": "[primary archetype]",
  "created": "[YYYY-MM-DD]",
  "status": "FLOW-PREP IN PROGRESS",
  "current_stage": "FLOW-PREP",
  "current_round": "R1",

  "artifact_range": {
    "task_types": ["T[NNN]", "T[NNN+1]", ... ],
    "bfa_rules":  ["CF-[NNN]", ... ],
    "factories":  ["F[NNNN]", "F[NNNN+1]", ... ]
  },

  "taskTypeArchetypes": {
    "T[NNN]": {
      "archetype": "[ROUTING|ORCHESTRATION|DATA_PIPELINE|VALIDATION|TRANSACTION|ADAPTATION|...]",
      "name": "[ServiceName from spec]",
      "phase": "[P1|P2|etc.]",
      "description": "[one-sentence purpose from spec]",
      "source_file": "[server/src/engine/flows/{slug}/service-name.service.ts]",
      "status": "PLANNED"
    },
    "T[NNN+1]": { ... }
  },

  "factories": {
    "F[NNNN]": { "task_type": "T[NNN]", "name": "[FactoryName]", "status": "PLANNED" }
  },

  "bfa_rules": {
    "CF-[NNN]": { "name": "[BfaRuleName]", "description": "[what it enforces]" }
  },

  "phases": {
    "PHASE-0":  { "status": "NOT_STARTED", "label": "Corpus seeding + BFA contracts", "expected_tests": 0 },
    "PHASE-1A": { "status": "NOT_STARTED", "label": "T[NNN] [ServiceName]", "expected_tests": 0 },
    "PHASE-N":  { "status": "NOT_STARTED", "label": "Teaching QA (TEACH-QA-R0 Phases 1-6)", "expected_tests": 0 }
  },

  "nodeCompleteness": [],
  "genesisScoreHistory": [],
  "routing_decisions": [],

  "hardConstraints": [
    "[iron rule 1 from flow spec — what must always be true]",
    "[iron rule 2]",
    "npm run build must pass before any phase declared complete",
    "npm test must pass (zero failures) before any phase declared complete"
  ],

  "knownBlockers": {
    "GAP-INFRA-01": "[if infrastructure fixtures missing — from R0 PC-1 RED]",
    "GAP-ARCH-01":  "[if new archetype missing from enum — from R0 PC-4 RED]"
  },

  "testBaseline": {
    "serverJest": [N],
    "clientJest": [N],
    "e2ePlaywright": [N],
    "note": "Baseline before FLOW-XX implementation begins"
  }
}
STATEEOF

echo "✅ STATE.json created at $STATE_FILE"
```

**How to fill in the task type entries:**

For each task type T[NNN] in the flow, read the flow's business spec and extract:
- `archetype` — from the spec's task type definition (ROUTING, ORCHESTRATION, etc.)
- `name` — the service class name (PascalCase, matches the service file name)
- `phase` — which implementation phase it belongs to (PHASE-1A, PHASE-1B, etc.)
- `description` — one sentence from the spec describing what this service does
- `source_file` — the path where this service will live in `server/src/engine/flows/{slug}/`

For adaptation flows (FLOW-41+, CALLBACK event model), all task types typically
have archetype `ADAPTATION`. For standard XIIGen flows, archetypes come from the
spec's task type decomposition.

**Flow-specific extra fields — add when applicable:**

For flows with PLATFORM-ONLY factories (detected in R0 PC-4):
```json
"platform_only_verification": {
  "factories": {
    "F[NNNN]": null
  },
  "all_verified": false,
  "note": "[N] PLATFORM-ONLY factories — tenant cannot swap. Verify PLATFORM_ONLY scope at Phase A gate."
}
```

For flows with inline services (task types that don't own their own factory):
```json
"inline_services": {
  "T[NNN]": "inline_by_T[NNN]"
}
```

For flows with required event schemas before Phase A:
```json
"inline_schema_status": {
  "required_N": ["EventName1", "EventName2", ...],
  "written": [],
  "all_written": false,
  "note": "[N] inline schemas must be written before any contract seeding (Phase A)"
}
```

For flows with graph contribution tracking (simulation-era):
```json
"graphContributionInventory": {
  "G1_newArchetypes": [...],
  "G2_decisionObservations": [...],
  "G3_promotionCandidates": [...]
}
```

For flows with named checks as vitest assertions (adaptation flows):
```json
"namedChecks": {
  "CHECK_NAME": {
    "command": "[grep or diff command]",
    "expected": "[expected output]",
    "executionModel": "STATIC_ANALYSIS",
    "severity": "[BREAKS|SILENT_FAILURE|PARTIAL]"
  }
}
```

### Step 5 — Write STEP 3 (verification)

```bash
echo "=== STEP 3: Verify STATE.json is valid JSON and contains required fields ==="

python3 -c "
import json, sys

with open('$STATE_FILE') as f:
  state = json.load(f)

print('flow_id:', state.get('flow_id'))
print('status:', state.get('status'))

ta = state.get('taskTypeArchetypes', {})
print('taskTypeArchetypes entries:', len(ta))
for k, v in ta.items():
  arch = v.get('archetype', v) if isinstance(v, dict) else v
  print(' ', k, '→', arch)

print('nodeCompleteness:', type(state.get('nodeCompleteness')).__name__, '(expect list)')
print('genesisScoreHistory length:', len(state.get('genesisScoreHistory', [])), '(expect 0)')
print('routing_decisions length:', len(state.get('routing_decisions', [])), '(expect 0)')
print('phases count:', len(state.get('phases', {})))
print('hardConstraints count:', len(state.get('hardConstraints', [])))
print()
print('✅ STATE.json valid — all required fields present')
" || echo "❌ STATE.json parse error — fix JSON syntax"
```

### Step 6 — Write the ADDITION DEPENDENCY CHECK

This check verifies that `taskTypeArchetypes` is populated before the simulation
rounds begin — it's the field that all graph addition rounds depend on:

```bash
echo "=== STEP 4: Addition dependency check ==="
TT_COUNT=$(python3 -c "
import json
s = json.load(open('$STATE_FILE'))
print(len(s.get('taskTypeArchetypes', {})))
")

[ "$TT_COUNT" -ge 1 ] \
  && echo "✅ taskTypeArchetypes has $TT_COUNT entries — graph additions unblocked" \
  || echo "❌ FAIL: taskTypeArchetypes empty — all archetype-keyed additions will use UNKNOWN"
```

### Step 7 — Write the SESSION GATE checklist

```markdown
## SESSION GATE

```
□ docs/sessions/FLOW-XX/ directory created
□ STATE.json written to $STATE_FILE
□ Valid JSON (python3 parse succeeds)
□ taskTypeArchetypes has [N] entries (T[NNN]..T[NNN+M])
□ 3 empty arrays initialized (nodeCompleteness, genesisScoreHistory, routing_decisions)
□ phases declared (PHASE-0 through PHASE-N)
□ hardConstraints populated from flow spec
□ knownBlockers populated from R0 PC results
□ testBaseline recorded
```
```

### Step 8 — Write the ISSUE INVENTORY

```markdown
## ISSUE INVENTORY

| Issue | Status | Guard added |
|-------|--------|-------------|
| [if R0 found GAP-INFRA-01] | CARRY-FORWARD — blocks simulation graph seeding (R2) | knownBlockers.GAP-INFRA-01 |
| [if R0 found GAP-ARCH-01] | CARRY-FORWARD — blocks archetype-keyed additions | knownBlockers.GAP-ARCH-01 |
| [any flow-specific issue] | ... | ... |
```

### Step 9 — Close with ⛔ STOP

```
⛔ STOP — R1 complete. STATE.json initialized.
Report "[N] fields added: taskTypeArchetypes([N] entries), [list others]" in approval message.
Known blockers: [list from knownBlockers or "none"].
Next: R2 ([GRAPH_SEEDING or first simulation round]) — [blocked by GAP-XX / unblocked].
```

---

## UNIVERSAL CORE FIELDS (required in every STATE.json)

These 7 fields must be present in every STATE.json regardless of flow type:

| Field | Type | Initial value | Purpose |
|-------|------|--------------|---------|
| `flow_id` | string | `"FLOW-XX"` | Identity anchor |
| `status` | string | `"FLOW-PREP IN PROGRESS"` | Lifecycle state |
| `taskTypeArchetypes` | object | `{ "T[N]": {...} }` | Maps task types to archetypes — all graph additions depend on this |
| `nodeCompleteness` | array | `[]` | Accumulates NODE completeness grades from Phase A |
| `genesisScoreHistory` | array | `[]` | Accumulates Phase B generation scores per cycle |
| `routing_decisions` | array | `[]` | Records archetype routing decisions from planning layer |
| `phases` | object | `{ "PHASE-0": { "status": "NOT_STARTED" }, ... }` | Phase execution tracker |

---

## NAMING CONVENTIONS

| Flow era | File name | STATE.json path |
|----------|-----------|----------------|
| FLOW-10..FLOW-20 | `SESSION-R1-STATE-INIT.md` | `docs/sessions/FLOW-XX/FLOW-XX-STATE.json` |
| FLOW-41..FLOW-44 | `FLOW-XX-R1-STATE-INIT.md` | `docs/sessions/FLOW-XX/STATE.json` |
| New flows | `FLOW-XX-R1-STATE-INIT.md` | `docs/sessions/FLOW-XX/STATE.json` |

---

## ACCEPTANCE CRITERIA FOR R1-STATE-INIT

Before the R1-STATE-INIT is considered complete for a flow:

- [ ] File is self-contained — no cross-references, all variables defined in CONTEXT block
- [ ] All artifact IDs (T/F/CF ranges) are explicitly set in CONTEXT or in the STATE.json content
- [ ] `taskTypeArchetypes` has one entry per task type in the flow spec
- [ ] `nodeCompleteness`, `genesisScoreHistory`, `routing_decisions` are initialized as empty arrays
- [ ] `phases` covers PHASE-0 through all implementation and teaching phases
- [ ] `hardConstraints` populated from flow's iron rules
- [ ] `knownBlockers` populated from R0 PC results (empty object `{}` if none)
- [ ] `testBaseline` records the server jest count before this flow begins
- [ ] Verification step (STEP 3) confirms valid JSON parse
- [ ] Addition dependency check (STEP 4) confirms `taskTypeArchetypes` populated
- [ ] SESSION GATE checklist is present
- [ ] File closes with `⛔ STOP`

---

## FILE STRUCTURE SUMMARY

```
docs/sessions/FLOW-XX/
  FLOW-XX-R0-PRECHECK.md          ← B-14 (runs first)
  FLOW-XX-R1-STATE-INIT.md        ← B-15 (this file — runs second, creates STATE.json)
  STATE.json                      ← PRODUCED by this file
  SESSION-SIM-R0.md               ← B-13 (simulation rounds follow)
  SESSION-SIM-R1.md
  ...
```

---

*End of GUIDE-B15 — FLOW-XX-R1-STATE-INIT.md*
*List A sources: ZIP-03 (FLOW-PREP-MASTER-PLAN §STATE.json init),*
*ZIP-11 (FLOW-10/13/41/42/43 R1-STATE-INIT examples)*
*Target B-type: B-15 — FLOW-XX-R1-STATE-INIT.md*
*Round: 25 of 72*
