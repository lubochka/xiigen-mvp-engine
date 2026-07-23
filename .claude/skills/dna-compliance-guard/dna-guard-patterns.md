# DNA Guard Patterns — 9 Rules

## DNA-1: No Entity-Specific Model Classes

**Rule:** Service files must not define entity-specific model classes. Data shapes are defined by factory contracts (F-XXXX), not by services.

**Detection:**
```bash
grep -rn "class [A-Z][a-zA-Z]*Model\|class [A-Z][a-zA-Z]*Entity\|class [A-Z][a-zA-Z]*DTO" server/src/
# Exclude: kernel/, interfaces/, contracts/
```

**Violation example:**
```typescript
// WRONG: entity-specific model in a service file
class OrderModel {
  orderId: string;
  status: string;
}
```

**Fix pattern:**
```typescript
// RIGHT: use generic typing from factory contract
type OrderData = Record<string, unknown>;
// OR import from engine-contracts:
import { FactoryOutput } from '../engine-contracts/types';
```

**Test template:**
```typescript
it('should not define entity-specific model classes', () => {
  const source = fs.readFileSync(filePath, 'utf-8');
  expect(source).not.toMatch(/class [A-Z][a-zA-Z]*(Model|Entity|DTO)\s*\{/);
});
```

---

## DNA-2: No Hardcoded Field Selectors

**Rule:** Database queries must use `BuildSearchFilter(input)` — never hardcoded field names.

**Detection:**
```bash
grep -rn "\.find({" server/src/
grep -rn "\.where({" server/src/
```

**Violation example:**
```typescript
// WRONG: hardcoded field selector
const results = await this.db.find({ orderId: input.orderId, status: 'PENDING' });
```

**Fix pattern:**
```typescript
// RIGHT: dynamic filter from factory input
const filter = BuildSearchFilter(input);
const results = await this.db.find(filter);
```

**Test template:**
```typescript
it('should not use hardcoded field selectors', () => {
  const source = fs.readFileSync(filePath, 'utf-8');
  expect(source).not.toMatch(/\.find\(\{[^)]+\}\)/);
});
```

---

## DNA-3: No Business Logic in Error Handlers

**Rule:** `catch` blocks must only return `DataProcessResult.failure(message)` or rethrow. No business logic (if/switch/conditional) inside catch.

**Detection:**
```bash
# Find catch blocks — manual inspection required
grep -n -A 5 "catch" server/src/
# Flag: any catch body with if/switch/return that is not DataProcessResult.failure
```

**Violation example:**
```typescript
// WRONG: business logic in catch
catch (e) {
  if (e.type === 'PAYMENT_FAILED') {
    await this.refund(orderId);  // business logic
  }
  throw e;
}
```

**Fix pattern:**
```typescript
// RIGHT: propagate failure only
catch (e) {
  return DataProcessResult.failure(`Operation failed: ${e.message}`);
}
```

**Test template:**
```typescript
it('should propagate errors as DataProcessResult.failure', async () => {
  provider.execute.mockRejectedValue(new Error('test error'));
  const result = await service.process(input);
  expect(result.success).toBe(false);
  expect(result.error).toContain('test error');
});
```

---

## DNA-4: All Services Extend MicroserviceBase

**Rule:** Every service class must extend `MicroserviceBase`. This ensures consistent lifecycle, tenant scope, and factory registration.

**Detection:**
```bash
grep -rn "class.*Service" server/src/ | grep -v "extends MicroserviceBase\|\.spec\.\|interface\|abstract"
```

**Violation example:**
```typescript
// WRONG: no extends
class OrderProcessingService {
  async execute(input: StationInput) { ... }
}
```

**Fix pattern:**
```typescript
// RIGHT: extends MicroserviceBase
class OrderProcessingService extends MicroserviceBase {
  async execute(input: StationInput): Promise<DataProcessResult<T>> { ... }
}
```

**Test template:**
```typescript
it('should extend MicroserviceBase', () => {
  const service = new GeneratedService(mockDeps);
  expect(service).toBeInstanceOf(MicroserviceBase);
});
```

---

## DNA-5: tenantId from Context, Not Parameter

**Rule:** No service method should accept `tenantId` as a function parameter. Read from `this.cls.get('tenantId')` (NestJS ClsService) or `AsyncLocalStorage`.

**Detection:**
```bash
grep -rn "tenantId" server/src/ | grep "string\|UUID\|param\|arg"
# Check if tenantId appears as a function signature parameter
```

**Violation example:**
```typescript
// WRONG: tenantId as explicit parameter
async processOrder(tenantId: string, orderId: string): Promise<DataProcessResult<T>> {
```

**Fix pattern:**
```typescript
// RIGHT: tenantId from context
async processOrder(orderId: string): Promise<DataProcessResult<T>> {
  const tenantId = this.cls.get('tenantId');
  // ...
}
```

**Test template:**
```typescript
it('should read tenantId from context, not parameters', () => {
  const source = fs.readFileSync(filePath, 'utf-8');
  // No method signatures should have tenantId as a typed parameter
  expect(source).not.toMatch(/\(.*tenantId:\s*(string|UUID)/);
});
```

---

## DNA-6: No Entity-Specific Controllers

**Rule:** No `@Controller()` decorator should map to entity-specific routes (e.g. `/orders`, `/payments`). The engine's `DynamicController` handles routing generically.

**Detection:**
```bash
grep -rn "@Controller(" server/src/ | grep -v "DynamicController\|BaseController\|engine"
```

**Violation example:**
```typescript
// WRONG: entity-specific controller
@Controller('orders')
class OrderController {
  @Get(':id')
  getOrder(@Param('id') id: string) { ... }
}
```

**Fix pattern:**
Remove the entity-specific controller. Register the factory with `DynamicController`. The engine routes calls automatically via the factory registry.

**Test template:**
```typescript
it('should not define entity-specific controllers', () => {
  const source = fs.readFileSync(filePath, 'utf-8');
  expect(source).not.toMatch(/@Controller\(['"][a-z]/);
});
```

---

## DNA-7: Event Subscriptions Have Dedup ID

**Rule:** Every `@Subscribe()` handler must have a dedup ID in the CloudEvents message to prevent double-processing.

**Detection:**
```bash
grep -rn "@Subscribe(" server/src/ -A 10
# Check: is there a dedupId field in the message envelope?
```

**Violation example:**
```typescript
// WRONG: no dedup ID
@Subscribe('order.completed')
async handleOrderCompleted(event: CloudEvent) {
  // no dedup check
}
```

**Fix pattern:**
```typescript
// RIGHT: dedup ID in CloudEvents envelope
@Subscribe('order.completed')
async handleOrderCompleted(event: CloudEvent) {
  const dedupId = event.id; // CloudEvents spec: id field is the dedup key
  if (await this.dedup.isProcessed(dedupId)) return;
  await this.dedup.markProcessed(dedupId);
  // ...
}
```

**Test template:**
```typescript
it('should deduplicate events using CloudEvents id', async () => {
  const event = createCloudEvent({ id: 'test-dedup-id', type: 'order.completed' });
  await handler.handleOrderCompleted(event);
  await handler.handleOrderCompleted(event); // second call — should be no-op
  expect(businessLogicSpy).toHaveBeenCalledTimes(1);
});
```

---

## DNA-8: Document Stored Before Queued

**Rule:** `storeDocument()` must always be called before `enqueue()` in the same scope. Enqueuing before storing creates a race condition where the consumer reads a document that doesn't exist yet.

**Detection:**
```bash
# Find function bodies containing both storeDocument and enqueue
grep -rn "enqueue(" server/src/ -B 20 | grep -B 5 "storeDocument"
# Manual check: is storeDocument called BEFORE enqueue in each function?
```

**Violation example:**
```typescript
// WRONG: enqueue before store
await this.queue.enqueue(event);          // consumer may read before...
await this.db.storeDocument(document);    // ...document exists
```

**Fix pattern:**
```typescript
// RIGHT: store then enqueue
await this.db.storeDocument(document);    // document persisted first
await this.queue.enqueue(event);          // safe to notify consumer
```

**Test template:**
```typescript
it('should store document before enqueuing event', async () => {
  const callOrder: string[] = [];
  storeDocument.mockImplementation(() => { callOrder.push('store'); return Promise.resolve(); });
  enqueue.mockImplementation(() => { callOrder.push('enqueue'); return Promise.resolve(); });
  await service.process(input);
  expect(callOrder).toEqual(['store', 'enqueue']);
});
```

---

## DNA-9: CloudEvents Wrapper on All Events

**Rule:** All `enqueue()` calls must pass a CloudEvents-compliant envelope — not a raw payload object.

**Detection:**
```bash
grep -rn "enqueue(" server/src/ -A 3
# Check: does each enqueue() call pass { specversion, type, source, id, data }?
```

**Violation example:**
```typescript
// WRONG: raw payload
await this.queue.enqueue({ orderId: '123', status: 'completed' });
```

**Fix pattern:**
```typescript
// RIGHT: CloudEvents wrapper
await this.queue.enqueue({
  specversion: '1.0',
  type: 'order.completed',
  source: '/xiigen/order-factory',
  id: crypto.randomUUID(),  // dedup ID per DNA-7
  datacontenttype: 'application/json',
  data: { orderId: '123', status: 'completed' }
});
```

**Test template:**
```typescript
it('should wrap events in CloudEvents envelope', async () => {
  await service.process(input);
  const enqueuedEvent = enqueue.mock.calls[0][0];
  expect(enqueuedEvent).toHaveProperty('specversion', '1.0');
  expect(enqueuedEvent).toHaveProperty('type');
  expect(enqueuedEvent).toHaveProperty('source');
  expect(enqueuedEvent).toHaveProperty('id');
  expect(enqueuedEvent).toHaveProperty('data');
});
```
