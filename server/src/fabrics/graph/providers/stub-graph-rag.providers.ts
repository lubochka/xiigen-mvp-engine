/**
 * Stub providers for Phase 1.
 * These throw 'not implemented in Phase 1' — the factory switch in fabrics.module.ts
 * ensures they are never constructed unless engine.graphRag.provider explicitly selects them.
 * Implementations arrive in Phase 2+.
 */

import { IGraphRagService } from '../interfaces/i-graph-rag.service';
import { GraphQueryResult } from '../interfaces/graph-types';

function notImplemented(name: string): never {
  throw new Error(`${name}: not implemented in Phase 1`);
}

export class LightRagGraphProvider extends IGraphRagService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(..._args: any[]): Promise<GraphQueryResult> {
    return notImplemented('LightRagGraphProvider.query');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertEdge(..._args: any[]): Promise<void> {
    return notImplemented('LightRagGraphProvider.upsertEdge');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEdgeWeight(..._args: any[]): Promise<void> {
    return notImplemented('LightRagGraphProvider.updateEdgeWeight');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vectorSearch(..._args: any[]): Promise<any[]> {
    return notImplemented('LightRagGraphProvider.vectorSearch');
  }
}

export class PineconeGraphProvider extends IGraphRagService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(..._args: any[]): Promise<GraphQueryResult> {
    return notImplemented('PineconeGraphProvider.query');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertEdge(..._args: any[]): Promise<void> {
    return notImplemented('PineconeGraphProvider.upsertEdge');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEdgeWeight(..._args: any[]): Promise<void> {
    return notImplemented('PineconeGraphProvider.updateEdgeWeight');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vectorSearch(..._args: any[]): Promise<any[]> {
    return notImplemented('PineconeGraphProvider.vectorSearch');
  }
}

export class AzureAISearchGraphProvider extends IGraphRagService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(..._args: any[]): Promise<GraphQueryResult> {
    return notImplemented('AzureAISearchGraphProvider.query');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertEdge(..._args: any[]): Promise<void> {
    return notImplemented('AzureAISearchGraphProvider.upsertEdge');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEdgeWeight(..._args: any[]): Promise<void> {
    return notImplemented('AzureAISearchGraphProvider.updateEdgeWeight');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vectorSearch(..._args: any[]): Promise<any[]> {
    return notImplemented('AzureAISearchGraphProvider.vectorSearch');
  }
}

export class Neo4jGraphProvider extends IGraphRagService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query(..._args: any[]): Promise<GraphQueryResult> {
    return notImplemented('Neo4jGraphProvider.query');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upsertEdge(..._args: any[]): Promise<void> {
    return notImplemented('Neo4jGraphProvider.upsertEdge');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEdgeWeight(..._args: any[]): Promise<void> {
    return notImplemented('Neo4jGraphProvider.updateEdgeWeight');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vectorSearch(..._args: any[]): Promise<any[]> {
    return notImplemented('Neo4jGraphProvider.vectorSearch');
  }
}

export class OpenAIEmbeddingProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embed(..._args: any[]): Promise<number[]> {
    return notImplemented('OpenAIEmbeddingProvider.embed');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embedBatch(..._args: any[]): Promise<number[][]> {
    return notImplemented('OpenAIEmbeddingProvider.embedBatch');
  }
}

export class SentenceTransformerProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embed(..._args: any[]): Promise<number[]> {
    return notImplemented('SentenceTransformerProvider.embed');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embedBatch(..._args: any[]): Promise<number[][]> {
    return notImplemented('SentenceTransformerProvider.embedBatch');
  }
}

export class AzureEmbeddingProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embed(..._args: any[]): Promise<number[]> {
    return notImplemented('AzureEmbeddingProvider.embed');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embedBatch(..._args: any[]): Promise<number[][]> {
    return notImplemented('AzureEmbeddingProvider.embedBatch');
  }
}
