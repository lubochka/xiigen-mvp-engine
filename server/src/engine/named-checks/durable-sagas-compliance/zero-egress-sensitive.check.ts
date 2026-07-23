/**
 * zero-egress-sensitive.check — Named check for T275 PolicyEvaluationGate.
 *
 * GAP K8 / BFA CF-343: sensitive profile data must never be sent to external AI.
 * This is a ROUTING constraint, not data masking. F707 (PLATFORM-ONLY policy engine)
 * handles routing decision.
 *
 * Named check: zero_egress_sensitive
 * Quality gate weight on T275: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const zeroEgressSensitiveEvaluator: EvaluatorFn = (code: string) => {
  // Check if external AI is called
  const externalAiCall = /externalAI|openai|anthropic|F707.*external|ai\.external/i.test(code);

  if (!externalAiCall) {
    return { pass: true }; // No external AI call — zero-egress not applicable
  }

  // External AI call present — must have sensitivity routing check
  const sensitiveCheck = /sensitivity.*classification|isSensitive|CF.?343|sensitiv.*route/i.test(
    code,
  );

  if (!sensitiveCheck) {
    return {
      pass: false,
      reason:
        'CF-343: External AI call without sensitivity routing check — sensitive profile data may be leaked to external provider',
    };
  }

  return { pass: true };
};
