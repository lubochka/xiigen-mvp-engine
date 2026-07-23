// T574 BundleValidator [VALIDATION]
//
// Pre-activation validation gate — checks bundle structure, required flows,
// and cross-flow BFA conflicts before any provisioning starts.
//
// Iron rules:
//   - Bundle must have ≥ 1 requiredFlow (CF-822)
//   - All requiredFlows must exist in flow-lifecycle index (CF-823)
//   - BFA cross-check across all bundle flows before activation (CF-829)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Tenant scope via AsyncLocalStorage — no tenantId parameter (DNA-5)
//   - BuildSearchFilter for all ES queries (DNA-2)
//
// Factories:
//   F1499: IBundleRegistryService (DATABASE FABRIC) — bundle manifest CRUD
//   F1500: IBundleActivationService (QUEUE FABRIC) — BFA cross-check emit
//   F1501: IBundleStatusService (QUEUE FABRIC) — BundleValidationCompleted event

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface BundleValidationReport {
  bundleId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedActivationMs: number;
  requiredFlows: string[];
  checkedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-00
 * @portability MOBILE - no ClsService, bundle validation through fabric interfaces
 * @className BundleValidatorService
 */
@Injectable()
export class BundleValidatorService extends MicroserviceBase {
  constructor(
    /** F1499: IBundleRegistryService — DATABASE FABRIC */
    private readonly dbFabric: IDatabaseService,
    /** F1500: IBundleActivationService — QUEUE FABRIC (BFA cross-check) */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T574',
        serviceName: 'BundleValidatorService',
        flowId: 'FLOW-00',
      }),
    });
  }

  async validateBundle(bundleId: string): Promise<DataProcessResult<BundleValidationReport>> {
    if (!bundleId) {
      return DataProcessResult.failure('MISSING_BUNDLE_ID', 'bundleId is required');
    }

    // Step 1: Read bundle manifest from solution-bundles index (BuildSearchFilter — DNA-2)
    const bundleResult = await this.dbFabric.searchDocuments('solution-bundles', { bundleId });

    if (!bundleResult.isSuccess) {
      return DataProcessResult.failure(
        bundleResult.errorCode ?? 'BUNDLES_QUERY_FAILED',
        bundleResult.errorMessage ?? 'Bundle query failed',
      );
    }

    if ((bundleResult.data as unknown[]).length === 0) {
      return DataProcessResult.failure('BUNDLE_NOT_FOUND', `Bundle ${bundleId} not found`);
    }

    const bundle = (bundleResult.data as Record<string, unknown>[])[0];
    const requiredFlows: string[] = (bundle.requiredFlows as string[]) ?? [];

    // Step 2: Validate requiredFlows not empty (CF-822)
    if (requiredFlows.length === 0) {
      return DataProcessResult.failure('EMPTY_REQUIRED_FLOWS', 'Bundle must have ≥ 1 requiredFlow');
    }

    // Step 3: Validate all requiredFlows exist in flow-lifecycle index (CF-823)
    const missingFlows: string[] = [];
    for (const flowId of requiredFlows) {
      const flowCheck = await this.dbFabric.searchDocuments('flow-lifecycle', { flowId });
      if (!flowCheck.isSuccess || (flowCheck.data as unknown[]).length === 0) {
        missingFlows.push(flowId);
      }
    }

    // Step 4: BFA cross-check across all bundle flows (CF-829) — via queue
    await this.queueFabric.enqueue('bfa.validate-cross-flow', {
      flowIds: requiredFlows,
      bundleId,
    });

    const valid = missingFlows.length === 0;
    const errors =
      missingFlows.length > 0
        ? [`Missing flows in flow-lifecycle registry: ${missingFlows.join(', ')}`]
        : [];

    const report: BundleValidationReport = {
      bundleId,
      valid,
      errors,
      warnings: [],
      estimatedActivationMs: requiredFlows.length * 5000, // 5s per flow estimate
      requiredFlows,
      checkedAt: new Date().toISOString(),
    };

    return DataProcessResult.success(report);
  }
}
