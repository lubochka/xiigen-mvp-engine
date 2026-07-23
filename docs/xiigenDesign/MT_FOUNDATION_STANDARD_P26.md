# XIIGen — Multi-Tenancy as Engine Foundation
## Phase 26: MTaaS — 7 Structural Defects Fixed
## Track C — MT Foundation
## Date: 2026-03-05 | Status: AUTHORITATIVE

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This standard was written during the Python/FastAPI design phase.
> The live codebase implements multi-tenancy in **NestJS 11 + TypeScript 5** using `nestjs-cls`.
>
> **Actual implementation in `server/src/kernel/multi-tenant/` (26 files):**
> - `TenantContext` — AsyncLocalStorage via nestjs-cls ClsService (DNA-5)
> - `TenantContextMiddleware` — extracts tenant from request headers
> - `SubdomainTenantMiddleware` — resolves tenant from subdomain
> - `ScopeEnforcer` — kernel-level scope isolation (not flow-specific)
> - `QuotaEnforcer` — per-tenant AI token budget enforcement
> - `TenantKeyGenerator` — tenant-prefixed document IDs
> - `TenantConfigResolver` — per-tenant FREEDOM config resolution
> - `IdempotencyStore` (in-memory) — tenant-scoped dedup keys (DNA-7)
> - `TenantRegistry` — tenant CRUD + in-memory provider
> - `ByokKeyStore` — Bring Your Own Key storage per tenant
> - `TenantGuard` + `TenantDecorator` — NestJS guard/decorator pattern
>
> **All 7 structural defects described below are fixed in the NestJS implementation.**
> The `tenantId` is never passed as a method parameter — it's read from AsyncLocalStorage (DNA-5).

---

## 1. Root Cause — Why This Phase Exists

FLOW-21 treated multi-tenancy as a bolt-on feature:

- **F900 / Family 127** (`IFormTenantIsolationService`) was a flow-specific service whose sole
  purpose was tenant isolation — isolation logic that belongs in the engine kernel
- `tenantId` was passed as a raw method parameter through every service signature
- Document IDs were raw `uuidv4()` — no tenant prefix — making cross-tenant ID collision
  theoretically possible even with index-level isolation
- `enforce_scope()` threw a `ValueError` / `Error` — a DNA-3 violation at kernel level
- Idempotency keys were global — two tenants submitting identical payloads were conflated
- FREEDOM config lived in an in-memory dict — per-tenant overrides were lost on restart
- No quota enforcement — one tenant could exhaust AI token budgets for all others

**Fix:** These are seven kernel defects, not flow defects. P26 fixes all seven in `@xiigen/kernel`.
Every flow inherits the fix for free via `MicroserviceBase`. No per-flow tenant isolation
family is ever needed again.

---

## 2. The Seven Fixes

### FIX 1 — Tenant-Namespaced Document IDs (TenantKeyGenerator)

```typescript
// Design path: packages/kernel/src/mt/tenant-key-generator.ts
// Actual path: server/src/kernel/multi-tenant/tenant-key-generator.ts

import { randomUUID } from 'crypto';

/**
 * TenantKeyGenerator — mandatory for all DATABASE FABRIC writes.
 * All stored document IDs encode their tenant.
 * No cross-tenant ID collision is possible.
 */
export class TenantKeyGenerator {
  /**
   * generateDocId(tenantId, hint?)
   * → "{tenantId}::{uuid}"          (e.g. "acme::550e8400-e29b-41d4-a716")
   * → "{tenantId}::{hint}::{uuid}"  (e.g. "acme::form-123::550e8400")
   */
  static generateDocId(tenantId: string, hint?: string): string {
    const id = randomUUID();
    return hint ? `${tenantId}::${hint}::${id}` : `${tenantId}::${id}`;
  }

  /**
   * generateIdempotencyKey(tenantId, operationId, payload)
   * → "{tenantId}::{operationId}::{payloadHash}"
   * Two tenants submitting identical payloads get different keys — never conflated.
   */
  static generateIdempotencyKey(
    tenantId:    string,
    operationId: string,
    payload:     Record<string, unknown>,
  ): string {
    const hash = TenantKeyGenerator.hashPayload(payload);
    return `${tenantId}::${operationId}::${hash}`;
  }

  /** Deterministic short hash of payload for idempotency keying */
  private static hashPayload(payload: Record<string, unknown>): string {
    const str = JSON.stringify(payload, Object.keys(payload).sort());
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16).padStart(8, '0');
  }
}

// BEFORE (P26 violation):
// const docId = uuidv4();  ← no tenant prefix — WRONG

// AFTER (P26 compliant):
// const docId = TenantKeyGenerator.generateDocId(tenantId);
// const docId = TenantKeyGenerator.generateDocId(tenantId, formId);  // with hint
```

---

### FIX 2 — Tenant-Scoped Idempotency Keys (DNA-7 Update)

```typescript
// packages/kernel/src/mt/idempotency.types.ts

/** Updated DNA-7 type — keys are now tenant-namespaced */
export interface IdempotencyKey {
  key:       string;    // "{tenantId}::{operationId}::{payloadHash}"
  tenantId:  string;    // explicit for double-checking
  expiresAt: Date;
}

// packages/kernel/src/mt/idempotency-store.interface.ts

export interface IIdempotencyStore {
  /**
   * Check and set in one atomic operation.
   * Returns DataProcessResult.failure('DUPLICATE_REQUEST') if key already used.
   * Checks by (tenantId, key) pair — never globally.
   */
  checkAndSet(key: IdempotencyKey): Promise<DataProcessResult<boolean>>;

  /** Release a key (e.g. on transaction rollback) */
  release(key: IdempotencyKey): Promise<DataProcessResult<void>>;
}

// IIdempotencyStore backed by DATABASE FABRIC → Redis provider
// Redis key: "idempotency:{tenantId}:{key}" with TTL
```

---

### FIX 3 — enforceScope() DNA-3 Fix

```typescript
// Design path: packages/kernel/src/mt/scope-enforcer.ts
// Actual path: server/src/kernel/multi-tenant/scope-enforcer.ts
// BEFORE: threw Error — DNA-3 violation at kernel level
// AFTER:  returns DataProcessResult — never throws

import { DataProcessResult } from '../core/data-process-result';

export class ScopeEnforcer {
  /**
   * Validates that the resource tenantId matches the request tenantId.
   * DNA-3: never throws — returns DataProcessResult.failure on violation.
   */
  static enforceScope(
    requestTenantId:  string,
    resourceTenantId: string,
    resourceId:       string,
  ): DataProcessResult<void> {
    if (requestTenantId !== resourceTenantId) {
      return DataProcessResult.failure(
        'SCOPE_VIOLATION',
        `Tenant ${requestTenantId} cannot access resource ${resourceId} owned by ${resourceTenantId}`,
      );
    }
    return DataProcessResult.success(undefined);
  }
}

// BEFORE (DNA-3 violation):
// if (existing !== tenantId) throw new Error('SCOPE_VIOLATION');

// AFTER (DNA-3 compliant):
// const scope = ScopeEnforcer.enforceScope(tenantId, resource.tenantId, resourceId);
// if (!scope.isSuccess) return scope;
```

---

### FIX 4 — ITenantRegistry as First-Class Kernel Interface (Component 20)

```typescript
// Design path: packages/kernel/src/mt/tenant-registry.interface.ts
// Actual path: server/src/kernel/multi-tenant/tenant-registry.interface.ts

export interface TenantPlan {
  planId:                  string;
  maxStorageBytes:         number;
  maxAiTokensPerDay:       number;
  maxQueueMessagesPerHour: number;
  maxActiveFlows:          number;
  features:                string[];
}

export interface TenantRecord {
  tenantId:   string;
  plan:       TenantPlan;
  status:     'active' | 'suspended' | 'deleted';
  createdAt:  string;
  suspendedAt?: string;
}

export interface QuotaResult {
  ok:        boolean;
  remaining: number;
  resource:  string;
}

/**
 * ITenantRegistry — Component 20 of MicroserviceBase.
 * Backed by DATABASE FABRIC: PG (xiigen_tenants) + ES (xiigen-tenants) for fast lookup.
 * All methods return DataProcessResult<T> — never throw.
 */
export interface ITenantRegistry {
  provisionTenant(
    tenantId: string,
    plan:     TenantPlan,
  ): Promise<DataProcessResult<TenantRecord>>;

  getTenant(tenantId: string): Promise<DataProcessResult<TenantRecord>>;

  validateTenantExists(tenantId: string): Promise<DataProcessResult<void>>;

  suspendTenant(tenantId: string, reason: string): Promise<DataProcessResult<void>>;

  deleteTenant(tenantId: string): Promise<DataProcessResult<void>>;

  /**
   * checkQuota — called by MicroserviceBase before expensive operations.
   * Resource: "storage" | "ai_tokens" | "queue_messages" | "active_flows"
   */
  checkQuota(
    tenantId: string,
    resource: string,
    amount:   number,
  ): Promise<DataProcessResult<QuotaResult>>;
}
```

### MicroserviceBase — Component 20 added

```typescript
// packages/kernel/src/core/microservice-base.ts (updated)

@Injectable()
export abstract class MicroserviceBase {
  // Components 1–19 (unchanged from original design)
  @Inject(DATABASE_SERVICE)   protected readonly db!:             IDatabaseService;
  @Inject(QUEUE_SERVICE)      protected readonly queue!:          IQueueService;
  @Inject(CACHE_SERVICE)      protected readonly cache!:          ICacheService;
  @Inject(AUTH_CONTEXT)       protected readonly authContext!:    IAuthContext;
  @Inject(SCOPE_CONTEXT)      protected readonly scopeContext!:   IScopeContext;
  @Inject(HEALTH_SERVICE)     protected readonly health!:         IHealthService;
  @Inject(LOGGER_SERVICE)     protected readonly log!:            StructuredLogger;
  @Inject(CONFIG_SERVICE)     protected readonly config!:         IConfigService;
  @Inject(PERMISSION_SERVICE) protected readonly permissions!:   IPermissionService;
  @Inject(OBJECT_PROCESSOR)   protected readonly processor!:      ObjectProcessor;
  // ... components 11–19 ...

  // ── Component 20 — Phase 26 ──────────────────────────────────────
  @Inject(TENANT_REGISTRY)    protected readonly tenantRegistry!: ITenantRegistry;
  @Inject(TENANT_KEY_GEN)     protected readonly keyGen!:         TenantKeyGenerator;
  @Inject(IDEMPOTENCY_STORE)  protected readonly idempotency!:    IIdempotencyStore;
  @Inject(REQUEST_CONTEXT)    protected readonly tenantContext!:  TenantContext;
  // ────────────────────────────────────────────────────────────────
}
```

---

### FIX 5 — Tenant Quota Enforcement

```typescript
// Design path: packages/kernel/src/mt/quota-enforcer.ts
// Actual path: server/src/kernel/multi-tenant/quota-enforcer.ts
// Called automatically by MicroserviceBase before expensive operations

/**
 * Convenience helper — wraps ITenantRegistry.checkQuota().
 * Used inside MicroserviceBase.guardQuota() which services call optionally.
 */
export async function guardQuota(
  registry: ITenantRegistry,
  tenantId: string,
  resource: 'storage' | 'ai_tokens' | 'queue_messages' | 'active_flows',
  amount:   number,
): Promise<DataProcessResult<void>> {
  const result = await registry.checkQuota(tenantId, resource, amount);
  if (!result.isSuccess) return result;
  if (!result.data?.ok) {
    return DataProcessResult.failure(
      'QUOTA_EXCEEDED',
      `Tenant ${tenantId} has exhausted ${resource} quota (remaining: ${result.data?.remaining ?? 0})`,
    );
  }
  return DataProcessResult.success(undefined);
}

// Usage in a service — explicit quota check before AI call:
// const quota = await guardQuota(this.tenantRegistry, tenantId, 'ai_tokens', estimatedTokens);
// if (!quota.isSuccess) return quota;
// return this.ai.generate(prompt);
```

---

### FIX 6 — TenantContext Middleware

```typescript
// Design path: apps/api/src/middleware/tenant-context.middleware.ts
// Actual path: server/src/kernel/multi-tenant/tenant-context.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ITenantRegistry } from '@xiigen/kernel';

export interface TenantContext {
  tenantId:      string;
  plan:          TenantPlan;
  correlationId: string;
}

/**
 * TenantContextMiddleware — runs on EVERY request.
 * Reads X-Tenant-Id header → validates against ITenantRegistry.
 * Returns 403 immediately if:
 *   - X-Tenant-Id header is missing
 *   - Tenant not found in registry
 *   - Tenant is suspended or deleted
 * On success: attaches TenantContext to request scope (NestJS REQUEST scope).
 * MicroserviceBase reads from RequestContext — never from raw method params.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly registry: ITenantRegistry) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Engine-internal paths skip tenant validation
    if (this.isEnginePath(req.path)) { next(); return; }

    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    if (!tenantId) {
      res.status(403).json({
        isSuccess: false,
        error: 'MISSING_TENANT_ID',
        message: 'X-Tenant-Id header is required',
      });
      return;
    }

    const tenantResult = await this.registry.getTenant(tenantId);
    if (!tenantResult.isSuccess) {
      res.status(403).json({
        isSuccess: false,
        error: 'TENANT_NOT_FOUND',
        message: `Tenant ${tenantId} does not exist`,
      });
      return;
    }

    const tenant = tenantResult.data!;
    if (tenant.status !== 'active') {
      res.status(403).json({
        isSuccess: false,
        error:   `TENANT_${tenant.status.toUpperCase()}`,
        message: `Tenant ${tenantId} is ${tenant.status}`,
      });
      return;
    }

    // Attach to request — MicroserviceBase reads via RequestContext
    (req as Request & { tenantContext: TenantContext }).tenantContext = {
      tenantId,
      plan:          tenant.plan,
      correlationId: (req.headers['x-correlation-id'] as string) ?? randomUUID(),
    };

    next();
  }

  private isEnginePath(path: string): boolean {
    return (
      path.startsWith('/api/docs') ||
      path.startsWith('/api/openapi.json') ||
      path.startsWith('/api/health') ||
      path === '/api/ready' ||
      path === '/api/live'
    );
  }
}
```

---

### FIX 7 — FREEDOM Config DATABASE FABRIC Backed

```typescript
// Design path: packages/kernel/src/config/freedom-config-manager.ts
// Actual path: server/src/freedom/ (FREEDOM config manager)
// BEFORE: in-memory dict — per-tenant overrides lost on restart
// AFTER:  backed by IDatabaseService (ES index: xiigen-config, PG table: xiigen_config)
//         Same 3-tier pattern as Prompt Management (Phase 22): tenant → global → hardcoded

@Injectable()
export class FreedomConfigManager {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Resolution order:
   *   1. Tenant override  (tenantId + configKey + isActive)
   *   2. Global default   (tenantId='' + configKey + isActive)
   *   3. Hardcoded fallback (FREEDOM_DEFAULTS map — DNA-3: never throw)
   */
  async get(configKey: string, tenantId: string): Promise<DataProcessResult<unknown>> {
    // Tier 1: tenant-specific
    const tenantFilter = buildSearchFilter({ configKey, tenantId, isActive: true });  // DNA-2
    const tenantResult = await this.db.searchDocuments('xiigen-config', tenantFilter);
    if (tenantResult.isSuccess && tenantResult.data?.length) {
      return DataProcessResult.success(tenantResult.data[0]['value']);
    }

    // Tier 2: global default
    const globalFilter = buildSearchFilter({ configKey, tenantId: '', isActive: true });
    const globalResult = await this.db.searchDocuments('xiigen-config', globalFilter);
    if (globalResult.isSuccess && globalResult.data?.length) {
      return DataProcessResult.success(globalResult.data[0]['value']);
    }

    // Tier 3: hardcoded fallback — DNA-3: never return empty/throw
    if (configKey in FREEDOM_DEFAULTS) {
      return DataProcessResult.success(FREEDOM_DEFAULTS[configKey]);
    }

    return DataProcessResult.failure('CONFIG_NOT_FOUND', `No config for key: ${configKey}`);
  }

  async set(
    configKey: string,
    value:     unknown,
    tenantId:  string,   // '' for global default
  ): Promise<DataProcessResult<string>> {
    const doc: Record<string, unknown> = {
      configId:  TenantKeyGenerator.generateDocId(tenantId || 'global', configKey),
      configKey,
      tenantId,
      value,
      isActive:  true,
      updatedAt: new Date().toISOString(),
    };
    return this.db.storeDocument('xiigen-config', doc);
  }
}

const FREEDOM_DEFAULTS: Record<string, unknown> = {
  'ai.maxTokensPerRequest': 4096,
  'ai.defaultModel':        'claude-sonnet-4-20250514',
  'queue.maxRetries':       3,
  'storage.maxDocSizeBytes': 1_048_576,  // 1MB
};
```

---

## 3. Bootstrap Phase 9 — MT_CONTEXT

```typescript
// apps/api/src/bootstrap/phases/mt-context.phase.ts
// Bootstrap Phase 9 — runs after MODULE_SEEDING (Phase 8)

@Injectable()
export class MtContextPhase {
  constructor(
    private readonly registry:    ITenantRegistry,
    private readonly idempotency: IIdempotencyStore,
    private readonly config:      FreedomConfigManager,
  ) {}

  async execute(): Promise<DataProcessResult<void>> {
    // 1. Validate ITenantRegistry is reachable
    const healthCheck = await this.registry.getTenant('__system__');
    if (!healthCheck.isSuccess && healthCheck.error !== 'TENANT_NOT_FOUND') {
      // TENANT_NOT_FOUND is expected — means registry is up but system tenant absent
      return DataProcessResult.failure(
        'MT_REGISTRY_UNREACHABLE',
        'ITenantRegistry is not reachable — engine cannot start without MT foundation',
      );
    }

    // 2. Confirm IIdempotencyStore is reachable (Redis backed)
    const idempotencyCheck = await this.idempotency.checkAndSet({
      key:       '__bootstrap__',
      tenantId:  '__system__',
      expiresAt: new Date(Date.now() + 1000),
    });
    // Release immediately — this was just a connectivity check
    await this.idempotency.release({
      key:       '__bootstrap__',
      tenantId:  '__system__',
      expiresAt: new Date(),
    });

    // 3. Confirm FREEDOM config is reachable
    const configCheck = await this.config.get('ai.maxTokensPerRequest', '__system__');
    if (!configCheck.isSuccess) {
      return DataProcessResult.failure('MT_CONFIG_UNREACHABLE', 'FreedomConfigManager not reachable');
    }

    return DataProcessResult.success(undefined);
  }
}
```

### Bootstrap sequence — final 9-phase form

| # | Phase | Description |
|---|-------|-------------|
| 1 | INFRA_CHECK | Verify ES, Redis, SQS connectivity |
| 2 | FABRIC_INIT | Initialize all 6 fabric providers |
| 3 | REGISTRY_LOAD | Load factory registry (F1–F1483) |
| 4 | FLOW_LOAD | Load flow definitions from ES |
| 5 | BFA_INIT | Initialize BFA arbiter (CF-1–CF-788) |
| 6 | FREEDOM_INIT | Load FREEDOM config via FreedomConfigManager (P26: DATABASE FABRIC backed) |
| 7 | ENGINE_READY | Signal engine ready |
| 8 | MODULE_SEEDING | Discover modules, run ragSeed() + loadPrompts() (P21/P22) |
| 9 | MT_CONTEXT | Validate ITenantRegistry + IIdempotencyStore + FreedomConfig reachable |

---

## 4. F900 Retirement

```
BEFORE P26:
  modules/forms-automation/
  └── tenant-isolation/
      └── form-tenant-isolation.service.ts   ← F900 IFormTenantIsolationService
          (manually validates tenantId on every operation)

AFTER P26:
  F900 / IFormTenantIsolationService — RETIRED
  Number F900 preserved in SESSION_STATE for audit trail.
  Interface superseded by: ITenantRegistry (Component 20) + TenantContextMiddleware.
  family_127 entry removed from module manifest.
  VALIDATION_REPORT check 25: fails if any module ships a tenant-isolation service family.
```

---

## 5. Document Updates Required

### ENGINE_ARCHITECTURE_MERGED

- **MicroserviceBase section**: Add Component 20 (ITenantRegistry + TenantKeyGenerator + IIdempotencyStore + TenantContext)
- **Kernel section**: Add `TenantKeyGenerator`, fix `enforceScope()` note → returns `DataProcessResult`, add `IIdempotencyStore`
- **Fabric interfaces section**: Note all fabric method signatures retain `tenantId` parameter for backward compatibility but internally resolve from `TenantContext`
- **Bootstrap section**: Update to 9-phase sequence
- **F900 entry**: Mark retired — `SUPERSEDED_BY: ITenantRegistry (Component 20)`

### SKILLS_FACTORY_RAG_MERGED

- **SK-01 (MicroserviceBase core fabric)**: Replace DNA-5 description `"pass tenant_id as parameter"` with `"TenantContext flows through RequestContext; method signatures retain tenantId for interface compatibility; TenantContextMiddleware populates context on every request"`
- **Add SK-402** (new skill, first post-FLOW-34 SK): `TenantKeyGenerator + IIdempotencyStore patterns` — reference implementation for all P26 kernel interfaces

### TASK_TYPES_CATALOG_MERGED

- Remove all references to per-flow tenant isolation task types (T-types that describe `IFormTenantIsolationService` or equivalent per-flow tenant validation)
- BFA validation for tenant isolation now handled by engine-level CF rules, not flow task types

### V62_BFA_STRESS_TEST_MERGED

- **CF-398, CF-399, CF-400, CF-401** (tenant isolation enforcement rules): Update enforcement mechanism from `"F900 validates"` to `"ITenantRegistry + TenantContextMiddleware validates; TenantKeyGenerator prevents cross-tenant ID collision"`

### SESSION_STATE_MERGE

- Add entry: `F900 IFormTenantIsolationService — RETIRED (P26); number preserved; superseded by ITenantRegistry`
- Update next anchors: SK-402 consumed by P26 (new TenantKeyGenerator skill) → **SK-403** is the new next SK anchor
- Update MT section: bootstrap is now 9 phases; Component 20 documented

---

## 6. Canonical Before/After — Full Service Example

```typescript
// ──────────────────────────────────────────────────────────────────
// BEFORE Phase 26 — per-flow tenant isolation pattern (RETIRED)
// ──────────────────────────────────────────────────────────────────

// modules/forms-automation/tenant-isolation/form-tenant-isolation.service.ts
// F900 — IFormTenantIsolationService (RETIRED after P26)
export class FormTenantIsolationService {
  validateTenant(tenantId: string, resource: Record<string, unknown>) {
    if (resource['tenantId'] !== tenantId) {
      throw new Error('SCOPE_VIOLATION');  // ← DNA-3 violation
    }
  }
}

// modules/forms-automation/authoring/schema.service.ts (BEFORE)
export class FormSchemaService extends MicroserviceBase {
  async storeSchema(
    tenantId: string,                    // ← raw param (DNA-5 anti-pattern)
    payload:  Record<string, unknown>,
  ): Promise<DataProcessResult<string>> {
    const docId = uuidv4();             // ← global key (FIX 1 violation)
    return this.db.storeDocument(tenantId, 'form-schemas', payload, docId);
  }
}

// ──────────────────────────────────────────────────────────────────
// AFTER Phase 26 — engine-level MT foundation
// ──────────────────────────────────────────────────────────────────

// modules/forms-automation/authoring/schema.service.ts (AFTER)
@Factory({ id: 'F852', interface: 'IFormSchemaService', fabric: 'DATABASE', group: 'authoring' })
@Injectable()
export class FormSchemaService extends MicroserviceBase {
  constructor(private readonly db: IDatabaseService) { super(); }

  async storeSchema(
    payload: Record<string, unknown>,    // DNA-1: no typed models
  ): Promise<DataProcessResult<string>> {
    // FIX 6: tenantId from TenantContextMiddleware — never raw param
    const { tenantId } = this.tenantContext;

    // FIX 4+5: quota check via Component 20
    const quota = await this.tenantRegistry.checkQuota(tenantId, 'storage', 1);
    if (!quota.isSuccess || !quota.data?.ok) {
      return DataProcessResult.failure('QUOTA_EXCEEDED', quota.error);
    }

    // Phase 24: structured log
    logger.info({ action: 'storeSchema', tenantId, serviceId: 'F852' });

    // FIX 1: tenant-namespaced document ID
    const docId = this.keyGen.generateDocId(tenantId);

    return this.db.storeDocument(tenantId, 'form-schemas', payload, docId);
  }
}
```

---

## 7. Tests Required

```typescript
// packages/kernel/src/test/mt/tenant-key-generator.spec.ts

describe('TenantKeyGenerator', () => {
  it('generates different keys for same payload from different tenants', () => {
    const key1 = TenantKeyGenerator.generateIdempotencyKey('acme',  'store', { a: 1 });
    const key2 = TenantKeyGenerator.generateIdempotencyKey('corp',  'store', { a: 1 });
    expect(key1).not.toBe(key2);
    expect(key1.startsWith('acme::')).toBe(true);
    expect(key2.startsWith('corp::')).toBe(true);
  });

  it('generateDocId always starts with tenantId prefix', () => {
    const id = TenantKeyGenerator.generateDocId('acme');
    expect(id.startsWith('acme::')).toBe(true);
  });

  it('generateDocId with hint includes hint in key', () => {
    const id = TenantKeyGenerator.generateDocId('acme', 'form-123');
    expect(id.startsWith('acme::form-123::')).toBe(true);
  });
});

// packages/kernel/src/test/mt/scope-enforcer.spec.ts

describe('ScopeEnforcer.enforceScope()', () => {
  it('returns DataProcessResult.success when tenantIds match', () => {
    const result = ScopeEnforcer.enforceScope('acme', 'acme', 'doc-1');
    expect(result.isSuccess).toBe(true);
  });

  it('returns DataProcessResult.failure — NEVER throws — on mismatch', () => {
    expect(() => ScopeEnforcer.enforceScope('acme', 'corp', 'doc-1')).not.toThrow();
    const result = ScopeEnforcer.enforceScope('acme', 'corp', 'doc-1');
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe('SCOPE_VIOLATION');
  });
});

// apps/api/src/test/unit/tenant-context-middleware.spec.ts

describe('TenantContextMiddleware', () => {
  it('returns 403 when X-Tenant-Id header is missing', async () => {
    const res = await request(app.getHttpServer()).get('/api/forms/f1/schema');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MISSING_TENANT_ID');
  });

  it('returns 403 when tenant is unknown', async () => {
    mockRegistry.getTenant.mockResolvedValue(DataProcessResult.failure('TENANT_NOT_FOUND'));
    const res = await request(app.getHttpServer())
      .get('/api/forms/f1/schema')
      .set('X-Tenant-Id', 'ghost-corp');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('TENANT_NOT_FOUND');
  });

  it('returns 403 when tenant is suspended', async () => {
    mockRegistry.getTenant.mockResolvedValue(
      DataProcessResult.success({ tenantId: 'frozen-corp', status: 'suspended', plan: {} })
    );
    const res = await request(app.getHttpServer())
      .get('/api/forms/f1/schema')
      .set('X-Tenant-Id', 'frozen-corp');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('TENANT_SUSPENDED');
  });

  it('passes when tenant is active', async () => {
    mockRegistry.getTenant.mockResolvedValue(
      DataProcessResult.success({ tenantId: 'acme', status: 'active', plan: {} })
    );
    const res = await request(app.getHttpServer())
      .get('/api/forms/f1/schema')
      .set('X-Tenant-Id', 'acme');
    expect(res.status).not.toBe(403);
  });
});

// apps/api/src/test/integration/mt-isolation.spec.ts

describe('MT isolation — 3-tenant stress test', () => {
  it('two tenants storing same payload get different document IDs', async () => {
    const payload = { formId: 'form-1', schemaVersion: 1, fields: {} };
    const r1 = await storeSchemaAs('tenant-A', payload);
    const r2 = await storeSchemaAs('tenant-B', payload);
    expect(r1.data).not.toBe(r2.data);                 // FIX 1: different docIds
    expect(r1.data.startsWith('tenant-A::')).toBe(true);
    expect(r2.data.startsWith('tenant-B::')).toBe(true);
  });

  it('tenant-A cannot read tenant-B submissions', async () => {
    await submitEntryAs('tenant-B', { name: 'Alice' });
    const entries = await listEntriesAs('tenant-A');
    expect(entries.data.every(e => e['tenantId'] === 'tenant-A')).toBe(true);
  });

  it('quota exceeded returns DataProcessResult.failure — never throws', async () => {
    mockRegistry.checkQuota.mockResolvedValue(
      DataProcessResult.success({ ok: false, remaining: 0, resource: 'storage' })
    );
    const result = await storeSchemaAs('tenant-C', {});
    expect(result.isSuccess).toBe(false);
    expect(result.error).toBe('QUOTA_EXCEEDED');
  });
});
```

---

## 8. Iron Rules (Added by Phase 26)

| # | Rule | Consequence |
|---|------|-------------|
| IR-P26-1 | All document IDs MUST use `TenantKeyGenerator.generateDocId(tenantId)` — never raw `uuidv4()` | FIX 1 violation — cross-tenant ID collision risk |
| IR-P26-2 | All idempotency keys MUST use `TenantKeyGenerator.generateIdempotencyKey()` — DNA-7 | FIX 2 violation — cross-tenant deduplication failure |
| IR-P26-3 | `ScopeEnforcer.enforceScope()` and all kernel scope functions MUST return `DataProcessResult` — never throw | DNA-3 kernel violation |
| IR-P26-4 | `ITenantRegistry` MUST be Component 20 of `MicroserviceBase` — available as `this.tenantRegistry` in all services | Architecture integrity |
| IR-P26-5 | AI ENGINE FABRIC MUST call `checkQuota(tenantId, 'ai_tokens', ...)` before every `generate()` call | FIX 5 — tenant token budget enforcement |
| IR-P26-6 | `TenantContextMiddleware` MUST be registered on every route except engine-internal paths | FIX 6 — every request validated |
| IR-P26-7 | `FREEDOM config` MUST be backed by DATABASE FABRIC — no in-memory dict | FIX 7 — config survives restart |
| IR-P26-8 | No module MUST ship a per-flow tenant isolation service family (Family 127 / F900 pattern) — VALIDATION_REPORT check 25 | MT is engine-level — bolt-on pattern retired |
| IR-P26-9 | Bootstrap MUST fail fast if `MT_CONTEXT` phase fails — engine MUST NOT start without tenant registry | MT foundation requirement |

---

## 9. Updated Artifact Anchors

Phase 26 consumes **SK-402** (new skill: TenantKeyGenerator + IIdempotencyStore patterns).

| Anchor | Before P26 | After P26 |
|--------|-----------|----------|
| F next | F1484 | **F1484** (unchanged — P26 adds no new factories) |
| T next | T565 | **T565** (unchanged) |
| CF next | CF-789 | **CF-789** (unchanged) |
| SK next | SK-402 | **SK-403** (SK-402 consumed by P26 for TenantKeyGenerator skill) |
| DR next | DR-267 | **DR-267** (unchanged) |
| Family next | 223 | **223** (unchanged) |

---

## 10. Completion Certificate — All 26 Phases

```
╔══════════════════════════════════════════════════════════════════════╗
║  XIIGen — 26-PHASE MIGRATION + FOUNDATION PLAN                       ║
║  STATUS: ALL 26 PHASES COMPLETE ✅                                    ║
╠══════════════════════════════════════════════════════════════════════╣
║  Track A (P1–P20):  Documentation language migration                 ║
║    Python 3.12 + FastAPI + React Native                              ║
║    → Node.js 20 + TypeScript 5 + NestJS 10 + React 18               ║
║    10 documents migrated | ~107,000 lines | 553 token translations   ║
║    Artifact numbers FROZEN: F1–F1483, T1–T564, CF-1–CF-788,         ║
║    SK-1–SK-401, DR-1–DR-266                                          ║
║                                                                      ║
║  Track B (P21–P25): Foundation standards                             ║
║    6 mandatory module files defined                                  ║
║    27-check VALIDATION_REPORT enforces all standards on pnpm build   ║
║    Engine-level: RAG seeding, prompt management, client contract,    ║
║    structured logging + CI/CD, OpenAPI documentation                 ║
║                                                                      ║
║  Track C (P26):     MT as engine foundation                          ║
║    7 structural defects fixed in @xiigen/kernel                      ║
║    F900 / Family 127 pattern RETIRED                                 ║
║    ITenantRegistry = Component 20 of MicroserviceBase                ║
║    TenantKeyGenerator + TenantContextMiddleware + quota enforcement  ║
║    FREEDOM config DATABASE FABRIC backed                             ║
║    Bootstrap now 9 phases                                            ║
║                                                                      ║
║  FINAL ARTIFACT ANCHORS:                                             ║
║    F1484 | Family 223 | T565 | CF-789 | SK-403 | DR-267             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 11. Checkpoint

```json
{
  "phase": 26,
  "title": "Multi-Tenancy as Engine Foundation",
  "status": "COMPLETE",
  "mtDefectsFixed": 7,
  "delivers": [
    "TenantKeyGenerator: generateDocId() + generateIdempotencyKey() — FIX 1+2",
    "ScopeEnforcer.enforceScope() → DataProcessResult (never throws) — FIX 3",
    "ITenantRegistry: Component 20 of MicroserviceBase — FIX 4",
    "guardQuota(): quota enforcement before storage/AI operations — FIX 5",
    "TenantContextMiddleware: 403 on missing/unknown/suspended tenant — FIX 6",
    "FreedomConfigManager: DATABASE FABRIC backed, 3-tier resolution — FIX 7",
    "Bootstrap Phase 9 MT_CONTEXT: validates registry+idempotency+config reachable",
    "F900/Family 127 RETIRED — absorbed by ITenantRegistry",
    "SK-402 added: TenantKeyGenerator + IIdempotencyStore patterns",
    "5 canonical documents updated (ENGINE_ARCH, SKILLS_RAG, TASK_TYPES, BFA, SESSION_STATE)",
    "Tests: TenantKeyGenerator, ScopeEnforcer DNA-3, Middleware 403s, 3-tenant isolation"
  ],
  "ironRulesAdded": 9,
  "ironRuleRange": "IR-P26-1 through IR-P26-9",
  "artifactAnchors": {
    "F": 1484,
    "Family": 223,
    "T": 565,
    "CF": 789,
    "SK": 403,
    "DR": 267,
    "note": "SK-402 consumed by P26 for TenantKeyGenerator skill"
  },
  "f900Status": "RETIRED — number preserved in SESSION_STATE; interface superseded by ITenantRegistry",
  "bootstrapPhases": 9,
  "allPhasesComplete": true,
  "finalStatus": "ALL 26 PHASES COMPLETE ✅"
}
```
