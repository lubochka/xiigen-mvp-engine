# GUIDE-B35 — How to Produce the `SESSION-GAP-T` Family
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 45 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-GAP-TN files):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file covers the SESSION-GAP-T family: the 4-round preparation pipeline that
translates a flow's ENGINE-GAP-LIST.md into the full suite of gap execution artifacts
(registry, block plan, master plan, and individual SESSION-GAP-R files). When Claude
Code applies this guidance, it will produce SESSION-GAP-T0 through SESSION-GAP-T3
for a new flow.

---

## WHAT THIS FAMILY IS

The `SESSION-GAP-T` family is the **gap translation preparation pipeline** — it sits
between the gap investigation (SESSION-GAP-PREP-RN, GUIDE-B33) and the gap execution
(SESSION-GAP-R, GUIDE-B34). Its 4 rounds transform a human-readable ENGINE-GAP-LIST
into machine-executable SESSION-GAP-R files.

**The T stands for Translate:** this family takes the gap document and translates it
into structured, executable artifacts.

**Family members:**

| File | Round | Action | Output |
|------|-------|--------|--------|
| `SESSION-GAP-T0.md` | T0 | Parse gap doc → structured JSON | `FLOW-XX-GAP-REGISTRY.json` |
| `SESSION-GAP-T1.md` | T1 | Assign blocks + build dependency map | `FLOW-XX-BLOCK-PLAN.json` |
| `SESSION-GAP-T2.md` | T2 | Write master plan from block plan | `FLOW-XX-GAPS-MASTER-PLAN.md` |
| `SESSION-GAP-T3+.md` | T3..TN | Write individual SESSION-GAP-R files | `SESSION-GAP-R0.md`, `R1.md`, ... |

Note: T3 covers the first SESSION-GAP-R file. If there are 6 SESSION-GAP-R files,
the family has rounds T0–T8 (T3 through T8 each produce one SESSION-GAP-R file).
The T-round numbering continues past T3 for as many SESSION-GAP-R files as needed.

**Relationship to other families:**
```
[ENGINE-GAP-LIST.md]      → T0 reads this
SESSION-GAP-T0            → produces GAP-REGISTRY.json
SESSION-GAP-T1            → reads registry, produces BLOCK-PLAN.json
SESSION-GAP-T2            → reads block plan, produces GAPS-MASTER-PLAN.md
SESSION-GAP-T3..TN        → reads block plan, produces SESSION-GAP-R0..RN files
```

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-42-SESSION-GAP-T0.md` — T0: parse gap doc → JSON registry with inline Node.js script; gap entry schema (id, layer, emoji, file, shortName, severity, fixClass, scope, beforeFlow, problem, impact, sessionFileId); deferred array; sessionFilePlan map; verification check (failures === 0 gate) |
| ZIP-17 | PRIMARY | `FLOW-42-SESSION-GAP-T1.md` — T1: block assignment logic (severity → block), block plan production, dependency map, verification gate |
| ZIP-17 | PRIMARY | `FLOW-42-SESSION-GAP-T2.md` — T2: write GAPS-MASTER-PLAN.md using heredoc from block plan |
| ZIP-17 | PRIMARY | `FLOW-42-SESSION-GAP-T3.md` — T3: write first SESSION-GAP-R file — "WHY FIRST" section explaining the gap's consequences, then writes the actual session file via heredoc |
| ZIP-17 | COMPARISON | `FLOW-44-SESSION-GAP-T0.md` — different flow, same T0 structure: shows how the pattern adapts to a different gap set |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-SESSION-GAP-TN.md`

Note: T-family files live in the flow's main session directory (not in
`last-phase-testing-plan/`). Their outputs go to either `last-phase-testing-plan/`
(for JSON files) or the main session directory (for SESSION-GAP-R files and
GAPS-MASTER-PLAN.md).

---

## UNIVERSAL RULES FOR ALL T-FAMILY SESSION FILES

Every SESSION-GAP-TN.md follows the same structural rules as SESSION-GAP-RN files,
plus one additional one:

**1. Standard header block.**
```markdown
# FLOW-XX-SESSION-GAP-TN.md
## Flow: FLOW-XX ([Flow human name])
## Round: GAP-TRANSLATE TN | Phase: [PREPARATION / SESSION FILE PRODUCTION]
## Action: [Concise description of what this round does]
## Output: [Output file name]
## Self-contained: zero cross-references, all commands literal
## FLOW_ID="FLOW-XX"
```

**2. CONTEXT block with bash exports.**
```bash
export FLOW_ID="FLOW-XX"
export BASE_DIR="."
export [INPUT_VAR]="[path to input]"
export OUTPUT="[path to output]"
```

**3. Numbered STEPs with bash commands.**
Each step is a discrete action with a bash or Node.js script.

**4. Verification gate after the main step.**
A Node.js or bash script that checks expected counts and exits non-zero on failure.
Documented as: "Gate: failures === 0"

**5. STATE.json update.**
Every T-round updates `docs/sessions/FLOW-XX/STATE.json` to record its output.

**6. Summary table before ISSUE INVENTORY.**
A human-readable table showing what was produced (gap distribution, block distribution, etc.)

**7. ISSUE INVENTORY + ⛔ STOP.**
Standard ending with STOP requiring the gate to pass before the next T-round.

---

## T0 — PARSE GAP DOC → JSON REGISTRY

**Purpose:** Extract all gap entries from `FLOW-XX-ENGINE-GAP-LIST.md` into a
structured JSON registry. This is the machine-readable representation of the gap
list and the input for all subsequent T-rounds.

**Key output structure:**
```json
{
  "flowId": "FLOW-XX",
  "gapDocFile": "docs/sessions/FLOW-XX/.../FLOW-XX-ENGINE-GAP-LIST.md",
  "extractedAt": "ISO-TIMESTAMP",
  "gaps": [
    {
      "id": "GAP-ENG-01",
      "layer": 1,
      "emoji": "🔴",
      "file": "server/src/[path]",
      "shortName": "[concise 50-char description]",
      "severity": "SILENT_FAILURE",
      "fixClass": "EXTENSION",
      "scope": "~[N] lines in [M] file(s)",
      "beforeFlow": "[FLOW-XX execution / FLOW-XX CODE-REVIEW / FLOW-XX Block 2]",
      "problem": "[technical problem description]",
      "impact": "[what fails silently or breaks without this fix]",
      "sessionFileId": "SESSION-GAP-R[N]"
    }
  ],
  "deferred": [
    {
      "id": "J1",
      "severity": "ADVISORY",
      "description": "[why this gap was deferred]",
      "reason": "[low impact / future wave / process gap]"
    }
  ],
  "sessionFilePlan": {
    "SESSION-GAP-R0": ["GAP-ENG-01"],
    "SESSION-GAP-R1": ["GAP-OBS-01"],
    "SESSION-GAP-R4": ["GAP-DATA-01", "GAP-SESSION-01", "GAP-SEED-01"]
  }
}
```

**Two-approach extraction:**
- **Manual population** (recommended): The Node.js script in T0 contains the gap
  data hard-coded in the script — manually extracted from the ENGINE-GAP-LIST.md
  during T0 authoring. The script just writes the pre-authored data to JSON.
- **Parsed extraction** (alternative): A regex-based parser reads the ENGINE-GAP-LIST.md
  summary table. Use when the gap list has > 15 gaps and manual entry is error-prone.

**Verification gate structure:**
```javascript
const expected = { total: N, silent: S, breaks: B, partial: P, advisory: A };
let failures = 0;
if (r.gaps.length !== expected.total) failures++;
if (silent !== expected.silent) failures++;
// ... per-severity counts
process.exit(failures);
```

**Important detail — sessionFilePlan:**
The `sessionFilePlan` maps each SESSION-GAP-R file name to the gap IDs it addresses.
Multiple gaps can map to the same SESSION-GAP-R file when they share a root cause
(e.g., GAP-DATA-01, GAP-SESSION-01, GAP-SEED-01 all in SESSION-GAP-R4 because they
all relate to the same index seeding session file). This consolidation reduces the
total number of session files.

---

## T1 — ASSIGN BLOCKS + BUILD DEPENDENCY MAP → BLOCK-PLAN.JSON

**Purpose:** Take the gap registry and assign each gap to a priority block based on
its severity and `beforeFlow` value. Build the dependency map between session files.

**Block assignment logic:**
```
SILENT_FAILURE                     → Block 1 (highest priority — fix before any re-run)
BREAKS + "before execution"        → Block 2 (must exist before Phase B starts)
PARTIAL + "before execution"       → Block 2 (same — infrastructure/data gaps)
PARTIAL + "before code review"     → Block 3 (before CODE-REVIEW session)
ADVISORY                           → DEFERRED (no session file produced)
```

**Output structure:**
```json
{
  "flowId": "FLOW-XX",
  "generatedAt": "ISO-TIMESTAMP",
  "blocks": {
    "Block1": {
      "label": "FLOW-XX SILENT_FAILURE — fix before any re-run",
      "severity": "SILENT_FAILURE",
      "rounds": [
        { "sessionFile": "SESSION-GAP-R0", "gapIds": ["GAP-ENG-01"], "roundIndex": 0 }
      ]
    },
    "Block2": {
      "label": "FLOW-XX BEFORE EXECUTE — fix before session execution",
      "severity": "BREAKS + PARTIAL (before execution)",
      "rounds": [...]
    },
    "Block3": {
      "label": "FLOW-XX BEFORE CODE-REVIEW — fix before code review",
      "severity": "PARTIAL (before code review)",
      "rounds": [...]
    }
  },
  "deferred": [
    { "gapId": "J1", "severity": "ADVISORY", "reason": "..." }
  ],
  "dependencies": [
    { "from": "SESSION-GAP-R2", "to": "SESSION-GAP-R4",
      "reason": "INFRA-01 creates correct ES mapping; DATA-01 seeds to that index" }
  ]
}
```

**Dependency derivation rules:**
- INFRA gaps → must complete before DATA/SEED gaps that write to the same index
- ARCHETYPE enum gaps → must complete before named check gaps that check that archetype
- Interface declaration gaps → must complete before executor gaps that use that interface
- Contract authoring gaps → must complete before executor dispatch gaps

---

## T2 — WRITE GAPS-MASTER-PLAN.MD

**Purpose:** Write the human-readable GAPS-MASTER-PLAN.md from the block plan.
This is the execution guide for Claude Code when running the SESSION-GAP-R files.

The T2 session file uses a heredoc (`cat > "$OUTPUT" << 'MASTERPLAN_EOF'`) to write
the complete GAPS-MASTER-PLAN.md content inline. The master plan content is structured
per GUIDE-B31 (GAPS-MASTER-PLAN.md guidance).

**Content produced by T2:**
- FIXED PROMPT REMINDER section
- EXECUTION STRATEGY with block-by-block round table
- DEPENDENCY MAP with explicit dependency rules
- TEST GATE commands
- SELF-CONTAINMENT RULE

**Verification gate:**
```bash
# Verify master plan was written with required sections:
for section in "FIXED PROMPT" "EXECUTION STRATEGY" "DEPENDENCY" "TEST GATE"; do
  grep -q "$section" "$OUTPUT" \
    && echo "GREEN $section present" \
    || echo "RED $section MISSING"
done
```

---

## T3..TN — WRITE INDIVIDUAL SESSION-GAP-R FILES

**Purpose:** Produce each SESSION-GAP-R file from the block plan. Each TN round
(starting at T3) writes one SESSION-GAP-R file.

**How T3+ rounds differ from T2:**
- T2 produces the master plan (a coordination document)
- T3+ produce implementation session files (actual fix instructions)

Each T3+ round:
1. Has a "WHY FIRST" section that explains the specific gap's consequences and
   why it must be fixed at its block priority
2. Uses a heredoc to write the full SESSION-GAP-R file inline
3. The SESSION-GAP-R file content follows the structure from GUIDE-B34:
   - Fixed prompt header
   - PROBLEM
   - FILES TO CHANGE
   - EXACT CHANGE (literal TypeScript/JSON/bash)
   - TEST GATE
   - PASS CRITERIA

**T-round numbering convention:**
If a flow has 6 SESSION-GAP-R files (R0–R5), the family has rounds T0–T8:
```
T0: produce GAP-REGISTRY.json
T1: produce BLOCK-PLAN.json
T2: produce GAPS-MASTER-PLAN.md
T3: produce SESSION-GAP-R0.md
T4: produce SESSION-GAP-R1.md
T5: produce SESSION-GAP-R2.md
T6: produce SESSION-GAP-R3.md
T7: produce SESSION-GAP-R4.md
T8: produce SESSION-GAP-R5.md
```

For a flow with 23 SESSION-GAP-R files (like FLOW-10), the T family has 26 rounds.

---

## THE T0 "WHY FIRST" PATTERN (for T3+ rounds)

T3+ rounds open with a "WHY FIRST" section before any bash commands. This section
explains the specific gap's consequences in plain language — why it must be fixed at
this block priority, what silently fails or breaks if it isn't, and which downstream
rounds depend on it.

**Pattern:**
```markdown
## WHY FIRST

[GAP-ID] is a [SILENT_FAILURE / BREAKS / PARTIAL]: when [what happens],
[consequence for training data / execution / learning signal].

Consequences if not fixed before [FLOW-XX execution / CODE-REVIEW]:
- [Specific consequence 1 with observable symptom]
- [Specific consequence 2]
- [Impact on DPO triples, graph confidence, planning intelligence, etc.]

This must be fixed before [what it blocks].
```

This section is not in T0, T1, T2 — only in T3+ where a specific gap is being
addressed. It provides the executor with enough context to understand the urgency
of the fix without consulting any other document.

---

## ACCEPTANCE CRITERIA FOR SESSION-GAP-TN FILES

Before any SESSION-GAP-TN.md is considered complete:

- [ ] Header block has: Flow, Round, Phase, Action, Output, Self-contained flag
- [ ] CONTEXT block has `export FLOW_ID="FLOW-XX"` and all required path variables
- [ ] STEPs are numbered and have literal bash/node commands
- [ ] Verification gate produces `failures === 0` exit code when correct
- [ ] STATE.json update step is present
- [ ] Summary table before ISSUE INVENTORY
- [ ] ISSUE INVENTORY table present
- [ ] ⛔ STOP at end names the output file

Type-specific:
- [ ] T0: `gaps[]` array, `deferred[]` array, `sessionFilePlan` map all present in registry
- [ ] T1: `blocks` dict, `deferred[]`, `dependencies[]` all present in block plan
- [ ] T2: All 4+ master plan sections verified by grep (FIXED PROMPT, EXECUTION STRATEGY, DEPENDENCY, TEST GATE)
- [ ] T3+: "WHY FIRST" section present, heredoc-generated SESSION-GAP-R file has all required sections

---

## KEY RULES

**1. T0 always comes before T1 — T1 reads T0's output.**
The verification gate in T0 must produce `failures === 0` before T1 runs. T1
reads the registry from T0 — if the registry is wrong, T1's block assignments
will also be wrong.

**2. T3+ rounds use heredocs to write session files.**
The entire content of each SESSION-GAP-R file is written inline in the T-round
using `cat > "$SESSION_OUTPUT" << 'HEREDOC_MARKER'`. This makes T3+ self-contained:
the SESSION-GAP-R content is not "generated at runtime" but rather authored in the
T-round and written literally.

**3. Multiple gaps can share one SESSION-GAP-R file.**
When 2-3 gaps share the same root cause or fix the same file, they can be consolidated
into one SESSION-GAP-R file. The `sessionFilePlan` in T0's registry captures this
consolidation. T1's block plan preserves it. T2's master plan shows the combined
session file in the round table.

**4. The verification gate is always explicit about expected values.**
```javascript
console.log('Gaps total: ' + r.gaps.length + ' (expected 10)');
```
Expected values are commented inline next to each check. This allows the executor
to immediately see whether the gap they added or removed changed the expected distribution.

**5. T-family files live in the main session directory, not last-phase-testing-plan.**
This is different from GAP-REGISTRY.json and BLOCK-PLAN.json which live in
`last-phase-testing-plan/`. The T-family session files themselves are part of the
flow's primary session file set.

---

## RELATIONSHIP TO ADJACENT FAMILIES

- **SESSION-GAP-PREP-RN (GUIDE-B33):** Produces ENGINE-GAP-LIST.md → T0 reads this.
- **SESSION-GAP-R (GUIDE-B34):** T3+ rounds produce these files.
- **GAPS-MASTER-PLAN.md (GUIDE-B31):** T2 produces this.
- **BLOCK-PLAN.json (GUIDE-B32):** T1 produces this.
- **GAP-REGISTRY.json (GUIDE-B30):** T0 produces this.

The SESSION-GAP-T family is the automated bridge between human-readable gap documents
and machine-executable fix files.

---

*End of GUIDE-B35 — SESSION-GAP-T family*
*List A sources: ZIP-17 (FLOW-42 SESSION-GAP-T0..T3, FLOW-44 SESSION-GAP-T0 production examples)*
*Target B-type: B-35 — SESSION-GAP-TN family (T0 + T1 + T2 + T3..TN)*
*Round: 45 of 72*
