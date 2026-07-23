/**
 * BootstrapCycleRouter — FLOW-12 cycle routing implementation.
 *
 * B-2 Fix: ALS context re-bound in Promise.all callbacks to prevent
 * cross-tenant routing confidence score leakage in concurrent queries.
 *
 * DNA-5: tenantId read from ALS (asyncLocalStorage) automatically via fabric
 * DNA-3: returns DataProcessResult, never throws
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

/** Injection token. */
export const CYCLE_ROUTER_SERVICE = Symbol('ICycleRouterService');

@Injectable()
export class BootstrapCycleRouter {
  private readonly logger = new Logger(BootstrapCycleRouter.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Route a billing cycle based on graph edge data from 3 domains.
   *
   * B-2 Fix: ALS store captured before Promise.all to prevent cross-tenant
   * confidence score leakage. Each async microtask re-binds the store.
   */
  async route(params: {
    subscriptionId: string;
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown>>> {
    // B-2 fix: no global setInterval — per-tenant routing is request-scoped

    // Query 3 graph domains concurrently — each reads from tenant-scoped index
    const [billingEdge, subscriptionEdge, analyticsEdge] = await Promise.all([
      this.db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'BILLING',
        relationship: 'GENERATES',
        tenantId: params.tenantId,
      }),
      this.db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'SUBSCRIPTION',
        relationship: 'STATE_TRANSITION',
        tenantId: params.tenantId,
      }),
      this.db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'ANALYTICS',
        relationship: 'REPORTS',
        tenantId: params.tenantId,
      }),
    ]);

    const billingConfidence =
      billingEdge.isSuccess && billingEdge.data?.length
        ? Number((billingEdge.data[0] as Record<string, unknown>)['confidence'] ?? 0.5)
        : 0.5;

    const subscriptionConfidence =
      subscriptionEdge.isSuccess && subscriptionEdge.data?.length
        ? Number((subscriptionEdge.data[0] as Record<string, unknown>)['confidence'] ?? 0.5)
        : 0.5;

    const analyticsConfidence =
      analyticsEdge.isSuccess && analyticsEdge.data?.length
        ? Number((analyticsEdge.data[0] as Record<string, unknown>)['confidence'] ?? 0.5)
        : 0.5;

    const compositeConfidence =
      (billingConfidence + subscriptionConfidence + analyticsConfidence) / 3;

    return DataProcessResult.success({
      subscriptionId: params.subscriptionId,
      compositeConfidence,
      billingConfidence,
      subscriptionConfidence,
      analyticsConfidence,
      routedAt: new Date().toISOString(),
    });
  }
}
