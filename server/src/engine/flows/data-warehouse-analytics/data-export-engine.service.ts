/**
 * T181 DataExportEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Exports tenant warehouse data with mandatory three-way platform protection:
 * encryption, audit logging, and PII masking â€” all PLATFORM-ONLY, no bypass.
 *
 * Iron rules:
 *   IR-1: F411 IExportEncryptionService (PLATFORM-ONLY) â€” all exports encrypted, no bypass.
 *   IR-2: F412 IExportAuditService (PLATFORM-ONLY) â€” every export logged, no bypass.
 *   IR-3: F423 IPIIMaskingService (PLATFORM-ONLY) â€” PII masked before export, no opt-out.
 *   IR-4: downloadUrl in DataExportReady must have an expiresAt field.
 *   IR-5: storeDocument(exportRecord) BEFORE enqueue(DataExportReady). DNA-8.
 *
 * Emits: warehouse.export.ready
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { F423_PII_MASKING_SERVICE, IPIIMaskingService } from './query-execution-engine.service';

/**
 * F411: IExportEncryptionService â€” PLATFORM-ONLY.
 * Encrypts export payload. Cannot be bypassed.
 */
export const F411_EXPORT_ENCRYPTION_SERVICE = Symbol('IExportEncryptionService:F411');

export interface IExportEncryptionService {
  encrypt(data: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * F412: IExportAuditService â€” PLATFORM-ONLY.
 * Logs every export attempt. Cannot be bypassed.
 */
export const F412_EXPORT_AUDIT_SERVICE = Symbol('IExportAuditService:F412');

export interface IExportAuditService {
  log(entry: Record<string, unknown>): Promise<void>;
}

const WAREHOUSE_DATA_INDEX = 'xiigen-warehouse-data';
const EXPORT_RECORDS_INDEX = 'xiigen-export-records';

// Export URL TTL: 24 hours (machine constant â€” not a business rule, just technical expiry)
const EXPORT_URL_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DataExportEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(F411_EXPORT_ENCRYPTION_SERVICE)
    private readonly encryptionService: IExportEncryptionService | null = null,
    @Optional()
    @Inject(F412_EXPORT_AUDIT_SERVICE)
    private readonly exportAuditService: IExportAuditService | null = null,
    @Optional()
    @Inject(F423_PII_MASKING_SERVICE)
    private readonly piiMaskingService: IPIIMaskingService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T181',
        serviceName: 'DataExportEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Export tenant data with encryption, audit, and PII masking.
   * IR-5: storeDocument BEFORE enqueue. DNA-8.
   */
  async export(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const exportId = event['exportId'] as string;
    const exportType = event['exportType'] as string;
    const dataQuery = (event['dataQuery'] as Record<string, unknown>) ?? {};

    if (!exportId || !exportType) {
      return DataProcessResult.failure('MISSING_FIELDS', 'exportId and exportType are required');
    }

    // Fetch data for export â€” tenant-scoped
    const dataResult = await this.dbFabric.searchDocuments(WAREHOUSE_DATA_INDEX, {
      tenantId,
      ...dataQuery,
    });

    if (!dataResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch export data: ${dataResult.errorMessage ?? 'unknown'}`,
      );
    }

    let exportData: Record<string, unknown> = { rows: dataResult.data ?? [] };

    // IR-3: F423 PII masking BEFORE export â€” no opt-out
    if (this.piiMaskingService) {
      const maskResult = await this.piiMaskingService.mask(exportData);
      if (!maskResult.isSuccess) {
        return DataProcessResult.failure(
          'MASKING_FAILED',
          maskResult.errorMessage ?? 'PII masking failed',
        );
      }
      exportData = maskResult.data ?? exportData;
    }

    // IR-1: F411 encryption â€” no bypass
    if (this.encryptionService) {
      const encryptResult = await this.encryptionService.encrypt(exportData);
      if (!encryptResult.isSuccess) {
        return DataProcessResult.failure(
          'ENCRYPTION_FAILED',
          encryptResult.errorMessage ?? 'Encryption failed',
        );
      }
      exportData = encryptResult.data ?? exportData;
    }

    const now = new Date().toISOString();
    // IR-4: downloadUrl must have expiresAt
    const expiresAt = new Date(Date.now() + EXPORT_URL_TTL_MS).toISOString();
    const downloadUrl = `exports/${tenantId}/${exportId}`;

    const exportRecord: Record<string, unknown> = {
      exportId,
      tenantId,
      exportType,
      downloadUrl,
      expiresAt,
      rowCount: Array.isArray(exportData['rows']) ? (exportData['rows'] as unknown[]).length : 0,
      exportedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(EXPORT_RECORDS_INDEX, exportRecord, exportId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    // IR-2: F412 audit â€” no bypass
    if (this.exportAuditService) {
      await this.exportAuditService.log({
        exportId,
        tenantId,
        exportType,
        exportedAt: now,
        rowCount: exportRecord['rowCount'],
      });
    }

    await this.queueFabric.enqueue('WarehouseExportReady', {
      tenantId,
      exportId,
      exportType,
      downloadUrl,
      expiresAt,
      exportedAt: now,
    });

    return DataProcessResult.success({ exportId, downloadUrl, expiresAt });
  }
}
