/**
 * T617 FlowCanvasWriter [VISUAL_CREATION]
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Entry: FlowCanvasUpdateRequested event (user edits a visual flow canvas)
 *
 * Execution order is MACHINE (CF-18-1):
 *   ORDER 1: BOLA check — flow.tenantId === ALS.tenantId
 *   ORDER 2: FLOW_IMMUTABLE guard — flow.status !== PUBLISHED
 *   ORDER 3: Canvas write — storeDocument or updateDocument (DRAFT only)
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(FlowCanvasUpdated) — only after all guards pass
 *
 * Iron rules:
 *   IR-1: BOLA at ORDER 1 before any state check — cross-tenant canvas hijacking rejected (CF-18-1)
 *   IR-2: FLOW_IMMUTABLE at ORDER 2 — published flows cannot be modified (CF-18-1)
 *   IR-3: Canvas write at ORDER 3 — only if DRAFT state confirmed (CF-18-1)
 *   IR-4: storeDocument(audit) at ORDER 4 BEFORE enqueue(FlowCanvasUpdated) (DNA-8)
 *   IR-5: FlowImmutableRejected emitted on published flow write attempt
 *
 * Pattern reference: DRAFT-BEFORE-PUBLISH-GATE-001
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const FLOW_CANVAS_INDEX = 'xiigen-flow-canvases';
const CANVAS_AUDIT_INDEX = 'xiigen-canvas-audit';

/** MACHINE: States where a flow cannot be modified — compile-time constant. CF-18-1. */
const FLOW_IMMUTABLE_STATES = ['PUBLISHED'] as const;

@Injectable()
export class FlowCanvasWriterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T617',
        serviceName: 'FlowCanvasWriterService',
        flowId: 'FLOW-18',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Two-guard canvas write gate.
   * DPO pattern: DRAFT-BEFORE-PUBLISH-GATE-001
   */
  async writeCanvas(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const flowId = event['flowId'] as string;
    const canvasData = event['canvasData'] as Record<string, unknown> | undefined;

    if (!flowId) {
      return DataProcessResult.failure('INVALID_INPUT', 'flowId is required');
    }

    // ── ORDER 1: BOLA check — IR-1, CF-18-1 ──────────────────────────────────
    // flow.tenantId must match ALS tenantId — no cross-tenant canvas hijacking
    const flowResult = await this.dbFabric.searchDocuments(FLOW_CANVAS_INDEX, { flowId });
    if (!flowResult.isSuccess || (flowResult.data ?? []).length === 0) {
      await this.queueFabric.enqueue('FlowCanvasUpdateFailed', {
        flowId,
        tenantId,
        reason: 'FLOW_NOT_FOUND',
      });
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow canvas not found: ${flowId}`);
    }

    const flow = flowResult.data![0] as Record<string, unknown>;
    const flowTenantId = flow['tenantId'] as string;

    if (flowTenantId !== tenantId) {
      await this.queueFabric.enqueue('FlowCanvasUpdateFailed', {
        flowId,
        tenantId,
        reason: 'BOLA_VIOLATION',
      });
      return DataProcessResult.failure('BOLA_VIOLATION', 'Tenant does not own this flow canvas');
    }

    // ── ORDER 2: FLOW_IMMUTABLE guard — IR-2, CF-18-1 ────────────────────────
    // Published flows cannot be modified — DRAFT→PUBLISHED is one-way
    const flowStatus = flow['status'] as string;
    if (FLOW_IMMUTABLE_STATES.includes(flowStatus as (typeof FLOW_IMMUTABLE_STATES)[number])) {
      await this.queueFabric.enqueue('FlowImmutableRejected', {
        flowId,
        tenantId,
        status: flowStatus,
      });
      return DataProcessResult.failure(
        'FLOW_IMMUTABLE',
        `Published flows cannot be modified. Status: ${flowStatus}`,
      );
    }

    const updatedAt = new Date().toISOString();

    // ── ORDER 3: Canvas write — IR-3 ─────────────────────────────────────────
    // Only permitted if flow is in DRAFT state
    await this.dbFabric.storeDocument(
      FLOW_CANVAS_INDEX,
      {
        ...flow,
        ...(canvasData ?? {}),
        flowId,
        tenantId,
        status: 'DRAFT',
        updatedAt,
        knowledgeScope: 'PRIVATE',
      },
      flowId,
    );

    // ── ORDER 4: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE enqueue(FlowCanvasUpdated)
    await this.dbFabric.storeDocument(CANVAS_AUDIT_INDEX, {
      flowId,
      tenantId,
      action: 'CANVAS_UPDATED',
      previousStatus: flowStatus,
      updatedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit FlowCanvasUpdated — IR-5 ──────────────────────────────
    await this.queueFabric.enqueue('FlowCanvasUpdated', {
      flowId,
      tenantId,
      updatedAt,
    });

    return DataProcessResult.success({
      flowId,
      tenantId,
      status: 'DRAFT',
      updatedAt,
    });
  }
}
