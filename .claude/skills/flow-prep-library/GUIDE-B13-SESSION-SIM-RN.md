# GUIDE-B13 — How to Produce `SESSION-SIM-RN` Files
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 23 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-SIM-RN file):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the SESSION-SIM-RN guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance to a new flow's spec,
it will produce a correct, evidence-backed family of `SESSION-SIM-R0`, `SESSION-SIM-R1`,
..., `SESSION-SIM-RN` files for that flow.

---

## WHAT THIS FILE IS

The `SESSION-SIM-RN` family is the **design simulation execution log** for a flow. Each
file in the family records one simulation round: a specific scenario, depth level, trace
question, step table, and gap register.

Together, the R0 through RN family captures every infrastructure gap, handler failure,
and SILENT_FAILURE encountered when simulating how a new flow's task types execute
through the XIIGen engine. Claude Code runs from this family and uses it to author the
gap analysis files (B-16 through B-22) that precede actual implementation.

**This is a "consumed by Claude Code" document family.** Every step must be literal
and self-contained — no cross-references, no undefined variables.

**File count per flow:** Varies by flow complexity. Early flows (FLOW-07, FLOW-10) have
R0–R8. Later flows (FLOW-42, FLOW-43) have R0–R19. Plan for R0 + as many Rn as needed
to cover all gap classes (Infrastructure, J-class, K-class, L-class).

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-02 | PRIMARY | `LIBRARY-3-SIMULATION-SESSIONS.md` — simulation session methodology, scenario groups (E1..E9), depth levels (L1..L4), five-value verdict vocabulary |
| ZIP-04 | PRIMARY + STRUCTURE | `SIMULATION-MASTER-PLAN.md` — full simulation round plan template (R0-R34); gap class taxonomy; verdict vocabulary |
| ZIP-04 | FIXTURE | `SESSION-SIM-R0.md` — the R0 template (infrastructure gate) as used in ZIP-04 |
| ZIP-11 | FIXTURE | `SESSION-SIM-R0-FLOW07.md`, `SESSION-SIM-R1-FLOW07.md` — earliest real examples from FLOW-07 |
| ZIP-11 | FIXTURE | `SESSION-SIM-R0-FLOW09.md` — rich FLOW-09 R0 variant with inline bash commands |
| ZIP-11 | FIXTURE | `SESSION-SIM-R0-FLOW10.md`, `SESSION-SIM-R1-FLOW10.md` — cross-flow dependency variant |
| ZIP-16 | REFERENCE | Flow's business spec — drives which task type archetypes appear in the simulation |

**C30 split note:** For FLOW-35..47, primary spec comes from ZIP-09/10/13 fixtures and
project docs (no ZIP-16 spec). For FLOW-48, primary source is ZIP-17 BATCH-10.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/SESSION-SIM-R{N}.md`

In some flows the directory has a `last-phase-testing-plan/round-outputs/` or
`last-phase-testing-plan/simulation/` subdirectory — use whatever subdirectory
structure is already established for the flow. For new flows, place directly in
`docs/sessions/FLOW-XX/`.

**File naming:** Always `SESSION-SIM-R{N}.md` where N is the zero-padded round number.
Never use flow-ID prefix in the filename (e.g., never `FLOW-09-SESSION-SIM-R0.md`).
Exception: some older FLOW-09 files use `SESSION-SIM-R0-FLOW09.md` — that is a legacy
variant and should not be used for new flows.

---

## THE SIMULATION ROUND FAMILY — OVERVIEW

Every flow produces a family of SESSION-SIM-RN files organized into three groups:

### Group 1 — Infrastructure Gate (always R0)

R0 is a **blocking pre-gate**. It verifies that the two planning-layer Elasticsearch
index fixtures exist before any simulation rounds run:

- `server/fixtures/indices/xiigen-decision-graph.json`
- `server/fixtures/indices/xiigen-planning-decisions.json`

If either is missing: **R0 = RED**. All subsequent rounds (R1..RN) are invalid until
the infrastructure gap is fixed. R0 must emit `⛔ STOP` with a clear verdict.

### Group 2 — Core Simulation (R1 through R8 typical; up to R19 for complex flows)

Each round covers one scenario at one depth level:

| Scenario | What it tests |
|----------|---------------|
| E1 | Graph edge round-trip (seed → term query → keyword mapping verification) |
| E2 | DPO triple round-trip (planning-decisions → term query) |
| E3 | Cross-index coherence (decision-graph + planning-decisions in same transaction) |
| E4 | Archetype-specific handler chain |
| E5 | Iron rule enforcement path |
| E6 | Arbiter panel execution (named checks fire, score propagates) |
| E7 | Cross-flow dependency trace |
| E8 | Tenant isolation (cross-tenant read block) |
| E9 | Infrastructure gate check (R0 only) |

Depth levels used in headers:
- L1 — existence check (does the file/index exist?)
- L2-TS — type system (are the ES field types correct?)
- L2-RT — round-trip (can we write and read back?)
- L3-HC — handler chain (does the handler sequence complete?)
- L4-SF — SILENT_FAILURE (does it look like success but produce wrong data?)

### Group 3 — Gap Resolution Verification (added after gap plan execution)

Some flows add rounds to verify that gap fixes worked. These follow the same format
as Group 2 but note in SCENARIO SETUP which gap IDs they verify.

---

## HOW TO PRODUCE EACH SESSION-SIM-RN FILE

### Step 1 — Determine round count from flow spec

Before writing any SESSION-SIM file, read:
1. The flow's business spec (ZIP-16 if FLOW-01..34) — count task types (T-range)
2. The flow's DESIGN-SIMULATION-R1.md (B-12) if it exists — count distinct handler chains

Round count heuristic:
- Flows with 1–5 task types: R0 + R1..R4 (5 total)
- Flows with 6–12 task types: R0 + R1..R8 (9 total)
- Flows with 13+ task types: R0 + R1..R12 or more (13+ total)
- Complex cross-flow flows (FLOW-41, FLOW-43): R0 + R1..R19 (20 total)

Document the planned round count in the SIMULATION-MASTER-PLAN before authoring
individual SESSION-SIM files.

### Step 2 — Author SESSION-SIM-R0 (always first)

R0 is the infrastructure gate. It is the same for every flow — only the flow ID and
the `SCENARIO SETUP` context change.

**R0 file header (literal):**

```markdown
# SESSION-SIM-R0.md
## Round: R0 | Scenario: E9 | Depth: L1
## Action: Verify xiigen-decision-graph + xiigen-planning-decisions fixture files exist for FLOW-XX
## Date: YYYY-MM-DD
## Self-contained: all commands literal, zero cross-references
```

**R0 CONTEXT section** — define all variables inline:

```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."   # project root (contains server/)
export FIXTURE_DIR="$BASE_DIR/server/fixtures/indices"
```

**R0 STEP TABLE (4 rows, fixed):**

| Step | What must happen | Handler | Input ✅/⚠️/❌ | Output expected | Actual | Gap? |
|------|-----------------|---------|---------------|----------------|--------|------|
| 1 | Fixture directory exists at `server/fixtures/indices/` | validate.handler | `$FIXTURE_DIR/` ✅/❌ | Directory present, ≥17 fixture files | Run Step 1 | see below |
| 2 | `xiigen-decision-graph.json` present in fixture dir | validate.handler | `*decision-graph*` glob ✅/❌ | File found with keyword mappings | Run Step 2 | see below |
| 3 | `xiigen-planning-decisions.json` present in fixture dir | validate.handler | `*planning-decisions*` glob ✅/❌ | File found with keyword mappings | Run Step 3 | see below |
| 4 | ES live index check (informational) | [IDatabaseService].searchDocuments | `localhost:9200` | 200 or 404 | Run Step 4 | informational |

**R0 bash commands for each step (literal — copy into file):**

```bash
# STEP 1
echo "=== STEP 1: Fixture directory contents for $FLOW_ID ==="
ls -la "$FIXTURE_DIR/" 2>/dev/null \
  && echo "✅ STEP 1: Fixture directory at $FIXTURE_DIR" \
  || echo "❌ STEP 1 FAIL: $FIXTURE_DIR not found — BLOCKING gap, STOP"
ls "$FIXTURE_DIR/"*.json 2>/dev/null || echo "(no .json files found)"

# STEP 2
echo "=== STEP 2: xiigen-decision-graph fixture ==="
GRAPH_FIX=$(find "$FIXTURE_DIR" -name "*decision-graph*" 2>/dev/null | wc -l)
if [ "$GRAPH_FIX" -gt "0" ]; then
  echo "✅ STEP 2: xiigen-decision-graph fixture found"
  cat "$FIXTURE_DIR/xiigen-decision-graph.json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
props=d.get('mappings',{}).get('properties',{})
for f in ['fromEntity','relationship','toEntity','flowId','archetype']:
  t=props.get(f,{}).get('type','MISSING')
  status='✅' if t=='keyword' else '❌'
  print(f'  {status} {f}: {t}')
"
else
  echo "❌ STEP 2: xiigen-decision-graph.json missing → GAP H-1 (BLOCKING)"
fi

# STEP 3
echo "=== STEP 3: xiigen-planning-decisions fixture ==="
PLAN_FIX=$(find "$FIXTURE_DIR" -name "*planning-decisions*" 2>/dev/null | wc -l)
if [ "$PLAN_FIX" -gt "0" ]; then
  echo "✅ STEP 3: xiigen-planning-decisions fixture found"
else
  echo "❌ STEP 3: xiigen-planning-decisions.json missing → GAP H-2 (BLOCKING)"
fi

# STEP 4 (informational only)
echo "=== STEP 4: ES live check (informational) ==="
curl -sf http://localhost:9200/ > /dev/null 2>&1 \
  && echo "✅ ES running at localhost:9200" \
  || echo "⚠️ ES not reachable at localhost:9200 (informational — simulation proceeds regardless)"
```

**R0 GAP REGISTER (if either fixture is missing):**

```
GAP ID:     H-1
NAME:       xiigen-decision-graph index fixture missing
FOUND IN:   R0 (E9) Step 2
ALSO HITS:  R1 (E1), R2 (E2), R3 (E3), all simulation rounds that write to decision-graph
ROOT CAUSE: server/fixtures/indices/xiigen-decision-graph.json was never created.
            Planning layer added after original fixture set.
FIX CLASS:  INFRASTRUCTURE
BLOCKED BY: none
UNBLOCKS:   All simulation rounds that seed or query xiigen-decision-graph

REQUIRED MAPPING:
{
  "index": "xiigen-decision-graph",
  "mappings": {
    "properties": {
      "fromEntity":           { "type": "keyword" },
      "relationship":         { "type": "keyword" },
      "toEntity":             { "type": "keyword" },
      "docType":              { "type": "keyword" },
      "flowId":               { "type": "keyword" },
      "archetype":            { "type": "keyword" },
      "taskTypePlaceholder":  { "type": "keyword" },
      "archetypeConfirmed":   { "type": "boolean" },
      "twoPhasePrivacyRole":  { "type": "keyword" },
      "confidence":           { "type": "float" },
      "observationCount":     { "type": "integer" },
      "immutable":            { "type": "boolean" },
      "source":               { "type": "keyword" },
      "reasoning":            { "type": "text" },
      "recordedAt":           { "type": "date" },
      "recordedBy":           { "type": "keyword" }
    }
  }
}

GAP ID:     H-2
NAME:       xiigen-planning-decisions index fixture missing
FOUND IN:   R0 (E9) Step 3
ROOT CAUSE: Same root cause as H-1.
FIX CLASS:  INFRASTRUCTURE

REQUIRED MAPPING:
{
  "index": "xiigen-planning-decisions",
  "mappings": {
    "properties": {
      "flowId":            { "type": "keyword" },
      "phase":             { "type": "keyword" },
      "decisionType":      { "type": "keyword" },
      "category":          { "type": "keyword" },
      "trainingCategory":  { "type": "keyword" },
      "status":            { "type": "keyword" },
      "subjectTaskType":   { "type": "keyword" },
      "archetype":         { "type": "keyword" },
      "chosen":            { "type": "object", "enabled": false },
      "rejected":          { "type": "object", "enabled": false },
      "teachingPoint":     { "type": "text" },
      "futureFlowSignal":  { "type": "text" },
      "recordedAt":        { "type": "date" },
      "recordedBy":        { "type": "keyword" }
    }
  }
}
```

**R0 VERDICT table:**

```
| Step | Result |
|------|--------|
| STEP 1 — Fixture directory    | ✅ GREEN or ❌ RED (see actual) |
| STEP 2 — decision-graph       | ✅ GREEN or ❌ RED → GAP H-1 |
| STEP 3 — planning-decisions   | ✅ GREEN or ❌ RED → GAP H-2 |

R0 result: GREEN (proceed to R1) or RED BLOCKING (fix H-1/H-2 first)
```

Close with: `⛔ STOP`

---

### Step 3 — Author SESSION-SIM-R1 (graph edge round-trip)

R1 tests the core term-query failure (J1-1 class gap). It is the same for every flow
except the flow-specific archetype, task type, and edge details.

**R1 file header:**

```markdown
# SESSION-SIM-R1.md
## Round: R1 | Scenario: E1 | Depth: L2-TS
## Action: Graph edge round-trip for FLOW-XX — seed [ARCHETYPE] edge, term query on flowId keyword
## Date: YYYY-MM-DD
## Self-contained: all handler names literal, all verdicts from five-value vocabulary
```

**R1 SCENARIO SETUP** — adapt per flow:

```markdown
Precondition: H-1 resolved (fixture file `server/fixtures/indices/xiigen-decision-graph.json`
now exists with correct `keyword` mapping fields).

Trace question: Does seeding a `[ARCHETYPE_FROM_SPEC]` edge with `flowId: "FLOW-XX"` and
then issuing a term query `{ "term": { "flowId": "FLOW-XX" } }` return the seeded document?

FLOW-XX specific concern: [describe the key cross-flow or handler chain concern from the spec]
```

**R1 STEP TABLE (5 rows, fixed pattern):**

| Step | What must happen | Handler | Input | Output expected | Actual | Gap? |
|------|-----------------|---------|-------|-----------------|--------|------|
| 1 | Bootstrapper reads xiigen-decision-graph.json | validate.handler (bootstrap) | fixture file ✅ | ensureIndex() applies keyword mapping | SILENT_FAILURE — ensureIndex not on IDatabaseService | J1-1 |
| 2 | Index created with keyword mappings | [IDatabaseService].ensureIndex | keyword mapping object | flowId: keyword, archetype: keyword | BREAKS — index not created; first write auto-maps as text | J1-1 |
| 3 | Seed [ARCHETYPE] edge for FLOW-XX | [IDatabaseService].storeDocument | {flowId, archetype, relationship, fromEntity, toEntity} | Stored in keyword-typed index | PARTIAL — stored; index auto-created as text | J1-1 |
| 4 | Term query returns seeded edge | [IDatabaseService].searchDocuments | {term: {flowId: "FLOW-XX"}} | hits.total.value: ≥1 | BREAKS — text field; ES tokenizes "FLOW-XX" → 0 hits | J1-1 |
| 5 | Verify field type in mapping | validate.handler | GET xiigen-decision-graph/_mapping | flowId.type: "keyword" | BREAKS — type is "text" | J1-1 |

**The J1-1 gap** (present for every flow until ensureIndex is added to IDatabaseService):

```
GAP ID:     J1-1
NAME:       ensureIndex method absent from IDatabaseService + ElasticsearchProvider
ROOT CAUSE: IDatabaseService interface does not declare ensureIndex. Engine bootstrapper
            has a runtime cast to check for its existence, but it is never found.
            Fix requires: (1) add ensureIndex(indexName, mappings) to IDatabaseService;
            (2) implement ensureIndex in ElasticsearchProvider to call PUT /{index}
            with the provided mappings if the index does not yet exist.
FIX CLASS:  INFRASTRUCTURE
AFFECTS:    Every flow that seeds planning-layer indices (xiigen-decision-graph,
            xiigen-planning-decisions)
```

Close with: `⛔ STOP`

---

### Step 4 — Author R2 through RN (flow-specific scenarios)

From R2 onward, scenarios are **flow-specific** — derived from the flow's design
simulation (B-12) and the task type archetypes in the flow spec.

**For each additional round, the author must:**

1. **Pick a scenario** from the E2..E8 table above that applies to this flow.
   Example: if the flow has named checks, include an E6 (arbiter panel) round.
   If the flow has cross-flow dependency, include an E7 round.

2. **Write a concrete trace question** based on the actual task types (T-numbers)
   and handler names from the flow spec or design simulation.

3. **Trace all 5 verdict options** in the STEP TABLE using the five-value vocabulary:
   - `WORKS` — handler executes correctly, output matches expected
   - `BREAKS` — handler throws or returns wrong type; execution stops
   - `SILENT_FAILURE` — handler succeeds but output is wrong; no error raised
   - `NOT_RUN` — blocked by a prior step failure
   - `PARTIAL` — handler partially succeeds; some output correct, some wrong

4. **Add a GAP entry** for every step with a non-WORKS verdict. Gap IDs:
   - H-class: infrastructure (missing fixtures, wrong paths)
   - J-class: interface/implementation missing (method absent, type mismatch)
   - K-class: logic error (wrong output, wrong calculation)
   - L-class: cross-flow dependency (race condition, shared index collision)

**Template for R2+ header:**

```markdown
# SESSION-SIM-R{N}.md
## Round: R{N} | Scenario: E{X} | Depth: L{Y}[-{qualifier}]
## Action: [specific trace question for this round]
## Date: YYYY-MM-DD
## Self-contained: all handler names literal, all verdicts from five-value vocabulary
```

**Do not** reference other simulation rounds in STEP TABLE text — every
round must be self-contained.

---

## COMMON GAPS BY FLOW CATEGORY

These gaps appear repeatedly across flows. Reference them when appropriate
rather than re-describing the root cause from scratch.

| Gap ID | Name | Flows where confirmed | Root cause |
|--------|------|-----------------------|-----------|
| H-1 | xiigen-decision-graph fixture missing | FLOW-07, 09, 10, 13, 14, 15, 16, 17, 18 | Not created when planning layer was added |
| H-2 | xiigen-planning-decisions fixture missing | Same as H-1 | Same root cause |
| J1-1 | ensureIndex absent from IDatabaseService | All flows (universal) | Interface predates planning layer |
| J2-1 | text field term query (flowId.keyword not used) | All flows where J1-1 present | Session files use flowId not flowId.keyword |

Once H-1, H-2, and J1-1 are fixed globally (in the gap plan), later flows can note
"H-1 and H-2 resolved by FLOW-07 gap plan — confirmed by prior simulation" in R0
and skip the re-derivation in R1 (see FLOW-10 R0 example: states the prior fix was
applied, then verifies it is in place before proceeding).

---

## ISSUE INVENTORY TABLE (required in every SESSION-SIM-RN)

Every file must close with an ISSUE INVENTORY:

```markdown
## ISSUE INVENTORY

| Issue | Gap ID | Severity | Blocks | Status |
|-------|--------|----------|--------|--------|
| [gap name] | H-1 / J1-1 / etc. | BLOCKING / HIGH / MEDIUM | R1..RN / Phase B / etc. | ❌ OPEN |
```

Severity definitions:
- `BLOCKING` — all subsequent simulation rounds invalid until fixed
- `HIGH` — the affected rounds produce wrong verdicts but can still run
- `MEDIUM` — informational; does not block rounds
- `OPEN` — not yet resolved
- `FIXED` — resolved (note the gap plan round that fixed it)

---

## SIMULATION-MASTER-PLAN.md (companion file)

Before authoring the SESSION-SIM-RN family, produce a `SIMULATION-MASTER-PLAN.md`
that lists all planned rounds with their scenarios. This is B-type B-14 / B-15
territory (PRECHECK and STATE-INIT precede simulation), but the simulation master
plan is the roadmap for the SESSION-SIM family.

Minimal structure:

```markdown
# SIMULATION-MASTER-PLAN — FLOW-XX
## Total rounds: R0 + R1..R{N}
## Source: FLOW-XX-DESIGN-SIMULATION-R1.md (task types T{start}..T{end})

| Round | Scenario | Depth | Trace question |
|-------|----------|-------|----------------|
| R0    | E9       | L1    | Infrastructure gate — fixture files present? |
| R1    | E1       | L2-TS | Graph edge round-trip for [primary archetype] |
| R2    | E2       | L2-RT | DPO triple round-trip — term query flowId |
| ...   | ...      | ...   | ...                                          |
| RN    | E{X}     | L{Y}  | [last scenario for this flow]                |
```

---

## ACCEPTANCE CRITERIA FOR THE SESSION-SIM FAMILY

Before the SESSION-SIM family is considered complete for a flow:

- [ ] R0 is present and covers both fixture checks (E9/L1)
- [ ] At least one E1 round (graph edge term query) is present
- [ ] At least one E2 round (DPO triple term query) is present
- [ ] Every task type archetype in the flow spec has ≥1 scenario round
- [ ] Every gap found has a GAP REGISTER entry with ID, name, root cause, fix class
- [ ] Every file closes with `⛔ STOP`
- [ ] No file references another file via relative path or cross-reference
- [ ] The SIMULATION-MASTER-PLAN.md exists and lists all rounds
- [ ] ISSUE INVENTORY in each file matches the gap IDs in the GAP REGISTER

---

## FILE STRUCTURE SUMMARY

```
docs/sessions/FLOW-XX/
  SESSION-SIM-R0.md          ← Infrastructure gate (E9/L1) — always first
  SESSION-SIM-R1.md          ← Graph edge round-trip (E1/L2-TS) — always second
  SESSION-SIM-R2.md          ← DPO triple round-trip (E2/L2-RT)
  SESSION-SIM-R3.md          ← Cross-index coherence (E3)
  SESSION-SIM-R4.md          ← [flow-specific archetype trace]
  ...
  SESSION-SIM-R{N}.md        ← Last round for this flow
```

For flows with a `last-phase-testing-plan/round-outputs/` subdirectory, place files
in that subdirectory instead. Do not create a new subdirectory structure for new flows.

---

*End of GUIDE-B13 — SESSION-SIM-RN Family*
*List A sources: ZIP-02 (LIBRARY-3), ZIP-04 (SIMULATION-R0), ZIP-11 (R0/R1 examples FLOW-07/09/10)*
*Target B-type: B-13 — SESSION-SIM-RN family*
*Round: 23 of 72*
