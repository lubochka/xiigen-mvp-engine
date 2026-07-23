/**
 * RsvpPage — FLOW-04 T63 RSVP entry screen.
 * Route: /rsvp
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=confirmed     → CONFIRMED state       (data-testid="rsvp-confirmed")
 *   ?mock=waitlisted    → WAITLISTED state       (data-testid="rsvp-waitlisted")
 *   ?mock=duplicate     → existing record        (data-testid="rsvp-duplicate")
 *   ?mock=cancelled     → cancellation success   (data-testid="rsvp-cancelled")
 *   ?mock=window-closed → cancel window expired  (data-testid="rsvp-window-closed")
 *   ?mock=error         → system error           (data-testid="rsvp-error")
 *   otherwise           → form state             (data-testid="rsvp-form")
 */

import React, { useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';

type RsvpStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';

function RsvpShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-lg mx-auto mt-6 sm:mt-16 px-4 sm:px-0 text-start"
      data-testid="page-rsvp"
    >
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sm:p-8">
        {children}
      </section>
    </div>
  );
}

export function RsvpPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [attendeeId, setAttendeeId] = useState('');
  const [eventId, setEventId] = useState('');
  const [validationError, setValidationError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(null);
  const [rsvpId, setRsvpId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // ── Mock states ───────────────────────────────────────────────────────────

  if (mockState === 'confirmed' || (submitted && rsvpStatus === 'CONFIRMED')) {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reservation confirmed</h1>
        <div
          data-testid="rsvp-confirmed"
          className="p-4 bg-green-50 border border-green-200 rounded"
        >
          <p className="text-green-700 text-sm font-medium">Your spot is confirmed.</p>
          {rsvpId && (
            <p className="text-green-600 text-xs mt-1" data-testid="rsvp-id">
              Confirmation: {rsvpId}
            </p>
          )}
          <p className="text-green-600 text-xs mt-1" data-testid="rsvp-status-label">
            Status: Confirmed
          </p>
          <button
            data-testid="cancel-rsvp-button"
            onClick={() => setCancelling(true)}
            className="mt-3 text-xs font-medium text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
          >
            Cancel reservation
          </button>
        </div>
        {cancelling && (
          <div
            data-testid="cancel-confirm-dialog"
            className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm"
          >
            <p className="text-gray-700">Cancel this reservation?</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                data-testid="confirm-cancel-button"
                className="text-xs px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Yes, cancel
              </button>
              <button
                data-testid="dismiss-cancel-button"
                onClick={() => setCancelling(false)}
                className="text-xs px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Keep reservation
              </button>
            </div>
          </div>
        )}
      </RsvpShell>
    );
  }

  if (mockState === 'waitlisted' || (submitted && rsvpStatus === 'WAITLISTED')) {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">You are on the waitlist</h1>
        <div
          data-testid="rsvp-waitlisted"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded"
        >
          <p className="text-yellow-700 text-sm font-medium">
            You&apos;ve been added to the waitlist.
          </p>
          <p className="text-yellow-600 text-xs mt-1" data-testid="rsvp-status-label">
            Status: Waitlisted
          </p>
          <p className="text-yellow-600 text-xs mt-1">
            You&apos;ll be notified if a spot becomes available.
          </p>
          <button
            data-testid="cancel-rsvp-button"
            className="mt-3 text-xs font-medium text-gray-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Leave waitlist
          </button>
        </div>
      </RsvpShell>
    );
  }

  if (mockState === 'duplicate') {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reservation already exists</h1>
        <div data-testid="rsvp-duplicate" className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-700 text-sm font-medium">
            You already have an RSVP for this event.
          </p>
          <p className="text-blue-600 text-xs mt-1">
            We found your existing registration, so you do not need to submit again.
          </p>
        </div>
      </RsvpShell>
    );
  }

  if (mockState === 'cancelled') {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reservation cancelled</h1>
        <div data-testid="rsvp-cancelled" className="p-4 bg-gray-50 border border-gray-200 rounded">
          <p className="text-gray-700 text-sm font-medium">Your reservation has been cancelled.</p>
          <NavLink to="/rsvp" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
            Reserve again
          </NavLink>
        </div>
      </RsvpShell>
    );
  }

  if (mockState === 'window-closed') {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Cancellation deadline passed</h1>
        <div
          data-testid="rsvp-window-closed"
          className="p-4 bg-orange-50 border border-orange-200 rounded"
        >
          <p className="text-orange-700 text-sm font-medium">
            The cancellation deadline has passed.
          </p>
          <p className="text-orange-600 text-xs mt-1">
            Contact the organiser if you need help with this reservation.
          </p>
        </div>
      </RsvpShell>
    );
  }

  if (mockState === 'error') {
    return (
      <RsvpShell>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Reservation unavailable</h1>
        <div data-testid="rsvp-error" className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm font-medium">
            We could not complete the reservation.
          </p>
          <p className="text-red-600 text-xs mt-1">
            Try again in a moment or contact the organiser.
          </p>
        </div>
      </RsvpShell>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(false);

    if (!attendeeId.trim() || !eventId.trim()) {
      setValidationError(true);
      return;
    }

    // Simulate confirmed in demo mode
    setRsvpId(`rsvp-${Date.now()}`);
    setRsvpStatus('CONFIRMED');
    setSubmitted(true);
  }

  return (
    <RsvpShell>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Reserve your spot</h1>
      <p className="text-sm text-gray-600 mb-6" data-testid="rsvp-detail-help">
        Enter the codes from your invitation or event page. You will receive confirmation
        immediately.
      </p>

      <form data-testid="rsvp-form" onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="attendee-code-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ticket or guest code
          </label>
          <input
            id="attendee-code-input"
            data-testid="attendee-id-input"
            type="text"
            value={attendeeId}
            onChange={(e) => setAttendeeId(e.target.value)}
            placeholder="guest-001"
            dir="ltr"
            autoComplete="off"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-start focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="event-code-input"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Event code
          </label>
          <input
            id="event-code-input"
            data-testid="event-id-input"
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="event-001"
            dir="ltr"
            autoComplete="off"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-start focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Uniform validation error — no field name */}
        {validationError && (
          <p
            data-testid="rsvp-validation-error"
            className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2"
          >
            Add both details before submitting.
          </p>
        )}

        <button
          data-testid="submit-button"
          type="submit"
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Reserve my spot
        </button>
      </form>
    </RsvpShell>
  );
}
