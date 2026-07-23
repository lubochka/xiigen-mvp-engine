/**
 * T521 ArtifactNotarizer [ATTESTATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_NOTARIZATIONS_INDEX = 'xiigen-marketplace-notarizations';

@Injectable()
export class ArtifactNotarizerService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T521',
        serviceName: 'ArtifactNotarizerService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async notarizeArtifact(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const artifactId = input['artifactId'] as string;
    const publisherId = input['publisherId'] as string;
    const certificateHash = input['certificateHash'] as string;
    if (!artifactId || !publisherId || !certificateHash) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'artifactId, publisherId, certificateHash required',
      );
    }
    if (publisherId.length === 0) {
      return DataProcessResult.failure(
        'INVALID_PUBLISHER',
        'Publisher identity verification failed (IR-2)',
      );
    }
    const notarizationId = `not-${artifactId}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    await this.dbFabric.storeDocument(
      MARKETPLACE_NOTARIZATIONS_INDEX,
      {
        notarizationId,
        artifactId,
        publisherId,
        certificateHash,
        timestamp,
        notarizedAt: timestamp,
      },
      notarizationId,
    );
    return DataProcessResult.success({
      artifactId,
      notarizationId,
      publisherId,
      timestamp,
      status: 'NOTARIZED',
    });
  }
}
