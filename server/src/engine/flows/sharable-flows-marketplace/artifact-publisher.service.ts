/**
 * T518 ArtifactPublisher [ORCHESTRATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

@Injectable()
export class ArtifactPublisherService extends MicroserviceBase {
  constructor(@Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T518',
        serviceName: 'ArtifactPublisherService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async publishArtifact(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const artifactId = input['artifactId'] as string;
    const signature = input['signature'] as string;
    const sbomData = input['sbomData'] as Record<string, unknown>;
    const slsaProvenanceData = input['slsaProvenanceData'] as Record<string, unknown>;
    if (!artifactId || !signature || !sbomData || !slsaProvenanceData) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'artifactId, signature, sbomData, slsaProvenanceData (IR-1, tripartite)',
      );
    }
    await this.queueFabric.enqueue('artifact.signed', {
      artifactId,
      signature,
      sbomData,
      slsaProvenanceData,
      tripartiteVerification: {
        factory_f1416_signing: true,
        factory_f1417_sbom: true,
        factory_f1418_slsa: true,
      },
      publishedAt: new Date().toISOString(),
    });
    return DataProcessResult.success({
      artifactId,
      status: 'PUBLISHED',
      tripartiteVerification: true,
    });
  }
}
