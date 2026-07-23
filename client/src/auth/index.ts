/**
 * Client auth barrel — FLOW-01 Phase A6 (V-08).
 *
 * Single import point for consumers:
 *
 *   import { AuthProvider, useAuth, RequireAuth, LoginPage } from '@/auth';
 *
 * Re-exports the four primitives shipped in A6 plus the API shapes, so
 * downstream pages can narrow on `user?.roles` without reaching into
 * internal modules.
 */

export {
  login,
  refresh,
  me,
  type LoginRequestDto,
  type LoginResponseDto,
  type JwtVerifiedPrincipal,
  type AuthApiConfig,
} from './api';

export {
  AuthProvider,
  useAuth,
  AUTH_STORAGE_KEY,
  type AuthStatus,
  type AuthState,
  type AuthActions,
  type AuthContextValue,
  type AuthProviderProps,
} from './AuthContext';

export { RequireAuth, type RequireAuthProps } from './RequireAuth';

export { LoginPage } from './LoginPage';
