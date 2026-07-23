/**
 * abort-on-preservation-failure.check — Companion named check for T286 TenantOffboardingSaga.
 *
 * GAP K6 / BFA DR-115: If F733 preservation fails, offboarding MUST abort
 * and the tenant must be re-activated. Silent continuation is a violation.
 *
 * Named check: abort_on_preservation_failure
 * Quality gate weight on T286: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const abortOnPreservationFailureEvaluator: EvaluatorFn = (code: string) => {
  // Check for preservation confirmation check
  const hasPreservationCheck =
    /preservation.*confirmed|preserved.*confirmed|preservationResult|preservation\.confirmed/i.test(
      code,
    );

  if (!hasPreservationCheck) {
    return {
      pass: false,
      reason:
        'No preservation confirmation check found — silent continuation risk (DR-115: must abort if F733 fails)',
    };
  }

  // Check for abort/re-activation on failure
  const hasAbort =
    /offboarding\.aborted|reactivateTenant|re.?activate.*tenant|tenant.*reactivat/i.test(code);

  if (!hasAbort) {
    return {
      pass: false,
      reason:
        'No abort/re-activate on preservation failure — DR-115: if F733 fails, abort offboarding and re-activate tenant',
    };
  }

  return { pass: true };
};
