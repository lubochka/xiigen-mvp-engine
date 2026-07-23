# Tenant Isolation Test Pattern

## Existing File to Extend

`test/fabrics/tenant-isolation-e2e.spec.ts`

Do NOT create a new file. Extend the existing one with new `describe` blocks per fabric provider.

## Extension Pattern

```typescript
describe('TenantIsolation — <provider-name>', () => {
  let moduleRef: TestingModule;
  let service: YourFabricService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        // minimal module with real provider — no mocks
        FabricModule.forTest({ provider: '<provider-name>' }),
      ],
    }).compile();
    service = moduleRef.get(YourFabricService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  afterEach(async () => {
    // Flush tenant-A and tenant-B data after each test
    await service.flush('tenant-a');
    await service.flush('tenant-b');
  });

  it('should not leak data between tenants in sequential calls', async () => {
    await service.store({ tenantId: 'tenant-a', key: 'test', value: 'alpha' });
    await service.store({ tenantId: 'tenant-b', key: 'test', value: 'beta' });

    const resultA = await service.query({ tenantId: 'tenant-a', key: 'test' });
    const resultB = await service.query({ tenantId: 'tenant-b', key: 'test' });

    expect(resultA.data.value).toBe('alpha');
    expect(resultB.data.value).toBe('beta');
  });

  it('should not leak tenant data in concurrent Promise.all', async () => {
    const [resultA, resultB] = await Promise.all([
      service.execute({ tenantId: 'tenant-a', input: sampleContractA }),
      service.execute({ tenantId: 'tenant-b', input: sampleContractB }),
    ]);

    expect(resultA.data.tenantId).toBe('tenant-a');
    expect(resultB.data.tenantId).toBe('tenant-b');
  });

  it('should return empty result for tenant-B when only tenant-A has data', async () => {
    await service.store({ tenantId: 'tenant-a', key: 'exclusive', value: 'only-a' });

    const resultB = await service.query({ tenantId: 'tenant-b', key: 'exclusive' });

    expect(resultB.data).toBeNull();  // or empty array — not tenant-A's data
  });
});
```

## Important Notes

1. **Use `--runInBand`** when running tenant isolation tests — parallel workers sharing a container can cause cross-contamination.

2. **Import from sample-contracts.ts** for EngineContract fixtures:
   ```typescript
   import { sampleContractA, sampleContractB } from 'server/src/engine-contracts/sample-contracts';
   ```
   Do NOT hand-craft StationInput objects — use real fixtures.

3. **The `flush()` method** must be implemented per provider. For database providers, it truncates the tenant's index/schema. For queue providers, it purges the tenant's queue. Add this method to the fabric interface if it doesn't exist.

4. **ClsService scope**: If your provider reads tenantId from ClsService, wrap the concurrent test in `cls.run({ tenantId }, ...)` — do not rely on AsyncLocalStorage propagation through Promise.all (see async-local-storage rule in mental-debug).

## When to Add a New Block

Every new docker-backed provider (ES, PG, SQS, LocalStack services) must have a `describe` block in this file before Phase 11 code modifications that touch that provider.
