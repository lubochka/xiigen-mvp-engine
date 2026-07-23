/**
 * FLOW-40 — Client Push SSE UI Tests.
 *
 * 24 tests in 4 groups:
 *   CP-1..CP-6:   SseConnectionStatusBadge — status variants + data attributes + aria
 *   CP-7..CP-12:  EventDeliveryTag — CF-797 event display + status variants
 *   CP-13..CP-18: KeepaliveStatusRow — pinged + cleaned counts + aria labels
 *   CP-19..CP-24: ClientPushScreen — connections list + events list + empty states
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SseConnectionStatusBadge } from '../../src/components/client-push/SseConnectionStatusBadge';
import { EventDeliveryTag } from '../../src/components/client-push/EventDeliveryTag';
import { KeepaliveStatusRow } from '../../src/components/client-push/KeepaliveStatusRow';
import { ClientPushScreen } from '../../src/components/client-push/ClientPushScreen';

// ── Test fixtures ─────────────────────────────────────────────────────────────

const connConnected = { correlationId: 'CORR-001', status: 'CONNECTED' as const };
const connExpired   = { correlationId: 'CORR-002', status: 'EXPIRED'   as const };
const connFailed    = { correlationId: 'CORR-003', status: 'FAILED'    as const };

const evtDelivered = { eventId: 'EVT-001', eventType: 'xiigen.user-registration.email.verified', status: 'DELIVERED' as const };
const evtDiscarded = { eventId: 'EVT-002', eventType: 'xiigen.onboarding.step.completed',        status: 'DISCARDED' as const };
const evtFailed    = { eventId: 'EVT-003', eventType: 'xiigen.user-registration.verification.expired', status: 'FAILED' as const };

// ── SseConnectionStatusBadge ──────────────────────────────────────────────────

describe('CP-1..CP-6: SseConnectionStatusBadge', () => {

  it('CP-1: CONNECTED renders "Connected" label', () => {
    render(<SseConnectionStatusBadge {...connConnected} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('CP-2: EXPIRED renders "Expired" label', () => {
    render(<SseConnectionStatusBadge {...connExpired} />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('CP-3: FAILED renders "Failed" label', () => {
    render(<SseConnectionStatusBadge {...connFailed} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('CP-4: data-testid contains correlationId', () => {
    render(<SseConnectionStatusBadge {...connConnected} />);
    expect(screen.getByTestId('sse-status-CORR-001')).toBeInTheDocument();
  });

  it('CP-5: data-status attribute matches status', () => {
    render(<SseConnectionStatusBadge {...connExpired} />);
    expect(screen.getByTestId('sse-status-CORR-002')).toHaveAttribute('data-status', 'EXPIRED');
  });

  it('CP-6: CSS class includes status variant', () => {
    render(<SseConnectionStatusBadge {...connFailed} />);
    expect(screen.getByTestId('sse-status-CORR-003').className).toContain('sse-connection-badge--failed');
  });

});

// ── EventDeliveryTag ──────────────────────────────────────────────────────────

describe('CP-7..CP-12: EventDeliveryTag', () => {

  it('CP-7: DELIVERED renders "Delivered" label', () => {
    render(<EventDeliveryTag {...evtDelivered} />);
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('CP-8: DISCARDED renders "Discarded" label (no-retry-on-missing)', () => {
    render(<EventDeliveryTag {...evtDiscarded} />);
    expect(screen.getByText('Discarded')).toBeInTheDocument();
  });

  it('CP-9: data-testid contains eventId', () => {
    render(<EventDeliveryTag {...evtDelivered} />);
    expect(screen.getByTestId('event-delivery-EVT-001')).toBeInTheDocument();
  });

  it('CP-10: data-event-type attribute shows CF-797 domain event', () => {
    render(<EventDeliveryTag {...evtDelivered} />);
    expect(screen.getByTestId('event-delivery-EVT-001'))
      .toHaveAttribute('data-event-type', 'xiigen.user-registration.email.verified');
  });

  it('CP-11: data-status attribute matches status', () => {
    render(<EventDeliveryTag {...evtFailed} />);
    expect(screen.getByTestId('event-delivery-EVT-003')).toHaveAttribute('data-status', 'FAILED');
  });

  it('CP-12: aria-label includes eventId', () => {
    render(<EventDeliveryTag {...evtDelivered} />);
    expect(screen.getByTestId('event-delivery-EVT-001'))
      .toHaveAttribute('aria-label', expect.stringContaining('EVT-001'));
  });

});

// ── KeepaliveStatusRow ────────────────────────────────────────────────────────

describe('CP-13..CP-18: KeepaliveStatusRow', () => {

  it('CP-13: renders tenantId', () => {
    render(<KeepaliveStatusRow tenantId="tenant-alpha" pinged={5} cleaned={2} />);
    expect(screen.getByTestId('keepalive-tenant-tenant-alpha')).toHaveTextContent('tenant-alpha');
  });

  it('CP-14: renders pinged count', () => {
    render(<KeepaliveStatusRow tenantId="tenant-alpha" pinged={5} cleaned={2} />);
    expect(screen.getByTestId('keepalive-pinged-tenant-alpha')).toHaveTextContent('5');
  });

  it('CP-15: renders cleaned count', () => {
    render(<KeepaliveStatusRow tenantId="tenant-alpha" pinged={5} cleaned={2} />);
    expect(screen.getByTestId('keepalive-cleaned-tenant-alpha')).toHaveTextContent('2');
  });

  it('CP-16: zero pinged and cleaned rendered (not an error)', () => {
    render(<KeepaliveStatusRow tenantId="tenant-beta" pinged={0} cleaned={0} />);
    expect(screen.getByTestId('keepalive-pinged-tenant-beta')).toHaveTextContent('0');
    expect(screen.getByTestId('keepalive-cleaned-tenant-beta')).toHaveTextContent('0');
  });

  it('CP-17: aria-label on pinged includes count', () => {
    render(<KeepaliveStatusRow tenantId="tenant-gamma" pinged={3} cleaned={1} />);
    expect(screen.getByTestId('keepalive-pinged-tenant-gamma'))
      .toHaveAttribute('aria-label', expect.stringContaining('3'));
  });

  it('CP-18: data-testid for row contains tenantId', () => {
    render(<KeepaliveStatusRow tenantId="tenant-delta" pinged={0} cleaned={0} />);
    expect(screen.getByTestId('keepalive-row-tenant-delta')).toBeInTheDocument();
  });

});

// ── ClientPushScreen ──────────────────────────────────────────────────────────

describe('CP-19..CP-24: ClientPushScreen', () => {

  it('CP-19: renders connections list when non-empty', () => {
    render(
      <ClientPushScreen
        connections={[connConnected, connExpired]}
        eventDeliveries={[]}
      />
    );
    expect(screen.getByTestId('connections-list')).toBeInTheDocument();
    expect(screen.getByTestId('connection-item-CORR-001')).toBeInTheDocument();
    expect(screen.getByTestId('connection-item-CORR-002')).toBeInTheDocument();
  });

  it('CP-20: renders empty state for connections when empty', () => {
    render(<ClientPushScreen connections={[]} eventDeliveries={[]} />);
    expect(screen.getByTestId('connections-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('connections-list')).not.toBeInTheDocument();
  });

  it('CP-21: renders events list when non-empty', () => {
    render(
      <ClientPushScreen
        connections={[]}
        eventDeliveries={[evtDelivered, evtDiscarded]}
      />
    );
    expect(screen.getByTestId('events-list')).toBeInTheDocument();
    expect(screen.getByTestId('event-item-EVT-001')).toBeInTheDocument();
    expect(screen.getByTestId('event-item-EVT-002')).toBeInTheDocument();
  });

  it('CP-22: renders empty state for events when empty', () => {
    render(<ClientPushScreen connections={[]} eventDeliveries={[]} />);
    expect(screen.getByTestId('events-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('events-list')).not.toBeInTheDocument();
  });

  it('CP-23: full integration — all 3 connection statuses shown', () => {
    render(
      <ClientPushScreen
        connections={[connConnected, connExpired, connFailed]}
        eventDeliveries={[]}
      />
    );
    expect(screen.getByTestId('sse-status-CORR-001')).toHaveTextContent('Connected');
    expect(screen.getByTestId('sse-status-CORR-002')).toHaveTextContent('Expired');
    expect(screen.getByTestId('sse-status-CORR-003')).toHaveTextContent('Failed');
  });

  it('CP-24: full integration — event list shows CF-797 domain events', () => {
    render(
      <ClientPushScreen
        connections={[]}
        eventDeliveries={[evtDelivered, evtDiscarded, evtFailed]}
      />
    );
    expect(screen.getByTestId('event-delivery-EVT-001')).toHaveTextContent('Delivered');
    expect(screen.getByTestId('event-delivery-EVT-002')).toHaveTextContent('Discarded');
    expect(screen.getByTestId('event-delivery-EVT-003')).toHaveTextContent('Failed');
  });

});
