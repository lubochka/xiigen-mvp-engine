/**
 * BusinessProfileService (T50 Node A1) — FLOW-02 Phase A
 *
 * DUAL-RECORD-WRITE (FLOW-02-RAG-dual-record-write):
 *   1. xiigen-business-profiles: PRIVATE, full schema
 *   2. xiigen-matching-profiles: GLOBAL, 4 match-safe fields only
 * DNA-8: both writes happen before BusinessProfileCreated emit
 * DNA-7: idempotency key = hash(tenantId + userId + 'business-profile')
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const BUSINESS_PROFILES_INDEX = 'xiigen-business-profiles';
const MATCHING_PROFILES_INDEX = 'xiigen-matching-profiles';

export interface BusinessProfileInput {
  userId: string;
  tenantId: string;
  questionnaire: Record<string, unknown>; // raw QuestionnaireCompleted answers
  idempotencyKey?: string;
}

export interface BusinessProfileResult {
  profileId: string;
  matchingProfileId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class BusinessProfileService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T50', serviceName: 'BusinessProfileService', flowId: 'FLOW-02' }) });
  }

  async createProfile(
    input: BusinessProfileInput,
  ): Promise<DataProcessResult<BusinessProfileResult>> {
    try {
      // DNA-3: Validate required fields
      if (!input.userId || !input.tenantId || !input.questionnaire) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Business profile input validation failed',
        );
      }

      // DNA-7: idempotency — derive key from tenantId + userId + 'business-profile'
      const idemKey =
        input.idempotencyKey ??
        createHash('sha256')
          .update(`${input.tenantId}:${input.userId}:business-profile`)
          .digest('hex')
          .slice(0, 12);

      const existing = await this.dbFabric.searchDocuments(BUSINESS_PROFILES_INDEX, {
        user_id: input.userId,
        idempotency_key: idemKey,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        const profileId = rec['profile_id'] as string;
        return DataProcessResult.success({
          profileId,
          matchingProfileId: `match-${profileId}`,
        });
      }

      const profileId = `biz-${Date.now()}-${createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 6)}`;
      const q = input.questionnaire;

      // DUAL-RECORD-WRITE step 1: PRIVATE full-schema record
      const privateDoc: Record<string, unknown> = {
        profile_id: profileId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        idempotency_key: idemKey,
        questionnaire: q,
        industry_code: (q['industry'] as string) ?? '',
        business_stage: (q['stage'] as string) ?? '',
        location_proximity: (q['location'] as string) ?? '',
        team_size_tier: (q['teamSize'] as string) ?? '',
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: store PRIVATE doc first
      const privateStored = await this.dbFabric.storeDocument(
        BUSINESS_PROFILES_INDEX,
        privateDoc,
        profileId,
      );
      if (!privateStored.isSuccess) {
        return DataProcessResult.failure('PROFILE_STORE_FAILED', privateStored.errorMessage!);
      }

      // DUAL-RECORD-WRITE step 2: GLOBAL matching-profiles record (4 match-safe fields only)
      const matchingProfileId = `match-${profileId}`;
      const globalDoc: Record<string, unknown> = {
        matching_profile_id: matchingProfileId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        industry_code: (q['industry'] as string) ?? '',
        business_stage: (q['stage'] as string) ?? '',
        location_proximity: (q['location'] as string) ?? '',
        team_size_tier: (q['teamSize'] as string) ?? '',
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'GLOBAL',
      };

      const globalStored = await this.dbFabric.storeDocument(
        MATCHING_PROFILES_INDEX,
        globalDoc,
        matchingProfileId,
      );
      if (!globalStored.isSuccess) {
        return DataProcessResult.failure('PROFILE_STORE_FAILED', globalStored.errorMessage!);
      }

      // DNA-8: enqueue AFTER both writes succeed
      await this.queueFabric.enqueue('BusinessProfileCreated', {
        profileId,
        userId: input.userId,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({ profileId, matchingProfileId });
    } catch (err) {
      return DataProcessResult.failure(
        'PROFILE_STORE_FAILED',
        `BusinessProfileService threw: ${String(err)}`,
      );
    }
  }
}
