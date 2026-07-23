/**
 * CurriculumTierBadge — displays the curriculum tier (1-5) for a DPO triple.
 *
 * Tier meanings (IRON-TIER-MAP):
 *   1 = ROUTING, 2 = DATA_PIPELINE, 3 = PROCESSING, 4 = ORCHESTRATION, 5 = SCHEDULED
 */

import React from 'react';

export interface CurriculumTierBadgeProps {
  dpoTripleId: string;
  curriculumTier: number;
}

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Routing',
  2: 'Tier 2 — Data Pipeline',
  3: 'Tier 3 — Processing',
  4: 'Tier 4 — Orchestration',
  5: 'Tier 5 — Scheduled',
};

const TIER_TONES: Record<number, string> = {
  1: 'bg-blue-50 text-blue-700 border-blue-200',
  2: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  3: 'bg-purple-50 text-purple-700 border-purple-200',
  4: 'bg-amber-50 text-amber-700 border-amber-200',
  5: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function CurriculumTierBadge({
  dpoTripleId,
  curriculumTier,
}: CurriculumTierBadgeProps): React.ReactElement {
  const label = TIER_LABELS[curriculumTier] ?? `Tier ${curriculumTier}`;
  const tone = TIER_TONES[curriculumTier] ?? 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tone}`}
      data-testid={`tier-badge-${dpoTripleId}`}
      data-tier={curriculumTier}
      aria-label={`Curriculum tier: ${label}`}
    >
      {label}
    </span>
  );
}
