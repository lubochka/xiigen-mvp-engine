/**
 * LearningProgramService (T50 Node A3) — FLOW-02 Phase A
 *
 * UPSTREAM-EVENT-NOT-TRIGGER-001: Triggers on BusinessProfileCreated — NOT QuestionnaireCompleted.
 * Reads structured profile from xiigen-business-profiles.
 * MODULE_INTRO fallback: if profile read fails, seed with module_type: 'MODULE_INTRO'
 * DNA-3: returns DataProcessResult — never throws
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const BUSINESS_PROFILES_INDEX = 'xiigen-business-profiles';
const LEARNING_PROGRAMS_INDEX = 'xiigen-learning-programs';

// Industry → module type mapping (MACHINE heuristic)
const INDUSTRY_MODULE_MAP: Record<string, string> = {
  tech: 'MODULE_TECH_FOUNDATIONS',
  finance: 'MODULE_FINTECH_BASICS',
  health: 'MODULE_HEALTH_COMPLIANCE',
  retail: 'MODULE_ECOMMERCE_SETUP',
  manufacturing: 'MODULE_OPERATIONS',
  education: 'MODULE_EDTECH_LAUNCH',
};

export interface LearningProgramInput {
  profileId: string;
  userId: string;
  tenantId: string;
}

export interface LearningProgramResult {
  programId: string;
  moduleType: string;
  degraded: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-02
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped
 */
@Injectable()
export class LearningProgramService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({ descriptor: new ServiceDescriptor({ serviceId: 'T50', serviceName: 'LearningProgramService', flowId: 'FLOW-02' }) });
  }

  async initializeProgram(
    input: LearningProgramInput,
  ): Promise<DataProcessResult<LearningProgramResult>> {
    try {
      if (!input.profileId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Learning program input validation failed',
        );
      }

      // Read structured profile from xiigen-business-profiles (UPSTREAM-EVENT-NOT-TRIGGER-001)
      let moduleType = 'MODULE_INTRO';
      let degraded = false;

      const profileResult = await this.dbFabric.searchDocuments(BUSINESS_PROFILES_INDEX, {
        profile_id: input.profileId,
      });

      if (profileResult.isSuccess && (profileResult.data ?? []).length > 0) {
        const profile = profileResult.data![0] as Record<string, unknown>;
        const industry = ((profile['industry_code'] as string) ?? '').toLowerCase();
        moduleType = INDUSTRY_MODULE_MAP[industry] ?? 'MODULE_INTRO';
      } else {
        // MODULE_INTRO fallback when profile read fails
        moduleType = 'MODULE_INTRO';
        degraded = true;
      }

      const programId = `prog-${Date.now()}-${createHash('sha256').update(`${input.tenantId}:${input.userId}`).digest('hex').slice(0, 6)}`;

      const doc: Record<string, unknown> = {
        program_id: programId,
        profile_id: input.profileId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        module_type: moduleType,
        degraded,
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.dbFabric.storeDocument(LEARNING_PROGRAMS_INDEX, doc, programId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure('LEARNING_PROGRAM_STORE_FAILED', stored.errorMessage!);
      }

      await this.queueFabric.enqueue('LearningProgramInitialized', {
        programId,
        moduleType,
        userId: input.userId,
        tenantId: input.tenantId,
        degraded,
      });

      return DataProcessResult.success({ programId, moduleType, degraded });
    } catch (err) {
      return DataProcessResult.failure(
        'LEARNING_PROGRAM_STORE_FAILED',
        `LearningProgramService threw: ${String(err)}`,
      );
    }
  }
}
