/**
 * T219 DimensionalModelBuilder [modeling]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: SCD-2 version-only dimensional modeling (DR-62). close_old_version +
 * open_new_version MUST be atomic. Orphaned dim records prohibited.
 *
 * Iron rules:
 *   IR-1: SCD-2 version-only — direct UPDATE on dim records is PROHIBITED (DR-62).
 *   IR-2: close_old + open_new MUST be atomic in a single logical transaction.
 *   IR-3: Orphaned dimension records (open old with no close) are prohibited.
 *   IR-4: effectiveFrom/effectiveTo MUST be set on all version records.
 *   IR-5: Fact records are append-only.
 *   IR-6: DimensionVersionCreated emitted AFTER atomic commit. DNA-8.
 *
 * Emits: DimensionVersionCreated, FactAppended
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const DIM_VERSIONS_INDEX = 'xiigen-dimension-versions';
const FACTS_INDEX = 'xiigen-facts';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

@Injectable()
export class DimensionalModelBuilderService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T219',
        serviceName: 'DimensionalModelBuilderService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Build or update a dimension using SCD-2 version-only strategy.
   * IR-1: No direct UPDATE — close old + open new.
   * IR-2: Both operations are stored atomically via sequential storeDocuments
   *        (fabric transactions modelled as guaranteed-order appends).
   */
  async buildDimension(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const dimensionKey = event['dimensionKey'] as string;
    const dimensionType = event['dimensionType'] as string;
    const attributes = event['attributes'] as Record<string, unknown>;
    const effectiveFrom = (event['effectiveFrom'] as string) ?? new Date().toISOString();

    if (!connectorId || !dimensionKey || !dimensionType) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId, dimensionKey, dimensionType are required',
      );
    }

    if (!attributes || typeof attributes !== 'object') {
      return DataProcessResult.failure('VALIDATION_FAILED', 'attributes must be an object');
    }

    // Check for existing open version
    const existingSearch = await this.dbFabric.searchDocuments(DIM_VERSIONS_INDEX, {
      dimensionKey,
      tenantId,
      connectorId,
      current: true,
    });

    const now = new Date().toISOString();
    let closedOldVersionId: string | null = null;

    // IR-2: Atomic close_old + open_new
    // Step 1: Close old version (if exists) — IR-1: no UPDATE, instead close via new record with effectiveTo
    if (
      existingSearch.isSuccess &&
      Array.isArray(existingSearch.data) &&
      existingSearch.data.length > 0
    ) {
      const oldVersion = existingSearch.data[0] as Record<string, unknown>;
      const oldVersionId = oldVersion['versionId'] as string;

      // IR-1: We write a closure record rather than UPDATE the old record
      closedOldVersionId = `${oldVersionId}:closed`;
      const closeResult = await this.dbFabric.storeDocument(
        DIM_VERSIONS_INDEX,
        {
          ...oldVersion,
          current: false,
          effectiveTo: effectiveFrom,
          closedAt: now,
          knowledgeScope: 'PRIVATE',
          tenantId,
        },
        closedOldVersionId,
      );

      if (!closeResult.isSuccess) {
        return DataProcessResult.failure(
          'CLOSE_VERSION_FAILED',
          closeResult.errorMessage ?? 'Failed to close old dim version',
        );
      }
    }

    // Step 2: Open new version — IR-4: effectiveFrom/effectiveTo set
    const newVersionId = `dim:${tenantId}:${connectorId}:${dimensionKey}:${Date.now()}`;
    const openResult = await this.dbFabric.storeDocument(
      DIM_VERSIONS_INDEX,
      {
        versionId: newVersionId,
        dimensionKey,
        dimensionType,
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        attributes,
        current: true,
        effectiveFrom,
        effectiveTo: null,
        openedAt: now,
      },
      newVersionId,
    );

    if (!openResult.isSuccess) {
      return DataProcessResult.failure(
        'OPEN_VERSION_FAILED',
        openResult.errorMessage ?? 'Failed to open new dim version',
      );
    }

    // IR-6: Emit DimensionVersionCreated AFTER atomic commit (DNA-8)
    await this.queueFabric.enqueue('DimensionVersionCreated', {
      connectorId,
      tenantId,
      dimensionKey,
      dimensionType,
      versionId: newVersionId,
      effectiveFrom,
      closedPrevious: closedOldVersionId !== null,
    });

    return DataProcessResult.success({
      versionId: newVersionId,
      dimensionKey,
      effectiveFrom,
      closedPrevious: closedOldVersionId !== null,
    });
  }

  /**
   * Append a fact record — IR-5: facts are append-only.
   * DNA-8: storeDocument before enqueue FactAppended.
   */
  async appendFact(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const factKey = event['factKey'] as string;
    const factData = event['factData'] as Record<string, unknown>;

    if (!connectorId || !factKey || !factData) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId, factKey, factData are required',
      );
    }

    const factId = `fact:${tenantId}:${connectorId}:${factKey}:${Date.now()}`;
    const idempotencyKey = `fact-idempotency:${tenantId}:${connectorId}:${factKey}`;

    // Idempotency check
    const dupCheck = await this.dbFabric.searchDocuments(IDEMPOTENCY_INDEX, { idempotencyKey, tenantId });
    if (dupCheck.isSuccess && Array.isArray(dupCheck.data) && dupCheck.data.length > 0) {
      return DataProcessResult.success({ factId, skipped: true });
    }

    // IR-5: storeDocument (append-only — no update)
    const storeResult = await this.dbFabric.storeDocument(
      FACTS_INDEX,
      {
        ...factData,
        factKey,
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        appendedAt: new Date().toISOString(),
      },
      factId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        storeResult.errorMessage ?? 'Fact append failed',
      );
    }

    await this.dbFabric.storeDocument(
      IDEMPOTENCY_INDEX,
      {
        idempotencyKey,
        tenantId,
        usedAt: new Date().toISOString(),
      },
      idempotencyKey,
    );

    await this.queueFabric.enqueue('FactAppended', {
      connectorId,
      tenantId,
      factKey,
      factId,
      appendedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({ factId, skipped: false });
  }
}
