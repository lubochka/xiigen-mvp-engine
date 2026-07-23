/**
 * VisualFlowEngineController — FLOW-18 thin HTTP routes.
 *
 * Introduced by Track 0 Turn 15. Wires T617-T620 services to 4 POST endpoints.
 *
 * Routes:
 *   POST /api/visual-flow/canvas       → FlowCanvasWriterService.writeCanvas (T617)
 *   POST /api/visual-flow/publish      → FlowPublicationOrchestratorService.publishFlow (T618)
 *   POST /api/visual-flow/node-types   → NodeTypeRegistrarService.registerNodeType (T619)
 *   POST /api/visual-flow/inject-code  → CodeInjectionProcessorService.processInjection (T620)
 *
 * Registered in server/src/api/api.module.ts (v13 Finding Q + v22 Finding CC).
 *
 * Index reconciliation ADR (v13 Finding Q + v22 Finding B resolution):
 *   T617 writes to `xiigen-flow-canvases`. `TopologyController` bridge (Turn 7)
 *   reads PRIVATE flows from `xiigen-tenant-topologies`. Without reconciliation,
 *   canvas-created flows are invisible to FlowLibraryPage / TopologyViewer.
 *
 *   Decision (option b): Turn 15 does NOT modify T617. The reconciliation is
 *   documented here as a known MVP limitation; a future track will extend the
 *   T0.6 bridge in TopologyController to add `xiigen-flow-canvases` as a third
 *   fallback after `xiigen-tenant-topologies` and `xiigen-flow-definitions`.
 *   Option (b) preserves T617's BOLA/OCC guards unchanged. Option (a) — dual-
 *   write from T617 — was rejected because migrating BOLA/OCC to a second
 *   index is higher blast radius than extending the bridge. Lock date: 2026-04-15.
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { FlowCanvasWriterService } from '../engine/flows/visual-flow-engine/flow-canvas-writer.service';
import { FlowPublicationOrchestratorService } from '../engine/flows/visual-flow-engine/flow-publication-orchestrator.service';
import { NodeTypeRegistrarService } from '../engine/flows/visual-flow-engine/node-type-registrar.service';
import { CodeInjectionProcessorService } from '../engine/flows/visual-flow-engine/code-injection-processor.service';

@Controller('api/visual-flow')
export class VisualFlowEngineController {
  constructor(
    private readonly canvasWriter: FlowCanvasWriterService,
    private readonly publisher: FlowPublicationOrchestratorService,
    private readonly nodeTypeRegistrar: NodeTypeRegistrarService,
    private readonly injector: CodeInjectionProcessorService,
  ) {}

  @Post('canvas')
  @HttpCode(HttpStatus.OK)
  async canvas(@Body() body: Record<string, unknown>) {
    return this.toResponse(await this.canvasWriter.writeCanvas(body));
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Body() body: Record<string, unknown>) {
    return this.toResponse(await this.publisher.publishFlow(body));
  }

  @Post('node-types')
  @HttpCode(HttpStatus.OK)
  async nodeTypes(@Body() body: Record<string, unknown>) {
    return this.toResponse(await this.nodeTypeRegistrar.registerNodeType(body));
  }

  @Post('inject-code')
  @HttpCode(HttpStatus.OK)
  async injectCode(@Body() body: Record<string, unknown>) {
    return this.toResponse(await this.injector.processInjection(body));
  }

  private toResponse<T>(result: DataProcessResult<T>) {
    if (!result.isSuccess) {
      return {
        error: result.errorMessage ?? 'operation failed',
        code: result.errorCode ?? 'UNKNOWN_ERROR',
      };
    }
    return result.data;
  }
}
