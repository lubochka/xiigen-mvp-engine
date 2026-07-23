# GUIDE-B19 — How to Produce `FLOW-XX-TEACH-QA-R1-FINAL.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 29 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-TEACH-QA-R1-FINAL.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the TEACH-QA-R1-FINAL guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a new
flow's R0 document, it will produce a correct corrections addendum that identifies
and fixes every compliance gap before Phase A execution begins.

---

## WHAT THIS FILE IS

`FLOW-XX-TEACH-QA-R1-FINAL.md` is a **corrections addendum** to the R0 teaching
document. It is not a replacement — it appends precise ADD/REPLACE/REMOVE
instructions that bring R0 into full compliance with the current authoring guide
version before Claude Code executes Phase A of the implementation plan.

**Relationship to other documents:**

```
FLOW-XX-TEACH-QA-R0.md          ← base document (authored in prior round)
     ↓ reviewed against
XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md
     ↓ gaps identified
FLOW-XX-TEACH-QA-R1-FINAL.md    ← this file (corrections addendum)
     ↓ both consumed by
FLOW-XX-IMPLEMENTATION-PLAN.md  ← "Apply R0 + R1-FINAL before Phase A"
```

**Consumer:** Design co-architect (Claude.ai) who authored R0, then Claude Code
when executing the implementation plan.

**Trigger:** R1-FINAL is produced whenever a post-authoring review of R0 finds
gaps that would cause SILENT_FAILURE, BUILD_FAILURE, or correctness problems at
execution time. It is NOT optional once triggered — all identified gaps must be
listed and fixed before the implementation plan can proceed to Phase A.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-TEACH-QA-R1-FINAL.md` — the canonical example: 10 gaps, severity-rated, exact fix instructions for each gap, summary table, "what is already correct" section |
| ZIP-11 | COMPARISON | `FLOW-07-TEACH-QA-R1-FINAL.md` — 5 gaps, different gap types: scope_isolation missing arbiter, tsc pattern silent no-op, SEED number hardcoding, PLAN_EXEMPLAR phantom; shows ADD/REPLACE/REMOVE instruction format |
| ZIP-01 | PRIMARY | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` — the standard R0 gaps are checked against: FC-32 (scope_isolation), authoring guide §tsc gate patterns, §DR v1.6 required fields, §appliesTo JSON array, §SILENT_FAILURE gap classification |
| ZIP-02 | REFERENCE | `LIBRARY-5-TEACH-QA.md` — canonical TEACH-QA R1 trigger criteria and gap classification vocabulary |

**Evidence base:** Both FLOW-07 and FLOW-09 R1-FINAL files were analyzed. They
reveal the 6 gap types that recur across nearly all TEACH-QA-R0 files:

| Gap type | FLOW-07 | FLOW-09 | Severity |
|----------|---------|---------|----------|
| scope_isolation arbiter missing from NDJSON | ✅ Gap 1 | ✅ GAP-09-01 | 🔴 CRITICAL |
| tsc gate uses filename-grep (silent no-op) | ✅ Gap 2/3 | ✅ GAP-09-02/03 | 🔴 CRITICAL |
| PLAN_EXEMPLAR phantom fixture listed | ✅ Gap 5 | — | 🟠 HIGH |
| SEED numbers hardcoded in multiple places | ✅ Gap 4 | — | 🟠 HIGH |
| DR records missing v1.6 required fields | — | ✅ GAP-09-05 | 🟠 HIGH |
| appliesTo not specified as JSON array | — | ✅ GAP-09-07 | 🟠 HIGH |
| RAG patterns missing qualityScore/curriculumTier | — | ✅ GAP-09-06 | 🟠 HIGH |
| SESSION-TEACH files not planned | — | ✅ GAP-09-08 | 🟠 HIGH |
| BFA rule objects as comment stubs | — | ✅ GAP-09-09 | 🟡 MEDIUM |
| DC positive assertion trap | — | ✅ GAP-09-10 | 🟡 MEDIUM |
| PLAN_EXEMPLAR route in ES index routing table | ✅ Gap 5 | — | 🟡 MEDIUM |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R1-FINAL.md`

Note: FLOW-07 uses `FLOW-07-TEACH-QA-R1.md` (without "FINAL"). For new flows,
always append `-FINAL` to make clear the file is the approved corrections addendum,
not a draft. Both variants are valid in List B.

---

## WHEN TO PRODUCE R1-FINAL

R1-FINAL is required whenever a post-R0 review finds any of:

| Condition | Severity | Trigger |
|-----------|----------|---------|
| scope_isolation arbiter not the last NDJSON record | 🔴 CRITICAL | Always produce R1-FINAL |
| tsc gate uses `grep filename \| head -N` pattern | 🔴 CRITICAL | Always produce R1-FINAL |
| client tsc gate missing entirely from Phase 4/5 | 🔴 CRITICAL | Always produce R1-FINAL |
| Any gap causing SILENT_FAILURE at generation time | 🔴/🟠 HIGH | Always produce R1-FINAL |
| DR records missing required v1.6 fields | 🟠 HIGH | Produce R1-FINAL |
| appliesTo field not a JSON array | 🟠 HIGH | Produce R1-FINAL |
| SEED numbers hardcoded (not read from file) | 🟠 HIGH | Produce R1-FINAL |
| PLAN_EXEMPLAR fixture listed (guide v1.3+ removed this class) | 🟠 HIGH | Produce R1-FINAL |
| BFA rule objects are comment stubs, not TypeScript objects | 🟡 MEDIUM | Produce R1-FINAL |
| DC test has negative assertion trap on a valid state | 🟡 MEDIUM | Produce R1-FINAL |

**When NOT to produce R1-FINAL:**
- Wording in a teaching point is imprecise but intent is unambiguous
- A contract's namedChecks is empty and no key exists in validate.handler.ts
- An event schema is missing a non-critical field
- Every identified gap is purely cosmetic (typos, formatting)

---

## THE R1-FINAL STRUCTURE

Every R1-FINAL file has this skeleton:

```
1. File header
2. Status line: "N gaps identified. All must be resolved before Phase A."
3. GAP REGISTER — one section per gap
4. SUMMARY TABLE — all gaps in a table with severity and fix-before phase
5. WHAT IS ALREADY CORRECT — items that required no correction
```

The GAP REGISTER sections use severity emoji:
- 🔴 CRITICAL — BUILD_FAILURE or SILENT_FAILURE; blocks Phase A execution
- 🟠 HIGH — correctness problem; must fix before Phase A
- 🟡 MEDIUM — risk of silent error under specific conditions; must fix before Phase A

---

## HOW TO PRODUCE THE FILE

### Step 1 — File Header

```markdown
# FLOW-XX TEACH-QA — R1 FINAL
## Flow: [Flow human name] | T[NNN]–T[NNN+M] | Wave [N]
## Source: FLOW-XX-TEACH-QA-R0.md + XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md
## Date: YYYY-MM-DD

---

## STATUS: [N] gaps identified. All must be resolved before Phase A.

---
```

### Step 2 — Run the Standard Gap Checklist

Before writing the GAP REGISTER, run this checklist against FLOW-XX-TEACH-QA-R0.md.
These are the 6 universal checks that find gaps in every R0:

```
UNIVERSAL GAP CHECKLIST (run before authoring R1-FINAL):

□ UC-1: scope_isolation arbiter
  Check: Is scope_isolation the LAST record in the arbiters NDJSON?
  Check: Is it present at all?
  If missing or not last → GAP: CRITICAL

□ UC-2: Phase 4 tsc gate pattern
  Check: Does Phase 4 gate use `grep "filename" | head -N` for tsc?
  If yes → GAP: CRITICAL (silent no-op — passes on broken builds)
  Correct pattern: `cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l`

□ UC-3: Phase 5 client tsc gate
  Check: Does Phase 5 gate include `cd client && npx tsc --noEmit`?
  If missing → GAP: CRITICAL

□ UC-4: SEED number hardcoding
  Check: Are SEED-NN numbers hardcoded in preamble, Phase 5 header, or Phase 5 step?
  If yes in any 2+ locations → GAP: HIGH
  Correct behavior: SEED-NN numbers must be read from the file at authoring time

□ UC-5: PLAN_EXEMPLAR fixtures
  Check: Does Phase 1 list a plan-{slug}-*.json PLAN_EXEMPLAR fixture?
  Check: Does Phase 3 seed script include PLAN_EXEMPLAR in the routing table?
  If yes → GAP: HIGH (guide v1.3+ removed this class from standard TEACH-QA)

□ UC-6: DR record v1.6 required fields
  Check: Do all DR records in Phase 1 include: flowId, domainId, seededAt,
         appliesTo (JSON array), tags (array), keywords (array),
         qualityScore (float), curriculumTier (int 1–5)?
  If any are missing → GAP: HIGH
  Forbidden fields: category, sourceFlow, observedIn (v1.4 legacy)
```

Then run the flow-specific checklist derived from the design simulation:

```
FLOW-SPECIFIC GAP CHECKLIST:

□ FS-1: RAG arch patterns have qualityScore + curriculumTier
□ FS-2: appliesTo is JSON array in all corpus documents (not string)
□ FS-3: SESSION-TEACH files planned for each counter-intuitive decision
□ FS-4: BFA rule objects are full TypeScript objects (not comment stubs)
□ FS-5: DC tests use positive assertions (not negation traps on valid states)
□ FS-6: PLAN_EXEMPLAR guard on any backward cross-wave routes
□ FS-7: All cross-flow gate events use MACHINE literals (not generic synonyms)
```

### Step 3 — Write Each Gap Section

For each gap found, write one section using this template:

```markdown
### GAP-XX-NN [emoji] [short title]

**Location:** [Phase N, Step N-X — exact location in R0]

**What the plan has:**
[quote or describe exactly what R0 currently contains]

**What is missing:**
[what should be there, citing the authoring guide rule]

**Fix:**
[ADD / REPLACE / REMOVE — exact content to change, with full replacement text]

**Add to Phase [N] gate:**
```bash
# [gate check that verifies the fix was applied correctly]
```
```

**Critical rule for fix instructions:** Fix instructions must be one of three types:
- **ADD** — add new content at a specific location
- **REPLACE [exact old text] WITH [exact new text]** — surgical replacement
- **REMOVE [exact text]** — deletion with rationale

The fix must be self-contained: Claude Code reading only the R1-FINAL file and the
R0 file must be able to apply every fix without consulting any other document.

### Step 4 — Write the Summary Table

```markdown
## SUMMARY

| ID | Severity | Fix required | Before |
|----|----------|-------------|--------|
| GAP-XX-01 | 🔴 CRITICAL | [one-line description] | Phase A |
| GAP-XX-02 | 🔴 CRITICAL | [one-line description] | Phase D |
| GAP-XX-03 | 🟠 HIGH | [one-line description] | Phase A |
| ... | ... | ... | ... |

**No gaps override the existing FLOW-XX pre-conditions:**
- [list any hard pre-existing blockers that are NOT addressed by this R1-FINAL]
```

### Step 5 — Write "What Is Already Correct"

```markdown
## WHAT IS ALREADY CORRECT IN FLOW-XX-TEACH-QA-R0

[List the items that were reviewed and found to need no correction.]

These items required no correction:
- [Item 1 — brief description of what was checked and confirmed correct]
- [Item 2]
- ...
```

This section is not optional. It provides evidence that the review was thorough and
confirms which parts of R0 Claude Code can rely on without modification.

---

## CANONICAL GAP PATTERNS WITH EXACT FIX TEMPLATES

### GAP TYPE: scope_isolation arbiter missing (CRITICAL — UC-1)

Every flow requires scope_isolation as the LAST arbiter in the NDJSON file.
The TypeScript CF rule object in `{slug}-bfa-rules.ts` is separate — it does NOT
substitute for the NDJSON record. Both must exist.

```markdown
### GAP-XX-01 🔴 scope_isolation arbiter NDJSON missing (FC-32)

**Location:** Phase 2 Step 2-D (arbiters NDJSON)

**What the plan has:** [N] custom arbiters, no scope_isolation record.

**What is missing:** scope_isolation as mandatory last arbiter (FC-32).

[Scope summary from flow spec:
- [Record type 1] are PRIVATE (per-user per-[domain object])
- [Record type 2] are PRIVATE
- [If any GLOBAL records]: T[NNN] reads GLOBAL [aggregate] (intentional)
- [If any inline-pure task types]: T[NNN] is inline-pure — no writes]

**Fix — ADD as last record in `fixtures/arbiters/{slug}-arbiters.bulk.ndjson`:**

```json
{"index": {"_index": "xiigen-arbiters", "_id": "arb-flow[XX]-scope-isolation"}}
{"arbiterId":"arb-flow[XX]-scope-isolation","flowId":"FLOW-XX","scope":["T[NNN]",...,"T[NNN+M]"],"arbiterType":"scope_isolation","cfId":"FC-32","description":"[PRIVATE records summary]. [Any GLOBAL reads with justification]. [Any inline-pure task types].","blockConditions":["[record type] stored with knowledgeScope:GLOBAL","tenantId absent from any stored record","tenantId sourced from request parameter instead of ALS","[inline-pure task type] calls storeDocument"],"resolution":"scope_isolation: { modelToken: 'AI_SCOPE_ARBITER', blind: true, blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS' }"}
```

**Add to Phase 2 gate:**
```bash
# FC-32 — scope_isolation is LAST record
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert d.get('arbiterType') == 'scope_isolation', f'Last arbiter is not scope_isolation: {d.get(\"arbiterType\")}'
print('✅ scope_isolation is last arbiter')
"
```
```

### GAP TYPE: tsc gate is silent no-op (CRITICAL — UC-2)

The pattern `grep "filename.ts" | head -5` matches filenames in TypeScript error
output — not the error lines themselves. On a clean build it returns 0 lines
(correct). On a broken build it ALSO returns 0 lines because error lines contain
the filename in a different format. The gate passes for both states.

```markdown
### GAP-XX-02 🔴 Phase 4 tsc gate uses wrong pattern (silent no-op)

**Location:** Phase 4 gate

**What the plan has:**
```bash
cd server && npx tsc --noEmit 2>&1 | grep "{slug}-proper-flow" | head -5
# Expected: no errors
```

**What is missing:** The correct tsc error count from authoring guide v1.6 #16.

**Fix — REPLACE:**
```bash
cd server && npx tsc --noEmit 2>&1 | grep "{slug}-proper-flow" | head -5
# Expected: no errors
```
**WITH:**
```bash
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0
```
```

### GAP TYPE: client tsc gate missing (CRITICAL — UC-3)

```markdown
### GAP-XX-03 🔴 Phase 5 missing client tsc check

**Location:** Phase 5 gate

**What the plan has:** No client TypeScript check.

**What is missing** (authoring guide v1.6 #20):
```bash
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0
```

**Fix — ADD to Phase 5 gate:**
```bash
# Phase 5 Gate — Client TypeScript
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0
```
```

### GAP TYPE: SEED numbers hardcoded (HIGH — UC-4)

```markdown
### GAP-XX-04 🟠 SEED-NN numbers hardcoded in multiple places

**Location:** Preamble (2 locations) + Phase 5 Step 5-A

**What the plan has:** `SEED-NN..SEED-NN+4` as hardcoded values in:
- Preamble: `— needs SEED-NN..SEED-NN+4`
- Preamble: `FLOW-XX takes SEED-NN..NN+4`
- Phase 5 header: `Extension of ... with SEED-NN through SEED-NN+4`

**What is missing:** The guide rule — there is exactly one valid action: read the file.
Historical anomalies make formula-derived SEED numbers wrong.

**Fix — REPLACE preamble SEED statement:**
REPLACE: `client/e2e/teaching-pipeline.spec.ts   — needs SEED-NN..SEED-NN+4`
WITH: `client/e2e/teaching-pipeline.spec.ts   — needs 5 new SEEDs (read file to find next number)`

**REPLACE Phase 5 header:**
REPLACE: `Extension of ... with SEED-NN through SEED-NN+4.`
WITH:
```
Extension of `client/e2e/teaching-pipeline.spec.ts` with 5 new SEED tests.

MANDATORY BEFORE WRITING — read the file to find the current highest:
```bash
grep "SEED-" client/e2e/teaching-pipeline.spec.ts | grep -oE "SEED-[0-9]+" | \
  sort -t- -k2 -n | tail -1
# FLOW-XX uses (highest+1) through (highest+5).
# DO NOT use hardcoded SEED numbers — actual number depends on what ran before.
```
```

**REPLACE Phase 5 Step 5-A conditional check:**
REPLACE: `If last SEED is NN → add SEED-NN..NN+4 (assumes ... already run)`
WITH: `Use the number returned by the grep above as your starting point. If the result is unexpected, HALT and resolve with Luba. NEVER use a formula to derive SEED numbers.`
```

### GAP TYPE: PLAN_EXEMPLAR phantom (HIGH — UC-5)

```markdown
### GAP-XX-05 🟠 PLAN_EXEMPLAR fixtures listed (guide v1.3+ removed this class)

**Location:** Phase 1 Step 1-C file inventory + Phase 3 seed script + delivery summary

**What the plan has:** `plan-{slug}-{flow-name}.json` listed as a required RAG fixture.

**Root cause:** Guide v1.3 removed the PLAN_EXEMPLAR class from standard TEACH-QA.
The R0 was not updated at the same time.

**Fix — REMOVE from Phase 1 file inventory:**
REMOVE: `  plan-{slug}-{flow-name}.json             (PLAN_EXEMPLAR)`

Phase 1 RAG file count changes from N to N-1.

**REMOVE from Phase 3 seed script patterns list:**
REMOVE: `    'plan-{slug}-{flow-name}',`

**REMOVE from Phase 3 ES index routing table:**
REMOVE: `| PLAN_EXEMPLAR | xiigen-rag-patterns |`

**REPLACE in Phase 3 dry-run expected output:**
REPLACE: `[dry-run] PLAN_EXEMPLAR: 1 record`
REMOVE this line entirely.

UPDATE: Total record count reduced by 1 in dry-run output and delivery summary.

**Add verification:**
```bash
ls fixtures/rag-patterns/ | grep -i "plan-{slug}" | wc -l
# Expected: 0
```
```

### GAP TYPE: DR records missing v1.6 required fields (HIGH)

```markdown
### GAP-XX-06 🟠 DR records missing v1.6 required fields

**Location:** Phase 1 Step 1-B (DR fixtures)

**What is missing:** Required fields per authoring guide v1.6 P1-2:
- `flowId` (string)
- `domainId` (string)
- `seededAt` (ISO 8601 string)
- `appliesTo` (JSON array — not string)
- `tags` (array)
- `keywords` (array)
- `qualityScore` (float 0.0–1.0)
- `curriculumTier` (int 1–5)

Forbidden fields (v1.4 legacy): `category`, `sourceFlow`, `observedIn`

**Fix — each DR record must include all required fields:**
```json
{
  "id": "DR-XX-A",
  "type": "DESIGN_RECORD",
  "flowId": "FLOW-XX",
  "domainId": "[domain-slug]",
  "seededAt": "YYYY-MM-DDT00:00:00Z",
  "pattern": "[PATTERN_NAME]",
  "decision": "[what the design chose]",
  "rationale": "[why the wrong approach fails]",
  "appliesTo": ["T[NNN]"],
  "tags": ["[tag1]", "[tag2]"],
  "keywords": ["[keyword1]", "[keyword2]"],
  "qualityScore": 0.92,
  "curriculumTier": 2
}
```

**Add to Phase 1 gate:**
```bash
python3 -c "
import json, glob
for f in glob.glob('fixtures/design-reasoning/{slug}*.json'):
    d = json.load(open(f))
    records = d if isinstance(d, list) else [d]
    for r in records:
        for field in ['flowId','domainId','seededAt','appliesTo','tags','keywords','qualityScore','curriculumTier']:
            assert field in r, f'{f}: missing required field: {field}'
        assert isinstance(r['appliesTo'], list), f'{f}: appliesTo must be list'
        assert isinstance(r['qualityScore'], float), f'{f}: qualityScore must be float'
        assert isinstance(r['curriculumTier'], int), f'{f}: curriculumTier must be int'
        for forbidden in ['category', 'sourceFlow', 'observedIn']:
            assert forbidden not in r, f'{f}: forbidden legacy field: {forbidden}'
print('✅ All DR records pass v1.6 field check')
"
```
```

### GAP TYPE: appliesTo not JSON array (HIGH)

```markdown
### GAP-XX-07 🟠 appliesTo field not specified as JSON array

**Location:** All Phase 1 arch patterns, all DR records, all BFA rule objects

**What is wrong:** `"appliesTo": "T99, T113"` — string format
**What is correct:** `"appliesTo": ["T99", "T113"]` — JSON array

**Fix — search every fixture produced in Phase 1 and Phase 2:**
```bash
# Check all fixtures for string appliesTo
python3 -c "
import json, glob
for f in glob.glob('fixtures/design-reasoning/{slug}*.json') + glob.glob('fixtures/rag-patterns/*{slug}*.json'):
    d = json.load(open(f))
    records = d if isinstance(d, list) else [d]
    for r in records:
        if 'appliesTo' in r:
            assert isinstance(r['appliesTo'], list), f'{f}: appliesTo must be list, got: {type(r[\"appliesTo\"]).__name__}'
print('✅ appliesTo format correct in all FLOW-XX corpus documents')
"
```
```

### GAP TYPE: BFA rule objects as comment stubs (MEDIUM)

```markdown
### GAP-XX-08 🟡 BFA rule objects — comment stubs detected

**Location:** Phase 2 / `{slug}-bfa-rules.ts`

**The risk:** Comment stubs pass the grep gate (grep finds the check name in
comments) but do not execute at runtime. The BFA system sees no rule.

**Fix — all CF-XX-N rules must be full TypeScript objects:**
```typescript
export const CF_XX_1_[RULE_NAME]: BfaConflictRule = {
  cfId: 'CF-XX-1',
  flowId: 'FLOW-XX',
  name: '[rule_name]',
  description: '[what it enforces]',
  affectedTaskTypes: ['T[NNN]'],
  detectionMethod: '[how to detect violation]',
  resolution: '[what to do when violated]',
};
```

⚠️ A comment stub like `// CF-XX-1: seat_before_payment` passes grep gate but
does not execute at runtime. All CF objects must be full TypeScript objects.

**Add to Phase 2 gate:**
```bash
# All BFA rules are TypeScript objects (not comment stubs)
node -e "
const code = require('fs').readFileSync('server/src/engine-contracts/{slug}-bfa-rules.ts', 'utf8');
const cfPattern = /export const CF_/g;
const commentPattern = /\/\/ CF-/g;
const cfObjects = (code.match(cfPattern) || []).length;
const cfComments = (code.match(commentPattern) || []).length;
console.log(\`CF objects: \${cfObjects}, CF comment stubs: \${cfComments}\`);
if (cfComments > 0) throw new Error(\`\${cfComments} CF rules are comment stubs — must be TypeScript objects\`);
console.log('✅ All BFA rules are TypeScript objects');
"
```
```

### GAP TYPE: DC positive assertion trap (MEDIUM)

```markdown
### GAP-XX-09 🟡 DC-0N — [State] uses negative assertion (positive assertion trap)

**Location:** Phase 4 DC tests, DC-0N

**The issue:** DC-0N tests `expect(result.status).not.toBe('[VALID_STATE]')` — this
REJECTS a valid state as if it were an error condition.

**Pattern from authoring guide v1.6 A2 (DC negative assertion trap):**
```
Wrong: expect(t[NNN]Result.status).not.toBe('[VALID_STATE]')  ← rejects a valid state
Correct: expect(['[VALID_STATE]', '[OTHER_VALID_STATE]']).toContain(result.status)
```

**Fix — REPLACE DC-0N:**
```typescript
// DC-0N: T[NNN] [ServiceName] — [state description]
test('DC-0N: T[NNN] ironRules declare [STATE] as valid AND PRIVATE', () => {
  const contract = getContract('T[NNN]');
  const ir = contract.ironRules.join(' ');
  // Positive assertion: [STATE] is a VALID state (not a failure state)
  expect(ir).toMatch(/[STATE].*valid|valid.*[STATE]|[EventName].*[STATE]/i);
  // Positive assertion: [STATE] records are PRIVATE
  expect(ir).toMatch(/PRIVATE|knowledgeScope.*PRIVATE/i);
});
```
```

---

## ACCEPTANCE CRITERIA FOR R1-FINAL

Before R1-FINAL is considered complete:

- [ ] File header declares source R0 file and authoring guide version
- [ ] Status line states exact number of gaps found
- [ ] Universal checklist (UC-1 through UC-6) was run against R0
- [ ] Flow-specific checklist (FS-1 through FS-7) was run against R0
- [ ] Each gap has: Location, What the plan has, What is missing, Fix, Gate check
- [ ] Fix instructions are ADD/REPLACE/REMOVE (self-contained, no external references)
- [ ] Summary table lists every gap with severity and fix-before phase
- [ ] "What is already correct" section is present (non-empty)
- [ ] No gap is labelled "BLOCKED" or left without a fix — R1-FINAL must be complete

---

## KEY RULES

**1. R1-FINAL is ADD/REPLACE/REMOVE only — never rewrites R0.**
R0 remains the base document. R1-FINAL provides surgical instructions to bring it
into compliance. The implementation plan references both:
`"Apply FLOW-XX-TEACH-QA-R0.md + FLOW-XX-TEACH-QA-R1-FINAL.md corrections before Phase A."`

**2. Every fix must be verifiable with a gate check.**
Each gap section must end with a bash or Python verification command that confirms
the fix was correctly applied. Gate checks should use `assert` or `wc -l # Expected: 0`
patterns — not silent checks that pass for both good and bad states.

**3. Severity determines whether Phase A is blocked.**
🔴 CRITICAL gaps block Phase A execution entirely — Claude Code must not start
corpus seeding until they are resolved. 🟠 HIGH gaps must be resolved before Phase A
but can be worked around if pre-approved in the ISSUE INVENTORY. 🟡 MEDIUM gaps
should be resolved before Phase A but do not block on their own.

**4. "What is already correct" requires genuine verification.**
It is not a formality. Write it only after actually checking each listed item.
It provides confidence to Claude Code that unlisted sections of R0 are safe to use.

**5. PLAN_EXEMPLAR removal cascades through 5 locations.**
When removing a PLAN_EXEMPLAR phantom: (a) Phase 1 file inventory, (b) Phase 1 gate
check, (c) Phase 3 patterns list, (d) Phase 3 ES routing table, (e) Phase 3 dry-run
expected output, (f) Phase 3 delivery summary record count. Miss any one and the
seed script will fail or the delivery summary will be wrong.

---

## RELATIONSHIP TO THE IMPLEMENTATION PLAN

The implementation plan (GUIDE-B17) references R1-FINAL in its Preamble section:

```markdown
Prerequisites verified:
  ✅ FLOW-XX-TEACH-QA-R0.md fixtures authored
  ✅ FLOW-XX-TEACH-QA-R1-FINAL.md corrections reviewed and applied
```

Phase A of the implementation plan must not begin until:
1. R0 is authored (GUIDE-B18)
2. R1-FINAL is produced and reviewed (this file)
3. All 🔴 CRITICAL gaps from R1-FINAL are resolved in R0

The R1-FINAL is the gate that ensures Document 2 (TEACH-QA-R0) is production-ready
before Document 3 (Implementation Plan) begins execution.

---

*End of GUIDE-B19 — FLOW-XX-TEACH-QA-R1-FINAL.md*
*List A sources: ZIP-11 (FLOW-09-TEACH-QA-R1-FINAL, FLOW-07-TEACH-QA-R1-FINAL),*
*ZIP-01 (AUTHORING-GUIDE v1.15 §R1 triggering criteria, §gap classification),*
*ZIP-02 (LIBRARY-5-TEACH-QA §corrections)*
*Target B-type: B-19 — FLOW-XX-TEACH-QA-R1-FINAL.md*
*Round: 29 of 72*
