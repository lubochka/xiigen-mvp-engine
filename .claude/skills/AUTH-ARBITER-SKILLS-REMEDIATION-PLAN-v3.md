# AUTH + ARBITER SKILLS REMEDIATION PLAN — v3.0 FINAL
## Date: 2026-04-24 | Supersedes v2.0
## Status: AWAITING LUBA APPROVAL — no files edited until approved

---

## FOUR PROBLEMS

**A — Auth:** No skill requires @UseGuards, @Roles, auth tests, or auth protocol.
All 49 flows are unprotected.

**B — Arbiter NDJSON types:** No skill defines minimum arbiter types for
`fixtures/arbiters/{slug}-arbiters.bulk.ndjson`. Only ordering checked ("scope_isolation LAST").

**C — Protocols not in definition of done:** PORTABILITY-TEST-PROTOCOL-v2.0,
AUTH-ROLES-GROUPS-PLAN-v3.0, PFM-v2.9 sprint checklist exist but are referenced
in zero gate, zero skill, zero PHASE-COMPLETE template.

**D — ARCHITECT mode drift:** ARCHITECT sessions can produce deliverables (code, fixes)
without a plan approval. ARCHITECT must stay in PLANNING mode always: no deliverables
unless explicitly requested AND plan approved. Negative feedback from ANY source
(documents, discussion, prior rounds) must surface — it cannot be ignored.

---

## NEW GAPS vs v2.0 (from PORTABILITY-TEST-PROTOCOL-v2.0, MODULE-SEP-v5.0,
## PER-FLOW-FIX-MAP-v2.9, FORK-FLOW-ENGINE-PLAN-v1.2)

| Gap | Source | Missing from |
|-----|--------|-------------|
| D-HIST-001: no SDK imports in services (@elastic, @anthropic, pg, ioredis) | PORTABILITY-TEST-PROTOCOL-v2.0 Layer 1 Step 2 | dna-compliance-guard, generated-code-review |
| `flow_module_name` FREEDOM key + `{tenantId}--{moduleName}` repo naming | PORTABILITY-TEST-PROTOCOL-v2.0 §REPO NAMING; FORK-FLOW-ENGINE-PLAN-v1.2 CF-FORK-01 | GUIDE-B21 |
| R6 cross-tenant JWT isolation (Tenant B token → Tenant C → 401/403) | PORTABILITY-TEST-PROTOCOL-v2.0 Phase 5c; PFM-v2.9 TIER-C checklist | test-integrity, QA skill |
| SK-553 references v1.2 (old) — must reference consolidated v2.0 | PORTABILITY-TEST-PROTOCOL-v2.0 supersedes v1.2 + extension | SK-553 |
| PFM-v2.9 TIER-C sprint checklist not in any skill | PER-FLOW-FIX-MAP-v2.9 §Guard 14 lines 44-60 | SK-553, GUIDE-B17 |
| Per-role visual evidence (N roles × 3 cells: en/he-RTL/mobile via SK-549) | PORTABILITY-TEST-PROTOCOL-v2.0 Layer 3 Extended Axis B | QA skill SK-481, GUIDE-B37 |
| V11 tenant certification tier (NONE→TIER_A→TIER_B→TIER_C→TIER_D) | PORTABILITY-TEST-PROTOCOL-v2.0 TIER model; MODULE-SEP-v5.0 tier annotations | flow-implementation-guide, GUIDE-B02/04 |
| Phase I (tenant certification) absent from GUIDE-B17 | PFM-v2.9 TIER-C checklist belongs in implementation plan | GUIDE-B17 |
| Q8 tenant cert tier absent from QA coverage | Cert tier tracking alongside Q1-Q7 | GUIDE-B04 |
| ARCHITECT mode drift — produces deliverables without plan approval | Direct correction from Luba: "architect — planning always; negative feedback cannot be ignored" | HOW-TO-USE, SESSION-START-PROMPT |

---

## 27 PHASES

---

### PHASE 1 — NEW SKILL: arbiter-ndjson-requirements SK-554 v1.0.0

**File:** `code-execution--arbiter-ndjson-requirements-SKILL.md` (NEW)
**Dependency:** Phases 10, 13, 14 reference this skill

Defines minimum type requirements for `fixtures/arbiters/{slug}-arbiters.bulk.ndjson`.
This is distinct from arbiter-panel-design-SKILL (TypeScript arbiterConfig).

**Minimum type matrix:**
| Condition | Required type | Min count |
|-----------|--------------|-----------|
| Any flow | `scope_isolation` | ≥1 per tenant-data service |
| PII flow | `security` | ≥1 |
| BFA CF rules | `iron_rules` | ≥1 per CF rule |
| Domain business logic | `domain` | ≥3 |
| DNA-8 outbox | `outbox_pattern` | ≥1 |
| HTTP endpoints | `http_contract` | ≥1 per controller |
| CLS-era | `cls_switch_boundary` | ≥1 |
| Auth/JWT flow | `security` | ≥3 |
| Identity-critical (FLOW-15, FLOW-46) | `security` + `iron_rules` | ≥2 each |

All records: `arbiterType` field non-empty.

```bash
# Detection commands (inline in skill):
jq '[.[]] | group_by(.arbiterType) | map({type: .[0].arbiterType, count: length})' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson

jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | length' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson  # Expected: 0

jq '[.[] | select(.arbiterType == "scope_isolation")] | length' \
  fixtures/arbiters/{slug}-arbiters.bulk.ndjson  # Expected: ≥1
```

---

### PHASE 2 — dna-compliance-guard v1.1.0 → v1.2.0

**File:** `code-execution--dna-compliance-guard-SKILL.md`

**Adds A-1..A-3 (auth checks) alongside DNA-1..9 and P-1..P-5:**
```bash
# A-1: Every @Controller must have @UseGuards
CONTROLLERS=$(grep -c "@Controller(" $FILE 2>/dev/null || echo 0)
GUARDS=$(grep -c "@UseGuards" $FILE 2>/dev/null || echo 0)
[ "$CONTROLLERS" -gt 0 ] && [ "$GUARDS" -lt "$CONTROLLERS" ] && \
  { echo "❌ A-1: controller without @UseGuards"; exit 1; }

# A-2: Every route must have @Roles() or @Public()
ROUTES=$(grep -cE "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FILE 2>/dev/null || echo 0)
AUTH_DECL=$(grep -cE "@Roles\(|@Public\(\)" $FILE 2>/dev/null || echo 0)
[ "$ROUTES" -gt "$AUTH_DECL" ] && \
  { echo "❌ A-2: route without @Roles or @Public()"; exit 1; }

# A-3: @Public() routes must be in bypass-paths.registry.ts (manual check)

# D-HIST-001: No direct SDK imports in service files (NEW from PORTABILITY-TEST-PROTOCOL-v2.0)
SDK=$(grep -rn "^import.*from '@elastic\|from '@anthropic\|from 'pg'\|from 'ioredis'" \
  $FLOW_DIR --include="*.ts" | grep -v "fabrics/implementations\|.spec." | wc -l)
[ "$SDK" -gt 0 ] && { echo "❌ D-HIST-001: direct SDK import — use fabric interfaces"; exit 1; }
```
Priority: MANDATORY. Exits 1 on failure.

---

### PHASE 3 — generated-code-review v1.1.0 → v1.2.0

**File:** `code-execution--generated-code-review-SKILL.md`

**Adds Layer 5: Auth Declaration Check** (runs before DPO capture):
```bash
CONTROLLERS=$(grep -c "@Controller" $FILE 2>/dev/null || echo 0)
GUARDS=$(grep -c "@UseGuards" $FILE 2>/dev/null || echo 0)
ROUTES=$(grep -cE "@Get\(|@Post\(|@Put\(|@Delete\(|@Patch\(" $FILE 2>/dev/null || echo 0)
AUTH_DECL=$(grep -cE "@Roles\(|@Public\(\)" $FILE 2>/dev/null || echo 0)
# REJECT if CONTROLLERS > 0 AND GUARDS < CONTROLLERS
# REJECT if ROUTES > AUTH_DECL
```

**Updates Layer 2** to include D-HIST-001 (no SDK imports).
Code with auth violation OR D-HIST-001: not a valid DPO `chosen` candidate.

---

### PHASE 4 — flow-implementation-guide v1.2.0 → v1.3.0

**File:** `code-execution--flow-implementation-guide-SKILL.md`

**Adds V10 — Auth Gate:**
```bash
CONTROLLERS=$(find $FLOW_DIR -name "*.controller.ts" 2>/dev/null | wc -l)
GUARDED=$(grep -rl "@UseGuards" $FLOW_DIR --include="*.controller.ts" 2>/dev/null | wc -l)
# Verdict: AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE
```
STATE.json: `"authStatus": "TBD|AUTH_READY|AUTH_GAP|AUTH_DEFERRED|NOT_APPLICABLE"`,
`"authGaps": []`

**Adds V11 — Tenant Certification Tier (NEW):**
```
TIER-A: SK-553 Layer 1 PASS (or AUTH_DEFERRED documented)
TIER-B: TIER-A + repo {tenantId}--{moduleName} + repo evidence PNG
TIER-C: TIER-B + AI Adaptation 1-5 + per-role visual + R6 auth isolation (Guard 14)
TIER-D: All layers + SK-549 full per-role coverage
```
STATE.json: `"tenantCertTier": "NONE|TIER_A|TIER_B|TIER_C|TIER_D"`

---

### PHASE 5 — phase-preflight v1.1.0 → v1.2.0

**File:** `code-execution--phase-preflight-SKILL.md`

**Adds default check #6 — Auth infrastructure:**
```bash
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
SCOPE_WIRE=$(ls server/src/auth/scope-enrichment.interceptor.ts 2>/dev/null | wc -l)
APP_GUARD=$(grep -c "JwtAuthGuard\|APP_GUARD" server/src/main.ts 2>/dev/null || echo 0)
ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)
[ "$AUTH_MODULE" -eq 0 ] && \
  echo "⚠️ AUTH_DEFERRED: Complete AUTH-PLAN v3 Phases 1-4 before adding protected routes"
```

---

### PHASE 6 — test-integrity v2.1.0 → v2.2.0

**File:** `code-execution--test-integrity-SKILL.md`

**Adds Rule 7 — Auth Route Test:**
```
□ protected route returns 401 when no JWT
□ protected route returns 403 when JWT + wrong role
□ @Public() route returns 200 without JWT
Detection: grep -cE "\.expect\(401\)|\.expect\(403\)|Unauthorized|Forbidden" spec.ts
Expected: > 0 for any flow with controllers
```

**Adds Rule 8 — Cross-Tenant JWT Isolation (NEW from PORTABILITY-TEST-PROTOCOL-v2.0 Phase 5c + R6):**
```typescript
// R6: Tenant B's token rejected on Tenant C's routes
it('[R6] rejects cross-tenant JWT', async () => {
  const tenantBToken = await loginAs('tenant-b-user', 'tenant-b');
  await request(app.getHttpServer())
    .get('/api/flow-xx/tenant-c-resource')
    .set('Authorization', `Bearer ${tenantBToken}`)
    .expect(401);
});
```
Detection: `grep -cE "cross.tenant.*JWT|tenant.*B.*token.*C|JWT.*isolation"` spec.ts
Warning for TIER-A/B; BLOCK for TIER-C.

---

### PHASE 7 — self-verification v1.1.0 → v1.2.0

**File:** `code-execution--self-verification-SKILL.md`

**Adds AUTH_PROTECTION_ADDITION** as 6th change category.
Rationale: adding `@UseGuards`/`@Roles` breaks callers without JWT — not `BACKWARD_COMPAT`.

| Category | Test requirement |
|----------|-----------------|
| `AUTH_PROTECTION_ADDITION` | L1 + V10 + Rule 7 + Rule 8 (cross-tenant JWT) |

---

### PHASE 8 — retroactive-development v1.1.0 → v1.2.0

**File:** `code-execution--retroactive-development-SKILL.md`

**Adds auth fix propagation table:**

| Violation | Detection | Service file fix | Genesis prompt fix |
|-----------|-----------|-----------------|-------------------|
| A-1: no @UseGuards | `grep -L "@UseGuards" *.controller.ts` | Add `@UseGuards(JwtAuthGuard, RolesGuard)` before `@Controller` | Add: "Every @Controller MUST have @UseGuards" |
| A-2: route without @Roles | Route vs auth count diff | Add `@Roles('role')` or `@Public()` per route | Add: "Every route MUST have @Roles or @Public()" |
| D-HIST-001: SDK import | D-HIST-001 grep | Replace with fabric interface | Add: "Use IDatabaseService not @elastic directly" |

8-step verification: fix → A-1..A-3 → D-HIST-001 → V10 → Rule 7 → Rule 8 → STATE.json update → commit.

---

### PHASE 9 — flow-prerequisites v1.0.0 → v1.1.0

**File:** `code-execution--flow-prerequisites-SKILL.md`

**Adds TIER 1 P-5 — Auth infrastructure prerequisite:**
```bash
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
[ "$AUTH_MODULE" -eq 0 ] && echo "P-5 MISSING — AUTH-PLAN v3 Phases 1-4 required before TIER-C"
```
NON-BLOCKING — flows proceed as AUTH_DEFERRED. TIER-C requires auth (Guard 14).

---

### PHASE 10 — plan-review-skill v2.0.0 → v2.1.0

**File:** `planning--plan-review-SKILL.md`

**Adds FC-19 — Auth Requirement Declaration:**
For plans producing controllers: must declare public vs protected routes, BYPASS_PATHS,
auth test phase.
FAIL if: plan produces controllers with no auth declaration section.

**Adds FC-20 — Arbiter NDJSON Type Coverage (references SK-554):**
scope_isolation: ≥1 mandatory. security: ≥1 for PII/payments. domain: ≥3 for logic.
FAIL if: scope_isolation absent. WARN if: empty arbiterType records.

**Adds FC-21 — Definition of Done Protocol Reference:**
```
For any plan delivering a flow to ACTIVE/MOBILE/TIER-X:
  □ SK-553 Layer 1 referenced OR explicit deferral with named follow-up session
  □ authStatus target declared (AUTH_READY or AUTH_DEFERRED)
  □ SK-554 NDJSON type coverage check referenced
  □ PHASE-COMPLETE template includes portabilityStatus + authStatus gates
  □ tenantCertTier target declared
  □ For TIER-C claims: Guard 14 explicitly checked (AUTH-PLAN v3 Phases 1-4 deployed?)
FAIL if: plan claims TIER-C without Guard 14 mention.
FAIL if: plan claims flow complete with no protocol status.
```

---

### PHASE 11 — flow-design-check-catalog v1 → v2

**File:** `code-execution--flow-design-check-catalog-PORTABILITY-AUTH-ADDENDUM.md`

**Adds A-001..A-003 (AUTH_BLOCK) and P-006 D-HIST-001 (PORTABILITY_BLOCK):**
```json
{"id":"A-001","check":"controller-has-use-guards","severity":"AUTH_BLOCK",
 "description":"Every @Controller must have @UseGuards. Controller without guard = unprotected surface."}

{"id":"A-002","check":"routes-have-auth-declaration","severity":"AUTH_BLOCK",
 "description":"Every route must have @Roles() or @Public(). Route without either = implicit anonymous access."}

{"id":"A-003","check":"auth-tests-exist","severity":"AUTH_BLOCK",
 "description":"Controller spec must have 401 test (no JWT) and 403 test (wrong role)."}

{"id":"P-006","check":"no-sdk-imports-in-services","severity":"PORTABILITY_BLOCK",
 "description":"D-HIST-001: no @elastic/@anthropic/pg/ioredis imports in service files. Use fabric interfaces."}
```

AUTH_BLOCK: does not block monorepo deployment; blocks TIER-C certification and distribution.

---

### PHASE 12 — SK-553 portability test protocol v1.0.0 → v1.1.0

**File:** `code-execution--flow-portability-test-protocol-SKILL-SK-553.md`

Update to reference FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 (consolidated — supersedes v1.2 + extension).

**Key additions from v2.0:**
- Phase 0: auth pre-flight (Step A: JWT infra, Step B: test user creation, Step C: HTTP enforcement)
- Layer 1 Step 2: D-HIST-001 check (no SDK imports)
- Layer 2: full per-role cell matrix (not 7-cell minimum)
- Layer 3: Extended Axis B — per-role discipline (all N roles × 3 cells: en/he-RTL/mobile)
- Repo naming: `{tenantId}--{moduleName}` convention
- AI Adaptation Protocol Phase 5 expanded to 5a/5b/5c
- R6: cross-tenant JWT isolation
- Guard 14: TIER-C requires AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4
- Updated TIER-A/B/C/D definitions

**Add TIER-C pre-certification checklist (PER-FLOW-FIX-MAP-v2.9 §Guard 14):**
```
Before TIER-C certification — run this checklist:
  □ Guard 14: AUTH-PLAN v3 Phases 1-4 deployed?
      YES → run Phase 0 Auth Pre-flight
      NO  → mark AUTH_DEFERRED; flow may certify TIER-A or TIER-B only
  □ Repo naming: {tenantId}--{moduleName} applied?
  □ Repo evidence: GitHub listing screenshot at each cascade point?
  □ Per-role visual: all N roles × 3 cells (en/he-RTL/mobile) via SK-549?
  □ R6 auth isolation: cross-tenant JWT rejection tested?
```

Source document: FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md

---

### PHASE 13 — GUIDE-B17 implementation plan v6.2 → v6.3

**File:** `GUIDE-B17-IMPLEMENTATION-PLAN.md` (flow-prep library)

**Four changes:**

**1. Phase A gate — SK-554 type coverage (replaces "scope_isolation LAST" only):**
```bash
# Full type coverage check instead of just ordering:
tail -1 fixtures/arbiters/{slug}-arbiters.bulk.ndjson | grep -q '"scope_isolation"' || \
  { echo "FAIL: scope_isolation not last"; exit 1; }
SCOPE=$(jq '[.[] | select(.arbiterType=="scope_isolation")] | length' arbiters.ndjson)
NOTYPE=$(jq '[.[] | select(.arbiterType==null or .arbiterType=="")] | length' arbiters.ndjson)
[ "$SCOPE" -ge 1 ] || { echo "FAIL: no scope_isolation records"; exit 1; }
[ "$NOTYPE" -eq 0 ] || echo "WARN: $NOTYPE records without arbiterType"
```

**2. Phase B template — auth declaration step + D-HIST-001:**
Add after arbiter panel section:
```markdown
### Auth declaration (v6.3):
For any controller produced in Phase B:
  - @UseGuards(JwtAuthGuard, RolesGuard) before @Controller(...)
  - @Roles('role-string') or @Public() above each route method
  - List @Public() routes for BYPASS_PATHS update in Phase 4

D-HIST-001 check at Phase B close:
  grep -rn "^import.*from '@elastic|from '@anthropic|from 'pg'|from 'ioredis'" \
    server/src/engine/flows/{slug}/ --include="*.ts" | grep -v "fabrics/"
  Expected: 0 hits
```

**3. Phase H — Auth Decoration (mandatory for flows with HTTP controllers):**
```markdown
## PHASE H — AUTH DECORATION ★ MANDATORY for flows with HTTP controllers ★

### H.1 — V10 auth gate
[bash: V10 commands from flow-implementation-guide v1.3]

### H.2 — Rule 7 auth tests
npx jest --testPathPattern="{slug}" --testNamePattern="401|403|Unauthorized|Forbidden"
# Expected: ≥1 test each for 401 and 403

### Phase H gate
authStatus in STATE.json: AUTH_READY | AUTH_DEFERRED (with reason)
```

**4. Phase I — Tenant Certification Status (NEW):**
```markdown
## PHASE I — TENANT CERTIFICATION STATUS ★ MANDATORY for distributed flows ★

### I.1 — V11 tenant certification gate
[bash: V11 tier check commands from flow-implementation-guide v1.3]

### I.2 — TIER-C pre-certification checklist (from PER-FLOW-FIX-MAP-v2.9 §Guard 14)
  □ Guard 14 check (AUTH-PLAN v3 Phases 1-4 deployed?)
  □ flow_module_name FREEDOM key present in STEP-1-INVARIANTS
  □ Repo naming {tenantId}--{moduleName} verified
  □ Repo evidence PNG present (if TIER-B+)
  □ Per-role visual (all N roles × 3 cells) via SK-549 (if TIER-C target)
  □ R6 cross-tenant JWT isolation test (if TIER-C target)

### Phase I gate
tenantCertTier in STATE.json: TIER_A | TIER_B | TIER_C | TIER_D
```

---

### PHASE 14 — GUIDE-B19 TEACH-QA-R1-FINAL v1 → v2

**File:** `GUIDE-B19-TEACH-QA-R1-FINAL.md` (flow-prep library)

**Adds UC-7 — Full arbiter type coverage (references SK-554):**
```
□ UC-7: Arbiter NDJSON type coverage
  Run: jq '[.[]] | group_by(.arbiterType) | map({type: .[0].arbiterType, count: length})'
  Minimum required (from SK-554):
    - scope_isolation: ≥1 (mandatory for all flows)
    - security: ≥1 if PII/payments/identity-critical
    - domain: ≥3 if business logic
    - iron_rules: ≥1 if BFA CF rules
  arbiterType field: ALL records non-empty

  jq '[.[] | select(.arbiterType == null or .arbiterType == "")] | length'
  Expected: 0
```

UC-7 severity:
- `scope_isolation` absent → 🔴 CRITICAL (always produce R1-FINAL)
- `security` absent on PII/payment flow → 🔴 CRITICAL
- `domain` < 3 on business-logic flow → 🟠 HIGH
- empty arbiterType > 0 → 🟠 HIGH

---

### PHASE 15 — GUIDE-B21 STEP-1-INVARIANTS v3.1 → v3.2

**File:** `GUIDE-B21-STEP-1-INVARIANTS.md` (flow-prep library)

**Adds auth constraints block:**
```markdown
### Auth constraints (v3.2):
Routes produced by this flow:
  [List: GET /api/{slug}/items → @Roles('tenant-admin', 'tenant-user')]
  [List: GET /api/{slug}/public-info → @Public()]

Public routes (require BYPASS_PATHS entry):
  [List or declare "No public routes — all require valid JWT"]

Identity-critical detection:
  grep -rE "masterTenantId|superJudge|adminScope" server/src/engine/flows/{slug}/
  count > 0 → TIER 3 INELIGIBLE — document here
```

**Adds `flow_module_name` FREEDOM key (NEW from PORTABILITY-TEST-PROTOCOL-v2.0 + FORK-FLOW-ENGINE-PLAN-v1.2):**
```markdown
### FREEDOM key: flow_module_name (v3.2 — CF-FORK-01):
flow_module_name:
  defaultValue: '{flowSlug}'
  semantics: Display name of this module in the marketplace. AI adaptation MAY change
             this. Used as repo name suffix in {tenantId}--{moduleName} convention.
  irCitation: 'CF-FORK-01'
  profile: 2  (tenant can change)
  constraints: 'lowercase, hyphens allowed, no spaces, 3-50 chars'

Detection: grep "flow_module_name" docs/sessions/{slug}/STEP-1-INVARIANTS.md
Expected: present for any distributable flow
```

---

### PHASE 16 — GUIDE-B02 IMPL-STATE v6.1 → v6.2

**File:** `GUIDE-B02-IMPL-STATE-JSON.md` (flow-prep library)

**Adds fields to schema and template:**
```json
"authStatus": "TBD | AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE",
"authGaps": [],
"authTier": "TBD",
"tenantCertTier": "NONE | TIER_A | TIER_B | TIER_C | TIER_D",
"portabilityTest": {
  "layer1": {"status": "NOT_RUN | PASS | FAIL"},
  "layer2": {"status": "NOT_RUN | PASS | NOT_APPLICABLE"},
  "layer3": {"status": "NOT_RUN | PASS | NOT_APPLICABLE"}
}
```

---

### PHASE 17 — GUIDE-B03 PLAN-STATE v2.0 → v2.1

**File:** `GUIDE-B03-PLAN-STATE-JSON.md` (flow-prep library)

**Adds blocks to template:**
```json
"authConstraints": {
  "hasHttpControllers": null,
  "routeCount": 0,
  "publicRouteCount": 0,
  "requiredRoles": [],
  "identityCritical": false
},
"tenantCertTarget": "TIER_A | TIER_B | TIER_C | TIER_D"
```

---

### PHASE 18 — GUIDE-B04 QA-COVERAGE v3.1 → v3.2

**File:** `GUIDE-B04-QA-COVERAGE-STATE-JSON.md` (flow-prep library)

**Adds Q7 — Auth protection declared:**
```json
"Q7_auth_protection": {
  "verdict": "PASS | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE | TBD",
  "evidence": {"controllerCount": 0, "guardedCount": 0, "authTestsPresent": false},
  "gaps": []
}
```

**Adds Q8 — Tenant certification tier (NEW):**
```json
"Q8_tenant_cert_tier": {
  "verdict": "TIER_A | TIER_B | TIER_C | TIER_D | NOT_CERTIFIED | TBD",
  "evidence": {
    "sk553Layer1": "NOT_RUN | PASS | FAIL",
    "authStatus": "TBD | AUTH_READY | AUTH_DEFERRED",
    "repoNaming": "COMPLIANT | NOT_CHECKED",
    "perRoleVisual": "NOT_RUN | PASS | PARTIAL",
    "r6AuthIsolation": "NOT_RUN | PASS | FAIL"
  }
}
```

---

### PHASE 19 — prompt-to-claude v3.1 → v3.2

**File:** `prompt-to-claude.md` (flow-prep library)

**Adds Rule 8:** Phase H (auth decoration) mandatory for flows with HTTP controllers.
**Adds Rule 9:** Phase I (tenant certification) mandatory for distributed flows.
**Adds FP-7:** Controller generated without auth declarations.
**Adds FP-8:** No tenant cert tier declared for distributable flow.

---

### PHASE 20 — QA session type SK-481 v1.0.0 → v2.0.0

**File:** `planning--qa-session-type-SKILL.md`

**Adds Step 5b — Protocol Completeness Check:**
```
□ SK-553 Layer 1: PASS or NOT_RUN + documented deferral reason
□ SK-553 Phase 0 auth: PASS or AUTH_DEFERRED + reason
□ SK-554 scope_isolation records: ≥1 (BLOCKING if absent)
□ SK-554 no-type records: 0 (NON-BLOCKING if > 0)
□ D-HIST-001: 0 SDK imports in service files
□ Per-role visual [TIER-C targets]:
    All N roles × 3 cells (en/he-RTL/mobile) in coverage matrix
    jq '.cells | map(select(.axisB == null)) | length' ROUND-N-COVERAGE-MATRIX.json
    Expected: 0
□ R6 cross-tenant JWT [TIER-C targets]: evidence of Tenant B token rejected on Tenant C
□ Repo evidence [TIER-B+]: GitHub listing screenshot in docs/e2e-snapshots/{slug}/repo-evidence/
□ tenantCertTier in IMPL-STATE.json: not TBD
```

**QA-REPORT Protocol Completeness section:**
| Protocol | Status | Evidence |
|----------|--------|----------|
| SK-553 Layer 1 | PASS / NOT_RUN (deferred: reason) | IMPL-STATE.portabilityTest.layer1 |
| SK-553 Phase 0 auth | PASS / AUTH_DEFERRED (reason) | IMPL-STATE.authStatus |
| SK-554 scope_isolation | N records (≥1 required) | jq count |
| SK-554 no-type records | N (0 required) | jq count |
| D-HIST-001 SDK imports | N hits (0 required) | grep count |
| Per-role visual [TIER-C] | N/total cells complete | coverage matrix |
| R6 cross-tenant JWT [TIER-C] | PASS / NOT_RUN | evidence file |
| Repo evidence [TIER-B+] | present / absent | docs/e2e-snapshots/ |
| tenantCertTier | TIER_A/B/C/D | IMPL-STATE.tenantCertTier |

---

### PHASE 21 — GUIDE-B37 PHASE-COMPLETE v1 → v2.0

**File:** `GUIDE-B37-PHASE-COMPLETE.md` (flow-prep library)

**Adds mandatory Protocol Status block to Gate Results section:**
```markdown
### Protocol status (required — v2.0):
- portabilityStatus: MOBILE | PARTIAL_GAP | NOT_PORTABLE | TBD
  Evidence: V9 gate (must not be TBD at GOAL_REACHED)
- authStatus: AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE | TBD
  Evidence: V10 gate (must not be TBD at GOAL_REACHED)
- SK-553 Layer 1: PASS | NOT_RUN (if NOT_RUN: deferral reason + named follow-up session)
- NDJSON scope_isolation: N records (≥1 required)
- NDJSON no-type records: N (0 required)
- tenantCertTier: NONE | TIER_A | TIER_B | TIER_C | TIER_D
```

**GOAL_REACHED rules:**
- portabilityStatus = TBD → FAIL (V9 must have run)
- authStatus = TBD → FAIL (V10 must have run)
- AUTH_DEFERRED + PARTIAL_GAP acceptable with documented reason

**Adds tenantCertTier column to per-phase summary table.**

---

### PHASE 22 — GUIDE-B38 STATE-JSON v1 → v2.0

**File:** `GUIDE-B38-STATE-JSON.md` (flow-prep library)

**Adds fields to execution-time STATE.json template:**
```json
{
  "portabilityStatus": "TBD | MOBILE | PARTIAL_GAP | NOT_PORTABLE",
  "portabilityGaps": [],
  "authStatus": "TBD | AUTH_READY | AUTH_GAP | AUTH_DEFERRED | NOT_APPLICABLE",
  "authGaps": [],
  "tenantCertTier": "NONE | TIER_A | TIER_B | TIER_C | TIER_D",
  "protocolStatus": {
    "sk553Layer1": "NOT_RUN | PASS | FAIL",
    "sk553Phase0": "NOT_RUN | PASS | AUTH_DEFERRED",
    "ndjsonScopeIsolation": 0,
    "ndjsonNoTypeRecords": 0,
    "dHist001SdkImports": 0
  }
}
```
Updated by V9 (portabilityStatus), V10 (authStatus), V11 (tenantCertTier),
Phase G/H/I gates in GUIDE-B17.

---

### PHASE 23 — flow-lifecycle v1.0 → v1.1

**File:** `code-execution--flow-lifecycle-SKILL.md`

**Extended state model (from PORTABILITY-TEST-PROTOCOL-v2.0 TIER model):**
```
INJECTING → GENERATING → INTEGRATING → ACTIVE
                                         ↓
                                      MOBILE (V9 passes: P-1..P-5)
                                         ↓
                                      AUTH_READY (V10 passes: A-1..A-3)
                                         ↓
                                      TIER_A_CERTIFIED (SK-553 Layer 1 PASS)
                                         ↓
                                      TIER_B_CERTIFIED (+repo naming +repo evidence)
                                         ↓
                                      TIER_C_CERTIFIED (+Guard14 +R6 +per-role visual)
```

Guard 14 enforced at TIER_C: AUTH-ROLES-GROUPS-PLAN v3 Phases 1-4 required.
Any state → AUTH_DEFERRED: explicit deferral in STATE.json.

---

### PHASE 24 — CODE-REVIEW-PROTOCOL v2.0 → v2.1

**File:** `XIIGEN-CODE-REVIEW-PROTOCOL-v2.0.md`

**Adds FC-22 — Definition of Done Protocol Reference:**
```
FC-22:
  For any delivery plan claiming flow completion:
  □ portabilityStatus target declared
  □ authStatus target declared
  □ SK-553 Layer 1 referenced as delivery gate OR explicit deferral
  □ For TIER-C claims: Guard 14 checked (AUTH-PLAN v3 Phases 1-4 deployed?)
  □ For TIER-C claims: R6 cross-tenant JWT isolation test mentioned

  Evidence required: IMPLEMENTATION or TEST (not DESIGN_DOC)
  FAIL if: plan claims TIER-C without Guard 14 mention
  FAIL if: plan claims "done" with TBD portabilityStatus or TBD authStatus
```

---

### PHASE 25 — HOW-TO-USE-SKILLS v5.2 → v5.3

**File:** `HOW-TO-USE-SKILLS.md`

**New activation triggers (appended to Layer 1 and governance triggers):**
```
| Service file with @elastic/@anthropic/pg/ioredis import | dna-compliance-guard v1.2 D-HIST-001 |
| Flow planning: flow will be distributed | GUIDE-B21 v3.2 flow_module_name FREEDOM key |
| Flow phase close targeting TIER-C | SK-553 v1.1 TIER-C checklist (Guard 14 + R6 + per-role) |
| Phase close — any flow | test-integrity v2.2 Rule 8 cross-tenant JWT |
| QA session on Phase F/G/H/I | SK-481 v2.0 Step 5b protocol completeness |
| Authoring PHASE-COMPLETE.md | GUIDE-B37 v2 protocol status block required |
| Authoring STATE.json | GUIDE-B38 v2 portabilityStatus + authStatus + tenantCertTier |
| Plan claiming TIER-C | plan-review-skill v2.1 FC-21 Guard 14 check |
| Formal delivery plan review | CODE-REVIEW-PROTOCOL v2.1 FC-22 |
| Flow lifecycle transition | flow-lifecycle v1.1 TIER state model |
| ARCHITECT session start | SESSION-START-PROMPT v5.2 ARCHITECT discipline rules |
```

**Layer 1 version bumps:**
```
dna-compliance-guard v1.2.0 — A-1..A-3 + D-HIST-001 ← v5.3
generated-code-review v1.2.0 — Layer 5 auth + D-HIST-001 in Layer 2 ← v5.3
flow-implementation-guide v1.3.0 — V10 auth + V11 cert tier ← v5.3
phase-preflight v1.2.0 — check #6 auth infra ← v5.3
test-integrity v2.2.0 — Rule 7 auth + Rule 8 cross-tenant JWT ← v5.3
self-verification v1.2.0 — AUTH_PROTECTION_ADDITION ← v5.3
retroactive-development v1.2.0 — auth fix table ← v5.3
flow-prerequisites v1.1.0 — P-5 auth prereq ← v5.3
SK-554 arbiter-ndjson-requirements v1.0.0 — NEW ← v5.3
SK-553 v1.1.0 — v2.0 protocol + TIER checklist + R6 ← v5.3
```

**Backward compatibility v5.2 → v5.3:** All additive. Sessions under v5.2 continue.
Must adopt v5.3 for next session start.

**Human action required:**
1. Replace code execution skill files with v1.2.0/v2.2.0 versions
2. Add SK-554 to .claude/skills/code-execution/
3. Replace GUIDE-B17/B19/B21/B02/B03/B04/B37/B38/prompt-to-claude in flow-prep library
4. Replace CODE-REVIEW-PROTOCOL with v2.1
5. Replace HOW-TO-USE with v5.3
6. Replace SESSION-START-PROMPT with v5.2 (after Phase 27 approval)
7. Upload SKILL-INDEX v4.4.0 to project knowledge

---

### PHASE 26 — SKILL-INDEX v4.3.0 → v4.4.0

**File:** `SKILL-INDEX-v4.3.0.md`

**Code execution skills table updates:**
| Skill | From | To | What changed |
|-------|------|-----|-------------|
| SK-554 arbiter-ndjson-requirements | NEW | 1.0.0 | NDJSON minimum type matrix |
| SK-553 portability test protocol | 1.0.0 | 1.1.0 | v2.0 protocol reference; TIER checklist; R6 |
| dna-compliance-guard | 1.1.0 | 1.2.0 | A-1..A-3 auth + D-HIST-001 |
| generated-code-review | 1.1.0 | 1.2.0 | Layer 5 auth + D-HIST-001 in Layer 2 |
| flow-implementation-guide | 1.2.0 | 1.3.0 | V10 auth + V11 tenant cert tier |
| phase-preflight | 1.1.0 | 1.2.0 | Check #6 auth infra |
| test-integrity | 2.1.0 | 2.2.0 | Rule 7 + Rule 8 cross-tenant JWT |
| self-verification | 1.1.0 | 1.2.0 | AUTH_PROTECTION_ADDITION |
| retroactive-development | 1.1.0 | 1.2.0 | Auth fix table |
| flow-prerequisites | 1.0.0 | 1.1.0 | P-5 auth infra prereq |
| QA session type SK-481 | 1.0.0 | 2.0.0 | Step 5b protocol completeness |
| flow-lifecycle | 1.0.0 | 1.1.0 | TIER_A/B/C/D state model |

**Reference documents table updates:**
| Document | From | To | What changed |
|----------|------|-----|-------------|
| CODE-REVIEW-PROTOCOL | 2.0 | 2.1 | FC-22 definition of done |
| GUIDE-B17 | 6.2 | 6.3 | Phase A/B/H/I |
| GUIDE-B19 | v1 | v2 | UC-7 arbiter type coverage |
| GUIDE-B21 | 3.1 | 3.2 | Auth constraints + flow_module_name |
| GUIDE-B02 | 6.1 | 6.2 | authStatus + tenantCertTier |
| GUIDE-B03 | 2.0 | 2.1 | authConstraints + tenantCertTarget |
| GUIDE-B04 | 3.1 | 3.2 | Q7 auth + Q8 cert tier |
| GUIDE-B37 | v1 | v2 | Protocol status block |
| GUIDE-B38 | v1 | v2 | portabilityStatus + authStatus + certTier |
| prompt-to-claude | 3.1 | 3.2 | Rule 8 + Rule 9 + FP-7/FP-8 |
| SESSION-START-PROMPT | 5.1 | 5.2 | ARCHITECT discipline (Phase 27) |

**GAPS CLOSED IN v4.4.0:** 30 entries.
**Total:** 129 skills (+1 SK-554). **Next available:** SK-555.

---

### PHASE 27 — SESSION-START-PROMPT v5.1 → v5.2

**File:** `XIIGEN-SESSION-START-PROMPT-v5_1.md` → `XIIGEN-SESSION-START-PROMPT-v5_2.md`

**Adds ARCHITECT discipline (from Luba's direct correction — Problem D):**

Current ARCHITECT section says:
> "Scope-out: file edits, diffs, turn-numbered plans, shell commands (SK-535)."

This allows ARCHITECT sessions to produce design artifacts that are NOT execution-ready plans, and allows negative feedback in source documents to be bypassed.

**New ARCHITECT rules (v5.2):**

```
ARCHITECT SESSION DISCIPLINE (new v5.2):

Rule A-1 — PLANNING MODE ALWAYS:
  ARCHITECT stays in planning mode at all times.
  ARCHITECT never produces deliverables (code, files, fixes, shell commands)
  UNLESS:
    (a) Luba explicitly requests a specific deliverable, AND
    (b) A plan for that deliverable has been presented and approved.
  Producing a deliverable without (a)+(b) = ARCHITECT mode violation.
  Detection: if the session produces a .ts/.md/.json file without plan approval → STOP.

Rule A-2 — PLAN WHEN ASKED:
  If Luba asks for a plan → produce an execution-ready plan document (same standards
  as PLANNING session: FC gates, session files, SK-443 self-containment).
  If Luba asks for a discussion → discuss. Give highest priority to Luba's directions.

Rule A-3 — NEGATIVE FEEDBACK CANNOT BE IGNORED:
  Negative feedback in ANY source must surface in the current session:
    - Prior round corrections (ROUND CONTRACT Check 3)
    - Corrections in uploaded documents
    - Corrections in discussion history
    - Any "no", "wrong", "stop", "you missed", "I said" signal
  Ignoring negative feedback from ANY source = BC-class behavioral violation.
  Before any synthesis: scan all uploaded documents for negative feedback signals.
  If found: surface them BEFORE producing any analysis.

Rule A-4 — MD FILE WHEN REQUESTED:
  If Luba asks for a plan document → produce an .md file via present_files.
  Describing the plan in chat text when .md was requested = ignored instruction.
  "Then produce please md united plan" = explicit .md file request.
  Response to explicit .md file request: write the file, call present_files, stop.
```

**Add to ROUND CONTRACT (Check 3 extension):**
```
Check 3 (extended for ARCHITECT sessions):
  Before drafting: scan ALL uploaded documents for:
    - Text containing "wrong", "no", "missed", "ignored", "again", frustration signals
    - Items from prior rounds that were not addressed
  If found → the correction is the FIRST item in this response, before any analysis.
  "Again — I am asking" = correction signal. Address it first.
```

**Add to Q1 — Session type classification:**
```
ARCHITECT (xiigen architect) classification:
  When Luba says "architect", "xiigen architect", or starts a structural
  discussion session: classify as ARCHITECT.
  ARCHITECT inherits ALL PLANNING session governance (SK-528, FC gates,
  goal context persistence, specificity calibration).
  ARCHITECT scope-out: file edits, code, shell commands, deliverables.
  ARCHITECT scope-in: design artifacts, trade-off analysis, plan documents
    (when explicitly requested), direction-giving, synthesis.
  ARCHITECT is NOT exempt from plan production — if a plan is asked for,
  it must meet PLANNING session standards.
```

---

## COMPLETE EDIT INVENTORY — 27 PHASES

| Phase | File | From | To | What's added | Problem(s) closed |
|-------|------|------|----|-------------|------------------|
| 1 | NEW SK-554 arbiter-ndjson-requirements | — | 1.0.0 | NDJSON minimum type matrix | B |
| 2 | dna-compliance-guard | 1.1.0 | 1.2.0 | A-1..A-3 auth + D-HIST-001 | A + NEW |
| 3 | generated-code-review | 1.1.0 | 1.2.0 | Layer 5 auth + D-HIST-001 Layer 2 | A + NEW |
| 4 | flow-implementation-guide | 1.2.0 | 1.3.0 | V10 auth + V11 cert tier | A + NEW |
| 5 | phase-preflight | 1.1.0 | 1.2.0 | Check #6 auth infra | A |
| 6 | test-integrity | 2.1.0 | 2.2.0 | Rule 7 (401/403) + Rule 8 (cross-tenant JWT) | A + NEW |
| 7 | self-verification | 1.1.0 | 1.2.0 | AUTH_PROTECTION_ADDITION category | A |
| 8 | retroactive-development | 1.1.0 | 1.2.0 | Auth fix propagation table | A |
| 9 | flow-prerequisites | 1.0.0 | 1.1.0 | P-5 auth infra prereq | A |
| 10 | plan-review-skill | 2.0.0 | 2.1.0 | FC-19/20/21 + Guard 14 | A + B + C |
| 11 | flow-design-check-catalog | v1 | v2 | A-001..A-003 + P-006 D-HIST-001 | A + NEW |
| 12 | SK-553 portability test protocol | 1.0.0 | 1.1.0 | v2.0 protocol; TIER-C checklist; R6; per-role | C + NEW |
| 13 | GUIDE-B17 implementation plan | 6.2 | 6.3 | Phase A/B auth gates + Phase H auth + Phase I cert | A + B + C + NEW |
| 14 | GUIDE-B19 TEACH-QA-R1-FINAL | v1 | v2 | UC-7 full arbiter type coverage | B |
| 15 | GUIDE-B21 STEP-1-INVARIANTS | 3.1 | 3.2 | Auth constraints + flow_module_name FREEDOM key | A + NEW |
| 16 | GUIDE-B02 IMPL-STATE | 6.1 | 6.2 | authStatus + authGaps + tenantCertTier | A + NEW |
| 17 | GUIDE-B03 PLAN-STATE | 2.0 | 2.1 | authConstraints + tenantCertTarget | A + NEW |
| 18 | GUIDE-B04 QA-COVERAGE | 3.1 | 3.2 | Q7 auth protection + Q8 tenant cert tier | A + NEW |
| 19 | prompt-to-claude | 3.1 | 3.2 | Rule 8 + Rule 9 + FP-7 + FP-8 | A + NEW |
| 20 | QA session type SK-481 | 1.0.0 | 2.0.0 | Step 5b: protocol completeness + per-role visual | C + NEW |
| 21 | GUIDE-B37 PHASE-COMPLETE | v1 | v2.0 | Protocol status block + cert tier column | C + NEW |
| 22 | GUIDE-B38 STATE-JSON | v1 | v2.0 | portabilityStatus + authStatus + tenantCertTier | C + NEW |
| 23 | flow-lifecycle | 1.0.0 | 1.1.0 | MOBILE + AUTH_READY + TIER_A/B/C/D states | C + NEW |
| 24 | CODE-REVIEW-PROTOCOL | 2.0 | 2.1 | FC-22 definition of done + Guard 14 | C |
| 25 | HOW-TO-USE-SKILLS | 5.2 | 5.3 | All triggers + ARCHITECT rule ref + layer bumps | Registry |
| 26 | SKILL-INDEX | 4.3.0 | 4.4.0 | SK-554 + all bumps + 30-entry GAPS CLOSED | Registry |
| 27 | SESSION-START-PROMPT | 5.1 | 5.2 | ARCHITECT rules A-1..A-4 + Check 3 extension | D |

---

## DEPENDENCY ORDER

```
Phase 1 (SK-554)       → required by Phases 10, 13, 14
Phase 12 (SK-553 v1.1) → required by Phases 20, 21, 23
Phase 4 (flow-impl v1.3) → required by Phases 21, 22, 23
Phases 2-9             → independent of each other
Phases 13-19           → independent guidance edits
Phase 20               → requires Phase 12
Phase 21               → requires Phases 4, 12
Phase 22               → requires Phases 4, 12
Phase 23               → requires Phase 4
Phases 25, 26          → last (reference all prior phases)
Phase 27 (SESSION-START-PROMPT) → independent; may execute any time
```

---

## DEFINITION OF DONE (after all 27 phases)

A flow is DONE when ALL of the following are documented (AUTH_DEFERRED and
PARTIAL_GAP acceptable with explicit documented reasons):

```
Development (flow-implementation-guide v1.3):
  V9  portabilityStatus ≠ TBD
  V10 authStatus ≠ TBD
  V11 tenantCertTier declared

Code gate (dna-compliance-guard v1.2):
  A-1: every controller has @UseGuards
  A-2: every route has @Roles or @Public()
  D-HIST-001: 0 direct SDK imports in service files

Code review (generated-code-review v1.2):
  Layer 5: auth declarations present — valid DPO chosen candidate

Tests (test-integrity v2.2):
  Rule 7: 401/403/200 tests exist for all controllers
  Rule 8: cross-tenant JWT isolation test (or documented NOT_RUN for TIER-A)

Plan review (plan-review-skill v2.1):
  FC-19: auth requirements declared in plan
  FC-20: NDJSON type coverage per SK-554
  FC-21: SK-553 protocol referenced; Guard 14 checked for TIER-C

QA (SK-481 v2.0 Step 5b):
  SK-553 Layer 1: PASS or NOT_RUN with deferral
  SK-553 Phase 0: PASS or AUTH_DEFERRED
  SK-554 scope_isolation: ≥1 record
  D-HIST-001: 0 SDK import hits
  Per-role visual: if TIER-C target
  R6 cross-tenant JWT: if TIER-C target
  tenantCertTier declared

PHASE-COMPLETE (GUIDE-B37 v2):
  Protocol status block present; portabilityStatus + authStatus ≠ TBD

Lifecycle (flow-lifecycle v1.1):
  tenantCertTier state: NONE → TIER_A → TIER_B → TIER_C → TIER_D

ARCHITECT sessions (SESSION-START-PROMPT v5.2):
  Stay in planning mode; no deliverables without plan approval
  Negative feedback from ANY source surfaces before analysis
  MD file produced when explicitly requested (not chat-only)
```

---

## ⛔ STOP — AWAITING LUBA APPROVAL
27 phases listed. No files edited. Plan only.
