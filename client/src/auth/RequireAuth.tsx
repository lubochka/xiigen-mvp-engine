/**
 * RequireAuth — FLOW-01 Phase A6 (V-08).
 *
 * Router guard that wraps a route element. Behaviour:
 *
 *   - `status === 'authenticated'` → renders children verbatim.
 *   - `status === 'unauthenticated'` → redirects to `/login`, attaching the
 *                                       return URL in `location.state.from`
 *                                       so LoginPage can bounce back after
 *                                       a successful sign-in.
 *   - `status === 'loading' | 'idle'` → renders a lightweight placeholder so
 *                                       a flash of unauth content is avoided
 *                                       while the on-mount /me probe is
 *                                       still resolving.
 *
 * Role-based access is a separate concern (future `<RequireRole roles={...}>`).
 * This component only asserts that the caller is authenticated.
 *
 * Usage:
 *
 *   <Route
 *     path="/admin"
 *     element={<RequireAuth><AdminPage /></RequireAuth>}
 *   />
 *
 * Not wired globally in App.tsx yet — Phase A6 ships the primitive; routing
 * integration is deferred alongside the broader @Public() sweep.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from './AuthContext';

export interface RequireAuthProps {
  readonly children: React.ReactNode;
  /** Path to redirect unauthenticated callers to. Defaults to `/login`. */
  readonly loginPath?: string;
  /** Component rendered while the initial /me probe is still in flight. */
  readonly loadingFallback?: React.ReactNode;
}

export function RequireAuth({
  children,
  loginPath = '/login',
  loadingFallback,
}: RequireAuthProps): React.ReactElement {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  if (status === 'unauthenticated') {
    // Attach the return URL so LoginPage can bounce back.
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // status === 'idle' or 'loading'
  return (
    <div
      className="flex items-center justify-center min-h-[40vh] text-gray-500"
      data-testid="require-auth-loading"
      role="status"
      aria-live="polite"
    >
      {loadingFallback ?? <span>Checking your session…</span>}
    </div>
  );
}
