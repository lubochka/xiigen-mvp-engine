# GUIDE-B18 — How to Produce `FLOW-XX-TEACH-QA-R0.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 28 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-TEACH-QA-R0.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the TEACH-QA-R0 guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance to a new flow's spec,
it will produce a correct, evidence-backed FLOW-XX-TEACH-QA-R0.md for that flow.

---

## WHAT THIS FILE IS

FLOW-XX-TEACH-QA-R0.md is Document 2 of the 3-document flow pipeline — the
teaching infrastructure session that closes the loop between design and corpus.

```
Document 1: FLOW-XX-DESIGN-SIMULATION-R1.md   ← authoritative design (must exist first)
Document 2: FLOW-XX-TEACH-QA-R0.md            ← this file
Document 3: FLOW-XX-IMPLEMENTATION-PLAN.md    ← execution plan (references this file)
```

Consumer: Claude Code. Session type declared in the file: MAINTENANCE.
Rule: Design simulation must exist and be complete before this file is authored.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-02 | PRIMARY | LIBRARY-5-TEACH-QA.md — canonical 6-phase structure, DC test pattern, SEED test pattern |
| ZIP-01 | PRIMARY | XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md §Document 2 — file header, session preamble, cold start, API constraints, fixture format constraints |
| ZIP-11 | FIXTURE | FLOW-07-TEACH-QA-R0.md — full rich example: 6 DR records, 5 ARCH_PATTERN, PLAN_EXEMPLAR, 6 contracts, 5 topologies, 7 arbiters, 13 event schemas, seed script, 10 DC tests, SEED-21..25, TVQ |
| ZIP-11 | FIXTURE | FLOW-25-TEACH-QA-R0.md — newer condensed style: 6 phases, 14 contracts, DC-01..10 |
| ZIP-11 | FIXTURE | FLOW-10-TEACH-QA-R0.md — mid-period large flow example (20 task types) |
| ZIP-09 | FIXTURE | flow02-design-decisions.json — DR fixture JSON array format reference |
| ZIP-08 | FIXTURE | arch--fan-in-parallel-merge.json — RAG pattern fixture format reference |
| ZIP-16 | PRIMARY | Flow's business spec — drives DR records, pattern names, archetype values, event names, named checks |

---

## OUTPUT FILE SPECIFICATION

Target path: docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R0.md
Never use SESSION- prefix. Correct prefix is FLOW-XX-.

---

## THE SIX-PHASE STRUCTURE

Every TEACH-QA-R0 file has exactly 6 phases. Each phase ends with STOP.

```
Phase 1 — Design-reasoning fixtures + RAG pattern fixtures
Phase 2 — Contracts + topologies + arbiters + event schemas
Phase 3 — Seed script (rag-benchmark/seed_{slug}_patterns.py)
Phase 4 — Proper-flow design contract tests ({slug}-proper-flow.e2e.spec.ts)
Phase 5 — Teaching pipeline spec extension (SEED-NN..SEED-NN+4)
Phase 6 — Topology visual QA ({slug}-topology-qa.spec.ts)
```

---

## HOW TO PRODUCE THE FILE

### Step 1 — File Header

```markdown
# FLOW-XX-TEACH-QA-R0.md
## FLOW-XX: [Flow human name] — Teaching Pipeline + Proper Flow Testing
## Session type: MAINTENANCE
## Consumer: Claude Code
## Branch: claude/vigorous-margulis
## Date: YYYY-MM-DD
```

### Step 2 — Session Preamble

States exactly what exists and what is missing. Lists new patterns not seen in prior
flows. Documents SEED number continuity.

```markdown
## SESSION PREAMBLE

**Why this session exists:**
FLOW-XX ([Flow human name], T[NNN]-T[NNN+M]) has a complete design simulation
(FLOW-XX-DESIGN-SIMULATION-R1.md) but zero teaching infrastructure:

```
fixtures/design-reasoning/         — no {slug}-design-decisions.json
fixtures/rag-patterns/              — no FLOW-XX pattern fixtures
fixtures/contracts/                 — no T[NNN]-T[NNN+M] contracts
fixtures/flow-definitions/          — no FLOW-XX topologies
fixtures/arbiters/                  — no {slug}-arbiters.bulk.ndjson
fixtures/event-schemas/{slug}/      — directory does not exist
rag-benchmark/seed_{slug_under}_patterns.py — does not exist
server/test/e2e/{slug}/
  {slug}.e2e.spec.ts               [EXISTS — do NOT duplicate | MISSING]
  {slug}-proper-flow.e2e.spec.ts   MISSING
client/e2e/teaching-pipeline.spec.ts — needs SEED-[NN+1]..[NN+5]
```

FLOW-XX introduces [N] new patterns:
- [PATTERN_NAME] ([task type]) — [one-sentence description]

**Before Phase 5:** run:
```bash
grep "SEED-" client/e2e/teaching-pipeline.spec.ts | grep "test(" | tail -3
# Confirm last SEED number before writing SEED-[NN+1]...[NN+5]
```

**P19 ABSOLUTE TEST GATE — before every STOP:**
```bash
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed|failed" | tail -3
# Gate: failures === 0. Count must not decrease from baseline.
```

**FOUND-ISSUE PROTOCOL:** FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only.
```

### Step 3 — Cold Start

```markdown
## COLD START

```bash
git branch --show-current
# Expected: claude/vigorous-margulis

cd server && npx jest --passWithNoTests 2>&1 | grep "Tests:" | tail -1
# Record baseline — must not decrease

# Confirm all fixture gaps
ls fixtures/design-reasoning/{slug}-design-decisions.json 2>/dev/null || echo "MISSING"
ls fixtures/contracts/t[NNN].contract.json 2>/dev/null || echo "NONE"
ls rag-benchmark/seed_{slug_under}_patterns.py 2>/dev/null || echo "MISSING"

# Confirm what already exists (do NOT duplicate)
ls server/test/e2e/{slug}/{slug}.e2e.spec.ts 2>/dev/null && echo "EXISTS — do not duplicate"

# Confirm SEED number
grep "SEED-" client/e2e/teaching-pipeline.spec.ts | grep "test(" | tail -3

# Read format references BEFORE every phase
python3 -c "
import json
d = json.load(open('fixtures/design-reasoning/flow02-design-decisions.json'))
assert isinstance(d, list), 'Must be JSON array'
print('Format: JSON ARRAY')
print('curriculumTier type:', type(d[0]['curriculumTier']))   # must be int
print('qualityScore type:', type(d[0]['qualityScore']))        # must be float
print('appliesTo type:', type(d[0]['appliesTo']))              # must be list
"

python3 -c "
import json
d = json.load(open('fixtures/rag-patterns/arch--fan-in-parallel-merge.json'))
print('RAG keys:', sorted(d.keys()))
# Must NOT see: summary, antiPattern
"

# Read named checks BEFORE Phase 2
grep -A3 "[named_check_key_1]:\|[named_check_key_2]:" \
  server/src/engine/node-handlers/validate.handler.ts | head -40
```
```

### Step 4 — Design References

```markdown
## DESIGN REFERENCES (read before every phase)

```
FLOW-XX-DESIGN-SIMULATION-R1.md        ← authoritative

Key decisions and DR references:
  T[NNN]: [key decision] (DR-XX-A, [named_check_key])
  T[NNN+1]: [key decision] (DR-XX-B, [named_check_key])

API constraints (non-negotiable):
  createCloudEvent({ eventType, source, tenantId, data })    ← 'eventType' not 'type'
  validateCloudEvent returns [boolean, string[]]             ← always destructure
  DataProcessResult.failure(code, message)                   ← both args required
  No FabricType.SCOPED_MEMORY — use FabricType.CORE

Format constraints:
  {slug}-design-decisions.json is a JSON ARRAY (not object)
  curriculumTier: 1 — int, NOT string
  qualityScore: 0.93 — float, NOT string
  appliesTo: ["FLOW-NN"] — JSON array, NOT string
  RAG fixtures: patternId, patternType, flowId, domainId, seededAt,
                archetype, tags, keywords, codeSnippet, ironRules
  RAG fixtures do NOT have: summary, antiPattern

Named checks for T[NNN]-T[NNN+M] (verify all in validate.handler.ts):
  [named_check_key_1] — T[NNN]
  [named_check_key_2] — T[NNN+1]

Seed script reference: rag-benchmark/seed_flow02_patterns.py (mirror exactly)
Proper-flow test reference: server/test/e2e/flow-02/flow-02-proper-flow.e2e.spec.ts
```
```

### Step 5 — Phase 1 (Design-Reasoning + RAG Fixtures)

```markdown
## PHASE 1 — DESIGN-REASONING FIXTURES + RAG PATTERN FIXTURES

### What this phase produces
```
fixtures/design-reasoning/{slug}-design-decisions.json   ([N] DR records)
fixtures/rag-patterns/
  [pattern-name-1].json     ← ARCH_PATTERN
  [pattern-name-2].json     ← ARCH_PATTERN
  plan-{slug}-{name}.json   ← PLAN_EXEMPLAR (if applicable)
```

### Step 1-A: Read format references (mandatory)
[bash commands to verify JSON array format and RAG keys — from cold start section]

### Step 1-B: {slug}-design-decisions.json

**JSON ARRAY. [N] records. curriculumTier: int. qualityScore: float. appliesTo: list.**
**Derive every field from FLOW-XX-DESIGN-SIMULATION-R1.md — read the full simulation first.**

DR record structure:
```json
{
  "patternId": "FLOW-XX-DR-01",
  "patternType": "DESIGN_REASONING",
  "flowId": "FLOW-XX",
  "domainId": "[domain from spec]",
  "seededAt": "YYYY-MM-DDT00:00:00Z",
  "teachingPoint": "[principle + why wrong approach fails — from simulation decision]",
  "positiveExample": "[from simulation chosen/resolution]",
  "negativeExample": "[from simulation rejected/proposed]",
  "discriminatingConstraint": "[one constraint separating chosen from rejected]",
  "appliesTo": ["FLOW-NN", "FLOW-NN"],
  "curriculumTier": 1,
  "qualityScore": 0.93,
  "sourceDocument": "FLOW-XX-DESIGN-SIMULATION-R1.md (DR-XX-A)",
  "tags": ["[tag1]", "[tag2]"],
  "keywords": "[space-separated retrieval terms]"
}
```

DR count: Minimum 4 records. Capture every decision that would cause SILENT_FAILURE
if the AI model applies the wrong approach.

### Step 1-C: RAG pattern fixtures

One file per new pattern. File name: business capability slug, not T-ID.

```json
{
  "patternId": "[PATTERN-NAME-001]",
  "patternType": "ARCH_PATTERN",
  "flowId": "FLOW-XX",
  "domainId": "[domain]",
  "seededAt": "YYYY-MM-DDT00:00:00Z",
  "archetype": "[ROUTING|DATA_PIPELINE|VALIDATION|TRANSACTION|ORCHESTRATION|SCHEDULED]",
  "tags": ["[tag1]"],
  "keywords": "[space-separated terms]",
  "codeSnippet": "[short pseudo-code — correct pattern; embed wrong pattern as comment]",
  "ironRules": ["[rule 1]", "[rule 2]"],
  "appliesTo": ["FLOW-NN+1"],
  "curriculumTier": 1,
  "qualityScore": 0.93,
  "sourceDocument": "FLOW-XX-DESIGN-SIMULATION-R1.md",
  "connectionType": "FLOW_SCOPED",
  "knowledgeScope": "GLOBAL"
}
```
Forbidden fields: summary, antiPattern.

### Phase 1 gate
```bash
python3 -c "
import json
d = json.load(open('fixtures/design-reasoning/{slug}-design-decisions.json'))
assert isinstance(d, list), 'FAIL: must be JSON array'
assert len(d) >= 4, f'FAIL: expected >= 4 DR, got {len(d)}'
for r in d:
    assert isinstance(r['curriculumTier'], int)
    assert isinstance(r['qualityScore'], float)
    assert isinstance(r['appliesTo'], list)
print(f'OK: {len(d)} DR records valid')
"
[absolute test gate]
STOP — deliver Phase 1 fixtures. Await approval before Phase 2.
```

### Step 6 — Phase 2 (Contracts + Topologies + Arbiters + Event Schemas)

```markdown
## PHASE 2 — CONTRACTS + TOPOLOGIES + ARBITERS + EVENT SCHEMAS

### What this phase produces
```
fixtures/contracts/t[NNN].contract.json ... t[NNN+M].contract.json
fixtures/flow-definitions/{slug}-t[NNN].topology.json (per archetype group)
fixtures/arbiters/{slug}-arbiters.bulk.ndjson
fixtures/event-schemas/{slug}/ ([N] schema files)
```

### Step 2-A: Read format references
```bash
cat fixtures/contracts/t50.contract.json | python3 -m json.tool | head -20
cat fixtures/flow-definitions/flow-02-t50.topology.json | python3 -m json.tool | head -20
head -4 fixtures/arbiters/flow-02-arbiters.bulk.ndjson
cat fixtures/event-schemas/flow-01/UserRegistrationInitiated.schema.json
```

### Step 2-B: Contracts (one per task type)

Read validate.handler.ts BEFORE writing — never write namedCheck key not present there.

Contract structure:
```
t[NNN].contract.json — T[NNN] [ServiceName], archetype: [ARCHETYPE]
  ironRules: [from design simulation — BUILD_FAILURE or score-0 on violation]
  namedChecks: [[keys verified in validate.handler.ts]]
  factories: [IFabricName(FABRIC_TYPE), ...]
  machineComponents: [invariant behaviors]
  freedomComponents: [FREEDOM config keys for tenant-tunable params]
```

### Step 2-C: Topologies (per archetype group)

Standard 8-node pipeline. flowId: "FLOW-XX".
- n4 ai-generate text: "Generate [service-name].service.ts — [key constraint from IR]"
- n8 feedback text: "DPO triple: chosen=[correct], rejected=[SILENT_FAILURE pattern]"

### Step 2-D: Arbiters NDJSON

One {"index":{"_index":"xiigen-arbiters","_id":"arb-flow[XX]-[purpose]"}} header line,
followed by arbiter document on next line. scope_isolation MUST BE LAST (FC-32).

scope_isolation arbiter (LAST record):
```json
{
  "arbiterId": "arb-flow[XX]-scope-isolation",
  "flowId": "FLOW-XX",
  "scope": ["T[NNN]", ...],
  "arbiterType": "scope_isolation",
  "cfId": "FC-32",
  "description": "[which records PRIVATE vs GLOBAL, which task types inline-only]",
  "blockConditions": ["[record type] stored with knowledgeScope:GLOBAL", ...],
  "resolution": "scope_isolation: { modelToken: 'AI_SCOPE_ARBITER', blind: true, blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS' }"
}
```

### Step 2-E: Event schemas (one per CloudEvent)

Required fields per schema: eventType, flowId, seededAt, source, consumers[],
piiFields[], allowedPayloadFields[], forbiddenFields[].

### Phase 2 gate
```bash
for T in $(seq [NNN] [NNN+M]); do
  test -f fixtures/contracts/t${T}.contract.json || echo "MISSING: t${T}.contract.json"
done

# scope_isolation must be LAST (FC-32)
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | grep -q '"scope_isolation"' \
  || echo "FAIL: scope_isolation must be last"

cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"
# Expected: 0

[absolute test gate]
STOP — deliver Phase 2 fixtures. Await approval before Phase 3.
```

### Step 7 — Phase 3 (Seed Script)

```markdown
## PHASE 3 — SEED SCRIPT

### What this phase produces
rag-benchmark/seed_{slug_under}_patterns.py

Read rag-benchmark/seed_flow02_patterns.py before writing — mirror interface exactly.

Required CLI: --dry-run, --es-endpoint, --graphrag-url, --skip-es, --skip-graphrag

Dry-run output:
```
[dry-run] ARCH_PATTERN: [N] records
[dry-run] DESIGN_REASONING: [N] records
[dry-run] Total: [N] records — 0 errors
```

ES index routing: ARCH_PATTERN/PLAN_EXEMPLAR → xiigen-rag-patterns
                  DESIGN_REASONING → xiigen-planning-decisions

### Phase 3 gate
```bash
python3 rag-benchmark/seed_{slug_under}_patterns.py --dry-run 2>&1
# Expected: [N] records, 0 errors
python3 rag-benchmark/seed_flow02_patterns.py --dry-run 2>&1 | tail -2
# Prior scripts unaffected
```
STOP — deliver seed script. Await approval before Phase 4.
```

### Step 8 — Phase 4 (Design Contract Tests)

```markdown
## PHASE 4 — PROPER-FLOW DESIGN CONTRACT TESTS

### What this phase produces
server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts

### Step 4-A: Read before writing
```bash
head -30 server/test/e2e/{slug}/{slug}.e2e.spec.ts 2>/dev/null || echo "No prior spec"
grep "it(" server/test/e2e/{slug}/{slug}.e2e.spec.ts 2>/dev/null | head -20
head -30 server/test/e2e/flow-02/flow-02-proper-flow.e2e.spec.ts
```

### Import pattern (load contracts from fixture files)
```typescript
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { InMemoryScopedMemoryProvider }
  from '../../../src/fabrics/scoped-memory/in-memory.provider';

const T[NNN] = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../../../fixtures/contracts/t[NNN].contract.json'), 'utf8'));
```

### Ten design contract tests (DC-01..DC-10)

Tests check contract JSON content — not service logic. Load contracts from fixture
files. Never hard-code iron rule text. Search for patterns in ironRules array.

Pattern for each test:
```typescript
it('DC-0N: T[NNN] [key invariant from design sim]', () => {
  const rule = T[NNN].ironRules.find((r: { rule: string }) =>
    r.rule.includes('[key word from iron rule]'));
  expect(rule).toBeDefined();
  expect(T[NNN].namedChecks).toContain('[named_check_key]');
});
```

CloudEvent name test pattern (DC for each MACHINE literal):
```typescript
it('DC-0N: T[NNN] MACHINE literal — [CloudEventName]', () => {
  const event = createCloudEvent({
    eventType: '[CloudEventName]',
    source: 'flow-[XX]/t[NNN]',
    tenantId: 'tenant-test',
    data: { [required fields from schema] },
  });
  const [valid] = validateCloudEvent(event);
  expect(valid).toBe(true);
  expect(event['type']).toBe('[CloudEventName]');
  expect(event['type']).not.toBe('[wrong synonym 1]');
});
```

### Phase 4 gate
```bash
cd server && npx jest --testPathPattern="{slug}-proper-flow" --no-coverage 2>&1 | tail -5
# Expected: 10 passing, 0 failures

[absolute test gate]
STOP — deliver proper-flow spec. Await approval before Phase 5.
```

### Step 9 — Phase 5 (Teaching Pipeline Extension)

```markdown
## PHASE 5 — EXTEND TEACHING PIPELINE SPEC

### What this phase produces
Extension of client/e2e/teaching-pipeline.spec.ts with SEED-[NN+1]..SEED-[NN+5]

### Step 5-A: Confirm SEED number
```bash
cat client/e2e/teaching-pipeline.spec.ts
grep "SEED-" client/e2e/teaching-pipeline.spec.ts | grep "test(" | tail -3
grep -A 8 "SEED-07:" client/e2e/teaching-pipeline.spec.ts  # mirror graceful-skip pattern
```

### Tests SEED-[NN+1] through SEED-[NN+5]

Add inside existing test.describe block. Mirror graceful-skip from SEED-06.

```typescript
// SEED-[NN+1]: FLOW-XX arch patterns in xiigen-rag-patterns (count >= [N])
// SEED-[NN+2]: FLOW-XX design reasoning in xiigen-planning-decisions (count >= [N])
// SEED-[NN+3]: [key pattern 1] retrievable by keyword
// SEED-[NN+4]: [key pattern 2] retrievable by keyword
// SEED-[NN+5]: GraphRAG returns results for FLOW-XX query (graceful skip if unavailable)
```

### Phase 5 gate
```bash
npx playwright test client/e2e/teaching-pipeline.spec.ts 2>&1 | tail -5
# Expected: all skipped OR passed, 0 failures
cd client && npx tsc --noEmit 2>&1 | grep "teaching-pipeline" | head -5
```
STOP — deliver Phase 5 extension. Await approval before Phase 6.
```

### Step 10 — Phase 6 (Topology Visual QA)

```markdown
## PHASE 6 — TOPOLOGY VISUAL QA

### What this phase produces
client/e2e/topology/{slug}-topology-qa.spec.ts (TVQ-01..TVQ-08)
Entry in client/e2e/topology/topology-fixtures.ts

### Standard TVQ-01..TVQ-08 tests (same for all flows)
- TVQ-01: Flow topology page loads without error
- TVQ-02: All task types visible in topology view
- TVQ-03: Connections between task types rendered correctly
- TVQ-04: Role visibility correct (FLOW's tenant role sees the flow)
- TVQ-05: Admin role sees flow in admin topology view
- TVQ-06: Topology SVG / canvas renders (not blank)
- TVQ-07: Click on T[NNN] node shows correct metadata
- TVQ-08: Flow XX appears in flow library / marketplace listing

### Phase 6 gate
```bash
npx playwright test client/e2e/topology/{slug}-topology-qa.spec.ts --project=chromium 2>&1
# Expected: 8 passed (TVQ-01..TVQ-08)

[absolute test gate]
STOP — all phases complete. Deliver ISSUE INVENTORY and DELIVERY SUMMARY.
```

### Step 11 — Constraints and Delivery Summary (end of file)

```markdown
## CONSTRAINTS (APPLY TO EVERY PHASE)

API (non-negotiable):
- createCloudEvent param is 'eventType' not 'type'
- validateCloudEvent returns [boolean, string[]] — always destructure
- DataProcessResult.failure requires TWO arguments
- No FabricType.SCOPED_MEMORY — use FabricType.CORE
- Named checks: ONLY use keys that EXIST in validate.handler.ts — read file first.

Fixture format:
- {slug}-design-decisions.json is a JSON ARRAY
- curriculumTier: 1 — int, not string
- qualityScore: 0.93 — float, not string
- appliesTo: ["FLOW-NN"] — JSON array, not string
- RAG fixtures do NOT have 'summary' or 'antiPattern' fields

Do not duplicate {slug}.e2e.spec.ts if it exists.
Branch is claude/vigorous-margulis only. Phase stops are absolute.

---

## ISSUE INVENTORY FORMAT

Before every STOP:
```
ISSUE INVENTORY:
  ISSUE-NNN: <description> → FIXED | DEFERRED (reason) | EXCEPTION (approval)
```
If no issues: ISSUE INVENTORY: NONE

---

## DELIVERY SUMMARY FORMAT

```
DELIVERY SUMMARY
================
Phase 1: fixtures/design-reasoning/{slug}-design-decisions.json ([N] DR-XX-01..NN)
         fixtures/rag-patterns/: [N] files ([N] ARCH_PATTERN + [N] PLAN_EXEMPLAR)

Phase 2: fixtures/contracts/t[NNN]..t[NNN+M].contract.json ([N] contracts)
         fixtures/flow-definitions/{slug}-*.topology.json ([N] topologies)
         fixtures/arbiters/{slug}-arbiters.bulk.ndjson ([N] arbiters)
         fixtures/event-schemas/{slug}/ ([N] schemas)

Phase 3: rag-benchmark/seed_{slug_under}_patterns.py — dry-run: [N] records, 0 errors

Phase 4: server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts
         DC-01..DC-10: 10 tests, 0 failures

Phase 5: client/e2e/teaching-pipeline.spec.ts extended with SEED-[NN+1]..SEED-[NN+5]

Phase 6: client/e2e/topology/{slug}-topology-qa.spec.ts — TVQ-01..TVQ-08, 8 tests, 0 failures

Test delta: +10 server tests (proper-flow)
Failures: 0
Commit: <hash>
```
```

---

## KEY RULES FOR ALL PHASES

1. Read design simulation COMPLETELY before writing any record.
   Every DR teachingPoint, positiveExample, negativeExample, and discriminatingConstraint
   comes from the simulation — not invented.

2. Named checks only from validate.handler.ts.
   Read the file first. Wrong keys cause silent mis-grading.

3. JSON ARRAY format for DR fixtures.
   Most common error: writing {"decisions": [...]} instead of bare array [...].

4. scope_isolation LAST in arbiters NDJSON.
   FC-32 requires it last. Any record authored after it reorders it — violation.

5. SEED number continuity.
   Check last SEED before adding SEED-NN+1. Resolve with Luba if unexpected.

6. Do not duplicate existing {slug}.e2e.spec.ts tests.
   Run grep "it(" on it first. Proper-flow spec covers CONTRACT-LEVEL tests only.

---

## ACCEPTANCE CRITERIA

- [ ] File header: MAINTENANCE session type, Claude Code consumer
- [ ] Session preamble: lists all missing fixtures, new patterns, SEED continuity note
- [ ] Cold start: reads format references before any phase
- [ ] Design references: all key decisions listed, API constraints inlined
- [ ] Phase 1: DR records derive from simulation; JSON ARRAY; int/float types
- [ ] Phase 2: scope_isolation LAST in NDJSON; named checks verified against validate.handler.ts
- [ ] Phase 3: seed script mirrors flow-02 CLI interface; dry-run output documented
- [ ] Phase 4: 10 DC tests; contracts loaded from fixture files (not hard-coded)
- [ ] Phase 5: SEED continuity checked; graceful-skip pattern mirrored
- [ ] Phase 6: TVQ-01..TVQ-08; topology-fixtures.ts entry added
- [ ] Constraints block present at end
- [ ] Delivery summary template present
- [ ] Every phase ends with STOP

---

End of GUIDE-B18 — FLOW-XX-TEACH-QA-R0.md
List A sources: ZIP-02 (LIBRARY-5-TEACH-QA), ZIP-01 (AUTHORING-GUIDE v1.15 §Document 2),
ZIP-11 (FLOW-07/09/10/25/36 TEACH-QA-R0 examples), ZIP-09 (DR fixture format),
ZIP-08 (RAG pattern fixture format), ZIP-16 (flow business spec)
Target B-type: B-18 — FLOW-XX-TEACH-QA-R0.md
Round: 28 of 72
