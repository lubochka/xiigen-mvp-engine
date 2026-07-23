# XIIGEN SESSION START PROMPT — v4.0
## Updated: 2026-03-26 | Supersedes: v3.0 (2026-03-26)
## What changed: SK number corrected (SK-461 → SK-492); QA session type added;
##               URGENT skill tier listed; BUG list updated; v3.0.0 skill index

---

## H0 — HUMAN OVERRIDE PROTOCOL (ALWAYS WINS)

```
1. Luba's direct instruction in this conversation      ← ALWAYS WINS
2. Memory updates made in this conversation
3. Skills, governance rules, FC checks, V-gates
4. Claude's training defaults
```

Contradiction between levels 1 and 3:
**Step 1**: Execute the instruction completely.
**Step 2**: State the contradiction in one sentence.
**Step 3**: Ask: one-time exception or permanent skill update?

---

## SESSION TYPE CLASSIFICATION

Classify before applying any governance rule:

**GENERATION:** producing flow phases, service code, topology contracts
→ Full governance. SK-457 preflight first. ⛔ STOP after each phase.

**PLANNING:** designing flows, reviewing plans, producing session files
→ Plan gates apply. Present plan. Await "yes" before session files. SK-459 at ⛔ STOP.

**MAINTENANCE:** fixing files, updating skills, creating zips, docs
→ Execute directly. SK-440 blast radius first. One ⛔ STOP at end.

**INVESTIGATION:** gap analysis, simulation, diagnosis
→ Analysis pipeline. SK-441 trace → SK-434 classify → SK-432 root cause. SK-459 at ⛔ STOP.

**DEBUG:** specific failing test or broken command
→ Load SK-484 (codebase-state-baseline) FIRST. Establish known state.
→ Load the failing file directly. Fix it. SK-459 if bugs resolved.
→ If test failures: load SK-473 (test-failure-triage) — classify before acting.

**QA:** validating a delivered phase against acceptance criteria
→ Load SK-481 (qa-session-type). Run acceptance criteria checks.
→ Produce QA REPORT (APPROVED or DEFECTS_FOUND). One ⛔ STOP at end.
→ OPTIONAL for Wave 0/1. REQUIRED before Phase E DPO capture.

---

## CURRENT STATE

Read: `SESSION-STATE-SNAPSHOT--[latest date].md`
If absent: state UNKNOWN. Ask Luba for current execution position.
For session scope: load `planning--session-scope-resolution-SKILL.md` (SK-460).

---

## DOCUMENT QUICK-FIND

```
Execution position:    SESSION-STATE-SNAPSHOT--[latest].md
Session scope:         planning--session-scope-resolution-SKILL.md (SK-460)
Prerequisite checks:   planning--prerequisite-chain-SKILL.md (SK-458)
Governance:            HOW-TO-USE-SKILLS-v2.3.0.md (v2.6.0 pending)
Reference content:     RAG query protocol (below) — do NOT load wholesale
Phase B score:         code-execution--score-interpretation-SKILL.md (SK-471)
PromptPatch:           code-execution--prompt-patch-authoring-SKILL.md (SK-472)
Test failures:         code-execution--test-failure-triage-SKILL.md (SK-473)
Score-0:               code-execution--score-zero-investigation-SKILL.md (SK-475)
```

---

## REFERENCE CONTENT QUERY PROTOCOL

Reference documents are NOT loaded at session start. Query RAG instead:

```bash
# Flow status
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"bool":{"filter":[{"term":{"patternType.keyword":"FLOW_STATUS"}},{"term":{"flowId.keyword":"FLOW-01"}}]}}}' \
  | jq '.hits.hits[]._source | {flowId, status, notes}'

# Architecture decisions
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}}}' \
  | jq '.hits.hits[]._source | {id, decision, rationale}'
```

Loading COMMUNITY-GAP-REGISTER in full = wrong pattern.
Loading XIIGEN-RAG-REFERENCE in full = wrong pattern.
Loading EXTENSION-PLAN phase details = load SK-458 instead.

---

## ALWAYS-ACTIVE GOVERNANCE RULES

### 1. Before every ⛔ STOP (all session types)

```bash
# Output contract verification (SK-448)
# Mission progress (SK-445) — output is FIRST section
# Issue inventory (FC-29) — FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION only
# Test gate — ABSOLUTE (P19)
cd server && npx jest 2>&1 | tail -5   # failures must === 0
```

### 2. Found-issue protocol

1. STOP at point of discovery
2. Record: Issue | Severity | Root cause | Fix or Escalate
3. BLOCKING: fix before next step
4. NON-BLOCKING: fix before ⛔ STOP
5. POST-FIX: grep for old value → 0 hits before marking FIXED

### 3. Golden Rule

Every review finding is a symptom of a missing guard.
Fix the instance AND add the structural guard that prevents recurrence.

---

## KNOWN BUGS (current as of 2026-03-26)

```
BUG-1: Phase B must loop up to cycle budget (not one run)
BUG-2: DESIGN_REASONING queries must use flowId.keyword, not planId.keyword
BUG-3: FLOW-01 = 3 point-to-point events; FLOW-02+ = 1 wave gate
BUG-4: Gate STATE.json must pre-populate taskTypeCycleBudgets (not {})
BUG-5: Phase B writes T*_CYCLES flat AND generation_results (Phase C reads flat)
BUG-6: 3 corrupt DPO triples in ES (curriculumTier=null, same-model) — delete before re-run
BUG-7: xiigen-shadow-runs not initialised — create placeholders for T47/T48/T49
BUG-8: arbiterConfig missing from T47/T48/T49 contracts — add before Phase B re-run
BUG-9: Execute format broken in FLOW-02/03/04 session files
       Correct: {contract:<full ES object>, inputs:{}, tenantId, projectId}
```

---

## KEY COMMANDS

```bash
# Delete corrupt Phase B triples (BUG-6)
for ID in 038e6382-db46-46e8-a154-584b6e4aea84 635a6ec5-c820-47cd-a256-0ebf08a1199c ba631db6-0b89-4af7-a34b-9db8904c9a9f; do
  curl -X DELETE localhost:9200/xiigen-training-data/_doc/${ID} | jq .result; done

# Initialise shadow run placeholders (BUG-7)
for TT in T47 T48 T49; do
  if [ "${TT}" = "T47" ]; then TIER=1; elif [ "${TT}" = "T48" ]; then TIER=5; else TIER=4; fi
  curl -X POST localhost:9200/xiigen-shadow-runs/_doc \
    -H "Content-Type: application/json" \
    -d '{"taskTypeId":"'${TT}'","flowId":"FLOW-01","gapScore":null,"shadowStatus":"PENDING_LOCAL_MODEL","archetypeTier":'${TIER}'}'
done

# Execute task type — correct format (BUG-9 fix)
CONTRACT=$(curl -sf localhost:9200/xiigen-engine-contracts/_doc/T47 | jq ._source)
curl -X POST localhost:3000/api/flow/execute \
  -H "Content-Type: application/json" -H "X-Tenant-Id: xiigen-community" \
  -d '{"contract":'${CONTRACT}',"inputs":{},"tenantId":"xiigen-community","projectId":"xiigen-community"}'

# Score bracket quick classifier
python3 -c "s=float(input('score: ')); print('PRESCRIPTIVE' if s>=0.90 else 'PASS' if s>=0.85 else 'DETAIL_GAP' if s>=0.65 else 'PATTERN_MISSING' if s>=0.50 else 'STRUCTURAL')"

# Verify judge model (D-EXT-009)
curl -H "X-Tenant-Id: xiigen-community" localhost:3000/api/engine/status | jq .data.judgeModel

# Check machine constants leak (FC-31)
grep -rn "deepseek\|gpt-4\|claude-opus\|claude-sonnet\|gemini-pro\|api\.anthropic\.com" \
  .claude/skills/ fixtures/ contracts/ \
  | grep -v "FREEDOM config\|xiigen\.\|default:\|# Expected\|# Check\|freedomConfig\.get" \
  | grep -v ".spec."
```

---

## ARCHITECTURAL PRINCIPLES (always active)

**D-EXT-003:** Execute API uses `projectId + runtimeHints`. No `stack` label string.

**Mechanism-first contracts:** `stackCoupling` has `{mechanism, tier, fabricInterface,
freedomConfigKey, neutralConcepts}`. No `'node-nestjs'` or `'php-wordpress'` keys.

**IScopedMemoryService** (not IRedisService)
**ISchedulerService** (not Bull directly)
**ICodeRepositoryService** (not GitHub MCP)
**flowId.keyword** (not planId.keyword) for DESIGN_REASONING RAG queries

**Nine DNA patterns enforced:** dict-only payloads, BuildSearchFilter, DataProcessResult,
MicroserviceBase, scope_id isolation, DynamicController, idempotency keys,
outbox-before-queue, CloudEvents envelope.

---

## SKILLS GOVERNANCE

Active version: `HOW-TO-USE-SKILLS-v2.3.0.md`
Skill index: `FLOW-DESIGN-SKILL-INDEX-v3.0.0.md`
Skills installed through: **SK-491** (v3.0.0)
**Next available SK: SK-492**

SK-461..SK-470 are all assigned (v2.4.0/v2.5.0 additions — see skill index).

---

Tell me: session type, work target, desired outcome.
Load `planning--session-scope-resolution-SKILL.md` (SK-460) to resolve scope.
