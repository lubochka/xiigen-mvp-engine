/**
 * FLOW-03 Phase P2 — Circular-install probe (Gap-C part 2)
 *
 * Protocol: FLOW-PORTABILITY-TEST-PROTOCOL-v1.2
 * Tier:     TIER-D
 *
 * Proves the 4 FLOW-03 services (T59–T62) instantiate and run their golden paths
 * with NO FLOW-04 (event-attendance) service present in the runtime. This locks
 * P-5 (requiredCoInstalls=[]) at the behavioural level so the package.json claim
 * that FLOW-03 has no co-install dependency is backed by a test, not just a doc.
 *
 * The test is intentionally minimal — one happy-path call per service. Rich
 * unit-level behaviour (edge cases, validation, DNA-8 ordering) is covered by
 * the phase-03-{a,b,c,d}.spec.ts files.
 *
 * A fifth assertion reads the package.json at runtime and confirms the manifest
 * still declares no required co-installs — the manifest and the code agree.
 */

import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';

import { EventCreationOrchestrator } from '../../src/engine/flows/event-management/event-creation.service';
import { EventRegistrationManager } from '../../src/engine/flows/event-management/event-registration.service';
import { EventPromotionEngine } from '../../src/engine/flows/event-management/event-promotion.service';
import { EventAnalyticsTracker } from '../../src/engine/flows/event-management/event-analytics.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Minimal mocks ──────────────────────────────────────────────────────────────

function makeDb() {
  const events: Array<Record<string, unknown>> = [];
  const registrations: Array<Record<string, unknown>> = [];
  const promotions: Array<Record<string, unknown>> = [];
  const analytics: Array<Record<string, unknown>> = [];
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  function matchAll(row: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([k, v]) => v == null || row[k] === v);
  }

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-events') {
        return DataProcessResult.success(events.filter((e) => matchAll(e, filter)));
      }
      if (index === 'xiigen-event-registrations') {
        return DataProcessResult.success(registrations.filter((r) => matchAll(r, filter)));
      }
      if (index === 'xiigen-event-promotions') {
        return DataProcessResult.success(promotions.filter((p) => matchAll(p, filter)));
      }
      if (index === 'xiigen-event-analytics') {
        return DataProcessResult.success(analytics.filter((a) => matchAll(a, filter)));
      }
      // freedom_configs, xiigen-content-policy, xiigen-payment-configs → empty → service uses defaults.
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      if (index === 'xiigen-events') events.push(doc);
      if (index === 'xiigen-event-registrations') registrations.push(doc);
      if (index === 'xiigen-event-promotions') promotions.push(doc);
      if (index === 'xiigen-event-analytics') analytics.push(doc);
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
    _events: events,
    _registrations: registrations,
    _promotions: promotions,
    _analytics: analytics,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const TENANT = 'acme-pro-members';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-03 circular-install probe — 4 services boot without FLOW-04 present', () => {
  it('T59 EventCreationOrchestrator: boots + createEvent golden path without any FLOW-04 service', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new EventCreationOrchestrator(db, queue);

    const result = await svc.createEvent({
      title: 'Standalone Smoke Event',
      organizerId: 'org-acme-1',
      tenantId: TENANT,
      startDate: FUTURE,
      capacity: 50,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.eventId).toBeDefined();
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'EventCreated'),
    ).toBe(true);
  });

  it('T60 EventRegistrationManager: boots + register golden path without any FLOW-04 service', async () => {
    const db = makeDb();
    const queue = makeQueue();

    // Seed an event so the registration manager has something to read.
    await db.storeDocument(
      'xiigen-events',
      {
        event_id: 'evt-seed-reg',
        title: 'Seed',
        organizer_id: 'org-acme-1',
        tenant_id: TENANT,
        start_date: FUTURE,
        capacity: 10,
        is_private: false,
        is_paid_event: false,
        matching_criteria: {},
        knowledge_scope: 'GLOBAL',
        connection_type: 'FLOW_SCOPED',
        created_at: new Date().toISOString(),
      },
      'evt-seed-reg',
    );

    const svc = new EventRegistrationManager(db, queue);
    const result = await svc.register({
      attendeeId: 'att-1',
      eventId: 'evt-seed-reg',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(['CONFIRMED', 'WAITLISTED']).toContain(result.data?.status);
  });

  it('T61 EventPromotionEngine: boots + promote golden path without any FLOW-04 service', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new EventPromotionEngine(db, queue);

    const result = await svc.promote({
      eventId: 'evt-seed-promo',
      organizerId: 'org-acme-1',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.promoted).toBe(true);
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'EventPromoted'),
    ).toBe(true);
  });

  it('T62 EventAnalyticsTracker: boots + track golden path without any FLOW-04 service', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new EventAnalyticsTracker(db, queue);

    const result = await svc.track({
      eventId: 'evt-seed-analytics',
      analyticsType: 'view',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.tracked).toBe(true);
  });

  it('package.json manifest agrees: requiredCoInstalls=[] AND readsFromOtherFlows=[]', () => {
    const pkgPath = join(__dirname, '../../src/engine/flows/event-management/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      requiredCoInstalls: string[];
      xiigenFlowMeta: { readsFromOtherFlows: string[]; connectionType: string };
    };

    expect(Array.isArray(pkg.requiredCoInstalls)).toBe(true);
    expect(pkg.requiredCoInstalls.length).toBe(0);
    expect(pkg.xiigenFlowMeta.readsFromOtherFlows).toEqual([]);
    expect(pkg.xiigenFlowMeta.connectionType).toBe('FLOW_SCOPED');
  });
});
