---
name: prerequisite-chain
sk_number: SK-458
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  The prerequisite dependency graph for all XIIGen work targets. Each entry
  has a BLOCKED_BY condition and a literal bash verification command.
  Run the command — the output is the source of truth.
  Never load EXTENSION-PLAN-DEFINITIVE or PHASE-THREE-PREP to find a prerequisite.
  This file IS the prerequisite lookup.
triggers:
  - "what are the prerequisites"
  - "is X blocked"
  - "what blocks FLOW-01"
  - "can I start"
  - "prerequisite check"
  - "what must be true before"
  - "is this unblocked"
  - "blocking conditions"
  - "what do I need before"
  - "dependency check"
  - "can FLOW-01 execute"
  - "MT Kernel"
  - "SESSION-P26-S1"
---

# Prerequisite Chain Skill (SK-458) v1.0

## THE RULE

Before any work target executes: run its verification command.
If the command returns the expected output: prerequisite is met.
If it returns anything else: prerequisite is NOT met. State which one. Stop.

**Never load EXTENSION-PLAN-DEFINITIVE to find prerequisites.**
**Never load PHASE-THREE-PREP to find blocking conditions.**
**The verification command is the source of truth.**

---

## PREREQUISITE TABLE

### GLOBAL BLOCKER — all execution

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| ALL execution | SESSION-P26-S1 (MT Kernel) | `curl -sf localhost:3000/health | jq .data.mt` | `{"status":"active"}` |

If SESSION-P26-S1 not complete: NO flow execution can proceed.
Session files and planning work are unaffected.

---

### PRE-FLOW-01 TASKS (T1–T12)

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| FLOW-01 execution | T1 heyrovsky merge | `curl -sf localhost:9200/xiigen-engine-contracts/_doc/T577 | jq -r '._source.taskTypeId'` | `T577` |
| FLOW-01 execution | T2 artifact registry → RAG | `curl -sf localhost:9200/xiigen-rag-patterns/_count | jq .count` | `≥ 50` |
| FLOW-01 Phase B re-run | BUG-6 corrupt triples deleted | `curl -sf "localhost:9200/xiigen-training-data/_search?q=curriculumTier:null" | jq .hits.total.value` | `0` |
| FLOW-01 Phase B re-run | BUG-7 shadow runs initialised | `curl -sf "localhost:9200/xiigen-shadow-runs/_count" | jq .count` | `≥ 3` |
| FLOW-01 Phase B re-run | BUG-8 arbiterConfig in contracts | `curl -sf localhost:9200/xiigen-engine-contracts/_doc/T47 | jq -r '._source.arbiterConfig.minPanel'` | a number (not null) |
| FLOW-01 Phase B re-run | BUG-9 execute format fixed in session file | `grep -c "contract:" sessions/FLOW-01/SESSION-B.md` | `≥ 1` |
| FLOW-01 Phase B re-run | Groups A+D complete | see Group A and Group D rows below | — |
| FLOW-02 execution | FLOW-01 ACTIVE | `curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-01 | jq -r '._source.status'` | `ACTIVE` |
| FLOW-02 Phase B | FLOW-02 contracts have arbiterConfig | `curl -sf localhost:9200/xiigen-engine-contracts/_doc/T50 | jq -r '._source.arbiterConfig.minPanel'` | a number |
| FLOW-03 session files | FLOW-03 master plan + amendments loaded | `ls sessions/FLOW-03/SESSION-A.md 2>/dev/null` | file exists |
| FLOW-03 execution | FLOW-01 ACTIVE + FLOW-02 ACTIVE | run FLOW-01 check above, then: `curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-02 | jq -r '._source.status'` | both `ACTIVE` |
| Wave 2 (FLOW-04..09) | FLOW-01 + FLOW-02 + FLOW-03 ACTIVE | check all three flow status docs as above | all `ACTIVE` |

---

### PHASE ZERO SESSIONS (Z-1..Z-5)

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| FLOW-01 Phase B | Z-1 execute pipeline multi-stack | `grep -c "stackCoupling" server/src/engine/execute-pipeline.ts` | `≥ 1` |
| FLOW-01 Phase B | Z-2 IScopedMemoryService | `grep -c "IScopedMemoryService" server/src/fabrics/memory/interfaces/scoped-memory.interface.ts 2>/dev/null` | `≥ 1` |
| FLOW-01 Phase B | Z-3 provider-keyed named checks | `grep -c "stackCoupling\|neutralConcepts" server/src/engine/named-checks/registry.ts 2>/dev/null` | `≥ 1` |
| FLOW-01 Phase B | Z-4 ISchedulerService + T48 reclassification | `curl -sf localhost:9200/xiigen-engine-contracts/_doc/T48 | jq -r '._source.stackCoupling.fabricInterface'` | `ISchedulerService` |
| FLOW-01 Phase B | Z-5 DESIGN_REASONING retroactive seeding | `curl -sf "localhost:9200/xiigen-rag-patterns/_search?q=patternType:DESIGN_REASONING+flowId:FLOW-01" | jq .hits.total.value` | `≥ 8` |

---

### CODE FIX GROUPS (A–D, from GROUP sessions)

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| Group E planning | Group A complete | `grep -c "return 1\.0" server/src/engine/node-handlers/score.handler.ts` | `0` (old 1.0 heuristic fallback removed) |
| Group E planning | Group D complete | `grep -c "NodeRepresentation" server/src/engine/contracts/contract-schema.ts` | `≥ 1` |
| Group B execution | Group A complete | `grep -c "LightRagProvider\|lightrag" server/src/fabrics/rag/rag.module.ts` | `≥ 1` |
| Group C execution | Groups A+B complete | `npx jest --testPathPattern=score.handler 2>&1 | grep "failures"` | `failures: 0` |
| Group D execution | Group A complete | `grep -c "HybridGenesisPrompt\|hybridPrompt" server/src/engine/node-handlers/ai-generate.handler.ts` | `≥ 1` |
| FLOW-01 Phase B | Groups A+D complete | run Group A + Group D checks above | both pass |

---

### CONVERGENCE.HANDLER AND FLOW-37 (Group E)

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| FLOW-37 session files | SK-452 loaded (convergence-round-design) | `ls .claude/skills/planning--convergence-round-design-SKILL.md 2>/dev/null` | file exists |
| FLOW-37 Phase A | convergence.handler registered | `grep -c "convergence.handler" server/src/engine/engine.module.ts` | `≥ 1` |
| FLOW-37 execution | FLOW-36 ACTIVE | `curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-36 | jq -r '._source.status'` | `ACTIVE` |
| FLOW-38 execution | FLOW-37 ACTIVE | `curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-37 | jq -r '._source.status'` | `ACTIVE` |
| FLOW-39 session files | FLOW-38 ACTIVE | `curl -sf localhost:9200/xiigen-flow-status/_doc/FLOW-38 | jq -r '._source.status'` | `ACTIVE` |

---

### SKILLS INFRASTRUCTURE

| Work Target | Blocked By | Verification Command | Expected |
|-------------|-----------|---------------------|----------|
| Any session using SK-448..457 | Skills v2.3.0 installed | `ls .claude/skills/planning--output-contract-SKILL.md 2>/dev/null` | file exists |
| Session snapshot (SK-459) | SK-458 installed (this skill) | `ls .claude/skills/planning--prerequisite-chain-SKILL.md 2>/dev/null` | file exists |
| RAG query protocol | Task 2 complete (artifact registry → RAG) | `curl -sf "localhost:9200/xiigen-rag-patterns/_count" | jq .count` | `≥ 50` |

---

## FULL DEPENDENCY ORDER (topological sort)

```
SESSION-P26-S1 (MT Kernel)          ← GLOBAL GATE — nothing executes without this
  ↓
T1 heyrovsky merge                   ← parallel with T2-T5
T2 artifact registry → RAG           ← parallel with T1, T3-T5
T3 GitHub MCP                        ← parallel
T4 lab environment                   ← parallel
T5 orchestration skills              ← parallel
  ↓
Z-1..Z-5 Phase Zero sessions         ← sequential (Z-1 before Z-2 before ...)
  ↓
Groups A → B → C → D                 ← A then B then C then D (not all parallel)
  ↓
Group E planning (convergence.handler design)
  ↓
FLOW-01 Phase B re-run               ← requires BUG-6/7/8/9 fixed + Groups A+D
  ↓
FLOW-01 ACTIVE
  ↓
FLOW-02 execution                    ← sequential (Wave 1)
  ↓
FLOW-02 ACTIVE
  ↓
FLOW-03 execution                    ← sequential (Wave 1)
  ↓
FLOW-03 ACTIVE
  ↓
FLOW-04..09                          ← Wave 2 parallel (5 instances)
```

---

## WHEN THE TABLE IS OUT OF DATE

This table was last updated: 2026-03-26.

When a work target completes: the SESSION-STATE-SNAPSHOT.md produced at session end
(SK-459) carries the updated status. The snapshot is the live source of truth for
what is complete. This table is the static source of truth for how to verify it.

If a verification command returns unexpected output for a target that is claimed COMPLETE:
1. Check the snapshot for the completion timestamp
2. Run the command again — environment may not be ready
3. If command still fails: prerequisite is NOT met — report this, do not proceed

---

## INTEGRATION

```
Loaded by:     planning--session-scope-resolution-SKILL.md (SK-459)
               code-execution--phase-preflight-SKILL.md (SK-457) for Claude Code
Produces:      PASS / FAIL / BLOCKED status per work target
Supersedes:    XIIGEN-EXTENSION-PLAN-DEFINITIVE.md blocking conditions
               XIIGEN-HANDOFF-PROMPT blocking conditions
               PHASE-THREE-PREPARATION-GUIDE blocked sections
```

---

## G08 universal addition from llm_mvp_core — generic prerequisite verify, never mock a missing prerequisite

The table above is project-specific (FLOW/Group/BUG targets). The universal core is the
*shape* of a prerequisite check for ANY new mvp work target (a service, a module, a contract,
a React feature, a RAG route) — independent of the flow registry — plus the hard rule that a
missing prerequisite is never mocked past.

### A. Generic prerequisite verify table (any new mvp target)

```
PREREQUISITE                       VERIFY (run this session)                          CLASS on fail
interface/contract exists          grep -rn "interface X\b" server/src client/src     BLOCKING
provider implements it             grep -rn "implements X" server/src                 BLOCKING
provider registered in DI          grep -rn "X" server/src/**/*.module.ts             BLOCKING
  (the @Injectable must appear in a module's `providers:`/`imports:`, not just declared)
type surface compiles              npx tsc --noEmit                                   BLOCKING
server builds                      cd server && npm run build                         BLOCKING
baseline green (no NEW failures)   cd server && npx jest 2>&1 | grep "Tests:" | tail  BLOCKING if NEW
client component reachable         grep -rn "X" client/src + route/provideRouter      FAIL (UI)
RAG sidecar route present          grep -rn "APIRouter\|@app\." rag/                  BLOCKING for retrieval
```

### B. Never mock a missing prerequisite

A missing provider, an unregistered module, or an absent `contracts/` interface is a
`BLOCKING` prerequisite — not something to stub past so a session can "start". Mocking the
missing piece makes the session pass against a fiction and fail at integration. On
`BLOCKING`, output the block + the exact resolver step in chain order; do not fabricate a
stand-in.

### Note-only (NOT ported — stays in G12, R5)

Trainable-unit prerequisites (checkpoint/locator/fresh-load probes for shared models) live
in `llm_mvp_core`; here the prerequisite stops at "the `.xiigen` manifest/locator for the
shared model is present and readable".
