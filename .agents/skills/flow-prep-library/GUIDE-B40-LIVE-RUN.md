# GUIDE-B40 — How to Produce `FLOW-XX-LIVE-RUN.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 50 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-LIVE-RUN.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the LIVE-RUN.md guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance, it will produce a
correct FLOW-XX-LIVE-RUN.md that serves as the execution manifest for running the
live engine against a flow's task types with real AI providers.

---

## WHAT THIS FILE IS

`FLOW-XX-LIVE-RUN.md` is the **live engine execution session manifest**. It is
the document that an operator opens when running the XIIGen engine against a specific
flow for the first time — or when debugging an execution that produced unexpected results.

**What it controls:**
- Which AI providers fire, in what order, with what models and skills
- What the operator checks at each phase gate before proceeding
- What skills are being tested (planning, prompting, security)
- Where to record actual run results (via companion RESULTS.json)
- Where to log bugs found during the run

**Relationship to other files:**
```
IMPLEMENTATION-PLAN.md      → what to build (phases A-F)
LIVE-RUN.md                 → how to execute the live engine run
LIVE-RUN-RESULTS.json       → structured results after the run
EXECUTION-LOG.json (SK-426) → machine-readable phase completion record
```

LIVE-RUN.md is written BEFORE the execution run. EXECUTION-LOG.json is written AFTER.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-01/final-flow-testing/FLOW-01-LIVE-RUN.md` (12KB — richest): FLOW IDENTITY table, PROVIDERS ACTIVE table (with ✅/❌ status per provider), WHAT THE ENGINE SENDS section (exact system + user prompts shown), PHASE-BY-PHASE EXAMINATION GATES table (A-F), RUN RESULTS per task type (runId, providers called, winner, scores, code sample), PHASE GATE VERDICTS table, BUGS FOUND table (8 bugs with fix dates), SKILL BATTERY checklist |
| ZIP-17 | PRIMARY | `FLOW-09/last-phase-testing-plan/FLOW-09-LIVE-RUN.md` (4KB — standard): FLOW IDENTITY, COLD START bash commands, PROVIDER RUN ORDER (3 providers with model/skills/expected scores), PHASE-BY-PHASE EXAMINATION GATES, SKILL BATTERY checklist, SELF-TEACHING CHECK, RESULTS RECORD template JSON, BUGS FOUND table |
| ZIP-17 | REFERENCE | `FLOW-47/FLOW-47-LIVE-RUN-RESULTS.json` — separate companion JSON file for structured run results |

---

## OUTPUT FILE SPECIFICATION

**Two path patterns:**

**Standard (most flows):**
`docs/sessions/FLOW-XX/last-phase-testing-plan/FLOW-XX-LIVE-RUN.md`

**Extended (post-audit flows):**
`docs/sessions/FLOW-XX/final-flow-testing/FLOW-XX-LIVE-RUN.md`

With companion: `FLOW-XX-LIVE-RUN-RESULTS.json` in the same directory.

---

## THE TWO DOCUMENT FORMATS

**Format 1 — Standard run manifest (FLOW-09 style, ~4KB):**
Pre-execution checklist. Written before the run to define exactly how it will proceed.
Sections: FLOW IDENTITY → COLD START → PROVIDER RUN ORDER → PHASE-BY-PHASE GATES →
SKILL BATTERY → SELF-TEACHING CHECK → RESULTS RECORD template → BUGS FOUND table.

**Format 2 — Extended with actuals (FLOW-01 style, ~12KB):**
Includes all of Format 1 plus post-run sections filled in with actual results:
PROVIDERS ACTIVE (with live status), WHAT THE ENGINE SENDS (exact prompts),
RUN RESULTS per task type (with real runIds, scores, code samples, DNA violations),
PHASE GATE VERDICTS table filled in with evidence.

Use Format 2 when the run surfaces bugs or when the run is the first-ever live
execution of the engine for a new flow.

---

## COMPLETE DOCUMENT STRUCTURE

### Section 1 — File Header

```markdown
# FLOW-XX-LIVE-RUN.md
## [Flow Title]
## Live Engine Execution Session — [YYYY-MM-DD]

---
```

### Section 2 — FLOW IDENTITY

```markdown
## FLOW IDENTITY

| Field | Value |
|---|---|
| Flow ID | `FLOW-XX` |
| Title | [Flow full title] |
| Task Range | T[NNN]-T[NNN+M] |
| Focus | [One sentence — what this flow does and why it matters] |
| Protocol | [LIVE-ENGINE-RUN-PROTOCOL.md](../LIVE-ENGINE-RUN-PROTOCOL.md) |
```

For extended format, add:

```markdown
| Task Types | T[NNN] [Name] · T[NNN+1] [Name] · T[NNN+2] [Name] |
| Trace files | [FLOW-XX-TRACES/](FLOW-XX-TRACES/) |
```

### Section 3 — COLD START (standard format only)

Pre-flight checks the operator runs before starting the engine:

```markdown
## COLD START — READ FIRST

```bash
# 1. Confirm 0 existing TS errors
cd "[project path]/server" && npx tsc --noEmit 2>&1 | head -5

# 2. Confirm test baseline (expect 0 failures)
cd "[project path]/server" && npx jest --passWithNoTests 2>&1 | tail -3

# 3. Load governance chain
# agent-constitution -> no-product-decisions -> dev-safety -> dna-compliance-guard
```
```

### Section 4 — PROVIDERS ACTIVE / PROVIDER RUN ORDER

**Standard format (FLOW-09 style) — pre-run:**
```markdown
## PROVIDER RUN ORDER

### 1. ANTHROPIC (Primary)
```
Model:     claude-sonnet-4-6
Skills:    SK-416 -> SK-418 -> SK-424 -> SK-425
Security:  dna-compliance-guard (all 9 patterns)
Expected:  planningScore >= 13/15, 0 TS errors, 0 test failures
```

### 2. OPENAI (Secondary)
```
Model:     gpt-4o
Skills:    SK-416 -> SK-418 -> SK-424
Security:  DNA-1, DNA-4, DNA-8, DNA-9
Expected:  planningScore >= 11/15, 0 TS errors, 0 test failures
```

### 3. GEMINI (Tertiary)
```
Model:     gemini-2.0-flash
Skills:    SK-416 -> SK-418
Security:  DNA-1, DNA-4
Expected:  planningScore >= 10/15, <= 2 TS errors (note + fix), 0 test failures
```
```

**Extended format (FLOW-01 style) — post-run with actual status:**
```markdown
## PROVIDERS ACTIVE

| Provider | Model | Key env var | Status |
|---|---|---|---|
| Anthropic | claude-sonnet-4-5-YYYYMMDD | DEFAULT_ANTHROPIC_KEY | ✅ Working |
| OpenAI | gpt-[version] | OPENAI_API_KEY | ❌ [reason for failure] |
| Gemini | gemini-[version] | GEMINI_API_KEY | ✅ Working |

All [N] fire in parallel per request. Judge: [judge model]. Winner stored as the accepted triple.
```

### Section 5 — WHAT THE ENGINE SENDS (extended format only)

This section is unique to the extended format. It shows the exact prompts built by
`ai-generate.handler.ts` during the run — invaluable for debugging why the model
generated unexpected code.

```markdown
## WHAT THE ENGINE SENDS TO EVERY MODEL

These are the exact prompts built by `ai-generate.handler.ts` → `buildSystemPrompt()` + `buildPrompt()`.
**Same text sent to every provider simultaneously.**

### SYSTEM PROMPT (buildSystemPrompt)

```
[Exact system prompt text as sent]

IRON RULES (violations = build failure):
1. [Iron rule 1 — from contract.ironRules[]]
...
```

> Iron rules come from `contract.ironRules[]` passed in the request body.

### USER PROMPT (buildPrompt)

```
[Exact user prompt text]
```

> **What is missing from this prompt ([BUG-XX-NNN]):**
> - [Missing field 1 — e.g., contract.purpose]
> - [Missing field 2 — e.g., contract.factoryDependencies]
```

The `> What is missing` annotation is only present when a bug was found. It
documents the gap between what the prompt should contain and what it actually sends.

### Section 6 — PHASE-BY-PHASE EXAMINATION GATES

```markdown
## PHASE-BY-PHASE EXAMINATION GATES

| Phase | Gate Question | Stop If |
|---|---|---|
| A — Inject | All contracts present with `flowId: 'FLOW-XX'`? | Any contract has empty/wrong flowId |
| B — Graph | Decision graph edges seeded? decompose source = topology? | Missing edges before Phase C |
| C — Generate | All services extend MicroserviceBase? No SDK imports? DataProcessResult.success() used? | Any direct SDK import |
| D — BFA | Zero CF-rule violations? | Any violation detected |
| E — Tests | 0 TS errors + 0 test failures? | Any failure |
| F — Feedback | Snapshot created + RAG patterns indexed? | Snapshot missing |
```

Gates A-F always appear. "Stop If" condition is specific and binary — an unambiguous
criterion that triggers a halt. Not "if there are problems" but "if any contract has
empty flowId."

### Section 7 — SKILL BATTERY

```markdown
## SKILL BATTERY

### Planning Skills
- [ ] SK-416 PlanningSessionStartup — entry point fires correctly
- [ ] SK-418 FlowCompletenessChecker — score >= 12/15
- [ ] SK-424 BlastRadiusAssessor — blast radius assessed before any engine change
- [ ] SK-425 CostEffectiveModelSelection — model fitness score recorded

### Prompting Skills
- [ ] PromptVersionStore — prompt version increments on re-run
- [ ] PromptAbTester — A/B variant winner recorded
- [ ] RagQualityTracker — quality score >= 0.7 for indexed patterns

### Security Skills
- [ ] DNA-1: No typed models (Record<string,unknown> everywhere)
- [ ] DNA-4: All services extend MicroserviceBase
- [ ] DNA-8: storeDocument before every enqueue call
- [ ] DNA-9: CloudEvents envelope on all inter-service events
```

DNA-1, -4, -8, -9 are always present. Other DNA rules depend on what the flow's
contracts require (RNA-3, DNA-7 for idempotency, etc.).

### Section 8 — SELF-TEACHING CHECK (standard format)

```markdown
## SELF-TEACHING CHECK (OPTIONAL)

```bash
# Check skill index growth after run
# Query xiigen-skills index: count before vs after

# Check model preference update
# ModelPreferenceTracker tenant=[master-tenant-id], taskType=T[NNN]

# Verify snapshot created
ls "server/snapshots/" | grep [master-tenant-id] 2>/dev/null || echo "No snapshot"
```
```

### Section 9 — RUN RESULTS (extended format only)

One subsection per task type, filled in after the run with actual data:

```markdown
## RUN RESULTS — [YYYY-MM-DD]

### T[NNN] [TaskTypeName] — [Run type: Triple Run / Single Provider Run]

**Prompts sent:** see SYSTEM PROMPT + USER PROMPT section above (T[NNN], [ARCHETYPE], [N] iron rules).

| Field | Value |
|---|---|
| runId | `[uuid]` |
| Providers called | Anthropic ✅ · OpenAI ❌ ([reason]) · Gemini ✅ |
| Winner | [provider] (judge score [N]) |
| judgeModel | [model name] |
| tripleStatus | [ACCEPTED / SINGLE_PROVIDER / REJECTED] |
| finalScore | [float] |
| threshold | [float] → PASS / FAIL |
| ai-generate durationMs | [N] |
| [provider] tokens | input [N] · output [N] |

**Score breakdown:**

| Criterion | Weight | Score |
|---|---|---|
| dna_compliance | 35% | [score] ✅/❌ |
| iron_rules | 25% | [score] ✅/❌ ([N/M rules pass]) |
| testability | 15% | [score] ✅/❌ |
| machine_constant | 15% | [score] ✅/❌ |
| fail_open_behavior | 10% | [score] ✅/❌ |
| **Final** | | **[score]** |

**What [provider] generated** (first 10 lines):
```typescript
[First 10 lines of the generated code with ✅/❌ annotations per line]
```

**DNA violations in T[NNN]:**
- ❌/✅ [DNA rule] — [specific observation]
```

### Section 10 — PHASE GATE VERDICTS (extended format only)

Filled in after the run with actual evidence:

```markdown
## PHASE GATE VERDICTS

| Gate | Status | Evidence |
|---|---|---|
| A — Inject | ✅ PASS | [N] contracts seeded, [tenant] created, real API called |
| B — Graph | ⚠️ PARTIAL | decompose source=fallback on all [N] — [specific reason] |
| C — Generate | ⚠️ WARNINGS | [what passed ✅] · [what failed ❌] |
| D — BFA | ✅ PASS | [N] tasks promoted to production, 0 CF violations |
| E — Tests | ⏳ NOT RUN / ✅ PASS | [reason if not run] |
| F — Feedback | ✅ PASS | [N] triple(s) stored, promptOpsTriggered=[true/false] |
```

Gate status values: ✅ PASS · ⚠️ PARTIAL · ❌ FAIL · ⏳ NOT RUN

### Section 11 — RESULTS RECORD (standard format) / BUGS FOUND (both formats)

**Standard format — RESULTS RECORD template:**
```markdown
## RESULTS RECORD

Create `FLOW-XX-LIVE-RUN-RESULTS.json` in this folder when done:

```json
{
  "flowId": "FLOW-XX",
  "runDate": "[YYYY-MM-DD]",
  "providers": {
    "anthropic": { "planningScore": null, "promptingScore": null, "securityViolations": null, "tsErrors": null, "testFailures": null, "passed": null },
    "openai":    { "planningScore": null, "promptingScore": null, "securityViolations": null, "tsErrors": null, "testFailures": null, "passed": null },
    "gemini":    { "planningScore": null, "promptingScore": null, "securityViolations": null, "tsErrors": null, "testFailures": null, "passed": null }
  },
  "skillBattery": { "planning": null, "prompting": null, "security": null },
  "selfTeaching": { "skillIndexGrowth": null, "bestProvider": null },
  "notes": ""
}
```
```

**BUGS FOUND table (always at the end):**
```markdown
## BUGS FOUND DURING RUN

| # | Phase | Description | Class | Fixed |
|---|---|---|---|---|
| BUG-XX-001 | [A-F] | [concise description] | [A/B/C/D] | ✅ [date] / ⏳ |
```

Bug class vocabulary:
- **A** — AI output quality (model generated wrong pattern, missing field, wrong import)
- **B** — Engine bug (handler, executor, router missing functionality)
- **C** — Configuration bug (wrong env var, missing registration, bootstrap issue)
- **D** — Infrastructure bug (missing index, missing tenant, service not wired)

---

## HOW TO AUTHOR FLOW-XX-LIVE-RUN.MD

### Step 1 — Choose the format

Use **standard format** (Format 1) for most new flows — it's the pre-execution manifest
written before the run. Use **extended format** (Format 2) if this is a post-audit
run where actual results are being documented.

### Step 2 — Fill FLOW IDENTITY from PLAN-STATE.json

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json'));
console.log('flowId:', s.flow_id);
console.log('flowName:', s.flow_name);
console.log('taskRange:', s.task_range);
console.log('slug:', s.slug);
"
```

### Step 3 — Fill PROVIDER RUN ORDER from session load plan

Provider configuration (model names, skill chains) comes from the current session
load plan (SESSION-LOAD-PLAN v30). The three providers are always Anthropic (primary),
OpenAI (secondary), Gemini (tertiary) unless explicitly overridden.

### Step 4 — Fill PHASE-BY-PHASE GATES from IMPLEMENTATION-PLAN

The gate questions map to the implementation plan's phase gates. Phase A gate checks
contract injection; Phase E gate checks test baseline. Copy the stop conditions from
the implementation plan's phase gate table.

### Step 5 — Fill SKILL BATTERY from contracts

Read the flow's contracts file to find which DNA rules apply:
```bash
grep -n "ironRules\|DNA-\|CF-" server/src/engine-contracts/FLOW-XX-contracts.ts | head -20
```

DNA-1, -4, -8, -9 are universal. Add flow-specific checks from ironRules[].

### Step 6 — Write RESULTS RECORD template

Leave all values null — they are filled in after the actual run completes.

---

## ACCEPTANCE CRITERIA FOR FLOW-XX-LIVE-RUN.MD

Before FLOW-XX-LIVE-RUN.md is considered complete:

- [ ] FLOW IDENTITY table has: Flow ID, Title, Task Range, Focus, Protocol link
- [ ] COLD START has 3 bash commands: tsc check, jest baseline, governance chain
- [ ] PROVIDER RUN ORDER has all 3 providers (Anthropic/OpenAI/Gemini) with model, skills, expected scores
- [ ] PHASE-BY-PHASE GATES has all 6 phases (A-F) with specific Gate Question and Stop If condition
- [ ] SKILL BATTERY has planning, prompting, and security subsections
- [ ] RESULTS RECORD template JSON has all provider fields set to null
- [ ] BUGS FOUND table present (may be empty with `| -- | -- | -- | -- | -- |`)

For extended format additionally:
- [ ] PROVIDERS ACTIVE table has actual ✅/❌ status per provider
- [ ] WHAT THE ENGINE SENDS shows exact system and user prompts
- [ ] RUN RESULTS has one subsection per task type with runId and score breakdown
- [ ] PHASE GATE VERDICTS table filled with actual evidence

---

## KEY RULES

**1. LIVE-RUN.md is written before the run; EXECUTION-LOG.json is written after.**
The manifest defines how the run will proceed. It's the operator's checklist. Never
fill in actual run results in the manifest — put those in LIVE-RUN-RESULTS.json and
EXECUTION-LOG.json.

Exception: Format 2 (extended) merges both — it starts as a manifest and is filled
in with actuals during/after the run. This is acceptable for first-ever runs where
detailed documentation is needed.

**2. The BUGS FOUND table is pre-populated empty and filled during the run.**
The table always exists, even before any bugs are found. As bugs are discovered
during execution, they are added in real time. Each bug gets a sequential ID
(BUG-XX-NNN), a phase, a description, a class, and a fix status.

**3. Provider run order is always Anthropic → OpenAI → Gemini.**
This is the canonical provider hierarchy from the session load plan. Anthropic is
primary with the full skill chain. OpenAI is secondary with a subset. Gemini is
tertiary with the minimum skills. This order never changes unless a flow-specific
override is documented.

**4. Expected scores are set before the run — not adjusted afterward.**
`planningScore >= 13/15` for Anthropic is written before the run. If the actual
score is 11/15, that is recorded as a gap — not a reason to change the expected
threshold.

**5. The WHAT THE ENGINE SENDS section is the most valuable debugging tool.**
When bugs are found in Phase C (generation quality), the exact prompt content is
the first thing to check. Fields missing from `buildPrompt()` output are the most
common cause of AI quality failures. Always document exact prompt content for flows
where iron_rules score < 1.0.

---

*End of GUIDE-B40 — FLOW-XX-LIVE-RUN.md*
*List A sources: ZIP-17 (FLOW-01 final-flow-testing FLOW-01-LIVE-RUN.md richest/extended format,*
*FLOW-09 last-phase-testing-plan standard format, FLOW-47 LIVE-RUN-RESULTS.json companion)*
*Target B-type: B-40 — FLOW-XX-LIVE-RUN.md*
*Round: 50 of 72*
