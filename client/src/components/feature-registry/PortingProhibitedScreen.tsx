/**
 * PortingProhibitedScreen — terminal state shown when portingCandidate=false.
 *
 * Behavior:
 * - Shows ftId, feature name, portingCandidateReason
 * - NO retry option — prohibition is permanent (D-36-5 is human override, not UI)
 * - NO optimistic state — PortingProhibited is synchronous and immediate
 * - Close button dismisses the screen
 */

import React from 'react';

interface PortingProhibitedScreenProps {
  ftId: string;
  featureName: string;
  portingCandidateReason: string;
  onClose?: () => void;
}

export function PortingProhibitedScreen({
  ftId,
  featureName,
  portingCandidateReason,
  onClose,
}: PortingProhibitedScreenProps): React.ReactElement {
  return (
    <div className="porting-prohibited-screen" data-testid="porting-prohibited-screen">
      <div className="prohibited-icon" role="img" aria-label="Porting prohibited">
        🔒
      </div>
      <h2 className="prohibited-title" data-testid="prohibited-title">
        Porting Prohibited
      </h2>

      <div className="prohibited-details">
        <div className="prohibited-ft-id" data-testid="prohibited-ft-id">
          <span className="label">Feature ID:</span>
          <span className="value">{ftId}</span>
        </div>
        <div className="prohibited-feature-name" data-testid="prohibited-feature-name">
          <span className="label">Feature:</span>
          <span className="value">{featureName}</span>
        </div>
        <div className="prohibited-reason" data-testid="prohibited-reason">
          <span className="label">Reason:</span>
          <span className="value">{portingCandidateReason}</span>
        </div>
      </div>

      {/* NO retry option — prohibition is permanent */}
      <p className="prohibited-note" data-testid="prohibited-note">
        This feature is engine-internal to XIIGen. Porting it to another platform would expose
        architectural internals. This classification is permanent.
      </p>

      <button className="prohibited-close-btn" data-testid="prohibited-close-btn" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
