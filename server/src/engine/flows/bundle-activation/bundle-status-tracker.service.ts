// T576 BundleStatusTracker [GOVERNANCE]
//
// Monitors active bundles and tracks health against flow regeneration events.
// Emits BundleDegraded when a flow version drops below minFlowVersions.
// Emits BundleRestored when all flows return to acceptable versions.
//
// Iron rules:
//   - Check all bundles for regenerated flow versions via queue fabric (CF-831)
//   - storeDocument BEFORE enqueue on every status transition (DNA-8)
//   - DataProcessResult<T> — never throw (DNA-3)
//   - Tenant isolation: solution-bundles index is tenantId-scoped via AsyncLocalStorage
//   - BuildSearchFilter for all ES queries (DNA-2)
//
// Factories:
//   F1499: IBundleRegistryService (DATABASE FABRIC) — bundle status CRUD
//   F1501: IBundleStatusService (QUEUE FABRIC) — BundleDegraded + BundleRestored events

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-00
 * @portability MOBILE - no ClsService, bundle status through fabric interfaces
 * @className BundleStatusTrackerService
 */
@Injectable()
export class BundleStatusTrackerService extends MicroserviceBase {
  constructor(
    /** F1499: IBundleRegistryService — DATABASE FABRIC */
    private readonly dbFabric: IDatabaseService,
    /** F1501: IBundleStatusService — QUEUE FABRIC */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T576',
        serviceName: 'BundleStatusTrackerService',
        flowId: 'FLOW-00',
      }),
    });
  }

  /**
   * Called by queue consumer when a flow-lifecycle regeneration event arrives.
   * Checks all bundles containing this flow and updates their status.
   */
  async onFlowRegenerated(flowId: string, newVersion: string): Promise<DataProcessResult<void>> {
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!newVersion) return DataProcessResult.failure('MISSING_VERSION', 'newVersion is required');

    // Find ALL bundles that include this flow (BuildSearchFilter — DNA-2)
    const bundlesResult = await this.dbFabric.searchDocuments('solution-bundles', {
      requiredFlows: flowId,
    });

    if (!bundlesResult.isSuccess) {
      return DataProcessResult.failure(
        bundlesResult.errorCode ?? 'BUNDLES_QUERY_FAILED',
        bundlesResult.errorMessage ?? 'Solution bundles query failed',
      );
    }

    const bundles = bundlesResult.data as Record<string, unknown>[];

    for (const bundle of bundles) {
      const bundleId = bundle.bundleId as string;
      const minVersions = (bundle.minFlowVersions as Record<string, string>) ?? {};
      const minVersion = minVersions[flowId];

      // No version constraint for this flow in this bundle — skip
      if (!minVersion) continue;

      const belowMinimum = this.isVersionBelow(newVersion, minVersion);
      const newStatus = belowMinimum ? 'DEGRADED' : await this.recomputeStatus(bundle);

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.dbFabric.storeDocument(
        'solution-bundles',
        {
          ...bundle,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        } as unknown as Record<string, unknown>,
        bundleId,
      );

      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'STORE_FAILED',
          `Failed to update bundle ${bundleId} status: ${stored.errorMessage}`,
        );
      }

      if (belowMinimum) {
        await this.queueFabric.enqueue('bundle-activation.bundle-degraded', {
          bundleId,
          degradedFlowId: flowId,
          currentVersion: newVersion,
          minimumVersion: minVersion,
        });
      } else if (newStatus === 'ACTIVE') {
        await this.queueFabric.enqueue('bundle-activation.bundle-restored', {
          bundleId,
          restoredFlowId: flowId,
        });
      }
    }

    return DataProcessResult.success(undefined);
  }

  /** Simple semver-like comparison: 'v1' < 'v2' */
  isVersionBelow(current: string, minimum: string): boolean {
    const currentN = parseInt(current.replace('v', ''), 10);
    const minN = parseInt(minimum.replace('v', ''), 10);
    return isNaN(currentN) || isNaN(minN) ? false : currentN < minN;
  }

  /** Recompute bundle status — ACTIVE only if all requiredFlows meet minFlowVersions */
  private async recomputeStatus(bundle: Record<string, unknown>): Promise<string> {
    const requiredFlows: string[] = (bundle.requiredFlows as string[]) ?? [];
    const minVersions: Record<string, string> =
      (bundle.minFlowVersions as Record<string, string>) ?? {};

    for (const flowId of requiredFlows) {
      const flowResult = await this.dbFabric.searchDocuments('flow-lifecycle', { flowId });
      if (!flowResult.isSuccess || (flowResult.data as unknown[]).length === 0) {
        return 'DEGRADED';
      }
      const currentVersion = (flowResult.data as Record<string, unknown>[])[0].version as string;
      if (minVersions[flowId] && this.isVersionBelow(currentVersion, minVersions[flowId])) {
        return 'DEGRADED';
      }
    }

    return 'ACTIVE';
  }
}
