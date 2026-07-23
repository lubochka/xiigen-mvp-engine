# XIIGEN — IMPLEMENTATION PROTOCOL v5.1
## For: Claude Code (claude/vigorous-margulis → Skills_Creation_Claude)
## Date: 2026-04-07 | Supersedes: v5.0 (2026-04-06)
## Changes from v5.0:
##   - Section 2a added: SCOPE ISOLATION — iron rule for all read paths (SK-526)
##   - Absolute Rule 18 added: knowledgeScope filter mandatory on mixed-scope reads
##   - STEP 14 updated: SK-526 must be loaded if session touches arbiter panels
##   - Phase status updated: Phase E (scope isolation) added as 🔴 OPEN
##   - T47/T48/T49 removal noted in current state snapshot

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
    Unit tests alone = not done. Logic/E2E tests alone = not done. Missing UI tests = not done.
11. After every POST /api/cycle-chain/run:
    Write FLOW-XX-RUN-{runId}-ANALYSIS.md (RunAnalysisFormatter output).
    Write FLOW-XX-TRACES/cycle-chain-run-{runId}.json (raw API response).
    Call present_files([analysis_path, json_path]) — BOTH files, .md first.
    ⛔ STOP — await Luba review before any next run.
12. Live runs: POST /api/cycle-chain/run — NEVER POST /api/flow/execute.
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

### Session start commands (run every session)

```bash
cd server
git branch --show-current    # → claude/vigorous-margulis
npx tsc --noEmit 2>&1 | tail -3
npx jest --passWithNoTests 2>&1 | tail -5
```

---

## 2. MASTER TENANT

```
MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001'
Every API call: X-Tenant-Id: xiigen-master-00000000-0000-0000-0000-000000000001
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

## 3. THE 6-NODE TEACHING LOOP (canonical)

```
Node 1: Gemini (AI_GEMINI_PROVIDER, gemini-2.5-flash-lite)
        → self-generate + self-judge → DPO triple stored (knowledgeScope: 'PRIVATE')

Node 2: GPT-4.1 (AI_OPENAI_PROVIDER, gpt-4.1)
        → self-generate + self-judge → DPO triple stored

Node 3: Claude economy (AI_JUDGE_PROVIDER, claude-haiku-4-5)
        → self-generate + self-judge → DPO triple stored

DPO triple fields (all required):
  station, round, depth, nodeIntent, curriculumTier: 1, knowledgeScope: 'PRIVATE'
  chosen: { text, model, score }, rejected: { text, model, score }
  V9-002: chosen.model ≠ rejected.model

Node 4: Claude Code (CYCLE-4 PENDING_IMPLEMENTATION → implement → grade 0.95)
  GET /api/cycle-4/pending?flowId=FLOW-XX → read records
  PATCH /api/cycle-4/:id → update status/grade

Node 5: 10–20 rounds (FREEDOM: xiigen.convergence.minRounds / maxRounds / stagnationDrift)

Node 6: OSS seeded from DPO winners (chosen.score ≥ 8.5, scope-filtered per Rule 18)
  PRIVATE: only own tenant's winners; MODULE/GLOBAL: all tenants
```

---

## 4. KEY PROVISIONING (Phase A1 — complete)

```
KeyStatusBanner + KeyProvisioningForm built.
GET /api/tenant/{MASTER_TENANT_ID}/key-status → never returns key values
PUT /api/tenant/{MASTER_TENANT_ID}/keys → encrypts and stores
AI_SCOPE_ARBITER token: pending FabricsModule registration (SESSION 4)
```

---

## 5. FULL PHASE PROTOCOL

```
STEP 0  Session start (section 1 commands above)
STEP 1  Blast radius — list all files changing and all importers
STEP 2  Implement — no hardcoded models/keys/tenantIds/index names
STEP 3  Unit tests → all pass
STEP 4  Logic/E2E tests → all pass
STEP 5  UI tests (RTL) → all pass
STEP 6  Full suite: server + client → 0 failures
STEP 7  Compile: npx tsc --noEmit → 0 errors
STEP 8  Live test: POST /api/cycle-chain/run (Section 6 below)
STEP 9  Calibration delta — no regressions at any (station, depth)
STEP 10 OSS curriculum — ≥ 1 model shows ↑ trend
STEP 11 Playwright snapshots — before + after, Claude answers 7 UX questions
STEP 12 Phase report: docs/phase-reports/PHASE-X/PHASE-X-REPORT.md
STEP 13 Commit: git add [...] && git commit -m "Phase X: [summary]"
STEP 14 Run analysis (EVERY live run — Absolute Rule 11):
        a. POST /api/cycle-chain/run → save raw response as json
        b. RunAnalysisFormatter.format(response, meta) → FLOW-XX-RUN-{runId}-ANALYSIS.md
        c. present_files([analysis_md, json_path])
        ⛔ STOP — await Luba review

Additional: If session involves arbiter panels or mixed-scope reads:
        Load SK-526 (planning--scope-isolation-arbiter-SKILL.md)
        Apply FC-32: scope_isolation arbiter present in every node
```

---

## 6. LIVE TEST — cycle-chain/run

```bash
BASE="http://localhost:3000"
MASTER_TENANT="xiigen-master-00000000-0000-0000-0000-000000000001"

# Set low rounds for cost control
curl -sf -X POST "$BASE/api/freedom-config" \
  -H "X-Tenant-Id: $MASTER_TENANT" \
  -H "Content-Type: application/json" \
  -d '{"key":"xiigen.convergence.minRounds","value":3}' > /dev/null

# Run cycle chain
RUN=$(curl -sf -X POST "$BASE/api/cycle-chain/run" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: $MASTER_TENANT" \
  -d '{"userIntent":"<from FLOW-XX-PLAN-STATE.json>","flowId":"FLOW-XX",
       "constraints":[],"terminationDepth":3}')

# Verify output
echo "$RUN" | python3 -c "
import sys,json; d=json.load(sys.stdin)
if d.get('error'): print(f'🔴 RUN FAILED: {d}'); sys.exit(1)
pi = d.get('pendingImplementations', [])
c2 = d.get('cycles',{}).get('cycle2',[])
print(f'✅ grade={d.get(\"grade\",0):.2f} | steps={len(c2)} | pending={len(pi)}')
"
```

**PASS criteria:**
```
✅ grade ≥ 0.85
✅ all plan steps accepted
✅ CYCLE-2 records: round, depth, nodeIntent, knowledgeScope present
✅ V9-002: chosen.model ≠ rejected.model
✅ CYCLE-4 PENDING_IMPLEMENTATION records created
✅ No secrets in any response field
✅ RunAnalysisFormatter .md produced and presented
```

---

## 7. PHASE REPORT FORMAT

```markdown
# PHASE X REPORT
Date: | Branch: claude/vigorous-margulis | DoD: PASS/FAIL

## 1. Summary
## 2. Test Counts (Unit / Logic-E2E / UI-RTL / Playwright)
## 3. Teaching Round Results (per step: winner, score, rounds, CYCLE-4 ID)
## 4. Run Analysis (link to .md + .json)
## 5. Security Checks
   □ No AI_PROVIDER in source
   □ V9-002 in all round records
   □ depth + nodeIntent in all DPO triples
   □ knowledgeScope in all DPO triples
   □ scope_isolation arbiter present in all nodes (FC-32)
## 6. UI Review (Playwright screenshots + 7 UX questions)
## 7. Definition of Done
## 8. Merge Status
```

---

## 8. CURRENT STATE SNAPSHOT (2026-04-07)

```
Tests:    8,118 passing, 0 failures (post-FLOW-01 deletion)
Branch:   claude/vigorous-margulis

Phases complete:
  ✅ Phase A   — multi-tenant foundation
  ✅ Phase A1  — key provisioning UI
  ✅ Phase A1+ — MASTER_TENANT_ID consistency
  ✅ Phase B   — self-judge TeachingRoundService
  ✅ Phase B+  — GAP-A fix (depth + nodeIntent)
  ✅ Phase B++ — GAP-B fix (OssCurriculumRunner seeded from DPO)
  ✅ Phase B+3 — CYCLE-4 endpoint
  ✅ Phase B+4 — Playwright wiring
  ✅ Phase C   — CycleChainOutput observability extension
  ✅ Phase C+  — RunAnalysisFormatter
  🔴 Phase D   — FLOW-01 DELETED, pending re-implementation (SESSION 5)
  🔴 Phase E   — Scope isolation fix (SESSION -1, 6 gaps, 13 tests)

Pending:
  SESSION -1: PLAN-SCOPE-ISOLATION-FIX.md (v2) — 6 scope gaps + T47/T48/T49 cleanup
  SESSION 0:  FLOW-35 lifecycle ACTIVE
  SESSION 1:  FLOW-08 Phase A-E
  SESSION 4:  SK-526 arbiter wiring (buildScopeIsolationContext)
  SESSION 5:  FLOW-01 re-implementation via cycle-chain/run

T47/T48/T49 cleanup:
  contracts deleted; four source files still have orphaned references:
  engine-bootstrapper.ts, validate.handler.ts, backward-compat.ts
  (engine-progress.service.ts cleaned in GAP-SCOPE-02)
```

---

## 9. BRANCH WORKFLOW

```bash
git add [code files] docs/phase-reports/PHASE-X/ docs/sessions/FLOW-XX/
git commit -m "Phase X: [summary] | rounds:N | scope:✅ | regression:none"
git push origin claude/vigorous-margulis

# After Luba approves
git checkout Skills_Creation_Claude && git pull
git merge claude/vigorous-margulis --no-ff \
  -m "Merge Phase X: [summary] | tests:+N | FC-32:✅"
cd server && npx jest --passWithNoTests 2>&1 | tail -3
git push origin Skills_Creation_Claude
```

---

*End of XIIGEN-IMPLEMENTATION-PROTOCOL-v5.1*
*Supersedes: XIIGEN-IMPLEMENTATION-PROTOCOL-v5.0*
*See also: XIIGEN-IMPLEMENTATION-PROTOCOL-v5.md (v6.0) for push-to-origin rule (Rule 12 addendum)*
*Load at every Claude Code session start.*
