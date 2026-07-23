/**
 * IGateStore — consent gate topology for FLOW-24 (CF-461).
 *
 * T367 writes gate entries; T368-T374 read them.
 * FAIL-CLOSED: missing entry = DENIED (not open).
 */

export interface GateEntry {
  status: 'GRANTED' | 'DENIED' | 'PENDING' | 'WITHDRAWN';
  evaluatedAt: string; // ISO-8601 UTC
  enrollmentId?: string; // Present when status=GRANTED
  reason?: string; // Optional context for DENIED/WITHDRAWN
}

export interface IGateStore {
  /**
   * Set a gate entry. Used by T367 to record consent decision.
   * Gate key format: '{GATE_NAME}:{studentId}'
   * e.g., 'CONSENT_GATE:student-abc-123'
   */
  set(key: string, entry: GateEntry): Promise<void>;

  /**
   * Get a gate entry. Returns undefined if no entry exists.
   * Callers MUST treat undefined as DENIED (fail-closed).
   */
  get(key: string): Promise<GateEntry | undefined>;

  /**
   * Delete a gate entry. Used for cleanup and withdrawal processing.
   */
  delete(key: string): Promise<void>;
}

export const GATE_STORE = Symbol('GATE_STORE');
