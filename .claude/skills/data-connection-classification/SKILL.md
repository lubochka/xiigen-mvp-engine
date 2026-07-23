---
name: data-connection-classification
version: "2.0.0"
description: >
  Classifies every document AND TypeScript service file by connection type.
  v2.0 extends classification from ES documents to service .ts files via
  @connectionType JSDoc annotation. Closes G-32.
author: luba
updated: "2026-04-23"
priority: SUPREME
triggers:
  - "new flow"
  - "RAG pattern"
  - "export"
  - "import"
  - "data classification"
  - "connection type"
  - "flow planning"
  - "connectionType annotation"
  - "TypeScript service classification"
---

## Why This Skill Exists

Every document AND service file in XIIGen touches three questions:
1. **Who owns it?** (a tenant, the platform, a specific flow)
2. **Who can see it?** (only the owner, anyone with the flow, everyone)
3. **Can it travel?** (export to another tenant, import from a template)

Without answering these three questions PER DOCUMENT AND PER SERVICE FILE, you get:
- Tenant A seeing Tenant B's training data
- Exported flow templates that include private prompt improvements
- Flows that cannot be distributed because their service files are unclassified

---

## The Three Connection Types

### 1. TENANT_PRIVATE

Who owns it: A specific tenant. Who can see it: Only that tenant.
Can it travel: Only with explicit tenant consent + PII scrubbing.

Examples: custom prompt overrides, benchmark results, training data captures,
arbiter preferences, API keys, generation history.

ES pattern: `{index_name}` with `tenantId` field filtered on every query.

---

### 2. FLOW_SCOPED

Who owns it: A specific flow. Who can see it: Any tenant with the flow installed.
Can it travel: YES — this is what moves when a flow is exported/imported.

Examples: factory patterns, task contracts, BFA rules, default prompts, topology files,
event schemas, fixture files, **TypeScript service files**.

ES document shape:
```json
{
  "connectionType": "FLOW_SCOPED",
  "flowId": "FLOW-XX",
  "flowVersion": "1.0.0",
  "exportable": true,
  "exportGroup": "FLOW-XX-v1.0.0"
}
```

**Iron rule:** FLOW_SCOPED data must NEVER contain tenant-specific values.

---

### 3. TENANT_EXPORTABLE

Who owns it: A specific tenant (marked for sharing). Can it travel: YES, with PII scrubbing.

Examples: custom BFA rules, improved prompts with consent.

---

## TypeScript Service File Classification — NEW v2.0

The classification taxonomy was originally designed for ES documents. Service TypeScript
files must also be classified because they travel with the flow package when distributed.

**System-wide gap closed by v2.0:** Service files in `server/src/engine/flows/` were
unclassified — present in the monorepo but invisible to the package builder. Every flow
built before this version has unclassified service files.

**All service files are FLOW_SCOPED by default.** A service that should not be
distributed should not be in `server/src/engine/flows/{slug}/`.

### Annotation format

Add to every `.service.ts` before the class declaration:

```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE
 */
export class MyFlowService extends MicroserviceBase {
```

For PLAIN_TS flows (no NestJS DI):
```typescript
/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-XX
 * @portability MOBILE
 * @stackType PLAIN_TS
 * @import-from @xiigen/engine-infra-interfaces
 */
export class MyFlowService {
```

For a service that must NOT be distributed:
```typescript
/**
 * @connectionType NOT_DISTRIBUTABLE
 * @flowId FLOW-XX
 * @reason Migration helper — removed after FLOW-XX reaches ACTIVE status
 */
```

**`@portability MOBILE` may only be set after dna-compliance-guard v1.1.0 P-1..P-4 pass.**
Setting it without passing the portability gate is a false classification.

### Verification commands

```bash
FLOW_DIR="server/src/engine/flows/{slug}"
TOTAL=$(ls $FLOW_DIR/*.service.ts 2>/dev/null | wc -l)
ANNOTATED=$(grep -rl "@connectionType" $FLOW_DIR --include="*.service.ts" | wc -l)
MOBILE=$(grep -rl "@portability MOBILE" $FLOW_DIR --include="*.service.ts" | wc -l)
echo "Services: $TOTAL | Annotated: $ANNOTATED | Mobile: $MOBILE"
# Expected: TOTAL == ANNOTATED

# Find unannotated files
grep -rL "@connectionType" $FLOW_DIR --include="*.service.ts"
# Expected: no output
```

### Relationship to ES document classification

ES documents carry `connectionType` in the document body:
```json
{ "connectionType": "FLOW_SCOPED", "flowId": "FLOW-XX" }
```

TypeScript files carry the same information in JSDoc:
```typescript
/** @connectionType FLOW_SCOPED @flowId FLOW-XX */
```

Both are required. A flow package without TypeScript annotations is incomplete —
it has the data schemas but the package builder cannot find the service code.

---

## Prerequisite Implementations

Before any flow can use this classification:

1. ES mapping update — add connectionType fields to all indices
2. PII scanner service — validates FLOW_SCOPED docs have no tenant values
3. Export/import service — packages FLOW_SCOPED ES docs + annotated TS files
4. Query guard update — every `buildSearchFilter` respects connectionType

---

## Anti-Patterns

| Anti-Pattern | What Goes Wrong |
|-------------|----------------|
| Document without connectionType | Unknown visibility — could leak across tenants |
| FLOW_SCOPED doc with tenantId set | Exported flow contains tenant-specific data |
| TENANT_PRIVATE doc in export bundle | Tenant data leaked to recipient |
| TENANT_EXPORTABLE without PII scan | Personal data shipped to marketplace |
| Import without dependency check | Flow installed but required skills missing |
| Query without connectionType filter | Returns mixed tenant/flow/exportable data |
| Service file without @connectionType annotation | File invisible to package builder; flow distributed without service code — NEW v2.0 |
| @portability MOBILE before P-1..P-4 pass | False classification; ClsService or local interfaces may be present — NEW v2.0 |

---

## Checklist — Every New Document

```
□ connectionType field present? (TENANT_PRIVATE | FLOW_SCOPED | TENANT_EXPORTABLE)
□ Who owns it?
□ Who can query it?
□ Does it travel on export?
□ What fields need PII scrubbing?
□ What dependencies must exist for it to work after import?
```

## Checklist — Every New TypeScript Service File (NEW v2.0)

```
□ @connectionType FLOW_SCOPED annotation present?
□ @flowId FLOW-XX correct?
□ @portability MOBILE only set after dna-compliance-guard v1.1.0 P-1..P-4 pass?
□ @stackType PLAIN_TS present for flows with no NestJS DI?
□ No ClsService import (would invalidate MOBILE claim)?
□ All FREEDOM.get() keys use flow{NN}_ prefix?
```

## How Flows Reference This Skill

**Every flow planning session must answer for each document type AND each service file:**

```
ES documents:
  □ connectionType? (TENANT_PRIVATE | FLOW_SCOPED | TENANT_EXPORTABLE)
  □ flowId? (required for FLOW_SCOPED)
  □ Travels on export?
  □ PII fields to scrub?

TypeScript service files:
  □ @connectionType annotation added before class?
  □ @portability MOBILE after P-1..P-4 gate?
  □ No local interface definitions?
  □ No ClsService import?
```
