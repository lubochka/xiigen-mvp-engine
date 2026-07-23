/**
 * Graph planning constants.
 *
 * B-7 Fix: INHERITANCE_DISCOUNT_FACTOR applied when inheriting edges from
 * a source flow to a target flow. Inherited edges start at 80% of the
 * source flow's confidence — they must be re-validated through actual runs.
 *
 * Floor: 0.50 — inherited edges never drop below minimum viable confidence.
 */

/** B-7: Discount applied to edge confidence when inheriting from another flow. */
export const INHERITANCE_DISCOUNT_FACTOR = 0.8;

/** Minimum confidence for any edge (inherited or discovered). */
export const MIN_EDGE_CONFIDENCE = 0.5;

/** Default confidence for newly discovered edges (not yet validated). */
export const DISCOVERED_EDGE_CONFIDENCE = 0.6;

/** Confidence threshold for edge solidification (FREEDOM config: engine.graph.solidificationAt). */
export const DEFAULT_SOLIDIFICATION_THRESHOLD = 0.85;
