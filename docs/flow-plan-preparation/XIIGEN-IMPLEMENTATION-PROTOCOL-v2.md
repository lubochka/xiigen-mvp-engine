# XIIGEN — IMPLEMENTATION PROTOCOL v2.0
## For: Claude Code (claude/crazy-shannon → Skills_Creation_Claude)
## Covers: MT Kernel + FLOW-08 + SK-523 + FLOW-26 + FLOW-30
## Date: 2026-04-05 | Supersedes: v1.0
## What changed: Calibration bootstrap, OSS curriculum runner, UI snapshot+UX review, phase report

---

## WHAT CHANGED FROM v1.0

| Change | Why |
|--------|-----|
| Phase 0 added: Calibration & Benchmark | Pre-seed RAG + 1-run commercial model benchmark before any flow implementation |
| OSS curriculum runner added | 5-20 cycle OSS model evaluation using RAG + Graph RAG, grade trend tracking |
| UI snapshot + UX review added | Playwright screenshot → Claude visual UX analysis → Luba functional review |
| Phase report format defined | All data (benchmark, OSS grades, UI snapshots, improvements) compiled per phase |
| Correct FLOW identities | FLOW-08 = Multi-Tenant Payment Processing; FLOW-30 = PromptOps Self-Learning |
| MT Foundation (P26) extracted | Kernel-level fixes go to packages/kernel before FLOW-08 implementation |

---

## 0. ABSOLUTE RULES (unchanged from v1.0)

```
1. All work on branch: claude/crazy-shannon. Merge to Skills_Creation_Claude after DoD.
2. Every phase: tsc --noEmit = 0 errors before test runs.
3. failures === 0 before any ⛔ STOP. Pre-existing failures listed in ISSUE INVENTORY.
4. .env is gitignored. API keys never committed.
   Check: git ls-files --error-unmatch .env 2>&1 | grep "did not match" || echo "BLOCKED"
5. No hardcoded model names or API keys in source. Models from FREEDOM config. Keys from byok-keys.
6. DNA-8: storeDocument() BEFORE every enqueue() and emit(). Call-order test required.
7. DNA-5: tenantId from AsyncLocalStorage. Never as parameter in fabric interface methods.
8. DNA-3: every handler returns DataProcessResult<T> — never throws.
```

---

## 1. LOCAL ENVIRONMENT

### Paths
```
Project root:     C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\
Server:           [PROJECT_ROOT]\server\
Client:           [PROJECT_ROOT]\client\
Skills:           [PROJECT_ROOT]\.claude\skills\
Snapshots:        [PROJECT_ROOT]\docs\phase-reports\   ← NEW: phase report artifacts
Fixtures:         [PROJECT_ROOT]\server\fixtures\indices\
.env file:        [PROJECT_ROOT]\server\.env  (gitignored)
```

### .env for Live Tests

**Architecture rule:** API keys are NOT runtime config. They live in `xiigen-byok-keys`,
encrypted at rest, scoped per tenant, resolved through `ITenantProviderPoolFabric.getPool(tenantId)`.
The `.env` file contains ONLY infrastructure config + one-time bootstrap seeds.

```bash
# ── Infrastructure config (permanent) ─────────────────────────────────────────
NODE_ENV=development
PORT=3000
DATABASE_PROVIDER=in_memory
QUEUE_PROVIDER=in_memory
RAG_PROVIDER=in_memory
SECRETS_PROVIDER=env_var
ELASTICSEARCH_URL=http://localhost:9200
OLLAMA_BASE_URL=http://localhost:11434        # OSS model endpoint

# ── Encryption secret (permanent — protects the byok-keys store itself) ───────
# This is infrastructure, not a provider key. Stays in .env forever.
TENANT_KEY_ENCRYPTION_SECRET=<base64-32-bytes>

# ── Bootstrap seeds (read ONCE at startup — then remove these lines) ──────────
# DevTenantSeeder reads BOOTSTRAP_* keys on first start.
# It calls ITenantRegistry.provisionTenant('default', providers) and encrypts
# the keys into xiigen-byok-keys. After that write completes, these lines are
# never read again. The engine always resolves keys from byok-keys, not here.
BOOTSTRAP_ANTHROPIC_KEY=sk-ant-...
BOOTSTRAP_OPENAI_KEY=sk-...
BOOTSTRAP_GEMINI_KEY=AIza...
BOOTSTRAP_PINECONE_KEY=...                    # optional — omit if not using Pinecone

# ── Non-secret runtime config ─────────────────────────────────────────────────
DEFAULT_TENANT_ID=default
OSS_MODELS=llama3:8b,codellama:13b,deepseek-coder:6.7b
OSS_CURRICULUM_CYCLES=10                      # 5-20, FREEDOM config default
CALIBRATION_TENANT=calibration-default
```

**What the DevTenantSeeder does (Phase A implementation):**
```
Startup → check xiigen-byok-keys for 'default' tenant entry
  → NOT FOUND: read BOOTSTRAP_* from .env, encrypt with TENANT_KEY_ENCRYPTION_SECRET,
               call ITenantRegistry.provisionTenant('default', providers)
               log: "Dev tenant seeded from bootstrap keys — you can remove BOOTSTRAP_* from .env"
  → FOUND: skip, log: "Dev tenant already exists in byok-keys"
After first startup: BOOTSTRAP_* lines can be deleted from .env.
All subsequent key resolution goes through ITenantProviderPoolFabric.getPool(tenantId).
```

**Phase A ordering constraint:**
FIX 7 (FREEDOM config + encryption fabric) MUST be implemented BEFORE the DevTenantSeeder.
The seeder encrypts keys using `TENANT_KEY_ENCRYPTION_SECRET` — this requires the encryption
layer to be active at startup time. Implement in this order:
```
1. FIX 7: encryption fabric active (server/src/kernel/mt/encryption.service.ts)
2. FIX 4: ITenantRegistry + MicroserviceBase Component 20
3. Phase A STEP A1: POST /api/tenant/provision (uses ITenantRegistry)
4. DevTenantSeeder: seeds 'default' tenant at startup using encryption fabric
```

### OSS Model Setup (Ollama — run once)
```bash
# Install Ollama: https://ollama.ai
ollama pull llama3:8b
ollama pull codellama:13b
ollama pull deepseek-coder:6.7b

# Verify Ollama is running
curl http://localhost:11434/api/tags | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'✅ {m[\"name\"]}') for m in d['models']]"
```

### Playwright Setup (UI snapshots — run once)
```bash
cd client
npm install --save-dev @playwright/test
npx playwright install chromium
# Creates: client/playwright.config.ts
```

### Session Start Commands
```bash
cd "C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\server"
git branch --show-current          # → crazy-shannon
git ls-files --error-unmatch .env 2>&1 | grep -q "did not match" && echo "✅ .env safe" || echo "🔴 STOP"
npx tsc --noEmit 2>&1 | tail -3   # → 0 errors
npx jest --passWithNoTests 2>&1 | tail -5  # → 0 failures
```

---

## 2. THE THREE NEW CAPABILITIES (READ BEFORE IMPLEMENTATION)

### 2.1 — Calibration & Benchmark

**What it is:** Before implementing any phase, run each commercial model (Claude, GPT-4, Gemini)
at each AF station exactly ONCE with hand-crafted model-specific prompts.
Record the score. This is the baseline.

**Why:** Without a baseline, SK-523's Phase 0 rotation is blind.
With a baseline, SK-523 starts with informed weights — it already knows
"Gemini tends to score lower at AF-9 judging, Claude tends to score higher at AF-1 genesis."

**What it produces:** A score matrix stored in `xiigen-calibration-baseline`:
```
Station   │ Claude-Sonnet │ GPT-4o │ Gemini-Flash │
AF-1      │   0.87        │  0.82  │    0.79      │
AF-6      │   0.91        │  0.88  │    0.85      │
AF-9      │   0.93        │  0.85  │    0.78      │
...       │   ...         │  ...   │    ...       │
```

**Model-specific prompt differences to encode:**
- Claude: XML tags + structured role definition + `<example>` blocks
- GPT-4: Markdown headers + numbered steps + explicit JSON output format
- Gemini: Natural language + compact instructions + explicit schema at end

These differences go into `xiigen-prompt-templates` index as `promptStyle: 'claude' | 'gpt4' | 'gemini'`.

---

### 2.2 — OSS Curriculum Runner

**What it is:** After commercial model calibration, run OSS models (llama3, codellama, deepseek-coder)
through N cycles (5-20) at each AF station. Each cycle:
1. Retrieve context from RAG (enriched by prior commercial model runs)
2. Query Graph RAG for dependency relationships relevant to this task
3. Generate with OSS model
4. Score the output
5. If score ≥ threshold (0.85): store to RAG for next cycle's retrieval
6. Record: model × station × cycle → grade

**Why:** OSS models start weaker but improve with better RAG context.
The grade trend (cycle 1 vs cycle 10) tells us:
- Is the RAG helping? (grades improve over cycles → yes)
- Is the OSS model capable of this station? (grades plateau near 0.85 → yes)
- Which station needs better RAG seeds? (grades flat near 0.4 → RAG insufficient)

**Graph RAG for OSS models:**
OSS models have weaker in-context reasoning. Graph RAG pre-computes structural knowledge:
- "TaskType T83 depends on Factory F244" → graph edge
- "Factory F244 resolves to ITenantRegistry via DATABASE FABRIC" → graph edge
- OSS model receives: "Based on the knowledge graph, this task requires F244 (ITenantRegistry)
  which is resolved via DATABASE FABRIC. Prior implementations..."

This dramatically improves OSS model output quality on structurally complex tasks.

**Implementation:** Graph RAG uses Elasticsearch (not Neo4j) for now:
- Nodes: task types, factories, fabric interfaces
- Edges: dependency relationships with confidence scores
- Query: retrieve 2-hop neighbors of target task type → inject as structured context

---

### 2.3 — UI Snapshot & UX Review

**What it is:** After each phase passes all tests, before the ⛔ STOP:
1. Start the server + client
2. Playwright takes screenshots of all new UI components in this phase
3. Claude Code reads the screenshots (base64 PNG → vision analysis)
4. Claude generates specific UX improvement proposals as code diffs
5. Claude applies approved improvements (or marks them PENDING LUBA)
6. Playwright takes post-improvement screenshots
7. Both sets of screenshots saved to `docs/phase-reports/PHASE-X/snapshots/`

**Why:** UI issues caught at phase end are far cheaper than issues caught at integration.
Visual inspection gives Luba a concrete artifact to approve — not just "tests pass."

**What Claude looks for:**
- Loading states (are there spinners? or does data appear instantly with no feedback?)
- Error states (do error messages describe the problem, or just say "Error"?)
- Empty states (what does the user see with no data yet?)
- Data visibility (can Luba verify that the engine actually produced correct output?)
- Layout consistency (does this phase's UI match the established design language?)

---

## 3. PHASE 0 — CALIBRATION BOOTSTRAP (run ONCE before Phase A)

Phase 0 has no ⛔ STOP — it runs to completion and produces the baseline data.
It does NOT implement any new features. It ONLY seeds data and runs benchmarks.

### Step 0.1 — Seed Model-Specific Prompt Templates

```
Files to create:
  server/src/calibration/prompt-templates/claude-templates.ts
  server/src/calibration/prompt-templates/gpt4-templates.ts
  server/src/calibration/prompt-templates/gemini-templates.ts

Each file exports: Map<AFStation, PromptTemplate>
  AFStation = 'AF-1' | 'AF-2' | ... | 'AF-11'
  PromptTemplate = { system: string, userPrefix: string, style: 'claude'|'gpt4'|'gemini' }

Claude template pattern (AF-1 Genesis):
  system: "<role>You are a NestJS TypeScript code generator...</role>
           <rules>DNA patterns as XML list</rules>
           <fabric>Injection tokens as XML list</fabric>"
  userPrefix: "<task>Generate the service described below:</task>\n<spec>"

GPT-4 template pattern (AF-1 Genesis):
  system: "## Role\nYou are a NestJS TypeScript code generator...\n## Rules\n1. DNA-1: ..."
  userPrefix: "Generate a NestJS service that implements the following specification:\n\n"

Gemini template pattern (AF-1 Genesis):
  system: "Generate NestJS TypeScript code following these rules: DNA-1 through DNA-9..."
  userPrefix: "Specification:\n"
```

**Seed to index:**
```typescript
// server/src/calibration/prompt-seeder.service.ts
// On startup (if xiigen-prompt-templates index is empty):
//   for each (model, station, template): storeDocument('xiigen-prompt-templates', template)
// DNA-8: all templates stored before any calibration run starts
```

### Step 0.2 — Run Commercial Model Benchmark (1 run per model per station)

```
Files to create:
  server/src/calibration/calibration-runner.service.ts
  server/src/calibration/calibration-runner.service.spec.ts

CalibrationRunner.runBaseline(tenantId):
  for each station in [AF-1, AF-2, AF-3, AF-4, AF-5, AF-6, AF-7, AF-8, AF-9, AF-10, AF-11]:
    for each model in [claude-sonnet-4-6, gpt-4o, gemini-2.0-flash]:
      1. Retrieve prompt template for this model + station from xiigen-prompt-templates
      2. Run one generation at this station with the template
      3. Score the output using the station's quality gate
      4. Store to xiigen-calibration-baseline:
           { tenantId, station, model, grade, tokensUsed, latencyMs, runAt }
      5. DNA-8: store BEFORE any downstream call
      6. Log: "Calibration AF-{N} × {model}: grade={grade:.2f}"

Run command:
  curl -X POST http://localhost:3000/api/calibration/run-baseline \
    -H "Content-Type: application/json" \
    -d '{"tenantId": "calibration-default"}'
```

**Expected output after Step 0.2:**
```
xiigen-calibration-baseline: 33 records (11 stations × 3 models)
Console: score matrix printed at completion
```

### Step 0.3 — Run OSS Curriculum (N cycles per station)

```
Files to create:
  server/src/calibration/oss-curriculum-runner.service.ts
  server/src/calibration/graph-rag-context-builder.service.ts

OssCurriculumRunner.runCurriculum(tenantId, cycles=10):
  for each station in [AF-1, AF-5, AF-6, AF-9]:  ← generation + judgment stations first
    for each ossModel in [llama3:8b, codellama:13b, deepseek-coder:6.7b]:
      for cycle in 1..cycles:
        1. Retrieve RAG context: query xiigen-rag-patterns for this station type
           (populated from commercial model runs in Step 0.2)
        2. Build Graph RAG context: 2-hop dependency graph for this station's task type
           graphContext = buildGraphContext(station, taskType)
        3. Assemble prompt: system + ragContext + graphContext + taskSpec
        4. Call Ollama: POST http://localhost:11434/api/generate
        5. Score output
        6. Store to xiigen-oss-curriculum-runs:
             { tenantId, station, ossModel, cycle, grade, ragContextSize, graphContextSize }
        7. If grade >= 0.85: store output to xiigen-rag-patterns (feeds next cycle)

GraphRagContextBuilder:
  Input: station, taskType
  Query 1: get all factories required by this taskType
  Query 2: for each factory, get its fabric resolution (which interface, which provider)
  Query 3: get BFA rules that apply to this taskType
  Output: structured text "Required factories: [F244 ITenantRegistry via DATABASE FABRIC], ..."
  Stored in: Elasticsearch (xiigen-graph-nodes, xiigen-graph-edges) — no Neo4j yet
```

### Step 0.4 — Initial UI Snapshot (baseline before any phase changes UI)

```
Files to create:
  client/e2e/snapshot.spec.ts    ← Playwright snapshot tests
  docs/phase-reports/PHASE-0/   ← directory

snapshot.spec.ts:
  test('Phase 0 baseline — GenerationLabPage', async ({ page }) => {
    await page.goto('http://localhost:5173/generation-lab');
    await page.screenshot({ path: 'docs/phase-reports/PHASE-0/snapshots/generation-lab.png', fullPage: true });
  });

  test('Phase 0 baseline — CyclePlannerPage', async ({ page }) => {
    await page.goto('http://localhost:5173/cycle-planner');
    await page.screenshot({ path: 'docs/phase-reports/PHASE-0/snapshots/cycle-planner.png', fullPage: true });
  });

Run: cd client && npx playwright test snapshot.spec.ts

After screenshots are taken, Claude Code reads them:
  view docs/phase-reports/PHASE-0/snapshots/generation-lab.png
  → generate UX analysis (see Section 5 for analysis protocol)
```

### Step 0.5 — Generate Phase 0 Report

```
Output file: docs/phase-reports/PHASE-0/PHASE-0-REPORT.md

Content:
  ## Phase 0 — Calibration Baseline Report
  Date: [date]

  ### Commercial Model Score Matrix
  | Station | Claude-Sonnet | GPT-4o | Gemini-Flash |
  |---------|--------------|--------|-------------|
  | AF-1    | [grade]      | [...]  | [...]       |
  ... (all 11 stations)

  ### OSS Model Curriculum — Grade Trend (10 cycles)
  | Station | Model          | Cycle 1 | Cycle 5 | Cycle 10 | Trend |
  |---------|---------------|---------|---------|----------|-------|
  | AF-1    | llama3:8b     | 0.41    | 0.68    | 0.79     | ↑     |
  ... (all station × model combinations)

  ### RAG Effectiveness Signal
  Did OSS model grades improve over cycles? (RAG feeding next cycle)
  - AF-1 × llama3: grade improved 0.41 → 0.79 (+93%) — RAG IS helping
  - AF-9 × codellama: grade improved 0.31 → 0.35 (+13%) — RAG insufficient for judging

  ### UI Baseline
  [embed snapshots]
  Claude UX Analysis: [generated analysis]
  Issues found: [list]
  Proposed improvements: [list]

  ### Recommendations for Phase A
  Based on calibration data:
  - Station AF-9: use Claude for judging (highest score), GPT-4 as secondary
  - Station AF-1: all three models comparable — use rotation
  - OSS models: insufficient for AF-9 judging alone, need AF-9 commercial model backup
```

---

## 4. PER-PHASE PROTOCOL (updated with calibration + OSS + snapshot)

Apply this to every phase (A through E) in sequence.

### Steps 1-9: Same as v1.0 (Preflight → Blast Radius → Implement → Unit → E2E → UI Tests → Full Suite → Compile → Live Test)

### Step 10 — Phase Calibration Delta

After live tests pass, run a mini-benchmark on the NEW stations added in this phase:
```bash
curl -X POST http://localhost:3000/api/calibration/run-delta \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "calibration-default", "stations": ["AF-1", "AF-9"], "phase": "PHASE-A"}'
# Runs 1 cycle per commercial model on NEW stations only (not all 11)
# Stores to xiigen-calibration-baseline with phase tag
```

If any station grade drops vs Phase 0 baseline → REGRESSION. Investigate before continuing.

### Step 11 — OSS Mini-Curriculum

Run 5 OSS cycles on the new stations:
```bash
curl -X POST http://localhost:3000/api/calibration/run-oss-mini \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "calibration-default", "stations": ["AF-1", "AF-9"], "cycles": 5, "phase": "PHASE-A"}'
```

Record grade trend. If OSS grades are not improving by cycle 3: RAG context for this station is insufficient — add more seeds before merge.

### Step 12 — UI Snapshot & UX Review

```bash
# 1. Start server + client (if not already running)
# 2. Run Playwright snapshot for new/changed components
cd client && npx playwright test snapshot-phase-a.spec.ts

# 3. Claude Code reads and analyzes screenshots
# (in Claude Code session): view docs/phase-reports/PHASE-A/snapshots/[component].png
```

**Claude's UX analysis protocol (apply to every screenshot):**

For each screenshot, Claude must answer these 7 questions in writing:

```
Q1. Loading state: Is there visible feedback while data loads?
    GOOD: spinner, skeleton, progress bar
    BAD: blank screen, frozen UI, no indication

Q2. Error state: If an API call fails, what does the user see?
    GOOD: message explaining what failed + what to do
    BAD: generic "Error" text, silent failure, console log only

Q3. Empty state: What does the user see with no data yet?
    GOOD: helpful message + call to action
    BAD: empty table, no feedback, confusing blank space

Q4. Data visibility: Can Luba verify the engine produced correct output?
    GOOD: grade displayed, model name shown, visibility record visible
    BAD: just "Success", no actual data, hidden behind expand

Q5. Action clarity: Is it obvious what the user should do next?
    GOOD: primary action is prominent, secondary actions are secondary
    BAD: multiple equally-prominent buttons, unclear labels

Q6. Phase completeness: Does the UI represent all functionality added in this phase?
    GOOD: tenant management visible, provider pool visible, rotation shown
    BAD: some phase features not visible in UI at all

Q7. Consistency: Does this match the design language of prior components?
    GOOD: same color palette, same card/table patterns, same spacing
    BAD: different button styles, different spacing, inconsistent typography
```

**For each issue found:** Claude generates a specific fix as a TypeScript/TSX code change, not prose. Applies it immediately. Takes a post-fix screenshot.

**Luba review gate:** Both before and after snapshots go into the phase report.
Luba approves or requests further changes via the phase report.

### Step 13 — Compile Phase Report

```
Output file: docs/phase-reports/PHASE-X/PHASE-X-REPORT.md

Sections:
  1. Phase Summary (what was built, tests added, test counts)
  2. Commercial Model Calibration Delta (new stations only)
     - Score matrix for new stations
     - Regressions vs Phase 0 baseline (must be zero)
  3. OSS Curriculum Results (5-cycle mini-run)
     - Grade trend per OSS model per new station
     - RAG effectiveness signal
     - Recommendation: which OSS model is viable for which station
  4. UI Review
     - Before screenshot + Claude's 7-question analysis
     - Issues found (list with severity)
     - After screenshot + confirmation issues resolved
     - Remaining for Luba review: [list or NONE]
  5. Improvement Suggestions for Next Phase
     - Based on calibration: what to fix in prompt templates
     - Based on OSS: what to add to RAG seeds
     - Based on UX: what to address in next phase's UI work
  6. Phase State
     - Test count delta
     - New indices created
     - New fabric interfaces registered
     - DoD checklist (all boxes)
```

### Step 14 — Commit + ⛔ STOP

```bash
git add [changed files]
git add docs/phase-reports/PHASE-X/
git commit -m "Phase X: [summary] | calibration: [pass/regression] | OSS: [trend] | UI: [issues resolved]"
git push origin crazy-shannon
```

⛔ STOP — present phase report. Await Luba approval before next phase.

---

## 5. CALIBRATION RUNNER — FULL SPEC

### New files (server/src/calibration/)

```
calibration-runner.service.ts       ← run-baseline, run-delta, score matrix
calibration-runner.service.spec.ts  ← unit tests
oss-curriculum-runner.service.ts    ← N-cycle OSS run
oss-curriculum-runner.service.spec.ts
graph-rag-context-builder.service.ts ← 2-hop dependency graph context
graph-rag-context-builder.service.spec.ts
prompt-seeder.service.ts            ← seed model-specific templates at startup
prompt-templates/
  claude-templates.ts               ← AF-1..11 templates optimized for Claude
  gpt4-templates.ts                 ← AF-1..11 templates optimized for GPT-4
  gemini-templates.ts               ← AF-1..11 templates optimized for Gemini
calibration.controller.ts           ← POST /api/calibration/run-baseline
                                       POST /api/calibration/run-delta
                                       POST /api/calibration/run-oss-mini
                                       GET  /api/calibration/score-matrix/{tenantId}
```

### New ES indices (server/fixtures/indices/)

```
xiigen-calibration-baseline.json    ← commercial model baseline scores
  Fields: tenantId, station, model, grade, tokensUsed, latencyMs, phase, runAt

xiigen-oss-curriculum-runs.json     ← OSS model cycle results
  Fields: tenantId, station, ossModel, cycle, grade, ragContextSize,
          graphContextSize, phase, runAt

xiigen-prompt-templates.json        ← model-specific prompt templates
  Fields: model, station, system, userPrefix, style, version, createdAt

xiigen-graph-nodes.json             ← task types, factories, fabric interfaces
  Fields: nodeId, nodeType (task|factory|fabric), label, properties, tenantId

xiigen-graph-edges.json             ← dependency relationships
  Fields: fromNodeId, toNodeId, edgeType (requires|resolves_to|applies_to),
          confidence, tenantId
```

### CalibrationRunner spec (key tests)

```typescript
describe('CalibrationRunner', () => {
  // POSITIVE
  it('runBaseline: creates 33 records (11 stations × 3 models)', async () => { ... });
  it('score matrix: claude scores AF-9 judging higher than gemini', async () => {
    // This documents a known behavioral difference — if it fails, prompt templates need updating
  });
  it('DNA-8: storeDocument called before any downstream calls', async () => { ... });
  it('runDelta: only runs specified stations, not all 11', async () => { ... });

  // NEGATIVE
  it('station grade regression: returns REGRESSION flag when grade drops > 0.05 vs baseline', async () => { ... });
  it('DNA-3: never throws when Ollama is unavailable — returns failure record', async () => {
    // OSS runs must fail gracefully if Ollama is not running
  });
});

describe('OssCurriculumRunner', () => {
  it('grade improves over cycles when RAG is populated', async () => {
    // Seed RAG with 5 high-quality examples, run 5 cycles
    // Grade at cycle 5 must be >= grade at cycle 1
  });
  it('grade stagnates when RAG is empty — and this is reported', async () => {
    // Empty RAG → grades stay flat → report RAG_INSUFFICIENT flag
  });
  it('grade >= 0.85: output stored to xiigen-rag-patterns for next cycle', async () => { ... });
  it('grade < 0.85: output NOT stored to rag-patterns — avoids contamination', async () => { ... });
});
```

---

## 6. UI SNAPSHOT — FULL SPEC

### Playwright config (client/playwright.config.ts)
```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    video: 'off',
  },
  outputDir: '../docs/phase-reports', // snapshots go here, in subdirs
});
```

### Snapshot test template (client/e2e/snapshot-phase-X.spec.ts)
```typescript
import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const PHASE = 'PHASE-A';
const SNAPSHOT_DIR = path.join(__dirname, '../../docs/phase-reports', PHASE, 'snapshots');

test.beforeAll(() => fs.mkdirSync(SNAPSHOT_DIR, { recursive: true }));

// Add one test per new component/page added in this phase
test('TenantManager — empty state', async ({ page }) => {
  await page.goto('/tenant-manager');
  await page.waitForSelector('[data-testid="tenant-manager"]', { timeout: 5000 });
  await page.screenshot({ path: `${SNAPSHOT_DIR}/tenant-manager-empty.png`, fullPage: true });
});

test('TenantManager — provisioned state', async ({ page }) => {
  // Pre-populate via API
  await fetch('http://localhost:3000/api/tenant/provision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId: 'ui-test-tenant', providers: [{...}] }),
  });
  await page.goto('/tenant-manager?tenantId=ui-test-tenant');
  await page.waitForSelector('[data-testid="provider-pool"]', { timeout: 5000 });
  await page.screenshot({ path: `${SNAPSHOT_DIR}/tenant-manager-provisioned.png`, fullPage: true });
});

test('CycleChainRunner — after run completes', async ({ page }) => {
  await page.goto('/cycle-lab');
  await page.fill('[data-testid="user-intent-input"]', 'I need a user registration flow');
  await page.click('[data-testid="run-button"]');
  await page.waitForSelector('[data-testid="run-complete"]', { timeout: 30000 }); // real AI — allow 30s
  await page.screenshot({ path: `${SNAPSHOT_DIR}/cycle-runner-complete.png`, fullPage: true });
});
```

### Claude UX Analysis (run after every snapshot batch)

Claude Code reads each PNG using the `view` tool, then writes to the phase report.
For each image, output must follow the 7-question format from Section 4.

Additionally, for any component that displays engine output:
- **Data verification**: Can Luba see the actual grade? The model name? The visibility record?
  These are not cosmetic — they are functional verification that the engine ran correctly.
- **If data is missing from UI**: This is a BUG, not a UX issue.
  Create a GitHub issue or carry-forward entry. Do not merge until data is visible.

### UI data-testid requirements (all new components)

Every new component must have `data-testid` attributes for:
```
[data-testid="[component-name]"]          ← root wrapper
[data-testid="loading-state"]             ← visible during load
[data-testid="error-state"]               ← visible on error
[data-testid="empty-state"]               ← visible with no data
[data-testid="[primary-data]"]            ← the main data display
```

Playwright tests use these. Claude's visual analysis references them.

---

## 7. PHASE REPORT FORMAT

Every phase produces `docs/phase-reports/PHASE-X/PHASE-X-REPORT.md`.

```markdown
# PHASE X REPORT — [Phase Name]
Date: [date] | Branch: crazy-shannon | DoD: [PASS/FAIL]

---

## 1. What Was Built
- [file]: [one sentence description]
- ...

## 2. Test Counts
| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| Unit  | N      | N+X   | +X    |
| E2E   | N      | N+X   | +X    |
| UI    | N      | N+X   | +X    |

## 3. Commercial Model Calibration (new stations only)

| Station | Metric | Claude-Sonnet | GPT-4o | Gemini-Flash | vs Baseline |
|---------|--------|--------------|--------|-------------|-------------|
| AF-1    | grade  | 0.87         | 0.82   | 0.79        | ✅ no regression |
| AF-9    | grade  | 0.93         | 0.85   | 0.78        | ✅ no regression |

SK-523 recommendation update: [which model to prefer for which station based on this data]

## 4. OSS Curriculum Results (5-cycle mini-run)

| Station | Model            | C1    | C2    | C3    | C4    | C5    | Trend | Viable? |
|---------|-----------------|-------|-------|-------|-------|-------|-------|---------|
| AF-1    | llama3:8b        | 0.41  | 0.55  | 0.68  | 0.74  | 0.79  | ↑↑    | Viable (more cycles) |
| AF-1    | deepseek-coder   | 0.61  | 0.70  | 0.78  | 0.83  | 0.86  | ↑↑↑   | ✅ Ready |
| AF-9    | codellama        | 0.31  | 0.34  | 0.35  | 0.36  | 0.37  | →     | ❌ Needs more RAG |

RAG effectiveness: [% of OSS runs that improved grade by >0.05 from C1 to C5]
Graph RAG impact: [did graph context increase AF-9 grades vs without graph context?]

## 5. UI Review

### Before: [component-name]
![before](snapshots/[component]-before.png)

Claude UX Analysis:
Q1 Loading state: [PASS/FAIL + detail]
Q2 Error state: [PASS/FAIL + detail]
Q3 Empty state: [PASS/FAIL + detail]
Q4 Data visibility: [PASS/FAIL + detail]
Q5 Action clarity: [PASS/FAIL + detail]
Q6 Phase completeness: [PASS/FAIL + detail]
Q7 Consistency: [PASS/FAIL + detail]

Issues found:
- [severity: HIGH/MED/LOW] [description] → [fix applied / PENDING LUBA]

### After: [component-name]
![after](snapshots/[component]-after.png)
Changes applied: [list]
Remaining for Luba review: [list or NONE]

## 6. Improvement Suggestions for Phase [X+1]

### Prompt Template Improvements
- [Based on calibration data]: [specific change to model template + which station]

### RAG Seed Additions
- [Station that needs more seeds]: [specific pattern to add]

### UI Work Needed
- [Component]: [specific improvement to address in next phase]

## 7. Definition of Done
[Copy the DoD checklist from Section 9, all boxes checked with ✅ or ❌ + reason]

## 8. Merge Status
[ ] Committed to crazy-shannon
[ ] Luba approved this report
[ ] Merged to Skills_Creation_Claude
[ ] Post-merge test run: failures === 0
```

---

## 8. SKILLS TO LOAD PER PHASE (updated)

Phase 0 (Calibration):
```
MANDATORY: code-execution--phase-preflight-SKILL.md (SK-457)
LOAD: planning--algorithm-as-service-SKILL.md (SK-497) ← bandit routing design
      planning--convergence-round-design-SKILL.md (SK-452) ← multi-model scoring
      code-execution--learning-signal-capture-SKILL.md ← how calibration records feed SK-523
REFERENCE: docs/flow-plan-preparation/XIIGEN-DESIGN-VISION-plain-language.md
           Section: AF Stations (all 11) + scoring criteria per station
```

Phases A-E: same as v1.0 Section 3, with addition:
```
ALL PHASES — before Step 10 (calibration delta):
  code-execution--score-interpretation-SKILL.md ← grade regression detection
  code-execution--score-zero-investigation-SKILL.md ← if OSS gets 0.00

ALL PHASES — before Step 12 (UI snapshot):
  self--capability-state-reader-SKILL.md (SK-505) ← read current UI capability state before analysis
```

---

## 9. DEFINITION OF DONE PER PHASE (updated)

All v1.0 DoD checks apply. Additional checks:

```
EVERY PHASE:
□ docs/phase-reports/PHASE-X/ directory created with PHASE-X-REPORT.md
□ Calibration delta: no regressions vs Phase 0 baseline
□ OSS curriculum (5 cycles): at least 1 OSS model shows grade improvement trend (↑)
□ UI snapshots: before + after PNGs in docs/phase-reports/PHASE-X/snapshots/
□ UX analysis: all 7 questions answered in phase report
□ UI data visibility: grade, model name, visibility record all visible in UI
   (if any are missing: carry-forward issue, not DONE)
□ Phase report committed alongside code changes
```

---

## 10. BRANCH WORKFLOW (unchanged from v1.0)

```bash
# Per phase
git checkout claude/crazy-shannon
[implement + test]
git add [code files] docs/phase-reports/PHASE-X/
git commit -m "Phase X: [summary] | calibration: [pass/regression] | OSS: [trend] | UI: [N issues resolved]"
git push origin crazy-shannon

# After Luba approves phase report
git checkout Skills_Creation_Claude
git merge claude/crazy-shannon --no-ff -m "Merge Phase X: [summary]"
npx jest --passWithNoTests  # must show 0 failures post-merge
git push origin Skills_Creation_Claude
```

---

## APPENDIX A — Score Regression Detection

A grade is a REGRESSION when:
```
phase_grade < baseline_grade - 0.05

Examples:
  AF-1 baseline: 0.87 | phase-A: 0.85 → delta = -0.02 → NOT regression (within tolerance)
  AF-9 baseline: 0.93 | phase-A: 0.81 → delta = -0.12 → 🔴 REGRESSION — investigate before merge
```

If regression found:
1. Check: did this phase change anything related to AF-9? (blast radius)
2. If yes: find and fix before merge
3. If no: likely calibration run noise — run baseline again to confirm
4. Never merge with confirmed regression

---

## APPENDIX B — Graph RAG for OSS Models (Elasticsearch implementation)

Until Neo4j is available (planned in later infrastructure phase):

```typescript
// xiigen-graph-nodes: { nodeId, nodeType, label }
// xiigen-graph-edges: { fromNodeId, toNodeId, edgeType, confidence }

// Building the graph (run at calibration time):
// For each task type in T83-T98 (FLOW-08):
//   node: { nodeId: 'T83', nodeType: 'task', label: 'TenantControlPlane' }
//   For each factory required by T83 (F244-F251):
//     node: { nodeId: 'F244', nodeType: 'factory', label: 'ITenantRegistry' }
//     edge: { fromNodeId: 'T83', toNodeId: 'F244', edgeType: 'requires', confidence: 1.0 }
//     For each fabric resolution of F244:
//       node: { nodeId: 'DATABASE_FABRIC', nodeType: 'fabric', label: 'IDatabaseService' }
//       edge: { fromNodeId: 'F244', toNodeId: 'DATABASE_FABRIC', edgeType: 'resolves_to' }

// Querying (2-hop):
// Given taskType T83, get: T83 → (requires) → F244 → (resolves_to) → DATABASE_FABRIC
// Output text for OSS model:
//   "Task T83 requires: F244 (ITenantRegistry) — resolved via DATABASE FABRIC
//    F244 operations: provisionTenant, getTenant, checkQuota
//    BFA rules that apply: CF-64, CF-65 (isolation enforcement)"
```

This context doubles OSS model accuracy on structurally complex tasks by eliminating
the need to infer dependencies from the task spec alone.

---

*End of XIIGEN-IMPLEMENTATION-PROTOCOL-v2.0*
*Place at: docs/flow-plan-preparation/XIIGEN-IMPLEMENTATION-PROTOCOL-v2.md*
*Load at every Claude Code session start before any implementation work.*
