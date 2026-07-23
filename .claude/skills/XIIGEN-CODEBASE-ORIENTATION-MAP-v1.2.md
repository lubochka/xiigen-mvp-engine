# XIIGEN-CODEBASE-ORIENTATION-MAP
## Version: 1.2
## Date: 2026-04-19
## Status: AUTHORITATIVE reference for session reconnaissance
## Registered in: XIIGEN-SESSION-LOAD-PLAN v29, Document Registry
## Consumed by: SK-529 v2.0.0 §9 (Tier-0 list), DESIGN-ARCHITECT-SESSION-GUIDE v1.5 (Q9)

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
| Q-08 | What does this flow do for the user? What is the product intent? User journey? | `docs/XIIGEN_PRODUCT_SPECS.md` §FLOW-XX | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` §ROUND 1 |
| Q-09 | Which services are implemented for a flow? What files exist? | `server/src/engine/flows/{slug}/` (ls) | `docs/sessions/FLOW-XX/FLOW-XX-CURRENT-STATE.json` |
| Q-10 | What BFA rules govern this flow? What arbiters are registered? | `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` | `server/src/engine-contracts/{slug}-bfa-rules.ts` |
| Q-11 | How does the AF pipeline work? What does station AF-X do? | `docs/architecture/KNOWLEDGE_DIGEST.md` §8 | `docs/architecture/ARCHITECTURE_GUIDE.md` §AF Stations |
| Q-12 | What is MACHINE vs FREEDOM for this decision? | `docs/architecture/KNOWLEDGE_DIGEST.md` §11 | `CLAUDE.md` §Rule 14 |
| Q-13 | What are the 16 rules every session must honor? | `CLAUDE.md` §The 16 Rules | `docs/architecture/QUICK_REFERENCE.md` §9 DNA Patterns |
| Q-14 | What is the MicroserviceBase? What 19 components does it provide? | `docs/architecture/KNOWLEDGE_DIGEST.md` §5 | `server/src/kernel/multi-tenant/` (ls) |
| Q-15 | What is the multi-tenant kernel? How does AsyncLocalStorage scoping work? | `docs/architecture/KNOWLEDGE_DIGEST.md` §10 | `docs/architecture/ARCHITECTURE_GUIDE.md` §Layer 0 |
| Q-16 | What topology fixtures exist? Is there a topology for FLOW-XX? | `fixtures/flow-definitions/` (ls \| grep {slug}) | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` Track A column |
| Q-17 | What is the current test baseline? How many tests pass? | `docs/architecture/QUICK_REFERENCE.md` §Commands | `XIIGEN-SESSION-LOAD-PLAN-v28.md` §Artifact Boundaries |
| Q-18 | What session documents exist for FLOW-XX? (design simulation, impl plan, teach-QA) | `docs/sessions/FLOW-XX/` (ls) | `docs/flows/FLOW-XX-REFERENCE-PLAN-vN.md` (latest version) |
| Q-19 | What is the complete flow registry — all 47 flows, slugs, task ranges? | `docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md` §Complete Flow Registry | `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` §Per-flow matrix |
| Q-20 | What carry-forward issues are open? What is blocking current work? | `CARRY-FORWARD-ISSUES.md` | `XIIGEN-SESSION-LOAD-PLAN-v28.md` §Carry-Forward Issues |

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
# Print any top-level fields that look like counters
for k, v in d.items():
    if isinstance(v, (str, int)) and k not in ('version', 'description', 'lastUpdated', 'previousVersion'):
        print(k, ':', v)
"

# Cross-check with QUICK_REFERENCE cache
head -6 docs/architecture/QUICK_REFERENCE.md

# RULE: canonical source wins. If numbers differ, use INFRASTRUCTURE-FLOWS-STATE.
# See Rule 34 in SESSION-LOAD-PLAN-v28.
```

---

### Q-08 — Product intent and user journey for FLOW-XX

```bash
# Get full product spec section for a flow
awk '/^# FLOW-XX/,/^# FLOW-/' docs/XIIGEN_PRODUCT_SPECS.md | head -120

# Get just the flow overview
awk '/^# FLOW-XX/,/^## 2\./' docs/XIIGEN_PRODUCT_SPECS.md | head -30

# See the design simulation round 1 decomposition
grep -A 30 "ROUND 1\|TOP-LEVEL DECOMPOSITION" \
  docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md 2>/dev/null | head -40
```

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
grep -A 2 "Test counts\|Server jest\|server:" XIIGEN-SESSION-LOAD-PLAN-v28.md | head -10
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

### Q-19 — Complete flow registry (all 47 flows)

```bash
# Get the complete flow registry table
awk '/^## Complete Flow Registry/,/^## Execution Plan/' \
  docs/xiigenDesign/MASTER_EXECUTION_PLAN_MERGED.md | head -60

# Get all 47 flows with implementation state
cat docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md | grep "^| FLOW-" | head -50

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

### Q-23 — Client page inventory and UI/UX compliance state for a flow

```bash
# List all React pages implemented for a specific flow slug
ls client/src/pages/{slug}/

# Check App.tsx for declared route and route prefix
grep -n "{slug}\|{SlugPage}" client/src/App.tsx

# Check FC-18 Audit Trail for UX compliance verdict
cat docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md

# Check if flow has missing-page registry gaps (SK-539 §6)
# FLOW-20: /settings/privacy
grep -rn "settings/privacy\|ConsentGatePage" client/src/App.tsx
# FLOW-21: /forms/:schemaId
grep -rn "forms/:schemaId\|forms/:" client/src/App.tsx
# FLOW-28: /blog and /blog/:slug
grep -rn "path.*blog\b\|path.*blog/:" client/src/App.tsx
# FLOW-48: /settings/language
grep -rn "settings/language\|UserPreferencesManager" client/src/App.tsx

# Confirm route prefix matches role tier
# PLATFORM_ENG/OPS pages should be under /admin/
grep -n "Route.*path=" client/src/App.tsx | grep -v "/admin/" | head -20
# Review which of those are ENGINE_INTERNAL (should be /admin/)
```

**Primary:** `client/src/pages/{slug}/`, `client/src/App.tsx`, `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`

**When:** Any ARCHITECT or MATERIALIZATION session involving React pages for a specific
flow; any session implementing a client-side phase; fleet review Signal 12 evaluation;
checking whether missing pages from SK-539 §6 have been created.

**Governing check:** does the page exist, does it have the correct route prefix for its
role tier, and does it have an FC-18 Audit Trail with no unclosed BLOCK findings?

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
SESSION-LOAD-PLAN-v28.

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

### Rule authority (the 16 codebase rules)

```
HIGHEST → CLAUDE.md §The 16 Rules
          (authoritative for code-level behavior)
        → docs/architecture/ARCHITECTURE_GUIDE.md
        → XIIGEN-SESSION-LOAD-PLAN §Rules 1-34
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
- Rule 34 in SESSION-LOAD-PLAN is amended

**Owner:** The session that discovers a gap updates this document as part of its
MAINTENANCE session deliverable. The update follows the same one-file, no-patches
discipline: produce a complete new version, present it, await approval.

**Version history:**
- v1.0 — initial map, 20 question classes, 20 tool commands, authority hierarchy,
         gaps GAP-1 and GAP-6 from orientation-plan R1 (2026-04-19)

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
| 7 | `docs/XIIGEN_PRODUCT_SPECS.md` §FLOW-XX *(if flow named)* | Product intent, user journey, cross-flow deps | 1 file read |
| 8 | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` *(if flow named)* | Per-flow implementation reality | 1 file read |

**If no specific flow is named:** replace items 7–8 with
`docs/architecture/ARCHITECTURE_GUIDE.md` §2–§3 (fabric layer + AF pipeline).

**Total Tier-0 contribution:** 8 file reads + 2 grep counts = 40% of ARCHITECT threshold
consumed before any flow-specific reading begins.

---

*End of XIIGEN-CODEBASE-ORIENTATION-MAP v1.0*
