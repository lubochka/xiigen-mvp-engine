/**
 * MockEmbeddingProvider — deterministic mock for tests and bootstrap mode.
 * Returns a hash-derived vector — same input always produces same output.
 * engine.embedding.provider = 'mock'
 *
 * DIM=384 matches sentence-transformers/all-MiniLM-L6-v2.
 * If switching to text-embedding-ada-002 (1536 dims), update DIM and re-index.
 */

import { Injectable } from '@nestjs/common';
import { IEmbeddingService } from '../interfaces/i-embedding.service';

@Injectable()
export class MockEmbeddingProvider extends IEmbeddingService {
  private readonly DIM = 384;

  async embed(text: string): Promise<number[]> {
    const vector = new Array(this.DIM).fill(0) as number[];
    for (let i = 0; i < text.length; i++) {
      vector[i % this.DIM] += text.charCodeAt(i) / 255;
    }
    // Normalise to unit vector
    const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
    return vector.map((v) => v / norm);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}
