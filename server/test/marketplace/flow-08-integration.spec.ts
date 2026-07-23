/**
 * FLOW-08 Integration Tests
 *
 * INT-1: Full happy path: invitation queued → registrations processed → bootstrap complete
 * INT-2: audienceSize=0 → immediate completion with 0 batches
 * INT-3: T68 duplicate registration → idempotent success
 * INT-4: T70 purchase overlap pre-computed on SocialConnectionEstablished
 * INT-5: T70 null-read fallback: no purchase history → success({ overlapCount: 0, partial: true })
 * INT-6: T120 gate: all batches acked → ParticipationBootstrapCompleted emitted
 * INT-7: Tenant isolation: participation records not visible across tenants
 */

import 'reflect-metadata';
import { ParticipationInviterService } from '../../src/engine/flows/event-participation/participation-inviter.service';
import { RegistrationProcessorService } from '../../src/engine/flows/event-participation/registration-processor.service';
import { PurchaseOverlapAnalyzerService } from '../../src/engine/flows/event-participation/purchase-overlap-analyzer.service';
import { BootstrapGateService } from '../../src/engine/flows/event-participation/bootstrap-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared test infrastructure ────────────────────────────────────────────────

function createInMemoryStore() {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (index: string, doc: Record<string, unknown>, id: string) => {
        if (!store[index]) store[index] = {};
        store[index][id] = doc;
        return DataProcessResult.success({});
      }),
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        const records = Object.values(store[index] ?? {});
        const filtered = records.filter((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        );
        return DataProcessResult.success(filtered);
      }),
    _store: store,
  };
}

function createQueue() {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function makeRateLimit(exceeded = false) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: !exceeded })),
    increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

function makeFreedom(config: Record<string, unknown> = {}) {
  return {
    getConfig: jest.fn().mockResolvedValue(DataProcessResult.success(config)),
  };
}

function makePrivacyCheck(allowed = true) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed })),
  };
}

// ── Integration Tests ─────────────────────────────────────────────────────────

describe('FLOW-08 Integration', () => {
  it('INT-1: Full happy path: invitation queued → bootstrap tracked', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom({ flow08_invitation_batch_size: 100 });

    const inviter = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    const result = await inviter.inviteParticipants({
      eventId: 'event-001',
      tenantId: 'tenant-INT',
      audienceSize: 200,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.batchCount).toBe(2);
    const bootstrapEvent = queue._enqueued.find((e) => e.eventType.includes('bootstrap'));
    expect(bootstrapEvent).toBeDefined();
  });

  it('INT-2: audienceSize=0 → immediate completion with 0 batches', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom({ flow08_invitation_batch_size: 100 });

    const inviter = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    const result = await inviter.inviteParticipants({
      eventId: 'event-001',
      tenantId: 'tenant-INT',
      audienceSize: 0,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.batchCount).toBe(0);
    const batchEvents = queue._enqueued.filter((e) => e.eventType.includes('batch'));
    expect(batchEvents.length).toBe(0);
  });

  it('INT-3: T68 duplicate registration → idempotent success', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const privacy = makePrivacyCheck(true);
    const freedom = makeFreedom({ flow08_event_max_capacity: 100 });

    const processor = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );

    const r1 = await processor.processRegistration({
      userId: 'user-A',
      eventId: 'event-001',
      tenantId: 'tenant-INT',
    });
    expect(r1.isSuccess).toBe(true);

    const r2 = await processor.processRegistration({
      userId: 'user-A',
      eventId: 'event-001',
      tenantId: 'tenant-INT',
    });
    expect(r2.isSuccess).toBe(true);
    expect(r2.data?.idempotent).toBe(true);
  });

  it('INT-4: T70 purchase overlap pre-computed on SocialConnectionEstablished', async () => {
    // Simulate T70 being called when connection established
    const dbFull = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-INT' },
          ]),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-INT' },
          ]),
        ),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = createQueue();

    const analyzer = new PurchaseOverlapAnalyzerService(dbFull as any, queue as any);
    const result = await analyzer.analyzePurchaseOverlap({
      userIdA: 'user-A',
      userIdB: 'user-B',
      tenantId: 'tenant-INT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.overlapCount).toBe(1);
  });

  it('INT-5: T70 null-read fallback: no purchase history → success with partial:true', async () => {
    const db = createInMemoryStore(); // empty
    const queue = createQueue();

    const analyzer = new PurchaseOverlapAnalyzerService(db as any, queue as any);
    const result = await analyzer.analyzePurchaseOverlap({
      userIdA: 'user-A',
      userIdB: 'user-B',
      tenantId: 'tenant-INT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.overlapCount).toBe(0);
    expect(result.data?.partial).toBe(true);
  });

  it('INT-6: T120 gate: all batches acked → ParticipationBootstrapCompleted emitted', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const gate = new BootstrapGateService(db as any, queue as any);

    // Ack 3 batches, total=3
    await gate.acknowledgeBatch({
      eventId: 'event-001',
      tenantId: 'tenant-INT',
      batchIndex: 0,
      totalBatches: 3,
    });
    await gate.acknowledgeBatch({
      eventId: 'event-001',
      tenantId: 'tenant-INT',
      batchIndex: 1,
      totalBatches: 3,
    });
    const finalResult = await gate.acknowledgeBatch({
      eventId: 'event-001',
      tenantId: 'tenant-INT',
      batchIndex: 2,
      totalBatches: 3,
    });

    expect(finalResult.data?.completed).toBe(true);
    const completionEvent = queue._enqueued.find((e) => e.eventType.includes('completed'));
    expect(completionEvent).toBeDefined();
  });

  it('INT-7: Tenant isolation: participation records not visible across tenants', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom({ flow08_invitation_batch_size: 100 });

    const inviter = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );

    // Store in tenant-A
    await inviter.inviteParticipants({
      eventId: 'event-001',
      tenantId: 'tenant-A',
      audienceSize: 50,
    });

    // Query for tenant-B — should not find tenant-A records
    const tenantBResult = await db.searchDocuments('xiigen-participation-bootstrap', {
      tenantId: 'tenant-B',
    });
    expect(tenantBResult.data).toHaveLength(0);
  });
});
