# GUIDE-B14 — How to Produce `FLOW-XX-R0-PRECHECK.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 24 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-R0-PRECHECK.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the R0-PRECHECK guidance: one of the 50 guidance files that together
constitute the library. When Claude Code applies this guidance to a new flow's spec,
it will produce a correct, evidence-backed `FLOW-XX-R0-PRECHECK.md` for that flow.

---

## WHAT THIS FILE IS

`FLOW-XX-R0-PRECHECK.md` (also named `SESSION-R0-PRECHECK.md` in older flows) is the
**pre-authoring infrastructure gate** for a flow. It must run and pass GREEN before
any session file authoring (R1 and beyond) begins.

The precheck has a single job: catch every infrastructure problem that would cause the
entire flow's simulation and implementation work to produce wrong results silently —
without errors, without test failures, just wrong data. These are the SILENT_FAILURE
class of problems: code runs, nothing crashes, but the output is structurally invalid.

**This is a "consumed by Claude Code" document.** Every bash command must be literal
and copy-pasteable. No pseudo-code. No cross-references to external files.

**Key distinction from SESSION-SIM-R0:**
- SESSION-SIM-R0 (B-13) is the first *simulation round* — it checks whether the
  Elasticsearch indices for one specific scenario exist and have correct mappings.
- R0-PRECHECK (B-14) is the *pre-authoring gate* — it checks system-wide
  infrastructure: DPO schema correctness, archetype registration, named check
  alignment, provider pool readiness, E2E spec coverage, and report observability.
  It runs BEFORE any session file authoring. SESSION-SIM-R0 runs as PART OF authoring.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-03 | PRIMARY + STRUCTURE | `SESSION-R0-PRECHECK.md` — the canonical template (8 checks, PC-1..PC-8, full bash commands) |
| ZIP-01 | PRIMARY | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` §R0 gate — what must be green before authoring begins |
| ZIP-11 | FIXTURE | `FLOW-10-SESSION-R0-PRECHECK.md` — adds BLOCKING GATE 0a (artifact pre-allocation) and BLOCKING GATE 0b (product decision) |
| ZIP-11 | FIXTURE | `FLOW-15-SESSION-R0-PRECHECK.md` — adds BLOCKING GATE 0a (T/F range allocation), GATE 0b (NamedCheckRegistry externalization), further blocking gates for correctness blockers |
| ZIP-11 | FIXTURE | `FLOW-41-R0-PRECHECK.md` — late-cycle adaptation variant: PC-3 adapted for CALLBACK event model (not CloudEvents); PC-5 adapted for vitest assertions |
| ZIP-11 | FIXTURE | `FLOW-42-SESSION-R0-PRECHECK.md` — simulation-era flow: same PC-1..PC-8, shows how results are pre-filled for later flows |
| ZIP-16 | REFERENCE | Flow's business spec — drives new archetypes (PC-4), named checks (PC-5), product decisions (blocking gates) |

**C30 split note:** For FLOW-35..47, primary spec comes from ZIP-09/10/13 fixtures and
project docs (no ZIP-16 spec). The blocking gate content (GATE 0a artifact ranges, GATE 0b
product decisions) comes from the flow's master plan file, not from ZIP-16.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-R0-PRECHECK.md`

Older flows (FLOW-10 through FLOW-20) use `SESSION-R0-PRECHECK.md` without the flow
prefix — both are valid. For new flows (FLOW-41+), use the flow-prefixed name:
`FLOW-XX-R0-PRECHECK.md`.

**Position in flow lifecycle:** This file is authored FIRST — before R1, before
any session files, before the state is initialized. It is the gate that unlocks the
rest of the flow's session authoring.

---

## THE PRECHECK STRUCTURE

Every R0-PRECHECK file has the same skeleton:

```
1. File header
2. CONTEXT block (export FLOW_ID, BASE_DIR, optional extras)
3. BLOCKING GATES 0a..0n (flow-specific — can be 0 to many)
4. Universal checks PC-1 through PC-8
5. SUMMARY GATE (final verdict table)
6. ISSUE INVENTORY
7. ⛔ STOP
```

The universal checks (PC-1..PC-8) are the same for every flow. The blocking gates
(0a..0n) are flow-specific and derived from the flow's master plan.

---

## HOW TO PRODUCE THE FILE

### Step 1 — Derive the file header

```markdown
# FLOW-XX-R0-PRECHECK.md
## Flow: FLOW-XX ([Flow human name])
## Round: R0 | Action: PRE-AUTHORING CHECKS (PC-1 to PC-{N})
## Source: FLOW-XX master plan
## Self-contained: zero cross-references, all commands literal
## Must complete before R1. ALL checks must be GREEN. RED = STOP + fix.
```

Replace `{N}` with the count of checks (8 if no flow-specific extras are added;
higher if flow-specific checks are required).

### Step 2 — Write the CONTEXT block

```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."          # project root (server/ and client/ live here)
export SESSION_DIR="docs/sessions/FLOW-XX"
export NEW_ARCHETYPES="[space-separated new archetypes, e.g. ROUTING ORCHESTRATION]"
```

Add flow-specific variables as needed:
- `TARGET_STACK` — for adaptation flows (FLOW-41+) that target a non-standard stack
- `EVENT_MODEL` — for flows that do not use CloudEvents (set to `CALLBACK`)
- `EXEC_TENANT` — if the flow uses a non-default execution tenant

### Step 3 — Author BLOCKING GATES (flow-specific)

Blocking gates are 0 to N numbered 0a, 0b, 0c... They run BEFORE PC-1.
Each blocking gate represents a condition that cannot be automated by the universal
PC checks but must be resolved before session authoring can proceed.

**Common blocking gate types (derive from flow's master plan):**

**GATE 0a — Artifact pre-allocation:**
Required when the flow's master plan uses `T-[+N]` or `$T_START`/`$T_END` placeholder
tokens for task type IDs. Phase A MUST NOT execute until these are resolved.

```bash
echo "=== GATE 0a: Artifact pre-allocation gate ==="
PLACEHOLDER_COUNT=$(grep -r "T-\[+" "$BASE_DIR/$SESSION_DIR/" --include="*.md" 2>/dev/null | wc -l)
F_PLACEHOLDER=$(grep -r "F-\[+" "$BASE_DIR/$SESSION_DIR/" --include="*.md" 2>/dev/null | wc -l)

echo "T-[+N] placeholders: $PLACEHOLDER_COUNT"
echo "F-[+N] placeholders: $F_PLACEHOLDER"

if [ "$PLACEHOLDER_COUNT" -gt 0 ] || [ "$F_PLACEHOLDER" -gt 0 ]; then
  echo "⚠️  GATE 0a: Placeholders remain — pre-allocation session must run before Phase A"
  echo "   Note: R1 authoring may proceed with placeholders; Phase A EXECUTION is blocked"
else
  echo "✅ GATE 0a: No placeholders — pre-allocation complete"
fi
```

**GATE 0b — Product decision required:**
Required when the flow has an unresolved product decision that blocks implementation
(e.g., choice between alternative architectural strategies for a key invariant).

```bash
echo "=== GATE 0b: Product decision gate ==="
DECISION=$(grep -o '"[A-Z_]*_STRATEGY": "[^"]*"' "$BASE_DIR/$SESSION_DIR/"*.md 2>/dev/null | head -1)
echo "Current strategy value: $DECISION"

if echo "$DECISION" | grep -q "PRODUCT DECISION\|TBD\|__"; then
  echo "❌ GATE 0b: [decision name] not resolved — Luba must choose before Phase A"
  echo "   Options: [list options from flow spec]"
else
  echo "✅ GATE 0b: Product decision set"
fi
```

**GATE 0c — Named check registry externalization:**
Required when the total named check count exceeds a threshold where name collisions
become likely (typically triggered when fleet-wide named check count reaches 96+).

**If no blocking gates apply for this flow**, skip the blocking gate section entirely
and proceed directly to PC-1.

### Step 4 — Author Universal Checks PC-1 through PC-8

These 8 checks are identical for every flow — only the context variables change.
Copy these verbatim and adjust only where noted.

---

**PC-1: Infrastructure fixture files exist**

```bash
echo "=== PC-1: Infrastructure fixture files ==="
GRAPH_FIX=$(ls "$BASE_DIR/server/fixtures/indices/"*decision-graph* 2>/dev/null | wc -l)
PLAN_FIX=$(ls  "$BASE_DIR/server/fixtures/indices/"*planning-decisions* 2>/dev/null | wc -l)

# Also check legacy path if primary is empty
if [ "$GRAPH_FIX" -eq 0 ]; then
  GRAPH_FIX=$(ls "$BASE_DIR/server/src/rag-init/fixtures/"*decision-graph* 2>/dev/null | wc -l)
fi
if [ "$PLAN_FIX" -eq 0 ]; then
  PLAN_FIX=$(ls "$BASE_DIR/server/src/rag-init/fixtures/"*planning-decisions* 2>/dev/null | wc -l)
fi

[ "$GRAPH_FIX" -gt 0 ] \
  && echo "✅ PC-1a: xiigen-decision-graph fixture exists" \
  || echo "❌ PC-1a FAIL: xiigen-decision-graph fixture MISSING — raise GAP-INFRA-01, STOP"

[ "$PLAN_FIX" -gt 0 ] \
  && echo "✅ PC-1b: xiigen-planning-decisions fixture exists" \
  || echo "❌ PC-1b FAIL: xiigen-planning-decisions fixture MISSING — raise GAP-INFRA-01, STOP"
```

**GATE:** Both must print ✅. RED → do not proceed. Create fixture files first
(see canonical mapping in GUIDE-B13 GAP REGISTER H-1/H-2).

---

**PC-2: DpoTriple schema — top-level chosen/rejected (no .code subfields)**

```bash
echo "=== PC-2: DpoTriple schema check ==="
K1_SRC=$(grep -rn "chosen\.code\|rejected\.code" "$BASE_DIR/server/src/" --include="*.ts" 2>/dev/null | wc -l)
K1_SKL=$(grep -rn "chosen\.code\|rejected\.code" "$BASE_DIR/.claude/skills/" 2>/dev/null | wc -l)

echo "K1 violations in server/src: $K1_SRC"
echo "K1 violations in .claude/skills: $K1_SKL"

[ "$K1_SRC" = "0" ] && [ "$K1_SKL" = "0" ] \
  && echo "✅ PC-2: No .code subfield references" \
  || echo "❌ PC-2 FAIL: Found .code subfield references — raise K1 gap before authoring"
```

**GATE:** Both counts must be 0. RED → find and fix .code references.
**Note for late-cycle flows (FLOW-41+):** If source code is clean but session files
have stale K1 violations, classify as GREEN for NEW flow authoring and note the
systemic carry-forward separately. The precheck guards the new files, not old ones.

---

**PC-3: CloudEvent name cross-check**

```bash
echo "=== PC-3: CloudEvent name verification ==="
```

**Two variants — choose based on flow's event model:**

*Standard CloudEvents variant (most flows):*

```bash
echo "For FLOW-$FLOW_ID, verify each task type's emits/consumes names:"
grep -rn "type:" "$BASE_DIR/server/src/engine-contracts/" --include="*.ts" \
  | grep -i "event\|sent\|created\|completed" | head -20
echo ""
echo "Compare against session file event name references."
echo "Mark K2 gap if ANY synonym used (e.g., 'Completed' vs 'Sent')."
echo "Confirm: PC-3 GREEN (exact match) or RED (mismatch — raise K2 gap)"
```

*CALLBACK / standalone app variant (FLOW-41, FLOW-42, FLOW-43+):*

```bash
echo "PC-3: $FLOW_ID uses CALLBACK event model — no CloudEvents"
echo "Event model: $EVENT_MODEL"
echo "No CloudEvent name verification required."
echo "Verify instead: SDK method names used in session files match API docs."
echo "GREEN if EVENT_MODEL=CALLBACK"
```

**GATE:** GREEN = exact CloudEvent name match (standard) or CALLBACK model confirmed.

---

**PC-4: Archetype registration completeness**

```bash
echo "=== PC-4: Archetype registration for: $NEW_ARCHETYPES ==="
for ARCHETYPE in $NEW_ARCHETYPES; do
  echo "--- $ARCHETYPE ---"

  ENUM=$(grep -c "\"$ARCHETYPE\"" \
    "$BASE_DIR/server/src/engine-contracts/contract-archetype.enum.ts" \
    2>/dev/null || echo 0)
  BOOT=$(grep -c "\"$ARCHETYPE\"" \
    "$BASE_DIR/server/src/engine-contracts/engine-contracts.bootstrap.ts" \
    2>/dev/null || echo 0)
  TIER=$(grep -c "\"$ARCHETYPE\"" \
    "$BASE_DIR/server/src/fabrics/graph/planning/feedback.handler.ts" \
    2>/dev/null || echo 0)
  WIRE=$(grep -rc "$ARCHETYPE" \
    "$BASE_DIR/server/src/fabrics/graph/planning/topology/" \
    2>/dev/null | awk -F: '{sum+=$2} END{print sum+0}')

  [ "$ENUM" -gt 0 ] && echo "  ✅ 4a: ContractArchetype enum" \
    || echo "  ❌ 4a FAIL: missing from ContractArchetype enum — raise L1 gap"
  [ "$BOOT" -gt 0 ] && echo "  ✅ 4b: ENGINE_CONTRACTS bootstrap" \
    || echo "  ❌ 4b FAIL: not in bootstrap array — raise L2 gap"
  [ "$TIER" -gt 0 ] && echo "  ✅ 4c: resolveCurriculumTier tierMap" \
    || echo "  ❌ 4c FAIL: not in tierMap — raise L3 gap (V9-003 will fail)"
  [ "$WIRE" -gt 0 ] && echo "  ✅ 4d: Topology wiring" \
    || echo "  ❌ 4d FAIL: not wired in topology/ — raise L4 gap"
done
```

**GATE:** All 4 points GREEN for every new archetype.
**Note for adaptation flows (CALLBACK model):** If the flow has no archetypes in
the engine-contracts system (e.g., a standalone plugin), set `NEW_ARCHETYPES=""`
and declare PC-4 GREEN with justification: "Flow uses CALLBACK model, no engine
archetype registration required."

---

**PC-5: Named check registry alignment**

```bash
echo "=== PC-5: Named check registry ==="
EXPORTED=$(grep -roh "NAMED_CHECK_[A-Z_]*" \
  "$BASE_DIR/server/src/engine-contracts/" --include="*.ts" \
  2>/dev/null | sort -u)
EXPORT_COUNT=$(echo "$EXPORTED" | grep -c . 2>/dev/null || echo 0)

REGISTERED=$(grep -oh "NAMED_CHECK_[A-Z_]*" \
  "$BASE_DIR/server/src/fabrics/graph/planning/validate.handler.ts" \
  2>/dev/null | sort -u)
REG_COUNT=$(echo "$REGISTERED" | grep -c . 2>/dev/null || echo 0)

echo "Exported: $EXPORT_COUNT | Registered: $REG_COUNT"
MISSING=$(comm -23 <(echo "$EXPORTED" | sort) <(echo "$REGISTERED" | sort) 2>/dev/null || true)

[ -z "$MISSING" ] \
  && echo "✅ PC-5: All named checks registered" \
  || { echo "❌ PC-5 FAIL — unregistered checks (raise E7 gap for each):"; echo "$MISSING"; }
```

**GATE:** MISSING must be empty.
**Note for adaptation flows:** If named checks are vitest assertions (not
validate.handler.ts entries), declare PC-5 GREEN with justification and list
the vitest-based named checks inline.

---

**PC-6: E2E spec coverage for every new UI page**

```bash
echo "=== PC-6: Playwright E2E spec coverage ==="
PAGES=$(find "$BASE_DIR/client/src/pages" -name "*Page.tsx" 2>/dev/null | sort)
MISSING_SPECS=""
for PAGE_FILE in $PAGES; do
  PAGE_SLUG=$(basename "$PAGE_FILE" Page.tsx | \
    sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]')
  SPEC_COUNT=$(find "$BASE_DIR/e2e/tests" -name "${PAGE_SLUG}*.spec.ts" \
    2>/dev/null | wc -l)
  if [ "$SPEC_COUNT" -eq 0 ]; then
    echo "  ❌ No E2E spec: $PAGE_FILE (slug: $PAGE_SLUG)"
    MISSING_SPECS="$MISSING_SPECS $PAGE_SLUG"
  else
    echo "  ✅ Spec found: $PAGE_SLUG"
  fi
done

[ -z "$MISSING_SPECS" ] \
  && echo "✅ PC-6: All UI pages have E2E specs" \
  || echo "❌ PC-6 FAIL: Missing E2E specs: $MISSING_SPECS — raise E2E-COV gap"
```

**GATE:** All pages must have a matching spec. RED → raise E2E-COV-XX gap and add
to GAP-TRANSLATE plan before Phase F.

---

**PC-7: Engine report observability (OBS-01)**

```bash
echo "=== PC-7: Engine execution report observability ==="
TARGET="$BASE_DIR/server/src/engine/flows/generation-loop/session-output-formatter.service.ts"
[ -f "$TARGET" ] && {
  HAS_CYCLE_TRACE=$(grep -c "cycleTraces\|CycleTrace" "$TARGET" 2>/dev/null || echo 0)
  HAS_ARBITER=$(grep -c "ArbiterTrace\|arbiters:" "$TARGET" 2>/dev/null || echo 0)
  HAS_PROMPT=$(grep -c "promptSent\|genesisPrompt" "$TARGET" 2>/dev/null || echo 0)

  [ "$HAS_CYCLE_TRACE" -gt 0 ] && echo "  ✅ cycleTraces in ExecutionLogInput" \
    || echo "  ❌ cycleTraces MISSING (OBS-01)"
  [ "$HAS_ARBITER" -gt 0 ] && echo "  ✅ ArbiterTrace schema present" \
    || echo "  ❌ ArbiterTrace MISSING (OBS-01)"
  [ "$HAS_PROMPT" -gt 0 ] && echo "  ✅ promptSent captured" \
    || echo "  ❌ promptSent MISSING — blind to genesis prompt (OBS-01)"
} || echo "⚠️  session-output-formatter.service.ts not found — OBS-01 cannot be verified"
```

**GATE:** All 3 must be GREEN. RED → OBS-01 gap — raise in GAP-TRANSLATE plan.

---

**PC-8: Provider pool populated**

```bash
echo "=== PC-8: Provider pool check ==="
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

if [ "$POOL_COUNT" -eq 0 ]; then
  echo "❌ PC-8 FAIL: No provider pool for '$EXEC_TENANT'"
  echo "   All AI calls use mock — DPO triples record model='mock'; V9-002 cannot pass"
  echo "   Action: run BootstrapSeeder with BOOTSTRAP_ANTHROPIC_KEY set"
elif [ "$POOL_COUNT" -eq 1 ]; then
  echo "⚠️  PC-8 WARNING: Single-provider pool ($POOL_COUNT provider)"
  echo "   SK-523 rotation disabled; V9-002 (chosen ≠ rejected model) cannot be satisfied"
  echo "   Simulation can proceed; record in ISSUE INVENTORY"
else
  echo "✅ PC-8: $POOL_COUNT providers for '$EXEC_TENANT' — SK-523 rotation enabled"
fi
```

**GATE:** POOL_COUNT = 0 → RED (do not proceed). POOL_COUNT = 1 → WARNING (proceed,
record in ISSUE INVENTORY). POOL_COUNT ≥ 2 → GREEN.

---

### Step 5 — Write the SUMMARY GATE

```markdown
## SUMMARY GATE

```bash
echo ""
echo "=== PC SUMMARY for $FLOW_ID ==="
echo "GATE 0a: [GREEN/RED] — artifact pre-allocation (if applicable)"
echo "GATE 0b: [GREEN/RED] — product decision (if applicable)"
echo "PC-1a:  [GREEN/RED] — xiigen-decision-graph fixture"
echo "PC-1b:  [GREEN/RED] — xiigen-planning-decisions fixture"
echo "PC-2:   [GREEN/RED] — DpoTriple .code subfields"
echo "PC-3:   [GREEN/RED] — CloudEvent names (or CALLBACK)"
echo "PC-4:   [GREEN/RED] — archetype registration"
echo "PC-5:   [GREEN/RED] — named check registry"
echo "PC-6:   [GREEN/RED] — E2E spec coverage"
echo "PC-7:   [GREEN/RED] — OBS-01 report observability"
echo "PC-8:   [GREEN/WARNING/RED] — provider pool"
echo ""
echo "ALL GREEN (PC-8 WARNING acceptable) → proceed to R1 authoring"
echo "ANY RED                             → fix and rerun R0 before R1"
```
```

### Step 6 — Write the ISSUE INVENTORY

```markdown
## ISSUE INVENTORY

| Issue | Gap ID | Severity | Blocks | Status |
|-------|--------|----------|--------|--------|
| [gap name if any found] | H-1 / GAP-ARCH-01 / etc. | BLOCKING | R1..RN / Phase A | ❌ OPEN |

(If no issues found, write: `| (none found) | — | — | — | — |`)
```

### Step 7 — Close with ⛔ STOP

```
⛔ STOP — ALL PC-1..PC-8 must be GREEN before proceeding to R1.
          GATE 0a/0b blockers must be resolved before Phase A EXECUTION
          (R1 authoring may proceed with placeholder notation).
          PC-8 WARNING (single-provider pool) is acceptable for simulation.
```

---

## NAMING CONVENTIONS

| Flow era | Filename used | Notes |
|----------|--------------|-------|
| FLOW-10..FLOW-20 | `SESSION-R0-PRECHECK.md` | No flow prefix |
| FLOW-41..FLOW-44 | `FLOW-XX-R0-PRECHECK.md` | Flow prefix added |
| FLOW-42..FLOW-44 | `FLOW-XX-SESSION-R0-PRECHECK.md` | Flow + SESSION prefix |

For new flows, use `FLOW-XX-R0-PRECHECK.md`. Both variants are valid in List B.

---

## GAP CLASSES REFERENCED IN PRECHECKS

| Gap class | What it signals | Where to raise it |
|-----------|----------------|-------------------|
| GAP-INFRA-01 | Infrastructure fixture missing (systemic) | SESSION-GAP or master plan |
| K1 | DpoTriple .code subfield (schema drift) | CARRY-FORWARD issues |
| K2 | CloudEvent name mismatch (e.g., "Sent" vs "Completed") | SESSION-GAP-R for this flow |
| L1 | Archetype missing from ContractArchetype enum | SESSION-GAP-R for this flow |
| L2 | Archetype missing from engine-contracts bootstrap | SESSION-GAP-R for this flow |
| L3 | Archetype missing from resolveCurriculumTier tierMap | SESSION-GAP-R for this flow |
| L4 | Archetype missing from topology wiring | SESSION-GAP-R for this flow |
| E7 | Named check exported but not registered in validate.handler.ts | SESSION-GAP-R for this flow |
| E2E-COV | UI page has no matching Playwright spec | GAP-TRANSLATE plan |
| OBS-01 | Engine execution report missing cycleTraces/promptSent | GAP-TRANSLATE plan |
| GAP-POOL-1 | No AI providers in pool (mock-only) | ISSUE INVENTORY + BootstrapSeeder fix |

---

## ACCEPTANCE CRITERIA FOR THE R0-PRECHECK

Before the R0-PRECHECK is considered complete for a flow:

- [ ] File is self-contained — no cross-references, all variables defined in CONTEXT block
- [ ] Header declares flow ID and names the source master plan
- [ ] BLOCKING GATES (if any) are present and derived from flow's master plan content
- [ ] PC-1 through PC-8 are all present with literal bash commands
- [ ] PC-3 declares the correct event model (CloudEvents or CALLBACK)
- [ ] PC-4 sets `NEW_ARCHETYPES` correctly (empty string if no new archetypes)
- [ ] SUMMARY GATE lists every check
- [ ] ISSUE INVENTORY is present (may be empty)
- [ ] File closes with `⛔ STOP`
- [ ] File produced BEFORE any session file (R1..RN) authoring begins

---

## FILE STRUCTURE SUMMARY

```
docs/sessions/FLOW-XX/
  FLOW-XX-R0-PRECHECK.md          ← This file (B-14)
  FLOW-XX-R1-STATE-INIT.md        ← B-15 (next)
  SESSION-SIM-R0.md               ← B-13 (simulation pre-gate, different purpose)
  SESSION-SIM-R1.md
  ...
```

The R0-PRECHECK runs once, at the start, before any session authoring.
The SESSION-SIM-R0 runs as the first simulation round and may be re-run.
They serve different purposes and must both exist for every flow.

---

*End of GUIDE-B14 — FLOW-XX-R0-PRECHECK.md*
*List A sources: ZIP-03 (canonical SESSION-R0-PRECHECK), ZIP-01 (Authoring Guide §R0),*
*ZIP-11 (FLOW-10/15/41/42 R0-PRECHECK examples)*
*Target B-type: B-14 — FLOW-XX-R0-PRECHECK.md*
*Round: 24 of 72*
