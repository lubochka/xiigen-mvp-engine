# Multi-Tenant System Reference

## Design Principle

Multi-tenancy is kernel-level, not an addon. Every fabric, every provider, every AF station is tenant-aware by design.

## Critical v4 Decision

**No `tenant_id` parameter on ANY fabric method.** Providers read TenantContext from AsyncLocalStorage internally. Callers cannot forget tenant scoping.

---

## Request Flow

```
1. HTTP Request arrives with X-Tenant-Id header (or JWT claim)
        ↓
2. TenantContextMiddleware (kernel/multi-tenant/tenant-context.middleware.ts)
   - Extracts tenantId from header/JWT
   - Creates TenantContext object
   - Stores in AsyncLocalStorage for request duration
        ↓
3. TenantGuard (kernel/multi-tenant/tenant.guard.ts)
   - Reads tenantId from context
   - Validates: tenant exists in registry AND is active
   - Rejects: 401 if missing, 403 if inactive
        ↓
4. Controller method (optionally uses @TenantId() decorator)
        ↓
5. Service calls fabric interface (e.g., db.storeDocument('products', data))
   - NO tenantId parameter passed!
        ↓
6. Fabric provider reads TenantContext from AsyncLocalStorage
   - Adds tenant filter to queries automatically
   - Routes to tenant-specific config/keys automatically
```

---

## Components

| File | Class | Purpose |
|------|-------|---------|
| tenant-registry.service.ts | TenantRegistryService | CRUD: create, get, list, activate, deactivate tenants |
| tenant-context.ts | TenantContext | Object: tenantId, status, metadata |
| tenant-context.middleware.ts | TenantContextMiddleware | Sets AsyncLocalStorage per request |
| tenant.guard.ts | TenantGuard | NestJS Guard: validates tenant exists + active |
| tenant.decorator.ts | @TenantId() | Param decorator for controller methods |
| tenant-config.resolver.ts | TenantConfigResolver | Resolves per-tenant FREEDOM config |
| tenant-key.resolver.ts | TenantKeyResolver | Resolves per-tenant API keys for AI providers |
| tenant-quota.service.ts | TenantQuotaService | Enforces rate limits, token budgets per tenant |

---

## Per-Tenant Config Resolution

```
Tenant-A wants Claude → TenantConfigResolver reads from FREEDOM config
Tenant-B wants GPT-4  → TenantConfigResolver reads different FREEDOM config

Each tenant's AI API key → TenantKeyResolver → SecretsService.getSecret('tenant-b/openai-key')
```

---

## Testing Multi-Tenant Isolation

Every test involving tenant data MUST verify:

```typescript
// Setup
const tenantA = 'tenant-alpha';
const tenantB = 'tenant-beta';

// Store as tenant A
setTenantContext(tenantA);
await db.storeDocument('products', { name: 'Widget-A' });

// Search as tenant B — must NOT see tenant A's data
setTenantContext(tenantB);
const result = await db.searchDocuments('products', {});
expect(result.data).toHaveLength(0); // tenant-B sees nothing

// Search as tenant A — sees own data
setTenantContext(tenantA);
const resultA = await db.searchDocuments('products', {});
expect(resultA.data).toHaveLength(1);
```

---

## Adding Tenant-Aware Features

When building new features:

1. NEVER accept tenantId as a parameter — read from AsyncLocalStorage
2. NEVER bypass the fabric interface — that's where tenant scoping happens
3. ALWAYS test with 2+ tenants to verify isolation
4. If the feature needs per-tenant config, add it to FREEDOM (not env vars)
5. If the feature needs per-tenant secrets, use TenantKeyResolver → SecretsService
