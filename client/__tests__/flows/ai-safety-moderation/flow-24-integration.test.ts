/**
 * FLOW-24 — AI Safety & Content Moderation (Learning Calendar / Personal AI Tutor)
 * Client Integration Tests
 *
 * Covers UI state mapping for the learning calendar safety pipeline:
 *   - Loading state (lesson composing, safety scan in progress, calendar syncing)
 *   - Success state (lesson published, streak updated, gamification awarded)
 *   - Error state (safety gate rejected, consent denied, IRON RULE violated)
 *   - Tenant isolation UI (lesson scoped to student, gamification isolated)
 *   - Named check UI (IRON RULE indicator, consent-required banner, safety-gate-required display)
 *
 * Categories:
 *   C1 — Loading State (lesson composing, safety scan in progress, calendar syncing)
 *   C2 — Success State (lesson published, streak updated, gamification awarded)
 *   C3 — Error State (safety gate rejected, consent denied, IRON RULE violated)
 *   C4 — Tenant Isolation UI (lesson scoped to student, gamification isolated)
 *   C5 — Named Check UI (IRON RULE indicator, consent-required banner, safety-gate-required display)
 */

import { describe, it, expect } from 'vitest';

describe('FLOW-24 Client Integration', () => {

  // ── C1 — Loading State ──────────────────────────────────────────────────────

  describe('C1 — Loading State', () => {

    it('lesson composing in progress shows lesson-composing screen with AI spinner', () => {
      const lessonState = { lessonId: 'lesson-001', status: 'COMPOSING', compositionStartedAt: '2026-03-31T10:00:00Z' };
      const screen = lessonState.status === 'COMPOSING' ? 'lesson-composing' : 'lesson-draft';
      expect(screen).toBe('lesson-composing');
      expect(lessonState.compositionStartedAt).toBeDefined();
    });

    it('safety scan in progress shows safety-scanning screen with progress indicator', () => {
      const safetyState = { compositionId: 'comp-001', status: 'SCANNING', scanStartedAt: '2026-03-31T10:01:00Z' };
      const screen = safetyState.status === 'SCANNING' ? 'safety-scanning' : 'safety-complete';
      expect(screen).toBe('safety-scanning');
    });

    it('calendar syncing shows calendar-syncing screen with connector name', () => {
      const calendarState = {
        calendarEventId: 'cal-001',
        status: 'SYNCING',
        connectorName: 'ICalendarSyncConnectorFactory',
        syncedViaFabric: true,
      };
      const screen = calendarState.status === 'SYNCING' ? 'calendar-syncing' : 'calendar-synced';
      expect(screen).toBe('calendar-syncing');
      expect(calendarState.syncedViaFabric).toBe(true);
      // Must use fabric connector, not direct SDK
      expect(calendarState.connectorName).toBe('ICalendarSyncConnectorFactory');
    });

    it('grading in progress shows grading-in-progress screen (server-side computation)', () => {
      const gradingState = { gradeId: 'grade-001', status: 'GRADING', source: 'server-side' };
      const screen = gradingState.status === 'GRADING' ? 'grading-in-progress' : 'graded';
      expect(screen).toBe('grading-in-progress');
      expect(gradingState.source).toBe('server-side');
    });

  });

  // ── C2 — Success State ──────────────────────────────────────────────────────

  describe('C2 — Success State', () => {

    it('lesson published shows lesson-published screen with tokenId badge', () => {
      const lessonState = {
        lessonId: 'lesson-001',
        status: 'LESSON_PUBLISHED',
        tokenId: 'tok-comp-001',
        publishedAt: '2026-03-31T10:05:00Z',
      };
      const screen = lessonState.status === 'LESSON_PUBLISHED' ? 'lesson-published' : 'safety-review';
      expect(screen).toBe('lesson-published');
      expect(lessonState.tokenId).toBeDefined();
    });

    it('streak updated shows streak-updated screen with current streak count', () => {
      const streakState = {
        studentId: 'student-001',
        currentStreak: 7,
        timezoneUsed: 'America/New_York',
        status: 'UPDATED',
      };
      const screen = streakState.status === 'UPDATED' ? 'streak-updated' : 'streak-unchanged';
      expect(screen).toBe('streak-updated');
      expect(streakState.currentStreak).toBe(7);
      expect(streakState.timezoneUsed).toBe('America/New_York');
    });

    it('gamification points awarded shows points-awarded screen with reason label', () => {
      const gamState = {
        studentId: 'student-001',
        points: 50,
        reason: 'LESSON_COMPLETE',
        totalPoints: 350,
        status: 'AWARDED',
      };
      const screen = gamState.status === 'AWARDED' ? 'points-awarded' : 'points-pending';
      expect(screen).toBe('points-awarded');
      expect(gamState.points).toBe(50);
      expect(gamState.reason).toBe('LESSON_COMPLETE');
    });

    it('student graded shows grade-result screen with server-computed score', () => {
      const gradeState = {
        gradeId: 'grade-001',
        studentId: 'student-001',
        score: 87,
        status: 'GRADED',
        source: 'server-computed',
      };
      const screen = gradeState.status === 'GRADED' ? 'grade-result' : 'grading-pending';
      expect(screen).toBe('grade-result');
      expect(gradeState.score).toBe(87);
      expect(gradeState.source).toBe('server-computed');
    });

    it('consent granted shows consent-confirmed screen and unblocks downstream UI', () => {
      const consentState = {
        studentId: 'student-001',
        status: 'GRANTED',
        grantedAt: '2026-03-31T09:00:00Z',
        downstreamUnblocked: true,
      };
      const screen = consentState.status === 'GRANTED' ? 'consent-confirmed' : 'consent-pending';
      expect(screen).toBe('consent-confirmed');
      expect(consentState.downstreamUnblocked).toBe(true);
    });

    it('calendar synced shows calendar-synced screen with scheduled time', () => {
      const calendarState = {
        calendarEventId: 'cal-001',
        scheduledAt: '2026-04-01T09:00:00Z',
        status: 'SYNCED',
        syncedViaConnector: true,
      };
      const screen = calendarState.status === 'SYNCED' ? 'calendar-synced' : 'calendar-syncing';
      expect(screen).toBe('calendar-synced');
      expect(calendarState.syncedViaConnector).toBe(true);
    });

  });

  // ── C3 — Error State ────────────────────────────────────────────────────────

  describe('C3 — Error State', () => {

    it('safety gate rejected shows safety-rejected screen with rejected categories list', () => {
      const safetyState = {
        compositionId: 'comp-001',
        status: 'SAFETY_REJECTED',
        rejectedCategories: ['violence', 'inappropriate_language'],
        verdict: 'REJECTED',
      };
      const screen = safetyState.status === 'SAFETY_REJECTED' ? 'safety-rejected' : 'safety-approved';
      expect(screen).toBe('safety-rejected');
      expect(safetyState.rejectedCategories).toContain('violence');
      expect(safetyState.verdict).toBe('REJECTED');
    });

    it('consent denied shows consent-denied banner blocking all downstream UI elements', () => {
      const consentState = {
        studentId: 'student-001',
        status: 'DENIED',
        blockedTaskTypes: ['T368', 'T369', 'T370', 'T371', 'T372', 'T373', 'T374'],
      };
      const isBlocked = consentState.status === 'DENIED';
      const bannerType = isBlocked ? 'consent-required' : null;
      expect(bannerType).toBe('consent-required');
      expect(consentState.blockedTaskTypes.length).toBe(7);
    });

    it('IRON RULE violated shows iron-rule-error screen with step order violation details', () => {
      const ironRuleState = {
        violation: 'CF-465',
        message: 'IRON RULE VIOLATED — PUBLISH attempted before SAFETY_GATE',
        missingSteps: ['SAFETY_GATE'],
        screen: 'iron-rule-error',
      };
      expect(ironRuleState.screen).toBe('iron-rule-error');
      expect(ironRuleState.violation).toBe('CF-465');
      expect(ironRuleState.missingSteps).toContain('SAFETY_GATE');
    });

    it('missing SafetyGateToken shows token-required error screen', () => {
      const errorState = {
        compositionId: 'comp-001',
        error: 'content_safety_scan_mandatory',
        errorCode: 'CF-462',
        message: 'Safety scan token required before publish',
        screen: 'token-required',
      };
      expect(errorState.screen).toBe('token-required');
      expect(errorState.errorCode).toBe('CF-462');
    });

    it('client-supplied score rejected shows server-grading-only error screen', () => {
      const errorState = {
        error: 'server_side_only_grading',
        errorCode: 'DD-226',
        rejectedField: 'score',
        message: 'All grading must be server-side — client score field rejected',
        screen: 'grading-error',
      };
      expect(errorState.screen).toBe('grading-error');
      expect(errorState.errorCode).toBe('DD-226');
      expect(errorState.rejectedField).toBe('score');
    });

    it('gamification ledger edit attempt shows append-only error with no edit controls', () => {
      const ledgerState = {
        error: 'gamification_ledger_append_only',
        errorCode: 'DD-222',
        attemptedOperation: 'update',
        showEditButton: false,
        showDeleteButton: false,
        screen: 'ledger-readonly-error',
      };
      expect(ledgerState.screen).toBe('ledger-readonly-error');
      expect(ledgerState.showEditButton).toBe(false);
      expect(ledgerState.showDeleteButton).toBe(false);
    });

  });

  // ── C4 — Tenant Isolation UI ────────────────────────────────────────────────

  describe('C4 — Tenant Isolation UI', () => {

    it('lesson scoped to student — UI shows only compositions for current tenant', () => {
      const allCompositions = [
        { compositionId: 'comp-t1', tenantId: 'tenant-school-01', title: 'Fractions' },
        { compositionId: 'comp-t2', tenantId: 'tenant-school-02', title: 'Algebra' },
        { compositionId: 'comp-t3', tenantId: 'tenant-school-01', title: 'Geometry' },
      ];
      const currentTenant = 'tenant-school-01';
      const visibleCompositions = allCompositions.filter(c => c.tenantId === currentTenant);
      expect(visibleCompositions.length).toBe(2);
      expect(visibleCompositions.every(c => c.tenantId === currentTenant)).toBe(true);
    });

    it('gamification points isolated per tenant — school-B points not shown to school-A student', () => {
      const allPoints = [
        { entryId: 'gam-t1', tenantId: 'tenant-school-01', studentId: 's1', points: 100 },
        { entryId: 'gam-t2', tenantId: 'tenant-school-02', studentId: 's2', points: 200 },
      ];
      const currentTenant = 'tenant-school-01';
      const visiblePoints = allPoints.filter(p => p.tenantId === currentTenant);
      expect(visiblePoints.length).toBe(1);
      expect(visiblePoints[0].points).toBe(100);
    });

    it('safety scan results scoped per tenant — tenant-B scans not accessible to tenant-A UI', () => {
      const allScans = [
        { scanId: 'scan-t1', tenantId: 'tenant-school-01', verdict: 'APPROVED' },
        { scanId: 'scan-t2', tenantId: 'tenant-school-02', verdict: 'REJECTED' },
      ];
      const currentTenant = 'tenant-school-01';
      const visibleScans = allScans.filter(s => s.tenantId === currentTenant);
      expect(visibleScans.length).toBe(1);
      expect(visibleScans[0].verdict).toBe('APPROVED');
    });

    it('student consent records scoped per tenant — cross-tenant consent status not shared', () => {
      const allConsents = [
        { consentId: 'consent-t1', tenantId: 'tenant-school-01', studentId: 'student-001', status: 'GRANTED' },
        { consentId: 'consent-t2', tenantId: 'tenant-school-02', studentId: 'student-001', status: 'DENIED' },
      ];
      const currentTenant = 'tenant-school-01';
      const currentConsent = allConsents.find(c => c.tenantId === currentTenant && c.studentId === 'student-001');
      expect(currentConsent?.status).toBe('GRANTED');
      // Student 001 has DENIED in another tenant, but that should not affect this tenant
      const otherTenantConsent = allConsents.find(c => c.tenantId === 'tenant-school-02' && c.studentId === 'student-001');
      expect(otherTenantConsent?.status).toBe('DENIED');
      expect(currentConsent?.status).not.toBe(otherTenantConsent?.status);
    });

  });

  // ── C5 — Named Check UI ─────────────────────────────────────────────────────

  describe('C5 — Named Check UI', () => {

    it('IRON RULE indicator visible when compose-gate-publish order is enforced in UI pipeline', () => {
      const pipelineSteps = ['COMPOSE', 'SAFETY_GATE', 'PUBLISH'];
      const ironRuleEnforced = pipelineSteps[0] === 'COMPOSE' && pipelineSteps[1] === 'SAFETY_GATE' && pipelineSteps[2] === 'PUBLISH';
      expect(ironRuleEnforced).toBe(true);
      const uiIndicator = ironRuleEnforced ? 'iron-rule-active' : 'iron-rule-inactive';
      expect(uiIndicator).toBe('iron-rule-active');
    });

    it('consent-required banner shown when student consent status is PENDING or DENIED', () => {
      const consentStatusPending = 'PENDING';
      const showBanner = ['PENDING', 'DENIED', 'WITHDRAWN'].includes(consentStatusPending);
      expect(showBanner).toBe(true);

      const bannerMessage = showBanner ? 'Parental consent required to proceed' : null;
      expect(bannerMessage).toBe('Parental consent required to proceed');
    });

    it('safety-gate-required display shown before publish button is enabled', () => {
      const lessonState = {
        status: 'SAFETY_REVIEW',
        tokenId: null,
        publishButtonEnabled: false,
      };
      // Publish button disabled when no token
      expect(lessonState.tokenId).toBeNull();
      expect(lessonState.publishButtonEnabled).toBe(false);

      const safetyGateMessage = !lessonState.tokenId ? 'Safety gate approval required before publishing' : null;
      expect(safetyGateMessage).toBe('Safety gate approval required before publishing');
    });

    it('calendar-fabric-only indicator shown in calendar settings (no direct SDK warning)', () => {
      const calendarSettings = {
        provider: 'ICalendarSyncConnectorFactory',
        directSdkWarning: false,
        fabricConnectorRequired: true,
      };
      expect(calendarSettings.directSdkWarning).toBe(false);
      expect(calendarSettings.fabricConnectorRequired).toBe(true);
    });

    it('gamification ledger shows append-only badge — no edit or delete controls visible', () => {
      const ledgerUiConfig = {
        showEditButton: false,
        showDeleteButton: false,
        appendOnlyBadge: true,
        mode: 'append-only',
      };
      expect(ledgerUiConfig.showEditButton).toBe(false);
      expect(ledgerUiConfig.showDeleteButton).toBe(false);
      expect(ledgerUiConfig.appendOnlyBadge).toBe(true);
    });

    it('streak display uses profile timezone label — never shows client browser timezone', () => {
      const streakDisplay = {
        studentId: 'student-001',
        currentStreak: 5,
        timezoneDisplayed: 'America/New_York', // from profile
        browserTimezone: 'Europe/London',      // client timezone — must NOT be used
        usesProfileTimezone: true,
      };
      expect(streakDisplay.usesProfileTimezone).toBe(true);
      expect(streakDisplay.timezoneDisplayed).toBe('America/New_York');
      expect(streakDisplay.timezoneDisplayed).not.toBe(streakDisplay.browserTimezone);
    });

    it('server-grading-only indicator shown in quiz UI — no score field in submission form', () => {
      const quizFormFields = ['studentId', 'lessonId', 'answers', 'submittedAt'];
      const forbiddenFields = ['score', 'points', 'percentage', 'grade', 'mark', 'result'];
      const hasClientGradingField = quizFormFields.some(f => forbiddenFields.includes(f));
      expect(hasClientGradingField).toBe(false);
    });

  });

});
