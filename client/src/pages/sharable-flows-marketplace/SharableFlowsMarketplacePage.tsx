/**
 * SharableFlowsMarketplacePage — FLOW-32 admin console for Sharable Flows Marketplace.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-sharable-flows-marketplace
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   FLOW_SUBMITTED → REVIEW_PENDING → APPROVED → LISTED → INSTALLED
 * Plus states derived from engine/flows/sharable-flows-marketplace/ services
 * (artifact-certifier: QUALITY_INSUFFICIENT | SECURITY_SCAN_FAILED,
 *  fraud-detection-service: HUMAN_REVIEW_REQUIRED | PASSED_FRAUD_CHECK,
 *  migration-rollback-handler: ROLLED_BACK).
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const SAMPLE_FLOWS = [
  {
    id: 'PKG-event-raffle-v1',
    name: 'Event Raffle Manager',
    category: 'Events',
    installs: 284,
    rating: 4.8,
    publisher: 'acme-corp',
    version: 'v1.2.0',
    status: 'LISTED',
  },
  {
    id: 'PKG-event-management-acme-v1.0.1',
    name: 'Acme Curated Events',
    category: 'Events',
    installs: 1,
    rating: 0,
    publisher: 'acme-corp',
    version: 'v1.0.1',
    status: 'LISTED',
    changelogSummary:
      'Adapted for small-group events: 10 attendee cap, three active events per organiser, in-app promotion only.',
  },
  {
    id: 'PKG-event-management-northwind-v1.0.2',
    name: 'Northwind Sponsor Forums',
    category: 'Events',
    installs: 1,
    rating: 0,
    publisher: 'northwind',
    version: 'v1.0.2',
    status: 'LISTED',
    changelogSummary:
      'Based on Acme v1.0.1. Adds a 12-partner sponsor review waitlist while preserving the 10 attendee cap and in-app promotion.',
  },
  {
    id: 'PKG-payment-gateway-v2',
    name: 'Stripe Payment Gateway',
    category: 'Payments',
    installs: 1247,
    rating: 4.9,
    publisher: 'payments-co',
    version: 'v2.1.0',
    status: 'LISTED',
  },
  {
    id: 'PKG-analytics-dashboard-v3',
    name: 'Analytics Dashboard Pro',
    category: 'Analytics',
    installs: 523,
    rating: 4.6,
    publisher: 'dataworks',
    version: 'v3.0.1',
    status: 'LISTED',
  },
  // FLOW-01 cascade listings — FLOW-PORTABILITY-TEST-PROTOCOL-v1.1 (1)
  // § P3 (acme marketplace) and § P6 (northwind marketplace).
  // Three sibling entries: platform source, Acme adapted, Northwind re-adapted.
  // Each entry carries version + publisher + changelog for Axis D / Axis E checks.
  {
    id: 'PKG-user-registration-v1.0.0',
    name: 'User Registration & Onboarding',
    category: 'Identity',
    installs: 1,
    rating: 0,
    publisher: 'xiigen-platform',
    version: 'v1.0.0',
    status: 'LISTED',
    changelogSummary: 'Initial publication by XIIGen platform.',
  },
  {
    id: 'PKG-user-registration-acme-v1.0.1',
    name: 'User Registration & Onboarding',
    category: 'Identity',
    installs: 1,
    rating: 0,
    publisher: 'acme-pro-members',
    version: 'v1.0.1',
    status: 'LISTED',
    changelogSummary:
      'Settings changed: resend wait reduced from 60 minutes to 15 minutes; invite links now expire after 1 hour; invitation copy is branded.',
  },
  {
    id: 'PKG-user-registration-northwind-v1.0.2',
    name: 'User Registration & Onboarding',
    category: 'Identity',
    installs: 2,
    rating: 0,
    publisher: 'northwind-guild',
    version: 'v1.0.2',
    status: 'LISTED',
    changelogSummary:
      'Based on acme-pro-members v1.0.1. Settings changed: resend wait reduced from 15 minutes to 5 minutes.',
  },
];

const MOCK_STATES: Record<string, BusinessState> = {
  'flow-submitted': {
    idx: 1,
    label: 'Flow package submitted for marketplace listing',
    status: 'SUBMITTED',
    fields: {
      packageId: 'PKG-event-raffle-v1',
      publisherId: 'pub-acme',
      version: '1.0.0',
      submittedAt: '2026-04-19 09:00',
    },
  },
  'review-pending': {
    idx: 2,
    label: 'Certification review in progress \u2014 policy evaluators + fraud scan',
    status: 'REVIEW_PENDING',
    fields: {
      packageId: 'PKG-event-raffle-v1',
      certifierCheck: 'PENDING',
      fraudCheck: 'PENDING',
      queuedAt: '2026-04-19 09:05',
    },
  },
  'fraud-flagged': {
    idx: 3,
    label: 'Fraud detection flagged — human review required',
    status: 'FRAUD_CHECKED',
    fields: {
      packageId: 'PKG-event-raffle-v2',
      suspiciousPattern: 'LOW_SCORE_MINIMAL_USAGE',
      fraudStatus: 'HUMAN_REVIEW_REQUIRED',
      flaggedAt: '2026-04-19 09:15',
    },
  },
  'approved': {
    idx: 4,
    label: 'Package APPROVED — certifier + fraud both passed',
    status: 'APPROVED',
    fields: {
      packageId: 'PKG-event-raffle-v1',
      qualityScore: '0.92',
      securityScan: 'PASSED',
      approvedAt: '2026-04-19 10:00',
    },
  },
  'rejected': {
    idx: 5,
    label: 'Package REJECTED — quality insufficient',
    status: 'REJECTED',
    fields: {
      packageId: 'PKG-broken-flow-v1',
      reason: 'QUALITY_INSUFFICIENT',
      qualityScore: '0.48',
      rejectedAt: '2026-04-19 10:05',
    },
  },
  'listed': {
    idx: 6,
    label: 'Package is live — publicly discoverable in the marketplace',
    status: 'LISTED',
    fields: {
      packageId: 'PKG-event-raffle-v1',
      listingUrl: '/marketplace/event-raffle',
      listedAt: '2026-04-19 10:10',
      installCount: '0',
    },
  },
  'installed': {
    idx: 7,
    label: 'Package INSTALLED to tenant — binding document created',
    status: 'INSTALLED',
    fields: {
      packageId: 'PKG-event-raffle-v1',
      installationId: 'INST-2026-0419-001',
      tenantId: 'TNT-acme-corp',
      installedAt: '2026-04-19 11:00',
    },
  },
  'rolled-back': {
    idx: 8,
    label: 'Installation rolled back — migration reverted',
    status: 'ROLLBACK_TRIGGERED',
    fields: {
      installationId: 'INST-2026-0419-001',
      tenantId: 'TNT-acme-corp',
      reason: 'Runtime errors exceeded threshold in 1h window',
      rolledBackAt: '2026-04-19 12:00',
    },
  },
};

export function SharableFlowsMarketplacePage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const publisherActive = searchParams.get('publisher-active') === 'true';

  // Path A: mock states — UNCHANGED, accessible to all roles
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="sharable-flows-marketplace"
        flowId="FLOW-32"
        title="Sharable Flows Marketplace"
        state={MOCK_STATES[mockState]}
        description="Admin view of flow package submission, certification, listing, installation, and rollback."
      />
    );
  }

  // Path B: role-aware — dual-sided marketplace (consumer × producer × curator)
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="sfm-role">
        {/* Branch 1 — anonymous + public-marketplace-visitor (consumer read-only) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <div data-testid="sfm-role-browse-view" className="max-w-5xl mx-auto p-6">
            <div
              data-testid="sfm-anon-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              Sign in to install flow templates or publish your own.{' '}
              <a
                href="/login"
                data-testid="sfm-anon-signin"
                className="underline font-medium"
              >
                Sign in →
              </a>
            </div>
            <h1 data-testid="sfm-browse-heading" className="text-2xl font-bold text-gray-900 mb-4">
              Flow Templates Marketplace
            </h1>
            <div data-testid="sfm-browse-categories" className="flex gap-3 mb-4 text-sm">
              <span className="text-gray-500">All</span>
              <span className="text-gray-500">Events</span>
              <span className="text-gray-500">Payments</span>
              <span className="text-gray-500">Analytics</span>
            </div>
            <div data-testid="sfm-browse-list" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_FLOWS.map((f, i) => (
                <div
                  key={f.id}
                  data-testid={`sfm-browse-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {f.category} · by {f.publisher}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span aria-label={`${f.rating} out of 5 stars`}>★ {f.rating}</span> ({f.installs} installs)
                  </p>
                  <p data-testid={`sfm-browse-version-${i}`} className="text-xs text-gray-500 mt-1">
                    {f.version}
                  </p>
                  <a
                    href="/login?return=/marketplace"
                    data-testid={`sfm-browse-install-${i}`}
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Sign in to install
                  </a>
                </div>
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user + tenant-admin (consumer — install + fork) */}
        <RoleScopedView.Case when={['tenant-user', 'tenant-admin']}>
          <div data-testid="sfm-role-consumer-view" className="max-w-5xl mx-auto p-6">
            <h1
              data-testid="sfm-consumer-heading"
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Browse Flow Templates
            </h1>
            <div data-testid="sfm-consumer-list" className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {SAMPLE_FLOWS.map((f, i) => (
                <div
                  key={f.id}
                  data-testid={`sfm-consumer-card-${i}`}
                  data-package-id={f.id}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {f.category} · {f.version} · by {f.publisher}
                  </p>
                  {('changelogSummary' in f) && (
                    <p
                      data-testid={`sfm-consumer-changelog-${i}`}
                      className="text-xs text-gray-600 mt-2 italic"
                    >
                      {(f as { changelogSummary: string }).changelogSummary}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-2">
                    ★ {f.rating} ({f.installs} installs)
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      data-testid={`sfm-consumer-install-${i}`}
                      aria-label={`Install ${f.name}`}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                      style={{ minHeight: '44px' }}
                    >
                      Install
                    </button>
                    <a
                      href={`/flows/fork/${f.id}`}
                      data-testid={`sfm-consumer-fork-${i}`}
                      className="text-sm text-blue-600 hover:underline self-center"
                    >
                      Fork →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div data-testid="sfm-consumer-installed" className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">My Installed Flows (2)</h2>
              {[
                { name: 'Event Raffle Manager', version: 'v1.1.0', latest: 'v1.3.0' },
                { name: 'Stripe Payment Gateway', version: 'v2.0.0', latest: 'v2.1.0' },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white mb-2"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-gray-500">
                      Installed: {row.version} ·{' '}
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <span aria-hidden="true">●</span> {row.latest} available — Update available
                      </span>
                    </p>
                  </div>
                  <button
                    data-testid={`sfm-consumer-update-${i}`}
                    aria-label={`Update ${row.name} to latest version`}
                    className="bg-emerald-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-emerald-700"
                    style={{ minHeight: '44px' }}
                  >
                    Update
                  </button>
                </div>
              ))}
            </div>

            {role === 'tenant-admin' && (
              <div
                data-testid="sfm-admin-config"
                className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm"
              >
                <span className="text-orange-700">Tenant admin: </span>
                <a
                  href="/admin/flows/configure"
                  data-testid="sfm-admin-config-link"
                  className="text-orange-700 hover:underline"
                >
                  Configure installed flows for this tenant →
                </a>
              </div>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — freelancer (PRODUCER side — publish + revenue) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="sfm-role-producer-view" className="max-w-4xl mx-auto p-6">
            <div
              data-testid="sfm-producer-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Publisher view — share your flows with the marketplace.
            </div>
            <div data-testid="sfm-producer-my-flows" className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">My Published Flows</h2>
              {[
                { name: 'Event Raffle Manager v1.2.0', installs: 284, price: '$0.00 (free)', status: 'Listed', color: 'text-green-700' },
                { name: 'Task Reminder Flow v0.9.0', installs: 12, price: '$4.99/tenant', status: 'Review pending', color: 'text-amber-700' },
              ].map((row, i) => (
                <div
                  key={i}
                  data-testid={`sfm-producer-flow-${i}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white mb-2"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-gray-600">
                      {row.installs} installs · {row.price} ·{' '}
                      <span className={`${row.color} font-medium`}>
                        <span aria-hidden="true">●</span> {row.status}
                      </span>
                    </p>
                  </div>
                  <a
                    href={`/flows/manage/${i}`}
                    data-testid={`sfm-producer-manage-${i}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Manage →
                  </a>
                </div>
              ))}
            </div>

            {publisherActive && (
              <div
                data-testid="sfm-producer-revenue"
                className="mt-4 p-4 rounded-lg bg-purple-50 border border-purple-200"
              >
                <p className="text-sm font-medium text-purple-800 mb-2">Revenue Dashboard</p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p
                      data-testid="sfm-producer-revenue-total"
                      className="text-lg font-bold text-purple-700"
                    >
                      $127.44
                    </p>
                    <p className="text-xs text-purple-600">Total earned</p>
                  </div>
                  <div>
                    <p
                      data-testid="sfm-producer-installs-total"
                      className="text-lg font-bold text-purple-700"
                    >
                      296
                    </p>
                    <p className="text-xs text-purple-600">Total installs</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-3 flex-wrap">
              <a
                href="/flows/publish"
                data-testid="sfm-producer-publish"
                className="inline-flex items-center bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700"
                style={{ minHeight: '44px' }}
              >
                Publish new flow →
              </a>
              <a
                href="/marketplace/guidelines"
                data-testid="sfm-producer-guidelines"
                className="text-sm text-blue-600 hover:underline self-center"
              >
                View marketplace guidelines →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — business-partner (enterprise consumer) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="sfm-role-enterprise-view" className="max-w-5xl mx-auto p-6">
            <div
              data-testid="sfm-enterprise-banner"
              className="mb-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              Enterprise view — discover flow bundles for your business workflows.
            </div>
            <div data-testid="sfm-enterprise-list" className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {SAMPLE_FLOWS.map((f, i) => (
                <div
                  key={f.id}
                  data-testid={`sfm-enterprise-card-${i}`}
                  className="p-4 border border-slate-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{f.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {f.category} · {f.version}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">★ {f.rating}</p>
                  <button
                    data-testid={`sfm-enterprise-install-${i}`}
                    aria-label={`Install ${f.name} for your team`}
                    className="mt-3 w-full bg-slate-700 text-white px-3 py-2 rounded text-sm font-medium hover:bg-slate-800"
                    style={{ minHeight: '44px' }}
                  >
                    Install for team
                  </button>
                  <a
                    href="/enterprise/licence"
                    data-testid={`sfm-enterprise-licence-${i}`}
                    className="block mt-2 text-xs text-slate-600 hover:underline"
                  >
                    Request enterprise licence →
                  </a>
                </div>
              ))}
            </div>
            <div data-testid="sfm-enterprise-bundles" className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Enterprise bundles</h2>
              <div
                data-testid="sfm-enterprise-bundle-0"
                className="p-4 border border-slate-300 rounded bg-slate-50"
              >
                <h3 className="font-semibold">Payment Suite Bundle</h3>
                <p className="text-sm text-gray-700 mt-1">
                  5 flows · $49.99/month · for teams &gt; 10
                </p>
                <a
                  href="/enterprise/contact"
                  className="inline-block mt-2 bg-slate-700 text-white px-3 py-2 rounded text-sm font-medium hover:bg-slate-800"
                  style={{ minHeight: '44px' }}
                >
                  Contact sales →
                </a>
              </div>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (CURATOR side) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="sfm-role-curator-view">
            <div
              data-testid="sfm-curator-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform curator — approve and manage the flows marketplace.
            </div>
            {/* RUN-104: platform-curator hero tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="sfm-curator-pending">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Pending certification review
                </span>
                <span className="tabular-nums font-semibold text-amber-700">12</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="sfm-curator-fraud">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Fraud flags (human review)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">3</span>
                <span className="ml-1 text-slate-400 text-[11px]">urgent</span>
              </span>
            </div>
            {/* RUN-154: G3 curator card grid above the debug admin panel */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Review queue &middot; {SAMPLE_FLOWS.length} listed packages
                </h2>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[32px]"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 min-h-[32px]"
                  >
                    Pending review (12)
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded border border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100 min-h-[32px]"
                  >
                    Fraud flags (3)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                {SAMPLE_FLOWS.map((f) => (
                  <article
                    key={f.id}
                    className="p-4 border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow"
                    data-testid={`sfm-curator-card-${f.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{f.name}</h3>
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-200 text-emerald-700 bg-emerald-50">
                        {f.status.replace(/_/g, ' ').charAt(0) + f.status.replace(/_/g, ' ').slice(1).toLowerCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {f.category} &middot; {f.version} &middot; by {f.publisher}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {f.installs.toLocaleString()} installs
                      </span>
                      <span className="font-semibold text-amber-700">&#9733; {f.rating}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="flex-1 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 min-h-[32px]"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="flex-1 px-3 py-1.5 rounded border border-red-300 text-red-700 bg-red-50 text-xs font-medium hover:bg-red-100 min-h-[32px]"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <AdminCrudPanel
              slug="sharable-flows-marketplace"
              indexName="xiigen-sharable-flows-marketplace"
              title="Sharable Flows Marketplace"
              description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-sharable-flows-marketplace."
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
          </div>
        </RoleScopedView.Case>

        {/* Fallback — platform-support read-only + others */}
        <RoleScopedView.Fallback>
          {role === 'platform-support' ? (
            <div data-testid="sfm-support-view" className="p-4">
              <div
                data-testid="sfm-support-banner"
                className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
              >
                Read-only marketplace inspector. Search by package ID or publisher.
              </div>
              <div className="flex gap-2">
                <label htmlFor="sfm-support-search" className="sr-only">
                  Package ID or publisher ID
                </label>
                <input
                  id="sfm-support-search"
                  data-testid="sfm-support-search"
                  type="text"
                  placeholder="PKG-XXXX or publisher-id"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  data-testid="sfm-support-search-btn"
                  className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                  style={{ minHeight: '44px' }}
                >
                  Search
                </button>
              </div>
              <div
                data-testid="sfm-support-result"
                className="mt-3 p-3 border border-dashed border-gray-300 rounded text-sm text-gray-500 italic"
              >
                Enter a package ID or publisher ID to inspect.
              </div>
              <a
                href="/platform/support/escalate"
                data-testid="sfm-support-escalate"
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                Escalate marketplace issue →
              </a>
            </div>
          ) : (
            <div data-testid="sfm-fallback-view" className="p-4 text-sm text-gray-400">
              Flows marketplace is not available for your current role.
            </div>
          )}
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
