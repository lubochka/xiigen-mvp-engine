/**
 * RoleScopedView — role-aware conditional rendering helper.
 *
 * Architectural context (Luba C6, 2026-04-20):
 *   Every flow touching a marketplace, freelancer, referral, or business-
 *   partner surface must render a DIFFERENT template per viewer role. This
 *   component is the canonical branching primitive.
 *
 * Usage:
 *   <RoleScopedView role={viewerRole}>
 *     <RoleScopedView.Case when="anonymous">
 *       <PublicMarketplaceCard listing={item} />
 *     </RoleScopedView.Case>
 *     <RoleScopedView.Case when="tenant-user">
 *       <TenantMarketplaceCard listing={item} onPurchase={handle} />
 *     </RoleScopedView.Case>
 *     <RoleScopedView.Case when="freelancer">
 *       <FreelancerMarketplaceCard listing={item} onBid={handleBid} />
 *     </RoleScopedView.Case>
 *     <RoleScopedView.Fallback>
 *       <AuthRequired />
 *     </RoleScopedView.Fallback>
 *   </RoleScopedView>
 *
 * The component emits a data-testid so Playwright can verify the correct
 * branch rendered: `role-scoped-${role}-${caseKey}`.
 *
 * Testability:
 *   Pages that use RoleScopedView SHOULD accept a `?role=<role>` query
 *   param so Playwright can drive mock-states per role without an auth
 *   server. See MOCK_STATES pattern in MarketplaceEventDiscoveryPage
 *   for the canonical shape.
 */

import React from 'react';
import type { ViewerRole } from './ViewerRole';

interface RoleScopedViewProps {
  role: ViewerRole;
  /** data-testid prefix for the rendered branch. Defaults to "role-scoped". */
  testIdPrefix?: string;
  children?: React.ReactNode;
}

interface CaseProps {
  when: ViewerRole | readonly ViewerRole[];
  children?: React.ReactNode;
}

interface FallbackProps {
  children?: React.ReactNode;
}

function Case(_: CaseProps): null {
  // Marker component. Real resolution happens in RoleScopedView.
  return null;
}
function Fallback(_: FallbackProps): null {
  return null;
}

function isCase(child: React.ReactNode): child is React.ReactElement<CaseProps> {
  return (
    React.isValidElement(child) && (child.type as React.FC<CaseProps> | undefined) === Case
  );
}

function isFallback(child: React.ReactNode): child is React.ReactElement<FallbackProps> {
  return (
    React.isValidElement(child) &&
    (child.type as React.FC<FallbackProps> | undefined) === Fallback
  );
}

export function RoleScopedView({ role, testIdPrefix = 'role-scoped', children }: RoleScopedViewProps) {
  let matched: React.ReactNode = null;
  let matchedKey = '';
  let fallback: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (isCase(child)) {
      const whenRaw = child.props.when;
      const whenRoles = Array.isArray(whenRaw) ? whenRaw : [whenRaw];
      if (whenRoles.includes(role) && matched === null) {
        matched = child.props.children;
        matchedKey = whenRoles.join(',');
      }
    } else if (isFallback(child)) {
      fallback = child.props.children;
    }
  });

  const rendered = matched ?? fallback;
  if (rendered === null || rendered === undefined) {
    return (
      <div
        data-testid={`${testIdPrefix}-${role}-none`}
        className="p-4 text-sm text-gray-500"
        role="note"
      >
        This view is not available for your role.
      </div>
    );
  }

  const branchId =
    matched !== null ? `${testIdPrefix}-${role}-${matchedKey.replace(/[^a-zA-Z0-9,_-]/g, '')}` : `${testIdPrefix}-${role}-fallback`;

  return (
    <div data-testid={branchId} data-viewer-role={role}>
      {rendered}
    </div>
  );
}

RoleScopedView.Case = Case;
RoleScopedView.Fallback = Fallback;
