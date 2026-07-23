// T575 BundleActivationOrchestrator [ORCHESTRATION]
//
// Integration core — orchestrates full bundle activation by:
//   1. Verifying validation report is valid (from T574 BundleValidator)
//   2. Calling DRY_RUN BEFORE FULL on each requiredFlow (CF-826)
//   3. Pre-populating FREEDOM config (ADDITIVE only — CF-827)
//   4. Storing activation record BEFORE emitting BundleActivated (DNA-8)
//
// Iron rules:
//   - Validation report MUST be valid before any provisioning starts (CF-824)
//   - DRY_RUN MUST precede FULL on every flow activation (CF-826)
//   - FREEDOM config pre-population is additive — never overwrite existing values (CF-828)
//   - storeDocument BEFORE enqueue on all state transitions (DNA-8)
//   - DataProcessResult<T> — never throw (DNA-3)
//
// Factories:
//   F1499: IBundleRegistryService (DATABASE FABRIC) — bundle + activation CRUD
//   F1500: IBundleActivationService (QUEUE FABRIC) — progress + BundleActivated events
//   F1501: IBundleStatusService (FLOW_ENGINE FABRIC) — bootstrapFlow(DRY_RUN/FULL)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IFlowOrchestratorService {
  bootstrapFlow(
    flowId: string,
    options: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; errorMessage?: string }>;
}

export interface ActivationRecord {
  bundleId: string;
  activatedAt: string;
  flowVersionsAtActivation: Record<string, string>;
  requiredFlowsActivated: string[];
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-00
 * @portability MOBILE - no ClsService, bundle activation through fabric interfaces
 * @className BundleActivationOrchestratorService
 */
@Injectable()
export class BundleActivationOrchestratorService extends MicroserviceBase {
  constructor(
    /** F1499: IBundleRegistryService — DATABASE FABRIC */
    private readonly dbFabric: IDatabaseService,
    /** F1500: IBundleActivationService — QUEUE FABRIC */
    private readonly queueFabric: IQueueService,
    /** F1501: IBundleStatusService — FLOW_ENGINE FABRIC (bootstrapFlow) */
    private readonly flowOrchestrator: IFlowOrchestratorService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T575',
        serviceName: 'BundleActivationOrchestratorService',
        flowId: 'FLOW-00',
      }),
    });
  }

  async activateBundle(
    bundleId: string,
    validationReport: Record<string, unknown>,
  ): Promise<DataProcessResult<ActivationRecord>> {
    if (!bundleId) {
      return DataProcessResult.failure('MISSING_BUNDLE_ID', 'bundleId is required');
    }

    // CF-824: Validation report must be valid
    if (!validationReport.valid) {
      return DataProcessResult.failure(
        'INVALID_BUNDLE',
        'Bundle failed validation — cannot activate',
      );
    }

    const requiredFlows: string[] = (validationReport.requiredFlows as string[]) ?? [];

    if (requiredFlows.length === 0) {
      return DataProcessResult.failure(
        'NO_REQUIRED_FLOWS',
        'No requiredFlows in validation report',
      );
    }

    // Fetch bundle manifest (for FREEDOM config and metadata)
    const bundleResult = await this.dbFabric.searchDocuments('solution-bundles', { bundleId });
    if (!bundleResult.isSuccess || (bundleResult.data as unknown[]).length === 0) {
      return DataProcessResult.failure('BUNDLE_NOT_FOUND', `Bundle ${bundleId} not found`);
    }
    const bundle = (bundleResult.data as Record<string, unknown>[])[0];

    const flowVersionsAtActivation: Record<string, string> = {};
    const activatedFlows: string[] = [];

    // Activate flows in dependency order (FLOW-01 always first)
    const orderedFlows = this.orderByDependency(requiredFlows);

    for (const flowId of orderedFlows) {
      // CF-826: DRY_RUN BEFORE FULL — mandatory
      const dryRunResult = await this.flowOrchestrator.bootstrapFlow(flowId, { mode: 'DRY_RUN' });
      if (!dryRunResult.isSuccess) {
        return DataProcessResult.failure(
          'DRY_RUN_FAILED',
          `DRY_RUN failed for ${flowId}: ${dryRunResult.errorMessage ?? 'unknown error'}`,
        );
      }

      const fullResult = await this.flowOrchestrator.bootstrapFlow(flowId, { mode: 'FULL' });
      if (!fullResult.isSuccess) {
        return DataProcessResult.failure(
          'ACTIVATION_FAILED',
          `Full activation failed for ${flowId}: ${fullResult.errorMessage ?? 'unknown error'}`,
        );
      }

      // Record promoted version
      const versionResult = await this.dbFabric.searchDocuments('flow-lifecycle', { flowId });
      flowVersionsAtActivation[flowId] =
        ((versionResult.data as Record<string, unknown>[])[0]?.version as string) ?? 'v1';

      // Update flow-lifecycle for this tenant (DNA-8: storeDocument before enqueue)
      await this.dbFabric.storeDocument(
        'flow-lifecycle',
        {
          flowId,
          status: 'ACTIVE',
          activatedAt: new Date().toISOString(),
          version: flowVersionsAtActivation[flowId],
        } as unknown as Record<string, unknown>,
        `${flowId}::tenant`,
      );

      activatedFlows.push(flowId);

      // Emit per-flow progress (AFTER storeDocument — DNA-8)
      await this.queueFabric.enqueue('bundle-activation.flow-activation-progress', {
        bundleId,
        flowId,
        flowsActivated: activatedFlows.length,
        flowsTotal: requiredFlows.length,
      });
    }

    // CF-828: Pre-populate FREEDOM config (ADDITIVE only — never overwrite)
    const defaultFreedomConfig = (bundle.defaultFreedomConfig as Record<string, unknown>) ?? {};
    await this.populateFreedomConfig(defaultFreedomConfig);

    // DNA-8: storeDocument activation record BEFORE emitting BundleActivated
    const activationRecord: ActivationRecord = {
      bundleId,
      activatedAt: new Date().toISOString(),
      flowVersionsAtActivation,
      requiredFlowsActivated: activatedFlows,
    };

    const stored = await this.dbFabric.storeDocument(
      'bundle-activations',
      activationRecord as unknown as Record<string, unknown>,
      bundleId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORE_FAILED',
        `Failed to store activation record: ${stored.errorMessage}`,
      );
    }

    // Emit BundleActivated (AFTER storeDocument — DNA-8)
    await this.queueFabric.enqueue('bundle-activation.bundle-activated', {
      ...activationRecord,
    });

    return DataProcessResult.success(activationRecord);
  }

  /** ADDITIVE FREEDOM config — only set keys that don't already exist (CF-827) */
  private async populateFreedomConfig(defaultConfig: Record<string, unknown>): Promise<void> {
    if (Object.keys(defaultConfig).length === 0) return;

    const existingResult = await this.dbFabric.searchDocuments('freedom-config', {});
    const existingConfig = (existingResult.data as Record<string, unknown>[])[0] ?? {};
    const existingKeys = new Set(Object.keys(existingConfig));

    const toSet: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(defaultConfig)) {
      if (!existingKeys.has(key)) {
        toSet[key] = value;
      }
    }

    if (Object.keys(toSet).length > 0) {
      await this.dbFabric.storeDocument(
        'freedom-config',
        toSet as unknown as Record<string, unknown>,
        'defaults',
      );
    }
  }

  /** FLOW-01 always first; others in numeric order */
  orderByDependency(flowIds: string[]): string[] {
    return [...flowIds].sort((a, b) => {
      if (a === 'FLOW-01') return -1;
      if (b === 'FLOW-01') return 1;
      const numA = parseInt(a.replace('FLOW-', ''), 10);
      const numB = parseInt(b.replace('FLOW-', ''), 10);
      return isNaN(numA) || isNaN(numB) ? 0 : numA - numB;
    });
  }
}
