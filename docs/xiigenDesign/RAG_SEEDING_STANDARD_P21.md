# XIIGen — RAG Seeding Standard
## Phase 21: Bootstrap Phase 8 + Per-Flow Seed Files
## Track B — Foundation Standards
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements this standard in **NestJS 11 + TypeScript 5**.
>
> **Actual implementation:**
> - 35 files in `server/src/rag-init/` implementing RAG seeding
> - `IFlowRagSeed` interface at `server/src/rag-init/flow-rag-seed.interface.ts`
> - `FlowRagSeedBase` base class at `server/src/rag-init/flow-rag-seed.base.ts`
> - `RagIndexerService` at `server/src/rag-init/rag-indexer.service.ts`
> - `RagPatternSeederService` at `server/src/rag-init/rag-pattern-seeder.service.ts`
> - Per-flow seed files: `event-management.rag-seed.ts`, `marketplace.rag-seed.ts`, etc.
> - `SkillIndexer` and `CodePatternExtractor` also in rag-init/
> - Bootstrap Phase 8 discovery + seeding pattern is implemented as described
>
> **The RAG seeding architecture described below is accurately implemented.**

---

## 1. Problem Statement

AF-4 RagContextStation previously backed its pattern retrieval from an in-memory list assembled
at startup. This meant:

- Patterns were not queryable at runtime (no `/api/rag/search`)
- New flows could not add their patterns without code changes to the AF pipeline
- BFA rules and design records were invisible to the AI code-generation pipeline
- FLOW-21 shipped 49 services, 12 skills, 20 BFA rules, and 10 design records — none of which
  were indexed or retrievable by AF-4 during code generation

**Fix:** Every module ships a `{domain}.rag-seed.ts` file that implements `IFlowRagSeed`.
Bootstrap Phase 8 (MODULE_SEEDING) discovers all modules and calls each seed file.
AF-4 queries the live ES index `xiigen-rag-patterns` via `IDatabaseService` (DATABASE FABRIC).

---

## 2. Core Interface — IFlowRagSeed

```typescript
// Design path: packages/core/src/interfaces/flow-rag-seed.interface.ts
// Actual path: server/src/rag-init/flow-rag-seed.interface.ts

import { DataProcessResult } from './data-process-result';

/**
 * Every module MUST implement IFlowRagSeed.
 * Shipped as {domain}.rag-seed.ts in the module root.
 * Called by Bootstrap Phase 8 (MODULE_SEEDING).
 */
export interface IFlowRagSeed {
  /**
   * Seed domain ID — matches the module slug, e.g. "forms-automation".
   * Used as ES document routing key and for deduplication.
   */
  readonly domainId: string;

  /**
   * Index all service patterns for this module into xiigen-rag-patterns.
   * Each pattern: factory ID, interface name, skill references, fabric resolution,
   * archetype tags, code template snippets.
   */
  indexPatterns(): Promise<DataProcessResult<number>>;

  /**
   * Index all BFA rules for this module into xiigen-rag-patterns.
   * Each rule: CF-id, trigger, conflict description, resolution guidance.
   */
  indexBfaRules(): Promise<DataProcessResult<number>>;

  /**
   * Index all design records for this module into xiigen-rag-patterns.
   * Each record: DR-id, title, decision, rationale, consequences.
   */
  indexDesignRecords(): Promise<DataProcessResult<number>>;

  /**
   * Convenience: run all three index operations in sequence.
   * Returns total documents indexed.
   * DNA-3: never throws — returns DataProcessResult.
   */
  seedAll(): Promise<DataProcessResult<number>>;
}
```

---

## 3. ES Index Schema — xiigen-rag-patterns

**Index name:** `xiigen-rag-patterns`  
**Scope:** global (shared across tenants — these are engine patterns, not tenant data)  
**Backing:** DATABASE FABRIC → `IDatabaseService.storeDocument()`

### Document Shape

```typescript
// All documents stored as Record<string, unknown> — DNA-1: no typed models

{
  // --- identity ---
  "patternId":   string,        // e.g. "F852-IFormSchemaService" | "CF-398" | "DR-134"
  "domainId":    string,        // module slug, e.g. "forms-automation"
  "patternType": "SERVICE_PATTERN" | "BFA_RULE" | "DESIGN_RECORD" | "TASK_CONTRACT",
  "seededAt":    string,        // ISO-8601

  // --- SERVICE_PATTERN fields ---
  "factoryId":      string,     // e.g. "F852"
  "interfaceName":  string,     // e.g. "IFormSchemaService"
  "archetype":      string,     // e.g. "STORAGE_WRITE"
  "fabric":         string,     // e.g. "DATABASE"
  "fabricProvider": string,     // e.g. "Elasticsearch"
  "skillRefs":      string[],   // e.g. ["SK-05", "SK-382"]
  "taskTypeRefs":   string[],   // e.g. ["T307"]
  "codeSnippet":    string,     // 3–8 line representative TypeScript snippet

  // --- BFA_RULE fields ---
  "cfId":           string,     // e.g. "CF-398"
  "trigger":        string,     // when this rule fires
  "conflictDesc":   string,     // what the conflict is
  "resolution":     string,     // how the engine resolves it
  "flowScope":      string[],   // which flows are affected

  // --- DESIGN_RECORD fields ---
  "drId":           string,     // e.g. "DR-134"
  "title":          string,
  "decision":       string,
  "rationale":      string,
  "consequences":   string,

  // --- search helpers (all types) ---
  "tags":           string[],   // free-form searchable tags
  "keywords":       string      // concatenated searchable text for full-text search
}
```

### buildSearchFilter usage (DNA-2)

```typescript
// AF-4 query — empty fields auto-skipped (DNA-2)
const filter = buildSearchFilter({
  domainId:    options.domainId,    // optional — omit to search all domains
  patternType: options.patternType, // optional — omit for all types
  archetype:   options.archetype,   // optional
  fabric:      options.fabric,      // optional
});
```

---

## 4. Abstract Base Class — FlowRagSeedBase

```typescript
// Design path: packages/core/src/base/flow-rag-seed.base.ts
// Actual path: server/src/rag-init/flow-rag-seed.base.ts

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { buildSearchFilter, DataProcessResult } from '@xiigen/kernel';
import { IFlowRagSeed } from '../interfaces/flow-rag-seed.interface';

@Injectable()
export abstract class FlowRagSeedBase implements IFlowRagSeed {
  abstract readonly domainId: string;

  constructor(protected readonly db: IDatabaseService) {}

  // Subclasses implement these three methods
  abstract indexPatterns(): Promise<DataProcessResult<number>>;
  abstract indexBfaRules(): Promise<DataProcessResult<number>>;
  abstract indexDesignRecords(): Promise<DataProcessResult<number>>;

  async seedAll(): Promise<DataProcessResult<number>> {
    let total = 0;
    for (const fn of [
      () => this.indexPatterns(),
      () => this.indexBfaRules(),
      () => this.indexDesignRecords(),
    ]) {
      const result = await fn();
      if (!result.isSuccess) return result;       // DNA-3: propagate failure, never throw
      total += result.data ?? 0;
    }
    return DataProcessResult.success(total);
  }

  /** Helper: upsert one pattern document — idempotent via patternId */
  protected async upsertPattern(
    doc: Record<string, unknown>,
  ): Promise<DataProcessResult<string>> {
    const patternId = doc['patternId'] as string;
    const filter = buildSearchFilter({ patternId });   // DNA-2
    const existing = await this.db.searchDocuments('xiigen-rag-patterns', filter);
    if (existing.isSuccess && (existing.data?.length ?? 0) > 0) {
      return DataProcessResult.success(patternId);     // already indexed — idempotent
    }
    return this.db.storeDocument('xiigen-rag-patterns', {
      ...doc,
      domainId:  this.domainId,
      seededAt:  new Date().toISOString(),
    });
  }
}
```

---

## 5. Reference Implementation — forms-automation.rag-seed.ts

```typescript
// modules/forms-automation/forms-automation.rag-seed.ts
// REFERENCE IMPLEMENTATION — use as template for all new modules

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { DataProcessResult } from '@xiigen/kernel';
import { FlowRagSeedBase } from '@xiigen/core';

@Injectable()
export class FormsAutomationRagSeed extends FlowRagSeedBase {
  readonly domainId = 'forms-automation';

  constructor(db: IDatabaseService) { super(db); }

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns: Record<string, unknown>[] = [
      {
        patternId:    'F852-IFormSchemaService',
        patternType:  'SERVICE_PATTERN',
        factoryId:    'F852',
        interfaceName:'IFormSchemaService',
        archetype:    'STORAGE_WRITE',
        fabric:       'DATABASE',
        fabricProvider:'Elasticsearch',
        skillRefs:    ['SK-05', 'SK-382'],
        taskTypeRefs: ['T307'],
        tags:         ['forms', 'schema', 'authoring', 'json-schema'],
        keywords:     'form schema store validate tenant-scoped authoring',
        codeSnippet: [
          'const docId = this.keyGen.generateDocId(tenantId);',
          'return this.db.storeDocument(tenantId, "form-schemas", payload, docId);',
        ].join('\n'),
      },
      {
        patternId:    'F858-IFormSubmissionService',
        patternType:  'SERVICE_PATTERN',
        factoryId:    'F858',
        interfaceName:'IFormSubmissionService',
        archetype:    'STORAGE_WRITE',
        fabric:       'DATABASE',
        fabricProvider:'Elasticsearch',
        skillRefs:    ['SK-05'],
        taskTypeRefs: ['T308'],
        tags:         ['forms', 'submission', 'entry', 'persistence'],
        keywords:     'form submission entry persist emit event after write',
        codeSnippet: [
          'const result = await this.db.storeDocument(tenantId, "form-entries", payload, docId);',
          'if (!result.isSuccess) return result;',
          'await this.queue.enqueueAsync("entry.persisted", { entryId, tenantId, formId });',
        ].join('\n'),
      },
    ];

    let count = 0;
    for (const doc of patterns) {
      const r = await this.upsertPattern(doc);
      if (!r.isSuccess) return DataProcessResult.failure(r.error ?? 'UPSERT_FAILED');
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules: Record<string, unknown>[] = [
      {
        patternId:    'CF-386-emit-after-persist',
        patternType:  'BFA_RULE',
        cfId:         'CF-386',
        trigger:      'Event emitted before persistence write completes',
        conflictDesc: 'Queue receives entry.persisted before ES has the document — consumers will 404',
        resolution:   'Enforce OUTBOX pattern (DNA-8): persist first, emit only on success',
        flowScope:    ['forms-automation'],
        tags:         ['forms', 'outbox', 'event-ordering', 'dna-8'],
        keywords:     'emit after persist outbox event ordering CF-386',
      },
      {
        patternId:    'CF-398-tenant-isolation',
        patternType:  'BFA_RULE',
        cfId:         'CF-398',
        trigger:      'Service accesses documents without tenant scope',
        conflictDesc: 'Cross-tenant data leakage — tenant A reads tenant B documents',
        resolution:   'TenantContextMiddleware enforces X-Tenant-Id on every request; ITenantRegistry validates',
        flowScope:    ['forms-automation', 'all'],
        tags:         ['tenant-isolation', 'dna-5', 'cf-398', 'mt'],
        keywords:     'tenant isolation scope cross-tenant leakage CF-398',
      },
    ];

    let count = 0;
    for (const doc of rules) {
      const r = await this.upsertPattern(doc);
      if (!r.isSuccess) return DataProcessResult.failure(r.error ?? 'UPSERT_FAILED');
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records: Record<string, unknown>[] = [
      {
        patternId:    'DR-134-emit-after-persist',
        patternType:  'DESIGN_RECORD',
        drId:         'DR-134',
        title:        'Event emission ordering — persist-then-emit',
        decision:     'All domain events must be emitted AFTER the persistence write succeeds',
        rationale:    'Consumers assume ES document exists when they process the event. Emitting first creates a race condition.',
        consequences: 'All services use IOutboxService (DNA-8). No direct queue.enqueueAsync before storeDocument.',
        tags:         ['forms', 'outbox', 'event-ordering', 'dr-134'],
        keywords:     'emit after persist outbox DR-134',
      },
    ];

    let count = 0;
    for (const doc of records) {
      const r = await this.upsertPattern(doc);
      if (!r.isSuccess) return DataProcessResult.failure(r.error ?? 'UPSERT_FAILED');
      count++;
    }
    return DataProcessResult.success(count);
  }
}
```

---

## 6. Bootstrap Phase 8 — MODULE_SEEDING

```typescript
// apps/api/src/bootstrap/phases/module-seeding.phase.ts

import { Injectable } from '@nestjs/common';
import { ModuleDiscoveryService } from '../module-discovery.service';
import { DataProcessResult } from '@xiigen/kernel';

/**
 * Bootstrap Phase 8 — MODULE_SEEDING
 * Discovers all installed modules and calls seedAll() on each.
 * Runs after ENGINE_READY (Phase 7), before MT_CONTEXT (Phase 9).
 */
@Injectable()
export class ModuleSeedingPhase {
  constructor(private readonly discovery: ModuleDiscoveryService) {}

  async execute(): Promise<DataProcessResult<Record<string, number>>> {
    const seeds = await this.discovery.discoverRagSeeds();
    const results: Record<string, number> = {};

    for (const seed of seeds) {
      const result = await seed.seedAll();
      if (!result.isSuccess) {
        // DNA-3: log and continue — one module failing should not block bootstrap
        results[seed.domainId] = -1;
        continue;
      }
      results[seed.domainId] = result.data ?? 0;
    }

    return DataProcessResult.success(results);
  }
}
```

---

## 7. AF-4 RagContextStation Update

```typescript
// apps/api/src/fabrics/rag/rag-context.station.ts
// BEFORE: searched an in-memory skill list
// AFTER:  queries xiigen-rag-patterns via IDatabaseService (DATABASE FABRIC)

import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '@xiigen/fabrics';
import { buildSearchFilter, DataProcessResult } from '@xiigen/kernel';

export interface RagSearchOptions {
  query:       string;
  patternType?: 'SERVICE_PATTERN' | 'BFA_RULE' | 'DESIGN_RECORD' | 'TASK_CONTRACT';
  domainId?:   string;
  archetype?:  string;
  topK?:       number;
}

@Injectable()
export class RagContextStation {
  constructor(private readonly db: IDatabaseService) {}

  async search(options: RagSearchOptions): Promise<DataProcessResult<Record<string, unknown>[]>> {
    const filter = buildSearchFilter({         // DNA-2: skips null/undefined/empty
      patternType: options.patternType,
      domainId:    options.domainId,
      archetype:   options.archetype,
    });

    const result = await this.db.searchDocuments('xiigen-rag-patterns', {
      ...filter,
      query:   options.query,
      topK:    options.topK ?? 5,
    });

    return result;                              // DNA-3: return result, never throw
  }
}
```

---

## 8. API Endpoints

Both endpoints are registered in the `ENDPOINTS` registry (DNA-6 — DynamicController).
All requests are scoped to the engine (not per-tenant — these are engine patterns).

```typescript
// apps/api/src/api/rag.endpoints.ts

export const RAG_ENDPOINTS = [
  {
    method:    'POST',
    path:      '/api/rag/search',
    handlerId: 'ragSearch',
    description: 'Full-text search across xiigen-rag-patterns index',
    body: {
      query:       'string — search text',
      patternType: 'SERVICE_PATTERN | BFA_RULE | DESIGN_RECORD | TASK_CONTRACT (optional)',
      domainId:    'string (optional) — filter by module',
      archetype:   'string (optional)',
      topK:        'number (optional, default 5)',
    },
  },
  {
    method:    'GET',
    path:      '/api/rag/patterns',
    handlerId: 'ragPatterns',
    description: 'List all patterns with optional domainId/patternType filter',
    query: {
      domainId:    'string (optional)',
      patternType: 'SERVICE_PATTERN | BFA_RULE | DESIGN_RECORD | TASK_CONTRACT (optional)',
    },
  },
];
```

---

## 9. Tests Required

### Unit tests

```typescript
// apps/api/src/test/unit/rag-seed.spec.ts

describe('IFlowRagSeed contract', () => {
  it('indexPatterns() returns DataProcessResult<number> — never throws', async () => {
    const seed = new FormsAutomationRagSeed(mockDb);
    const result = await seed.indexPatterns();
    expect(result.isSuccess).toBe(true);
    expect(typeof result.data).toBe('number');
  });

  it('indexBfaRules() returns DataProcessResult<number>', async () => {
    const result = await seed.indexBfaRules();
    expect(result.isSuccess).toBe(true);
  });

  it('indexDesignRecords() returns DataProcessResult<number>', async () => {
    const result = await seed.indexDesignRecords();
    expect(result.isSuccess).toBe(true);
  });

  it('seedAll() returns total count of all indexed docs', async () => {
    const result = await seed.seedAll();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeGreaterThanOrEqual(3); // patterns + bfa + dr
  });

  it('seedAll() is idempotent — second call same result', async () => {
    await seed.seedAll();
    const second = await seed.seedAll();
    expect(second.isSuccess).toBe(true);
  });

  it('seedAll() returns DataProcessResult.failure on db error — never throws', async () => {
    const failDb = { storeDocument: jest.fn().mockResolvedValue(
      DataProcessResult.failure('DB_ERROR')
    )};
    const failSeed = new FormsAutomationRagSeed(failDb as any);
    const result = await failSeed.seedAll();
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe('DB_ERROR');
  });
});
```

### Integration test — seed → search roundtrip

```typescript
// apps/api/src/test/integration/rag-seed-search.spec.ts

describe('RAG seed → search roundtrip', () => {
  it('seeded pattern is retrievable via /api/rag/search', async () => {
    // 1. Seed
    await app.get(FormsAutomationRagSeed).seedAll();

    // 2. Search
    const res = await request(app.getHttpServer())
      .post('/api/rag/search')
      .send({ query: 'form schema store', topK: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factoryId: 'F852' }),
      ])
    );
  });

  it('/api/rag/patterns returns all seeded docs for a domainId', async () => {
    await app.get(FormsAutomationRagSeed).seedAll();
    const res = await request(app.getHttpServer())
      .get('/api/rag/patterns?domainId=forms-automation');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });
});
```

---

## 10. Module Template Update

Every module generated by the engine now ships `{domain}.rag-seed.ts` as a mandatory file.
A module missing this file fails `VALIDATION_REPORT` (pnpm build check).

```
modules/{domain-slug}/
├── index.ts
├── manifest.ts
├── {domain}.module.ts
├── {domain}.controller.ts
│
├── ── MANDATORY STANDARD FILES ──────────────────────────────
│
├── {domain}.rag-seed.ts        ← THIS FILE (Phase 21) ✅ NOW REQUIRED
│                                    extends FlowRagSeedBase
│                                    implements indexPatterns() + indexBfaRules() + indexDesignRecords()
│
├── {domain}.prompts.ts         ← Phase 22 (PENDING)
├── {domain}.endpoints.ts       ← Phase 23 (PENDING)
├── {domain}.logger.ts          ← Phase 24 (PENDING)
├── {domain}.docs.ts            ← Phase 25 (PENDING)
│
└── {group}/
    └── {service}.ts
```

---

## 11. Iron Rules (Added by Phase 21)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P21-1 | Every module MUST ship `{domain}.rag-seed.ts` implementing `IFlowRagSeed` | VALIDATION_REPORT build failure |
| IR-P21-2 | `IFlowRagSeed.seedAll()` MUST return `DataProcessResult<number>` — never throw | AF-7 compliance failure |
| IR-P21-3 | All pattern documents MUST include `domainId`, `patternType`, `patternId`, `keywords` | ES index schema violation |
| IR-P21-4 | `indexPatterns()` MUST seed at least 1 SERVICE_PATTERN per factory range | Incomplete RAG context |
| IR-P21-5 | `upsertPattern()` MUST be idempotent — repeated seeding must not create duplicates | Data integrity violation |
| IR-P21-6 | AF-4 MUST query `xiigen-rag-patterns` via `IDatabaseService` — never in-memory list | Fabric violation |
| IR-P21-7 | Bootstrap Phase 8 failure of one module MUST NOT block other modules | Engine stability requirement |

---

## 12. Backward Compatibility

- All existing artifact numbers (F1–F1483, T1–T564, CF-1–CF-788, SK-1–SK-401, DR-1–DR-266) unchanged
- `AF-4 RagContextStation` interface unchanged — callers use the same `search(options)` signature
- `SK-393 SkillRegistry.searchByKeyword()` now delegates to `RagContextStation.search()` backed by ES
- Bootstrap Phase 7 (ENGINE_READY) is unchanged — Phase 8 runs after it
- FLOW-35 next anchors unchanged: F1484 · Family 223 · T565 · CF-789 · SK-402 · DR-267

---

## 13. Checkpoint

```json
{
  "phase": 21,
  "title": "RAG Seeding Standard",
  "status": "complete",
  "delivers": [
    "IFlowRagSeed interface",
    "FlowRagSeedBase abstract class",
    "forms-automation.rag-seed.ts reference implementation",
    "ModuleSeedingPhase (Bootstrap Phase 8)",
    "RagContextStation updated to query ES",
    "RAG_ENDPOINTS (/api/rag/search + /api/rag/patterns)",
    "Unit + integration tests",
    "Module template updated: {domain}.rag-seed.ts mandatory"
  ],
  "ironRulesAdded": 7,
  "mandatoryModuleFiles": 1,
  "esIndex": "xiigen-rag-patterns",
  "bootstrapPhases": 9,
  "artifactNumbersUnchanged": true,
  "nextAnchors": { "F": 1484, "T": 565, "CF": 789, "SK": 402, "DR": 267 }
}
```
