/**
 * TenantLifecyclePage — FLOW-15 T608
 * Tenant lifecycle management: suspension, reactivation, termination.
 * Shows current tenant status with action buttons.
 * Suspension = status change only. Termination delegates purge.
 *
 * Role-gated (RUN-172 P0-1 close, 2026-04-21):
 *   Destructive controls (Suspend / Reactivate / Terminate) are visible to
 *   platform-admin and tenant-admin ONLY. tenant-user / anonymous / others
 *   get a non-destructive informational view — scope-isolation violation
 *   surfaced by Axis-D examination (tenant-user could click Terminate).
 */
import React, { useState } from 'react';
import { useViewerRole } from '../../hooks/useViewerRole';

type TenantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';

export function TenantLifecyclePage() {
  const { role } = useViewerRole();
  const [tenantStatus, setTenantStatus] = useState<TenantStatus>('ACTIVE');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Destructive lifecycle actions are gated to platform-admin + tenant-admin.
  // Any other role sees an informational banner with no controls — Rule 6
  // (scope-isolation) requires that non-admin roles cannot change tenant
  // lifecycle state, even if they accidentally land on this route.
  const canManageLifecycle =
    role === 'platform-admin' || role === 'tenant-admin';

  function statusLabel(s: TenantStatus): string {
    return s === 'TRIAL' ? 'on trial'
         : s === 'ACTIVE' ? 'active'
         : s === 'SUSPENDED' ? 'suspended'
         : 'cancelled';
  }

  function handleSuspend() {
    if (tenantStatus !== 'ACTIVE') {
      setError(`Can\u2019t suspend a tenant that is ${statusLabel(tenantStatus)}.`);
      return;
    }
    setTenantStatus('SUSPENDED');
    setLastAction('Tenant suspended. All subscriptions paused for this tenant.');
    setError(null);
  }

  function handleReactivate() {
    if (tenantStatus !== 'SUSPENDED') {
      setError(`Can\u2019t reactivate a tenant that is ${statusLabel(tenantStatus)}.`);
      return;
    }
    setTenantStatus('ACTIVE');
    setLastAction('Tenant reactivated. Subscriptions resumed.');
    setError(null);
  }

  function handleTerminate() {
    if (tenantStatus === 'CANCELLED') {
      setError('This tenant is already cancelled.');
      return;
    }
    setTenantStatus('CANCELLED');
    setLastAction('Tenant terminated. Data purge has been scheduled.');
    setError(null);
  }

  const statusBadge = (
    <div data-testid="tenant-status-badge"
      data-status={tenantStatus}
      className={`inline-block px-3 py-1 rounded text-sm font-medium mb-4 ${
        tenantStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
        tenantStatus === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
        tenantStatus === 'CANCELLED' ? 'bg-red-100 text-red-800' :
        'bg-blue-100 text-blue-800'
      }`}>
      {tenantStatus === 'ACTIVE' ? 'Active'
       : tenantStatus === 'SUSPENDED' ? 'Suspended'
       : tenantStatus === 'CANCELLED' ? 'Cancelled'
       : 'On trial'}
    </div>
  );

  // Read-only branch: tenant-user / anonymous / public-marketplace-visitor /
  // freelancer / etc. These roles cannot manage the tenant lifecycle — render
  // status badge only + contact-admin guidance. No destructive buttons in DOM.
  if (!canManageLifecycle) {
    return (
      <div
        className="p-6 max-w-xl"
        data-testid="tenant-lifecycle-page"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Workspace Status</h1>
        {statusBadge}
        <div
          data-testid="tenant-lifecycle-readonly-note"
          className="p-4 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
        >
          <p className="font-semibold mb-1">Your workspace is {statusLabel(tenantStatus)}.</p>
          <p>
            Contact your workspace administrator to change status. Lifecycle
            controls are available to tenant admins and platform admins only.
          </p>
        </div>
      </div>
    );
  }

  // Admin branch — full lifecycle controls (platform-admin + tenant-admin).
  return (
    <div
      className="p-6 max-w-xl"
      data-testid="tenant-lifecycle-page"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tenant Lifecycle</h1>

      {statusBadge}

      {lastAction && (
        <div data-testid="last-action" className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
          {lastAction}
        </div>
      )}

      {error && (
        <div data-testid="lifecycle-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button data-testid="suspend-button" onClick={handleSuspend}
          disabled={tenantStatus !== 'ACTIVE'}
          className="w-full bg-yellow-600 text-white py-2 rounded font-medium hover:bg-yellow-700 disabled:bg-gray-400">
          Suspend Tenant
        </button>
        <button data-testid="reactivate-button" onClick={handleReactivate}
          disabled={tenantStatus !== 'SUSPENDED'}
          className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 disabled:bg-gray-400">
          Reactivate Tenant
        </button>
        <button data-testid="terminate-button" onClick={handleTerminate}
          disabled={tenantStatus === 'CANCELLED'}
          className="w-full bg-red-600 text-white py-2 rounded font-medium hover:bg-red-700 disabled:bg-gray-400">
          Terminate Tenant
        </button>
      </div>
    </div>
  );
}
