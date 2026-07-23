## PORTABILITY CHECKS (P-xxx) — ADDED v2.0

This section appends to the existing `code-execution--flow-design-check-catalog.md`.
Insert BEFORE the HEALTH CHECKS section, AFTER the LEARNING SIGNAL CHECKS section.

---

### P-001 — No ClsService import (GAP-01)

```json
{
  "id": "P-001",
  "check": "no-cls-service-import",
  "target": "${flow.servicePaths[]}",
  "config": {
    "forbidden_grep": "import.*ClsService|from 'nestjs-cls'|TENANT_CONTEXT_KEY"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Service files must not import ClsService or nestjs-cls. tenantId MUST come from EngineContract input payload, not AsyncLocalStorage context. In concurrent Promise.all() execution, AsyncLocalStorage context leaks across tenant boundaries. A service that imports ClsService is fundamentally non-portable and contaminates the DPO corpus with incorrect tenant-scoping patterns. Fix: see retroactive-development SK-419 v1.1.0 portability fix table P-1 row."
}
```

### P-002 — @connectionType FLOW_SCOPED annotation (GAP-16a)

```json
{
  "id": "P-002",
  "check": "connection-type-annotated",
  "target": "${flow.servicePaths[]}",
  "config": {
    "required_jsdoc": "@connectionType FLOW_SCOPED",
    "required_per": "each_service_file"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Every service .ts file must carry @connectionType FLOW_SCOPED JSDoc annotation. Without it the file is invisible to the package builder — the flow is distributed without service code. Fix: add annotation before class declaration per data-connection-classification v2.0 template."
}
```

### P-003 — FREEDOM keys use flow-scoped prefix (GAP-09)

```json
{
  "id": "P-003",
  "check": "freedom-keys-flow-scoped",
  "target": "${flow.servicePaths[]}",
  "config": {
    "pattern": "freedom\\.get\\(|fromConfig\\(",
    "required_prefix_regex": "flow[0-9]{2}_",
    "violation": "any freedom.get() call whose key string does not start with flow{NN}_"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "All FREEDOM config keys must use flow-scoped naming: flow{NN}_{semantic_name}. An unscoped key collides across flow installations. If FLOW-48 and FLOW-12 both define 'enabled', the second installer overwrites the first. Fix: rename key to flow48_translation_enabled format; update STEP-1-INVARIANTS FREEDOM table."
}
```

### P-004 — No local interface clones (GAP-02)

```json
{
  "id": "P-004",
  "check": "no-local-interface-clones",
  "target": "${flow.allTsPaths[]}",
  "config": {
    "forbidden_patterns": [
      "^interface IDb ",
      "^interface IQueue ",
      "^interface IFreedom "
    ]
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Flow code must not define local copies of canonical fabric interfaces. Local copies diverge from the canonical implementation and prevent the flow from receiving breaking-change notifications. Import from fabrics/interfaces/ (NestJS_DI) or @xiigen/engine-infra-interfaces (PLAIN_TS). Fix: delete local interface; import canonical."
}
```

### P-005 — Cross-flow dependencies declared (GAP-10)

```json
{
  "id": "P-005",
  "check": "required-co-installs-declared",
  "target": "${flow.packageJson.xiigen.requiredCoInstalls}",
  "config": {
    "cross_flow_detection": "grep -rE 'searchDocuments|storeDocument' ${flow.dir} --include='*.service.ts' | grep 'xiigen-' | grep -v 'flow[0-9]*-'",
    "rule": "declared_count >= cross_flow_read_count"
  },
  "severity": "PORTABILITY_BLOCK",
  "description": "Every cross-flow ES index read must be declared in package.json xiigen.requiredCoInstalls. A tenant installing this flow without the required co-flows gets runtime errors with no diagnostic signal. Declare all hops in 4-hop chains. Fix: add to package.json: 'xiigen': { 'requiredCoInstalls': ['FLOW-N'] }."
}
```

---

## Severity level: PORTABILITY_BLOCK

```
PORTABILITY_BLOCK: Flow is ACTIVE but not MOBILE.
  - Does NOT block production deployment within the monorepo.
  - DOES block packaging and distribution to a second tenant.
  - DOES block PROOF-1 through PROOF-5 (distribution requirement tests).
  - Must appear in portabilityGaps[] in STATE.json and V9 report.
```

These checks are the catalog-level equivalents of dna-compliance-guard v1.1.0 P-1..P-5.
The catalog checks fire in CI/CD. The guard checks fire at pre-commit. Both must pass
for a flow to reach MOBILE portability status.
