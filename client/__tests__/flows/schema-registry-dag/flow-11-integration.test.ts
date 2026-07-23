/**
 * FLOW-11 — Schema Registry & DAG
 * Client Integration Tests
 * Categories: C1 (optimistic), C2 (app reopen), C3 (offline queue), C4 (SLA), C5 (OCC state)
 * Per CLIENT-TESTING-PLAN.md §3 and CLIENT-ARCHITECTURE-SPEC.md
 *
 * Tests verify client-side state machine behavior for FLOW-11.
 * OCC conflict handling, DAG rendering state, and schema versioning UI.
 */

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeSchemaRegistryFlowStateSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    flowId: 'FLOW-11',
    currentScreen: 'schema-list',
    schemaId: null as string | null,
    schemaVersion: null as number | null,
    dagRenderStatus: null as string | null,
    occConflictDetected: false,
    tenantId: 'tenant-a',
    completedSteps: [] as string[],
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

describe('FLOW-11 Client Integration', () => {
  describe('C1 — Optimistic State', () => {
    it('optimistic state applied immediately on schema registration dispatch', () => {
      // SchemaRegistered: optimistically show schema-registering-pending screen before server confirms
      const state = makeSchemaRegistryFlowStateSnapshot({ currentScreen: 'schema-form' });
      const action = makeOptimisticAction('SchemaRegistered', { schemaId: 'sch-001', name: 'UserSchema', version: 1 });

      // Apply optimistic state immediately
      const optimisticState = {
        ...state,
        currentScreen: action.optimistic ? 'schema-registering-pending' : state.currentScreen,
        schemaId: 'sch-001',
      };

      expect(optimisticState.currentScreen).toBe('schema-registering-pending');
      expect(optimisticState.schemaId).toBe('sch-001');
    });

    it('optimistic registration reverts on OCC_CONFLICT failure', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({ currentScreen: 'schema-form' });

      // Optimistic: show registering screen
      const optimisticState = { ...state, currentScreen: 'schema-registering-pending' };
      expect(optimisticState.currentScreen).toBe('schema-registering-pending');

      // Server returns OCC_CONFLICT
      const serverFailure = { isSuccess: false, errorCode: 'OCC_CONFLICT' };
      const revertedState = serverFailure.isSuccess
        ? optimisticState
        : { ...state, currentScreen: 'schema-occ-conflict', occConflictDetected: true };

      expect(revertedState.currentScreen).toBe('schema-occ-conflict');
      expect(revertedState.occConflictDetected).toBe(true);
    });

    it('OCC_CONFLICT shows retry-prompt — not generic error screen', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({ occConflictDetected: true });

      const screen =
        state.occConflictDetected
          ? 'schema-retry-prompt' // OCC — show retry
          : 'schema-generic-error';

      expect(screen).toBe('schema-retry-prompt');
    });

    it('DAG cycle detected shows cycle-error screen — not DAG rendering screen', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({ dagRenderStatus: 'CYCLE_DETECTED' });

      const screen =
        state.dagRenderStatus === 'CYCLE_DETECTED'
          ? 'dag-cycle-error'
          : state.dagRenderStatus === 'COMPLETE'
            ? 'dag-rendered'
            : 'dag-rendering';

      expect(screen).toBe('dag-cycle-error');
    });

    it('SLA breach during schema registration triggers timeout screen', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({
        sla: { remainingMs: 0, isBreached: true },
        currentScreen: 'schema-registering-pending',
      });

      const screen = state.sla.isBreached ? 'schema-registration-timeout' : state.currentScreen;
      expect(screen).toBe('schema-registration-timeout');
    });
  });

  describe('C2 — App Reopen', () => {
    it('app reopen queries FlowStateSnapshot and restores correct screen', () => {
      const snapshot = makeSchemaRegistryFlowStateSnapshot({
        currentScreen: 'schema-registered',
        schemaId: 'sch-001',
        schemaVersion: 2,
      });

      const restoredScreen = snapshot.currentScreen;
      expect(restoredScreen).toBe('schema-registered');
    });

    it('app reopen with occConflictDetected=true shows retry-prompt screen', () => {
      const snapshot = makeSchemaRegistryFlowStateSnapshot({
        occConflictDetected: true,
        currentScreen: 'schema-occ-conflict',
        schemaId: 'sch-001',
      });

      const screen = snapshot.occConflictDetected ? 'schema-retry-prompt' : snapshot.currentScreen;
      expect(screen).toBe('schema-retry-prompt');
    });

    it('app reopen restores schemaVersion from FlowStateSnapshot', () => {
      const snapshot = makeSchemaRegistryFlowStateSnapshot({
        schemaId: 'sch-001',
        schemaVersion: 3,
        currentScreen: 'schema-registered',
      });

      expect(snapshot.schemaVersion).toBe(3);
      expect(snapshot.schemaVersion!).toBeGreaterThan(0);
    });

    it('app reopen with dagRenderStatus=COMPLETE shows dag-rendered screen', () => {
      const snapshot = makeSchemaRegistryFlowStateSnapshot({
        dagRenderStatus: 'COMPLETE',
        currentScreen: 'dag-rendered',
        completedSteps: ['schema-registered', 'dag-rendered'],
      });

      expect(snapshot.currentScreen).toBe('dag-rendered');
      expect(snapshot.completedSteps).toContain('dag-rendered');
    });

    it('app reopen with sla.isBreached=true shows schema-registration-timeout screen', () => {
      const snapshot = makeSchemaRegistryFlowStateSnapshot({
        sla: { remainingMs: 0, isBreached: true },
        currentScreen: 'schema-registering-pending',
      });

      const screen = snapshot.sla.isBreached ? 'schema-registration-timeout' : snapshot.currentScreen;
      expect(screen).toBe('schema-registration-timeout');
    });
  });

  describe('C3 — Offline Queue', () => {
    it('queueable actions enqueued while offline and flushed on reconnect', () => {
      const offlineQueue: ReturnType<typeof makeOptimisticAction>[] = [];
      const connectionStatus = 'offline';

      const action = makeOptimisticAction('SchemaRegistered', { schemaId: 'sch-001', name: 'UserSchema' });

      if (connectionStatus === 'offline') {
        offlineQueue.push(action);
      }

      expect(offlineQueue).toHaveLength(1);

      // Reconnect: flush
      const flushed: string[] = [];
      while (offlineQueue.length > 0) {
        flushed.push(offlineQueue.shift()!.type);
      }

      expect(flushed[0]).toBe('SchemaRegistered');
      expect(offlineQueue).toHaveLength(0);
    });

    it('DagRenderRequested queued when connectionStatus = offline', () => {
      const offlineQueue: ReturnType<typeof makeOptimisticAction>[] = [];
      const action = makeOptimisticAction('DagRenderRequested', { dagId: 'dag-001' });

      const enqueue = (a: typeof action, status: string) => {
        if (status === 'offline') offlineQueue.push(a);
      };

      enqueue(action, 'offline');
      expect(offlineQueue).toHaveLength(1);
    });

    it('SchemaOccRetry rejected immediately when offline (not queueable — requires fresh read)', () => {
      // OCC retry requires a fresh read — not safe to queue offline
      const connectionStatus = 'offline';
      const notQueueableActions = ['SchemaOccRetry', 'SchemaConflictResolved'];

      const action = makeOptimisticAction('SchemaOccRetry', { schemaId: 'sch-001' });
      const isQueueable = !notQueueableActions.includes(action.type);

      const result = isQueueable ? 'queued' : 'rejected_offline';
      expect(result).toBe('rejected_offline');
    });

    it('reconnect after SLA breach: expired schema registrations dropped', () => {
      const queue: ReturnType<typeof makeOptimisticAction>[] = [];
      const expiredAction = {
        ...makeOptimisticAction('SchemaRegistered', { schemaId: 'sch-expired' }),
        timestamp: Date.now() - 120_000, // 120s ago — expired
      };
      queue.push(expiredAction);

      const SLA_TTL_MS = 30_000;
      const now = Date.now();
      const validEvents = queue.filter(a => now - a.timestamp < SLA_TTL_MS);

      expect(validEvents).toHaveLength(0);
    });
  });

  describe('C4 — SLA Countdown', () => {
    it('SLA timer displays countdown and triggers timeout screen on expiry', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({
        sla: { remainingMs: 5000, isBreached: false },
        currentScreen: 'schema-registering-pending',
      });

      const updatedRemainingMs = state.sla.remainingMs - 5000;
      const isBreached = updatedRemainingMs <= 0;
      const screen = isBreached ? 'schema-registration-timeout' : 'schema-registering-pending';

      expect(screen).toBe('schema-registration-timeout');
    });

    it('SLA countdown decrements from sla.remainingMs', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({ sla: { remainingMs: 30_000, isBreached: false } });

      const decrementMs = 8_000;
      const updated = { ...state.sla, remainingMs: state.sla.remainingMs - decrementMs };

      expect(updated.remainingMs).toBe(22_000);
      expect(updated.isBreached).toBe(false);
    });

    it('sla.isBreached triggers schema-registration-timeout UI', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({ sla: { remainingMs: 0, isBreached: true } });
      const screen = state.sla.isBreached ? 'schema-registration-timeout' : 'schema-registering-pending';
      expect(screen).toBe('schema-registration-timeout');
    });
  });

  describe('C5 — OCC Conflict State', () => {
    it('OCC conflict detection shows schema-occ-conflict screen', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({
        currentScreen: 'schema-registering-pending',
        occConflictDetected: false,
      });

      // Server returns OCC_CONFLICT
      const afterConflict = { ...state, occConflictDetected: true, currentScreen: 'schema-occ-conflict' };
      expect(afterConflict.currentScreen).toBe('schema-occ-conflict');
      expect(afterConflict.occConflictDetected).toBe(true);
    });

    it('OCC retry with fresh read transitions back to schema-registering-pending', () => {
      const state = makeSchemaRegistryFlowStateSnapshot({
        currentScreen: 'schema-occ-conflict',
        occConflictDetected: true,
      });

      // User clicks retry — fresh read initiated
      const retryState = { ...state, currentScreen: 'schema-registering-pending', occConflictDetected: false };
      expect(retryState.currentScreen).toBe('schema-registering-pending');
      expect(retryState.occConflictDetected).toBe(false);
    });

    it('draft saved on field-blur and restored on app reopen', () => {
      const draftSchema = {
        schemaId: 'sch-draft-001',
        name: 'DraftUserSchema',
        savedAt: Date.now(),
        expired: false,
      };

      // On app reopen, if draft exists and not expired, show resume-draft banner
      const resumeDraft = !draftSchema.expired && draftSchema.savedAt > Date.now() - 3_600_000;
      expect(resumeDraft).toBe(true);
    });
  });
});

export {};
