/**
 * useViewerRole — resolves the current viewer's role for role-scoped rendering.
 *
 * Resolution order (highest priority first):
 *   1. URL query param `?role=<ViewerRole>` (for Playwright mock-states)
 *   2. localStorage key `xiigen.viewerRole` (persisted user pick)
 *   3. Explicit prop `initialRole` passed to the hook
 *   4. DEFAULT_VIEWER_ROLE ('anonymous')
 *
 * When the URL param or localStorage holds an unknown value, it falls through
 * to the next level. This matches the behaviour of useTranslation's missing-
 * key fallback pipeline.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type ViewerRole,
  VIEWER_ROLES,
  DEFAULT_VIEWER_ROLE,
} from '../components/common/ViewerRole';

const LS_KEY = 'xiigen.viewerRole';

function isValidRole(v: unknown): v is ViewerRole {
  return typeof v === 'string' && (VIEWER_ROLES as readonly string[]).includes(v);
}

export function useViewerRole(initialRole: ViewerRole = DEFAULT_VIEWER_ROLE): {
  role: ViewerRole;
  setRole: (next: ViewerRole) => void;
} {
  const [searchParams] = useSearchParams();
  const [role, setRoleState] = useState<ViewerRole>(() => {
    const urlRole = searchParams.get('role');
    if (isValidRole(urlRole)) return urlRole;
    try {
      const stored = window.localStorage.getItem(LS_KEY);
      if (isValidRole(stored)) return stored;
    } catch {
      // localStorage unavailable (private mode / iframe)
    }
    return initialRole;
  });

  // If the URL param changes at runtime (e.g., Playwright navigates), re-resolve.
  useEffect(() => {
    const urlRole = searchParams.get('role');
    if (isValidRole(urlRole) && urlRole !== role) {
      setRoleState(urlRole);
    }
  }, [searchParams, role]);

  function setRole(next: ViewerRole): void {
    try {
      window.localStorage.setItem(LS_KEY, next);
    } catch {
      // ignore
    }
    setRoleState(next);
  }

  return { role, setRole };
}
