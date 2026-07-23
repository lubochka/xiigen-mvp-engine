/**
 * FeatureMatrixScreen — FT × Platform matrix dashboard.
 *
 * Shows all features with their porting status.
 * portingCandidate=false features are shown with lock icon.
 * portingCandidate=true features show porting options.
 *
 * FlowStateSnapshot integration: reads portingContext.portingCandidate
 * to guard UI at render time (no server round-trip for portingCandidate check).
 */

import React, { useState } from 'react';
import { FeatureMatrixRow, type FeatureRecord } from './FeatureMatrixRow';
import { PortingProhibitedScreen } from './PortingProhibitedScreen';

interface FeatureMatrixScreenProps {
  features: FeatureRecord[];
  onInitiatePorting?: (ftId: string) => void;
}

export function FeatureMatrixScreen({
  features,
  onInitiatePorting,
}: FeatureMatrixScreenProps): React.ReactElement {
  const [prohibitedFeature, setProhibitedFeature] = useState<FeatureRecord | null>(null);

  function handleInitiatePorting(ftId: string): void {
    const feature = features.find((f) => f.ftId === ftId);
    if (!feature) return;

    // Guard at render time — portingCandidate=false → show prohibited screen immediately
    if (!feature.portingCandidate) {
      setProhibitedFeature(feature);
      return;
    }

    onInitiatePorting?.(ftId);
  }

  if (prohibitedFeature) {
    return (
      <PortingProhibitedScreen
        ftId={prohibitedFeature.ftId}
        featureName={prohibitedFeature.name}
        portingCandidateReason={
          prohibitedFeature.portingCandidateReason ?? 'Engine-internal feature'
        }
        onClose={() => setProhibitedFeature(null)}
      />
    );
  }

  return (
    <div className="feature-matrix-screen p-6" data-testid="feature-matrix-screen">
      <header className="mb-6">
        <h1 className="matrix-title text-2xl font-bold text-gray-900">Feature Matrix</h1>
        <p className="matrix-subtitle text-sm text-gray-500 mt-1">
          <span data-testid="feature-count-label">{features.length} features registered</span>
          {' · '}
          <span>{features.filter((f) => f.portingCandidate).length} portable</span>
          {' · '}
          <span>{features.filter((f) => !f.portingCandidate).length} engine-internal</span>
        </p>
      </header>

      <div className="feature-matrix-list space-y-3" data-testid="feature-matrix-list">
        {features.map((feature) => (
          <FeatureMatrixRow
            key={feature.ftId}
            feature={feature}
            onInitiatePorting={handleInitiatePorting}
          />
        ))}
      </div>
    </div>
  );
}
