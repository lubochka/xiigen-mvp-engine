# XIIGen — Prompt Management Standard
## Phase 22: ES-Backed AF-3 + CRUD API + Tenant Overrides
## Track B — Foundation Standards
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements prompt management in **NestJS 11 + TypeScript 5**.
>
> **Actual implementation:**
> - `PromptLibraryStation` at `server/src/af-stations/prompt-library.station.ts`
> - Prompt seed interface at `server/src/rag-init/flow-prompt-seed.interface.ts`
> - `FlowPromptSeedBase` at `server/src/rag-init/flow-prompt-seed.base.ts`
> - AF-3 resolves prompts from `IDatabaseService` (ES index) with tenant override chain
> - 11 AF stations in `server/src/af-stations/` (af1-genesis through af11-feedback)
> - AF pipeline at `server/src/af-stations/af-pipeline.ts`
>
> **The prompt management architecture (ES-backed, tenant overrides, three-tier resolution)
> is implemented as described.**

---

## 1. Problem Statement

AF-3 PromptLibrary previously held all prompts as hardcoded strings in a static dictionary.
This meant:

- Zero API — no way to inspect, update, or version prompts at runtime
- No per-tenant override — every tenant received identical AI generation prompts regardless
  of their domain configuration
- No version history — rollback required a code deployment
- FLOW-21 shipped T307–T326 task type prompts that existed only in source code with
  no admin visibility or tunability
- Prompt drift across flows was undetectable — one flow's T307 prompt could silently diverge
  from another's equivalent task type

**Fix:** Every module ships a `{domain}.prompts.ts` file implementing `IFlowPromptSeed`.
Bootstrap Phase 8 (MODULE_SEEDING) loads all prompt seeds after `ragSeed()`.
AF-3 resolves prompts from `IDatabaseService` (ES index: `xiigen-prompts`) with a
three-tier resolution chain: tenant-specific → global default → hardcoded fallback.

---

## 2. Core Interface — IFlowPromptSeed

```typescript
// Design path: packages/core/src/interfaces/flow-prompt-seed.interface.ts
// Actual path: server/src/rag-init/flow-prompt-seed.interface.ts

import { DataProcessResult } from './data-process-result';

/**
 * Every module MUST implement IFlowPromptSeed.
 * Shipped as {domain}.prompts.ts in the module root.
 * Called by Bootstrap Phase 8 (MODULE_SEEDING) after ragSeed().
 */
export interface IFlowPromptSeed {
  /** Domain ID matching the module slug, e.g. "forms-automation" */
  readonly domainId: string;

  /**
   * Seed all prompts for this module's task types into xiigen-prompts.
   * Each prompt: promptId, taskType, role, content, version, isDefault=true.
   * DNA-3: never throws — returns DataProcessResult.
   */
  seedPrompts(): Promise<DataProcessResult<number>>;
}
```

---

## 3. ES Index Schema — xiigen-prompts

**Index name:** `xiigen-prompts`
**Scope:** dual — global defaults (no tenantId) + tenant overrides (with tenantId)
**Backing:** DATABASE FABRIC → `IDatabaseService`

### Document Shape

```typescript
// All documents stored as Record<string, unknown> — DNA-1: no typed models

{
  // --- identity ---
  "promptId":    string,    // e.g. "forms-automation::T307::genesis" | "forms-automation::T307::genesis::tenant-acme"
  "domainId":    string,    // module slug
  "taskType":    string,    // e.g. "T307"
  "role":        string,    // "genesis" | "review" | "judge" | "compliance" | "security"
  "tenantId":    string,    // "" (empty) for global defaults; tenantId for overrides — DNA-5

  // --- content ---
  "content":     string,    // the prompt text
  "version":     number,    // monotonically incrementing integer
  "isDefault":   boolean,   // true for global defaults seeded by {domain}.prompts.ts
  "isActive":    boolean,   // false = soft-deleted (DNA-3: never hard-delete)

  // --- metadata ---
  "createdAt":   string,    // ISO-8601
  "updatedAt":   string,    // ISO-8601
  "updatedBy":   string,    // tenantId or "system" for seeded defaults
  "changeNote":  string     // optional — describes what changed in this version
}
```

### buildSearchFilter usage (DNA-2)

```typescript
// Resolution query — empty tenantId auto-skipped (DNA-2)
const filter = buildSearchFilter({
  domainId:  domainId,
  taskType:  taskType,
  role:      role,
  tenantId:  tenantId,   // omit or "" → returns global defaults
  isActive:  true,
});
```

---

## 4. Prompt Resolution — Three-Tier Chain

```typescript
// Design path: apps/api/src/fabrics/ai-engine/prompt-library.station.ts
// Actual path: server/src/af-stations/prompt-library.station.ts
// AF-3 PromptLibrary — replaces hardcoded dict with DATABASE FABRIC

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { buildSearchFilter, DataProcessResult } from '@xiigen/kernel';

export interface PromptResolutionOptions {
  domainId:  string;
  taskType:  string;
  role:      string;
  tenantId?: string;   // DNA-5: scoped per tenant when provided
}

@Injectable()
export class PromptLibraryStation {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Resolution order:
   *   1. Tenant-specific override (tenantId + taskType + role + isActive)
   *   2. Global default          (no tenantId + taskType + role + isActive)
   *   3. Hardcoded fallback      (FALLBACK_PROMPTS map — DNA-3: never throws)
   */
  async resolve(
    options: PromptResolutionOptions,
  ): Promise<DataProcessResult<string>> {

    // Tier 1: tenant-specific
    if (options.tenantId) {
      const tenantResult = await this.queryPrompt({
        ...options,
        tenantId: options.tenantId,
      });
      if (tenantResult.isSuccess && tenantResult.data) {
        return DataProcessResult.success(tenantResult.data['content'] as string);
      }
    }

    // Tier 2: global default
    const globalResult = await this.queryPrompt({ ...options, tenantId: '' });
    if (globalResult.isSuccess && globalResult.data) {
      return DataProcessResult.success(globalResult.data['content'] as string);
    }

    // Tier 3: hardcoded fallback — DNA-3: never throw
    const fallbackKey = `${options.taskType}::${options.role}`;
    const fallback = FALLBACK_PROMPTS[fallbackKey];
    if (fallback) {
      return DataProcessResult.success(fallback);
    }

    return DataProcessResult.failure(
      'PROMPT_NOT_FOUND',
      `No prompt for ${fallbackKey} (domain: ${options.domainId})`,
    );
  }

  private async queryPrompt(
    options: PromptResolutionOptions & { tenantId: string },
  ): Promise<DataProcessResult<Record<string, unknown> | null>> {
    const filter = buildSearchFilter({       // DNA-2
      domainId: options.domainId,
      taskType: options.taskType,
      role:     options.role,
      tenantId: options.tenantId,
      isActive: true,
    });
    const result = await this.db.searchDocuments('xiigen-prompts', {
      ...filter,
      sortBy:  'version',
      sortDir: 'desc',
      topK:    1,
    });
    if (!result.isSuccess || !result.data?.length) {
      return DataProcessResult.success(null);
    }
    return DataProcessResult.success(result.data[0]);
  }
}

// Hardcoded fallback map — last resort, never throw
const FALLBACK_PROMPTS: Record<string, string> = {
  'T307::genesis':    'Generate a TypeScript NestJS service that stores a form schema document via DATABASE FABRIC. DNA-1: Record<string,unknown>. DNA-3: DataProcessResult<T>. DNA-5: tenantId from TenantContext.',
  'T308::genesis':    'Generate a TypeScript NestJS service that persists a form submission entry. Emit entry.persisted event AFTER database write succeeds (DNA-8). Never emit before persist.',
  'T307::judge':      'Validate the generated form schema service against: DNA-1 (no typed models), DNA-2 (buildSearchFilter), DNA-3 (DataProcessResult), DNA-5 (TenantContext), fabric-first (no direct ES imports).',
};
```

---

## 5. Abstract Base Class — FlowPromptSeedBase

```typescript
// Design path: packages/core/src/base/flow-prompt-seed.base.ts
// Actual path: server/src/rag-init/flow-prompt-seed.base.ts

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { buildSearchFilter, DataProcessResult } from '@xiigen/kernel';
import { IFlowPromptSeed } from '../interfaces/flow-prompt-seed.interface';

@Injectable()
export abstract class FlowPromptSeedBase implements IFlowPromptSeed {
  abstract readonly domainId: string;

  constructor(protected readonly db: IDatabaseService) {}

  abstract seedPrompts(): Promise<DataProcessResult<number>>;

  /** Helper: upsert one prompt document — idempotent via promptId */
  protected async upsertPrompt(
    doc: Record<string, unknown>,
  ): Promise<DataProcessResult<string>> {
    const promptId = doc['promptId'] as string;
    const filter = buildSearchFilter({ promptId });    // DNA-2
    const existing = await this.db.searchDocuments('xiigen-prompts', filter);

    if (existing.isSuccess && (existing.data?.length ?? 0) > 0) {
      return DataProcessResult.success(promptId);      // idempotent — already seeded
    }

    return this.db.storeDocument('xiigen-prompts', {
      ...doc,
      domainId:  this.domainId,
      version:   1,
      isDefault: true,
      isActive:  true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    });
  }
}
```

---

## 6. Reference Implementation — forms-automation.prompts.ts

```typescript
// modules/forms-automation/forms-automation.prompts.ts
// REFERENCE IMPLEMENTATION — use as template for all new modules

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { DataProcessResult } from '@xiigen/kernel';
import { FlowPromptSeedBase } from '@xiigen/core';

@Injectable()
export class FormsAutomationPrompts extends FlowPromptSeedBase {
  readonly domainId = 'forms-automation';

  constructor(db: IDatabaseService) { super(db); }

  async seedPrompts(): Promise<DataProcessResult<number>> {
    const prompts: Record<string, unknown>[] = [
      // T307 — Form Schema Storage Service
      {
        promptId: 'forms-automation::T307::genesis',
        taskType: 'T307',
        role:     'genesis',
        tenantId: '',
        content: `You are AF-1 Genesis generating a TypeScript NestJS service.
TASK: T307 — Form Schema Storage (ARCHETYPE: STORAGE_WRITE)
FACTORY: F852 (IFormSchemaService) via DATABASE FABRIC → Elasticsearch

MANDATORY PATTERNS:
- DNA-1: All documents as Record<string, unknown> — no typed schema classes
- DNA-2: buildSearchFilter() for all ES queries — skips null/undefined/empty
- DNA-3: Return DataProcessResult<string> — never throw for business logic
- DNA-5: const { tenantId } = this.tenantContext — from TenantContextMiddleware
- DNA-8: storeDocument() before any event emission
- Fabric: import IDatabaseService from @xiigen/fabrics — never @elastic/elasticsearch directly

IRON RULES:
- IR-307-1: Every schema document MUST include tenantId, formId, schemaVersion, createdAt
- IR-307-2: Schema validation (JSON Schema) MUST run before storage
- IR-307-3: Duplicate schema version for same formId+tenantId MUST return DataProcessResult.failure('SCHEMA_VERSION_EXISTS')`,
      },
      {
        promptId: 'forms-automation::T307::judge',
        taskType: 'T307',
        role:     'judge',
        tenantId: '',
        content: `You are AF-9 Judge validating a generated form schema service.
TASK: T307 — Form Schema Storage

QUALITY GATES (all must pass):
- QG-307-1: Extends MicroserviceBase (DNA-4) ✓/✗
- QG-307-2: Record<string,unknown> throughout — no typed models (DNA-1) ✓/✗
- QG-307-3: buildSearchFilter() on duplicate-check query (DNA-2) ✓/✗
- QG-307-4: Returns DataProcessResult<string> — no throw statements (DNA-3) ✓/✗
- QG-307-5: tenantId from this.tenantContext (DNA-5) ✓/✗
- QG-307-6: No direct import of @elastic/elasticsearch (fabric law) ✓/✗
- QG-307-7: JSON Schema validation runs before storeDocument() ✓/✗

Respond with JSON: { passed: boolean, gates: Record<gateId, {pass:boolean, note:string}> }`,
      },
      // T308 — Form Entry Persistence
      {
        promptId: 'forms-automation::T308::genesis',
        taskType: 'T308',
        role:     'genesis',
        tenantId: '',
        content: `You are AF-1 Genesis generating a TypeScript NestJS service.
TASK: T308 — Form Entry Persistence (ARCHETYPE: STORAGE_WRITE + EVENT_EMIT)
FACTORY: F858 (IFormSubmissionService) via DATABASE FABRIC → Elasticsearch

MANDATORY PATTERNS (same as T307 plus):
- DNA-8 OUTBOX RULE: storeDocument() MUST complete successfully BEFORE queue.enqueueAsync()
- EVENT: emit "entry.persisted" with { entryId, tenantId, formId } ONLY after successful persist
- IRON RULE IR-308-1: Never emit before persist — CF-386 violation if violated`,
      },
      {
        promptId: 'forms-automation::T308::judge',
        taskType: 'T308',
        role:     'judge',
        tenantId: '',
        content: `You are AF-9 Judge validating a form entry persistence service.
TASK: T308 — Form Entry Persistence

QUALITY GATES:
- QG-308-1 through QG-308-5: same as T307
- QG-308-6: entry.persisted event emitted AFTER storeDocument() returns success (DNA-8) ✓/✗
- QG-308-7: Event payload contains exactly { entryId, tenantId, formId } — no extra fields ✓/✗
- QG-308-8: No queue.enqueueAsync() before the storeDocument() result check ✓/✗

Respond with JSON: { passed: boolean, gates: Record<gateId, {pass:boolean, note:string}> }`,
      },
    ];

    let count = 0;
    for (const doc of prompts) {
      const r = await this.upsertPrompt(doc);
      if (!r.isSuccess) return DataProcessResult.failure(r.error ?? 'UPSERT_FAILED');
      count++;
    }
    return DataProcessResult.success(count);
  }
}
```

---

## 7. CRUD API Endpoints

All endpoints use DynamicController (DNA-6). All are X-Tenant-Id scoped (DNA-5).

```typescript
// Design path: apps/api/src/api/prompts.endpoints.ts
// Actual path: server/src/api/ (DynamicController pattern — no entity-specific controllers)

export const PROMPTS_ENDPOINTS = [
  {
    method:      'GET',
    path:        '/api/prompts/:taskType',
    handlerId:   'promptsGet',
    description: 'Get active prompt for taskType + role. Applies 3-tier resolution.',
    params:      { taskType: 'string — e.g. T307' },
    query:       { role: 'genesis | review | judge | compliance | security (default: genesis)' },
    headers:     { 'X-Tenant-Id': 'string — DNA-5; omit for global default' },
  },
  {
    method:      'PUT',
    path:        '/api/prompts/:taskType',
    handlerId:   'promptsPut',
    description: 'Create or update prompt for taskType + role. Creates new version (immutable history).',
    params:      { taskType: 'string' },
    body: {
      role:       'genesis | review | judge | compliance | security',
      content:    'string — prompt text',
      changeNote: 'string (optional)',
    },
    headers: { 'X-Tenant-Id': 'string — DNA-5; omit to update global default (admin only)' },
  },
  {
    method:      'GET',
    path:        '/api/prompts/:taskType/versions',
    handlerId:   'promptsVersions',
    description: 'List all versions for taskType + role, newest first.',
    params:      { taskType: 'string' },
    query:       { role: 'string (default: genesis)' },
    headers:     { 'X-Tenant-Id': 'string (optional)' },
  },
  {
    method:      'DELETE',
    path:        '/api/prompts/:taskType',
    handlerId:   'promptsDelete',
    description: 'Soft-delete active prompt (sets isActive=false). Falls back to global default.',
    params:      { taskType: 'string' },
    query:       { role: 'string (default: genesis)' },
    headers:     { 'X-Tenant-Id': 'string — required; tenants can only delete their own overrides' },
  },
];
```

### PUT handler — version-immutable write

```typescript
// DNA-7: idempotency key on version creation
async handlePromptsPut(
  taskType: string,
  body: Record<string, unknown>,
  tenantId: string,
): Promise<DataProcessResult<string>> {
  const role     = (body['role'] as string) ?? 'genesis';
  const content  = body['content'] as string;
  const domainId = body['domainId'] as string;

  if (!content) return DataProcessResult.failure('CONTENT_REQUIRED');

  // Get current max version
  const filter = buildSearchFilter({ taskType, role, tenantId, isActive: true });  // DNA-2
  const current = await this.db.searchDocuments('xiigen-prompts', {
    ...filter, sortBy: 'version', sortDir: 'desc', topK: 1,
  });
  const nextVersion = current.isSuccess && current.data?.length
    ? (current.data[0]['version'] as number) + 1
    : 1;

  // Deactivate current active version
  if (current.isSuccess && current.data?.length) {
    await this.db.storeDocument('xiigen-prompts', {
      ...current.data[0],
      isActive:  false,
      updatedAt: new Date().toISOString(),
    });
  }

  // Store new version
  const promptId = tenantId
    ? `${domainId}::${taskType}::${role}::${tenantId}::v${nextVersion}`
    : `${domainId}::${taskType}::${role}::v${nextVersion}`;

  return this.db.storeDocument('xiigen-prompts', {
    promptId,
    domainId,
    taskType,
    role,
    tenantId:   tenantId ?? '',
    content,
    version:    nextVersion,
    isDefault:  false,
    isActive:   true,
    createdAt:  new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
    updatedBy:  tenantId ?? 'admin',
    changeNote: (body['changeNote'] as string) ?? '',
  });
}
```

---

## 8. Bootstrap Phase 8 Update

Module seeding now calls `ragSeed()` first, then `loadPrompts()`:

```typescript
// Design path: apps/api/src/bootstrap/phases/module-seeding.phase.ts
// Actual path: server/src/bootstrap/ (bootstrap module)

async execute(): Promise<DataProcessResult<Record<string, unknown>>> {
  const ragSeeds    = await this.discovery.discoverRagSeeds();
  const promptSeeds = await this.discovery.discoverPromptSeeds();

  const ragResults:    Record<string, number> = {};
  const promptResults: Record<string, number> = {};

  // 1. RAG seeds (Phase 21)
  for (const seed of ragSeeds) {
    const result = await seed.seedAll();
    ragResults[seed.domainId] = result.isSuccess ? (result.data ?? 0) : -1;
  }

  // 2. Prompt seeds (Phase 22) — after RAG
  for (const seed of promptSeeds) {
    const result = await seed.seedPrompts();
    promptResults[seed.domainId] = result.isSuccess ? (result.data ?? 0) : -1;
  }

  return DataProcessResult.success({ ragResults, promptResults });
}
```

---

## 9. Tests Required

### Unit tests

```typescript
// apps/api/src/test/unit/prompt-management.spec.ts

describe('PromptLibraryStation — 3-tier resolution', () => {
  it('resolves tenant-specific override when present', async () => {
    mockDb.searchDocuments
      .mockResolvedValueOnce(DataProcessResult.success([{ content: 'tenant prompt', version: 2 }]));
    const result = await station.resolve({ domainId: 'forms-automation', taskType: 'T307', role: 'genesis', tenantId: 'acme' });
    expect(result.data).toBe('tenant prompt');
  });

  it('falls back to global default when no tenant override', async () => {
    mockDb.searchDocuments
      .mockResolvedValueOnce(DataProcessResult.success([]))           // no tenant override
      .mockResolvedValueOnce(DataProcessResult.success([{ content: 'global prompt', version: 1 }]));
    const result = await station.resolve({ domainId: 'forms-automation', taskType: 'T307', role: 'genesis', tenantId: 'acme' });
    expect(result.data).toBe('global prompt');
  });

  it('falls back to hardcoded FALLBACK_PROMPTS when DB empty', async () => {
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
    const result = await station.resolve({ domainId: 'forms-automation', taskType: 'T307', role: 'genesis' });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toContain('DATABASE FABRIC');
  });

  it('returns DataProcessResult.failure when no prompt found at any tier', async () => {
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
    const result = await station.resolve({ domainId: 'forms-automation', taskType: 'T999', role: 'genesis' });
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe('PROMPT_NOT_FOUND');
  });
});

describe('FormsAutomationPrompts seed', () => {
  it('seedPrompts() returns DataProcessResult<number> — never throws', async () => {
    const result = await seed.seedPrompts();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeGreaterThanOrEqual(4); // T307×2 + T308×2
  });

  it('seedPrompts() is idempotent — second call same result', async () => {
    await seed.seedPrompts();
    const second = await seed.seedPrompts();
    expect(second.isSuccess).toBe(true);
  });
});

describe('Prompt CRUD', () => {
  it('PUT creates version 1 for new prompt', async () => { /* ... */ });
  it('PUT increments version on update', async () => { /* ... */ });
  it('PUT deactivates previous version', async () => { /* ... */ });
  it('GET /versions returns newest first', async () => { /* ... */ });
  it('DELETE soft-deletes — isActive=false, not removed', async () => { /* ... */ });
});
```

### Integration tests

```typescript
// apps/api/src/test/integration/prompt-management.spec.ts

describe('Prompt management API', () => {
  it('T307 genesis prompt retrievable after seeding', async () => {
    await app.get(FormsAutomationPrompts).seedPrompts();
    const res = await request(app.getHttpServer())
      .get('/api/prompts/T307?role=genesis');
    expect(res.status).toBe(200);
    expect(res.body.data).toContain('DATABASE FABRIC');
  });

  it('tenant override takes precedence over global default', async () => {
    await request(app.getHttpServer())
      .put('/api/prompts/T307')
      .set('X-Tenant-Id', 'acme')
      .send({ role: 'genesis', domainId: 'forms-automation', content: 'Acme custom prompt' });
    const res = await request(app.getHttpServer())
      .get('/api/prompts/T307?role=genesis')
      .set('X-Tenant-Id', 'acme');
    expect(res.body.data).toBe('Acme custom prompt');
  });

  it('other tenant still gets global default after acme override', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/prompts/T307?role=genesis')
      .set('X-Tenant-Id', 'other-corp');
    expect(res.body.data).not.toBe('Acme custom prompt');
  });
});
```

---

## 10. Module Template Update

```
modules/{domain-slug}/
├── index.ts
├── manifest.ts
├── {domain}.module.ts
├── {domain}.controller.ts
│
├── ── MANDATORY STANDARD FILES ──────────────────────────────
│
├── {domain}.rag-seed.ts        ← Phase 21 ✅ COMPLETE
│
├── {domain}.prompts.ts         ← THIS FILE (Phase 22) ✅ NOW REQUIRED
│                                    extends FlowPromptSeedBase
│                                    implements seedPrompts()
│                                    one entry per T[n] × role combination
│
├── {domain}.endpoints.ts       ← Phase 23 (PENDING)
├── {domain}.logger.ts          ← Phase 24 (PENDING)
├── {domain}.docs.ts            ← Phase 25 (PENDING)
│
└── {group}/
    └── {service}.ts
```

---

## 11. Iron Rules (Added by Phase 22)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P22-1 | Every module MUST ship `{domain}.prompts.ts` implementing `IFlowPromptSeed` | VALIDATION_REPORT build failure |
| IR-P22-2 | `seedPrompts()` MUST return `DataProcessResult<number>` — never throw | AF-7 compliance failure |
| IR-P22-3 | Every task type in a module MUST have at minimum a `genesis` + `judge` prompt seeded | Incomplete AF pipeline |
| IR-P22-4 | `PUT /api/prompts/:taskType` MUST create a new version — never overwrite existing | Version history integrity |
| IR-P22-5 | `DELETE /api/prompts/:taskType` MUST soft-delete only (`isActive=false`) — never hard-delete | Audit trail requirement |
| IR-P22-6 | Tenant override MUST NOT be visible to other tenants (DNA-5) | Cross-tenant data leakage |
| IR-P22-7 | AF-3 resolution MUST follow tier order: tenant → global → fallback — never skip tiers | Predictable override chain |
| IR-P22-8 | Hardcoded `FALLBACK_PROMPTS` MUST exist for every seeded task type as last-resort safety net | DNA-3: never return empty |

---

## 12. Backward Compatibility

- All existing artifact numbers unchanged (F1–F1483, T1–T564, CF-1–CF-788, SK-1–SK-401, DR-1–DR-266)
- `SK-387 PromptBuilder.build(templateId, context)` delegates to `PromptLibraryStation.resolve()` — callers unchanged
- AF-3 station interface unchanged; prompt resolution is now DB-backed but signature is identical
- `xiigen-prompts` index is additive — no existing index modified
- FLOW-35 next anchors unchanged: F1484 · Family 223 · T565 · CF-789 · SK-402 · DR-267

---

## 13. Checkpoint

```json
{
  "phase": 22,
  "title": "Prompt Management Standard",
  "status": "complete",
  "delivers": [
    "IFlowPromptSeed interface",
    "FlowPromptSeedBase abstract class",
    "PromptLibraryStation: 3-tier resolution (tenant → global → fallback)",
    "forms-automation.prompts.ts reference implementation (4 prompts: T307×2, T308×2)",
    "PROMPTS_ENDPOINTS: GET/PUT/GET-versions/DELETE /api/prompts/:taskType",
    "Bootstrap Phase 8 updated: ragSeed() then loadPrompts() in sequence",
    "Unit tests: 3-tier resolution, idempotency, CRUD",
    "Integration tests: seed → GET, tenant override isolation",
    "Module template: {domain}.prompts.ts mandatory (file 2 of 6)"
  ],
  "esIndex": "xiigen-prompts",
  "ironRulesAdded": 8,
  "ironRuleRange": "IR-P22-1 through IR-P22-8",
  "mandatoryModuleFiles": 2,
  "bootstrapPhases": 9,
  "artifactNumbersUnchanged": true,
  "nextAnchors": { "F": 1484, "T": 565, "CF": 789, "SK": 402, "DR": 267 }
}
```
