/**
 * ICalendarSyncConnectorFactory (F1018 — DD-225) tests
 * GAP-M9 acceptance: 7 tests
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { calendar_fabric_connectors_only } from '../../../engine-contracts/checks/ai-safety-moderation-checks';
import type {
  ICalendarSyncConnectorFactory,
  ICalendarConnector,
} from '../calendar-sync-connector.interface';

/** Mock connector factory for testing. */
function createMockCalendarSyncConnectorFactory(
  connectors: Record<string, ICalendarConnector>,
): ICalendarSyncConnectorFactory {
  return {
    async createAsync(connectorType: string) {
      const connector = connectors[connectorType];
      if (!connector) {
        return DataProcessResult.failure(
          'CONNECTOR_UNAVAILABLE',
          `Connector '${connectorType}' not available in this deployment`,
        );
      }
      return DataProcessResult.success(connector);
    },
    async listAvailableConnectors() {
      return Object.keys(connectors);
    },
  };
}

describe('ICalendarSyncConnectorFactory (F1018 — DD-225)', () => {
  let factory: ICalendarSyncConnectorFactory;
  let mockGoogleConnector: ICalendarConnector;

  beforeEach(() => {
    mockGoogleConnector = {
      sync: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          eventsSynced: 3,
          eventsCreated: 1,
          eventsUpdated: 2,
          eventsDeleted: 0,
          conflicts: [],
          syncJobId: 'job-123',
          syncedAt: '2026-03-30T10:00:00Z',
        }),
      ),
      healthCheck: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          connected: true,
          providerName: 'Google Calendar',
        }),
      ),
    };
    factory = createMockCalendarSyncConnectorFactory({ GOOGLE: mockGoogleConnector });
  });

  it('resolves GOOGLE connector type', async () => {
    const result = await factory.createAsync('GOOGLE');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('returns CONNECTOR_UNAVAILABLE for unknown connector type', async () => {
    const result = await factory.createAsync('UNKNOWN_PROVIDER');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONNECTOR_UNAVAILABLE');
  });

  it('syncs events in PUSH direction', async () => {
    const connectorResult = await factory.createAsync('GOOGLE');
    const syncResult = await connectorResult.data!.sync({
      direction: 'PUSH',
      calendarEvents: [{ id: 'event-1', title: 'Math lesson' }],
      studentId: 'student-123',
      syncJobId: 'job-abc',
    });
    expect(syncResult.isSuccess).toBe(true);
    expect(syncResult.data?.eventsSynced).toBeGreaterThan(0);
  });

  it('syncs events in PULL direction', async () => {
    const connectorResult = await factory.createAsync('GOOGLE');
    const syncResult = await connectorResult.data!.sync({
      direction: 'PULL',
      calendarEvents: [],
      studentId: 'student-123',
      syncJobId: 'job-abc',
    });
    expect(syncResult.isSuccess).toBe(true);
  });

  it('connector healthCheck returns provider name', async () => {
    const connectorResult = await factory.createAsync('GOOGLE');
    const health = await connectorResult.data!.healthCheck();
    expect(health.data?.providerName).toBe('Google Calendar');
    expect(health.data?.connected).toBe(true);
  });

  it('named check detects direct googleapis import', () => {
    expect(() =>
      calendar_fabric_connectors_only('calendar-sync-connector.service.ts', [
        'googleapis',
        '@nestjs/common',
      ]),
    ).toThrow('DD-225');
  });

  it('named check passes for clean T373 service imports', () => {
    expect(() =>
      calendar_fabric_connectors_only('calendar-sync-connector.service.ts', [
        '@nestjs/common',
        '../../fabrics/interfaces/calendar-sync-connector.interface',
      ]),
    ).not.toThrow();
  });
});
