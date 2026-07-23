# XIIGEN PLANNING SKILLS — HOW TO USE THEM
## For humans planning in web sessions + Claude Code executing sessions
## Version: v5.3 | Date: 2026-03-20
## Changes from v5.2:
##   - Added SK-434 ParallelWaveCoordinator
##   - Added SK-435 ProductVariantRouter
##   - Added SK-436 BundleVersionGuard
##   - SK-418 updated to v1.1 (23-item checklist, adds V16-V23)
##   - SKILL-REGISTRATION-MANIFEST updated to v3
##   - Execution order updated: FLOW-00 added, Wave notation added
## These files are now in the project. They load automatically.

---

## WHAT YOU HAVE IN THIS PROJECT

Two sets of skills, two audiences:

```
FOR PLANNING (web sessions — you + Claude):
  xiigen-core-principles-SKILL-v2.md   ← Gate 0: 10 principles, 44 checks
  how-to-prepare-a-plan-SKILL-v3.md    ← Master orchestration: 7-skill pipeline
  flow-reexamination-SKILL-v1.md       ← 7-pass algorithm for Mode C flows
  SESSION-0-PLAN-REVIEW-TEMPLATE-v2.md ← 15 FC checks before any execution
  NEW-TASK-PLANNING-PROMPT-v2_2.md     ← Paste this to start any new planning session
  UPGRADE-GUIDE.md                     ← What changed from v4 and why
  PROJECT_REFERENCE.md                 ← Master navigation — read this first

  Feature Registry plans (new — 2026-03-20):
  FEATURE-REGISTRY-S1-PLAN.md          ← Addendum: 2 phases, runs after FLOW-33
  FLOW-36-REFERENCE-PLAN-v2.md         ← Feature Registry flow: 6 phases

FOR DECISION-MAKING (any session — know what to check):
  SK-416-SKILL.md  PlanningSessionStartup   ← read STATE.json + DECISIONS-LOCKED first
  SK-417-SKILL.md  DecisionReopening        ← how to challenge a locked decision
  SK-418-SKILL.md  FlowCompletenessChecker  ← 15-item validation before session files
  SK-419-SKILL.md  ModeCContracts           ← designing event schemas
  SK-420-SKILL.md  ClientServerSymmetry     ← client state map + optimistic UI
  SK-421-SKILL.md  E2ETestMatrixBuilder     ← 8 mandatory test categories
  SK-422-SKILL.md  MetaEscalationRouter     ← when to escalate vs retry
  SK-423-SKILL.md  DocumentHierarchy        ← find the right document, no duplicates
  SK-424-SKILL.md  BlastRadiusAssessor      ← impact before any engine change
  SK-425-SKILL.md  CostEffectiveModels      ← model selection + OSS readiness
  SK-434-SKILL.md  ParallelWaveCoordinator  ← parallel-wave gate model, CAS write, pre-allocation (NEW)
  SK-435-SKILL.md  ProductVariantRouter     ← thin vs full adapter, D-34-1 enforcement (NEW)
  SK-436-SKILL.md  BundleVersionGuard       ← minFlowVersions check after promotion (NEW)
  SKILL-REGISTRATION-MANIFEST-v3.md        ← wire SK-416–436 into FLOW-35 Phase A

FOR SESSION OUTPUT (Claude Code — runs automatically after every phase gate):
  SK-426-SKILL.md  SessionExecutionLogSchema ← EXECUTION-LOG-{phase}.json format
  SK-427-SKILL.md  PhaseCompletionPackager   ← produces 3 output files after gate
  SK-428-SKILL.md  WebSessionHandoff         ← SESSION-BRIEF-{phase}.md format
  SK-429-SKILL.md  PhaseGitReport            ← git report appended to PHASE-COMPLETE
```

---

## THE DEVELOPMENT CYCLE (how all pieces connect)

```
┌─────────────────────────────────────────────────┐
│  1. Web Session (you + Claude)                  │
│     Paste NEW-TASK-PLANNING-PROMPT-v2_2.md      │
│     → Plan produced → you approve → SESSION files│
└─────────────────┬───────────────────────────────┘
                  │ SESSION files handed to Claude Code
                  ▼
┌─────────────────────────────────────────────────┐
│  2. Claude Code executes one phase              │
│     → Code changes + tests + platform run      │
│     → Gate passes                              │
└─────────────────┬───────────────────────────────┘
                  │ Gate passes → SK-427 runs automatically
                  ▼
┌─────────────────────────────────────────────────┐
│  3. Phase Completion Package (SK-426–429)       │
│     EXECUTION-LOG-{phase}.json  ← exact numbers │
│     PHASE-COMPLETE-{phase}.md   ← for you       │
│     SESSION-BRIEF-{phase}.md    ← for web Claude│
│     Git report appended         ← traceability  │
└─────────────────┬───────────────────────────────┘
                  │ You review PHASE-COMPLETE, say "yes"
                  ▼
┌─────────────────────────────────────────────────┐
│  1. Next Web Session                            │
│     Paste SESSION-BRIEF-{phase}.md              │
│     → Claude starts cold, no re-explaining     │
│     → Plan next phase → you approve → repeat   │
└─────────────────────────────────────────────────┘
```

---

## EXECUTION ORDER (authoritative — 2026-03-20)

```
FLOW-0A (master plan sessions 1-12)
  → SKILL-GRAPH-S1
  → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30 → FLOW-26
  → FLOW-31 → FLOW-33        ← engine runs uninterrupted
  → FEATURE-REGISTRY-S1      ← addendum: 2 phases, zero code changes
                                 schema + namespace + Figma plugin migration
  → FLOW-35                  ← meta-arbitration engine
  → FLOW-36                  ← Feature Registry (FT-XXX artifacts)
  → FLOW-34                  ← now feature-aware (reads FT records)
  → FLOW-01 through FLOW-24  ← any order
```

**Why this order matters:**
- FEATURE-REGISTRY-S1 must run before FLOW-35 so the FT-XXX namespace is locked
  before meta-arbitration can inadvertently use the prefix
- FLOW-36 must run before FLOW-34 so FLOW-34's Phase A can call PortingDecisionGate
- FLOW-01–24 run after FLOW-36 so their DPO triples carry ftId from day one

---

## SCENARIO 1 — STARTING A NEW PLANNING SESSION
## (web session: you describe a task, Claude produces session files)

### Step 1: Open a new conversation in this project

Because these files are in the project, Claude already has them in context.
You do not need to paste or load anything manually.

### Step 2: Paste NEW-TASK-PLANNING-PROMPT-v2_2.md

Copy the entire file and paste it at the start of your message.
Fill in every bracketed value — especially the P1–P10 principle answers.
Unanswered principles block the plan.

```
Example opening message:

"[Paste NEW-TASK-PLANNING-PROMPT-v2_2.md here with all brackets filled in]

P9 answer: This task emits UserRegistrationInitiated and EmailVerified.
Schemas in contracts/events/FLOW-01/. QUEUE FABRIC only, no HTTP calls.
F174 is INJECTABLE, F181 is PLATFORM-ONLY.

P10 answer: User sees VerificationWaiting screen for up to 24h.
FlowStateSnapshot returns currentStep + remainingMs. Resend button
uses optimistic contract: optimisticState→disabled, confirmationEvent→
VerificationEmailSent, rollbackEvent→ResendRateLimited."
```

### Step 3: Claude runs the pipeline automatically

The 7-skill pipeline triggers from the prompt content:

```
① agent-output-format     ← declares: output is for Claude Code, not human
② xiigen-core-principles  ← checks all 10 principles (44 items) against your answers
③ SK-416 startup          ← reads STATE.json + DECISIONS-LOCKED.md baseline
④ infrastructure-discovery ← verifies artifact numbers against live canonical docs
⑤ planning-skill          ← validates architectural content (8 gates)
⑥ plan-review-skill       ← runs FC-1 through FC-15
⑦ flow-reexamination      ← if user-facing flow: runs 7 passes + SK-418 check
```

### Step 4: Claude stops and presents the plan

Claude presents the no-code plan summary, positive/negative examples,
and FC check results (all 15). It then stops:

```
⛔ STOP — present the plan and wait for your review
```

Read it. If correct, say **"yes"** or **"approved"**.

### Step 5: Claude produces session files

After your approval, Claude produces:
```
STATE.json                    ← Claude Code reads this first (current_session: 0)
SESSION-0-PLAN-REVIEW.md      ← FC-1 through FC-15 with actual script results
SESSION-1-[TITLE].md          ← first executable phase
docs/REFERENCE-PLAN.md        ← context only, labeled DO NOT EXECUTE

For user-facing flows additionally:
contracts/events/FLOW-XX/     ← event schema stubs
contracts/topologies/FLOW-XX.topology.json
contracts/tests/FLOW-XX.test-matrix.json

For Feature Registry work additionally:
contracts/features/           ← FT manifests and feature-manifest.schema.json
```

Every SESSION file includes the Phase Completion Package section at the end
(SK-427). Claude Code runs it automatically after the gate passes.

### Step 6: Hand to Claude Code

Give Claude Code exactly these files in order:
1. `STATE.json` — entry point
2. `SESSION-0-PLAN-REVIEW.md` — runs first, self-reviews plan
3. `SESSION-1-[TITLE].md` — first executable phase (only after SESSION-0 gate)

---

## SCENARIO 2 — RE-EXAMINING AN EXISTING FLOW PLAN
## (any flow from FLOW-01 through FLOW-10 that was server-only)

```
"Re-examine FLOW-07 using the flow-reexamination-skill.
Apply all 7 passes to FLOW-07-REFERENCE-PLAN.md.
Stop after each pass and show me the output before proceeding."
```

Claude applies 7 passes: event contracts → client events → client state map →
retry/compensation → observability → E2E test matrix → genesis prompts.
SK-418 runs 15-item checklist. Flow is complete when all 15 pass.
FLOW-01-REFERENCE-PLAN-v5.md is the canonical example of a fully re-examined flow.

---

## SCENARIO 3 — ESCALATION DECISIONS
## (meta-arbitration produced ESCALATE or HALT)

When a round fails and the meta::round-controller escalates, Claude Code
receives an EscalationBriefing. You review it and choose an option.

**If the option involves modifying the engine**, say:
```
"Apply option [A/B/C/D] from the escalation briefing.
Use the correct protocol from ENGINE-MODIFICATION-PROTOCOLS.md."
```

SK-415 (SelfModificationOrchestrator) selects the right protocol:

| Escalation option says... | Protocol used |
|--------------------------|---------------|
| Add a new AF station | SK-407 ADD_STATION |
| Remove an AF station | SK-408 REMOVE_STATION |
| Complete a skill stub | SK-409 COMPLETE_SKILL |
| Modify existing skill | SK-410 MODIFY_SKILL |
| Add a new arbiter | SK-411 ADD_ARBITER |
| Remove an arbiter | SK-412 REMOVE_ARBITER |
| Change arbiter threshold | SK-413 CHANGE_ARBITER |
| Fix data between stations | SK-414 CHANGE_STREAM |

---

## SCENARIO 4 — CHECKING IF A PLAN IS READY

```
"Run SK-418 on [FLOW-XX-REFERENCE-PLAN.md] and tell me what's missing."
```

Claude runs the 15-item checklist and produces a gap report.
A flow is only ready when all 15 pass.

---

## SCENARIO 5 — CHALLENGING A LOCKED DECISION

Do NOT just say "I think we should change X". Follow SK-417:

```
"I need to reopen D15 (retry ownership). The trigger is:
EP-2 timer in FLOW-09 T96 fires retries directly at the platform level —
the execution unit never sees the retry event. This is a concrete failure
in the current plan, not a preference."
```

If your trigger is invalid ("I just think there's a better way"), Claude
will refuse to reopen the decision. Locked decisions exist to prevent
re-litigating settled choices.

---

## SCENARIO 6 — PLANNING A FLOW-35 SESSION
## (meta-arbitration engine implementation)

```
"Start SESSION-FLOW-35-A using FLOW-35-REFERENCE-PLAN-v2.md.
The naming table is approved. Produce SESSION-FLOW-35-A.md only."
```

Claude Code produces SESSION-FLOW-35-A.md covering:
- Add META_COLLECTION and META_DECISION to ContractArchetype enum
- Create EngineContracts T565 and T566
- Register F1484–F1490 factory interfaces
- Seed CF-789–CF-795 BFA rules
- Register SK-402–SK-415 stubs (14 meta-arbitration skills)
- Register SK-416–SK-425 graph edges (10 planning skills, impls already exist)
- Register SK-426–SK-429 stubs (4 session output skills)
- Create data structure schemas (RoundSummary, RoundDecision, etc.)
- Take baseline snapshot FLOW-35-A-baseline.json

Gate: compiles, all stubs registered, CF rules seeded, ≥ 3,968 tests.

After Phase H (self-modification), proceed to Phase I (session output).
After you approve Phase I, proceed phase by phase.
Never chain phases without explicit per-phase approval.

---

## SCENARIO 7 — CONTINUING FROM A CLAUDE CODE SESSION BRIEF
## (Claude Code just finished a phase and produced SESSION-BRIEF)

This is the most common scenario once FLOW-35 Phase I is complete.

### Step 1: Open a new conversation in this project

### Step 2: Paste the SESSION-BRIEF

```
"[Paste SESSION-BRIEF-{phase}.md content here]

Approve Phase {next} and produce SESSION-FLOW-35-{next}.md."
```

### Step 3: Claude produces the next SESSION file

Claude reads the brief and immediately knows what was built, current baseline,
what costs were incurred, and what the next phase should build.

### Step 4: Approve and hand to Claude Code

Say `"yes"` and hand Claude Code the new SESSION file.
Claude Code executes, phase completes, produces the next SESSION-BRIEF.
Cycle repeats.

---

## SCENARIO 8 — PLANNING FEATURE-REGISTRY-S1 OR FLOW-36
## (Feature Registry groundwork and implementation)

### FEATURE-REGISTRY-S1 (runs after FLOW-33, before FLOW-35)

```
"Execute FEATURE-REGISTRY-S1 per FEATURE-REGISTRY-S1-PLAN.md.
Start with S1-A only. Zero code changes — schema files and document
annotations only."
```

Claude Code produces SESSION-FEATURE-REGISTRY-S1-A.md covering:
- D-FT-1 entry added to DECISIONS-LOCKED.md
- contracts/features/feature-manifest.schema.json created (v1.0)
- INFRASTRUCTURE-FLOWS-STATE-v4.json addendum section added
- STATE-S1-A.json saved

After S1-A gate, proceed to S1-B:
```
"yes — proceed to S1-B"
```

S1-B covers: scan Figma plugin code → produce
feature-manifest-figma-plugin-v1.json with FT-001 through FT-00N.
One paragraph annotation added to FLOW-34-REFERENCE-PLAN.md Phase A.

### FLOW-36 (runs after FLOW-35)

```
"Start SESSION-FLOW-36-A using FLOW-36-REFERENCE-PLAN-v2.md.
The naming table is approved. Produce SESSION-FLOW-36-A.md only."
```

Claude Code produces SESSION-FLOW-36-A.md covering:
- Upgrade feature-manifest.schema.json v1.0 → v2.0 (portingCandidate + MODE discriminator)
- Migrate S1-B figma-plugin manifest to v2.0 schema
- Register 7 new task types (FeatureExtractor through FeaturePortingOrchestrator)
- Register 7 factory interfaces
- Seed BFA CF rules (including 3 new PROHIBITED guard rules)
- Back-fill ftId on FLOW-01, FLOW-02, FLOW-33 training traces
- Take baseline snapshot FLOW-36-A-baseline.json

**Key architectural constraint for FLOW-36:**
Features with `portingCandidate=false` are engine-internal (e.g. T519, T520).
PortingDecisionGate emits `PortingProhibited` immediately — no cost estimation,
no arbiter call. This is a BFA score-0 rule. Never skip this guard.

---

## WHAT EACH SKILL DOES — QUICK REFERENCE

| Skill | Invoke when... | Never invoke when... |
|-------|---------------|---------------------|
| SK-416 PlanningSessionStartup | Starting ANY planning session | — always invoke first |
| SK-417 DecisionReopening | You want to challenge a locked decision | You just want to try something different |
| SK-418 FlowCompleteness | A flow plan is "ready" to review | The plan hasn't had all 7 passes yet |
| SK-419 ModeCContracts | Designing event schemas for a flow | Designing service logic or factory interfaces |
| SK-420 ClientSymmetry | The plan only has server-side steps | Background flows with no user interaction |
| SK-421 E2ETestMatrix | Building the test matrix for any flow | Unit tests for a single service method |
| SK-422 MetaEscalation | Round controller produces ESCALATE/HALT | Normal RETRY/REDUCE decisions |
| SK-423 DocumentHierarchy | Before creating any new document | Updating an existing document |
| SK-424 BlastRadius | Before modifying engine or contracts | Adding a session file or test |
| SK-425 ModelSelection | Budget warning or OSS fitness signal | First round of a new flow (accumulate data first) |
| SK-426 ExecutionLogSchema | Gate passes → write log first | Before gate passes — never speculatively |
| SK-434 ParallelWaveCoordinator | STATE.json has parallel_wave: N | Sequential flows (parallel_wave: null) |
| SK-435 ProductVariantRouter | Planning FLOW-34, creating FT record, porting decision | Already know the adapterMode and scope |
| SK-436 BundleVersionGuard | After CASE A or CASE C promotion | CASE B (flow not promoted) |
| SK-427 CompletionPackager | After gate passes → produce 3 output files | If any gate check failed |
| SK-428 WebSessionHandoff | Called by SK-427 step 3 automatically | Standalone — always via SK-427 |
| SK-429 GitReport | Called by SK-427 step 4 automatically | Standalone — always via SK-427 |

---

## THE THREE APPROVAL GATES (never skip any)

```
GATE A — Automated FC checks (FC-1 through FC-15)
  All 15 must pass. If any fail: fix the plan, re-run, then proceed.

GATE B — 2 AI cross-reviews
  Model 1: "Review against 10 principles in xiigen-core-principles-skill"
  Model 2: "Review for structural consistency — artifact numbers, no competing docs"

GATE C — Your written approval
  Say "yes" / "approved" / "proceed to session 1"
  Claude Code NEVER starts SESSION-1 without an explicit Gate C signal.
```

---

## YOUR APPROVAL SIGNALS

```
"yes"                    → execute the next phase
"continue"               → execute the next phase
"proceed to [N]"         → execute phase N specifically
"yes [N] only"           → execute phase N, then STOP
"no" / "stop"            → do not proceed, present current state
```

---

## HARD STOP TRIGGERS (Claude Code stops automatically)

```
⛔ STOP in PHASE COMPLETION PACKAGE section → Claude Code packages + stops
Either npm test suite regresses              → Claude Code stops (no package)
FC check fails in SESSION-0                  → Claude Code stops before SESSION-1
Spend limit reached (meta::spend)            → Claude Code escalates, stops generation
Security HARD_STOP (meta::security)          → Claude Code escalates immediately
Gate fails on any check                      → No EXECUTION-LOG written, no package
```

---

## WHAT CLAUDE CODE PRODUCES AFTER EVERY PHASE (post FLOW-35 Phase I)

```
sessions/FLOW-XX/
  EXECUTION-LOG-{phase}.json   ← exact numbers: test delta, files, costs, arbiters
  PHASE-COMPLETE-{phase}.md    ← for you: prose summary, gate table, ⛔ STOP
  SESSION-BRIEF-{phase}.md     ← for next web session: self-contained cold-start doc
  round-decisions.jsonl        ← append-only: every meta-arbiter decision + outcome
```

---

## DOCUMENT QUICK-LOOKUP

| I need... | Look in... |
|-----------|-----------|
| Current test baseline | INFRASTRUCTURE-FLOWS-STATE-v4.json → corrected_baseline_chain |
| Next artifact number | INFRASTRUCTURE-FLOWS-STATE-v4.json (last used + 1) |
| Next FT-ID | contracts/features/feature-manifest-*.json → last ftId + 1 |
| Whether X is decided | DECISIONS-LOCKED.md |
| FT-XXX namespace rule | DECISIONS-LOCKED.md → D-FT-1 |
| Which document governs X | PROJECT_REFERENCE.md → Document Map |
| Feature manifest schema | contracts/features/feature-manifest.schema.json |
| Figma plugin FT records | contracts/features/feature-manifest-figma-plugin-v1.json |
| portingCandidate classification rules | FLOW-36-REFERENCE-PLAN-v2.md → Phase B |
| How CI/CD pipelines work | PLATFORM-SPEC-CONSOLIDATED.md §2 |
| How the SDK works | PLATFORM-SPEC-CONSOLIDATED.md §4 |
| How client state works | PLATFORM-SPEC-CONSOLIDATED.md §5 |
| How meta-arbiters decide | META-ARBITRATION-LAYER.md |
| Engine modification procedure | ENGINE-MODIFICATION-PROTOCOLS.md |
| How to update a flow plan | FLOW-REEXAMINATION-ALGORITHM.md |
| Complete flow plan example | FLOW-01-REFERENCE-PLAN-v5.md |
| BFA CF ranges per flow | INFRASTRUCTURE-FLOWS-STATE-v4.json → bfa_cf_ranges |
| What Claude Code built last phase | sessions/FLOW-XX/PHASE-COMPLETE-{phase}.md |
| Full cost + arbiter history | sessions/FLOW-XX/round-decisions.jsonl |
| Phase traceability to git | sessions/FLOW-XX/PHASE-COMPLETE-{phase}.md → Git Changes |
| FEATURE-REGISTRY-S1 plan | FEATURE-REGISTRY-S1-PLAN.md |
| FLOW-36 reference plan | FLOW-36-REFERENCE-PLAN-v2.md |
