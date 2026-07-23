# XIIGEN — FLOW TESTING & OSS TEACHING PROTOCOL v3.0
## Addendum to XIIGEN-IMPLEMENTATION-PROTOCOL-v5.md
## Date: 2026-04-06 | Supersedes: v2.0 (2026-04-05)
## Changes from v2.0:
##   - GAP-A CLOSED: depth + nodeIntent now written to every DPO triple (commit d8c2d8d)
##   - GAP-B CLOSED: OssCurriculumRunner.seedFromDpoTriples() pre-seeds from teaching round winners
##   - STEP 14 (Absolute Rule 11): RunAnalysisFormatter produces .md + .json after every run
##   - Snapshot section updated: analysis document replaces manual field capture
##   - Reporting template updated: per-round table + score trend + open issues section
##   - Part 3 OSS section updated: seedFromDpoTriples() path documented

---

## FLOW INVENTORY — CURRENT STATE

```
COMPLETE (10-step FLOW-PLAN format, all steps DONE):
  FLOW-01 through FLOW-34 — 12 files each (steps 1-10 + plan state + impl state)

DIFFERENT FORMAT (old SESSION-A/B/C or partial):
  FLOW-00, 00.1, 00.2, 00.3 — SESSION format, pre-10-step guide
  FLOW-36                   — 3 files only (SESSION-A, SESSION-F, STATE.json)
  FLOW-41                   — 81 files (full FLOW-PREP rounds + GAP analysis)
  FLOW-42, 43, 44           — GAP-TRANSLATE format

MISSING ENTIRELY — need FLOW-PREP from scratch:
  FLOW-35 — Secrets Fabric
  FLOW-37 — Engine Self-Awareness (hybrid)
  FLOW-38 — Learning Loop (hybrid)
  FLOW-39 — Local Model Curriculum
  FLOW-40 — Client Push Infrastructure
```

---

## PART 1 — MISSING FLOW PLANS: HOW TO PREPARE DOCUMENTS

### Pipeline — strictly sequential, no skipping

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
Live run: POST /api/cycle-chain/run → RunAnalysisFormatter → .md + .json
      ↓
CODE REVIEW + E2E+UI REVIEW
      ↓
DONE ✅
```

### Pre-authoring checks (PC-1 through PC-8)

```bash
FLOW_ID="FLOW-35"

# PC-1a: xiigen-decision-graph fixture exists
curl -sf http://localhost:9200/xiigen-decision-graph/_mapping > /dev/null \
  && echo "✅ PC-1a" || echo "🔴 PC-1a FAIL"

# PC-1b: xiigen-planning-decisions fixture exists
curl -sf http://localhost:9200/xiigen-planning-decisions/_mapping > /dev/null \
  && echo "✅ PC-1b" || echo "🔴 PC-1b FAIL"

# PC-2: No DpoTriple.code subfield references
grep -rn "\.code\b" docs/sessions/$FLOW_ID/ 2>/dev/null \
  && echo "🔴 PC-2 FAIL" || echo "✅ PC-2"

# PC-3: CloudEvent name in event registry (manual)
echo "PC-3: verify CloudEvent name in contracts/events/$FLOW_ID/"

# PC-4: ADAPTATION archetype registered (if used)
grep -n "ADAPTATION" server/src/engine-contracts/archetypes.ts | head -3

# PC-5: NAMED_CHECK_* registered
grep -c "NAMED_CHECK" server/src/engine/node-handlers/named-check.registry.ts

# PC-6: Every *Page.tsx has Playwright spec
for page in $(find client/src/pages -name "*Page.tsx" 2>/dev/null); do
  name=$(basename $page .tsx | sed 's/Page//')
  spec="e2e/tests/$(echo $name | tr '[:upper:]' '[:lower:]').spec.ts"
  [ -f "$spec" ] && echo "✅ PC-6: $spec" || echo "🔴 PC-6 FAIL: $spec missing"
done

# PC-7: CycleTrace/ArbiterTrace in session-output-formatter
grep -c "CycleTrace\|ArbiterTrace" \
  server/src/engine/flows/generation-loop/session-output-formatter.service.ts

# PC-8: Provider pool check
curl -sf "http://localhost:3000/api/tenant/xiigen-master-00000000-0000-0000-0000-000000000001/key-status" \
  -H "X-Tenant-Id: xiigen-master-00000000-0000-0000-0000-000000000001" | python3 -c "
import sys,json; d=json.load(sys.stdin)
count = d.get('configuredCount', 0)
if count == 0: print('🔴 PC-8 FAIL: no keys — provision via KeyProvisioningForm')
elif count < 3: print(f'⚠️  PC-8 WARN: {count}/3 keys — some providers will use mock')
else: print(f'✅ PC-8: all 3 providers configured')
"
```

---

## PART 2 — EXISTING FLOW PLANS: SNAPSHOT TESTING

### What "snapshot" means (v3.0)

A flow snapshot is the **RunAnalysisFormatter output** produced after running
`POST /api/cycle-chain/run`. It replaces manual field capture.

Claude Code writes two files after every run:
```
docs/sessions/FLOW-XX/final-flow-testing/
  FLOW-XX-RUN-{runId}-ANALYSIS.md     ← human-readable (primary deliverable)
  FLOW-XX-TRACES/
    cycle-chain-run-{runId}.json      ← raw API response (source data)
```

Both are presented via `present_files([analysis_path, json_path])`.
The `.md` is the deliverable. The `.json` is the source.

### What the analysis document contains

```
FLOW-XX-RUN-{runId}-ANALYSIS.md covers:

Phase B — Cycle 1 (Plan):
  Full system prompt + user prompt sent to Planner
  Per-step coverage verdict table
  Grade + reviewer gaps

Phase C — Cycle 2 (Teaching Rounds, per step):
  Full node generation prompt
  Full self-judge prompt
  Round-by-round table: Gemini / GPT-4.1 / Claude scores per round
  Score trend analysis (↑ improving / → plateau)
  Best NODE JSON (full, not truncated)
  Arbiter verdicts with detail text
  CYCLE-4 ID for Claude Code

Phase D — Cycle 3 (Depth Decisions):
  LEAF/EXPAND verdict per step
  Signals evaluated and triggered

Phase E — BFA Guards:
  DNA rule checks on best NODE outputs

Phase F — DPO Storage:
  Triples stored, high-score count, RAG seeds

Phase G — Pending Implementations:
  Per CYCLE-4 record: nodeSpec + Claude Code instruction

Open Issues:
  Auto-flagged anomalies: grade < 0.85, convergence = 1.0 risk,
  BLOCK verdicts, no pending implementations
```

### Grade interpretation (v3.0 — unchanged from v2.0)

```
Cycle 2 grade = bestSelfScore / 10
  bestSelfScore 8.5 / 10 → grade 0.85 ✅ (passes threshold)
  bestSelfScore 7.2 / 10 → grade 0.72 🔴 (fails — check context package)

Threshold: 0.85 (MACHINE — never lower)
```

### Snapshot deviation types

```
DEVIATION TYPE                           → ACTION
─────────────────────────────────────────────────────────────────────────
Grade ≥ 0.85, structure correct          → PASS. No action.

Grade 0.80-0.84 (near miss)
  → Read Phase C section in .md — which step failed?
  → If bestSelfScore was 8.0-8.4: models consistently near threshold.
    Check if stagnationFired early — raise stagnationDrift in FREEDOM config.
  → If Cycle 1 grade issue: check coverage/abstraction in STEP-3.

Grade < 0.80
  → FAIL. Run three-signal test (see Open Issues section in .md).
  → If bestSelfScore < 7.0 across all models: context package under-constraining.
    Update STEP-4-CYCLE2-TEMPLATE.md.
  → If bestSelfScore ≥ 8.0 but arbiter BLOCK: read arbiter detail in Phase E.
    Update STEP-8-HANDOFF-CONTRACT.md.

Round 1 scores all ≥ 9.5 (convergence = 1.0 risk)
  → STOP. Context package over-prescribing.
  → Open Issues section in .md will flag this automatically.
  → Remove inline examples from DOMAIN field → move to PRIOR_ART.

roundsCompleted = 1 on every step
  → Stagnation firing too early.
  → Lower minRounds or raise stagnationDrift in FREEDOM config.
```

---

## PART 3 — OSS MODEL TEACHING: DPO TRIPLES FROM TEACHING ROUNDS

### How DPO triples are produced (v3.0 — GAP-B CLOSED)

```
TeachingRoundService.run() executes N rounds per NODE step:
  Each round: 3 providers in parallel
    Gemini  → generate(nodePrompt) → judge(own output) → selfScore
    GPT-4.1 → generate(nodePrompt) → judge(own output) → selfScore
    Claude  → generate(nodePrompt) → judge(own output) → selfScore
  Rank by selfScore → DPO triple stored to xiigen-training-data:
    station: 'CYCLE-2'
    round: N
    depth: D          ← GAP-A fix (commit d8c2d8d)
    nodeIntent: '...' ← GAP-A fix (commit d8c2d8d)
    curriculumTier: 1
    knowledgeScope: 'PRIVATE'
    chosen: { text, model, score }
    rejected: { text, model, score }
    discarded: { text, model, score } | null
    V9-002: chosen.model ≠ rejected.model (always true — 3 different providers)
```

### How OssCurriculumRunner consumes DPO triples (v3.0 — GAP-B CLOSED)

```
OssCurriculumRunner.run():

  Step 1: seedFromDpoTriples(flowId, station, depth, tenantId)
    → query xiigen-training-data WHERE station='CYCLE-2' AND flowId=X AND depth=D
    → filter: chosen.score ≥ 8.5 (commercial model winners only)
    → pre-seed RAG with those chosen outputs
    → OSS model now has a floor to build from (not bootstrapping from zero)

  Step 2: Run N OSS cycles (10-20)
    → each cycle: call Ollama with enriched RAG context
    → grade ≥ 0.85 → seed RAG for next cycle
    → grade < 0.85 → do NOT seed (prevents contamination)
    → store grade trend to xiigen-oss-curriculum-runs (with depth + nodeIntent)

  Step 3: Grade trend analysis
    → UP (improving): RAG growing, model learning
    → FLAT (plateau): pre-seed more commercial examples
    → DOWN: depth-overload pattern — reduce challenger context
```

### Expected grade ranges (unchanged from v2.0)

```
Commercial model self-scores (N rounds per step):
  gemini-2.5-flash-lite: 6.5-8.0 / 10 (first round)
  gpt-4.1:               6.8-8.5 / 10 (first round)
  claude-haiku-4-5:      6.0-7.8 / 10 (first round)
  After stagnation: best score 8.5-9.5 / 10

OSS models (llama3:8b / codellama:13b / deepseek-coder:6.7b):
  Cycle 1: 0.35-0.55 (with commercial pre-seeds from GAP-B fix)
  Cycle 5: 0.55-0.75
  Cycle 10: 0.70-0.86
```

### Reporting template (v3.0)

The RunAnalysisFormatter `.md` replaces the manual reporting template.
The Phase C section of the analysis document contains:

```
=== PHASE C — Cycle 2: Teaching Rounds ===

Step: "Verify user email before granting access"
Depth: 0 | nodeIntent: Verify user email before granting access
Grade: 0.87 ✅ | Accepted: Yes
Winner: gemini-2.5-flash-lite (8.7/10) | Rounds: 12 (stagnation fired)
CYCLE-4 ID: {uuid}

Round progression:
| Round | Gemini | GPT-4.1 | Claude | Winner |
|-------|--------|---------|--------|--------|
| 1     | 7.1    | 6.8     | 6.3    | gemini(7.1) |
| 2     | 8.1    | 7.5     | 6.9    | gemini(8.1) |
...
| 12    | 8.7    | 8.6     | 7.8    | gemini(8.7) ← stagnation |

Score trend: ↑ improving (7.1 → 8.7). Best round: 12.

Arbiter verdicts:
| Arbiter   | Verdict | Detail |
|-----------|---------|--------|
| IronRules | ✅ PASS | All constraints met |
```

The `.md` is produced automatically by `RunAnalysisFormatter.format()`.
The OSS curriculum results are reported separately in the phase report (Section 5 of PHASE-X-REPORT.md).

### Signal diagnosis

**Signal A — Grade trend:**
```
HEALTHY: C1=0.41, C5=0.68, C10=0.79 → ↑ keep running
PLATEAU: C1=0.41, C5=0.44, C10=0.46 → → check RAG (was seedFromDpoTriples called?)
DOWN:    C1=0.65, C5=0.48, C10=0.41 → depth-overload — OSS model overwhelmed by context
```

**Signal B — RAG context growing:**
```
GROWING → seeds accumulating, model learning
STATIC  → no outputs passing 0.85 threshold
          CHECK: were commercial pre-seeds loaded? (seedFromDpoTriples)
          If seedFromDpoTriples ran but RAG still empty: station too hard for this OSS model
SHRINKING → dedup logic deleting entries (check OssCurriculumRunner.seedRag)
```

**Signal C — Graph RAG context:**
```
PRESENT → graph enrichment working
ZERO    → graph not seeded for this flow's task types
          Run Phase 0 graph seeder before next curriculum run
```

---

## PART 4 — POSITIVE AND NEGATIVE EXAMPLES

### POSITIVE: Analysis document showing healthy teaching round

```
Phase C section of FLOW-01-RUN-abc123-ANALYSIS.md:

Step: "Verify email before granting access"
Grade: 0.87 ✅ | Winner: gemini-2.5-flash-lite (8.7/10) | Rounds: 12

Round table:
  R1:  Gemini=7.1  GPT=6.8  Claude=6.3  → chosen: Gemini(7.1)
  R5:  Gemini=8.4  GPT=8.2  Claude=7.5  → chosen: Gemini(8.4) [RAG seed]
  R12: Gemini=8.7  GPT=8.6  Claude=7.8  → stagnation fired

Score trend: ↑ improving (7.1 → 8.7)
Arbiter verdicts: IronRules=PASS

CYCLE-4 ID: abc-456 — ready for Claude Code implementation
```

**Why this works:** scores improve across rounds, stagnation fires correctly at plateau,
multiple providers contributed genuine disagreement, grade 0.87 passes threshold.

### NEGATIVE: Analysis document revealing over-prescription

```
Phase C section:

Step: "Isolate tenant payment data"
Grade: 0.95 ✅ — PASSES, but Open Issues flags:

⚠️ Round 1 scores suspiciously high (9.5/9.5/9.4). Context may be over-prescribing.
   All 3 models scored near-identically in round 1. Stagnation fired after round 1.
   DPO triple: chosen(9.5) vs rejected(9.5) — essentially identical outputs.
   Training signal is WEAK — OSS models will learn to copy context, not reason.

Action: Open STEP-4-CYCLE2-TEMPLATE.md, remove inline isolation patterns from DOMAIN field,
move to PRIOR_ART as a RAG query, re-run. Expect scores to drop to 7.5-8.5 with genuine
disagreement. Accept the lower scores — genuine learning signal is worth more.
```

### POSITIVE: Snapshot comparison

```
Expected (from FLOW-03 STEP-5):
  cycle2_grade ≥ 0.85, arbiters: all PASS, bestModel: any

Analysis document shows:
  bestSelfScore: 8.8/10 → grade: 0.88 ✅
  roundsCompleted: 14 (stagnation fired)
  bestModel: gpt-4.1 (not Gemini — this is correct, STEP-5 doesn't specify winner)
  arbiters: Domain=PASS, IronRules=PASS, Security=PASS
  Open Issues: None

Verdict: PASS. Update FLOW-03 PLAN-STATE.json to note gpt-4.1 as winner for this step.
```

---

*End of XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL-v3.0*
*Save to: [PROJECT_ROOT]\docs\flow-plan-preparation\XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL.md*
*Supersedes: XIIGEN-FLOW-TESTING-AND-OSS-TEACHING-PROTOCOL-v2.0*
*Load whenever working on: flow plan preparation, snapshot testing, or OSS curriculum runs.*
