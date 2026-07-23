/**
 * ArbitrationStateMachine — T381 ARBITRATION service for FLOW-25.
 *
 * 8-state FSM orchestrating the BFA arbitration lifecycle.
 * persist-before-emit on EVERY state transition (DNA-8, CF-487, IR-381-1).
 * Invalid transitions return DataProcessResult.failure — never throw (IR-381-2).
 * LOW severity routes to SKIP_ARBITRATION — not PENDING_RESOLUTION.
 *
 * Iron rules (enforced — not configurable):
 *   ⛔ CF-487 / IR-381-1: storeDocument() BEFORE enqueue() on EVERY transition — score 0 on violation
 *   IR-381-2:  Invalid transitions → DataProcessResult.failure — never throw
 *   CF-488:    Timeout scheduled on PENDING_RESOLUTION entry
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-7:     SETNX idempotency on session creation
 *   DNA-8:     storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DependencySeverity } from './dependency-index-query.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── States ─────────────────────────────────────────────────────────────────

export enum ArbitrationState {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  DETECTING = 'DETECTING',
  SEVERITY_AGGREGATING = 'SEVERITY_AGGREGATING',
  PENDING_RESOLUTION = 'PENDING_RESOLUTION',
  SKIP_ARBITRATION = 'SKIP_ARBITRATION',
  APPLYING_RESOLUTION = 'APPLYING_RESOLUTION',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
  ERROR = 'ERROR',
}

// ── Valid transition map (MACHINE code — not configurable) ─────────────────

const VALID_TRANSITIONS: Readonly<Record<ArbitrationState, ArbitrationState[]>> = {
  [ArbitrationState.IDLE]: [ArbitrationState.EXTRACTING, ArbitrationState.ERROR],
  [ArbitrationState.EXTRACTING]: [ArbitrationState.DETECTING, ArbitrationState.ERROR],
  [ArbitrationState.DETECTING]: [ArbitrationState.SEVERITY_AGGREGATING, ArbitrationState.ERROR],
  [ArbitrationState.SEVERITY_AGGREGATING]: [
    ArbitrationState.PENDING_RESOLUTION,
    ArbitrationState.SKIP_ARBITRATION,
    ArbitrationState.ERROR,
  ],
  [ArbitrationState.PENDING_RESOLUTION]: [
    ArbitrationState.APPLYING_RESOLUTION,
    ArbitrationState.ERROR,
  ],
  [ArbitrationState.SKIP_ARBITRATION]: [ArbitrationState.RESOLVED],
  [ArbitrationState.APPLYING_RESOLUTION]: [
    ArbitrationState.RESOLVED,
    ArbitrationState.REJECTED,
    ArbitrationState.ERROR,
  ],
  [ArbitrationState.RESOLVED]: [],
  [ArbitrationState.REJECTED]: [],
  [ArbitrationState.ERROR]: [],
};

/** States from which the FSM cannot transition (terminal). */
const TERMINAL_STATES = new Set<ArbitrationState>([
  ArbitrationState.RESOLVED,
  ArbitrationState.REJECTED,
  ArbitrationState.ERROR,
]);

// ── Shapes ─────────────────────────────────────────────────────────────────

export interface ArbitrationSession {
  readonly sessionId: string;
  readonly changeId: string;
  readonly tenantId: string;
  readonly state: ArbitrationState;
  readonly severity: DependencySeverity;
  readonly history: ArbitrationTransition[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArbitrationTransition {
  readonly fromState: ArbitrationState;
  readonly toState: ArbitrationState;
  readonly triggeredAt: string;
  readonly reason?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSIONS_INDEX = 'bfa-arbitration-sessions';
const TRANSITION_EVENT = 'arbitration.state.transitioned';
const TIMEOUT_EVENT = 'arbitration.timeout.scheduled';
const SKIP_EVENT = 'arbitration.skip';
const DEFAULT_TIMEOUT_MS = 86_400_000; // 24h fallback (FREEDOM config overrides)

/** Severities that bypass arbitration and route to SKIP_ARBITRATION. */
const SKIP_SEVERITIES = new Set<DependencySeverity>([
  DependencySeverity.NONE,
  DependencySeverity.LOW,
]);

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ArbitrationStateMachine extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T381',
        serviceName: 'ArbitrationStateMachine',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Create a new arbitration session (IDLE state).
   * DNA-7: SETNX — if a session for the same changeId already exists, return it.
   */
  async createSession(
    changeId: string,
    tenantId: string,
    severity: DependencySeverity,
  ): Promise<DataProcessResult<ArbitrationSession>> {
    if (!changeId || changeId.trim() === '') {
      return DataProcessResult.failure('MISSING_CHANGE_ID', 'changeId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // DNA-7: SETNX — check if session already exists for this changeId + tenantId
    const existing = await this.dbService.searchDocuments(SESSIONS_INDEX, {
      change_id: changeId,
      tenant_id: tenantId,
    });
    if (existing.isSuccess && existing.data!.length > 0) {
      return DataProcessResult.success(this.toSession(existing.data![0]));
    }

    const sessionId = `arb-${Date.now()}-${changeId.slice(0, 8)}`;
    const now = new Date().toISOString();
    const sessionDoc: Record<string, unknown> = {
      session_id: sessionId,
      change_id: changeId,
      tenant_id: tenantId,
      state: ArbitrationState.IDLE,
      severity,
      history: [],
      created_at: now,
      updated_at: now,
    };

    // ✅ CF-487 / DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(SESSIONS_INDEX, sessionDoc, sessionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to create arbitration session',
      );
    }

    return DataProcessResult.success(this.toSession(stored.data!));
  }

  /**
   * Transition the FSM to the next state.
   *
   * ⛔ CF-487 / IR-381-1: storeDocument() BEFORE enqueue() on EVERY transition — score 0 on violation.
   * IR-381-2: Invalid transition → DataProcessResult.failure — never throw.
   * CF-488: On transition to PENDING_RESOLUTION, schedule timeout via queue.
   */
  async transition(
    sessionId: string,
    tenantId: string,
    toState: ArbitrationState,
    reason?: string,
  ): Promise<DataProcessResult<ArbitrationSession>> {
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // Load current session
    const sessionResult = await this.dbService.searchDocuments(SESSIONS_INDEX, {
      session_id: sessionId,
      tenant_id: tenantId,
    });
    if (!sessionResult.isSuccess || sessionResult.data!.length === 0) {
      return DataProcessResult.failure(
        'SESSION_NOT_FOUND',
        `Arbitration session '${sessionId}' not found`,
      );
    }

    const session = this.toSession(sessionResult.data![0]);

    // IR-381-2: reject terminal state transitions — never throw
    if (TERMINAL_STATES.has(session.state)) {
      return DataProcessResult.failure(
        'TERMINAL_STATE',
        `IR-381-2: Cannot transition from terminal state '${session.state}'`,
      );
    }

    // IR-381-2: validate transition is allowed by the FSM map
    const allowed = VALID_TRANSITIONS[session.state] ?? [];
    if (!allowed.includes(toState)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `IR-381-2: Transition from '${session.state}' to '${toState}' is not allowed. ` +
          `Valid: [${allowed.join(', ')}]`,
      );
    }

    const now = new Date().toISOString();
    const newTransition: ArbitrationTransition = {
      fromState: session.state,
      toState,
      triggeredAt: now,
      reason,
    };

    const updatedHistory = [...session.history, newTransition];
    const updatedDoc: Record<string, unknown> = {
      session_id: sessionId,
      change_id: session.changeId,
      tenant_id: tenantId,
      state: toState,
      severity: session.severity,
      history: updatedHistory,
      created_at: session.createdAt,
      updated_at: now,
    };

    // ⛔ CF-487 / IR-381-1 / DNA-8: storeDocument() BEFORE enqueue() — score 0 on violation
    const stored = await this.dbService.storeDocument(SESSIONS_INDEX, updatedDoc, sessionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to persist state transition',
      );
    }

    // Emit state transition event AFTER successful persist
    await this.queueService.enqueue(TRANSITION_EVENT, {
      session_id: sessionId,
      change_id: session.changeId,
      tenant_id: tenantId,
      from_state: session.state,
      to_state: toState,
      triggered_at: now,
    });

    // CF-488: schedule timeout when entering PENDING_RESOLUTION
    if (toState === ArbitrationState.PENDING_RESOLUTION) {
      await this.scheduleTimeout(sessionId, tenantId, session.changeId);
    }

    // Emit skip event when entering SKIP_ARBITRATION
    if (toState === ArbitrationState.SKIP_ARBITRATION) {
      await this.queueService.enqueue(SKIP_EVENT, {
        session_id: sessionId,
        change_id: session.changeId,
        tenant_id: tenantId,
        severity: session.severity,
        reason: 'LOW severity — auto-skip arbitration',
      });
    }

    return DataProcessResult.success(this.toSession(stored.data!));
  }

  /**
   * Determine the correct next state after SEVERITY_AGGREGATING.
   * LOW/NONE severity → SKIP_ARBITRATION.
   * MEDIUM/HIGH/CRITICAL → PENDING_RESOLUTION.
   * This keeps the routing rule in the service — not left to callers.
   */
  resolvePostAggregationState(severity: DependencySeverity): ArbitrationState {
    return SKIP_SEVERITIES.has(severity)
      ? ArbitrationState.SKIP_ARBITRATION
      : ArbitrationState.PENDING_RESOLUTION;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * CF-488: Schedule delayed timeout event on PENDING_RESOLUTION entry.
   * Timeout duration from FREEDOM config; falls back to DEFAULT_TIMEOUT_MS.
   */
  private async scheduleTimeout(
    sessionId: string,
    tenantId: string,
    changeId: string,
  ): Promise<void> {
    // Read timeout from FREEDOM config (CF-488 — never hardcode the duration)
    const configResult = await this.dbService.searchDocuments('bfa-freedom-config', {
      tenant_id: tenantId,
      config_key: 'arbitration_timeout_ms',
    });

    const timeoutMs =
      configResult.isSuccess && configResult.data!.length > 0
        ? ((configResult.data![0]['config_value'] as number) ?? DEFAULT_TIMEOUT_MS)
        : DEFAULT_TIMEOUT_MS;

    await this.queueService.enqueue(TIMEOUT_EVENT, {
      session_id: sessionId,
      change_id: changeId,
      tenant_id: tenantId,
      timeout_ms: timeoutMs,
      scheduled_at: new Date().toISOString(),
    });
  }

  private toSession(doc: Record<string, unknown>): ArbitrationSession {
    return {
      sessionId: (doc['session_id'] as string) ?? '',
      changeId: (doc['change_id'] as string) ?? '',
      tenantId: (doc['tenant_id'] as string) ?? '',
      state: (doc['state'] as ArbitrationState) ?? ArbitrationState.IDLE,
      severity: (doc['severity'] as DependencySeverity) ?? DependencySeverity.NONE,
      history: (doc['history'] as ArbitrationTransition[]) ?? [],
      createdAt: (doc['created_at'] as string) ?? '',
      updatedAt: (doc['updated_at'] as string) ?? '',
    };
  }
}

export { VALID_TRANSITIONS, TERMINAL_STATES, SKIP_SEVERITIES };
