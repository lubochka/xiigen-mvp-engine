/**
 * sole-gate-no-bypass.check — Named check for T280/T281 promotion gate.
 *
 * GAP K5 / BFA DR-112: F719 ReadinessReport is the ONLY way code gets promoted.
 * T281 must require T280's readiness.confirmed. No alternative path.
 *
 * Named check: sole_gate_no_bypass
 * Quality gate weight on T280: 0.30 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const soleGateNoBypassEvaluator: EvaluatorFn = (code: string) => {
  // Verify T281 code references T280 / ReadinessReport / F719
  const hasReadinessCheck = /readiness.*confirmed|T280|ReadinessReport|F719/i.test(code);

  if (!hasReadinessCheck) {
    return {
      pass: false,
      reason:
        'T281 does not gate on T280 ReadinessReport — alternative promotion path possible (DR-112 sole gate violation)',
    };
  }

  return { pass: true };
};
