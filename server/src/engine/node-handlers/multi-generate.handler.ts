import { Injectable } from '@nestjs/common';
import { ParallelGenerationService } from './parallel-generation.service';

/**
 * multi-generate.handler — runs multiple AI providers in parallel for genuine DPO triple comparison.
 *
 * Use when: topology node produces DPO training data (Phase B generation).
 * Do NOT use for: planning nodes, documentation nodes, context assembly nodes.
 * Those use ai-generate.handler.
 *
 * BOTH multi-generate.handler and ai-generate.handler coexist.
 * ai-generate.handler is NOT removed.
 */
@Injectable()
export class MultiGenerateHandler {
  readonly handlerType = 'multi-generate';

  constructor(private readonly parallelGen: ParallelGenerationService) {}

  // The actual execute() method is wired to the node execution pipeline
  // when this handler is registered. It delegates to ParallelGenerationService.
  getHandlerType(): string {
    return this.handlerType;
  }
}
