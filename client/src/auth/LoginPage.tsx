/**
 * LoginPage — FLOW-01 Phase A6 (V-08).
 *
 * Minimal email + password form that calls AuthContext.login() and — on
 * success — navigates to `location.state.from` (if RequireAuth captured a
 * return URL) or to `/dashboard` otherwise.
 *
 * Intentionally boring:
 *   - No SSO button (SsoPage lives under /auth/sso/:provider and is a
 *     separate surface shipped in FLOW-01 Phase C2).
 *   - No "remember me" toggle — persistence is always via localStorage so
 *     reloads pick up the session.
 *   - No password-reset link — that's FLOW-01 Phase C5.
 *
 * a11y:
 *   - <form> with proper <label for=> bindings
 *   - error banner `role="alert"` + `aria-live="assertive"`
 *   - submit button disabled while `status === 'loading'`
 *
 * Styling: matches the plain-Tailwind aesthetic of RegistrationPage so the
 * two login-or-register entry points feel like siblings.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from './AuthContext';

interface LoginLocationState {
  from?: string;
}

export function LoginPage(): React.ReactElement {
  const { login, status, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const isLoading = submitting || status === 'loading';

  // Preserve the "return to" URL captured by RequireAuth (if any).
  const returnTo =
    (location.state as LoginLocationState | null)?.from && typeof (location.state as LoginLocationState).from === 'string'
      ? (location.state as LoginLocationState).from!
      : '/dashboard';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (isLoading) return;
    setSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        navigate(returnTo, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
      data-testid="page-login"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter your email and password to access your workspace.
      </p>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="login-error"
        >
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="login-email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="login-email-input"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="login-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="login-password-input"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`inline-flex w-full items-center justify-center rounded px-4 py-2 text-sm font-semibold text-white shadow-sm ${
            isLoading
              ? 'bg-blue-400 cursor-wait'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300'
          }`}
          data-testid="login-submit"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
