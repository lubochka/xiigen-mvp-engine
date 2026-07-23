// server/src/engine/adapters/performance-metadata-generator.service.ts
// Generates performance arbiter metadata for adapters.
//
// DNA-3: returns DataProcessResult, never throws
// Rule 14: reads all thresholds from FREEDOM config (not hardcoded)

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';

export interface PerformanceArbiterMetadata {
  maxLatencyMs: number;
  throughputRPS: number;
  circuitBreakerConfig: { thresholdPercent: number; halfOpenAfterMs: number };
  retryPolicy: { maxAttempts: number; backoffMs: number };
}

@Injectable()
export class PerformanceMetadataGeneratorService {
  private readonly logger = new Logger(PerformanceMetadataGeneratorService.name);

  constructor(
    @Inject(FREEDOM_CONFIG_SERVICE) private readonly freedomConfig: IFreedomConfigService,
  ) {}

  async generate(
    adapterTaskTypeId: string,
  ): Promise<DataProcessResult<PerformanceArbiterMetadata>> {
    const configKey = `adapter.${adapterTaskTypeId}.performance`;
    const config = await this.freedomConfig.get(configKey);
    // Use FREEDOM config if present; fall back to conservative defaults
    return DataProcessResult.success({
      maxLatencyMs: (config?.['maxLatencyMs'] as number) ?? 1000,
      throughputRPS: (config?.['throughputRPS'] as number) ?? 100,
      circuitBreakerConfig: {
        thresholdPercent: (config?.['circuitBreakerThreshold'] as number) ?? 50,
        halfOpenAfterMs: (config?.['circuitBreakerHalfOpenMs'] as number) ?? 30000,
      },
      retryPolicy: {
        maxAttempts: (config?.['retryMaxAttempts'] as number) ?? 3,
        backoffMs: (config?.['retryBackoffMs'] as number) ?? 500,
      },
    });
  }
}
