/**
 * IBfaValidator — interface for Business Flow Arbiter validation.
 *
 * Real implementation comes in Phase 7 (Guardrails).
 * StubBfaValidator always returns success — no-op for P6.4.
 *
 * Phase 6.4: BFA stub for contract infrastructure.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { BfaRegistration } from './contract-schema';

/** BFA validation result. */
export interface BfaConflict {
  readonly conflictType: 'entity' | 'event' | 'api_route';
  readonly value: string;
  readonly existingFlow: string;
  readonly severity: 'error' | 'warning';
}

/**
 * IBfaValidator — checks for cross-flow conflicts before deployment.
 */
export abstract class IBfaValidator {
  /**
   * Check if a new BFA registration conflicts with existing registrations.
   */
  abstract checkConflicts(
    taskTypeId: string,
    registration: BfaRegistration,
  ): DataProcessResult<BfaConflict[]>;

  /**
   * Register a flow's BFA data (entities, events, routes).
   */
  abstract registerFlow(
    taskTypeId: string,
    registration: BfaRegistration,
  ): DataProcessResult<boolean>;
}

/**
 * StubBfaValidator — always returns success. Real BFA in Phase 7.
 */
@Injectable()
export class StubBfaValidator extends IBfaValidator {
  private readonly registrations = new Map<string, BfaRegistration>();

  checkConflicts(
    _taskTypeId: string,
    _registration: BfaRegistration,
  ): DataProcessResult<BfaConflict[]> {
    // Stub: no conflicts detected
    return DataProcessResult.success([]);
  }

  registerFlow(taskTypeId: string, registration: BfaRegistration): DataProcessResult<boolean> {
    this.registrations.set(taskTypeId, registration);
    return DataProcessResult.success(true);
  }

  /** Get all registered flows (for testing). */
  getRegistered(): Map<string, BfaRegistration> {
    return new Map(this.registrations);
  }

  /** Number of registered flows. */
  get count(): number {
    return this.registrations.size;
  }

  /** Clear (for testing). */
  clear(): void {
    this.registrations.clear();
  }
}
