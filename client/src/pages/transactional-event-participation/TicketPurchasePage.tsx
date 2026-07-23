import React, { useState } from 'react';
import { useViewerRole } from '../../hooks/useViewerRole';

interface TicketPurchaseState {
  status: 'idle' | 'reserving' | 'payment_pending' | 'waitlisted' | 'confirmed' | 'error';
  purchaseId?: string;
  holdId?: string;
  errorMessage?: string;
}

interface WalletTicket {
  id: string;
  eventName: string;
  date: string;
  venue: string;
  tier: string;
  qrCode: string;
}

interface CheckinEntry {
  name: string;
  time: string;
  tier: string;
}

interface RefundRow {
  txnId: string;
  event: string;
  amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
}

// Sample wallet tickets for tenant-user view
const SAMPLE_WALLET: WalletTicket[] = [
  {
    id: 'TKT-20260428-001',
    eventName: 'Annual Tech Summit 2026',
    date: 'Apr 28, 2026',
    venue: 'Moscone West, San Francisco',
    tier: 'VIP',
    qrCode: 'QR-ABC-123',
  },
  {
    id: 'TKT-20260515-042',
    eventName: 'Bay Area Product Leaders Meetup',
    date: 'May 15, 2026',
    venue: 'The Midway, SF',
    tier: 'General',
    qrCode: 'QR-DEF-456',
  },
  {
    id: 'TKT-20260601-117',
    eventName: 'DesignSystems Live 2026',
    date: 'Jun 01, 2026',
    venue: 'Yerba Buena Center',
    tier: 'Early Bird',
    qrCode: 'QR-GHI-789',
  },
];

// Sample check-in log for event-organiser view
const SAMPLE_CHECKINS: CheckinEntry[] = [
  { name: 'Priya Rao', time: '10:42 AM', tier: 'VIP' },
  { name: 'Marcus Chen', time: '10:41 AM', tier: 'General' },
  { name: 'Elena Novak', time: '10:39 AM', tier: 'VIP' },
];

// Sample refund queue for platform-admin view
const SAMPLE_REFUNDS: RefundRow[] = [
  {
    txnId: 'TXN-88421',
    event: 'Annual Tech Summit 2026',
    amount: '$295.00',
    reason: 'Event rescheduled',
    status: 'pending',
  },
  {
    txnId: 'TXN-88410',
    event: 'DesignSystems Live 2026',
    amount: '$125.00',
    reason: 'Duplicate charge',
    status: 'pending',
  },
  {
    txnId: 'TXN-88397',
    event: 'Bay Area Product Meetup',
    amount: '$85.00',
    reason: 'Attendee cancellation',
    status: 'pending',
  },
];

export const TicketPurchasePage: React.FC = () => {
  const { role } = useViewerRole();
  const [state, setState] = useState<TicketPurchaseState>({ status: 'idle' });
  const [eventId, setEventId] = useState('');
  const [ticketTier, setTicketTier] = useState('GENERAL');
  const [checkinCode, setCheckinCode] = useState('');

  const handlePurchase = async () => {
    setState({ status: 'reserving' });
    try {
      const response = await fetch('/api/dynamic/ticket-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTier,
          purchaseType: 'INDIVIDUAL',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setState({ status: 'error', errorMessage: error.message ?? 'Purchase failed' });
        return;
      }

      const data = await response.json();
      if (data.status === 'WAITLISTED') {
        setState({ status: 'waitlisted', purchaseId: data.purchaseId });
      } else {
        setState({ status: 'payment_pending', purchaseId: data.purchaseId, holdId: data.holdId });
      }
    } catch (e) {
      setState({ status: 'error', errorMessage: 'Network error' });
    }
  };

  // Representative event + tier + pricing so a G5 checkout summary renders
  // even before the user types an event-id. Reference: Eventbrite checkout.
  const SAMPLE_EVENT = {
    title: 'Annual Tech Summit 2026',
    date: 'Apr 28, 2026',
    location: 'San Francisco',
    delivery: 'digital delivery',
  };
  const TIER_PRICE: Record<string, { price: number; label: string }> = {
    GENERAL: { price: 125, label: 'General Admission' },
    VIP: { price: 295, label: 'VIP' },
    EARLY_BIRD: { price: 85, label: 'Early Bird' },
  };
  const qty = 2;
  const unit = TIER_PRICE[ticketTier].price;
  const subtotal = unit * qty;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const cascadeSegment =
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('cascade');
  const tenantAdaptation =
    cascadeSegment === 'tenant-a-v1.0.1'
      ? {
          title: 'Acme fast-release ticketing',
          summary:
            '3-minute seat holds, 48-hour refunds, 4% platform fee, 3.1% processing fee, and same-day capacity updates.',
        }
      : cascadeSegment === 'tenant-b-installed-from-a'
        ? {
            title: 'Northwind installed Acme fast-release ticketing',
            summary:
              'Northwind is running Acme policy: 3-minute seat holds, 48-hour refunds, 4% platform fee, 3.1% processing fee, and same-day capacity updates.',
          }
        : cascadeSegment === 'tenant-b-v1.0.2'
          ? {
              title: 'Northwind exchange ticketing',
              summary:
                '4-minute seat holds, 72-hour refunds, 3.5% platform fee, 2.8% processing fee, and reviewed capacity changes.',
            }
          : cascadeSegment === 'tenant-c-installed-from-b'
            ? {
                title: 'Tessera installed Northwind exchange ticketing',
                summary:
                  'Tessera is running Northwind policy: 4-minute seat holds, 72-hour refunds, 3.5% platform fee, 2.8% processing fee, and reviewed capacity changes.',
              }
            : cascadeSegment === 'tenant-c-v1.0.3'
              ? {
                  title: 'Tessera community ticketing',
                  summary:
                    '5-minute seat holds, 96-hour refunds, 3.2% platform fee, 2.5% processing fee, and steward-led same-day capacity updates.',
                }
      : null;
  const renderTenantAdaptation = () =>
    tenantAdaptation ? (
      <div
        data-testid="ticket-tenant-adaptation"
        className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
      >
        <p className="text-sm font-semibold">{tenantAdaptation.title}</p>
        <p data-testid="ticket-tenant-adaptation-summary" className="mt-1 text-sm">
          {tenantAdaptation.summary}
        </p>
      </div>
    ) : null;

  // ============ tenant-user: Wallet view ============
  if (role === 'tenant-user') {
    return (
      <div
        className="max-w-5xl mx-auto p-6"
        data-testid="ticket-purchase-page"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold mb-2" data-testid="tep-wallet-title">
          My event tickets
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Tickets you&apos;ve purchased. Show the QR code at the door to check in.
        </p>
        {renderTenantAdaptation()}

        {SAMPLE_WALLET.length === 0 ? (
          <div
            data-testid="tep-wallet-empty"
            className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50"
          >
            <p className="text-gray-600">
              You haven&apos;t purchased any tickets yet.{' '}
              <a href="/events" className="text-blue-600 font-semibold underline">
                Browse upcoming events →
              </a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SAMPLE_WALLET.map((ticket, i) => (
              <div
                key={ticket.id}
                data-testid={`tep-wallet-card-${i}`}
                className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    {ticket.tier} ticket
                  </p>
                  <h2 className="text-base font-semibold text-gray-900 mt-1">
                    {ticket.eventName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{ticket.date}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ticket.venue}</p>
                </div>
                <div className="px-5 pb-5">
                  <div
                    className="aspect-square w-32 mx-auto bg-gray-100 border border-gray-200 rounded flex items-center justify-center"
                    aria-label="QR code placeholder"
                  >
                    <svg
                      width="72"
                      height="72"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="text-gray-400"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="3" height="3" />
                      <rect x="18" y="18" width="3" height="3" />
                      <rect x="14" y="18" width="3" height="3" />
                      <rect x="18" y="14" width="3" height="3" />
                    </svg>
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-2 font-mono">{ticket.id}</p>
                  <button
                    type="button"
                    className="w-full mt-3 bg-blue-600 text-white px-3 py-2 min-h-[44px] rounded-md hover:bg-blue-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid={`tep-wallet-view-${i}`}
                  >
                    View ticket
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============ event-organiser: Check-in kiosk ============
  if (role === 'event-organiser') {
    const checkedIn = 142;
    const totalAttendees = 250;
    return (
      <div
        className="max-w-4xl mx-auto p-6"
        data-testid="ticket-purchase-page"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold mb-1" data-testid="tep-checkin-title">
          Check-in kiosk &mdash; Annual Tech Summit 2026
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Scan attendee QR codes or enter ticket codes to check guests in.
        </p>
        {renderTenantAdaptation()}

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="tep-checkin-stat-checkedin"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Checked in
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {checkedIn} <span className="text-sm font-normal text-gray-500">/ {totalAttendees}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">attendees</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Remaining
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalAttendees - checkedIn}</p>
            <p className="text-xs text-gray-500 mt-0.5">expected</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Progress
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {Math.round((checkedIn / totalAttendees) * 100)}%
            </p>
            <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${(checkedIn / totalAttendees) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* QR scanner */}
        <div
          data-testid="tep-checkin-scan"
          className="p-8 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center mb-4"
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-gray-400"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <p className="mt-3 text-base font-semibold text-gray-900">Scan attendee QR</p>
          <p className="text-sm text-gray-500 mt-1">Point the camera at the ticket QR code</p>
          <button
            type="button"
            className="mt-4 bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-blue-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="tep-checkin-scan-start"
          >
            Start camera
          </button>
        </div>

        {/* Manual code entry */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-6">
          <label className="block text-sm font-medium text-gray-700">
            Or enter ticket code:
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={checkinCode}
              onChange={(e) => setCheckinCode(e.target.value)}
              placeholder="TKT-20260428-001"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="tep-checkin-input"
            />
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="tep-checkin-submit"
            >
              Check in
            </button>
          </div>
        </div>

        {/* Recent check-ins */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent check-ins
          </p>
          <ul className="divide-y divide-gray-100">
            {SAMPLE_CHECKINS.map((entry, i) => (
              <li
                key={`${entry.name}-${i}`}
                className="py-2.5 flex items-center justify-between"
                data-testid={`tep-checkin-recent-${i}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                  <p className="text-xs text-gray-500">
                    {entry.tier} &middot; checked in at {entry.time}
                  </p>
                </div>
                <span
                  className="text-green-600"
                  aria-label="checked in"
                  data-testid={`tep-checkin-recent-${i}-mark`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ============ platform-admin: Settlement / refund audit ============
  if (role === 'platform-admin') {
    return (
      <div
        className="max-w-6xl mx-auto p-6"
        data-testid="ticket-purchase-page"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold mb-1" data-testid="tep-admin-title">
          Ticket payments overview
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Cross-tenant settlement + refund queue. Tickets are issued via Stripe Connect.
        </p>
        {renderTenantAdaptation()}

        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="tep-admin-kpi-transactions"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total transactions today
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">1,247</p>
            <p className="text-xs text-green-600 mt-0.5">+12% vs. yesterday</p>
          </div>
          <div
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="tep-admin-kpi-refunds"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Refund queue
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              8 <span className="text-sm font-normal text-gray-500">pending</span>
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">Requires review</p>
          </div>
          <div
            className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="tep-admin-kpi-disputes"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Disputed transactions
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">2</p>
            <p className="text-xs text-red-600 mt-0.5">Stripe dispute window open</p>
          </div>
        </div>

        {/* Refund queue table */}
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
          data-testid="tep-admin-refund-table"
        >
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent refunds</p>
            <a
              href="https://dashboard.stripe.com/payments"
              className="text-xs text-blue-600 font-semibold underline"
              data-testid="tep-admin-stripe-link"
            >
              Open Stripe payments console →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2">Txn ID</th>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SAMPLE_REFUNDS.map((row, i) => (
                  <tr key={row.txnId} data-testid={`tep-admin-refund-row-${i}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.txnId}</td>
                    <td className="px-4 py-3 text-gray-900">{row.event}</td>
                    <td className="px-4 py-3 text-gray-900 font-semibold">{row.amount}</td>
                    <td className="px-4 py-3 text-gray-600">{row.reason}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                          data-testid={`tep-admin-refund-approve-${i}`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400"
                          data-testid={`tep-admin-refund-deny-${i}`}
                        >
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============ anonymous + other roles: default Checkout surface ============
  return (
    <div
      className="max-w-4xl mx-auto p-6"
      data-testid="ticket-purchase-page"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      {renderTenantAdaptation()}

      {role === 'anonymous' && (
        <div
          data-testid="ticket-purchase-anon-notice"
          role="note"
          className="mb-4 p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-900"
        >
          Sign in to purchase — tickets are issued to an authenticated account.
          <a
            href="/login?next=/tickets/purchase"
            className="ml-2 font-semibold underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Sign in →
          </a>
        </div>
      )}
      {role === 'platform-support' && (
        <div
          data-testid="ticket-purchase-support-notice"
          role="note"
          className="mb-4 p-3 rounded border border-slate-300 bg-slate-50 text-sm text-slate-800"
        >
          Read-only for support access. Purchase flow is disabled; review-only
          for investigating reported issues.
        </div>
      )}

      {state.status === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: order summary per Eventbrite/Stripe Checkout grammar */}
          <div
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="order-summary"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Order summary
            </p>
            <h2 className="text-base font-semibold text-gray-900">
              {SAMPLE_EVENT.title} &mdash; {TIER_PRICE[ticketTier].label} ticket
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {SAMPLE_EVENT.date} &middot; {SAMPLE_EVENT.location} &middot;{' '}
              {SAMPLE_EVENT.delivery}
            </p>
            <div className="flex items-baseline justify-between mt-4 text-sm">
              <span className="text-gray-600">
                Qty {qty} &middot; ${unit.toFixed(2)} each
              </span>
              <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-3 border-t border-gray-200 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (8.25%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-semibold pt-1.5 border-t border-gray-200">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Funds are held in escrow until delivery is confirmed.
            </p>
          </div>

          {/* RIGHT: purchase form + trust indicator + Pay CTA */}
          <div
            className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm"
            data-testid="purchase-form"
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Payment details
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event ID</label>
                <input
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="event-001"
                  data-testid="event-id-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ticket tier</label>
                <select
                  value={ticketTier}
                  onChange={(e) => setTicketTier(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="ticket-tier-select"
                >
                  <option value="GENERAL">General Admission &mdash; $125</option>
                  <option value="VIP">VIP &mdash; $295</option>
                  <option value="EARLY_BIRD">Early Bird &mdash; $85</option>
                </select>
              </div>
              <button
                onClick={handlePurchase}
                className="w-full bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-md hover:bg-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="purchase-button"
              >
                Pay ${total.toFixed(2)}
              </button>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Payments are processed securely. We never store your card number.
              </p>
            </div>
          </div>
        </div>
      )}

      {state.status === 'reserving' && (
        <div className="text-center" data-testid="reserving-state">
          <p className="text-gray-600">Reserving your seat...</p>
        </div>
      )}

      {state.status === 'payment_pending' && (
        <div className="bg-blue-50 p-4 rounded-md" data-testid="payment-pending-state">
          <h2 className="font-semibold text-blue-800">Seat Reserved!</h2>
          <p className="text-blue-600 mt-1">Processing payment...</p>
          <p className="text-xs text-gray-500 mt-2">Purchase ID: {state.purchaseId}</p>
        </div>
      )}

      {state.status === 'waitlisted' && (
        <div className="bg-yellow-50 p-4 rounded-md" data-testid="waitlisted-state">
          <h2 className="font-semibold text-yellow-800">Added to Waitlist</h2>
          <p className="text-yellow-600 mt-1">
            This event is currently sold out. You are on the waitlist and will be notified if a seat
            becomes available.
          </p>
          <p className="text-xs text-gray-500 mt-2">Purchase ID: {state.purchaseId}</p>
        </div>
      )}

      {state.status === 'confirmed' && (
        <div className="bg-green-50 p-4 rounded-md" data-testid="confirmed-state">
          <h2 className="font-semibold text-green-800">Ticket Confirmed!</h2>
          <p className="text-green-600 mt-1">
            Your ticket has been issued. Check your email for the QR code.
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="bg-red-50 p-4 rounded-md" data-testid="error-state">
          <h2 className="font-semibold text-red-800">Purchase Failed</h2>
          <p className="text-red-600 mt-1">{state.errorMessage}</p>
          <button
            onClick={() => setState({ status: 'idle' })}
            className="mt-3 text-sm text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketPurchasePage;
