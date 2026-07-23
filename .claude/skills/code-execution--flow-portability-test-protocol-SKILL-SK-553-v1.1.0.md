---
name: flow-portability-test-protocol
sk_number: SK-553
version: "1.1.0"
load_order: null
priority: HIGH
status: APPROVED
category: code-execution
author: luba
updated: "2026-04-24"
contexts: ["claude-code", "web-session"]
description: >
  Converts a MOBILE flow into a TENANT-READY flow. v1.0 covered Layers 1-3
  from FLOW-PORTABILITY-TEST-PROTOCOL-v1.2. v1.1 integrates the consolidated
  FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 in full: Phase 0 auth pre-flight, D-HIST-001
  in Layer 1, full per-role cell matrix in Layer 2, Extended Axis B per-role
  in Layer 3, repo naming {tenantId}--{moduleName}, R6 cross-tenant JWT isolation,
  Guard 14 (TIER-C requires AUTH-PLAN v3 Phases 1-4), updated TIER-A/B/C/D
  definitions, and PFM v2.9 TIER-C pre-certification checklist embedded.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 12.
triggers:
  - "portability test"
  - "tenant-ready"
  - "MOBILE to tenant-ready"
  - "portability protocol"
  - "Layer 1 portability"
  - "Layer 2 portability"
  - "Layer 3 portability"
  - "PROOF-1"
  - "PROOF-5"
  - "PROOF-7"
  - "flow distribution"
  - "fork repo"
  - "TIER-A"
  - "TIER-B"
  - "TIER-C"
  - "TIER-D"
  - "Guard 14"
  - "R6 auth isolation"
  - "per-role visual"
  - "repo naming"
  - "flow_module_name"
---

# Flow Portability Test Protocol (SK-553) v1.1

## WHAT THIS SKILL DOES

Converts a MOBILE flow into a TENANT-READY flow, progressing through TIER-A,
TIER-B, TIER-C, and TIER-D certification levels.

**MOBILE** = the flow's code is portable by construction (P-1..P-5 from
dna-compliance-guard v1.2.0 all pass). Mobile does NOT mean tenant-ready.

**TENANT-READY** = a second tenant can fork, adapt, test, and publish the flow
independently — with layered evidence.

**Source document:** `FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.md`
(consolidated — supersedes v1.2 + auth extension v1.0 separately)

**Prerequisite before running this skill:**
```bash
grep "portabilityStatus" docs/sessions/{slug}/IMPL-STATE.json
# Expected: "MOBILE"
# If "PARTIAL_GAP" or "NOT_PORTABLE": fix gaps first (dna-compliance-guard v1.2.0 V9)
```

---

## FLOW READINESS TIERS

Certification is incremental. A flow earns its current tier and upgrades when
prerequisites become available.

| Tier | Requirements | Auth status |
|------|-------------|-------------|
| **TIER-A** | Layer 1 PASS (or AUTH_DEFERRED documented) | AUTH_DEFERRED acceptable |
| **TIER-B** | TIER-A + repo named `{tenantId}--{moduleName}` + repo evidence PNG | AUTH_DEFERRED acceptable |
| **TIER-C** | TIER-B + AI Adaptation Phases 1-5 + per-role visual + R6 auth isolation | **Guard 14 required** (AUTH-PLAN v3 Phases 1-4 deployed) |
| **TIER-D** | All layers + SK-549 full per-role coverage at all cascade points | All R6 isolation certified |

**Guard 14 (from MODULE-SEPARATION-FIX-PLAN-v5.0):**
No flow may reach TIER-C until AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 have been
deployed. Flows may reach TIER-A and TIER-B without auth deployed — mark Phase 0
as `AUTH_DEFERRED`. Upgrade to TIER-C after auth ships.

---

## PHASE 0 — AUTH PRE-FLIGHT GATE — NEW v1.1

### Available: after AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 deployed
### (or mark AUTH_DEFERRED and proceed with Layers 1-3 using mock role params)
### Certifies: JWT enforcement + per-role access + cross-tenant isolation foundation

If auth infrastructure is absent: mark this phase `AUTH_DEFERRED`, record in
STATE.json, and proceed to Layer 1. Do NOT block Layer 1 on auth deployment.

**Step A — Verify JWT infrastructure in fork repo**
```bash
# In the tenant's fork repo:
grep "JwtAuthGuard\|APP_GUARD.*Jwt" server/src/app.module.ts
# Expected: JwtAuthGuard registered as APP_GUARD

grep "ScopeEnrichmentInterceptor\|APP_INTERCEPTOR" server/src/app.module.ts
# Expected: ScopeEnrichmentInterceptor registered

ls server/src/kernel/role-strings.ts
# Expected: file exists

curl -s http://localhost:9200/xiigen-user-roles/_mapping | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('PRESENT' if d else 'MISSING')"
# Expected: PRESENT
```

**Step B — Create test users with the flow's roles**
```bash
# Create one test user per role defined for this flow
# Roles from STEP-1-INVARIANTS.md auth constraints section
# For each role ROLE.X: POST /api/auth/register { email, password, tenantId, role: ROLE.X }
```

**Step C — Verify authentication enforcement**
```bash
# For each protected route:
curl -s http://localhost:3000/api/{flow-slug}/items | jq '.statusCode'
# Expected: 401 (no JWT — JwtAuthGuard active)

# For each wrong-role request:
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"wrong-role@test.com","password":"test","tenantId":"tenant-a"}' \
  | jq -r '.accessToken')
curl -s http://localhost:3000/api/{flow-slug}/admin-items \
  -H "Authorization: Bearer $TOKEN" | jq '.statusCode'
# Expected: 403 (authenticated but wrong role — RolesGuard active)
```

**Phase 0 certification output:**
```
FLOW-[XX] Phase 0 Auth Pre-flight: PASS | AUTH_DEFERRED
Date: [date]
JWT enforcement: 401 on unauthenticated ✅
Role enforcement: 403 on wrong role ✅
Evidence: [screenshot or curl output file path]
```

---

## LAYER 1 — Unit Test Gate

### Available: immediately for every flow
### Certifies: Req-1 (decoupling) + Req-4 (independent test)

**Step 1 — Pre-flight: confirm baseline**
```bash
cd /path/to/tenant-fork-repo
npm install
npx jest
# Record baseline: N tests, N passing
# GR-001: baseline must show 0 failures — not "same as monorepo baseline"
```

**Step 2 — DNA compliance scan (updated v1.1: D-HIST-001 added)**
```bash
echo "P-1: No ClsService" && \
  grep -rc "import.*ClsService\|from 'nestjs-cls'" \
  server/src/engine/flows/{slug}/ --include="*.service.ts" \
  | awk -F: '{sum+=$2} END {print sum+0}'
# Expected: 0

echo "DNA-4: all services extend MicroserviceBase" && \
  grep -rn "^export class.*Service" server/src/engine/flows/{slug}/ \
  --include="*.ts" | grep -v "extends MicroserviceBase\|.spec." | wc -l
# Expected: 0

echo "DNA-5: no tenantId as parameter" && \
  grep -rn "tenantId.*:" server/src/engine/flows/{slug}/ --include="*.ts" \
  | grep -v "ALS\|context\|.spec.\|// \|Record\|string}" | wc -l
# Expected: 0

echo "D-HIST-001: no SDK imports in service files" && \
  grep -rn "^import.*from '@elastic\|from '@anthropic\|from 'pg'\|from 'ioredis'" \
  server/src/engine/flows/{slug}/ --include="*.ts" \
  | grep -v "fabrics/implementations\|.spec." | wc -l
# Expected: 0
# VIOLATION: direct SDK import breaks fork repo at npm install
# FIX: use IDatabaseService, IAIService, IQueueService fabric interfaces
```

**Step 3 — Connection annotation check (P-2)**
```bash
grep -rL "@connectionType" server/src/engine/flows/{slug}/ --include="*.service.ts"
# Expected: no output (all annotated)
```

**Step 4 — Behavioral assertion check (D2-F1)**
```bash
STUBS=$(grep -rcE "expect\(true\)\.toBe\(true\)|expect\(result\.success\)\.toBe\(true\)$" \
  server/src/engine/flows/{slug}/ --include="*.spec.ts" | wc -l)
echo "Stub assertions: $STUBS"   # Expected: 0

BEHAVIORAL=$(grep -rcE "result\.data\[|result\.data\.|toHaveBeenCalledWith" \
  server/src/engine/flows/{slug}/ --include="*.spec.ts" | wc -l)
echo "Behavioral assertions: $BEHAVIORAL"   # Expected: > 0
```

**Step 5 — Tenant isolation test**
```typescript
it('should isolate data between tenants', async () => {
  clsMock.get.mockReturnValue('tenant-alpha');
  await service.execute(validInput);
  clsMock.get.mockReturnValue('tenant-beta');
  const result = await service.queryMethod({});
  expect((result.data as unknown[]).length).toBe(0);
  // If this fails: tenant isolation is broken — BLOCKING, do not ship
});
```

**Layer 1 PASS criteria:**
- D-HIST-001: 0 direct SDK imports
- P-1: 0 ClsService imports
- P-2: 100% service files annotated
- DNA-4/5: 0 violations
- D2-F1: 0 stub tests, ≥1 behavioral assertion per service
- Tenant isolation test: PASS

**Layer 1 certification output:**
```
FLOW-[XX] Layer 1 PASS
Date: [date]
Tests: N/N passing
DNA scan: 0 violations
D-HIST-001: 0 SDK imports
Behavioral assertion: present
Tenant isolation: verified
Req-1 PROVEN: services construct without NestJS DI
Req-4 PROVEN: tests run in fork repo without monorepo
```

---

## LAYER 2 — Playwright e2e Gate

### Available: when Playwright tests exist for the flow
### Certifies: Req-4 extended + full per-role cell matrix

**Full per-role cell matrix (NEW v1.1 — replaces 7-cell minimum):**

Every cell must be captured and examined. The minimum is all N roles × 3 cells:

```
{role} × en (desktop)
{role} × he-RTL (right-to-left)
{role} × mobile (375px viewport)
```

**Reading the flow's role list:**
```bash
grep -A 20 "Auth constraints\|requiredRoles\|@Roles" \
  docs/sessions/{slug}/STEP-1-INVARIANTS.md \
  | grep -E "ROLE\.\w+|tenant_admin|tenant_user|platform_support|platform_admin"
```

**Cell matrix template:**
```
| Role | en-desktop | he-RTL | mobile |
|------|-----------|--------|--------|
| [ROLE.TENANT_ADMIN] | PNG + SK-549 | PNG + SK-549 | PNG + SK-549 |
| [ROLE.TENANT_USER]  | PNG + SK-549 | PNG + SK-549 | PNG + SK-549 |
| [ROLE.PLATFORM_SUPPORT] | PNG + SK-549 | PNG + SK-549 | PNG + SK-549 |
```

For each cell: capture PNG via Playwright, run SK-549 7-axis validation,
record in ROUND-N-COVERAGE-MATRIX.json.

---

## LAYER 3 — Visual Examination Gate

### Available: when baseline PNG captures exist
### Certifies: Req-3 (AI adaptation surface visible) + Extended Axis B per-role

**Prerequisites:**
```
Prerequisites: per-image-validation loaded
  Load: read code-execution/per-image-validation-SKILL.md (SK-549) completely
```

**Extended Axis B — Per-Role Content Verification (NEW v1.1):**

Every SK-549 block must include a per-role row verifying that:
- The correct role-specific content is shown (tenant_admin sees admin controls)
- Role-restricted content is NOT shown to lower-privilege roles
- Business-logic phase state matches what this role should see at this state

```
Extended Axis B verdict per cell:
  PASS     — content shown matches role's expected access
  FAIL     — wrong content shown (too much or too little for this role)
  NOT_TESTABLE — role not yet seeded in test environment
```

**Layer 3 PASS criteria:**
All primary cells (all N roles × en-desktop minimum) have SK-549 Axis D PASS.
For TIER-C: all N roles × 3 cells (en/he-RTL/mobile) have SK-549 Axis B PASS.

---

## R6 — AUTH ISOLATION REQUIREMENT (NEW v1.1)

### Required for: TIER-C and TIER-D certification
### Certifies: Cross-tenant JWT isolation at HTTP layer

**R6 Authorization:** Every role defined for this flow can reach the content it should
see (200), cannot reach content it must not (403), and cross-tenant JWT isolation holds
(Tenant B's token rejected on Tenant C's routes).

**R6 evidence required:**
1. Phase 0 Step C: auth enforcement output (HTTP codes table)
2. Cross-tenant JWT isolation test (from test-integrity v2.2.0 Rule 8):
   ```bash
   # Tenant B token on Tenant C route must return 401 or 403
   TOKEN_B=$(login_as_tenant_b)
   curl -H "Authorization: Bearer $TOKEN_B" \
     http://localhost:3000/api/{flow-slug}/tenant-c-resource | jq '.statusCode'
   # Expected: 401 or 403 — NOT 200
   ```
3. Layer 3 Axis B per-role verdicts: PASS for all N roles

**R6 must pass at EACH cascade point independently.**
Passing at Tenant A does not certify Tenant B or Tenant C.

---

## REPO NAMING CONVENTION (NEW v1.1)

**Required for: TIER-B and above**

New convention: `{tenantId}--{moduleName}` (replaces `xiigen-{slug}-{tenantId}`)

Where:
- `{tenantId}` = the tenant's configured ID (e.g. `acme-corp`)
- `{moduleName}` = the module's current name from FREEDOM key `flow_module_name`
- Separator: `--` (double dash)

**Examples:**
| Scenario | Repo name |
|----------|-----------|
| Acme Corp forks user-registration | `acme-corp--user-registration` |
| Acme Corp AI-renames it to "quick-signup" | `acme-corp--quick-signup` |
| TechStartup forks same flow | `techstartup--user-registration` |

**`flow_module_name` FREEDOM key (must be declared in STEP-1-INVARIANTS.md Phase F):**
```typescript
flow_module_name: {
  defaultValue: '{flowSlug}',
  semantics: 'Display name of this module. AI adaptation MAY rename. Used as repo name suffix.',
  irCitation: 'CF-FORK-01',
  profile: 2,
  constraints: 'lowercase, hyphens allowed, no spaces, 3-50 chars'
}
```

**Verification:**
```bash
grep "flow_module_name" docs/sessions/{slug}/STEP-1-INVARIANTS.md
# Expected: present for any TIER-B+ flow
```

**Repo evidence (required for TIER-B):**
Screenshot of GitHub listing showing `{tenantId}--{moduleName}` repo at each
cascade point. Save to: `docs/e2e-snapshots/{slug}/repo-evidence/`

---

## TIER-C PRE-CERTIFICATION CHECKLIST (from PER-FLOW-FIX-MAP-v2.9 §Guard 14)

Before recording TIER-C in STATE.json — every item must be verified:

```
□ Guard 14: AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 deployed?
    YES → run Phase 0 Auth Pre-flight (Steps A/B/C above)
    NO  → mark AUTH_DEFERRED; flow may certify TIER-A or TIER-B only

□ flow_module_name FREEDOM key declared in STEP-1-INVARIANTS.md?
    grep "flow_module_name" docs/sessions/{slug}/STEP-1-INVARIANTS.md
    Expected: present

□ Repo naming: {tenantId}--{moduleName} convention applied in ForkFlowHandlerService?
    grep "{tenantId}--{moduleName}\|tenantId.*--.*moduleName" \
      server/src/engine/flows/{fork-slug}/*.service.ts
    Expected: present

□ Repo evidence: GitHub listing screenshot captured for each tenant cascade point?
    ls docs/e2e-snapshots/{slug}/repo-evidence/*.png | wc -l
    Expected: ≥ 1 per cascade tenant

□ Per-role visual: all N roles × 3 cells (en/he-RTL/mobile) examined via SK-549?
    jq '[.cells | map(select(.axisB == null))] | length' \
      docs/e2e-snapshots/{slug}/ROUND-N-COVERAGE-MATRIX.json
    Expected: 0 (no unexamined Axis B cells)

□ R6 auth isolation: cross-tenant JWT rejection tested?
    grep -rcE "cross.tenant|tenantB.*token|JWT.*isolation" \
      server/src/engine/flows/{slug}/ --include="*.spec.ts"
    Expected: ≥ 1 test
```

---

## CERTIFICATION RECORD (updated v1.1)

After each phase/layer passes, update STATE.json:

```json
{
  "portabilityStatus": "MOBILE",
  "portabilityTest": {
    "phase0Auth": {
      "status": "PASS | AUTH_DEFERRED",
      "date": "[date]",
      "evidence": "docs/e2e-snapshots/{slug}/phase0-auth-enforcement.txt"
    },
    "layer1": {
      "status": "PASS",
      "date": "[date]",
      "evidence": {
        "connectionAnnotations": "N/N service files annotated",
        "clsServiceHits": 0,
        "dHist001SdkImports": 0,
        "stubTests": 0,
        "behavioralAssertions": "N per service",
        "tenantIsolation": "PASS"
      }
    },
    "layer2": { "status": "PENDING | PASS | NOT_APPLICABLE" },
    "layer3": { "status": "PENDING | PASS | NOT_APPLICABLE" },
    "r6AuthIsolation": { "status": "NOT_RUN | PASS | FAIL" },
    "repoNaming": { "convention": "{tenantId}--{moduleName}", "verified": false },
    "repoEvidence": { "screenshots": 0 }
  },
  "tenantCertTier": "NONE | TIER_A | TIER_B | TIER_C | TIER_D",
  "tenantReadyStatus": "LAYER_1_CERTIFIED | LAYER_2_CERTIFIED | FULLY_CERTIFIED"
}
```

---

## INTEGRATION (updated v1.1)

```
flow-portability-test-protocol (SK-553) v1.1
  → PREREQUISITE: dna-compliance-guard v1.2.0 P-1..P-5 + A-1..A-3 + D-HIST-001
  → PREREQUISITE: flow-implementation-guide v1.3.0 V9 status = MOBILE
  → Phase 0: AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 (or AUTH_DEFERRED)
  → Layer 1 Step 2: D-HIST-001 (no SDK imports) — from PORTABILITY-TEST-PROTOCOL-v2.0
  → Layer 2: full per-role cell matrix (N roles × 3 cells)
  → Layer 3: SK-549 Extended Axis B per-role discipline
  → R6: test-integrity v2.2.0 Rule 8 (cross-tenant JWT isolation)
  → Repo naming: FORK-FLOW-ENGINE-PLAN-v1.2 CF-FORK-01
  → Result: tenantCertTier (TIER_A..TIER_D) in STATE.json
  → Feeds: PROOF-1 through PROOF-7 (distribution requirement tests)
  → Guard 14: TIER-C blocked until AUTH-PLAN v3 Phases 1-4 deploy
```

## Changelog

- **v1.0.0** — initial skill. Layers 1-3 wrapper for FLOW-PORTABILITY-TEST-PROTOCOL-v1.2.
  Closes G-12 (protocol was a markdown doc with no SK number).
- **v1.1.0** — integrated FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 (consolidated — supersedes
  v1.2 + auth extension separately). Added: Phase 0 auth pre-flight (Steps A/B/C);
  Layer 1 D-HIST-001 check (no SDK imports); Layer 2 full per-role cell matrix (replaces
  7-cell minimum); Layer 3 Extended Axis B per-role discipline; R6 cross-tenant JWT
  isolation requirement; repo naming {tenantId}--{moduleName} + flow_module_name FREEDOM
  key + repo evidence requirement; TIER-A/B/C/D definitions; Guard 14 enforcement;
  PFM v2.9 TIER-C pre-certification checklist embedded. STATE.json record updated.
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 12.
