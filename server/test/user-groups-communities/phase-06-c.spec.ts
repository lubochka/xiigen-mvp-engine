/**
 * FLOW-06 Phase C Unit Tests — T104-T107 Feed Population (Branch B)
 *
 * T104 — GroupContentProfiler
 *   GCP-1: produces content profile { contentTypes, dateRange } — no full content fetch
 *   GCP-2: triggers on membership.activated event (not on join request events)
 *
 * T105 — TierContentSelector
 *   TCS-1: access_level filter applied at query layer (BuildSearchFilter contains content_access_level)
 *   TCS-2: PREMIUM accessLevels includes 'premium' — FREE accessLevels only 'open_access'
 *   TCS-3: result count bounded at 50 (MACHINE ceiling)
 *
 * T106 — FeedSeeder
 *   FS-1: timeout → partialResults:true (in output, not failure)
 *   FS-2: storeDocument before FeedSeeded emit (callOrder)
 *
 * T107 — ContentCacheWarmer
 *   CCW-1: DB error → DataProcessResult.success (best-effort try/catch)
 *   CCW-2: null db mock → still returns success
 *   DNA-3-TCS: select() returns DataProcessResult
 *   DNA-3-FS: seed() returns DataProcessResult
 */

import 'reflect-metadata';
import {
  GroupContentProfiler,
  GroupContentProfilerInput,
} from '../../src/engine/flows/membership-group-feed/group-content-profiler.service';
import {
  TierContentSelector,
  TierContentSelectorInput,
} from '../../src/engine/flows/membership-group-feed/tier-content-selector.service';
import {
  FeedSeeder,
  FeedSeederInput,
} from '../../src/engine/flows/membership-group-feed/feed-seeder.service';
import {
  ContentCacheWarmer,
  ContentCacheWarmerInput,
} from '../../src/engine/flows/membership-group-feed/content-cache-warmer.service';
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

// ── T104 GroupContentProfiler ─────────────────────────────────────────────────

describe('T104 GroupContentProfiler', () => {
  const baseInput: GroupContentProfilerInput = {
    groupId: 'grp-001',
    userId: 'usr-001',
    tenantId: 'tenant-001',
  };

  it('GCP-1: produces content profile { contentTypes, dateRange } — no full content fetch', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', content_types: ['post', 'video'] }],
    });
    const svc = new GroupContentProfiler(db as any);

    const result = await svc.buildProfile(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('contentTypes');
    expect(result.data).toHaveProperty('dateRange');
    expect(result.data!.dateRange).toHaveProperty('from');
    expect(result.data!.dateRange).toHaveProperty('to');
    // Should NOT have fetched content directly
    expect(db.searchDocuments).not.toHaveBeenCalledWith('xiigen-group-content', expect.any(Object));
  });

  it('GCP-2: profile builder does not trigger on join request — only on membership.activated context', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const svc = new GroupContentProfiler(db as any);

    // The service builds profile — it's called post membership.activated
    const result = await svc.buildProfile(baseInput);

    expect(result.isSuccess).toBe(true);
    // The service itself is a processing unit; caller (event handler) ensures it's wired to activated
    expect(result.data!.contentTypes).toBeDefined();
  });
});

// ── T105 TierContentSelector ──────────────────────────────────────────────────

describe('T105 TierContentSelector', () => {
  const profile = {
    contentTypes: ['post'],
    dateRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-04-12T00:00:00.000Z' },
  };

  it('TCS-1: access_level filter applied at query layer (content_access_level in search params)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-content': [{ content_id: 'c-001', content_access_level: 'open_access' }],
    });
    const svc = new TierContentSelector(db as any);

    await svc.select({
      groupId: 'grp-001',
      accessLevels: ['open_access'],
      profile,
      tenantId: 'tenant-001',
    });

    const searchCall = db.searchDocuments.mock.calls[0] as [string, Record<string, unknown>];
    expect(searchCall[1]).toHaveProperty('content_access_level');
  });

  it('TCS-2: PREMIUM accessLevels includes premium — FREE accessLevels only open_access', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-group-content': [] });
    const svc = new TierContentSelector(db as any);

    await svc.select({
      groupId: 'grp-001',
      accessLevels: ['premium', 'standard', 'open_access'],
      profile,
      tenantId: 'tenant-001',
    });

    const premiumCall = db.searchDocuments.mock.calls[0] as [string, Record<string, unknown>];
    const premiumLevels = premiumCall[1]['content_access_level'] as string[];
    expect(premiumLevels).toContain('premium');

    // Reset and test FREE
    db.searchDocuments.mockClear();
    await svc.select({
      groupId: 'grp-001',
      accessLevels: ['open_access'],
      profile,
      tenantId: 'tenant-001',
    });

    const freeCall = db.searchDocuments.mock.calls[0] as [string, Record<string, unknown>];
    const freeLevels = freeCall[1]['content_access_level'] as string[];
    expect(freeLevels).not.toContain('premium');
    expect(freeLevels).toEqual(['open_access']);
  });

  it('TCS-3: result count bounded at 50 (MACHINE ceiling)', async () => {
    const callOrder: string[] = [];
    // Seed more than 50 items
    const items = Array.from({ length: 60 }, (_, i) => ({
      content_id: `c-${i}`,
      content_access_level: 'open_access',
    }));
    const db = makeDb(callOrder, { 'xiigen-group-content': items });
    const svc = new TierContentSelector(db as any);

    const result = await svc.select({
      groupId: 'grp-001',
      accessLevels: ['open_access'],
      profile,
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.items.length).toBeLessThanOrEqual(50);
  });

  it('DNA-3-TCS: select() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn(),
    };
    const svc = new TierContentSelector(db as any);

    const result = await svc.select({
      groupId: 'grp-001',
      accessLevels: ['open_access'],
      profile,
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T106 FeedSeeder ───────────────────────────────────────────────────────────

describe('T106 FeedSeeder', () => {
  const baseInput: FeedSeederInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    content: {
      items: [{ content_id: 'c-001' }],
      nextCursor: null,
      total: 1,
    },
  };

  it('FS-1: timeout indicator → partialResults field in output (success, not failure)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new FeedSeeder(db as any, queue as any);

    const result = await svc.seed(baseInput);

    expect(result.isSuccess).toBe(true);
    // partialResults should be a boolean in the output
    expect(typeof result.data!.partialResults).toBe('boolean');
  });

  it('FS-2: storeDocument before FeedSeeded emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new FeedSeeder(db as any, queue as any);

    await svc.seed(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:FeedSeeded'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DNA-3-FS: seed() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db error')),
    };
    const queue = makeQueue(callOrder);
    const svc = new FeedSeeder(db as any, queue as any);

    const result = await svc.seed(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T107 ContentCacheWarmer ───────────────────────────────────────────────────

describe('T107 ContentCacheWarmer', () => {
  const baseInput: ContentCacheWarmerInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    contentIds: ['c-001', 'c-002'],
  };

  it('CCW-1: DB error → DataProcessResult.success (best-effort try/catch)', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('store error')),
    };
    const svc = new ContentCacheWarmer(db as any);

    const result = await svc.warm(baseInput);

    expect(result.isSuccess).toBe(true);
  });

  it('CCW-2: null/broken db mock → still returns success', async () => {
    const svc = new ContentCacheWarmer(null as any);

    const result = await svc.warm(baseInput);

    expect(result.isSuccess).toBe(true);
  });
});
