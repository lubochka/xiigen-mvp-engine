---
name: flow-examination
sk_number: SK-438
version: "2.0.0"
priority: BLOCKING
author: luba
updated: "2026-03-23"
description: >
  Systematic methodology for examining any FLOW-XX reference plan and producing
  three mandatory deliverables before Phase A can begin:
  SESSION-FLOW-XX-MASTER.md, FLOW-XX-MISSING-INFRASTRUCTURE.md, FLOW-XX-LEARNING-SPEC.md.
  v2.0: Complete rewrite for executability. Every bash command must be copy-pasteable.
  Every gap gets a BUILD spec, not a STOP instruction. 3 Phase B execution paths.
  Source: FLOW-EXAMINATION-PROMPT-v2.md (applied from 2026-03-23).
triggers:
  - "examine flow"
  - "prepare FLOW-XX"
  - "what does FLOW-XX need"
  - "produce session master"
  - "examine FLOW"
  - "start FLOW-NN examination"
---

# flow-examination v2.0

## Purpose

Every FLOW-XX needs a full examination before its Phase A (INJECT) begins.
v2.0 produces documents that Claude Code can **execute** — every bash command
must be copy-pasteable, every JSON block has exact field names, every infrastructure
gap has a BUILD spec (not a "STOP" instruction).

**The result of a correct examination:** Claude Code has exact fixture JSON to author
(no guessing), knows what a passing trace looks like, knows what a failing trace
looks like, and can fix failures without research.

---

## When to Invoke

Auto-fire when:
- A FLOW-XX reference plan document is submitted for examination
- The user says "examine FLOW-XX", "prepare FLOW-XX", or "what does FLOW-XX need"
- A new flow planning session begins (before any fixture authoring)

**This skill runs BEFORE the **flow-plan-review** skill.** flow-plan-review validates a plan
document; **flow-examination** creates the three deliverable documents from that plan.

---

## Step 1 — Extract From the Reference Plan (34 Items)

Read the reference plan in full. Extract each item below.
If any item is missing from the plan, note it immediately as a gap.

```
□ implementationMode, stackTargets, clientTargets
□ Wave, prerequisites, downstream flows + gate events
□ Task types (T-range), factories (F-range), BFA rules (CF-range), family, new archetypes
□ Service file names per task type (naming-conventions-enforcer Rule 1)
□ All genesis prompts — Sections 1–4 per task type
□ Iron rules per task type (count + full text with IDs: IR-1 through IR-N)
□ Quality gates: if explicit table → extract; if none → derive 1 QG per iron rule
□ All AF prompts (4 per task type: genesis, review, compliance, judge)
□ Stack coupling annotations (V29 CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED)
□ V30 INCOMPATIBLE stacks per task type
□ V31 client stateNotes (react-web:client only per P13)
□ Client architecture: backgroundSteps, offlineQueue
□ Arbiter coupling annotations — extract named check IDs
□ Phase A gate bash commands (NEW-A1 through NEW-A7)
□ Phase B gate (P5 metrics: quality, cost, latencyMs, retryCount, dpoTriples, modelUsed)
□ Phase C gate (score bands with named actions)
□ Phase D gate (lint naming rules, test count delta)
□ Phase E gate (INJECTED promotion, DPO minimum count, lifecycle ACTIVE)
□ Client state map (screens, SLA, optimisticActions, appReopenBehavior per topology node)
□ E2E test matrix (scenario count, virtualClock tests)
□ Event schemas (count, CONSUMES/EMITS per task type — exact event names)
□ Prerequisite documents ("see vN for full content" → flag as required attachment)
□ (FLOW-02+) Cross-flow CONSUMES events: verify name matches upstream EMITS exactly
□ Gate event declaration (ORCHESTRATION archetype only)
```

---

## Step 2 — Verify Against Canonical Docs

Cross-check what the reference plan says against the canonical project knowledge:

```
□ TASK_TYPES_CATALOG_MERGED.md:
  Extract per task type: archetype, factory dependencies with fabric resolution,
  iron rules (use canonical count if plan and catalog differ), quality gates,
  BFA registration, MACHINE/FREEDOM split

□ ENGINE_ARCHITECTURE_MERGED.md:
  Extract per factory: interface name, fabric, provider, methods, DNA compliance

□ V62_BFA_STRESS_TEST_MERGED.md:
  Extract per CF-range rule: trigger, conflict, resolution, severity

□ MASTER_EXECUTION_PLAN_MERGED.md:
  Verify: phase structure, artifacts per phase, test deltas
```

If plan and catalog disagree: flag the discrepancy. Use canonical catalog as authoritative.

---

## Step 3 — Infrastructure Audit

Check what the current codebase has vs what THIS FLOW requires:

```
□ ES indices — does each required index exist?
□ EngineContract schema — do handlers[], arbiters[], gateEvent fields exist?
□ All 6 node handlers present with NAMED_CHECKS registry in validate.handler?
□ GenericNodeExecutor handles action_on_hold: "checkpoint_report"?
□ PromptLibraryStation — 3-tier resolution implemented?
□ FlowStateSnapshot — write path + GET /api/flow/:flowId/state implemented?
□ PromptOps loop — in feedback.handler for sub-80 scores?
□ DPO triple — full context format (prompt, RAG patterns, code, violations)?
□ Event schema files in fixtures/event-schemas/[FLOW-XX]/
□ Any NEW node handler types this flow introduces?
□ (FLOW-02+) New named checks required by new archetypes?
□ (FLOW-02+) Background async push infrastructure if flow has deferred tasks?
```

**Definition of "missing" (a feature is missing if ANY is true):**
1. Fixture JSON references a field that has no TypeScript type in the schema
2. Topology node references a config key that the handler can't read
3. Phase gate command references an ES index with no mapping definition
4. Phase E action requires an endpoint that doesn't exist
5. Client stateNotes reference an endpoint not yet implemented
6. DPO triple format missing fields needed for fine-tuning
7. An arbiter's `check` value is not in validate.handler NAMED_CHECKS registry

---

## Output: Three Documents

**⛔ Do NOT produce SESSION-FLOW-XX-A.md (execution files) until all three examination
documents are reviewed and approved by the user.**

---

### Document 1: `SESSION-FLOW-XX-MASTER.md`

**Header:**
```
# SESSION-FLOW-XX-MASTER.md
## FLOW: FLOW-XX — [Name]
## Date: [date]
## Source: [REFERENCE_PLAN] + canonical docs
## Status: DRAFT — review before executing
```

#### Section 1: INFRASTRUCTURE DECISION TREE

Write a decision tree Claude Code follows — NOT "check if X exists, if not stop."
Every FAIL condition has a BUILD instruction:

```
The session starts here. Run each check. If it fails, follow the BUILD instruction.
Only proceed to Phase A after ALL checks pass.

CHECK 1: P26 kernel fixes
  Test:
    node -e "
      const path = require('path');
      try {
        const { TenantKeyGenerator } = require(path.resolve('packages/kernel/src/mt/tenant-key-generator'));
        const id = TenantKeyGenerator.generateDocId('test-tenant');
        if (!id.startsWith('test-tenant::')) throw new Error('wrong format');
        console.log('PASS');
      } catch (e) { console.log('FAIL: ' + e.message); }
    "
  If PASS: proceed to CHECK 2
  If FAIL: Execute SESSION-P26-S1.md. Return here after completion.

CHECK 2: ES indices (run ALL — any failure = FAIL)
  Test:
    curl -sf http://localhost:9200/xiigen-prompts/_mapping > /dev/null && echo "PASS: xiigen-prompts" || echo "FAIL: xiigen-prompts"
    curl -sf http://localhost:9200/xiigen-rag-patterns/_mapping > /dev/null && echo "PASS: xiigen-rag-patterns" || echo "FAIL: xiigen-rag-patterns"
    curl -sf http://localhost:9200/xiigen-engine-contracts/_mapping > /dev/null && echo "PASS: xiigen-engine-contracts" || echo "FAIL: xiigen-engine-contracts"
    curl -sf http://localhost:9200/xiigen-flow-definitions/_mapping > /dev/null && echo "PASS: xiigen-flow-definitions" || echo "FAIL: xiigen-flow-definitions"
    curl -sf http://localhost:9200/xiigen-run-traces/_mapping > /dev/null && echo "PASS: xiigen-run-traces" || echo "FAIL: xiigen-run-traces"
  If ALL PASS: proceed to CHECK 3
  If ANY FAIL: Build missing indices. Exact mappings are in Section "INDEX MAPPINGS" of the session document.

CHECK 3: Node handlers
  Test:
    for h in rag-retrieve decompose ai-generate validate score feedback; do
      test -f "server/src/engine/node-handlers/${h}.handler.ts" && echo "PASS: ${h}" || echo "FAIL: ${h}"
    done
  If ALL PASS: proceed to CHECK 4
  If ANY FAIL: BLOCKER. Do not attempt to build handlers in this session.
    Create file: INFRA-BLOCKER.md with list of missing handlers. ⛔ STOP this session.

CHECK 4: GenericNodeExecutor
  Test:
    test -f "server/src/engine/generic-node-executor.ts" && echo "PASS" || echo "FAIL"
  If PASS: proceed to CHECK 5
  If FAIL: BLOCKER — same as CHECK 3. Create INFRA-BLOCKER.md. ⛔ STOP.

CHECK 5: API health
  Test:
    curl -sf http://localhost:3000/api/health | jq '.status' 2>/dev/null || echo "FAIL: server not running"
  If FAIL: Start the dev server: cd server && npm run start:dev. Then test again.

CHECK 6: (FLOW-02+ only) Upstream flow ACTIVE
  Test:
    curl -sf "http://localhost:9200/xiigen-flow-lifecycle/_doc/[UPSTREAM_FLOW_ID]" \
      | jq -r '._source.status' 2>/dev/null
    # Must output: "ACTIVE"
  If FAIL: Upstream flow has not completed. Cannot proceed. ⛔ STOP.

CHECK 7: Test baseline
  Run:
    cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|Test Suites:" | tail -2
  Record the numbers in STATE.json as test_baseline. NOT pass/fail — measurement.

All checks passed → proceed to Phase A.
```

#### Section 2: CANONICAL FIXTURE JSON SCHEMAS

Every examination uses these exact field names. Fill values from the reference plan:

**Contract schema:**
```json
{
  "taskTypeId": "T__",
  "taskName": "___",
  "flowId": "FLOW-__",
  "domainId": "___",
  "archetype": "SERVICE | ORCHESTRATION | CONVERGENCE | BROADCAST | PARALLEL",
  "version": "1.0.0",
  "serviceFileName": "___.service.ts",
  "className": "___",
  "entry": {
    "type": "HTTP | EVENT",
    "trigger": "POST /path | EventName (from FLOW-XX TYY)"
  },
  "factoryDependencies": {
    "F___": {
      "interface": "I___Service",
      "fabric": "DATABASE | QUEUE | AI_ENGINE | RAG | SECRETS | FLOW_ENGINE",
      "provider": "___",
      "scope": "INJECTABLE | PLATFORM_ONLY"
    }
  },
  "ironRules": [
    { "id": "IR-1", "rule": "___", "violation": "score-0 | BUILD_FAILURE",
      "positiveExample": "___", "negativeExample": "___" }
  ],
  "qualityGates": [
    { "gate": "___", "weight": 0.0, "threshold": 0.0, "description": "___" }
  ],
  "events": {
    "consumes": ["EventName (from FLOW-XX TYY)"],
    "emits": ["EventName"],
    "compensates": ["EventName"],
    "gateEvent": "EventName (if this event unlocks downstream flows) | null"
  },
  "bfaRules": ["CF-N"],
  "arbiters": ["namespace::name"],
  "handlers": [
    {
      "name": "methodName",
      "description": "what this method does",
      "ironRuleRefs": ["IR-N"],
      "isPublic": true,
      "returnType": "DataProcessResult<T>"
    }
  ],
  "stackCoupling": {},
  "_reference": { "flow": "FLOW-__", "family": 0, "wave": 0 }
}
```

**Fixture file naming — MANDATORY:**
```
Contracts:     fixtures/contracts/{service-name}.contract.json
Prompts:       fixtures/prompts/{domain}--{service-name}--{role}--v{N}.prompt.json
RAG patterns:  fixtures/rag-patterns/{business-capability}--{pattern}.service.json
               fixtures/rag-patterns/{conflict-name}--{resolution}.conflict.json
Topologies:    fixtures/flow-definitions/{service-name}.topology.json
Arbiters:      fixtures/arbiters/{namespace}--{check-name}.arbiter.json
Event schemas: fixtures/event-schemas/{domain}/{event-name}.event.json

NEVER use task type IDs (T47), factory IDs (F174), or flow IDs (FLOW-01) in filenames.
Internal references go inside _reference blocks.
```

#### Section 3: PHASE A — INJECT

For each task type, produce the COMPLETE JSON — not a template, the actual JSON
with every field filled in from the reference plan.

Phase A ends with seed commands:
```bash
# Seed all fixtures (if EngineBootstrapper exists)
npx ts-node server/src/bootstrap/engine-bootstrapper.ts --only=all

# If EngineBootstrapper doesn't exist yet, seed manually via curl:
for f in fixtures/contracts/*.contract.json; do
  curl -sf -X POST "http://localhost:9200/xiigen-engine-contracts/_doc/$(jq -r '.taskTypeId' $f)" \
    -H "Content-Type: application/json" -d @"$f" && echo "Seeded: $f" || echo "FAILED: $f"
done

# (same pattern for prompts, rag-patterns, flow-definitions, arbiters, event-schemas)

# Verify counts
curl -sf "http://localhost:9200/xiigen-engine-contracts/_count" | jq '.count'
# Expected: [N task types]
curl -sf "http://localhost:9200/xiigen-prompts/_count?q=flowId:[FLOW_ID]" | jq '.count'
# Expected: [N × 4]
```

**The curl fallback is not optional documentation — Claude Code uses it when EngineBootstrapper doesn't exist yet.**

#### Section 4: PHASE B — GENERATE (3 Execution Paths)

**Claude Code must determine which path applies and follow it:**

```
Path A — API endpoint exists:
  curl -sf -X POST "http://localhost:3000/api/flow/execute" \
    -H "Content-Type: application/json" \
    -H "X-Tenant-Id: test-tenant-001" \
    -d '{"taskTypeId": "T__", "tenantId": "test-tenant-001"}' \
    | jq '.runId'

Path B — GenericNodeExecutor exists but no API endpoint:
  # Create one-time script: scripts/run-flow-[FLOW_ID]-T__.ts
  import { GenericNodeExecutor } from '../engine/generic-node-executor';
  const executor = new GenericNodeExecutor(/* injected */);
  const result = await executor.execute('T__', 'test-tenant-001');
  console.log(JSON.stringify(result, null, 2));

Path C — GenericNodeExecutor does NOT exist:
  ⛔ BLOCKER: GenericNodeExecutor missing.
  Create INFRA-BLOCKER.md listing this finding. ⛔ STOP.
```

After execution, observe the trace:
```bash
# Path A (trace API):
curl -sf "http://localhost:3000/api/runs/${RUN_ID}/trace" | jq '.'

# Path B (no trace API — read from ES directly):
curl -sf "http://localhost:9200/xiigen-run-traces/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"runId":"'${RUN_ID}'"}}}' \
  | jq '.hits.hits[]._source'
```

#### Section 5: EXPECTED TRACE (per task type)

For each task type, produce EXACT expected values per node:

```
EXPECTED TRACE: T__ {TaskName}

n1 (Retrieve prompts):
  PASS if: result.prompts.length == 4
           result.prompts[0].role == "genesis"
           result.prompts[0].version == "1.0.0"
  FAIL if: result.prompts.length == 0 → xiigen-prompts index empty
  FAIL if: result.prompts.length < 4 → some roles not seeded

n2 (Retrieve patterns):
  PASS if: result.patterns.length >= 3
           result.patterns[0].tags includes "[relevant tag from fixture]"
  FAIL if: result.patterns.length == 0 → xiigen-rag-patterns index empty
  FAIL if: top pattern irrelevant → fixture tags need domain-specific terms

n3 (Decompose):
  PASS if: result.steps includes EXACT method names: [list from handlers[]]
  FAIL if: steps are generic ("processRequest") → method_source config wrong

n4 (Generate code):
  PASS if: generated code contains ALL of these EXACT patterns:
           [list: "SETNX", "storeDocument.*BEFORE.*enqueue", "config.get(", etc.]
  FAIL if: code doesn't compile
  FAIL if: missing SETNX → genesis prompt needs explicit code example for IR-6

n5 (DNA check):
  PASS if: all 9 DNA patterns pass
  FAIL if: DNA-7 fails → generated code has no idempotency key
  FAIL if: DNA-8 fails → enqueue before storeDocument

n6 (Iron rules + arbiters):
  PASS if: all [N] iron rules PASS, all [N] arbiters PASS
  For each IR: exact PASS criteria, exact FAIL symptom, exact fix action
  For each arbiter: same

n7 (Score):
  PASS if: score >= 0.70 (cycle 1), >= 0.85 (cycle 2-3)
  Score breakdown: [each quality gate, weight, expected result]

n8 (Feedback):
  PASS if: all 6 P5 metrics captured (quality, cost, latencyMs, retryCount, dpoTriples, modelUsed)
```

#### Section 6: WHEN GENERATION FAILS — DECISION TREE

```
Find the first failing node in the trace.

n1 FAILED (no prompts):
  → Phase A seeding incomplete. Re-run seed commands from Section 3.

n2 FAILED (no patterns):
  → RAG fixture tags don't match query. Add domain-specific tags, re-seed.

n3 FAILED (wrong decompose / generic steps):
  → decompose.handler missing template for this archetype.
    CRITICAL: requires handler code change, not prompt fix.

n4 FAILED (code doesn't compile):
  → genesis prompt missing import examples or wrong class structure.
    Fix: add explicit import + class structure. Bump version v1.0.0 → v1.1.0.
    Re-seed prompt, re-run Phase B for this task type only.

n5 FAILED (DNA violation):
  → Add POSITIVE + NEGATIVE example for failing DNA pattern to genesis prompt.
    Bump version, re-seed, re-run.

n6 FAILED (iron rule / arbiter violation):
  → Add explicit code example for failing rule to genesis prompt.
    Bump version, re-seed, re-run.
    If same rule fails after 3 cycles: ESCALATE (handler issue, not prompt).

n7 FAILED (score < threshold):
  → Score 60-69: apply n4/n5/n6 fixes above, re-run (**promptops-cycle**)
  → Score < 60: STOP. Create ESCALATION.md with full trace + generated code.

n8 FAILED (metrics not captured):
  → feedback.handler not writing to ES. Check handler implementation.

AFTER ANY FIX: re-run Phase B for the affected task type ONLY.
```

#### Section 7: PHASE C, D, E

Each cycle must produce a CYCLE REPORT:
```
CYCLE REPORT — T__ cycle [N]
  Score: [X]
  DNA: [N]/9 pass
  Iron rules: [list PASS/FAIL per rule]
  Arbiters: [list PASS/FAIL per arbiter]
  Changes made: [what was fixed since last cycle]
  DPO: [captured/not captured]
  Next: [promote | retry with patch X | escalate]
```

Phase D:
```bash
npm run lint:naming
# Must exit 0

cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|Test Suites:" | tail -2
# Expected: baseline + [delta from reference plan]
```

Phase E:
```bash
for tt in T__ T__ T__; do
  curl -sf -X POST "http://localhost:3000/api/promotion/promote" \
    -H "Content-Type: application/json" \
    -d "{\"taskTypeId\":\"${tt}\",\"level\":\"INJECTED\",\"tenantId\":\"test-tenant-001\"}"
done

# Verify DPO triples
curl -sf "http://localhost:9200/xiigen-training-data/_count?q=flowId:[FLOW_ID]" | jq '.count'
# Expected: >= [minimum from reference plan]

# Set flow status ACTIVE
curl -sf -X PUT "http://localhost:9200/xiigen-flow-lifecycle/_doc/[FLOW_ID]" \
  -H "Content-Type: application/json" \
  -d '{"flowId":"[FLOW_ID]","status":"ACTIVE","completedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'

curl -sf "http://localhost:9200/xiigen-flow-lifecycle/_doc/[FLOW_ID]" | jq '._source.status'
# Must output: "ACTIVE"
```

---

### Document 2: `FLOW-XX-MISSING-INFRASTRUCTURE.md`

One entry per gap from Step 3. Format:
```markdown
### GAP-NN: {Feature Name}

**What it is:** one paragraph — feature description

**What breaks without it:** bullet list — which phase gates fail, which scores are wrong

**Build spec:**
  File to create: {exact path}
  Interface/type: {exact TypeScript}
  Curl to verify: {exact curl command that returns success after building}
  [If 50 lines of TypeScript needed — include all 50 lines]

**Priority:** BLOCKER | CRITICAL | IMPORTANT
  BLOCKER   = phase cannot start without this
  CRITICAL  = phase completes with wrong results
  IMPORTANT = quality or training data degraded

**Found in previous flow:** Yes (GAP-NN) / No
```

**Every gap must have a BUILD SPEC specific enough that Claude Code can create
the file without reading any other document.**

End with:
1. Summary table (Gap | Name | Tier | Blocks | Also needed by)
2. Implementation order (dependency chain)
3. "What is NOT missing" section

---

### Document 3: `FLOW-XX-LEARNING-SPEC.md`

Sections:
- Domain Input (plain-English description — NO plan details)
- New Patterns This Flow Introduces (table: Pattern | What it teaches | First task type)
- Level 2 Expected Output (per planning station: analyze-domain, decompose-flow, validate-plan)
- Level 1 Expected Output (per task type, per node: expected output + pass criteria + fail criteria + fix)
- Adaptation Map (Failure type | Root cause | File to fix | How)
- DPO Training Data Spec (minimum triples, contrast pair source, learning signal)
- Flow Completion Criteria (exact measurable numbers for Level 2 and Level 1)

---

## Examination Rules (v2.0 — 15 Rules)

1. **Canonical docs over reference plan** — if plan says 7 iron rules, catalog says 6: use 6, flag discrepancy
2. **Complete fixtures** — no placeholder fields; if a value is unknown, state it as a gap
3. **Negative scenarios name the node** — "n6 validate iron-rules FAIL: IR-3 hardcoded TTL" not "code has hardcoded TTL"
4. **Gaps have BUILD spec** — ES mapping + handler logic + API spec + curl verify, not just "index is missing"
5. **Gaps revealed by writing fixtures** — attempt to write contract.json with arbiters[] field; if no schema exists → gap
6. **Positive + negative examples mandatory** — every iron rule in genesis prompt needs both
7. **Score bands = actions** — "run **promptops-cycle**, add IR-3 NEGATIVE EXAMPLE" not "may have an issue"
8. **Hardest test written explicitly** — T48 virtualClock 25h expiry, T49 gate-event guard on partial wizard
9. **Quality gates derived if missing** — if reference plan has no explicit QG table, derive 1 QG per iron rule with weight = 1/N
10. **Exact event name match** — CONSUMES name must match upstream EMITS name character-for-character
11. **Decision tree, not checklist** — infrastructure check → PASS → proceed | FAIL → BUILD instruction
12. **Every bash command must be copy-pasteable** — no pseudo-code, no `/* ES client */`, use curl for ES, node -e for JS
13. **Infrastructure gaps get BUILD specs, not STOP instructions** — STOP only for blockers requiring a dedicated session
14. **Phase B handles 3 execution paths** — Path A (API exists), Path B (executor only), Path C (BLOCKER report)
15. **Every fixture file has complete JSON** — actual values, ready to write to disk; if unknown → `"__FILL_FROM_CATALOG__"`

---

## Pre-Submission Checklist

Before submitting the three documents:
```
□ Every bash command runs without modification (no pseudo-code)
□ Every JSON file has exact field names matching canonical schemas
□ Every fixture filename uses business capability, not internal IDs
□ Infrastructure decision tree has BUILD path for every FAIL condition
□ Phase B has all 3 execution paths (API / script / BLOCKER)
□ Expected trace has EXACT values per node (not descriptions)
□ Failure decision tree names the failing node AND the fix action
□ Phase E includes curl commands to set flow status ACTIVE
□ (FLOW-02+) Cross-flow event names verified character-for-character
□ (FLOW-02+) Upstream flow ACTIVE check included as CHECK 6
□ Every iron rule has positive + negative example in genesis prompt
□ Quality gates present (explicit or derived)
□ Cycle report template included in Phase C section
□ Every gap has BUILD spec with exact file paths and TypeScript
□ Missing infrastructure doc ends with "What is NOT missing" section
```

---

## What Changes Per Flow

| Item | Where to find | FLOW-01 example |
|------|--------------|----------------|
| Task types | ARTIFACT NUMBERS | T47, T48, T49 |
| New archetypes | "New archetypes" line | ROUTING, WAIT_STATE, ORCHESTRATION |
| Factory range | ARTIFACT NUMBERS | F174–F181 |
| CF range | ARTIFACT NUMBERS | CF-1–CF-8 |
| Arbiter names | ARBITER COUPLING ANNOTATIONS | routing::auth-security, etc. |
| Client test delta | STATE.json | 19 (C1:6 C2:6 C3:4 C4:3) |
| DPO minimum | Phase E gate | 3 triples |
| Wave | WAVE ASSIGNMENT | 0 (sequential, blocks FLOW-02) |
| Downstream flows | T49 CRITICAL section | FLOW-02/03/04/05 |
| virtualClock tests | Test matrix | T48 — 25h expiry |
| INCOMPATIBLE stacks | V30 section | T48: php-wordpress:server |
| backgroundSteps | client architecture section | T51 Bull job deferred match |
| New named checks | arbiter coupling annotations | 5 new checks for FLOW-02 |

---

## Hard Rules

- NEVER skip Step 3 (infrastructure audit) because "the flow is similar to a previous flow"
- NEVER leave placeholder values in fixture JSON — every field must have a real value
- NEVER produce execution session files (SESSION-FLOW-XX-A.md) before the three examination documents are approved
- NEVER use "TBD" or "see reference plan" as an answer to any required field
- NEVER accept a genesis prompt without POSITIVE EXAMPLE and NEGATIVE EXAMPLE for every iron rule
- NEVER write "STOP" for a gap that could have a BUILD spec — only write STOP for blockers requiring a dedicated infrastructure session
- NEVER produce bash commands with pseudo-code — every command must be copy-pasteable and runnable
