import { InMemoryIdempotencyStore } from './idempotency-store.memory';

describe('InMemoryIdempotencyStore', () => {
  let store: InMemoryIdempotencyStore;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
  });

  it('checkAndSet returns success(true) on first call', async () => {
    const result = await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });

  it('checkAndSet returns failure on duplicate key', async () => {
    await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    const result = await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_REQUEST');
  });

  it('same payload different tenantId both succeed', async () => {
    const r1 = await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    const r2 = await store.checkAndSet({ tenantId: 'beta', key: 'op::abc' });
    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });

  it('release allows same key reuse', async () => {
    await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    await store.release({ tenantId: 'acme', key: 'op::abc' });
    const result = await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    expect(result.isSuccess).toBe(true);
  });
});
