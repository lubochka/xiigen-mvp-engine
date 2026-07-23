/**
 * Injection tokens for all 13 dynamic AI planning components.
 * BOUNDARY CODE ONLY — no implementations in this file.
 *
 * Topology integration (from XIIGEN-DYNAMIC-AI-ARCHITECTURE-SYNTHESIS-v4.md):
 *
 * ARBITER_PANEL_HANDLER    → triggered by generation.candidate.ready
 *                            → arbiter-panel.handler (pre-launch) / AF-8
 *
 * ESCALATION_HANDLER       → triggered by arbiter.panel.complete
 *                            → score.handler (post-eval) / AF-7
 *
 * CYCLE_ROUTER             → triggered by score.handler.complete
 *                            → route.handler (replaces static branching) / between AF-7 and AF-9
 *
 * SIGNAL_ROUTER            → triggered by phase.e.started
 *                            → feedback.handler (pre-storage) / AF-11
 *
 * DIFFICULTY_PREDICTOR     → triggered by flow.plan.registered
 *                            → Phase A session STEP 0 gate / before AF-1
 *
 * NODE_COMPLETENESS_VALIDATOR → triggered by convergence.complete
 *                            → post-convergence gate / between AF-5 and AF-6
 *                            → pass threshold: engine.nodeValidation.completenessThreshold (default 0.75)
 *
 * CROSS_LAYER_CURRICULUM_ROUTER → triggered by arbiter.block.recorded + phase.e.triple.stored
 *                            → arbiter-panel.handler (blocks) + feedback.handler (triples) / AF-8 + AF-11
 *
 * SCOPE_CLASSIFIER         → triggered by prereq.gap.detected
 *                            → CapabilityGapFlowProposer (T585) / FLOW-PREREQ-03
 *
 * GRAPH_LEARNING_SERVICE   → triggered by flow.phase_f.complete
 *                            → RetrospectiveService / post-AF-11
 *
 * SCHEMA_CHAIN_VALIDATOR   → triggered by flow.phase_f.activation
 *                            → Phase F gate / before ACTIVE promotion
 *
 * ASSUMPTION_REGISTRY_LINTER → triggered at Gate C approval
 *                            → session-file-authoring.handler / Gate C
 *
 * BLAST_RADIUS_CALCULATOR  → triggered by maintenance.session.started
 *                            → STEP 0 of every MAINTENANCE session
 *
 * RETROSPECTIVE_SERVICE    → triggered by wave.flow.active
 *                            → RetrospectiveService trigger / post-Phase-F
 *
 * AI_DECISION_PIPELINE     → triggered by any component below confidence threshold
 *                            → injected into all AIDrivenXxx implementations
 */

export const ESCALATION_HANDLER = 'ESCALATION_HANDLER';
export const ARBITER_PANEL_HANDLER = 'ARBITER_PANEL_HANDLER';
export const CYCLE_ROUTER = 'CYCLE_ROUTER';
export const SIGNAL_ROUTER = 'SIGNAL_ROUTER';
export const DIFFICULTY_PREDICTOR = 'DIFFICULTY_PREDICTOR';
export const NODE_COMPLETENESS_VALIDATOR = 'NODE_COMPLETENESS_VALIDATOR';
export const CROSS_LAYER_CURRICULUM_ROUTER = 'CROSS_LAYER_CURRICULUM_ROUTER';
export const SCOPE_CLASSIFIER = 'SCOPE_CLASSIFIER';
export const SCHEMA_CHAIN_VALIDATOR = 'SCHEMA_CHAIN_VALIDATOR';
export const ASSUMPTION_REGISTRY_LINTER = 'ASSUMPTION_REGISTRY_LINTER';
export const BLAST_RADIUS_CALCULATOR = 'BLAST_RADIUS_CALCULATOR';
export const RETROSPECTIVE_SERVICE = 'RETROSPECTIVE_SERVICE';
export const AI_DECISION_PIPELINE = 'AI_DECISION_PIPELINE';
