/**
 * FLOW-05 Phase E — Branch B (T88, T89) + Branch C (T90–T95) unit tests
 *
 * T88  MLCurriculumTrigger
 * T89  MLAdaptationProcessor
 * T90  SocialShareGateService      (CF-05-3)
 * T91  SocialShareDistributorService
 * T92  SocialPostCreatorService
 * T93  SocialFeedUpdaterService
 * T94  SocialNotificationSenderService
 * T95  SocialAnalyticsRecorderService  (OBSERVABILITY — no queue)
 */

import 'reflect-metadata';

import { MLCurriculumTrigger } from '../../src/engine/flows/completion-gamification/ml-curriculum-trigger.service';
import { MLAdaptationProcessor } from '../../src/engine/flows/completion-gamification/ml-adaptation-processor.service';
import { SocialShareGateService } from '../../src/engine/flows/completion-gamification/social-share-gate.service';
import { SocialShareDistributorService } from '../../src/engine/flows/completion-gamification/social-share-distributor.service';
import { SocialPostCreatorService } from '../../src/engine/flows/completion-gamification/social-post-creator.service';
import { SocialFeedUpdaterService } from '../../src/engine/flows/completion-gamification/social-feed-updater.service';
import { SocialNotificationSenderService } from '../../src/engine/flows/completion-gamification/social-notification-sender.service';
import { SocialAnalyticsRecorderService } from '../../src/engine/flows/completion-gamification/social-analytics-recorder.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeDb(searchResult: Record<string, unknown>[] = []) {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(searchResult)),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued,
  } as any;
}

// ── Shared fixtures ────────────────────────────────────────────────────────────

const TENANT = 't-test';
const USER = 'u-test';
const C_ID = 'cmp-001';
const Q_ID = 'q-001';
const SSI_ID = 'ssi-test-001';
const DIST_ID = 'ssd-test-001';
const POST_ID = 'spo-test-001';
const FEED_ID = 'sfe-test-001';

// ══════════════════════════════════════════════════════════════════════════════
// T88 — MLCurriculumTrigger
// ══════════════════════════════════════════════════════════════════════════════

describe('T88 — MLCurriculumTrigger', () => {
  it('T88-1: happy path — requestId starts with mlr-, ml.adaptation.requested emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);
    db.storeDocument.mockImplementation(async (_: string, __: unknown, id: string) => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    const service = new MLCurriculumTrigger(db, queue);
    const result = await service.trigger({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 75,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.requestId).toMatch(/^mlr-/);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'ml.adaptation.requested',
      expect.objectContaining({
        requestId: result.data!.requestId,
      }),
    );
  });

  it('T88-2: DNA-8 — storeDocument precedes enqueue', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);
    db.storeDocument.mockImplementation(async (_: string, __: unknown, id: string) => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    const service = new MLCurriculumTrigger(db, queue);
    await service.trigger({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 80,
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqIdx).toBeGreaterThan(storeIdx);
  });

  it('T88-3: knowledge_scope PRIVATE is stored in the document', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new MLCurriculumTrigger(db, queue);
    await service.trigger({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 60,
    });

    const [, storedDoc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(storedDoc['knowledge_scope']).toBe('PRIVATE');
    expect(storedDoc['connection_type']).toBe('FLOW_SCOPED');
  });

  it('T88-4: validation — missing completionId → VALIDATION_FAILURE', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new MLCurriculumTrigger(db, queue);
    const result = await service.trigger({
      completionId: '',
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 50,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T88-5: DNA-3 — unexpected db throw → MLCURRICULUM_TRIGGER_ERROR', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);
    db.storeDocument.mockRejectedValueOnce(new Error('db exploded'));

    const service = new MLCurriculumTrigger(db, queue);
    const result = await service.trigger({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      effectiveTotal: 70,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MLCURRICULUM_TRIGGER_ERROR');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T89 — MLAdaptationProcessor
// ══════════════════════════════════════════════════════════════════════════════

describe('T89 — MLAdaptationProcessor', () => {
  // ── helper: build a db where searchDocuments returns specific adaptation records ──

  function makeDbWithAdaptations(
    adaptations: Record<string, unknown>[],
    freedomOverrides: Record<string, number> = {},
  ) {
    const db = makeDb();
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-ml-adaptations') {
          return DataProcessResult.success(adaptations);
        }
        // FREEDOM configs
        if (index === 'freedom_configs') {
          const key = filter['config_key'] as string;
          if (key in freedomOverrides) {
            return DataProcessResult.success([
              { config_key: key, task_type: 'xiigen-engine', config_value: freedomOverrides[key] },
            ]);
          }
          return DataProcessResult.success([]);
        }
        return DataProcessResult.success([]);
      },
    );
    return db;
  }

  it('T89-1: count ceiling guard — recommendedModules > maxChanges → success({ applied:false, reason:COUNT_CEILING })', async () => {
    const callOrder: string[] = [];
    const db = makeDbWithAdaptations([], { flow05_ml_max_changes: 2 });
    const queue = makeQueue(callOrder);

    const service = new MLAdaptationProcessor(db, queue);
    // 3 modules > maxChanges=2 → COUNT_CEILING
    const result = await service.process({
      requestId: 'req-001',
      userId: USER,
      tenantId: TENANT,
      recommendedModules: ['mod-a', 'mod-b', 'mod-c'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('COUNT_CEILING');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T89-2: protected modules guard — all modules protected → success({ applied:false, reason:ALL_PROTECTED })', async () => {
    const callOrder: string[] = [];
    const db = makeDbWithAdaptations([]);
    const queue = makeQueue(callOrder);

    const service = new MLAdaptationProcessor(db, queue);
    const result = await service.process({
      requestId: 'req-002',
      userId: USER,
      tenantId: TENANT,
      recommendedModules: ['core-onboarding', 'mandatory-compliance'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('ALL_PROTECTED');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T89-3: recency cooldown — adapted 0 days ago → success({ applied:false, reason:TOO_RECENT })', async () => {
    const callOrder: string[] = [];
    const recentAdaptation = { user_id: USER, adapted_at: new Date().toISOString() };
    const db = makeDbWithAdaptations([recentAdaptation], { flow05_ml_cooldown_days: 7 });
    const queue = makeQueue(callOrder);

    const service = new MLAdaptationProcessor(db, queue);
    const result = await service.process({
      requestId: 'req-003',
      userId: USER,
      tenantId: TENANT,
      recommendedModules: ['intro-module'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(false);
    expect(result.data!.reason).toBe('TOO_RECENT');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T89-4: happy path — no existing adaptations, non-protected module, no cooldown → applied:true, ml.adaptation.completed emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDbWithAdaptations([]);
    const queue = makeQueue(callOrder);
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    const service = new MLAdaptationProcessor(db, queue);
    const result = await service.process({
      requestId: 'req-004',
      userId: USER,
      tenantId: TENANT,
      recommendedModules: ['advanced-analytics'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.applied).toBe(true);
    expect(result.data!.appliedModules).toContain('advanced-analytics');
    expect(queue.enqueue).toHaveBeenCalledWith(
      'ml.adaptation.completed',
      expect.objectContaining({
        appliedModules: expect.arrayContaining(['advanced-analytics']),
      }),
    );
  });

  it('T89-5: DNA-3 — unexpected db throw → ML_ADAPTATION_PROCESSOR_ERROR', async () => {
    const callOrder: string[] = [];
    const db = makeDbWithAdaptations([]);
    const queue = makeQueue(callOrder);
    db.storeDocument.mockRejectedValueOnce(new Error('store error'));

    const service = new MLAdaptationProcessor(db, queue);
    const result = await service.process({
      requestId: 'req-005',
      userId: USER,
      tenantId: TENANT,
      recommendedModules: ['some-module'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ML_ADAPTATION_PROCESSOR_ERROR');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T90 — SocialShareGateService
// ══════════════════════════════════════════════════════════════════════════════

describe('T90 — SocialShareGateService', () => {
  it('T90-1: CF-05-3 — PRIVATE setting → success({ shared:false }), storeDocument NOT called, no emit', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new SocialShareGateService(db, queue);
    const result = await service.execute({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      privacySetting: 'PRIVATE',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.shared).toBe(false);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T90-2: happy path — PUBLIC setting → shared:true, shareIntentId starts with ssi-, social.share.approved emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new SocialShareGateService(db, queue);
    const result = await service.execute({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      privacySetting: 'PUBLIC',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.shared).toBe(true);
    expect(result.data!.shareIntentId).toMatch(/^ssi-/);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.share.approved',
      expect.objectContaining({
        shareIntentId: result.data!.shareIntentId,
      }),
    );
  });

  it('T90-3: DNA-8 — storeDocument precedes social.share.approved enqueue', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    const service = new SocialShareGateService(db, queue);
    await service.execute({
      completionId: C_ID,
      questionnaireId: Q_ID,
      userId: USER,
      tenantId: TENANT,
      privacySetting: 'PUBLIC',
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqIdx).toBeGreaterThan(storeIdx);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T91 — SocialShareDistributorService
// ══════════════════════════════════════════════════════════════════════════════

describe('T91 — SocialShareDistributorService', () => {
  it('T91-1: happy path — social.share.distributed emitted, DNA-8 ordering', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    const service = new SocialShareDistributorService(db, queue);
    const result = await service.execute({
      shareIntentId: SSI_ID,
      completionId: C_ID,
      userId: USER,
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.share.distributed',
      expect.objectContaining({
        shareIntentId: SSI_ID,
      }),
    );
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqIdx).toBeGreaterThan(storeIdx);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T92 — SocialPostCreatorService
// ══════════════════════════════════════════════════════════════════════════════

describe('T92 — SocialPostCreatorService', () => {
  it('T92-1: happy path — social.post.created emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new SocialPostCreatorService(db, queue);
    const result = await service.execute({
      distributionId: DIST_ID,
      completionId: C_ID,
      userId: USER,
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.post.created',
      expect.objectContaining({
        distributionId: DIST_ID,
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T93 — SocialFeedUpdaterService
// ══════════════════════════════════════════════════════════════════════════════

describe('T93 — SocialFeedUpdaterService', () => {
  it('T93-1: happy path — social.feed.updated emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new SocialFeedUpdaterService(db, queue);
    const result = await service.execute({
      postId: POST_ID,
      distributionId: DIST_ID,
      completionId: C_ID,
      userId: USER,
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.feed.updated',
      expect.objectContaining({
        postId: POST_ID,
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T94 — SocialNotificationSenderService
// ══════════════════════════════════════════════════════════════════════════════

describe('T94 — SocialNotificationSenderService', () => {
  it('T94-1: happy path — social.notification.sent emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb();
    const queue = makeQueue(callOrder);

    const service = new SocialNotificationSenderService(db, queue);
    const result = await service.execute({
      feedEntryId: FEED_ID,
      postId: POST_ID,
      userId: USER,
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.notification.sent',
      expect.objectContaining({
        feedEntryId: FEED_ID,
      }),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// T95 — SocialAnalyticsRecorderService  (OBSERVABILITY — no queue)
// ══════════════════════════════════════════════════════════════════════════════

describe('T95 — SocialAnalyticsRecorderService', () => {
  it('T95-1: happy path — analyticsRecordId starts with sar-, storeDocument called once', async () => {
    const db = makeDb();
    const service = new SocialAnalyticsRecorderService(db);

    const result = await service.execute({
      shareIntentId: SSI_ID,
      completionId: C_ID,
      userId: USER,
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.analyticsRecordId).toMatch(/^sar-/);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-social-analytics',
      expect.objectContaining({ share_intent_id: SSI_ID }),
    );
  });

  it('T95-2: OBSERVABILITY — (service as any).queue is undefined', () => {
    const db = makeDb();
    const service = new SocialAnalyticsRecorderService(db);

    expect(service.hasQueue).toBe(false);
  });
});
