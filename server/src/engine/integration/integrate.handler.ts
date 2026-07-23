// server/src/engine/integration/integrate.handler.ts
// Generates integration config with dynamic service registry lookups.
// Replaces hardcoded localhost URLs — unregistered services are marked UNRESOLVED
// (explicit, not silent failure).
//
// DNA-3: returns DataProcessResult, never throws
// Rule 11: no direct HTTP between services — uses service registry

import { Injectable, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ServiceRegistryService } from '../service-registry/service-registry.service';

export interface CrossFlowDep {
  targetFlow: string;
  eventType: string;
}

export interface IntegrationConfig {
  flowId: string;
  environment: string;
  serviceUrls: Record<string, string>;
  unresolvedServices: string[];
  generatedAt: string;
}

@Injectable()
export class IntegrateHandler {
  private readonly logger = new Logger(IntegrateHandler.name);
  private readonly environment = process.env['DEPLOYMENT_ENVIRONMENT'] ?? 'development';

  constructor(private readonly serviceRegistry: ServiceRegistryService) {}

  async generateIntegrationConfig(
    flowId: string,
    crossFlowDeps: CrossFlowDep[],
  ): Promise<DataProcessResult<IntegrationConfig>> {
    const resolvedUrls: Record<string, string> = {};
    const unresolvedServices: string[] = [];

    for (const dep of crossFlowDeps) {
      const urlResult = await this.serviceRegistry.resolve(dep.targetFlow, this.environment);
      if (!urlResult.isSuccess) {
        this.logger.warn(
          `Service ${dep.targetFlow} not in registry for ${this.environment}. Marking UNRESOLVED.`,
        );
        unresolvedServices.push(dep.targetFlow);
        resolvedUrls[dep.targetFlow] = 'UNRESOLVED'; // explicit, not localhost
      } else {
        resolvedUrls[dep.targetFlow] = urlResult.data!;
      }
    }

    if (unresolvedServices.length > 0) {
      // Return partial success with explicit UNRESOLVED marker — not silent failure
      this.logger.error(
        `Integration config has UNRESOLVED services: ${unresolvedServices.join(', ')}. ` +
          `Register these services before deploying.`,
      );
    }

    return DataProcessResult.success({
      flowId,
      environment: this.environment,
      serviceUrls: resolvedUrls,
      unresolvedServices,
      generatedAt: new Date().toISOString(),
    });
  }
}
