/**
 * MockEmbeddingProvider — unit tests (Phase 1)
 *
 * Covers:
 *   embed:      returns 384-dim unit vector, deterministic (same input → same output)
 *   embedBatch: delegates to embed, returns correct count
 */

import { MockEmbeddingProvider } from './mock-embedding.provider';

describe('MockEmbeddingProvider', () => {
  let provider: MockEmbeddingProvider;

  beforeEach(() => {
    provider = new MockEmbeddingProvider();
  });

  // ── embed ─────────────────────────────────────────────────────────────────

  describe('embed', () => {
    it('should return a 384-dimensional vector', async () => {
      const vec = await provider.embed('hello world');
      expect(vec).toHaveLength(384);
    });

    it('should return a unit vector (norm ≈ 1.0)', async () => {
      const vec = await provider.embed('orchestration arbiter');
      const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it('should be deterministic — same input produces same output', async () => {
      const a = await provider.embed('consistent input');
      const b = await provider.embed('consistent input');
      expect(a).toEqual(b);
    });

    it('should produce different vectors for different inputs', async () => {
      const a = await provider.embed('orchestration');
      const b = await provider.embed('data_pipeline');
      expect(a).not.toEqual(b);
    });
  });

  // ── embedBatch ────────────────────────────────────────────────────────────

  describe('embedBatch', () => {
    it('should return the correct number of vectors', async () => {
      const texts = ['one', 'two', 'three'];
      const vecs = await provider.embedBatch(texts);
      expect(vecs).toHaveLength(3);
    });

    it('should return unit vectors for each item', async () => {
      const vecs = await provider.embedBatch(['a', 'b']);
      for (const vec of vecs) {
        const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        expect(norm).toBeCloseTo(1.0, 4);
      }
    });
  });
});
