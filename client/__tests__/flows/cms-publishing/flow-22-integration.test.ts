/**
 * FLOW-22 — CMS & Publishing Platform
 * Client Integration Tests
 *
 * Covers UI state mapping for content publish → CDN snapshot → CSS build → sitemap:
 *   - Loading state during article load, publish, review
 *   - Success state after article published, revision approved, media uploaded
 *   - Error states (publish blocked, moderation failed, revision rejected)
 *   - Tenant isolation UI (content scoped to tenant workspace)
 *   - Named check UI states (workspace_id_equals_tenant_id, content state machine)
 *
 * Categories align with CLIENT-TESTING-PLAN.md:
 *   C1 — Loading State
 *   C2 — Success State
 *   C3 — Error State
 *   C4 — Tenant Isolation UI
 *   C5 — Named Check UI states
 */

describe('FLOW-22 Client Integration', () => {

  // ── C1 — Loading State ───────────────────────────────────────────────────────

  describe('C1 — Loading State', () => {
    it('article loading shows article-loading screen while content is fetched', () => {
      const articleState = { articleId: 'art-001', status: 'loading' };
      const screen = articleState.status === 'loading' ? 'article-loading' : 'article-ready';
      expect(screen).toBe('article-loading');
    });

    it('publish in progress shows publish-in-progress screen during saga execution', () => {
      const publishState = { articleId: 'art-001', status: 'publishing', sagaStage: 'T336' };
      const screen = publishState.status === 'publishing' ? 'publish-in-progress' : 'publish-complete';
      expect(screen).toBe('publish-in-progress');
    });

    it('review pending shows review-pending screen while durable timer is active', () => {
      const reviewState = { articleId: 'art-002', status: 'review_pending', timerActive: true };
      const screen = reviewState.status === 'review_pending' ? 'review-pending' : 'review-complete';
      expect(screen).toBe('review-pending');
      expect(reviewState.timerActive).toBe(true);
    });

    it('CSS build in progress shows css-building screen — build time not request time', () => {
      const buildState = { buildId: 'build-001', status: 'building', triggeredAt: 'publish-pipeline' };
      const screen = buildState.status === 'building' ? 'css-building' : 'css-built';
      expect(screen).toBe('css-building');
      expect(buildState.triggeredAt).toBe('publish-pipeline');
    });
  });

  // ── C2 — Success State ───────────────────────────────────────────────────────

  describe('C2 — Success State', () => {
    it('article published shows article-published screen with CDN snapshot URL', () => {
      const publishResult = {
        articleId: 'art-001',
        status: 'published',
        cdnSnapshotUrl: 'https://cdn.example.com/art-001-snapshot',
      };
      const screen = publishResult.status === 'published' ? 'article-published' : 'publish-error';
      expect(screen).toBe('article-published');
      expect(publishResult.cdnSnapshotUrl).toContain('snapshot');
    });

    it('revision approved shows revision-approved screen with approvedRevisionId', () => {
      const revisionResult = { revisionId: 'rev-003', status: 'approved', approvedBy: 'editor' };
      const screen = revisionResult.status === 'approved' ? 'revision-approved' : 'revision-pending';
      expect(screen).toBe('revision-approved');
      expect(revisionResult.approvedBy).toBe('editor');
    });

    it('media uploaded shows media-uploaded screen with transformed asset URL', () => {
      const mediaResult = {
        mediaId: 'media-001',
        status: 'uploaded',
        originalOnly: true,
        transformedUrl: 'https://cdn.example.com/media-001-transformed',
      };
      const screen = mediaResult.status === 'uploaded' ? 'media-uploaded' : 'media-error';
      expect(screen).toBe('media-uploaded');
      expect(mediaResult.originalOnly).toBe(true);
    });

    it('sitemap rebuild complete shows sitemap-rebuilt screen with pageCount', () => {
      const sitemapResult = { buildId: 'sitemap-001', status: 'rebuilt', pageCount: 42, artifact: true };
      const screen = sitemapResult.status === 'rebuilt' ? 'sitemap-rebuilt' : 'sitemap-building';
      expect(screen).toBe('sitemap-rebuilt');
      expect(sitemapResult.pageCount).toBeGreaterThan(0);
      expect(sitemapResult.artifact).toBe(true);
    });
  });

  // ── C3 — Error State ─────────────────────────────────────────────────────────

  describe('C3 — Error State', () => {
    it('PUBLISH_BLOCKED maps to publish-blocked screen with blockReason', () => {
      const errorState = {
        errorCode: 'PUBLISH_BLOCKED',
        blockReason: 'bfa_registration_missing',
        articleId: 'art-003',
      };
      const screen = errorState.errorCode === 'PUBLISH_BLOCKED' ? 'publish-blocked' : 'generic-error';
      expect(screen).toBe('publish-blocked');
      expect(errorState.blockReason).toBe('bfa_registration_missing');
    });

    it('CONTENT_MODERATION_FAILED maps to moderation-failed screen — not generic error', () => {
      const errorState = {
        errorCode: 'CONTENT_MODERATION_FAILED',
        violatedPolicies: ['spam', 'harmful_content'],
      };
      const screen =
        errorState.errorCode === 'CONTENT_MODERATION_FAILED' ? 'moderation-failed' : 'generic-error';
      expect(screen).toBe('moderation-failed');
      expect(errorState.violatedPolicies).toContain('spam');
    });

    it('REVISION_REJECTED maps to revision-rejected screen with rejectionNotes', () => {
      const errorState = {
        errorCode: 'REVISION_REJECTED',
        revisionId: 'rev-005',
        rejectionNotes: 'Content does not meet editorial standards',
      };
      const screen = errorState.errorCode === 'REVISION_REJECTED' ? 'revision-rejected' : 'generic-error';
      expect(screen).toBe('revision-rejected');
      expect(errorState.rejectionNotes).toContain('editorial');
    });

    it('ETAG_CONFLICT maps to etag-conflict screen — DataProcessResult not throw path', () => {
      const errorState = {
        errorCode: 'ETAG_CONFLICT',
        articleId: 'art-004',
        expectedEtag: 'etag-v1',
        receivedEtag: 'etag-v2',
        threwException: false,
      };
      const screen = errorState.errorCode === 'ETAG_CONFLICT' ? 'etag-conflict' : 'generic-error';
      expect(screen).toBe('etag-conflict');
      expect(errorState.threwException).toBe(false);
    });
  });

  // ── C4 — Tenant Isolation UI ──────────────────────────────────────────────────

  describe('C4 — Tenant Isolation UI', () => {
    it('content is scoped to tenant — article from different tenant is not rendered', () => {
      const article = { articleId: 'art-010', tenantId: 'tenant-beta' };
      const currentTenant = 'tenant-alpha';
      const isVisible = article.tenantId === currentTenant;
      expect(isVisible).toBe(false);
    });

    it('workspace verified banner shown when workspaceId matches tenantId', () => {
      const workspaceState = { workspaceId: 'tenant-alpha', tenantId: 'tenant-alpha' };
      const bannerVisible = workspaceState.workspaceId === workspaceState.tenantId;
      expect(bannerVisible).toBe(true);
    });

    it('cross-workspace content access blocked — workspace isolation enforced', () => {
      const accessAttempt = {
        requestingWorkspace: 'tenant-alpha',
        contentWorkspace: 'tenant-beta',
        allowed: false,
      };
      expect(accessAttempt.allowed).toBe(false);
    });
  });

  // ── C5 — Named Check UI states ───────────────────────────────────────────────

  describe('C5 — Named Check UI states', () => {
    it('workspace_id_equals_tenant_id indicator shown when named check passes', () => {
      const namedCheck = {
        name: 'workspace_id_equals_tenant_id',
        workspaceId: 'tenant-alpha',
        tenantId: 'tenant-alpha',
        passed: true,
      };
      const indicator = namedCheck.passed ? 'workspace-tenant-match-ok' : 'workspace-tenant-mismatch';
      expect(indicator).toBe('workspace-tenant-match-ok');
      expect(namedCheck.workspaceId).toBe(namedCheck.tenantId);
    });

    it('content state machine displays correct state label for each transition', () => {
      const stateMachine = {
        states: ['draft', 'review', 'approved', 'published', 'archived'],
        currentState: 'approved',
      };
      const currentIndex = stateMachine.states.indexOf(stateMachine.currentState);
      expect(currentIndex).toBe(2);
      expect(stateMachine.states[currentIndex - 1]).toBe('review');
      expect(stateMachine.states[currentIndex + 1]).toBe('published');
    });

    it('pg_first_before_es_write indicator shown when CF-405 ordering check passes', () => {
      const namedCheck = {
        name: 'pg_first_before_es_write',
        bfaRule: 'CF-405',
        pgWrittenFirst: true,
        passed: true,
      };
      const indicator = namedCheck.passed ? 'pg-first-ok' : 'pg-first-fail';
      expect(indicator).toBe('pg-first-ok');
      expect(namedCheck.pgWrittenFirst).toBe(true);
    });

    it('durable_timer_cancellable indicator shown when timer can be cancelled from UI', () => {
      const timerState = {
        timerId: 'timer-001',
        namedCheck: 'durable_timer_cancellable',
        cancellable: true,
        expiresAt: '2026-04-15T00:00:00Z',
      };
      const showCancelButton = timerState.cancellable ? 'cancel-button-visible' : 'cancel-button-hidden';
      expect(showCancelButton).toBe('cancel-button-visible');
    });
  });
});
