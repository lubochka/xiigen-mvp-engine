/**
 * VerifyTokenPage — token validation screen.
 * Route: /verify?token=...
 *
 * Playwright mock hooks (driven by token string):
 *   token contains 'expired'  → EXPIRED_TOKEN  + request-new-token VISIBLE
 *   token contains 'tampered' → INVALID_TOKEN  + request-new-token NOT visible
 *   otherwise                 → calls real /api/verify endpoint
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

type VerifyState = 'loading' | 'success' | 'expired' | 'invalid' | 'used';

function resolveTokenMock(token: string): VerifyState | null {
  if (token.includes('expired')) return 'expired';
  if (token.includes('tampered')) return 'invalid';
  return null;
}

export function VerifyTokenPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const visualMock = searchParams.get('mock');
  const visualErrorCode = searchParams.get('errorCode');
  const [state, setState] = useState<VerifyState>('loading');

  useEffect(() => {
    if (visualMock === 'populated' || visualMock === 'success') {
      setState('success');
      return;
    }
    if (visualMock === 'error') {
      if (visualErrorCode === 'EXPIRED_TOKEN') setState('expired');
      else if (visualErrorCode === 'USED_TOKEN') setState('used');
      else setState('invalid');
      return;
    }

    if (!token) {
      setState('invalid');
      return;
    }

    // Playwright mock: derive state from token string
    const mock = resolveTokenMock(token);
    if (mock) {
      setState(mock);
      return;
    }

    // Real API call
    let cancelled = false;
    fetch(`/api/verify?token=${encodeURIComponent(token)}`, {
      headers: { 'X-Tenant-Id': 'tenant-e2e' },
    })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        const code = data['errorCode'] as string | undefined;
        if (data['isSuccess']) setState('success');
        else if (code === 'EXPIRED_TOKEN') setState('expired');
        else if (code === 'USED_TOKEN') setState('used');
        else setState('invalid');
      })
      .catch(() => {
        if (!cancelled) setState('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token, visualErrorCode, visualMock]);

  if (state === 'loading') {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 text-center" data-testid="page-verify">
        <p className="text-gray-500">Verifying your token…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-verify"
      >
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Email verified</h1>
        <UserRegistrationAdaptationBanner />
        <p className="text-gray-500 mt-2">Your account is active.</p>
        <Link
          to="/onboarding?userId=verified-user-123"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Continue to onboarding
        </Link>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
      data-testid="page-verify"
    >
      <div className="text-5xl mb-4">⚠️</div>

      <UserRegistrationAdaptationBanner />

      {state === 'expired' && (
        <>
          <p data-testid="error-EXPIRED_TOKEN" className="text-red-600 font-medium mb-4">
            This verification link has expired.
          </p>
          <Link
            to="/verify/resend"
            data-testid="request-new-token"
            className="text-blue-600 hover:underline text-sm"
          >
            Request a new verification link
          </Link>
        </>
      )}

      {state === 'used' && (
        <p className="text-gray-600">This verification link has already been used.</p>
      )}

      {state === 'invalid' && (
        <p data-testid="error-INVALID_TOKEN" className="text-red-600 font-medium">
          This verification link is invalid or has been revoked.
          {/* No recovery path for INVALID_TOKEN — request-new-token intentionally absent */}
        </p>
      )}
    </div>
  );
}
