# GUIDE-B17 — How to Produce `FLOW-XX-IMPLEMENTATION-PLAN.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 27 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20
## v6 amendment: C33 — Phase 7 (FC-18 UI/UX Compliance audit) mandatory

---

## FINAL GOAL (re-read before authoring any FLOW-XX-IMPLEMENTATION-PLAN.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the IMPLEMENTATION-PLAN guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a new
flow's spec, it will produce a correct, evidence-backed
`FLOW-XX-IMPLEMENTATION-PLAN.md` for that flow.

---

## WHAT THIS FILE IS

`FLOW-XX-IMPLEMENTATION-PLAN.md` is **Document 3 of the 3-document flow pipeline** —
the execution plan Claude Code uses to implement a flow from corpus seeding through
live service deployment. It is the downstream consumer of Documents 1 and 2:

```
Document 1: FLOW-XX-DESIGN-SIMULATION-R1.md   ← authoritative design
Document 2: FLOW-XX-TEACH-QA-R0.md            ← teaching infrastructure
Document 3: FLOW-XX-IMPLEMENTATION-PLAN.md    ← this file (execution plan)
```

The implementation plan sequences Phases A through F (plus Phase 7 — see C33
amendment below), with each phase ending in an ⛔ STOP gate that Claude Code
must pass before proceeding. Every command is literal and self-contained.

**Consumer:** Claude Code.
**Session type declared in the file:** GENERATION.
**Rule:** Production order is mandatory — TEACH-QA-R0 must be complete before
this file is authored. Design simulation must be complete before TEACH-QA-R0.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-02 | PRIMARY | `LIBRARY-4-IMPLEMENTATION.md` — the canonical implementation plan library: phase structure (A-F), absolute gate template, found-issue protocol, PHASE-0 corpus seed pattern, phase gate format |
| ZIP-01 | PRIMARY | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.16.md` §Document 3 — absolute gate (5-gate block), file header, purpose section, phase ordering rule, documentation artifacts gate (Rule 17), Phase 7 UI/UX Compliance (v1.15), Q8 Screen Intent gate (new v1.16), SCREEN INTENT SERVED completion item (new v1.16), Rule 35 Screen Intent Anchor (new v1.16) |
| ZIP-15 | REFERENCE §4 | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §4 — role relationship types (8 types: HIERARCHY, CONTEXT, TENANT-CONFIG, DELEGATION, MUTUAL-EXCLUSION, GUARDIAN/DEPENDENT, AI-BLOCKS-HUMAN, HUMAN-GATES-AI). Used in guard pattern documentation for plans with Human Gates |
| ZIP-14 | REFERENCE | `nextjs.csv` §32-33 — Next.js middleware patterns for route-level guard implementation (React page authentication + role enforcement) |
| ZIP-17 | EVIDENCE | `UX-REVIEW-ROLLUP.md` + `FLEET-VALIDATION-v1.md` — 622 PNGs, 575 findings, 220 BLOCKER (35% severity) caused by missing Phase 7 FC-18 gate (failure pattern FP-3). Confirms C33 amendment is non-optional |
| ZIP-11 | FIXTURE | `FLOW-09-IMPLEMENTATION-PLAN-v4.1-R1-FINAL.md` — mature corrections addendum style; scope_isolation arbiter addition; PLAN_EXEMPLAR guard; cross-wave backward event route |
| ZIP-11 | FIXTURE | `FLOW-10-IMPLEMENTATION-PLAN-v1.0.md` — mid-period style; BLOCKING GATE 0a placeholder pre-allocation; Product Decision GATE 0b |
| ZIP-11 | FIXTURE | `FLOW-25-IMPLEMENTATION-PLAN-v1.md` — Human Gate flow (Template 5 from ZIP-15 §4): AI-BLOCKS-HUMAN guard; ArbitrationStateMachine; 6 archetypes |
| ZIP-11 | FIXTURE | `FLOW-46-IMPLEMENTATION-PLAN-v1.md` — latest style: SK-443 Gate D goal advancement block; round-trip step advances (SK-533); Goal Reminder block; full Phase A-F + DOCUMENTATION ARTIFACTS (Rule 17) |

**C30 split note:** For FLOW-35..47, primary spec comes from ZIP-09/10/13 fixtures and
project docs. Artifact IDs (T/F/CF/SK ranges) come from CLAUDE.md canonical counter.

**C33 amendment note:** Phase 7 (FC-18 UI/UX Compliance audit) is mandatory for every
implementation plan that includes React page implementation steps. Evidence: ZIP-17
found 35% BLOCKER severity (220 of 575 findings) directly caused by absence of FC-18
gate — generic CRUD pages shipped in place of domain screens, role audience not declared,
engine-internal screens exposed to tenant users.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN-v1.md`

Older flows: `FLOW-XX-YY-IMPLEMENTATION-PLAN-vN.md` (paired flows). For new single
flows: `FLOW-XX-IMPLEMENTATION-PLAN-v1.md`.

**File type context:** This is a Claude Code execution document. Every command must
be literal (no pseudo-code), every gate must have exact pass/fail criteria
(not "verify it works"), and every phase must be self-contained.

---

## THE IMPLEMENTATION PLAN STRUCTURE

Every implementation plan has this skeleton:

```
1. File header
2. Goal advancement block (SK-443 Gate D)
3. Preamble (session type, base commit, prerequisites)
4. Execution model (phases listed)
5. Absolute gate (5-gate block — runs at every ⛔ STOP)
6. Found-issue protocol
7. Phase A — Corpus seed
8. Phase B — Service implementations (per task type)
9. Phase C — Client pages (if any React pages in this flow)
10. Phase D — Admin panel / secondary surfaces (if any)
11. Phase E — Integration + E2E tests + DPO verification
12. Phase F — BFA cross-flow validation + Promote to ACTIVE
13. [C34] Phase G — Portability Mobility Gate (MANDATORY for all distributable flows)
14. [C33] Phase 7 — UI/UX Compliance audit (if React pages produced)
14. Documentation artifacts shipped (Rule 17 checklist)
15. Issue inventory
16. Delivery summary
```

Phases A–F are the standard execution sequence. Phase G is the new mandatory portability
gate added by C34 for all distributable flows. Phase 7 is the UI/UX compliance gate
added by C33 whenever the plan produces React pages.

---

## HOW TO PRODUCE THE FILE

### Step 1 — Write the file header

```markdown
# FLOW-XX — IMPLEMENTATION PLAN
## [Flow human name] — Document 3
## Session type: GENERATION (Claude Code executes)
## Consumer: Claude Code — Phase A through Phase F
## Branch: claude/vigorous-margulis
## Base: [commit hash] ([brief description of base state])
## Date: YYYY-MM-DD
## Authored from: FLOW-XX-DESIGN-SIMULATION-R1.md + FLOW-XX-TEACH-QA-R0.md
```

### Step 2 — Write the Goal Advancement Block (SK-443 Gate D)

Required in every implementation plan. This block re-states the session goal verbatim
and maps each round-trip step to the phases that advance it.

```markdown
## Goal advancement (SK-443 v1.1 Gate D)

Session advances goal (verbatim from STATE.goalContext.statement):
> "[verbatim goal statement from DESIGN-SIMULATION-R1.md or master plan]"

Round-trip step(s) advanced (SK-533):
  step 1 ([label])  → Phase [X] [what it delivers]
  step 2 ([label])  → Phase [X] [what it delivers]
  ...

Concrete progress (ONE sentence):
> "By executing FLOW-XX-IMPLEMENTATION-PLAN-v1 Phase A through F, [flow name]
> moves from '[state before]' to '[state after: services + tests + commit]'."
```

### Step 3 — Write the Preamble

```markdown
## PREAMBLE

```
Session ID: FLOW-XX-IMPLEMENTATION-PLAN-v1
Session type: GENERATION
Consumer: Claude Code
Branch: claude/vigorous-margulis
Base commit: [hash]

Prerequisites verified:
  ✅ FLOW-XX-DESIGN-SIMULATION-R1.md committed
  ✅ FLOW-XX-TEACH-QA-R0.md fixtures seedable (dry-run: N records, 0 errors)
  ✅ Design contract tests authored ([N] DC + [N] SNAP + [N] INT = [total])

Non-prerequisites (must NOT block Phase A-F):
  ⏳ [any deferred dependency — make explicit]

Branch at start must be: claude/vigorous-margulis at commit >= [hash]

Artifact boundaries at start:
  T[NNN] consumed (FLOW-XX)        Next T after FLOW-XX: T[NNN+1]
  F[NNNN] consumed (FLOW-XX)       Next F after FLOW-XX: F[NNNN+1]
  CF-[NNN] consumed (FLOW-XX)      Next CF after FLOW-XX: CF-[NNN+1]
```
```

### Step 4 — Write the Execution Model

```markdown
## EXECUTION MODEL

[N] phases. Each phase ends with an ⛔ STOP gate. Claude Code executes each phase
then halts for Luba review before starting the next.

```
Phase A — CORPUS SEED                                    (1 session)
Phase B — SERVICE IMPLEMENTATIONS T[NNN]-T[NNN+M]       (1 session)
[Phase C — CLIENT PAGES — if React pages in this flow]   (1 session)
[Phase D — ADMIN PANEL / SECONDARY SURFACES — if any]   (1 session)
Phase E — INTEGRATION + E2E TESTS + DPO VERIFICATION    (1 session)
Phase F — BFA CROSS-FLOW VALIDATION + PROMOTE ACTIVE    (1 session)
[Phase 7 — UI/UX COMPLIANCE AUDIT — if React pages]     (1 session)
```
```

### Step 5 — Write the Absolute Gate (runs at every ⛔ STOP)

This block is inlined verbatim in the plan. It never cross-references other files.

```bash
## ABSOLUTE GATE (RUN ON EVERY PHASE ⛔ STOP)

# Lint
cd server && npm run lint 2>&1 | grep -cE "warning|error"
# Expected: 0

# TypeScript — server
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"
# Expected: 0

# TypeScript — client (required when any phase produces client files)
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"
# Expected: 0

# Format — server
cd server && npm run format:check 2>&1 | grep -c "\[warn\]"
# Expected: 0

# Format — client
cd client && npm run format:check 2>&1 | grep -c "\[warn\]"
# Expected: 0

# Server tests — failures === 0 (ABSOLUTE — not delta)
cd server && npx jest 2>&1 | grep "Tests:" | tail -1
# Expected: "X passed, Y total" with 0 failed; X >= [BASELINE] for this phase

# Client tests
cd client && npx jest --passWithNoTests 2>&1 | grep "Tests:" | tail -1
# Expected: 0 failed

# Client build
cd client && npm run build 2>&1 | grep -cE "^error TS|^Error:"
# Expected: 0
```

**Any failure → STOP, log to ISSUE INVENTORY, fix before ⛔. Never defer with
"pre-existing" without explicit Luba authorization.**

### Step 6 — Write the Found-Issue Protocol

```markdown
## FOUND-ISSUE PROTOCOL (inline)

```
1. STOP at point of discovery — do not continue to next step
2. Record in ISSUE INVENTORY:
     Issue: [description]
     Severity: BLOCKING | NON-BLOCKING
     Root cause: [one sentence]
     Fix: [literal commands] OR Escalate: [question for Luba]
3. If BLOCKING: fix before proceeding (or escalate with full context)
4. If NON-BLOCKING: complete current step, then fix before ⛔ STOP
5. NEVER label as "pre-existing" without Luba written authorization
6. POST-FIX VERIFICATION:
     grep -n "old-value" changed-file
     Expected: 0 hits. If hits remain, fix is incomplete — do NOT mark FIXED.
```
```

### Step 7 — Write Phase A (Corpus Seed)

Phase A is the same for every flow. It executes TEACH-QA-R0 Phases 1-2 and wires
the corpus into the bootstrap service.

```markdown
## PHASE A — CORPUS SEED

### A.1 — Create engine flow directory
```bash
mkdir -p server/src/engine/flows/{slug}
mkdir -p server/src/engine/flows/{slug}/__tests__
mkdir -p fixtures/event-schemas/{slug}
```

### A.2 — Apply TEACH-QA-R0 Phase 1 (design-reasoning fixtures)
Execute TEACH-QA-R0 Phase 1 → writes
`fixtures/design-reasoning/{slug}-design-decisions.json`
([N] DR records + [N] ARCH_PATTERN records).

Gate:
```bash
test -f fixtures/design-reasoning/{slug}-design-decisions.json
node -e "const d=require('./fixtures/design-reasoning/{slug}-design-decisions.json'); \
console.log('DR:', d.filter(r=>r.patternType==='DESIGN_REASONING').length, \
'ARCH:', d.filter(r=>r.patternType==='ARCH_PATTERN').length)"
# Expected: DR: [N] ARCH: [N]
```

### A.3 — Apply TEACH-QA-R0 Phase 2 (contracts + topologies + arbiters)
Execute TEACH-QA-R0 Phase 2 → writes:
- `server/src/engine-contracts/{slug}-contracts.ts`
- `server/src/engine-contracts/{slug}-bfa-rules.ts`
- `contracts/topologies/{slug}.topology.json`
- `fixtures/arbiters/{slug}-arbiters.bulk.ndjson`
- [any flow-specific index fixture files]

### A.4 — Apply TEACH-QA-R0 Phase 3 (seed script)
Execute TEACH-QA-R0 Phase 3 → writes
`rag-benchmark/seed_{slug_underscored}_patterns.py`.

### A.5 — Wire seed into bootstrap
Edit `server/src/bootstrap/engine-bootstrapper.ts` to call
`seedFlowCorpus('{slug}')` after `seedGlobalTopologies`.

### Phase A gate
```bash
# All fixture files present
for f in fixtures/design-reasoning/{slug}-design-decisions.json \
         fixtures/arbiters/{slug}-arbiters.bulk.ndjson \
         contracts/topologies/{slug}.topology.json \
         server/src/engine-contracts/{slug}-contracts.ts \
         server/src/engine-contracts/{slug}-bfa-rules.ts \
         rag-benchmark/seed_{slug_underscored}_patterns.py; do
  test -f "$f" || { echo "MISSING: $f"; exit 1; }
done

# FC-32 ordering — scope_isolation LAST in NDJSON
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | grep -q '"scope_isolation"'

# TSC passes with new contracts
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"
# Expected: 0

[absolute gate block]
# ⛔ STOP — await Luba approval for Phase B
```
```

### Step 8 — Write Phase B (Service Implementations)

Phase B implements each task type via the AF-1..AF-11 pipeline. One section per
task type. Each section specifies: output file, Genesis prompt, arbiter panel,
unit tests (with exact count), snapshot tests.

```markdown
## PHASE B — SERVICE IMPLEMENTATIONS T[NNN]-T[NNN+M]

### B.1 — T[NNN] [ServiceName]
```
Output: server/src/engine/flows/{slug}/{service-name}.service.ts
Genesis prompt: T[NNN]_CONTRACT
Panel ([N] arbiters): goal_delivery + scope_isolation + [correctness arbiters]
```

Unit tests ([N]):
1. [test description — maps to iron rule or archetype behavior]
2. [test description]
...

Snapshot tests ([N] per R1 SNAP-NN..NN).
```

**Arbiter panel minimum by archetype (from ZIP-02 LIBRARY-4):**

| Archetype | Minimum arbiters |
|-----------|-----------------|
| ROUTING | goal_delivery + scope_isolation + business_logic + key_principles + iron_rules = 5 |
| DATA_PIPELINE | goal_delivery + scope_isolation + business_logic + security + key_principles + iron_rules = 6 |
| VALIDATION | goal_delivery + scope_isolation + business_logic + completeness + key_principles + iron_rules = 6 |
| TRANSACTION | goal_delivery + scope_isolation + all 7 correctness = 9 |
| ORCHESTRATION | goal_delivery + scope_isolation + all 7 correctness = 9 |
| SCHEDULED | goal_delivery + scope_isolation + business_logic + security + key_principles + iron_rules + completeness = 7 |

**Human Gate pattern (for flows with ZIP-15 §4 Template 5):**
When the flow has a Human Gate (AI-BLOCKS-HUMAN or HUMAN-GATES-AI relationship type
from ZIP-15 §4), the implementation section for the relevant task type must include:

```markdown
### [Task type name] — Human Gate Pattern (ZIP-15 §4 Type 7/8)

Guard type: [AI-BLOCKS-HUMAN | HUMAN-GATES-AI]
Assignee type: [role string from ZIP-15 §1]
Blocking policy: [what is blocked pending resolution]
Claim semantics: [how the human actor claims the task]
Resolution actions: [APPROVE | REJECT | DEFER with downstream consequences]

Iron rule: Human Gate tasks must use `DataProcessResult.pending()` — not
           `success()` — when waiting for human resolution. Using `success()`
           before resolution is a SILENT_FAILURE: downstream nodes execute
           prematurely.
```

### Step 9 — Write Phase C (Client Pages — if React pages exist)

Phase C applies only when the flow produces `*.tsx` files in `client/src/pages/`.
If no React pages: skip Phase C, declare "No React pages — Phase C N/A."

```markdown
## PHASE C — CLIENT PAGES

### C.1 — Register route in App.tsx
```bash
# Add to client/src/App.tsx inside Routes:
<Route path="/{slug-path}" element={<[PageComponent] />} />
```

### C.1b — Q8 Screen intent (NEW v1.16 — Rule 35 — answer before writing JSX)

```bash
# Step 0: Check examination record first (38 flows already examined)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
# If examination record present: extract WHO/VERB/GRAMMAR from it (highest authority)
# If .impeccable.md present: SK-540 already satisfied
# If neither: load SK-542 → SK-540 → declare grammar before JSX
```

Screen intent declaration (from examination record, or derived per above):
  WHO:     [Role + context from docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md]
           Batch map: FLOW-01..05=BATCH-01, 06..10=BATCH-02, 11..16=BATCH-03,
                      17..21=BATCH-04, 22..26=BATCH-05, 27..31=BATCH-06,
                      32..34=BATCH-07, 35..47=BATCH-08+
  VERB:    [One action from user_intent in FLOW-XX-STEP-1-INVARIANTS.md]
  GRAMMAR: [G1 PROGRESS_STRIP · G2 VERDICT_GRID · G3 CARD_LIST ·
            G4 TOPOLOGY_CANVAS · G5 KIOSK · G6 DASHBOARD · G7 SETTINGS_TABS]
           Source: examination record (highest authority) →
                   planning--business-flows-registry.md →
                   docs/design-context/{slug}/.impeccable.md
If WHO, VERB, GRAMMAR cannot all be answered: do not write JSX.
CFI-12 halt: FLOW-04/09/34 have stale F1 — halt and report before writing JSX.

### C.2 — Implement [PageComponent]
Output: `client/src/pages/{slug}/[PageName]Page.tsx`

Role audience declared (SK-539 §1 — required before first JSX line):
  Q1 ROLE_TIER:   [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC]
  Q2 ROLE_GATE:   [primary role string from ZIP-15 §1]
  Q3 ROUTE_GUARD: [/admin/... | /settings/... | /...]
  Q4 VISIBILITY:  [visibility scope from SK-539 §4]

Page h1 anchored to user_intent or examination record spec sentence (Rule 35):
  h1: "[derives from VERB declaration — not from API path or service name]"

Primary content implements declared GRAMMAR type (G1-G7) [Rule 35 / UX-30]:
  [implementation details from Design Simulation §Client Screens section
   and from examination record planned fixes where present]

### Phase C gate
```bash
# Route registered
grep -c "{slug-path}" client/src/App.tsx
# Expected: >= 1

# Component exists
test -f client/src/pages/{slug}/[PageName]Page.tsx

# Client TSC passes
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"
# Expected: 0

[absolute gate block]
# ⛔ STOP — await Luba approval for Phase D (or Phase E if no Phase D)
```
```

### Step 10 — Write Phase E (Integration + E2E + DPO)

```markdown
## PHASE E — INTEGRATION + E2E TESTS + DPO VERIFICATION

### E.1 — Apply TEACH-QA-R0 Phase 4 (design contract tests)
```bash
npx jest --testPathPatterns="{slug}-proper-flow" 2>&1 | grep "Tests:"
# Expected: [N] passed (DC-01..DC-10), 0 failed
```

### E.2 — Apply TEACH-QA-R0 Phase 5 (teaching pipeline)
```bash
npx playwright test client/e2e/teaching-pipeline.spec.ts --project=chromium
# Expected: [N] passed (SEED-NN..SEED-NN+4)
```

### E.3 — Apply TEACH-QA-R0 Phase 6 (topology visual QA)
```bash
npx playwright test client/e2e/topology/{slug}-topology-qa.spec.ts --project=chromium
# Expected: 8 passed (TVQ-01..TVQ-08)
```

### E.4 — DPO triple verification
```bash
# After a full generation run, verify at least 1 DPO triple recorded
curl -s "http://localhost:9200/xiigen-training-data/_count?q=flowId:FLOW-XX" | python3 -c "
import sys,json; d=json.load(sys.stdin); print('DPO triples:', d['count'])"
# Expected: >= 1
```

### Phase E gate
```bash
cd server && npx jest 2>&1 | grep "Tests:" | tail -1
# Expected: >= [BASELINE + N new] passed, 0 failed

[absolute gate block]
# ⛔ STOP — await Luba approval for Phase F
```
```

### Step 11 — Write Phase F (BFA + Promote Active)

```markdown
## PHASE F — BFA CROSS-FLOW VALIDATION + PROMOTE TO ACTIVE

### F.1 — BFA cross-flow validator
```bash
cd server && npx jest --testPathPatterns="bfa-cross-flow" 2>&1 | grep "Tests:"
# Expected: 0 failures — no collision between CF-[NNN]-CF-[NNN+M] and prior BFA rules
```

### F.2 — Update CLAUDE.md artifact boundaries
```
Next Factory:   F[NNNN+1]
Next Task Type: T[NNN+1]
Next BFA Rule:  CF-[NNN+1]
```

### F.3 — Update flow registry
Edit `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` with FLOW-XX ACTIVE status.

### F.4 — Final commit
```bash
git add -A
git commit -m "feat({slug}): FLOW-XX — [Flow human name] Phase A-F complete

[brief description of what was delivered]

Phases: A (corpus) + B ([N] services) + C (React page) + E (tests) + F (BFA)
Tests:  server +[N] total = [total], 0 failed | client +[N] = [total], 0 failed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin claude/vigorous-margulis
```

### Phase F gate
```bash
# Implementation state ACTIVE
python3 -c "import json; d=json.load(open('docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json')); \
assert d['phase_status']=='ACTIVE', f'Expected ACTIVE, got {d[\"phase_status\"]}'"

[absolute gate block]
# ⛔ STOP — Luba final review, merge decision
```
```

### Step 11b — [C34 MANDATORY] Write Phase G (Portability Mobility Gate) — NEW v6.2

**This phase is mandatory for every implementation plan. A flow without Phase G is
ACTIVE but NOT MOBILE — it cannot be distributed to a second tenant.**
If the flow is EXTERNAL_REPO adapter (H-5=CON): declare "External adapter — Phase G N/A."

Evidence: Module-separation corpus analysis found 29 distinct portability gaps across
49 flows — ALL caused by absence of a portability gate in the implementation plan.
Every flow that passed Phases A-F without Phase G required a retroactive remediation session.

```markdown
## PHASE G — PORTABILITY MOBILITY GATE ★ MANDATORY for all distributable flows ★

This phase verifies that the flow can be packaged and installed in a second tenant's
environment. It runs AFTER Phase F (ACTIVE status confirmed) and BEFORE session closes.
Source: dna-compliance-guard v1.1.0 §Portability Guard Patterns; G-01 from gap mapping.

Prerequisites:
  - SK-418 dna-compliance-guard v1.1.0 loaded
    Load: read .claude/skills/code-execution/code-execution--dna-compliance-guard-SKILL.md

### G.1 — P-1 No ClsService import (GAP-01)
```bash
P1=$(grep -rc "import.*ClsService\|from 'nestjs-cls'\|TENANT_CONTEXT_KEY" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-1 ClsService imports: $P1"
# Expected: 0
# FAIL → replace cls.get(TENANT_CONTEXT_KEY) with explicit tenantId from EngineContract input
# See retroactive-development SK-419 v1.1.0 §P-1 fix row
```

### G.2 — P-2 @connectionType FLOW_SCOPED annotation (GAP-16a)
```bash
SERVICE_COUNT=$(ls server/src/engine/flows/{slug}/*.service.ts 2>/dev/null | wc -l)
ANNOTATED=$(grep -rl "@connectionType FLOW_SCOPED" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" | wc -l)
echo "P-2 Annotated: $ANNOTATED / $SERVICE_COUNT"
# Expected: ANNOTATED == SERVICE_COUNT
# FAIL → add JSDoc block before class: /** @connectionType FLOW_SCOPED @flowId FLOW-XX */
```

### G.3 — P-3 FREEDOM keys are flow-scoped (GAP-09)
```bash
P3=$(grep -rE "freedom\.get\(|fromConfig\(" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" 2>/dev/null \
  | grep -vc "flow[0-9][0-9]*_" || echo 0)
echo "P-3 Unscoped FREEDOM keys: $P3"
# Expected: 0
# FAIL → rename key from 'myParam' to 'flow{NN}_myParam'; update STEP-1-INVARIANTS Phase F
```

### G.4 — P-4 No local interface clones (GAP-02)
```bash
P4=$(grep -rcE "^interface (IDb|IQueue|IFreedom)" \
  server/src/engine/flows/{slug}/ --include="*.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}')
echo "P-4 Local interfaces: $P4"
# Expected: 0
# FAIL → import from fabrics/interfaces/ or @xiigen/engine-infra-interfaces
```

### G.5 — P-5 Cross-flow dependencies declared (GAP-10)
```bash
CROSS_FLOW=$(grep -rE "searchDocuments|storeDocument" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" 2>/dev/null \
  | grep "xiigen-" | grep -v "flow[0-9]*-" | wc -l)
DECLARED=$(node -pe "JSON.parse(require('fs').readFileSync('package.json','utf8'))\
  ?.xiigen?.requiredCoInstalls?.length ?? 0" 2>/dev/null || echo 0)
echo "P-5 Cross-flow reads: $CROSS_FLOW | Declared: $DECLARED"
# Expected: DECLARED >= CROSS_FLOW
# FAIL → add to package.json: "xiigen": { "requiredCoInstalls": ["FLOW-N"] }
```

### Phase G gate
```bash
# Portability verdict
if [ "$P1" -gt 0 ] || [ "$ANNOTATED" -ne "$SERVICE_COUNT" ] || \
   [ "$P3" -gt 0 ] || [ "$P4" -gt 0 ]; then
  echo "❌ PORTABILITY GATE FAILED — list gaps below, update STATE.json"
else
  echo "✅ PORTABILITY GATE PASSED — flow is MOBILE"
  # Update STATE.json
  node -e "
    const s = JSON.parse(require('fs').readFileSync('docs/sessions/{slug}/IMPL-STATE.json'));
    s.portabilityStatus = 'MOBILE';
    s.portabilityGaps = [];
    require('fs').writeFileSync('docs/sessions/{slug}/IMPL-STATE.json', JSON.stringify(s, null, 2));
  "
fi
# ⛔ STOP — portability status recorded; proceed to Phase 7 or session close
```
```

### Step 12 — [C33 MANDATORY] Write Phase 7 (FC-18 UI/UX Compliance)

**This phase is mandatory for every implementation plan that produces ≥1 React page.**
Evidence: ZIP-17 found 35% BLOCKER severity (220/575 findings) directly caused by
absence of this gate — confirmed FP-3 (missing FC-18 role-audience declaration).
If no React pages: declare "No React pages — Phase 7 N/A."

```markdown
## PHASE 7 — UI/UX COMPLIANCE AUDIT (FC-18) ★ MANDATORY for React pages ★

This phase produces the FC-18 Audit Trail for every React page delivered in
Phases B-D. It runs AFTER Phase F (services active) and BEFORE session closes.
Source: `fc-18-ui-ux-compliance-gate.md` §4; SK-539 UX-01..UX-29.

### 7.0 — Examination record + design context verification (NEW v1.16)

```bash
# Verify Q8 was answered before JSX (Rule 35 compliance)
ls docs/screen-examination/{slug}-examination.md 2>/dev/null && echo "PRESENT" || echo "ABSENT"
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | grep "^Type:"
# Expected: Type: G[1-7] <grammar-name>
# If absent: SK-540 was skipped → load SK-542 → SK-540 now before proceeding
```

If `.impeccable.md` is absent at this point: run SK-542 and SK-540 now.
Do not proceed to 7.1 without grammar type declared.

### 7.1 — Run SK-539 checks for each React page

For each `*.tsx` file in `client/src/pages/` produced by this plan:

```bash
# Verify role audience declared (Q1-Q4 must be in the page file header comments)
grep -n "ROLE_TIER:\|ROLE_GATE:\|ROUTE_GUARD:\|VISIBILITY:" \
  client/src/pages/{slug}/[PageName]Page.tsx
# Expected: 4 lines (Q1-Q4 declared)

# Verify single h1 present (UX-01)
grep -c "<h1" client/src/pages/{slug}/[PageName]Page.tsx
# Expected: 1

# Verify no raw HTTP status codes in UI copy (UX-17)
grep -En '"[0-9]{3}"|`[0-9]{3}`' client/src/pages/{slug}/[PageName]Page.tsx | \
  grep -v "200\|201\|204" | wc -l
# Expected: 0 (no 400/500-class codes in copy)

# Verify no internal T/F/SK/FC IDs in copy (UX-21)
grep -En 'T[0-9]{3,4}|F[0-9]{4}|SK-[0-9]|FC-[0-9]' \
  client/src/pages/{slug}/[PageName]Page.tsx | \
  grep -v "//.*comment\|\/\*" | wc -l
# Expected: 0

# Verify TENANT_FACING pages not backed by generic CRUD (UX-25)
grep -c 'api/dynamic/xiigen-' client/src/pages/{slug}/[PageName]Page.tsx
# Expected: 0 for TENANT_FACING pages
```

### 7.2 — Produce FC-18 Audit Trail

Create `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` using this template:

```markdown
# FC-18 AUDIT TRAIL — {slug} / [PageName]Page
## Date: YYYY-MM-DD
## Plan: FLOW-XX-IMPLEMENTATION-PLAN-v1.md Phase C

FC-18 AUDIT — {slug} / [PageName]Page
  Role tier declared:   [TIER from Q1]
  Primary role(s):      [role strings from Q2]
  Route:                [/path from Q3]
  Route correct:        [YES | NO — gap: UX-16]
  Visibility scope:     [scope from Q4]

  ### BLOCK checks
  | Check | Result | Evidence |
  |-------|--------|---------|
  | UX-01 | PASS | Single h1 found at line [N] |
  | UX-02 | PASS | All buttons have text or aria-label |
  | UX-03 | PASS/N_A | [all inputs labeled | no form inputs on this page] |
  | UX-04 | PASS/N_A | [inline errors present | no form validation on this page] |
  | UX-05 | PASS | Loading state: [spinner/skeleton at line N] |
  | UX-08 | PASS | Focus ring: [outline override not present] |
  | UX-12 | PASS/EXEMPT | [responsive at 320px | PLATFORM_ENG page — mobile exempt] |
  | UX-14 | PASS/N_A | [confirmation dialog present | no destructive actions] |
  | UX-16 | PASS | Route /[path] matches tier [TIER] |
  | UX-17 | PASS | No raw HTTP codes in copy |
  | UX-18 | PASS/N_A | [role-conditional rendering present | single-role page] |
  | UX-19 | PASS/N_A | [not a user-rights page] |
  | UX-20 | PASS/N_A | [no publicUrl/forms route | N/A] |
  | UX-22 | PASS/N_A | [no-bypass indicator present | not a no-bypass flow] |
  | UX-23 | PASS/N_A | [progress indicator not manual button | no automated gate] |
  | UX-24 | PASS/N_A | [4 HITL fields present | not a human-in-the-loop page] |
  | UX-25 | PASS/N_A | [domain screen | TENANT_FACING check N/A] |
  | UX-26 | PASS/N_A | [pending + return screens | no OAuth] |
  | UX-27 | PASS/N_A | [written justification field | no override] |
  | UX-29 | PASS/N_A | [approve/deny affordance | no consent gate] |

  ### CONCERN checks
  | Check | Result | Note |
  |-------|--------|------|
  | UX-06 | PASS | Empty state has CTA: [description] |
  | UX-07 | PASS | No emoji used as icons |
  | UX-11 | PASS | No hover-only interactions |
  | UX-21 | PASS | No internal IDs in copy |
  | UX-28 | PASS/N_A | [feedback widget present | no AI content] |

  ### Design context (NEW v1.16)
  - Examination record: [docs/screen-examination/{slug}-examination.md | ABSENT]
  - .impeccable.md: [docs/design-context/{slug}/.impeccable.md | ABSENT]
  - Grammar declared: [G1–G7 type | NONE — SK-540 must run before this can be APPROVED]

  ### SK-541 AUDIT record (NEW v1.16)
  - Layer 1 (accessibility P1/P2): [PASS | BLOCK: {items}]
  - Layer 2 (AI slop — N/10 tells): [PASS | CONCERN: N tells | BLOCK: N tells]
  - Layer 3 (Nielsen H1/H2/H8/H9): [scores e.g. 3/3/2/3 = 11/16 — PASS | CONCERN | BLOCK]
  - Layer 4 (grammar vs PNG): declared=[G-type] implemented=[YES | PARTIAL | NO]
  - SK-541 verdict: [PASS | CONCERN | BLOCK]

  ### Screen template
  - Template applicable: [T-1..T-7 name | NONE]
  - Template used: [YES | NO — deviation: ...]

  ### Missing page registry check
  - This page fulfills missing page: [/path from SK-539 §6 | N/A]

  ### FC-18 verdict
  **BLOCK findings:** NONE
  **CONCERN findings:** NONE
  **Overall verdict:** APPROVED
```

### 7.5 — SK-541 four-layer PNG audit (NEW v1.16)

Load `planning--screen-craft-audit-SKILL.md` (SK-541). Run all four layers:
  Layer 1: accessibility (ui-ux-pro-max P1–P2 CRITICAL)
  Layer 2: AI slop detection (design-for-ai CHECKER — 10 tells)
  Layer 3: Nielsen H1/H2/H8/H9 spot check (impeccable critique)
  Layer 4: grammar verification — declared type vs PNG content (UX-30 enforcement)

Check six failure modes (FM-1..FM-6):
  FM-1: Wrong route tier (UX-16 + UX-19)
  FM-2: TENANT_FACING badge on admin CRUD (UX-25)
  FM-3: Automated gate with manual action button (UX-23)
  FM-4: Internal IDs (T-numbers, CF-numbers) in tenant UI copy (UX-21)
  FM-5: Missing public page for implemented service (UX-20)
  FM-6: Wrong grammar for tenant-facing page (UX-30) [NEW in FC-18 v1.1.0]

Attach SK-541 AUDIT record to FC-18 Audit Trail (Layer 1/2/3/4 results + verdict).

### Phase 7 gate

```bash
# Audit Trail file exists for each React page
ls docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
# Expected: file exists

# Grammar type declared (.impeccable.md)
grep "^Type:" docs/design-context/{slug}/.impeccable.md 2>/dev/null
# Expected: Type: G[1-7] <name>

# No unclosed BLOCK findings
grep "BLOCK" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md | grep -v "NONE\|PASS\|N_A\|EXEMPT"
# Expected: 0 lines

# SK-541 audit record present
grep "SK-541 AUDIT" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
# Expected: 1 line

[absolute gate block]
# ⛔ STOP — Phase 7 complete. FC-18 Audit Trail + SK-541 record delivered.
```
```

### Step 13 — Write Documentation Artifacts (Rule 17)

```markdown
## DOCUMENTATION ARTIFACTS SHIPPED WITH PHASES A-F (Rule 17)

```
✅ fixtures/design-reasoning/{slug}-design-decisions.json   ([N] records)
✅ fixtures/contracts/t[NNN]..t[NNN+M].contract.json        ([N] contract files)
✅ fixtures/flow-definitions/{slug}-t[NNN]..t[NNN+M].topology.json ([N] topology files)
✅ fixtures/arbiters/{slug}-arbiters.bulk.ndjson            ([N] arbiter records, scope_isolation last)
✅ fixtures/event-schemas/{slug}/*.event-schema.json        ([N] event schemas)
✅ contracts/topologies/{slug}.topology.json                (business-level topology)
✅ rag-benchmark/seed_{slug_underscored}_patterns.py        (Python seed script)
✅ docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json            (phase_status: ACTIVE)
[if Phase 7 ran:]
✅ docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md               (FC-18 verdict: APPROVED)
```
```

### Step 14 — Write Issue Inventory and Delivery Summary

```markdown
## ISSUE INVENTORY (during execution)

| Issue | Status | Guard added |
|-------|--------|------------|
| [pre-populated known conditionals from design simulation] | CONDITIONAL | [explicit branch handling] |

---

## DELIVERY SUMMARY

```
FLOW-XX [Flow human name] — Phase A-F COMPLETE.
Branch: claude/vigorous-margulis
[commit details]

Test baseline:
  Pre-FLOW-XX:  [N] server + [N] client
  Post-FLOW-XX: [N] + [delta] = [total] server | [N] + [delta] = [total] client

Artifacts introduced:
  [N] task types (T[NNN]-T[NNN+M]) → next T: T[NNN+M+1]
  [N] factories (F[NNNN]-F[NNNN+M]) → next F: F[NNNN+M+1]
  [N] BFA rules (CF-[NNN]-CF-[NNN+M]) → next CF: CF-[NNN+M+1]

Round-trip verification:
  Step 1 [label]  — [phase] ✅
  ...
```
```

---

## GUARD PATTERN DOCUMENTATION (ZIP-15 §4 Reference)

When a flow has role relationships that require implementation-level guards,
the implementation plan must document them. Reference ZIP-15 §4 relationship
types and specify the implementation pattern for each:

| Relationship type | ZIP-15 §4 | Implementation pattern |
|-------------------|----------|----------------------|
| HIERARCHY | Type 1 | API gateway role check: `if (!roles.includes('admin')) return 403` |
| CONTEXT | Type 2 | Object-scoped permission check in service layer |
| MUTUAL-EXCLUSION | Type 5 | IR in BFA rules + arbiter named check |
| AI-BLOCKS-HUMAN | Type 7 | `DataProcessResult.pending()` until human resolves |
| HUMAN-GATES-AI | Type 8 | Human Gate task with claim/resolve/reject pattern |

For React page route guards, reference ZIP-14 nextjs.csv §32-33 middleware pattern:

```typescript
// Next.js-style middleware (adapted for React Router):
// In client/src/pages/{slug}/[PageName]Page.tsx:
const { user } = useAuth();
if (!user || !user.roles.includes(REQUIRED_ROLE)) {
  return <Navigate to="/unauthorized" replace />;
}
```

---

## ACCEPTANCE CRITERIA FOR THE IMPLEMENTATION PLAN

Before the implementation plan is considered complete:

- [ ] File header declares session type GENERATION and consumer Claude Code
- [ ] Goal advancement block (SK-443 Gate D) is present with verbatim goal statement
- [ ] Preamble lists all prerequisites with ✅/⏳ status
- [ ] Absolute gate block (5 checks) is inlined verbatim — no cross-references
- [ ] Found-issue protocol is inlined verbatim
- [ ] PHASE-0 / Phase A corpus seed section present
- [ ] One Phase B section per task type, with arbiter panel and exact test count
- [ ] **[C33] Phase 7 present if any React pages produced; "N/A" declaration if not**
- [ ] FC-18 Audit Trail path declared: `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`
- [ ] Documentation artifacts checklist (Rule 17) present
- [ ] Issue inventory present (may be pre-populated with known conditionals)
- [ ] Delivery summary present with test delta

---

## KEY RULE: PHASE 7 IS NOT OPTIONAL

**Evidence from ZIP-17 (35% BLOCKER severity):**
- 220 of 575 UX findings were BLOCKER severity across 48 flows
- Root cause of FP-3 (failure pattern 3): React pages were authored without declaring
  role audience — `classification="TENANT_FACING"` on pages backed by generic
  `/api/dynamic/xiigen-*` CRUD (UX-25 violation)
- Root cause of FP-4: engine-internal screens (DNA principle cards, debug surfaces)
  were shown to tenant users because INTERNAL_ONLY guard was not checked (UX-25 variant)
- These failures are invisible to server tests — they only surface in Playwright PNG capture

Any implementation plan that produces React pages without Phase 7 will produce the same
failure patterns documented in ZIP-17's 622-PNG fleet validation run. Phase 7 is the
structural fix: it forces role audience declaration before any React page is authored
and produces an Audit Trail that documents the declaration and check results permanently.

---

*End of GUIDE-B17 — FLOW-XX-IMPLEMENTATION-PLAN.md*
*List A sources: ZIP-02 (LIBRARY-4), ZIP-01 (AUTHORING-GUIDE v1.16 §Doc3),*
*ZIP-15 §4 (guard patterns), ZIP-14 (nextjs.csv), ZIP-17 (FP-3 evidence),*
*ZIP-11 (FLOW-09/10/25/46 implementation plan examples)*
*Target B-type: B-17 — FLOW-XX-IMPLEMENTATION-PLAN.md*
*v6 amendment: C33 — Phase 7 FC-18 mandatory for React pages*
*v6.2 amendment: C34 — Phase G portability gate mandatory for all distributable flows*
*Round: 27 of 72*
