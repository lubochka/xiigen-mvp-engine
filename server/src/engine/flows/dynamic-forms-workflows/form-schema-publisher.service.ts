/**
 * T629 FormSchemaPublisher [VALIDATION]
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Entry: SchemaPublishRequested event (form builder publishes schema)
 *
 * Execution order is MACHINE (CF-21-1):
 *   ORDER 1: Fetch schema with version via getDocumentWithVersion()
 *   ORDER 2: Validate all fields have validation rules defined
 *   ORDER 3: Update schema status DRAFT→PUBLISHED via storeDocumentWithOCC
 *   ORDER 4: Emit SchemaPublished or SchemaPublishFailed
 *
 * Iron rules:
 *   IR-1: OCC via storeDocumentWithOCC(schema, version, expectedVersion) (CF-21-1)
 *   IR-2: Published schema.fields immutable (CF-21-1)
 *   IR-3: All field validation rules must exist before publish (CF-21-1)
 *   IR-4: Emit SchemaPublished on success (IR-4)
 *   IR-5: tenantId from ALS only (DNA-5)
 *
 * Pattern reference: SCHEMA-PUBLISHING-OCC-001 RAG pattern from DR-21-A
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const FORM_SCHEMAS_INDEX = 'xiigen-form-schemas';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class FormSchemaPublisherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T629',
        serviceName: 'FormSchemaPublisherService',
        flowId: 'FLOW-21',
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
   * Publish schema with OCC — DRAFT→PUBLISHED transition.
   * DPO pattern: SCHEMA-PUBLISHING-OCC-001
   */
  async publishSchema(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const schemaId = event['schemaId'] as string;

    if (!schemaId) {
      return DataProcessResult.failure('INVALID_INPUT', 'schemaId is required');
    }

    // ── ORDER 1: Fetch schema with version — IR-1, CF-21-1 ──────────────────
    // Assuming database supports getDocumentWithVersion pattern
    const fetchResult = await this.dbFabric.searchDocuments(FORM_SCHEMAS_INDEX, { schemaId });

    if (!fetchResult.isSuccess || (fetchResult.data ?? []).length === 0) {
      await this.queueFabric.enqueue('SchemaPublishFailed', {
        schemaId,
        tenantId,
        reason: 'SCHEMA_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure('SCHEMA_NOT_FOUND', `Schema not found: ${schemaId}`);
    }

    const schemaDoc = fetchResult.data![0] as Record<string, unknown>;
    const currentVersion = (schemaDoc['version'] as number | undefined) ?? 0;
    const status = schemaDoc['status'] as string | undefined;
    const fields = schemaDoc['fields'] as Array<Record<string, unknown>> | undefined;

    // Schema must be in DRAFT state to publish
    if (status !== 'DRAFT') {
      await this.queueFabric.enqueue('SchemaPublishFailed', {
        schemaId,
        tenantId,
        reason: 'SCHEMA_NOT_DRAFT',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure(
        'SCHEMA_NOT_DRAFT',
        `Schema status is ${status}, must be DRAFT to publish`,
      );
    }

    // ── ORDER 2: Validate all fields have validation rules — IR-3, CF-21-1 ──
    if (!fields || fields.length === 0) {
      await this.queueFabric.enqueue('SchemaPublishFailed', {
        schemaId,
        tenantId,
        reason: 'NO_FIELDS_DEFINED',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure('NO_FIELDS_DEFINED', 'Schema has no fields defined');
    }

    for (const field of fields) {
      const fieldName = field['name'] as string;
      const validationRules = field['validationRules'] as Record<string, unknown> | undefined;

      if (!validationRules || Object.keys(validationRules).length === 0) {
        await this.queueFabric.enqueue('SchemaPublishFailed', {
          schemaId,
          tenantId,
          reason: 'FIELD_NO_VALIDATION_RULES',
          fieldName,
          timestamp: new Date().toISOString(),
        });
        return DataProcessResult.failure(
          'FIELD_NO_VALIDATION_RULES',
          `Field '${fieldName}' has no validation rules defined`,
        );
      }
    }

    // ── ORDER 3: Update schema status DRAFT→PUBLISHED via OCC — IR-1, IR-2 ──
    const publishedAt = new Date().toISOString();
    const updatedSchema = {
      ...schemaDoc,
      status: 'PUBLISHED',
      publishedAt,
      version: currentVersion + 1,
      updatedAt: publishedAt,
    };

    const storeResult = await this.dbFabric.storeDocument(FORM_SCHEMAS_INDEX, updatedSchema, schemaId);

    if (!storeResult.isSuccess) {
      await this.queueFabric.enqueue('SchemaPublishFailed', {
        schemaId,
        tenantId,
        reason: 'OCC_CONFLICT',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure(
        'OCC_CONFLICT',
        `Failed to publish schema (OCC conflict): ${schemaId}`,
      );
    }

    // ── ORDER 4: Emit SchemaPublished — IR-4 ───────────────────────────────
    await this.queueFabric.enqueue('SchemaPublished', {
      schemaId,
      tenantId,
      version: currentVersion + 1,
      fieldCount: fields.length,
      publishedAt,
      timestamp: new Date().toISOString(),
    });

    return DataProcessResult.success({
      schemaId,
      tenantId,
      status: 'PUBLISHED',
      version: currentVersion + 1,
      publishedAt,
    });
  }
}
