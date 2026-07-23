/**
 * FeedPersonalizationService (T52 Node C) — FLOW-02 Phase C
 *
 * 4 independent fallbacks (FLOW-02-DR-02-D / FLOW-02-RAG-degradable-analytics):
 *   profileSignal:    from A1 (xiigen-business-profiles)
 *   segmentSignal:    from A2 (xiigen-analytics-segments)
 *   curriculumSignal: from A3 (xiigen-learning-programs)
 *   matchSignal:      from B1 (xiigen-business-matches)
 * Each signal has named fallback. Always produces output even with 0/4 signals.
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const BUSINESS_PROFILES_INDEX = 'xiigen-business-profiles';
const ANALYTICS_SEGMENTS_INDEX = 'xiigen-analytics-segments';
const LEARNING_PROGRAMS_INDEX = 'xiigen-learning-programs';
const BUSINESS_MATCHES_INDEX = 'xiigen-business-matches';
const PERSONALIZATION_FEEDS_INDEX = 'xiigen-personalization-feeds';

// MACHINE fallback content when no signal available
const TRENDING_CONTENT_FALLBACK = ['trending-001', 'trending-002', 'trending-003'];

export interface PersonalizationInput {
  userId: string;
  tenantId: string;
  profileId: string;
}

export interface PersonalizationResult {
  feedId: string;
  contentItems: string[];
  signalsUsed: number; // 0-4
  degraded: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class FeedPersonalizationService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T52', serviceName: 'FeedPersonalizationService', flowId: 'FLOW-02' }) });
  }

  async buildFeed(input: PersonalizationInput): Promise<DataProcessResult<PersonalizationResult>> {
    try {
      if (!input.userId || !input.tenantId || !input.profileId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Feed personalization input validation failed',
        );
      }

      let signalsUsed = 0;
      const contentItems: string[] = [];

      // Signal 1: profileSignal — from A1 (xiigen-business-profiles)
      let industryCode: string | null = null;
      try {
        const profileResult = await this.dbFabric.searchDocuments(BUSINESS_PROFILES_INDEX, {
          user_id: input.userId,
        });
        if (profileResult.isSuccess && (profileResult.data ?? []).length > 0) {
          const profile = profileResult.data![0] as Record<string, unknown>;
          industryCode = (profile['industry_code'] as string) || null;
          if (industryCode) {
            signalsUsed++;
            contentItems.push(`industry-content-${industryCode}`);
          }
        }
      } catch {
        // profileSignal fallback: skip, use other signals
      }

      // Signal 2: segmentSignal — from A2 (xiigen-analytics-segments)
      let segment: string | null = null;
      try {
        const segmentResult = await this.dbFabric.searchDocuments(ANALYTICS_SEGMENTS_INDEX, {
          user_id: input.userId,
        });
        if (segmentResult.isSuccess && (segmentResult.data ?? []).length > 0) {
          const segDoc = segmentResult.data![0] as Record<string, unknown>;
          segment = (segDoc['segment'] as string) || null;
          if (segment && segment !== 'GENERAL') {
            signalsUsed++;
            contentItems.push(`segment-content-${segment}`);
          } else if (segment === 'GENERAL') {
            // GENERAL segment counts as a signal but uses fallback content
            signalsUsed++;
            contentItems.push('segment-content-general');
          }
        }
      } catch {
        // segmentSignal fallback: skip
      }

      // Signal 3: curriculumSignal — from A3 (xiigen-learning-programs)
      let moduleType: string | null = null;
      try {
        const programResult = await this.dbFabric.searchDocuments(LEARNING_PROGRAMS_INDEX, {
          user_id: input.userId,
        });
        if (programResult.isSuccess && (programResult.data ?? []).length > 0) {
          const program = programResult.data![0] as Record<string, unknown>;
          moduleType = (program['module_type'] as string) || null;
          if (moduleType) {
            signalsUsed++;
            contentItems.push(`curriculum-content-${moduleType}`);
          }
        }
      } catch {
        // curriculumSignal fallback: skip
      }

      // Signal 4: matchSignal — from B1 (xiigen-business-matches)
      let topMatchId: string | null = null;
      try {
        const matchResult = await this.dbFabric.searchDocuments(BUSINESS_MATCHES_INDEX, {
          user_id: input.userId,
        });
        if (matchResult.isSuccess && (matchResult.data ?? []).length > 0) {
          const matchDoc = matchResult.data![0] as Record<string, unknown>;
          const matchedIds = (matchDoc['matched_business_ids'] as string[]) ?? [];
          topMatchId = matchedIds[0] ?? null;
          if (topMatchId) {
            signalsUsed++;
            contentItems.push(`match-content-${topMatchId}`);
          }
        }
      } catch {
        // matchSignal fallback: skip
      }

      // Always produces output — fallback to trending content if 0 signals
      if (contentItems.length === 0) {
        contentItems.push(...TRENDING_CONTENT_FALLBACK);
      }

      const feedId = `feed-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;
      const degraded = signalsUsed < 4;

      const doc: Record<string, unknown> = {
        feed_id: feedId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        profile_id: input.profileId,
        content_items: contentItems,
        signals_used: signalsUsed,
        degraded,
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: storeDocument before returning (D node handles PersonalizationCompleted enqueue)
      const stored = await this.dbFabric.storeDocument(PERSONALIZATION_FEEDS_INDEX, doc, feedId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure('FEED_STORE_FAILED', stored.errorMessage!);
      }

      return DataProcessResult.success({ feedId, contentItems, signalsUsed, degraded });
    } catch (err) {
      return DataProcessResult.failure(
        'FEED_STORE_FAILED',
        `FeedPersonalizationService threw: ${String(err)}`,
      );
    }
  }
}
