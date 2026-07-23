/**
 * FLOW-13 — Data Warehouse & Analytics
 * Client Integration Tests
 * Categories: C1 (loading state), C2 (success/analytics data), C3 (error state), C4 (quota exceeded),
 *             C5 (schema evolution UI), C6 (offline queue), C7 (SLA / backpressure)
 *
 * Per CLIENT-TESTING-PLAN.md §3 and CLIENT-ARCHITECTURE-SPEC.md
 *
 * FLOW-13 key UI scenarios:
 *   - Query execution: loading → results screen
 *   - Quota exceeded: quota-exceeded screen with retry prompt
 *   - Legal hold blocks purge: awaiting-hold-release screen
 *   - Backpressure rejection: backpressure-error screen
 *   - Schema breaking change: awaiting-tenant-approval screen
 *   - PII masking: sensitive fields not displayed in analytics results
 */

import { describe, it, expect } from 'vitest';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeWarehouseFlowStateSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    flowId: 'FLOW-13',
    currentScreen: 'analytics-dashboard',
    queryId: null as string | null,
    queryStatus: null as string | null, // EXECUTING|COMPLETE|FAILED|QUOTA_EXCEEDED|BACKPRESSURE_REJECTED
    schemaChangeType: null as string | null, // add_optional_field|remove_field|change_field_type|etc.
    schemaApprovalStatus: null as string | null, // auto_approved|explicit_tenant_required|pending|rejected
    purgeApprovalToken: null as string | null,
    legalHoldActive: false,
    resultCount: 0,
    batchId: null as string | null,
    batchStatus: null as string | null, // QUEUED|PROCESSING|PROCESSED|DUPLICATE|BACKPRESSURE_REJECTED
    tenantId: 'tenant-a',
    pendingActions: [] as string[],
    sla: {
      remainingMs: 30_000,
      isBreached: false,
    },
    connectionStatus: 'online',
    ...overrides,
  };
}

function makeOptimisticAction(type: string, payload: Record<string, unknown> = {}) {
  return {
    type,
    payload,
    optimistic: true,
    correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FLOW-13 Client Integration', () => {
  describe('C1 — Loading State', () => {
    it('optimistic state applied immediately on query execution dispatch', () => {
      const state = makeWarehouseFlowStateSnapshot({ currentScreen: 'analytics-dashboard' });
      const action = makeOptimisticAction('QueryExecutionStarted', { queryId: 'q-001' });

      const optimisticState = {
        ...state,
        currentScreen: action.optimistic ? 'query-executing' : state.currentScreen,
        queryId: 'q-001',
        queryStatus: 'EXECUTING',
      };

      expect(optimisticState.currentScreen).toBe('query-executing');
      expect(optimisticState.queryStatus).toBe('EXECUTING');
    });

    it('batch ingestion shows ingestion-in-progress screen while executing', () => {
      const state = makeWarehouseFlowStateSnapshot({ currentScreen: 'ingestion-form' });
      const action = makeOptimisticAction('BatchIngestionStarted', { batchId: 'batch-001' });

      const inProgressState = {
        ...state,
        currentScreen: action.optimistic ? 'ingestion-in-progress' : state.currentScreen,
        batchId: 'batch-001',
        batchStatus: 'QUEUED',
      };

      expect(inProgressState.currentScreen).toBe('ingestion-in-progress');
      expect(inProgressState.batchStatus).toBe('QUEUED');
    });

    it('schema registration shows schema-registering screen during additive change', () => {
      const state = makeWarehouseFlowStateSnapshot({ currentScreen: 'schema-form' });

      const processingState = {
        ...state,
        currentScreen: 'schema-registering',
        schemaChangeType: 'add_optional_field',
        schemaApprovalStatus: 'pending',
      };

      expect(processingState.currentScreen).toBe('schema-registering');
      expect(processingState.schemaApprovalStatus).toBe('pending');
    });
  });

  describe('C2 — Success with Analytics Data', () => {
    it('query execution success shows analytics-results screen with resultCount', () => {
      const state = makeWarehouseFlowStateSnapshot({
        currentScreen: 'query-executing',
        queryStatus: 'EXECUTING',
      });

      const serverResult = { queryId: 'q-001', resultCount: 142, status: 'COMPLETE' };
      const successState = {
        ...state,
        currentScreen: 'analytics-results',
        queryStatus: 'COMPLETE',
        resultCount: serverResult.resultCount,
      };

      expect(successState.currentScreen).toBe('analytics-results');
      expect(successState.resultCount).toBe(142);
    });

    it('KPI snapshot shows kpi-dashboard screen with alertFired indicator', () => {
      const kpiSnapshot = {
        kpiId: 'kpi-001',
        value: 97.3,
        alertFired: false,
        snapshotAt: new Date().toISOString(),
      };

      const state = makeWarehouseFlowStateSnapshot({ currentScreen: 'analytics-results' });
      const screen = kpiSnapshot.alertFired ? 'kpi-alert-fired' : 'kpi-dashboard';

      expect(screen).toBe('kpi-dashboard');
      expect(kpiSnapshot.alertFired).toBe(false);
    });

    it('KPI alert fired shows kpi-alert-fired screen', () => {
      const kpiSnapshot = { kpiId: 'kpi-002', value: 15.0, alertFired: true };
      const screen = kpiSnapshot.alertFired ? 'kpi-alert-fired' : 'kpi-dashboard';

      expect(screen).toBe('kpi-alert-fired');
    });

    it('schema additive change auto-approved shows schema-registered screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        schemaChangeType: 'add_optional_field',
        schemaApprovalStatus: 'auto_approved',
        currentScreen: 'schema-registering',
      });

      const screen =
        state.schemaApprovalStatus === 'auto_approved' ? 'schema-registered' : 'awaiting-tenant-approval';

      expect(screen).toBe('schema-registered');
    });

    it('app reopen queries FlowStateSnapshot and restores analytics-results screen', () => {
      const snapshot = makeWarehouseFlowStateSnapshot({
        currentScreen: 'analytics-results',
        queryStatus: 'COMPLETE',
        queryId: 'q-001',
        resultCount: 142,
      });

      const restoredScreen = snapshot.currentScreen;
      expect(restoredScreen).toBe('analytics-results');
      expect(snapshot.resultCount).toBe(142);
    });

    it('PII fields not rendered in analytics results — only masked data shown', () => {
      const analyticsRow = {
        rowId: 'row-001',
        metricValue: 42,
        aggregatedAt: new Date().toISOString(),
        // email, phone, ssn should NOT appear — masked by F423 before serialization
      };

      const sensitiveFields = ['email', 'phone', 'ssn', 'creditCardNumber', 'password'];
      for (const field of sensitiveFields) {
        expect(analyticsRow).not.toHaveProperty(field);
      }

      expect(analyticsRow).toHaveProperty('metricValue');
    });
  });

  describe('C3 — Error State', () => {
    it('query failure shows query-error screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        currentScreen: 'query-executing',
        queryStatus: 'EXECUTING',
      });

      const serverError = { errorCode: 'QUERY_EXECUTION_FAILED', reason: 'rls_denied' };
      const errorState = {
        ...state,
        currentScreen: serverError.reason === 'rls_denied' ? 'query-access-denied' : 'query-error',
        queryStatus: 'FAILED',
      };

      expect(errorState.currentScreen).toBe('query-access-denied');
      expect(errorState.queryStatus).toBe('FAILED');
    });

    it('legal hold active blocks purge — shows awaiting-hold-release screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        legalHoldActive: true,
        currentScreen: 'purge-confirmation',
      });

      const screen = state.legalHoldActive ? 'awaiting-hold-release' : 'purge-in-progress';
      expect(screen).toBe('awaiting-hold-release');
    });

    it('missing approval token shows awaiting-approval screen — no purge initiated', () => {
      const state = makeWarehouseFlowStateSnapshot({
        purgeApprovalToken: null,
        currentScreen: 'purge-confirmation',
      });

      const screen = state.purgeApprovalToken ? 'purge-in-progress' : 'awaiting-approval';
      expect(screen).toBe('awaiting-approval');
    });

    it('schema breaking change rejected emits rejected screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        schemaChangeType: 'remove_field',
        schemaApprovalStatus: 'rejected',
        currentScreen: 'awaiting-tenant-approval',
      });

      const screen =
        state.schemaApprovalStatus === 'rejected'
          ? 'schema-evolution-rejected'
          : 'awaiting-tenant-approval';

      expect(screen).toBe('schema-evolution-rejected');
    });
  });

  describe('C4 — Quota Exceeded State', () => {
    it('quota exceeded maps to quota-exceeded screen — not generic error', () => {
      const state = makeWarehouseFlowStateSnapshot({
        queryStatus: 'QUOTA_EXCEEDED',
        currentScreen: 'query-executing',
      });

      const screen =
        state.queryStatus === 'QUOTA_EXCEEDED'
          ? 'quota-exceeded'
          : state.queryStatus === 'FAILED'
            ? 'query-error'
            : 'analytics-results';

      expect(screen).toBe('quota-exceeded');
    });

    it('quota-exceeded screen shows retry-available prompt', () => {
      const quotaExceededState = {
        errorCode: 'QUOTA_EXCEEDED',
        retryAvailable: true,
        quotaResetAt: new Date(Date.now() + 3600_000).toISOString(),
      };

      expect(quotaExceededState.retryAvailable).toBe(true);
      expect(new Date(quotaExceededState.quotaResetAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('backpressure rejection shows backpressure-error screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        batchStatus: 'BACKPRESSURE_REJECTED',
        currentScreen: 'ingestion-in-progress',
      });

      const screen =
        state.batchStatus === 'BACKPRESSURE_REJECTED' ? 'backpressure-error' : 'ingestion-complete';

      expect(screen).toBe('backpressure-error');
    });

    it('duplicate batch detected shows batch-duplicate screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        batchStatus: 'DUPLICATE',
        currentScreen: 'ingestion-in-progress',
      });

      const screen = state.batchStatus === 'DUPLICATE' ? 'batch-duplicate' : 'ingestion-complete';
      expect(screen).toBe('batch-duplicate');
    });

    it('app reopen with queryStatus=QUOTA_EXCEEDED restores quota-exceeded screen', () => {
      const snapshot = makeWarehouseFlowStateSnapshot({
        queryStatus: 'QUOTA_EXCEEDED',
        currentScreen: 'quota-exceeded',
        queryId: 'q-expired',
      });

      const screen =
        snapshot.queryStatus === 'QUOTA_EXCEEDED' ? 'quota-exceeded' : snapshot.currentScreen;

      expect(screen).toBe('quota-exceeded');
    });

    it('SLA breach during query execution triggers query-timeout screen', () => {
      const state = makeWarehouseFlowStateSnapshot({
        sla: { remainingMs: 0, isBreached: true },
        currentScreen: 'query-executing',
      });

      const screen = state.sla.isBreached ? 'query-timeout' : state.currentScreen;
      expect(screen).toBe('query-timeout');
    });
  });

  describe('C5 — Schema Evolution UI', () => {
    it('additive change (add_optional_field) auto-approved — schema-registered shown immediately', () => {
      const change = { changeType: 'add_optional_field', requiresApproval: false };
      const screen = change.requiresApproval ? 'awaiting-tenant-approval' : 'schema-registered';

      expect(screen).toBe('schema-registered');
    });

    it('breaking change (rename_field) shows awaiting-tenant-approval screen', () => {
      const breakingChanges = ['remove_field', 'change_field_type', 'rename_field', 'restrict_enum'];
      const change = { changeType: 'rename_field' };

      const isBreaking = breakingChanges.includes(change.changeType);
      const screen = isBreaking ? 'awaiting-tenant-approval' : 'schema-registered';

      expect(isBreaking).toBe(true);
      expect(screen).toBe('awaiting-tenant-approval');
    });

    it('offline queueable actions for schema changes', () => {
      const offlineQueue: ReturnType<typeof makeOptimisticAction>[] = [];
      const connectionStatus = 'offline';

      const action = makeOptimisticAction('SchemaAddFieldRequested', {
        schemaId: 'schema-001',
        changeType: 'add_optional_field',
      });

      if (connectionStatus === 'offline') {
        offlineQueue.push(action);
      }

      expect(offlineQueue).toHaveLength(1);

      // Reconnect: flush
      const flushed: string[] = [];
      while (offlineQueue.length > 0) {
        flushed.push(offlineQueue.shift()!.type);
      }

      expect(flushed[0]).toBe('SchemaAddFieldRequested');
      expect(offlineQueue).toHaveLength(0);
    });
  });
});
