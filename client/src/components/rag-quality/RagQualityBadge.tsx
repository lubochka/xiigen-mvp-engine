/**
 * RagQualityBadge — displays qualityScore (0–1) for a RAG pattern.
 *
 * - score >= 0.85: "high" variant (green)
 * - score 0.5–0.84: "medium" variant (yellow)
 * - score < 0.5: "low" variant (red)
 */

import React from 'react';

export type QualityTier = 'high' | 'medium' | 'low';

export interface RagQualityBadgeProps {
  patternId: string;
  qualityScore: number;
}

export function getQualityTier(score: number): QualityTier {
  if (score >= 0.85) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

const TIER_TONES: Record<QualityTier, string> = {
  high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-red-50 text-red-700 border-red-200',
};

export function RagQualityBadge({
  patternId,
  qualityScore,
}: RagQualityBadgeProps): React.ReactElement {
  const tier = getQualityTier(qualityScore);
  const displayScore = (qualityScore * 100).toFixed(0);

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[3.25rem] px-2 py-0.5 rounded-full text-xs font-semibold border ${TIER_TONES[tier]}`}
      data-testid={`quality-badge-${patternId}`}
      data-quality-tier={tier}
      data-quality-score={qualityScore}
      aria-label={`Quality score: ${displayScore}%`}
    >
      {displayScore}%
    </span>
  );
}
