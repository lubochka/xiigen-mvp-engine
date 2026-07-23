# XIIGEN — IMPLEMENTATION PROTOCOL v6.1
## For: Claude Code (claude/vigorous-margulis → Skills_Creation_Claude)
## Date: 2026-04-07 | Supersedes: v6.0 (2026-04-07)
## Changes from v6.0:
##   - Absolute Rule 12 RETAINED: push to origin immediately after every commit
##   - Absolute Rule 18 ADDED: knowledgeScope filter mandatory on all mixed-scope reads
##     (SK-526 / FC-32 — absent = PRIVATE per CF-POLICY-01)
##   - Section 2a ADDED: SCOPE ISOLATION — iron rule for all read/write paths
##   - STEP 14 UPDATED: SK-526 load condition when arbiter panels involved
##   - Phase report Section 5 UPDATED: scope_isolation arbiter check + FC-32
##   - Section 10 UPDATED: Phase E (scope isolation) added, test baseline updated
##   - Merges v5.1 (scope isolation) with v6.0 (push-to-origin)

---

## ABSOLUTE RULES

```
1.  Work on claude/vigorous-margulis only. Merge to Skills_Creation_Claude after full DoD.
2.  tsc --noEmit = 0 errors before any test run.
3.  failures === 0 before every ⛔ STOP.
4.  .env has NO provider API keys after bootstrap.
    TENANT_KEY_ENCRYPTION_SECRET is the only key that stays permanently.
    BOOTSTRAP_* keys deleted from .env after first startup confirms pool populated.
    Keys provisioned via KeyProvisioningForm UI (Phase A1) — never via .env after first boot.
5.  AI_PROVIDER env var does not exist. Provider assignment is flow-level, not env-level.
    grep -q "AI_PROVIDER" .env && echo "🔴 STOP: remove it" — must return nothing.
    grep -rn "AI_PROVIDER" server/src/ | grep -v "test\|spec" — must return 0 hits.
6.  No model names, API keys, or tenantIds hardcoded anywhere in source.
7.  DNA-8: storeDocument BEFORE every enqueue/emit. Call-order test required.
8.  DNA-5: tenantId from TenantContextMiddleware → ALS. Never as method parameter.
9.  DNA-3: every handler returns DataProcessResult<T>. Never throws.
10. EVERY component requires all three test tiers. No exceptions.
    Unit tests alone = not done.
    Logic/E2E tests alone = not done.
    Missing UI tests = not done.
11. After every POST /api/cycle-chain/run:
    Write FLOW-XX-RUN-{runId}-ANALYSIS.md (RunAnalysisFormatter output).
    Write FLOW-XX-TRACES/cycle-chain-run-{runId}.json (raw API response).
    Call present_files([analysis_path, json_path]) — BOTH files, .md first.
    ⛔ STOP — await Luba review before any next run.
12. Push to origin immediately after every commit:
    git push origin claude/vigorous-margulis
    No uncommitted or unpushed changes allowed at any ⛔ STOP point.
13. RunAnalysisFormatter.format() → .md + .json → present_files([md, json]).
14. MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001' everywhere.
15. Before any commit: verify no conflicts with Skills_Creation_Claude.
16. No .env writes or server starts without explicit Luba approval.
17. FLOW-01 re-implementation: T49 MUST emit "OnboardingCompleted" exactly.
    Hidden dependency: FLOW-08 ListingDiscoveryEngine consumes this event name.
18. SCOPE ISOLATION (SK-526 / FC-32):
    Every read from xiigen-training-data, xiigen-rag-patterns, xiigen-knowledge-policy,
    xiigen-training-data-pending, xiigen-training-data-review, xiigen-freedom-config
    MUST apply knowledgeScope filter. Absent = treat as PRIVATE (CF-POLICY-01).
    Every write to spend-events, security-violations, xiigen-arbiter-verdicts,
    xiigen-oss-curriculum-runs, xiigen-shadow-runs, xiigen-run-traces MUST include tenantId.
    Platform-global indices (xiigen-flow-lifecycle, xiigen-flow-registry,
    xiigen-engine-contracts, xiigen-calibration-baseline) require no scope filter — correct.
```

---

## 1. LOCAL ENVIRONMENT

### Paths
```
Project root:   C:\Projects\xiigen mvp\.claude\worktrees\vigorous-margulis\
Server:         [PROJECT_ROOT]\server\
Client:         [PROJECT_ROOT]\client\
Phase reports:  [PROJECT_ROOT]\docs\phase-reports\
Fixtures:       [PROJECT_ROOT]\server\fixtures\indices\
Run analysis:   [PROJECT_ROOT]\docs\sessions\FLOW-XX\final-flow-testing\
Traces:         [PROJECT_ROOT]\docs\sessions\FLOW-XX\FLOW-XX-TRACES\
.env:           [PROJECT_ROOT]\server\.env   (gitignored — never commit)
```

### Corrected .env — no AI_PROVIDER, no provider keys

```bash
NODE_ENV=development
PORT=3000
DATABASE_PROVIDER=in_memory
QUEUE_PROVIDER=in_memory
ELASTICSEARCH_URL=http://localhost:9200

# Only permanent key
TENANT_KEY_ENCRYPTION_SECRET=<base64-32-bytes>

# Bootstrap seed — read ONCE at first startup, then DELETE these lines
BOOTSTRAP_ANTHROPIC_KEY=sk-ant-...
BOOTSTRAP_OPENAI_KEY=sk-...
BOOTSTRAP_GEMINI_KEY=AIza...

# Economy model overrides (optional)
# ANTHROPIC_ECONOMY_MODEL=claude-haiku-4-5
# OPENAI_MODEL=gpt-4.1
# GEMINI_MODEL=gemini-2.5-flash-lite
```

After first startup: provision keys via UI (`KeyStatusBanner → KeyProvisioningForm`
or `PUT /api/tenant/xiigen-master-00000000-0000-0000-0000-000000000001/keys`),
then delete BOOTSTRAP_* lines from .env permanently.

### Session start commands (run every session)

```bash
cd server
git branch --show-current    # → claude/vigorous-margulis
git ls-files --error-unmatch .env 2>&1 | grep -q "did not match" \
  && echo "✅ .env not tracked" || echo "🔴 STOP: .env is tracked"
grep -q "AI_PROVIDER" .env 2>/dev/null \
  && echo "🔴 STOP: remove AI_PROVIDER from .env" || echo "✅ no AI_PROVIDER"
grep -rn "AI_PROVIDER" src/ | grep -v "test\|spec" \
  && echo "🔴 STOP: AI_PROVIDER in source" || echo "✅ no AI_PROVIDER in source"
npx tsc --noEmit 2>&1 | tail -3
npx jest --passWithNoTests 2>&1 | tail -5
```

---

## 2. MASTER TENANT

```
MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001'

Every API call uses header: X-Tenant-Id: xiigen-master-00000000-0000-0000-0000-000000000001

BootstrapSeeder creates this tenant on every startup (idempotent).
Keys provisioned via KeyProvisioningForm or PUT /api/tenant/{MASTER_TENANT_ID}/keys.
'live-run' tenant: ELIMINATED — seedLiveRunTenant() removed from EngineBootstrapper.
Do not use 'live-run' anywhere. It no longer exists.
```

---

## 2a. SCOPE ISOLATION — IRON RULE FOR ALL READ PATHS (SK-526)

**Scope tiers:**

| Scope | Who can read | tenantId required on read | Default |
|-------|-------------|--------------------------|---------|
| PRIVATE | Owner tenant only | Yes — exact match | ✅ CF-POLICY-01 |
| MODULE | Any tenant | No | |
| GLOBAL | Any tenant | No | |

**Mixed-scope indices (scope filter REQUIRED on every read):**
```
xiigen-training-data, xiigen-rag-patterns, xiigen-knowledge-policy,
xiigen-training-data-pending, xiigen-training-data-review, xiigen-freedom-config
```

**Per-tenant indices (tenantId field REQUIRED on every write):**
```
spend-events, security-violations, invoices, xiigen-subscriptions,
xiigen-arbiter-verdicts, xiigen-oss-curriculum-runs, xiigen-shadow-runs, xiigen-run-traces
```

**Platform-global indices (no tenantId or scope filter — correct to omit):**
```
xiigen-flow-lifecycle, xiigen-flow-registry, xiigen-engine-contracts,
xiigen-calibration-baseline
```

**Read query pattern (iron rule — violation = cross-tenant data leak):**
```typescript
// PRIVATE reads:
{ flowId, knowledgeScope: 'PRIVATE', tenantId }

// MODULE + PRIVATE (entitled reads):
filter post-query: scope IN ['PRIVATE','MODULE'] AND (scope==='MODULE' || record.tenantId===caller)

// GLOBAL:
{ knowledgeScope: 'GLOBAL' }   // no tenantId

// Absent knowledgeScope → treat as PRIVATE (CF-POLICY-01)
```

**Services with scope-aware reads (verified SESSION -1):**
- `dpo-training-data.service.ts`: `getTriplesByFlow`, `getTripleCount`
- `engine-progress.service.ts`: `getReport` (CLS tenant context + admin fallback)
- `oss-curriculum-runner.service.ts`: `seedFromDpoTriples`
- `dag-renderer.handler.ts`: FLOW_RUNS query
- `arbiter-panel.handler.ts`: `xiigen-arbiter-verdicts` writes include tenantId

**Enforcement at generation time:** SK-526 scope_isolation arbiter (FC-32) — mandatory
on every flow node regardless of archetype. AI-generated code that makes unfiltered
reads on mixed-scope indices = BUILD_FAILURE.

---

## 3. THE 6-NODE TEACHING LOOP (canonical — validate against this)

```
For each leaf NODE at each topological layer:

  Node 1: Gemini (AI_GEMINI_PROVIDER, defaultModel: gemini-2.5-flash-lite)
          → self-generate(nodePrompt) → self-judge(judgePrompt) → DPO triple stored

  Node 2: GPT-4.1 (AI_OPENAI_PROVIDER, defaultModel: gpt-4.1)
          → self-generate + self-judge → DPO triple stored

  Node 3: Claude economy (AI_JUDGE_PROVIDER, defaultModel: claude-haiku-4-5)
          → self-generate + self-judge → DPO triple stored

  Per round DPO triple stored to xiigen-training-data:
    station: 'CYCLE-2', round: N, depth: D, nodeIntent: '<stepText>',
    curriculumTier: 1, knowledgeScope: 'PRIVATE',
    chosen: { text, model, score }, rejected: { text, model, score },
    discarded: { text, model, score } | null
    V9-002: chosen.model ≠ rejected.model (3-provider architecture guarantees this)

  Node 4: Claude Code (implementation agent — not an API call)
          CYCLE-4 PENDING_IMPLEMENTATION record stored after rounds complete (DNA-8)
          → GET /api/cycle-4/pending?flowId=FLOW-XX → Claude Code reads and implements
          → PATCH /api/cycle-4/:id with { status: 'COMPLETE', grade, implementationSummary }
          → Target grade: 0.95

  Node 5: Repeat Nodes 1–3 for 10–20 rounds
          FREEDOM config: xiigen.convergence.minRounds (default 10)
                          xiigen.convergence.maxRounds (default 20)
                          xiigen.convergence.stagnationDrift (default 0.1)
          Early stop: if maxScore drift < stagnationDrift over last 3 rounds AND
                      round ≥ minRounds

  Node 6: OSS model taught from accumulated DPO triples
          OssCurriculumRunner.seedFromDpoTriples() pre-seeds RAG from
          xiigen-training-data WHERE station='CYCLE-2' AND chosen.score ≥ 8.5
          Scope filter applied (Rule 18): PRIVATE = own tenant only; MODULE/GLOBAL = all tenants
```

---

## 4. KEY PROVISIONING (Phase A1 — complete)

```
Server starts with empty BYOK keys → KeyStatusBanner shows on every page:
  - error (0 keys): "No AI provider keys configured. Flows will use mock AI only."
  - warning (partial): "Missing provider keys: openai, gemini"
  - hidden (all configured): banner not rendered

KeyProvisioningForm:
  - 3 password inputs (anthropic / openai / gemini)
  - Submit → PUT /api/tenant/{MASTER_TENANT_ID}/keys
  - Values cleared after submit (keys never linger in component state)
  - Success → banner re-queries and updates

GET /api/tenant/{MASTER_TENANT_ID}/key-status
  → { providers: { anthropic: 'configured'|'missing', ... }, allConfigured: bool }
  → NEVER returns key values

AI_SCOPE_ARBITER token: pending FabricsModule registration (SESSION 4)
```

---

## 5. TEST COVERAGE — THREE TIERS + PLAYWRIGHT

```
Tier 1 — Unit (same directory as implementation)
Tier 2 — Logic/E2E (server/test/e2e/)
Tier 3 — UI/RTL (client/src/components/[C]/[C].spec.tsx)
Tier 4 — Playwright (client/e2e/[feature].spec.ts)
         @playwright/test declared in client/package.json
         npx playwright install chromium --with-deps
         CI: playwright-e2e job in .github/workflows/ci.yml
         Runs after server-ci + client-ci on push to main

All four tiers required for every component. No exceptions.
```

---

## 6. FULL PHASE PROTOCOL

```
STEP 0  Session start (section 1 commands above)
STEP 1  Blast radius — list all files changing and all importers
STEP 2  Implement — no hardcoded models/keys/tenantIds/index names
STEP 3  Unit tests → all pass
STEP 4  Logic/E2E tests → all pass
STEP 5  UI tests (RTL) → all pass
STEP 6  Full suite: server + client → 0 failures
STEP 7  Compile: npx tsc --noEmit → 0 errors
STEP 8  Live test: POST /api/cycle-chain/run with FLOW-XX userIntent
        (see Section 7 below)
STEP 9  Calibration delta (Phase 0 onwards) — no regressions at any (station, depth)
STEP 10 OSS curriculum (Phase 0 onwards) — ≥ 1 model shows ↑ trend
STEP 11 Playwright snapshots — before + after, Claude answers 7 UX questions
STEP 12 Phase report: docs/phase-reports/PHASE-X/PHASE-X-REPORT.md
STEP 13 Commit + push:
        git add [...]
        git commit -m "Phase X: [summary]"
        git push origin claude/vigorous-margulis    ← Rule 12
STEP 14 Run analysis (EVERY live run — Absolute Rule 11):
        a. POST /api/cycle-chain/run → save raw response as cycle-chain-run-{runId}.json
        b. RunAnalysisFormatter.format(response, meta) → FLOW-XX-RUN-{runId}-ANALYSIS.md
        c. present_files([analysis_md_path, json_path])   ← BOTH files, .md FIRST
        ⛔ STOP — await Luba review before next run

Additional: If session involves arbiter panels or mixed-scope reads:
        Load SK-526 (planning--scope-isolation-arbiter-SKILL.md)
        Apply FC-32: scope_isolation arbiter present in every node
```

---

## 7. LIVE TEST — cycle-chain/run

```bash
#!/bin/bash
BASE="http://localhost:3000"
MASTER_TENANT="xiigen-master-00000000-0000-0000-0000-000000000001"
FLOW_ID="FLOW-01"

# 1. Verify key status
curl -sf "$BASE/api/tenant/$MASTER_TENANT/key-status" \
  -H "X-Tenant-Id: $MASTER_TENANT" | python3 -c "
import sys,json; d=json.load(sys.stdin)
missing=[k for k,v in d.get('providers',{}).items() if v=='missing']
if missing: print(f'⚠️  Missing keys: {missing} — runs will use mock for those providers')
else: print('✅ All 3 providers configured')
"

# 2. Set low rounds for cost control (override in prod)
curl -sf -X POST "$BASE/api/freedom-config" \
  -H "X-Tenant-Id: $MASTER_TENANT" \
  -H "Content-Type: application/json" \
  -d '{"key":"xiigen.convergence.minRounds","value":3}' > /dev/null

# 3. Read userIntent from PLAN-STATE.json
USER_INTENT=$(cat docs/sessions/$FLOW_ID/$FLOW_ID-PLAN-STATE.json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user_intent'])")

# 4. Run cycle chain
RUN=$(curl -sf -X POST "$BASE/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $MASTER_TENANT" \
  -d "{\"userIntent\":\"$USER_INTENT\",\"flowId\":\"$FLOW_ID\",
       \"constraints\":[],\"terminationDepth\":3}")

RUN_ID=$(echo "$RUN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('runId','unknown'))")

# 5. Save raw trace
mkdir -p "docs/sessions/$FLOW_ID/FLOW-${FLOW_ID#FLOW-}-TRACES"
echo "$RUN" > "docs/sessions/$FLOW_ID/FLOW-${FLOW_ID#FLOW-}-TRACES/cycle-chain-run-$RUN_ID.json"

# 6. Verify training records
echo "$RUN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
if d.get('error'): print(f'🔴 RUN FAILED: {d}'); sys.exit(1)
pi = d.get('pendingImplementations', [])
c2 = d.get('cycles',{}).get('cycle2',[])
total_rounds = sum(s.get('roundsCompleted',0) for s in c2)
print(f'✅ grade={d.get(\"grade\",0):.2f} | steps={len(c2)} | rounds={total_rounds} | pending={len(pi)}')
for s in c2:
    v = '✅' if s.get('accepted') else '🔴'
    print(f'  {v} {s.get(\"stepText\",\"\")[:50]} | winner={s.get(\"winnerModel\",\"?\")} score={s.get(\"winnerSelfScore\",0):.1f}')
"

# 7. RunAnalysisFormatter produces .md — see Absolute Rule 11
# Claude Code: import formatter, call formatter.format(response, meta),
# write to docs/sessions/$FLOW_ID/final-flow-testing/$FLOW_ID-RUN-$RUN_ID-ANALYSIS.md
# then present_files([analysis_path, json_path])
```

**PASS criteria:**
```
✅ grade ≥ 0.85 (Cycle 1)
✅ all plan steps accepted (Cycle 2 grade ≥ 0.85 per step)
✅ CYCLE-2 round records: round, depth, nodeIntent all present
✅ V9-002: chosen.model ≠ rejected.model in every round
✅ curriculumTier=1, knowledgeScope=PRIVATE on every triple
✅ CYCLE-4 PENDING_IMPLEMENTATION records: ≥ 1 per leaf NODE
✅ No secrets in any response field
✅ RunAnalysisFormatter .md produced and presented
```

**STOP criteria:**
```
🔴 grade = 0.00 → providers not configured — check key-status
🔴 plan rejected → grade < 0.85, check STEP-2-CYCLE1-CONTEXT.md
🔴 V9-002 violation → mock singleton collision, check mock guards
🔴 depth/nodeIntent null → GAP-A not applied — check commit d8c2d8d
🔴 No CYCLE-4 records → ConvergenceHandler not storing handoff
🔴 No .md analysis produced → Absolute Rule 11 violated
```

---

## 8. PHASE REPORT FORMAT

```markdown
# PHASE X REPORT — [Name]
Date: [date] | Branch: claude/vigorous-margulis | DoD: PASS/FAIL

## 1. Summary
[One sentence per file built]

## 2. Test Counts
| Tier | Before | After | Delta |
|------|--------|-------|-------|
| Unit | N | N+X | +X |
| Logic/E2E | N | N+X | +X |
| UI (RTL) | N | N+X | +X |
| Playwright | N | N+X | +X |

## 3. Teaching Round Results (Phase B onwards — per step)
| Step | Rounds | Winner model | Best score | Stagnation? | CYCLE-4 ID |
|------|--------|-------------|-----------|-------------|------------|

## 4. Run Analysis
[Link to FLOW-XX-RUN-{runId}-ANALYSIS.md produced by RunAnalysisFormatter]
[Link to FLOW-XX-TRACES/cycle-chain-run-{runId}.json]

## 5. Security Checks
□ AI_PROVIDER absent from .env AND source code
□ No secret values in any API response
□ No secret values in any stored record
□ V9-002: chosen.model ≠ rejected.model in all round records
□ depth + nodeIntent present in all DPO triples (GAP-A fix)
□ knowledgeScope present in all DPO triples (CF-POLICY-01)
□ scope_isolation arbiter present in all nodes (FC-32 / SK-526)

## 6. UI Review
[Before/after Playwright screenshots + 7 UX questions]

## 7. Definition of Done
[Full checklist — all ✅ or ❌ with reason]

## 8. Merge Status
[ ] Luba approved   [ ] Merged to Skills_Creation_Claude   [ ] Post-merge: 0 failures
```

---

## 9. BRANCH WORKFLOW

```bash
# Per phase — on claude/vigorous-margulis
git add [code files] docs/phase-reports/PHASE-X/ docs/sessions/FLOW-XX/
git commit -m "Phase X: [summary] | rounds:N | depth:fixed | regression:none"
git push origin claude/vigorous-margulis   ← Rule 12 — mandatory after every commit

# After Luba approves
git checkout Skills_Creation_Claude && git pull origin Skills_Creation_Claude
git merge claude/vigorous-margulis --no-ff \
  -m "Merge Phase X: [summary] | tests:+N | 6-node:verified | FC-32:✅"
cd server && npx jest --passWithNoTests 2>&1 | tail -3  # → 0 failures
git push origin Skills_Creation_Claude
```

---

## 10. CURRENT STATE SNAPSHOT (2026-04-07)

```
Tests:    8,167 passing, 0 failures (commit 165c68c — scope isolation + Session -1)
Branch:   claude/vigorous-margulis

Phases complete:
  ✅ Phase A   — multi-tenant foundation (TenantRegistry, BYOK, middleware)
  ✅ Phase A1  — key provisioning UI (KeyStatusBanner, KeyProvisioningForm, endpoint)
  ✅ Phase A1+ — MASTER_TENANT_ID consistency (seedLiveRunTenant removed, 34 docs)
  ✅ Phase B   — self-judge TeachingRoundService (N-round loop, 3 providers)
  ✅ Phase B+  — GAP-A fix (depth + nodeIntent in DPO triples + CYCLE-4 records)
  ✅ Phase B++ — GAP-B fix (OssCurriculumRunner seeded from DPO triples)
  ✅ Phase B+3 — CYCLE-4 endpoint (GET /api/cycle-4/pending + PATCH)
  ✅ Phase B+4 — Playwright wiring (@playwright/test, playwright.config.ts, CI job)
  ✅ Phase C   — CycleChainOutput observability extension
  ✅ Phase C+  — RunAnalysisFormatter (8-phase Markdown)
  🔴 Phase D   — FLOW-01 DELETED, pending re-implementation (SESSION 5)
  ✅ Phase E   — Scope isolation fix (SESSION -1, 6 gaps, 17 tests)

Pending:
  SESSION 0:  FLOW-35 lifecycle ACTIVE
  SESSION 1:  FLOW-08 Phase A-E
  SESSION 2:  FLOW-07 Phase A-E
  SESSION 3:  FLOW-06 Phase A-E
  SESSION 4:  SK-526 arbiter wiring (buildScopeIsolationContext + AI_SCOPE_ARBITER token)
  SESSION 5:  FLOW-01 re-implementation via cycle-chain/run

T47/T48/T49 cleanup: ✅ COMPLETE (committed in 165c68c)
```

---

*End of XIIGEN-IMPLEMENTATION-PROTOCOL-v6.1*
*Supersedes: XIIGEN-IMPLEMENTATION-PROTOCOL-v6.0 (push-to-origin) + v5.1 (scope isolation)*
*Merges both lineages into single canonical document.*
*Load at every Claude Code session start.*
