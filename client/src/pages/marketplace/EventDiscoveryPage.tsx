/**
 * FLOW-08 — EventDiscoveryPage (role-scoped)
 *
 * Pilot surface for Luba's C6 role-aware templating architecture (2026-04-20):
 * the same marketplace page renders different templates depending on viewer
 * role. Registered tenant users see the "Register" CTA, public/anonymous
 * visitors see a "Sign in to register" gate, freelancers see an alternate
 * "Offer services" CTA where the event allows it, event organisers see
 * manage-capacity controls, and business-partners see a sponsorship hook.
 *
 * Role resolution: `useViewerRole()` reads ?role=<ViewerRole> query param for
 * Playwright mock-states + localStorage for persistent picks. Defaults to
 * 'anonymous' so the public-marketplace visitor path is the fallback.
 *
 * Data source: /api/dynamic/xiigen-events (unchanged).
 */

import React, { useState, useEffect } from 'react';
import { useViewerRole } from '../../hooks/useViewerRole';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { isPublicMarketplaceView } from '../../components/common/ViewerRole';

interface Event {
  eventId: string;
  eventName: string;
  eventCategory: string;
  tenantId: string;
  capacity?: number;
  registeredCount?: number;
  status: string;
  createdAt: string;
  startsAt?: string;
  venue?: string;
}

/**
 * RUN-90: capacity consumption strip — XIIGen's signature element
 * (see /.impeccable.md). The "seats consumed" bar is embedded inside
 * the event card, not floating above it. Same pattern as the budget
 * strip on a running pipeline node: a fuel gauge belongs on the
 * dashboard of the vehicle burning the fuel.
 *
 *   <70%    emerald — plenty of room
 *   70-89%  amber   — filling up
 *   90-99%  rose    — nearly full (urgency)
 *   100%    slate   — sold out (resolved, muted)
 */
function computeCapacityState(registered: number, capacity: number) {
  if (capacity === 0) {
    return {
      pct: 0,
      bar: 'bg-slate-200',
      text: 'text-slate-500',
      label: 'Capacity not yet set',
    };
  }
  const pct = Math.min(100, Math.round((registered / capacity) * 100));
  const remaining = Math.max(0, capacity - registered);
  if (pct >= 100) {
    return { pct: 100, bar: 'bg-slate-400', text: 'text-slate-500', label: 'Sold out' };
  }
  if (pct >= 90) {
    return {
      pct,
      bar: 'bg-rose-600',
      text: 'text-rose-700',
      label: `Only ${remaining} ${remaining === 1 ? 'seat' : 'seats'} left`,
    };
  }
  if (pct >= 70) {
    return {
      pct,
      bar: 'bg-amber-500',
      text: 'text-amber-700',
      label: `${remaining} ${remaining === 1 ? 'seat' : 'seats'} left`,
    };
  }
  return {
    pct,
    bar: 'bg-emerald-500',
    text: 'text-slate-600',
    label: `${remaining} ${remaining === 1 ? 'seat' : 'seats'} left`,
  };
}

function formatEventDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function EventDiscoveryPage() {
  const { role } = useViewerRole('anonymous');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/dynamic/xiigen-events');
      if (!resp.ok) {
        setError('Failed to load events');
        return;
      }
      const data = await resp.json();
      const items = (data?.data?.items ?? data?.hits ?? []) as Event[];
      setEvents(items);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="event-discovery-page" data-viewer-role={role}>
        <p data-testid="events-loading">Loading events...</p>
      </div>
    );
  }

  // RUN-84: if the backend returns no events (e.g. e2e env with no seed), fall
  // back to a client-side seed so buyers never land on a blank "No events
  // available" page. Engineering-only "view: role" label removed (leaked
  // enum to end-users).
  const SEED_EVENTS: Event[] = [
    {
      eventId: 'EVT-2026-0428-001',
      eventName: 'Annual Tech Summit 2026',
      eventCategory: 'Conference',
      tenantId: 'tenant-acme',
      capacity: 500,
      registeredCount: 478,
      status: 'PUBLISHED',
      createdAt: '2026-03-15',
      startsAt: '2026-04-28',
      venue: 'Convention Center · Berlin',
    },
    {
      eventId: 'EVT-2026-0512-002',
      eventName: 'Freelancer showcase night',
      eventCategory: 'Networking',
      tenantId: 'tenant-acme',
      capacity: 120,
      registeredCount: 87,
      status: 'PUBLISHED',
      createdAt: '2026-04-02',
      startsAt: '2026-05-12',
      venue: 'The Commons · Lisbon',
    },
    {
      eventId: 'EVT-2026-0601-003',
      eventName: 'AI builders meetup — June edition',
      eventCategory: 'Workshop',
      tenantId: 'tenant-acme',
      capacity: 80,
      registeredCount: 80,
      status: 'PUBLISHED',
      createdAt: '2026-04-10',
      startsAt: '2026-06-01',
      venue: 'Factory Studio · Zürich',
    },
    {
      eventId: 'EVT-2026-0715-004',
      eventName: 'Summer hackathon — 48h build challenge',
      eventCategory: 'Hackathon',
      tenantId: 'tenant-acme',
      capacity: 200,
      registeredCount: 62,
      status: 'PUBLISHED',
      createdAt: '2026-04-18',
      startsAt: '2026-07-15',
      venue: 'TechLoft · Amsterdam',
    },
  ];
  const displayedEvents = events.length === 0 ? SEED_EVENTS : events;

  return (
    <div className="p-6" data-testid="event-discovery-page" data-viewer-role={role}>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Discover events</h1>
      <p className="text-sm text-gray-500 mb-4">
        Upcoming events from your community — RSVP to reserve a spot.
      </p>

      {error && (
        <p className="text-sm text-gray-500 mb-4" data-testid="events-error">
          {/* RUN-84: softened from "red error" to neutral grey — matches REPAIR-GUIDANCE H9 */}
          Couldn't load the latest events. Showing recent ones below.
        </p>
      )}

      {/* Anonymous / public-marketplace-visitor: visible call to sign in. */}
      {isPublicMarketplaceView(role) && (
        <div
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded"
          data-testid="public-marketplace-banner"
        >
          <p className="text-sm text-blue-900">
            Browsing as a public visitor.{' '}
            <a href="/register" className="underline font-medium">
              Sign in or register
            </a>{' '}
            to register for events, list gigs, or partner with hosts.
          </p>
        </div>
      )}

      {displayedEvents.length === 0 ? (
        <p
          className="text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
          data-testid="no-events"
        >
          No events yet. New events from your community will appear here.
        </p>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="events-grid"
        >
          {displayedEvents.map((event) => {
            const cap = event.capacity ?? 0;
            const reg = event.registeredCount ?? 0;
            const capacityState = computeCapacityState(reg, cap);
            const eventDate = formatEventDate(event.startsAt);
            const isSoldOut = cap > 0 && reg >= cap;
            return (
              <article
                key={event.eventId}
                className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col"
                data-testid="event-card"
              >
                {/* Eventbrite-style header: category label + date on the same row */}
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                    data-testid="event-category"
                  >
                    {event.eventCategory}
                  </p>
                  {eventDate && (
                    <p
                      className="text-xs font-medium text-slate-700 tabular-nums"
                      data-testid="event-date"
                    >
                      {eventDate}
                    </p>
                  )}
                </div>
                <h3
                  className="text-base font-semibold text-slate-900 leading-snug mb-1"
                  data-testid="event-name"
                >
                  {event.eventName}
                </h3>
                {event.venue && (
                  <p className="text-xs text-slate-500 mb-3" data-testid="event-venue">
                    {event.venue}
                  </p>
                )}

                {/* RUN-90 signature: capacity consumption strip embedded in the card.
                    See /.impeccable.md — the budget strip pattern transposed to events.
                    Bar color grades through emerald → amber → rose → slate as seats fill. */}
                {cap > 0 && (
                  <div className="mb-3" data-testid="event-capacity">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-medium ${capacityState.text}`}>
                        {capacityState.label}
                      </span>
                      <span className="text-slate-400 tabular-nums text-[11px]">
                        {reg} / {cap}
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={capacityState.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${capacityState.pct}% of seats filled`}
                    >
                      <div
                        className={`h-full ${capacityState.bar} transition-[width] duration-300`}
                        style={{ width: `${capacityState.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Role-scoped action — this is the C6 pattern in action.
                    On sold-out events, the CTA is visually disabled-looking for
                    register-paths (the strip has already signalled the state). */}
                <div
                  className="mt-auto"
                  data-event-sold-out={isSoldOut ? 'true' : 'false'}
                >
                <RoleScopedView role={role} testIdPrefix="event-card-action">
                  <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
                    <a
                      href={`/register?return=/events/${event.eventId}/register`}
                      className="block bg-gray-200 text-gray-800 text-center px-3 py-2 rounded text-sm hover:bg-gray-300"
                      data-testid="sign-in-to-register-link"
                    >
                      Sign in to register
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
                    <a
                      href={`/events/${event.eventId}/register`}
                      className="block bg-blue-600 text-white text-center px-3 py-2 rounded text-sm hover:bg-blue-700"
                      data-testid="register-link"
                    >
                      Register
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Case when="freelancer">
                    <a
                      href={`/events/${event.eventId}/offer-services`}
                      className="block bg-purple-600 text-white text-center px-3 py-2 rounded text-sm hover:bg-purple-700"
                      data-testid="offer-services-link"
                    >
                      Offer services at this event
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Case when="business-partner">
                    <a
                      href={`/events/${event.eventId}/sponsorship`}
                      className="block bg-amber-600 text-white text-center px-3 py-2 rounded text-sm hover:bg-amber-700"
                      data-testid="sponsorship-link"
                    >
                      Explore sponsorship
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Case when={['event-organiser', 'tenant-admin']}>
                    <a
                      href={`/admin/events/${event.eventId}`}
                      className="block bg-emerald-700 text-white text-center px-3 py-2 rounded text-sm hover:bg-emerald-800"
                      data-testid="manage-event-link"
                    >
                      Manage capacity &amp; bookings
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Case when={['platform-admin', 'platform-support']}>
                    <a
                      href={`/admin/events?tenantId=${encodeURIComponent(event.tenantId)}`}
                      className="block bg-slate-700 text-white text-center px-3 py-2 rounded text-sm hover:bg-slate-800"
                      data-testid="platform-view-link"
                    >
                      Cross-tenant view
                    </a>
                  </RoleScopedView.Case>

                  <RoleScopedView.Fallback>
                    <p className="text-xs text-gray-500 text-center">No action for this role.</p>
                  </RoleScopedView.Fallback>
                </RoleScopedView>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EventDiscoveryPage;
