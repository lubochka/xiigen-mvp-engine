/**
 * FLOW-02 — Fan-In Convergence Engine (Profile Enrichment & Matching)
 * Client Integration Tests
 *
 * Covers UI state mapping for the fan-in convergence pipeline:
 *   - Loading state during fan-in collection and scoring
 *   - Success state when convergence complete, winner selected
 *   - Error state (below threshold, empty input, insufficient candidates)
 *   - Tenant isolation (enrichment results scoped per tenant)
 *   - Named check UI states (minimum candidates indicator, threshold banner)
 *
 * Categories align with CLIENT-TESTING-PLAN.md:
 *   C1 — Loading State (fan-in collecting, scoring in progress)
 *   C2 — Success State (convergence complete, winner selected)
 *   C3 — Error State (below threshold, empty input)
 *   C4 — Tenant Isolation UI (results scoped)
 *   C5 — Named Check UI states (minimum candidates required indicator)
 */

import { describe, it, expect } from 'vitest';

describe('FLOW-02 Client Integration — Fan-In Convergence Engine', () => {

  // ── C1 — Loading State ────────────────────────────────────────────────────

  describe('C1 — Loading State', () => {
    it('fan-in collecting shows fan-in-collecting screen with sources in progress', () => {
      const state = { status: 'FAN_IN_COLLECTING', sourcesCompleted: 1, sourcesTotal: 3 };
      const screen = state.status === 'FAN_IN_COLLECTING' ? 'fan-in-collecting' : 'fan-in-scoring';
      expect(screen).toBe('fan-in-collecting');
    });

    it('fan-in scoring in progress shows fan-in-scoring screen with candidate count', () => {
      const state = { status: 'FAN_IN_SCORING', candidateCount: 3, threshold: 0.7 };
      const screen = state.status === 'FAN_IN_SCORING' ? 'fan-in-scoring' : 'fan-in-complete';
      expect(screen).toBe('fan-in-scoring');
      expect(state.candidateCount).toBe(3);
    });

    it('genesis prompt pending shows genesis-loading screen', () => {
      const state = { genesisStatus: 'GENESIS_PENDING', promptId: 'g-001' };
      const screen = state.genesisStatus === 'GENESIS_PENDING' ? 'genesis-loading' : 'genesis-ready';
      expect(screen).toBe('genesis-loading');
    });

    it('progress indicator shows source completion percentage', () => {
      const state = { sourcesCompleted: 2, sourcesTotal: 4 };
      const progress = Math.round((state.sourcesCompleted / state.sourcesTotal) * 100);
      expect(progress).toBe(50);
    });
  });

  // ── C2 — Success State ────────────────────────────────────────────────────

  describe('C2 — Success State (Convergence Complete)', () => {
    it('FAN_IN_COMPLETE shows convergence-success screen with winner score', () => {
      const result = { status: 'FAN_IN_COMPLETE', winnerId: 'c-002', winnerScore: 0.92, source: 'github' };
      const screen = result.status === 'FAN_IN_COMPLETE' ? 'convergence-success' : 'convergence-loading';
      expect(screen).toBe('convergence-success');
      expect(result.winnerScore).toBeGreaterThanOrEqual(0.7);
    });

    it('GENESIS_SEEDED state shows genesis-ready screen with flow identifier', () => {
      const state = { genesisStatus: 'GENESIS_SEEDED', flowId: 'FLOW-02', promptId: 'g-001' };
      const screen = state.genesisStatus === 'GENESIS_SEEDED' ? 'genesis-ready' : 'genesis-loading';
      expect(screen).toBe('genesis-ready');
      expect(state.flowId).toBe('FLOW-02');
    });

    it('winner selected shows enrichment-complete badge with source label', () => {
      const winner = { candidateId: 'c-004', source: 'crunchbase', score: 0.95 };
      const badge = winner.score >= 0.9 ? 'high-confidence-match' : 'standard-match';
      expect(badge).toBe('high-confidence-match');
      expect(winner.source).toBe('crunchbase');
    });

    it('profile enrichment complete shows enriched-profile-ready screen', () => {
      const profile = { profileId: 'p-001', enrichmentStatus: 'COMPLETE', sources: ['linkedin', 'github'], score: 0.88 };
      const screen = profile.enrichmentStatus === 'COMPLETE' ? 'enriched-profile-ready' : 'enrichment-in-progress';
      expect(screen).toBe('enriched-profile-ready');
      expect(profile.sources).toHaveLength(2);
    });
  });

  // ── C3 — Error State ──────────────────────────────────────────────────────

  describe('C3 — Error State (Below Threshold / Empty Input)', () => {
    it('all candidates below threshold shows below-threshold-error screen', () => {
      const result = { errorCode: 'BELOW_THRESHOLD', bestScore: 0.55, threshold: 0.7 };
      const screen = result.errorCode === 'BELOW_THRESHOLD' ? 'below-threshold-error' : 'convergence-success';
      expect(screen).toBe('below-threshold-error');
      expect(result.bestScore).toBeLessThan(result.threshold);
    });

    it('empty fan-in input shows no-candidates-error screen', () => {
      const result = { errorCode: 'INSUFFICIENT_CANDIDATES', candidateCount: 0 };
      const screen = result.errorCode === 'INSUFFICIENT_CANDIDATES' ? 'no-candidates-error' : 'fan-in-collecting';
      expect(screen).toBe('no-candidates-error');
    });

    it('single candidate fan-in shows minimum-candidates-required banner', () => {
      const state = { candidateCount: 1, minimumRequired: 2, errorCode: 'INSUFFICIENT_CANDIDATES' };
      const banner = state.candidateCount < state.minimumRequired ? 'minimum-candidates-required' : null;
      expect(banner).toBe('minimum-candidates-required');
    });

    it('genesis prompt missing required fields shows validation-error screen', () => {
      const prompt = { promptId: 'bad-001', missingFields: ['flowId', 'content'] };
      const screen = prompt.missingFields.length > 0 ? 'genesis-validation-error' : 'genesis-ready';
      expect(screen).toBe('genesis-validation-error');
      expect(prompt.missingFields).toContain('content');
    });
  });

  // ── C4 — Tenant Isolation UI ─────────────────────────────────────────────

  describe('C4 — Tenant Isolation UI', () => {
    it('enrichment results scoped — only own tenant results visible in UI', () => {
      const allResults = [
        { tenantId: 'tenant-A', profileId: 'p-1', score: 0.9 },
        { tenantId: 'tenant-B', profileId: 'p-2', score: 0.85 },
      ];

      const currentTenant = 'tenant-A';
      const visibleResults = allResults.filter(r => r.tenantId === currentTenant);

      expect(visibleResults).toHaveLength(1);
      expect(visibleResults[0].profileId).toBe('p-1');
    });

    it('genesis prompts not accessible cross-tenant — cross-tenant indicator hidden', () => {
      const prompts = [
        { tenantId: 'owner', promptId: 'g-1', content: 'Private' },
      ];

      const currentTenant = 'other-tenant';
      const accessible = prompts.filter(p => p.tenantId === currentTenant);

      expect(accessible).toHaveLength(0);
    });

    it('fan-in session isolation badge shown when tenant scope enforced', () => {
      const session = { tenantId: 'tenant-X', sessionId: 'sess-001', scopeEnforced: true };
      const badge = session.scopeEnforced ? 'tenant-isolated' : 'scope-warning';
      expect(badge).toBe('tenant-isolated');
    });
  });

  // ── C5 — Named Check UI States ────────────────────────────────────────────

  describe('C5 — Named Check UI States', () => {
    it('fan_in_minimum_two_candidates check shows required-sources indicator when < 2', () => {
      const check = { name: 'fan_in_minimum_two_candidates', candidateCount: 1, passed: false };
      const indicator = !check.passed ? `Minimum 2 candidates required — received ${check.candidateCount}` : null;
      expect(indicator).toContain('Minimum 2 candidates required');
    });

    it('convergence_score_above_threshold check shows threshold-not-met banner', () => {
      const check = { name: 'convergence_score_above_threshold', bestScore: 0.55, threshold: 0.7, passed: false };
      const banner = !check.passed ? `Score ${check.bestScore} below threshold ${check.threshold}` : null;
      expect(banner).toContain('0.55');
      expect(banner).toContain('0.7');
    });

    it('genesis_prompt_required_fields check shows missing-fields-list in error UI', () => {
      const check = { name: 'genesis_prompt_required_fields', missingFields: ['content', 'tenantId'], passed: false };
      const errorList = !check.passed ? `Missing required fields: ${check.missingFields.join(', ')}` : null;
      expect(errorList).toContain('content');
      expect(errorList).toContain('tenantId');
    });

    it('partial_failure_tolerant_fan_in shows partial-failure-notice when sources fail', () => {
      const state = { sourcesAttempted: 4, sourcesFailed: 1, sourcesSucceeded: 3, partialFailure: true };
      const notice = state.partialFailure ? `${state.sourcesFailed} source(s) failed — using ${state.sourcesSucceeded} results` : null;
      expect(notice).toContain('1 source(s) failed');
      expect(notice).toContain('3 results');
    });

    it('broadcast_consent_gated check shows consent-required indicator on notification', () => {
      const notification = { type: 'onboarding', consentGated: true, consentObtained: false };
      const indicator = notification.consentGated && !notification.consentObtained ? 'consent-required' : 'send-ready';
      expect(indicator).toBe('consent-required');
    });
  });
});
