/**
 * compensation-before-apply.check — Named check for T272 IaCProvisionSaga.
 *
 * GAP K1 / BFA DD-152: store destruction plan BEFORE IaC apply.
 * Without this check, T272 will generate apply-first code and score 0.
 *
 * Named check: compensation_before_apply
 * Quality gate weight on T272: 0.25 (threshold 1.0)
 */
import type { EvaluatorFn } from '../../node-handlers/named-check.registry';

export const compensationBeforeApplyEvaluator: EvaluatorFn = (code: string) => {
  const storeLine = code.search(/storeCompensation|storeDestroy|F701.*store/i);
  const applyLine = code.search(/F702.*apply|iacRunner.*apply|terraform.*apply/i);

  if (storeLine < 0) {
    return {
      pass: false,
      reason:
        'No compensation plan storage found — DD-152 violation: storeCompensationPlan must precede F702.apply',
    };
  }

  if (applyLine >= 0 && storeLine > applyLine) {
    return {
      pass: false,
      reason: `Apply (line ~${applyLine}) before compensation storage (line ~${storeLine}) — DD-152: store FIRST, then apply`,
    };
  }

  return { pass: true };
};
