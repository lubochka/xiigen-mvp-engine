/**
 * T528 RagBlueprintExporter [EXPORT]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IRagService, RAG_SERVICE } from '../../../fabrics/interfaces/rag.interface';

@Injectable()
export class RagBlueprintExporterService extends MicroserviceBase {
  constructor(@Inject(RAG_SERVICE) private readonly rag: IRagService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T528',
        serviceName: 'RagBlueprintExporterService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async exportBlueprint(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const patterns = input['patterns'] as Record<string, unknown>[];
    if (!packageId || !patterns || patterns.length === 0) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, patterns required');
    }
    const logicPatterns = patterns.map((p) => {
      const { embedding: _embedding, vector: _vector, ...sanitized } = p as Record<string, unknown>;
      return sanitized;
    });
    const hasEmbeddings = logicPatterns.some((p) => 'embedding' in p || 'vector' in p);
    if (hasEmbeddings) {
      return DataProcessResult.failure(
        'SANITIZATION_FAILED',
        'Embeddings found after sanitization (IR-2)',
      );
    }
    const blueprintId = `bp-${packageId}-${Date.now()}`;
    return DataProcessResult.success({
      blueprintId,
      packageId,
      patterns: logicPatterns,
      patternCount: logicPatterns.length,
      sanitized: true,
      exportedAt: new Date().toISOString(),
    });
  }
}
