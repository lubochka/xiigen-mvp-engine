/**
 * T196 SchemaVersionReader [VALIDATION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T196-1: getDocumentWithVersion returns { schema, versionPin } — versionPin always present.
 *              T194 depends on versionPin for OCC write.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';

export interface SchemaWithVersionPin {
  schema: Record<string, unknown>;
  versionPin: { seqNo: number; primaryTerm: number };
}

@Injectable()
export class SchemaVersionReaderService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T196',
        serviceName: 'SchemaVersionReaderService',
        flowId: 'FLOW-11',
      }),
    });
  }

  /** Read schema with version pin for OCC operations. versionPin always present. */
  async getSchemaWithVersion(schemaId: string): Promise<DataProcessResult<SchemaWithVersionPin>> {
    try {
      const result = await this.dbService.getDocumentWithVersion(SCHEMA_REGISTRY_INDEX, schemaId);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'NOT_FOUND',
          result.errorMessage ?? 'Schema not found',
        );
      }
      const { doc, seqNo, primaryTerm } = result.data!;
      return DataProcessResult.success({
        schema: doc,
        versionPin: { seqNo, primaryTerm },
      });
    } catch (err) {
      return DataProcessResult.failure(
        'VERSION_READ_ERROR',
        `SchemaVersionReader threw: ${String(err)}`,
      );
    }
  }
}
