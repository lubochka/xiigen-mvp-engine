/**
 * AuthContext — FLOW-01 Phase A6 (V-08).
 *
 * React context that owns the client's authentication state:
 *
 *   - `token`   — bearer JWT, persisted in localStorage
 *   - `user`    — JwtVerifiedPrincipal returned from GET /api/auth/me
 *   - `status`  — 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
 *
 * Public actions:
 *
 *   - `login(email, password)`   → calls POST /api/auth/login, persists token,
 *                                  then hydrates `user` via GET /api/auth/me
 *   - `logout()`                 → clears state + localStorage (no server call)
 *   - `refresh()`                → exchanges the live token for a new one
 *
 * Rehydration:
 *   On mount the provider reads the stored token (if any) and calls `me()`
 *   to verify it's still live. A rejected probe clears storage and lands in
 *   `unauthenticated`. While the probe is in-flight, `status === 'loading'`
 *   — consumers should gate UI on this.
 *
 * Storage:
 *   Key is `xiigen.auth.token`. Access is try/catch-wrapped so Safari
 *   private-browsing + server-side rendering never crash the provider.
 *
 * Ordering discipline:
 *   Writing the token to storage happens BEFORE calling `me()` so a mid-boot
 *   refresh of the page picks up the in-progress login. We revert storage if
 *   `me()` rejects so stale tokens never linger.
 */

import React from 'react';
import {
  login as apiLogin,
  me as apiMe,
  refresh as apiRefresh,
  type AuthApiConfig,
  type JwtVerifiedPrincipal,
} from './api';

// ── Types ──────────────────────────────────────────────────────────────────

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

export interface AuthState {
  readonly status: AuthStatus;
  readonly token: string | null;
  readonly user: JwtVerifiedPrincipal | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}

export interface AuthActions {
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  refresh(): Promise<boolean>;
}

export type AuthContextValue = AuthState & AuthActions;

// ── Storage helpers (safe wrappers) ────────────────────────────────────────

export const AUTH_STORAGE_KEY = 'xiigen.auth.token';

function readStoredToken(): string | null {
  try {
    const value = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token === null) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(AUTH_STORAGE_KEY, token);
    }
  } catch {
    // localStorage unavailable — fail silent; in-memory state still works.
  }
}

// ── Context ────────────────────────────────────────────────────────────────

const DEFAULT_VALUE: AuthContextValue = {
  status: 'idle',
  token: null,
  user: null,
  error: null,
  login: async () => false,
  logout: () => {
    /* no-op default */
  },
  refresh: async () => false,
};

const AuthContext = React.createContext<AuthContextValue>(DEFAULT_VALUE);

// ── Provider ───────────────────────────────────────────────────────────────

export interface AuthProviderProps {
  readonly children: React.ReactNode;
  /** Override the auth API config for tests (fetchFn stub, baseUrl). */
  readonly apiConfig?: Partial<AuthApiConfig>;
  /** Skip the on-mount /me probe (tests that want a clean slate). */
  readonly skipBootProbe?: boolean;
}

export function AuthProvider({
  children,
  apiConfig,
  skipBootProbe,
}: AuthProviderProps): React.ReactElement {
  const [state, setState] = React.useState<AuthState>(() => ({
    status: 'idle',
    token: readStoredToken(),
    user: null,
    error: null,
  }));

  // Keep the config reference stable across renders so the useEffect below
  // runs exactly once on mount.
  const apiConfigRef = React.useRef(apiConfig);
  apiConfigRef.current = apiConfig;

  // ── On-mount rehydration ─────────────────────────────────────────────────

  React.useEffect(() => {
    if (skipBootProbe) {
      setState((prev) => ({ ...prev, status: 'unauthenticated' }));
      return;
    }
    const token = readStoredToken();
    if (!token) {
      setState((prev) => ({ ...prev, status: 'unauthenticated' }));
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));
    void apiMe(token, apiConfigRef.current).then((result) => {
      if (cancelled) return;
      if (result.isSuccess && result.data) {
        setState({
          status: 'authenticated',
          token,
          user: result.data,
          error: null,
        });
      } else {
        writeStoredToken(null);
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          error: result.error
            ? { code: result.error.code, message: result.error.message }
            : null,
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipBootProbe]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const login = React.useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));
      const loginResult = await apiLogin({ email, password }, apiConfigRef.current);
      if (!loginResult.isSuccess || !loginResult.data) {
        const err = loginResult.error;
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          error: err ? { code: err.code, message: err.message } : null,
        });
        return false;
      }
      const token = loginResult.data.token;
      writeStoredToken(token);

      // Immediately probe /me so we have the full principal (tenantId etc.).
      const meResult = await apiMe(token, apiConfigRef.current);
      if (!meResult.isSuccess || !meResult.data) {
        writeStoredToken(null);
        const err = meResult.error;
        setState({
          status: 'unauthenticated',
          token: null,
          user: null,
          error: err ? { code: err.code, message: err.message } : null,
        });
        return false;
      }

      setState({
        status: 'authenticated',
        token,
        user: meResult.data,
        error: null,
      });
      return true;
    },
    [],
  );

  const logout = React.useCallback((): void => {
    writeStoredToken(null);
    setState({
      status: 'unauthenticated',
      token: null,
      user: null,
      error: null,
    });
  }, []);

  const refresh = React.useCallback(async (): Promise<boolean> => {
    const currentToken = readStoredToken();
    if (!currentToken) {
      setState((prev) => ({
        ...prev,
        status: 'unauthenticated',
        token: null,
        user: null,
      }));
      return false;
    }
    const refreshResult = await apiRefresh(currentToken, apiConfigRef.current);
    if (!refreshResult.isSuccess || !refreshResult.data) {
      writeStoredToken(null);
      const err = refreshResult.error;
      setState({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: err ? { code: err.code, message: err.message } : null,
      });
      return false;
    }
    const nextToken = refreshResult.data.token;
    writeStoredToken(nextToken);

    const meResult = await apiMe(nextToken, apiConfigRef.current);
    if (!meResult.isSuccess || !meResult.data) {
      writeStoredToken(null);
      const err = meResult.error;
      setState({
        status: 'unauthenticated',
        token: null,
        user: null,
        error: err ? { code: err.code, message: err.message } : null,
      });
      return false;
    }

    setState({
      status: 'authenticated',
      token: nextToken,
      user: meResult.data,
      error: null,
    });
    return true;
  }, []);

  const value: AuthContextValue = React.useMemo(
    () => ({ ...state, login, logout, refresh }),
    [state, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────

/**
 * Read the auth context. Always returns a value — when no provider is
 * mounted, the `DEFAULT_VALUE` no-op shape is returned. This matches the
 * existing xiigen hook ergonomic (never throws from a render path).
 */
export function useAuth(): AuthContextValue {
  return React.useContext(AuthContext);
}

// ── Exports for tests ──────────────────────────────────────────────────────

export { AuthContext as __AuthContext };
