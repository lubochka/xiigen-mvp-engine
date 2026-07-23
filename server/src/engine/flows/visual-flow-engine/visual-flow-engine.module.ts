/**
 * VisualFlowEngineModule — provides T617-T620 visual-flow services.
 *
 * Introduced by Track 0 Turn 15 (v13 Finding Q + v22 Finding CC).
 *
 * Until Turn 15 these services existed as standalone @Injectable() classes
 * with no module registration and no HTTP routes. This module brings them
 * together so VisualFlowEngineController can inject them via ApiModule →
 * InfrastructureModule → VisualFlowEngineModule chain.
 */

import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { FlowCanvasWriterService } from './flow-canvas-writer.service';
import { FlowPublicationOrchestratorService } from './flow-publication-orchestrator.service';
import { NodeTypeRegistrarService } from './node-type-registrar.service';
import { CodeInjectionProcessorService } from './code-injection-processor.service';

@Module({
  imports: [FabricsModule],
  providers: [
    FlowCanvasWriterService,
    FlowPublicationOrchestratorService,
    NodeTypeRegistrarService,
    CodeInjectionProcessorService,
  ],
  exports: [
    FlowCanvasWriterService,
    FlowPublicationOrchestratorService,
    NodeTypeRegistrarService,
    CodeInjectionProcessorService,
  ],
})
export class VisualFlowEngineModule {}
