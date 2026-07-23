# GAP-TO-GUIDANCE MAPPING — R3
## Date: 2026-04-23 | Supersedes R2
## R3 adds: CODE DEVELOPMENT SKILLS examination (6 new gaps, G-29..G-34)
## Focus: why code continues to be wrong even when guidance exists

---

## R3 EXAMINATION — CODE SKILLS EXAMINED

From project knowledge, all code execution skills examined:
- SK-418 dna-compliance-guard (RECOMMENDED, pre-commit gate)
- SK-474 generated-code-review (HIGH, 4-layer review)
- flow-implementation-guide v1.1 (SUPREME, 7-step protocol)
- test-integrity v2.0 (MANDATORY, 5 rules)
- data-connection-classification (reference, ES document classification)
- SK-419 retroactive-development (RECOMMENDED, engine fix propagation)
- docker-local-testing (tenant isolation tests)
- flow-prerequisites (infrastructure gate before first flow)

---

## THE CORE CODE SKILL FINDING

The code skills are organized around the AF pipeline (INJECT → GENERATE → JUDGE → IMPROVE)
and DNA rules 1-9. They were designed to catch production quality issues and training data
contamination. They were NOT updated when the module portability requirements were defined.

The result: every new flow implementation passes all code skill gates while producing
code that has GAP-01 (ClsService), GAP-09 (no FREEDOM key names), GAP-10 (no
requiredCoInstalls), and GAP-16a (no @connectionType). The skills are doing exactly
what they were designed to do — they were just never extended to cover portability.

---

## NEW GAP CLASSES — CODE SKILLS (G-29..G-34)

### G-29 — SK-418 DNA Compliance Guard missing portability checks

**Skill:** dna-compliance-guard (SK-418) | Priority: RECOMMENDED

**What it checks:** 9 DNA rules pre-commit:
- DNA-1: no typed model classes
- DNA-2: no hardcoded field selectors
- DNA-3: no business logic in error handlers
- DNA-4: all services extend MicroserviceBase
- DNA-5: tenantId from context, not parameter
- DNA-6: no entity-specific controllers
- DNA-7: event subscriptions have dedup ID
- DNA-8: document stored before queued
- DNA-9: CloudEvents wrapper on all events

**What it DOES NOT check (all portability gaps):**
```bash
# NOT IN SK-418 — would catch GAP-01:
grep -rn "import.*ClsService\|from 'nestjs-cls'" server/src/engine/flows/{slug}/ | wc -l
# Expected: 0

# NOT IN SK-418 — would catch GAP-16a:
grep -rn "@connectionType FLOW_SCOPED" server/src/engine/flows/{slug}/*.service.ts | wc -l
# Expected: equals service file count

# NOT IN SK-418 — would catch GAP-09:
grep -r "freedom.get\|fromConfig" server/src/engine/flows/{slug}/ --include="*.ts" | \
  grep -v "flow[0-9]*_" | wc -l
# Expected: 0 (all FREEDOM keys are flow-scoped)

# NOT IN SK-418 — would catch GAP-02:
grep -r "^interface IDb\|^interface IQueue\|^interface IFreedom" \
  server/src/engine/flows/{slug}/ --include="*.ts" | wc -l
# Expected: 0

# NOT IN SK-418 — would catch GAP-10:
node -e "
const pkg = JSON.parse(require('fs').readFileSync('package.json'));
const deps = pkg.xiigen?.requiredCoInstalls ?? [];
console.log('Declared co-installs:', deps.length);
"
# Expected: matches cross-flow index read count
```

**Additional issue:** SK-418 is RECOMMENDED, not MANDATORY for standard flow sessions.
The DNA compliance gate has no enforcement at session close — only at pre-commit. A
session can produce ClsService-importing code, write the file, close the session, and
only fail at commit time if the developer remembers to run the gate manually.

**Fix required for SK-418:**
Add portability extension module — 5 new checks run alongside the 9 DNA checks:
```
Portability-1 (P-1): No ClsService/nestjs-cls import in service files (GAP-01)
Portability-2 (P-2): @connectionType FLOW_SCOPED on all service files (GAP-16a)
Portability-3 (P-3): All FREEDOM.get() calls use flow-scoped key format flow{NN}_ (GAP-09)
Portability-4 (P-4): No local interface IDb/IQueue/IFreedom definitions (GAP-02)
Portability-5 (P-5): requiredCoInstalls declared for all cross-flow index reads (GAP-10)
```

Change priority from RECOMMENDED → **MANDATORY for all new flow implementation sessions.**

---

### G-30 — SK-474 Generated Code Review Layer 2 DNA-5 check is wrong

**Skill:** generated-code-review (SK-474) | Priority: HIGH

**The problem:**

Layer 2 (DNA Compliance) checks DNA-5 with:
```bash
grep -n "scope_id\|scopeId" server/src/engine/flows/FLOW-XX/t47-*.service.ts
# Acceptable: receiving tenantId from payload
# Violation: constructing scope prefix: "${tenantId}:reg:" ← caller must not do this
```

This check looks for scope_id CONSTRUCTION. It does NOT check for ClsService import.

A service that uses `this.cls.get(TENANT_CONTEXT_KEY)` to get tenantId:
- Has zero `scope_id` or `scopeId` references
- PASSES SK-474 Layer 2 DNA-5 check
- Has GAP-01 and is completely non-portable

**The correct DNA-5 check for portability:**
```bash
# Current (wrong for GAP-01 detection):
grep -n "scope_id\|scopeId" $SERVICE_FILE

# Required (catches ClsService dependency):
grep -n "import.*ClsService\|import.*nestjs-cls\|\.cls\.get\|TENANT_CONTEXT_KEY" $SERVICE_FILE
# Expected: 0 for a portable service

# ALSO required (the original scope_id check is still valid, keep both):
grep -n "scope_id\|scopeId" $SERVICE_FILE | grep "tenantId.*reg\|tenantId.*:\|:.*tenantId"
```

**Additional Layer missing from SK-474:** behavioral assertion check

After Layer 3 (SILENT_FAILURE check) and before the final verdict, SK-474 needs:

```bash
## LAYER 4 — BEHAVIORAL ASSERTION CHECK (D2-F1)

# Detect stub tests
grep -rn "expect(true).toBe(true)\|expect(true).toEqual(true)" \
  server/src/engine/flows/{slug}/*.spec.ts | wc -l
# Expected: 0

# Verify at least one domain-outcome assertion per service file
# Domain outcome = one of: result.data['status'], result.data['tenantId'],
#   emitted event payload, stored document fields
# A test that only checks result.success === true is NOT a behavioral assertion
grep -rn "result\.data\[" server/src/engine/flows/{slug}/*.spec.ts | wc -l
# Expected: > 0 (at least one per service)
```

**Fix required for SK-474:**
1. Replace DNA-5 check with ClsService import detection (not scope_id detection)
2. Add Layer 4 — behavioral assertion check (D2-F1)

---

### G-31 — test-integrity skill missing behavioral assertion rule

**Skill:** test-integrity (SK-414) | Priority: MANDATORY | Version: 2.0.0

**5 existing rules (all focused on AF pipeline and fabric coverage):**
- test-fix-or-code-fix: don't change mocks to pass failing tests
- branch-reachability: guard chain audit for AF stations
- coverage-vs-execution: count real execution paths not assertion count
- pipeline-function-coverage: AF station + fabric coverage matrix
- contract-driven-testing: use real EngineContract fixtures, not synthetic

**What's missing:** a rule for service-level behavioral assertions.

The D2-F1 correction from the module-separation corpus affected ALL tiers of flows.
The pattern: `expect(true).toBe(true)` or `expect(result.success).toBe(true)` with no
domain-outcome assertions. Tests pass. No behavioral correctness is proven.

This is not covered by any of the 5 test-integrity rules because:
- test-fix-or-code-fix: about mock vs code fix — different pattern
- branch-reachability: about guard chains — different scope
- coverage-vs-execution: counts execution paths, not assertion quality
- pipeline-function-coverage: AF station coverage — different scope
- contract-driven-testing: about fixture type — different pattern

**Fix required for test-integrity v2.1.0:** Add Rule 6:

```markdown
## Rule 6 — Behavioral Assertion Gate (D2-F1)

**Impact: HIGH**

A test that only asserts `result.success === true` provides no evidence that the
service produces the correct domain outcome. It proves the service ran without
crashing. It does not prove it did what the domain requires.

**Required for every service test suite:**
At least one test must assert on a DOMAIN OUTCOME — one of:
  - `result.data['status']` equals an expected domain status string
  - `result.data['tenantId']` equals the ALS context value ('test-tenant-001')
  - emitted event payload contains expected domain fields
  - stored document contains expected business logic fields

```bash
# Detection (run at phase close — end-of-phase checklist):
grep -rn "expect(true).toBe(true)\|expect(true).toEqual(true)" \
  server/src/engine/flows/{slug}/*.spec.ts | wc -l
# Expected: 0 — any hit = stub test, must be replaced

# Verify behavioral assertion exists:
grep -rn "result\.data\['\|result\.data\.\|\.toMatchObject\|\.toContain\|\.toHaveProperty" \
  server/src/engine/flows/{slug}/*.spec.ts | wc -l
# Expected: > 0 per service file tested
```

**Anti-pattern:**
```typescript
// STUB TEST — proves nothing:
it('should process successfully', async () => {
  const result = await service.execute(validInput);
  expect(result.success).toBe(true);
});

// BEHAVIORAL ASSERTION — proves domain correctness:
it('should register member and emit RegistrationInitiated', async () => {
  clsMock.get.mockReturnValue('test-tenant-001');
  const result = await service.execute({ email: 'test@example.com', ... });
  expect(result.success).toBe(true);
  expect(result.data['status']).toBe('REGISTERED');
  expect(result.data['tenantId']).toBe('test-tenant-001');
  expect(mockQueue.enqueue).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ type: 'xiigen.registration.initiated' }),
    expect.any(String)
  );
});
```

Add to end-of-phase checklist:
```
□ Behavioral assertion check: stub test count = 0 for all services in this phase
□ Each service has at least one domain-outcome assertion
□ Tenant isolation test extended: two-tenant sequential and concurrent pattern
```
```

---

### G-32 — data-connection-classification applies to ES documents only

**Skill:** data-connection-classification (reference skill)

**The gap:** The classification taxonomy (FLOW_SCOPED / TENANT_PRIVATE / TENANT_EXPORTABLE)
is conceptually correct and important. But the implementation only covers ES documents
(RAG patterns, prompts, decision records). TypeScript service files have no classification
mechanism.

**Confirmed by:** Flow_examination_plan_enriched.md records this as a system-wide finding:
"System-wide gap: classification mechanism does not extend to TypeScript files. The
data-connection-classification skill's schema applies to ES documents only. Service code
cannot be classified FLOW_SCOPED with current infrastructure."

**The implication:** Step 3 of the flow-implementation-guide ("classify data") runs
data-connection-classification. But the developer classifies the ES artifacts (factories,
BFA rules, topology files) and never classifies the TypeScript service files. The
@connectionType FLOW_SCOPED annotation on service files was defined separately (by the
module-separation work) without being connected to this classification skill.

**Fix required — two parts:**

**Part A: data-connection-classification v2.0 — extend to TypeScript files:**
```
Add §TypeScript Service File Classification:

TypeScript service files are also FLOW_SCOPED by default. They carry code that runs
when a tenant installs the flow. Classification mechanism:

// In each *.service.ts, add JSDoc annotation:
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @className {ClassName}
 */
export class {ClassName} extends MicroserviceBase {

The @connectionType annotation on TypeScript files serves the same purpose as
the connectionType field on ES documents: it declares that this file travels
with the flow when it is packaged for distribution.

Detection (add to classification audit):
  grep -rn "@connectionType FLOW_SCOPED" server/src/engine/flows/{slug}/*.service.ts | wc -l
  Expected: equals ls server/src/engine/flows/{slug}/*.service.ts | wc -l
```

**Part B: flow-implementation-guide Step 3 update:**
Add to Step 3 (Classify Documents) explicitly:
```
Step 3.b — Classify TypeScript service files:
  Every service file in server/src/engine/flows/{slug}/ must have:
  @connectionType FLOW_SCOPED
  @flowId FLOW-XX
  @className {ClassName}
  
  Run: grep -rn "@connectionType" server/src/engine/flows/{slug}/*.service.ts | wc -l
  Expected: equals service file count (from ls command above)
```

---

### G-33 — flow-implementation-guide has no portability step

**Skill:** flow-implementation-guide (SUPREME priority, 7-step protocol)

**7 existing steps:**
1. Verify Prerequisites
2. Claim Artifact Numbers
3. Classify Data (uses data-connection-classification for ES docs)
4. Write Engine Contracts
5. Define AF Prompts
6. Submit to Pipeline
7. Validate 8 Dimensions (V1-V8)

**V8 dimensions checked:**
- V1: Code quality (DNA rules)
- V2: Learning signal (DPO triples)
- V3: Observability (traceability)
- V4: Documentation
- V5: Source control
- V6: Project tracking
- V7: Testability (test counts)
- V8: RAG integrity (patterns indexed)

**What's completely absent:**

There is no validation dimension for portability. V7 (testability) counts tests but
does not check behavioral assertions. None of V1-V8 check:
- @connectionType annotations on service files
- ClsService absence (portability prerequisite)
- FREEDOM key naming
- requiredCoInstalls
- codeBundle field in topology

**Fix required for flow-implementation-guide v1.2:**

Add Step 3.b (TypeScript classification — see G-32 above).

Add V9 — Portability Gate:
```
V9 — PORTABILITY GATE (new)

Run AFTER V1-V8. A flow that fails V9 cannot be declared "distribution-ready."

V9 checks (same as Phase G in GUIDE-B17):
  □ P-1: @connectionType FLOW_SCOPED on all service files
    grep -rn "@connectionType FLOW_SCOPED" server/src/engine/flows/{slug}/*.service.ts | wc -l
    Expected: equals service file count

  □ P-2: No ClsService import in any service file
    grep -rn "import.*ClsService\|from 'nestjs-cls'" \
      server/src/engine/flows/{slug}/*.service.ts | wc -l
    Expected: 0

  □ P-3: All FREEDOM keys are flow-scoped (flow{NN}_key_name format)
    grep -r "freedom.get\|fromConfig" server/src/engine/flows/{slug}/ --include="*.ts" | \
      grep -v "flow[0-9]*_" | wc -l
    Expected: 0

  □ P-4: No local interface definitions
    grep -r "^interface IDb\|^interface IQueue\|^interface IFreedom" \
      server/src/engine/flows/{slug}/ --include="*.ts" | wc -l
    Expected: 0

  □ P-5: requiredCoInstalls declared for cross-flow reads
    (manual check per the cross-flow detection in GUIDE-B21)

V9 verdict: PASS (all 5 conditions) | PARTIAL_GAP (1-4 pass) | FAIL (0-0 pass)

A flow can be ACTIVE (production-quality, all V1-V8 pass) while being PARTIAL_GAP
on V9. V9 FAIL or PARTIAL_GAP means the flow cannot be distributed — it can only be
used within the monorepo.

Label in STATE.json:
  "portabilityStatus": "MOBILE" | "PARTIAL_GAP" | "NOT_PORTABLE"
  "portabilityGaps": ["P-2: ClsService found (GAP-01)", "P-3: 3 FREEDOM keys not scoped"]
```

---

### G-34 — SK-419 retroactive-development has no portability fix propagation

**Skill:** retroactive-development (SK-419) | Priority: RECOMMENDED

**Fix propagation table (current):**
| Bug type | Fix location |
|----------|-------------|
| DNA-1 violation | af1-genesis.ts prompt template |
| DNA-4 violation | af1-genesis.ts MicroserviceBase directive |
| Wrong archetype | af4-rag-context.ts |
| Wrong skill blocks | af4-rag-context.ts |
| Wrong prompt template | af3-prompt-library.ts |
| fabricType wrong | Factory contract |

**What's missing:** portability violations.

When GAP-01 (ClsService) is found in a service, the retroactive development skill has
no guidance on what "engine fix" means. The fix is NOT in af1-genesis.ts or af4-rag-context.ts.
It's in the service file itself, and in the genesis prompt that produces that service.

**Fix required for SK-419 v1.1.0 — add portability fix table:**

```markdown
## Portability Fix Propagation

For portability violations found in service files:

| Violation | Fix location | Engine impact |
|-----------|-------------|---------------|
| ClsService import (GAP-01) | service file: replace cls.get() with explicit tenantId param | AF-1 Genesis prompt: add CF-476 explicit tenantId directive |
| Missing @connectionType (GAP-16a) | service file: add JSDoc annotation | GUIDE-B17 Phase G: add @connectionType to service file template |
| FREEDOM key not scoped (GAP-09) | service file: rename key to flow{NN}_name | GUIDE-B21: update FREEDOM table with named key |
| Local interface clone (GAP-02) | service file: replace with canonical import | AF-1 Genesis prompt: add fabric-interface-only directive |
| Missing requiredCoInstalls (GAP-10) | package.json: add xiigen.requiredCoInstalls | GUIDE-B21: add cross-flow dependency section |

Portability fixes propagate differently from DNA fixes:
- DNA fixes: fix AF station (af1-genesis.ts) → regenerate → verify
- Portability fixes: fix service file directly + fix genesis prompt directive
  → verify with V9 portability gate → run FLOW-PORTABILITY-TEST-PROTOCOL Layer 1
```

---

## COMPLETE CODE SKILL GAP SUMMARY

| # | Gap | Skill affected | What's missing | Fix type |
|---|-----|---------------|----------------|----------|
| G-29 | DNA Compliance Guard missing portability checks | SK-418 | 5 portability checks (ClsService, @connectionType, FREEDOM naming, local interface, requiredCoInstalls) | EDIT SK-418: add P-1..P-5 portability checks + change to MANDATORY |
| G-30 | Generated Code Review DNA-5 check wrong | SK-474 | DNA-5 checks scope_id not ClsService; behavioral assertion check (Layer 4) absent | EDIT SK-474: fix DNA-5 check + add Layer 4 |
| G-31 | test-integrity missing behavioral assertion rule | SK-414 | Rule 6 (D2-F1 behavioral assertion) absent from 5 existing rules | EDIT test-integrity: add Rule 6 + end-of-phase checklist item |
| G-32 | data-connection-classification applies to ES only | reference skill | No mechanism for TypeScript service file classification | EDIT data-connection-classification v2.0: add TypeScript annotation guidance |
| G-33 | flow-implementation-guide has no portability step | flow-implementation-guide | V9 portability gate absent from V1-V8 dimensions; Step 3 doesn't classify TS files | EDIT flow-implementation-guide v1.2: add V9 + Step 3.b |
| G-34 | retroactive-development has no portability fix propagation | SK-419 | Fix propagation table covers DNA/archetype but not ClsService/@connectionType/FREEDOM | EDIT SK-419 v1.1.0: add portability fix table |

---

## PRIORITY FOR CODE SKILL EDITS

**Highest impact — fixes the source of ongoing wrong code:**

**Edit 1: SK-418 + flow-implementation-guide (G-29 + G-33)**
These two together mean: every NEW flow implementation will automatically be
checked for portability conditions at the pre-commit gate AND at phase-close V9.
No new flow can be completed without passing V9. This prevents ALL 29 module-separation
gaps from appearing in any future flow.

**Edit 2: SK-474 + test-integrity (G-30 + G-31)**
These two together mean: no generated service will reach the DPO training corpus
with stub tests or ClsService imports. The code review catches them; the test
integrity rule requires behavioral assertions before phase closes.

**Edit 3: data-connection-classification + SK-419 (G-32 + G-34)**
These two complete the picture: service files get classified with @connectionType,
and when a portability violation IS found, the developer has clear propagation guidance.

---

## FINAL COMPLETE MAPPING — ALL 34 GAPS

| Status | Count | Gaps |
|--------|-------|------|
| FIXED by Phase 1-8 governance | 4 | G-03, G-08, G-09, G-10 |
| PARTIAL (partial fix exists) | 3 | G-04, G-06, G-21 |
| NEW WORK — guidance files | 21 | G-01, G-02, G-05, G-07, G-11..G-20, G-22..G-28 |
| NEW WORK — code skills | 6 | G-29..G-34 |
| **Total** | **34** | |

---

## THE THREE-LAYER FAILURE PATTERN

The gaps show a consistent three-layer failure pattern across all 34 gap classes:

**Layer 1 — Governance (Phase 1-8 fixes this layer):**
No behavioral contract before responses. No convergence check on examinations.
No binary done state. No visible STOP format. DNA review not applied to remediation plans.
→ Fixed by SESSION-START-PROMPT v5.1, SK-552 §9, FC-7b.

**Layer 2 — Flow-prep guidance (Sessions A-G fix this layer):**
Library built against v4.4.0 governance. No Phase G portability gate in GUIDE-B17.
No portability conditions in GUIDE-B21. Q5 cross-tenant definition wrong. GUIDE-B46
doesn't include examination record check. AdminCrudPanel not in guidance. GAP-02, GAP-09,
GAP-10, GAP-17, GAP-19 patterns not documented.
→ Fix: GUIDE-B17 Phase G, GUIDE-B21 portability constraints, GUIDE-B04 Q5 redefinition,
GUIDE-B46 Stage 1, CODE-REVIEW-PROTOCOL FC-7c/d, FLOW-DOCUMENT-AUTHORING-GUIDE Rule 37.

**Layer 3 — Code execution skills (G-29..G-34 fix this layer):**
SK-418 doesn't check portability conditions. SK-474 checks wrong DNA-5 pattern. test-integrity
has no behavioral assertion rule. data-connection-classification is ES-only. flow-implementation-guide
has no V9 portability gate. SK-419 has no portability fix propagation.
→ Fix: SK-418 v1.1, SK-474 v1.1, test-integrity v2.1, data-connection-classification v2.0,
flow-implementation-guide v1.2, SK-419 v1.1.

When all three layers are fixed, a new flow built using the guidance and code skills will:
1. Have behavioral contracts at every response (Layer 1)
2. Produce correctly-designed documentation with portability declared (Layer 2)
3. Generate code that is portable by construction, with behavioral assertions and
   correct ClsService-free tenant scoping (Layer 3)

---

## END OF GAP-TO-GUIDANCE MAPPING R3
