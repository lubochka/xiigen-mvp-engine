# GUIDE-B19 — How to Produce `FLOW-XX-TEACH-QA-R1-FINAL.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 29 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-24
## v2 amendment: UC-7 — Arbiter NDJSON type coverage (SK-554). Added trigger row,
##   universal checklist entry, and GAP TYPE section. Closes AUTH-ARBITER-SKILLS-
##   REMEDIATION-PLAN-v3.0 Phase 14.

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
| ZIP-11 | PRIMARY | `FLOW-09-TEACH-QA-R1-FINAL.md` — canonical example: 10 gaps, severity-rated, exact fix instructions, summary table, "what is already correct" section |
| ZIP-11 | COMPARISON | `FLOW-07-TEACH-QA-R1-FINAL.md` — 5 gaps: scope_isolation missing, tsc pattern silent no-op, SEED hardcoding, PLAN_EXEMPLAR phantom |
| ZIP-01 | PRIMARY | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` — FC-32 (scope_isolation), tsc gate patterns, DR v1.6 required fields, appliesTo JSON array, SILENT_FAILURE gap classification |
| ZIP-02 | REFERENCE | `LIBRARY-5-TEACH-QA.md` — canonical TEACH-QA R1 trigger criteria and gap classification vocabulary |

**Evidence base (v2 addition):**

| Gap type | FLOW-07 | FLOW-09 | Severity |
|----------|---------|---------|----------|
| scope_isolation arbiter missing from NDJSON | ✅ Gap 1 | ✅ GAP-09-01 | 🔴 CRITICAL |
| tsc gate uses filename-grep (silent no-op) | ✅ Gap 2/3 | ✅ GAP-09-02/03 | 🔴 CRITICAL |
| NDJSON records missing arbiterType (NEW v2) | — | — | 🔴 CRITICAL (if scope_isolation absent) |
| NDJSON arbiterType empty/null records (NEW v2) | — | — | 🟠 HIGH |
| PLAN_EXEMPLAR phantom fixture listed | ✅ Gap 5 | — | 🟠 HIGH |
| SEED numbers hardcoded in multiple places | ✅ Gap 4 | — | 🟠 HIGH |
| DR records missing v1.6 required fields | — | ✅ GAP-09-05 | 🟠 HIGH |
| appliesTo not specified as JSON array | — | ✅ GAP-09-07 | 🟠 HIGH |
| RAG patterns missing qualityScore/curriculumTier | — | ✅ GAP-09-06 | 🟠 HIGH |
| SESSION-TEACH files not planned | — | ✅ GAP-09-08 | 🟠 HIGH |
| BFA rule objects as comment stubs | — | ✅ GAP-09-09 | 🟡 MEDIUM |
| DC positive assertion trap | — | ✅ GAP-09-10 | 🟡 MEDIUM |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R1-FINAL.md`

Note: FLOW-07 uses `FLOW-07-TEACH-QA-R1.md` (without "FINAL"). For new flows,
always append `-FINAL` to make clear this is the approved corrections addendum.

---

## WHEN TO PRODUCE R1-FINAL

R1-FINAL is required whenever a post-R0 review finds any of:

| Condition | Severity | Trigger |
|-----------|----------|---------|
| scope_isolation arbiter not the last NDJSON record | 🔴 CRITICAL | Always produce R1-FINAL |
| tsc gate uses `grep filename \| head -N` pattern | 🔴 CRITICAL | Always produce R1-FINAL |
| client tsc gate missing entirely from Phase 4/5 | 🔴 CRITICAL | Always produce R1-FINAL |
| **scope_isolation NDJSON record count = 0 (NEW v2)** | 🔴 **CRITICAL** | **Always produce R1-FINAL** |
| Any gap causing SILENT_FAILURE at generation time | 🔴/🟠 HIGH | Always produce R1-FINAL |
| **NDJSON records with null/empty arbiterType > 0 (NEW v2)** | 🟠 **HIGH** | **Produce R1-FINAL** |
| **security arbiter absent on PII/payment/auth flow (NEW v2)** | 🟠 **HIGH** | **Produce R1-FINAL** |
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

□ UC-7: Arbiter NDJSON type coverage (NEW v2 — SK-554) ★
  Check: Does the arbiters NDJSON have ≥1 record with arbiterType="scope_isolation"?
  Check: Does every record have a non-empty arbiterType field?
  Check: For PII/payment/auth flows — does the NDJSON have ≥1 "security" record?
  Check: For business-logic flows — does the NDJSON have ≥3 "domain" records?

  Detection commands:
    jq '[.[] | select(.arbiterType=="scope_isolation")] | length' \
      fixtures/arbiters/{slug}-arbiters.bulk.ndjson
    # If 0 → GAP: CRITICAL (scope_isolation absent entirely)

    jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | length' \
      fixtures/arbiters/{slug}-arbiters.bulk.ndjson
    # If > 0 → GAP: HIGH (records without arbiterType)

    jq '[.[]] | group_by(.arbiterType) | map({type:.[0].arbiterType, count:length})' \
      fixtures/arbiters/{slug}-arbiters.bulk.ndjson
    # Review: are required types present for this flow's characteristics?

  Severity:
    scope_isolation count = 0          → 🔴 CRITICAL — always produce R1-FINAL
    security absent on PII/auth flow   → 🔴 CRITICAL — always produce R1-FINAL
    records with empty arbiterType > 0 → 🟠 HIGH
    domain < 3 on business-logic flow  → 🟠 HIGH
    iron_rules absent with BFA CF rules → 🟠 HIGH
```

Then run the flow-specific checklist derived from the design simulation:

```
FLOW-SPECIFIC GAP CHECKLIST:

□ FS-1: RAG arch patterns have qualityScore + curriculumTier
□ FS-2: appliesTo is JSON array in all corpus documents (not string)
□ FS-3: SESSION-TEACH file sections planned in Phase 6
□ FS-4: BFA rule objects are full TypeScript objects (not comment stubs)
□ FS-5: DC tests use positive assertion (not negative assertion trap)
□ FS-6: Phase 3 seed script routing table is complete (no PLAN_EXEMPLAR)
□ FS-7: Phase gate checks are literal (no filename-grep silent no-ops)
```

---

## GAP TYPE TEMPLATES

Use these templates to produce the GAP REGISTER sections. Replace placeholder text
with the flow-specific content.

### GAP TYPE: scope_isolation ordering (CRITICAL)

```markdown
### GAP-XX-01 🔴 scope_isolation arbiter not last in NDJSON

**Location:** `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` — last record

**What the plan has:** `[arbiterType of last record]` as last record
**What is required:** scope_isolation must be the LAST record (FC-32)

**Fix — REPLACE last record:**
Move the scope_isolation record to position N (last):
```json
{"arbiterType":"scope_isolation","flowSlug":"{slug}","check":"tenant-scope","blind":true,
 "blockSemanticsBehavior":"ANY_BLOCK_CLASS_REJECTS"}
```

**Gate check:**
```bash
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | jq '.arbiterType'
# Expected: "scope_isolation"
```
```

---

### GAP TYPE: tsc gate silent no-op (CRITICAL)

```markdown
### GAP-XX-02 🔴 Phase 4 tsc gate uses filename-grep pattern (silent no-op)

**Location:** Phase 4 gate / tsc verification

**What the plan has:**
```bash
grep "{slug}.service" server/dist/ | head -5
```

**What is wrong:** grep on a filename never finds TypeScript errors — always returns 0.
This pattern is a silent no-op that passes on broken builds.

**Fix — REPLACE with correct tsc pattern:**
```bash
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep "error" | wc -l
# Expected: 0
```

**Gate check:** Run the corrected command and verify it returns 0 on the current build.
```

---

### GAP TYPE: client tsc gate missing (CRITICAL)

```markdown
### GAP-XX-03 🔴 Phase 5 gate missing client tsc check

**Location:** Phase 5 gate

**What is missing:** `cd client && npx tsc --noEmit` is absent from Phase 5 gate

**Fix — ADD to Phase 5 gate:**
```bash
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep "error" | wc -l
# Expected: 0
```
```

---

### GAP TYPE: NDJSON arbiter type coverage (CRITICAL or HIGH — NEW v2)

```markdown
### GAP-XX-NN 🔴/🟠 Arbiter NDJSON missing required types (SK-554)

**Location:** `fixtures/arbiters/{slug}-arbiters.bulk.ndjson`

**What the plan has:**
```bash
jq '[.[]] | group_by(.arbiterType) | map({type:.[0].arbiterType, count:length})' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson
# Current output: [shows missing or empty types]
```

**What is required (SK-554 minimum type matrix):**

For this flow's characteristics:
| Required type | Min count | Reason |
|--------------|-----------|--------|
| scope_isolation | ≥1 | Mandatory for all flows |
| [security] | ≥1 | [PII/payment/auth flow] |
| [domain] | ≥3 | [business logic present] |
| [iron_rules] | ≥1 per CF rule | [BFA CF rules: CF-NNN..CF-NNN+M] |

**What is wrong:**
- `scope_isolation` count: [N] — expected ≥1 ← 🔴 CRITICAL if 0
- Records with empty arbiterType: [N] — expected 0 ← 🟠 HIGH if > 0
- `security` records: [N] — expected ≥1 for this PII flow ← 🟠 HIGH if 0
- `domain` records: [N] — expected ≥3 ← 🟠 HIGH if < 3

**Fix — ADD missing records to NDJSON (append before scope_isolation):**

For scope_isolation (if absent — CRITICAL):
```json
{"arbiterType":"scope_isolation","flowSlug":"{slug}","check":"tenant-scope",
 "blind":true,"blockSemanticsBehavior":"ANY_BLOCK_CLASS_REJECTS"}
```

For domain records (if < 3 — HIGH):
```json
{"arbiterType":"domain","flowSlug":"{slug}","check":"[domain-rule-name]",
 "description":"[what domain rule this checks]"}
```

For empty arbiterType records (HIGH): backfill arbiterType on each affected record.
```bash
# Find records without arbiterType
jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | .[]' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson
# For each: determine the correct type from the check name and add arbiterType field
```

**Gate check (add to Phase A gate):**
```bash
# scope_isolation present (CRITICAL)
SCOPE=$(jq '[.[] | select(.arbiterType=="scope_isolation")] | length' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson)
[ "$SCOPE" -lt 1 ] && { echo "FAIL: no scope_isolation records"; exit 1; }
echo "scope_isolation: $SCOPE ✅"

# No empty arbiterType
EMPTY=$(jq '[.[] | select(.arbiterType==null or .arbiterType=="")] | length' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson)
[ "$EMPTY" -gt 0 ] && echo "WARN: $EMPTY records without arbiterType"
echo "Empty arbiterType: $EMPTY (expected 0)"

# scope_isolation is last
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | jq -r '.arbiterType'
# Expected: scope_isolation
```
```

---

### GAP TYPE: DR records missing v1.6 fields (HIGH)

```markdown
### GAP-XX-05 🟠 DR records missing v1.6 required fields

**Location:** Phase 1 / `fixtures/design-reasoning/{slug}-design-decisions.json`

**What is missing:** One or more of: flowId, domainId, seededAt, appliesTo (JSON array),
tags (array), keywords (array), qualityScore (float), curriculumTier (int 1–5)

**Add to Phase 1 gate:**
```bash
python3 -c "
import json, glob
for f in glob.glob('fixtures/design-reasoning/{slug}*.json'):
    d = json.load(open(f))
    records = d if isinstance(d, list) else [d]
    for r in records:
        for field in ['flowId','domainId','seededAt','appliesTo','tags','keywords',
                      'qualityScore','curriculumTier']:
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

---

### GAP TYPE: appliesTo not JSON array (HIGH)

```markdown
### GAP-XX-07 🟠 appliesTo field not specified as JSON array

**Location:** All Phase 1 arch patterns, all DR records, all BFA rule objects

**What is wrong:** `"appliesTo": "T99, T113"` — string format
**What is correct:** `"appliesTo": ["T99", "T113"]` — JSON array

**Fix — search every fixture produced in Phase 1 and Phase 2:**
```bash
python3 -c "
import json, glob
for f in glob.glob('fixtures/design-reasoning/{slug}*.json') + \
         glob.glob('fixtures/rag-patterns/*{slug}*.json'):
    d = json.load(open(f))
    records = d if isinstance(d, list) else [d]
    for r in records:
        if 'appliesTo' in r:
            assert isinstance(r['appliesTo'], list), \
              f'{f}: appliesTo must be list, got: {type(r[\"appliesTo\"]).__name__}'
print('✅ appliesTo format correct in all corpus documents')
"
```
```

---

### GAP TYPE: BFA rule objects as comment stubs (MEDIUM)

```markdown
### GAP-XX-08 🟡 BFA rule objects — comment stubs detected

**Location:** Phase 2 / `{slug}-bfa-rules.ts`

**The risk:** Comment stubs pass the grep gate but do not execute at runtime.

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

**Add to Phase 2 gate:**
```bash
node -e "
const code = require('fs').readFileSync(
  'server/src/engine-contracts/{slug}-bfa-rules.ts', 'utf8');
const objects = (code.match(/export const CF_/g) || []).length;
const stubs = (code.match(/\/\/ CF-/g) || []).length;
console.log('CF objects:', objects, 'CF stubs:', stubs);
if (stubs > 0) throw new Error(stubs + ' CF rules are comment stubs');
console.log('✅ All BFA rules are TypeScript objects');
"
```
```

---

### GAP TYPE: DC positive assertion trap (MEDIUM)

```markdown
### GAP-XX-09 🟡 DC-0N uses negative assertion (positive assertion trap)

**Location:** Phase 4 DC tests, DC-0N

**Wrong:** `expect(result.status).not.toBe('[VALID_STATE]')` — rejects a valid state
**Correct:** `expect(['[VALID_STATE]', '[OTHER]']).toContain(result.status)`

**Fix — REPLACE DC-0N:**
```typescript
test('DC-0N: T[NNN] — [state description]', () => {
  const contract = getContract('T[NNN]');
  const ir = contract.ironRules.join(' ');
  expect(ir).toMatch(/[STATE].*valid|valid.*[STATE]/i);
  expect(ir).toMatch(/PRIVATE|knowledgeScope.*PRIVATE/i);
});
```
```

---

## SUMMARY TABLE TEMPLATE

Every R1-FINAL ends with a summary table. Include UC-7 columns:

```markdown
## SUMMARY TABLE

| Gap | Location | Severity | Fix-before | Fixed in R1-FINAL? |
|-----|----------|----------|-----------|-------------------|
| GAP-XX-01: scope_isolation not last | arbiters NDJSON | 🔴 CRITICAL | Phase A | ADD scope_isolation record |
| GAP-XX-02: tsc gate silent no-op | Phase 4 gate | 🔴 CRITICAL | Phase A | REPLACE grep with tsc --noEmit |
| GAP-XX-03: client tsc missing | Phase 5 gate | 🔴 CRITICAL | Phase A | ADD client tsc gate |
| GAP-XX-NN: NDJSON type coverage | arbiters NDJSON | 🔴/🟠 | Phase A | ADD missing typed records |
| [other gaps...] | | | | |

Total: [N] gaps. [N CRITICAL] + [N HIGH] + [N MEDIUM].
All CRITICAL and HIGH gaps must be resolved before Phase A.
```

---

## ACCEPTANCE CRITERIA FOR R1-FINAL

Before R1-FINAL is considered complete:

- [ ] File header declares source R0 file and authoring guide version
- [ ] Status line states exact number of gaps found
- [ ] Universal checklist (UC-1 through UC-6) was run against R0
- [ ] **UC-7 arbiter NDJSON type coverage run against R0 (NEW v2)**
- [ ] Flow-specific checklist (FS-1 through FS-7) was run against R0
- [ ] Each gap has: Location, What the plan has, What is missing, Fix, Gate check
- [ ] Fix instructions are ADD/REPLACE/REMOVE (self-contained, no external references)
- [ ] Summary table lists every gap with severity and fix-before phase
- [ ] "What is already correct" section is present (non-empty)
- [ ] No gap is labelled "BLOCKED" or left without a fix — R1-FINAL must be complete
- [ ] **UC-7 CRITICAL gaps (scope_isolation=0 or security absent on PII flow): R1-FINAL always produced**

---

## KEY RULES

**1. R1-FINAL is ADD/REPLACE/REMOVE only — never rewrites R0.**

**2. Every fix must be verifiable with a gate check.**
Each gap section must end with a bash or Python verification command.
Gate checks should use `assert` or `wc -l # Expected: 0` — not silent checks.

**3. Severity determines whether Phase A is blocked.**
🔴 CRITICAL gaps block Phase A entirely. 🟠 HIGH must be resolved before Phase A
but can be pre-approved in the ISSUE INVENTORY. 🟡 MEDIUM should be resolved
before Phase A but do not block on their own.

**4. "What is already correct" requires genuine verification.**
Write it only after checking each listed item. Provides confidence that unlisted
sections of R0 are safe to use.

**5. PLAN_EXEMPLAR removal cascades through 5 locations:**
(a) Phase 1 file inventory, (b) Phase 1 gate check, (c) Phase 3 patterns list,
(d) Phase 3 ES routing table, (e) Phase 3 dry-run expected output,
(f) Phase 3 delivery summary record count.

**6. UC-7 arbiter type coverage: scope_isolation is ALWAYS required. (NEW v2)**
No flow is exempt from scope_isolation. A flow with scope_isolation count = 0
in its NDJSON has no tenant-data protection at the arbiter layer. This is a
CRITICAL gap regardless of how many other arbiters are present. The SK-554
minimum type matrix defines all required types per flow characteristic.

---

## RELATIONSHIP TO THE IMPLEMENTATION PLAN

The implementation plan (GUIDE-B17 v6.3) references R1-FINAL in its Preamble:

```markdown
Prerequisites verified:
  ✅ FLOW-XX-TEACH-QA-R0.md fixtures authored
  ✅ FLOW-XX-TEACH-QA-R1-FINAL.md corrections reviewed and applied
```

Phase A of the implementation plan must not begin until:
1. R0 is authored (GUIDE-B18)
2. R1-FINAL is produced and reviewed (this file)
3. All 🔴 CRITICAL gaps from R1-FINAL are resolved in R0

**UC-7 specifically:** If the Phase A gate (GUIDE-B17 v6.3) detects scope_isolation
count = 0 after R1-FINAL was applied, the R1-FINAL was either not applied or the
fix was incomplete. The Phase A gate will exit 1 — Phase A will not proceed.

---

*End of GUIDE-B19 — FLOW-XX-TEACH-QA-R1-FINAL.md v2*
*v1 sources: ZIP-11 (FLOW-09/07 R1-FINAL), ZIP-01 (AUTHORING-GUIDE v1.15),*
*ZIP-02 (LIBRARY-5-TEACH-QA)*
*v2 amendment: UC-7 arbiter NDJSON type coverage (SK-554). CRITICAL trigger for*
*scope_isolation=0 or security absent on PII/auth flow. HIGH trigger for empty*
*arbiterType records or domain < 3. GAP TYPE template added. Key Rule 6 added.*
*Acceptance criteria updated. Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 14.*
*Target B-type: B-19 — FLOW-XX-TEACH-QA-R1-FINAL.md*
*Round: 29 of 72*
