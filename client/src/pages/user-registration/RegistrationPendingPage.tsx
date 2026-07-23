/**
 * RegistrationPendingPage — Verification email sent state.
 * Route: /register/pending-verification
 *
 * Playwright R-04: verification-pending + resend-link both visible.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { UserRegistrationAdaptationBanner } from './UserRegistrationAdaptationBanner';

export function RegistrationPendingPage() {
  return (
    <div
      className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow text-center"
      data-testid="page-pending"
    >
      <div className="text-5xl mb-4">✉️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
      <UserRegistrationAdaptationBanner />

      <p data-testid="verification-pending" className="text-gray-600 mb-6">
        We sent a verification link to your email address. Please click the link to activate your
        account.
      </p>

      <p className="text-sm text-gray-500 mb-4">Didn&apos;t receive it?</p>

      <Link
        to="/verify/resend"
        data-testid="resend-link"
        className="text-blue-600 hover:underline text-sm"
      >
        Resend verification email
      </Link>
    </div>
  );
}
