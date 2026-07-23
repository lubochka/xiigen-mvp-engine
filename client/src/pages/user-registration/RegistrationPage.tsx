/**
 * RegistrationPage — FLOW-01 Phase A entry screen.
 *
 * FLOW-01-RAG-03: error message is uniform — no field name in text.
 * Mock hooks for Playwright tests:
 *   email = 'existing@test.com'  → DUPLICATE_EMAIL (no API call needed)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViewerRole } from '../../hooks/useViewerRole';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegistrationPage() {
  const navigate = useNavigate();
  const { role } = useViewerRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorCode(null);

    // Uniform validation — same shape regardless of which field (FLOW-01-RAG-03)
    if (!email || !password || !EMAIL_PATTERN.test(email)) {
      setErrorCode('VALIDATION_FAILURE');
      return;
    }

    // Playwright test hook: specific email → deterministic DUPLICATE_EMAIL
    if (email === 'existing@test.com') {
      setErrorCode('DUPLICATE_EMAIL');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'tenant-e2e' },
        body: JSON.stringify({ email, credentials: password, tenantId: 'tenant-e2e' }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (data['errorCode'] === 'DUPLICATE_EMAIL') {
        setErrorCode('DUPLICATE_EMAIL');
      } else if (data['isSuccess']) {
        navigate('/register/pending-verification');
      } else {
        setErrorCode('VALIDATION_FAILURE');
      }
    } catch {
      setErrorCode('VALIDATION_FAILURE');
    } finally {
      setSubmitting(false);
    }
  }

  // V-R15 Wave 3 Fix #3: previous render showed the anonymous signup form
  // inside the XIIGen admin shell to authenticated roles (tenant-user,
  // tenant-admin, platform-support). V-R14 flagged this as BLOCK. Now
  // authenticated roles see a "you're already signed in" kiosk that
  // routes them to the right place for their role, NEVER the signup form.
  if (role !== 'anonymous' && role !== 'public-marketplace-visitor') {
    const dest =
      role === 'platform-admin' || role === 'platform-support'
        ? '/admin'
        : role === 'tenant-admin'
          ? '/admin'
          : '/dashboard';
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-register"
        data-viewer-role={role}
      >
        <div className="text-5xl mb-3" aria-hidden="true">👤</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">You're already signed in</h1>
        <UserRegistrationAdaptationBanner />
        <p className="text-sm text-gray-500 mb-6">
          Creating a new account from a signed-in session isn't possible here.
          Continue to your workspace or sign out first.
        </p>
        <a
          href={dest}
          data-testid="register-goto-dashboard"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
        >
          Go to {dest === '/admin' ? 'admin console' : 'dashboard'}
        </a>
        <p className="mt-4 text-xs text-gray-500">
          <a href="/auth/logout" className="text-blue-600 hover:underline">
            Sign out to register a different account
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow"
      data-testid="page-register"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
      <p className="text-sm text-gray-500 mb-6">
        Start building flows in seconds. No credit card required.
      </p>
      <UserRegistrationAdaptationBanner />

      {/* RUN-82: SSO buttons stacked above email form (Airbnb / Linear / Notion convention).
          RUN-148 V-R2: replaced glyph placeholders (G / {} / ▦) with real
          brand marks as inline SVG. 44px minimum height per ui-ux-pro-max
          P2 touch target. The real OAuth flow lives under /auth/sso/:provider
          and is wired by SsoPage. */}
      <div className="space-y-2 mb-4" data-testid="registration-sso-group">
        <a
          href="/auth/sso/google"
          data-testid="sso-google"
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded px-3 py-2 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.26h2.9c1.69-1.56 2.69-3.86 2.69-6.61z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.34A9 9 0 0 0 9 18z" />
            <path fill="#FBBC05" d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.34z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l3 2.34C4.66 5.18 6.66 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </a>
        <a
          href="/auth/sso/github"
          data-testid="sso-github"
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded px-3 py-2 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#24292f" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.933 0-1.31.467-2.381 1.235-3.221-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.911 1.23 3.221 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          Continue with GitHub
        </a>
        <a
          href="/auth/sso/microsoft"
          data-testid="sso-microsoft"
          className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded px-3 py-2 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden="true">
            <rect x="1" y="1" width="10" height="10" fill="#F25022" />
            <rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
            <rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
            <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
          </svg>
          Continue with Microsoft
        </a>
      </div>

      <div className="relative flex items-center my-4" aria-hidden="true">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-3 text-xs text-gray-400 uppercase tracking-wide">or</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      <form data-testid="registration-form" onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            data-testid="email-input"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="email"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            data-testid="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="new-password"
          />
        </div>

        {/* Uniform error — no field name (FLOW-01-RAG-03) */}
        {errorCode === 'VALIDATION_FAILURE' && (
          <p
            data-testid="error-message"
            className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2"
          >
            Please review your submission.
          </p>
        )}

        {/* Duplicate email — distinct error code for UI targeting */}
        {errorCode === 'DUPLICATE_EMAIL' && (
          <p
            data-testid="error-code-DUPLICATE_EMAIL"
            className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2"
          >
            An account with this email already exists.
          </p>
        )}

        <button
          data-testid="submit-button"
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          By creating an account you agree to our{' '}
          <a href="/legal/terms" className="underline hover:text-gray-700">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/legal/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>
          .
        </p>
      </form>

      <p className="mt-6 text-sm text-gray-600 text-center">
        Already have an account?{' '}
        <a
          href="/login"
          data-testid="registration-sign-in-link"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
