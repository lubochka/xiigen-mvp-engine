# DNA Patterns Reference — All 9 Patterns

## The Non-Negotiable Rule

> If you are generating, writing, or reviewing code for XIIGen, EVERY file must pass ALL 9 DNA checks. A single violation = reject the file.

---

## DNA-1: ParseDocument (No Typed Models)

**Rule:** ALL business data uses `Record<string, unknown>`. Never create typed models like `class Product`, `interface Order`, etc.

**Why:** Schema lives in config documents, not in code. Adding a new field to an entity should never require a code change.

```typescript
// ❌ VIOLATION
class Product {
  name: string;
  price: number;
}

// ✅ CORRECT
const product: Record<string, unknown> = {
  name: 'Widget',
  price: 29.99,
  // admin added this field later — no code change needed
  discount_eligible: true,
};
```

**Note:** Internal engine types (FactoryRegistryEntry, EngineContract, etc.) ARE typed — they are MACHINE code, not FREEDOM data.

---

## DNA-2: BuildSearchFilter (Auto-Skip Empty Fields)

**Rule:** All searches use dynamic filter builder. Empty/null/undefined fields are automatically excluded from the query.

```typescript
// ❌ VIOLATION — hardcoded filter
const query = { must: [{ term: { status: 'active' } }] };

// ✅ CORRECT — dynamic filter, empty fields skipped
const filters = {
  status: 'active',
  category: undefined,  // automatically skipped
  tenantId: scope.tenantId,
};
const result = await db.searchDocuments('products', filters);
```

---

## DNA-3: DataProcessResult<T> (Never Throw for Business Logic)

**Rule:** Every service method returns `DataProcessResult<T>`. Exceptions are for infrastructure failures only, never for business logic.

```typescript
// ❌ VIOLATION
if (!found) throw new NotFoundException('Not found');

// ✅ CORRECT
if (!found) return DataProcessResult.failure('NOT_FOUND', 'Document not found');

// Success case:
return DataProcessResult.success(document);
```

**API:**
- `DataProcessResult.success(data)` — successful result with data
- `DataProcessResult.failure(errorCode, message)` — business failure
- `.isSuccess` — boolean check
- `.data` — the payload (when success)
- `.errorCode` — error code (when failure)
- `.message` — human-readable message

---

## DNA-4: MicroserviceBase (19 Components)

**Rule:** ALL services extend MicroserviceBase. The base provides 19 architectural component slots.

```typescript
// ❌ VIOLATION — standalone service
@Injectable()
class MyService {
  constructor(private db: IDatabaseService) {}
}

// ✅ CORRECT — extends MicroserviceBase
@Injectable()
class MyService extends MicroserviceBase {
  // Inherits: db, queue, cache, auth, health, config, permissions,
  // logging, metrics, tracing, events, notifications, files,
  // scheduler, rateLimiter, circuitBreaker, retry, scope, objectProcessor
}
```

---

## DNA-5: Scope Isolation (Tenant on Every Query)

**Rule:** Every database query, queue message, and cache key is scoped to the current tenant. In v4, this is automatic via AsyncLocalStorage — fabric providers read TenantContext internally.

```typescript
// In v4, tenant scoping is AUTOMATIC. The provider does it for you.
// You do NOT pass tenantId — it's read from AsyncLocalStorage.
const result = await db.searchDocuments('products', { status: 'active' });
// ↑ Provider automatically adds tenant filter

// ❌ VIOLATION — bypassing tenant scope
const result = await rawElasticsearch.search({ index: 'products', ... });
```

---

## DNA-6: DynamicController (No Entity-Specific Controllers)

**Rule:** One controller for all CRUD. Never create ProductsController, OrdersController, etc.

```typescript
// ❌ VIOLATION
@Controller('products')
class ProductsController { ... }

// ✅ CORRECT — DynamicController handles all entity types
// Routes: POST /api/dynamic/:indexName, GET /api/dynamic/:indexName/search, etc.
```

---

## DNA-7: Idempotency Guard

**Rule:** All queue consumers must deduplicate messages using idempotency keys.

```typescript
// When enqueuing — provide deduplication ID
await queue.enqueue('order.created', orderData, `order-${orderId}-${Date.now()}`);

// When consuming — check if already processed before executing
```

---

## DNA-8: Outbox Pattern

**Rule:** `storeDocument()` MUST happen BEFORE `enqueue()`. This ensures the database record exists before any downstream event processing begins.

```typescript
// ❌ VIOLATION — enqueue before store
await queue.enqueue('order.created', data);
await db.storeDocument('orders', data);

// ✅ CORRECT — store first, then enqueue
const stored = await db.storeDocument('orders', data);
if (stored.isSuccess) {
  await queue.enqueue('order.created', data);
}
```

---

## DNA-9: CloudEvents Envelope

**Rule:** All inter-service events must use CloudEvents envelope format.

```typescript
import { createCloudEvent } from '../kernel/cloud-events';

const event = createCloudEvent({
  type: 'order.created',
  source: '/services/order-processor',
  data: orderData,
});
await queue.enqueue('order.created', event);
```

---

## Quick Audit Command

Search the codebase for violations:

```bash
# DNA-1: Typed models (look for class declarations that aren't engine internals)
grep -rn "class [A-Z].*{" --include="*.ts" | grep -v "spec\|test\|Module\|Controller\|Guard\|Middleware\|Interceptor\|Provider\|Factory\|Registry\|Engine\|Station\|Pipeline\|Validator\|Ladder\|Store\|Scorer"

# DNA-3: Thrown exceptions in business logic
grep -rn "throw new" --include="*.ts" | grep -v "spec\|test"

# DNA-6: Entity-specific controllers
grep -rn "@Controller(" --include="*.ts" | grep -v "Dynamic\|Health\|Engine\|Tenant\|Docs\|Learning\|spec\|test"
```
