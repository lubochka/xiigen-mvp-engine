export const GRAPH_LEARNING_SERVICE = 'GRAPH_LEARNING_SERVICE';

export abstract class IGraphLearningService {
  /**
   * Update edge confidence from a decision outcome.
   * Called at Phase F for each RoutingDecisionOutcome and for arbiter observations.
   *
   * RoutingDecisionOutcome outcome classes:
   *   SUCCESS_WITHIN_BUDGET → outcomeWasPositive: true,  confidence_delta: +0.05
   *   WASTED_CYCLE          → outcomeWasPositive: false, confidence_delta: -0.05
   *   ESCALATION_REQUIRED   → outcomeWasPositive: false, confidence_delta: -0.05
   */
  abstract updateEdge(update: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    outcomeWasPositive: boolean;
    confidence_delta: number;
    observationCount_delta: 1;
    runId: string;
    reasoning: string;
  }): Promise<void>;

  /**
   * Add a new edge discovered by the AI pipeline (no prior graph entry).
   * Seeded at confidence 0.60 — requires 5+ positive observations to solidify
   * (engine.graph.solidificationAt FREEDOM config key).
   */
  abstract addDiscoveredEdge(edge: {
    fromEntity: string;
    fromType: string;
    relationship: string;
    toEntity: string;
    toType: string;
    reasoning: string;
    discoveredBy: string; // runId that produced this discovery
  }): Promise<void>;

  /**
   * Upgrade edge relationship type when observationCount crosses FREEDOM config threshold.
   *
   * FREEDOM config keys:
   *   engine.graph.optionalToPromotedThreshold  (default: 3)
   *   engine.graph.promotedToRequiredThreshold  (default: 5)
   *
   * Transitions:
   *   OPTIONAL_ARBITER  (≥ optionalToPromotedThreshold observations) → PROMOTED_ARBITER
   *   PROMOTED_ARBITER  (≥ promotedToRequiredThreshold observations)  → REQUIRES_MINIMUM_ARBITER
   *
   * Called at Phase F retrospective for every archetype that ran.
   * Returns: 'PROMOTED' | 'REQUIRED' | 'UNCHANGED' — logged by RetrospectiveService.
   */
  abstract promoteEdgeIfThresholdMet(edge: {
    fromEntity: string;
    currentRelationship: 'OPTIONAL_ARBITER' | 'PROMOTED_ARBITER';
    toEntity: string;
  }): Promise<'PROMOTED' | 'REQUIRED' | 'UNCHANGED'>;
}
