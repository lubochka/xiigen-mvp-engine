/**
 * RAG Fabric — base types, enums, and config.
 *
 * 7 strategies: Vector, Graph, Hybrid, Split, FanOut, Tiered, Multi.
 * Admin selects strategy via FREEDOM config. Code uses IRagService.search().
 *
 * Phase 5.1: Types only. Concrete providers deferred to future flows.
 * Currently only InMemory provider exists (P2.3).
 */

// ── RAG Strategy Enum ────────────────────────────────

export enum RagStrategy {
  VECTOR = 'vector',
  GRAPH = 'graph',
  HYBRID = 'hybrid',
  SPLIT = 'split',
  FAN_OUT = 'fan_out',
  TIERED = 'tiered',
  MULTI = 'multi',
}

/** All valid RAG strategy values, for validation. */
export const ALL_RAG_STRATEGIES: readonly RagStrategy[] = Object.values(RagStrategy);

// ── RAG Config ───────────────────────────────────────

export interface RagConfig {
  /** Which RAG strategy to use. */
  readonly strategy: RagStrategy;
  /** Default number of results to return. */
  readonly defaultTopK: number;
  /** Minimum similarity score (0–1) for inclusion. */
  readonly similarityThreshold: number;
  /** Max tokens for context packs. */
  readonly maxContextTokens: number;
  /** Provider identifier (e.g., 'in_memory', 'pinecone', 'weaviate'). */
  readonly provider: string;
  /** Additional provider-specific options. */
  readonly options: Record<string, unknown>;
}

/** Sensible defaults for RAG config. */
export function defaultRagConfig(overrides?: Partial<RagConfig>): RagConfig {
  return {
    strategy: RagStrategy.VECTOR,
    defaultTopK: 10,
    similarityThreshold: 0.7,
    maxContextTokens: 4096,
    provider: 'in_memory',
    options: {},
    ...overrides,
  };
}

/** Check if a strategy is valid. */
export function isValidStrategy(strategy: string): strategy is RagStrategy {
  return ALL_RAG_STRATEGIES.includes(strategy as RagStrategy);
}

/** Serialize RagConfig to dict (DNA-1). */
export function ragConfigToDict(config: RagConfig): Record<string, unknown> {
  return {
    strategy: config.strategy,
    default_top_k: config.defaultTopK,
    similarity_threshold: config.similarityThreshold,
    max_context_tokens: config.maxContextTokens,
    provider: config.provider,
    options: { ...config.options },
  };
}
