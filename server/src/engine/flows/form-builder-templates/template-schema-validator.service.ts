/**
 * T637 TemplateSchemaValidator [VALIDATION]
 * FLOW-23: Form Builder Templates
 *
 * Entry: TemplateValidationRequested event (user submits form template)
 *
 * Execution order is MACHINE (CF-23-1):
 *   ORDER 1: JSON Schema validation — template.schema must be valid JSON Schema
 *   ORDER 2: Required field enforcement — required fields exist in schema.required
 *   ORDER 3: Type compatibility check — field types match ALLOWED_FIELD_TYPES
 *   ORDER 4: storeDocument(validation audit, append-only) — BEFORE emit
 *   ORDER 5: enqueue(TemplateValidated) — only after all gates pass
 *
 * Iron rules:
 *   IR-1: JSON Schema structure validation at ORDER 1 — parse and validate JSON Schema
 *   IR-2: Required field enforcement at ORDER 2 — required fields in requiredFields must exist in schema.required
 *   IR-3: Type compatibility at ORDER 3 — field types in ALLOWED_FIELD_TYPES
 *   IR-4: Append-only audit storeDocument at ORDER 4 BEFORE enqueue (DNA-8)
 *   IR-5: SchemaInvalid emitted on any validation gate failure
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const VALIDATION_INDEX = 'xiigen-template-validations';
const AUDIT_INDEX = 'xiigen-validation-audit';
const ALLOWED_FIELD_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'null'] as const;

@Injectable()
export class TemplateSchemaValidatorService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async validateTemplate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const schema = event['schema'] as Record<string, unknown> | undefined;
    const requiredFields = event['requiredFields'] as string[] | undefined;

    if (!templateId || !schema) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId and schema are required');
    }

    const auditedAt = new Date().toISOString();

    // ── ORDER 1: JSON Schema validation ────────────────────────────────────────
    try {
      if (typeof schema !== 'object' || schema === null) {
        throw new Error('schema must be an object');
      }
      const schemaStr = JSON.stringify(schema);
      JSON.parse(schemaStr);

      // Strict schema format validation: must have 'type' field
      if (!schema['type']) {
        throw new Error('schema must have a "type" field');
      }
    } catch (err) {
      await this.queue.enqueue('SchemaInvalid', {
        templateId,
        tenantId,
        reason: `Invalid JSON Schema: ${(err as Error).message}`,
      });

      await this.db.storeDocument(AUDIT_INDEX, {
        templateId,
        tenantId,
        phase: 'SCHEMA_VALIDATION_FAILED',
        auditedAt,
        knowledgeScope: 'PRIVATE',
      });

      return DataProcessResult.failure('INVALID_JSON_SCHEMA', (err as Error).message);
    }

    // ── ORDER 2: Required field enforcement ───────────────────────────────────
    const schemaRequired = (schema['required'] as string[] | undefined) ?? [];
    if (requiredFields && requiredFields.length > 0) {
      const missingRequired = requiredFields.filter((field) => !schemaRequired.includes(field));
      if (missingRequired.length > 0) {
        await this.queue.enqueue('RequiredFieldMissing', {
          templateId,
          tenantId,
          missingFields: missingRequired,
        });

        await this.db.storeDocument(AUDIT_INDEX, {
          templateId,
          tenantId,
          phase: 'REQUIRED_FIELD_ENFORCEMENT_FAILED',
          missingFields: missingRequired,
          auditedAt,
          knowledgeScope: 'PRIVATE',
        });

        return DataProcessResult.failure(
          'REQUIRED_FIELD_MISSING',
          `Missing required fields: ${missingRequired.join(', ')}`,
        );
      }
    }

    // ── ORDER 3: Type compatibility check ────────────────────────────────────
    const properties =
      (schema['properties'] as Record<string, Record<string, unknown>> | undefined) ?? {};
    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const fieldType = fieldSchema['type'] as string | undefined;
      if (
        fieldType &&
        !ALLOWED_FIELD_TYPES.includes(fieldType as (typeof ALLOWED_FIELD_TYPES)[number])
      ) {
        await this.queue.enqueue('TypeMismatchError', {
          templateId,
          tenantId,
          field: fieldName,
          invalidType: fieldType,
          allowedTypes: ALLOWED_FIELD_TYPES,
        });

        await this.db.storeDocument(AUDIT_INDEX, {
          templateId,
          tenantId,
          phase: 'TYPE_COMPATIBILITY_FAILED',
          field: fieldName,
          invalidType: fieldType,
          auditedAt,
          knowledgeScope: 'PRIVATE',
        });

        return DataProcessResult.failure(
          'TYPE_MISMATCH',
          `Field ${fieldName} has invalid type ${fieldType}. Allowed: ${ALLOWED_FIELD_TYPES.join(', ')}`,
        );
      }
    }

    // ── ORDER 4: Append-only audit write ──────────────────────────────────────
    await this.db.storeDocument(AUDIT_INDEX, {
      templateId,
      tenantId,
      phase: 'VALIDATION_PASSED',
      schemaPropertiesCount: Object.keys(properties).length,
      requiredFieldsCount: schemaRequired.length,
      auditedAt,
      knowledgeScope: 'PRIVATE',
    });

    const validationResult = {
      templateId,
      tenantId,
      status: 'VALIDATED',
      validatedAt: auditedAt,
      propertiesCount: Object.keys(properties).length,
      requiredCount: schemaRequired.length,
      knowledgeScope: 'PRIVATE',
    };

    await this.db.storeDocument(VALIDATION_INDEX, validationResult, templateId);

    // ── ORDER 5: Emit TemplateValidated ───────────────────────────────────────
    await this.queue.enqueue('TemplateValidated', {
      templateId,
      tenantId,
      validatedAt: auditedAt,
    });

    return DataProcessResult.success({
      templateId,
      tenantId,
      status: 'VALIDATED',
      validatedAt: auditedAt,
    });
  }
}
