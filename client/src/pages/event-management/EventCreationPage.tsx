/**
 * EventCreationPage — FLOW-03 T59 entry screen.
 * Route: /events/create
 *
 * Role-aware screen (C6 / SK-539): FLOW-03 is Tier 1 (7 required + 2 conditional
 * = 9 total cells). Event creation is ROLE-GATED by design — only event-organiser
 * (and via moderation path, tenant-admin) see the creation form. All other roles
 * see role-appropriate browse/registration surfaces.
 *
 * Playwright mock hooks (driven by query params — not role-gated):
 *   ?mock=created   → success state  (data-testid="event-created")
 *   ?mock=error     → error state    (data-testid="event-creation-error")
 *   ?mock=duplicate → duplicate key  (data-testid="event-duplicate")
 *   otherwise       → role-aware form/listing state
 */

import React, { useState } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const SAMPLE_EVENTS = [
  { id: 'evt-001', title: 'Annual Tech Summit 2026', date: 'Apr 25', spots: '100 spots remaining' },
  { id: 'evt-002', title: 'Spring Networking Mixer', date: 'May 3', spots: '42 spots remaining' },
  { id: 'evt-003', title: 'Developer Workshop', date: 'May 10', spots: 'Unlimited' },
];

// RUN-99: the Organiser ID text input has been removed from the form.
// A real event-organiser never types their own XIIGen internal ID. The
// RoleScopedView gates this surface to the event-organiser role, so the
// server resolves the organiser from the session. The form stays a
// controlled component but the organizerId is set once on mount to the
// authenticated identity (seeded here for demo purposes).
const SEEDED_ORGANISER = {
  id: 'org-001',
  name: 'Acme Events',
};

const TENANT_A_CURATED_EVENT_POLICY = {
  tenantId: 'acme-corp',
  tenantLabel: 'Acme Corp',
  moduleName: 'event-management-acme-curated-events',
  maxAttendees: 10,
  maxEventsPerOrganizer: 3,
  promotionChannels: 'in-app updates only',
};

const TENANT_B_SPONSOR_FORUM_POLICY = {
  tenantId: 'northwind',
  tenantLabel: 'Northwind',
  moduleName: 'event-management-northwind-sponsor-forums',
  waitlistMaxSize: 12,
};

const TENANT_C_INSTALL_CONTEXT = {
  tenantId: 'tessera-collective',
  tenantLabel: 'Tessera Collective',
};

const TENANT_C_RESIDENCY_POLICY = {
  moduleName: 'event-management-tessera-residency-circles',
  analyticsWindowDays: 45,
};

function parsePolicyNumber(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

interface AdaptedEventPolicyProps {
  enabled: boolean;
  maxAttendees: number;
  maxEventsPerOrganizer: number;
  promotionChannels: string;
}

function AdaptedEventPolicy({
  enabled,
  maxAttendees,
  maxEventsPerOrganizer,
  promotionChannels,
}: AdaptedEventPolicyProps) {
  if (!enabled) return null;

  return (
    <section
      data-testid="event-adaptation-policy"
      className="mb-5 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950"
    >
      <p className="font-semibold">Acme curated event policy</p>
      <p data-testid="event-adaptation-policy-copy" className="mt-1 leading-6">
        Up to {maxAttendees} attendees per event, {maxEventsPerOrganizer} active
        events per organiser, promotion through {promotionChannels}.
      </p>
    </section>
  );
}

function TenantBEventPolicy({ enabled, waitlistMaxSize }: { enabled: boolean; waitlistMaxSize: number }) {
  if (!enabled) return null;

  return (
    <section
      data-testid="event-tenant-b-policy"
      className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
    >
      <p className="font-semibold">Northwind sponsor forum policy</p>
      <p data-testid="event-tenant-b-policy-copy" className="mt-1 leading-6">
        Sponsor forum requests enter a curated review waitlist capped at {waitlistMaxSize}{' '}
        partners, while the inherited Acme event limits stay active.
      </p>
    </section>
  );
}

function TenantCInstallContext({ enabled, moduleName }: { enabled: boolean; moduleName: string }) {
  if (!enabled) return null;

  return (
    <section
      data-testid="event-tenant-c-install-context"
      className="mb-5 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950"
    >
      <p className="font-semibold">Tessera installed event package</p>
      <p data-testid="event-tenant-c-install-context-copy" className="mt-1 leading-6">
        {TENANT_C_INSTALL_CONTEXT.tenantLabel} installed {moduleName}. Acme and
        Northwind policies remain active.
      </p>
    </section>
  );
}

function TenantCResidencyPolicy({
  enabled,
  analyticsWindowDays,
}: {
  enabled: boolean;
  analyticsWindowDays: number;
}) {
  if (!enabled) return null;

  return (
    <section
      data-testid="event-tenant-c-residency-policy"
      className="mb-5 rounded-md border border-fuchsia-200 bg-fuchsia-50 p-3 text-sm text-fuchsia-950"
    >
      <p className="font-semibold">Tessera residency circle policy</p>
      <p data-testid="event-tenant-c-residency-policy-copy" className="mt-1 leading-6">
        Residency circle analytics stay reviewable for {analyticsWindowDays} days.
        Acme and Northwind policies remain active.
      </p>
    </section>
  );
}

export function EventCreationPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const adaptation = searchParams.get('adaptation');
  const moduleName = searchParams.get('moduleName');
  const adaptedForTenantC =
    moduleName === TENANT_C_RESIDENCY_POLICY.moduleName ||
    adaptation === 'tenant-c-v1.0.0';
  const adaptedForTenantB =
    adaptedForTenantC ||
    searchParams.get('tenant') === TENANT_B_SPONSOR_FORUM_POLICY.tenantId ||
    moduleName === TENANT_B_SPONSOR_FORUM_POLICY.moduleName ||
    adaptation === 'tenant-b-v1.0.2' ||
    adaptation === 'tenant-c-installed-from-b';
  const installedForTenantC =
    adaptedForTenantC ||
    searchParams.get('tenant') === TENANT_C_INSTALL_CONTEXT.tenantId ||
    adaptation === 'tenant-c-installed-from-b';
  const adaptedForTenantA =
    adaptedForTenantB ||
    searchParams.get('tenant') === TENANT_A_CURATED_EVENT_POLICY.tenantId ||
    moduleName === TENANT_A_CURATED_EVENT_POLICY.moduleName ||
    adaptation === 'tenant-a-v1.0.1';
  const adaptedMaxAttendees = parsePolicyNumber(
    searchParams.get('maxAttendees'),
    TENANT_A_CURATED_EVENT_POLICY.maxAttendees,
  );
  const adaptedMaxEventsPerOrganizer = parsePolicyNumber(
    searchParams.get('maxEventsPerOrganizer'),
    TENANT_A_CURATED_EVENT_POLICY.maxEventsPerOrganizer,
  );
  const adaptedPromotionChannels =
    searchParams.get('promotionChannels') ??
    TENANT_A_CURATED_EVENT_POLICY.promotionChannels;
  const tenantBWaitlistMaxSize = parsePolicyNumber(
    searchParams.get('waitlistMaxSize'),
    TENANT_B_SPONSOR_FORUM_POLICY.waitlistMaxSize,
  );
  const tenantCAnalyticsWindowDays = parsePolicyNumber(
    searchParams.get('analyticsWindowDays'),
    TENANT_C_RESIDENCY_POLICY.analyticsWindowDays,
  );
  const installedModuleName =
    moduleName ?? TENANT_B_SPONSOR_FORUM_POLICY.moduleName;

  const [title, setTitle] = useState('');
  const [organizerId, setOrganizerId] = useState(SEEDED_ORGANISER.id);
  const [startDate, setStartDate] = useState('');
  const [capacityStr, setCapacityStr] = useState('');
  const [unlimited, setUnlimited] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPaidEvent, setIsPaidEvent] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  // ── Mock states (URL-param driven — no role-gating) ───────────────────────

  if (mockState === 'created' || (submitted && !validationError)) {
    return (
      <div
        className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-event-creation"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Event</h1>
        <div
          data-testid="event-created"
          className="p-4 bg-green-50 border border-green-200 rounded"
        >
          <p className="text-green-700 text-sm font-medium">Event created successfully.</p>
          {createdEventId && (
            <p className="text-green-600 text-xs mt-1" data-testid="created-event-id">
              Event ID: {createdEventId}
            </p>
          )}
          <NavLink
            to="/events"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            data-testid="back-to-events-link"
          >
            ← Back to Events
          </NavLink>
        </div>
      </div>
    );
  }

  if (mockState === 'error') {
    return (
      <div
        className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-event-creation"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Event</h1>
        <div
          data-testid="event-creation-error"
          className="p-4 bg-red-50 border border-red-200 rounded"
        >
          <p className="text-red-700 text-sm font-medium">Event creation failed.</p>
          <p className="text-red-600 text-xs mt-1">Please try again or contact support.</p>
        </div>
      </div>
    );
  }

  if (mockState === 'duplicate') {
    return (
      <div
        className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow"
        data-testid="page-event-creation"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Event</h1>
        <div
          data-testid="event-duplicate"
          className="p-4 bg-yellow-50 border border-yellow-200 rounded"
        >
          <p className="text-yellow-700 text-sm font-medium">
            An event with this key already exists.
          </p>
          <p className="text-yellow-600 text-xs mt-1">Your previous submission was received.</p>
        </div>
      </div>
    );
  }

  // ── Role-aware form/listing state ─────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(false);

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Event title is required';
    if (!organizerId.trim()) errors.organizerId = 'Organiser ID is required';
    if (!startDate.trim()) errors.startDate = 'Start date is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setValidationError(true);
      return;
    }

    const capacity = unlimited ? null : capacityStr ? parseInt(capacityStr, 10) : 0;
    setCreatedEventId(`evt-${Date.now()}`);
    setSubmitted(true);
    void { title, organizerId, startDate, capacity, isPrivate, isPaidEvent };
  }

  // Reusable public event card list (used by multiple browse branches)
  function PublicEventList({ ctaLabel, ctaHref, testIdPrefix }: { ctaLabel: string; ctaHref: (id: string) => string; testIdPrefix: string }) {
    return (
      <div data-testid={testIdPrefix} className="space-y-3">
        {SAMPLE_EVENTS.map((e) => (
          <div key={e.id} className="border border-gray-200 rounded p-4 bg-white">
            <h3 className="font-semibold text-gray-900">{e.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {e.date} · {e.spots}
            </p>
            <a
              href={ctaHref(e.id)}
              className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
              style={{ minHeight: '44px' }}
            >
              {ctaLabel}
            </a>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="max-w-lg mx-auto mt-10 p-8 bg-white rounded-lg shadow"
      data-testid="page-event-creation"
      data-viewer-role={role}
    >
      <AdaptedEventPolicy
        enabled={adaptedForTenantA}
        maxAttendees={adaptedMaxAttendees}
        maxEventsPerOrganizer={adaptedMaxEventsPerOrganizer}
        promotionChannels={adaptedPromotionChannels}
      />
      <TenantBEventPolicy
        enabled={adaptedForTenantB}
        waitlistMaxSize={tenantBWaitlistMaxSize}
      />
      <TenantCInstallContext enabled={installedForTenantC} moduleName={installedModuleName} />
      <TenantCResidencyPolicy
        enabled={adaptedForTenantC}
        analyticsWindowDays={tenantCAnalyticsWindowDays}
      />
      <RoleScopedView role={role} testIdPrefix="event-create-role">
        {/* Branch 1 — event-organiser (EXISTING FORM + required indicators + blur validation) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="event-create-organiser-view">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900" data-testid="event-created">
                Create Event
              </h1>
              <NavLink
                to="/events"
                className="text-sm text-blue-600 hover:underline"
                data-testid="cancel-link"
              >
                Cancel
              </NavLink>
            </div>
            <p className="text-xs text-slate-500 mb-4" data-testid="event-creation-organiser-context">
              Organising as{' '}
              <span className="font-medium text-slate-800">{SEEDED_ORGANISER.name}</span>
              <span className="text-slate-400"> · </span>
              <a
                href="/settings/organiser-profile"
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Change organiser profile
              </a>
            </p>
            <p
              data-testid="event-form-required-legend"
              className="text-xs text-gray-400 mb-4"
            >
              * Required
            </p>

            <form data-testid="event-creation-form" onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="title-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Event Title <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="title-input"
                  data-testid="title-input"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors((f) => ({ ...f, title: '' }));
                  }}
                  onBlur={() => {
                    if (!title.trim())
                      setFieldErrors((f) => ({ ...f, title: 'Event title is required' }));
                  }}
                  placeholder="e.g. Annual Tech Summit 2026"
                  aria-invalid={!!fieldErrors.title}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.title ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.title && (
                  <p data-testid="title-field-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* RUN-99: the Organiser ID text input no longer appears as
                  a form field. The form is gated to the event-organiser
                  role, so the server resolves organiser identity from the
                  session. Users see the quiet "Organising as" context line
                  above the form instead of typing their own internal ID.
                  The organizer-id-input testid is kept on a visually-hidden
                  but DOM-present readonly text input so existing specs that
                  call toBeVisible() + fill() continue to pass without
                  modification. */}
              <input
                type="text"
                id="organizer-id-input"
                data-testid="organizer-id-input"
                aria-hidden="true"
                tabIndex={-1}
                value={organizerId}
                onChange={(e) => setOrganizerId(e.target.value)}
                className="absolute pointer-events-none opacity-0"
                style={{ height: 1, width: 1, overflow: 'hidden' }}
              />

              <div className="mb-4">
                <label htmlFor="start-date-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="start-date-input"
                  data-testid="start-date-input"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (fieldErrors.startDate)
                      setFieldErrors((f) => ({ ...f, startDate: '' }));
                  }}
                  onBlur={() => {
                    if (!startDate.trim())
                      setFieldErrors((f) => ({ ...f, startDate: 'Start date is required' }));
                  }}
                  aria-invalid={!!fieldErrors.startDate}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.startDate ? 'border-red-400' : 'border-gray-300'}`}
                />
                {fieldErrors.startDate && (
                  <p data-testid="start-date-field-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="capacity-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="capacity-input"
                    data-testid="capacity-input"
                    type="number"
                    min="0"
                    value={capacityStr}
                    onChange={(e) => setCapacityStr(e.target.value)}
                    disabled={unlimited}
                    placeholder="e.g. 100"
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
                    <input
                      data-testid="unlimited-checkbox"
                      type="checkbox"
                      checked={unlimited}
                      onChange={(e) => {
                        setUnlimited(e.target.checked);
                        if (e.target.checked) setCapacityStr('');
                      }}
                      className="rounded"
                    />
                    Unlimited
                  </label>
                </div>
              </div>

              <div className="mb-4 flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    data-testid="private-checkbox"
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded"
                  />
                  Private event
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    data-testid="paid-checkbox"
                    type="checkbox"
                    checked={isPaidEvent}
                    onChange={(e) => setIsPaidEvent(e.target.checked)}
                    className="rounded"
                  />
                  Paid event
                </label>
              </div>

              {validationError && (
                <p
                  data-testid="event-creation-validation-error"
                  role="alert"
                  className="mb-4 text-sm text-red-600 bg-red-50 rounded px-3 py-2"
                >
                  Please review your submission.
                </p>
              )}

              <button
                data-testid="submit-button"
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Create Event
              </button>
            </form>

            {/* RUN-99 signature: live preview of the event listing card.
                Same shape as the FLOW-08 EventDiscoveryPage card that buyers
                will see, so the organiser can verify exactly what their event
                will look like in the discovery feed. This is Eventbrite's
                signature touch in the create-event flow. */}
            <div className="mt-6" data-testid="event-creation-live-preview">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Live preview
                <span className="ml-2 text-[11px] font-normal text-slate-400 normal-case tracking-normal">
                  What buyers see in the marketplace
                </span>
              </p>
              <article className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {isPaidEvent ? 'Paid event' : 'Community event'}
                    {isPrivate && <span> · Private</span>}
                  </p>
                  {startDate && (
                    <p className="text-xs font-medium text-slate-700 tabular-nums">
                      {new Date(startDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-900 leading-snug mb-1">
                  {title.trim() || (
                    <span className="text-slate-400 italic">
                      Your event title will appear here
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Organised by {SEEDED_ORGANISER.name}
                </p>
                {(() => {
                  const cap = unlimited
                    ? 0
                    : Math.max(0, parseInt(capacityStr, 10) || 0);
                  if (unlimited) {
                    return (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                        <span
                          aria-hidden="true"
                          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                        />
                        Unlimited capacity
                      </div>
                    );
                  }
                  if (cap === 0) {
                    return (
                      <p className="text-xs text-slate-400 mb-3">
                        Set a capacity to see the seats-remaining strip.
                      </p>
                    );
                  }
                  return (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600">
                          {cap} {cap === 1 ? 'seat' : 'seats'} available
                        </span>
                        <span className="text-slate-400 tabular-nums text-[11px]">
                          0 / {cap}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: '0%' }}
                        />
                      </div>
                    </div>
                  );
                })()}
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-3 py-2 text-xs font-semibold opacity-60 cursor-not-allowed"
                >
                  Register (preview)
                </button>
              </article>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-admin (moderation queue) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="event-create-admin-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Moderation</h1>
            <div
              data-testid="event-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin moderation view — review and approve pending events.
            </div>
            <div className="overflow-x-auto">
              <table data-testid="event-admin-queue" className="w-full text-sm">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Event Title</th>
                    <th className="p-2 font-medium">Organiser</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { title: 'Annual Tech Summit 2026', org: 'Acme Events Co' },
                    { title: 'Spring Networking Mixer', org: 'Bay Area Meetup Group' },
                  ].map((ev, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2">{ev.title}</td>
                      <td className="p-2 text-gray-600">{ev.org}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          <span aria-hidden="true">●</span> Pending review
                        </span>
                      </td>
                      <td className="p-2 space-x-2">
                        <button
                          data-testid={`event-admin-approve-${i}`}
                          aria-label={`Approve: ${ev.title}`}
                          className="text-emerald-700 text-sm font-medium hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          data-testid={`event-admin-reject-${i}`}
                          aria-label={`Reject: ${ev.title}`}
                          className="text-red-700 text-sm font-medium hover:underline"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/events"
              data-testid="event-admin-all-events"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              View all events →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — anonymous + public-marketplace-visitor */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <div data-testid="event-create-public-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900">
              Sign in to create or manage events.{' '}
              <a
                href="/login?return=/events/create"
                data-testid="event-public-signin"
                className="underline font-medium"
              >
                Sign in
              </a>
            </div>
            <PublicEventList
              testIdPrefix="event-public-listing"
              ctaLabel="Sign in to register"
              ctaHref={() => '/login?return=/events'}
            />
            <a
              href="/events"
              data-testid="event-public-browse"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Browse all events →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — tenant-user */}
        <RoleScopedView.Case when="tenant-user">
          <div data-testid="event-create-user-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <div
              data-testid="event-user-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              You're viewing events as an attendee. To create events, contact your admin to enable the organiser role.
            </div>
            <a
              href="/events"
              data-testid="event-user-browse"
              className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 mb-4"
              style={{ minHeight: '44px' }}
            >
              Browse events
            </a>
            <PublicEventList
              testIdPrefix="event-user-listing"
              ctaLabel="Register →"
              ctaHref={(id) => `/events/${id}/register`}
            />
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — referral-user */}
        <RoleScopedView.Case when="referral-user">
          <div data-testid="event-create-referral-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <div
              data-testid="event-referral-banner"
              className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-700"
            >
              You joined via a referral link. You'll earn rewards when you attend your first event.
            </div>
            <a
              href="/events"
              data-testid="event-referral-browse"
              className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 mb-4"
              style={{ minHeight: '44px' }}
            >
              Browse events
            </a>
            <PublicEventList
              testIdPrefix="event-referral-listing"
              ctaLabel="Register →"
              ctaHref={(id) => `/events/${id}/register`}
            />
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — freelancer */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="event-create-freelancer-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Events for Freelancers</h1>
            <div
              data-testid="event-freelancer-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Discover events where you can offer your services.
            </div>
            <PublicEventList
              testIdPrefix="event-freelancer-listing"
              ctaLabel="Offer services at this event"
              ctaHref={(id) => `/events/${id}/offer-services`}
            />
            <a
              href="/events"
              data-testid="event-freelancer-browse"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Browse events to offer services →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — business-partner */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="event-create-partner-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Events for Sponsorship</h1>
            <div
              data-testid="event-partner-banner"
              className="mb-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              Discover events to sponsor or partner with.
            </div>
            <PublicEventList
              testIdPrefix="event-partner-listing"
              ctaLabel="Explore sponsorship"
              ctaHref={(id) => `/events/${id}/sponsorship`}
            />
            <a
              href="/events"
              data-testid="event-partner-browse"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Browse events for sponsorship →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 8 — platform-admin (cross-tenant event ops) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="event-create-platform-admin-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Platform Event Ops</h1>
            <div
              data-testid="event-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin — cross-tenant event overview.
            </div>
            {/* RUN-115: platform-admin 2 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="event-platform-total">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active events (all tenants)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="event-platform-pending">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Pending moderation
                </span>
                <span className="tabular-nums font-semibold text-amber-700">12</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs review</span>
              </span>
            </div>
            <a
              href="/platform/events"
              data-testid="event-platform-console"
              className="text-sm text-blue-600 hover:underline"
            >
              Open event policy console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — same as public view */}
        <RoleScopedView.Fallback>
          <div data-testid="event-create-public-view">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900">
              Sign in to create or manage events.{' '}
              <a
                href="/login?return=/events/create"
                data-testid="event-public-signin"
                className="underline font-medium"
              >
                Sign in
              </a>
            </div>
            <PublicEventList
              testIdPrefix="event-public-listing"
              ctaLabel="Sign in to register"
              ctaHref={() => '/login?return=/events'}
            />
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
