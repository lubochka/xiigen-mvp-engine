/**
 * IGraphRagService — G5: Graph RAG fabric interface.
 *
 * Enables write-back of DPO triples to nano-graphrag for knowledge graph enrichment.
 * Service code NEVER imports HTTP clients directly — all calls go through this interface.
 */

import { Injectable } from '@nestjs/common';

export const GRAPH_RAG_SERVICE = 'GRAPH_RAG_SERVICE';

export interface IGraphRagService {
  insert(payload: { text: string; workspace: string; mode: string }): Promise<{ success: boolean }>;
}

/**
 * HttpGraphRagService — thin HTTP client for nano-graphrag.
 * No retry logic — fire-and-forget failures are handled by caller.
 */
@Injectable()
export class HttpGraphRagService implements IGraphRagService {
  async insert(payload: {
    text: string;
    workspace: string;
    mode: string;
  }): Promise<{ success: boolean }> {
    const endpoint = process.env['GRAPHRAG_ENDPOINT'] ?? 'http://localhost:8080';
    try {
      const res = await fetch(`${endpoint}/insert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  }
}
