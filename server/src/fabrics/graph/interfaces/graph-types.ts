/**
 * Shape of a single edge returned by IGraphRagService.query().
 * The `.to` field is populated when querying named check nodes
 * (used by CrossLayerCurriculumRouter to retrieve code patterns from graph).
 */
export interface GraphEdge {
  fromEntity: string;
  fromType: string;
  relationship: string;
  toEntity: string;
  toType: string;
  confidence: number;
  observationCount: number;
  immutable: boolean;
  source?: string;
  reasoning?: string;
  metadata?: Record<string, unknown>;
  // Populated when querying a NAMED_CHECK_NODE — for CrossLayerCurriculumRouter
  to?: {
    correctExample?: string;
    wrongExample?: string;
    consequence?: string;
  };
}

/**
 * ⚠️ CLASS not interface: formatted() must survive destructuring without losing `this`.
 * Uses arrow function closing over the constructor parameter — no `this` dependency.
 *
 * const { edges, formatted } = await graphRag.query(...)
 * formatted()  ← safe: closes over edges, not this
 */
export class GraphQueryResult {
  constructor(public readonly edges: GraphEdge[]) {}

  /** Formats edges as human-readable text for AI prompt injection. */
  formatted = (): string => {
    if (!this.edges.length) return '(no edges found)';
    return this.edges
      .map(
        (e) =>
          `${e.fromEntity} ──[${e.relationship}]──> ${e.toEntity}` +
          ` (confidence: ${e.confidence.toFixed(2)}, observations: ${e.observationCount})` +
          (e.reasoning ? ` | ${e.reasoning}` : ''),
      )
      .join('\n');
  };
}
