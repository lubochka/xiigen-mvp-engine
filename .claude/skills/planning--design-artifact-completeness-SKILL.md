---
name: design-artifact-completeness
version: "1.0.0"
sk_number: SK-537
priority: MANDATORY
load_order: 3
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-537 Design Artifact Completeness — Files exist is not files populated

A design artifact that exists on disk is not automatically a design artifact that is complete. A session that checks only existence passes files whose required fields are empty. This skill makes completeness a first-class, testable property.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). Session reconnaissance on the codebase uploaded by Luba found `contracts/topologies/` with 14 JSON files present. A parallel Claude instance opened each file and found 10 of the 14 had `nodes: []` — present on disk, empty of content. Every prior skill that checked "is X documented" saw YES for all 14. No skill checked "is X populated with real content." The gap was invisible for months. SK-537 is the skill that would have surfaced it at the first reconnaissance pass.

## When to Invoke

- During SK-529 reconnaissance, for every flow the session's scope touches
- Before any plan step that depends on a design artifact being a valid input
- When SK-531 captures a claim about "X is documented / designed / complete" — SK-537 is the verification action
- At Phase 10 DESIGN-REVIEW-PROTOCOL runs (fleet-wide aggregation of SK-537 output)
- At Gate 0h of CODE-REVIEW-PROTOCOL-v1.3 during plan review (checks referenced artifacts)

One SK-537 pass before planning = zero "we built on an empty file" execution failures.

---

## Section 1 — Purpose and Failure Pattern

A design artifact is a JSON / YAML / NDJSON file that encodes a decision, a topology, a contract, or a teaching pattern. It exists to be a programmatic input to downstream processes (flow generation, convergence, RAG retrieval, arbiter panel execution).

"Does the artifact exist?" is a weak question. Weak because the filesystem answers it cheaply and the answer is reliable — a YES means the file is there. But YES does not imply usability:

- A `contract.json` with `taskTypes: []` exists but contains no task types to generate from.
- A `topology.json` with `nodes: []` exists but describes no nodes for convergence to populate.
- A `design-reasoning.json` with `decisions: []` exists but teaches no patterns.
- An `arbiter.bulk.ndjson` with zero records exists but configures no arbiter panel.

Every skill that answered "documented? yes" on these files was answering the wrong question. The right question is "is the documented artifact a valid input to the processes that consume it?" SK-537 asks that question mechanically, via five orthogonal checks.

---

## Section 2 — The Five Checks

Each artifact is evaluated on five dimensions. Each check produces PASS / FAIL / PARTIAL independently. The checks are orthogonal — an artifact can pass Check 1 and fail Check 2 (the 10-of-14 case), or pass 1-4 and fail 5 (design done, not seeded).

### Check 1 — Files Exist

**What it verifies:** all expected fixtures for the flow are present on disk.

**Detection:** `ls` or `find` on the expected path per artifact type.

**Per-flow expected artifact set:**

```
contracts/
  contracts.ndjson OR [flow-name].contract.json
contracts/topologies/
  [flow-name].topology.json
fixtures/design-reasoning/
  [flow-name].design-reasoning.json
fixtures/arbiters/
  [flow-name].bulk.ndjson   (if flow has arbiter panel)
fixtures/event-schemas/
  [flow-name].event-schemas.json   (if flow emits events)
```

**PASS** = file exists at expected path.
**FAIL** = missing.

**Failure mode caught:** artifact never authored; flow referenced in plans that silently have no fixture input.

### Check 2 — Fields Populated

**What it verifies:** required fields are non-empty. Empty arrays (`nodes: []`, `edges: []`, `decisions: []`, `taskTypes: []`) are FAIL, not PASS. This is the check that would have caught the 10-of-14 gap.

**Detection:** parse JSON / NDJSON, check field sizes against the per-artifact-type requirements (Section 3).

**PASS** = all required fields non-empty.
**FAIL** = any required field empty.
**PARTIAL** = some required fields populated, others empty.

**Failure mode caught:** the canonical 10-of-14 topology failure.

### Check 3 — Content Specific

**What it verifies:** design content is specific to this flow, not copy-pasted from an adjacent flow.

**Detection:** compare this flow's key content fields (decisions text, task type names, node labels) to adjacent flows in the same category.

- ≥50% string match across comparison fields → FAIL (copy-paste)
- ≥20% and <50% string match → PARTIAL (shared boilerplate)
- <20% string match → PASS (flow-specific)

**PASS** = content specific to this flow.
**FAIL** = content copy-pasted from adjacent flow.
**PARTIAL** = shared boilerplate with flow-specific additions.

**Failure mode caught:** a file that "looks designed" but is a clone of another flow's design with minor renaming; Check 1 and 2 pass but the design is not actually a decision for this flow.

### Check 4 — Matches Implementation

**What it verifies:** design artifact aligns with the matching service in `server/src/engine/flows/[flow-name]/`.

**Detection:**
- Read `contract.json`'s `taskTypes[]`
- Read service handler methods in `server/src/engine/flows/[flow-name]/*.handler.ts`
- Verify each task type has a corresponding handler OR the mismatch has an explicit annotation (pending, deferred, deprecated)
- Verify no handler exists that isn't in the contract

**PASS** = contract ↔ service bidirectional match.
**PARTIAL** = handlers exist not in contract (or vice versa) but with explicit annotations.
**FAIL** = mismatch without annotation (design-reality drift).

**Failure mode caught:** FLOW-28 / FLOW-32 class — the design says one thing, the implementation does another, neither is flagged, the drift persists for months.

### Check 5 — Seeded to RAG

**What it verifies:** design artifact present in `xiigen-rag-patterns` Elasticsearch index as a `FLOW_SCOPED` document, so future sessions retrieve the pattern when reasoning about the flow.

**Detection:**

```bash
curl -s "http://elasticsearch:9200/xiigen-rag-patterns/_search?q=flow:[flow-name]+AND+connectionType:FLOW_SCOPED"
```

- hit count ≥ 1 AND indexed document content matches source file → PASS
- hit count 0 → FAIL (documentary-only, never operational)
- hit exists but `indexedTime < sourceFile.modifiedTime` → PARTIAL (stale)

**PASS** = artifact seeded and current.
**FAIL** = not seeded.
**PARTIAL** = seeded but stale.

**Failure mode caught:** design exists in the repo but never reaches the retrieval layer; convergence rounds in future sessions don't surface the pattern.

**Check 5 is informational, not blocking.** Unseeded artifacts can still be referenced by plans. But plans that reference unseeded artifacts must note them as documentary-only — future sessions using the flow won't automatically retrieve the design reasoning.

---

## Section 3 — Per-Artifact-Type Required Fields

### contract.json / `contracts.ndjson` line for the flow

Required non-empty:
- `flowName` (string)
- `taskTypes[]` with at least 1 entry
- Each `taskTypes[i]` has:
  - `name` (string)
  - `archetype` (one of ROUTING | DATA_PIPELINE | VALIDATION | TRANSACTION | ORCHESTRATION | SCHEDULED)
  - `ironRules[]` with at least 1 entry

### topology.json

Required non-empty:
- `flowName` (string, matches contract)
- `nodes[]` with at least 1 entry
- `edges[]` with at least 1 entry (0 edges only valid if exactly 1 node)
- Node count matches task type count from contract (or annotated explanation for the delta)

Each `nodes[i]` has:
- `id` (unique within topology)
- `handler` (handler type — generation, convergence, arbiter-panel, etc.)
- `taskTypeRef` (reference to contract.taskTypes[n].name)

### design-reasoning.json

Required non-empty:
- `flowName` (string)
- `decisions[]` with at least 1 entry

Each `decisions[i]` has:
- `context` (what decision is being made — non-empty string)
- `chosen` (the option taken — non-empty)
- `rejected` (at least 1 rejected option — non-empty array)
- `teachingPoint` (what future sessions should learn from this — non-empty string)

### arbiters bulk NDJSON

Required:
- At least 1 domain arbiter record
- `scope_isolation` arbiter record present (FC-32 requirement)
- `scope_isolation` appears as the LAST record in the file (ordering rule from FC-32)

### event-schemas.json

Required non-empty:
- `flowName` (string)
- `schemas[]` with at least 1 entry

Each `schemas[i]` has:
- `eventType` (non-empty)
- `required[]` with at least 1 field name
- `correlationId` field present in required[] or explicitly annotated as non-correlational

---

## Section 4 — Output Format

### Per-flow table

```
FLOW: user-registration
| Artifact                  | C1 | C2 | C3 | C4 | C5 | Status  |
|---------------------------|----|----|----|----|----|---------|
| contract                  | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| topology.json             | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| design-reasoning.json     | ✅ | ✅ | ✅ | ⚠️ | ❌ | PARTIAL |
| arbiters bulk NDJSON      | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| event-schemas.json        | ✅ | ✅ | ⚠️ | ✅ | ❌ | PARTIAL |

Overall: DESIGN_COMPLETE_NOT_SEEDED
```

Legend: ✅ PASS, ❌ FAIL, ⚠️ PARTIAL

### Fleet-wide summary (when run against a whole flow directory)

```
Date: 2026-04-16

| Flow                      | C1 score | C2 score | C3   | C4   | C5   | Overall       |
|---------------------------|----------|----------|------|------|------|---------------|
| user-registration         | 5/5      | 5/5      | 5/5  | 4/5  | 0/5  | PARTIAL       |
| subscription-billing      | 5/5      | 0/5      | —    | —    | —    | INCOMPLETE    |
| feature-gating            | 5/5      | 0/5      | —    | —    | —    | INCOMPLETE    |
| [...]                                                                               |

Totals: 9 COMPLETE, 10 INCOMPLETE, 5 PARTIAL, 0 fully SEEDED
```

### Overall status categories

- **COMPLETE**: all 5 checks PASS across all artifacts
- **DESIGN_COMPLETE_NOT_SEEDED**: checks 1-4 PASS, check 5 FAIL (most common in practice)
- **PARTIAL**: some checks PASS, some FAIL, no structural blockers
- **DESIGN_MISMATCH**: check 4 FAIL with no annotation (design-reality drift)
- **INCOMPLETE**: check 2 FAIL on any required artifact (the 10-of-14 class)
- **MISSING**: check 1 FAIL on any required artifact (no fixture)

---

## Section 5 — STATE.artifactCompleteness Schema

```json
{
  "artifactCompleteness": {
    "runAt": "2026-04-16T07:40:00Z",
    "scope": "flow: user-registration" ,
    "flows": {
      "user-registration": {
        "artifacts": {
          "contract": {
            "path": "contracts/user-registration.contract.json",
            "c1": "PASS",
            "c2": "PASS",
            "c3": "PASS",
            "c4": "PASS",
            "c5": "FAIL",
            "c5Reason": "grep xiigen-rag-patterns: 0 hits"
          },
          "topology.json": {
            "path": "contracts/topologies/user-registration.topology.json",
            "c1": "PASS",
            "c2": "PASS",
            "c3": "PASS",
            "c4": "PASS",
            "c5": "FAIL"
          }
        },
        "overall": "DESIGN_COMPLETE_NOT_SEEDED"
      }
    },
    "totals": {
      "complete": 1,
      "designCompleteNotSeeded": 1,
      "partial": 0,
      "designMismatch": 0,
      "incomplete": 0,
      "missing": 0
    }
  }
}
```

---

## Section 6 — Gate Enforcement

### When a plan references existing design artifacts

SK-537 runs on every referenced artifact before the plan proceeds. The trigger is:
- SK-531 captures a claim of form "X design exists / is documented / is complete" → SK-537 verifies
- SK-532 Materialization session type classifies session → SK-537 runs against the whole artifact set the session's scope touches
- Gate 0h in CODE-REVIEW-PROTOCOL-v1.3 explicitly calls SK-537 during plan review

### Gate rule

Any artifact failing Check 1 (file missing) or Check 2 (required fields empty) → **BLOCKS** treatment of that artifact as complete design input.

The plan's options when a referenced artifact fails blocking checks:
1. **Enrich the artifact first** — add a task to the plan to populate the empty fields before proceeding
2. **Explicitly scope around the gap** — acknowledge in the plan that "this turn proceeds without X because X is empty; consequence is Y"
3. **Mark claim DEFERRED via SK-531** — Luba approves proceeding without verification

Silent assumption that the artifact is usable is not an option. The gap must be surfaced.

Check 3 (content specific) and Check 4 (matches impl) failures are **SURFACED**, not blocking — the plan can proceed but must note the drift.

Check 5 (seeded) failure is **INFORMATIONAL** — plan proceeds, documentation-only status recorded.

---

## Section 7 — Worked Examples

### Example A — The 10-of-14 Failure (reproduced via SK-537)

**Scope:** whole `contracts/topologies/` directory, 14 files.

**SK-537 output (fleet-wide summary, abbreviated):**

```
Date: 2026-04-16

Files scanned: 14
Check 1 (files exist): 14/14 PASS
Check 2 (fields populated): 4/14 PASS, 10/14 FAIL — nodes:[]
Check 3..5: not run on Check-2-FAIL files (blocking)

Breakdown:
  4 files populated: user-registration, subscription-setup, password-reset, tenant-invite
  10 files empty (nodes:[]):
    - feature-gating
    - analytics-event-capture
    - session-management
    - [7 more]

Overall status: 10 of 14 flows INCOMPLETE
```

**Consequence under governance:** plan that references these 14 flows as design inputs fails Gate 0h at review time. Plan must either enrich the 10 empty files first (Task 1 of a MATERIALIZATION plan) or explicitly scope around them. The gap surfaces at review round 1, not during execution.

### Example B — user-registration Flow (DESIGN_COMPLETE_NOT_SEEDED)

**Scope:** single flow.

**SK-537 per-flow table:**

```
FLOW: user-registration
| Artifact                  | C1 | C2 | C3 | C4 | C5 | Status  |
| contract                  | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| topology.json             | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| design-reasoning.json     | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
| arbiters bulk NDJSON      | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |
Overall: DESIGN_COMPLETE_NOT_SEEDED
```

**Consequence:** plan can reference this flow's artifacts as complete design input. No blocking issue. Plan SHOULD add a task to seed the artifacts to `xiigen-rag-patterns` so future convergence sessions retrieve the patterns. This is the most common real-world status — design authored, never indexed.

### Example C — DESIGN_MISMATCH

**Scope:** FLOW-28 (hypothetical for illustration).

**SK-537 per-flow table:**

```
FLOW: flow-28-billing-reconciliation
| Artifact                  | C1 | C2 | C3 | C4 | C5 | Status  |
| contract                  | ✅ | ✅ | ✅ | ❌ | ❌ | FAIL    |
| topology.json             | ✅ | ✅ | ✅ | ❌ | ❌ | FAIL    |
| design-reasoning.json     | ✅ | ✅ | ✅ | ✅ | ❌ | PARTIAL |

Check 4 FAIL detail:
  contract.taskTypes: [validate, reconcile, report] (3 types)
  server/src/engine/flows/flow-28-billing-reconciliation/: 2 handlers
    - validate.handler.ts (exists)
    - reconcile.handler.ts (exists)
  report.handler.ts: MISSING, no annotation
  (contract has 3 task types, service implements 2, design-reality drift on "report")

Overall: DESIGN_MISMATCH
```

**Consequence:** plan that treats FLOW-28 as complete will succeed on validate and reconcile task types and fail on report. The gap surfaces at SK-537 run time, not at execution.

---

## Section 8 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** SK-537 is a specific form of reconnaissance. When the session scope touches design artifacts, running SK-537 IS reconnaissance for those artifacts. STATE.artifactCompleteness integrates with STATE.recon — the per-artifact PASS/FAIL results satisfy the reconnaissance threshold's file-read and grep-count requirements.

- **SK-531 Claim-as-Hypothesis (load_order 3):** SK-531 and SK-537 are sibling skills, both at load_order 3 because they run during the reconnaissance phase. SK-531 handles user assertions; SK-537 handles filesystem assertions. When a user claim is about an artifact, both skills verify — from different angles, producing a unified verdict.

- **SK-532 Materialization Session Type:** triggers a fleet-wide SK-537 pass at session start. Every artifact in the session's scope is evaluated before planning. A MATERIALIZATION session that skips SK-537 is definitionally unsafe because it may be wiring empty artifacts.

- **SK-534 Goal Delivery Completeness Arbiter:** reads SK-537 results when a goal is about "make X visible / usable." If X's artifacts fail Check 2, the goal is harder to deliver — arbiter verdict reflects the elevated risk.

- **SK-441 flow-completeness-checker V33:** V33 (new in v2.0, Phase 07) is derived from SK-537. V33's check is "artifacts this flow plan references pass Checks 1-2 of SK-537." V33 fails if SK-537 reports INCOMPLETE or MISSING.

- **SK-442 arbiter-panel-design:** when SK-537 reports check 4 FAIL (design-reality drift) or check 2 FAIL on the arbiter NDJSON itself, the arbiter panel is not valid and panel execution should not proceed.

- **Phase 10 DESIGN-REVIEW-PROTOCOL-v1:** the fleet-wide aggregation layer. Runs SK-537 across every flow in the repo and produces the table reproducing the 10-of-14 finding. Design review is the named, scheduled, fleet-wide invocation of SK-537.

- **Gate 0h in CODE-REVIEW-PROTOCOL-v1.3 (Phase 09):** reviewer's plan-time SK-537 invocation. Reviewer verifies that every artifact the plan references passes SK-537 Checks 1-4.

---

## Section 9 — Anti-patterns

1. **"The file exists, so the design exists"** — Check 1 alone is not completeness. The 10-of-14 failure is exactly this anti-pattern. Check 2 is the difference between existence and usability.

2. **"Empty fields will be populated later"** — possibly. But the plan that treats empty-now as populated-for-planning silently fails at execution. "Later" is a task, not an assumption. If the field will be populated, the plan has a task to populate it.

3. **"Check 5 is just nice-to-have"** — Check 5 is informational but not irrelevant. Unseeded artifacts produce weaker convergence and retrieval in future sessions. Skipping Check 5 means the design reaches the repo but never reaches the sessions that would benefit from it.

4. **"Don't check content specificity, it's subjective"** — string match thresholds are mechanical, not subjective. 50% identical strings across two flows' design-reasoning is not coincidence.

5. **"Check 4 drift is acceptable for prototype flows"** — drift is never silently acceptable. Acceptable drift carries an annotation; unannotated drift fails Check 4. The annotation is the discipline, not the drift itself.

6. **"SK-537 is heavy, skip it for small changes"** — the check set is cheap (seconds of grep + JSON parse). The skip produces exactly the failure class SK-537 was introduced to prevent.

---

## UNIVERSAL STANDARD ADDENDUM — Generalized 5-Check (C1-C5) with TS detection (ported from llm_mvp_core)

> Added by the Universal-Skills refresh (UpdateUniversalSkills). Source standard:
> `llm_mvp_core/docs/skills/design-artifact-completeness-SKILL.md`. The flow-design
> checks above (contracts/topologies/fixtures, RAG seeding) are kept as the XIIGen
> specialization. The universal version generalizes the five orthogonal checks to ANY
> code/service/component artifact and adds TypeScript-stack detection — the mvp library
> had the flow-artifact form but not the generalized "file exists ≠ capability
> implemented" gate for `.ts` services/components/endpoints.

### The five orthogonal checks (generalized; each independent — "C1 PASS, C2 FAIL" = stub)

```
C1 Files Exist          — the file/symbol is present on disk
C2 Fields & Methods Populated — bodies are real, not stubs (not throw NotImplemented / empty)
C3 Content Specific     — specific to THIS capability, not copy-pasted from a sibling
C4 Matches Specification — interface ↔ implementation agree (contract ↔ handler/service)
C5 Reachable by Consumers — wired and resolvable (NestJS DI / route / export), not orphan
```

Each check is independent and reports PASS | FAIL | PARTIAL. The classic stub pattern
is `C1 PASS, C2 FAIL` (file there, body is a placeholder).

### TS detection commands (this mvp project)

```bash
# C2 — bodies populated (NOT stubs)
grep -rn "throw new NotImplementedError\|throw new NotImplementedException\|TODO\|FIXME" server/src/<area>
grep -rn "=> *{ *}\|{ *return; *}\|return null;\s*//\s*stub" server/src/<area>   # empty/placeholder bodies
# any hit on the cited symbol → C2 FAIL or PARTIAL until justified

# C2 (tests exist for the capability) — Jest (server) / Playwright (client)
grep -rn "it(\|test(\|describe(" server/src/<area>/*.spec.ts     # Jest cases present
grep -rn "test(" client/e2e/<area>.spec.ts                        # Playwright cases present
# zero test cases for a capability claimed "done" → C2 FAIL

# C4 — interface ↔ implementation match
#   read the contract/DTO/interface, then the service methods; every public method
#   returns Promise<DataProcessResult<T>>; no handler exists outside the contract.
grep -rn "DataProcessResult" server/src/<area>/*.service.ts        # domain return type present
grep -rn "throw new" server/src/<area>/*.service.ts                # business-logic throw = DNA-3 / C4 risk

# C5 — reachable / wired (NestJS DI)
grep -rn "providers:\s*\[" server/src/<area>/*.module.ts | grep "<ServiceName>"   # registered
grep -rn "exports:\s*\[" server/src/<area>/*.module.ts | grep "<ServiceName>"     # exported if cross-module
grep -rn "<ServiceName>" server/src/.../*.controller.ts                            # consumed
# React: the hook/component is imported and rendered on a route, not dead code
# zero registration/consumption for a "done" capability → C5 FAIL (orphan)
```

### Per-capability table (generalized)

```
CAPABILITY: <name>
| Symbol/file                     | C1 | C2 | C3 | C4 | C5 | Status  |
| RegisterService.register        | ✅ | ✅ | ✅ | ✅ | ✅ | COMPLETE |
| useRegistration hook            | ✅ | ❌ | —  | —  | ✅ | PARTIAL (body is a stub) |
Verdict: COMPLETE only when C1–C5 are all PASS (C5 may be informational where the
consumer is genuinely out of scope — annotate it, like Check 5 above).
```

**FAIL if:** any cited symbol passes C1 but fails C2 (stub), any public service method
does not return `DataProcessResult<T>`, any contract task/route has no handler (C4),
or any "done" capability is unregistered/unconsumed (C5 orphan).

---

## END OF SK-537
