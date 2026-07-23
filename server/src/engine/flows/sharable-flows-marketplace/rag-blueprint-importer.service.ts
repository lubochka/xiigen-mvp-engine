/**
 * T530 RagBlueprintImporter [IMPORT]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IRagService, RAG_SERVICE } from '../../../fabrics/interfaces/rag.interface';

@Injectable()
export class RagBlueprintImporterService extends MicroserviceBase {
  constructor(
    @Inject(RAG_SERVICE) private readonly rag: IRagService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T530',
        serviceName: 'RagBlueprintImporterService',
        flowId: 'FLOW-32',
      }),
    });
  }
  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }
  async importBlueprint(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const blueprintId = input['blueprintId'] as string;
    const patterns = input['patterns'] as Record<string, unknown>[];
    if (!blueprintId || !patterns || patterns.length === 0) {
      return DataProcessResult.failure('INVALID_INPUT', 'blueprintId, patterns required');
    }
    const isValidSchema = patterns.every(
      (p) => p['name'] && p['description'] && p['ragPatternType'],
    );
    if (!isValidSchema) {
      return DataProcessResult.failure(
        'INVALID_BLUEPRINT_SCHEMA',
        'Blueprint patterns missing required fields (IR-1)',
      );
    }
    const tenantId = this.getTenantId();
    for (const pattern of patterns) {
      await this.rag.ingest([
        { ...pattern, blueprintId, tenantId, importedAt: new Date().toISOString() },
      ]);
    }
    return DataProcessResult.success({
      blueprintId,
      tenantId,
      patternsImported: patterns.length,
      status: 'IMPORTED',
    });
  }
}
