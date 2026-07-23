# XIIGEN PLANNING SKILLS — HOW TO USE THEM
## Version: v5.5 | Date: 2026-03-22
## Changes from v5.4:
##   - SK-430 NamingConventionsEnforcer registered (step 8 of pipeline)
##   - SK-431 StackCouplingAuditor registered (step 9 of pipeline)
##   - SK-432 HybridPromptBuilder registered (runs alongside SK-431)
##   - SK-418 upgraded to v1.3 (31-item checklist, V29/V30/V31 added)
##   - xiigen-core-principles upgraded to v3 (P11 Stack Coupling Awareness)
##   - how-to-prepare-a-plan upgraded to v5 (9-step pipeline)
##   - FLOW-00.1 and FLOW-00.2 added to execution order
##   - FLOW-34 (marketplace plugin adapters) documented
##   - Stack coupling type system documented (StackKey, StackCategory)
##   - D-STACK-1 through D-STACK-8 locked
##   - FLOW-01 re-review cycle documented (31/31 required before execution)

---

## WHAT YOU HAVE IN THIS PROJECT

```
FOR PLANNING (web sessions — you + Claude):
  xiigen-core-principles/SKILL.md    ← v3: 11 principles (P1-P11), P11 = Stack Coupling
  how-to-prepare-a-plan/SKILL.md     ← v5: 9-step pipeline, FC-1–FC-21
  flow-reexamination-SKILL-v1.md     ← 7-pass algorithm (unchanged)
  SESSION-0-PLAN-REVIEW-TEMPLATE-v2.md ← 21 FC checks before execution
  NEW-TASK-PLANNING-PROMPT-v2_2.md   ← Paste to start any new planning session
  naming-conventions-SKILL.md        ← Universal naming principles (base)

  Stack coupling docs:
  STACK-COUPLING-AUDIT-FLOW-01-04-v1.md  ← Full 7-server × 7-client matrix
  FLOW-34-REFERENCE-PLAN-v1.md           ← Marketplace plugin adapter pattern

  Infrastructure plans:
  FLOW-00.1-REFERENCE-PLAN-v1.md    ← Naming fix-up (4 phases)
  FLOW-00.2-REFERENCE-PLAN-v1.md    ← Stack coupling base (6 phases)
  FLOW-33-REFERENCE-PLAN-v3.md
  FLOW-35-REFERENCE-PLAN-v2.md
  FLOW-36-REFERENCE-PLAN-v2.md
  FLOW-00-REFERENCE-PLAN-v1.md

  User flow reference plans (updated for v9/v5/v3/v2):
  FLOW-01-REFERENCE-PLAN-v9.md      ← 31/31 ✅ canonical example
  FLOW-02-REFERENCE-PLAN-v5.md
  FLOW-03-REFERENCE-PLAN-v3.md
  FLOW-04-REFERENCE-PLAN-v2.md

  Marketplace:
  XIIGEN-MARKETPLACE-MASTER-PLAN.md ← 65 plugins × 14 platforms
  figma_to_code_adapt_to_canva.zip   ← C5: canonical FLOW-34 example (ready to execute)

FOR DECISION-MAKING:
  SK-416-SKILL.md  PlanningSessionStartup     ← always first
  SK-417-SKILL.md  DecisionReopening          ← challenge locked decisions
  SK-418-SKILL.md  FlowCompleteness v1.3      ← 31-item checklist (V1–V31)
  SK-419-SKILL.md  ModeCContracts v1.1        ← event schemas, stack-neutral check
  SK-420-SKILL.md  ClientServerSymmetry       ← client state map
  SK-421-SKILL.md  E2ETestMatrixBuilder       ← 8 test categories
  SK-422-SKILL.md  MetaEscalationRouter       ← escalate vs retry
  SK-423-SKILL.md  DocumentHierarchy          ← find the right document
  SK-424-SKILL.md  BlastRadius                ← impact before any change
  SK-425-SKILL.md  ModelSelection             ← model cost vs quality
  SK-430-SKILL.md  NamingConventions          ← step 8 — domain names, Jira 5-section
  SK-431-SKILL.md  StackCouplingAuditor       ← step 9 — CONCEPT_NEUTRAL/IMPL_VARIES/STACK_COUPLED
  SK-432-SKILL.md  HybridPromptBuilder        ← convert genesis prompts to Option C

FOR SESSION OUTPUT (Claude Code):
  SK-426-SKILL.md  SessionExecutionLogSchema  ← EXECUTION-LOG format
  SK-427-SKILL.md  PhaseCompletionPackager    ← 3 output files after gate
  SK-428-SKILL.md  WebSessionHandoff          ← SESSION-BRIEF format
  SK-429-SKILL.md  PhaseGitReport             ← git report appended

FOR PARALLEL WAVES / FEATURE REGISTRY / BUNDLES:
  SK-434-SKILL.md  ParallelWaveCoordinator
  SK-435-SKILL.md  ProductVariantRouter
  SK-436-SKILL.md  BundleVersionGuard
  SKILL-REGISTRATION-MANIFEST-v5.md
```

---

## THE DEVELOPMENT CYCLE

```
┌─────────────────────────────────────────────┐
│  1. Web Session (you + Claude)              │
│     Paste NEW-TASK-PLANNING-PROMPT-v2_2.md  │
│     → 9-step pipeline runs                  │
│     → Plan produced → you approve           │
│     → SESSION files produced                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. Claude Code executes one phase          │
│     → Code + tests + platform run           │
│     → Gate passes                           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. Phase Completion Package (SK-426–429)   │
│     EXECUTION-LOG-{phase}.json              │
│     PHASE-COMPLETE-{phase}.md   ← for you  │
│     SESSION-BRIEF-{phase}.md    ← for web  │
└──────────────────┬──────────────────────────┘
                   │ You say "yes"
                   ▼
         Next web session — paste SESSION-BRIEF
```

---

## EXECUTION ORDER (authoritative — 2026-03-22)

```
FLOW-0A (master plan sessions)
  → SKILL-GRAPH-S1
  → FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30 → FLOW-26 → FLOW-31 → FLOW-33
  → FEATURE-REGISTRY-S1 (S1-A schema v2.0, S1-B two manifests)
  → FLOW-35 (meta-arbitration engine)
  → FLOW-36 (feature registry — FT-XXX artifacts)
  → FLOW-00 (bundle activation)
  → FLOW-00.1 (naming fix-up — 4 phases)     ← NEW
      Gate: npm run lint:naming exits 0
  → FLOW-00.2 (stack coupling base — 6 phases) ← NEW
      Gate: SK-431/432 registered, SK-418 v1.3 active
  → FLOW-34 thin adapters (D-34-1)            ← marketplace plugins
      C5 Canva adapter: canonical example (sessions ready)
  → FLOW-01 re-review (planning only → v9 plan, 31/31) ← NEW
  → FLOW-02 re-review → FLOW-03 re-review → FLOW-04 re-review
  → FLOW-01 execution (Wave 0)
  → FLOW-02 execution (Wave 1)
  → FLOW-03..24 (Wave 2+ parallel)
```

**Why FLOW-00.1 and FLOW-00.2 come before FLOW-01:**
FLOW-00.1 fixes naming violations (files, constants, Jira comments).
FLOW-00.2 builds the type system and skills that make FLOW-01's plan
stack-aware. Without them, FLOW-01 generates NestJS-only code with no
record of what works on other stacks.

**Why re-review sessions come before execution:**
FLOW-01 v7 scores 28/28. After FLOW-00.2, the checklist is 31 items.
The re-review sessions add V29/V30/V31 to the plan and produce the
updated v9 plan that Claude Code actually executes.

---

## SCENARIO 1 — STARTING A NEW PLANNING SESSION

### Step 1: Open a new conversation in this project

All skill files load automatically.

### Step 2: Paste NEW-TASK-PLANNING-PROMPT-v2_2.md

Fill in P1–P11 answers. **P11 is new** — answer these:
```
P11 answer: stackTargets: ['node-nestjs']. clientTargets: ['react-web'].
T47 is IMPL_VARIES (token gen + rate-limit syntax). T48 is STACK_COUPLED
(Bull/BullMQ scheduler model). php-wordpress INCOMPATIBLE for T48 (wp_cron
unreliable for 24h TTL). stateNotes planned for awaiting-email-verification:
BehaviorSubject, feature-scoped, MEDIUM propagation (Angular).
```

### Step 3: Claude runs the 9-step pipeline

```
① agent-output-format
② xiigen-core-principles v3 (P1–P11)
③ SK-416 startup
④ infrastructure-discovery
⑤ planning-skill
⑥ plan-review-skill (FC-1–21)
⑦ flow-reexamination (user-facing flows)
⑧ SK-430 naming check
⑨ SK-431 stack coupling + SK-432 hybrid prompts
```

### Step 4: Claude stops and presents the plan

```
⛔ STOP — plan presented. Awaiting your review.
```

### Step 5: Claude produces session files after "yes"

```
STATE.json              ← flow_id, flow_name, stackTargets, clientTargets
SESSION-0-PLAN-REVIEW   ← FC-1 through FC-21 self-check
SESSION-1               ← first executable phase

For user-facing flows additionally:
  contracts/events/FLOW-XX/     ← event schemas
  contracts/topologies/         ← topology with stackCoupling per node
  contracts/tests/              ← test matrix
```

---

## SCENARIO 2 — RE-EXAMINING AN EXISTING FLOW PLAN

```
"Re-examine FLOW-03 for v3.
Apply all 7 passes + SK-418 v1.3 (31-item check).
After passes 1–7, run SK-431 on all task types and SK-432 on all genesis prompts.
Stop after each pass and show me the output."
```

**V29–V31 are the new gaps** for pre-FLOW-00.2 plans. After FLOW-00.2
completes, these should be quick to fill in using the STACK-COUPLING-AUDIT.

---

## SCENARIO 3 — PLANNING A FLOW-34 PLUGIN ADAPTER

```
"Plan a Miro adapter for the Diagram Parser (M-FLOW plugin).
Read FLOW-34-REFERENCE-PLAN-v1.md first.
C5 (Canva Text Adapter) is the canonical session structure.
Produce SESSION-0 through SESSION-4 following the C5 pattern."
```

**Always check first:**
- Does a StackCapabilityDeclaration exist for this platform SDK?
  (14 platforms declared in FLOW-00.2 Phase D)
- Is the FT record in the Feature Registry? (FLOW-36)
- Which plugin family is this? (Utility/FLOW/AUTO/VIDEO)
  Each family has different session count (Utility: 5, FLOW: 6, VIDEO: 7)

---

## SCENARIO 4 — FLOW-01 RE-REVIEW SESSION

```
"Re-review FLOW-01 against SK-418 v1.3.
Start from FLOW-01-REFERENCE-PLAN-v7.md.
Apply SK-431 to T47/T48/T49. Apply SK-432 to all 3 genesis prompts.
Add stateNotes to all 3 topology nodes.
Produce FLOW-01-REFERENCE-PLAN-v9.md."
```

**This session produces the plan Claude Code will actually execute.**
It is planning only — no code.

---

## SCENARIO 5 — CHECKING IF A PLAN IS READY

```
"Run SK-418 v1.3 on FLOW-02-REFERENCE-PLAN-v5.md. Show me what's missing."
```

31 items now. The new gaps for older plans are V29/V30/V31.

---

## WHAT EACH NEW SKILL DOES

| Skill | Invoke when | Never invoke when |
|-------|------------|------------------|
| SK-430 NamingConventions | Step 8 of every pipeline; any new file name; naming review | Plan has no new files and no new EngineContracts |
| SK-431 StackCouplingAuditor | Step 9 of every pipeline; before any genesis prompt; "does this work on Angular/Python/WordPress" | — always invoke for new flows |
| SK-432 HybridPromptBuilder | Building or converting genesis prompts; Pass 7 of re-examination | The prompt is already in hybrid format |

---

## THE THREE APPROVAL GATES (unchanged)

```
GATE A: FC-1 through FC-21 all pass (automated)
        + SK-418 v1.3: 31/31

GATE B: 2 AI cross-reviews

GATE C: Your written approval
```

---

## STACK COUPLING QUICK REFERENCE

```
D-STACK-1: Three tiers
  CONCEPT_NEUTRAL  — rule applies word-for-word on any stack
  IMPL_VARIES      — same concept, syntax differs by dimension
  STACK_COUPLED    — fundamentally different per stack
  INCOMPATIBLE     — cannot implement on this stack within XIIGen model

D-STACK-2: Option C hybrid genesis prompt (approved)
  Section 1: neutralIronRules[] — NO framework names allowed
  Section 2: conceptDescription — plain English
  Section 3: eventContracts — CONSUMES / EMITS / BOUNDARY
  Section 4: stackImplementations — per "{stackType}:{side}" key

D-STACK-3: Priority stacks
  server: node-nestjs  |  client: react-web

D-STACK-7: stackType is open string; stackCategory is closed enum (22 values)
  StackKey = "{stackType}:{side}"  where  side = server | client | platform | other
  Examples: "node-nestjs:server", "canva-app:client", "redis:platform",
            "sap-abap-extension:other", "our-internal-go-service:server"

D-STACK-8: @xiigen/plugin-sdk is CONCEPT_NEUTRAL for all 65 marketplace plugins
  "@xiigen/plugin-sdk:platform" entry is always CONCEPT_NEUTRAL in plugin coupling maps

Known INCOMPATIBLE combinations (flagged in FLOW-00.2 Phase E):
  T48 + php-wordpress:server — wp_cron unreliable for 24h security-critical TTL
  T50 + php-wordpress:server — no native parallel execution in sync PHP
  T50 + sap-abap-extension:server — RFC calls cannot fan-in
  Any flow with realtime-push + php-server-rendered:client — no WebSocket
  Any flow with offlineQueue + php-server-rendered:client — no client state layer
```

---

## DOCUMENT QUICK-LOOKUP (updated)

| I need... | Look in... |
|-----------|-----------|
| Current test baseline | INFRASTRUCTURE-FLOWS-STATE-v4.json → corrected_baseline_chain |
| Next artifact number | INFRASTRUCTURE-FLOWS-STATE-v4.json |
| Domain name for a flow | DECISIONS-LOCKED.md → D-NAMING-1 |
| Stack coupling for a task type | EngineContract.stackCoupling or STACK-COUPLING-AUDIT-FLOW-01-04-v1.md |
| Known platform SDK capabilities | stack-capability-declaration.ts (FLOW-00.2 Phase A output) |
| stateNotes for a topology node | contracts/topologies/FLOW-XX.topology.json → nodes[].stackCoupling |
| Whether a stack is INCOMPATIBLE | DECISIONS-LOCKED.md → D-STACK-4 (WordPress) or task type stackCoupling.entries |
| 65 marketplace plugins | XIIGEN-MARKETPLACE-MASTER-PLAN.md |
| FLOW-34 plugin session structure | FLOW-34-REFERENCE-PLAN-v1.md + figma_to_code_adapt_to_canva.zip (C5 example) |
| Canva platform SDK capabilities | stack-capability-declaration.ts → CANVA_APP_DECLARATION |
| Which document governs X | PROJECT_REFERENCE.md → Document Map |
| Complete flow plan example (31/31) | FLOW-01-REFERENCE-PLAN-v9.md |

---

## HARD STOP TRIGGERS (unchanged)

```
⛔ STOP in PHASE COMPLETION PACKAGE → package + stop
npm test regression → stop (no package)
FC check fails in SESSION-0 → stop before SESSION-1
lint:naming exits 1 after Phase D → stop (naming violation)
SK-431 V29/V30/V31 fail → stop (stack coupling incomplete)
Spend limit reached → escalate + stop
Security HARD_STOP → escalate immediately
```

---

## WHAT CLAUDE CODE PRODUCES AFTER EVERY PHASE

```
sessions/FLOW-XX/
  EXECUTION-LOG-{phase}.json   ← exact numbers: test delta, files, costs
  PHASE-COMPLETE-{phase}.md    ← for you: prose summary, gate table, ⛔ STOP
  SESSION-BRIEF-{phase}.md     ← for next web session: cold-start doc
  round-decisions.jsonl        ← append-only: arbiter decisions
```

PHASE-COMPLETE includes:
- Jira comment (5-section SK-430 Rule 5 format)
- lint:naming gate result
- V29/V30/V31 verification for flows with stackCoupling

---

## YOUR APPROVAL SIGNALS (unchanged)

```
"yes"              → execute next phase
"continue"         → execute next phase
"proceed to [N]"   → execute phase N
"yes [N] only"     → execute phase N, then STOP
"no" / "stop"      → present current state, do not proceed
```
