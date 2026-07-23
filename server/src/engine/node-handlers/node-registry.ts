/**
 * NodeRegistry — registers all node handlers and resolves them by nodeType.
 *
 * BLOCKING-1 fix: route.handler included as 7th handler (GAP-NEW-14).
 * All 7 handlers registered: rag-retrieve, decompose, ai-generate,
 * validate, score, feedback, route.
 *
 * Injectable — handlers are resolved via DI and registered at module init.
 */
import { Injectable, Logger } from '@nestjs/common';
import { INodeHandler } from './node-handler.types';
import { RagRetrieveHandler } from './rag-retrieve.handler';
import { DecomposeHandler } from './decompose.handler';
import { AiGenerateHandler } from './ai-generate.handler';
import { ValidateHandler } from './validate.handler';
import { ScoreHandler } from './score.handler';
import { FeedbackHandler } from './feedback.handler';
import { RouteHandler } from './route.handler';
import { PlannerHandler } from './planner.handler';
import { ConvergenceHandler } from './convergence.handler';
import { DepthDecisionHandler } from './depth-decision.handler';

@Injectable()
export class NodeRegistry {
  private readonly logger = new Logger(NodeRegistry.name);
  private readonly handlers = new Map<string, INodeHandler>();

  constructor(
    private readonly ragRetrieve: RagRetrieveHandler,
    private readonly decompose: DecomposeHandler,
    private readonly aiGenerate: AiGenerateHandler,
    private readonly validate: ValidateHandler,
    private readonly score: ScoreHandler,
    private readonly feedback: FeedbackHandler,
    private readonly route: RouteHandler,
    private readonly planner: PlannerHandler,
    private readonly convergence: ConvergenceHandler,
    private readonly depthDecision: DepthDecisionHandler,
  ) {
    this.register(ragRetrieve);
    this.register(decompose);
    this.register(aiGenerate);
    this.register(validate);
    this.register(score);
    this.register(feedback);
    this.register(route);
    this.register(planner);
    this.register(convergence);
    this.register(depthDecision);

    this.logger.log(
      `NodeRegistry initialized with ${this.handlers.size} handlers: ${this.getRegisteredTypes().join(', ')}`,
    );
  }

  private register(handler: INodeHandler): void {
    this.handlers.set(handler.nodeType, handler);
  }

  /** Resolve a handler by nodeType. Returns undefined for unknown types. */
  resolve(nodeType: string): INodeHandler | undefined {
    return this.handlers.get(nodeType);
  }

  /** Get all registered node type names. */
  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /** Check if a nodeType is registered. */
  has(nodeType: string): boolean {
    return this.handlers.has(nodeType);
  }
}
