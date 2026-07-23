/**
 * PlatformOpsPage — shared component for engine-internal two-role-minimum flows.
 *
 * Created in RUN-44. Centralises the "platform-admin + platform-support +
 * fallback" pattern that appears across the engine-internal cluster (FLOW-29,
 * FLOW-35, FLOW-36, FLOW-37, FLOW-42, FLOW-43, and others). Host pages wrap
 * their live content in this component and inherit role-detection,
 * auto-generated read-only rendering for support, and a friendly fallback
 * for all other roles — without duplicating the branching boilerplate.
 *
 * Usage:
 *   <PlatformOpsPage
 *     flowSlug="meta-arbitration-engine"
 *     flowDisplayName="Meta Arbitration Engine"
 *     adminContent={<AdminCrudPanel … />}
 *   />
 *
 * Optional `supportContent` overrides the auto-generated read-only view when
 * the host page wants to tailor the support experience (e.g. ticket linkage,
 * custom investigative UI). When omitted, the component renders `adminContent`
 * inside a `<fieldset disabled>` which natively disables every form control
 * within the subtree — the most accessible way to express "visible but not
 * interactable" without the pitfalls of manual aria-disabled on every control.
 *
 * Optional `allowRoles` lets a host opt-in additional roles to see the
 * adminContent (e.g. `['tenant-admin']`). Use sparingly — this escape hatch
 * exists for flows that grew a third tenant-admin branch after adoption.
 *
 * Accessibility notes (UI Pro Max):
 *   - <fieldset disabled> on auto-readonly guarantees UX-18 without relying on
 *     per-element aria-disabled plumbing. Opacity 75% + pointer-events-none
 *     provide the visual cue. Banner with Lock icon + text explains why.
 *   - Fallback branch renders one meaningful <h1> using flowDisplayName (UX-01).
 *   - Every branch carries data-viewer-role on the outer wrapper so Playwright
 *     role-state drivers can assert which branch rendered.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { useViewerRole } from '../../hooks/useViewerRole';
import type { ViewerRole } from './ViewerRole';

export interface PlatformOpsPageProps {
  /** URL-slug identifier for the flow (e.g. "meta-arbitration-engine"). Used for testids. */
  flowSlug: string;
  /** Human-readable name shown in the fallback <h1> and support banner. */
  flowDisplayName: string;
  /** Full operational interface rendered for platform-admin (and allowRoles). */
  adminContent: React.ReactNode;
  /** Optional custom read-only view for platform-support. When omitted, adminContent
   *  is rendered inside a disabled <fieldset> with a read-only banner above. */
  supportContent?: React.ReactNode;
  /** Additional roles that are permitted to see adminContent (e.g. ['tenant-admin']).
   *  Intended as an escape hatch — prefer native per-flow role branching via
   *  RoleScopedView for pages with more than two meaningful role cells. */
  allowRoles?: readonly ViewerRole[];
  /** Optional classname applied to the outer wrapper. */
  className?: string;
}

function ReadOnlyBanner({ flowDisplayName }: { flowDisplayName: string }) {
  return (
    <div
      data-testid="platform-ops-readonly-banner"
      role="note"
      className="mb-3 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
    >
      <Lock
        size={14}
        strokeWidth={2}
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0"
      />
      <span>
        <span className="font-semibold">{flowDisplayName}</span> — read-only for
        support access. Controls are disabled. Escalate to a platform-admin for any
        change.
      </span>
    </div>
  );
}

export function PlatformOpsPage({
  flowSlug,
  flowDisplayName,
  adminContent,
  supportContent,
  allowRoles,
  className,
}: PlatformOpsPageProps) {
  const { role } = useViewerRole();

  const isAdmin = role === 'platform-admin';
  const isSupport = role === 'platform-support';
  const isExplicitlyAllowed = allowRoles?.includes(role) ?? false;

  // Platform-admin (or an explicitly allowed role) — render adminContent as-is
  if (isAdmin || isExplicitlyAllowed) {
    return (
      <div
        data-testid={`platform-ops-${flowSlug}`}
        data-viewer-role={role}
        className={className}
      >
        {adminContent}
      </div>
    );
  }

  // Platform-support — render custom supportContent, or auto-generate read-only
  if (isSupport) {
    return (
      <div
        data-testid={`platform-ops-${flowSlug}`}
        data-viewer-role={role}
        className={className}
      >
        <ReadOnlyBanner flowDisplayName={flowDisplayName} />
        {supportContent !== undefined ? (
          supportContent
        ) : (
          // <fieldset disabled> natively disables every form control inside
          // (button, input, select, textarea). Combined with opacity + pointer-
          // events-none on the wrapper, the support user sees the full layout
          // without being able to submit any action (UX-18 disabled-not-absent).
          <fieldset
            data-testid={`platform-ops-${flowSlug}-readonly`}
            disabled
            aria-disabled="true"
            aria-label={`${flowDisplayName} (read-only)`}
            className="m-0 p-0 border-0 opacity-75"
            style={{ pointerEvents: 'none' }}
          >
            {adminContent}
          </fieldset>
        )}
      </div>
    );
  }

  // Fallback — any other role
  return (
    <div
      data-testid={`platform-ops-${flowSlug}-not-available`}
      data-viewer-role={role}
      role="note"
      className={`p-6 border border-gray-200 rounded bg-gray-50 max-w-2xl mx-auto mt-8 ${className ?? ''}`}
    >
      <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Lock size={18} strokeWidth={2} aria-hidden="true" />
        {flowDisplayName}
      </h1>
      <p className="text-sm text-gray-600 mt-2">
        This page is only accessible to platform operators.
      </p>
    </div>
  );
}

export default PlatformOpsPage;
