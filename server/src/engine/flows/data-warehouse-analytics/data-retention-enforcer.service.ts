/**
 * T186 DataRetentionEnforcer [retention]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Enforces data retention policies with irreversible purge operations.
 * Execution order is MANDATORY AND INVIOLABLE.
 *
 * Execution ORDER:
 *   ORDER 1: ILegalHoldService.check() â€” holdStatus.active === true â†’ ContentRetentionExtended, return
 *   ORDER 2: IApprovalService.validate() â€” missing/invalid/expired token â†’ reject without purging, return
 *   ORDER 3: IDataGovernanceService (F424) enforceRetention() â€” get purge decision
 *   ORDER 4: Execute purge â€” emit DataPurged with tombstoneRef ONLY
 *
 * Iron rules:
 *   IR-1: EXECUTION ORDER IS MANDATORY: legal hold(1) â†’ approval(2) â†’ governance(3) â†’ purge(4).
 *   IR-2: DataPurged event contains tombstoneRef ONLY. PROHIBITED: rawContent, content, payload, body, data.
 *   IR-3: F424 IDataGovernanceService is PLATFORM-ONLY â€” governance policies not tenant-editable.
 *   IR-4: Cross-flow read from FLOW-11 via ILegalHoldService.
 *   IR-5: IWarehouseAuditService (F425) records every purge attempt, including rejected ones.
 *   IR-6: ContentRetentionExtended emitted when legal hold blocks purge.
 *
 * Emits: warehouse.content.retention.extended (on legal hold block)
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import {
  F425_WAREHOUSE_AUDIT_SERVICE,
  IWarehouseAuditService,
} from './query-execution-engine.service';

/**
 * F424: IDataGovernanceService â€” PLATFORM-ONLY.
 * Enforces retention policies. Cannot be tenant-edited.
 */
export const F424_DATA_GOVERNANCE_SERVICE = Symbol('IDataGovernanceService:F424');

export interface IDataGovernanceService {
  enforceRetention(context: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: { approved: boolean; reason?: string };
  }>;
}

/**
 * ILegalHoldService â€” cross-flow read from FLOW-11.
 * IR-4: Reads FLOW-11 legal hold records.
 */
export const LEGAL_HOLD_SERVICE = Symbol('ILegalHoldService:FLOW11');

export interface ILegalHoldService {
  check(
    contentId: string,
    tenantId: string,
  ): Promise<{
    isSuccess: boolean;
    data?: { active: boolean; holdId?: string; reason?: string };
  }>;
}

/**
 * IApprovalService â€” validates purge approval tokens.
 */
export const APPROVAL_SERVICE = Symbol('IApprovalService:F186');

export interface IApprovalService {
  validate(
    token: string,
    contentId: string,
    tenantId: string,
  ): Promise<{
    isSuccess: boolean;
    data?: { valid: boolean; reason?: string };
  }>;
}

const RETENTION_AUDIT_INDEX = 'xiigen-retention-audit';

@Injectable()
export class DataRetentionEnforcerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(F424_DATA_GOVERNANCE_SERVICE)
    private readonly governanceService: IDataGovernanceService | null = null,
    @Optional()
    @Inject(LEGAL_HOLD_SERVICE)
    private readonly legalHoldService: ILegalHoldService | null = null,
    @Optional()
    @Inject(APPROVAL_SERVICE)
    private readonly approvalService: IApprovalService | null = null,
    @Optional()
    @Inject(F425_WAREHOUSE_AUDIT_SERVICE)
    private readonly auditService: IWarehouseAuditService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T186',
        serviceName: 'DataRetentionEnforcerService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Enforce data retention policy. Purge order is MANDATORY AND INVIOLABLE.
   * IR-2: DataPurged contains tombstoneRef ONLY â€” no raw content fields.
   */
  async enforce(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const policyId = event['policyId'] as string;
    const approvalToken = event['approvalToken'] as string | undefined;

    if (!contentId || !policyId) {
      return DataProcessResult.failure('MISSING_FIELDS', 'contentId and policyId are required');
    }

    const now = new Date().toISOString();
    const auditId = `retention-audit-${tenantId}-${contentId}-${Date.now()}`;

    // â”€â”€â”€ ORDER 1: Legal hold check (cross-flow read from FLOW-11) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-1: MUST be ORDER 1. IR-4: Reads FLOW-11 legal hold records.
    if (this.legalHoldService) {
      const holdResult = await this.legalHoldService.check(contentId, tenantId);
      if (holdResult.isSuccess && holdResult.data?.active === true) {
        // IR-6: Legal hold blocks purge â†’ ContentRetentionExtended
        await this.recordAudit(auditId, tenantId, contentId, policyId, 'HOLD_BLOCKED', now);
        await this.queueFabric.enqueue('ContentRetentionExtended', {
          tenantId,
          contentId,
          policyId,
          holdId: holdResult.data.holdId,
          reason: holdResult.data.reason ?? 'legal_hold_active',
          extendedAt: now,
        });
        return DataProcessResult.success({ blocked: true, reason: 'legal_hold_active' });
      }
    }

    // â”€â”€â”€ ORDER 2: Approval token validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-1: MUST be ORDER 2. Missing/invalid token â†’ reject without purging.
    if (!approvalToken) {
      await this.recordAudit(auditId, tenantId, contentId, policyId, 'NO_APPROVAL_TOKEN', now);
      return DataProcessResult.failure(
        'MISSING_APPROVAL_TOKEN',
        'Purge requires a valid approval token',
      );
    }

    if (this.approvalService) {
      const approvalResult = await this.approvalService.validate(
        approvalToken,
        contentId,
        tenantId,
      );
      if (!approvalResult.isSuccess || approvalResult.data?.valid !== true) {
        await this.recordAudit(auditId, tenantId, contentId, policyId, 'APPROVAL_REJECTED', now);
        return DataProcessResult.failure(
          'APPROVAL_INVALID',
          approvalResult.data?.reason ?? 'Approval token invalid or expired',
        );
      }
    }

    // â”€â”€â”€ ORDER 3: Data governance decision â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-3: F424 PLATFORM-ONLY â€” cannot be tenant-edited.
    if (this.governanceService) {
      const govResult = await this.governanceService.enforceRetention({
        tenantId,
        contentId,
        policyId,
      });
      if (!govResult.isSuccess || govResult.data?.approved !== true) {
        await this.recordAudit(auditId, tenantId, contentId, policyId, 'GOVERNANCE_REJECTED', now);
        return DataProcessResult.failure(
          'GOVERNANCE_REJECTED',
          govResult.data?.reason ?? 'Governance policy rejected purge',
        );
      }
    }

    // â”€â”€â”€ ORDER 4: Execute purge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-2: DataPurged contains tombstoneRef ONLY.
    // PROHIBITED fields: rawContent, content, payload, body, data
    const tombstoneRef = `tombstone-${tenantId}-${contentId}-${Date.now()}`;

    // Record audit BEFORE emit (DNA-8)
    await this.recordAudit(auditId, tenantId, contentId, policyId, 'PURGED', now);

    await this.queueFabric.enqueue('DataPurged', {
      tenantId,
      tombstoneRef, // IR-2: tombstoneRef ONLY
      contentId,
      purgedAt: now,
      policyId,
      // PROHIBITED: rawContent, content, payload, body, data â€” intentionally absent
    });

    return DataProcessResult.success({ tombstoneRef, contentId, purgedAt: now });
  }

  private async recordAudit(
    auditId: string,
    tenantId: string,
    contentId: string,
    policyId: string,
    outcome: string,
    timestamp: string,
  ): Promise<void> {
    // IR-5: Audit every purge attempt including rejected ones
    const entry: Record<string, unknown> = {
      auditId,
      tenantId,
      contentId,
      policyId,
      outcome,
      recordedAt: timestamp,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };
    await this.dbFabric.storeDocument(RETENTION_AUDIT_INDEX, entry, auditId);
    if (this.auditService) {
      await this.auditService.record(entry);
    }
  }
}
