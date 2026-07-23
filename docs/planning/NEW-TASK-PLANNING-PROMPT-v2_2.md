# NEW TASK PLANNING SESSION PROMPT
# Version: 2.2 | Updated: 2026-03-20
# Changes from v2.1:
#   - Execution order updated: added FEATURE-REGISTRY-S1 and FLOW-36
#   - SKILLS_FACTORY_RAG_MERGED reference updated to SK-1–SK-429
#   - FLOW-34 noted as feature-aware (runs after FLOW-36)
#   - Added FT-XXX namespace note in artifact boundaries
# Changes from v2.0:
#   - Added SK-426–SK-429 (session output infrastructure)
#   - Updated Next Skill boundary to SK-430
#   - Added Phase Completion Package to ALWAYS block and session files section
#   - Added Scenario 7: reading SESSION-BRIEF from Claude Code
# Changes from v1.0:
#   - Added P9 (Mode C Event-First) and P10 (Client Architecture)
#   - Updated artifact boundaries to post-FLOW-35
#   - Added PROJECT_REFERENCE.md and DECISIONS-LOCKED.md as mandatory reads
#   - Added flow-reexamination-skill to skill load order
#   - Added SK-416–SK-425 to available skills
# Usage: Paste at the start of any new planning web session.
# Replace all [BRACKETED] values before sending.

---

## LOAD THESE SKILLS FIRST (before anything else)

You are operating in a XIIGen planning web session. Load and apply the following
skills IN ORDER before doing any analysis, planning, or file creation.

Skills are in `.claude/skills/` (or the attached ZIP if first session):

1. **agent-output-format-skill** — WHO is the consumer? Every file for Claude Code
   or for human — NEVER mixed. Three-File Rule: REFERENCE + EXECUTION + STATE.json.

2. **xiigen-core-principles-skill v2.0** — Gate 0. The 10 principles (P1-P10) MUST
   have explicit design answers BEFORE you write a single plan element.
   P9 (Mode C Event-First) and P10 (Client Architecture) are NEW and mandatory.

3. **SK-416 PlanningSessionStartup** — Read STATE-v4.json, DECISIONS-LOCKED.md, and
   PROJECT_REFERENCE.md first. Verify baseline numbers before writing anything.

4. **infrastructure-discovery-skill** — verify all paths, counts, and artifact
   numbers against live canonical docs. Never use numbers from memory.

5. **planning-skill** — 8 gates. Validate content is architecturally correct.

6. **plan-review-skill v2.0** — 15 FC classes (FC-1 through FC-15). Validate
   structural consistency + Mode C contracts + client architecture.
   Then 3-gate approval: Gate A (automated), Gate B (2 AI models), Gate C (me).

7. **flow-reexamination-skill** — For user-facing flows (FLOW-01–24) only.
   Applies 7-pass algorithm + SK-418 FlowCompletenessChecker (15 items).

**Do not produce any plan content until all skills are loaded and Gate 0 passes.**

---

## MANDATORY DOCUMENT READS (before any analysis)

Read these three before answering Gate 0:
```
1. PROJECT_REFERENCE.md         ← master navigation, document hierarchy
2. DECISIONS-LOCKED.md          ← all locked decisions D1-D18, SDK/CLIENT/E2E, D-FT-1
3. INFRASTRUCTURE-FLOWS-STATE-v4.json ← authoritative baseline numbers
```

If any plan element contradicts these documents: the documents are right.
Investigate why before writing anything.

---

## SESSION CONTEXT

**Project:** XIIGen — self-building AI code generation engine
**Stack:** NestJS 10 + TypeScript 5 (server) | React 18 + Vite (client)
**SDK:** @xiigen/sdk-nestjs (backend) | @xiigen/sdk-react (frontend)
**Branch:** [e.g. flow/meta-arbitration/round-controller]
**Repository state:** Post-FLOW-35

**Canonical document sources (read these first, in this order):**
- `PROJECT_REFERENCE.md` — master navigation guide
- `DECISIONS-LOCKED.md` — all architecture decisions (authoritative, includes D-FT-1)
- `INFRASTRUCTURE-FLOWS-STATE-v4.json` — live artifact boundaries
- `ENGINE_ARCHITECTURE_MERGED.md` — engine architecture
- `TASK_TYPES_CATALOG_MERGED.md` — existing T1–T566
- `SKILLS_FACTORY_RAG_MERGED.md` — existing SK-1–SK-429
- `V62_BFA_STRESS_TEST_MERGED.md` — BFA rules CF-1–CF-795
- `CLAUDE.md` — commands, DNA rules, fabric interfaces, module map

**Artifact boundaries (ALWAYS verify against INFRASTRUCTURE-FLOWS-STATE-v4.json):**
```
Next Factory:   F1491     Next Family:   224
Next Task Type: T567      Next BFA Rule: CF-796
Next Skill:     SK-430    (FLOW-35 uses SK-402–SK-415 + SK-426–SK-429;
                           planning session skills SK-416–SK-425)
Next FT-ID:     FT-001+   (namespace reserved — D-FT-1 in DECISIONS-LOCKED.md)
                           DO NOT use FT-prefix for any other artifact type
Test baseline:  ≥ 4,056   (after FLOW-35 complete including Phase I)
                           After FLOW-36: verify live (expected ~4,270+)

Execution order:
  FLOW-0A → SKILL-GRAPH-S1 → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30
  → FLOW-26 → FLOW-31 → FLOW-33
  → FEATURE-REGISTRY-S1     ← addendum: schema + namespace + Figma migration
  → FLOW-35
  → FLOW-36                 ← Feature Registry: FT-XXX artifacts, portingCandidate
  → FLOW-34                 ← now feature-aware (reads FT records, calls FLOW-36 tasks)
  → FLOW-01 through FLOW-24

Skill ranges:
  SK-402–SK-415  meta-arbiters + engine modification protocols (FLOW-35 Phases B–H)
  SK-416–SK-425  planning session skills (FLOW-35 Phase A, impls in project)
  SK-426–SK-429  session output infrastructure (FLOW-35 Phase I)
  SK-430+        reserved for FLOW-36 feature extraction skills
```

---

## IF STARTING FROM A SESSION BRIEF (Claude Code just finished a phase)

If Claude Code completed a phase and produced `SESSION-BRIEF-{phase}.md`,
paste it here instead of filling in the task section below.
The brief is self-contained — no other files needed.

```
"[Paste SESSION-BRIEF-{phase}.md content here]

Approve Phase {next} and produce SESSION-{next}-[TITLE].md."
```

Skip the rest of this prompt if you are starting from a SESSION-BRIEF.

---

## THE NEW TASK

**Task name:** [e.g. "Adaptive Prompt Versioning" or "Multi-Tenant RAG Initialization"]

**One-sentence description:**
[e.g. "Add versioned PromptAsset storage so AF-3 retrieves the correct prompt
version per tenant, taskType, and quality score."]

**Why this task (business value):**
[e.g. "Current prompts cannot be improved without code changes."]

**Which flows or phases it touches:**
[e.g. "FLOW-35 Phase B — SpendGovernorPattern [SK-402]"]
OR
[e.g. "New FLOW-36. User-facing flow: FLOW-01 through FLOW-24 range."]

**Input you have:**
- [ ] Spec document attached: [filename or "none"]
- [ ] Prior session state: [filename or "STATE.json at session N"]
- [ ] Related flows: [e.g. FLOW-25, FLOW-35]

---

## GATE 0 — 10 PRINCIPLES CHECKLIST
## Answer ALL 10 before writing any plan content.
## "TBD" or "we'll add it later" = plan is INCOMPLETE, do not continue.

**P1 — Multi-Tenant by Design:**
[Your answer: how does this task isolate by tenant?]

**P2 — Safe Config Storage:**
[Your answer: what new configs/secrets does this task introduce?]

**P3 — Always Improve Prompts (PromptOps):**
[Your answer: how does this task version its prompts?]

**P4 — RAG Storage (Global + Local):**
[Your answer: what does this task store in RAG, how is local RAG provided?]

**P5 — Always Improve (Self-Developing Engine):**
[Your answer: does this fix go into the engine, not just the output?]

**P6 — Plan and Arbitrate Every Decision Node:**
[Your answer: what BFA registrations? What DR entries?]

**P7 — Test Everything Locally:**
[Your answer: unit / simulation / e2e / docker tests?]

**P8 — Open Source Model Training (Cost Optimization):**
[Your answer: training data captured? model routing enabled?]

**P9 — Mode C Event-First Architecture (NEW):**
> Event contracts are canonical. Code is advisory. QUEUE FABRIC only.
> Source: DECISIONS-LOCKED.md D2, D3, D7 + FLOW-INTEGRATION-MODE-C.md
[Your answer: what events does this task emit/consume? Are schemas in contracts/events/?
 Is QUEUE FABRIC the only inter-service communication? No PII in events?
 Integration boundary per factory (INJECTABLE vs PLATFORM-ONLY)?]

**P10 — Client-Side Architecture (NEW):**
> Every flow has a parallel client state machine. Users experience steps
> at human timescale. FlowStateSnapshot enables app-reopen recovery.
> Source: DECISIONS-LOCKED.md CLIENT-1 through CLIENT-4
[Your answer: what does the user see at each step? FlowStateSnapshot defined?
 Optimistic UI 3-part contracts for user actions? App-reopen behavior?
 SDK: @xiigen/sdk-nestjs + @xiigen/sdk-react?]

---

## WHAT I NEED YOU TO PRODUCE

### Step 1 — Mandatory Document Check (before writing anything)
```
□ PROJECT_REFERENCE.md consulted — document map understood
□ DECISIONS-LOCKED.md consulted — D-FT-1 checked, no locked decision reopened without ADR
□ INFRASTRUCTURE-FLOWS-STATE-v4.json consulted — baseline numbers verified
```

### Step 2 — Infrastructure Discovery (verify, then write)
Run the 9-step protocol from infrastructure-discovery-skill:
- Verify exact artifact numbers from live canonical docs
- Map every plan element to a verified file:line reference
- Check `.claude/skills/` for existing relevant skills (SK-416–SK-429 available)
- Check `contracts/features/` for existing FT records if task touches Feature Registry
- Confirm test baselines with exact counts

### Step 3 — No-Code Plan Summary (reference doc format)
Covering:
- Phase count and phase titles
- Skills created per phase (with SK numbers)
- Code files modified (before/after line counts)
- New factories, task types, BFA rules, skills (with verified next artifact numbers)
- New FT records if task involves Feature Registry (with portingCandidate classification)
- Event contracts created (P9 — list schemas in contracts/events/FLOW-XX/)
- Client state map summary (P10 — what the user sees at each step)
- Which of the 7 merged canonical docs need updating
- Estimated session count and time per session

### Step 4 — Positive and Negative Examples
For the core output this task produces:
- **Positive example:** what correct output looks like (specific, with event names)
- **Negative example:** what a violation looks like (score-0 conditions, PII in event)

### Step 5 — For user-facing flows: Flow Reexamination
Apply flow-reexamination-skill (7 passes).
Run SK-418 FlowCompletenessChecker.
Present 15/15 checklist results.

### Step 6 — Validation
Run all 15 FC checks (plan-review-skill v2.0 SESSION-0 template):
- FC-1 through FC-12: original consistency checks
- FC-13: Mode C contract completeness
- FC-14: client-side completeness
- FC-15: DECISIONS-LOCKED compliance + meta-arbitration blast radius
Present FC check results.
⛔ STOP — wait for my approval before producing SESSION-1.

### Step 7 — Session Files (only after my approval)
Produce in agent-output-format:
```
STATE.json                     ← current_session: 0
SESSION-0-PLAN-REVIEW.md       ← FC-1 through FC-15 checks
SESSION-1-[TITLE].md           ← first executable phase
docs/REFERENCE-PLAN.md         ← this summary (labeled: do not execute)

For user-facing flows additionally:
contracts/events/FLOW-XX/      ← event schema stubs
contracts/topologies/FLOW-XX.topology.json ← topology stub
contracts/tests/FLOW-XX.test-matrix.json   ← test matrix stub

For Feature Registry work additionally:
contracts/features/            ← FT manifest stubs
```

Every SESSION file must end with the Phase Completion Package section
(per SK-427 PhaseCompletionPackager), not a bare ⛔ STOP:

```
## PHASE GATE
[gate checks]

## PHASE COMPLETION PACKAGE
# Run only after ALL gate checks above pass
# 1. Write EXECUTION-LOG-{phase}.json per SK-426
# 2. Write PHASE-COMPLETE-{phase}.md per SK-427
# 3. Write SESSION-BRIEF-{phase}.md per SK-428
# 4. Append git report per SK-429

## ⛔ STOP
Present PHASE-COMPLETE-{phase}.md and wait for explicit approval.
```

---

## HARD CONSTRAINTS (apply to every phase, no exceptions)

```
NEVER:
✗ Use artifact numbers from memory — verify against INFRASTRUCTURE-FLOWS-STATE-v4.json
✗ Use FT-prefix for any artifact except Feature Registry entries (D-FT-1)
✗ Reopen a locked decision without an ADR entry in DECISIONS-LOCKED.md
✗ Create a document competing with an existing Tier 1-3 document (SK-423)
✗ Create typed models (class X {}) — use Record<string,unknown>
✗ Import provider SDKs in service code — use fabric interfaces
✗ Make HTTP calls directly between services — use QUEUE FABRIC events (P9)
✗ Put PII in any event payload (P9) — email, firstName, lastName, phone
✗ Skip FlowStateSnapshot for user-facing flows (P10)
✗ Make payment or irreversible actions optimistic (P10)
✗ Chain phases without my explicit approval
✗ Declare a phase complete if either npm test suite regresses
✗ Use process.env.* for any business or AI provider value
✗ End a SESSION file with a bare ⛔ STOP — always include Phase Completion Package
✗ Set portingCandidate via tenant config — it is a MACHINE field (D-36-5)
✗ Call PortingCostEstimator when portingCandidate=false — prohibited guard is FIRST

ALWAYS:
✓ Read PROJECT_REFERENCE.md + DECISIONS-LOCKED.md + STATE-v4.json first
✓ Event contracts in contracts/events/FLOW-XX/ (not embedded in service code)
✓ correlationId + tenantId + traceparent on every event (DNA-5, DNA-7)
✓ Execution unit owns retry (not orchestrator) — D15 decision
✓ Return DataProcessResult<T> — never throw for business logic
✓ Extend MicroserviceBase — every new service
✓ storeDocument() BEFORE enqueue() — outbox pattern
✓ Both cd server && npm test AND cd client && npm test in every gate
✓ Save STATE.json after every phase
✓ After gate passes: run SK-427 PhaseCompletionPackager (produces 3 output files)
✓ ⛔ STOP after every phase — present PHASE-COMPLETE.md, wait for "yes"
✓ DPO triples include ftId field when FLOW-36 has already run
```

---

## WHAT I APPROVE AND WHEN

I approve one phase at a time. My approval signals:
- `"yes"` / `"continue"` / `"proceed to [N]"` → execute exactly that phase
- `"yes [N] only"` → execute phase N and STOP

You do not proceed based on plan content or time pressure.
You escalate rather than guess on any product decision.

---

## NOW BEGIN

1. Confirm all 7 skills are loaded
2. Read PROJECT_REFERENCE.md, DECISIONS-LOCKED.md, STATE-v4.json
3. Run infrastructure discovery (verify artifact numbers live)
4. Check all 10 Gate 0 principles using my answers above
5. Produce the no-code plan summary
6. ⛔ STOP — present the plan and wait for my review
