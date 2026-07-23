export const EMBEDDING_SERVICE = 'EMBEDDING_SERVICE';

export abstract class IEmbeddingService {
  /**
   * Embed a single text string → vector.
   * Used by all IGraphRagService providers for vectorSearch().
   * Providers NEVER call embedding APIs directly — always via this interface.
   */
  abstract embed(text: string): Promise<number[]>;

  /**
   * Embed a batch of texts for efficiency.
   * Used by SkillCompiler (Phase 0b) when seeding 86 skills.
   */
  abstract embedBatch(texts: string[]): Promise<number[][]>;
}
