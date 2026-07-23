# GUIDE-B06 — How to Produce `FLOW-XX-RECONCILIATION-STATE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 16 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-RECONCILIATION-STATE.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

---

## WHAT THIS FILE IS

`FLOW-XX-RECONCILIATION-STATE.md` is the **evidence-anchored discrepancy report** that
compares what was *claimed* in state files against what *actually exists* on disk.

This is the most narrative-rich of the universal state files (169 lines for FLOW-47,
~80 lines for a well-reconciled flow). It requires running bash verification commands
for every claim — every "Actual on disk" entry must reference a real command result.

**Purpose:** Allow any future session to understand the gap between stated implementation
state and code reality, with enough evidence to either confirm the gap exists or close it.

**Authoring schema:** ZIP-01 `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md`;
ZIP-01 `XIIGEN-DESIGN-REVIEW-PROTOCOL-v1.4.md` (reconciliation criteria);
ZIP-11 FLOW-47 and FLOW-46 examples.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-01 | PRIMARY + STRUCTURE | AUTHORING-GUIDE v1.15 §reconciliation-state structure; DESIGN-REVIEW-PROTOCOL v1.4 (tri-state verdict criteria: RECONCILED / PARTIAL / NOT_RECONCILED) |
| ZIP-11 | FIXTURE | FLOW-47 RECONCILIATION-STATE.md (169 lines, 5 D-N discrepancies, NOT_RECONCILED verdict); FLOW-46 RECONCILIATION-STATE.md (~80 lines, 2 minor discrepancies, RECONCILED verdict) |
| ZIP-16 | REFERENCE | Flow spec → what was originally claimed vs what the spec said would be built |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md`
**File size range:** 5–10 KB (simple flows) to 15+ KB (complex flows with many discrepancies)
**When authored:** After implementation is believed complete; updated when discrepancies are resolved

---

## CORE AUTHORING PRINCIPLE: EVERY CLAIM NEEDS A BASH COMMAND

This is the most important rule in this guidance file:

> **Every "Actual on disk" entry in a D-N discrepancy must reference a bash command
> that was run and produced the stated result. Never write "Actual on disk" from memory.**

Examples of correctly evidenced "Actual on disk" statements:
- `Bash: ls server/src/engine/flows/module-lifecycle/ → "No such file or directory"`
- `Bash: grep -r "T657" server/src/engine/ --include="*.ts" | wc -l → 17 files`
- `grep -n "chat" client/src/App.tsx → App.tsx:164: <Route path="/chat"...>`

Examples of incorrectly evidenced statements (NEVER use these):
- `Actual: Services don't exist` ← no bash reference
- `Actual: File is missing` ← claim from memory, not verified

---

## STEP-BY-STEP AUTHORING INSTRUCTIONS FOR CLAUDE CODE

### Pre-condition: Identify all state files to compare against

```bash
# List all state files in the session folder
ls docs/sessions/FLOW-XX/*.json 2>/dev/null
ls docs/sessions/FLOW-XX/*.md 2>/dev/null

# The primary state source is one of these (in priority order):
# 1. FLOW-XX-STATE.json (if it exists — B-43)
# 2. FLOW-XX-IMPL-STATE.json (if no STATE.json — B-02)
# Get the current branch and commit
git branch --show-current
git rev-parse --short HEAD
```

---

### Step 1: Write the file header

```markdown
# FLOW-XX RECONCILIATION — {YYYY-MM-DD}
```

---

### Step 2: Write the Source of Truth section

```markdown
## Source of Truth
- STATE last claimed: `{state-file-name}` {date} — verdict `{GOAL_REACHED | GOAL_PARTIALLY_REACHED | IN_PROGRESS}`{; add one-line description of any recent fix commits if relevant}
- Reconciled against: {branch} @ {7-char commit hash}
- Cross-referenced: `{file1}`, `{file2}`, {live filesystem}, {any other state files consulted}
```

**How to populate:**
```bash
# Get the current commit
git rev-parse --short HEAD
# Get the verdict from state file
python3 -c "import json; d=json.load(open('docs/sessions/FLOW-XX/FLOW-XX-IMPL-STATE.json')); print(d.get('verdict') or d.get('phase_status'))" 2>/dev/null
# Check what other state files exist
ls docs/sessions/FLOW-XX/ | grep -E "STATE|COVERAGE|REFLECTION|TOPOLOGY"
```

---

### Step 3: Write the Top-line verdict

```markdown
## Top-line verdict
**{RECONCILED | PARTIAL → {direction} | NOT_RECONCILED}** — {2-3 sentence summary of the most important finding}
```

**Verdict definitions:**
| Verdict | When to use |
|---------|------------|
| `RECONCILED` | All major claims confirmed; only cosmetic/doc discrepancies remain |
| `PARTIAL → IMPROVING` | Implementation in progress; core claims hold but gaps remain; recent commits addressing issues |
| `PARTIAL → DEGRADED` | Implementation regressed; claims that were true are no longer true |
| `NOT_RECONCILED` | Blocking discrepancies exist that prevent the stated verdict from being accepted |

Write the top-line verdict **after** completing the discrepancy analysis (Steps 4-6),
not before. The verdict is a summary of what you found, not a prediction.

---

### Step 4: Run evidence gathering commands

Before writing any discrepancies, run these commands to gather facts:

```bash
# 1. Service files — do they exist where claimed?
ls server/src/engine/flows/{slug}/ 2>/dev/null || echo "MISSING"
find server/src -name "*.service.ts" -path "*{slug}*" 2>/dev/null

# 2. Test files — do they exist and pass?
find server/test -name "*.spec.ts" -path "*{slug}*" 2>/dev/null | wc -l
find client -name "*.spec.ts" -path "*{slug}*" 2>/dev/null | wc -l

# 3. Client pages — do they exist where claimed?
ls client/src/pages/{slug}/ 2>/dev/null || echo "MISSING"
grep -n "{slug}" client/src/App.tsx 2>/dev/null | head -5

# 4. Topology contract — does it exist?
ls contracts/topologies/{slug}.topology.json 2>/dev/null || echo "MISSING"
python3 -c "import json; d=json.load(open('contracts/topologies/{slug}.topology.json')); print(len(d.get('nodes',[])), 'nodes')" 2>/dev/null

# 5. BFA rules — are they present and unique?
grep -c "CF-" server/src/engine-contracts/{slug}-bfa-rules.ts 2>/dev/null
# Check collision (are CF numbers unique across all contracts files)
grep -r "CF-{N}\b" server/src/engine-contracts/ --include="*.ts" | wc -l

# 6. Artifact boundaries — were they bumped?
grep -A 3 "nextT\|nextF\|nextFamily\|nextCF" docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json | head -10
grep "FLOW-XX\|{slug}" CLAUDE.md 2>/dev/null | head -5
```

---

### Step 5: Write the Discrepancies section

For each discrepancy found during evidence gathering:

```markdown
## Discrepancies found ({N})

### D-{N}: {Short descriptive title}
- **Claimed ({source-doc}):** {verbatim or paraphrased claim from the state file, with file:line reference}
- **Actual on disk:** {what bash commands actually found}
- **Severity:** {BLOCKING | SIGNIFICANT | MINOR}
- **Evidence:** `{file:line}` or `bash: {command} → {result}`
- **Recommended fix:** {specific, actionable fix — not vague "investigate further"}
```

**Severity rules:**
| Severity | When to use | Impact |
|----------|------------|--------|
| `BLOCKING` | Prevents a downstream gate from passing (e.g., missing topology blocks marketplace registration) | Must fix before verdict can be RECONCILED |
| `SIGNIFICANT` | Violates an explicit rule (e.g., Rule 16 service location) or breaks downstream automation | Should fix before declaring implementation complete |
| `MINOR` | Documentation hygiene (e.g., wrong service name in UI-REFLECTION); no runtime impact | Document but doesn't block RECONCILED verdict |

**If zero discrepancies are found:**
```markdown
## Discrepancies found (0)
None. All major claims verified against disk state.
```

---

### Step 6: Write the Confirmed claims section

Always include confirmed claims — this gives equal weight to what IS correct.

```markdown
## Confirmed claims
- {specific claim verified by bash command — format: what exists + evidence}
- {e.g., "6 server service files exist with correct names per IMPL-STATE"}
- {e.g., "/chat route registered at App.tsx:164 (grep confirmed)"}
- {e.g., "contracts/topologies/{slug}.topology.json exists with N nodes / N edges"}
- {e.g., "BFA cross-flow validator suite passing (N suites / N tests pass)"}
- {e.g., "Artifact boundaries correctly bumped in CLAUDE.md: nextT={T}, nextF={F}"}
```

**Rule:** Only list items as confirmed if a bash command above returned affirmative evidence.
Never list a claim as confirmed just because it wasn't found to be wrong.

---

### Step 7: Write the Cross-references section

```markdown
## Cross-references
- Services bound: {N of M | NOT_INVENTORIED} — {source}
- Contract-matched: {N per master state | NOT_INVENTORIED}
- UI verdict mix: {N FULL_UI / N PARTIAL_UI / N NO_UI / N INTERNAL_ONLY}
- Business topology: {PRESENT | MISSING}
- Routed in App.tsx: {FULL | PARTIAL | NONE}
```

**How to populate each field:**

```bash
# Services bound (check BUSINESS-PROCESS-MASTER-STATE.json if available)
python3 -c "
import json
try:
  d = json.load(open('docs/sessions/BUSINESS-PROCESS-MASTER-STATE.json'))
  bindings = d.get('bindings_per_flow', {}).get('FLOW-XX', [])
  print('Services bound:', len(bindings))
except: print('NOT_INVENTORIED')
" 2>/dev/null

# UI verdict mix (from UI-REFLECTION-STATE.json)
python3 -c "
import json
d = json.load(open('docs/sessions/FLOW-XX/UI-REFLECTION-STATE.json'))
verdicts = {}
for p in d.get('processes', []):
  v = p.get('ui_reflection', {}).get('verdict', 'UNKNOWN')
  verdicts[v] = verdicts.get(v, 0) + 1
print(verdicts)
" 2>/dev/null

# Routed in App.tsx
grep -c "{slug}" client/src/App.tsx 2>/dev/null
grep -n "Route.*{slug}" client/src/App.tsx 2>/dev/null
```

---

### Step 8: Write the Conclusion

```markdown
## Conclusion
{1-2 paragraphs. First: overall reconciliation verdict with specific reference to blocking discrepancies if any. Second (optional): what needs to happen to move from current verdict to RECONCILED.}
```

**Conclusion examples by verdict:**

*RECONCILED:*
> **RECONCILED**. FLOW-46 ships 6 server services + 68 tests with all core claims verified.
> The two discrepancies are documentation hygiene only (UI-REFLECTION service names wrong;
> master state missing T656 client-only annotation) — neither affects the user-facing claim.
> Genuinely COMPLETE.

*PARTIAL → IMPROVING:*
> **PARTIAL → IMPROVING** — The implementation shipped 8 services with 86 tests green,
> but three defects (ironRules, arbiterConfigIds, rag-patterns counts) require live-ES
> re-verification after commit 2d7ef07 fixes. D-5 (missing topology) is BLOCKING.
> PARTIAL — NOT_RECONCILED until D-3, D-4, D-5 land.

*NOT_RECONCILED:*
> **NOT_RECONCILED**. IMPL-STATE claims PHASE_F_COMPLETE but no `engine/flows/{slug}/`
> directory exists on disk. This is a BLOCKING discrepancy — the stated phase completion
> cannot be accepted without the service files present.

---

## COMPLETE TEMPLATE

```markdown
# FLOW-XX RECONCILIATION — {YYYY-MM-DD}

## Source of Truth
- STATE last claimed: `{state-file}` {date} — verdict `{VERDICT}`
- Reconciled against: {branch} @ {commit-hash}
- Cross-referenced: `{file1}`, `{file2}`, live filesystem

## Top-line verdict
**{RECONCILED | PARTIAL → IMPROVING | NOT_RECONCILED}** — {2-3 sentence summary}

## Discrepancies found ({N})

### D-1: {Title}
- **Claimed ({source}):** {claim with file:line}
- **Actual on disk:** {bash result}
- **Severity:** {BLOCKING | SIGNIFICANT | MINOR}
- **Evidence:** {file:line or bash: command → result}
- **Recommended fix:** {specific action}

[D-2 through D-N if present]

## Confirmed claims
- {claim 1 — verified by bash}
- {claim 2 — verified by bash}
[continue for all confirmed claims]

## Cross-references
- Services bound: {N of M | NOT_INVENTORIED}
- Contract-matched: {N per master state}
- UI verdict mix: {N FULL_UI / N PARTIAL_UI / N NO_UI / N INTERNAL_ONLY}
- Business topology: {PRESENT | MISSING}
- Routed in App.tsx: {FULL | PARTIAL | NONE}

## Conclusion
{1-2 paragraphs: verdict + path to RECONCILED}
```

---

## SELF-CHECK BEFORE SAVING

```
□ Source of Truth section has a real commit hash (7 chars from git rev-parse --short HEAD)
□ Every "Actual on disk" entry references a specific bash command or file:line citation
□ No claim in "Confirmed claims" was not verified by a bash command
□ Severity labels are BLOCKING, SIGNIFICANT, or MINOR — no other values
□ Top-line verdict matches Conclusion section verdict — they must agree
□ Cross-references UI verdict mix was populated from UI-REFLECTION-STATE.json (not estimated)
□ "Routed in App.tsx" was verified by running grep on App.tsx (not from memory)
□ File saved to docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md
```

**SILENT_FAILURE RISK 1:** Writing "Actual on disk: file missing" without running
`ls` or `find`. The reconciliation must be reproducible — someone reading this file
should be able to re-run the bash commands and get the same result.

**SILENT_FAILURE RISK 2:** Marking a claim as "confirmed" because it wasn't found to
be wrong (absence of evidence ≠ evidence of correctness). Always run an affirmative
bash command before adding something to "Confirmed claims."

**SILENT_FAILURE RISK 3:** Writing the top-line verdict before completing the discrepancy
analysis. Write the verdict last, not first — the verdict is derived from the evidence,
not the other way around.

---

## TWO OBSERVED EXAMPLES — KEY DIFFERENCES

| Aspect | FLOW-46 (RECONCILED) | FLOW-47 (NOT_RECONCILED) |
|--------|---------------------|--------------------------|
| Discrepancy count | 2 (both MINOR/SIGNIFICANT) | 5 (1 BLOCKING) |
| Verdict | RECONCILED | NOT_RECONCILED |
| Service files | Present in correct location | Present but scattered (Rule 16 violation) |
| Topology | PRESENT | MISSING (BLOCKING) |
| Test baseline | All gates green | Assertions weakened |
| Conclusion tone | "Genuinely COMPLETE" | "NOT_RECONCILED until D-3, D-4, D-5 land" |

The difference between RECONCILED and NOT_RECONCILED in these examples is not the number
of discrepancies (FLOW-46 has 2, FLOW-47 has 5) but the **presence of at least one
BLOCKING discrepancy** (D-5 missing topology in FLOW-47).

---

## C30/C38 SOURCE SPLIT NOTE

The RECONCILIATION-STATE.md schema is **universal** — same structure for all 49 flows.
For FLOW-35..47 (no ZIP-16 spec): the "Claimed" source in discrepancies references
CURRENT-STATE.json or DESIGN-SIM rather than a business spec file.
For FLOW-41 (`adapter-ci-cd-bridge`): expect very few discrepancies since it is
engine-internal with no tenant UI. Topology, BFA rules, and service location are the
primary reconciliation targets.

---

## AUTHORING QUALITY GATE

This guidance file is SELF-SUFFICIENT if a Claude Code session can produce a correct
`FLOW-XX-RECONCILIATION-STATE.md` using only:
1. This guidance file
2. The codebase (for bash verification commands)
3. The flow's existing state files (IMPL-STATE.json, STATE.json, UI-REFLECTION-STATE.json)

---
*GUIDE-B06 | Round 16 | Phase 4 — Guidance File Authoring*
*Sources: ZIP-01 (P+S), ZIP-11 (F — FLOW-46 RECONCILED + FLOW-47 NOT_RECONCILED examples), ZIP-16 (R)*
*Next: GUIDE-B07 — FLOW-XX-RAG.md (Round 17)*
