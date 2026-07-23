// T89 GroupFeedPopulator [AI_GENERATION]
//
// Populates group feed with relevant content.
// Engagement scores clamped to [0.0, 1.0] — never saturated (IR-1).
// Engagement weights from FREEDOM config only — no hardcoded constants (IR-2).
// Skip feed population if contentItems is empty (IR-4).
// storeDocument BEFORE enqueue (DNA-8 / IR-3).
//
// Factories:
//   F254: IDatabaseService          — feed records (DATABASE FABRIC)
//   F257: IFreedomConfigService     — engagement weights (FREEDOM FABRIC)

import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

interface IFreedomConfig {
  get(key: string): Promise<{ isSuccess: boolean; data?: unknown }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface FeedContentItem {
  contentId: string;
  rawEngagementScore: number;
}

export interface GroupFeedPopulateRequest {
  feedEventId: string;
  groupId: string;
  tenantId: string;
  contentItems: FeedContentItem[];
}

export interface GroupFeedPopulateResult {
  feedEventId: string;
  groupId: string;
  itemsPopulated: number;
  status: 'POPULATED' | 'SKIPPED';
  reason?: string;
}

export class GroupFeedPopulatorService extends MicroserviceBase {
  constructor(
    /** F254: IDatabaseService — feed record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F257: IFreedomConfigService — engagement weights (FREEDOM FABRIC) */

    private readonly freedomConfig: IFreedomConfig,
    /** QUEUE FABRIC — GroupFeedPopulated event emission */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T89',
        serviceName: 'GroupFeedPopulatorService',
        flowId: 'FLOW-06',
      }),
    });
  }

  async populateFeed(
    request: GroupFeedPopulateRequest,
  ): Promise<DataProcessResult<GroupFeedPopulateResult>> {
    // ── STEP 1: IR-4 — skip if no contentItems ───────────────────────────────
    if (!request.contentItems || request.contentItems.length === 0) {
      return DataProcessResult.success({
        feedEventId: request.feedEventId,
        groupId: request.groupId,
        itemsPopulated: 0,
        status: 'SKIPPED',
        reason: 'no_content',
      });
    }

    // ── STEP 2: IR-2 — read scoring weights from FREEDOM config ──────────────
    const weightsResult = await this.freedomConfig.get('flow06_group_feed_weights');
    const weights: Record<string, unknown> =
      weightsResult?.isSuccess && weightsResult.data
        ? (weightsResult.data as Record<string, unknown>)
        : {};

    // ── STEP 3: IR-1 — clamp each engagement score to [0.0, 1.0] ────────────
    const clampedItems = request.contentItems.map((item) => ({
      contentId: item.contentId,
      engagementScore: Math.min(1.0, Math.max(0.0, item.rawEngagementScore)),
    }));

    // ── STEP 4: storeDocument BEFORE enqueue (DNA-8 / IR-3) ──────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'group-feeds',
      {
        feedEventId: request.feedEventId,
        groupId: request.groupId, // dual scope — groupId
        tenantId: request.tenantId, // dual scope — tenantId
        items: clampedItems,
        weights,
        populatedAt: new Date().toISOString(),
      },
      request.feedEventId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store feed record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 5: enqueue GroupFeedPopulated (DNA-8 — after store) ─────────────
    await this.queueFabric.enqueue('groups.feed.populated', {
      feedEventId: request.feedEventId,
      groupId: request.groupId,
      tenantId: request.tenantId,
      itemsPopulated: clampedItems.length,
      populatedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      feedEventId: request.feedEventId,
      groupId: request.groupId,
      itemsPopulated: clampedItems.length,
      status: 'POPULATED',
    });
  }
}
