// server/src/engine/service-registry/service-registry.service.ts
// Dynamic service registry — resolves service URLs from ES at integration config
// generation time. Replaces hardcoded localhost URLs in integrate.handler.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-1: uses Record<string, unknown>
// Rule 1: uses fabric interface IDatabaseService

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface ServiceRegistryEntry {
  serviceId: string;
  environment: string;
  url: string;
  healthEndpoint: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  registeredAt: string;
}

@Injectable()
export class ServiceRegistryService {
  private readonly logger = new Logger(ServiceRegistryService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async register(
    serviceId: string,
    environment: string,
    url: string,
    healthEndpoint = '/health',
  ): Promise<DataProcessResult<void>> {
    const doc: ServiceRegistryEntry = {
      serviceId,
      environment,
      url,
      healthEndpoint,
      status: 'UP',
      registeredAt: new Date().toISOString(),
    };
    const result = await this.db.storeDocument(
      ES_INDEX.SERVICE_REGISTRY,
      doc as unknown as Record<string, unknown>,
      `${serviceId}:${environment}`,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'STORE_FAILED',
        result.errorMessage ?? 'Failed to register service',
      );
    }
    return DataProcessResult.success(undefined);
  }

  async resolve(serviceId: string, environment: string): Promise<DataProcessResult<string>> {
    const results = await this.db.searchDocuments(ES_INDEX.SERVICE_REGISTRY, {
      serviceId,
      environment,
      status: 'UP',
    });
    if (!results.isSuccess || !results.data || results.data.length === 0) {
      return DataProcessResult.failure(
        'SERVICE_NOT_FOUND',
        `Service '${serviceId}' not registered for environment '${environment}'. ` +
          `Register via POST /api/service-registry before generating integration config. ` +
          `Integration config will be flagged as UNRESOLVED until registered.`,
      );
    }
    return DataProcessResult.success(results.data[0]['url'] as string);
  }
}
