/**
 * P7.1 Tests — BusinessFlowArbiter (Real BFA)
 *
 * Tests: entity conflicts (error), API route conflicts (error),
 * event collisions (warning), register blocks on errors,
 * register allows warnings, unregister + re-register,
 * getFlowRegistration, registeredFlows, DNA-3 compliance.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { BusinessFlowArbiter } from '../../src/guardrails/bfa';
import { BfaRegistration } from '../../src/engine-contracts/contract-schema';

function makeReg(
  entities: string[] = [],
  events: string[] = [],
  apiRoutes: string[] = [],
): BfaRegistration {
  return { entities, events, apiRoutes };
}

describe('BusinessFlowArbiter', () => {
  let bfa: BusinessFlowArbiter;

  beforeEach(() => {
    bfa = new BusinessFlowArbiter();
  });

  // ── Registration ───────────────────────────────────

  describe('registerFlow', () => {
    it('should register a flow with unique resources', () => {
      const result = bfa.registerFlow(
        'T44',
        makeReg(['inventory'], ['inv.updated'], ['/api/inventory']),
      );
      expect(result.isSuccess).toBe(true);
    });

    it('should register multiple flows with different resources', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], ['inv.updated'], ['/api/inv']));
      const result = bfa.registerFlow(
        'T45',
        makeReg(['listing'], ['listing.gen'], ['/api/listings']),
      );
      expect(result.isSuccess).toBe(true);
      expect(bfa.flowCount).toBe(2);
    });

    it('should reject empty flowId', () => {
      const result = bfa.registerFlow('', makeReg(['test'], [], []));
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = bfa.registerFlow('T44', makeReg([], [], []));
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── Entity Conflicts ───────────────────────────────

  describe('entity conflicts', () => {
    it('should detect entity ownership conflict (error)', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], [], []));
      const result = bfa.checkConflicts('T99', makeReg(['inventory'], [], []));
      expect(result.isSuccess).toBe(true);
      const conflicts = result.data!;
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('entity');
      expect(conflicts[0].severity).toBe('error');
      expect(conflicts[0].value).toBe('inventory');
      expect(conflicts[0].existingFlow).toBe('T44');
    });

    it('should block registration when entity conflict exists', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], [], []));
      const result = bfa.registerFlow('T99', makeReg(['inventory'], [], []));
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONFLICTS_DETECTED');
      expect(result.errorMessage).toContain('inventory');
    });

    it('should allow same flow to re-claim its own entity (no self-conflict)', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], [], []));
      const conflicts = bfa.checkConflicts('T44', makeReg(['inventory'], [], []));
      expect(conflicts.data!).toHaveLength(0);
    });

    it('should detect multiple entity conflicts', () => {
      bfa.registerFlow('T44', makeReg(['inventory', 'stock'], [], []));
      const result = bfa.checkConflicts('T99', makeReg(['inventory', 'stock'], [], []));
      expect(result.data!).toHaveLength(2);
    });
  });

  // ── API Route Conflicts ────────────────────────────

  describe('API route conflicts', () => {
    it('should detect API route collision (error)', () => {
      bfa.registerFlow('T44', makeReg([], [], ['/api/inventory']));
      const result = bfa.checkConflicts('T99', makeReg([], [], ['/api/inventory']));
      const conflicts = result.data!;
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('api_route');
      expect(conflicts[0].severity).toBe('error');
    });

    it('should block registration when API route conflict exists', () => {
      bfa.registerFlow('T44', makeReg([], [], ['/api/inventory']));
      const result = bfa.registerFlow('T99', makeReg([], [], ['/api/inventory']));
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONFLICTS_DETECTED');
    });

    it('should allow different routes', () => {
      bfa.registerFlow('T44', makeReg([], [], ['/api/inventory']));
      const result = bfa.registerFlow('T45', makeReg([], [], ['/api/listings']));
      expect(result.isSuccess).toBe(true);
    });
  });

  // ── Event Collisions ───────────────────────────────

  describe('event collisions', () => {
    it('should detect event collision as warning (not error)', () => {
      bfa.registerFlow('T44', makeReg([], ['data.updated'], []));
      const result = bfa.checkConflicts('T99', makeReg([], ['data.updated'], []));
      const conflicts = result.data!;
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('event');
      expect(conflicts[0].severity).toBe('warning');
    });

    it('should allow registration despite event collision (warnings dont block)', () => {
      bfa.registerFlow('T44', makeReg([], ['data.updated'], []));
      const result = bfa.registerFlow('T99', makeReg([], ['data.updated'], []));
      expect(result.isSuccess).toBe(true); // warnings don't block
    });

    it('should track multiple event publishers', () => {
      bfa.registerFlow('T44', makeReg([], ['data.updated'], []));
      bfa.registerFlow('T45', makeReg([], ['data.updated'], []));
      // Both registered, T45 gets warning but succeeds
      expect(bfa.flowCount).toBe(2);
    });
  });

  // ── Mixed Conflicts ────────────────────────────────

  describe('mixed conflicts', () => {
    it('should detect entity error + event warning simultaneously', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], ['inv.updated'], []));
      const result = bfa.checkConflicts('T99', makeReg(['inventory'], ['inv.updated'], []));
      const conflicts = result.data!;
      expect(conflicts).toHaveLength(2);

      const errors = conflicts.filter((c) => c.severity === 'error');
      const warnings = conflicts.filter((c) => c.severity === 'warning');
      expect(errors).toHaveLength(1);
      expect(warnings).toHaveLength(1);
    });

    it('should block when at least one error exists (even with warnings)', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], ['inv.updated'], []));
      const result = bfa.registerFlow('T99', makeReg(['inventory'], ['inv.updated'], []));
      expect(result.isSuccess).toBe(false); // entity error blocks despite event warning
    });
  });

  // ── Unregister ─────────────────────────────────────

  describe('unregisterFlow', () => {
    it('should remove all registrations for a flow', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], ['inv.updated'], ['/api/inv']));
      const result = bfa.unregisterFlow('T44');
      expect(result.isSuccess).toBe(true);
      expect(bfa.flowCount).toBe(0);
    });

    it('should allow re-registration after unregister', () => {
      bfa.registerFlow('T44', makeReg(['inventory'], [], []));
      bfa.unregisterFlow('T44');
      // Now T99 can claim 'inventory'
      const result = bfa.registerFlow('T99', makeReg(['inventory'], [], []));
      expect(result.isSuccess).toBe(true);
    });

    it('should reject empty flowId', () => {
      const result = bfa.unregisterFlow('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('should be safe to unregister a flow that was never registered', () => {
      const result = bfa.unregisterFlow('T999');
      expect(result.isSuccess).toBe(true); // no-op, not an error
    });
  });

  // ── getFlowRegistration ────────────────────────────

  describe('getFlowRegistration', () => {
    it('should return entities, events, and api_routes for a registered flow', () => {
      bfa.registerFlow('T44', makeReg(['inventory', 'stock'], ['inv.updated'], ['/api/inv']));
      const reg = bfa.getFlowRegistration('T44');
      expect(reg.entities).toEqual(['inventory', 'stock']);
      expect(reg.events).toEqual(['inv.updated']);
      expect(reg.api_routes).toEqual(['/api/inv']);
    });

    it('should return empty arrays for unregistered flow', () => {
      const reg = bfa.getFlowRegistration('T999');
      expect(reg.entities).toEqual([]);
      expect(reg.events).toEqual([]);
      expect(reg.api_routes).toEqual([]);
    });
  });

  // ── registeredFlows ────────────────────────────────

  describe('registeredFlows', () => {
    it('should return all registered flow IDs', () => {
      bfa.registerFlow('T44', makeReg(['a'], [], []));
      bfa.registerFlow('T45', makeReg(['b'], [], []));
      const flows = bfa.registeredFlows;
      expect(flows.size).toBe(2);
      expect(flows.has('T44')).toBe(true);
      expect(flows.has('T45')).toBe(true);
    });

    it('should be empty initially', () => {
      expect(bfa.registeredFlows.size).toBe(0);
    });
  });

  // ── IBfaValidator interface ────────────────────────

  describe('IBfaValidator interface', () => {
    it('should be usable as IBfaValidator (extends abstract class)', () => {
      // Proves BusinessFlowArbiter is a valid IBfaValidator replacement
      const validator = bfa as any;
      expect(typeof validator.checkConflicts).toBe('function');
      expect(typeof validator.registerFlow).toBe('function');
    });
  });
});
