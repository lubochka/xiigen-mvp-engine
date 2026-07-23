/**
 * BlogCmsModulesPage - FLOW-28 admin console for Blog/CMS Modules (blog-cms-modules).
 *
 * Hybrid rendering:
 *   ?mock=<key>  -> business-state stub (status card per derived state from svc)
 *   no ?mock     -> real CRUD panel against xiigen-blog-cms-modules
 *
 * Derived states (UX-FIX Track UX-2, P1 missing - derived from service code):
 *   Plan backbone: PAGE_DRAFT -> SCHEDULED -> PUBLISHED -> UNPUBLISHED -> SEO_INDEXED
 *   Plus server-derived states from:
 *     content-publish-gate.service.ts            -> VALIDATED / MODERATION_REQUIRED
 *     ai-content-enhancement-gate.service.ts     -> PENDING_REVIEW / SUGGESTIONS_GENERATED
 *     content-archive-unpublish-flow.service.ts  -> ARCHIVED
 *     cache-invalidation-cascade.service.ts      -> INVALIDATION_QUEUED
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'page-draft': {
    idx: 1,
    label: 'Blog post saved as draft - author still editing',
    status: 'DRAFT',
    fields: {
      contentId: 'BLG-2026-0419-221',
      slug: 'launch-week-preview',
      authorId: 'writer-alex',
      lastSavedAt: '2026-04-19 10:20',
    },
  },
  'ai-suggestions': {
    idx: 2,
    label: 'AI enhancement gate produced suggestions - awaiting author review',
    status: 'SUGGESTIONS_GENERATED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      titleStrength: 'STRONG',
      recommendedLength: 'OPTIMAL',
      suggestionCount: '4',
    },
  },
  'moderation-required': {
    idx: 3,
    label: 'Publish gate blocked - moderation required for UGC comments',
    status: 'BLOCKED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      reason: 'MODERATION_REQUIRED',
      moderationStatus: 'PENDING',
      gateStage: 'content-publish-gate',
    },
  },
  scheduled: {
    idx: 4,
    label: 'Publish scheduled - awaiting dispatcher window',
    status: 'SCHEDULED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      publishAt: '2026-04-20 09:00',
      tenantId: 'tenant-master',
      scheduledBy: 'editor-in-chief',
    },
  },
  published: {
    idx: 5,
    label: 'Blog post published - cache invalidation enqueued',
    status: 'PUBLISHED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      slug: 'launch-week-preview',
      publishedAt: '2026-04-20 09:00',
      cacheJobStatus: 'INVALIDATION_QUEUED',
    },
  },
  unpublished: {
    idx: 6,
    label: 'Blog post archived - pulled from live site, accessible to admins only',
    status: 'ARCHIVED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      archiveReason: 'Superseded by updated launch-week recap',
      archivedAt: '2026-05-01 14:30',
      archivedBy: 'editor-in-chief',
    },
  },
  'seo-indexed': {
    idx: 7,
    label: 'SEO crawler confirmed indexing - post discoverable via search',
    status: 'SYNCED',
    fields: {
      contentId: 'BLG-2026-0419-221',
      sitemapEntry: '/blog/launch-week-preview',
      indexedAt: '2026-04-20 12:45',
      crawler: 'googlebot',
    },
  },
};

const PLATFORM_TENANT_ROWS = [
  { tenant: 'acme-corp', status: 'ACTIVE', posts: '142', color: 'bg-green-100 text-green-800', action: 'Uninstall', actionIdx: 0 },
  { tenant: 'techsoft-ltd', status: 'ACTIVE', posts: '58', color: 'bg-green-100 text-green-800', action: 'Uninstall', actionIdx: 1 },
  { tenant: 'new-startup', status: 'NOT INSTALLED', posts: '0', color: 'bg-gray-100 text-gray-700', action: 'Install', actionIdx: 2 },
] as const;

export function BlogCmsModulesPage() {
  const { role } = useViewerRole('tenant-admin');
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const visibility = searchParams.get('visibility'); // members | paid | undefined

  // Path A: mock states - UNCHANGED
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="blog-cms-modules"
        flowId="FLOW-28"
        title="Blog/CMS Modules"
        state={MOCK_STATES[mockState]}
        description="Admin view of blog drafts, AI enhancement, moderation gates, scheduling, publishing, and archival."
      />
    );
  }

  // Path B: role-aware - Dual-CMS pattern + module install/uninstall for platform-admin
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="blog-role">
        {/* Branch 1 - anonymous + public-marketplace-visitor (public blog reader) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <article data-testid="blog-role-reader-view" className="max-w-2xl mx-auto py-8 px-4">
            <header className="mb-6">
              <div
                data-testid="blog-post-category"
                className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2"
              >
                Product News
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Launch Week Preview - What's Shipping
              </h1>
              <p className="text-sm text-gray-500">April 20, 2026 - 3 min read - by writer-alex</p>
            </header>
            <div
              data-testid="blog-post-preview"
              className="text-gray-700 leading-relaxed mb-6"
            >
              <p className="line-clamp-3 mb-3">
                Launch week is almost here. We've been working hard on a set of improvements that
                we think you'll love - from faster load times to new integrations with your
                favourite tools...
              </p>
              <button
                type="button"
                data-testid="blog-read-more"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Continue reading
              </button>
            </div>
            <div
              data-testid="blog-reader-subscribe"
              className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center"
            >
              <p className="text-sm text-gray-700 mb-3">
                Subscribe to get new posts in your inbox.
              </p>
              <a
                href="/register"
                data-testid="blog-reader-subscribe-cta"
                className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Subscribe free
              </a>
            </div>
          </article>
        </RoleScopedView.Case>

        {/* Branch 2 - tenant-user (authenticated reader + visibility gates) */}
        <RoleScopedView.Case when="tenant-user">
          <article data-testid="blog-role-user-view" className="max-w-2xl mx-auto py-8 px-4">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Launch Week Preview - What's Shipping
              </h1>
              <p className="text-sm text-gray-500">April 20, 2026 - 3 min read - by writer-alex</p>
            </header>
            <div className="text-gray-700 leading-relaxed mb-4">
              <p>
                Launch week is almost here. We've been working hard on a set of improvements that
                we think you'll love...
              </p>
            </div>
            <div data-testid="blog-user-actions" className="mt-4 flex gap-3 flex-wrap">
              <button
                data-testid="blog-user-bookmark"
                aria-label="Bookmark this post"
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                style={{ minHeight: '44px' }}
              >
                Save
              </button>
              <button
                data-testid="blog-user-share"
                aria-label="Share this post"
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                style={{ minHeight: '44px' }}
              >
                Share
              </button>
            </div>
            {visibility === 'members' && (
              <div
                data-testid="blog-user-members-gate"
                className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700"
              >
                This post is for members only.{' '}
                <a
                  href="/billing-dashboard"
                  data-testid="blog-user-upgrade"
                  className="underline hover:no-underline"
                >
                  Upgrade to access
                </a>
              </div>
            )}
            {visibility === 'paid' && (
              <div
                data-testid="blog-user-paid-gate"
                className="mt-4 p-4 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700"
              >
                This post requires a paid subscription.{' '}
                <a
                  href="/billing-dashboard"
                  data-testid="blog-user-subscribe-paid"
                  className="underline hover:no-underline"
                >
                  Subscribe
                </a>
              </div>
            )}
          </article>
        </RoleScopedView.Case>

        {/* Branch 3 - freelancer (contributor) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="blog-role-freelancer-view" className="max-w-2xl mx-auto py-8 px-4">
            <div
              data-testid="blog-fl-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Contributor view - write posts and submit for editorial review.
            </div>
            <div
              data-testid="blog-fl-composer"
              className="p-4 border border-gray-200 rounded bg-white"
            >
              <label htmlFor="blog-fl-title" className="block text-sm font-medium text-gray-700 mb-1">
                Post title
              </label>
              <input
                id="blog-fl-title"
                data-testid="blog-fl-title"
                type="text"
                placeholder="Post title..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
              />
              <label htmlFor="blog-fl-body" className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                id="blog-fl-body"
                data-testid="blog-fl-body"
                rows={6}
                placeholder="Write your post..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
              />
              <label htmlFor="blog-fl-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="blog-fl-category"
                data-testid="blog-fl-category"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 bg-white"
              >
                <option>Product News</option>
                <option>How-to</option>
                <option>Case Study</option>
                <option>Opinion</option>
                <option>Announcement</option>
              </select>
              <div className="flex gap-2 flex-wrap">
                <button
                  data-testid="blog-fl-submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  style={{ minHeight: '44px' }}
                >
                  Submit for Review
                </button>
                <button
                  data-testid="blog-fl-draft"
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
                  style={{ minHeight: '44px' }}
                >
                  Save Draft
                </button>
              </div>
            </div>
            <p data-testid="blog-fl-note" className="text-xs text-gray-500 mt-3">
              Your post will be reviewed by an editor before it goes live.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 - tenant-admin (blog admin + module-settings indicator) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="blog-role-admin-view">
            <div
              data-testid="blog-admin-banner"
              className="px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-900"
            >
              Blog admin - manage posts, authors, and module settings.
            </div>
            <div
              data-testid="blog-admin-module-settings"
              className="mx-4 mt-4 flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded text-sm"
            >
              <span className="text-orange-700">
                Blog module is <strong>Active</strong> in this tenant.
              </span>
              <a
                href="/admin/tenant/modules/blog"
                data-testid="blog-admin-module-config"
                className="text-orange-700 hover:underline text-sm"
              >
                Module settings
              </a>
            </div>
            <AdminCrudPanel
              slug="blog-cms-modules"
              indexName="xiigen-blog-cms-modules"
              title="Blog/CMS Modules"
              description="Manage blog module records for this tenant."
              classification="TENANT_FACING"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' },
              ]}
              formFields={[
                { name: 'name', label: 'Name', required: true },
                { name: 'status', label: 'Status', required: true },
                { name: 'notes', label: 'Notes', type: 'textarea' },
              ]}
            />
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 - platform-admin (module install/uninstall console - FLOW-28 signature) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="blog-role-platform-admin-view" className="p-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Blog Module Platform Console
            </h1>
            <div
              data-testid="blog-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin - blog module installation across tenants.
            </div>
            {/* RUN-105: 2 hero-metric tiles \u2192 summary row. */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-x-5 gap-y-2 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="blog-platform-installed">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] me-1.5">
                  Blog module installed
                </span>
                <span className="tabular-nums font-semibold text-slate-900">
                  847 of 1,284
                </span>
                <span className="text-slate-400 ms-1">tenants</span>
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-slate-300">/</span>
              <span data-testid="blog-platform-pending">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] me-1.5">
                  Pending activation reviews
                </span>
                <span className="tabular-nums font-semibold text-amber-700">12</span>
              </span>
            </div>
            <div className="sm:hidden mb-4 space-y-3">
              {PLATFORM_TENANT_ROWS.map((row, i) => (
                <div
                  key={row.tenant}
                  data-testid={`blog-platform-tenant-card-${i}`}
                  className="rounded border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm text-gray-900">{row.tenant}</div>
                      <div className="mt-1 text-xs text-gray-600">{row.posts} posts</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${row.color}`}>
                      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-current" /> {row.status}
                    </span>
                  </div>
                  <button
                    data-testid={`blog-platform-card-action-${row.actionIdx}`}
                    aria-label={`${row.action} blog module for ${row.tenant}`}
                    className={`mt-3 text-sm font-medium ${row.action === 'Uninstall' ? 'text-red-600' : 'text-green-700'}`}
                    style={{ minHeight: '44px' }}
                  >
                    {row.action}
                  </button>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto mb-4">
              <table
                data-testid="blog-platform-tenants"
                className="w-full text-xs sm:text-sm table-fixed"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Tenant</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Posts</th>
                    <th className="p-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {PLATFORM_TENANT_ROWS.map((row, i) => (
                    <tr
                      key={i}
                      data-testid={`blog-platform-tenant-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2 font-mono break-all">{row.tenant}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${row.color}`}>
                          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-current" /> {row.status}
                        </span>
                      </td>
                      <td className="p-2 text-gray-700 whitespace-normal">{row.posts} posts</td>
                      <td className="p-2">
                        {row.action === 'Uninstall' ? (
                          <button
                            data-testid={`blog-platform-uninstall-${row.actionIdx}`}
                            aria-label={`Uninstall blog module for ${row.tenant}`}
                            className="text-red-600 hover:underline text-sm font-medium"
                            style={{ minHeight: '44px' }}
                          >
                            Uninstall
                          </button>
                        ) : (
                          <button
                            data-testid={`blog-platform-install-${row.actionIdx}`}
                            aria-label={`Install blog module for ${row.tenant}`}
                            className="text-green-700 hover:underline text-sm font-medium"
                            style={{ minHeight: '44px' }}
                          >
                            Install
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/platform/blog/console"
              data-testid="blog-platform-console"
              className="text-sm text-blue-600 hover:underline"
            >
              Open blog platform console
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback - platform-support (read-only) + all others */}
        <RoleScopedView.Fallback>
          {role === 'platform-support' ? (
            <div data-testid="blog-support-view" className="p-4">
              <div
                data-testid="blog-support-banner"
                className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
              >
                Read-only blog inspector. Search by post ID or slug.
              </div>
              <div className="flex gap-2">
                <label htmlFor="blog-support-search" className="sr-only">
                  Post ID or slug
                </label>
                <input
                  id="blog-support-search"
                  data-testid="blog-support-search"
                  type="text"
                  placeholder="BLG-2026-XXXX or post-slug"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  data-testid="blog-support-search-btn"
                  className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                  style={{ minHeight: '44px' }}
                >
                  Search
                </button>
              </div>
              <div
                data-testid="blog-support-result"
                className="mt-3 p-3 border border-dashed border-gray-300 rounded text-sm text-gray-500 italic"
              >
                Enter a post ID or slug to inspect.
              </div>
              <a
                href="/platform/support/escalate"
                data-testid="blog-support-escalate"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                Escalate blog issue
              </a>
            </div>
          ) : (
            <div data-testid="blog-fallback-view" className="p-4 text-sm text-gray-400">
              Blog management is not available for your current role.
            </div>
          )}
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}

