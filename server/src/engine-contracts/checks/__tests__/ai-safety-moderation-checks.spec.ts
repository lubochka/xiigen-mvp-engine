/**
 * FLOW-24 Named Checks tests (CF-465 IRON RULE)
 * GAP-M3 acceptance: 7 tests for safety_compose_gate_publish_order
 */

import { safety_compose_gate_publish_order } from '../ai-safety-moderation-checks';

describe('safety_compose_gate_publish_order (CF-465 IRON RULE)', () => {
  it('passes for correct order compose < safetyGate < publish', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'COMPOSE', completedAt: 100 },
        { step: 'SAFETY_GATE', completedAt: 200 },
        { step: 'PUBLISH', completedAt: 300 },
      ]),
    ).not.toThrow();
  });

  it('throws when publish before safety gate', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'COMPOSE', completedAt: 100 },
        { step: 'PUBLISH', completedAt: 150 },
        { step: 'SAFETY_GATE', completedAt: 200 },
      ]),
    ).toThrow('IRON RULE VIOLATED');
  });

  it('throws when SAFETY_GATE step is missing', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'COMPOSE', completedAt: 100 },
        { step: 'PUBLISH', completedAt: 300 },
      ]),
    ).toThrow('Missing required step(s): SAFETY_GATE');
  });

  it('throws when COMPOSE step is missing', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'SAFETY_GATE', completedAt: 200 },
        { step: 'PUBLISH', completedAt: 300 },
      ]),
    ).toThrow('Missing required step(s): COMPOSE');
  });

  it('throws when all steps missing', () => {
    expect(() => safety_compose_gate_publish_order([])).toThrow('Missing required step(s)');
  });

  it('throws when compose and safety have equal timestamps', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'COMPOSE', completedAt: 100 },
        { step: 'SAFETY_GATE', completedAt: 100 },
        { step: 'PUBLISH', completedAt: 300 },
      ]),
    ).toThrow('IRON RULE VIOLATED');
  });

  it('throws when safety and publish have equal timestamps', () => {
    expect(() =>
      safety_compose_gate_publish_order([
        { step: 'COMPOSE', completedAt: 100 },
        { step: 'SAFETY_GATE', completedAt: 200 },
        { step: 'PUBLISH', completedAt: 200 },
      ]),
    ).toThrow('IRON RULE VIOLATED');
  });
});
