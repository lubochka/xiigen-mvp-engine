# GUIDE-B34 — How to Produce the `SESSION-GAP-R` Family
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 44 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any SESSION-GAP-RN files):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file covers the SESSION-GAP-R family: the individual fix session files
produced from GAPS-MASTER-PLAN.md. When Claude Code applies this guidance, it will
produce correctly-structured SESSION-GAP-RN.md files that each apply exactly one gap
fix with a full problem statement, exact change, and test gate.

---

## WHAT THIS FAMILY IS

The `SESSION-GAP-R` family contains one session file per gap in the GAPS-MASTER-PLAN.
Each file implements exactly one fix. The family exists in the same directory as the
plan documents:

```
docs/sessions/FLOW-XX/last-phase-testing-plan/
  FLOW-XX-ENGINE-GAP-LIST.md       ← source
  FLOW-XX-GAP-REGISTRY.json        ← source
  FLOW-XX-GAPS-MASTER-PLAN.md      ← plan
  FLOW-XX-BLOCK-PLAN.json          ← machine manifest
  SESSION-GAP-R0.md                ← fix file (this family)
  SESSION-GAP-R1.md
  SESSION-GAP-R2.md
  ...
  SESSION-GAP-RN.md                ← last fix file
```

A flow with 23 gaps has 23 SESSION-GAP-R files (R0 through R22).

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-R0.md` — TypeScript interface fix (CRITICAL): fixed prompt header, PROBLEM, FILES TO CHANGE, EXACT CHANGE (full TypeScript code), TEST GATE (3 commands), PASS CRITERIA with gate-cleared note |
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-R2.md` — Named check fix (CONTENT/CRITICAL): 8 regex-based checks added to NAMED_CHECKS, test gate, PASS CRITERIA with iron rule references |
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-R15.md` — VERIFY type (Infrastructure): check-then-create-if-missing pattern, JSON content provided, structural verification (no jest test needed), report format |
| ZIP-17 | PRIMARY | `FLOW-10-SESSION-GAP-R22.md` — PRODUCT GATE: not a code fix, explains three strategy options, ACTION REQUIRED for Luba with step-by-step resolution protocol |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/last-phase-testing-plan/SESSION-GAP-RN.md`

Where N matches the `round` field in BLOCK-PLAN.json.

---

## THE FOUR SESSION TYPES

Every SESSION-GAP-RN.md is one of four types. The type determines the file structure:

| Type | When to use | Primary example |
|------|------------|-----------------|
| IMPLEMENT | TypeScript/JSON code changes | R0 (interface), R2 (named checks), R5 (contracts), R7 (executor) |
| VERIFY | Check-then-create-if-missing | R15–R19 (fixture/infrastructure verification) |
| CONTENT | Session file text corrections | R4 (event name fix), R7 (field path fix) |
| PRODUCT_GATE | No code change — awaits product decision | R22 (revision strategy) |

---

## UNIVERSAL RULES FOR ALL SESSION TYPES

Every SESSION-GAP-RN.md, regardless of type, must follow these rules:

**1. Fixed prompt header — always first.**
The file must open with this exact code block (values filled for this specific round):
```
You are executing Round N of the FLOW-XX GAP-TRANSLATE-PROCESS.
Gap: <GAP_ID> | Block: <BLOCK> | Severity: <SEVERITY>
This file is self-contained. Do not reference other session files.
Apply only the fix described. Run tests after. Report pass/fail counts.
```

**2. PROBLEM section — one to three paragraphs.**
Describes what is missing or wrong, which downstream gaps it blocks, and why this
severity level was assigned. Self-contained: does not say "see the gap list" or
"as described in the master plan."

**3. FILES TO CHANGE section.**
Lists the exact file path(s) that will be modified or created. For VERIFY type,
lists the file path with "Verify:" prefix. One bash command to locate the file if
the path might vary:
```bash
grep -r "NAMED_CHECKS" server/src/ --include="*.ts" -l
```

**4. EXACT CHANGE section.**
Contains the literal change — TypeScript code, JSON content, or bash replacement
command. No "add something like X" — the exact content that must be in the file.

**5. TEST GATE section.**
Exact bash commands that verify the fix was applied correctly. For TypeScript changes:
always includes `npx tsc --noEmit`. For content changes: `grep` or `node -e JSON.parse`.

**6. PASS CRITERIA section.**
Binary PASS/FAIL conditions. Every condition is observable: "npx tsc exits with code 0",
"all 8 check names present in NAMED_CHECKS", "file exists and is valid JSON." No
subjective criteria.

**7. No cross-references.**
No "as described in R7", "see GAPS-MASTER-PLAN", "refer to the registry." The file
contains everything needed to execute the fix in a new session with no prior context.

---

## TYPE 1: IMPLEMENT (TypeScript/JSON changes)

Used for: engine-contracts interfaces, archetype enum additions, named checks,
executor extensions, score handler changes, feedback handler changes, RAG seeding,
contract file authoring.

**Full structure:**
```markdown
# SESSION-GAP-RN.md

```
You are executing Round N of the FLOW-XX GAP-TRANSLATE-PROCESS.
Gap: [GAP-ID] | Block: [1/2/3] | Severity: [CRITICAL/HIGH/SILENT_FAILURE]
This file is self-contained. Do not reference other session files.
Apply only the fix described. Run tests after. Report pass/fail counts.
```

---

## PROBLEM

[One to three paragraphs. Describes:
 1. What is missing or wrong (specific file, specific construct)
 2. What silently fails or breaks without this fix
 3. Which later rounds depend on this (Gate A/B/C notation if applicable)]

---

## FILES TO CHANGE

`[path/to/target/file.ts]`

[Optional: one bash command to locate the file if path may vary]

---

## EXACT CHANGE

[TypeScript code block with exact additions. For new interfaces: full interface
body. For modifications: show the specific block to add with a comment indicating
where to insert it ("Insert before the EngineContract interface declaration").]

---

## TEST GATE

```bash
# Step 1: TypeScript compile
cd server && npx tsc --noEmit

# Step 2: Targeted test pattern
cd server && npx jest --testPathPattern="[relevant pattern]" --verbose

# Step 3: Regression check (subset)
cd server && npx jest --verbose 2>&1 | tail -10
```

---

## PASS CRITERIA

- `npx tsc --noEmit` exits with code 0, zero errors
- [Specific observable condition from the exact change]
- [Specific test pattern passes with N or more tests]
- Existing tests continue to pass (0 regressions)

**FAIL if:** [List specific failure conditions — what would indicate the change wasn't applied]

**Gate cleared:** [List round IDs that can now proceed — e.g., R5 (W1-1), R7 (E3-1)]
(Omit if no specific gates depend on this round)
```

**Key rules for IMPLEMENT type:**
- The EXACT CHANGE block is never partial. "Add something similar to" is not acceptable.
  The literal TypeScript/JSON that must be in the file is written in full.
- For large additions (50+ lines), it's acceptable to split into logical sub-sections
  with comments ("Sub-interface declarations" / "Fields on EngineContract").
- The "Gate cleared" note at the bottom is important for Block 1 rounds — it reminds
  the executor which subsequent rounds can now proceed.

---

## TYPE 2: VERIFY (Check-then-create-if-missing)

Used for: fixture file verification, infrastructure index existence, interface
implementation verification, service registration checks.

**Key distinction from IMPLEMENT:** VERIFY rounds do not assume the fix is missing.
They first check if the state is already correct, then only make the change if needed.
This handles flows that inherit fixes from prior flows (e.g., FLOW-10 inheriting
H-1/H-2 fixes from FLOW-07).

**Full structure:**
```markdown
# SESSION-GAP-RN.md — FLOW-XX GAP-TRANSLATE-PROCESS

[Fixed prompt header]

---

## PROBLEM

[What might be wrong and why this needs verification.
 Note if this gap was previously found in another flow (inheritance context).]

---

## FILES TO CHANGE

- Verify: `[path/to/check]`
- Create if missing (content provided below).

---

## EXACT CHANGE

### Step 1 — Check if [file/configuration] exists
```bash
[existence check command]
```

### Step 2 — Verify contents (if exists)
```bash
[content inspection command]
```

The [file/configuration] must contain:
- [required field 1]: [expected value]
- [required field 2]: [expected value]

If all requirements are met → mark as VERIFIED, skip to TEST GATE.

### Step 3 — Create or replace (if missing or incorrect)
[Literal content to create/replace with — JSON, TypeScript, or bash command]

### Step 4 — Verify consumption
[Command to verify the created/fixed content is consumed by the engine]

---

## TEST GATE

[Test appropriate for the type — JSON.parse for fixtures, npx tsc for TypeScript,
grep for registration. Jest only if there's a specific test pattern for this check.]

---

## PASS/FAIL CRITERIA

**PASS:**
- [Specific observable: "file exists", "valid JSON", "field X is type keyword"]

**FAIL:**
- [Specific failure conditions]

**Report format:**
```
[Structured fields the executor fills in after completing the round]
```
```

**Key rules for VERIFY type:**
- The Step 1/Step 2/Step 3/Step 4 structure is always present.
- The "Report format" at the end gives the executor fields to fill in: "File existed
  before this round: YES/NO", "Action taken: VERIFIED/CREATED/REPLACED", etc.
- VERIFY rounds often do not have a Jest test gate — fixture files are structural,
  not unit-tested. The verification is structural: "file is valid JSON + has required fields."

---

## TYPE 3: CONTENT (Session file text corrections)

Used for: fixing wrong event names in teaching session bash scripts, fixing ES query
field paths (`chosen.code` → `chosen`), adjusting threshold values, correcting
CloudEvent type strings in seed documents.

**Key distinction:** The files being modified are Markdown session files, not
TypeScript source. The changes are string substitutions.

**Full structure:**
```markdown
# SESSION-GAP-RN.md

[Fixed prompt header]

---

## PROBLEM

[What is wrong in the session file — specific file path, specific wrong value, and
 what breaks at runtime because of this wrong value.]

---

## FILES TO CHANGE

`docs/sessions/FLOW-XX/[SESSION-FILE-NAME].md`

---

## EXACT CHANGE

Find the following in `[SESSION-FILE-NAME].md`:
```
[Wrong text — exact string as it appears in the file]
```

Replace with:
```
[Correct text — exact replacement]
```

[If multiple occurrences:]
All occurrences of `[WRONG]` must be replaced. Verify count:
```bash
grep -c "[WRONG]" docs/sessions/FLOW-XX/[SESSION-FILE-NAME].md
# Expected: [N] occurrences
```

---

## TEST GATE

```bash
# Verify the change was applied
grep -n "[CORRECT]" docs/sessions/FLOW-XX/[SESSION-FILE-NAME].md
# Expected: [N] matches

grep "[WRONG]" docs/sessions/FLOW-XX/[SESSION-FILE-NAME].md
# Expected: 0 matches (no wrong value remaining)
```

---

## PASS CRITERIA

- `grep -c "[WRONG]" [...file...]` returns 0
- `grep -c "[CORRECT]" [...file...]` returns [N]
```

---

## TYPE 4: PRODUCT_GATE (Product decision required)

Used for: any gap requiring a product decision before engineering work can proceed.
The session file does NOT make a code change. It documents the decision options,
provides a recommendation, and defines the resolution protocol.

**Full structure:**
```markdown
# SESSION-GAP-RN.md — FLOW-XX GAP-TRANSLATE-PROCESS

[Fixed prompt header with Severity: PRODUCT GATE]

---

## PROBLEM

[What decision is needed, what cannot be completed without it, which engineering
 rounds are blocked (e.g., "R20 conditional revision mechanism is blocked on this
 product decision"). Explicit: "This is NOT a code fix round."]

---

## THE OPTIONS

### Option 1: [NAME]
**Mechanism:** [How it works]
**Risk:** [What could go wrong]
**Best for:** [When to choose this]

### Option 2: [NAME]
[Same structure]

[... additional options ...]

---

## ACTION REQUIRED (for [decision owner — typically Luba])

### Step 1 — Choose an option
[Brief recommendation with reasoning for the simpler/default choice]

### Step 2 — Record the decision
File: `docs/sessions/FLOW-XX/FLOW-XX-STATE.json`
Field: `[field_name]`
Valid values: `"[OPTION1]"` | `"[OPTION2]"` | `"[OPTION3]"`

### Step 3 — What becomes unblocked
[List the round IDs and what they implement once this decision is made]

---

## TEST GATE

```bash
# Verify STATE.json has been updated with a valid decision value:
node -e "
const s = JSON.parse(require('fs').readFileSync('docs/sessions/FLOW-XX/FLOW-XX-STATE.json'));
const validValues = ['[OPTION1]', '[OPTION2]', '[OPTION3]'];
const current = s.[field_name];
console.log('Current value:', current);
console.log('Valid:', validValues.includes(current) ? 'YES' : 'NO — fill in STATE.json');
"
```

---

## PASS CRITERIA

**PASS:**
- `FLOW-XX-STATE.json`.[field_name] is set to one of the valid values
- Value is NOT `null`, `""`, or a placeholder like `"⛔ PRODUCT DECISION"`

**FAIL:**
- Field still contains placeholder value → decision not yet made
- Field contains an invalid value → must be corrected to one of the valid values

**After this passes:** R[N] ([gap-id]) may proceed.
```

---

## HOW TO AUTHOR SESSION-GAP-RN FILES FROM BLOCK-PLAN.JSON

The block plan provides all inputs needed to produce each session file.

```python
# For each round in block plan:
import json

with open('FLOW-XX-BLOCK-PLAN.json') as f:
    plan = json.load(f)

for round_entry in plan['rounds']:
    n = round_entry['round']
    gap_id = round_entry['gap_id']
    block = round_entry['block']
    severity = round_entry['severity']
    layer = round_entry['layer']
    file_path = round_entry['file']
    one_action = round_entry['one_action']
    session_file = round_entry['session_file']

    # Determine session type:
    if severity == 'VERIFY':
        session_type = 'VERIFY'
    elif severity == 'PRODUCT_DECISION':
        session_type = 'PRODUCT_GATE'
    elif layer == 'CONTENT' or 'SESSION' in file_path.upper():
        session_type = 'CONTENT'
    else:
        session_type = 'IMPLEMENT'

    print(f"R{n}: {session_file} → TYPE={session_type} | {one_action}")
```

Then for each round:
1. Determine session type from the table above
2. Use the appropriate structure template (IMPLEMENT / VERIFY / CONTENT / PRODUCT_GATE)
3. Fill in PROBLEM from the GAP-REGISTRY.json `problem` field
4. Fill in EXACT CHANGE from the GAP-REGISTRY.json `fix_excerpt` field + expand to literal code
5. Fill in TEST GATE from the `file` field (derive the jest testPathPattern)
6. Fill in PASS CRITERIA with observable binary conditions

---

## ACCEPTANCE CRITERIA FOR SESSION-GAP-RN FILES

Before any SESSION-GAP-RN.md is considered complete:

- [ ] Fixed prompt header is first (verbatim format, values filled)
- [ ] PROBLEM section is self-contained (no cross-references)
- [ ] FILES TO CHANGE lists exact path(s)
- [ ] EXACT CHANGE contains literal content (no "add something like")
- [ ] TEST GATE has executable bash commands (not "run the tests")
- [ ] PASS CRITERIA has binary observable conditions
- [ ] No "see R[N]", "per the master plan", or other cross-references anywhere

Type-specific:
- [ ] IMPLEMENT: "Gate cleared: R[N]" present if this is a dependency gate
- [ ] VERIFY: "Report format" section with fields to fill in present
- [ ] CONTENT: grep verification commands for both wrong and correct values
- [ ] PRODUCT_GATE: "This is NOT a code fix round" explicitly stated

---

## KEY RULES

**1. One gap per session file — one action per round.**
If the block plan says R3 fixes gap X1-3 (new interface), SESSION-GAP-R3.md fixes
only X1-3. It does not also add the implementation even if the implementation is
small. The implementation is a separate round in the plan.

**2. EXACT CHANGE means exact.**
"Add similar code" or "implement a check that verifies X" are not acceptable in EXACT
CHANGE. The literal TypeScript/JSON that must appear in the file is written in full.

**3. Test gate is always present — even for VERIFY type.**
VERIFY rounds don't need Jest tests, but they always have a structural test gate
(JSON.parse for fixtures, grep for registrations). No session file has no test gate.

**4. PRODUCT_GATE files are documentation, not implementation.**
They contain no code changes. Their purpose is to document the decision landscape,
make a recommendation, and define exactly how the decision owner resolves the gate.
The test gate for a PRODUCT_GATE round is a check that STATE.json was updated.

**5. The "Gate cleared" note prevents execution order mistakes.**
When a round is a dependency gate (EC-1 in FLOW-10), stating which rounds it unblocks
at the bottom of the PASS CRITERIA prevents the executor from running a dependent round
before this one is confirmed complete.

---

*End of GUIDE-B34 — SESSION-GAP-R family*
*List A sources: ZIP-17 (FLOW-10 SESSION-GAP-R0, R2, R15, R22 production examples)*
*Target B-type: B-34 — SESSION-GAP-R family (N files, one per gap)*
*Round: 44 of 72*
