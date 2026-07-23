/**
 * FeatureMatrixRow — displays one FT record in the Feature Matrix.
 *
 * portingCandidate=false:
 *   - Shows lock icon (🔒) with tooltip containing portingCandidateReason
 *   - "Initiate Porting" button is NOT rendered (not disabled — completely absent)
 *
 * portingCandidate=true, no adapters:
 *   - Shows "Not yet ported"
 *   - "Initiate Porting" button rendered
 *
 * portingCandidate=true, has adapters:
 *   - Shows platform icons + signal scores
 *   - "Port to Another" button rendered
 */

import React from 'react';

export interface PlatformAdapter {
  platformId: string;
  status: string;
  adapterMode: string;
  signals?: {
    installs?: number;
    activeUsers30d?: number;
    signalScore?: number;
  };
}

export interface FeatureRecord {
  ftId: string;
  name: string;
  description: string;
  portingCandidate: boolean;
  portingCandidateReason?: string;
  platforms: PlatformAdapter[];
}

interface FeatureMatrixRowProps {
  feature: FeatureRecord;
  onInitiatePorting?: (ftId: string) => void;
  onPortToAnother?: (ftId: string) => void;
}

export function FeatureMatrixRow({
  feature,
  onInitiatePorting,
  onPortToAnother,
}: FeatureMatrixRowProps): React.ReactElement {
  const { ftId, name, description, portingCandidate, portingCandidateReason, platforms } = feature;
  const hasAdapters = platforms.length > 0;

  return (
    <div
      // RUN-173 FIX P4-1: stack on mobile (flex-col) so the fitness pill never
      // overlaps the feature name on narrow viewports. At md+ the original
      // side-by-side layout is restored.
      className="feature-matrix-row rounded-lg border border-gray-200 bg-white p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 hover:border-gray-300 transition-colors"
      data-testid={`feature-row-${ftId}`}
      data-porting-candidate={String(portingCandidate)}
    >
      <div className="feature-identity flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="feature-ft-id inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-gray-100 text-gray-700"
            data-testid={`ft-id-${ftId}`}
          >
            {ftId}
          </span>
          <span
            className="feature-name text-sm font-semibold text-gray-900"
            data-testid={`feature-name-${ftId}`}
          >
            {name}
          </span>
        </div>
        <p className="feature-description text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>

      <div className="feature-porting-status flex-shrink-0 md:self-start md:text-end">
        {!portingCandidate ? (
          // Engine-internal — lock icon + reason tooltip, NO porting button
          <div
            className="porting-lock inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium"
            data-testid={`porting-lock-${ftId}`}
            title={portingCandidateReason ?? 'Engine-internal feature — porting prohibited'}
          >
            <span className="lock-icon" role="img" aria-label="Porting prohibited">
              🔒
            </span>
            <span className="lock-label">Engine-internal</span>
          </div>
        ) : hasAdapters ? (
          // Has adapters — platform icons + signals + "Port to Another"
          <div
            className="porting-adapters flex items-center gap-2 flex-wrap md:justify-end"
            data-testid={`porting-adapters-${ftId}`}
          >
            {platforms.map((p) => (
              <span
                key={p.platformId}
                className="platform-chip inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200"
                data-testid={`platform-${ftId}-${p.platformId}`}
              >
                <span className="font-mono">
                  {p.platformId}
                  {p.signals?.signalScore != null &&
                    ` · ${p.signals.signalScore.toFixed(2)}`}
                </span>
              </span>
            ))}
            <button
              className="port-to-another-btn px-3 py-1.5 rounded text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
              data-testid={`port-to-another-${ftId}`}
              onClick={() => onPortToAnother?.(ftId)}
            >
              Port to another platform
            </button>
          </div>
        ) : (
          // No adapters yet — show initiate porting button
          <div
            className="porting-available flex items-center gap-2"
            data-testid={`porting-available-${ftId}`}
          >
            <span className="not-yet-ported text-xs text-gray-500 italic">Not yet ported</span>
            <button
              className="initiate-porting-btn px-3 py-1.5 rounded text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              data-testid={`initiate-porting-${ftId}`}
              onClick={() => onInitiatePorting?.(ftId)}
            >
              Initiate porting
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
