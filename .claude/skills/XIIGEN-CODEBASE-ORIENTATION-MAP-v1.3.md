# XIIGEN-CODEBASE-ORIENTATION-MAP
## Version: 1.3
## Date: 2026-04-20
## Status: AUTHORITATIVE reference for session reconnaissance
## Registered in: XIIGEN-SESSION-LOAD-PLAN v31, Document Registry
## Consumed by: SK-529 v2.0.0 §9 (Tier-0 list), DESIGN-ARCHITECT-SESSION-GUIDE v1.8 (Q9, Q10)

---

## What changed in v1.3

- **Q-08 updated:** primary source changed from `docs/XIIGEN_PRODUCT_SPECS.md` to `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` (user_intent verbatim — Vocabulary B). Six-file read order added matching SK-539 §0.2. Engine design docs (PRODUCT_SPECS, DESIGN-SIMULATION) demoted to "also read."
- **Q-23 route gate added:** mandatory `grep -n "{slug}" client/src/App.tsx` before examining any page or capturing PNGs. A page without a route cannot be examined, cannot yield valid PNGs, cannot have a valid FC-18 Audit Trail.
- **Q-24 added:** user's job-to-be-done — WHO/VERB/GRAMMAR, sources including examination record and business-flows-registry. Must be answered before Q-23 examines any existing page.
- **Q-25 added:** design context check — `.impeccable.md` existence check. Run before Q-23 and before SK-539 Section 1.
- **Q-26 added:** prior examination record check — highest-authority source for WHO/VERB/GRAMMAR where it exists. Run before Q-25 and Q-24.
- **Version history** updated.

---

## 1. Purpose

This document is a single lookup table. When an architect or product design question
surfaces during a session, this map answers: which file contains the answer, and which
command retrieves it.

Without this map, sessions default to training memory or undirected `project_knowledge_search`.
Both drift. The codebase already contains a complete orientation layer —
`docs/architecture/`, `docs/decisions/`, `docs/sessions/`, `docs/state/`, `CLAUDE.md` —
this map makes that layer visible to the governance stack.

**How to use:** identify the question class in §2, run the command in §3, read the file.
If the question class is not listed, update this document (§5).

---

## 2. Question-Class → File Table

Every row is a class of question that arises during architect or product design sessions.
Primary file answers the question directly. Secondary file provides context or cross-check.
Section §3 gives the exact command to run.

| # | Question class | Primary file | Secondary file |
|---|----------------|-------------|----------------|
| Q-01 | What DNA pattern applies here? What are the 9 patterns? | `CLAUDE.md` §Rules 1–10 | `docs/architecture/QUICK_REFERENCE.md` §DNA Patterns |
| Q-02 | What are the 6 fabric interfaces? How does fabric X work? | `docs/architecture/KNOWLEDGE_DIGEST.md` §3 | `docs/architecture/ARCHITECTURE_GUIDE.md` §2 |
| Q-03 | What is the task type contract format (12 sections)? | `docs/architecture/KNOWLEDGE_DIGEST.md` §7 | `docs/architecture/QUICK_REFERENCE.md` §Task Type Contract |
| Q-04 | Which factories and task types belong to FLOW-XX? | `docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md` flow registry | `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` §flows |
| Q-05 | Is this architectural decision already locked? | `docs/decisions/DECISIONS-LOCKED.md` | `docs/decisions/DECISIONS.md` (non-locked) |
| Q-06 | What is the current implementation state of FLOW-XX? Is topology present? Services built? | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` |
| Q-07 | What are the canonical next artifact IDs (T / F / SK / FC / CF / DR / Family)? | `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` | `docs/architecture/QUICK_REFERENCE.md` §Next Artifact Numbers |
| Q-08 | What does this flow do for the user? What is their job-to-be-done? | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` (user_intent field) | `docs/business-flows/NN-{slug}.md` (FLOW-01..34); `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` |
| Q-09 | Which services are implemented for a flow? What files exist? | `server/src/engine/flows/{slug}/` (ls) | `docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json` |
| Q-10 | What BFA rules govern this flow? What arbiters are registered? | `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` | `server/src/engine-contracts/{slug}-bfa-rules.ts` |
| Q-11 | How does the AF pipeline work? What does station AF-X do? | `docs/architecture/KNOWLEDGE_DIGEST.md` §8 | `docs/architecture/ARCHITECTURE_GUIDE.md` §AF Stations |
| Q-12 | What is MACHINE vs FREEDOM for this decision? | `docs/architecture/KNOWLEDGE_DIGEST.md` §11 | `CLAUDE.md` §Rule 14 |
| Q-13 | What are the 16 rules every session must honor? | `CLAUDE.md` §The 16 Rules | `docs/architecture/QUICK_REFERENCE.md` §9 DNA Patterns |
| Q-14 | What is the MicroserviceBase? What 19 components does it provide? | `docs/architecture/KNOWLEDGE_DIGEST.md` §5 | `server/src/kernel/multi-tenant/` (ls) |
| Q-15 | What is the multi-tenant kernel? How does AsyncLocalStorage scoping work? | `docs/architecture/KNOWLEDGE_DIGEST.md` §10 | `docs/architecture/ARCHITECTURE_GUIDE.md` §Layer 0 |
| Q-16 | What topology fixtures exist? Is there a topology for FLOW-XX? | `fixtures/flow-definitions/` (ls \| grep {slug}) | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` Track A column |
| Q-17 | What is the current test baseline? How many tests pass? | `docs/architecture/QUICK_REFERENCE.md` §Commands | `XIIGEN-SESSION-LOAD-PLAN-v31.md` §Artifact Boundaries |
| Q-18 | What session documents exist for FLOW-XX? (design simulation, impl plan, teach-QA) | `docs/sessions/FLOW-XX/` (ls) | `docs/flows/FLOW-XX-REFERENCE-PLAN-vN.md` (latest version) |
| Q-19 | What is the complete flow registry — all 48 flows, slugs, task ranges? | `docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md` §Complete Flow Registry | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` §Per-flow matrix |
| Q-20 | What carry-forward issues are open? What is blocking current work? | `CARRY-FORWARD-ISSUES.md` | `XIIGEN-SESSION-LOAD-PLAN-v31.md` §Carry-Forward Issues |
| Q-21 | Historical precedent or prior architectural decision? | `docs/sessions/historyRag/HISTORY-RAG-INDEX.md` | `fixtures/rag-patterns/hist_*.json` + `fixtures/design-reasoning/historical/hist_*.json` |
| Q-22 | Principle for AI context package design? | `docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md` | — |
| Q-23 | Client page inventory and UI/UX compliance state for a flow? | `client/src/pages/{slug}/`, `client/src/App.tsx`, `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` | `docs/screen-examination/{slug}-examination.md` |
| Q-24 | What is the user's job-to-be-done on this page? (WHO / VERB / GRAMMAR) | `docs/screen-examination/{slug}-examination.md` (ground truth where present) | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md`; `planning--business-flows-registry.md` |
| Q-25 | Does a design context file exist for this flow? (.impeccable.md) | `docs/design-context/{slug}/.impeccable.md` | `planning--product-design-context-SKILL.md` (SK-540) |
| Q-26 | Does a prior examination record exist for this flow? | `docs/screen-examination/{slug}-examination.md` | `docs/screen-examination/PNG-INVENTORY.md` |

---

## 3. XIIGen Question-to-Tool Map

For every question class in §2, this section gives the exact bash command to run.
Commands are executable from the repo root (`xiigen-mvp-claude-vigorous-margulis/`).
Replace `{slug}` with the flow's semantic slug (e.g., `user-registration`, `marketplace`).
Replace `FLOW-XX` with the flow number (e.g., `FLOW-07`, `FLOW-32`).

---

### Q-01 — DNA pattern for a situation

```bash
# See all 9 DNA patterns with pass/fail examples
grep -A 3 "DNA-" docs/architecture/QUICK_REFERENCE.md

# See a specific DNA pattern rule in CLAUDE.md
grep -A 5 "Rule [1-9]\|Rule 1[0-6]" CLAUDE.md | head -80

# Check whether a file violates DNA-1 (typed models)
grep -rn "class.*{" server/src/engine/flows/{slug}/ | grep -v "extends\|implements\|abstract"
```

---

### Q-02 — Fabric interface details

```bash
# List all 6 fabric interfaces
ls server/src/fabrics/interfaces/

# Read a specific fabric interface
cat server/src/fabrics/interfaces/database.interface.ts | head -60

# See injection tokens for all fabrics
grep -n "export const.*SERVICE\|export const.*PROVIDER\|export const.*DISPATCHER" \
  server/src/fabrics/interfaces/*.ts
```

---

### Q-03 — Task type contract format

```bash
# Read the 12-section contract template
grep -A 40 "TASK TYPE:" docs/architecture/KNOWLEDGE_DIGEST.md | head -50

# See an existing task type contract
cat fixtures/contracts/t47.contract.json

# Count how many contracts exist
ls fixtures/contracts/ | wc -l
```

---

### Q-04 — Factories and task types for FLOW-XX

```bash
# Find factory and task range for a specific flow
grep -A 3 "FLOW-XX\|{slug}" docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md | head -20

# See flow entry in infrastructure state
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
flow = d.get('flows', {}).get('FLOW-XX', 'not found')
print(json.dumps(flow, indent=2))
"
```

---

### Q-05 — Is this decision locked?

```bash
# Search locked decisions by keyword
grep -n -i "{keyword}" docs/decisions/DECISIONS-LOCKED.md

# List all locked decision IDs
grep -n "^## D-\|^D-[A-Z]" docs/decisions/DECISIONS-LOCKED.md

# Full content of locked decisions
cat docs/decisions/DECISIONS-LOCKED.md
```

---

### Q-06 — Current implementation state of FLOW-XX

```bash
# Check Track A/B/C status for a specific flow
grep -A 1 "| FLOW-XX" docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md

# Check per-flow reconciliation state
cat docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md 2>/dev/null || echo "No reconciliation file"

# See current state JSON
cat docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json 2>/dev/null | python3 -m json.tool | head -40

# Count services actually implemented
ls server/src/engine/flows/{slug}/*.service.ts 2>/dev/null | wc -l
```

---

### Q-07 — Next canonical artifact IDs

```bash
# Get all next-ID counters from the canonical source
python3 -c "
import json
d = json.load(open('docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json'))
print('version:', d.get('version'))
print('lastUpdated:', d.get('lastUpdated'))
for k, v in d.items():
    if isinstance(v, (str, int)) and k not in ('version', 'description', 'lastUpdated', 'previousVersion'):
        print(k, ':', v)
"

# Cross-check with QUICK_REFERENCE cache
head -6 docs/architecture/QUICK_REFERENCE.md

# RULE: canonical source wins. If numbers differ, use INFRASTRUCTURE-FLOWS-STATE.
# See Rule 34 in SESSION-LOAD-PLAN-v31.
```

---

### Q-08 — Product intent and user journey for FLOW-XX *(updated v1.3)*

**Read order — Vocabulary B (what does the user want?) first, Vocabulary A (what does the engine do?) second.**

```bash
# FIRST — examination record (highest authority where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -30
# Sections to read: "One-sentence spec", "Roles", "Grammar"

# F1 — user intent (verbatim)
grep -A 5 "user_intent" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# F2 — processes, states, and React components
head -60 docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md

# F3 — role visibility matrix
# Batch: FLOW-01..05=BATCH-01, 06..10=BATCH-02, 11..16=BATCH-03, 17..21=BATCH-04,
#        22..26=BATCH-05, 27..31=BATCH-06, 32..34=BATCH-07, 35..47=BATCH-08+
grep -A 20 "FLOW-XX\|{slug}" docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md 2>/dev/null | head -25

# F4 — business spec (FLOW-01..34 only)
grep -A 30 "For Product Manager\|Long Description" \
  docs/business-flows/NN-{slug}.md 2>/dev/null | head -40

# Pre-declared grammar type
grep "Grammar\|^Type:" docs/screen-examination/{slug}-examination.md 2>/dev/null ||
grep "^Type:" docs/design-context/{slug}/.impeccable.md 2>/dev/null ||
grep "FLOW-XX\|{slug}" planning--business-flows-registry.md 2>/dev/null | head -3

# ALSO READ — engine design (Vocabulary A: what does the engine produce?)
awk '/^# FLOW-XX/,/^# FLOW-/' docs/XIIGEN_PRODUCT_SPECS.md | head -120
grep -A 30 "ROUND 1\|TOP-LEVEL DECOMPOSITION" \
  docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md 2>/dev/null | head -40
```

**Primary (Vocabulary B):** `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` (user_intent)
**Secondary:** `docs/business-flows/NN-{slug}.md` (FLOW-01..34); `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md`
**Also read (Vocabulary A):** `docs/XIIGEN_PRODUCT_SPECS.md` §FLOW-XX; `FLOW-XX-DESIGN-SIMULATION-R1.md`
**Ground truth where present:** `docs/screen-examination/{slug}-examination.md`

**Note:** Vocabulary B sources answer "who uses this and what do they want?" — the content question. Vocabulary A sources answer "what does the engine produce?" — the architecture question. Both questions are needed. Vocabulary B must be read before writing any JSX.

---

### Q-09 — Services implemented for a flow

```bash
# List all service files for a flow slug
ls server/src/engine/flows/{slug}/ 2>/dev/null

# Count services
ls server/src/engine/flows/{slug}/*.service.ts 2>/dev/null | wc -l

# Find a service by task type number
grep -rn "T[0-9]\{2,3\}" server/src/engine/flows/{slug}/ | grep "taskTypeId\|T[0-9]" | head -10

# Check engine-contracts file exists
ls server/src/engine-contracts/ | grep {slug}
```

---

### Q-10 — BFA rules and arbiters for a flow

```bash
# Read arbiters NDJSON for a flow
cat fixtures/arbiters/{slug}-arbiters.bulk.ndjson | python3 -c "
import json, sys
for line in sys.stdin:
    line = line.strip()
    if line and not line.startswith('//'):
        try:
            rec = json.loads(line)
            if 'arbiterType' in rec:
                print(rec['arbiterType'], '-', rec.get('expertise','')[:60])
        except: pass
"

# Check scope_isolation arbiter present (FC-32 gate)
grep -c "scope_isolation" fixtures/arbiters/{slug}-arbiters.bulk.ndjson 2>/dev/null || echo "0 - MISSING"

# Read BFA rules TypeScript file
cat server/src/engine-contracts/{slug}-bfa-rules.ts 2>/dev/null | head -60
```

---

### Q-11 — AF pipeline station behavior

```bash
# Read AF station section from KNOWLEDGE_DIGEST
awk '/^## 8\. AF STATIONS/,/^## 9\./' docs/architecture/KNOWLEDGE_DIGEST.md

# List AF station implementation files
ls server/src/af-stations/

# Read a specific station
cat server/src/af-stations/af-4-rag-context.ts 2>/dev/null | head -40
```

---

### Q-12 — MACHINE vs FREEDOM classification

```bash
# Read MACHINE/FREEDOM section
awk '/^## 11\. FREEDOM/,/^## 12\./' docs/architecture/KNOWLEDGE_DIGEST.md

# Find FREEDOM config keys in a flow
grep -rn "FREEDOM\|freedomConfig\|FreedomConfig" server/src/engine/flows/{slug}/ | head -20

# Find MACHINE constants in a flow
grep -rn "MACHINE\|readonly\|as const" server/src/engine/flows/{slug}/ | head -20
```

---

### Q-13 — The 16 rules

```bash
# Read all 16 rules
grep -A 4 "^### Rule [0-9]" CLAUDE.md | head -120
```

---

### Q-14 — MicroserviceBase components

```bash
# Read MicroserviceBase section
awk '/^## 5\. MicroserviceBase/,/^## 6\./' docs/architecture/KNOWLEDGE_DIGEST.md

# Find the base class file
find server/src/kernel -name "*.ts" | xargs grep -l "MicroserviceBase" 2>/dev/null
```

---

### Q-15 — Multi-tenant kernel / AsyncLocalStorage scoping

```bash
# Read multi-tenant section
awk '/^## 10\. MULTI-TENANT/,/^## 11\./' docs/architecture/KNOWLEDGE_DIGEST.md

# List kernel files
ls server/src/kernel/multi-tenant/

# Check TenantContext middleware
cat server/src/kernel/multi-tenant/tenant-context.middleware.ts 2>/dev/null | head -40
```

---

### Q-16 — Topology fixtures for a flow

```bash
# Check if topology exists for a slug
ls fixtures/flow-definitions/ | grep {slug}

# Count all topology fixtures
ls fixtures/flow-definitions/ | wc -l

# Read a topology fixture
cat fixtures/flow-definitions/{slug}-*.topology.json 2>/dev/null | python3 -m json.tool | head -60

# See Track A status for all flows (topology column)
awk 'NR==1 || /\| FLOW-/' docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md | head -55
```

---

### Q-17 — Current test baseline

```bash
# Run server tests (from server/ directory)
cd server && npx jest --passWithNoTests 2>&1 | tail -5

# Quick test count without running
grep -A 2 "Test counts\|Server jest\|server:" XIIGEN-SESSION-LOAD-PLAN-v31.md | head -10
```

---

### Q-18 — Session documents for FLOW-XX

```bash
# List all session docs for a flow
ls docs/sessions/FLOW-XX/

# List all plan versions
ls docs/flows/ | grep FLOW-XX

# Find latest reference plan version
ls docs/flows/ | grep FLOW-XX | sort -t v -k2 -n | tail -1
```

---

### Q-19 — Complete flow registry (all 48 flows)

```bash
# Get the complete flow registry table
awk '/^## Complete Flow Registry/,/^## Execution Plan/' \
  docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md | head -60

# Get all flows with implementation state
cat docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md | grep "^| FLOW-" | head -55

# Count flows with full implementation (Track A + Track B + Track C ALL_PASS)
grep "ALL_PASS" docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md | wc -l
```

---

### Q-20 — Open carry-forward issues and blockers

```bash
# Read current carry-forward issues
cat CARRY-FORWARD-ISSUES.md

# Find issues blocking a specific flow
grep -A 3 "FLOW-XX\|{slug}" CARRY-FORWARD-ISSUES.md
```

---

### Q-21 — Historical precedent or prior architectural decision

```bash
# Keyword search across all historical fixture files
grep -ril "{keyword}" fixtures/rag-patterns/hist_*.json \
  fixtures/design-reasoning/historical/hist_*.json

# Navigate by theme cluster (12 clusters)
grep -i "{keyword}" docs/sessions/historyRag/HISTORY-RAG-INDEX.md

# Show all decisions for a specific flow
grep -A 20 "^\*\*FLOW-XX\*\*" docs/sessions/historyRag/HISTORY-RAG-INDEX.md

# Show lock candidates (D-HIST namespace proposals)
grep "D-HIST\|⭐⭐🔒\|qs=0.97" docs/sessions/historyRag/HISTORY-RAG-INDEX.md | head -20

# Show all locked decisions (Batch J — 25 decisions)
ls fixtures/design-reasoning/historical/hist_locked_*.json

# Show engine architecture gap decisions (Batch I — highest tier)
ls fixtures/design-reasoning/historical/hist_gap_review_*.json
```

**Primary:** `docs/sessions/historyRag/HISTORY-RAG-INDEX.md`
**Secondary:** `fixtures/rag-patterns/hist_*.json` (61 ARCH_PATTERN) +
              `fixtures/design-reasoning/historical/hist_*.json` (140 DESIGN_REASONING)
**When:** Any architect question about prior decisions, lock candidates, or cross-flow
architectural patterns. Fires BEFORE synthesis when the question class is known.
**Note:** 202 decisions indexed across 12 theme clusters and 13 batches (A-L). Q9 Step 5
uses §3 per-flow table for flow-specific lookup. Q-21 covers cross-flow and engine-level
questions.

---

### Q-22 — Principle for AI context package design

```bash
cat docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md
# Key sections:
#   THE GOVERNING QUESTION — "Am I making this decision for the AI..."
#   THE TWO FAILURE MODES — Over-Prescription vs Under-Specification
#   THREE-SIGNAL TEST — how to detect genuine convergence
```

**Primary:** `docs/flow-plan-preparation/XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md`
**When:** Any session authoring AF pipeline prompts, genesis prompts, context packages,
or NODE convergence designs. Mandatory read before authoring any prompt that will be
sent to a generator model.
**Governing question (verbatim):** "Am I making this decision for the AI, or am I giving
the AI the minimum it needs to make the decision itself?"

---

### Q-23 — Client page inventory and UI/UX compliance state for a flow *(updated v1.3)*

**Run Q-26 (examination record), Q-25 (design context), Q-24 (job-to-be-done) BEFORE examining pages.**

```bash
# STEP 0 — verify route exists before examining any page or capturing PNGs
grep -n "{slug}" client/src/App.tsx
# 0 results → route missing → add it first before any examination
# A page without a route cannot be examined, cannot yield valid PNGs,
# and cannot have a valid FC-18 Audit Trail.
# See CFI-05 in SESSION-LOAD-PLAN v31 for the five flows with AdminCrudPanel defaults,
# and CFI-10 for the root-cause fix.

# STEP 1 — list React pages for the flow
ls client/src/pages/{slug}/ 2>/dev/null

# STEP 2 — confirm route prefix matches role tier
grep -n "Route.*path=.*{slug}\|{SlugPage}" client/src/App.tsx
# PLATFORM_ENG/OPS pages must be under /admin/
# TENANT_CONSUMER/PUBLIC pages must NOT be under /admin/

# STEP 3 — check FC-18 Audit Trail
cat docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md 2>/dev/null | head -20

# STEP 4 — check missing-page registry gaps (SK-539 §6)
grep -rn "settings/privacy\|ConsentGatePage" client/src/App.tsx    # FLOW-20
grep -rn "forms/:schemaId\|forms/:" client/src/App.tsx             # FLOW-21
grep -rn "path.*blog\b\|path.*blog/:" client/src/App.tsx           # FLOW-28
grep -rn "settings/language\|UserPreferencesManager" client/src/App.tsx  # FLOW-48

# STEP 5 — check CFI-05 Page rewrite status (FLOW-36/37/38/39/40)
# These flows have routes but Page wrappers default to AdminCrudPanel
grep -n "AdminCrudPanel\|FeatureMatrixScreen\|StackPortingScreen\|RagQualityScreen\|OssCurriculumScreen\|ClientPushScreen" \
  client/src/pages/{slug}/*.tsx 2>/dev/null | head -5
```

**Primary:** `client/src/pages/{slug}/`, `client/src/App.tsx`, `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`
**Also read:** `docs/screen-examination/{slug}-examination.md` (prior examination record where present)

**When:** Any ARCHITECT or MATERIALIZATION session involving React pages; fleet review Signal 12 evaluation; checking missing pages from SK-539 §6; checking CFI-05 Page rewrite status.

**Governing check (in order):** (1) route exists in App.tsx, (2) route prefix matches role tier, (3) FC-18 Audit Trail has no unclosed BLOCKs, (4) grammar type is implemented (not AdminCrudPanel).

---

### Q-24 — User's job-to-be-done on this page (WHO / VERB / GRAMMAR) *(NEW v1.3)*

**Answer before Q-23 examines any page. Job-to-be-done determines what the page should contain; Q-23 checks whether the existing page contains it.**

```bash
# FIRST — examination record (highest authority where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -40
# Sections: "One-sentence spec (F1)", "Roles (F3)", "Grammar"
# If present: extract WHO/VERB/GRAMMAR directly. No further sources needed.

# IF no examination record — F1 user intent
grep -A 5 "user_intent" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# IF no examination record — F3 roles
grep -A 15 "FLOW-XX\|{slug}" docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md 2>/dev/null | head -20
# Batch: FLOW-01..05=BATCH-01, 06..10=BATCH-02, 11..16=BATCH-03, 17..21=BATCH-04,
#        22..26=BATCH-05, 27..31=BATCH-06, 32..34=BATCH-07, 35..47=BATCH-08+

# Pre-declared grammar type
grep "FLOW-XX\|{slug}" planning--business-flows-registry.md 2>/dev/null | head -3

# CFI-12 flag check (FLOW-04, FLOW-09, FLOW-34 — blocked for UI design)
grep "CFI-12\|FLOW-04\|FLOW-09\|FLOW-34" planning--business-flows-registry.md | grep -i "block\|spec.gap" | head -3
```

**Declare:**
- **WHO:** specific role + one-sentence context (from examination record or F3)
- **VERB:** the one action the user is here to take (from examination record or F1 user_intent)
- **GRAMMAR:** G1 PROGRESS_STRIP · G2 VERDICT_GRID · G3 CARD_LIST · G4 TOPOLOGY_CANVAS · G5 KIOSK · G6 DASHBOARD · G7 SETTINGS_TABS (from examination record, `.impeccable.md`, or `planning--business-flows-registry.md`)

**Primary:** `docs/screen-examination/{slug}-examination.md` (ground truth where present)
**Secondary:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md`; `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md`; `planning--business-flows-registry.md`

**When:** Any MATERIALIZATION or GENERATION session producing React pages; any session examining existing pages to determine whether their content matches the spec. Run before Q-23.

**CFI-12 halt:** If the registry shows a CFI-12 flag for the flow (FLOW-04, FLOW-09, FLOW-34), halt Q-24 and report to Luba. F1 contradicts the slug and existing pages. Do not proceed to JSX until spec alignment is confirmed.

---

### Q-25 — Does a design context file exist for this flow? *(NEW v1.3)*

**Run before Q-23 and before SK-539 Section 1. Design context must exist before compliance checking begins.**

```bash
# Check design context
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -10

# Verify required sections present
grep -c "FEEL:\|Grammar\|Token vocabulary" docs/design-context/{slug}/.impeccable.md 2>/dev/null
# Expected: 3 (all required sections present)
```

**Present:** SK-540 already ran for this flow. Grammar type declared. Proceed to SK-539 Section 1.

**Absent:** SK-540 has not run for this flow.
- Load SK-542 (`flow-ui-examination-protocol-SKILL.md`) first — it loads companion documents and routes the session.
- Then load SK-540 (`planning--product-design-context-SKILL.md`) and run Steps 1–4.
- Do not write JSX until `.impeccable.md` exists with grammar declared.

**Primary:** `docs/design-context/{slug}/.impeccable.md`
**When:** Any MATERIALIZATION or GENERATION session producing React pages for this flow. Run before Q-23 (page inventory) and before SK-539 Section 1.

---

### Q-26 — Does a prior examination record exist for this flow? *(NEW v1.3)*

**Run before Q-25 and Q-24. The examination record is the highest-authority source for WHO/VERB/GRAMMAR and the prior classification verdict where it exists.**

```bash
# Check examination record exists
ls docs/screen-examination/{slug}-examination.md 2>/dev/null
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -10

# Read classification and primary finding (the starting verdict)
grep "Primary finding\|Classification\|Grammar\|Roles" \
  docs/screen-examination/{slug}-examination.md 2>/dev/null | head -8

# Check PNG-INVENTORY for this flow's catalogued PNGs
grep -A 5 "### FLOW-XX\|{slug}" docs/screen-examination/PNG-INVENTORY.md 2>/dev/null | head -15

# Check if FLOW-29 reference implementation applies (Grammar 4 template)
# FLOW-29 c6-role-coverage PNGs are the passing reference for topology canvas grammar
ls docs/e2e-snapshots/c6-role-coverage/flow-29-*.png 2>/dev/null
```

**Present:** Read the "Classification" and "Primary finding" sections before opening any PNG. This is the starting verdict. SK-541 layers verify or update it — they do not override without evidence from the current session's PNGs.

38 flows have examination records in `docs/screen-examination/`. These are ground truth derived from actual spec reads against the current codebase. They take precedence over any in-session re-derivation.

**Absent:** Run SK-542 → SK-541 from scratch after loading companion documents (REPAIR-GUIDANCE, SPEC-LOCATION-MAP, MARKET-REFERENCE-CATALOG).

**Primary:** `docs/screen-examination/{slug}-examination.md`
**Secondary:** `docs/screen-examination/PNG-INVENTORY.md`
**When:** Any session examining, repairing, or rebuilding a flow's React pages. Run before Q-25, Q-24, and Q-23 — in that order.

---

## 4. Document Authority Hierarchy

When two documents contain conflicting information about the same fact, this hierarchy
determines which wins. Do not average, blend, or pick the more convenient answer —
the higher authority is correct; the lower authority is stale.

### Counter authority (T / F / SK / FC / CF / DR / Family IDs)

```
HIGHEST → docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json
          (canonical source — updated by Claude Code execution gate)
        → docs/architecture/QUICK_REFERENCE.md
          (cache — updated by documentation gate script, not by hand)
LOWEST  → XIIGEN-SESSION-LOAD-PLAN §Artifact Boundaries
          (second-level cache — updated at plan authoring time from canonical source)
```

**Rule:** Before consuming a counter, read `INFRASTRUCTURE-FLOWS-STATE-v6.json`.
If it disagrees with the SESSION-LOAD-PLAN, the state file wins. See Rule 34 in
SESSION-LOAD-PLAN-v31.

### Architectural decision authority

```
HIGHEST → docs/decisions/DECISIONS-LOCKED.md
          (cannot be overridden without Luba's explicit written approval)
        → docs/decisions/DECISIONS.md
          (current decisions, non-locked)
        → Per-flow design simulation docs (FLOW-XX-DESIGN-SIMULATION-R1.md)
LOWEST  → Any session-level claim about how the architecture "works"
```

**Rule:** If a session claim contradicts a locked decision, the session is wrong.
Run `cat docs/decisions/DECISIONS-LOCKED.md` before asserting any architectural invariant.

### Flow implementation state authority

```
HIGHEST → docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md
          (aggregate of per-flow CURRENT-STATE.json files — regenerated by script)
        → docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md
          (per-flow ground truth — manually maintained)
        → docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json
LOWEST  → Any claim in a session plan about what is "already implemented"
          (treat as SK-531 PENDING_VERIFICATION until verified against files above)
```

**Rule:** "X is already implemented" is a SK-531 claim. Verify against
`47-FLOW-CURRENT-STATE-MASTER.md` before accepting it.

### UI/UX design intent authority *(NEW v1.3)*

```
HIGHEST → docs/screen-examination/{slug}-examination.md
          (per-flow examination record — WHO/VERB/GRAMMAR derived from actual spec reads
           against the current codebase. 38 flows catalogued as of 2026-04-20.)
        → docs/design-context/{slug}/.impeccable.md
          (design context produced by SK-540 — grammar declared, aesthetic direction set)
        → planning--business-flows-registry.md
          (pre-declared grammar types for all 48 flows)
        → docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md (user_intent field)
LOWEST  → Any in-session inference about "what the page should look like"
          (treat as SK-531 PENDING_VERIFICATION until verified against files above)
```

**Rule:** "The page should look like X" is a design claim. Verify against the
examination record and `.impeccable.md` before proceeding to JSX.

### Rule authority (the 16 codebase rules)

```
HIGHEST → CLAUDE.md §The 16 Rules
          (authoritative for code-level behavior)
        → docs/architecture/ARCHITECTURE_GUIDE.md
        → XIIGEN-SESSION-LOAD-PLAN §Rules 1-35
          (governance rules — parallel to, not overriding, CLAUDE.md rules)
LOWEST  → Any skill file's rule claim (skills cite; CLAUDE.md defines)
```

---

## 5. How to Keep This Map Current

This document is updated when any of the following occur:

**Add a new question-class row (§2 + §3) when:**
- A session asks a class of question not listed above and had to guess where to look
- A new document is added to `docs/` that authoritatively answers a common question
- A question class is found to have a better primary source than currently listed

**Update an existing row when:**
- A file is renamed or moved (path changes)
- A section heading changes in a primary source document
- A canonical source document is superseded (e.g., INFRASTRUCTURE-FLOWS-STATE-v7 replaces v6)

**Update §4 authority hierarchy when:**
- A new canonical source is established for any counter or decision type
- Rule 34 or Rule 35 in SESSION-LOAD-PLAN is amended

**Owner:** The session that discovers a gap updates this document as part of its
MAINTENANCE session deliverable. The update follows the same one-file, no-patches
discipline: produce a complete new version, present it, await approval.

**Version history:**
- v1.0 — initial map, 20 question classes, 20 tool commands, authority hierarchy,
         gaps GAP-1 and GAP-6 from orientation-plan R1 (2026-04-19)
- v1.1 — Q-21 added (historical precedent + HISTORY-RAG-INDEX); Q-22 added (AI context
         package design principle); ORIENTATION-MAP registered in SESSION-LOAD-PLAN v29
- v1.2 — Q-23 added (client page inventory + FC-18 Audit Trail lookup);
         registered in SESSION-LOAD-PLAN v30
- v1.3 — Q-08 updated (Vocabulary B primary: STEP-1-INVARIANTS + ROLE-ANALYSIS-BATCH;
         6-file read order; examination record as ground truth; engine design docs demoted
         to "also read"); Q-23 route gate added (STEP 0 verify App.tsx before examining);
         Q-24 added (WHO/VERB/GRAMMAR job-to-be-done; examination record first; CFI-12 halt);
         Q-25 added (.impeccable.md check; SK-542/SK-540 routing); Q-26 added (examination
         record check; highest authority source; 38 flows catalogued); §4 UI/UX design
         intent authority hierarchy added; registered in SESSION-LOAD-PLAN v31

---

## 6. Quick-Start: The 8 Files Every ARCHITECT Session Reads First

Taken from SK-529 v2.0.0 §9 (Tier-0 list). Read these before any flow-specific or
task-specific reconnaissance. Each counts toward the SK-529 ARCHITECT threshold (20/8/10).

| # | File | What it gives you | Reads toward threshold |
|---|------|--------------------|----------------------|
| 1 | `docs/architecture/QUICK_REFERENCE.md` | Commands, counters, DNA cheat sheet | 1 file read |
| 2 | `docs/architecture/KNOWLEDGE_DIGEST.md` §1–5 | Engine skeleton, 6 fabrics, 9 DNA, factory pattern | 1 file read |
| 3 | `CLAUDE.md` §Rules | 16 rules, documentation gate script | 1 file read |
| 4 | `docs/decisions/DECISIONS-LOCKED.md` | All locked decisions — prevents inheriting stale verdicts | 1 file read + 1 grep |
| 5 | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` | Which flows are actually built vs. designed | 1 file read |
| 6 | `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` | Canonical next IDs, flow completion status | 1 file read + 1 grep |
| 7 | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` *(if flow named)* | user_intent verbatim — the page's purpose | 1 file read |
| 8 | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` *(if flow named)* | Per-flow implementation reality | 1 file read |

**If no specific flow is named:** replace items 7–8 with
`docs/architecture/ARCHITECTURE_GUIDE.md` §2–§3 (fabric layer + AF pipeline).

**Total Tier-0 contribution:** 8 file reads + 2 grep counts = 40% of ARCHITECT threshold
consumed before any flow-specific reading begins.

**For sessions producing React pages:** after Tier-0, also run Q-26 (examination record),
Q-25 (design context), Q-24 (job-to-be-done), and Q-23 STEP 0 (route check) in that order
before Q-08 or any page examination. These four questions establish the product design
context (Vocabulary B) before compliance checking begins (SK-539 Section 1).
