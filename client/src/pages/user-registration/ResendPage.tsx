/**
 * ResendPage — resend verification email screen.
 * Route: /verify/resend?userId=...&rateLimited=true
 *
 * Playwright mock hooks:
 *   ?rateLimited=true                 → show rate-limit-message + retry-after
 *   ?rateLimitMinutes=N               → override retry-after value
 *                                       (reflects FREEDOM key
 *                                       flow01_resend_rate_limit_minutes).
 *                                       Default: 60 (platform default).
 *                                       Used by portability-cascade captures
 *                                       to visualize per-tenant FREEDOM
 *                                       adaptation per PROTOCOL-v1.1 (1)
 *                                       § Phase 3/5 Axis D check.
 *   ?tenantBrand=<name>               → label which tenant profile is active
 *                                       (rendered only under ?rateLimited=true
 *                                       for visual cascade evidence).
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

export function ResendPage() {
  const [searchParams] = useSearchParams();
  const mock = searchParams.get('mock');
  const rateLimited = searchParams.get('rateLimited') === 'true' || mock === 'error';
  const userId = searchParams.get('userId') ?? '';
  const initialEmail =
    searchParams.get('email') ?? (mock === 'populated' ? 'new.user@example.com' : '');
  const rateLimitMinutesRaw = searchParams.get('rateLimitMinutes');
  const rateLimitMinutes =
    rateLimitMinutesRaw !== null && Number.isFinite(Number(rateLimitMinutesRaw))
      ? Number(rateLimitMinutesRaw)
      : 60;
  const tenantBrand = searchParams.get('tenantBrand') ?? '';

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(initialEmail);

  // Playwright mock: if URL says rateLimited, show immediately
  if (rateLimited) {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-resend"
      >
        <div className="mb-4 flex justify-center text-orange-500" aria-hidden="true">
          <Clock size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Too many requests</h1>
        <UserRegistrationAdaptationBanner />

        <p data-testid="rate-limit-message" className="text-red-600 mb-4">
          You&apos;ve recently requested a verification email.
        </p>

        <p data-testid="retry-after" className="text-sm text-gray-500">
          Try again in {rateLimitMinutes} minutes.
        </p>

        {tenantBrand !== '' && (
          <p
            data-testid="tenant-brand-label"
            className="mt-4 text-xs text-gray-400"
          >
            Active profile: {tenantBrand}
          </p>
        )}
      </div>
    );
  }

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/verify/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': 'tenant-e2e' },
        body: JSON.stringify({ memberId: userId, email, tenantId: 'tenant-e2e' }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (data['isSuccess']) {
        setSent(true);
      } else {
        setError(String(data['errorMessage'] ?? 'Could not send email'));
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div
        className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
        data-testid="page-resend"
      >
        <div className="text-5xl mb-4">✉️</div>
        <UserRegistrationAdaptationBanner />
        <p className="text-gray-700">A new verification link has been sent.</p>
      </div>
    );
  }

  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
      data-testid="page-resend"
    >
      <h1 className="text-xl font-bold text-gray-900 mb-4">Resend verification email</h1>
      <UserRegistrationAdaptationBanner />

      {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

      <label className="mb-2 block text-start text-sm font-medium text-gray-700" htmlFor="resend-email">
        Email
      </label>
      <input
        id="resend-email"
        data-testid="resend-email-input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleResend}
        disabled={sending}
        className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? 'Sending…' : 'Resend link'}
      </button>
    </div>
  );
}
