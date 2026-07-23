# Data Connection Classification Skill v1.0
## The foundational data model for flow ↔ RAG/DB relationships
## Must be loaded BEFORE any flow planning skill
---
name: data-connection-classification
version: "1.0.0"
description: >
  Every document in XIIGen (RAG pattern, DB record, prompt, config, training data)
  must be classified by connection type. This determines who can see it, who can
  export it, and what travels when a flow is packaged. This skill is the prerequisite
  for all flow planning — without it, data isolation is undefined.
author: luba
updated: "2026-03-19"
priority: SUPREME
triggers:
  - "new flow"
  - "RAG pattern"
  - "export"
  - "import"
  - "data classification"
  - "connection type"
  - "flow planning"
---

## Why This Skill Exists

Every document in XIIGen touches three questions:
1. **Who owns it?** (a tenant, the platform, a specific flow)
2. **Who can see it?** (only the owner, anyone with the flow, everyone)
3. **Can it travel?** (export to another tenant, import from a template)

Without answering these three questions PER DOCUMENT, you get:
- Tenant A seeing Tenant B's training data
- Exported flow templates that include private prompt improvements
- Imported flows that silently overwrite tenant-specific configs

---

## The Three Connection Types

### 1. TENANT_PRIVATE

**Who owns it:** A specific tenant.
**Who can see it:** Only that tenant. No cross-tenant access under any path.
**Can it travel:** Only with explicit tenant consent + PII scrubbing.

**Examples:**
- Custom prompt overrides (`tenantId: "acme"` in xiigen-prompts)
- Benchmark results (model scores specific to tenant's usage patterns)
- Training data captures (input/output pairs from tenant's generations)
- Arbiter preferences (which model tenant prefers for which task)
- API keys and secrets (via ISecretsService)
- Generation history and feedback records

**ES index pattern:** `{index_name}` with `tenantId` field filtered on every query.
**Export behavior:** Requires explicit consent. PII scanner runs before export. Recipient gets anonymized data.
**Import behavior:** Imported data gets recipient's `tenantId` stamped. Original `tenantId` stripped.

**Implementation — every query MUST include:**
```typescript
// In every service that touches TENANT_PRIVATE data:
const filter = buildSearchFilter({
  tenantId: tenantContext.tenantId,  // From AsyncLocalStorage — NEVER a parameter
  ...otherFilters
});
// DNA-5: TenantContext is automatic, not passed as argument
```

**Iron rule:** A query that returns TENANT_PRIVATE data without `tenantId` in the filter = BUILD FAILURE.

---

### 2. FLOW_SCOPED

**Who owns it:** A specific flow definition. Conceptually belongs to the flow, not to any tenant.
**Who can see it:** Any tenant who has the flow installed.
**Can it travel:** YES — this is what moves when a flow is exported/imported as a template.

**Examples:**
- Factory patterns for the flow (SERVICE_PATTERN docs in RAG)
- Task type contracts (EngineContract definitions)
- BFA rules specific to the flow (CF-XXX conflict rules)
- Design records and decisions (DR-XXX, DD-XXX)
- Stress test definitions (ST-XXX)
- Default prompts (genesis/review/judge — the `tenantId: ""` defaults from P22)
- Flow DAG definition (the JSON flow structure)
- Skill definitions referenced by the flow (SK-XXX)

**ES document shape — FLOW_SCOPED documents carry:**
```typescript
{
  // Standard fields
  "patternId": "F1491-IBenchmarkConfigService",
  "tenantId": "",                    // Empty string = not tenant-specific
  "patternType": "SERVICE_PATTERN",

  // Connection classification
  "connectionType": "FLOW_SCOPED",
  "flowId": "FLOW-0",              // Which flow this belongs to
  "flowVersion": "1.0.0",           // Semver — travels with flow version

  // Export metadata
  "exportable": true,
  "exportGroup": "FLOW-0-v1.0.0",  // All docs with same group export together
  "dependencies": ["SK-382", "SK-379"],  // What else must exist for this to work
}
```

**Export behavior:** When a flow is packaged (FLOW-32 Template Package), all FLOW_SCOPED documents with matching `flowId` are included automatically.
**Import behavior:** On install, FLOW_SCOPED documents are written with the new tenant's flow instance ID. If the flow already exists (upgrade), documents are merged with version conflict resolution.

**Iron rule:** FLOW_SCOPED data must NEVER contain tenant-specific values (API keys, custom prompts, private results). If it does, the export scanner rejects the package.

---

### 3. TENANT_EXPORTABLE

**Who owns it:** A specific tenant, but they've marked it for sharing.
**Who can see it:** The owning tenant (always) + any tenant they explicitly share with.
**Can it travel:** YES, but with PII scrubbing and consent gate.

**Examples:**
- Tenant's improved prompts (they want to sell/share on marketplace)
- Curated training datasets (anonymized)
- Custom RAG patterns the tenant created (domain-specific knowledge)
- Benchmark results (anonymized — model scores without tenant context)
- Custom BFA rules the tenant wrote

**ES document shape — TENANT_EXPORTABLE adds:**
```typescript
{
  // Standard tenant-owned fields
  "tenantId": "acme",
  "patternType": "CUSTOM_PROMPT",

  // Connection classification
  "connectionType": "TENANT_EXPORTABLE",
  "exportConsent": true,            // Tenant explicitly opted in
  "exportConsentAt": "2026-03-19",
  "piiScrubbed": false,             // Must be true before actual export
  "anonymizationLevel": "full",     // "full" | "partial" | "none"

  // What gets anonymized on export:
  "piiFields": ["tenantId", "apiKeys", "userNames"],
  // What stays as-is:
  "safeFields": ["patternType", "codeSnippet", "tags", "quality_score"]
}
```

**Export flow:**
```
1. Tenant marks data as exportable (consent gate)
2. PII scanner identifies sensitive fields
3. Anonymizer replaces: tenantId→"exported", apiKeys→removed, userNames→"user_N"
4. Quality gate: anonymized data still makes sense (code snippets still valid)
5. Package as JSON bundle or ES snapshot
6. Available on marketplace (FLOW-32) or direct share
```

**Import flow:**
```
1. Recipient browses marketplace / receives share link
2. Preview: what's included, what connection types, what dependencies
3. Install: TENANT_EXPORTABLE docs get recipient's tenantId stamped
4. Merge: if patterns overlap, recipient chooses keep/replace/merge
5. Validation: imported patterns pass AF-7 DNA compliance check
```

---

## Document Schema Extension

**Every document in xiigen-rag-patterns, xiigen-prompts, and xiigen-engine-contracts
must include these fields:**

```typescript
interface DataConnectionFields {
  // REQUIRED on every document
  connectionType: "TENANT_PRIVATE" | "FLOW_SCOPED" | "TENANT_EXPORTABLE";
  tenantId: string;           // "" for FLOW_SCOPED, tenant ID for others

  // REQUIRED for FLOW_SCOPED
  flowId?: string;            // e.g., "FLOW-0"
  flowVersion?: string;       // e.g., "1.0.0"

  // REQUIRED for TENANT_EXPORTABLE
  exportConsent?: boolean;
  piiScrubbed?: boolean;

  // OPTIONAL but recommended
  exportGroup?: string;       // Groups docs that travel together
  dependencies?: string[];    // Other artifacts required for this to work
  createdBy?: string;         // "system" | "tenant" | "flow-import"
  importedFrom?: string;      // Source tenant/flow if imported (provenance)
}
```

---

## Export/Import Transport

### JSON Bundle (selective export)

```json
{
  "manifest": {
    "exportId": "exp-2026-03-19-001",
    "flowId": "FLOW-0",
    "flowVersion": "1.0.0",
    "exportedBy": "tenant-acme",
    "exportedAt": "2026-03-19T17:00:00Z",
    "documentCount": 42,
    "connectionTypes": {
      "FLOW_SCOPED": 35,
      "TENANT_EXPORTABLE": 7
    },
    "dependencies": {
      "skills": ["SK-382", "SK-379", "SK-385"],
      "fabrics": ["DATABASE", "AI_ENGINE", "RAG"],
      "minEngineVersion": "1.0.0"
    },
    "piiScrubbing": {
      "applied": true,
      "fieldsAnonymized": ["tenantId", "apiKeys"],
      "scanner": "v1.0"
    }
  },
  "documents": [
    {
      "connectionType": "FLOW_SCOPED",
      "patternId": "F1491-IBenchmarkConfigService",
      "patternType": "SERVICE_PATTERN",
      "flowId": "FLOW-0",
      "data": { "...": "..." }
    }
  ]
}
```

### ES Snapshot (bulk export)

```bash
# Export: create snapshot of flow-scoped documents
curl -X POST "localhost:9200/xiigen-rag-patterns/_search" \
  -d '{"query":{"bool":{"must":[
    {"term":{"connectionType":"FLOW_SCOPED"}},
    {"term":{"flowId":"FLOW-0"}}
  ]}}}'

# Package as ES snapshot
curl -X PUT "localhost:9200/_snapshot/flow-exports/flow-0-v1" \
  -d '{"indices":"xiigen-rag-patterns","partial":true}'

# Import: restore to target tenant's cluster
curl -X POST "localhost:9200/_snapshot/flow-exports/flow-0-v1/_restore"
```

---

## How Flows Reference This Skill

**Every flow planning session must answer:**

```
For each document type this flow creates:
  □ What connectionType? (TENANT_PRIVATE | FLOW_SCOPED | TENANT_EXPORTABLE)
  □ Who owns it?
  □ Who can query it?
  □ Does it travel on export?
  □ What fields need PII scrubbing?
  □ What dependencies must exist for it to work after import?
```

**Example: FLOW-0 RAG Benchmark data classification:**

| Document | Connection Type | Travels on Export? | PII Fields |
|----------|----------------|-------------------|------------|
| Factory patterns (F1491-F1508) | FLOW_SCOPED | ✅ Yes | None |
| Task contracts (T567-T578) | FLOW_SCOPED | ✅ Yes | None |
| BFA rules (CF-791-CF-800) | FLOW_SCOPED | ✅ Yes | None |
| Default prompts (genesis/judge) | FLOW_SCOPED | ✅ Yes | None |
| Benchmark results | TENANT_PRIVATE | ❌ No (unless exported) | tenantId, model scores |
| Training data captures | TENANT_PRIVATE | ❌ No | tenantId, generated code |
| ModelPreference entries | TENANT_PRIVATE | ❌ No | tenantId, cost data |
| Improved prompts (PromptOps) | TENANT_EXPORTABLE | ✅ With consent | tenantId |
| Custom BFA rules | TENANT_EXPORTABLE | ✅ With consent | tenantId |

---

## Prerequisite Implementations

**Before any flow can use this classification, these must exist:**

### 1. ES mapping update (add connectionType fields)
```json
{
  "properties": {
    "connectionType": {"type": "keyword"},
    "flowId": {"type": "keyword"},
    "flowVersion": {"type": "keyword"},
    "exportConsent": {"type": "boolean"},
    "piiScrubbed": {"type": "boolean"},
    "exportGroup": {"type": "keyword"},
    "dependencies": {"type": "keyword"},
    "createdBy": {"type": "keyword"},
    "importedFrom": {"type": "keyword"}
  }
}
```

### 2. PII scanner service
Scans documents before export. Identifies tenant-specific values.
Rejects export if PII found in FLOW_SCOPED documents.
Anonymizes TENANT_EXPORTABLE documents.

### 3. Export/import service
Produces JSON bundles with manifest.
Creates ES snapshots for bulk.
Handles import with merge conflict resolution.
Validates dependencies on import (required skills/fabrics exist).

### 4. Query guard update
Every `buildSearchFilter` call must respect connectionType:
- TENANT_PRIVATE queries MUST include tenantId filter
- FLOW_SCOPED queries filter by flowId (visible to all tenants with flow installed)
- TENANT_EXPORTABLE queries include tenantId filter (owner sees) OR exportConsent=true (marketplace sees)

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

---

## Checklist — Every New Document

- [ ] `connectionType` field present?
- [ ] If TENANT_PRIVATE: `tenantId` set, never empty?
- [ ] If FLOW_SCOPED: `flowId` + `flowVersion` set, `tenantId` empty?
- [ ] If TENANT_EXPORTABLE: `exportConsent` + `piiScrubbed` fields present?
- [ ] Query includes connectionType-appropriate filter?
- [ ] Export scanner knows about this document type?
- [ ] Import handler knows how to merge this document type?
