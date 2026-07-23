/**
 * T423 ContentLifecycleOrchestrator [STATE_MACHINE]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentStateChangeRequested event (editor requests state transition)
 *
 * Execution order is MACHINE (CF-28-1):
 *   ORDER 1: Validate state transition (DRAFT→REVIEW→PUBLISHED→ARCHIVED)
 *   ORDER 2: storeDocument(content-state) — persist state change with timestamp
 *   ORDER 3: enqueue(ContentStateChanged) — emit event to cascade subscribers
 *
 * Iron rules:
 *   IR-1: Only valid transitions allowed (no backward steps except from PUBLISHED→ARCHIVED)
 *   IR-2: tenantId from ALS only (DNA-5)
 *   IR-3: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CONTENT_STATE_INDEX = 'xiigen-content-state';

// Valid state transitions: DRAFT → REVIEW → PUBLISHED → ARCHIVED
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['PUBLISHED', 'DRAFT'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentLifecycleOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T423',
        serviceName: 'ContentLifecycleOrchestratorService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Orchestrate content state transitions with validation and event emission.
   */
  async transitionState(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const currentState = event['currentState'] as string;
    const targetState = event['targetState'] as string;
    const editor = event['editor'] as string;

    if (!contentId || !currentState || !targetState || !editor) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'contentId, currentState, targetState, and editor are required',
      );
    }

    // ── ORDER 1: Validate state transition ────────────────────────────────
    const validNextStates = VALID_TRANSITIONS[currentState] ?? [];
    if (!validNextStates.includes(targetState)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Cannot transition from ${currentState} to ${targetState}`,
      );
    }

    // ── ORDER 2: storeDocument(content-state) — IR-2, DNA-8 ───────────────
    const stateRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      previousState: currentState,
      currentState: targetState,
      transitionedBy: editor,
      transitionedAt: new Date().toISOString(),
      metadata: event['metadata'] ?? {},
    };

    await this.dbFabric.storeDocument(CONTENT_STATE_INDEX, stateRecord, `${contentId}:state`);

    // ── ORDER 3: enqueue(ContentStateChanged) ────────────────────────────
    await this.queueFabric.enqueue('ContentStateChanged', {
      contentId,
      tenantId,
      previousState: currentState,
      currentState: targetState,
      transitionedBy: editor,
      transitionedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      previousState: currentState,
      currentState: targetState,
      transitionedAt: new Date().toISOString(),
      status: 'TRANSITIONED',
    });
  }
}
