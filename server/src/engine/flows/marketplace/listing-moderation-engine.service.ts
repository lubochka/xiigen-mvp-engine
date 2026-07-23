// T87 ListingModerationEngine [MODERATION]
//
// Three-path moderation: PASS / REJECT / UNCERTAIN with human-queue routing.
// UNCERTAIN listings routed to human review queue via F249 — never auto-rejected.
// REJECT stores rejection record with reason.
//
// Iron rules:
//   IR-1: three-path result: PASS / REJECT / UNCERTAIN
//   IR-2: UNCERTAIN → human review queue (not auto-reject)
//   IR-3: storeDocument BEFORE enqueue (DNA-8)
//
// Factories:
//   F244: IDatabaseService — moderation record storage (DATABASE FABRIC)
//   F249: IModerationService — AI moderation check (AI_ENGINE FABRIC)
//   F252: IHumanReviewService — human review queue routing (QUEUE FABRIC)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

interface IModerationAiService {
  check(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IHumanReviewQueueService {
  enqueue(event: string, payload: Record<string, unknown>): Promise<void>;
}

export type ModerationDecision = 'PASS' | 'REJECT' | 'UNCERTAIN';

export interface ModerationRequest {
  listingId: string;
  tenantId: string;
  title: string;
  description: string;
  price: number;
}

export interface ModerationResult {
  listingId: string;
  tenantId: string;
  decision: ModerationDecision;
  reason?: string;
  humanReviewTaskId?: string;
  moderatedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, listing moderation through fabric interfaces
 * @className ListingModerationEngineService
 */
@Injectable()
export class ListingModerationEngineService extends MicroserviceBase {
  constructor(
    /** F244: IDatabaseService — moderation record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F249: IModerationService — AI moderation check (AI_ENGINE FABRIC) */
    private readonly moderationAi: IModerationAiService,
    /** F252: IHumanReviewService — human review queue (QUEUE FABRIC) */
    private readonly humanReviewQueue: IHumanReviewQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T87',
        serviceName: 'ListingModerationEngineService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async moderate(request: ModerationRequest): Promise<DataProcessResult<ModerationResult>> {
    const moderatedAt = new Date().toISOString();

    // Run AI moderation check via F249
    const aiResult = await this.moderationAi.check({
      listingId: request.listingId,
      title: request.title,
      description: request.description,
      tenantId: request.tenantId,
    });

    let decision: ModerationDecision;
    let reason: string | undefined;
    let humanReviewTaskId: string | undefined;

    if (!aiResult.isSuccess) {
      // AI failure → UNCERTAIN → human queue (IR-2)
      decision = 'UNCERTAIN';
      reason = 'AI_MODERATION_UNAVAILABLE';
    } else {
      decision = (aiResult.data?.['decision'] as ModerationDecision) ?? 'UNCERTAIN';
      reason = aiResult.data?.['reason'] as string | undefined;
    }

    // IR-2: UNCERTAIN → human review queue — not auto-reject
    if (decision === 'UNCERTAIN') {
      humanReviewTaskId = `human-review-${request.listingId}-${Date.now()}`;

      // IR-3: storeDocument BEFORE enqueue (DNA-8)
      await this.dbFabric.storeDocument(
        'moderation-records',
        {
          listingId: request.listingId,
          tenantId: request.tenantId,
          decision: 'UNCERTAIN',
          reason: reason ?? 'FLAGGED_FOR_REVIEW',
          humanReviewTaskId,
          moderatedAt,
        },
        `mod-${request.listingId}`,
      );

      await this.humanReviewQueue.enqueue('marketplace.moderation.human_review_requested', {
        listingId: request.listingId,
        tenantId: request.tenantId,
        humanReviewTaskId,
        reason: reason ?? 'FLAGGED_FOR_REVIEW',
        moderatedAt,
      });

      return DataProcessResult.success({
        listingId: request.listingId,
        tenantId: request.tenantId,
        decision: 'UNCERTAIN',
        reason: reason ?? 'FLAGGED_FOR_REVIEW',
        humanReviewTaskId,
        moderatedAt,
      });
    }

    // IR-3: storeDocument BEFORE enqueue (DNA-8)
    await this.dbFabric.storeDocument(
      'moderation-records',
      {
        listingId: request.listingId,
        tenantId: request.tenantId,
        decision,
        reason,
        moderatedAt,
      },
      `mod-${request.listingId}`,
    );

    if (decision === 'PASS') {
      await this.humanReviewQueue.enqueue('marketplace.moderation.passed', {
        listingId: request.listingId,
        tenantId: request.tenantId,
        moderatedAt,
      });
    } else {
      // REJECT
      await this.humanReviewQueue.enqueue('marketplace.moderation.rejected', {
        listingId: request.listingId,
        tenantId: request.tenantId,
        reason,
        moderatedAt,
      });
    }

    return DataProcessResult.success({
      listingId: request.listingId,
      tenantId: request.tenantId,
      decision,
      reason,
      moderatedAt,
    });
  }
}
