# FLOW PREPARATION FROM SCRATCH — REQUIRED CHANGES
## Date: 2026-04-05
## Scope: SESSION-R0-PRECHECK.md, FLOW-PREP-MASTER-PLAN.md,
##        SIMULATION-MASTER-PLAN.md, GAP-PREP-MASTER-PLAN.md,
##        GAP-TRANSLATE-MASTER-PLAN.md
## Method: Line-by-line comparison of existing process documents against
##         XIIGEN-IMPLEMENTATION-PROTOCOL-v3.md + flow preparation flow.md
##
## Rule: Every change is described as ADD / MODIFY / REMOVE with the
##       exact section and exact content. No "improve" or "update" without
##       specifying what text replaces what.

---

## CONFIRMED GAPS (from grep — zero hits confirmed)

```
SIMULATION-MASTER-PLAN.md:    grep E10, provider rotation, calibration, OSS → 0 hits
GAP-PREP-MASTER-PLAN.md:      grep E2E-COV, OBS, Layer 8, Layer 9  → 0 hits
GAP-TRANSLATE-MASTER-PLAN.md: grep Layer 8, Layer 9, E2E, OBS       → 0 hits
SESSION-R0-PRECHECK.md:       PC-6, PC-7 defined in flow prep flow but absent here
```

---

## DOCUMENT 1 — SESSION-R0-PRECHECK.md

### Change 1A — ADD PC-6 as new STEP 6

**Location:** After STEP 5 (PC-5), before SUMMARY GATE.

**What to add:**
```markdown
---

## STEP 6 — PC-6: E2E spec coverage (every new *Page.tsx has a Playwright spec)

```bash
echo "PC-6: E2E spec coverage check"
PAGE_COUNT=$(find "$BASE_DIR/client/src/pages" -name "*Page.tsx" 2>/dev/null | wc -l)
MISSING_SPECS=""

for page in $(find "$BASE_DIR/client/src/pages" -name "*Page.tsx" 2>/dev/null); do
  name=$(basename "$page" .tsx | sed 's/Page//' | tr '[:upper:]' '[:lower:]')
  spec="$BASE_DIR/e2e/tests/${name}.spec.ts"
  [ ! -f "$spec" ] && MISSING_SPECS="$MISSING_SPECS $spec"
done

[ -z "$MISSING_SPECS" ] \
  && echo "✅ PC-6: All $PAGE_COUNT Page components have Playwright specs" \
  || { echo "❌ PC-6 FAIL — missing specs (raise GAP-E2E-COV-N for each):"; echo "$MISSING_SPECS"; }
```

**GATE:** MISSING_SPECS must be empty. RED = do not proceed.
Gap class if RED: GAP-E2E-COV-N | Severity: BREAKS | CI is blind to UI regressions.
```

---

### Change 1B — ADD PC-7 as new STEP 7

**Location:** After STEP 6 (PC-6), before SUMMARY GATE.

**What to add:**
```markdown
---

## STEP 7 — PC-7: OBS-01 observability — CycleTrace/ArbiterTrace captured

```bash
OBS_COUNT=$(grep -c "CycleTrace\|ArbiterTrace" \
  "$BASE_DIR/server/src/engine/flows/generation-loop/session-output-formatter.service.ts" \
  2>/dev/null || echo 0)

[ "$OBS_COUNT" -gt 0 ] \
  && echo "✅ PC-7: session-output-formatter captures CycleTrace/ArbiterTrace ($OBS_COUNT refs)" \
  || echo "❌ PC-7 FAIL: session-output-formatter missing CycleTrace/ArbiterTrace — raise GAP-OBS-N"
```

**GATE:** Count must be > 0. RED = do not proceed.
Gap class if RED: GAP-OBS-N | Severity: SILENT_FAILURE | Engine reports are blind to
prompt content and per-arbiter verdicts. All cycle debugging is manual.
```

---

### Change 1C — ADD PC-8 as new STEP 8

**Location:** After STEP 7 (PC-7), before SUMMARY GATE.

**What to add:**
```markdown
---

## STEP 8 — PC-8: Provider pool populated — byok-keys has ≥1 provider for execution tenant

```bash
EXEC_TENANT="${DEFAULT_TENANT_ID:-default}"

POOL_COUNT=$(curl -sf "http://localhost:9200/xiigen-byok-keys/_search" \
  -H "Content-Type: application/json" \
  -d "{\"query\":{\"term\":{\"tenantId.keyword\":\"$EXEC_TENANT\"}},\"size\":1}" \
  2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
if hits:
    providers=hits[0].get('_source',{}).get('providers',[])
    print(len(providers))
else:
    print(0)
" 2>/dev/null || echo 0)

[ "$POOL_COUNT" -gt 0 ] \
  && echo "✅ PC-8: Provider pool has $POOL_COUNT provider(s) for tenant '$EXEC_TENANT'" \
  || echo "❌ PC-8 FAIL: No provider pool for '$EXEC_TENANT' — run BootstrapSeeder first"

[ "$POOL_COUNT" -eq 1 ] && \
  echo "⚠️  PC-8 WARNING: Single-provider pool — full calibration requires 3 providers (BOOTSTRAP_ANTHROPIC/OPENAI/GEMINI_KEY)"

[ "$POOL_COUNT" -ge 3 ] && \
  echo "✅ PC-8: Full 3-provider pool confirmed (SK-523 rotation enabled)"
```

**GATE:** POOL_COUNT must be > 0. RED = run BootstrapSeeder or provision tenant before R1.
POOL_COUNT = 1 is a warning (not a blocker) — simulation can run, but only 1 provider executes.
```

---

### Change 1D — MODIFY SUMMARY GATE

**Location:** SUMMARY GATE section.

**Current text:**
```
echo "PC-1a: [GREEN/RED]"
echo "PC-1b: [GREEN/RED]"
echo "PC-2:  [GREEN/RED]"
echo "PC-3:  [GREEN/RED] (manual)"
echo "PC-4:  [GREEN/RED] (per archetype)"
echo "PC-5:  [GREEN/RED]"
```

**Replace with:**
```bash
echo "PC-1a: [GREEN/RED]"
echo "PC-1b: [GREEN/RED]"
echo "PC-2:  [GREEN/RED]"
echo "PC-3:  [GREEN/RED] (manual)"
echo "PC-4:  [GREEN/RED] (per archetype)"
echo "PC-5:  [GREEN/RED]"
echo "PC-6:  [GREEN/RED] (E2E spec coverage)"
echo "PC-7:  [GREEN/RED] (OBS-01 observability)"
echo "PC-8:  [GREEN/RED] (provider pool)"
```

---

### Change 1E — MODIFY ⛔ STOP line

**Current text:**
```
⛔ STOP — ALL PC-1..PC-5 must be GREEN before proceeding to SESSION-R1.
```

**Replace with:**
```
⛔ STOP — ALL PC-1..PC-8 must be GREEN before proceeding to SESSION-R1.
          PC-8 WARNING (single-provider pool) is acceptable — note it in ISSUE INVENTORY.
```

---

## DOCUMENT 2 — FLOW-PREP-MASTER-PLAN.md

### Change 2A — MODIFY R0 row in ROUND TABLE

**Location:** ROUND TABLE, R0 row.

**Current text:**
```
| R0 | SESSION-R0-PRECHECK.md | Pre-A | Run PC-1..PC-5 pre-authoring checks | PRE-AUTHORING CHECKLIST |
```

**Replace with:**
```
| R0 | SESSION-R0-PRECHECK.md | Pre-A | Run PC-1..PC-8 pre-authoring checks (PC-6: E2E spec coverage; PC-7: OBS-01 observability; PC-8: provider pool populated) | PRE-AUTHORING CHECKLIST |
```

No other changes to FLOW-PREP-MASTER-PLAN.md. The 19 rounds (R1-R19) do not change.
Calibration and OSS curriculum are Phase 0 concerns, not FLOW-PREP concerns.

---

## DOCUMENT 3 — SIMULATION-MASTER-PLAN.md

### Change 3A — MODIFY R0 (SESSION-SIM-R0.md) to add E11 provider pool check

**Location:** SESSION-SIM-R0.md — the session file produced by R0 round.
**In MASTER-PLAN:** R0 row description.

**Current R0 row:**
```
| R0 | SESSION-SIM-R0.md | E9 | L1 | Verify xiigen-decision-graph + xiigen-planning-decisions fixture files exist (blocking gate) |
```

**Replace with:**
```
| R0 | SESSION-SIM-R0.md | E9 + E11 | L1 | (E9) Verify xiigen-decision-graph + xiigen-planning-decisions fixture files exist. (E11) Verify provider pool has ≥1 provider for execution tenant — single-provider pool = WARNING, zero providers = BLOCKING. |
```

**Corresponding change in SESSION-SIM-R0.md — add new STEP 5:**
```markdown
## STEP 5 — E11: Provider pool populated for execution tenant

```bash
EXEC_TENANT="${DEFAULT_TENANT_ID:-default}"

POOL=$(curl -sf "http://localhost:9200/xiigen-byok-keys/_search" \
  -H "Content-Type: application/json" \
  -d "{\"query\":{\"term\":{\"tenantId.keyword\":\"$EXEC_TENANT\"}},\"size\":1}" \
  2>/dev/null | python3 -c "
import sys,json
d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
providers=hits[0].get('_source',{}).get('providers',[]) if hits else []
print(len(providers))
" 2>/dev/null || echo 0)

if   [ "$POOL" -eq 0 ]; then
  echo "❌ E11 BLOCKING: No provider pool for '$EXEC_TENANT'"
  echo "   Impact: All AI calls use mock provider. All DPO triples record model='mock'."
  echo "   Action: Run BootstrapSeeder with BOOTSTRAP_ANTHROPIC_KEY set, then re-run R0."
elif [ "$POOL" -eq 1 ]; then
  echo "⚠️  E11 WARNING: Single-provider pool ($POOL provider)."
  echo "   Impact: SK-523 rotation disabled. V9-002 (chosen.model ≠ rejected.model)"
  echo "           cannot be satisfied. DPO triples → xiigen-training-data-pending."
  echo "   Note: Simulation can proceed. Record this in ISSUE INVENTORY."
else
  echo "✅ E11: Provider pool has $POOL provider(s) for '$EXEC_TENANT' — SK-523 rotation enabled"
fi
```

**GATE:** POOL = 0 → BLOCKING (do not proceed). POOL = 1 → WARNING (proceed, note it).
```

---

### Change 3B — ADD E10 as new round after R8

**Location:** ROUND TABLE, GROUP E section. Insert after current R8 row.

**Add new row:**
```
| R9_E10 | SESSION-SIM-R9-E10.md | E10 | L1 | Engine reports include CycleTrace[]/ArbiterTrace[]/promptSent in session-output-formatter output (SILENT_FAILURE if absent — debugging cycles requires manually re-running with logging) |
```

**Note on round renumbering:** This inserts before the existing R9 (GROUP A). All existing
R9–R32 shift by 1 (R9→R10, R10→R11, etc.). Update total rounds count from 35 to 36.

**SESSION-SIM-R9-E10.md step table:**

| Step | What must happen | Handler | Input | Output expected | Gap? |
|------|-----------------|---------|-------|-----------------|------|
| 1 | Locate session-output-formatter.service.ts | file check | server/src/ | file path | — |
| 2 | Confirm CycleTrace[] field in output schema | grep | formatter output type | > 0 refs | E10 if 0 |
| 3 | Confirm ArbiterTrace[] field in output schema | grep | formatter output type | > 0 refs | E10 if 0 |
| 4 | Confirm promptSent field per cycle | grep | formatter output type | > 0 refs | E10 if 0 |

```bash
FORMATTER="$BASE_DIR/server/src/engine/flows/generation-loop/session-output-formatter.service.ts"

[ -f "$FORMATTER" ] \
  && echo "✅ STEP 1: formatter found" \
  || { echo "❌ STEP 1 FAIL: formatter missing — raise GAP-OBS-N (SILENT_FAILURE)"; exit 1; }

CYCLE_TRACE=$(grep -c "CycleTrace"   "$FORMATTER" 2>/dev/null || echo 0)
ARBITER_TRACE=$(grep -c "ArbiterTrace" "$FORMATTER" 2>/dev/null || echo 0)
PROMPT_SENT=$(grep -c "promptSent"   "$FORMATTER" 2>/dev/null || echo 0)

[ "$CYCLE_TRACE"   -gt 0 ] && echo "✅ E10a: CycleTrace present"   || echo "❌ E10a FAIL → GAP-OBS-1 (SILENT_FAILURE)"
[ "$ARBITER_TRACE" -gt 0 ] && echo "✅ E10b: ArbiterTrace present" || echo "❌ E10b FAIL → GAP-OBS-2 (SILENT_FAILURE)"
[ "$PROMPT_SENT"   -gt 0 ] && echo "✅ E10c: promptSent present"   || echo "❌ E10c FAIL → GAP-OBS-3 (SILENT_FAILURE)"
```

**Gap if RED:** GAP-OBS-N | Severity: SILENT_FAILURE | Engine execution completes but
reports are blind to which prompts were sent and how each arbiter voted. Grade
diagnosis requires manually re-running cycles with debug logging enabled.

---

## DOCUMENT 4 — GAP-PREP-MASTER-PLAN.md

### Change 4A — ADD Layer 8 to GAP LAYER MAP

**Location:** GAP LAYER MAP table, after Layer 7 row.

**Add two rows:**
```
| **8** | **E2E SPEC COVERAGE** | **GAP-E2E-COV-N** | Missing Playwright specs for new UI pages |
| **9** | **OBSERVABILITY** | **GAP-OBS-N** | Missing CycleTrace/ArbiterTrace in engine reports |
| **10** | **PROVIDER POOL** | **GAP-POOL-N** | Missing or incomplete provider pool for execution tenant |
```

---

### Change 4B — ADD Step 5 to SESSION-GAPPREP-R4.md (Named check + seed audit)

**Location:** SESSION-GAPPREP-R4.md. Currently has unnamed steps 1-4. Add Step 5.

**What to add:**
```markdown
## STEP 5 — E2E spec coverage audit (PC-6 equivalent for gap classification)

```bash
echo "=== E2E spec coverage check ==="
PAGE_COUNT=0
MISSING_SPECS=""

for page in $(find "$BASE_DIR/client/src/pages" -name "*Page.tsx" 2>/dev/null); do
  PAGE_COUNT=$((PAGE_COUNT + 1))
  name=$(basename "$page" .tsx | sed 's/Page//' | tr '[:upper:]' '[:lower:]')
  spec="$BASE_DIR/e2e/tests/${name}.spec.ts"
  [ ! -f "$spec" ] && MISSING_SPECS="$MISSING_SPECS\n  MISSING: $spec (for $page)"
done

echo "Pages found: $PAGE_COUNT"

[ -z "$MISSING_SPECS" ] \
  && echo "✅ E2E coverage: all pages have specs" \
  || printf "❌ Missing specs → raise GAP-E2E-COV-N per missing file:%b\n" "$MISSING_SPECS"
```

**Classification for each missing spec:**
- Gap ID: GAP-E2E-COV-N (increment N per missing file)
- Layer: **8** (E2E SPEC COVERAGE)
- Severity: **BREAKS** (CI passes while UI regressions ship undetected)
- Fix class: CONTENT (write spec file — no TS compilation required)
- Before: This flow's E2E + UI REVIEW step
```

---

### Change 4C — ADD Provider pool check to SESSION-GAPPREP-R4.md as Step 6

**What to add:**
```markdown
## STEP 6 — Provider pool audit (PC-8 equivalent for gap classification)

```bash
EXEC_TENANT="${DEFAULT_TENANT_ID:-default}"

POOL_COUNT=$(curl -sf "http://localhost:9200/xiigen-byok-keys/_search" \
  -H "Content-Type: application/json" \
  -d "{\"query\":{\"term\":{\"tenantId.keyword\":\"$EXEC_TENANT\"}},\"size\":1}" \
  2>/dev/null | python3 -c "
import sys,json; d=json.load(sys.stdin)
hits=d.get('hits',{}).get('hits',[])
print(len(hits[0].get('_source',{}).get('providers',[])) if hits else 0)
" 2>/dev/null || echo 0)

[ "$POOL_COUNT" -ge 3 ] && echo "✅ Provider pool: $POOL_COUNT providers (full rotation enabled)"
[ "$POOL_COUNT" -eq 1 ] && echo "⚠️  Provider pool: 1 provider (V9-002 cannot be satisfied) → raise GAP-POOL-1"
[ "$POOL_COUNT" -eq 0 ] && echo "❌ Provider pool MISSING → raise GAP-POOL-1 (BREAKS — all AI calls use mock)"
```

**Classification for pool gap:**
- Gap ID: GAP-POOL-1
- Layer: **10** (PROVIDER POOL)
- Severity: **BREAKS** if pool = 0; **PARTIAL** if pool = 1
- Fix class: INFRASTRUCTURE (run BootstrapSeeder with all 3 BOOTSTRAP_* keys)
- Before: Phase B of this flow (any round that calls the AI engine)
```

---

### Change 4D — ADD Layer 8, 9, 10 to GAP DOCUMENT STRUCTURE (R8 template)

**Location:** GAP DOCUMENT STRUCTURE section in GAP-PREP-MASTER-PLAN.md.

**Current template ends at:**
```
## LAYER 7 — GOVERNANCE (if any)
  ### GAP-GOV-1 ...
```

**Add after Layer 7:**
```markdown
## LAYER 8 — E2E SPEC COVERAGE (if any)
  ### GAP-E2E-COV-1 🟠 — Missing Playwright spec for [PageName]
  **File:** e2e/tests/[pagename].spec.ts (to be created)
  **Problem:** [PageName].tsx exists in client/src/pages/ with no matching spec
  **Impact:** CI passes while UI regressions ship undetected for this page
  **Fix:** [5-step session file — see GAP-TRANSLATE Layer 8 structure]
  **Scope:** CONTENT — ~60 lines in 1 new file

## LAYER 9 — OBSERVABILITY (if any)
  ### GAP-OBS-1 🔴 — CycleTrace missing from session-output-formatter
  **File:** server/src/engine/flows/generation-loop/session-output-formatter.service.ts
  **Problem:** formatter output type does not include CycleTrace[]/ArbiterTrace[]/promptSent
  **Impact:** Grade diagnosis requires re-running with manual logging. Arbiter blocking
              reason is invisible. OSS model teaching cannot identify which prompt template
              caused a low grade.
  **Fix:** [8-step session file — see REPORT-OBSERVABILITY-GAP.md]
  **Scope:** EXTENSION — ~40 lines in 2 files

## LAYER 10 — PROVIDER POOL (if any)
  ### GAP-POOL-1 🟠 — Provider pool missing or incomplete
  **File:** BootstrapSeeder (infrastructure — no source file change needed)
  **Problem:** xiigen-byok-keys has 0 or 1 provider for execution tenant
  **Impact:** SK-523 rotation disabled. V9-002 (chosen.model ≠ rejected.model)
              cannot be satisfied. DPO triples → pending index permanently.
  **Fix:** [2-step session file — see GAP-TRANSLATE Layer 10 structure]
  **Scope:** INFRASTRUCTURE — run BootstrapSeeder with BOOTSTRAP_ANTHROPIC/OPENAI/GEMINI_KEY
```

---

### Change 4E — ADD Layers 8, 9, 10 to EXECUTION ORDER SUMMARY (R8 template)

**Current execution order:**
```
PRIORITY 1 — SILENT_FAILUREs
PRIORITY 2 — BREAKS
PRIORITY 3 — PARTIAL
PRIORITY 4 — ADVISORY
```

No change needed here — the layers feed into the same priority buckets:
- GAP-POOL-N with BREAKS severity → PRIORITY 2
- GAP-E2E-COV-N with BREAKS severity → PRIORITY 2
- GAP-OBS-N with SILENT_FAILURE severity → PRIORITY 1

The existing bucket structure handles them correctly.

---

## DOCUMENT 5 — GAP-TRANSLATE-MASTER-PLAN.md

### Change 5A — ADD Layer 8 to LAYER MAP

**Location:** LAYER MAP section, after Layer 7 entry.

**Add:**
```markdown
### Layer 8: E2E Spec Coverage (GAP-E2E-COV-N)
```
## CONTEXT      → export PAGE_FILE="client/src/pages/[Name]Page.tsx"
##                 export SPEC_FILE="e2e/tests/[name].spec.ts"
## WHY FIRST    → CI is blind to regressions on this page (BREAKS)
## STEP 1       → grep for data-testid in PAGE_FILE — list all values
## STEP 2       → if root div missing data-testid: add it to PAGE_FILE
## STEP 3       → write SPEC_FILE (full TypeScript):
##                 - import { test, expect } from '@playwright/test'
##                 - beforeEach: navigate to route, assert root testid visible
##                 - test per major state: loading / error / empty / success
##                 - NO .or() fallbacks — each selector must be exact
##                 - NO irreversible action clicks (create/delete/submit)
## STEP 4       → npx tsc --noEmit (confirm spec compiles)
## STEP 5       → ls e2e/tests/ | grep [name] (confirm file exists)
## ISSUE INVENTORY + ⛔ STOP
```
```

---

### Change 5B — ADD Layer 9 to LAYER MAP

**Add:**
```markdown
### Layer 9: Observability (GAP-OBS-N)
```
## CONTEXT      → export FORMATTER="server/src/engine/flows/generation-loop/session-output-formatter.service.ts"
## WHY FIRST    → Grade diagnosis without promptSent/ArbiterTrace requires
##                manual re-run with debug logging (SILENT_FAILURE)
## STEP 1       → Read REPORT-OBSERVABILITY-GAP.md for full 8-step implementation
##                (self-contained — do not reference it; paste the 8 steps inline)
## STEP 1       → Locate output type definition in formatter (grep 'interface\|type.*Output')
## STEP 2       → Add CycleTrace[] field to output type
## STEP 3       → Add ArbiterTrace[] field to output type
## STEP 4       → Add promptSent: string field per cycle entry
## STEP 5       → Populate fields in formatSession() method
## STEP 6       → Add model metadata (model name, tokens, latency) per cycle
## STEP 7       → npx tsc --noEmit → 0 errors
## STEP 8       → npx jest ... formatter.spec.ts → 0 failures
## ISSUE INVENTORY + ⛔ STOP
```
```

---

### Change 5C — ADD Layer 10 to LAYER MAP

**Add:**
```markdown
### Layer 10: Provider Pool (GAP-POOL-N)
```
## CONTEXT      → export EXEC_TENANT="${DEFAULT_TENANT_ID:-default}"
## WHY FIRST    → SK-523 rotation requires ≥2 providers.
##                Pool = 0 means all AI calls use mock (BREAKS).
##                Pool = 1 means V9-002 cannot be satisfied (PARTIAL).
## STEP 1       → Verify BOOTSTRAP_ANTHROPIC_KEY, BOOTSTRAP_OPENAI_KEY,
##                BOOTSTRAP_GEMINI_KEY are set in .env
## STEP 2       → Run BootstrapSeeder manually or confirm auto-seeder ran:
##                curl GET xiigen-byok-keys/_search?q=tenantId:[EXEC_TENANT]
##                Expected: providers array with 3 entries
## STEP 3       → Confirm pool response contains no plaintext keys:
##                python3 -c "assert 'sk-ant' not in response_text"
## STEP 4 (if pool still 0) → POST /api/tenant/provision with all 3 provider keys
## ISSUE INVENTORY + ⛔ STOP
```
```

---

### Change 5D — ADD Layer 8, 9, 10 to BLOCK ASSIGNMENT RULES

**Location:** BLOCK ASSIGNMENT RULES section.

**Current severity mapping:**
```
SILENT_FAILURE (🔴) → Block 1
BREAKS (🟠)         → Block 2
PARTIAL (🟡)        → Block 3
ADVISORY (⬜)       → DEFERRED
```

No change needed to the severity mapping. However, add a note for Layer 10:

**Add after ADVISORY row:**
```
GAP-POOL-N (pool=0)  → Block 1 — BLOCKS (must fix before any AI round runs)
GAP-POOL-N (pool=1)  → Block 2 — PARTIAL (fix before Phase B of this flow)
GAP-E2E-COV-N        → Block 2 — BREAKS (fix before E2E+UI REVIEW step)
GAP-OBS-N            → Block 1 — SILENT_FAILURE (fix before any grade diagnosis)
```

---

## SUMMARY TABLE — ONE ROW PER CHANGE

| # | File | Change type | Section | What changes |
|---|------|------------|---------|-------------|
| 1A | SESSION-R0-PRECHECK.md | ADD | After STEP 5 | STEP 6 — PC-6 E2E spec coverage (bash commands) |
| 1B | SESSION-R0-PRECHECK.md | ADD | After STEP 6 | STEP 7 — PC-7 OBS-01 CycleTrace/ArbiterTrace check |
| 1C | SESSION-R0-PRECHECK.md | ADD | After STEP 7 | STEP 8 — PC-8 provider pool ≥1 provider check |
| 1D | SESSION-R0-PRECHECK.md | MODIFY | SUMMARY GATE | Add PC-6/PC-7/PC-8 to echo list |
| 1E | SESSION-R0-PRECHECK.md | MODIFY | ⛔ STOP line | "PC-1..PC-5" → "PC-1..PC-8" |
| 2A | FLOW-PREP-MASTER-PLAN.md | MODIFY | ROUND TABLE R0 | "PC-1..PC-5" → "PC-1..PC-8 (PC-6: E2E; PC-7: OBS; PC-8: pool)" |
| 3A | SIMULATION-MASTER-PLAN.md | MODIFY | R0 row | Add E11 provider pool check to SESSION-SIM-R0.md scope |
| 3A | SESSION-SIM-R0.md | ADD | After STEP 4 | STEP 5 — E11 provider pool check (bash commands) |
| 3B | SIMULATION-MASTER-PLAN.md | ADD | GROUP E table | New row after R8: R9 = E10 CycleTrace/ArbiterTrace check |
| 3B | SIMULATION-MASTER-PLAN.md | MODIFY | Total rounds | 35 → 36 (E10 adds one round) |
| 3B | SIMULATION-MASTER-PLAN.md | MODIFY | All GROUP A-D rows | R9→R10, R10→R11 ... R32→R33 (shift by 1) |
| 4A | GAP-PREP-MASTER-PLAN.md | ADD | GAP LAYER MAP | Rows for Layer 8 (E2E-COV), Layer 9 (OBS), Layer 10 (POOL) |
| 4B | SESSION-GAPPREP-R4.md | ADD | After existing steps | STEP 5 — E2E spec coverage audit |
| 4C | SESSION-GAPPREP-R4.md | ADD | After STEP 5 | STEP 6 — Provider pool audit |
| 4D | GAP-PREP-MASTER-PLAN.md | ADD | GAP DOCUMENT STRUCTURE | Layer 8 / 9 / 10 template entries |
| 5A | GAP-TRANSLATE-MASTER-PLAN.md | ADD | LAYER MAP | Layer 8 session structure (E2E spec — 5 steps) |
| 5B | GAP-TRANSLATE-MASTER-PLAN.md | ADD | LAYER MAP | Layer 9 session structure (Observability — 8 steps) |
| 5C | GAP-TRANSLATE-MASTER-PLAN.md | ADD | LAYER MAP | Layer 10 session structure (Provider pool — 4 steps) |
| 5D | GAP-TRANSLATE-MASTER-PLAN.md | ADD | BLOCK ASSIGNMENT RULES | Explicit block assignments for Layer 8/9/10 gaps |

**Total changes: 19 (across 6 files)**

---

## WHAT DOES NOT CHANGE

These are NOT part of the changes required:

```
FLOW-PREP rounds R1–R19    — unchanged (planning document authoring, not engine testing)
SIMULATION rounds R1–R8    — unchanged (E1-E8 scenarios remain the same)
GAP-PREP rounds R0–R3      — unchanged (intake, E-sim, execution sim, session audit)
GAP-PREP rounds R5–R8      — unchanged (classify, dedup, root cause, gap doc authoring)
GAP-TRANSLATE T0–T3        — unchanged (parse, block plan, master plan, first session file)
GAP-TRANSLATE severity buckets — unchanged (SILENT→Block1, BREAKS→Block2, etc.)
```

Calibration (Phase 0), OSS curriculum, snapshot JSON baselines, and provider
rotation verification are **Phase-level concerns** (IMPLEMENTATION-PROTOCOL-v3.md),
not FLOW-PREP-level concerns. They run once per phase before any flow's session
files execute — not per-flow. They belong in the phase DoD checklist, not in the
FLOW-PREP / SIMULATION / GAP-PREP pipeline.

The only exception is the provider pool check (PC-8 / E11 / GAP-POOL-N): this
IS per-flow because each flow's session files call the AI engine directly, and a
missing pool silently breaks AI calls for that specific flow's execution context.

---

*Save to: [PROJECT_ROOT]\docs\flow-plan-preparation\FLOW-PREP-CHANGES-REQUIRED.md*
