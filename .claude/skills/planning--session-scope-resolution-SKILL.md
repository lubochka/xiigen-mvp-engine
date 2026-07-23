---
name: session-scope-resolution
sk_number: SK-460
version: "1.0.0"
priority: HIGH
load_order: -2
category: planning
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Given session type and work target, produce: prerequisite checks
  (from SK-458), minimum document list, and mandatory governance chain.
  Zero hardcoded prerequisite commands — every check dispatches to SK-458.
  This skill replaces the manual document-surfing that currently happens
  between session start and first work step. The SESSION-SETUP-LIBRARY.md
  is explicitly included in the GENERATION case output.
triggers:
  - "what do I need to load"
  - "session type"
  - "what to do next"
  - "what to do in a new session"
  - "session start"
  - "new session"
  - "start a session"
  - "scope for this session"
  - "which documents"
  - "minimum context"
  - "what docs do I need"
  - "session scope"
  - "I want to work on"
  - "let's work on"
---

# Session Scope Resolution Skill (SK-460) v1.0

## THE PROTOCOL

**Input** (provided at session start):
```
session type:  GENERATION | PLANNING | MAINTENANCE | INVESTIGATION | DEBUG
work target:   [flow ID / component / task name / bug ID]
```

**Output** (produced by this skill, before any work begins):
```
1. PREREQUISITE CHECKS — from SK-458, run before any code or planning
2. MINIMUM DOCUMENT LIST — only what this work type needs
3. GOVERNANCE CHAIN — mandatory skills for this combination
4. BLOCKING CONDITIONS — what stops execution, with detection command
```

**Design rule:** This skill has ZERO hardcoded prerequisite commands.
Every prerequisite check dispatches to `planning--prerequisite-chain-SKILL.md` (SK-458).
When prerequisites change, update SK-458. This skill dispatches; SK-458 is the source.

---

## DISPATCH TABLE

### GENERATION SESSION

Work target: any flow execution (FLOW-01..39, Group session, Phase Zero)

```
PREREQUISITE CHECKS:
  → Load SK-458. Run rows for this work target.
  → If any BLOCKED: stop. State which prerequisite. Do not proceed to doc loading.

MINIMUM DOCUMENTS:
  1. SESSION-STATE-SNAPSHOT--[latest].md              (execution position)
  2. XIIGEN-SESSION-SETUP-LIBRARY.md                  (session file authoring)
  3. sessions/FLOW-XX/INFRASTRUCTURE-GATE.md          (14/15 checks)
  4. sessions/FLOW-XX/SESSION-A.md (or current phase) (the session file)

GOVERNANCE CHAIN (mandatory):
  - code-execution--phase-preflight-SKILL.md (SK-457)    ← FIRST, before any code
  - planning--output-contract-SKILL.md (SK-448)           ← define done before starting
  - session-output--mission-progress-SKILL.md (SK-445)   ← before every ⛔ STOP
  - session-output--session-state-crystallization-SKILL.md (SK-459) ← at session end

BLOCKING CONDITIONS:
  - failures > 0 at session start → STOP. Fix before any code.
    Detect: cd server && npx jest 2>&1 | tail -3
  - Infrastructure gate has any ❌ → STOP. Fix before Phase A.
  - SESSION-P26-S1 not complete → STOP (global blocker, SK-458)
```

---

### PLANNING SESSION (web)

Work target: flow session file production, plan design, architectural decision

```
PREREQUISITE CHECKS:
  → Load SK-458. Run rows for this work target.
  → Planning sessions rarely blocked (only if prior group is mandatory prerequisite)

MINIMUM DOCUMENTS:
  1. SESSION-STATE-SNAPSHOT--[latest].md              (execution position)
  2. HOW-TO-USE-SKILLS-v2.3.0.md                      (governance)
  3. FLOW-XX-MASTER-PLAN-FINAL.md                     (amendments, if producing session files)
  4. XIIGEN-SESSION-SETUP-LIBRARY.md                  (if writing session files)

GOVERNANCE CHAIN (mandatory):
  - planning--output-contract-SKILL.md (SK-448)                    ← step ⓪(-1)
  - planning--wave-assignment-SKILL.md (SK-455)                    ← before flow assignment
  - planning--prerequisite-chain-SKILL.md (SK-458)                 ← loaded by this skill
  - planning--session-file-authoring-SKILL.md (SK-443)             ← Gate C
  - session-output--session-state-crystallization-SKILL.md (SK-459) ← ⛔ STOP

BLOCKING CONDITIONS:
  - Gate C session file fails FC-28 (7 self-containment checks) → revise before delivery
    Detect: check presence of STEP 0 assumption registry, no cross-references
  - Skill uniqueness collision → resolve before delivery
    Detect: grep -rn "SK-4[4-6][0-9]" .claude/skills/ | grep -v SKILL-INDEX
```

---

### MAINTENANCE SESSION

Work target: fixing files, updating skills, updating docs, creating zips

```
PREREQUISITE CHECKS:
  → None by default. Run SK-440 (change-propagation) for blast radius.

MINIMUM DOCUMENTS:
  1. SESSION-STATE-SNAPSHOT--[latest].md              (to know what changed)
  2. XIIGEN-GOLDEN-RULE.md                            (Gap A/B/C)
  3. planning--change-propagation-SKILL.md (SK-440)   (blast radius)

GOVERNANCE CHAIN:
  - planning--change-propagation-SKILL.md (SK-440) ← FIRST
  - Execute directly. No plan gates.
  - One ⛔ STOP at end — with ALL mandatory checks below.
  - session-output--session-state-crystallization-SKILL.md (SK-459) ← mandatory

MANDATORY CHECKS BEFORE ⛔ STOP (no exceptions, same as all other session types):
  1. ISSUE INVENTORY (FC-29) — every issue found during this session:
       FIXED: [what was done] + [structural guard added]
       DEFERRED: [Luba written authorization] + [CARRY-FORWARD entry written]
       EXCEPTION: [one-time, reason]
     "Noted", "needs Claude Code", "project-level", "out of scope" are NOT valid statuses.
  2. failures === 0 if any test was touched
  3. SESSION-STATE-SNAPSHOT produced (SK-459)

BLOCKING CONDITIONS:
  - Any issue in ISSUE INVENTORY with status other than FIXED/DEFERRED/EXCEPTION → BLOCKING
  - Any DEFERRED without a CARRY-FORWARD entry → treat as BLOCKING (deferral is invalid)
  - If the fix touches a test: failures must === 0
```

---

### INVESTIGATION SESSION

Work target: analysing gaps, diagnosing failures, simulation

```
PREREQUISITE CHECKS:
  → None. Investigation sessions can start from any state.

MINIMUM DOCUMENTS:
  1. SESSION-STATE-SNAPSHOT--[latest].md              (current position)
  2. The specific file being investigated               (targeted loading)
  DO NOT load reference documents wholesale — query via RAG when Task 2 complete

GOVERNANCE CHAIN (analysis pipeline):
  - planning--claim-verification-SKILL.md             ← SESSION-OPENING STATE PROTOCOL
  - planning--simulation-protocol-SKILL.md (SK-441)   ← trace actual handlers
  - planning--solution-scope-gate-SKILL.md (SK-434)   ← gap classification
  - planning--root-cause-ladder-SKILL.md (SK-432)     ← after gap catalog produced
  - session-output--investigation-handoff-SKILL.md    ← end of session
  - session-output--session-state-crystallization-SKILL.md (SK-459) ← ⛔ STOP

MANDATORY CHECKS BEFORE ⛔ STOP:
  1. ISSUE INVENTORY (FC-29) — every issue found:
       FIXED / DEFERRED (authorization + CARRY-FORWARD entry) / EXCEPTION
     "Noted" is not a valid status.
  2. SESSION-STATE-SNAPSHOT produced (SK-459)
```

---

### DEBUG SESSION

Work target: specific failing test, broken handler, broken command

```
PREREQUISITE CHECKS:
  → None. Load the failing test or command output directly.

MINIMUM DOCUMENTS:
  1. The failing test file or error output                (direct, targeted)
  2. The handler file being debugged                      (direct)
  DO NOT load any document that doesn't contain the failing code

GOVERNANCE CHAIN:
  - Execute directly. Debug the specific failure.
  - FOUND-ISSUE PROTOCOL from HOW-TO-USE (load when multiple issues found)
  - session-output--session-state-crystallization-SKILL.md (SK-459) ← if bugs resolved

MANDATORY CHECKS BEFORE ⛔ STOP:
  1. ISSUE INVENTORY (FC-29) — every issue found during debugging:
       FIXED / DEFERRED (authorization + CARRY-FORWARD entry) / EXCEPTION
     "Noted", "separate session", "low priority" are not valid statuses.
  2. SESSION-STATE-SNAPSHOT if any bugs resolved or deferred
```

---

## WORKED EXAMPLES

### Example 1: GENERATION + FLOW-01 Phase B

```
Input: session type=GENERATION, work target=FLOW-01 Phase B re-run

Prerequisite checks (from SK-458, run now):
  1. BUG-6: curl -sf "localhost:9200/xiigen-training-data/_search?q=curriculumTier:null" | jq .hits.total.value → expected: 0
  2. BUG-7: curl -sf "localhost:9200/xiigen-shadow-runs/_count" | jq .count → expected: ≥3
  3. BUG-8: curl -sf localhost:9200/xiigen-engine-contracts/_doc/T47 | jq -r '._source.arbiterConfig.minPanel' → expected: a number
  4. Groups A+D: grep -c "return 0\.7" server/src/engine/node-handlers/score.handler.ts → expected: 0
  5. MT Kernel: curl -sf localhost:3000/health | jq .data.mt → expected: {"status":"active"}

Minimum documents:
  - SESSION-STATE-SNAPSHOT--[latest].md
  - XIIGEN-SESSION-SETUP-LIBRARY.md
  - sessions/FLOW-01/INFRASTRUCTURE-GATE.md
  - sessions/FLOW-01/SESSION-B.md

Governance: SK-457 preflight → SK-448 output contract → SK-445 mission progress → SK-459 snapshot
```

### Example 2: PLANNING + FLOW-03 session files

```
Input: session type=PLANNING, work target=FLOW-03 session files

Prerequisite checks (from SK-458):
  1. No execution blockers for planning (planning is unblocked)

Minimum documents:
  - SESSION-STATE-SNAPSHOT--[latest].md
  - HOW-TO-USE-SKILLS-v2.3.0.md
  - FLOW-03-MASTER-PLAN-FINAL.md
  - XIIGEN-SESSION-SETUP-LIBRARY.md

Governance: SK-448 output contract → SK-455 wave-assignment → SK-443 Gate C → SK-459 snapshot

Notes:
  - Pre-populate STATE.json: {"T59":1,"T60":3,"T61":2,"T62":2}
  - Apply BUG-1..5 fixes in session files
  - Resolve __FILL_FROM_PRE_ALLOCATION__ for Family/CF numbers before Phase A
```

### Example 3: INVESTIGATION + gap analysis

```
Input: session type=INVESTIGATION, work target=cross-flow trace FLOW-01→FLOW-02

Prerequisite checks: none

Minimum documents:
  - SESSION-STATE-SNAPSHOT--[latest].md
  - (targeted) the specific handler files being traced

Governance: SK-431 claim-verification → SK-441 simulation + CROSS_FLOW_TRACE → SK-432 root-cause → SK-459 snapshot
```

---

## WHAT THIS SKILL DOES NOT CONTAIN

```
❌ Prerequisite verification commands — those are in SK-458
❌ Bug fix commands — those are in the session start prompt KEY COMMANDS section
❌ Flow-specific architecture decisions — those are in ARCHITECTURE-DECISIONS.json
❌ Reference content (flow details, gap register, RAG patterns) — query via RAG
```

---

## INTEGRATION

```
Invoke at:    Session start, after receiving session type + work target
Dispatches:   planning--prerequisite-chain-SKILL.md (SK-458) for all prerequisite checks
Produces:     prerequisite check list + minimum document list + governance chain
References:   session-output--session-state-crystallization-SKILL.md (SK-459) — end gate
              XIIGEN-SESSION-SETUP-LIBRARY.md — included in GENERATION and PLANNING output
Supersedes:   "WHAT TO DO IN A NEW SESSION" section of XIIGEN-HANDOFF-PROMPT
              "DOCUMENT QUICK-FIND" table in session start prompt
```

---

## RECONCILE — core `session-scope-resolution` parity (G02 refresh from llm_mvp_core)

This SK-460 dispatch is kept; two core rules are reconciled onto it.

**(A) Authority-Binding Override runs BEFORE any dispatch.** Before selecting a
session type or loading documents, load `authority-chain` (authority-requirement-
binding). Requirements from the current human operator / product owner, an architect
work order, an approved active plan, or an accepted reviewer gate are binding unless
that authority explicitly marks them optional/exploratory/preference-only. A
downstream session must NOT narrow an upstream requirement. (Add this as the zeroth
step of the dispatch above.)

**(B) Session-type name mapping (keep mvp names; know the core equivalents) so the
dispatch is recognized as the core dispatch, not a divergent one:**

```
core EXECUTOR       ≡ mvp GENERATION   (implement a known plan/flow)
core ARCHITECT      ≡ mvp PLANNING     (design phases / write plans / review architecture)
core MAINTAINER     ≡ mvp MAINTENANCE  (fix files / update skills / sync docs)
core INVESTIGATOR   ≡ mvp INVESTIGATION
core DEBUG          ≡ mvp DEBUG
(mvp QA has no separate core type — it is the validation slice of EXECUTOR/REVIEW)
```

**(C) TS-adapted prerequisites** dispatched to SK-458: build = `npm run build`
(TypeScript, 0 errors); baseline = `npx jest` (server ≥2342, client ≥220, must be ≥
prior baseline); blocking condition = any failing test at session start → STOP and
fix before any GENERATION work; minimum documents = `AGENTS.md` + `agent-constitution`
(Tier 0), `DECISIONS.md`/`DECISIONS-LOCKED.md`, and the relevant
`KNOWLEDGE_DIGEST`/`ARCHITECTURE_GUIDE` section — load targeted, not wholesale. A
proposal that contradicts a locked decision → STOP and route to
`decision-reopening-SKILL.md`.
