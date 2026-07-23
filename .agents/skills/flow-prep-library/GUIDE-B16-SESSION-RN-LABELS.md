# GUIDE-B16 — How to Produce `SESSION-RN-[LABEL]` Files
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 26 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-RN-[LABEL] file):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the SESSION-RN-[LABEL] guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a new
flow's spec, it will produce the complete family of labeled session files
(R2-GRAPH-SEED through R19-WAVE2-GATE) that drive a flow through its planning layer.

---

## WHAT THIS FILE IS

The `SESSION-RN-[LABEL]` family is the **planning layer execution chain** — the sequence
of per-round session files that take a flow from STATE.json initialization (B-15) through
graph seeding, NODE grading, archetype registration, routing decisions, genesis scoring,
and finally the Wave 2 readiness gate that clears the flow for implementation.

Each file handles exactly one labeled action. The action label names the file and declares
what happens inside: `R2-GRAPH-SEED` seeds graph edges, `R8-ROUTING-DECISION` records
routing decisions, `R19-WAVE2-GATE` runs the pre-Wave-2 readiness checks.

**This is a "consumed by Claude Code" document family.** Every command must be literal
and copy-pasteable. No pseudo-code. No external references. All variables exported in CONTEXT.

**Relationship to B-13 (SESSION-SIM-RN):**
- SESSION-SIM-RN (B-13): the design *simulation* — traces hypothetical handler execution
  to find infrastructure gaps before writing code.
- SESSION-RN-[LABEL] (B-16): the *planning layer* — seeds actual Elasticsearch data,
  records STATE.json tracking fields, registers archetypes, produces learning handoffs.
  These run alongside or after simulation, as implementation-readiness steps.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-03 | PRIMARY | `FLOW-PREP-R0.zip` — FLOW-PREP-MASTER-PLAN.md §R2-R19 round plan, label taxonomy, Addition numbering |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R2-GRAPH-SEED.md` — canonical graph seeding with 5 edges + 4 planning decisions |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R3-NODE-GRADE.md` — 4-signal NODE grade formula (G1-G4), threshold 0.75 |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R5-CLOUDEVENT.md` — CloudEvent name cross-check (adapted: CALLBACK for non-CloudEvent flows) |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R7/FLOW-43 SESSION-R7-ARCHETYPE-REG.md` — 4-point archetype registration (L1-L4) |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R8-ROUTING-DECISION.md` — ROUTING_DECISION schema, score-bracket to action mapping |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R10-GENESIS-SCORE.md` — genesis score record per cycle |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R17-HANDOFF.md` — LEARNING_HANDOFF.json with planningLayerLearning section |
| ZIP-11 | FIXTURE | `FLOW-42 SESSION-R19-WAVE2-GATE.md` — 4-check soft gate before Wave 2 |
| ZIP-11 | FIXTURE | `FLOW-43 SESSION-R16-CROSS-FLOW-DEP.md` — cross-flow dependency tracing |
| ZIP-16 | PRIMARY | Flow's business spec — drives task types, archetypes, cross-flow dependencies, hard constraints |
| ZIP-01 | REFERENCE | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` — session file self-containment rules (SK-443) |

**C30 split:** For FLOW-35..47, primary spec from ZIP-09/10/13 fixtures. Artifact IDs from CLAUDE.md.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-SESSION-R{N}-{LABEL}.md`

Older flows (FLOW-10..FLOW-20) may use `SESSION-R{N}-{LABEL}.md` without flow prefix.
For new flows (FLOW-41+), use the full `FLOW-XX-SESSION-R{N}-{LABEL}.md` convention.

**File count per flow:** Typically R2 through R19 = 18 files. Simpler flows may stop at R8.
More complex flows (20+ task types, cross-flow dependencies) use the full R2-R19 set.

---

## THE COMPLETE LABEL VOCABULARY (R2 through R19)

Every flow uses a subset of this sequence. The labels are fixed — a file with label
`GRAPH-SEED` always seeds graph edges; a file with label `WAVE2-GATE` always runs the
Wave 2 readiness check. Never invent new labels; use the vocabulary below.

| Round | Label | What it does | Required for |
|-------|-------|-------------|-------------|
| R2 | GRAPH-SEED | Seeds archetype→task-type edges + planning decisions to Elasticsearch | All flows |
| R3 | NODE-GRADE | Computes 4-signal completeness grade per task type | All flows |
| R4 | INFRA-GATE | Verifies infrastructure requirements for this flow's archetypes | Flows with new archetypes |
| R5 | CLOUDEVENT | Cross-checks CloudEvent type name consistency (or CALLBACK confirmation) | All flows |
| R6 | NAMED-CHECK-REG | Registers new NAMED_CHECK_* identifiers in validate.handler.ts | Flows with new named checks |
| R7 | ARCHETYPE-REG | 4-point archetype registration (L1: enum, L2: bootstrap, L3: tierMap, L4: topology wiring) | Flows with new archetypes |
| R8 | ROUTING-DECISION | Records CYCLE_WITH_PATCH / STOP_STRUCTURAL / CYCLE_ONLY decision per task type | All flows |
| R9 | NAMED-CHECK-FIRE | Verifies named checks fire at expected severity in validate.handler.ts | Flows with named checks |
| R10 | GENESIS-SCORE | Records initial genesis score + accepted round + winning model per cycle | All flows |
| R11 | CALIBRATION | DPO calibration triple: confirms cycle delta > 0.15 between rounds | Flows with score gaps |
| R12 | EDGE-UPDATE | Updates graph edges with post-simulation confidence values | All flows after simulation |
| R13 | ARBITER-PROMOTE | Promotes OPTIONAL arbiters to REQUIRED based on observed failures | Flows with optional arbiters |
| R14 | GENESIS-PATCH | Records genesis prompt patches applied after arbiter challenges | Flows that needed patching |
| R15 | NODE-CORR | Applies NODE correlation data — links related task types across flows | All flows |
| R16 | CROSS-FLOW-DEP | Traces and records cross-flow dependencies (consumes events from other flows) | Flows with cross-flow events |
| R17 | HANDOFF | Produces LEARNING_HANDOFF.json with all planning layer learning signals | All flows |
| R18 | VALIDATE | Final validation: checks all planning layer fields in STATE.json are populated | All flows |
| R19 | WAVE2-GATE | Soft gate: 4 readiness checks before Wave 2 (GAP-TRANSLATE) begins | All flows |

**Minimum required rounds:** R2, R3, R8, R10, R17, R18, R19 (7 files for any flow).
**Additional rounds** are included as needed based on what the flow's spec requires.

---

## UNIVERSAL FILE STRUCTURE

Every SESSION-RN-[LABEL] file has the same skeleton:

```
1. File header (7 lines)
2. CONTEXT block (export variables — flow ID, STATE file, ES host, label-specific vars)
3. WHAT THIS ROUND DOES (2-4 sentences — inline, no cross-references)
4. STEP 1..N (numbered steps with literal bash/Node commands)
5. ISSUE INVENTORY
6. ⛔ STOP
```

**Self-containment rule (SK-443):** Every file must define every variable it uses.
No line may reference another session file. All constants must be set in CONTEXT.

---

## HOW TO PRODUCE EACH LABELED SESSION FILE

### R2 — GRAPH-SEED

**Purpose:** Seeds the flow's archetype-to-task-type graph edges and planning phase
decisions into Elasticsearch. Enables the planning layer to understand this flow's
structure when other flows query the graph.

**Header:**
```markdown
# FLOW-XX-SESSION-R2-GRAPH-SEED.md
## Flow: FLOW-XX ([Flow name])
## Round: R2 | Action: Produce + execute GRAPH_SEEDING_PLAN curl commands
## Self-contained: zero cross-references, all commands literal
```

**CONTEXT block:**
```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."
export ES_HOST="http://localhost:9200"
export GRAPH_INDEX="xiigen-decision-graph"
export PLAN_INDEX="xiigen-planning-decisions"
export ARCHETYPE="[primary archetype from spec]"
```

**What to seed:**

*From the flow's task type list (ZIP-16 spec):*
For each task type T[NNN], produce one `HAS_TASK_TYPE` edge:
```json
{
  "fromEntity": "ARCHETYPE:[ARCHETYPE_NAME]",
  "relationship": "HAS_TASK_TYPE",
  "toEntity": "TASK_TYPE:T[NNN]",
  "confidence": 0.85,
  "flowId": "FLOW-XX",
  "phase": "[P1|P2|etc.]",
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

*For each BFA rule (CF-NNN) that governs a task type, produce one `GOVERNS` edge:*
```json
{
  "fromEntity": "BFA_RULE:CF-[NNN]",
  "relationship": "GOVERNS",
  "toEntity": "TASK_TYPE:T[NNN]",
  "confidence": 1.0,
  "rule": "[rule description from spec]",
  "flowId": "FLOW-XX",
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

*For each implementation phase, produce one planning decision record:*
```json
{
  "flowId": "FLOW-XX",
  "phase": "[P1|P2|etc.]",
  "phaseTitle": "[phase description]",
  "taskTypes": ["T[NNN]", "T[NNN+1]"],
  "archetype": "[ARCHETYPE]",
  "estimatedHours": [N],
  "keyDecision": "[primary design decision from spec]",
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

**Verification:** After seeding, run a count check:
```bash
SEEDED=$(curl -s "$ES_HOST/$GRAPH_INDEX/_count?q=flowId:FLOW-XX" | ...)
PLANNED=$(curl -s "$ES_HOST/$PLAN_INDEX/_count?q=flowId:FLOW-XX" | ...)
[ "$SEEDED" -ge [N_expected] ] && [ "$PLANNED" -ge [M_expected] ] && echo "GREEN" || echo "RED"
```

**STATE.json update:** Add `graph_seeding: { status: "COMPLETE", graph_edges: N, planning_decisions: M }`.

---

### R3 — NODE-GRADE

**Purpose:** Computes a 4-signal completeness grade for each task type and writes it
to STATE.json. Grades that fall below 0.75 block Phase B generation.

**4-signal formula (all signals from STATE.json `taskTypeArchetypes` entries):**
- G1: Has `archetype` field → 1.0; archetype is fallback → 0.5
- G2: Has `source_file` path → 1.0; missing → 0.0
- G3: Description word count ≥ 10 → 1.0; 5–9 words → 0.5; < 5 → 0.0
- G4: Has matching factory in STATE.json `factories` → 1.0; missing → 0.0
- GRADE = (G1 + G2 + G3 + G4) / 4, rounded to 2 decimals

**Passing threshold:** ≥ 0.75 per task type.

**Node.js implementation:** Read STATE.json, compute grades for all entries in
`taskTypeArchetypes`, write `node_grades` back to STATE.json, also seed grade edges
to `xiigen-decision-graph` (`HAS_COMPLETENESS_GRADE` relationship, confidence = grade).

**Gate:** All task types GREEN (≥ 0.75). RED = investigate which signal is missing.

---

### R4 — INFRA-GATE

**Purpose:** Verifies infrastructure requirements specific to this flow's archetypes.
Runs the same 4-point archetype registration check as PC-4 in R0-PRECHECK, but as a
focused verification round after STATE.json is populated.

Only needed when the flow introduces a new archetype not yet in the engine's enum.
If all archetypes are existing (ROUTING, ORCHESTRATION, etc.), skip R4 and go to R5.

**Gate conditions:** If PC-4 RED findings from R0 exist in STATE.json `knownBlockers`,
this round verifies whether they have been resolved.

---

### R5 — CLOUDEVENT

**Purpose:** Cross-checks CloudEvent type names used in the flow's contracts against
names emitted by upstream flows.

**Standard variant (flows with CloudEvents):**
```bash
echo "PC-3: Verify CloudEvent names in FLOW-XX contracts"
grep -rn "type:" "$BASE_DIR/server/src/engine-contracts/" --include="*.ts" \
  | grep -i "event\|sent\|created\|completed" | head -20
echo "Compare each name against upstream emits: any K2 mismatch?"
```

**CALLBACK variant (adaptation flows: FLOW-41+):**
```bash
echo "PC-3: FLOW-XX uses CALLBACK event model — no CloudEvents"
echo "Event model: CALLBACK"
echo "Verify: SDK method names used in session files match API documentation"
echo "GREEN if EVENT_MODEL=CALLBACK"
```

Determine the variant from STATE.json `eventModel` field (set in R1-STATE-INIT):
`"eventModel": "CALLBACK"` → CALLBACK variant; absent or `"CLOUDEVENTS"` → standard.

---

### R6 — NAMED-CHECK-REG

**Purpose:** Registers new `NAMED_CHECK_*` identifiers exported from engine contracts
into `validate.handler.ts`. Required only when the flow defines new named checks.

Only needed when R0 PC-5 found unregistered named checks or when the flow spec
defines new named checks. Skip if no new named checks.

```bash
EXPORTED=$(grep -roh "NAMED_CHECK_[A-Z_]*" \
  "$BASE_DIR/server/src/engine-contracts/" --include="*.ts" | sort -u)
REGISTERED=$(grep -oh "NAMED_CHECK_[A-Z_]*" \
  "$BASE_DIR/server/src/fabrics/graph/planning/validate.handler.ts" | sort -u)
MISSING=$(comm -23 <(echo "$EXPORTED" | sort) <(echo "$REGISTERED" | sort))
[ -z "$MISSING" ] && echo "GREEN" || echo "RED — add to validate.handler.ts: $MISSING"
```

---

### R7 — ARCHETYPE-REG

**Purpose:** Full 4-point verification that a new archetype is properly registered.
Only needed for flows introducing a new archetype (ADAPTATION, INGESTOR, etc.).

**4 registration points:**
- L1: `contract-archetype.enum.ts` — archetype string in enum
- L2: `engine-contracts.bootstrap.ts` — archetype in ENGINE_CONTRACTS bootstrap array
- L3: `feedback.handler.ts` — archetype in `resolveCurriculumTier` tierMap
- L4: `topology/` directory — archetype wired in topology files

For each point, run a grep to check presence. Log GREEN/RED per point.
If any RED: document the fix in ISSUE INVENTORY (gap class L1/L2/L3/L4 per point).
Update STATE.json `knownBlockers` with RED findings.

Skip entire round if flow has no new archetypes.

---

### R8 — ROUTING-DECISION

**Purpose:** Records which execution path was chosen for each task type's cycle
(CYCLE_WITH_PATCH, STOP_STRUCTURAL, or CYCLE_ONLY) and at what confidence.

**Score brackets (from FLOW-PREP-MASTER-PLAN routing thresholds):**
- Score < 0.50: `STOP_STRUCTURAL` — structural gap must be fixed before cycling
- Score 0.50–0.74: `CYCLE_WITH_PATCH` — cycle but patch genesis prompt before next
- Score ≥ 0.75: `CYCLE_ONLY` — clean cycle, no patch needed

**Schema for each ROUTING_DECISION record:**
```json
{
  "cycleId": "FLOW-XX-C1-T[NNN]",
  "taskType": "T[NNN]",
  "taskName": "[name from taskTypeArchetypes]",
  "archetype": "[archetype]",
  "score": [0.0–1.0],
  "action": "CYCLE_WITH_PATCH|STOP_STRUCTURAL|CYCLE_ONLY",
  "reason": "[one sentence: why this action from the score]",
  "decidingEdge": {
    "fromEntity": "SCORE_BRACKET:[bracket]",
    "relationship": "TRIGGERS_ACTION",
    "toEntity": "[action]",
    "confidence": [score]
  },
  "phase": "[P1|P2|etc.]",
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

Scores are **estimates** at R8 authoring time — the flow has not yet run genesis cycles.
Use scores from the design simulation (B-12) if available; otherwise use archetype-class
defaults (ADAPTATION: 0.75–0.85, ORCHESTRATION: 0.65–0.80, ROUTING: 0.80–0.90).

Write all records to `STATE.json routing_decisions` array. Verify with count check.

---

### R9 — NAMED-CHECK-FIRE

**Purpose:** Verifies that newly registered named checks actually fire at the correct
severity in validate.handler.ts. Skip if flow has no named checks.

For each `NAMED_CHECK_*` defined in the flow's contracts:
```bash
# Confirm the check is registered and returns a non-null result
grep -n "NAMED_CHECK_[A-Z_]*" "$BASE_DIR/server/src/fabrics/graph/planning/validate.handler.ts" \
  | grep "[flow's check name]"
```

Confirm severity matches what the flow spec declares (BREAKS vs SILENT_FAILURE vs PARTIAL).

---

### R10 — GENESIS-SCORE

**Purpose:** Records the genesis score history — initial score, accepted-at round,
winning model, and whether a patch was applied — for each cycle.

**Schema per cycle:**
```json
{
  "cycleId": "FLOW-XX-GENESIS-T[NNN]",
  "taskType": "T[NNN]",
  "taskName": "[name]",
  "genesisVersion": "v1.0",
  "round1Score": [estimated 0.0–1.0],
  "acceptedAtRound": [N],
  "winningModel": "anthropic/claude-sonnet",
  "convergencePattern": "[describes how the cycle converged]",
  "patchApplied": [true|false],
  "patchDescription": "[what was patched, or null]",
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

For R10 at authoring time, `round1Score` and `acceptedAtRound` are estimates based
on routing decisions from R8. `winningModel` defaults to `anthropic/claude-sonnet`.
These values are updated in R14 (GENESIS-PATCH) after actual cycles run.

Write all records to `STATE.json genesis_scores` array.

---

### R11 — CALIBRATION

**Purpose:** Records DPO calibration triple for task types where the cycle delta
between round 1 and accepted round exceeds 0.15. Skip if all cycles accepted on round 1.

Required fields: `round1Score`, `acceptedScore`, `delta`, `calibrationAction`.
Calibration triple is stored in STATE.json `calibration_triples`.

---

### R12 — EDGE-UPDATE

**Purpose:** Updates graph edge confidence values with post-simulation findings.
After simulation rounds (B-13) run and find actual gaps, the confidence values seeded
in R2 may need updating.

```bash
# Update confidence for edges where simulation found gaps
curl -s -X POST "$ES_HOST/$GRAPH_INDEX/_update/FLOW-XX-ARCH-T[NNN]" \
  -H "Content-Type: application/json" \
  -d '{"doc": {"confidence": [updated_value], "updated_by": "FLOW-XX-R12", "reason": "[gap found]"}}'
```

If no simulation gaps found: write `edge_updates: []` to STATE.json and note no updates needed.

---

### R13 — ARBITER-PROMOTE

**Purpose:** Promotes `OPTIONAL` arbiters to `REQUIRED` status if simulation or
genesis cycles observed failures that the arbiter was designed to catch.

For each arbiter in the flow's `graphContributionInventory.G3_promotionCandidates`:
- Check if the promotion trigger condition occurred during simulation rounds
- If yes: update the arbiter's relationship type to `REQUIRES_MINIMUM_ARBITER`
- Record the promotion in STATE.json `arbiter_promotions` array

---

### R14 — GENESIS-PATCH

**Purpose:** Records actual genesis prompt patches applied during Phase B cycles.
Updates the R10 estimates with real values after cycles run.

For each cycle where a patch was applied:
```json
{
  "cycleId": "FLOW-XX-GENESIS-T[NNN]",
  "taskType": "T[NNN]",
  "patchRound": [N],
  "patchDescription": "[what changed in the genesis prompt]",
  "scoreBefore": [pre-patch score],
  "scoreAfter": [post-patch score],
  "delta": [scoreAfter - scoreBefore],
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

If no patches were applied: write `genesis_patches: []` to STATE.json and note clean generation.

---

### R15 — NODE-CORR

**Purpose:** Records NODE correlation data — relationships between this flow's task
types and related task types in other flows.

For each task type in this flow, check if it shares:
- Same archetype as task types in other flows → `CORRELATED_ARCHETYPE` edge
- Same event consumer/producer relationship → `CORRELATED_EVENT` edge
- Same factory interface → `CORRELATED_FACTORY` edge

Seed correlation edges to `xiigen-decision-graph`. Store count in STATE.json `node_correlations`.

If this is the first flow for this archetype (e.g., first ADAPTATION flow), there
are no correlations yet — write `node_correlations: []` and note "first occurrence".

---

### R16 — CROSS-FLOW-DEP

**Purpose:** Traces and records cross-flow event dependencies. Only needed for flows
that `consumesEvent` from another flow's `emitsEvent`.

From the flow's spec (ZIP-16), extract every `consumesEvent` entry. For each:
```bash
# Verify the upstream event exists in xiigen-engine-contracts
grep -rn "\"[EventName]\"" "$BASE_DIR/server/src/engine-contracts/" --include="*.ts" | head -5
# Expected: upstream flow emits this exact event name
```

Seed cross-flow dependency edge:
```json
{
  "fromEntity": "FLOW:FLOW-XX",
  "relationship": "CONSUMES_EVENT_FROM",
  "toEntity": "FLOW:[UPSTREAM_FLOW]",
  "eventName": "[exact event name]",
  "flowId": "FLOW-XX",
  "confidence": 1.0,
  "timestamp": "[YYYY-MM-DDT00:00:00Z]"
}
```

Store in STATE.json `cross_flow_dependencies`. If no cross-flow events: write `[]`.

---

### R17 — HANDOFF

**Purpose:** Produces `FLOW-XX-LEARNING-HANDOFF.json` — a summary of all planning
layer learning signals from R2-R16. This file is what the engine reads to improve
planning for future flows of the same archetype.

**Required sections:**
```json
{
  "flowId": "FLOW-XX",
  "flowTitle": "[name]",
  "archetype": "[primary archetype]",
  "generatedAt": "[timestamp]",
  "planningLayerLearning": {
    "[archetypePatterns]": {
      "summary": "[1-2 sentences on what was learned about this archetype]",
      "genesisOutcome": {
        "avgRound1Score": [avg],
        "avgAcceptedRound": [avg],
        "allAcceptedWithin3Rounds": [bool],
        "patchesRequired": [N],
        "patchesEffective": [N]
      },
      "keyDecisions": [ { "decision": "...", "outcome": "..." } ],
      "futureFlowSignals": [ "...", "..." ]
    },
    "openGaps": [
      { "gapId": "[H-1|GAP-ARCH-01|etc.]", "severity": "BLOCKING|HIGH|MEDIUM", "fixBefore": "Wave2|Phase-B|etc." }
    ]
  }
}
```

Read all accumulated STATE.json fields (genesis_scores, routing_decisions,
calibration_triples, arbiter_promotions, edge_updates, node_correlations,
cross_flow_dependencies) and summarize them in this file.

Write file to `docs/sessions/FLOW-XX/FLOW-XX-LEARNING-HANDOFF.json`.

---

### R18 — VALIDATE

**Purpose:** Final validation that all planning layer fields in STATE.json are
populated. Runs before the Wave 2 gate.

```bash
python3 -c "
import json
s = json.load(open('docs/sessions/FLOW-XX/STATE.json'))
checks = {
  'taskTypeArchetypes': lambda v: len(v) >= 1,
  'node_grades': lambda v: len(v) >= 1,
  'genesis_scores': lambda v: len(v) >= 1,
  'routing_decisions': lambda v: len(v) >= 1,
}
failed = []
for field, check in checks.items():
  val = s.get(field, [] if 'list' not in str(type(s.get(field, []))) else {})
  ok = check(val) if val else False
  print(('GREEN' if ok else 'RED') + ' ' + field)
  if not ok: failed.append(field)
print('failures === ' + str(len(failed)))
"
```

**Gate:** failures === 0

---

### R19 — WAVE2-GATE

**Purpose:** Soft readiness gate before Wave 2 (GAP-TRANSLATE execution) begins.
4 checks, all WARN-not-STOP if failing.

**Check W2-1:** Count of SESSION-RN files: `ls docs/sessions/FLOW-XX/FLOW-XX-SESSION-R*.md | wc -l`
Expected: ≥ 7 (minimum: R0 through R8 plus R17-R19).

**Check W2-2:** ENGINE-GAP-LIST.md exists: `ls docs/sessions/FLOW-XX/round-outputs/FLOW-XX-ENGINE-GAP-LIST.md`
Expected: file present (produced by GAP-PREP stage).

**Check W2-3:** Blocking gaps acknowledged in LEARNING-HANDOFF.json:
Read `planningLayerLearning.openGaps` array, count severity=BLOCKING entries.
WARN if any BLOCKING gaps unresolved (not STOP — Wave 2 can proceed with documented blockers).

**Check W2-4:** Simulation pre-gate exists: `ls docs/sessions/FLOW-XX/SESSION-SIM-R0.md`
Expected: file present (produced by SIMULATION stage, B-13).

**Gate type: SOFT** — all failures produce WARN not STOP. Wave 2 may begin with
documented warnings. Update STATE.json `wave2_gate: { passed: bool, warnings: [...] }`.

---

## AUTHORING ORDER

For a new flow, produce SESSION-RN-[LABEL] files in this order:

```
R2-GRAPH-SEED        (always first — seeds foundation)
R3-NODE-GRADE        (always second — grades before proceeding)
R5-CLOUDEVENT        (third — event name verification)
R4-INFRA-GATE        (if new archetypes — before R7)
R6-NAMED-CHECK-REG   (if new named checks)
R7-ARCHETYPE-REG     (if new archetypes — after R4)
R8-ROUTING-DECISION  (after grades and archetype checks)
R9-NAMED-CHECK-FIRE  (if named checks)
R10-GENESIS-SCORE    (after routing decisions)
R11-CALIBRATION      (if score gap > 0.15 between rounds)
R12-EDGE-UPDATE      (after simulation rounds run)
R13-ARBITER-PROMOTE  (if optional arbiters need promotion)
R14-GENESIS-PATCH    (if patches were applied in Phase B)
R15-NODE-CORR        (after Phase B cycles complete)
R16-CROSS-FLOW-DEP   (if flow consumes events from other flows)
R17-HANDOFF          (always — summarizes all learning)
R18-VALIDATE         (always — validates STATE.json completeness)
R19-WAVE2-GATE       (always last — clears for Wave 2)
```

Minimum set: R2, R3, R8, R10, R17, R18, R19. All others are conditional.

---

## ACCEPTANCE CRITERIA FOR THE SESSION-RN FAMILY

Before the SESSION-RN family is considered complete for a flow:

- [ ] R2-GRAPH-SEED authored and seeds at least 1 edge per task type
- [ ] R3-NODE-GRADE authored and all task types grade ≥ 0.75
- [ ] R8-ROUTING-DECISION authored with one record per task type
- [ ] R10-GENESIS-SCORE authored with one record per task type
- [ ] R17-HANDOFF authored and LEARNING-HANDOFF.json defined
- [ ] R18-VALIDATE authored and passes (failures === 0 against required fields)
- [ ] R19-WAVE2-GATE authored and wave2_gate recorded in STATE.json
- [ ] All files self-contained (no cross-references, all vars in CONTEXT)
- [ ] All files close with `⛔ STOP`
- [ ] STATE.json is updated in STEP 6 (or equivalent) of each session file

---

*End of GUIDE-B16 — SESSION-RN-[LABEL] family*
*List A sources: ZIP-03 (FLOW-PREP-MASTER-PLAN §R2-R19), ZIP-11 (FLOW-42/43 SESSION-RN examples),*
*ZIP-16 (flow business spec for task types, BFA rules, cross-flow deps)*
*Target B-type: B-16 — SESSION-RN-[LABEL] family*
*Round: 26 of 72*
