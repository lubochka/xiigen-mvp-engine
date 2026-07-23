/**
 * ICalendarSyncConnectorFactory (F1018) — CORE FABRIC
 *
 * DD-225: All calendar sync operations in T373 go through this factory.
 * The factory resolves the appropriate connector implementation at runtime.
 *
 * Rule 1 (Fabric First): Service code NEVER imports a provider SDK.
 * Supported connector types (configured via FREEDOM config):
 * - 'GOOGLE'  → Google Calendar API (v3)
 * - 'OUTLOOK' → Microsoft Graph Calendar
 * - 'ICAL'    → CalDAV/iCal protocol
 * - 'APPLE'   → Apple Calendar (CalDAV)
 *
 * To add a new calendar provider: implement ICalendarConnector and
 * register it in the factory registry. T373 code DOES NOT CHANGE.
 *
 * Rule 4: All methods return DataProcessResult<T>.
 * Rule 6: No tenantId parameter — read from AsyncLocalStorage.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

/**
 * A single calendar sync conflict detected during synchronization.
 */
export interface CalendarSyncConflict {
  readonly eventId: string;
  readonly conflictType: 'DUPLICATE' | 'UPDATE_CONFLICT' | 'TIME_CONFLICT' | 'DELETE_CONFLICT';
  readonly xiigenVersion: Record<string, unknown>; // XIIGen's version of the event
  readonly externalVersion: Record<string, unknown>; // External calendar's version
  readonly resolution: 'XIIGEN_WINS' | 'EXTERNAL_WINS' | 'PENDING_REVIEW' | 'UNRESOLVED';
}

/**
 * Result of a calendar sync operation.
 */
export interface CalendarSyncResult {
  readonly eventsSynced: number;
  readonly eventsCreated: number;
  readonly eventsUpdated: number;
  readonly eventsDeleted: number;
  readonly conflicts: CalendarSyncConflict[];
  readonly syncJobId: string;
  readonly syncedAt: string; // ISO-8601 UTC
}

/**
 * A resolved calendar connector for a specific external provider.
 * The connector type (Google, Outlook, iCal, etc.) is hidden behind this interface.
 *
 * DD-225: Service code never knows or cares which provider is behind this connector.
 */
export interface ICalendarConnector {
  /**
   * Synchronizes learning calendar events with the external provider.
   *
   * Direction:
   * - PUSH: XIIGen events pushed to external calendar
   * - PULL: External calendar events pulled into XIIGen
   * - BIDIRECTIONAL: Both directions with conflict resolution
   */
  sync(params: {
    direction: 'PUSH' | 'PULL' | 'BIDIRECTIONAL';
    calendarEvents: Record<string, unknown>[];
    studentId: string;
    syncJobId: string;
    conflictStrategy?: 'XIIGEN_WINS' | 'EXTERNAL_WINS' | 'MANUAL_REVIEW';
  }): Promise<DataProcessResult<CalendarSyncResult>>;

  /**
   * Verifies that the connector credentials are valid and the provider is reachable.
   * Used for health checks and debugging.
   */
  healthCheck(): Promise<DataProcessResult<{ connected: boolean; providerName: string }>>;
}

export interface ICalendarSyncConnectorFactory {
  /**
   * Resolves and creates a calendar connector for the specified type.
   *
   * @param connectorType - Provider type string from FREEDOM config
   * @returns ICalendarConnector if provider is configured and available
   * @returns failure('CONNECTOR_UNAVAILABLE') if provider not available in this deployment
   */
  createAsync(connectorType: string): Promise<DataProcessResult<ICalendarConnector>>;

  /**
   * Returns the list of connector types available in this deployment.
   */
  listAvailableConnectors(): Promise<string[]>;
}

export const CALENDAR_SYNC_CONNECTOR_FACTORY = Symbol('CALENDAR_SYNC_CONNECTOR_FACTORY');
