/**
 * T202 SchemaApprovalWorkflow [ORCHESTRATION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T202-1: THREE paths: APPROVE / REJECT / DEFER. Binary APPROVE/REJECT is score-0 violation.
 *              DEFER is distinct from REJECT.
 *   IR-T202-2: Approval window TTL from FREEDOM config
 *   'flow11_schema_registry_approval_window_ms' — NEVER hardcoded.
 *   IR-T202-3: storeDocument(pendingApproval) BEFORE enqueue. DNA-8.
 *
 * Listens on: SchemaApprovalRequired
 * Emits: SchemaApprovalGranted, SchemaApprovalRejected, SchemaApprovalDeferred, SchemaApprovalDuplicate
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { randomUUID } from 'crypto';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_AUDIT_INDEX = 'xiigen-schema-audit';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';
const FREEDOM_INDEX = 'freedom_configs';

export type ApprovalDecision = 'APPROVE' | 'REJECT' | 'DEFER';

export interface ApprovalInput {
  schemaType: string;
  newSchema: Record<string, unknown>;
  previousVersion?: string;
  changedFields: string[];
  nextVersion?: string;
  tenantId?: string;
  decision?: ApprovalDecision;
}

@Injectable()
export class SchemaApprovalWorkflowService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T202',
        serviceName: 'SchemaApprovalWorkflowService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(fallback?: string): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? fallback ?? 'unknown';
  }
  // @EventPattern('SchemaApprovalRequired') — see engine module for event binding
  async onSchemaApprovalRequired(event: Record<string, unknown>): Promise<void> {
    await this.processApproval({
      schemaType: event['schemaType'] as string,
      newSchema: event['newSchema'] as Record<string, unknown>,
      previousVersion: event['previousVersion'] as string | undefined,
      changedFields: (event['changedFields'] as string[]) ?? [],
      nextVersion: event['nextVersion'] as string | undefined,
      tenantId: event['tenantId'] as string | undefined,
      // decision will be resolved from FREEDOM config or workflow state
    });
  }

  async processApproval(
    input: ApprovalInput,
  ): Promise<DataProcessResult<{ workflowId: string; decision: string }>> {
    try {
      const tenantId = this.getTenantId(input.tenantId);

      // Duplicate workflow detection
      const workflowKey = `approval-workflow-${input.schemaType}-${input.nextVersion ?? 'latest'}-${tenantId}`;
      const existing = await this.dbService.searchDocuments(IDEMPOTENCY_INDEX, {
        key: workflowKey,
        tenantId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        await this.queueService.enqueue('SchemaApprovalDuplicate', {
          schemaType: input.schemaType,
          workflowKey,
          tenantId,
        });
        return DataProcessResult.success({ workflowId: workflowKey, decision: 'DUPLICATE' });
      }

      // Approval window TTL from FREEDOM config — IR-T202-2 (NEVER hardcoded)
      const ttlMs = await this.getApprovalWindowMs(tenantId);

      const workflowId = randomUUID();
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();

      // DNA-8: storeDocument(pendingApproval) BEFORE enqueue
      await this.dbService.storeDocument(
        SCHEMA_AUDIT_INDEX,
        {
          workflowId,
          schemaType: input.schemaType,
          previousVersion: input.previousVersion ?? null,
          changedFields: input.changedFields,
          nextVersion: input.nextVersion ?? null,
          status: 'PENDING_APPROVAL',
          expiresAt,
          tenantId,
          createdAt: now,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        workflowId,
      );

      // Store idempotency key for duplicate detection
      await this.dbService.storeDocument(
        IDEMPOTENCY_INDEX,
        {
          key: workflowKey,
          workflowId,
          tenantId,
          createdAt: now,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        workflowKey,
      );

      // IR-T202-1: THREE paths — APPROVE / REJECT / DEFER
      // Determine decision (default from FREEDOM config or provided)
      const decision: ApprovalDecision =
        input.decision ?? (await this.getDefaultDecision(tenantId));

      if (decision === 'APPROVE') {
        const approvalToken = randomUUID();
        // Store token for T194 to verify
        await this.dbService.storeDocument(
          IDEMPOTENCY_INDEX,
          {
            key: `approval-token-${approvalToken}`,
            workflowId,
            schemaType: input.schemaType,
            tenantId,
            createdAt: now,
            expiresAt,
            connectionType: 'FLOW_SCOPED',
            knowledgeScope: 'PRIVATE',
          },
          `approval-token-${approvalToken}`,
        );

        await this.queueService.enqueue('SchemaApprovalGranted', {
          schemaType: input.schemaType,
          newSchema: input.newSchema,
          version: input.nextVersion,
          approvalToken,
          workflowId,
          tenantId,
        });
        return DataProcessResult.success({ workflowId, decision: 'APPROVED' });
      } else if (decision === 'REJECT') {
        await this.queueService.enqueue('SchemaApprovalRejected', {
          schemaType: input.schemaType,
          workflowId,
          reason: 'rejected_by_approver',
          tenantId,
        });
        return DataProcessResult.success({ workflowId, decision: 'REJECTED' });
      } else {
        // DEFER — distinct from REJECT (IR-T202-1)
        await this.queueService.enqueue('SchemaApprovalDeferred', {
          schemaType: input.schemaType,
          workflowId,
          deferredUntil: expiresAt,
          tenantId,
        });
        return DataProcessResult.success({ workflowId, decision: 'DEFERRED' });
      }
    } catch (err) {
      return DataProcessResult.failure(
        'APPROVAL_ERROR',
        `SchemaApprovalWorkflow threw: ${String(err)}`,
      );
    }

  }

  /** IR-T202-2: TTL from FREEDOM config — NEVER hardcoded. */
  private async getApprovalWindowMs(tenantId: string): Promise<number> {
    const cfg = await this.dbService.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      config_key: 'flow11_schema_registry_approval_window_ms',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 72 * 60 * 60 * 1000; // 72 hours safe default
  }

  /** Read default decision from FREEDOM config. */
  private async getDefaultDecision(tenantId: string): Promise<ApprovalDecision> {
    const cfg = await this.dbService.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      config_key: 'flow11_schema_registry_default_approval_decision',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = String((cfg.data![0] as Record<string, unknown>)['config_value'] ?? '');
      if (val === 'APPROVE' || val === 'REJECT' || val === 'DEFER') return val;
    }
    return 'DEFER'; // Safe default — require explicit approval
  }
}
