# GUIDE-B07 — How to Produce `FLOW-XX-RAG.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 17 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-RAG.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-RAG.md` is the **single-file reference document** for a flow. Any future session
loading only this file should understand:
- What the flow does and its current implementation state
- Every file in the flow's session folder and what each contains
- The flow's task types, factories, BFA rules, ES indices, REST endpoints
- Historical RAG fixture IDs relevant to this flow
- UX evidence for tenant-facing flows (from ZIP-17)
- What is working, what is defective, and the remediation path

This file replaces the need to read 13–95 individual session files when a new session
needs to understand a flow's current state quickly. FLOW-47 RAG.md is 18,128 bytes
(≈450 lines). FLOW-32 RAG.md is significantly larger due to 95 session files.

**RAG ACL note (C27 — ZIP-15 §2):** For flows with role-scoped data access, the RAG.md
must include an `allowed_roles[]` field in the relevant fixture references, using the
confirmed role strings from ZIP-15 §2. These strings become ACL filter labels in the
RAG retrieval pipeline.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY | HISTORY-RAG-INDEX.md (202 decisions, 12 clusters, per-flow table); HISTORY-RAG-SCHEMA.md; HISTORY-RAG-SCOPE.md |
| ZIP-07 | PRIMARY + STRUCTURE | I1-I4 RAG integration design (schema for RAG fixture section; quality threshold table: ⭐⭐ = high signal, 🔒 = locked decision) |
| ZIP-08 | FIXTURE | Architecture + flow-design RAG fixtures (hist_arch_* patterns: ARCH_PATTERN type) |
| ZIP-09 | FIXTURE | Design-reasoning + engine history fixtures (hist_fd_* patterns: design decisions, failure modes) |
| ZIP-10 | FIXTURE | Per-flow locked decisions (FLOW-01/03/04 D-HIST items) — include if this flow inherits these patterns |
| ZIP-11 | FIXTURE | Taxonomy fixtures (locked decisions quality scores table) |
| ZIP-12 | FIXTURE | Batch-L fixtures — specifically FLOW-41 hist_flow41 (5 files: Canva SDK decisions) |
| ZIP-15 | REFERENCE | §2 confirmed role strings → `allowed_roles[]` ACL labels (C27) |
| ZIP-16 | REFERENCE | FLOW-01..34 primary spec → REST endpoints, ES indices, factory IDs for Overview table |
| ZIP-17 | EVIDENCE | Per-flow `docs/ux-review/{slug}/UX-REVIEW.md` → UX Evidence subsection for TENANT_FACING flows |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-RAG.md`
**File size range:** 8–20 KB for flows with 6-15 session files; 30+ KB for flows with 50+ session files
**When authored:** After the implementation phase produces the first batch of session files; updated whenever significant new files are added

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: gather facts

```bash
# Count all files in session folder (including subdirs)
find docs/sessions/FLOW-XX/ -type f | wc -l
# List root files
ls docs/sessions/FLOW-XX/ -la
# List subdirectories
ls -d docs/sessions/FLOW-XX/*/  2>/dev/null
# Get line counts for each file
wc -l docs/sessions/FLOW-XX/*.md docs/sessions/FLOW-XX/*.json 2>/dev/null | sort -n
# Get verdicts from state files
python3 -c "
import json, os
state_files = [f for f in os.listdir('docs/sessions/FLOW-XX/') if f.endswith('.json')]
for f in sorted(state_files):
    try:
        d = json.load(open(f'docs/sessions/FLOW-XX/{f}'))
        v = d.get('verdict') or d.get('phase_status') or d.get('overallVerdict') or d.get('overallReadiness')
        if v: print(f, '→', v)
    except: pass
" 2>/dev/null
```

---

### Step 1: Write the file header

```markdown
# FLOW-XX — RAG DIGEST
```

Or for flows with a strong identity (like FLOW-32):
```markdown
# FLOW-XX {slug} — RAG Digest

_Generated: {YYYY-MM-DD} | Branch: {branch}_
```

Both formats are valid. Use the first for flows with standard session structure;
use the second when the flow has a rich subdirectory structure (50+ files).

---

### Step 2: Build the Overview table

The Overview table is the compact single-screen summary of the flow. Populate from
state files and bash evidence:

```markdown
## Overview

| Field | Value |
|---|---|
| **flowId** | FLOW-XX |
| **slug** | `{slug}` ({Full Display Name — one-sentence description}) |
| **wave** | {wave label or "not declared as wave; references Master Plan vN"} |
| **implementationMode** | {af-pipeline + live-ES validation | af-pipeline} |
| **phase_status / verdict** | {e.g., All N phases complete; **overallVerdict: GOAL_REACHED**} |
| **archetype** | {af-pipeline; service implementations under `server/src/engine/flows/{slug}/`} |
| **task types** | T{N} – T{N+K} ({K} turns) |
| **factories** | F{N} – F{N+K} ({K}) |
| **BFA rules** | CF-{N}, CF-{N+1}, ..., CF-{N+K} ({K} rules) |
| **branch** | `{current branch}` |
| **captured_at** | {ISO timestamp} |
| **test count** | {N} unit+e2e + {N} docker + {N} bootstrap = **{total} total green** |
| **REST endpoints** | {e.g., `POST /api/tenants/provision`, `GET /api/agent/sessions`} |
| **ES indices** | {comma-separated list of ES index names} |
| **file count** | {N} files: {N} root + {N} in `{subdir}/` |
| **SNAPSHOTS/** | {YES — N evidence files | NO} |
| **goal/verdict** | **{GOAL_REACHED | GOAL_PARTIALLY_REACHED}**: {2-3 sentence summary including key evidence counts} |
```

**How to populate each field:**

```bash
# Task types and factories
python3 -c "
import json
d = json.load(open('docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json'))
print('phase_status:', d.get('phase_status'))
print('verdict:', d.get('verdict'))
" 2>/dev/null

# REST endpoints
grep -r "Route\|@Get\|@Post\|@Put\|@Delete" server/src/engine/flows/{slug}/ --include="*.ts" 2>/dev/null | grep -v ".spec." | head -10

# ES indices
grep -r "createIndex\|INDEX_NAME\|esIndex\|index_name" server/src/engine/flows/{slug}/ --include="*.ts" 2>/dev/null | head -10

# Test count
cd server && npx jest --testPathPattern="{slug}" --passWithNoTests 2>&1 | tail -3
```

---

### Step 3: Build the File Inventory Table

One row per file in the session folder. Group by subdirectory.

```markdown
## File Inventory Table

| # | Path | Type | Status |
|---|---|---|---|
| 1 | `FLOW-XX-IMPL-STATE.json` | impl state ({N} lines) | {phase_status}; {N} turns {verdict} |
| 2 | `FLOW-XX-PLAN-STATE.json` | plan state ({N} lines) | {chain_review_verdict} |
| 3 | `FLOW-XX-QA-COVERAGE-STATE.json` | QA coverage ({N} lines) | {overallReadiness}; Q1-Q6 summary |
| 4 | `FLOW-XX-QA-COVERAGE-STATE.md` | QA coverage companion | {overallReadiness} |
| 5 | `FLOW-XX-RECONCILIATION-STATE.md` | reconciliation ({N} lines) | {RECONCILED | PARTIAL | NOT_RECONCILED} |
| 6 | `FLOW-XX-RAG.md` | THIS FILE | RAG digest |
| 7 | `FLOW-XX-DESIGN-SIMULATION-R1.md` | design simulation ({N} lines) | {summary of Q0-Q5} |
...
```

**How to get file sizes:**
```bash
wc -l docs/sessions/FLOW-XX/*.md docs/sessions/FLOW-XX/*.json | sort -n
ls -la docs/sessions/FLOW-XX/
```

**Type labels (consistent vocabulary):**
| File pattern | Type label |
|--------------|-----------|
| `*-IMPL-STATE.json` | `impl state ({N} lines)` |
| `*-PLAN-STATE.json` | `plan state ({N} lines)` |
| `*-QA-COVERAGE-STATE.json` | `QA coverage ({N} lines)` |
| `*-RECONCILIATION-STATE.md` | `reconciliation ({N} lines)` |
| `*-RAG.md` | `RAG digest` |
| `*-DESIGN-SIMULATION-R1.md` | `design simulation ({N} lines)` |
| `*-STEP-N-*.md` | `STEP {N}: {step name}` |
| `EXECUTION-LOG.json` | `SK-426 ({N} lines)` |
| `PHASE-COMPLETE.md` | `SK-427` |
| `SESSION-BRIEF.md` | `SK-428` |
| `FLOW-XX-LIVE-RUN-RESULTS.json` | `live ES capture ({N} lines)` |
| `FLOW-XX-GOAL-GAP-REPORT.md` | `goal-gap report` |

For subdirectory files (e.g., SNAPSHOTS/, last-phase-testing-plan/), add a subheading:
```markdown
### SNAPSHOTS/ ({N} files)
| {N+1} | `SNAPSHOTS/00-terminal-summary.txt` | terminal capture ({N} lines) | {summary} |
```

---

### Step 4: Build the Per-File Digest

For each file, provide a 1-3 line content summary that goes beyond the filename.

```markdown
## Per-File Digest

### Core state files

- **`FLOW-XX-IMPL-STATE.json`** ({N} lines) — Per-turn matrix:
  - Turn1: T{N} / F{N} / CF-{N} — {description} — {COMPLETE | IMPLEMENTED_WITH_DEFECT}
  - Turn2: T{N} / F{N} / CF-{N} — {description} — {status}
  [... one line per turn]
  - testBaseline: {N}/{N} unit+e2e + {N}/{N} docker + {N}/{N} bootstrap = {N} green
  - completed_phases: {list}

- **`FLOW-XX-QA-COVERAGE-STATE.json`** ({N} lines) — {Q1-Q6 one-line summary per category}

- **`FLOW-XX-RECONCILIATION-STATE.md`** ({N} lines) — {verdict}. {N} discrepancies.
  - D-{N}: {title} — Severity: {BLOCKING | SIGNIFICANT | MINOR}
  [one line per discrepancy]

### Session-end output trio

- **`EXECUTION-LOG.json`** ({N} lines, SK-426-v1) — {N} phases:
  - Phase A: {name} — {PASS | FAIL | PASS_WITH_CAVEAT}
  [one line per phase]

- **`PHASE-COMPLETE.md`** — {per-phase summary. Engine Progress key metrics.}

- **`SESSION-BRIEF.md`** — {next-session handoff summary. Key deferred items.}
```

**Per-file digest depth rule:**
- Core state files (B-01..B-06): include the most important structured data (turn matrix, discrepancies, Q-verdicts)
- Session files (STEP-1..STEP-10): include the key output or verdict from each STEP
- Evidence files (SNAPSHOTS/): include the key counts from each JSON
- Narrative files (GOAL-GAP-REPORT, PHASE-COMPLETE): include the headline numbers

---

### Step 5: Build the Implementation Details section

```markdown
## Implementation Details

### Task type inventory
| Task type | T# | Service name | Status |
|-----------|-----|-------------|--------|
| {name} | T{N} | `{service-file}.service.ts` | COMPLETE |
| {name} | T{N} | `{service-file}.service.ts` | IMPLEMENTED_WITH_DEFECT: {defect summary} |

### Factories and BFA rules
- F{N}: {factory purpose} — references T{N}
- CF-{N}: {BFA rule name} — {what it prevents} — {factory reference}

### ES indices created
- `xiigen-{slug}-{name}` — per-tenant index — {what it stores}
- `xiigen-{slug}-master` — master index — {what it stores}

### Test baseline
- Server: {N} tests ({N} unit + {N} e2e + {N} design-contract)
- Client: {N} tests ({N} unit + {N} Playwright)
- Docker/live-ES: {N} tests

### Known gaps or deferred items
{List of items that are NOT yet done, with reference to the remediation path}
```

---

### Step 6: Add Historical RAG Fixtures section (if applicable)

This section exists for flows that have corresponding fixture IDs in ZIP-08/09/10/12.
Check ZIP-01 HISTORY-RAG-INDEX.md for the per-flow table.

```markdown
## Historical RAG Fixtures

The following fixtures in the XIIGen RAG corpus are directly relevant to this flow's
implementation decisions. Consult them when designing new nodes for similar patterns.

### From ZIP-08 (Architecture patterns — hist_arch_*)
| Fixture ID | Pattern type | Quality | Teaching point |
|-----------|-------------|---------|----------------|
| hist_arch_{N} | ARCH_PATTERN | ⭐⭐ | {one-line teaching point relevant to this flow} |

### From ZIP-09 (Design-reasoning — hist_fd_*)
| Fixture ID | Pattern type | Quality | Teaching point |
|-----------|-------------|---------|----------------|
| hist_fd_{N} | {type} | ⭐⭐ / 🔒 | {teaching point} |

### From ZIP-10/11/12 (Per-flow + Batch-L)
| Fixture ID | Source flow | Quality | Decision locked |
|-----------|------------|---------|----------------|
| hist_perflow_{N} | FLOW-{XX} | 🔒 | {what was decided and why it applies here} |
```

**Quality threshold (from ZIP-07 I1-I4):**
- ⭐⭐ = high-signal pattern, directly usable in new flow generation
- 🔒 = locked decision, must not be re-debated
- ⭐ = useful context, lower signal
- No star = informational only

**RAG ACL labels (C27 — ZIP-15 §2):**
For flows where certain fixtures should only be retrieved for specific roles:

```markdown
### RAG ACL Labels
Fixtures accessible by role (allowed_roles[] values):
- `tenant-admin` — can retrieve: {fixture IDs list}
- `platform-admin` — can retrieve: all fixtures
- `tenant-user` — restricted from: {fixture IDs with sensitive platform decisions}
```

**If no relevant historical fixtures:** omit this section entirely.
The HISTORY-RAG-INDEX.md (ZIP-01) per-flow table tells you which clusters apply to a
given flow. If the flow's domain cluster has no pre-existing fixtures, skip this section.

---

### Step 7: Add UX Evidence section for TENANT_FACING flows

For any flow classified as TENANT_FACING or PUBLIC (from flow-ui-automation.json),
add a UX Evidence section using ZIP-17 data (C27/FP amendment from v6.1).

```bash
# Check flow classification
python3 -c "
import json
d = json.load(open('docs/sessions/FLOW-XX/flow-ui-automation.json'))
print('classification:', d.get('classification'))
print('uiRequired:', d.get('uiRequired'))
" 2>/dev/null
# Check for ZIP-17 UX review
ls docs/ux-review/{slug}/UX-REVIEW.md 2>/dev/null
```

```markdown
## UX Evidence (ZIP-17 — pensive-tereshkova-baf347 fleet run)

**Flow classification:** TENANT_FACING | PUBLIC | INTERNAL_ONLY
**UI required:** Full | Partial | None

### Fleet UX verdict
{Verdict from docs/ux-review/{slug}/UX-REVIEW.md: PASS | needs-fixes | not-representative}

### Dominant UX finding
{The most important finding from the UX review — one sentence}

### FC-18 compliance status
- [ ] Phase 7 audit complete: `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`
- [ ] All BLOCK findings cleared
- [ ] Screen template T-N declared
```

**If flow is INTERNAL_ONLY:** omit this section. Add instead:
```markdown
## UX Evidence
Flow classification: INTERNAL_ONLY — no tenant-facing UI. UX audit not applicable.
```

---

### Step 8: Add File Tree (optional but recommended for large flows)

For flows with 20+ files or subdirectories:

```markdown
## File Tree

docs/sessions/FLOW-XX/
├── {file-1}          ← {one-line description}
├── {file-2}          ← {description}
└── {SUBDIR}/         ← {subdir description}
    ├── {sub-file-1}  ← {description}
    └── {sub-file-N}  ← {description}
```

---

## COMPLETE SECTION SEQUENCE

```
# FLOW-XX — RAG DIGEST
## Overview         ← compact facts table
## File Inventory Table  ← one row per file
## Per-File Digest  ← 1-3 line content summary per file
## Implementation Details  ← task types, factories, BFA rules, indices, tests
## Historical RAG Fixtures  ← only if relevant fixtures exist in ZIP-08/09/10/12
## UX Evidence      ← only for TENANT_FACING / PUBLIC flows using ZIP-17 data
## File Tree        ← recommended for 20+ files
```

---

## SELF-CHECK BEFORE SAVING

```
□ Overview table: flowId, task range, factory range, BFA rule range all populated
□ Overview table: test count is real (from jest run, not estimated)
□ Overview table: REST endpoints listed correctly (from grep on service files, not memory)
□ File Inventory Table: every file in docs/sessions/FLOW-XX/ has a row (run ls to verify)
□ Per-File Digest: each entry has content beyond the filename (what does the file say?)
□ Implementation Details: task type table lists every T{N} in the range
□ Historical RAG Fixtures: only included if HISTORY-RAG-INDEX.md confirms applicable fixtures
□ UX Evidence: included if and only if flow-ui-automation.json classification = TENANT_FACING or PUBLIC
□ RAG ACL labels: included if flow has role-scoped data access (C27)
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-RAG.md
```

**SILENT_FAILURE RISK 1:** Listing REST endpoints from memory rather than grep. The endpoint
path might differ from the service class name — always grep `@Get\|@Post` in the service files.

**SILENT_FAILURE RISK 2:** Claiming "N total tests green" without running jest. The number
matters — it is what future sessions compare against to detect regression.

**SILENT_FAILURE RISK 3:** Omitting the Historical RAG Fixtures section when relevant fixtures
exist. Check HISTORY-RAG-INDEX.md (ZIP-01) before concluding no fixtures apply.

---

## TWO OBSERVED EXAMPLES — KEY DIFFERENCES

| Aspect | FLOW-47 (recent, partial verdict) | FLOW-32 (older, planning only) |
|--------|----------------------------------|-------------------------------|
| File count | 13 files (6 root + 7 SNAPSHOTS/) | 95 files (16 root + 79 in last-phase-testing-plan/) |
| Verdict | GOAL_PARTIALLY_REACHED | READY_FOR_EXECUTION (planning complete, Phase A not started) |
| Test count | 86 green | 0 (no implementation yet) |
| Subdir | SNAPSHOTS/ (JSON evidence) | last-phase-testing-plan/ (session corpus) |
| RAG fixtures | Not referenced (no hist_arch_ applicable) | Would reference hist_arch_ patterns for marketplace flows |
| UX Evidence | Would be included (TENANT_FACING) | Not applicable yet (pre-implementation) |
| File tree | Simple (6+7) | Needed (16+79 = complex) |

---

## C30/C38 SOURCE SPLIT NOTE

**FLOW-01..34 (ZIP-16 primary spec):** Overview table facts come from ZIP-16 business spec
(`{NN}-{slug}.md`) for REST endpoints list and intended ES index names. Actual values
must still be confirmed by grep.

**FLOW-35..47 (no ZIP-16 spec):** Source Overview table facts from CURRENT-STATE.json +
DESIGN-SIMULATION-R1.md. The design simulation header declares the task range and domain.

**FLOW-48 (`i18n-translation`):** Source from ZIP-17 ROLE-ANALYSIS-BATCH-10 for
role-template data; standard bash commands for everything else.

**FLOW-41 (EXEMPT from role-template work):** Include this in the RAG.md Implementation
Details: "Role-template cells: 0 — adapter-ci-cd-bridge has no user-facing UI. B-50
(ROLE-SCREEN-MATRIX): NOT APPLICABLE."

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-RAG.md` using only:
1. This guidance file
2. The codebase (for bash commands)
3. The flow's existing session files (for Per-File Digest)
4. ZIP-01 HISTORY-RAG-INDEX.md (to check relevant fixtures)
5. ZIP-17 `docs/ux-review/{slug}/UX-REVIEW.md` (for TENANT_FACING flows)

---
*GUIDE-B07 | Round 17 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P), ZIP-07 (P+S), ZIP-08/09/10/11/12 (F), ZIP-15 (R — RAG ACL), ZIP-16 (R), ZIP-17 (E — UX Evidence)*
*This guidance file uses the most ZIP sources of any in the library: 10 sources total*
*Next: GUIDE-B08 — FLOW-XX-GALLERY.html (Round 18)*
