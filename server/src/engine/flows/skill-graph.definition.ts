/**
 * FLOW-0A: Engine Self-Generation Loop
 *
 * DAG steps:
 *   validate-input → generate-candidates → arbitrate → unanimous-check
 *     → [winner]                → commit-accepted → done
 *     → [no winner, rounds left] → synthesize-feedback → generate-candidates (loop)
 *     → [stalled]               → escalate → done
 *
 * DNA-1: all data is Record<string,unknown> — no typed DAG model.
 */

export const FLOW_0A_DEFINITION: Record<string, unknown> = {
  flowId: 'FLOW-0A',
  version: '1.0.0',
  description: 'Engine Self-Generation: 3-model parallel generation with N-arbiter unanimous loop',
  connection_type: 'FLOW_SCOPED',
  nodes: [
    { id: 'validate-input', type: 'action', handler: 'validateInputHandler' },
    { id: 'generate-candidates', type: 'action', handler: 'generateCandidatesHandler' },
    { id: 'arbitrate', type: 'action', handler: 'arbitrateHandler' },
    {
      id: 'unanimous-check',
      type: 'decision',
      handler: 'unanimousCheckHandler',
      branches: { winner: 'commit-accepted', no_winner: 'check-rounds', stalled: 'escalate' },
    },
    {
      id: 'check-rounds',
      type: 'decision',
      handler: 'checkRoundsHandler',
      branches: { continue: 'synthesize-feedback', exhausted: 'escalate' },
    },
    { id: 'synthesize-feedback', type: 'action', handler: 'synthesizeFeedbackHandler' },
    { id: 'commit-accepted', type: 'action', handler: 'commitAcceptedHandler' },
    { id: 'escalate', type: 'action', handler: 'escalateHandler' },
    { id: 'done', type: 'terminal' },
  ],
  edges: [
    { from: 'validate-input', to: 'generate-candidates' },
    { from: 'generate-candidates', to: 'arbitrate' },
    { from: 'arbitrate', to: 'unanimous-check' },
    { from: 'synthesize-feedback', to: 'generate-candidates' }, // ← the loop edge
    { from: 'commit-accepted', to: 'done' },
    { from: 'escalate', to: 'done' },
  ],
  maxRounds: 5,
};
