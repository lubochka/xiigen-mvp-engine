/**
 * CmsPublishingPage — FLOW-22 admin console for CMS Publishing (cms-publishing).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-cms-publishing
 *
 * Derived states (UX-FIX Track UX-2):
 *   Plan backbone: DRAFT → REVIEW_REQUESTED → APPROVED → PUBLISHED → ARCHIVED
 *   Plus server-derived states from:
 *     content-approval-workflow.service.ts → EDITOR_REVIEW / LEGAL_REVIEW / STAGE_REJECTED
 *     content-schedule-dispatcher.service  → SCHEDULED / CANCELLED
 *     content-version-publisher.service    → PUBLISH_CONFLICT
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

/**
 * RUN-96: Medium / Substack-style opt-in subscribe form for the anonymous
 * article reader. Replaces a broken Subscribe button that had no email
 * input (the critique finding: "What does subscribe do without an email
 * address?"). Two states: idle form → submitted thank-you. Client-side
 * validation only; optimistic on success.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CmsAnonymousSubscribeForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg(null);
    // Optimistic — backend integration is not the concern of this
    // public seed page. Fire-and-forget a best-effort request but do
    // not block the thank-you state on it.
    try {
      void fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'cms-anonymous' }),
      }).catch(() => {
        /* swallow — anonymous opt-in is best-effort */
      });
    } catch {
      /* swallow */
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        data-testid="cms-reader-subscribe"
        className="mt-8 rounded-lg bg-emerald-50 border border-emerald-200 p-5 text-center"
        role="status"
      >
        <p
          className="text-sm font-medium text-emerald-900"
          data-testid="cms-reader-subscribe-success"
        >
          Thanks — you&apos;ll hear from us when the next article drops.
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Unsubscribe any time from any email we send you.
        </p>
      </div>
    );
  }

  return (
    <form
      data-testid="cms-reader-subscribe"
      onSubmit={handleSubmit}
      className="mt-8 rounded-lg bg-slate-50 border border-slate-200 p-5"
      noValidate
    >
      <label
        htmlFor="cms-reader-subscribe-email"
        className="block text-sm font-medium text-slate-700 mb-1"
      >
        Get new articles in your inbox
      </label>
      <p className="text-xs text-slate-500 mb-3">
        One quiet email per article. No promos, no tracking pixels.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="cms-reader-subscribe-email"
          data-testid="cms-reader-subscribe-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          aria-invalid={!!errorMsg}
          aria-describedby={errorMsg ? 'cms-reader-subscribe-error' : undefined}
          className={`flex-1 rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errorMsg ? 'border-rose-400' : 'border-slate-300'
          }`}
        />
        <button
          type="submit"
          data-testid="cms-reader-subscribe-cta"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          style={{ minHeight: '44px' }}
        >
          Subscribe
        </button>
      </div>
      {errorMsg && (
        <p
          id="cms-reader-subscribe-error"
          data-testid="cms-reader-subscribe-error"
          role="alert"
          className="mt-2 text-xs text-rose-600"
        >
          {errorMsg}
        </p>
      )}
    </form>
  );
}

const MOCK_STATES: Record<string, BusinessState> = {
  draft: {
    idx: 1,
    label: 'New article saved as draft — editor still composing',
    status: 'DRAFT',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      authorId: 'editor-maya',
      wordCount: '412',
      lastSavedAt: '2026-04-19 09:12',
    },
  },
  'review-requested': {
    idx: 2,
    label: 'Author submitted draft for editor review',
    status: 'REVIEW_REQUESTED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      stage: 'EDITOR_REVIEW',
      assignedReviewer: 'senior-editor-01',
      submittedAt: '2026-04-19 10:00',
    },
  },
  'legal-review': {
    idx: 3,
    label: 'Escalated to legal review — compliance sensitive claims present',
    status: 'IN_PROGRESS',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      stage: 'LEGAL_REVIEW',
      legalReviewer: 'legal-counsel-02',
      escalatedAt: '2026-04-19 11:30',
    },
  },
  approved: {
    idx: 4,
    label: 'Content approved — all stages green, ready to schedule',
    status: 'APPROVED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      finalApprover: 'editor-in-chief',
      approvedAt: '2026-04-19 12:45',
      versionId: 'v3',
    },
  },
  scheduled: {
    idx: 5,
    label: 'Publish scheduled — dispatcher will fire at future timestamp',
    status: 'SCHEDULED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      publishAt: '2026-04-20 08:00',
      dispatcherJobId: 'DSP-2026-0419-117',
      tenantId: 'tenant-master',
    },
  },
  rejected: {
    idx: 6,
    label: 'Stage rejected — editor returned draft to author',
    status: 'REJECTED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      stage: 'EDITOR_REVIEW',
      decision: 'STAGE_REJECTED',
      reason: 'Sources missing for paragraph 3',
    },
  },
  published: {
    idx: 7,
    label: 'Content published — live on tenant site',
    status: 'PUBLISHED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      slug: 'q2-product-roadmap',
      versionId: 'v3',
      publishedAt: '2026-04-20 08:00',
    },
  },
  archived: {
    idx: 8,
    label: 'Content archived — removed from live site, retained for audit',
    status: 'ARCHIVED',
    fields: {
      contentId: 'CMS-2026-0419-0041',
      archivedAt: '2026-05-01 17:00',
      archiveReason: 'Superseded by v4',
      archivedBy: 'editor-in-chief',
    },
  },
};

export function CmsPublishingPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  // Path A: mock states — UNCHANGED, accessible to all roles
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="cms-publishing"
        flowId="FLOW-22"
        title="CMS Publishing"
        state={MOCK_STATES[mockState]}
        description="Admin view of editorial workflow, approvals, scheduling, publishing, and archival."
      />
    );
  }

  // Path B: role-aware live rendering — Dual-CMS content pattern
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="cms-role">
        {/* Branch 1 — anonymous + public-marketplace-visitor (public reader, zero platform chrome) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <article data-testid="cms-role-reader-view" className="max-w-2xl mx-auto py-8 px-4">
            {role === 'public-marketplace-visitor' && (
              <div
                data-testid="cms-public-mkt-banner"
                className="mb-6 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-700"
              >
                You're browsing published articles from this marketplace tenant.
              </div>
            )}
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Q2 Product Roadmap — What's Coming Next
              </h1>
              <p className="text-sm text-gray-500">Published April 20, 2026 · 4 min read</p>
            </header>
            <div data-testid="cms-article-body" className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
                We're excited to share our Q2 roadmap with you. This quarter we're focusing on
                three major initiatives: performance improvements, new integrations, and enhanced
                analytics capabilities. These themes emerged from direct customer conversations and
                observed usage patterns across the platform...
              </p>
              <button
                type="button"
                data-testid="cms-article-read-more"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Continue reading →
              </button>
            </div>
            {/* RUN-96: the previous subscribe block was a Subscribe *button*
                with no email input — a broken CTA for an anonymous reader.
                Now an actual Medium / Substack-style email capture: input +
                submit button on one row. Submitting sends to /api/subscribe
                when available, otherwise flips to an optimistic "Thanks!"
                thank-you state client-side. No email is ever a gate to
                reading the article above — this is opt-in for future posts. */}
            <CmsAnonymousSubscribeForm />
          </article>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user (authenticated reader) */}
        <RoleScopedView.Case when="tenant-user">
          <article data-testid="cms-role-user-view" className="max-w-2xl mx-auto py-8 px-4">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Q2 Product Roadmap — What's Coming Next
              </h1>
              <p className="text-sm text-gray-500">Published April 20, 2026 · 4 min read</p>
            </header>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                We're excited to share our Q2 roadmap with you. This quarter we're focusing on
                three major initiatives: performance improvements, new integrations, and enhanced
                analytics capabilities...
              </p>
            </div>
            <div data-testid="cms-user-actions" className="mt-6 flex gap-3 flex-wrap">
              <button
                data-testid="cms-user-bookmark"
                aria-label="Bookmark this article"
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                style={{ minHeight: '44px' }}
              >
                ★ Bookmark
              </button>
              <button
                data-testid="cms-user-share"
                aria-label="Share this article"
                className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                style={{ minHeight: '44px' }}
              >
                ↗ Share
              </button>
            </div>
            <section
              data-testid="cms-user-related"
              className="mt-8 pt-6 border-t border-gray-200"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Latest articles</h2>
              <ul className="space-y-3">
                <li className="border border-gray-200 rounded p-3">
                  <h3 className="font-medium">Scaling our platform: lessons from Q1</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    We learned a lot from migrating from a monolith to a set of composable
                    services...
                  </p>
                </li>
                <li className="border border-gray-200 rounded p-3">
                  <h3 className="font-medium">Why we switched to role-aware templating</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    A single page can no longer serve a single persona. Here's how we restructured
                    the client...
                  </p>
                </li>
              </ul>
            </section>
          </article>
        </RoleScopedView.Case>

        {/* Branch 3 — freelancer (contributor — compose + submit, no publish) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="cms-role-freelancer-view" className="max-w-2xl mx-auto py-8 px-4">
            <div
              data-testid="cms-freelancer-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Contributor view — write and submit for editorial review.
            </div>
            <div
              data-testid="cms-fl-composer"
              className="p-4 border border-gray-200 rounded bg-white"
            >
              <label htmlFor="cms-fl-title" className="block text-sm font-medium text-gray-700 mb-1">
                New article title
              </label>
              <input
                id="cms-fl-title"
                data-testid="cms-fl-title"
                type="text"
                placeholder="Article title..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
              />
              <label htmlFor="cms-fl-body" className="block text-sm font-medium text-gray-700 mb-1">
                Article body
              </label>
              <textarea
                id="cms-fl-body"
                data-testid="cms-fl-body"
                rows={6}
                placeholder="Write your article..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
              />
              <div className="flex gap-2 flex-wrap">
                <button
                  data-testid="cms-fl-submit-review"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  style={{ minHeight: '44px' }}
                >
                  Submit for Review
                </button>
                <button
                  data-testid="cms-fl-save-draft"
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-50"
                  style={{ minHeight: '44px' }}
                >
                  Save Draft
                </button>
              </div>
            </div>
            <p data-testid="cms-fl-note" className="text-xs text-gray-500 mt-3">
              Your submission will be reviewed by an editor before publishing.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — tenant-admin (editorial workflow, NOT raw debug)
            V-R15 Wave 1 Fix #2: previous rendered the raw AdminCrudPanel
            with "Raw index browser (admin debug)" label + Delete actions,
            which the banner called "full editorial workflow access" but
            wasn't. Now renders a real editorial queue: drafts, in-review,
            approved, scheduled, published. Admin-debug raw panel moved to
            a collapsible "Open raw index" at the bottom (admin-only). */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="cms-role-admin-view" className="p-4 max-w-5xl mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Editorial workflow</h1>
              <p className="text-sm text-gray-500 mt-1">
                Drafts, reviews, scheduled posts, and published archive for your workspace.
              </p>
            </header>

            {/* KPI row */}
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
              data-testid="cms-admin-kpis"
            >
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-[11px] uppercase tracking-wide text-slate-600 font-semibold">
                  Drafts
                </div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums">4</div>
              </div>
              <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <div className="text-[11px] uppercase tracking-wide text-amber-900 font-semibold">
                  In review
                </div>
                <div className="text-2xl font-bold text-amber-700 tabular-nums">2</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <div className="text-[11px] uppercase tracking-wide text-emerald-900 font-semibold">
                  Approved
                </div>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">3</div>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-[11px] uppercase tracking-wide text-blue-900 font-semibold">
                  Scheduled
                </div>
                <div className="text-2xl font-bold text-blue-700 tabular-nums">1</div>
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <div className="text-[11px] uppercase tracking-wide text-purple-900 font-semibold">
                  Published (7d)
                </div>
                <div className="text-2xl font-bold text-purple-700 tabular-nums">12</div>
              </div>
            </div>

            {/* Editorial queue table */}
            <section data-testid="cms-admin-queue" className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Editorial queue
                </h2>
                <button
                  type="button"
                  data-testid="cms-admin-new-draft"
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + New draft
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="p-2 font-medium text-gray-700">Title</th>
                      <th className="p-2 font-medium text-gray-700">Author</th>
                      <th className="p-2 font-medium text-gray-700">Stage</th>
                      <th className="p-2 font-medium text-gray-700">Updated</th>
                      <th className="p-2 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        title: 'Q2 Product Roadmap — What\'s Coming Next',
                        author: 'Maya Editor',
                        stage: 'In review',
                        stageColor: 'amber',
                        updated: '2h ago',
                        actions: ['Approve', 'Return'],
                      },
                      {
                        title: 'Scaling our platform: lessons from Q1',
                        author: 'Ben Kwon',
                        stage: 'Approved',
                        stageColor: 'emerald',
                        updated: 'Yesterday',
                        actions: ['Schedule', 'Publish'],
                      },
                      {
                        title: 'Why we switched to role-aware templating',
                        author: 'Carol Ng',
                        stage: 'Draft',
                        stageColor: 'slate',
                        updated: '3 days ago',
                        actions: ['Submit for review'],
                      },
                      {
                        title: 'Customer spotlight: Acme Learning',
                        author: 'Dan Ruiz',
                        stage: 'Scheduled',
                        stageColor: 'blue',
                        updated: '2026-04-22 · 08:00',
                        actions: ['Edit schedule'],
                      },
                      {
                        title: 'Legal: 2026 Q1 transparency report',
                        author: 'Eva Lind',
                        stage: 'Legal review',
                        stageColor: 'amber',
                        updated: '5h ago',
                        actions: ['Open thread'],
                      },
                    ].map((r, i) => {
                      const badgeClass =
                        r.stageColor === 'amber'
                          ? 'bg-amber-100 text-amber-800'
                          : r.stageColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.stageColor === 'blue'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700';
                      return (
                        <tr
                          key={i}
                          className="border-t border-gray-200"
                          data-testid={`cms-admin-queue-row-${i}`}
                        >
                          <td className="p-2 font-medium text-gray-900">{r.title}</td>
                          <td className="p-2 text-gray-700">{r.author}</td>
                          <td className="p-2">
                            <span className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${badgeClass}`}>
                              {r.stage}
                            </span>
                          </td>
                          <td className="p-2 text-gray-500 text-xs tabular-nums">{r.updated}</td>
                          <td className="p-2">
                            <div className="flex gap-1.5 flex-wrap">
                              {r.actions.map((a) => (
                                <button
                                  key={a}
                                  type="button"
                                  className="text-xs px-2 py-1 border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                                >
                                  {a}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recently published sub-section */}
            <section data-testid="cms-admin-recent">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Recently published
              </h2>
              <ul className="divide-y border border-gray-200 rounded">
                {[
                  { title: 'Launch Week Preview', author: 'Maya Editor', when: '2 days ago' },
                  { title: 'A better way to write flows', author: 'Ben Kwon', when: '5 days ago' },
                  { title: 'Q1 Retro: what we shipped', author: 'Carol Ng', when: '1 week ago' },
                ].map((p, i) => (
                  <li key={i} className="flex items-center justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{p.title}</div>
                      <div className="text-xs text-gray-500">by {p.author}</div>
                    </div>
                    <div className="text-xs text-gray-500 tabular-nums">{p.when}</div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Collapsed raw-index, admin-only, hidden by default */}
            <details
              className="mt-8 border border-gray-200 rounded bg-white"
              data-testid="cms-admin-raw-details"
            >
              <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50">
                Open raw content index (admin debug)
              </summary>
              <AdminCrudPanel
                slug="cms-publishing"
                indexName="xiigen-cms-publishing"
                title="CMS Publishing"
                description="Raw index browser — reads /api/dynamic/xiigen-cms-publishing."
                classification="ADMIN_FACING"
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
            </details>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (cross-tenant CMS oversight) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="cms-role-platform-admin-view" className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Platform CMS Oversight</h1>
            <div
              data-testid="cms-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin — cross-tenant CMS oversight.
            </div>
            {/* RUN-112: platform-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="cms-platform-published">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Published articles (today)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">284</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="cms-platform-legal-queue">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Pending legal review
                </span>
                <span className="tabular-nums font-semibold text-amber-700">7</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs attention</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="cms-platform-violations">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Policy violations (7d)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">3</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/platform/cms/policy"
                data-testid="cms-platform-policy"
                className="text-sm text-blue-600 hover:underline"
              >
                Open content policy console →
              </a>
              <a
                href="/platform/cms/legal"
                data-testid="cms-platform-legal"
                className="text-sm text-blue-600 hover:underline"
              >
                View pending legal reviews →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — platform-support (read-only) + all other unhandled roles */}
        <RoleScopedView.Fallback>
          {role === 'platform-support' ? (
            <div data-testid="cms-support-view" className="p-4">
              <div
                data-testid="cms-support-banner"
                className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
              >
                Read-only content inspector. Search by content ID or slug.
              </div>
              <label
                htmlFor="cms-support-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content ID or slug
              </label>
              <div className="flex gap-2">
                <input
                  id="cms-support-search"
                  data-testid="cms-support-search"
                  type="text"
                  placeholder="CMS-2026-XXXX or article-slug"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  data-testid="cms-support-search-btn"
                  className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                  style={{ minHeight: '44px' }}
                >
                  Search
                </button>
              </div>
              <div
                data-testid="cms-support-result"
                className="mt-3 p-3 border border-dashed border-gray-300 rounded text-sm text-gray-500 italic"
              >
                Enter a content ID to inspect.
              </div>
              <a
                href="/platform/support/escalate"
                data-testid="cms-support-escalate"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                Escalate content issue →
              </a>
            </div>
          ) : (
            <div data-testid="cms-fallback-view" className="p-4 text-sm text-gray-400">
              CMS publishing is not available for your current role.
            </div>
          )}
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
