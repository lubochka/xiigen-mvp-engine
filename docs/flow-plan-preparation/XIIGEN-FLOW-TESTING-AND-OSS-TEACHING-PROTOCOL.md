# XIIGEN — FLOW TESTING & OSS TEACHING PROTOCOL
## Addendum to XIIGEN-IMPLEMENTATION-PROTOCOL-v3.md
## Date: 2026-04-05
## Covers:
##   1. Missing flow plans — how to prepare documents (FLOW-35, 37, 38, 39, 40)
##   2. Existing flow plans — calibration + OSS teaching at every station and depth
##   3. OSS model teaching with RAG + Graph RAG — expected results and remediation
##   4. Positive and negative examples throughout
##   5. The universal improvement loop — applies at every station and every depth
## Changed from original:
##   - "snapshot testing" reframed: applies recursively at ALL stations (CYCLE-1/2/3 + AF)
##     not just topology verification; STEP-3/5/7 are grading inputs, not "later" work
##   - depth field added to calibration and OSS curriculum records
##   - CYCLE-1/2/3 added to grade ranges and reporting tables
##   - Universal improvement loop section added explicitly

---

## FLOW INVENTORY — CURRENT STATE

```
COMPLETE (10-step FLOW-PLAN format, all steps DONE):
  FLOW-01 through FLOW-34 — 12 files each (steps 1-10 + plan state + impl state)

DIFFERENT FORMAT (old SESSION-A/B/C or partial):
  FLOW-00, 00.1, 00.2, 00.3 — SESSION format, pre-10-step guide
  FLOW-02-incoming          — old SESSION-A through F format
  FLOW-36                   — 3 files only (SESSION-A, SESSION-F, STATE.json)
  FLOW-41                   — 81 files (full FLOW-PREP rounds + GAP analysis)
  FLOW-42, 43, 44           — GAP-TRANSLATE format (SESSION-GAP-T0/T1/T2)

MISSING ENTIRELY — need FLOW-PREP from scratch:
  FLOW-35 — Secrets Fabric
  FLOW-37 — Engine Self-Awareness (hybrid)
  FLOW-38 — Learning Loop (hybrid)
  FLOW-39 — Local Model Curriculum
  FLOW-40 — Client Push Infrastructure
```

---

## THE UNIVERSAL IMPROVEMENT LOOP

**This loop applies at EVERY AI station in the system — at every depth of the recursion tree.**
It is not a pipeline with a start and end. It is a function called on every node.

```
improve(station, depth, node_content):

  Step 1 — Commercial calibration
    Run Claude / GPT-4o / Gemini each once at this station with this node_content
    Grade each using that station's test definition:
      CYCLE-1: grade formula from STEP-3 (coverage × abstraction × responsibility × dependency)
      CYCLE-2: convergence grade from STEP-5 (convergence_score + arbiter verdicts)
      CYCLE-3: verdict checks from STEP-7 (justification + signal cited + termination bound)
      AF-1/6/7/9: AF-9 judge score
    Store scores to xiigen-calibration-baseline with (station, depth, nodeIntent) tags

  Step 2 — Grade + save
    Which model scored highest? Any below 0.85?
    Store to xiigen-calibration-baseline

  Step 3 — UI snapshot + fix
    Playwright screenshot of the station's output in the running UI
    Claude answers 7 UX questions (see Section 7 of IMPLEMENTATION-PROTOCOL-v3.md)
    Fix what's wrong before proceeding

  Step 4 — Fix prompts
    If grade < 0.85: which check failed? (coverage / abstraction / convergence / signal)
    Claude Code: improve the context package or prompt template for this station
    Re-run until grade ≥ 0.85

  Step 5 — OSS curriculum
    Run llama3:8b / codellama:13b / deepseek-coder:6.7b for 10-20 cycles
    RAG enriches from outputs that pass grade ≥ 0.85 each cycle
    Graph RAG adds dependency context from xiigen-graph-edges
    Grade trend (Signal A) + RAG size trend (Signal B) + Graph context (Signal C) measured
    Store to xiigen-oss-curriculum-runs with (station, depth) tags

  ── Steps 6–9 run ONCE per phase (not per node recursion) ──────────────────

  Step 6 — Module snapshot
    After all stations at all depths for this (flowId, phase) are complete:
    ModuleSnapshotService.captureSnapshot({ tenantId, flowId, phase })
    Packages: xiigen-rag-patterns + xiigen-calibration-baseline +
              xiigen-oss-curriculum-runs + xiigen-decision-graph (Class B) +
              xiigen-prompts (Class C)
    DNA-8: snapshot record saved BEFORE library registration.
    Snapshot gives the module its immutable content fingerprint.

  Step 7 — Fresh tenant test
    FreshTenantTestService.runPortabilityTest({ snapshotId, flowId, phase })
    Provisions ephemeral tenant from snapshot via CLS (no cross-tenant leakage).
    Runs CalibrationRunner.runForFlow() on the ephemeral tenant.
    Deprovisions ephemeral tenant (deleteDocument across 3 calibration indices).
    Produces: { passed: boolean, gradeOriginal, gradeFresh, parityDelta }

  Step 8 — Parity check
    threshold = FREEDOM config key portability.config.threshold.dev (default 0.90)
    PASS: gradeFresh / gradeOriginal ≥ threshold
      → Module is portable. Proceed to Step 9.
    FAIL: parity below threshold
      → Identify gap class from missing indices:
           Class A: RAG gap (rag-patterns not seeded)
           Class B: Graph gap (decision-graph edges absent in snapshot)
           Class C: Prompt gap (patched prompts not in snapshot)
      → Write carry-forward: CF-PORT-[FLOW]-[PHASE]-[CLASS]-[SEQ]
      → Do NOT block phase completion — record and proceed.
      → Blocking gate only if FREEDOM config portability.config.gate.blocking = true.

  Step 9 — Module export
    If parity PASS (or gate.blocking = false):
      ModuleLibraryService.registerModule({
        flowId, phase, ownerId: tenantId,
        knowledgeScope: 'MODULE',            ← platform flows: MODULE; tenant flows: PRIVATE
        ragSnapshotId: snapshot.snapshotId,
        calibrationIds: snapshot.calibrationRecordIds
      })
    Module is now browsable by other tenants via browse() filter (scope: MODULE | GLOBAL).
    Tenants adopt via ModuleAdoptionService.adoptModule() — copies RAG to their namespace.
    If parity FAIL and gate.blocking = true: registerModule is skipped;
      module stays PRIVATE until gap class is resolved in next phase.

  If node.verdict == EXPAND:
    for each sub_node in node.subNodes:
      improve(station, depth + 1, sub_node)      ← Steps 1–5 repeat; Steps 6–9 run once at phase end
```

### Why depth matters

At depth 0: context is sparse. Models have maximum freedom. Genuine disagreement.
RAG starts empty — early outputs that pass grade ≥ 0.85 become the first seeds.

At depth 1+: parent NODE constraints have been decided. Context is richer.

```
HELPFUL pattern (context narrows the problem):
  depth 0: deepseek CYCLE-2 grade = 0.61
  depth 1: deepseek CYCLE-2 grade = 0.74  ← parent constraints reduce ambiguity
  Richer context is a floor. Continue curriculum.

OVERLOAD pattern (context exceeds working memory):
  depth 0: deepseek CYCLE-2 grade = 0.61
  depth 1: deepseek CYCLE-2 grade = 0.44  ← model lost in larger context window
  This is NOT a RAG problem. It is a model capability ceiling at this depth.
  Diagnosis: reduce challenger context size for this model at depth 1+.
  SK-523 configuration: assign larger model as challenger at depth ≥ 1.
```

Without `depth` in every calibration and curriculum record, these two patterns
are indistinguishable. Both appear as "CYCLE-2 grade 0.44." The depth field is
what makes the diagnosis possible.

### The test definition files per station

| Station   | Test definition file          | What "grade" measures |
|-----------|------------------------------|----------------------|
| CYCLE-1   | FLOW-XX-STEP-3-CYCLE1-TEST.md | coverage × abstraction × responsibility × dependency |
| CYCLE-2   | FLOW-XX-STEP-5-CYCLE2-TEST.md | convergence_score + arbiter verdict quality |
| CYCLE-3   | FLOW-XX-STEP-7-CYCLE3-TEST.md | LEAF/EXPAND justification + signal citation + termination bound |
| AF-1      | AF-9 judge score              | Genesis code quality |
| AF-6      | AF-9 judge score              | Code review accuracy |
| AF-7      | AF-9 judge score              | DNA compliance |
| AF-9      | consensus                     | Judge verdict quality |

STEP-3/5/7 files are the grading inputs for the calibration runner at CYCLE stations.
They are not "topology verification for later." They define what grade means right now.

---

## PART 1 — MISSING FLOW PLANS: HOW TO PREPARE DOCUMENTS

### When this applies
FLOW-35, 37, 38, 39, 40 have no FLOW-PREP documents. Before the engine can run
any of these flows, the 10-step plan documents must be authored. This applies to
any future flow that also starts with no documents.

### The pipeline — strictly sequential, no skipping

```
FLOW-PREP (Steps 1-10)    → 10 session files + PLAN-STATE.json
      ↓
SIMULATION (R0-R19)       → STATE.json with gap catalog
      ↓
GAP-PREP                  → ENGINE-GAP-LIST.md
      ↓
GAP-TRANSLATE             → SESSION-GAP-T0/T1/T2 Claude Code session files
      ↓
Claude Code executes fixes
      ↓
CODE REVIEW + E2E+UI REVIEW
      ↓
DONE ✅
```

### Step 0 — Pre-authoring checks (PC-1 through PC-8) BEFORE any document is written

Run these before writing a single STEP-1 file. A failed check is a blocker.

```bash
FLOW_ID="FLOW-35"  # replace per flow

# PC-1a: xiigen-decision-graph fixture exists
curl -sf http://localhost:9200/xiigen-decision-graph/_mapping > /dev/null \
  && echo "✅ PC-1a: xiigen-decision-graph" || echo "🔴 PC-1a FAIL: create fixture first"

# PC-1b: xiigen-planning-decisions fixture exists
curl -sf http://localhost:9200/xiigen-planning-decisions/_mapping > /dev/null \
  && echo "✅ PC-1b: xiigen-planning-decisions" || echo "🔴 PC-1b FAIL: create fixture first"

# PC-2: No DpoTriple.code subfield references in existing session files
grep -rn "\.code\b" docs/sessions/$FLOW_ID/ 2>/dev/null \
  && echo "🔴 PC-2 FAIL: .code subfield found" || echo "✅ PC-2: no .code subfield"

# PC-3: CloudEvent name exists in event registry (manual check)
echo "PC-3: manual — verify CloudEvent name is in contracts/events/$FLOW_ID/"

# PC-4: ADAPTATION archetype registered at all 4 points (if flow uses ADAPTATION)
grep -n "ADAPTATION" server/src/engine-contracts/archetypes.ts | head -3
# Expected: at least 1 hit (added in Phase B)

# PC-5: NAMED_CHECK_* are registered in named-check.registry.ts
grep -c "NAMED_CHECK" server/src/engine/node-handlers/named-check.registry.ts
# Expected: > 0

# PC-6: Every new *Page.tsx has a matching Playwright spec
for page in $(find client/src/pages -name "*Page.tsx" 2>/dev/null); do
  name=$(basename $page .tsx | sed 's/Page//')
  spec="e2e/tests/$(echo $name | tr '[:upper:]' '[:lower:]').spec.ts"
  [ -f "$spec" ] && echo "✅ PC-6: $spec" || echo "🔴 PC-6 FAIL: $spec missing"
done

# PC-7: OBS-01 — session-output-formatter captures CycleTrace/ArbiterTrace
grep -c "CycleTrace\|ArbiterTrace" \
  server/src/engine/flows/generation-loop/session-output-formatter.service.ts
# Expected: > 0 (added in Phase A-0)

# PC-8: Provider pool populated — byok-keys has ≥1 provider for execution tenant
EXEC_TENANT="${DEFAULT_TENANT_ID:-default}"
POOL_COUNT=$(curl -sf "http://localhost:9200/xiigen-byok-keys/_search" \
  -H "Content-Type: application/json" \
  -d "{\"query\":{\"term\":{\"tenantId.keyword\":\"$EXEC_TENANT\"}},\"size\":1}" \
  2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
print(len(hits[0].get('_source',{}).get('providers',[])) if hits else 0)
" 2>/dev/null || echo 0)
[ "$POOL_COUNT" -gt 0 ] \
  && echo "✅ PC-8: Provider pool has $POOL_COUNT provider(s)" \
  || echo "🔴 PC-8 FAIL: No provider pool — run BootstrapSeeder first"
[ "$POOL_COUNT" -eq 1 ] && \
  echo "⚠️  PC-8 WARNING: Single-provider pool — calibration requires 3 providers for full rotation"
[ "$POOL_COUNT" -ge 3 ] && \
  echo "✅ PC-8: Full 3-provider pool confirmed (SK-523 rotation + V9-002 satisfiable)"
```

**STOP if any PC check fails. Fix the infrastructure gap before authoring documents.**
PC-8 WARNING (single-provider pool) is acceptable — note in ISSUE INVENTORY. PC-8 FAIL (zero pool) is a blocker.

---

### The 10-step FLOW-PREP document set

Every flow needs exactly these 10 files in `docs/sessions/FLOW-XX/`:

```
FLOW-XX-STEP-1-INVARIANTS.md          Extract DNA rules, BFA rules, machine/freedom
FLOW-XX-STEP-2-CYCLE1-CONTEXT.md      5-field SK-522 context package for Planner AI
FLOW-XX-STEP-3-CYCLE1-TEST.md         4 checks + grade formula + threshold + Meta-Arbiter trigger
FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md     Convergence template: NODE format + challenger roles + RAG query
FLOW-XX-STEP-5-CYCLE2-TEST.md         Convergence grade criteria + SILENT_FAILURE pattern
FLOW-XX-STEP-6-CYCLE3-CONTEXT.md      Depth decision: 5 signals + termination bound
FLOW-XX-STEP-7-CYCLE3-TEST.md         Verdict checks: justification + consistency + bound enforcement
FLOW-XX-STEP-8-HANDOFF-CONTRACT.md    3 mappings: constraints→iron-rules, structure→I/O, quality→arbiters
FLOW-XX-STEP-9-VISIBILITY.md          Per-cycle SENT/RECEIVED/DECIDED/CHANGED contracts (all 5 cycles)
FLOW-XX-STEP-10-CHAIN-REVIEW.md       Full chain boundary table + bad-grade row + verdict
FLOW-XX-PLAN-STATE.json               State tracker — updated after every step
```

Plus for flows with simulation (FLOW-PREP rounds R0-R19):
```
FLOW-XX-R0-PRECHECK.md                PC-1..PC-7 results
FLOW-XX-R1-STATE-INIT.md through R19  One session file per FLOW-PREP round
FLOW-XX-STATE.json                    STATE.json for FLOW-PREP (different from PLAN-STATE.json)
```

---

### STEP-1 TEMPLATE — what to extract per flow

```markdown
## USER INTENT (verbatim — never paraphrase)
> [copy from master execution plan for this flow]

## NON-NEGOTIABLES
| # | Rule | Constraint |
|---|------|-----------| 
| DNA-1 | ... | ... |
[all 9 DNA rules, flow-specific BFA rules, iron rules from prior runs]

## FREEDOM / MACHINE CLASSIFICATION
| Concern | Classification | Reason |
[list thresholds, config values, hardcoded constraints]

## SUCCESS CRITERIA
[numbered list — what DONE looks like for this flow specifically]
```

**POSITIVE EXAMPLE — Step 1 done right (FLOW-01):**
```
✅ user_intent is verbatim from the plan (not paraphrased)
✅ BFA rules name specific constraint IDs (CF-1, CF-3) with exact conditions
✅ MACHINE constraints name why they cannot be FREEDOM (lowering 0.85 breaks quality gate)
✅ FREEDOM notes name the FREEDOM config key (flow01_resend_rate_limit_minutes)
✅ Iron rules from prior runs included (not empty — carries forward hard-won knowledge)
```

**NEGATIVE EXAMPLE — Step 1 done wrong:**
```
❌ user_intent = "Generate code for user registration" (code prompt, not user behavior)
❌ BFA rules = "email must be unique" (no CF number, no DataProcessResult.failure specification)
❌ MACHINE classification = empty (all concerns listed as FREEDOM)
❌ Iron rules = empty (didn't check prior runs or master execution plan)
❌ DNA rules omitted "because they're the same for every flow" — they must always appear
```

---

### STEP-2 TEMPLATE — Cycle 1 context package (5 fields)

```
INTENT:      verbatim_user_intent — byte-for-byte from Step 1, no paraphrase
DOMAIN:      flow_id, flow title, task range, focus areas, depth_level: 0
CONSTRAINTS: all 9 DNA rules + flow-specific BFA rules (same as Step 1)
PRIOR_ART:   single RAG query string — "prior plans for [domain keywords] flow"
             NOT a list of bullet points — one string only
SUCCESS:     numbered list — what a valid plan looks like for this specific flow
             includes: task_range coverage, abstraction check, grade >= 0.85
```

**POSITIVE EXAMPLE — PRIOR_ART done right (FLOW-08):**
```
PRIOR_ART: "prior plans for marketplace-listing catalog-validation tenant-state-machine community-platform flow"
```

**NEGATIVE EXAMPLE — PRIOR_ART done wrong:**
```
❌ PRIOR_ART:
   - Prior user registration flows
   - Marketplace listing patterns
   - Catalog validation examples
(This is inline content, not a RAG query string. Violates SK-522 failure mode 4.)
```

---

### STEP-3 TEMPLATE — Cycle 1 test (4 checks)

Each flow must define COVERED/PARTIAL/MISSING criteria specific to ITS domain.

```
CHECK 1 — COVERAGE
  For each intent clause: what does COVERED mean specifically?
  Do not use generic language. Name the exact scenarios.

CHECK 2 — ABSTRACTION
  Name the technology list for THIS flow's domain.
  A generic list does not work — the reviewer needs to know exactly what is forbidden.

CHECK 3 — SINGLE RESPONSIBILITY
  Signal words for THIS flow. What "and" constructions are acceptable vs split-worthy?

CHECK 4 — DEPENDENCY COMPLETENESS
  What mandatory dependencies MUST appear? (e.g. for FLOW-01: onboarding depends on verification)

GRADE FORMULA (same for all flows):
  plan_grade = coverage × abstraction × (0.5 + 0.5 × responsibility) × dependency

THRESHOLD: 0.85 (MACHINE — never lower)
META-ARBITER TRIGGER: 0.85 (SK-525 fires when grade < threshold)
```

**POSITIVE EXAMPLE — grade calculation showing FAIL (FLOW-01 step 3):**
```
Clause 2 PARTIAL (0.5), others COVERED (1.0):
  coverage = (1.0 + 0.5 + 1.0) / 3 = 0.83
  abstraction = 1.0 (all steps clean)
  responsibility = 0.86 (1 compound step in 7)
  dependency = 1.0
  grade = 0.83 × 1.0 × (0.5 + 0.5 × 0.86) × 1.0 = 0.77 ❌ REJECTED
  Feedback: Clause 2 is PARTIAL — verification step does not gate access
```

**NEGATIVE EXAMPLE — grade formula wrong:**
```
❌ grade = (coverage + abstraction + responsibility) / 3
   (Averaging allows a zero in abstraction to still pass. Must be multiplicative.)
❌ threshold = 0.7 (below MACHINE minimum — BUG)
❌ Meta-Arbiter trigger missing (SK-525 never fires — silent failure accumulates)
```

---

## PART 2 — RUNNING THE IMPROVEMENT LOOP ON EXISTING FLOWS

### When this applies
FLOW-01 through FLOW-34 have COMPLETE plan documents. When the engine runs against
any of these flows, the universal improvement loop (see section above) runs at every
station and every depth. This section defines how to execute and interpret each step.

### What "calibration run" means for a flow

A calibration run is NOT a Playwright screenshot. It is structured execution
of the improvement loop at every station the flow exercises, tagged by depth.

```json
{
  "flowId": "FLOW-01",
  "station": "CYCLE-1",
  "depth": 0,
  "nodeIntent": "register user and initiate email verification",
  "model": "claude-sonnet-4-6",
  "grade": 0.91,
  "testDefinitionFile": "FLOW-01-STEP-3-CYCLE1-TEST.md",
  "checksPassed": ["coverage", "abstraction", "responsibility", "dependency"],
  "checksFailed": [],
  "ragContextSize": 0,
  "graphContextSize": 0,
  "runAt": "2026-04-05T...",
  "tenantId": "calibration-tenant",
  "phase": "PHASE-B"
}
```

For AF stations at depth N (leaf executor):
```json
{
  "flowId": "FLOW-01",
  "station": "AF-1",
  "depth": 2,
  "nodeIntent": "generate email sending implementation",
  "model": "gpt-4o",
  "grade": 0.87,
  "testDefinitionFile": "af9-judge-score",
  "ragContextSize": 1200,
  "graphContextSize": 420,
  "runAt": "2026-04-05T...",
  "phase": "PHASE-B"
}
```

### How to run the improvement loop for a flow

```bash
FLOW_ID="FLOW-01"
TENANT="calibration-$(date +%s)"

# 1. Provision calibration tenant with all 3 providers
curl -sf -X POST http://localhost:3000/api/tenant/provision \
  -H "X-Tenant-Id: bootstrap" \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":\"$TENANT\",\"providers\":[
    {\"id\":\"p1\",\"type\":\"anthropic\",\"key\":\"$BOOTSTRAP_ANTHROPIC_KEY\",
     \"availableModels\":[\"claude-sonnet-4-6\"]},
    {\"id\":\"p2\",\"type\":\"openai\",\"key\":\"$BOOTSTRAP_OPENAI_KEY\",
     \"availableModels\":[\"gpt-4o\"]},
    {\"id\":\"p3\",\"type\":\"gemini\",\"key\":\"$BOOTSTRAP_GEMINI_KEY\",
     \"availableModels\":[\"gemini-2.0-flash\"]}
  ]}"

# 2. Load the flow's user_intent from its PLAN-STATE.json
USER_INTENT=$(cat docs/sessions/$FLOW_ID/$FLOW_ID-PLAN-STATE.json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user_intent'])")

# 3. Run calibration loop — each commercial model once, all stations all depths
# CalibrationRunner.runForFlow() calls improve(station, depth, node_content) recursively
RESULT=$(curl -sf -X POST http://localhost:3000/api/calibration/run \
  -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d "{\"flowId\":\"$FLOW_ID\",\"userIntent\":\"$USER_INTENT\",\"terminationDepth\":3}")

# 4. Write calibration results (one record per model per station per depth)
echo "$RESULT" > docs/phase-reports/calibration/$FLOW_ID-$(date +%Y%m%d).json

# 5. Playwright snapshots at each station (taken automatically by CalibrationRunner)
# See docs/phase-reports/PHASE-X/snapshots/$FLOW_ID-{STATION}-d{DEPTH}-{before|after}.png

# 6. Cleanup
curl -sf -X POST http://localhost:3000/api/tenant/deprovision \
  -H "X-Tenant-Id: bootstrap" \
  -d "{\"tenantId\":\"$TENANT\"}"
```

---

### How to interpret calibration results and when to update plan documents

The STEP-3, STEP-5, and STEP-7 files define what the expected results are.
Compare the calibration output against them using this decision matrix:

```
DEVIATION TYPE           → ACTION
─────────────────────────────────────────────────────────────────────
Grade ≥ 0.85, coverage COVERED
  → PASS. No action needed.

Grade 0.80-0.84 (near miss)
  → Check WHICH check failed (coverage/abstraction/responsibility/dependency)
  → If responsibility check failure on one compound step:
       acceptable deviation — plan was authored before this exact AI output existed
       Mark ACCEPTED-WITH-NOTE in calibration record
  → If coverage check failure (MISSING clause):
       this is a GAP — the context package DOMAIN or CONSTRAINTS field needs enrichment
       Do NOT lower the threshold. Fix the context package.

Grade < 0.80
  → FAIL. Run the three-signal test:
       Signal 1: derivation independence — does intent.purpose repeat DOMAIN content?
       Signal 2: constraint originality — did AI add domain-specific constraints?
       Signal 3: arbiter disagreement — did any arbiter challenge on round 1?
  → If all three signals flat: context package too sparse → enrich it
  → If signals show genuine inference but grade still low: fix the prompt template

Convergence score = 1.0 on round 1 for every CYCLE-2 step
  → STOP. Context package is over-prescribing (Rule 12 from protocol).
  → Remove specific examples or named patterns from DOMAIN field.

LEAF verdict when EXPAND expected (or vice versa) in CYCLE-3
  → Check which complexity signals (S1-S5) the actual NODE triggered
  → If signals don't match STEP-7 prediction:
       Update STEP-7's expected signals based on actual NODE content
       This is expected adaptation — plan documents predict, execution corrects.

Arbiter blocks at CYCLE-2 that weren't expected
  → Read arbiter concern text from CycleTrace (requires PC-7 / S-2 to be complete)
  → If legitimate: iron rule was incomplete → add to STEP-8 and PLAN-STATE.json
  → If false positive: update arbiter panel in STEP-4
```

---

### When to update plan documents vs when to fix the engine

```
UPDATE PLAN DOCUMENT when:
  → AI produced something structurally correct but different from predicted
  → A new iron rule was discovered during execution (add to STEP-8)
  → A complexity signal needs calibration for this flow's NODE types
  → A new step appears that is implied by intent but not explicit (expand size range)

FIX THE ENGINE when:
  → Same gap appears in 3+ different flows (engine pattern, not flow issue)
  → A DNA rule was violated in generated code (arbiter should have caught it)
  → CYCLE-2 convergence score is always 1.0 (context packages systematically over-prescribing)
  → Grade is always exactly at threshold (formula is uncalibrated)
```

---

### POSITIVE EXAMPLE — good snapshot adaptation

FLOW-03 (Event Creation) was authored expecting 6 plan steps. Actual run produced 7.
The 7th step covers an edge case (duplicate event check) that was implied but not explicit
in the user intent. Grade: 0.91.

**Correct response:**
- Accept the 7-step plan (grade passes, coverage passes, abstraction passes)
- Update STEP-3 expected size range from "5-7 steps" to "5-8 steps"
- Add the duplicate-check scenario to the STEP-3 acceptance scenarios
- Update PLAN-STATE.json with the observed behavior
- Note: "Cycle 1 correctly expanded scope within intent — plan documents updated to reflect"

**Wrong response:**
- Reject the run because "we expected 6 steps not 7"
- Lower the threshold to force acceptance
- Ignore the new step and mark the snapshot as passing without updating documents

---

### NEGATIVE EXAMPLE — snapshot showing a real problem

FLOW-08 (Multi-Tenant Payment Processing) run produces grade 0.62.
Cycle 2 convergence score = 1.0 on every step.

**Diagnosis:**
- convergence_score = 1.0 → context package is over-prescribing
- All three generators produce identical NODEs → they're copying the context package
- The DPO triple is "mock vs mock" — no genuine comparison
- Grade 0.62 is from arbiter failures, not from poor generation

**Correct response:**
1. Read STEP-2-CYCLE1-CONTEXT.md and STEP-4-CYCLE2-TEMPLATE.md
2. Run three-signal test — Signal 2 (constraint originality) will be 0
3. Remove any inline examples from DOMAIN field (move to PRIOR_ART as a RAG query)
4. Remove any named patterns from CONSTRAINTS field (keep only DNA rules)
5. Re-run snapshot
6. Expected: convergence_score drops to 0.6-0.8 (genuine disagreement), grade rises

---

## PART 3 — OSS MODEL TEACHING: RAG + GRAPH RAG

### The learning signal

Every OSS curriculum cycle produces a record in `xiigen-oss-curriculum-runs`:
```json
{
  "ossModel": "llama3:8b",
  "station": "CYCLE-2",
  "depth": 1,
  "nodeIntent": "send verification email to registered user",
  "cycle": 3,
  "grade": 0.68,
  "ragContextSize": 4200,
  "graphContextSize": 850,
  "phase": "PHASE-B",
  "flowId": "FLOW-01"
}
```

`station` is one of: CYCLE-1, CYCLE-2, CYCLE-3, AF-1, AF-6, AF-7, AF-9
`depth` is the recursion depth at which this node was generated (0 = top-level)
`nodeIntent` identifies which specific node was being processed (not the flow intent)

Grade trend over 10 cycles is the primary learning signal.
Records at the same (station, depth, nodeIntent) are comparable. Records at different depths are not.

---

### Expected grade ranges per station per model tier

```
COMMERCIAL MODELS (Claude / GPT-4o / Gemini) — 1-run calibration baseline:

  Planning stations (graded by STEP-3/5/7 formulas):
  CYCLE-1 (Planner):    target 0.85-0.93  (coverage × abstraction × responsibility × dependency)
  CYCLE-2 (Convergence):target 0.85-0.91  (convergence_score + arbiter verdicts)
  CYCLE-3 (Depth):      target 0.88-0.95  (justification + signal cited + termination bound)

  Execution stations (graded by AF-9 judge):
  AF-1 (Genesis):       target 0.82-0.93
  AF-6 (Code Review):   target 0.85-0.92
  AF-7 (Compliance):    target 0.88-0.95
  AF-9 (Judge):         target 0.85-0.93
  Note: Claude typically scores highest at AF-9 judging. GPT-4 typically
  scores highest at AF-1 generation. Gemini varies more widely.
  For CYCLE-1/2/3: Claude typically scores highest due to XML tag compliance
  with SK-522 format requirements.

OSS MODELS (llama3:8b / codellama:13b / deepseek-coder:6.7b) — 10-cycle curriculum:
  Expected at Cycle 1:     0.35-0.55 (without RAG context)
  Expected at Cycle 5:     0.55-0.75 (with RAG enriched from cycles 1-4)
  Expected at Cycle 10:    0.70-0.86 (with full RAG + graph context)

  deepseek-coder learns fastest (it's code-specialized)
  codellama reaches highest plateau at code generation stations (AF-1)
  llama3:8b is most general — best for CYCLE-1 planning station work

  Depth effect on OSS models:
  At depth 0: expect normal learning curve (grades improve cycle-to-cycle)
  At depth 1+: watch for overload pattern — grade may DROP vs depth 0
               If drop confirmed: assign larger model as challenger at depth 1+
               Do NOT run more cycles — more cycles won't fix a working-memory ceiling
```

---

### The three learning signals

**Signal A — Grade improvement trend:**
```
HEALTHY  (→ keep running): C1=0.41, C3=0.55, C5=0.68, C7=0.74, C10=0.79
  Grade is improving. RAG is contributing. Continue to 20 cycles.

PLATEAU  (→ diagnose RAG): C1=0.41, C3=0.43, C5=0.44, C7=0.45, C10=0.46
  Grade barely moving. RAG not contributing.
  → Check ragContextSize — if it's < 500 tokens, not enough seeds
  → Check RAG index — may be empty or have wrong embedding dimensions
  → Action: add 5 high-quality commercial model examples to RAG before next cycle

OVERFITTING (→ check contamination): C1=0.41, C2=0.87, C3=0.87, C4=0.87
  Grade jumped too fast in cycle 2, then frozen.
  → Check if grade < 0.85 filter is working (only passing outputs should seed RAG)
  → If contamination confirmed: clear RAG seeds for this station and restart curriculum
```

**Signal B — RAG context size trend:**
```
GROWING  (healthy): 200 → 850 → 1400 → 2200 tokens
  OSS model outputs are passing grade threshold and seeding RAG.
  Context is getting richer each cycle. Expected behavior.

STATIC   (blocked): 200 → 200 → 200 → 200 tokens
  No outputs passing grade threshold. Nothing seeding RAG.
  OSS model is not learning because RAG isn't growing.
  → The station is too hard for this OSS model alone
  → Action: pre-seed RAG with 3 commercial model examples manually,
    then resume OSS curriculum. This gives the OSS model a floor to build on.

SHRINKING (bug): 2200 → 1400 → 850 → 200
  Something is deleting RAG entries. Check dedup logic.
```

**Signal C — Graph RAG context size:**
```
PRESENT and non-zero: graph context is enriching OSS model reasoning
  Watch whether graph context correlates with grade improvement.
  If graphContextSize > 0 AND grade improves faster than when graphContextSize = 0:
  graph RAG is working. Build more graph edges.

ZERO across all cycles:
  Graph is empty. Check: xiigen-graph-nodes and xiigen-graph-edges have entries.
  Run Phase B's graph seeder to populate dependency edges before next curriculum run.
```

---

### What to do when OSS grades stagnate

```
DIAGNOSIS PROTOCOL (run when plateau detected — grades flat for 3+ cycles):

Step 1: Check RAG content quality
  curl http://localhost:3000/api/rag/search \
    -d '{"query":"[station type] implementation pattern","topK":5}'
  → If results are empty or < 3 results: RAG_INSUFFICIENT
  → If results exist but look wrong (wrong archetype, wrong DNA patterns): RAG_CONTAMINATED

Step 2: Check graph context
  curl http://localhost:9200/xiigen-graph-nodes/_count
  curl http://localhost:9200/xiigen-graph-edges/_count
  → If both = 0: graph not seeded (FLOW-PREP rounds R2-R3 didn't run)
  → If nodes > 0 but edges = 0: no dependency relationships yet

Step 3: Check OSS model capability ceiling
  Is this station structurally too complex for this OSS model?
  AF-9 (Judging) requires multi-criteria evaluation — 7B models often cannot do this reliably.
  AF-1 (Genesis) requires strict format adherence — code-specialized models do better.

REMEDIATION by diagnosis:

RAG_INSUFFICIENT:
  → Pre-seed: run 3 commercial model executions on this station, store outputs to RAG
  → Resume OSS curriculum — it now has examples to learn from
  → Expected: grade jumps from plateau to +0.15 within 2 cycles

RAG_CONTAMINATED:
  → Clear: DELETE from xiigen-rag-patterns WHERE station=X AND grade < 0.85
  → Re-seed with commercial model outputs only (all grade ≥ 0.85)
  → Resume curriculum

Graph empty:
  → Run Phase 0 graph seeder for this flow's task types
  → Rebuild edges: task types → factories → fabric interfaces
  → Resume curriculum — graph context will appear in next cycle

Station above OSS capability ceiling:
  → Accept the plateau grade as this model's ceiling for this station
  → Record in phase report: "llama3:8b plateau at 0.46 for AF-9 — not viable for judging"
  → Assign a commercial model as judge, OSS model as generator only for this station
  → This is a SK-523 configuration decision, not a bug

Depth overload (grade DROPS at depth 1+ vs depth 0):
  → Do NOT run more cycles — this is not a RAG problem
  → The model's working memory is overloaded by the richer parent-context
  → Correct diagnosis: reduce challenger context size for this model at depth ≥ 1
  → Record in phase report: "[model] depth-overload at CYCLE-2 depth 1 — context reduction needed"
  → SK-523 configuration: assign larger model (or commercial model) as challenger at depth ≥ 1
  → Confirm by running same model at depth 0 with full parent context artificially injected:
       if grade drops to depth-1 level → confirmed working-memory ceiling
       if grade stays at depth-0 level → the problem is something else (check RAG contamination)
```

---

### OSS mini-curriculum per phase — reporting template

```
=== OSS MINI-CURRICULUM RESULTS — PHASE X ===
Stations evaluated: [list new stations from this phase, with depth]
Cycles run: 5
Models: llama3:8b, codellama:13b, deepseek-coder:6.7b

| Station  | Depth | Model            | C1   | C2   | C3   | C4   | C5   | Trend | Verdict |
|----------|-------|-----------------|------|------|------|------|------|-------|---------|
| CYCLE-1  |   0   | deepseek-coder   | 0.58 | 0.70 | 0.79 | 0.84 | 0.86 | ↑↑↑   | ✅ Viable |
| CYCLE-2  |   0   | llama3:8b        | 0.41 | 0.55 | 0.65 | 0.70 | 0.74 | ↑↑    | Continue to 20 cycles |
| CYCLE-2  |   1   | llama3:8b        | 0.41 | 0.43 | 0.42 | 0.41 | 0.40 | →↓    | ❌ Depth overload: reduce context |
| AF-9     | 0-2   | codellama        | 0.31 | 0.33 | 0.34 | 0.35 | 0.36 | →     | ❌ Plateau: pre-seed RAG |

RAG effectiveness: 3/4 models improved by > 0.05 from C1 to C5 at depth 0 (75%)
Graph RAG impact: +0.08 avg grade improvement when graph context present vs absent
Depth overload: llama3:8b drops at depth 1 for CYCLE-2 — context reduction required

SK-523 recommendation update:
  CYCLE-1: deepseek-coder viable
  CYCLE-2 depth 0: all three OSS models show learning trend
  CYCLE-2 depth 1+: commercial model required for llama3:8b (depth ceiling confirmed)
  judge: commercial model required for AF-9 (all OSS models plateau below 0.40)
```

---

## PART 4 — POSITIVE AND NEGATIVE EXAMPLES CATALOG

### POSITIVE: Well-authored STEP-2 context package

```
INTENT:
  verbatim_user_intent: "When a new user registers for the XIIGen community platform,
    verify their email address before granting access, and deliver onboarding materials
    including workspace setup, a first flow tutorial, and a community invitation."

  QUESTION YOURSELF:
    - Does this intent contain every task type that needs a plan step?
      Answer: Yes — T47 (registration), T48 (verification wait), T49 (onboarding)
    - Is the domain specific enough?
      Answer: Yes — "XIIGen community platform" + specific flow intent clauses

DOMAIN:
  flow_id: FLOW-01
  focus: registration, email verification, onboarding
  depth_level: 0

CONSTRAINTS:
  [9 DNA rules + 4 BFA rules — all explicit with CF numbers]

PRIOR_ART: "prior plans for registration-verification-onboarding community-platform flow"

SUCCESS:
  - Every task type (T47, T48, T49) has at least 1 dedicated plan step
  - No step names a technology, class, or method
  - Grade >= 0.85 from Plan Reviewer
```

**Why it works:**
- INTENT is verbatim (no paraphrase changes scope)
- PRIOR_ART is a single RAG query string (not a bullet list)
- CONSTRAINTS name CF numbers (BFA rules are traceable)
- SUCCESS criteria are specific to this flow's task types

---

### NEGATIVE: Mis-authored STEP-2 context package

```
INTENT:
  verbatim_user_intent: "Generate a production-ready NestJS user registration service
    with email verification using SendGrid and Redis rate limiting."

DOMAIN:
  description: "User registration and onboarding"

CONSTRAINTS:
  - No typed models
  - No throwing errors

PRIOR_ART:
  - Previous registration implementations
  - Email verification patterns
  - Onboarding flows

SUCCESS:
  - Code compiles
  - Tests pass
  - Grade >= 0.70
```

**Why it fails:**
- INTENT is a code-generation prompt, not a user-facing behavior description
  (contains "NestJS", "SendGrid", "Redis" — technology names in intent)
- PRIOR_ART is inline bullet content, not a RAG query string (SK-522 failure mode 4)
- CONSTRAINTS are abbreviated — missing DNA-3 through DNA-9, all BFA rules
- SUCCESS grade threshold is 0.70 — below the MACHINE minimum of 0.85
- This context package will produce: technology names in plan steps, no BFA enforcement,
  and a plan that accepts structurally broken outputs

---

### POSITIVE: OSS curriculum learning curve

```
FLOW-01, AF-1 Genesis station, deepseek-coder:6.7b, depth=0:
  Cycle 1: grade=0.61 | ragContext=0 tokens | graph=0 tokens
  Cycle 2: grade=0.71 | ragContext=850 tokens | graph=420 tokens
  Cycle 3: grade=0.78 | ragContext=1400 tokens | graph=420 tokens
  Cycle 4: grade=0.82 | ragContext=2100 tokens | graph=840 tokens
  Cycle 5: grade=0.86 | ragContext=2800 tokens | graph=840 tokens

Signal A: ↑↑↑ (improving each cycle)
Signal B: RAG growing (C1 outputs scored ≥ 0.85, seeded RAG for C2+)
Signal C: Graph context present from C2 (dependency edges available)
```

**Reading:** deepseek-coder is viable for AF-1 generation at depth 0. RAG is working.
RAG context doubling from C1 to C5 shows outputs are passing quality gate and seeding
back into RAG. Graph RAG providing additional +0.08 over pure RAG alone.

**Action:** Continue to 20 cycles. Expected plateau ~0.88-0.90.

---

### NEGATIVE: OSS curriculum stagnation with correct diagnosis

```
FLOW-08, AF-9 Judge station, codellama:13b, depth=0:
  Cycle 1: grade=0.33 | ragContext=0 tokens | graph=420 tokens
  Cycle 2: grade=0.35 | ragContext=0 tokens | graph=420 tokens
  Cycle 3: grade=0.35 | ragContext=0 tokens | graph=420 tokens
  Cycle 4: grade=0.36 | ragContext=0 tokens | graph=420 tokens
  Cycle 5: grade=0.36 | ragContext=0 tokens | graph=420 tokens

Signal A: → (flat — plateau at 0.35)
Signal B: STATIC — ragContextSize stays 0 (no C1 output passed grade ≥ 0.85 gate)
Signal C: Graph present but not helping (grade barely moves with graph vs without)
```

**Reading:** codellama cannot produce passing AF-9 judge outputs, so nothing seeds RAG.
RAG cannot grow because the outputs are below threshold. Graph context alone
is insufficient for this station.

**Correct diagnosis:** AF-9 (multi-criteria quality judging) is above codellama's
capability ceiling. This is not a RAG problem — it is a model capability problem.

**Wrong diagnosis:** "RAG is broken" or "we need more cycles."

**Action:**
- Record: codellama:13b plateau at 0.36 for AF-9 — not viable for judging
- Pre-seed with 3 commercial model AF-9 outputs as a floor test
- If grade still doesn't improve with pre-seeded RAG: confirmed ceiling
- SK-523 configuration: assign commercial model as judge for AF-9, OSS model for generation

---

### POSITIVE: Calibration run — acceptable deviation

Expected (from FLOW-03 STEP-3): plan produces 6 steps, all COVERED, grade ≥ 0.85
Actual calibration: 7 steps, all COVERED, grade 0.91

**Deviation:** 1 extra step (guard condition for duplicate event check)
**Grade:** passes threshold ✅
**Coverage:** all clauses COVERED ✅
**Abstraction:** no technology names ✅

**Verdict:** ACCEPTED WITH ADAPTATION
Action: update STEP-3 size range from "5-7" to "5-8", add scenario for duplicate event
guard to STEP-3 acceptance scenarios. This is the plan documents learning from execution.

---

### POSITIVE: OSS curriculum — healthy learning curve (depth 0)

```
FLOW-01, CYCLE-1 station, deepseek-coder:6.7b, depth=0:
  Cycle 1: grade=0.61 | ragContext=0 tokens | graph=0 tokens
  Cycle 2: grade=0.71 | ragContext=850 tokens | graph=420 tokens
  Cycle 3: grade=0.78 | ragContext=1400 tokens | graph=420 tokens
  Cycle 4: grade=0.82 | ragContext=2100 tokens | graph=840 tokens
  Cycle 5: grade=0.86 | ragContext=2800 tokens | graph=840 tokens

Signal A: ↑↑↑ (improving each cycle)
Signal B: RAG growing (C1 outputs scored ≥ 0.85, seeded RAG for C2+)
Signal C: Graph context present from C2 (dependency edges available)
```

**Reading:** deepseek-coder is viable for CYCLE-1 planning at depth 0. RAG is working.

---

### NEGATIVE: Depth overload pattern

```
FLOW-01, CYCLE-2 station, llama3:8b, depth=1 (sub-node of email verification):
  Cycle 1: grade=0.61 | ragContext=0 tokens | graph=420 tokens
  Cycle 2: grade=0.59 | ragContext=0 tokens | graph=420 tokens
  Cycle 3: grade=0.58 | ragContext=0 tokens | graph=420 tokens
  Cycle 4: grade=0.57 | ragContext=0 tokens | graph=420 tokens
  Cycle 5: grade=0.55 | ragContext=0 tokens | graph=420 tokens

Signal A: ↓ (declining — unusual pattern)
Signal B: STATIC at 0 (no passing outputs to seed RAG — and getting worse)
Signal C: graph present but not helping
```

**Contrast with depth 0:**
```
FLOW-01, CYCLE-2 station, llama3:8b, depth=0:
  Cycle 1: grade=0.61 | Cycle 5: grade=0.74 — normal ↑↑ trend
```

**Reading:** The model performs normally at depth 0 but degrades at depth 1.
Same model, same station, different depth — the parent context from depth 0 is
overloading the model's working memory at depth 1.

**Wrong diagnosis:** "RAG is broken" or "need more cycles."
**Correct diagnosis:** Working memory ceiling at this context size.

**Action:**
- Record: llama3:8b depth-overload at CYCLE-2 depth ≥ 1
- SK-523 configuration: assign commercial model as challenger at depth ≥ 1 for llama3:8b
- OSS model still viable for CYCLE-2 at depth 0 — do not drop it entirely

---

---

## KNOWLEDGE GOVERNANCE — SCOPE MODEL

### Why this was built (decision rationale)

The engine generates knowledge at every topology depth. That knowledge has two
distinct ownership questions:
1. Who owns it? (IP protection, copyright, pricing)
2. Who can use it? (sharing, cross-tenant learning)

Without a scope model, all learned knowledge either leaks globally or is siloed
per-tenant with no sharing possible. The scope model makes the decision explicit
per (tenantId, flowId, phase, station, depth).

### Three scopes (locked 2026-04-05)

```
PRIVATE   — tenant-exclusive. Never visible to others.
            Copyright fully owned by tenant. No platform access.
            DEFAULT for all tenant-created knowledge (CF-POLICY-01).

MODULE    — tenant owns it, others can adopt it as a template.
            Adoption = copy into adopter's private RAG namespace.
            Original stays with owner. Owner can charge per adoption.
            DEFAULT for all XIIGen platform flows (ownerId=platform).

GLOBAL    — platform-approved shared knowledge. Searchable by all without adoption.
            Requires explicit approval gate: nominate → platform reviews → approves.
            No adoption step needed. Priced at FREE (platform decision).
```

### Why the default is PRIVATE, not MODULE

XIIGen's own flows start as MODULE because we want them shared. But a tenant
who builds a proprietary billing algorithm or a custom compliance workflow
should NOT have that leaked to other tenants by default. They must explicitly
choose to share (promote to MODULE) or the platform promotes to GLOBAL.

If the default were MODULE, a tenant would need to actively opt out to protect
their IP. That is backwards for a commercial platform.

### Copy-on-adopt (not link-on-adopt)

When Tenant B adopts a MODULE from Tenant A:
- The RAG snapshot is COPIED into Tenant B's private namespace
  (`adopted::tenantB::moduleId`)
- Tenant A's original records are not shared directly
- Tenant B's copy is independent — subsequent changes by Tenant A do not affect it
- Pricing is charged at adoption time (dev mode: not enforced)

This matters because it preserves isolation. Tenant B's generators only retrieve
from their own namespace. They cannot accidentally query Tenant A's live records.

### Portability gap classes and their fixes

```
Class A: grade_main 0.91, grade_fresh 0.54
  Cause: RAG patterns written on main tenant not captured in snapshot
  Fix: include xiigen-rag-patterns in ModuleSnapshotService export ✅ done

Class B: grade_main 0.88, grade_fresh 0.71
  Cause: Decision graph edges (routing confidence) not in snapshot
         Fresh tenant's route.handler makes different routing decisions
  Fix: include xiigen-decision-graph in ModuleSnapshotService export ✅ done
       (graphEdgeIds in ModuleSnapshot interface)

Class C: grade_main 0.89, grade_fresh 0.62
  Cause: Prompt version patched during calibration not in snapshot
         Fresh tenant gets original unpatched prompt
  Fix: include xiigen-prompts in ModuleSnapshotService export ✅ done
       (promptVersionIds in ModuleSnapshot interface)
```

All three class fixes are in place. Phase 1 with real Ollama calls will
produce real parity data — gaps appear in phase reports as PORTABILITY_GAP
carry-forward records (non-blocking in DEV mode, blocking in LIVE mode).

### FREEDOM config keys for portability mode

```
portability.config.threshold.dev  = 0.90   (DEV mode — non-blocking)
portability.config.threshold.live = 0.95   (LIVE mode — blocking)
portability.config.gate.blocking  = false  (DEV) | true (LIVE)
```

### Phase report template — Section 5: Portability

Add this section to every PHASE-X-PORTABILITY-REPORT.md:

```markdown
## Section 5 — Portability Results

| Station | Depth | grade_main | grade_fresh | parity | status |
|---------|-------|-----------|------------|--------|--------|
| CYCLE-1 |   0   |    0.91   |    0.87    |  0.96  | ✅ PORTABLE |
| CYCLE-2 |   0   |    0.88   |    0.79    |  0.90  | ✅ PORTABLE (at threshold) |
| AF-1    |   1   |    0.85   |    0.71    |  0.84  | ⚠️ PORTABILITY_GAP CF-PORT-PHASE-X-B-01 |

Gap class legend:
  Class A: RAG gap — rag-patterns not captured or not seeded
  Class B: Graph gap — decision-graph edges absent or not copied
  Class C: Prompt gap — patched prompts not in snapshot namespace

Carry-forwards:
  CF-PORT-PHASE-X-B-01: AF-1 depth=1 graph edges not copied — parity 0.84 (threshold 0.90)
  Action: ensure xiigen-decision-graph query uses ownerId filter in next snapshot run
```

### Specificity scoring (KnowledgePolicyService)

```
Policy resolution priority (highest to lowest):
  tenant + station + depth  (+1000 tenant bonus, +10 station, +1 depth)
  tenant + station
  tenant + phase
  platform policy (ownerId=platform, scope=MODULE)
  PRIVATE default (no policy record found)
```

The tenant bonus (+1000) ensures a tenant-specific policy always wins over
a platform-level MODULE policy for the same (flowId, phase).

---

*End of XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL.md*
*Save to: [PROJECT_ROOT]\docs\flow-plan-preparation\XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL.md*
*Load whenever working on: flow plan preparation, calibration runs, OSS curriculum, or Playwright snapshots.*
*Revised 2026-04-05: improvement loop is recursive at all (station, depth) nodes — not phase-level.*
