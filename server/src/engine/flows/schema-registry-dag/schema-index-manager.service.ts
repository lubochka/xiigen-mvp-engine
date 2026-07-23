/**
 * T195 SchemaIndexManager [SCHEDULED]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T195-1: ensureIndex() is idempotent — no error on duplicate index.
 *   IR-T195-2: Mapping updates ADDITIVE only — never remove or change existing field types.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

@Injectable()
export class SchemaIndexManagerService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T195',
        serviceName: 'SchemaIndexManagerService',
        flowId: 'FLOW-11',
      }),
    });
  }

  /** Idempotent index creation — no error if index already exists. */
  async ensureIndex(): Promise<DataProcessResult<void>> {
    try {
      await this.dbService.ensureIndex('xiigen-schema-registry', {
        properties: {
          schemaId: { type: 'keyword' },
          schemaType: { type: 'keyword' },
          version: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          status: { type: 'keyword' },
          activeUntil: { type: 'keyword' },
          changeType: { type: 'keyword' },
          publishedAt: { type: 'date' },
          connectionType: { type: 'keyword' },
          knowledgeScope: { type: 'keyword' },
        },
      });
      await this.dbService.ensureIndex('xiigen-schema-audit', {
        properties: {
          auditId: { type: 'keyword' },
          schemaType: { type: 'keyword' },
          action: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          createdAt: { type: 'date' },
          connectionType: { type: 'keyword' },
          knowledgeScope: { type: 'keyword' },
        },
      });
      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      return DataProcessResult.failure('INDEX_ERROR', `SchemaIndexManager threw: ${String(err)}`);
    }
  }
}
