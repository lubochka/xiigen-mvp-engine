/**
 * BusinessFlowArbiter — real BFA implementation.
 *
 * Detects cross-service conflicts BEFORE code ships:
 *   - Entity ownership: error if two flows own the same entity
 *   - API route overlap: error if two flows claim the same route
 *   - Event collision: warning if multiple flows publish the same event
 *
 * Replaces StubBfaValidator from P6.4.
 * Extends IBfaValidator so it's a drop-in replacement.
 *
 * DNA-3: All mutations return DataProcessResult.
 *
 * Phase 7.1: Real guardrails.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { IBfaValidator, BfaConflict } from '../engine-contracts/bfa-validator.stub';
import { BfaRegistration } from '../engine-contracts/contract-schema';

// ── BFA cross-flow validator result type ──────────────────────────────────

export interface BfaValidationResult {
  passed: boolean;
  ruleId: string;
  reason?: string;
}

interface CrossFlowValidatorEntry {
  ruleId: string;
  name: string;
  validate: (code: string) => BfaValidationResult;
}

@Injectable()
export class BusinessFlowArbiter extends IBfaValidator {
  /** entity → owning flowId */
  private readonly entityOwners = new Map<string, string>();
  /** event → publishing flowIds */
  private readonly eventPublishers = new Map<string, string[]>();
  /** route → owning flowId */
  private readonly apiRoutes = new Map<string, string>();

  /**
   * C-5 Fix: Cross-flow validators Map for systematic enforcement of financial
   * and state-machine rules across all 31+ flows.
   *
   * CF-789: financial_op_must_be_idempotent
   * CF-790: integer_cents_only
   * CF-791: state_machine_guard_required
   */
  readonly crossFlowValidators = new Map<string, CrossFlowValidatorEntry>();

  constructor() {
    super();
    this.initCrossFlowValidators();
  }

  /**
   * Run a single cross-flow rule by ID against provided code.
   * Returns a BfaValidationResult with passed/failed and optional reason.
   */
  runCrossFlowRule(ruleId: string, code: string): BfaValidationResult {
    const validator = this.crossFlowValidators.get(ruleId);
    if (!validator) {
      return { passed: true, ruleId, reason: `Rule ${ruleId} not registered` };
    }
    return validator.validate(code);
  }

  private initCrossFlowValidators(): void {
    // CF-789: Financial operations must be preceded by idempotency check (setIfAbsent / setnx)
    this.crossFlowValidators.set('CF-789', {
      ruleId: 'CF-789',
      name: 'financial_op_must_be_idempotent',
      validate: (code: string): BfaValidationResult => {
        const chargePattern = /\bcharge\b|\bpaymentFabric\b|\bprocessPayment\b|\bpay\b/;
        const hasCharge = chargePattern.test(code);

        if (!hasCharge) {
          return { passed: true, ruleId: 'CF-789' };
        }

        const idempotencyPattern = /setIfAbsent|setnx|SETNX/i;
        const hasIdempotency = idempotencyPattern.test(code);

        if (!hasIdempotency) {
          return {
            passed: false,
            ruleId: 'CF-789',
            reason:
              'Financial charge operation found without preceding idempotency check. ' +
              'Add setIfAbsent() before any charge/payment call (DNA-7).',
          };
        }

        // Verify ordering: idempotency must appear before charge in source
        const idempotencyIdx = code.search(idempotencyPattern);
        const chargeIdx = code.search(chargePattern);
        if (idempotencyIdx > chargeIdx) {
          return {
            passed: false,
            ruleId: 'CF-789',
            reason:
              'setIfAbsent appears AFTER charge call. Idempotency check must precede the financial operation.',
          };
        }

        return { passed: true, ruleId: 'CF-789' };
      },
    });

    // CF-790: Financial values must use integer cents — Math.round(x * 100), never float
    this.crossFlowValidators.set('CF-790', {
      ruleId: 'CF-790',
      name: 'integer_cents_only',
      validate: (code: string): BfaValidationResult => {
        // Detect financial value assignments with float literals (not part of * 100)
        const floatFinancialPattern =
          /(?:amount|price|total|mrr|revenue|charge)\s*[=:]\s*\d+\.\d+(?!\s*\*\s*100)/i;
        const floatViolation = floatFinancialPattern.test(code);

        if (floatViolation) {
          return {
            passed: false,
            ruleId: 'CF-790',
            reason:
              'Financial value assigned as float. Use integer cents: Math.round(value * 100). ' +
              'Never store or transmit monetary values as floating-point numbers.',
          };
        }

        // Detect charge calls with non-rounded values
        const chargeFloatPattern = /\.charge\s*\([^)]*\d+\.\d+[^)]*\)/;
        if (chargeFloatPattern.test(code)) {
          return {
            passed: false,
            ruleId: 'CF-790',
            reason: 'charge() called with float literal. Convert to integer cents before charging.',
          };
        }

        return { passed: true, ruleId: 'CF-790' };
      },
    });

    // CF-791: State transitions must use an allowedTransitions guard map (not direct assignment)
    this.crossFlowValidators.set('CF-791', {
      ruleId: 'CF-791',
      name: 'state_machine_guard_required',
      validate: (code: string): BfaValidationResult => {
        // Detect state field writes
        const stateWritePattern = /\bstate\s*[=:]\s*['"`]\w+['"`]/i;
        const hasStateWrite = stateWritePattern.test(code);

        if (!hasStateWrite) {
          return { passed: true, ruleId: 'CF-791' };
        }

        // Detect presence of transition guard (allowedTransitions map or VALID_TRANSITIONS object)
        const guardPattern = /VALID_TRANSITIONS|allowedTransitions|validTransitions|transitionMap/;
        const hasGuard = guardPattern.test(code);

        if (!hasGuard) {
          return {
            passed: false,
            ruleId: 'CF-791',
            reason:
              'State field assignment found without transition guard map. ' +
              'Define VALID_TRANSITIONS: Record<string, string[]> and validate before any state mutation.',
          };
        }

        return { passed: true, ruleId: 'CF-791' };
      },
    });
  }

  /**
   * Check for conflicts without registering.
   * Returns list of BfaConflict (may be empty = no conflicts).
   */
  checkConflicts(flowId: string, registration: BfaRegistration): DataProcessResult<BfaConflict[]> {
    const conflicts: BfaConflict[] = [];

    // Entity ownership conflicts (error)
    for (const entity of registration.entities) {
      const existing = this.entityOwners.get(entity);
      if (existing && existing !== flowId) {
        conflicts.push({
          conflictType: 'entity',
          value: entity,
          existingFlow: existing,
          severity: 'error',
        });
      }
    }

    // API route collisions (error)
    for (const route of registration.apiRoutes) {
      const existing = this.apiRoutes.get(route);
      if (existing && existing !== flowId) {
        conflicts.push({
          conflictType: 'api_route',
          value: route,
          existingFlow: existing,
          severity: 'error',
        });
      }
    }

    // Event publisher collisions (warning — multiple publishers allowed)
    for (const event of registration.events) {
      const publishers = this.eventPublishers.get(event) ?? [];
      const others = publishers.filter((p) => p !== flowId);
      if (others.length > 0) {
        conflicts.push({
          conflictType: 'event',
          value: event,
          existingFlow: others[0],
          severity: 'warning',
        });
      }
    }

    return DataProcessResult.success(conflicts);
  }

  /**
   * Register a flow's entities, events, and API routes.
   * Checks for error-level conflicts first — blocks if any found.
   * Warning-level conflicts are allowed (registration proceeds).
   */
  registerFlow(flowId: string, registration: BfaRegistration): DataProcessResult<boolean> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }

    // Check conflicts
    const conflictResult = this.checkConflicts(flowId, registration);
    if (!conflictResult.isSuccess) {
      return DataProcessResult.failure(conflictResult.errorCode!, conflictResult.errorMessage!);
    }

    const conflicts = conflictResult.data!;
    const errors = conflicts.filter((c) => c.severity === 'error');
    if (errors.length > 0) {
      const messages = errors.map(
        (e) => `${e.conflictType}: '${e.value}' owned by '${e.existingFlow}'`,
      );
      return DataProcessResult.failure(
        'CONFLICTS_DETECTED',
        `${errors.length} conflict(s) found: ${messages.join('; ')}`,
      );
    }

    // Register entities
    for (const entity of registration.entities) {
      this.entityOwners.set(entity, flowId);
    }

    // Register events
    for (const event of registration.events) {
      const publishers = this.eventPublishers.get(event) ?? [];
      if (!publishers.includes(flowId)) {
        publishers.push(flowId);
        this.eventPublishers.set(event, publishers);
      }
    }

    // Register API routes
    for (const route of registration.apiRoutes) {
      this.apiRoutes.set(route, flowId);
    }

    return DataProcessResult.success(true);
  }

  /**
   * Remove all registrations for a flow.
   */
  unregisterFlow(flowId: string): DataProcessResult<boolean> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }

    // Remove entities
    for (const [entity, owner] of this.entityOwners) {
      if (owner === flowId) {
        this.entityOwners.delete(entity);
      }
    }

    // Remove from event publishers
    for (const [event, publishers] of this.eventPublishers) {
      const filtered = publishers.filter((p) => p !== flowId);
      if (filtered.length === 0) {
        this.eventPublishers.delete(event);
      } else {
        this.eventPublishers.set(event, filtered);
      }
    }

    // Remove API routes
    for (const [route, owner] of this.apiRoutes) {
      if (owner === flowId) {
        this.apiRoutes.delete(route);
      }
    }

    return DataProcessResult.success(true);
  }

  /**
   * Get current registration for a flow.
   */
  getFlowRegistration(flowId: string): Record<string, unknown> {
    return {
      entities: [...this.entityOwners.entries()]
        .filter(([, owner]) => owner === flowId)
        .map(([entity]) => entity),
      events: [...this.eventPublishers.entries()]
        .filter(([, pubs]) => pubs.includes(flowId))
        .map(([event]) => event),
      api_routes: [...this.apiRoutes.entries()]
        .filter(([, owner]) => owner === flowId)
        .map(([route]) => route),
    };
  }

  /**
   * Set of all registered flow IDs.
   */
  get registeredFlows(): Set<string> {
    const flows = new Set<string>();
    for (const owner of this.entityOwners.values()) flows.add(owner);
    for (const pubs of this.eventPublishers.values()) {
      for (const p of pubs) flows.add(p);
    }
    for (const owner of this.apiRoutes.values()) flows.add(owner);
    return flows;
  }

  /**
   * Total number of registered flows.
   */
  get flowCount(): number {
    return this.registeredFlows.size;
  }

  /**
   * Clear all registrations (for testing).
   */
  clear(): void {
    this.entityOwners.clear();
    this.eventPublishers.clear();
    this.apiRoutes.clear();
  }
}
