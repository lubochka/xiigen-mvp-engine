/**
 * SSO authentication bypass screen.
 * Route: /auth/sso/:provider?mock=true
 *
 * Mock mode renders the post-provider welcome state immediately for visual
 * evidence. The real flow still calls the provider endpoint first.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

export function SsoPage() {
  const [searchParams] = useSearchParams();
  const { provider } = useParams<{ provider: string }>();
  const mockMode = searchParams.get('mock');
  const isMock = mockMode === 'true' || mockMode === 'populated';

  const [state, setState] = useState<'redirecting' | 'onboarding' | 'error'>('redirecting');

  useEffect(() => {
    if (mockMode === 'redirecting') {
      return;
    }
    if (isMock) {
      setState('onboarding');
      return;
    }

    let cancelled = false;
    fetch(`/api/auth/sso/${provider ?? 'unknown'}`, {
      headers: { 'X-Tenant-Id': 'tenant-e2e' },
    })
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setState(data['isSuccess'] ? 'onboarding' : 'error');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [isMock, mockMode, provider]);

  if (state === 'redirecting') {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 text-center" data-testid="page-sso">
        <UserRegistrationAdaptationBanner />
        <p className="text-gray-500">Authenticating with {provider}...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-sso"
      >
        <UserRegistrationAdaptationBanner />
        <p className="text-red-600">SSO authentication failed. Please try again.</p>
      </div>
    );
  }

  const providerLabel =
    provider && provider.length > 0
      ? provider.charAt(0).toUpperCase() + provider.slice(1)
      : 'SSO';

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
      data-testid="page-sso"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        Welcome, signed in via {providerLabel}
      </h1>
      <UserRegistrationAdaptationBanner />
      <p className="text-sm text-gray-500 mb-6">
        Your identity is confirmed. Continue to XIIGen to finish workspace setup.
      </p>
      <a
        href="/onboarding?userId=verified-user-123"
        data-testid="onboarding-progress"
        className="inline-flex min-h-[44px] items-center justify-center rounded bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Continue to XIIGen
      </a>
    </div>
  );
}
