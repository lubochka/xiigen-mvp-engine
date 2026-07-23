/**
 * BootstrapCrossLayerCurriculumRouter — ICrossLayerCurriculumRouter bootstrap implementation.
 *
 * Explicit no-op in bootstrap mode.
 * Both route methods log 'CrossLayerCurriculumRouter: no-op in bootstrap mode' and return.
 *
 * The cross-layer curriculum router is wired in Phase 4 when AI-driven co-training
 * between planning and code-gen layers is active.
 *
 * Phase 2: no-op implementation.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ICrossLayerCurriculumRouter } from './planning-abstracts';

@Injectable()
export class BootstrapCrossLayerCurriculumRouter extends ICrossLayerCurriculumRouter {
  private readonly logger = new Logger(BootstrapCrossLayerCurriculumRouter.name);

  async routePlanningToCodeGen(_triple: unknown): Promise<void> {
    this.logger.debug('CrossLayerCurriculumRouter: no-op in bootstrap mode');
  }

  async routeCodeGenBlockToPlanning(_blockEvent: {
    checkId: string;
    archetype: string;
    arbiterRole: string;
    runId: string;
  }): Promise<void> {
    this.logger.debug('CrossLayerCurriculumRouter: no-op in bootstrap mode');
  }
}
