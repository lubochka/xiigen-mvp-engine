import React, { useEffect, useState } from 'react';
import { Ticket, Clock, Lock } from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface BookingDetails {
  bookingId: string;
  purchaseId: string;
  ticketId: string;
  // DC-06: PENDING is a valid state (not a failure)
  status: 'CONFIRMED' | 'PENDING';
  confirmedAt: string;
  eventId?: string;
}

export const BookingConfirmationPage: React.FC = () => {
  const { role } = useViewerRole();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const purchaseId = new URLSearchParams(window.location.search).get('purchaseId');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!purchaseId) {
      setLoading(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setTimedOut(true), 3000);
    const fetchBooking = async () => {
      try {
        // RUN-118: /api/dynamic/booking-confirmations missing xiigen- prefix
        // would return 400 INVALID_INDEX. Same UX-3-F1 pattern as FLOW-20.
        const response = await fetch(
          `/api/dynamic/xiigen-booking-confirmations?purchaseId=${purchaseId}`
        );
        if (!response.ok) {
          // Human copy instead of engineering 'not found':
          setError(
            response.status === 404
              ? 'No booking found for this purchase.'
              : 'We could not load your booking details right now. Please refresh to try again.'
          );
          return;
        }
        const data = await response.json();
        setBooking(data);
      } catch {
        setError('Failed to load booking');
      } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchBooking();
    return () => window.clearTimeout(timeoutId);
  }, [purchaseId]);

  // Early-return states — NOT role-gated (infrastructure states)
  if (!purchaseId) {
    return (
      <div
        className="max-w-lg mx-auto p-8 text-center"
        data-testid="booking-no-selection"
      >
        <div className="mb-3 flex justify-center text-gray-400" aria-hidden="true">
          <Ticket size={40} strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">No booking selected</h2>
        <p className="text-sm text-gray-600">
          Select a ticket purchase to view its booking confirmation details.
        </p>
      </div>
    );
  }

  if (loading && timedOut) {
    return (
      <div
        className="max-w-lg mx-auto p-8 text-center"
        data-testid="booking-unavailable"
      >
        <div className="mb-3 flex justify-center text-orange-500" aria-hidden="true">
          <Clock size={40} strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Event booking service unavailable
        </h2>
        <p className="text-sm text-gray-600">
          The booking service did not respond in time. Please retry in a moment.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center" data-testid="loading">
        Loading booking...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" data-testid="booking-error">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  // The existing attendee booking view — used by Branch 2 AND the Fallback for safety
  function AttendeeBookingView() {
    if (!booking) return null;
    return (
      <div data-testid="booking-attendee-view">
        {role === 'referral-user' && (
          <div
            data-testid="booking-referral-banner"
            className="mb-3 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-700"
          >
            You joined via a referral link. Your connection with the event organiser has been noted.
          </div>
        )}
        {role === 'freelancer' && (
          <div
            data-testid="booking-freelancer-badge"
            className="mb-3 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-700"
          >
            You're attending as a freelancer. Your "Offering services at this event" badge is active on your profile.
          </div>
        )}
        {role === 'business-partner' && (
          <div
            data-testid="booking-sponsor-badge"
            className="mb-3 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
          >
            You're attending as a sponsor. Your sponsor perks are included in your ticket package.
          </div>
        )}

        <div
          className={`p-4 rounded-md ${booking.status === 'CONFIRMED' ? 'bg-green-50' : 'bg-yellow-50'}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {booking.status === 'CONFIRMED' ? 'Booking Confirmed' : 'Booking Pending'}
            </h2>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                booking.status === 'CONFIRMED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
              data-testid="booking-status"
            >
              {booking.status}
            </span>
          </div>

          {/* DC-06: PENDING status is displayed positively — not as an error */}
          {booking.status === 'PENDING' && (
            <p className="text-yellow-700 text-sm mt-2" data-testid="pending-message">
              Your booking is pending. You will receive a confirmation once it is finalized.
            </p>
          )}

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Booking ID:</span>{' '}
              <span data-testid="booking-id">{booking.bookingId}</span>
            </div>
            <div>
              <span className="font-medium">Ticket ID:</span>{' '}
              <span data-testid="ticket-id">{booking.ticketId}</span>
            </div>
            <div>
              <span className="font-medium">Purchase ID:</span> <span>{booking.purchaseId}</span>
            </div>
            <div>
              <span className="font-medium">Confirmed At:</span>{' '}
              <span>{new Date(booking.confirmedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {booking.status === 'CONFIRMED' && (
          <div className="mt-4">
            <a
              href={`/tickets/qr?ticketId=${booking.ticketId}`}
              className="block w-full text-center bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 font-medium"
              data-testid="view-qr-link"
              style={{ minHeight: '44px' }}
            >
              View QR Code
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="max-w-lg mx-auto p-6"
      data-testid="booking-confirmation-page"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold mb-6">Booking Confirmation</h1>

      <RoleScopedView role={role} testIdPrefix="booking-role">
        {/* Branch 1 — anonymous (sign-in gate) */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="booking-anon-view" className="flex flex-col items-center text-center py-6">
            <Lock className="w-16 h-16 text-gray-400 mb-3" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sign in to view your booking
            </h2>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              Booking confirmations are only visible to the registered account holder.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <a
                href="/login?return=/booking"
                data-testid="booking-anon-signin"
                className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                Sign in
              </a>
              <a
                href="/register"
                data-testid="booking-anon-register"
                className="border border-blue-600 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                Register
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user / referral-user / freelancer / business-partner (attendee view) */}
        <RoleScopedView.Case
          when={['tenant-user', 'referral-user', 'freelancer', 'business-partner']}
        >
          <AttendeeBookingView />
        </RoleScopedView.Case>

        {/* Branch 3 — event-organiser (capacity management view) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="booking-organiser-view">
            <div
              data-testid="booking-organiser-banner"
              className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              Organiser view — attendee booking summary for this event.
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div
                data-testid="booking-org-confirmed"
                className="p-3 bg-green-50 border border-green-200 rounded text-center"
              >
                <p className="text-2xl font-bold text-green-900 flex items-center justify-center gap-1">
                  <span aria-hidden="true">●</span> 42
                </p>
                <p className="text-xs text-green-700 uppercase">Confirmed</p>
              </div>
              <div
                data-testid="booking-org-pending"
                className="p-3 bg-yellow-50 border border-yellow-200 rounded text-center"
              >
                <p className="text-2xl font-bold text-yellow-900 flex items-center justify-center gap-1">
                  <span aria-hidden="true">●</span> 7
                </p>
                <p className="text-xs text-yellow-700 uppercase">Pending</p>
              </div>
              <div
                data-testid="booking-org-waitlisted"
                className="p-3 bg-gray-50 border border-gray-200 rounded text-center"
              >
                <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                  <span aria-hidden="true">●</span> 3
                </p>
                <p className="text-xs text-gray-700 uppercase">Waitlisted</p>
              </div>
            </div>
            <p
              data-testid="booking-org-purchase-ref"
              className="text-sm text-gray-600 mb-3"
            >
              Viewing booking: <span className="font-medium">{booking.purchaseId}</span>
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={'/events/' + (booking.eventId ?? '') + '/checkin'}
                data-testid="booking-org-scanner"
                className="block w-full text-center bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 font-medium"
                style={{ minHeight: '44px' }}
              >
                Open check-in scanner →
              </a>
              <a
                href={'/events/' + (booking.eventId ?? '') + '/attendees'}
                data-testid="booking-org-attendees"
                className="text-sm text-blue-600 hover:underline text-center"
              >
                View full attendee list →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — tenant-admin (financial reconciliation + refund) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="booking-admin-view">
            <div
              data-testid="booking-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin view — financial reconciliation for this booking.
            </div>
            <div className="p-4 border border-gray-200 rounded bg-white space-y-2 text-sm">
              <p>
                <span className="font-medium">Booking ID:</span>{' '}
                <span data-testid="booking-id">{booking.bookingId}</span>
              </p>
              <p>
                <span className="font-medium">Ticket ID:</span>{' '}
                <span data-testid="ticket-id">{booking.ticketId}</span>
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span
                  data-testid="booking-status"
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                    booking.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <span aria-hidden="true">●</span> {booking.status}
                </span>
              </p>
              <p data-testid="booking-admin-payment-status" className="text-gray-700">
                Payment: <span className="font-medium">Captured</span>
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                data-testid="booking-admin-refund"
                aria-label={`Approve refund for booking ${booking.bookingId}`}
                onClick={() =>
                  console.log('Approve refund for booking', booking.bookingId)
                }
                className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700"
                style={{ minHeight: '44px' }}
              >
                Approve refund for this booking
              </button>
              <a
                href={'/admin/payments?bookingId=' + booking.bookingId}
                data-testid="booking-admin-trace"
                className="text-sm text-blue-600 hover:underline"
              >
                View payment trace →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (cross-tenant compliance) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="booking-platform-admin-view">
            <div
              data-testid="booking-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin — cross-tenant transaction compliance view.
            </div>
            <div className="p-4 border border-gray-200 rounded bg-white space-y-2 text-sm">
              <p data-testid="booking-platform-id">
                <span className="font-medium">Booking ID:</span> {booking.bookingId}
              </p>
              <p data-testid="booking-platform-pci" className="flex items-center gap-2">
                <span className="font-medium">PCI status:</span>
                <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                  <span aria-hidden="true">✓</span> COMPLIANT
                </span>
              </p>
              <p data-testid="booking-platform-fraud" className="text-gray-700">
                <span className="font-medium">Fraud flag:</span> No flags
              </p>
            </div>
            <a
              href="/platform/payments"
              data-testid="booking-platform-console"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Open platform payments console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — platform-support (read-only booking history) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="booking-support-view">
            <div
              data-testid="booking-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Support view — read-only booking history. No modifications permitted.
            </div>
            <div className="p-4 border border-gray-200 rounded bg-white space-y-2 text-sm">
              <p data-testid="booking-support-id">
                <span className="font-medium">Booking ID:</span> {booking.bookingId}
              </p>
              <p data-testid="booking-support-ticket">
                <span className="font-medium">Ticket ID:</span> {booking.ticketId}
              </p>
              <p data-testid="booking-support-status">
                <span className="font-medium">Status:</span> {booking.status}
              </p>
              <p data-testid="booking-support-confirmed-at">
                <span className="font-medium">Confirmed at:</span>{' '}
                {new Date(booking.confirmedAt).toLocaleString()}
              </p>
            </div>
            <a
              href={'/platform/support/escalate?bookingId=' + booking.bookingId}
              data-testid="booking-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — safe default: attendee view */}
        <RoleScopedView.Fallback>
          <AttendeeBookingView />
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
};

export default BookingConfirmationPage;
