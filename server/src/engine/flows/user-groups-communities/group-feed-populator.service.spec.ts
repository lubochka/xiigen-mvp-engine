import { GroupFeedPopulatorService } from './group-feed-populator.service';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('GroupFeedPopulatorService (T89)', () => {
  let service: GroupFeedPopulatorService;
  let db: { storeDocument: jest.Mock };
  let freedomConfig: { get: jest.Mock };
  let queue: { enqueue: jest.Mock };

  beforeEach(() => {
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };
    freedomConfig = {
      get: jest.fn().mockResolvedValue({
        isSuccess: true,
        data: { recencyWeight: 0.6, popularityWeight: 0.4 },
      }),
    };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    service = new GroupFeedPopulatorService(
      db as unknown as IDatabaseService,
      freedomConfig as unknown as ConstructorParameters<typeof GroupFeedPopulatorService>[1],
      queue as unknown as IQueueService,
    );
  });

  it('IR-1: score > 1.0 is clamped to 1.0 in stored record', async () => {
    await service.populateFeed({
      feedEventId: 'feed-001',
      groupId: 'grp-1',
      tenantId: 'tenant-1',
      contentItems: [{ contentId: 'c-1', rawEngagementScore: 2.5 }],
    });

    const storedDoc = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    const items = storedDoc['items'] as Array<{ contentId: string; engagementScore: number }>;
    expect(items[0].engagementScore).toBe(1.0);
    expect(freedomConfig.get).toHaveBeenCalledWith('flow06_group_feed_weights');
  });

  it('IR-1: score < 0.0 is clamped to 0.0 in stored record', async () => {
    await service.populateFeed({
      feedEventId: 'feed-002',
      groupId: 'grp-2',
      tenantId: 'tenant-2',
      contentItems: [{ contentId: 'c-2', rawEngagementScore: -0.5 }],
    });

    const storedDoc = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    const items = storedDoc['items'] as Array<{ contentId: string; engagementScore: number }>;
    expect(items[0].engagementScore).toBe(0.0);
  });

  it('IR-4: empty contentItems returns SKIPPED — no storeDocument or enqueue', async () => {
    const result = await service.populateFeed({
      feedEventId: 'feed-003',
      groupId: 'grp-3',
      tenantId: 'tenant-3',
      contentItems: [],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('SKIPPED');
    expect(result.data?.reason).toBe('no_content');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
