/**
 * EventListPage — FLOW-03 event overview.
 * Route: /events
 *
 * Playwright mock hooks (driven by query params):
 *   ?mock=empty   → empty state    (data-testid="event-list-empty")
 *   ?mock=error   → error state    (data-testid="event-list-error")
 *   ?mock=loaded  → seeded list    (data-testid="event-list")
 *   otherwise     → seeded list    (data-testid="event-list")
 */

import React from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';

interface MockEvent {
  event_id: string;
  title: string;
  capacity: number | null;
  status: string;
  organizer_id: string;
  start_date: string;
  registration_count: number;
}

const MOCK_EVENTS: MockEvent[] = [
  {
    event_id: 'evt-001',
    title: 'Annual Tech Summit 2026',
    capacity: 200,
    status: 'ACTIVE',
    organizer_id: 'org-001',
    start_date: '2026-06-15T09:00:00.000Z',
    registration_count: 142,
  },
  {
    event_id: 'evt-002',
    title: 'Product Design Workshop',
    capacity: 30,
    status: 'ACTIVE',
    organizer_id: 'org-002',
    start_date: '2026-07-01T14:00:00.000Z',
    registration_count: 30,
  },
  {
    event_id: 'evt-003',
    title: 'Open Source Hackathon',
    capacity: null,
    status: 'PROMOTED',
    organizer_id: 'org-001',
    start_date: '2026-08-10T08:00:00.000Z',
    registration_count: 89,
  },
];

function capacityLabel(capacity: number | null, count: number): string {
  if (capacity === null) return `${count} registered (unlimited)`;
  if (capacity === 0) return 'Closed';
  return `${count} / ${capacity}`;
}

function statusBadge(status: string) {
  const colours: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    PROMOTED: 'bg-blue-100 text-blue-700',
    DRAFT: 'bg-gray-100 text-gray-600',
    ENDED: 'bg-red-100 text-red-700',
  };
  return colours[status] ?? 'bg-gray-100 text-gray-600';
}

export function EventListPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState === 'error') {
    return (
      <div className="p-6" data-testid="page-event-list">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        </div>
        <div
          data-testid="event-list-error"
          className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700"
        >
          Failed to load events. Please refresh or try again.
        </div>
      </div>
    );
  }

  if (mockState === 'empty') {
    return (
      <div className="p-6" data-testid="page-event-list">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <NavLink
            to="/events/create"
            data-testid="create-event-button"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Create Event
          </NavLink>
        </div>
        <div
          data-testid="event-list-empty"
          className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300"
        >
          <p className="text-gray-500 text-sm">No events yet.</p>
          <NavLink
            to="/events/create"
            className="mt-2 inline-block text-blue-600 text-sm hover:underline"
            data-testid="create-first-event-link"
          >
            Create your first event →
          </NavLink>
        </div>
      </div>
    );
  }

  // Default + ?mock=loaded — show seeded list
  return (
    <div className="p-6" data-testid="page-event-list">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <NavLink
          to="/events/create"
          data-testid="create-event-button"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          + Create Event
        </NavLink>
      </div>

      <div data-testid="event-list" className="space-y-3">
        {MOCK_EVENTS.map((evt) => (
          <div
            key={evt.event_id}
            data-testid="event-item"
            className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:border-blue-300 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-sm font-medium text-gray-900 truncate"
                  data-testid="event-title"
                >
                  {evt.title}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(evt.status)}`}
                  data-testid="event-status-badge"
                >
                  {evt.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span data-testid="event-start-date">
                  {new Date(evt.start_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span data-testid="event-capacity-label">
                  {capacityLabel(evt.capacity, evt.registration_count)}
                </span>
                <span>Organiser: {evt.organizer_id}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4 shrink-0">
              {evt.status === 'ACTIVE' && (
                <button
                  data-testid="promote-button"
                  className="text-xs px-3 py-1.5 border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                >
                  Promote
                </button>
              )}
              <NavLink
                to={`/events/${evt.event_id}`}
                data-testid="view-event-link"
                className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
              >
                View
              </NavLink>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-gray-400" data-testid="event-count">
        {MOCK_EVENTS.length} event{MOCK_EVENTS.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
