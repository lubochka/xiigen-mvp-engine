/**
 * T205 SchemaValidationService [VALIDATION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T205-1: Validates against document's pinned schemaVersion field — NEVER against getCurrentVersion().
 *   IR-T205-2: A BREAKING schema change must not invalidate historically correct documents.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';

export interface ValidationInput {
  document: Record<string, unknown>;
  schemaType: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  validatedAgainstVersion: string;
}

@Injectable()
export class SchemaValidationService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T205',
        serviceName: 'SchemaValidationService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? 'unknown';
  }
  /**
   * Validate document against its pinned schemaVersion.
   * IR-T205-1: NEVER validate against getCurrentVersion().
   */
  async validate(input: ValidationInput): Promise<DataProcessResult<ValidationResult>> {
    try {
      const tenantId = this.getTenantId();

      // IR-T205-1: use pinned version from document — not current version
      const pinnedVersion = String(input.document['schemaVersion'] ?? '');
      if (!pinnedVersion) {
        return DataProcessResult.failure(
          'NO_SCHEMA_VERSION',
          'Document missing schemaVersion field — cannot validate',
        );
      }

      // Fetch the exact pinned schema version
      const schemaResult = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        schemaType: input.schemaType,
        version: pinnedVersion,
      });
      if (!schemaResult.isSuccess || (schemaResult.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'SCHEMA_NOT_FOUND',
          `Schema ${input.schemaType}@${pinnedVersion} not found`,
        );
      }

      const schema = schemaResult.data![0] as Record<string, unknown>;
      const jsonSchema = (schema['jsonSchema'] as Record<string, unknown>) ?? {};
      const errors: string[] = [];

      // Basic property validation against pinned schema
      const required = (jsonSchema['required'] as string[]) ?? [];
      const properties = (jsonSchema['properties'] as Record<string, unknown>) ?? {};

      for (const field of required) {
        if (!(field in input.document)) {
          errors.push(`Required field '${field}' missing`);
        }
      }

      for (const [field, fieldDef] of Object.entries(properties)) {
        if (field in input.document) {
          const expectedType = (fieldDef as Record<string, unknown>)['type'];
          const actualValue = input.document[field];
          if (expectedType && typeof actualValue !== expectedType) {
            errors.push(
              `Field '${field}' expected type '${expectedType}', got '${typeof actualValue}'`,
            );
          }
        }
      }

      return DataProcessResult.success({
        valid: errors.length === 0,
        errors,
        validatedAgainstVersion: pinnedVersion,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'VALIDATION_ERROR',
        `SchemaValidationService threw: ${String(err)}`,
      );
    }
  }
}
