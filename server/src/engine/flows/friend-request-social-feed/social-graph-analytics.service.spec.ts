import { SocialGraphAnalyticsService } from './social-graph-analytics.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('SocialGraphAnalyticsService (T82)', () => {
  const makeRequest = (
    eventType: 'connection_growth' | 'feed_engagement' = 'connection_growth',
  ) => ({
    tenantId: 'tenant-1',
    eventType,
    aggregatePeriod: '2026-04',
  });

  const makeConnectionGraphService = () => ({
    getAggregateConnectionGrowth: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ totalNewConnections: 42 })),
    getAggregateFeedEngagement: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ totalEngagements: 150 })),
  });

  const makeDb = () => ({
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: true })),
  });

  const makeQueue = () => ({
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  });

  it('T82-1: Analytics payload contains NO userId fields (aggregate-only check)', async () => {
    const queue = makeQueue();
    let capturedPayload: Record<string, unknown> | undefined;

    const db = {
      storeDocument: jest
        .fn()
        .mockImplementation(async (_index: string, payload: Record<string, unknown>) => {
          capturedPayload = payload;
          return DataProcessResult.success({ stored: true });
        }),
    };

    const service = new SocialGraphAnalyticsService(
      makeConnectionGraphService(),
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );

    await service.emitAnalytics(makeRequest('connection_growth'));

    expect(capturedPayload).toBeDefined();
    // IR-1: no per-user identifiers allowed in payload
    expect(capturedPayload).not.toHaveProperty('userId');
    expect(capturedPayload).not.toHaveProperty('userIds');
    expect(capturedPayload).not.toHaveProperty('recipientUserId');
    expect(capturedPayload).not.toHaveProperty('sourceUserId');
    // Must have aggregate count
    expect(capturedPayload).toHaveProperty('totalCount');
    expect(typeof capturedPayload!['totalCount']).toBe('number');
  });

  it('T82-2: storeDocument BEFORE enqueue (DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({ stored: true });
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };

    const service = new SocialGraphAnalyticsService(
      makeConnectionGraphService(),
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );

    await service.emitAnalytics(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T82-3: Both eventTypes (connection_growth, feed_engagement) produce valid results', async () => {
    const service = new SocialGraphAnalyticsService(
      makeConnectionGraphService(),
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
    );

    const growthResult = await service.emitAnalytics(makeRequest('connection_growth'));
    expect(growthResult.isSuccess).toBe(true);
    expect(growthResult.data?.eventType).toBe('connection_growth');
    expect(typeof growthResult.data?.totalCount).toBe('number');

    // Re-create service to reset mocks
    const service2 = new SocialGraphAnalyticsService(
      makeConnectionGraphService(),
      makeDb() as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeQueue() as unknown as import('../../../fabrics/interfaces/queue.interface').IQueueService,
    );

    const engagementResult = await service2.emitAnalytics(makeRequest('feed_engagement'));
    expect(engagementResult.isSuccess).toBe(true);
    expect(engagementResult.data?.eventType).toBe('feed_engagement');
    expect(typeof engagementResult.data?.totalCount).toBe('number');
  });
});
