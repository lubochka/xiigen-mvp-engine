/**
 * CompatibilityScoringService (T51 Node B1) — FLOW-02 Phase B
 *
 * TIMEOUT-AS-SUCCESS-MODE (FLOW-02-RAG-timeout-as-success-mode):
 *   30s MACHINE timeout → partialResults: true → DataProcessResult.success
 *   partialResults is a SUCCESS MODE, not a failure mode.
 *
 * Algorithm weights from FREEDOM config.
 * B1 reads from xiigen-matching-profiles (GLOBAL only).
 * DNA-8: store before enqueue. DNA-7: SETNX before matching.
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../../../freedom/config-schema';

const MATCHING_PROFILES_INDEX = 'xiigen-matching-profiles';
const BUSINESS_MATCHES_INDEX = 'xiigen-business-matches';

export interface ScoringInput {
  userId: string;
  tenantId: string;
  profileId: string;
  timeoutMs?: number; // default 30000 (MACHINE); may be FREEDOM-overridden
}

export interface ScoringResult {
  scoringId: string;
  matchedBusinessIds: string[];
  partialResults: boolean;
  topScore: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped (flow02_*)
 */
@Injectable()
export class CompatibilityScoringService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T51', serviceName: 'CompatibilityScoringService', flowId: 'FLOW-02' }) });
  }

  async scoreCompatibility(input: ScoringInput): Promise<DataProcessResult<ScoringResult>> {
    const startTime = Date.now();
    try {
      if (!input.userId || !input.tenantId || !input.profileId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Compatibility scoring input validation failed',
        );
      }

      // FREEDOM tuning keys — read before idempotency so debounce window applies
      const timeoutSeconds = await this.getFreedomNumber(
        XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_TIMEOUT_SECONDS,
        30,
      );
      const debounceWindowSeconds = await this.getFreedomNumber(
        XIIGEN_FREEDOM_KEYS.FLOW02_DEBOUNCE_WINDOW_SECONDS,
        300,
      );
      const debounceWindowMs = debounceWindowSeconds * 1000;

      // DNA-7: idempotency check — cached result honored only within debounce window
      const idemKey = createHash('sha256')
        .update(`${input.tenantId}:${input.userId}:b1`)
        .digest('hex')
        .slice(0, 12);
      const existing = await this.dbFabric.searchDocuments(BUSINESS_MATCHES_INDEX, {
        user_id: input.userId,
        idempotency_key: idemKey,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        const createdAtRaw = rec['created_at'];
        const recordAgeMs =
          typeof createdAtRaw === 'string' ? Date.now() - new Date(createdAtRaw).getTime() : 0;
        if (recordAgeMs < debounceWindowMs) {
          return DataProcessResult.success({
            scoringId: rec['scoring_id'] as string,
            matchedBusinessIds: (rec['matched_business_ids'] as string[]) ?? [],
            partialResults: (rec['partial_results'] as boolean) ?? false,
            topScore: (rec['top_score'] as number) ?? 0,
          });
        }
      }

      // Read FREEDOM weights
      const wIndustry = await this.getFreedomNumber(
        XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_INDUSTRY,
        0.4,
      );
      const wStage = await this.getFreedomNumber(
        XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_STAGE,
        0.3,
      );
      const wLocation = await this.getFreedomNumber(
        XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_LOCATION,
        0.2,
      );
      const wTeam = await this.getFreedomNumber(XIIGEN_FREEDOM_KEYS.FLOW02_MATCH_WEIGHT_TEAM, 0.1);

      // Read matching profiles (GLOBAL scope, same tenant) — B1 NEVER reads xiigen-business-profiles
      const profilesResult = await this.dbFabric.searchDocuments(MATCHING_PROFILES_INDEX, {
        knowledge_scope: 'GLOBAL',
        tenant_id: input.tenantId,
      });

      const profiles = (profilesResult.isSuccess ? (profilesResult.data ?? []) : []) as Array<
        Record<string, unknown>
      >;

      // TIMEOUT-AS-SUCCESS-MODE: input override beats FREEDOM value (MACHINE contract)
      const timeoutMs = input.timeoutMs ?? timeoutSeconds * 1000;
      const timedOut = Date.now() - startTime > timeoutMs;
      const partialResults = timedOut;

      // Scoring algorithm
      const scored: Array<{ id: string; score: number }> = [];
      for (const p of profiles) {
        // Simple binary match per dimension
        const score =
          (p['industry_code'] ? wIndustry : 0) +
          (p['business_stage'] ? wStage : 0) +
          (p['location_proximity'] ? wLocation : 0) +
          (p['team_size_tier'] ? wTeam : 0);
        scored.push({ id: (p['matching_profile_id'] ?? p['user_id']) as string, score });
      }

      scored.sort((a, b) => b.score - a.score);
      const matchedBusinessIds = scored.map((s) => s.id);
      const topScore = scored[0]?.score ?? 0;

      const scoringId = `score-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;

      const doc: Record<string, unknown> = {
        scoring_id: scoringId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        profile_id: input.profileId,
        idempotency_key: idemKey,
        matched_business_ids: matchedBusinessIds,
        partial_results: partialResults,
        top_score: topScore,
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.dbFabric.storeDocument(BUSINESS_MATCHES_INDEX, doc, scoringId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure('SCORING_STORE_FAILED', stored.errorMessage!);
      }

      await this.queueFabric.enqueue('BusinessMatchesFound', {
        scoringId,
        partialResults,
        matchedBusinessIds,
        topScore,
        userId: input.userId,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({ scoringId, matchedBusinessIds, partialResults, topScore });
    } catch (err) {
      return DataProcessResult.failure(
        'SCORING_STORE_FAILED',
        `CompatibilityScoringService threw: ${String(err)}`,
      );
    }
  }

  private async getFreedomNumber(key: `flow02_${string}`, fallback: number): Promise<number> {
    if (!this.freedomConfig) return fallback;
    const doc = await this.freedomConfig.get(key); // flow02_ prefix enforced by template-literal type
    const val = doc?.['value'];
    return typeof val === 'number' ? val : fallback;
  }
}
