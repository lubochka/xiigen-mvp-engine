/**
 * AttendanceDashboardPage — FLOW-04 attendance overview.
 * Route: /attendance
 *
 * Covers: check-in status (T65), waitlist (T64), feedback window (T66), cancellations (T67).
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=empty          → empty state          (data-testid="attendance-empty")
 *   ?mock=error          → error state          (data-testid="attendance-error")
 *   ?mock=checkin-open   → check-in kiosk open  (data-testid="checkin-kiosk")
 *   ?mock=feedback-open  → feedback window open (data-testid="feedback-window-open")
 *   otherwise            → loaded dashboard     (data-testid="attendance-dashboard")
 *
 * Role-aware (RUN-47c, 5 cells — FLOW-04 was HIGH-priority CARRY-FORWARD from v5):
 *   - anonymous                     → event info + sign-in CTA (no RSVP form)
 *   - tenant-user + referral-user   → attendee view: own RSVP, check-in badge
 *   - event-organiser               → capacity dashboard (counters, RSVP list, check-in kiosk)
 *   - tenant-admin                  → moderation: attendee list + refund / policy actions
 *   - platform-support              → read-only attendee inspector + ticket audit
 *
 * All existing data-testid attributes are preserved (attendance-dashboard,
 * rsvp-list, rsvp-row, confirmed-count, etc.). Role-specific branches add new
 * testids with the ea- prefix.
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarCheck,
  LogIn,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface MockRsvp {
  rsvp_id: string;
  attendee_id: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  checked_in: boolean;
}

interface AttendanceAdaptationPolicy {
  tenantId: string;
  title: string;
  cancellationWindowHours: number;
  feedbackWindowHours: number;
}

const MOCK_RSVPS: MockRsvp[] = [
  { rsvp_id: 'rsvp-001', attendee_id: 'att-001', status: 'CONFIRMED', checked_in: true },
  { rsvp_id: 'rsvp-002', attendee_id: 'att-002', status: 'CONFIRMED', checked_in: false },
  { rsvp_id: 'rsvp-003', attendee_id: 'att-003', status: 'WAITLISTED', checked_in: false },
  { rsvp_id: 'rsvp-004', attendee_id: 'att-004', status: 'CONFIRMED', checked_in: true },
  { rsvp_id: 'rsvp-005', attendee_id: 'att-005', status: 'WAITLISTED', checked_in: false },
];

const MOCK_EVENT = {
  event_id: 'evt-001',
  title: 'Annual Tech Summit 2026',
  capacity: 10,
  start_date: '2026-06-15T09:00:00.000Z',
  venue: 'Convention Center · Hall A',
};

const ACME_ATTENDANCE_ADAPTATION: AttendanceAdaptationPolicy = {
  tenantId: 'acme-corp',
  title: 'Acme onsite attendance policy',
  cancellationWindowHours: 6,
  feedbackWindowHours: 12,
};

const NORTHWIND_INSTALLED_ACME_POLICY: AttendanceAdaptationPolicy = {
  tenantId: 'northwind:installed-from-a',
  title: 'Northwind installed Acme onsite policy',
  cancellationWindowHours: 6,
  feedbackWindowHours: 12,
};

const NORTHWIND_SPONSOR_CHECKIN_POLICY: AttendanceAdaptationPolicy = {
  tenantId: 'northwind',
  title: 'Northwind sponsor check-in policy',
  cancellationWindowHours: 6,
  feedbackWindowHours: 8,
};

const TESSERA_INSTALLED_NORTHWIND_POLICY: AttendanceAdaptationPolicy = {
  tenantId: 'tessera-collective:installed-from-b',
  title: 'Tessera installed Northwind sponsor policy',
  cancellationWindowHours: 6,
  feedbackWindowHours: 8,
};

const TESSERA_CIRCLE_CHECKIN_POLICY: AttendanceAdaptationPolicy = {
  tenantId: 'tessera-collective',
  title: 'Tessera circle check-in policy',
  cancellationWindowHours: 3,
  feedbackWindowHours: 8,
};

const ATTENDANCE_ADAPTATION_POLICIES: Record<string, AttendanceAdaptationPolicy> = {
  [ACME_ATTENDANCE_ADAPTATION.tenantId]: ACME_ATTENDANCE_ADAPTATION,
  [NORTHWIND_INSTALLED_ACME_POLICY.tenantId]: NORTHWIND_INSTALLED_ACME_POLICY,
  [NORTHWIND_SPONSOR_CHECKIN_POLICY.tenantId]: NORTHWIND_SPONSOR_CHECKIN_POLICY,
  [TESSERA_INSTALLED_NORTHWIND_POLICY.tenantId]: TESSERA_INSTALLED_NORTHWIND_POLICY,
  [TESSERA_CIRCLE_CHECKIN_POLICY.tenantId]: TESSERA_CIRCLE_CHECKIN_POLICY,
};

// Sample moderation-tier data — only visible to tenant-admin & platform-support
const MOCK_REFUND_REQUESTS = [
  {
    id: 'ref-001',
    attendee_id: 'att-002',
    reason: 'Schedule conflict',
    amount: '$149',
    status: 'pending',
  },
  {
    id: 'ref-002',
    attendee_id: 'att-005',
    reason: 'Duplicate booking',
    amount: '$149',
    status: 'pending',
  },
];

function statusColour(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-green-100 text-green-700',
    WAITLISTED: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return map[status] ?? 'bg-gray-100 text-gray-500';
}

// Reusable block — full organiser-style dashboard (counters + RSVP list + check-in).
// Used by event-organiser (editable) and platform-support (wrapped in fieldset for read-only).
function getAdaptationPolicy(
  tenantId: string | null,
  stage: string | null,
): AttendanceAdaptationPolicy | null {
  const policyKey = tenantId === 'northwind' && stage === 'installed-from-a'
    ? NORTHWIND_INSTALLED_ACME_POLICY.tenantId
    : tenantId === 'tessera-collective' && stage === 'installed-from-b'
      ? TESSERA_INSTALLED_NORTHWIND_POLICY.tenantId
    : tenantId;

  return policyKey ? (ATTENDANCE_ADAPTATION_POLICIES[policyKey] ?? null) : null;
}

function AdaptationPolicyStrip({ policy }: { policy: AttendanceAdaptationPolicy | null }) {
  if (!policy) {
    return null;
  }

  return (
    <section
      data-testid="ea-adaptation-policy"
      className="mb-6 border border-emerald-200 bg-emerald-50 rounded p-4 text-start"
    >
      <p className="text-sm font-semibold text-emerald-950">{policy.title}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded bg-white/80 border border-emerald-100 p-3">
          <p className="text-xs text-emerald-800">Cancellation window</p>
          <p className="text-sm font-semibold text-emerald-950">
            Cancel up to {policy.cancellationWindowHours} hours before start
          </p>
        </div>
        <div className="rounded bg-white/80 border border-emerald-100 p-3">
          <p className="text-xs text-emerald-800">Feedback window</p>
          <p className="text-sm font-semibold text-emerald-950">
            Feedback stays open for {policy.feedbackWindowHours} hours
          </p>
        </div>
      </div>
    </section>
  );
}

function OrganiserDashboard({
  confirmed,
  waitlisted,
  checkedIn,
}: {
  confirmed: MockRsvp[];
  waitlisted: MockRsvp[];
  checkedIn: MockRsvp[];
}) {
  return (
    <>
      <div data-testid="attendance-dashboard" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-900" data-testid="confirmed-count">
            {confirmed.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Confirmed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600" data-testid="waitlist-count">
            {waitlisted.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Waitlisted</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600" data-testid="checkedin-count">
            {checkedIn.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Checked In</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">RSVPs</h2>
        </div>
        <div data-testid="rsvp-list" className="divide-y divide-gray-100">
          {MOCK_RSVPS.map((rsvp) => (
            <div
              key={rsvp.rsvp_id}
              data-testid="rsvp-row"
              className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-700 font-mono" data-testid="rsvp-attendee-id">
                  Guest #{rsvp.attendee_id.replace(/^att-/, '')}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${statusColour(rsvp.status)}`}
                  data-testid="rsvp-status"
                >
                  {rsvp.status.charAt(0) + rsvp.status.slice(1).toLowerCase()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {rsvp.checked_in && (
                  <span
                    data-testid="checkin-badge"
                    className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                  >
                    Checked in
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400" data-testid="rsvp-total-count">
        {MOCK_RSVPS.length} total RSVPs
      </p>
    </>
  );
}

export function AttendanceDashboardPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const adaptationPolicy = getAdaptationPolicy(searchParams.get('tenant'), searchParams.get('stage'));
  const feedbackWindowHours = adaptationPolicy?.feedbackWindowHours ?? 24;
  const { role } = useViewerRole();
  const [checkinInput, setCheckinInput] = useState('');
  const [checkinResult, setCheckinResult] = useState<string | null>(null);

  const confirmed = MOCK_RSVPS.filter((r) => r.status === 'CONFIRMED');
  const waitlisted = MOCK_RSVPS.filter((r) => r.status === 'WAITLISTED');
  const checkedIn = MOCK_RSVPS.filter((r) => r.checked_in);

  // ── Mock states (untouched — preserve existing Playwright contract) ─────

  if (mockState === 'error') {
    return (
      <div className="p-4 sm:p-6 text-start" data-testid="page-attendance" data-viewer-role={role}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>
        <div
          data-testid="attendance-error"
          className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700"
        >
          Failed to load attendance data. Please refresh or try again.
        </div>
      </div>
    );
  }

  if (mockState === 'empty') {
    return (
      <div className="p-4 sm:p-6 text-start" data-testid="page-attendance" data-viewer-role={role}>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>
        <div
          data-testid="attendance-empty"
          className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300"
        >
          <p className="text-gray-500 text-sm">No RSVPs for this event yet.</p>
        </div>
      </div>
    );
  }

  if (mockState === 'checkin-open') {
    const handleCheckin = (e: React.FormEvent) => {
      e.preventDefault();
      setCheckinResult(checkinInput ? 'checked-in' : 'not-found');
    };
    return (
      <div className="p-4 sm:p-6 text-start" data-testid="page-attendance" data-viewer-role={role}>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Check-In Kiosk</h1>
        <div
          data-testid="checkin-kiosk"
          className="w-full max-w-sm bg-white border border-gray-200 rounded-lg p-5 sm:p-6"
        >
          <p className="text-sm text-gray-600 mb-4">Scan or type the guest code to check in.</p>
          <form data-testid="checkin-form" onSubmit={handleCheckin} noValidate>
            <label htmlFor="checkin-attendee-input" className="sr-only">
              Guest code
            </label>
            <input
              id="checkin-attendee-input"
              data-testid="checkin-attendee-input"
              type="text"
              value={checkinInput}
              onChange={(e) => setCheckinInput(e.target.value)}
              placeholder="guest-001"
              dir="ltr"
              autoComplete="off"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-start mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              data-testid="checkin-submit-button"
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-green-700"
              style={{ minHeight: '44px' }}
            >
              Check in guest
            </button>
          </form>
          {checkinResult === 'checked-in' && (
            <div
              data-testid="checkin-success"
              role="status"
              aria-live="polite"
              className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700"
            >
              Checked in successfully.
            </div>
          )}
          {checkinResult === 'not-found' && (
            <div
              data-testid="checkin-not-found"
              role="alert"
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700"
            >
              No confirmed RSVP found.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mockState === 'feedback-open') {
    return (
      <div className="p-4 sm:p-6 text-start" data-testid="page-attendance" data-viewer-role={role}>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Attendance — {MOCK_EVENT.title}</h1>
        <AdaptationPolicyStrip policy={adaptationPolicy} />
        <div
          data-testid="feedback-window-open"
          className="p-4 bg-blue-50 border border-blue-200 rounded mb-6"
        >
          <p className="text-blue-700 text-sm font-medium">Feedback window is open.</p>
          <p className="text-blue-600 text-xs mt-1">
            Closes: {new Date(Date.now() + feedbackWindowHours * 3600 * 1000).toLocaleString()}
          </p>
          <p className="text-blue-600 text-xs" data-testid="feedback-window-closes-at">
            Attendees can submit feedback for the next {feedbackWindowHours} hours.
          </p>
        </div>
      </div>
    );
  }

  // ── Role-scoped default view ─────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 text-start" data-testid="page-attendance" data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="ea-role">
        {/* Anonymous — event info + sign-in CTA (no RSVP form) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <main data-testid="ea-anon-view" className="w-full max-w-xl mx-auto text-start">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarCheck size={20} strokeWidth={2} aria-hidden="true" />
              {MOCK_EVENT.title}
            </h1>
            <p className="text-sm text-gray-600 mt-1">{MOCK_EVENT.venue}</p>
            <p className="text-sm text-gray-600">
              {new Date(MOCK_EVENT.start_date).toLocaleString()}
            </p>
            <div
              data-testid="ea-anon-signin-gate"
              className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded"
            >
              <p className="text-sm text-blue-900 font-medium">Sign in to RSVP</p>
              <p className="text-xs text-blue-800 mt-1">
                RSVP is available to registered users only. Sign in to reserve your seat.
              </p>
              <a
                href="/login?next=/attendance"
                data-testid="ea-anon-signin-cta"
                className="inline-flex items-center gap-2 mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                <LogIn size={14} strokeWidth={2} aria-hidden="true" />
                Sign in to RSVP
              </a>
            </div>
          </main>
        </RoleScopedView.Case>

        {/* Tenant-user + Referral-user — attendee view */}
        <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
          <main data-testid="ea-attendee-view" className="w-full max-w-xl mx-auto text-start">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarCheck size={20} strokeWidth={2} aria-hidden="true" />
              Your attendance
            </h1>
            <p className="text-sm text-gray-600 mt-1">{MOCK_EVENT.title}</p>
            <p className="text-xs text-gray-500">{MOCK_EVENT.venue}</p>

            {role === 'referral-user' && (
              <div
                data-testid="ea-referral-banner"
                role="note"
                className="mt-3 p-2 rounded border border-emerald-200 bg-emerald-50 text-xs text-emerald-800"
              >
                You joined via referral. Attendance counts toward your referrer's reward tier.
              </div>
            )}

            <section
              data-testid="ea-attendee-rsvp-card"
              className="mt-4 p-4 border border-gray-200 rounded bg-white"
            >
              <p className="text-sm font-semibold text-gray-900">RSVP status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  Confirmed
                </span>
                <span
                  data-testid="ea-attendee-checkin-badge"
                  className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700"
                >
                  Checked in
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Reference: Guest #001 · Arrive 15 minutes before start.
              </p>
              <a
                href="/tickets/qr"
                data-testid="ea-attendee-qr-link"
                className="inline-flex items-center text-xs font-medium text-blue-700 hover:underline mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                style={{ minHeight: '44px' }}
              >
                View my QR code
              </a>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* Event-organiser — full capacity dashboard + check-in kiosk link */}
        <RoleScopedView.Case when="event-organiser">
          <main data-testid="ea-organiser-view">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1
                  className="text-2xl font-bold text-gray-900 flex items-center gap-2"
                  data-testid="attendance-empty"
                >
                  <Users size={20} strokeWidth={2} aria-hidden="true" />
                  Attendance
                </h1>
                <p
                  className="text-sm text-gray-500 mt-1"
                  data-testid="attendance-event-title"
                >
                  {MOCK_EVENT.title}
                </p>
              </div>
              <a
                href="/attendance?mock=checkin-open"
                data-testid="ea-organiser-checkin-link"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:justify-start"
                style={{ minHeight: '44px' }}
              >
                <UserCheck size={14} strokeWidth={2} aria-hidden="true" />
                Open check-in kiosk
              </a>
            </div>

            <AdaptationPolicyStrip policy={adaptationPolicy} />

            <OrganiserDashboard
              confirmed={confirmed}
              waitlisted={waitlisted}
              checkedIn={checkedIn}
            />

            <section
              data-testid="ea-organiser-waitlist-mgmt"
              className="mt-6 p-4 border border-amber-200 bg-amber-50 rounded"
            >
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <Clock size={14} strokeWidth={2} aria-hidden="true" />
                Waitlist management
              </p>
              <p className="text-xs text-amber-800 mt-1">
                {waitlisted.length} attendees on the waitlist. Promote to confirmed if
                capacity opens.
              </p>
              <button
                type="button"
                data-testid="ea-organiser-promote-waitlist"
                className="mt-2 inline-flex items-center gap-1 border border-amber-300 text-amber-900 bg-white rounded px-3 py-2 text-xs font-medium hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                style={{ minHeight: '44px' }}
              >
                Promote next in line
              </button>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* Tenant-admin — moderation: attendees + refunds + policy */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="ea-tenant-admin-view">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
              <ShieldAlert size={20} strokeWidth={2} aria-hidden="true" />
              Attendance moderation
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {MOCK_EVENT.title} — review attendee issues, process refund requests, and
              enforce event policy.
            </p>

            {/* Keep the dashboard summary visible so tenant-admins have context */}
            <OrganiserDashboard
              confirmed={confirmed}
              waitlisted={waitlisted}
              checkedIn={checkedIn}
            />

            <section
              data-testid="ea-tenant-admin-refunds"
              aria-labelledby="ea-refunds-heading"
              className="mt-6 border border-gray-200 rounded bg-white"
            >
              <h2
                id="ea-refunds-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200 flex items-center gap-2"
              >
                <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                Refund requests ({MOCK_REFUND_REQUESTS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {MOCK_REFUND_REQUESTS.map((r) => (
                  <li
                    key={r.id}
                    data-testid={`ea-refund-${r.id}`}
                    className="p-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {r.attendee_id}{' '}
                        <span className="font-mono text-xs text-gray-500">· {r.id}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {r.reason} · {r.amount}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        data-testid={`ea-refund-approve-${r.id}`}
                        aria-label={`Approve refund ${r.id}`}
                        className="inline-flex items-center border border-emerald-300 text-emerald-800 bg-emerald-50 rounded px-3 py-2 text-xs hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        style={{ minHeight: '44px' }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        data-testid={`ea-refund-reject-${r.id}`}
                        aria-label={`Reject refund ${r.id}`}
                        className="inline-flex items-center border border-red-300 text-red-800 bg-red-50 rounded px-3 py-2 text-xs hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                        style={{ minHeight: '44px' }}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* Platform-support — read-only inspector */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="ea-support-view">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} strokeWidth={2} aria-hidden="true" />
              Attendee inspector (read-only)
            </h1>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              {MOCK_EVENT.title} — read-only view for investigating attendee complaints.
              Escalate to the tenant-admin or event-organiser for any change.
            </p>

            <div
              data-testid="ea-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2 mb-4"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                All controls below are disabled for support access. Layout is preserved
                so you can describe the exact remediation to the organiser when escalating.
              </span>
            </div>

            <fieldset
              data-testid="ea-support-readonly-wrapper"
              disabled
              aria-disabled="true"
              className="m-0 p-0 border-0 opacity-75"
              style={{ pointerEvents: 'none' }}
            >
              <OrganiserDashboard
                confirmed={confirmed}
                waitlisted={waitlisted}
                checkedIn={checkedIn}
              />
            </fieldset>

            <a
              href="/support/escalate?topic=event-attendance"
              data-testid="ea-support-escalate"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to event-organiser
            </a>
          </main>
        </RoleScopedView.Case>

        {/* Fallback — other roles fall through to the canonical dashboard */}
        <RoleScopedView.Fallback>
          <main>
            <div className="mb-6">
              <h1
                className="text-2xl font-bold text-gray-900"
                data-testid="attendance-empty"
              >
                Attendance
              </h1>
              <p
                className="text-sm text-gray-500 mt-1"
                data-testid="attendance-event-title"
              >
                {MOCK_EVENT.title}
              </p>
            </div>
            <OrganiserDashboard
              confirmed={confirmed}
              waitlisted={waitlisted}
              checkedIn={checkedIn}
            />
          </main>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
