# XIIGen Developer Onboarding
## Step-by-Step Guide for New Contributors

> Back to the [XIIGen project overview](../../README.md) · how this changes the developer's role: [answered in the FAQ](../../faq/how-does-this-change-the-developers-role.md)

---

## Before You Write Any Code

Read and internalize these three things:

1. **The 4-Law Checklist** — run on every file you create:
   - Does this code mention a specific entity name (User, Product, Order)? → REJECT
   - Is logic driven by a generic type string loaded from config? → APPROVE
   - Are you creating a new Controller? → REJECT (use DynamicController)
   - Are you adding a new JSON config document to Elasticsearch? → APPROVE

2. **DNA-3: DataProcessResult** — never throw exceptions for business logic:
   ```typescript
   // ✅ Correct
   return DataProcessResult.failure('NOT_FOUND', 'Order not found');
   
   // ❌ Wrong
   throw new NotFoundException('Order not found');
   ```

3. **Fabric-first** — never import a provider SDK:
   ```typescript
   // ✅ Correct — inject fabric interface
   constructor(@Inject(DATABASE_SERVICE) private db: IDatabaseService) {}
   
   // ❌ Wrong — importing provider directly
   import { Client } from '@elastic/elasticsearch';
   ```

---

## How To: Add a New Database Provider

Example: Adding a MongoDB provider.

**Step 1:** Create the provider file at `server/src/fabrics/database/mongodb.provider.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { IDatabaseService } from '../interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { buildSearchFilter } from '../../kernel/build-search-filter';
// NOTE: import MongoClient from the MongoDB driver — this is the ONE place
// where a provider SDK is imported. Providers are the boundary.

@Injectable()
export class MongoDbProvider extends IDatabaseService {
  async storeDocument(index: string, document: Record<string, unknown>, docId?: string)
    : Promise<DataProcessResult<Record<string, unknown>>> {
    // Implementation here — tenant scope is read from AsyncLocalStorage
    // Return DataProcessResult.success(storedDoc) or DataProcessResult.failure(...)
  }
  // ... implement all abstract methods from IDatabaseService
}
```

**Step 2:** Register in `server/src/fabrics/database/provider-registry.ts`

**Step 3:** Add to `server/src/fabrics/database/database.module.ts`

**Step 4:** Write tests mirroring the existing pattern in the spec files

**Key rule:** The provider is the ONLY place where a specific SDK is imported. Everything above the provider uses `IDatabaseService`.

---

## How To: Add a New AI Provider

Example: Adding a Mistral provider.

**Step 1:** Create `server/src/fabrics/ai-engine/mistral.provider.ts`

Extend `IAiProvider`. Implement `generate()` and `generateStructured()`. Use `TenantKeyResolver` to get per-tenant API keys.

**Step 2:** Register in `server/src/fabrics/ai-engine/provider-registry.ts` with a provider name like `'mistral'`

**Step 3:** Add model role mapping in the dispatcher config

**Step 4:** Add FREEDOM config entry so tenants can select Mistral via admin UI

---

## How To: Add a New Engine Contract (Task Type)

This is how you teach the engine to build something new.

**Step 1:** Pick your artifact numbers from the next-available list (verify against `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json`):
```
Factory:    F1601+    Family: 209+
Task Type:  T650+     BFA Rule: CF-809+
Skill:      SK-529+
```

**Step 2:** Create the full contract in the engine-contracts module. Use the required format:

```typescript
const T650: EngineContract = {
  taskTypeId: 'T650',
  name: 'My New Task Type',
  archetype: ContractArchetype.ORCHESTRATION,
  entry: 'Fires when X event is received',
  purpose: 'Coordinates Y and Z with allSettled',
  distinctFrom: { taskTypeId: 'T649', reason: 'T649 handles webhook triggers; T650 does ...' },
  factoryDependencies: [
    {
      factoryId: 'F1601',
      interfaceName: 'IMyNewService',
      fabricType: FabricType.DATABASE,
      providerHint: 'elasticsearch',
      description: 'Stores processed results',
    },
    // ...
  ],
  afConfiguration: [
    { stationId: 'AF-1', role: 'generate', modelHint: 'claude-sonnet-4-20250514' },
    { stationId: 'AF-4', role: 'rag_context', config: { patterns: ['orchestration', 'event-driven'] } },
    { stationId: 'AF-9', role: 'judge', config: { gates: ['dna_compliance', 'scope_isolation'] } },
  ],
  bfaRegistration: {
    entities: ['my_entity'],
    events: ['my_entity.created', 'my_entity.updated'],
    apiRoutes: ['/api/dynamic/my_entity'],
  },
  machineFreedom: {
    machine: ['Queue coordination', 'Retry logic', 'State transitions'],
    freedom: ['Entity fields', 'Notification templates', 'Threshold values'],
  },
  ironRules: ['Must use MicroserviceBase', 'Must return DataProcessResult'],
  qualityGates: ['DNA-1 through DNA-9 compliance', 'Scope isolation verified'],
};

// NOTE: Before any domain flow, run FLOW-PREREQ-01 (SpecAuditOrchestrator)
// to detect missing fabric interfaces, MACHINE constants, and overlaps.
// The engine will autonomously resolve what it can (FLOW-PREREQ-02) and
// escalate what it cannot (FLOW-PREREQ-03).

```

**Step 3:** Register in `TaskTypeRegistry`

**Step 4:** Register factory interfaces in `FactoryRegistry`

**Step 5:** Run BFA validation — check for conflicts with existing flows

**Step 6:** Write tests verifying the contract validates correctly

---

## How To: Understand the Multi-Tenant Flow

1. **Request arrives** → `TenantContextMiddleware` extracts tenant from `X-Tenant-Id` header
2. **AsyncLocalStorage** stores `TenantContext` for the request duration
3. **TenantGuard** validates tenant exists and is active
4. **Fabric providers** read tenant from AsyncLocalStorage — no explicit passing needed
5. **TenantKeyResolver** provides per-tenant API keys to AI providers
6. **TenantConfigResolver** loads per-tenant FREEDOM config
7. **TenantQuotaService** enforces rate limits and token budgets

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Typed models for dynamic data
```typescript
// ❌ WRONG — creating a typed model for business data
class Product {
  name: string;
  price: number;
  category: string;
}

// ✅ CORRECT — Record<string, unknown> (DNA-1)
const product: Record<string, unknown> = {
  name: 'Widget', price: 29.99, category: 'hardware'
};
```

### Mistake 2: Throwing exceptions for business logic
```typescript
// ❌ WRONG — throwing for a business condition
if (!user) throw new NotFoundException('User not found');

// ✅ CORRECT — return DataProcessResult (DNA-3)
if (!user) return DataProcessResult.failure('NOT_FOUND', 'User not found');
```

### Mistake 3: Entity-specific controller
```typescript
// ❌ WRONG — entity-specific controller (violates DNA-6)
@Controller('products')
class ProductsController { ... }

// ✅ CORRECT — use DynamicController for all CRUD
// DynamicController handles all entity types via /api/dynamic/{indexName}
```

### Mistake 4: Direct HTTP between services
```typescript
// ❌ WRONG — direct HTTP call
const response = await fetch('http://user-service/api/users/123');

// ✅ CORRECT — event through queue (DNA pattern)
await this.queueService.enqueue('user.requested', { userId: '123' });
```

### Mistake 5: Forgetting fabric resolution on new factories
```typescript
// ❌ WRONG — factory without fabric type
{ factoryId: 'F1339', interfaceName: 'INewService' }

// ✅ CORRECT — every factory MUST declare its fabric
{ factoryId: 'F1339', interfaceName: 'INewService', fabricType: FabricType.DATABASE }
```

### Mistake 6: Hardcoded filter fields
```typescript
// ❌ WRONG — hardcoded filter
const query = { must: [{ term: { status: 'active' } }, { term: { tenantId: tid } }] };

// ✅ CORRECT — BuildSearchFilter auto-skips empty fields (DNA-2)
const filters = { status: 'active', tenantId: tid, category: undefined }; // category skipped
const result = await db.searchDocuments('products', filters);
```

---

## Module Map

| Module | What It Does | When To Touch It |
|--------|-------------|-----------------|
| kernel/ | DNA primitives + multi-tenant | Rarely — only for core pattern changes |
| fabrics/ | 6 infrastructure layers | When adding new providers |
| factories/ | Universal factory pattern | When registering new factory interfaces |
| engine-contracts/ | Task type definitions | When teaching the engine new capabilities |
| engine/ | Flow generator | When changing how the engine orchestrates generation |
| guardrails/ | BFA + DNA + promotion | When adding new validation rules |
| freedom/ | Config management | When changing how config is stored/resolved |
| af-stations/ | AI pipeline | When modifying the code generation pipeline |
| learning/ | Feedback + quality scoring | When improving the learning loop |
| api/ | REST endpoints | When exposing new engine capabilities |
| bootstrap/ | Startup sequence | When changing initialization order |
| devops/ | Logging, Docker, CI | When changing deployment or observability |

---

## Test Conventions

- Tests live alongside source files or in `__tests__/` directories
- Use in-memory providers — no external services needed for tests
- Every public method must have a test
- Test names follow: `should [expected behavior] when [condition]`
- Use `DataProcessResult` assertions: check `.isSuccess`, `.data`, `.errorCode`
- Multi-tenant tests: verify tenant-A cannot see tenant-B data

---

## Environment Variables (.env)

See `.env.example` for the full list. Key variables:
- `PORT` — server port (default 3000)
- `NODE_ENV` — development/production
- `ELASTICSEARCH_URL` — Elasticsearch connection
- `REDIS_URL` — Redis connection
- `DEFAULT_AI_PROVIDER` — which AI provider to use by default
- Tenant-specific keys are stored in the Secrets Fabric, not in env vars
