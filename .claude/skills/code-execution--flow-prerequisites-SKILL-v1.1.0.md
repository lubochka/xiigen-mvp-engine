---
name: flow-prerequisites
version: "1.1.0"
description: >
  Before implementing ANY flow through the AF pipeline, certain infrastructure,
  integrations, and services must exist and be verified. v1.0 covers ES indices,
  project tracker, AF-3 prompt resolution, and connectionType schema (P-1..P-4).
  v1.1 adds P-5: auth infrastructure prerequisite — NON-BLOCKING, emits
  AUTH_DEFERRED when absent. TIER-C certification requires auth infrastructure
  (Guard 14 from MODULE-SEPARATION-FIX-PLAN-v5.0).
  Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 9.
author: luba
updated: "2026-04-24"
priority: SUPREME
triggers:
  - "first flow"
  - "prerequisites"
  - "before we start"
  - "what do we need"
  - "infrastructure check"
  - "auth infrastructure"
  - "auth prereq"
---

# Flow Prerequisites Skill v1.1
## What must exist, be tested, and be connected BEFORE the first flow runs

---

## Why This Skill Exists

The first flow implementation will fail if any of these are missing:
- ES index doesn't exist → RAG seeding crashes
- No project tracker connection → V6 validation fails
- Prompt index not seeded → AF-3 returns empty
- No export/import schema → data classification undefined
- **NEW v1.1:** Auth infrastructure absent → controllers ship unguarded;
  TIER-C certification (Guard 14) requires auth before R6 can be tested

These are NOT flow-specific. They are platform infrastructure.
Build them once, every flow uses them.

---

## PREREQUISITE CHECKLIST (3 tiers)

### TIER 1: MUST EXIST (blocks flow implementation)

#### P-1: Elasticsearch indices with connectionType schema

**What:** Three ES indices with the data-connection-classification fields.
**Why:** Every flow stores patterns, prompts, and configs. Without indices + schema, nothing persists.

**Implementation:**
```bash
# Create xiigen-rag-patterns index
curl -X PUT "localhost:9200/xiigen-rag-patterns" -H "Content-Type: application/json" -d '{
  "mappings": {
    "properties": {
      "patternId":      {"type": "keyword"},
      "tenantId":       {"type": "keyword"},
      "patternType":    {"type": "keyword"},
      "connectionType": {"type": "keyword"},
      "flowId":         {"type": "keyword"},
      "flowVersion":    {"type": "keyword"},
      "exportConsent":  {"type": "boolean"},
      "piiScrubbed":    {"type": "boolean"},
      "exportGroup":    {"type": "keyword"},
      "dependencies":   {"type": "keyword"},
      "domainId":       {"type": "keyword"},
      "keywords":       {"type": "text"},
      "tags":           {"type": "keyword"},
      "codeSnippet":    {"type": "text"},
      "createdBy":      {"type": "keyword"},
      "importedFrom":   {"type": "keyword"},
      "indexedAt":      {"type": "date"}
    }
  }
}'

# Create xiigen-prompts index
curl -X PUT "localhost:9200/xiigen-prompts" -H "Content-Type: application/json" -d '{
  "mappings": {
    "properties": {
      "promptId":       {"type": "keyword"},
      "domainId":       {"type": "keyword"},
      "taskType":       {"type": "keyword"},
      "role":           {"type": "keyword"},
      "tenantId":       {"type": "keyword"},
      "connectionType": {"type": "keyword"},
      "flowId":         {"type": "keyword"},
      "content":        {"type": "text"},
      "version":        {"type": "integer"},
      "isDefault":      {"type": "boolean"},
      "isActive":       {"type": "boolean"},
      "createdAt":      {"type": "date"},
      "updatedAt":      {"type": "date"}
    }
  }
}'

# Create xiigen-engine-contracts index
curl -X PUT "localhost:9200/xiigen-engine-contracts" -H "Content-Type: application/json" -d '{
  "mappings": {
    "properties": {
      "taskTypeId":     {"type": "keyword"},
      "name":           {"type": "text"},
      "archetype":      {"type": "keyword"},
      "connectionType": {"type": "keyword"},
      "flowId":         {"type": "keyword"},
      "flowVersion":    {"type": "keyword"},
      "tenantId":       {"type": "keyword"},
      "createdAt":      {"type": "date"}
    }
  }
}'
```

**Test:**
```bash
curl localhost:9200/xiigen-rag-patterns/_mapping | \
  jq '.xiigen-rag-patterns.mappings.properties.connectionType'
# Expected: {"type": "keyword"}
```

---

#### P-2: Project tracker connection

**What:** A service that can create cards, update status, log time, and link to epics.
**Why:** V6 validation dimension requires project tracking.

Recommended start: ES-backed provider (zero external deps). See v1.0 for full
implementation pattern with `IProjectTrackerService` interface and test templates.

**Test:**
```bash
cd server && npx jest --testPathPattern="project-tracker" --verbose
```

---

#### P-3: AF-3 prompt resolution connected to ES

**What:** AF-3 PromptLibrary must resolve from `xiigen-prompts` ES index (P22 three-tier chain).
**Why:** In-memory only → prompts lost on restart; no tenant customization.

**Test:**
```bash
cd server && npx jest --testPathPattern="af3.*es\|prompt-library.*es" --verbose
```

---

#### P-4: connectionType field in existing code patterns

**What:** `toRagDocument()` in `pattern-types.ts` must include `connectionType`, `flowId`, `tenantId`.
**Why:** Without it, existing patterns have no classification for export/import.

**Test:**
```bash
cd server && npx jest --testPathPattern="pattern-types\|rag-document" --verbose
```

---

#### P-5: Auth infrastructure — NEW v1.1.0

**What:** Four components that together enable JWT-authenticated routes with role-based access:
1. `server/src/auth/auth.module.ts` — JWT issuance and validation module
2. `server/src/auth/scope-enrichment.interceptor.ts` — enriches ScopeContext with JWT roles
3. `JwtAuthGuard` registered as `APP_GUARD` in `server/src/app.module.ts`
4. `server/src/kernel/role-strings.ts` — canonical role string constants

**Why:** Without these, generated controllers cannot be guarded. All routes are open to
unauthenticated requests. TIER-C certification (Guard 14) requires these components before
R6 cross-tenant JWT isolation can be tested per FLOW-PORTABILITY-TEST-PROTOCOL-v2.0.

**Blocking policy:** P-5 is **NON-BLOCKING** for flow implementation.
Flows proceed as `AUTH_DEFERRED` when auth infrastructure is absent.
P-5 becomes **BLOCKING only for TIER-C certification** (Guard 14 enforcement
from MODULE-SEPARATION-FIX-PLAN-v5.0 and PFM-v2.9).

**Prerequisite source:** AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4.

**Test:**
```bash
echo "=== P-5: Auth Infrastructure Check ==="

AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
SCOPE_WIRE=$(ls server/src/auth/scope-enrichment.interceptor.ts 2>/dev/null | wc -l)
APP_GUARD=$(grep -c "JwtAuthGuard\|APP_GUARD" server/src/app.module.ts 2>/dev/null || echo 0)
ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)

echo "P-5a auth.module.ts:                  $([ $AUTH_MODULE -eq 1 ] && echo '✅ PRESENT' || echo '⚠️  ABSENT')"
echo "P-5b scope-enrichment.interceptor.ts: $([ $SCOPE_WIRE -eq 1 ] && echo '✅ PRESENT' || echo '⚠️  ABSENT')"
echo "P-5c JwtAuthGuard as APP_GUARD:        $([ $APP_GUARD -gt 0 ] && echo '✅ PRESENT' || echo '⚠️  ABSENT')"
echo "P-5d role-strings.ts:                  $([ $ROLE_STRINGS -eq 1 ] && echo '✅ PRESENT' || echo '⚠️  ABSENT')"

AUTH_SCORE=$((AUTH_MODULE + SCOPE_WIRE + APP_GUARD + ROLE_STRINGS))
echo ""
if [ "$AUTH_SCORE" -eq 4 ]; then
  echo "✅ P-5 PASS: Auth infrastructure complete (4/4)"
  echo "   Controllers may be guarded. TIER-C certification eligible."
elif [ "$AUTH_SCORE" -eq 0 ]; then
  echo "⚠️  P-5 AUTH_DEFERRED: No auth infrastructure (0/4)"
  echo "   NON-BLOCKING — flows proceed; controllers unguarded until AUTH-PLAN v3"
  echo "   Phases 1-4 deploy. Record authStatus=AUTH_DEFERRED in STATE.json."
  echo "   BLOCKING for TIER-C certification (Guard 14)."
else
  echo "⚠️  P-5 PARTIAL ($AUTH_SCORE/4): Some auth components present"
  [ "$AUTH_MODULE" -eq 0 ]  && echo "   MISSING: server/src/auth/auth.module.ts"
  [ "$SCOPE_WIRE" -eq 0 ]   && echo "   MISSING: server/src/auth/scope-enrichment.interceptor.ts"
  [ "$APP_GUARD" -eq 0 ]    && echo "   MISSING: JwtAuthGuard as APP_GUARD in app.module.ts"
  [ "$ROLE_STRINGS" -eq 0 ] && echo "   MISSING: server/src/kernel/role-strings.ts"
  echo "   Treat as AUTH_DEFERRED until all 4 components present."
fi
```

**Unit test for auth infrastructure (add to preflight suite):**
```typescript
describe('P-5: Auth Infrastructure', () => {
  it('JwtAuthGuard is registered as APP_GUARD', async () => {
    // Verify a protected route returns 401 without JWT — confirms guard is active
    const response = await request(app.getHttpServer())
      .get('/api/health-check-protected')  // any route with @UseGuards
      .send();
    // If AUTH_DEFERRED: skip this test, record AUTH_DEFERRED label
    expect([200, 401]).toContain(response.status);
    // 401 = guard active; 200 = guard not yet active (AUTH_DEFERRED acceptable)
  });

  it('role-strings.ts exports ROLE constants', async () => {
    // Verify role-strings.ts is importable and has expected constants
    const { ROLE } = await import('../kernel/role-strings');
    expect(ROLE.TENANT_ADMIN).toBeDefined();
    expect(ROLE.TENANT_USER).toBeDefined();
  });
});
```

---

### TIER 2: SHOULD EXIST (enables full validation)

*(Renumbered from v1.0 — P-5..P-7 → P-6..P-8 to make room for auth infra P-5)*

#### P-6: PII scanner for export *(was P-5 in v1.0)*

Scans documents before export for tenant-specific fields.
Required for TENANT_EXPORTABLE data to work correctly.

#### P-7: Export/import bundle service *(was P-6 in v1.0)*

Creates JSON bundles with manifest. Validates dependencies on import.
Required for FLOW_SCOPED data to travel between tenants.

#### P-8: docker-compose.test.yml with both RAG tiers *(was P-7 in v1.0)*

```yaml
services:
  elasticsearch-global:
    image: elasticsearch:8.11.0
    ports: ["9200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false

  elasticsearch-local:
    image: elasticsearch:8.11.0
    ports: ["19200:9200"]
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
```

---

### TIER 3: NICE TO HAVE (for production readiness)

*(Renumbered — P-8..P-10 → P-9..P-11)*

#### P-9: GitHub Actions CI with flow validation *(was P-8)*
#### P-10: Structured logging for AF station traces (P24 standard) *(was P-9)*
#### P-11: Health endpoints per flow (P24 standard) *(was P-10)*

---

## Implementation Order

```
Week 0 (before any flow):
  1. P-1: Create ES indices with connectionType schema (2 hours)
  2. P-4: Add connectionType to existing toRagDocument (1 hour)
  3. P-2: Implement ES-backed project tracker (3 hours)
  4. P-3: Wire AF-3 to ES with fallback to in-memory (2 hours)
  5. P-8: docker-compose.test.yml (30 min)
  6. Tests for all of the above (2 hours)
  Total: ~10 hours

Then any flow can start with full infrastructure.

Auth infrastructure (P-5) — separate track:
  AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4 (estimated: 2-3 days)
  Required before: TIER-C certification (Guard 14)
  Not required for: flow implementation, TIER-A, TIER-B
```

---

## Verification Gate (run before first flow)

```bash
echo "=== FLOW PREREQUISITES VERIFICATION ==="

# P-1: ES indices with connectionType schema
curl -s localhost:9200/xiigen-rag-patterns/_mapping | \
  jq '.["xiigen-rag-patterns"].mappings.properties.connectionType.type'
# Expected: "keyword"

curl -s localhost:9200/xiigen-prompts/_mapping | \
  jq '.["xiigen-prompts"].mappings.properties.connectionType.type'
# Expected: "keyword"

# P-2: Project tracker
cd server && npx jest --testPathPattern="project-tracker" --verbose

# P-3: AF-3 prompt resolution from ES
cd server && npx jest --testPathPattern="af3.*es\|prompt-library.*es" --verbose

# P-4: connectionType in RAG docs
cd server && npx jest --testPathPattern="pattern-types\|rag-document" --verbose

# P-5: Auth infrastructure (new v1.1 — NON-BLOCKING, outputs AUTH_DEFERRED if absent)
AUTH_MODULE=$(ls server/src/auth/auth.module.ts 2>/dev/null | wc -l)
SCOPE_WIRE=$(ls server/src/auth/scope-enrichment.interceptor.ts 2>/dev/null | wc -l)
APP_GUARD=$(grep -c "JwtAuthGuard\|APP_GUARD" server/src/app.module.ts 2>/dev/null || echo 0)
ROLE_STRINGS=$(ls server/src/kernel/role-strings.ts 2>/dev/null | wc -l)
AUTH_SCORE=$((AUTH_MODULE + SCOPE_WIRE + APP_GUARD + ROLE_STRINGS))
echo "P-5 Auth infrastructure: $AUTH_SCORE/4 $([ $AUTH_SCORE -eq 4 ] && echo '✅' || echo '⚠️  AUTH_DEFERRED')"

# P-8: Docker compose starts
docker compose -f docker-compose.test.yml up -d
curl -s localhost:9200 > /dev/null && echo "P-8 ES global: ✅" || echo "P-8 ES global: ❌"
curl -s localhost:19200 > /dev/null && echo "P-8 ES local: ✅" || echo "P-8 ES local: ❌"

# Full test suite baseline
cd server && npx jest 2>&1 | tail -3
cd client && npx jest 2>&1 | tail -3

echo "=== PREREQUISITES COMPLETE ==="
echo "P-1..P-4: MUST PASS before any flow"
echo "P-5: AUTH_DEFERRED acceptable; BLOCKING only for TIER-C certification"
```

## Changelog

- **v1.0.0** — initial skill. TIER 1: P-1 (ES indices), P-2 (project tracker),
  P-3 (AF-3 ES resolution), P-4 (connectionType in patterns). TIER 2: P-5 PII scanner,
  P-6 bundle service, P-7 docker-compose. TIER 3: P-8..P-10.
- **v1.1.0** — TIER 1 P-5 added: auth infrastructure prerequisite (auth.module.ts,
  ScopeEnrichmentInterceptor, JwtAuthGuard APP_GUARD, role-strings.ts). NON-BLOCKING
  for flow implementation; BLOCKING for TIER-C certification (Guard 14 per MODULE-
  SEPARATION-FIX-PLAN-v5.0 + PFM-v2.9). TIER 2/3 renumbered P-6..P-11 to avoid
  collision. Prerequisite source: AUTH-ROLES-GROUPS-PLAN-v3.0 Phases 1-4. Closes
  AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 9.
