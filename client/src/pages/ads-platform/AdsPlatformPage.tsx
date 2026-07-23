/**
 * AdsPlatformPage — FLOW-20 mock-states stub for Ads Platform (ads-platform).
 *
 * V-R15 Wave 1 Fix #1: previous render showed the CampaignDashboard with
 * live campaign budgets, CTR, spend ledger, and "bid editable inline"
 * hint to ALL roles (anon/tenant-user/tenant-admin/business-partner) —
 * an info-disclosure bug that V-R14 Batch A flagged as BLOCK. Content
 * is now role-gated:
 *
 *   platform-admin / platform-support → full CampaignDashboard
 *   tenant-admin                       → tenant-scoped ad-spend summary
 *   business-partner                   → partner marketing stub
 *   tenant-user                        → "Ad console restricted" info card
 *   anonymous / public-marketplace-vis → marketing CTA (Advertise on XIIGen)
 *
 * Also fixes populated-anonymous admin-view subtitle leak: the
 * BusinessStateCard description is redacted for consumer-facing roles.
 */

import React from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { CampaignDashboard } from '../../components/ads-platform/CampaignDashboard';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'auction-open': {
    idx: 1,
    label: 'Auction opened — slot eligible for bids',
    status: 'ACTIVE',
    fields: {
      auctionId: 'AUC-2026-0419-001',
      slotKey: 'homepage-banner-top',
      reservePriceCents: '2500',
      openedAt: '2026-04-19 09:00',
    },
  },
  'bid-received': {
    idx: 2,
    label: 'Bid submitted by advertiser — awaiting validation',
    status: 'RECEIVED',
    fields: {
      auctionId: 'AUC-2026-0419-001',
      bidId: 'BID-2026-0419-0042',
      advertiserId: 'ADV-acme-co',
      bidAmountCents: '3200',
      receivedAt: '2026-04-19 09:04',
    },
  },
  'consent-missing': {
    idx: 3,
    label: 'Viewer consent missing — bid rejected by the dual consent-and-policy gate',
    status: 'BLOCKED',
    fields: {
      bidId: 'BID-2026-0419-0043',
      viewerId: 'usr-9820',
      reason: 'CONSENT_MISSING',
      tenantId: 'tenant-master',
    },
  },
  'fraud-checked': {
    idx: 4,
    label: 'Pre-billing fraud check completed — bid cleared',
    status: 'FRAUD_CHECKED',
    fields: {
      bidId: 'BID-2026-0419-0042',
      fraudScore: '0.07',
      decision: 'FRAUD_CHECK_PASSED',
      checkedAt: '2026-04-19 09:05',
    },
  },
  'fraud-detected': {
    idx: 5,
    label: 'Fraud signal detected — bid halted, advertiser flagged',
    status: 'VIOLATION_DETECTED',
    fields: {
      bidId: 'BID-2026-0419-0099',
      fraudScore: '0.92',
      signal: 'BURST_BID_PATTERN',
      flaggedAt: '2026-04-19 09:06',
    },
  },
  'bid-accepted': {
    idx: 6,
    label: 'Bid accepted — spend ledger debited',
    status: 'ACCEPTED',
    fields: {
      bidId: 'BID-2026-0419-0042',
      advertiserId: 'ADV-acme-co',
      winningPriceCents: '3200',
      ledgerEntryId: 'LED-2026-0419-00017',
    },
  },
  'political-review': {
    idx: 7,
    label: 'Political-content classification ambiguous — routed to human reviewer',
    status: 'PENDING_HUMAN_REVIEW',
    fields: {
      creativeId: 'CRT-2026-0419-012',
      ambiguityScore: '0.48',
      reviewerQueue: 'political-content-queue',
      queuedAt: '2026-04-19 09:10',
    },
  },
  'auction-closed': {
    idx: 8,
    label: 'Auction closed — winning creative served, ledger finalized',
    status: 'CLOSED',
    fields: {
      auctionId: 'AUC-2026-0419-001',
      winningBidId: 'BID-2026-0419-0042',
      closedAt: '2026-04-19 09:15',
      totalBidsReceived: '7',
    },
  },
};

// Roles that may see engine-side admin detail (ledger IDs, internal state names,
// dev-oriented subtitle copy). Everyone else sees a label-only card.
const ADMIN_CONSUMERS = new Set(['platform-admin', 'platform-support']);

export function AdsPlatformPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  // Populated path: role-gate the field grid + the admin subtitle so anonymous
  // users do not see "Admin view of auctions, bids, consent gating, fraud
  // checks, and spend ledger."
  if (mockState && MOCK_STATES[mockState]) {
    const raw = MOCK_STATES[mockState];
    const isAdmin = ADMIN_CONSUMERS.has(role);
    const safeState: BusinessState = isAdmin
      ? raw
      : { idx: raw.idx, label: raw.label, status: raw.status };
    return (
      <BusinessStateCard
        slug="ads-platform"
        flowId="FLOW-20"
        title="Ads Platform"
        state={safeState}
        description={
          isAdmin
            ? 'Admin view of auctions, bids, consent gating, fraud checks, and spend ledger.'
            : 'Status of the ads pipeline. Operational details are shown to platform administrators only.'
        }
      />
    );
  }

  // Anonymous / public-marketplace-visitor — marketing kiosk, NO admin data.
  if (role === 'anonymous' || role === 'public-marketplace-visitor') {
    return (
      <div
        className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow text-center"
        data-testid="ads-platform-page"
        data-viewer-role={role}
      >
        <div className="text-5xl mb-3" aria-hidden="true">📢</div>
        <h1
          className="text-2xl font-bold text-gray-900 mb-2"
          data-testid="page-ads-platform"
        >
          Advertise on XIIGen
        </h1>
        <p className="text-gray-600 mb-6">
          Reach active workspace users and event attendees with slot-based auctions.
          Sign in as an advertiser to set up your first campaign.
        </p>
        <NavLink
          to="/register?intent=advertiser"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
        >
          Apply to advertise
        </NavLink>
        <p className="mt-4 text-xs text-gray-500">
          Already an advertiser? <NavLink to="/login" className="text-blue-600 hover:underline">Sign in</NavLink>
        </p>
      </div>
    );
  }

  // Tenant-user — explicit restriction message. No bid data, no budgets.
  if (role === 'tenant-user' || role === 'referral-user') {
    return (
      <div
        className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-lg shadow"
        data-testid="ads-platform-page"
        data-viewer-role={role}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🔒</span>
          <div>
            <h1
              className="text-lg font-semibold text-gray-900"
              data-testid="page-ads-platform"
            >
              Ads console is restricted
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              The ads console is available to your workspace administrator and
              to platform administrators. If your workspace is running campaigns,
              contact your admin to review budgets or performance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Business-partner — partner-side summary (no internal bid/budget/CTR).
  if (role === 'business-partner') {
    return (
      <div
        className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow"
        data-testid="ads-platform-page"
        data-viewer-role={role}
      >
        <h1
          className="text-2xl font-bold text-gray-900 mb-1"
          data-testid="page-ads-platform"
        >
          Partner advertising
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Summary of your campaign placements across XIIGen workspaces.
          Contact your account manager to activate a new slot.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-blue-900 font-semibold">
              Active placements
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">3</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-emerald-900 font-semibold">
              Impressions (30 days)
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">124,000</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-purple-900 font-semibold">
              Contract status
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1">Net-30</div>
            <div className="text-xs text-purple-600 mt-0.5">Renews 2026-08</div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Invoices and bid-level detail are handled by your account manager, not in this console.
          <a href="/invoicing" className="text-blue-600 hover:underline ml-2">Open partner invoicing →</a>
        </p>
      </div>
    );
  }

  // Tenant-admin — tenant-scoped ad spend summary, NOT cross-tenant bid data.
  if (role === 'tenant-admin') {
    return (
      <div
        className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-lg shadow"
        data-testid="ads-platform-page"
        data-viewer-role={role}
      >
        <h1
          className="text-2xl font-bold text-gray-900 mb-1"
          data-testid="page-ads-platform"
        >
          Your workspace ad spend
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Totals and placements for your workspace only. Cross-tenant bid
          auctions, fraud detection, and spend ledger are managed by platform
          administrators.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-blue-900 font-semibold">
              Spend (this month)
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">$1,420</div>
            <div className="text-xs text-blue-600 mt-0.5">Budget cap $2,000</div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-emerald-900 font-semibold">
              Active placements
            </div>
            <div className="text-2xl font-bold text-emerald-700 mt-1">2</div>
            <div className="text-xs text-emerald-600 mt-0.5">1 scheduled next week</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="text-xs uppercase tracking-wide text-amber-900 font-semibold">
              Impressions (7 days)
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">14,820</div>
          </div>
        </div>
        <div className="rounded border border-gray-200">
          <div className="bg-gray-50 px-4 py-2 text-xs uppercase tracking-wide text-gray-600 font-semibold">
            Your placements
          </div>
          <div className="divide-y">
            <div className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium text-gray-900">Homepage banner — top</div>
                <div className="text-xs text-gray-500">Running · renews 2026-05-01</div>
              </div>
              <div className="text-right text-sm">
                <span className="text-gray-700 tabular-nums">$860 / mo</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium text-gray-900">Event sidebar</div>
                <div className="text-xs text-gray-500">Running · renews 2026-05-12</div>
              </div>
              <div className="text-right text-sm">
                <span className="text-gray-700 tabular-nums">$560 / mo</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Need to pause a placement or adjust budget? Contact your account manager or
          <a href="/billing-dashboard" className="text-blue-600 hover:underline ml-1">open billing →</a>
        </p>
      </div>
    );
  }

  // Default: platform-admin / platform-support — full campaign ops dashboard.
  const canSeeRawIndex = role === 'platform-admin' || role === 'platform-support';
  return (
    <div className="p-6" data-testid="ads-platform-page" data-viewer-role={role}>
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-900" data-testid="page-ads-platform">
          Ads platform
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Running campaigns, budgets, CTR, and spend — read the metric tiles for 7-day totals. Click
          any bid to edit inline.
        </p>
      </header>

      <CampaignDashboard />

      {canSeeRawIndex && (
        <details
          className="mt-6 border border-gray-200 rounded bg-white"
          data-testid="ads-platform-raw-index-details"
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
            Raw ads-platform index (admin debug)
          </summary>
          <AdminCrudPanel
            slug="ads-platform"
            indexName="xiigen-ads-platform"
            title="Ads Platform"
            description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-ads-platform."
            classification="ENGINE_INTERNAL"
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
      )}
    </div>
  );
}
