# Flow Prerequisites Skill v1.0
## What must exist, be tested, and be connected BEFORE the first flow runs
---
name: flow-prerequisites
version: "1.0.0"
description: >
  Before implementing ANY flow through the AF pipeline, certain infrastructure,
  integrations, and services must exist and be verified. This skill lists every
  prerequisite, how to test it, and what to do if it's missing. Skip this and
  the first flow fails on missing infrastructure, not on logic.
author: luba
updated: "2026-03-19"
priority: SUPREME
triggers:
  - "first flow"
  - "prerequisites"
  - "before we start"
  - "what do we need"
  - "infrastructure check"
---

## Why This Skill Exists

The first flow implementation will fail if any of these are missing:
- ES index doesn't exist → RAG seeding crashes
- No project tracker connection → V6 validation fails
- Prompt index not seeded → AF-3 returns empty
- No export/import schema → data classification undefined

These are NOT flow-specific. They are platform infrastructure.
Build them once, every flow uses them.

---

## PREREQUISITE CHECKLIST (3 tiers)

### TIER 1: MUST EXIST (blocks everything)

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
      "indexedAt":       {"type": "date"}
    }
  }
}'

# Create xiigen-prompts index (P22 standard + connectionType)
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

**Same for local RAG (port 19200) — identical schema.**

**Test:**
```bash
curl localhost:9200/xiigen-rag-patterns/_mapping | jq '.xiigen-rag-patterns.mappings.properties.connectionType'
# Expected: {"type": "keyword"}
curl localhost:19200/xiigen-rag-patterns/_mapping | jq '.xiigen-rag-patterns.mappings.properties.connectionType'
# Expected: {"type": "keyword"}
```

---

#### P-2: Project tracker connection (Jira / Trello / open-source alternative / DB fallback)

**What:** A service that can create cards, update status, log time, and link to epics.
**Why:** V6 validation dimension requires project tracking. Without it, phases can't be tracked.

**Implementation options (pick one, implement through fabric interface):**

```typescript
// server/src/fabrics/interfaces/project-tracker.interface.ts
export interface IProjectTrackerService {
  createCard(params: {
    title: string;
    description: string;
    epicId?: string;
    labels?: string[];
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown>>>;

  updateCardStatus(params: {
    cardId: string;
    status: string;   // "todo" | "in_progress" | "done" | "blocked"
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown>>>;

  logTime(params: {
    cardId: string;
    minutes: number;
    description?: string;
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown>>>;

  linkToEpic(params: {
    cardId: string;
    epicId: string;
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown>>>;
}
```

**Provider options (FREEDOM config selects which):**

| Provider | Integration | Complexity | Recommended For |
|----------|------------|-----------|-----------------|
| **ES-backed (in-house)** | Store cards as ES docs, query via API | Low | First implementation, no external deps |
| Jira Cloud | REST API via ISecretsService for API key | Medium | Production teams using Jira |
| Trello | REST API via ISecretsService | Medium | Small teams |
| Linear | GraphQL API | Medium | Modern teams |
| GitHub Issues | REST API (already have GitHub access) | Low | Developers already on GitHub |

**Recommendation: Start with ES-backed provider.** It needs zero external services,
uses existing DATABASE FABRIC, and can be replaced with Jira/Trello later via FREEDOM config.

```typescript
// server/src/fabrics/project-tracker/es-tracker.provider.ts
@Injectable()
export class EsProjectTrackerProvider implements IProjectTrackerService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async createCard(params: { title: string; tenantId: string; ... }): Promise<DataProcessResult<...>> {
    const card: Record<string, unknown> = {
      card_id: `card-${randomUUID().substring(0, 8)}`,
      title: params.title,
      status: 'todo',
      tenant_id: params.tenantId,
      created_at: new Date().toISOString(),
      // connectionType: TENANT_PRIVATE (cards are tenant-owned)
      connection_type: 'TENANT_PRIVATE',
    };
    return this.db.storeDocument(params.tenantId, 'xiigen-project-cards', card);
  }
}
```

**Test:**
```typescript
describe('ProjectTracker', () => {
  it('creates a card and retrieves it', async () => {
    const result = await tracker.createCard({
      title: 'FLOW-0 Phase A', tenantId: 'test-tenant', ...
    });
    expect(result.isSuccess).toBe(true);
    const card = await tracker.getCard({ cardId: result.data.card_id, tenantId: 'test-tenant' });
    expect(card.data.title).toBe('FLOW-0 Phase A');
  });

  it('tenant isolation: tenant B cannot see tenant A cards', async () => {
    await tracker.createCard({ title: 'A card', tenantId: 'tenant-a' });
    const result = await tracker.listCards({ tenantId: 'tenant-b' });
    expect(result.data.length).toBe(0);
  });
});
```

---

#### P-3: AF-3 prompt resolution connected to ES (not just in-memory)

**What:** AF-3 PromptLibrary currently uses an in-memory Map. For production flows,
it must resolve from xiigen-prompts ES index (P22 standard three-tier chain).

**Current state (from codebase):**
```typescript
// af3-prompt-library.ts line 22:
private readonly prompts = new Map<string, Array<Record<string, unknown>>>();
```

**Required:** Add ES-backed resolution as primary, in-memory as fallback.
This is P22 standard: tenant-specific → global default → hardcoded fallback.

**Test:**
```typescript
it('AF-3 resolves prompt from ES when available', async () => {
  // Seed a prompt to ES
  await db.storeDocument('', 'xiigen-prompts', {
    promptId: 'test::T567::genesis',
    taskType: 'T567', role: 'genesis',
    tenantId: '', content: 'Generate benchmark code...',
    version: 1, isDefault: true, isActive: true,
    connectionType: 'FLOW_SCOPED', flowId: 'FLOW-0',
  });
  // AF-3 should find it
  const result = await promptLibrary.execute({ tenantId: 'any', taskType: 'T567' });
  expect(result.data.prompts.length).toBeGreaterThan(0);
  expect(result.data.prompts[0].content).toContain('benchmark');
});
```

---

#### P-4: connectionType field added to existing code patterns

**What:** The existing `toRagDocument()` in `pattern-types.ts` doesn't include `connectionType`.
**Why:** Without it, existing patterns have no classification.

**Fix:**
```typescript
// In pattern-types.ts toRagDocument():
export function toRagDocument(pattern: CodePattern): Record<string, unknown> {
  return {
    ...existing_fields,
    connection_type: 'FLOW_SCOPED',           // ADD
    flow_id: pattern.metadata.flowId ?? '',    // ADD
    flow_version: pattern.metadata.flowVersion ?? '1.0.0', // ADD
    tenant_id: '',                             // ADD (code patterns are platform-level)
  };
}
```

**Test:**
```typescript
it('toRagDocument includes connectionType', () => {
  const doc = toRagDocument(createPattern({ name: 'test', ... }));
  expect(doc.connection_type).toBe('FLOW_SCOPED');
  expect(doc.tenant_id).toBe('');
});
```

---

### TIER 2: SHOULD EXIST (enables full validation)

#### P-5: PII scanner for export

A service that scans documents before export and identifies tenant-specific fields.
Can be simple regex-based initially (scan for tenant IDs, API key patterns, email patterns).
Required for TENANT_EXPORTABLE data to work.

#### P-6: Export/import bundle service

Creates JSON bundles with manifest. Validates dependencies on import.
Can start as a simple "serialize matching docs to JSON file" utility.
Required for FLOW_SCOPED data to travel between tenants.

#### P-7: docker-compose.test.yml with both RAG tiers

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

#### P-8: GitHub Actions CI with flow validation
#### P-9: Structured logging for AF station traces (P24 standard)
#### P-10: Health endpoints per flow (P24 standard)

---

## Implementation Order

```
Week 0 (before any flow):
  1. P-1: Create ES indices with connectionType schema (2 hours)
  2. P-4: Add connectionType to existing toRagDocument (1 hour)
  3. P-2: Implement ES-backed project tracker (3 hours)
  4. P-3: Wire AF-3 to ES with fallback to in-memory (2 hours)
  5. P-7: docker-compose.test.yml (30 min)
  6. Tests for all of the above (2 hours)
  Total: ~10 hours

Then any flow can start with full infrastructure.
```

---

## Verification Gate (run before first flow)

```bash
# P-1: ES indices exist with correct schema
curl -s localhost:9200/xiigen-rag-patterns/_mapping | jq '.xiigen-rag-patterns.mappings.properties | keys' | grep connectionType
curl -s localhost:9200/xiigen-prompts/_mapping | jq '.xiigen-prompts.mappings.properties | keys' | grep connectionType
curl -s localhost:19200/xiigen-rag-patterns/_mapping | jq keys | grep connectionType

# P-2: Project tracker works
cd server && npx jest --testPathPattern="project-tracker" --verbose

# P-3: AF-3 resolves from ES
cd server && npx jest --testPathPattern="af3.*es\|prompt-library.*es" --verbose

# P-4: connectionType in RAG docs
cd server && npx jest --testPathPattern="pattern-types\|rag-document" --verbose

# P-7: Docker compose starts
docker compose -f docker-compose.test.yml up -d
curl localhost:9200  # global
curl localhost:19200  # local

# Full suite still passes
cd server && npx jest --verbose  # >= 2,342
cd client && npx jest --verbose  # >= 220
```
