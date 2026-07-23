// server/src/engine/schema/schema-registry.service.ts
// Version-keyed schema validator for generated documents.
// CN-03: eliminates J-class validation failures caused by schema version drift.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-1: uses Record<string, unknown>

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface SchemaDocument {
  schemaType: string;
  version: string;
  jsonSchema: Record<string, unknown>;
  activeFrom: string;
  activeUntil?: string; // null = current version
}

@Injectable()
export class SchemaRegistryService {
  private readonly logger = new Logger(SchemaRegistryService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async getSchema(
    schemaType: string,
    version: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const results = await this.db.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, {
      schemaType,
      version,
    });
    if (!results.isSuccess) {
      return DataProcessResult.failure(results.errorCode!, results.errorMessage!);
    }
    if (!results.data || results.data.length === 0) {
      return DataProcessResult.failure(
        'SCHEMA_NOT_FOUND',
        `Schema ${schemaType}@${version} not found in registry. ` +
          `Seed the schema registry with the correct version before generating.`,
      );
    }
    return DataProcessResult.success(results.data[0]['jsonSchema'] as Record<string, unknown>);
  }

  async getCurrentVersion(schemaType: string): Promise<DataProcessResult<string>> {
    const results = await this.db.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, {
      schemaType,
      activeUntil: null, // no end date = current
    });
    if (!results.isSuccess) {
      return DataProcessResult.failure(results.errorCode!, results.errorMessage!);
    }
    if (!results.data || results.data.length === 0) {
      return DataProcessResult.failure('SCHEMA_NOT_FOUND', `No current schema for ${schemaType}`);
    }
    return DataProcessResult.success(results.data[0]['version'] as string);
  }
}
