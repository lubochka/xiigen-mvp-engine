/**
 * FLOW-03 Phase P2 — FC-ADAPT adaptation spec (TYPE-A FREEDOM-config parametric)
 *
 * Protocol: FLOW-PORTABILITY-TEST-PROTOCOL-v1.2
 * Tier:     TIER-D (mobile candidate, workspace-level adaptation)
 * Tenant:   acme-pro-members
 *
 * Covers portability invariant P-3 (flow03_ FREEDOM prefix) and R3 of the 5-req
 * DoD: the four FLOW-03 services bend to acme-pro-members tenant overrides purely
 * through FREEDOM config writes. Zero code change is required to re-tune limits.
 *
 * FC-ADAPT-1: flow03_max_events_per_organizer=3 → 4th createEvent → RATE_LIMIT_EXCEEDED
 * FC-ADAPT-2: flow03_max_attendees=10            → 11th register  → WAITLISTED routing
 * FC-ADAPT-3: flow03_promotion_channels=['in-app'] → promote stores channels=['in-app']
 * FC-ADAPT-4: flow03_campaign_engagement_threshold=5 → 5th track → PromotionCampaignCompleted
 * FC-ADAPT-5: no overrides present → built-in defaults apply (NOT acme values)
 *
 * NOTE: FLOW-03 services read FREEDOM via db.searchDocuments('freedom_configs', {config_key, task_type}).
 * This differs from FLOW-02, which injects IFreedomConfigService. Mock shape reflects that.
 */

import 'reflect-metadata';
import {
  EventCreationOrchestrator,
  CreateEventInput,
} from '../../src/engine/flows/event-management/event-creation.service';
import { EventRegistrationManager } from '../../src/engine/flows/event-management/event-registration.service';
import { EventPromotionEngine } from '../../src/engine/flows/event-management/event-promotion.service';
import { EventAnalyticsTracker } from '../../src/engine/flows/event-management/event-analytics.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

type FreedomRow = { config_key: string; task_type: string; config_value: unknown };

interface DbOptions {
  freedomRows?: FreedomRow[];
  events?: Array<Record<string, unknown>>;
  registrations?: Array<Record<string, unknown>>;
  contentPolicies?: Array<Record<string, unknown>>;
  analytics?: Array<Record<string, unknown>>;
  paymentConfigs?: Array<Record<string, unknown>>;
  promotions?: Array<Record<string, unknown>>;
}

function makeDb(options: DbOptions = {}) {
  const freedomRows = options.freedomRows ?? [];
  const events = [...(options.events ?? [])];
  const registrations = [...(options.registrations ?? [])];
  const contentPolicies = [...(options.contentPolicies ?? [])];
  const analytics = [...(options.analytics ?? [])];
  const paymentConfigs = [...(options.paymentConfigs ?? [])];
  const promotions = [...(options.promotions ?? [])];
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  function matchAll(row: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([k, v]) => v == null || row[k] === v);
  }

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'freedom_configs') {
        const rows = freedomRows as unknown as Array<Record<string, unknown>>;
        return DataProcessResult.success(rows.filter((r) => matchAll(r, filter)));
      }
      if (index === 'xiigen-events') {
        return DataProcessResult.success(events.filter((e) => matchAll(e, filter)));
      }
      if (index === 'xiigen-event-registrations') {
        return DataProcessResult.success(registrations.filter((r) => matchAll(r, filter)));
      }
      if (index === 'xiigen-content-policy') {
        return DataProcessResult.success(contentPolicies.filter((c) => matchAll(c, filter)));
      }
      if (index === 'xiigen-event-analytics') {
        return DataProcessResult.success(analytics.filter((a) => matchAll(a, filter)));
      }
      if (index === 'xiigen-payment-configs') {
        return DataProcessResult.success(paymentConfigs.filter((p) => matchAll(p, filter)));
      }
      if (index === 'xiigen-event-promotions') {
        return DataProcessResult.success(promotions.filter((p) => matchAll(p, filter)));
      }
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      if (index === 'xiigen-events') events.push(doc);
      if (index === 'xiigen-event-registrations') registrations.push(doc);
      if (index === 'xiigen-event-analytics') {
        const key = doc['counter_key'];
        const idx = analytics.findIndex((a) => a['counter_key'] === key);
        if (idx >= 0) analytics[idx] = doc;
        else analytics.push(doc);
      }
      if (index === 'xiigen-event-promotions') promotions.push(doc);
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
    _analytics: analytics,
    _promotions: promotions,
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

function baseCreateInput(overrides: Partial<CreateEventInput> = {}): CreateEventInput {
  return {
    title: 'Startup Networking Night',
    organizerId: 'org-acme-1',
    tenantId: TENANT,
    startDate: FUTURE,
    capacity: 50,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-03 FC-ADAPT — acme-pro-members tenant parameterization', () => {
  // ─────────────────────────────────────────────────────────────────────────────
  it('FC-ADAPT-1: flow03_max_events_per_organizer=3 → 4th createEvent returns RATE_LIMIT_EXCEEDED', async () => {
    // Simulate 3 already-stored events for org-acme-1 at the acme cap.
    const existing = Array.from({ length: 3 }, (_, i) => ({
      event_id: `evt-existing-${i + 1}`,
      organizer_id: 'org-acme-1',
      tenant_id: TENANT,
    }));

    const db = makeDb({
      freedomRows: [
        {
          config_key: 'flow03_max_events_per_organizer',
          task_type: 'xiigen-engine',
          config_value: '3',
        },
      ],
      events: existing,
    });
    const queue = makeQueue();
    const svc = new EventCreationOrchestrator(db, queue);

    const result = await svc.createEvent(baseCreateInput());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    // No event stored, no event emitted once the rate limit trips.
    expect(db._stored.filter((s: { index: string }) => s.index === 'xiigen-events').length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  it('FC-ADAPT-2: flow03_max_attendees=10 → 11th register is WAITLISTED', async () => {
    const eventRow = {
      event_id: 'evt-acme-2',
      organizer_id: 'org-acme-1',
      tenant_id: TENANT,
      capacity: 20, // event capacity > FREEDOM cap — FREEDOM wins via min(cap, max)
      start_date: FUTURE,
      is_private: false,
      is_paid_event: false,
    };
    const confirmed = Array.from({ length: 10 }, (_, i) => ({
      registration_id: `reg-existing-${i + 1}`,
      attendee_id: `att-${i + 1}`,
      event_id: 'evt-acme-2',
      tenant_id: TENANT,
      status: 'CONFIRMED',
    }));

    const db = makeDb({
      freedomRows: [
        { config_key: 'flow03_max_attendees', task_type: 'xiigen-engine', config_value: '10' },
      ],
      events: [eventRow],
      registrations: confirmed,
    });
    const queue = makeQueue();
    const svc = new EventRegistrationManager(db, queue);

    const result = await svc.register({
      attendeeId: 'att-11',
      eventId: 'evt-acme-2',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('WAITLISTED');
    expect(result.data?.routed).toBe('WAITLIST');
    // WaitlistJoined (not AttendeeRegistered) emitted.
    const emitted = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(emitted).toContain('WaitlistJoined');
    expect(emitted).not.toContain('AttendeeRegistered');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  it('FC-ADAPT-3: flow03_promotion_channels=[in-app] → promote stores channels=[in-app] only', async () => {
    const db = makeDb({
      freedomRows: [
        {
          config_key: 'flow03_promotion_channels',
          task_type: 'xiigen-engine',
          config_value: JSON.stringify(['in-app']),
        },
      ],
      contentPolicies: [], // not flagged → promotion proceeds
    });
    const queue = makeQueue();
    const svc = new EventPromotionEngine(db, queue);

    const result = await svc.promote({
      eventId: 'evt-acme-2',
      organizerId: 'org-acme-1',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.promoted).toBe(true);
    expect(result.data?.channels).toEqual(['in-app']);
    // Stored promotion doc matches (IR-61 storeDocument before emit).
    const promoStore = db._stored.find(
      (s: { index: string }) => s.index === 'xiigen-event-promotions',
    );
    expect(promoStore?.doc['channels']).toEqual(['in-app']);
    // EventPromoted emitted with the same acme channel set.
    const promoted = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'EventPromoted',
    );
    expect(promoted?.data['channels']).toEqual(['in-app']);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  it('FC-ADAPT-4: flow03_campaign_engagement_threshold=5 → 5th track emits PromotionCampaignCompleted', async () => {
    // Pre-compute the counter_key so the pre-seeded count lines up with the window the service computes.
    const TTL_SECONDS = 86400;
    const windowStartEpoch = Math.floor(Date.now() / (TTL_SECONDS * 1000)) * (TTL_SECONDS * 1000);
    const counterKey = `evt-acme-2:campaign_engagement:${windowStartEpoch}`;

    const db = makeDb({
      freedomRows: [
        {
          config_key: 'flow03_analytics_counter_ttl',
          task_type: 'xiigen-engine',
          config_value: String(TTL_SECONDS),
        },
        {
          config_key: 'flow03_campaign_engagement_threshold',
          task_type: 'xiigen-engine',
          config_value: '5',
        },
      ],
      analytics: [
        {
          counter_key: counterKey,
          event_id: 'evt-acme-2',
          analytics_type: 'campaign_engagement',
          tenant_id: TENANT,
          count: 4, // pre-seeded so the next hit lands on 5 (== threshold)
          ttl_seconds: TTL_SECONDS,
          expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });
    const queue = makeQueue();
    const svc = new EventAnalyticsTracker(db, queue);

    const result = await svc.track({
      eventId: 'evt-acme-2',
      analyticsType: 'campaign_engagement',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.tracked).toBe(true);
    expect(result.data?.count).toBe(5);
    // IR-62-4: emitted event is PromotionCampaignCompleted — never EventPromotionCompleted.
    const emitted = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'PromotionCampaignCompleted',
    );
    expect(emitted).toBeDefined();
    expect(emitted?.data['eventId']).toBe('evt-acme-2');
    expect(emitted?.data['engagementCount']).toBe(5);
    // No accidental emit of the synchronous-pipeline event.
    expect(
      queue._enqueued.some(
        (e: { eventType: string }) => e.eventType === 'EventPromotionCompleted',
      ),
    ).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  it('FC-ADAPT-5: no FREEDOM overrides present → baseline defaults apply, not acme values', async () => {
    // No freedomRows: searchDocuments('freedom_configs', ...) returns empty → service uses defaults.
    // Default flow03_max_events_per_organizer=100 → 4 existing events is well under the cap.
    const existing = Array.from({ length: 4 }, (_, i) => ({
      event_id: `evt-default-${i + 1}`,
      organizer_id: 'org-default-1',
      tenant_id: 'default-tenant',
    }));

    const db = makeDb({ freedomRows: [], events: existing });
    const queue = makeQueue();
    const svc = new EventCreationOrchestrator(db, queue);

    const result = await svc.createEvent(
      baseCreateInput({ organizerId: 'org-default-1', tenantId: 'default-tenant' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.errorCode).toBeUndefined();
    // 5th event stored without rate-limit trip — default cap (100) is NOT acme cap (3).
    const stored = db._stored.filter((s: { index: string }) => s.index === 'xiigen-events');
    expect(stored.length).toBe(1);
    expect(queue._enqueued.some((e: { eventType: string }) => e.eventType === 'EventCreated')).toBe(
      true,
    );
  });
});
