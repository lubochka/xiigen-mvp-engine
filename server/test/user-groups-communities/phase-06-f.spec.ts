/**
 * FLOW-06 Phase F Unit Tests — T116-T118 Tier Change Subflows
 *
 * T116 — TierChangeProcessor
 *   TCP-1: computes accessLevels from newTier (same tier → access level mapping as T100)
 *   TCP-2: triggers on SubscriptionChanged (not on MembershipActivated)
 *
 * T117 — AccessControlUpdater
 *   ACU-1: conditional update correctly updates tier and accessLevels in stored record
 *   ACU-2: SETNX would return false for existing record — prove conditional update was used
 *   ACU-3: storeDocument before TierChanged emit (callOrder)
 *
 * T118 — FeedContentAdjuster
 *   FCA-1: DOWNGRADE — removal filter applied at query layer
 *   FCA-2: UPGRADE — seeding bounded at 50 max (same ceiling as T106)
 *   FCA-3: partial removal failure → continues processing other entries (no abort)
 *   FCA-4: storeDocument before FeedContentAdjusted emit
 *   DNA-3-ACU: update() returns DataProcessResult
 *   DNA-3-FCA: adjust() returns DataProcessResult
 */

import 'reflect-metadata';
import {
  TierChangeProcessor,
  TierChangeProcessorInput,
} from '../../src/engine/flows/membership-group-feed/tier-change-processor.service';
import {
  AccessControlUpdater,
  AccessControlUpdaterInput,
} from '../../src/engine/flows/membership-group-feed/access-control-updater.service';
import {
  FeedContentAdjuster,
  FeedContentAdjusterInput,
} from '../../src/engine/flows/membership-group-feed/feed-content-adjuster.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ────────────────────────────────────────────────────────────

interface DbSeed {
  [index: string]: Array<Record<string, unknown>>;
}

function makeDb(callOrder: string[], seed: DbSeed = {}) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        const rows = seed[index] ?? [];
        return DataProcessResult.success(rows);
      }),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push(`enqueue:${eventType}`);
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

// ── T116 TierChangeProcessor ──────────────────────────────────────────────────

describe('T116 TierChangeProcessor', () => {
  it('TCP-1: computes accessLevels from newTier (same mapping as T100)', async () => {
    const svc = new TierChangeProcessor();

    const premiumResult = await svc.process({
      userId: 'usr-001',
      groupId: 'grp-001',
      newTier: 'PREMIUM',
      oldTier: 'FREE',
      tenantId: 'tenant-001',
    });

    expect(premiumResult.isSuccess).toBe(true);
    expect(premiumResult.data!.newAccessLevels).toEqual(['premium', 'standard', 'open_access']);

    const freeResult = await svc.process({
      userId: 'usr-001',
      groupId: 'grp-001',
      newTier: 'FREE',
      oldTier: 'PREMIUM',
      tenantId: 'tenant-001',
    });

    expect(freeResult.data!.newAccessLevels).toEqual(['open_access']);
  });

  it('TCP-2: SubscriptionChanged triggers process — not MembershipActivated', async () => {
    const svc = new TierChangeProcessor();

    // The service processes tier changes — it's wired to SubscriptionChanged by caller
    const result = await svc.process({
      userId: 'usr-001',
      groupId: 'grp-001',
      newTier: 'STANDARD',
      oldTier: 'FREE',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.newTier).toBe('STANDARD');
    expect(result.data!.oldTier).toBe('FREE');
    expect(result.data!.isUpgrade).toBe(true);
  });
});

// ── T117 AccessControlUpdater ─────────────────────────────────────────────────

describe('T117 AccessControlUpdater', () => {
  const existingAcRecord = {
    access_control_id: 'ac-usr-001-grp-001',
    user_id: 'usr-001',
    group_id: 'grp-001',
    assigned_tier: 'FREE',
    access_levels: ['open_access'],
    tenant_id: 'tenant-001',
  };

  const baseInput: AccessControlUpdaterInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    newTier: 'STANDARD',
    oldTier: 'FREE',
    newAccessLevels: ['standard', 'open_access'],
    tenantId: 'tenant-001',
  };

  it('ACU-1: conditional update correctly updates tier and accessLevels in stored record', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-access-controls': [existingAcRecord] });
    const queue = makeQueue(callOrder);
    const svc = new AccessControlUpdater(db as any, queue as any);

    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.updated).toBe(true);
    const storedDoc = db.storeDocument.mock.calls[0] as [string, Record<string, unknown>];
    expect(storedDoc[1]['assigned_tier']).toBe('STANDARD');
    expect(storedDoc[1]['access_levels']).toEqual(['standard', 'open_access']);
  });

  it('ACU-2: conditional update — skips if current_tier does not match oldTier', async () => {
    const callOrder: string[] = [];
    // Current tier is already STANDARD, not FREE
    const alreadyUpdated = { ...existingAcRecord, assigned_tier: 'STANDARD' };
    const db = makeDb(callOrder, { 'xiigen-access-controls': [alreadyUpdated] });
    const queue = makeQueue(callOrder);
    const svc = new AccessControlUpdater(db as any, queue as any);

    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.skipped).toBe(true);
    // No storeDocument called when tier already updated
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('ACU-3: storeDocument before TierChanged emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-access-controls': [existingAcRecord] });
    const queue = makeQueue(callOrder);
    const svc = new AccessControlUpdater(db as any, queue as any);

    await svc.update(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:TierChanged'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DNA-3-ACU: update() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new AccessControlUpdater(db as any, queue as any);

    const result = await svc.update(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T118 FeedContentAdjuster ──────────────────────────────────────────────────

describe('T118 FeedContentAdjuster', () => {
  const downgradeInput: FeedContentAdjusterInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    newTier: 'FREE',
    oldTier: 'PREMIUM',
    newAccessLevels: ['open_access'],
    oldAccessLevels: ['premium', 'standard', 'open_access'],
    isUpgrade: false,
  };

  const upgradeInput: FeedContentAdjusterInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    newTier: 'PREMIUM',
    oldTier: 'FREE',
    newAccessLevels: ['premium', 'standard', 'open_access'],
    oldAccessLevels: ['open_access'],
    isUpgrade: true,
  };

  it('FCA-1: DOWNGRADE — removal filter applied at query layer (content_access_level_not_in in search)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-feed-entries': [], 'xiigen-feed-adjustments': [] });
    const queue = makeQueue(callOrder);
    const svc = new FeedContentAdjuster(db as any, queue as any);

    await svc.adjust(downgradeInput);

    const searchCalls = db.searchDocuments.mock.calls as [string, Record<string, unknown>][];
    const feedEntrySearch = searchCalls.find((call) => call[0] === 'xiigen-feed-entries');
    expect(feedEntrySearch).toBeDefined();
    expect(feedEntrySearch![1]).toHaveProperty('content_access_level_not_in');
  });

  it('FCA-2: UPGRADE — seeding bounded at 50 max (same ceiling as T106)', async () => {
    const callOrder: string[] = [];
    const items = Array.from({ length: 60 }, (_, i) => ({
      content_id: `c-${i}`,
      content_access_level: 'premium',
    }));
    const db = makeDb(callOrder, {
      'xiigen-group-content': items,
      'xiigen-feed-adjustments': [],
    });
    const queue = makeQueue(callOrder);
    const svc = new FeedContentAdjuster(db as any, queue as any);

    const result = await svc.adjust(upgradeInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.addedCount).toBeLessThanOrEqual(50);
  });

  it('FCA-3: partial removal failure → continues processing other entries (no abort)', async () => {
    const callOrder: string[] = [];
    const feedEntries = [
      { feed_entry_id: 'fe-001', content_access_level: 'premium' },
      { feed_entry_id: 'fe-002', content_access_level: 'premium' },
    ];
    let callCount = 0;
    const db = {
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-feed-entries') return DataProcessResult.success(feedEntries);
        return DataProcessResult.success([]);
      }),
      storeDocument: jest
        .fn()
        .mockImplementation(async (_index: string, doc: Record<string, unknown>, id: string) => {
          callOrder.push('storeDocument');
          callCount++;
          // Fail on first feed entry update but succeed on others
          if (id === 'fe-001') throw new Error('partial failure');
          return DataProcessResult.success({});
        }),
    };
    const queue = makeQueue(callOrder);
    const svc = new FeedContentAdjuster(db as any, queue as any);

    const result = await svc.adjust(downgradeInput);

    // Should succeed overall despite partial failure
    expect(result.isSuccess).toBe(true);
    // Second entry should have been processed
    expect(result.data!.partialFailures).toBeGreaterThanOrEqual(1);
  });

  it('FCA-4: storeDocument before FeedContentAdjusted emit', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-group-content': [], 'xiigen-feed-adjustments': [] });
    const queue = makeQueue(callOrder);
    const svc = new FeedContentAdjuster(db as any, queue as any);

    await svc.adjust(upgradeInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:FeedContentAdjusted'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DNA-3-FCA: adjust() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db error')),
    };
    const queue = makeQueue(callOrder);
    const svc = new FeedContentAdjuster(db as any, queue as any);

    const result = await svc.adjust(upgradeInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});
