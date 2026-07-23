/**
 * CycleOutcomeTag — displays the cycle outcome classification.
 *
 * SUCCESS_WITHIN_BUDGET: green tag
 * WASTED_CYCLE: yellow tag
 * ESCALATION_REQUIRED: red tag
 */

import React from 'react';

export type CycleOutcome = 'SUCCESS_WITHIN_BUDGET' | 'WASTED_CYCLE' | 'ESCALATION_REQUIRED';

export interface CycleOutcomeTagProps {
  cycleId: string;
  outcome: CycleOutcome;
}

const OUTCOME_LABELS: Record<CycleOutcome, string> = {
  SUCCESS_WITHIN_BUDGET: 'Success',
  WASTED_CYCLE: 'Wasted',
  ESCALATION_REQUIRED: 'Escalate',
};

const OUTCOME_TONES: Record<CycleOutcome, string> = {
  SUCCESS_WITHIN_BUDGET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WASTED_CYCLE: 'bg-amber-50 text-amber-700 border-amber-200',
  ESCALATION_REQUIRED: 'bg-red-50 text-red-700 border-red-200',
};

const OUTCOME_ICONS: Record<CycleOutcome, string> = {
  SUCCESS_WITHIN_BUDGET: '✓',
  WASTED_CYCLE: '⚠',
  ESCALATION_REQUIRED: '↑',
};

export function CycleOutcomeTag({ cycleId, outcome }: CycleOutcomeTagProps): React.ReactElement {
  const variantSlug = outcome.toLowerCase().replace(/_/g, '-');
  return (
    <span
      className={`cycle-outcome-tag cycle-outcome-tag--${variantSlug} inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${OUTCOME_TONES[outcome]}`}
      data-testid={`outcome-tag-${cycleId}`}
      data-outcome={outcome}
    >
      <span aria-hidden="true">{OUTCOME_ICONS[outcome]}</span>
      {OUTCOME_LABELS[outcome]}
    </span>
  );
}
