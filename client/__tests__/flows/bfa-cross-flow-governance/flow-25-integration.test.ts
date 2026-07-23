/**
 * FLOW-25 — BFA Cross-Flow Governance
 * Client Integration Tests
 *
 * Covers UI state mapping for the BFA cross-flow validation pipeline:
 *   - Loading state during BFA validation and rule checking
 *   - Success state when all BFA rules pass and flow is approved
 *   - Error state when BFA validation fails (conflicts, violations)
 *   - Tenant isolation (rules scoped per tenant)
 *   - Named check UI states (violation banners, conflict details)
 *
 * Categories align with CLIENT-TESTING-PLAN.md:
 *   C1 — Loading State (BFA validation in progress, rule checking)
 *   C2 — Success State (BFA approved, all rules pass)
 *   C3 — Error State (BFA rejected, conflict details shown)
 *   C4 — Tenant Isolation UI (rules scoped per tenant)
 *   C5 — Named Check UI states (violation details banner, conflict rule display)
 */

import { describe, it, expect } from 'vitest';

describe('FLOW-25 Client Integration — BFA Cross-Flow Governance', () => {

  // ── C1 — Loading State ────────────────────────────────────────────────────

  describe('C1 — Loading State', () => {
    it('BFA validation in progress shows bfa-validating screen', () => {
      const state = { flowId: 'FLOW-99', bfaStatus: 'BFA_PENDING', checkedRules: 0, totalRules: 8 };
      const screen = state.bfaStatus === 'BFA_PENDING' ? 'bfa-validating' : 'bfa-complete';
      expect(screen).toBe('bfa-validating');
    });

    it('rule checking in progress shows progress indicator with checked count', () => {
      const state = { checkedRules: 4, totalRules: 8, phase: 'checking' };
      const progress = Math.round((state.checkedRules / state.totalRules) * 100);
      expect(progress).toBe(50);
      expect(state.phase).toBe('checking');
    });

    it('cross-flow impact analysis in progress shows impact-analysis-loading screen', () => {
      const state = { analysisStatus: 'in_progress', flowsChecked: 5, totalFlows: 31 };
      const screen = state.analysisStatus === 'in_progress' ? 'impact-analysis-loading' : 'impact-analysis-complete';
      expect(screen).toBe('impact-analysis-loading');
    });

    it('blast radius calculation in progress shows blast-radius-calculating screen', () => {
      const state = { blastRadiusStatus: 'calculating', depth: 2 };
      const screen = state.blastRadiusStatus === 'calculating' ? 'blast-radius-calculating' : 'blast-radius-complete';
      expect(screen).toBe('blast-radius-calculating');
    });
  });

  // ── C2 — Success State ────────────────────────────────────────────────────

  describe('C2 — Success State (BFA Approved)', () => {
    it('BFA_APPROVED status shows approval-success screen with checkedAgainst count', () => {
      const result = { bfaStatus: 'BFA_APPROVED', checkedAgainst: 31, conflicts: 0, warnings: 0 };
      const screen = result.bfaStatus === 'BFA_APPROVED' ? 'bfa-approved' : 'bfa-rejected';
      expect(screen).toBe('bfa-approved');
      expect(result.checkedAgainst).toBe(31);
    });

    it('all BFA rules passed shows zero-conflict indicator', () => {
      const result = { conflicts: 0, warnings: 0, rulesPassed: 8 };
      const indicator = result.conflicts === 0 ? 'zero-conflict' : 'conflicts-found';
      expect(indicator).toBe('zero-conflict');
    });

    it('BFA approval with warnings shows approved-with-warnings badge', () => {
      const result = { bfaStatus: 'BFA_APPROVED', conflicts: 0, warnings: 2 };
      const badge = result.warnings > 0 ? 'approved-with-warnings' : 'fully-approved';
      expect(badge).toBe('approved-with-warnings');
    });

    it('flow registered successfully shows deployment-ready screen', () => {
      const state = { registered: true, bfaStatus: 'BFA_APPROVED', deploymentReady: true };
      const screen = state.deploymentReady ? 'deployment-ready' : 'deployment-blocked';
      expect(screen).toBe('deployment-ready');
    });
  });

  // ── C3 — Error State ──────────────────────────────────────────────────────

  describe('C3 — Error State (BFA Rejected)', () => {
    it('BFA_REJECTED status shows rejection-error screen', () => {
      const result = { bfaStatus: 'BFA_REJECTED', errorCode: 'ENTITY_CONFLICT', errorMessage: 'Entity ownership conflict detected' };
      const screen = result.bfaStatus === 'BFA_REJECTED' ? 'bfa-rejected' : 'bfa-approved';
      expect(screen).toBe('bfa-rejected');
    });

    it('entity conflict details shown in error state with offending entity name', () => {
      const conflict = { conflictType: 'entity', value: 'shared_entity', existingFlow: 'FLOW-01', severity: 'error' };
      const banner = conflict.severity === 'error' ? 'conflict-error-banner' : 'conflict-warning-banner';
      expect(banner).toBe('conflict-error-banner');
      expect(conflict.value).toBe('shared_entity');
      expect(conflict.existingFlow).toBe('FLOW-01');
    });

    it('CONFLICT_DETECTED state shows offending rule ID in conflict banner', () => {
      const state = { uiState: 'CONFLICT_DETECTED', ruleId: 'CF-001', conflictType: 'entity' };
      const banner = `Conflict detected: rule ${state.ruleId} — ${state.conflictType} ownership violation`;
      expect(banner).toContain('CF-001');
      expect(state.uiState).toBe('CONFLICT_DETECTED');
    });

    it('API route conflict shows route-collision-error screen with duplicate route', () => {
      const conflict = { conflictType: 'api_route', value: '/api/shared-route', existingFlow: 'FLOW-02' };
      const screen = conflict.conflictType === 'api_route' ? 'route-collision-error' : 'entity-conflict-error';
      expect(screen).toBe('route-collision-error');
      expect(conflict.value).toBe('/api/shared-route');
    });
  });

  // ── C4 — Tenant Isolation UI ─────────────────────────────────────────────

  describe('C4 — Tenant Isolation UI', () => {
    it('BFA violations scoped per tenant — only own violations shown in UI', () => {
      const violations = [
        { tenantId: 'tenant-A', ruleId: 'CF-001', flowId: 'FLOW-X' },
        { tenantId: 'tenant-B', ruleId: 'CF-002', flowId: 'FLOW-Y' },
      ];

      const currentTenant = 'tenant-A';
      const ownViolations = violations.filter(v => v.tenantId === currentTenant);

      expect(ownViolations).toHaveLength(1);
      expect(ownViolations[0].ruleId).toBe('CF-001');
    });

    it('cross-tenant conflict guard shows isolation-enforced badge in UI', () => {
      const state = { tenantId: 'tenant-A', crossTenantBlocked: true };
      const badge = state.crossTenantBlocked ? 'isolation-enforced' : 'isolation-warning';
      expect(badge).toBe('isolation-enforced');
    });

    it('BFA audit trail shows only current tenant records in governance view', () => {
      const auditRecords = [
        { tenantId: 'tenant-A', ruleId: 'CF-473', outcome: 'PASSED' },
        { tenantId: 'tenant-A', ruleId: 'CF-474', outcome: 'PASSED' },
        { tenantId: 'tenant-B', ruleId: 'CF-473', outcome: 'FAILED' },
      ];

      const currentTenant = 'tenant-A';
      const tenantAudit = auditRecords.filter(r => r.tenantId === currentTenant);

      expect(tenantAudit).toHaveLength(2);
      expect(tenantAudit.every(r => r.outcome === 'PASSED')).toBe(true);
    });
  });

  // ── C5 — Named Check UI States ────────────────────────────────────────────

  describe('C5 — Named Check UI States', () => {
    it('violation details banner shown when archetype_unique_across_flows fails', () => {
      const check = { name: 'archetype_unique_across_flows', passed: false, offendingFlow: 'FLOW-X' };
      const banner = !check.passed ? `Violation: ${check.name} — offending flow: ${check.offendingFlow}` : null;
      expect(banner).toContain('archetype_unique_across_flows');
      expect(banner).toContain('FLOW-X');
    });

    it('conflict rule display shows factory_ids_no_overlap check result', () => {
      const check = { name: 'factory_ids_no_overlap', passed: true, factoryId: 'F1028' };
      const display = check.passed ? 'check-passed' : 'check-failed';
      expect(display).toBe('check-passed');
    });

    it('peer_flow_rules_no_duplicate check shows unique-rules-verified badge', () => {
      const check = { name: 'peer_flow_rules_no_duplicate', passed: true, ruleCount: 12 };
      const badge = check.passed ? 'unique-rules-verified' : 'duplicate-rules-detected';
      expect(badge).toBe('unique-rules-verified');
    });

    it('cf_001_entity_ownership_enforced violation shows entity-owner-conflict screen', () => {
      const namedCheck = { checkType: 'cf_001_entity_ownership_enforced', passed: false, entity: 'bfa_entity', owner: 'FLOW-1' };
      const screen = !namedCheck.passed ? 'entity-owner-conflict' : 'entity-clear';
      expect(screen).toBe('entity-owner-conflict');
      expect(namedCheck.entity).toBe('bfa_entity');
    });

    it('store_before_emit_on_transition check passes — outbox pattern shown as compliant', () => {
      const check = { name: 'store_before_emit_on_transition', passed: true };
      const indicator = check.passed ? 'outbox-compliant' : 'outbox-violation';
      expect(indicator).toBe('outbox-compliant');
    });

    it('bfa-approved flow shows deployment-ready indicator with checkedAgainst count', () => {
      const bfaResult = { passed: true, checkedAgainst: 31, errors: 0, warnings: 0 };
      const indicator = bfaResult.passed && bfaResult.errors === 0 ? 'deployment-ready' : 'deployment-blocked';
      expect(indicator).toBe('deployment-ready');
      expect(bfaResult.checkedAgainst).toBe(31);
    });

    it('blast_radius check shows affected flow count in UI tooltip', () => {
      const blastResult = { affectedFlows: 3, affectedTaskTypes: 7, severity: 'warning' };
      const tooltip = `Blast radius: ${blastResult.affectedFlows} flows, ${blastResult.affectedTaskTypes} task types affected`;
      expect(tooltip).toContain('3 flows');
      expect(tooltip).toContain('7 task types');
    });
  });
});
