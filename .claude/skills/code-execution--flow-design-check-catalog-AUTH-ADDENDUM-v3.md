---
name: flow-design-check-catalog
version: "3.0.0"
priority: HIGH
category: code-execution
author: luba
updated: "2026-04-24"
description: >
  Named checks for validate.handler nodes in flow topologies. v2.0 added portability
  checks P-001..P-005. v3.0 adds auth checks A-001..A-003, D-HIST-001 (P-006),
  and GOLDEN RULE GR-001: zero tech debt — no pre-existing failure carve-outs,
  ever, full stop. Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 11.
triggers:
  - "validate.handler"
  - "named checks"
  - "CAP-001"
  - "RAG-001"
  - "LEARNING-001"
  - "A-001"
  - "auth check"
  - "D-HIST-001"
  - "pre-existing"
  - "zero tech debt"
  - "GR-001"
---

# Flow Design Check Catalog v3.0

## GOLDEN RULES — READ BEFORE ALL CHECKS

### GR-001: Zero Tech Debt — No Pre-Existing Carve-Outs — ABSOLUTE

**Origin:** Direct instruction from Luba.
**Scope:** Applies to EVERY session, EVERY phase, EVERY check in this catalog.

```
ZERO TECH DEBT = ZERO TECH DEBT. FULL STOP.

There are no pre-existing exceptions.
There are no "it was like that before I arrived" exceptions.
There are no "narrow reading of the requirement" exceptions.
There are no "this session only adds new debt, not pre-existing" exceptions.
```

**The violation pattern that triggered this rule:**
> *"Narrow reading — 'zero tech debt' means A0.5 introduces no new debt (satisfied)."*

This interpretation is **WRONG**. It is not a narrow reading. It is a false reading.
Zero tech debt means the codebase has zero tech debt at phase close — not that
this session's diff introduced zero new debt while leaving pre-existing debt untouched.

**What this means operationally:**

1. **Pre-existing test failures must be fixed before the session closes.** Not labeled.
   Not deferred. Not noted. Fixed. If the session scope makes it impossible to fix them
   (different flow, different module), escalate to Luba — do not label them "pre-existing."

2. **Pre-existing DNA violations must be fixed before the session closes.** A session
   that adds new compliant services while leaving old ClsService violations in the same
   flow is not done.

3. **Pre-existing portability gaps must be fixed (or Luba-approved deferred).** The
   portability status in STATE.json must reflect all gaps, not just newly introduced ones.

4. **Pre-existing auth gaps must be fixed (or AUTH_DEFERRED with explicit Luba approval).**
   A session that guards new controllers while leaving old unguarded controllers in the
   same flow is not done.

**Detection — when reviewing any session output:**
```bash
# Pre-existing failures: check that the failures count is actually 0, not just
# "no new failures added this session"
cd server && npx jest 2>&1 | grep -E "Tests:.*failed|Test Suites:.*failed"
# Expected: no "failed" in output — not "same as before"

# Pre-existing DNA violations in the flow being worked on:
grep -rl "import.*ClsService\|from 'nestjs-cls'" \
  server/src/engine/flows/${FLOW_SLUG}/ --include="*.service.ts"
# Expected: empty — not "these existed before this session"

# Pre-existing unguarded controllers in the flow being worked on:
find server/src/engine/flows/${FLOW_SLUG} -name "*.controller.ts" -exec \
  grep -L "@UseGuards" {} \;
# Expected: empty — not "those were there before I started"
```

**Review gate (add to MANDATORY CHECK before every ⛔ STOP):**
```
□ GR-001: failures === 0 in the full test suite (not just this session's new tests)
□ GR-001: no pre-existing DNA violations in the scope of this session's flow
□ GR-001: no pre-existing portability violations in scope left unresolved or unlabeled
□ GR-001: no pre-existing auth gaps in scope left as "was there before"
□ GR-001: any gap NOT fixed this session has Luba's explicit approval + named deferral session
```

**Exception protocol (the only acceptable path):**
A pre-existing issue may remain unfixed ONLY when:
1. Luba explicitly names it as acceptable to defer in THIS session
2. It is recorded with a named session that will fix it
3. The ISSUE INVENTORY entry says "DEFERRED — Luba approval [date] — fix in [session name]"

"Pre-existing" is not a status. "Pre-existing" is not a deferral reason.
"Pre-existing" is a description of when it was introduced — it has no governance weight.

---

## WHEN TO INVOKE THIS CATALOG

**Claude Code:** When writing any validate.handler node in a topology contract.
Reference this catalog to find the correct check ID and configuration.

---

## CHECK ID FORMAT

```
{CATEGORY}-{NUMBER}

Categories:
  CAP     → Capability checks (file exists, skill registered)
  RAG     → RAG pattern checks (freshness, tier, count)
  LEARNING → Learning signal checks (OUTCOME present, DPO format)
  SELF-Q  → Self-questioning checks (questions present, modifications documented)
  TOPO    → Topology structure checks (feedback.handler exists, naming)
  SCORE   → Score threshold checks (bracket routing)
  P       → Portability checks (v2.0)
  A       → Auth checks (v3.0 NEW)
```

---

## PORTABILITY CHECKS (P-001..P-005) — v2.0

*(Full text unchanged from portability addendum. Reproduced here for self-containment.)*

### P-001 — No ClsService import (GAP-01)
```json
{
  "id": "P-001", "check": "no-cls-service-import",
  "target": "${flow.servicePaths[]}",
  "config": {"forbidden_grep": "import.*ClsService|from 'nestjs-cls'|TENANT_CONTEXT_KEY"},
  "severity": "PORTABILITY_BLOCK",
  "description": "Service files must not import ClsService. tenantId MUST come from EngineContract input, not ALS context. ALS leaks across tenant boundaries in concurrent Promise.all() calls."
}
```

### P-002 — @connectionType FLOW_SCOPED annotation (GAP-16a)
```json
{
  "id": "P-002", "check": "connection-type-annotated",
  "target": "${flow.servicePaths[]}",
  "config": {"required_jsdoc": "@connectionType FLOW_SCOPED", "required_per": "each_service_file"},
  "severity": "PORTABILITY_BLOCK",
  "description": "Every service .ts file must carry @connectionType FLOW_SCOPED JSDoc. Without it the file is invisible to the package builder."
}
```

### P-003 — FREEDOM keys flow-scoped (GAP-09)
```json
{
  "id": "P-003", "check": "freedom-keys-flow-scoped",
  "target": "${flow.servicePaths[]}",
  "config": {"pattern": "freedom\\.get\\(|fromConfig\\(", "required_prefix_regex": "flow[0-9]{2}_"},
  "severity": "PORTABILITY_BLOCK",
  "description": "All FREEDOM keys must use flow{NN}_ prefix. Unscoped keys collide across flow installations."
}
```

### P-004 — No local interface clones (GAP-02)
```json
{
  "id": "P-004", "check": "no-local-interface-clones",
  "target": "${flow.allTsPaths[]}",
  "config": {"forbidden_patterns": ["^interface IDb ", "^interface IQueue ", "^interface IFreedom "]},
  "severity": "PORTABILITY_BLOCK",
  "description": "Flow code must not define local copies of canonical fabric interfaces. Import from fabrics/interfaces/ or @xiigen/engine-infra-interfaces."
}
```

### P-005 — Cross-flow dependencies declared (GAP-10)
```json
{
  "id": "P-005", "check": "required-co-installs-declared",
  "target": "${flow.packageJson.xiigen.requiredCoInstalls}",
  "config": {
    "cross_flow_detection": "grep -rE 'searchDocuments|storeDocument' ${flow.dir} --include='*.service.ts' | grep 'xiigen-' | grep -v 'flow[0-9]*-'",
    "rule": "declared_count >= cross_flow_read_count"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Every cross-flow ES index read must be declared in xiigen.requiredCoInstalls."
}
```

---

## AUTH CHECKS (A-001..A-003) — NEW v3.0

All three have severity `AUTH_BLOCK`. AUTH_BLOCK does not block monorepo deployment;
it blocks TIER-C certification and distribution. These are the catalog-level equivalents
of dna-compliance-guard v1.2.0 A-1..A-3.

### A-001 — Controller has @UseGuards

```json
{
  "id": "A-001",
  "check": "controller-has-use-guards",
  "target": "${flow.controllerPaths[]}",
  "config": {
    "required_grep": "@UseGuards",
    "required_per": "each_controller_file",
    "exception": "AUTH_DEFERRED — skip if auth.module.ts absent; record authStatus=AUTH_DEFERRED"
  },
  "severity": "AUTH_BLOCK",
  "description": "Every @Controller file must have @UseGuards declared. A controller without guards accepts unauthenticated requests on every route. This is not a 'pre-existing' condition that can be carried forward — it is an open security surface. Fix: add @UseGuards(JwtAuthGuard, RolesGuard) before @Controller(...). Exception: AUTH_DEFERRED if auth infrastructure not yet deployed (AUTH-ROLES-GROUPS-PLAN-v3 Phases 1-4 pending); record explicitly."
}
```

### A-002 — Routes have auth declaration

```json
{
  "id": "A-002",
  "check": "routes-have-auth-declaration",
  "target": "${flow.controllerPaths[]}",
  "config": {
    "route_pattern": "@Get\\(|@Post\\(|@Put\\(|@Delete\\(|@Patch\\(",
    "auth_pattern": "@Roles\\(|@Public\\(\\)",
    "rule": "auth_decl_count >= route_count",
    "exception": "AUTH_DEFERRED — skip if auth.module.ts absent"
  },
  "severity": "AUTH_BLOCK",
  "description": "Every route method must have @Roles(...) or @Public() declared. A route without either is implicitly accessible to any authenticated user regardless of role — this is a fail-open pattern. Fix: add @Roles(ROLE.ROLE_STRING) or @Public() above each route method. Exception: AUTH_DEFERRED applies same as A-001."
}
```

### A-003 — @Public() routes in bypass registry

```json
{
  "id": "A-003",
  "check": "public-routes-in-bypass-registry",
  "target": "${flow.controllerPaths[]}",
  "config": {
    "public_route_grep": "@Public\\(\\)",
    "registry_file": "server/src/auth/bypass-paths.registry.ts",
    "rule": "every @Public() route path appears in BYPASS_PATHS array",
    "detection": "manual cross-check — not automatable without runtime route extraction"
  },
  "severity": "AUTH_BLOCK",
  "description": "Every route decorated with @Public() must also appear in bypass-paths.registry.ts. Without registry entry, the bypass gate is unaware of the exposure and cannot enforce scope-specific rules. Fix: add route path to BYPASS_PATHS. Exception: AUTH_DEFERRED applies same as A-001."
}
```

---

## D-HIST-001 CHECK (P-006) — NEW v3.0

### P-006 — No direct SDK imports in service files

```json
{
  "id": "P-006",
  "check": "no-sdk-imports-in-services",
  "target": "${flow.servicePaths[]}",
  "config": {
    "forbidden_grep": "^import.*from '@elastic|from '@anthropic|from 'pg'|from 'ioredis'",
    "exclusions": ["fabrics/implementations", ".spec.ts"],
    "source": "PORTABILITY-TEST-PROTOCOL-v2.0 Layer 1 Step 2"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Service files must not import @elastic, @anthropic, pg, or ioredis directly. Direct SDK imports couple the service to the monorepo's specific SDK version and auth model. When the flow is forked into a tenant repo, the import breaks at npm install. Use fabric interfaces: IDatabaseService, IAIService, IQueueService. Fix: replace SDK client with fabric interface injection. See retroactive-development v1.2.0 D-HIST-001 fix row."
}
```

---

## SEVERITY LEVELS

```
PORTABILITY_BLOCK:
  Does NOT block production deployment within the monorepo.
  DOES block packaging and distribution to a second tenant.
  DOES block PROOF-1 through PROOF-5.
  DOES block TIER-A certification.
  Must appear in portabilityGaps[] in STATE.json and V9 report.

AUTH_BLOCK:
  Does NOT block production deployment within the monorepo.
  DOES block TIER-C certification and distribution.
  DOES block R6 (cross-tenant auth isolation) testing.
  Exception: AUTH_DEFERRED is acceptable with explicit record in STATE.json.
  Must appear in authGaps[] in STATE.json and V10 report.
```

---

## GR-001 INTEGRATION — WHERE THE GOLDEN RULE FIRES

The GR-001 zero-tech-debt rule is a meta-check. It does not have an ID in the
validate.handler chain because it is not a topology check — it is a session governance
rule that applies before, during, and after every session.

| Enforcement point | How GR-001 fires |
|------------------|-----------------|
| phase-preflight SK-457 v1.2.0 | Default checks 1-6: failures must be 0, not "same as before" |
| test-integrity SK-414 v2.2.0 | Rule 0 (see amendment): pre-existing failures are not exempt |
| dna-compliance-guard SK-418 v1.2.0 | Pre-commit gate: all violations fail, not just new ones |
| plan-review-skill SK-410 v2.1.0 | FC-21: protocol reference; GR-001 explicit reference added |
| CODE-REVIEW-PROTOCOL (Phase 24) | FC-22: GR-001 will be added; any "pre-existing" label = BLOCK |
| Every ⛔ STOP | ISSUE INVENTORY: "pre-existing" is not a valid status |
```

## Changelog

- **v1.0** → **v2.0** — P-001..P-005 portability checks added (portability addendum,
  2026-04-23). PORTABILITY_BLOCK severity defined.
- **v2.0** → **v3.0** — A-001..A-003 auth checks added (AUTH_BLOCK severity). P-006
  D-HIST-001 direct SDK import check added (PORTABILITY_BLOCK). GR-001 Zero Tech Debt
  Golden Rule added: no pre-existing carve-outs, ever. GR-001 integration table shows
  every enforcement point. Closes AUTH-ARBITER-SKILLS-REMEDIATION-PLAN-v3.0 Phase 11.
