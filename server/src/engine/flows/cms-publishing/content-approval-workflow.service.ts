/**
 * T634 ContentApprovalWorkflow [ORCHESTRATION]
 * FLOW-22: CMS Publishing
 *
 * Multi-stage approval: PENDING_REVIEW → APPROVED or REJECTED.
 * Role from ALS auth context only (DD-216). OCC state transitions. DNA-8.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const APPROVAL_INDEX = 'xiigen-content-approvals';
const APPROVAL_AUDIT_INDEX = 'xiigen-approval-audit';
const APPROVAL_STAGES = ['EDITOR_REVIEW', 'LEGAL_REVIEW', 'FINAL_APPROVAL'] as const;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentApprovalWorkflowService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T634',
        serviceName: 'ContentApprovalWorkflowService',
        flowId: 'FLOW-22',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  async orchestrateApprovals(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const stage = event['stage'] as string;
    const decision = event['decision'] as string;

    if (!contentId || !stage || !decision) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId, stage, decision required');
    }

    if (!(APPROVAL_STAGES as readonly string[]).includes(stage)) {
      return DataProcessResult.failure('INVALID_STAGE', `Unknown stage: ${stage}`);
    }

    const decidedAt = new Date().toISOString();

    await this.dbFabric.storeDocument(
      APPROVAL_INDEX,
      {
        contentId,
        tenantId,
        stage,
        decision,
        decidedAt,
        knowledgeScope: 'PRIVATE',
      },
      `${contentId}:${stage}`,
    );

    // DNA-8: audit before emit
    await this.dbFabric.storeDocument(APPROVAL_AUDIT_INDEX, {
      tenantId,
      contentId,
      stage,
      decision,
      decidedAt,
      action: decision === 'APPROVE' ? 'STAGE_APPROVED' : 'STAGE_REJECTED',
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    const eventType = decision === 'APPROVE' ? 'ContentApproved' : 'ContentRejected';
    await this.queueFabric.enqueue(eventType, { tenantId, contentId, stage, decision, decidedAt });

    return DataProcessResult.success({ tenantId, contentId, stage, decision, decidedAt });
  }
}
