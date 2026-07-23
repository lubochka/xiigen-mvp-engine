/**
 * StackCouplingBadge — displays the coupling category for a stack.
 *
 * D-STACK-1: only 4 valid categories:
 *   CONCEPT_NEUTRAL → green
 *   IMPL_VARIES     → yellow
 *   STACK_COUPLED   → orange
 *   INCOMPATIBLE    → red
 */

import React from 'react';

export type CouplingCategory = 'CONCEPT_NEUTRAL' | 'IMPL_VARIES' | 'STACK_COUPLED' | 'INCOMPATIBLE';

export interface StackCouplingBadgeProps {
  stackId: string;
  category: CouplingCategory;
}

const CATEGORY_LABELS: Record<CouplingCategory, string> = {
  CONCEPT_NEUTRAL: 'Neutral',
  IMPL_VARIES: 'Impl Varies',
  STACK_COUPLED: 'Stack Coupled',
  INCOMPATIBLE: 'Incompatible',
};

const CATEGORY_TONES: Record<CouplingCategory, string> = {
  CONCEPT_NEUTRAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IMPL_VARIES: 'bg-amber-50 text-amber-700 border-amber-200',
  STACK_COUPLED: 'bg-orange-50 text-orange-700 border-orange-200',
  INCOMPATIBLE: 'bg-red-50 text-red-700 border-red-200',
};

const CATEGORY_ICONS: Record<CouplingCategory, string> = {
  CONCEPT_NEUTRAL: '✓',
  IMPL_VARIES: '~',
  STACK_COUPLED: '⚠',
  INCOMPATIBLE: '✕',
};

export function StackCouplingBadge({
  stackId,
  category,
}: StackCouplingBadgeProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2"
      data-testid={`coupling-badge-${stackId}`}
      data-category={category}
      aria-label={`Stack ${stackId} coupling: ${CATEGORY_LABELS[category]}`}
    >
      <span className="font-mono text-xs font-medium text-gray-700">{stackId}</span>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ms-auto ${CATEGORY_TONES[category]}`}
      >
        <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
        {CATEGORY_LABELS[category]}
      </span>
    </div>
  );
}
