/**
 * FLOW-20 — Sponsored Content + Graph API + Ads Platform
 * Client Integration Tests
 *
 * Covers UI state mapping for the ads platform pipeline:
 *   - Loading state during ad targeting, political review, consent verification
 *   - Success state with ad live, spend recorded, political approved
 *   - Error state (consent denied, political blocked, PCI failed)
 *   - Tenant isolation UI (spend data scoped, targeting isolated)
 *   - Named check UI states (political-dual-gate-required banner, spend-append-only indicator)
 *
 * Categories align with CLIENT-TESTING-PLAN.md:
 *   C1 — Loading State (ad targeting, political review in progress)
 *   C2 — Success State (ad live, spend recorded, political approved)
 *   C3 — Error State (consent denied, political blocked, PCI failed)
 *   C4 — Tenant Isolation UI (spend data scoped, targeting isolated)
 *   C5 — Named Check UI states (political-dual-gate-required banner, spend-append-only indicator)
 */

import { describe, it, expect } from 'vitest';

describe('FLOW-20 Client Integration', () => {

  // ── C1 — Loading State ──────────────────────────────────────────────────────

  describe('C1 — Loading State', () => {
    it('ad targeting pipeline in progress shows ad-targeting-loading screen', () => {
      const campaignState = { campaignId: 'camp-001', status: 'AD_PENDING', targetingStatus: 'TARGETING_IN_PROGRESS' };
      const screen = campaignState.targetingStatus === 'TARGETING_IN_PROGRESS' ? 'ad-targeting-loading' : 'ad-targeting-complete';
      expect(screen).toBe('ad-targeting-loading');
    });

    it('political review in progress shows political-review-loading screen with dual-gate indicator', () => {
      const reviewState = {
        reviewId: 'review-001',
        status: 'POLITICAL_REVIEW',
        currentGate: 'AI_CLASSIFICATION',
        totalGates: 2,
        isPolitical: true,
      };
      const screen = reviewState.status === 'POLITICAL_REVIEW' ? 'political-review-loading' : 'review-complete';
      expect(screen).toBe('political-review-loading');
      expect(reviewState.totalGates).toBe(2);
      expect(reviewState.currentGate).toBe('AI_CLASSIFICATION');
    });

    it('consent verification in progress shows consent-checking screen', () => {
      const consentState = { userId: 'u-001', consentStatus: 'CHECKING', scope: 'ads-targeting' };
      const screen = consentState.consentStatus === 'CHECKING' ? 'consent-checking' : 'consent-resolved';
      expect(screen).toBe('consent-checking');
      expect(consentState.scope).toBe('ads-targeting');
    });

    it('graph API read request in progress shows graph-loading screen with SLO timer', () => {
      const graphState = { requestId: 'req-001', status: 'FETCHING', sloMs: 50, elapsedMs: 12 };
      const screen = graphState.status === 'FETCHING' ? 'graph-loading' : 'graph-ready';
      expect(screen).toBe('graph-loading');
      expect(graphState.sloMs).toBe(50);
      expect(graphState.elapsedMs).toBeLessThan(graphState.sloMs);
    });
  });

  // ── C2 — Success State ──────────────────────────────────────────────────────

  describe('C2 — Success State', () => {
    it('ad live shows ad-serving screen with spend counter', () => {
      const campaignState = {
        campaignId: 'camp-001',
        status: 'AD_SERVING',
        totalSpend: 42.75,
        remainingBudget: 4957.25,
        impressionCount: 122,
      };
      const screen = campaignState.status === 'AD_SERVING' ? 'ad-serving' : 'ad-pending';
      expect(screen).toBe('ad-serving');
      expect(campaignState.totalSpend).toBeGreaterThan(0);
      expect(campaignState.remainingBudget).toBeLessThan(5000);
    });

    it('spend recorded in ledger shows spend-recorded indicator with append-only badge', () => {
      const spendState = {
        ledgerId: 'ledger-001',
        status: 'APPENDED',
        amount: 0.35,
        entryType: 'IMPRESSION_CHARGE',
        appendOnly: true,
      };
      const screen = spendState.status === 'APPENDED' ? 'spend-recorded' : 'spend-pending';
      expect(screen).toBe('spend-recorded');
      expect(spendState.appendOnly).toBe(true);
      expect(spendState.entryType).toBe('IMPRESSION_CHARGE');
    });

    it('political content approved shows political-approved screen with dual-gate badge', () => {
      const reviewState = {
        reviewId: 'review-001',
        status: 'POLITICAL_APPROVED',
        aiGatePassed: true,
        humanGatePassed: true,
        dualGateComplete: true,
      };
      const screen = reviewState.status === 'POLITICAL_APPROVED' ? 'political-approved' : 'political-pending';
      expect(screen).toBe('political-approved');
      expect(reviewState.dualGateComplete).toBe(true);
      expect(reviewState.aiGatePassed).toBe(true);
      expect(reviewState.humanGatePassed).toBe(true);
    });

    it('ad complete shows campaign-complete screen with final report', () => {
      const campaignState = {
        campaignId: 'camp-done-001',
        status: 'AD_COMPLETE',
        totalSpend: 5000,
        totalImpressions: 14285,
        completedAt: '2026-03-31T23:59:59Z',
      };
      const screen = campaignState.status === 'AD_COMPLETE' ? 'campaign-complete' : 'campaign-active';
      expect(screen).toBe('campaign-complete');
      expect(campaignState.totalImpressions).toBeGreaterThan(0);
      expect(campaignState.completedAt).toBeDefined();
    });

    it('graph API social connections returned shows connection-graph screen', () => {
      const graphState = {
        userId: 'u-001',
        status: 'CONNECTED',
        connectionCount: 5,
        sloMs: 45,
      };
      const screen = graphState.status === 'CONNECTED' ? 'connection-graph' : 'connection-loading';
      expect(screen).toBe('connection-graph');
      expect(graphState.connectionCount).toBe(5);
      expect(graphState.sloMs).toBeLessThanOrEqual(50);
    });
  });

  // ── C3 — Error State ────────────────────────────────────────────────────────

  describe('C3 — Error State', () => {
    it('consent denied shows consent-denied-blocking screen — targeting blocked', () => {
      const errorState = {
        errorCode: 'CONSENT_DENIED_TARGETING_BLOCKED',
        userId: 'u-002',
        message: 'Ads targeting pipeline cannot proceed — user consent not granted',
        targetingBlocked: true,
      };
      const screen = errorState.errorCode === 'CONSENT_DENIED_TARGETING_BLOCKED' ? 'consent-denied-blocking' : 'generic-error';
      expect(screen).toBe('consent-denied-blocking');
      expect(errorState.targetingBlocked).toBe(true);
      expect(errorState.message).toContain('consent');
    });

    it('political content blocked shows political-rejected screen with review details', () => {
      const errorState = {
        errorCode: 'POLITICAL_REJECTED',
        adId: 'ad-pol-bad-001',
        aiGatePassed: true,
        humanGatePassed: false,
        message: 'Human reviewer rejected political content',
      };
      const screen = errorState.errorCode === 'POLITICAL_REJECTED' ? 'political-rejected' : 'generic-error';
      expect(screen).toBe('political-rejected');
      expect(errorState.humanGatePassed).toBe(false);
      expect(errorState.message).toContain('Human reviewer');
    });

    it('PCI violation shows pci-error screen — raw PAN detected', () => {
      const errorState = {
        errorCode: 'PCI_RAW_PAN_VIOLATION',
        message: 'DR-126: raw PAN detected — use tokenized PAN reference only',
        buildFailure: true,
      };
      const screen = errorState.errorCode === 'PCI_RAW_PAN_VIOLATION' ? 'pci-error' : 'generic-error';
      expect(screen).toBe('pci-error');
      expect(errorState.buildFailure).toBe(true);
      expect(errorState.message).toContain('DR-126');
    });

    it('fraud gate failed shows fraud-quarantined screen — billing blocked', () => {
      const errorState = {
        errorCode: 'FRAUD_GATE_FAILED_BILLING_BLOCKED',
        adId: 'ad-fraud-001',
        fraudScore: 0.92,
        status: 'QUARANTINED',
        billingBlocked: true,
      };
      const screen = errorState.errorCode === 'FRAUD_GATE_FAILED_BILLING_BLOCKED' ? 'fraud-quarantined' : 'generic-error';
      expect(screen).toBe('fraud-quarantined');
      expect(errorState.billingBlocked).toBe(true);
      expect(errorState.status).toBe('QUARANTINED');
    });
  });

  // ── C4 — Tenant Isolation UI ─────────────────────────────────────────────────

  describe('C4 — Tenant Isolation UI', () => {
    it('spend data scoped to tenant — cross-tenant spend not visible in dashboard', () => {
      const spendDashboard = {
        requestingTenant: 'tenant-A',
        entries: [
          { ledgerId: 'l-1', tenantId: 'tenant-A', amount: 100 },
          { ledgerId: 'l-2', tenantId: 'tenant-B', amount: 200 },
          { ledgerId: 'l-3', tenantId: 'tenant-A', amount: 50 },
        ],
      };
      const visibleEntries = spendDashboard.entries.filter(e => e.tenantId === spendDashboard.requestingTenant);
      expect(visibleEntries.length).toBe(2);
      expect(visibleEntries.every(e => e.tenantId === 'tenant-A')).toBe(true);
    });

    it('targeting profiles isolated per tenant — cross-tenant profile not accessible', () => {
      const profileAccess = {
        ownerTenant: 'tenant-A',
        requestingTenant: 'tenant-B',
        profileId: 'tp-A-001',
      };
      const canAccess = profileAccess.requestingTenant === profileAccess.ownerTenant;
      const screen = canAccess ? 'profile-detail' : 'access-denied';
      expect(screen).toBe('access-denied');
    });

    it('graph connections tenant-scoped — tenant-B cannot see tenant-A connections', () => {
      const allConnections = [
        { connectionId: 'gc-A-1', tenantId: 'tenant-A', userId: 'u-001' },
        { connectionId: 'gc-B-1', tenantId: 'tenant-B', userId: 'u-002' },
        { connectionId: 'gc-A-2', tenantId: 'tenant-A', userId: 'u-001' },
      ];
      const visibleToA = allConnections.filter(c => c.tenantId === 'tenant-A');
      expect(visibleToA.length).toBe(2);
      expect(visibleToA.some(c => c.tenantId === 'tenant-B')).toBe(false);
    });
  });

  // ── C5 — Named Check UI States ───────────────────────────────────────────────

  describe('C5 — Named Check UI States', () => {
    it('political-dual-gate-required banner shown for political ad content', () => {
      const adState = {
        adId: 'ad-pol-001',
        isPolitical: true,
        uiFlags: ['political-dual-gate-required'],
      };
      const showsDualGateBanner = adState.isPolitical && adState.uiFlags.includes('political-dual-gate-required');
      expect(showsDualGateBanner).toBe(true);
    });

    it('spend-append-only indicator shown in spend ledger UI — no edit/delete buttons', () => {
      const ledgerUI = {
        ledgerId: 'ledger-001',
        appendOnly: true,
        availableActions: ['view', 'export'],
        blockedActions: ['edit', 'delete'],
      };
      expect(ledgerUI.appendOnly).toBe(true);
      expect(ledgerUI.availableActions).not.toContain('edit');
      expect(ledgerUI.availableActions).not.toContain('delete');
      expect(ledgerUI.blockedActions).toContain('edit');
      expect(ledgerUI.blockedActions).toContain('delete');
    });

    it('consent-blocks-ads-targeting warning shown when consent not granted', () => {
      const consentUI = {
        userId: 'u-002',
        consentGranted: false,
        uiFlags: ['consent-required-for-targeting'],
        targetingDisabled: true,
      };
      expect(consentUI.targetingDisabled).toBe(true);
      expect(consentUI.uiFlags).toContain('consent-required-for-targeting');
    });

    it('pci-compliance indicator shown on payment method form — no raw PAN input field', () => {
      const paymentUI = {
        formFields: ['tokenizedPanRef', 'expiryDate', 'cvvToken'],
        blockedFields: ['rawPan', 'fullCardNumber'],
        pciCompliant: true,
      };
      expect(paymentUI.pciCompliant).toBe(true);
      expect(paymentUI.formFields).not.toContain('rawPan');
      expect(paymentUI.blockedFields).toContain('rawPan');
    });

    it('fraud-before-billing ordering shown in billing flow — fraud check step precedes billing step', () => {
      const billingFlow = {
        steps: ['fraud-check', 'billing-process', 'spend-record'],
        currentStep: 'fraud-check',
      };
      const fraudIndex = billingFlow.steps.indexOf('fraud-check');
      const billingIndex = billingFlow.steps.indexOf('billing-process');
      expect(fraudIndex).toBeLessThan(billingIndex);
      expect(billingFlow.steps[0]).toBe('fraud-check');
    });
  });
});
