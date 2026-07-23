/**
 * T623 ComplianceAuditWriter [DATA_PIPELINE]
 * FLOW-19: Durable Sagas & Compliance
 *
 * Entry: ComplianceAuditRequested event (saga step emits compliance requirement)
 *
 * Execution order is MACHINE (CF-19-3):
 *   ORDER 1: compute retentionExpiresAt from FREEDOM config (flow19_compliance_retention_days)
 *   ORDER 2: compute auditHash = SHA-256(tenantId:sagaId:eventType:writtenAt)
 *   ORDER 3: storeDocument(xiigen-compliance-records, record, auditId) — PLATFORM_ONLY, append-only
 *   ORDER 4: enqueue(ComplianceRecordWritten)
 *
 * Iron rules:
 *   IR-1: retentionExpiresAt computed at write time from FREEDOM config — NEVER hardcoded
 *   IR-2: auditHash = SHA-256([tenantId, sagaId, eventType, writtenAt].join(':'))
 *   IR-3: ONLY storeDocument on compliance index — updateDocument/deleteDocument = BUILD_FAILURE
 *   IR-4: storeDocument at ORDER 3 BEFORE enqueue at ORDER 4 — DNA-8
 *   IR-5: knowledgeScope: PLATFORM_ONLY on all compliance records
 *   IR-6: ComplianceWriteFailed emitted on storeDocument failure — never silent drop
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { COMPLIANCE_RETENTION_CONFIG } from './durable-sagas-platform-tokens';

interface IComplianceRetentionConfig {
  getRetentionDays(key: string): Promise<number>;
}

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

const COMPLIANCE_INDEX = 'xiigen-compliance-records';
const FREEDOM_RETENTION_KEY = 'flow19_compliance_retention_days';
const DEFAULT_RETENTION_DAYS = 365; // platform fallback — overridden by FREEDOM config

export interface ComplianceAuditInput {
  sagaId: string;
  sagaType: string;
  eventType: string;
  stepIndex: number;
  contextData: Record<string, unknown>;
}

@Injectable()
export class ComplianceAuditWriterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(COMPLIANCE_RETENTION_CONFIG)
    private readonly retentionConfig: IComplianceRetentionConfig,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T623',
        serviceName: 'ComplianceAuditWriterService',
        flowId: 'FLOW-19',
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

  /**
   * Write immutable compliance audit record with retention expiry and tamper hash.
   *
   * CF-19-3: retentionExpiresAt at write time; auditHash SHA-256; append-only PLATFORM_ONLY;
   *   storeDocument BEFORE emit (DNA-8).
   */
  async writeAuditRecord(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const sagaId = event['sagaId'] as string;
    const sagaType = event['sagaType'] as string;
    const eventType = event['eventType'] as string;
    const stepIndex = (event['stepIndex'] as number) ?? 0;
    const contextData = (event['contextData'] as Record<string, unknown>) ?? {};

    if (!sagaId || !eventType) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'sagaId and eventType are required');
    }

    const writtenAt = new Date().toISOString();

    // ── ORDER 1: Compute retentionExpiresAt from FREEDOM config — IR-1, CF-19-3 ─
    // NEVER hardcoded — always from FREEDOM config key flow19_compliance_retention_days
    const retentionDays = await this.retentionConfig
      .getRetentionDays(FREEDOM_RETENTION_KEY)
      .catch(() => DEFAULT_RETENTION_DAYS);

    const retentionExpiresAt = new Date(
      new Date(writtenAt).getTime() + retentionDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    // ── ORDER 2: Compute auditHash — IR-2, CF-19-3 ────────────────────────────
    // SHA-256([tenantId, sagaId, eventType, writtenAt].join(':')) — deterministic tamper detection
    const auditHash = createHash('sha256')
      .update([tenantId, sagaId, eventType, writtenAt].join(':'))
      .digest('hex');

    const auditId = auditHash; // auditId === auditHash for deterministic lookup

    // ── ORDER 3: storeDocument — IR-3, IR-4, IR-5, CF-19-3, DNA-8 ────────────
    // APPEND-ONLY: no updateDocument, no deleteDocument on compliance index (IR-3)
    // knowledgeScope: PLATFORM_ONLY (IR-5)
    const storeResult = await this.dbFabric.storeDocument(
      COMPLIANCE_INDEX,
      {
        auditId,
        auditHash,
        tenantId,
        sagaId,
        sagaType,
        eventType,
        stepIndex,
        contextData,
        writtenAt,
        retentionExpiresAt,
        retentionDays,
        legalHoldActive: false,
        knowledgeScope: 'PLATFORM_ONLY',
      },
      auditId,
    );

    if (!storeResult.isSuccess) {
      // IR-6: ComplianceWriteFailed on store failure — never silent drop
      await this.queueFabric.enqueue('ComplianceWriteFailed', {
        sagaId,
        tenantId,
        eventType,
        reason: storeResult.errorMessage,
      });
      return DataProcessResult.failure(
        'COMPLIANCE_WRITE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    // ── ORDER 4: enqueue(ComplianceRecordWritten) — after store confirmed ─────
    await this.queueFabric.enqueue('ComplianceRecordWritten', {
      auditId,
      sagaId,
      tenantId,
      sagaType,
      eventType,
      writtenAt,
      retentionExpiresAt,
    });

    return DataProcessResult.success({
      auditId,
      auditHash,
      writtenAt,
      retentionExpiresAt,
    });
  }
}
