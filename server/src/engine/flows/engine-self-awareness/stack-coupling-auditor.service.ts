/**
 * StackCouplingAuditor (T590) — FLOW-37 Phase B
 *
 * Classifies every element of a genesis prompt spec across all registered stacks
 * using the D-STACK-1 four-category coupling taxonomy and D-STACK-3 ten coupling dimensions.
 *
 * Iron rules:
 *   D-STACK-1: exactly 4 coupling categories — CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE.
 *   D-STACK-3: all 10 coupling dimensions evaluated per element per stack (CF-805).
 *   CF-800: audit output is the sole coupling data source for T591 and T592.
 *   DNA-7: idempotency — same (taskTypeId + stack) pair returns existing audit.
 *   DNA-8: storeDocument(audit record) BEFORE enqueue(CouplingAuditComplete).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 *   DNA-5: tenantId from context — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

/** D-STACK-1: exactly 4 coupling categories. */
export type CouplingCategory = 'CONCEPT_NEUTRAL' | 'IMPL_VARIES' | 'STACK_COUPLED' | 'INCOMPATIBLE';

/** D-STACK-3: 10 coupling dimensions. */
export const COUPLING_DIMENSIONS_10 = [
  'data_model',
  'event_schema',
  'api_surface',
  'state_management',
  'error_handling',
  'authentication',
  'tenant_isolation',
  'observability',
  'deployment_target',
  'runtime_model',
] as const;

export type CouplingDimension = (typeof COUPLING_DIMENSIONS_10)[number];

const AUDIT_INDEX = 'xiigen-coupling-audits';

export interface AuditOptions {
  taskTypeId: string;
  genesisPromptSpec: Record<string, unknown>;
  registeredStacks: string[];
}

export interface CouplingClassification {
  stackId: string;
  category: CouplingCategory;
  dimensions: Record<CouplingDimension, CouplingCategory>;
}

export interface AuditResult {
  taskTypeId: string;
  couplingClassifications: CouplingClassification[];
  dimensionsEvaluated: 10;
  stacksAudited: number;
  hasIncompatibles: boolean;
  auditId: string;
}

@Injectable()
export class StackCouplingAuditor {
  private readonly logger = new Logger(StackCouplingAuditor.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async audit(options: AuditOptions): Promise<DataProcessResult<AuditResult>> {
    try {
      const { taskTypeId, genesisPromptSpec, registeredStacks } = options;

      if (!taskTypeId) {
        return DataProcessResult.failure('MISSING_TASK_TYPE_ID', 'taskTypeId is required');
      }
      if (!registeredStacks || registeredStacks.length === 0) {
        return DataProcessResult.failure(
          'NO_REGISTERED_STACKS',
          'registeredStacks must be non-empty',
        );
      }

      // DNA-7: idempotency — check if audit already exists for this taskTypeId
      const existingCheck = await this.db.searchDocuments(AUDIT_INDEX, { taskTypeId }, 1);
      if (existingCheck.isSuccess && (existingCheck.data ?? []).length > 0) {
        const existing = existingCheck.data![0] as Record<string, unknown>;
        this.logger.log(
          `StackCouplingAuditor: taskType ${taskTypeId} already audited — returning existing`,
        );
        return DataProcessResult.success(existing['auditResult'] as AuditResult);
      }

      const classifications: CouplingClassification[] = [];
      let hasIncompatibles = false;

      for (const stackId of registeredStacks) {
        // D-STACK-3: evaluate all 10 coupling dimensions — CF-805
        const dimensions = {} as Record<CouplingDimension, CouplingCategory>;
        let incompatibleDimensions = 0;
        let coupledDimensions = 0;

        for (const dim of COUPLING_DIMENSIONS_10) {
          // Determine coupling for each dimension based on genesis prompt spec
          const dimSpec = genesisPromptSpec[dim] as Record<string, unknown> | undefined;
          const stackSpec = dimSpec?.[stackId] as string | undefined;

          let dimCategory: CouplingCategory;
          if (stackSpec === 'INCOMPATIBLE') {
            dimCategory = 'INCOMPATIBLE';
            incompatibleDimensions++;
          } else if (stackSpec === 'STACK_COUPLED') {
            dimCategory = 'STACK_COUPLED';
            coupledDimensions++;
          } else if (stackSpec === 'IMPL_VARIES') {
            dimCategory = 'IMPL_VARIES';
          } else {
            dimCategory = 'CONCEPT_NEUTRAL';
          }
          dimensions[dim] = dimCategory;
        }

        // D-STACK-1: aggregate to overall category (worst-case)
        let overallCategory: CouplingCategory;
        if (incompatibleDimensions > 0) {
          overallCategory = 'INCOMPATIBLE';
          hasIncompatibles = true;
        } else if (coupledDimensions > 0) {
          overallCategory = 'STACK_COUPLED';
        } else {
          overallCategory = 'CONCEPT_NEUTRAL';
        }

        classifications.push({ stackId, category: overallCategory, dimensions });
      }

      const auditId = `AUDIT-${taskTypeId}-${Date.now()}`;
      const auditResult: AuditResult = {
        taskTypeId,
        couplingClassifications: classifications,
        dimensionsEvaluated: 10,
        stacksAudited: registeredStacks.length,
        hasIncompatibles,
        auditId,
      };

      const auditRecord: Record<string, unknown> = {
        auditId,
        taskTypeId,
        auditResult,
        genesisPromptSpecRef: taskTypeId,
        createdAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED', // scope_isolation: platform-wide coupling audit
        knowledgeScope: 'GLOBAL', // coupling audits are platform-wide — Tenant B reads Tenant A's audit
        tenantId: MASTER_TENANT_ID,
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.db.storeDocument(AUDIT_INDEX, auditRecord, auditId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'AUDIT_STORE_FAILED',
          `Failed to store coupling audit for ${taskTypeId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      await this.queue.enqueue('CouplingAuditComplete', {
        auditId,
        taskTypeId,
        hasIncompatibles,
        stacksAudited: registeredStacks.length,
      });

      this.logger.log(
        `StackCouplingAuditor: taskType=${taskTypeId} stacks=${registeredStacks.length} hasIncompatibles=${hasIncompatibles}`,
      );
      return DataProcessResult.success(auditResult);
    } catch (err) {
      return DataProcessResult.failure(
        'AUDITOR_ERROR',
        `StackCouplingAuditor threw: ${String(err)}`,
      );
    }
  }
}
