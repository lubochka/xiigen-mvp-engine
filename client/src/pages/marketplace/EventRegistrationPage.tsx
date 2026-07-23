/**
 * FLOW-08 — EventRegistrationPage
 * Register for an event. Shows status: CONFIRMED, WAITLISTED, BLOCKED.
 * Data operations via /api/dynamic/xiigen-registrations
 */

import React, { useState } from 'react';
import { useViewerRole } from '../../hooks/useViewerRole';

type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED' | 'BLOCKED' | null;

function registrationErrorMessage(status: number): string {
  if (status === 401) return 'Please sign in before registering for this event.';
  if (status === 403) return 'Registration is not available for your account.';
  if (status === 404) return 'Registration is temporarily unavailable for this event.';
  if (status === 409) return 'You are already registered for this event.';
  return 'We could not complete registration right now. Please try again later.';
}

export function EventRegistrationPage({ eventId = 'event-001' }: { eventId?: string }) {
  const { role } = useViewerRole();
  const [status, setStatus] = useState<RegistrationStatus>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIdempotent, setIsIdempotent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const register = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    setIsIdempotent(false);
    setRateLimited(false);
    try {
      const resp = await fetch('/api/dynamic/xiigen-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (resp.status === 429) {
        setRateLimited(true);
        return;
      }
      if (!resp.ok) {
        setError(registrationErrorMessage(resp.status));
        return;
      }
      const data = await resp.json();
      setStatus(data?.status ?? null);
      setIsIdempotent(data?.idempotent === true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto" data-testid="event-registration-page" data-viewer-role={role}>
      {role === 'anonymous' && (
        <div
          data-testid="event-reg-anon-signin"
          role="note"
          className="mb-4 p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
        >
          Sign in to register — event registration is available to authenticated
          attendees.{' '}
          <a
            href="/login"
            className="font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Sign in →
          </a>
        </div>
      )}
      {role === 'event-organiser' && (
        <div
          data-testid="event-reg-organiser-note"
          role="note"
          className="mb-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
        >
          As the event organiser, use <a href="/attendance" className="font-semibold underline">the attendance dashboard</a> to manage capacity,
          rather than registering yourself here.
        </div>
      )}
      <h1 className="text-2xl font-bold mb-6">Event Registration</h1>
      <p className="text-gray-600 mb-4">
        Event ID: <span data-testid="event-id">{eventId}</span>
      </p>

      <button
        className="bg-blue-600 text-white px-6 py-3 rounded disabled:opacity-50 w-full"
        onClick={register}
        disabled={loading}
        data-testid="register-btn"
      >
        {loading ? 'Registering...' : 'Register for Event'}
      </button>

      {error && (
        <div
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded"
          data-testid="registration-error"
        >
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {rateLimited && (
        <div
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded"
          data-testid="rate-limit-message"
        >
          <p className="text-yellow-700">
            Registration rate limit exceeded. Please try again later.
          </p>
        </div>
      )}

      {status === 'CONFIRMED' && (
        <div
          className="mt-4 p-3 bg-green-50 border border-green-200 rounded"
          data-testid="registration-confirmed"
        >
          <p className="text-green-700">
            Registration confirmed!
            {isIdempotent && (
              <span data-testid="existing-registration"> (Existing registration found)</span>
            )}
          </p>
        </div>
      )}

      {status === 'WAITLISTED' && (
        <div
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded"
          data-testid="registration-waitlisted"
        >
          <p className="text-yellow-700">
            You have been added to the waitlist. Capacity is currently full.
          </p>
        </div>
      )}

      {status === 'BLOCKED' && (
        <div
          className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded"
          data-testid="registration-blocked"
        >
          <p className="text-gray-600">Registration is not available for this event.</p>
        </div>
      )}
    </div>
  );
}

export default EventRegistrationPage;
