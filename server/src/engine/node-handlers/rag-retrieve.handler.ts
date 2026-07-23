/**
 * rag-retrieve.handler — Node handler for RAG context retrieval.
 *
 * A-3: Uses IRagService.search() with a semantic query string.
 * Previously queried IDatabaseService directly with field filters — bypassing the
 * RAG fabric entirely. IRagService routes to InMemoryRagProvider (keyword match)
 * or LightRagProvider (semantic graph) based on FREEDOM/env config.
 *
 * IDatabaseService retained as @Optional() fallback for tests without RAG fabric.
 *
 * DNA-1: outputs are Record<string, unknown>
 * DNA-3: returns DataProcessResult, never throws
 * DNA-4: Injectable (no extends MicroserviceBase needed for handlers)
 */
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IRagService, RAG_SERVICE } from '../../fabrics/interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';

@Injectable()
export class RagRetrieveHandler implements INodeHandler {
  readonly nodeType = 'rag-retrieve';
  private readonly logger = new Logger(RagRetrieveHandler.name);

  constructor(
    // A-3b: primary injection via RAG fabric — routes to semantic or keyword provider
    @Inject(RAG_SERVICE) private readonly rag: IRagService,
    // IDatabaseService retained as optional for backward-compat tests / direct pattern queries
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { taskTypeId, nodeConfig } = ctx;
    const namespace = (nodeConfig?.['namespace'] as string) ?? taskTypeId;
    const tags = (nodeConfig?.['tags'] as string[]) ?? [];

    this.logger.debug(`RAG retrieve: namespace=${namespace} tags=${tags.join(',')}`);

    // A-3b: Build semantic query from context — natural language drives embedding quality
    const semanticQuery =
      (nodeConfig?.['query'] as string) ??
      `${taskTypeId} ${(nodeConfig?.['archetype'] as string) ?? ''} service implementation patterns domain ${namespace}`;

    const result = await this.rag.search(semanticQuery, {
      namespace,
      filters: tags.length > 0 ? { tags } : undefined,
      topK: 20,
    });

    if (!result.isSuccess) {
      return DataProcessResult.failure(
        'RAG_RETRIEVE_FAILED',
        `RAG pattern search failed: ${result.errorMessage ?? 'unknown error'}`,
      );
    }

    // Post-retrieval noise reduction: filter by qualityScore when present (A-0)
    const patterns = (result.data ?? []).filter(
      (p) => p['qualityScore'] == null || (p['qualityScore'] as number) >= 0.5,
    );

    this.logger.debug(
      `RAG retrieve: found ${patterns.length} patterns (query="${semanticQuery.substring(0, 60)}...")`,
    );

    return DataProcessResult.success({
      data: {
        ragPatterns: patterns,
        namespace,
        patternCount: patterns.length,
      },
    });
  }
}
