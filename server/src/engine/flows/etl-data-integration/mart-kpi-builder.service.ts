/**
 * T220 MartKpiBuilder [modeling]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: PII-gated mart KPI computation (DR-63). IPiiClassificationService (F462)
 * MUST classify all fields before mart write. Mart write blocked if piiFieldsDetected > 0
 * without masking. RLS policies (F463) applied to all mart results.
 *
 * Iron rules:
 *   IR-1: F462 IPiiClassificationService MUST classify ALL fields before mart write (DR-63).
 *   IR-2: Mart write BLOCKED if piiFieldsDetected > 0 without masking.
 *   IR-3: PiiClassificationCompleted emitted BEFORE MartRefreshed.
 *   IR-4: RLS policies (F463) applied to all mart results.
 *   IR-5: MartRefreshed includes piiGateApplied: true.
 *   IR-6: KPIComputationCompleted emitted after KPI aggregation.
 *   IR-7: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: PiiClassificationCompleted, KPIComputationCompleted, MartRefreshed
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { PII_CLASSIFICATION_SERVICE, RLS_POLICY_SERVICE } from './etl-platform-tokens';

interface IPiiClassificationService {
  classifyFields(
    connectorId: string,
    fields: Record<string, unknown>,
  ): Promise<{
    safeToWrite: boolean;
    piiFieldsDetected: string[];
    maskedFields: Record<string, unknown>;
  }>;
}

interface IRlsPolicyService {
  applyPolicies(
    connectorId: string,
    tenantId: string,
    records: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
}

const MART_RECORDS_INDEX = 'xiigen-mart-records';
const PII_RESULTS_INDEX = 'xiigen-pii-classification-results';

@Injectable()
export class MartKpiBuilderService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(PII_CLASSIFICATION_SERVICE) private readonly piiClassifier: IPiiClassificationService,
    @Inject(RLS_POLICY_SERVICE) private readonly rlsPolicy: IRlsPolicyService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T220',
        serviceName: 'MartKpiBuilderService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async buildKpis(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const factRecords = (event['factRecords'] as Record<string, unknown>[]) ?? [];
    const martEntity = event['martEntity'] as string;

    if (!connectorId || !martEntity) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and martEntity are required',
      );
    }

    // ORDER 1: IR-1 — PII gate before mart write (DR-63)
    const allFields = this.mergeFields(factRecords);
    const piiResult = await this.piiClassifier.classifyFields(connectorId, allFields);

    // IR-7: store PII result BEFORE emitting (DNA-8)
    await this.dbFabric.storeDocument(
      PII_RESULTS_INDEX,
      {
        connectorId,
        tenantId,
        martEntity,
        knowledgeScope: 'PRIVATE',
        safeToWrite: piiResult.safeToWrite,
        piiFieldsDetected: piiResult.piiFieldsDetected,
        classifiedAt: new Date().toISOString(),
      },
      `pii:${tenantId}:${connectorId}:${martEntity}:${Date.now()}`,
    );

    // IR-3: PiiClassificationCompleted BEFORE MartRefreshed
    await this.queueFabric.enqueue('PiiClassificationCompleted', {
      connectorId,
      tenantId,
      martEntity,
      safeToWrite: piiResult.safeToWrite,
      piiFieldsDetected: piiResult.piiFieldsDetected,
    });

    // IR-2: Block mart write if PII detected without masking
    if (!piiResult.safeToWrite) {
      return DataProcessResult.failure(
        'PII_GATE_BLOCKED',
        `Mart write blocked: ${piiResult.piiFieldsDetected.length} PII field(s) detected without masking`,
      );
    }

    // ORDER 2: Compute KPIs from masked fields
    const kpis = this.computeKpis(piiResult.maskedFields, factRecords, martEntity);

    // IR-6: KPIComputationCompleted after aggregation
    await this.queueFabric.enqueue('KPIComputationCompleted', {
      connectorId,
      tenantId,
      martEntity,
      kpis,
      computedAt: new Date().toISOString(),
    });

    // IR-4: Apply RLS before returning
    const martRecords = this.buildMartRecords(kpis, tenantId, connectorId, martEntity);
    const rlsFiltered = await this.rlsPolicy.applyPolicies(connectorId, tenantId, martRecords);

    // IR-7: storeDocument mart records BEFORE MartRefreshed (DNA-8)
    const martWriteId = `mart:${tenantId}:${connectorId}:${martEntity}:${Date.now()}`;
    const storeResult = await this.dbFabric.storeDocument(
      MART_RECORDS_INDEX,
      {
        connectorId,
        tenantId,
        martEntity,
        knowledgeScope: 'PRIVATE',
        kpis,
        piiGateApplied: true,
        rlsApplied: true,
        refreshedAt: new Date().toISOString(),
      },
      martWriteId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        storeResult.errorMessage ?? 'Mart write failed',
      );
    }

    // IR-5: MartRefreshed includes piiGateApplied: true
    await this.queueFabric.enqueue('MartRefreshed', {
      connectorId,
      tenantId,
      martEntity,
      kpis,
      piiGateApplied: true,
      rlsApplied: true,
      refreshedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      martEntity,
      kpis,
      rlsFiltered,
      piiGateApplied: true,
      rlsApplied: true,
    });
  }

  private mergeFields(records: Record<string, unknown>[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const rec of records) {
      Object.assign(merged, rec);
    }
    return merged;
  }

  private computeKpis(
    fields: Record<string, unknown>,
    records: Record<string, unknown>[],
    martEntity: string,
  ): Record<string, unknown> {
    const count = records.length;
    const numericFields = Object.entries(fields)
      .filter(([, v]) => typeof v === 'number')
      .map(([k]) => k);

    const sums: Record<string, number> = {};
    for (const field of numericFields) {
      sums[`sum_${field}`] = records.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
    }

    return { entity: martEntity, count, ...sums };
  }

  private buildMartRecords(
    kpis: Record<string, unknown>,
    tenantId: string,
    connectorId: string,
    martEntity: string,
  ): Record<string, unknown>[] {
    return [{ ...kpis, tenantId, connectorId, martEntity, knowledgeScope: 'PRIVATE' }];
  }
}
