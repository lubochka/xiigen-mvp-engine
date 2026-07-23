/**
 * EventAnalyticsTracker (T62) — FLOW-03 Phase 1D
 * Single responsibility: best-effort analytics counter with TTL windowing.
 *
 * Iron rules:
 *   IR-62-1: ENTIRE handler body in try/catch — analytics errors NEVER propagate to caller.
 *            catch returns DataProcessResult.success({ tracked: false }).
 *            A broken analytics service must never break the event creation pipeline.
 *   IR-62-2: TTL-windowed counter — every counter document has an expires_at field.
 *            NOT unbounded: counter expires after the configured TTL window.
 *            Counter key = {eventId}:{analyticsType}:{windowStartEpoch} to scope to a time bucket.
 *   IR-62-3: All threshold/TTL values from FREEDOM config — never hardcoded.
 *            Keys: flow03_analytics_counter_ttl, flow03_campaign_engagement_threshold.
 *   IR-62-4: Emits 'PromotionCampaignCompleted' — NEVER 'EventPromotionCompleted'.
 *            These are separate events with separate consumers.
 *            'EventPromotionCompleted' is emitted by NODE D (synchronous promotion pipeline).
 *            'PromotionCampaignCompleted' is emitted by T62 after the engagement attribution window.
 *            Collision causes FLOW-08 to receive a duplicate bootstrap signal. DR-03-G / CF-03-2.
 *   IR-62-5: T62 triggers on EventCreated — NOT on EventPromotionCompleted.
 *            Attribution window starts at event creation, not after promotion completes.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const ANALYTICS_INDEX = 'xiigen-event-analytics';
const FREEDOM_INDEX = 'freedom_configs';

// Default TTL: 24 hours (seconds). Used only when FREEDOM config is not seeded.
const DEFAULT_COUNTER_TTL_SECONDS = 86_400;
// Default campaign engagement threshold. Used only when FREEDOM config is not seeded.
const DEFAULT_CAMPAIGN_THRESHOLD = 1_000;

export interface TrackInput {
  eventId: string;
  analyticsType: string; // 'view' | 'registration' | 'cancellation' | 'campaign_engagement'
  tenantId: string;
}

export interface TrackResult {
  tracked: boolean;
  count?: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-03
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped (flow03_*)
 * @className EventAnalyticsTracker
 */
@Injectable()
export class EventAnalyticsTracker {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async track(input: TrackInput): Promise<DataProcessResult<TrackResult>> {
    // IR-62-1: ENTIRE body in try/catch — analytics failure = silent success({ tracked: false })
    try {
      // IR-62-3: TTL from FREEDOM config — never hardcoded
      const ttlSeconds = await this.getCounterTtl();
      const campaignThreshold = await this.getCampaignThreshold();

      // IR-62-2: Compute time-bucketed window key — scopes counter to a TTL window
      const windowStartEpoch = Math.floor(Date.now() / (ttlSeconds * 1000)) * (ttlSeconds * 1000);
      const counterKey = `${input.eventId}:${input.analyticsType}:${windowStartEpoch}`;

      // Find existing counter for this window (may not exist on first hit)
      const existing = await this.db.searchDocuments(ANALYTICS_INDEX, { counter_key: counterKey });

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

      let count = 1;
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        count = ((rec['count'] as number) ?? 0) + 1;
      }

      // IR-62-2: counter document has expires_at — not an unbounded accumulator
      const doc: Record<string, unknown> = {
        counter_key: counterKey,
        event_id: input.eventId,
        analytics_type: input.analyticsType,
        tenant_id: input.tenantId,
        count,
        ttl_seconds: ttlSeconds,
        expires_at: expiresAt, // TTL marker — counter is windowed, not unbounded
        updated_at: now,
      };

      await this.db.storeDocument(ANALYTICS_INDEX, doc, counterKey);

      // Emit PromotionCampaignCompleted when campaign threshold is reached
      // IR-62-4: MUST be 'PromotionCampaignCompleted' — NEVER 'EventPromotionCompleted'
      if (count >= campaignThreshold) {
        await this.queue.enqueue('PromotionCampaignCompleted', {
          eventId: input.eventId,
          tenantId: input.tenantId,
          engagementCount: count,
          windowStartEpoch,
        });
      }

      return DataProcessResult.success({ tracked: true, count });
    } catch {
      // IR-62-1: ANY error → silent success, caller unaffected
      return DataProcessResult.success({ tracked: false });
    }
  }

  /** Read counter TTL window from FREEDOM config — never hardcoded (IR-62-3). */
  private async getCounterTtl(): Promise<number> {
    const cfg = await this.db.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow03_analytics_counter_ttl',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_COUNTER_TTL_SECONDS;
  }

  /** Read campaign engagement threshold from FREEDOM config — never hardcoded (IR-62-3). */
  private async getCampaignThreshold(): Promise<number> {
    const cfg = await this.db.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow03_campaign_engagement_threshold',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_CAMPAIGN_THRESHOLD;
  }
}
