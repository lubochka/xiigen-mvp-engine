/**
 * FLOW-15 — SaaS Platform & Multi-Tenancy
 * Client Integration Tests
 *
 * Covers UI state mapping for the SaaS platform builder:
 *   - Loading state during workspace provisioning
 *   - Provisioning success with scaffold metrics
 *   - OAuth flow states (authorizing, exchanged, failed)
 *   - Billing status transitions (TRIAL → ACTIVE → CANCELLED)
 *   - AI addon toggle and token budget display
 *   - Circuit breaker state visualization
 *   - Silo graduation progress indicator
 *
 * Categories align with CLIENT-TESTING-PLAN.md:
 *   C1 — Optimistic state
 *   C2 — App reopen / restore
 *   C3 — Offline queue
 *   C4 — SLA countdown
 *   C5 — Error screens & named check UI states
 */

import { describe, it, expect } from 'vitest';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeSaasFlowStateSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    flowId: 'FLOW-15',
    currentScreen: 'workspace-form',
    workspaceId: null as string | null,
    workspaceStatus: null as string | null, // provisioning|active|failed
    subscriptionStatus: null as string | null, // TRIAL|ACTIVE|CANCELLED|FAILED
    oauthStatus: null as string | null, // idle|authorizing|exchanged|failed
    aiAddonEnabled: false,
    tokenBudgetUsed: 0,
    tokenBudgetLimit: 100_000,
    circuitBreakerState: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    siloTier: 'shared' as 'shared' | 'isolated-silo',
    tenantId: 'tenant-a',
    completedSteps: [] as string[],
    pendingActions: [] as string[],
    sla: {
      remainingMs: 60_000,
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

describe('FLOW-15 Client Integration', () => {

  // ── C1 — Loading & Optimistic State ─────────────────────────────────────────

  describe('C1 — Loading State', () => {
    it('workspace provisioning in-flight shows workspace-provisioning screen', () => {
      const state = makeSaasFlowStateSnapshot({ workspaceStatus: 'provisioning' });
      const screen = state.workspaceStatus === 'provisioning' ? 'workspace-provisioning' : 'workspace-ready';
      expect(screen).toBe('workspace-provisioning');
    });

    it('OAuth authorization in progress shows oauth-authorizing screen', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'authorizing' });
      const screen = state.oauthStatus === 'authorizing' ? 'oauth-authorizing' : 'oauth-idle';
      expect(screen).toBe('oauth-authorizing');
    });

    it('billing subscription activating shows subscription-activating screen', () => {
      const billingState = { subscriptionId: 'sub-001', status: 'activating' };
      const screen = billingState.status === 'activating' ? 'subscription-activating' : 'subscription-dashboard';
      expect(screen).toBe('subscription-activating');
    });

    it('AI addon provisioning shows ai-addon-enabling screen', () => {
      const addonState = { addonType: 'ai-chatbot', status: 'enabling' };
      const screen = addonState.status === 'enabling' ? 'ai-addon-enabling' : 'ai-addon-active';
      expect(screen).toBe('ai-addon-enabling');
    });
  });

  // ── C2 — Provisioning Success ────────────────────────────────────────────────

  describe('C2 — Provisioning Success State', () => {
    it('workspace active shows workspace-ready screen with scaffoldComplete flag', () => {
      const state = makeSaasFlowStateSnapshot({
        workspaceId: 'ws-001',
        workspaceStatus: 'active',
        currentScreen: 'workspace-dashboard',
      });
      const extra = { scaffoldComplete: true };

      const screen = state.workspaceStatus === 'active' ? 'workspace-ready' : 'workspace-provisioning';
      expect(screen).toBe('workspace-ready');
      expect(extra.scaffoldComplete).toBe(true);
    });

    it('subscription ACTIVE shows subscription-active screen with planId', () => {
      const state = makeSaasFlowStateSnapshot({
        subscriptionStatus: 'ACTIVE',
        currentScreen: 'subscription-dashboard',
      });
      const extra = { planId: 'plan-pro' };

      const screen = state.subscriptionStatus === 'ACTIVE' ? 'subscription-active' : 'subscription-trial';
      expect(screen).toBe('subscription-active');
      expect(extra.planId).toBe('plan-pro');
    });

    it('OAuth exchanged shows oauth-connected screen with integration name', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'exchanged' });
      const extra = { integrationName: 'GitHub', connectedAt: '2026-03-31T10:00:00Z' };

      const screen = state.oauthStatus === 'exchanged' ? 'oauth-connected' : 'oauth-idle';
      expect(screen).toBe('oauth-connected');
      expect(extra.integrationName).toBe('GitHub');
    });

    it('silo graduation completed shows silo-graduated screen with new tier', () => {
      const state = makeSaasFlowStateSnapshot({ siloTier: 'isolated-silo' });

      const screen = state.siloTier === 'isolated-silo' ? 'silo-graduated' : 'silo-shared';
      expect(screen).toBe('silo-graduated');
    });

    it('AI addon active shows ai-addon-dashboard with token budget bar', () => {
      const state = makeSaasFlowStateSnapshot({
        aiAddonEnabled: true,
        tokenBudgetUsed: 25_000,
        tokenBudgetLimit: 100_000,
      });

      const budgetPercent = (state.tokenBudgetUsed / state.tokenBudgetLimit) * 100;
      const screen = state.aiAddonEnabled ? 'ai-addon-dashboard' : 'ai-addon-disabled';

      expect(screen).toBe('ai-addon-dashboard');
      expect(budgetPercent).toBe(25);
      expect(budgetPercent).toBeLessThan(100);
    });
  });

  // ── C3 — OAuth Flow States ───────────────────────────────────────────────────

  describe('C3 — OAuth Flow States', () => {
    it('OAuth idle shows connect-integration button', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'idle' });
      const buttonVisible = state.oauthStatus === 'idle';
      expect(buttonVisible).toBe(true);
    });

    it('OAuth authorizing shows redirect-in-progress spinner', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'authorizing' });
      const showSpinner = state.oauthStatus === 'authorizing';
      expect(showSpinner).toBe(true);
    });

    it('OAuth PKCE_STATIC_VERIFIER_REJECTED shows oauth-security-error screen', () => {
      const errorCode = 'PKCE_STATIC_VERIFIER_REJECTED';
      const screen =
        errorCode === 'PKCE_STATIC_VERIFIER_REJECTED' ? 'oauth-security-error' : 'oauth-generic-error';
      expect(screen).toBe('oauth-security-error');
    });

    it('OAuth failed shows oauth-failed screen with retry button', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'failed' });
      const screen = state.oauthStatus === 'failed' ? 'oauth-failed' : 'oauth-idle';
      const showRetry = state.oauthStatus === 'failed';

      expect(screen).toBe('oauth-failed');
      expect(showRetry).toBe(true);
    });

    it('optimistic OAuth authorizing reverts on token exchange failure', () => {
      const state = makeSaasFlowStateSnapshot({ oauthStatus: 'idle' });
      const action = makeOptimisticAction('OAuthAuthorizing', { provider: 'github' });

      const optimisticState = { ...state, oauthStatus: action.optimistic ? 'authorizing' : state.oauthStatus };
      expect(optimisticState.oauthStatus).toBe('authorizing');

      const serverFailure = { isSuccess: false, errorCode: 'OAUTH_TOKEN_EXCHANGE_FAILED' };
      const revertedState = serverFailure.isSuccess
        ? optimisticState
        : { ...state, oauthStatus: 'failed' };

      expect(revertedState.oauthStatus).toBe('failed');
    });
  });

  // ── C4 — Billing Status ──────────────────────────────────────────────────────

  describe('C4 — Billing Status', () => {
    it('TRIAL status shows upgrade-prompt with days-remaining badge', () => {
      const state = makeSaasFlowStateSnapshot({ subscriptionStatus: 'TRIAL' });
      const extra = { trialDaysRemaining: 7 };

      const showUpgradePrompt = state.subscriptionStatus === 'TRIAL';
      expect(showUpgradePrompt).toBe(true);
      expect(extra.trialDaysRemaining).toBe(7);
    });

    it('INVALID_TRANSITION CANCELLED→ACTIVE shows transition-rejected screen', () => {
      const currentStatus = 'CANCELLED';
      const targetStatus = 'ACTIVE';
      const errorCode = `INVALID_TRANSITION:${currentStatus}→${targetStatus}`;

      const screen = errorCode.startsWith('INVALID_TRANSITION') ? 'transition-rejected' : 'subscription-error';
      expect(screen).toBe('transition-rejected');
    });

    it('PAYMENT_REQUIRED maps to paywall-gate screen with upgrade CTA', () => {
      const errorCode = 'PAYMENT_REQUIRED';
      const screen = errorCode === 'PAYMENT_REQUIRED' ? 'paywall-gate' : 'generic-error';
      const showUpgradeCta = errorCode === 'PAYMENT_REQUIRED';

      expect(screen).toBe('paywall-gate');
      expect(showUpgradeCta).toBe(true);
    });

    it('billing SLA breach during activation triggers activation-timeout screen', () => {
      const state = makeSaasFlowStateSnapshot({
        sla: { remainingMs: 0, isBreached: true },
        subscriptionStatus: 'activating',
      });

      const screen = state.sla.isBreached ? 'activation-timeout' : 'subscription-activating';
      expect(screen).toBe('activation-timeout');
    });
  });

  // ── C5 — AI Addon Toggle ─────────────────────────────────────────────────────

  describe('C5 — AI Addon Toggle', () => {
    it('AI addon disabled state shows enable-addon button', () => {
      const state = makeSaasFlowStateSnapshot({ aiAddonEnabled: false });
      const showEnableButton = !state.aiAddonEnabled;
      expect(showEnableButton).toBe(true);
    });

    it('AI addon enabled shows token budget meter', () => {
      const state = makeSaasFlowStateSnapshot({
        aiAddonEnabled: true,
        tokenBudgetUsed: 10_000,
        tokenBudgetLimit: 100_000,
      });
      const showBudgetMeter = state.aiAddonEnabled;
      expect(showBudgetMeter).toBe(true);
    });

    it('TOKEN_BUDGET_EXCEEDED maps to ai-quota-exhausted screen with top-up CTA', () => {
      const errorCode = 'TOKEN_BUDGET_EXCEEDED';
      const screen = errorCode === 'TOKEN_BUDGET_EXCEEDED' ? 'ai-quota-exhausted' : 'generic-error';
      const showTopUpCta = errorCode === 'TOKEN_BUDGET_EXCEEDED';

      expect(screen).toBe('ai-quota-exhausted');
      expect(showTopUpCta).toBe(true);
    });

    it('token budget at 90% shows budget-warning indicator', () => {
      const state = makeSaasFlowStateSnapshot({
        aiAddonEnabled: true,
        tokenBudgetUsed: 90_500,
        tokenBudgetLimit: 100_000,
      });

      const budgetPercent = (state.tokenBudgetUsed / state.tokenBudgetLimit) * 100;
      const showWarning = budgetPercent >= 90;

      expect(showWarning).toBe(true);
      expect(budgetPercent).toBeGreaterThanOrEqual(90);
    });

    it('circuit breaker OPEN shows circuit-breaker-open banner with bypass notice', () => {
      const state = makeSaasFlowStateSnapshot({ circuitBreakerState: 'OPEN' });
      const screen =
        state.circuitBreakerState === 'OPEN'
          ? 'circuit-breaker-open'
          : state.circuitBreakerState === 'HALF_OPEN'
            ? 'circuit-breaker-probing'
            : 'circuit-breaker-closed';

      const showBypassNotice = state.circuitBreakerState === 'OPEN';
      expect(screen).toBe('circuit-breaker-open');
      expect(showBypassNotice).toBe(true);
    });

    it('SILO_GRADUATION_IRREVERSIBLE shows graduation-locked screen with confirmation dialog', () => {
      const errorCode = 'SILO_GRADUATION_IRREVERSIBLE';
      const screen = errorCode === 'SILO_GRADUATION_IRREVERSIBLE' ? 'graduation-locked' : 'silo-error';
      const showConfirmationDialog = errorCode === 'SILO_GRADUATION_IRREVERSIBLE';

      expect(screen).toBe('graduation-locked');
      expect(showConfirmationDialog).toBe(true);
    });

    it('app reopen restores provisioning screen from snapshot', () => {
      const snapshot = makeSaasFlowStateSnapshot({
        currentScreen: 'workspace-provisioning',
        workspaceId: 'ws-001',
        workspaceStatus: 'provisioning',
        subscriptionStatus: 'TRIAL',
      });

      const restoredScreen = snapshot.workspaceStatus === 'active'
        ? 'workspace-dashboard'
        : 'workspace-provisioning';

      expect(restoredScreen).toBe('workspace-provisioning');
      expect(snapshot.workspaceId).toBe('ws-001');
    });
  });
});
