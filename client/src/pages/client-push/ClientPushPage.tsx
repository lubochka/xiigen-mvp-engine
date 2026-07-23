/**
 * ClientPushPage — FLOW-40 admin console for Client Push (SSE delivery).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-client-push
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - Plan states: SUBSCRIPTION_ACTIVE → EVENT_QUEUED → PAYLOAD_DISPATCHED → DELIVERY_CONFIRMED
 *   - Server codes:
 *       sse-connection-manager.service.ts → 'UNAUTHENTICATED_TENANT' | 'EXPIRED_CORRELATION_ID'
 *       flow-event-bridge.service.ts       → 'CROSS_TENANT_DELIVERY_ATTEMPT'
 *       sse-keepalive-scheduler.service.ts → keepalive cadence
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import {
  ClientPushScreen,
  type SseConnectionItem,
  type EventDeliveryItem,
} from '../../components/client-push/ClientPushScreen';

// CFI-05 close: platform-admin seed — recent SSE connections across connection
// states + event deliveries covering the onboarding event family.
// Reference: New Relic connection inspector + OneSignal admin dashboard.
const PLATFORM_CONNECTIONS: SseConnectionItem[] = [
  { correlationId: 'COR-2026-0420-001', status: 'CONNECTED' },
  { correlationId: 'COR-2026-0420-002', status: 'CONNECTED' },
  { correlationId: 'COR-2026-0420-003', status: 'CONNECTED' },
  { correlationId: 'COR-2026-0420-004', status: 'EXPIRED' },
  { correlationId: 'COR-2026-0420-005', status: 'FAILED' },
];

const PLATFORM_EVENT_DELIVERIES: EventDeliveryItem[] = [
  { eventId: 'EVT-2026-0420-01', eventType: 'email.verified', status: 'DELIVERED' },
  { eventId: 'EVT-2026-0420-02', eventType: 'onboarding.step.workspace', status: 'DELIVERED' },
  { eventId: 'EVT-2026-0420-03', eventType: 'onboarding.step.first-flow', status: 'DELIVERED' },
  { eventId: 'EVT-2026-0420-04', eventType: 'verification.expired', status: 'FAILED' },
  {
    eventId: 'EVT-2026-0420-05',
    eventType: 'onboarding.step.community-invite',
    status: 'DELIVERED',
  },
];
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'subscription-active': {
    idx: 1,
    label: 'Client SSE subscription active — pool registered, awaiting events',
    status: 'ACTIVE',
    fields: {
      connectionId: 'CON-2026-0419-001',
      tenantId: 'tenant-acme-42',
      correlationId: 'COR-xyz-9821',
      registeredAt: '2026-04-19 13:00',
    },
  },
  'event-queued': {
    idx: 2,
    label: 'Flow event queued for push — bridge enqueued payload for dispatch',
    status: 'QUEUED',
    fields: {
      eventId: 'EVT-2026-0419-045',
      connectionId: 'CON-2026-0419-001',
      eventType: 'flow.cycle.completed',
      enqueuedAt: '2026-04-19 13:02',
    },
  },
  'payload-dispatched': {
    idx: 3,
    label: 'SSE payload dispatched — message sent over active connection',
    status: 'DISPATCHED',
    fields: {
      eventId: 'EVT-2026-0419-045',
      connectionId: 'CON-2026-0419-001',
      byteSize: '812',
      dispatchedAt: '2026-04-19 13:02:05',
    },
  },
  'delivery-confirmed': {
    idx: 4,
    label: 'Delivery confirmed — client ACK received within SLA',
    status: 'DELIVERED',
    fields: {
      eventId: 'EVT-2026-0419-045',
      connectionId: 'CON-2026-0419-001',
      ackLatencyMs: '38',
      confirmedAt: '2026-04-19 13:02:05',
    },
  },
  'connection-expired': {
    idx: 5,
    label: 'Connection expired — correlation id invalidated, reconnect required',
    status: 'EXPIRED',
    fields: {
      connectionId: 'CON-2026-0418-093',
      reason: 'EXPIRED_CORRELATION_ID',
      idleSec: '1800',
      expiredAt: '2026-04-19 13:05',
    },
  },
  'cross-tenant-blocked': {
    idx: 6,
    label: 'Cross-tenant delivery attempt blocked — isolation boundary enforced',
    status: 'BLOCKED',
    fields: {
      eventId: 'EVT-2026-0419-046',
      sourceTenant: 'tenant-acme-42',
      targetTenant: 'tenant-globex-17',
      blockedAt: '2026-04-19 13:07',
    },
  },
  'keepalive-sent': {
    idx: 7,
    label: 'Keepalive heartbeat sent — connection pool warm',
    status: 'WARM',
    fields: {
      connectionId: 'CON-2026-0419-001',
      intervalSec: '15',
      poolSize: '24',
      sentAt: '2026-04-19 13:08',
    },
  },
  'delivery-failed': {
    idx: 8,
    label: 'Delivery failed — client connection dropped mid-dispatch',
    status: 'FAILED',
    fields: {
      eventId: 'EVT-2026-0419-047',
      connectionId: 'CON-2026-0419-002',
      reason: 'CONNECTION_DROPPED',
      failedAt: '2026-04-19 13:10',
    },
  },
};

/**
 * Notification payload type — content comes from the originating flow,
 * NEVER hardcoded here. This page renders a shell only.
 */
interface NotificationPayload {
  id: string;
  icon: 'ticket' | 'payment' | 'gate' | 'message';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  targetHref: string;
  originFlow: string;
}

// Sample payloads — standing in for data that would normally arrive via API/websocket.
// The KEY point: the CONTENT comes with the payload. The page is a dumb shell.
const SAMPLE_NOTIFICATIONS: NotificationPayload[] = [
  {
    id: 'NTF-0419-041',
    icon: 'ticket',
    title: 'Your booking is confirmed',
    description: 'Booking #BK-4521 for the Annual Tech Summit is confirmed.',
    timestamp: '12 min ago',
    read: false,
    targetHref: '/booking?purchaseId=BK-4521',
    originFlow: 'Bookings',
  },
  {
    id: 'NTF-0419-042',
    icon: 'payment',
    title: 'Payment processed',
    description: 'Your payment of $240.00 has been completed.',
    timestamp: '1 hour ago',
    read: false,
    targetHref: '/checkout?orderId=ORD-9912',
    originFlow: 'Payments',
  },
  {
    id: 'NTF-0419-031',
    icon: 'gate',
    title: 'Approval required',
    description: 'Your action on workflow WF-ticket-refund is awaiting a reviewer.',
    timestamp: '3 hours ago',
    read: true,
    targetHref: '/human-interaction-gate',
    originFlow: 'Approvals',
  },
];

function NotificationIcon({ kind }: { kind: NotificationPayload['icon'] }) {
  // All four icon kinds are rendered by the same Bell SVG — the decorative colour
  // differs, but the glyph itself is from lucide-react (no emoji used as a functional icon).
  const tone =
    kind === 'payment'
      ? 'text-emerald-600 bg-emerald-50'
      : kind === 'gate'
        ? 'text-amber-600 bg-amber-50'
        : kind === 'message'
          ? 'text-purple-600 bg-purple-50'
          : 'text-blue-600 bg-blue-50';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full w-10 h-10 flex-shrink-0 ${tone}`}
      aria-hidden="true"
    >
      <Bell size={18} strokeWidth={2} />
    </span>
  );
}

export function ClientPushPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  const [notifications, setNotifications] = useState<NotificationPayload[]>(SAMPLE_NOTIFICATIONS);
  const [configToggles, setConfigToggles] = useState<Record<string, boolean>>({
    'booking-confirmations': true,
    'payment-receipts': true,
    'gate-decisions': true,
    'weekly-digest': false,
  });
  const [testSent, setTestSent] = useState(false);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="client-push"
        flowId="FLOW-40"
        title="Client Push"
        state={MOCK_STATES[mockState]}
        description="Admin view of SSE subscriptions, event queueing, payload dispatch, delivery confirmation, and tenant-isolation enforcement."
      />
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function toggleConfig(key: string) {
    setConfigToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="cp-role">
        {/* Branch 1 — tenant-user (personal notification inbox) */}
        <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
          <main data-testid="cp-role-inbox-view" className="max-w-2xl mx-auto py-6 px-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              {unreadCount > 0 && (
                <button
                  type="button"
                  data-testid="cp-inbox-mark-all-read"
                  aria-label="Mark all notifications as read"
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 hover:underline"
                  style={{ minHeight: '44px' }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div
                data-testid="cp-inbox-empty"
                role="status"
                className="p-8 text-center border border-dashed border-gray-300 rounded-lg bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-700">You're all caught up.</p>
                <a
                  href="/dashboard"
                  className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                >
                  Back to dashboard →
                </a>
              </div>
            ) : (
              <ul
                data-testid="cp-inbox-list"
                role="list"
                aria-label="Your notifications"
                className="space-y-2"
              >
                {notifications.map((n, i) => (
                  <li
                    key={n.id}
                    data-testid={`cp-inbox-item-${i}`}
                    data-read={n.read ? 'true' : 'false'}
                    className={`rounded-lg border ${n.read ? 'border-gray-200 bg-white' : 'border-blue-300 bg-blue-50'}`}
                  >
                    <a
                      href={n.targetHref}
                      data-testid={`cp-inbox-item-link-${i}`}
                      aria-label={`${n.title} — open related page`}
                      className="flex gap-3 items-start p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                      style={{ minHeight: '44px' }}
                    >
                      <NotificationIcon kind={n.icon} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm ${n.read ? 'font-medium text-gray-800' : 'font-semibold text-gray-900'}`}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span
                              data-testid={`cp-inbox-unread-${i}`}
                              className="text-xs text-blue-700 font-medium flex items-center gap-1"
                            >
                              <span aria-hidden="true">●</span> Unread
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {n.timestamp} · via {n.originFlow}
                        </p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-admin (notification management) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="cp-role-admin-view" className="max-w-3xl mx-auto p-4">
            <div
              data-testid="cp-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Notification settings — configure which notification types are enabled for your
              tenant. Users always receive urgent system alerts regardless of these settings.
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-3">Notification types</h2>
            <fieldset
              data-testid="cp-admin-config-panel"
              className="p-4 border border-gray-200 rounded bg-white mb-4"
            >
              <legend className="sr-only">Notification type toggles</legend>
              {[
                { key: 'booking-confirmations', label: 'Booking confirmations' },
                { key: 'payment-receipts', label: 'Payment receipts' },
                { key: 'gate-decisions', label: 'Approval gate decisions' },
                { key: 'weekly-digest', label: 'Weekly activity digest' },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  htmlFor={`cp-admin-toggle-${toggle.key}`}
                  className="flex items-center justify-between py-2 text-sm cursor-pointer"
                >
                  <span className="text-gray-800">{toggle.label}</span>
                  <input
                    id={`cp-admin-toggle-${toggle.key}`}
                    data-testid={`cp-admin-toggle-${toggle.key}`}
                    type="checkbox"
                    checked={configToggles[toggle.key] ?? false}
                    onChange={() => toggleConfig(toggle.key)}
                    aria-label={`Enable ${toggle.label}`}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              ))}
            </fieldset>

            {testSent ? (
              <p
                data-testid="cp-admin-test-sent"
                role="status"
                aria-live="polite"
                className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800"
              >
                <span aria-hidden="true">✓</span> Test notification queued — check your inbox.
              </p>
            ) : (
              <button
                type="button"
                data-testid="cp-admin-test-send"
                aria-label="Send a test notification to myself"
                onClick={() => setTestSent(true)}
                className="mb-4 border border-orange-500 text-orange-700 px-3 py-2 rounded text-sm font-medium hover:bg-orange-50"
                style={{ minHeight: '44px' }}
              >
                Send test notification
              </button>
            )}

            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent deliveries</h2>
            <div className="overflow-x-auto">
              <table data-testid="cp-admin-delivery-log" className="w-full text-sm min-w-[560px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Recipient</th>
                    <th className="p-2 font-medium">Type</th>
                    <th className="p-2 font-medium">Sent</th>
                    <th className="p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      user: 'user-***-aa12',
                      type: 'Booking confirmation',
                      sent: '12 min ago',
                      status: 'Delivered',
                      tone: 'text-green-700',
                    },
                    {
                      user: 'user-***-bc34',
                      type: 'Payment receipt',
                      sent: '1 hour ago',
                      status: 'Delivered',
                      tone: 'text-green-700',
                    },
                    {
                      user: 'user-***-de56',
                      type: 'Gate decision',
                      sent: '2 hours ago',
                      status: 'Failed',
                      tone: 'text-red-700',
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      data-testid={`cp-admin-delivery-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 font-mono text-xs">{row.user}</td>
                      <td className="p-2 text-gray-700">{row.type}</td>
                      <td className="p-2 text-gray-500">{row.sent}</td>
                      <td className={`p-2 font-medium ${row.tone}`}>
                        <span aria-hidden="true">●</span> {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — platform-admin (infrastructure ops + existing AdminCrudPanel) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="cp-role-platform-admin-view">
            <div
              data-testid="cp-platform-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform admin — notification delivery infrastructure ops.
            </div>
            {/* RUN-107: platform-admin 4 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="cp-platform-sent">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Sent (24h)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">142,870</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="cp-platform-delivered">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Delivered
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">99.2%</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="cp-platform-failed">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Failed
                </span>
                <span className="tabular-nums font-semibold text-rose-700">1,142</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs retry</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="cp-platform-latency">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Median latency
                </span>
                <span className="tabular-nums font-semibold text-slate-900">42ms</span>
              </span>
            </div>
            <div className="px-4 pb-4 flex flex-wrap gap-3">
              <a
                href="/platform/client-push/failed"
                data-testid="cp-platform-failed-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Review failure queue →
              </a>
              <a
                href="/platform/client-push/templates"
                data-testid="cp-platform-templates-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Manage notification templates →
              </a>
              <a
                href="/platform/client-push/tenants"
                data-testid="cp-platform-tenant-health-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Tenant delivery health →
              </a>
            </div>
            {/*
              CFI-05 close: render the purpose-built ClientPushScreen instead
              of AdminCrudPanel. Active SSE connections + event-delivery log.
              Reference: New Relic connection inspector + OneSignal admin.
            */}
            <div className="p-4" data-testid="cp-role-platform-admin-screen">
              <ClientPushScreen
                connections={PLATFORM_CONNECTIONS}
                eventDeliveries={PLATFORM_EVENT_DELIVERIES}
              />
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-support (read-only audit log) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="cp-role-support-view" className="max-w-3xl mx-auto p-4">
            <div
              data-testid="cp-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only notification audit log. Use this when investigating a tenant complaint — no
              controls, no retries.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="cp-support-search" className="sr-only">
                Tenant ID or recipient ID
              </label>
              <input
                id="cp-support-search"
                data-testid="cp-support-search"
                type="text"
                placeholder="tenant-XXXX or user-XXXX"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="cp-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                style={{ minHeight: '44px' }}
              >
                Load audit log
              </button>
            </div>
            <ul data-testid="cp-support-log" role="list" className="space-y-2">
              {[
                {
                  type: 'Booking confirmation',
                  ts: '2026-04-19 13:02:05',
                  status: 'Delivered',
                  recipient: 'user-***-aa12',
                  summary: 'Payload 812 B, ACK 38 ms',
                },
                {
                  type: 'Payment receipt',
                  ts: '2026-04-19 12:40:11',
                  status: 'Delivered',
                  recipient: 'user-***-bc34',
                  summary: 'Payload 644 B, ACK 52 ms',
                },
                {
                  type: 'Gate decision',
                  ts: '2026-04-19 11:15:44',
                  status: 'Failed',
                  recipient: 'user-***-de56',
                  summary: 'Connection dropped mid-dispatch',
                },
              ].map((entry, i) => (
                <li
                  key={i}
                  data-testid={`cp-support-log-${i}`}
                  className="p-3 border border-gray-200 rounded bg-white text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{entry.type}</span>
                    <span
                      className={`text-xs font-medium ${entry.status === 'Delivered' ? 'text-green-700' : 'text-red-700'}`}
                    >
                      <span aria-hidden="true">●</span> {entry.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {entry.recipient} · {entry.ts}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{entry.summary}</p>
                </li>
              ))}
            </ul>
            <a
              href="/platform/support/escalate"
              data-testid="cp-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — anonymous, freelancer, business-partner, event-organiser */}
        <RoleScopedView.Fallback>
          <div data-testid="cp-fallback-view" className="p-4 text-sm text-gray-400">
            Notifications are delivered to authenticated users. Sign in to see your inbox.
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
