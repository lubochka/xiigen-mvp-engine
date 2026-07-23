/**
 * T626 AuctionBidProcessor Dashboard
 * FLOW-20: Ads Platform
 *
 * Role-aware screen (C6 / SK-539): FLOW-20 is the only fleet flow where
 * all 10 roles have at least partial coverage — every role sees the
 * consent banner (GDPR). Business-partner retains the full auction
 * dashboard; other roles see consent + role-appropriate surfaces.
 *
 * Introduces C6-E pattern (first in fleet): role-specific error
 * messaging. The same API error produces different guidance text per
 * role.
 */

import React, { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface AuctionData {
  auctionId: string;
  itemName: string;
  currentBidCents: number;
  timeRemainingMs: number;
  bidCount: number;
}

interface BudgetStatus {
  advertiserId: string;
  balanceCents: number;
  totalAllocatedCents: number;
  pendingBidsCents: number;
}

const AuctionDashboardPage: React.FC = () => {
  const { role } = useViewerRole();
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reportInput, setReportInput] = useState('');
  const [reportReason, setReportReason] = useState('Misleading content');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    // Only fetch advertising data for business-partner (advertiser) role
    if (role !== 'business-partner') {
      setLoading(false);
      return;
    }
    fetchAuctionData();
    const interval = setInterval(fetchAuctionData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const fetchAuctionData = async () => {
    try {
      const auctionsResponse = await fetch('/api/dynamic/xiigen-auction-audit?status=active');
      const budgetResponse = await fetch('/api/dynamic/xiigen-advertiser-budgets');

      if (!auctionsResponse.ok || !budgetResponse.ok) {
        throw new Error('Failed to fetch auction data');
      }

      const auctionsJson = await auctionsResponse.json();
      const budgetJson = await budgetResponse.json();
      const auctionsItems = (auctionsJson?.data?.items ?? []) as AuctionData[];
      const budgetItems = (budgetJson?.data?.items ?? []) as BudgetStatus[];

      setAuctions(auctionsItems);
      setBudget(budgetItems[0] ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedAuction || bidAmount <= 0) {
      setError('Please select an auction and enter a valid bid amount');
      return;
    }

    try {
      setSubmitting(true);
      // RUN-116: /api/dynamic/bids missing xiigen- prefix would 400 with
      // INVALID_INDEX. UX-FIX-THREE-TRACK-PLAN UX-3-F1 identifies this as
      // a root cause of the 'Failed to fetch' normal-state rendering.
      const response = await fetch('/api/dynamic/xiigen-auction-bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auctionId: selectedAuction,
          bidAmountCents: Math.floor(bidAmount * 100),
        }),
      });

      if (!response.ok) {
        // Human recovery language instead of raw statusText leak.
        const msg =
          response.status === 400
            ? 'We could not submit this bid. The auction may have just closed \u2014 refresh and try again.'
            : response.status >= 500
              ? 'The bidding service is briefly unavailable. Please try again in a moment.'
              : `We could not submit this bid. Please try again.`;
        throw new Error(msg);
      }

      setError(null);
      setBidAmount(0);
      setSelectedAuction(null);
      fetchAuctionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReportSubmitted(true);
  }

  const pageTitle =
    role === 'tenant-admin' ? 'Ad Moderation' :
    role === 'platform-admin' ? 'Platform Ads Overview' :
    role === 'platform-support' ? 'Campaign Inspector (Read-Only)' :
    (role === 'anonymous' || role === 'public-marketplace-visitor') ? 'Ads Information' :
    'Auction Dashboard'; // business-partner and others

  const consentCopy =
    role === 'anonymous' || role === 'public-marketplace-visitor'
      ? 'This page uses personalised advertising. '
      : role === 'business-partner'
        ? 'You are viewing the advertiser dashboard. Ad spend data is subject to our Advertiser Policy. '
        : role === 'tenant-admin'
          ? 'Ads shown in your tenant are subject to your moderation settings. '
          : role === 'platform-admin'
            ? 'Platform-level ad policy controls are available in the ops console. '
            : 'Ads appearing in your feed are personalised. ';

  const errorHeading =
    role === 'business-partner' ? 'Advertiser error:' :
    role === 'tenant-admin' ? 'Moderation error:' :
    role === 'platform-admin' ? 'Platform ads error:' :
    'Error:';

  const errorAction =
    role === 'business-partner' ? 'Check your campaign settings or contact your account manager.' :
    role === 'platform-admin' ? 'Check the platform ops console for system status.' :
    'Please try again or contact support.';

  if (loading && role === 'business-partner') {
    return (
      <div
        data-testid="page-auctiondashboard"
        data-viewer-role={role}
        className="min-h-screen bg-white p-8"
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>
          <div
            data-testid="ads-consent-banner"
            role="complementary"
            className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800"
          >
            {consentCopy}
            <a href="/ads/consent" data-testid="ads-consent-link" className="underline">
              Manage ad preferences
            </a>
          </div>
          <p className="text-gray-600">Loading auction data...</p>
        </div>
      </div>
    );
  }

  const availableBudgetCents = budget ? budget.balanceCents : 0;

  return (
    <div
      data-testid="page-auctiondashboard"
      data-viewer-role={role}
      className="min-h-screen bg-white p-8"
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{pageTitle}</h1>

        {/* Consent banner — always rendered outside RoleScopedView */}
        <div
          data-testid="ads-consent-banner"
          role="complementary"
          className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-sm text-yellow-800"
        >
          {consentCopy}
          <a href="/ads/consent" data-testid="ads-consent-link" className="underline">
            Manage ad preferences
          </a>
        </div>

        {/* Role-specific error — C6-E pattern, always rendered outside RoleScopedView */}
        {error && (
          <div
            role="alert"
            data-testid="ads-error-message"
            className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-800"
          >
            <p className="font-medium">{errorHeading}</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2 text-sm">{errorAction}</p>
          </div>
        )}

        <RoleScopedView role={role} testIdPrefix="ads-role">
          {/* Branch 1 — anonymous + public-marketplace-visitor */}
          <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
            <div data-testid="ads-public-view">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <p className="text-sm text-blue-900">
                  Ads appearing in the marketplace are served by XIIGen's auction system.
                </p>
              </div>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 mb-4">
                <li>Advertisers bid in real-time auctions for ad placement</li>
                <li>Ads are relevant to marketplace content and your browsing context</li>
                <li>You can manage your ad preferences at any time</li>
              </ul>
              <a
                href="/ads/consent"
                data-testid="ads-public-manage-prefs"
                className="text-sm text-blue-600 hover:underline"
              >
                Manage preferences →
              </a>
            </div>
          </RoleScopedView.Case>

          {/* Branch 2 — tenant-user + referral-user (consumer with report) */}
          <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
            <div data-testid="ads-user-view">
              <p className="text-sm text-gray-700 mb-2">
                Ads in your feed are personalised based on your activity.
              </p>
              <a
                href="/settings/ads"
                data-testid="ads-user-settings"
                className="text-sm text-blue-600 hover:underline"
              >
                Adjust ad settings →
              </a>

              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
                Report an inappropriate ad
              </h2>
              {reportSubmitted ? (
                <div
                  data-testid="ads-user-report-success"
                  className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800"
                >
                  Report submitted. Thank you for helping keep the marketplace safe.
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-3">
                  <div>
                    <label
                      htmlFor="ads-user-report-input"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Ad ID or description
                    </label>
                    <input
                      id="ads-user-report-input"
                      data-testid="ads-user-report-input"
                      type="text"
                      value={reportInput}
                      onChange={(e) => setReportInput(e.target.value)}
                      placeholder="e.g. ad-12345 or describe the ad"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ads-user-report-reason"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Reason
                    </label>
                    <select
                      id="ads-user-report-reason"
                      data-testid="ads-user-report-reason"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                    >
                      <option>Misleading content</option>
                      <option>Inappropriate content</option>
                      <option>Spam</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    data-testid="ads-user-report-submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Submit Report
                  </button>
                </form>
              )}
            </div>
          </RoleScopedView.Case>

          {/* Branch 3 — freelancer */}
          <RoleScopedView.Case when="freelancer">
            <div data-testid="ads-freelancer-view">
              <p className="text-sm text-gray-700 mb-3">
                Ads appear in the marketplace feed. You can promote your own gig listings as sponsored ads.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/freelancer/promote"
                  data-testid="ads-freelancer-promote"
                  className="inline-block border border-blue-600 text-blue-700 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50"
                >
                  Promote a gig
                </a>
                <a
                  href="/ads/consent"
                  data-testid="ads-freelancer-prefs"
                  className="text-sm text-blue-600 hover:underline self-center"
                >
                  Manage ad preferences →
                </a>
              </div>
            </div>
          </RoleScopedView.Case>

          {/* Branch 4 — business-partner (EXISTING DASHBOARD) */}
          <RoleScopedView.Case when="business-partner">
            <div data-testid="ads-advertiser-view">
              {/* RUN-111: business-partner 3 hero-tiles \u2192 summary row. */}
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-6">
                <span>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Available budget
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">
                    ${(availableBudgetCents / 100).toFixed(2)}
                  </span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Active auctions
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">{auctions.length}</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Pending bids
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">
                    ${((budget?.pendingBidsCents ?? 0) / 100).toFixed(2)}
                  </span>
                </span>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">Active Auctions</h2>
                {auctions.length === 0 ? (
                  <div
                    data-testid="auction-empty-state"
                    className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
                  >
                    <div className="mb-3 flex justify-center text-gray-400" aria-hidden="true">
                      <Target size={40} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active Auctions</h3>
                    <p className="text-sm text-gray-600">
                      No auction data has been seeded for this tenant. Auctions will appear here
                      once advertisers begin bidding.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auctions.map((auction) => {
                      const minutesRemaining = Math.floor(auction.timeRemainingMs / 60000);
                      const isSelected = selectedAuction === auction.auctionId;

                      return (
                        <div
                          key={auction.auctionId}
                          onClick={() => setSelectedAuction(auction.auctionId)}
                          className={`p-4 rounded-lg cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-100 border-2 border-blue-500'
                              : 'bg-gray-50 border border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-gray-900">{auction.itemName}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Current bid: ${(auction.currentBidCents / 100).toFixed(2)} • {auction.bidCount} bids
                              </p>
                            </div>
                            <div className="text-end">
                              <p className="text-sm font-medium text-gray-600">
                                {minutesRemaining}m remaining
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedAuction && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-semibold mb-4">Submit Bid</h3>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="bid-amount-input"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Bid Amount (USD)
                      </label>
                      <input
                        id="bid-amount-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        placeholder="0.00"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Available: ${(availableBudgetCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmitBid}
                        disabled={submitting || bidAmount <= 0 || bidAmount > availableBudgetCents / 100}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Submitting...' : 'Submit Bid'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAuction(null);
                          setBidAmount(0);
                        }}
                        className="px-6 py-2 bg-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-400">
                <p>Auction data updates every 5 seconds.</p>
              </div>
            </div>
          </RoleScopedView.Case>

          {/* Branch 5 — tenant-admin (moderation queue) */}
          <RoleScopedView.Case when="tenant-admin">
            <div data-testid="ads-admin-view">
              <div className="overflow-x-auto mb-4">
                <table data-testid="ads-admin-queue" className="w-full text-sm min-w-[720px]">
                  <thead className="bg-gray-50 text-start">
                    <tr>
                      <th className="p-2 font-medium">Ad</th>
                      <th className="p-2 font-medium">Advertiser</th>
                      <th className="p-2 font-medium">Status</th>
                      <th className="p-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="p-2">Summer Sale — 30% off</td>
                      <td className="p-2 text-gray-600">advertiser-abc</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          <span aria-hidden="true">●</span> Under review
                        </span>
                      </td>
                      <td className="p-2 space-x-2">
                        <button
                          data-testid="ads-admin-approve-0"
                          aria-label="Approve ad: Summer Sale"
                          className="text-emerald-700 text-sm font-medium hover:underline"
                        >
                          Approve
                        </button>
                        <button
                          data-testid="ads-admin-reject-0"
                          aria-label="Reject ad: Summer Sale"
                          className="text-red-700 text-sm font-medium hover:underline"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="p-2">Learn React in 30 days</td>
                      <td className="p-2 text-gray-600">advertiser-xyz</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                          <span aria-hidden="true">●</span> Active
                        </span>
                      </td>
                      <td className="p-2">
                        <button
                          data-testid="ads-admin-block-1"
                          aria-label="Block advertiser: advertiser-xyz"
                          className="text-red-700 text-sm font-medium hover:underline"
                        >
                          Block advertiser
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <a
                href="/admin/ads/settings"
                data-testid="ads-admin-settings"
                className="text-sm text-blue-600 hover:underline"
              >
                Manage tenant ad preferences →
              </a>
            </div>
          </RoleScopedView.Case>

          {/* Branch 6 — platform-admin (cross-tenant ops) */}
          <RoleScopedView.Case when="platform-admin">
            <div data-testid="ads-platform-admin-view">
              {/* RUN-111: platform-admin 3 hero-tiles \u2192 summary row. */}
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
                <span data-testid="ads-platform-advertisers">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Active advertisers (all tenants)
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">342</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="ads-platform-review-count">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Under policy review
                  </span>
                  <span className="tabular-nums font-semibold text-amber-700">7</span>
                  <span className="ml-1 text-slate-400 text-[11px]">needs review</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="ads-platform-spend">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Total ad spend today
                  </span>
                  <span className="tabular-nums font-semibold text-slate-900">$12,450</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/platform/ads/policy"
                  data-testid="ads-platform-policy-link"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Ad policy console →
                </a>
                <a
                  href="/platform/ads/algorithm"
                  data-testid="ads-platform-algo-link"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Auction algorithm settings →
                </a>
              </div>
            </div>
          </RoleScopedView.Case>

          {/* Branch 7 — platform-support */}
          <RoleScopedView.Case when="platform-support">
            <div data-testid="ads-support-view">
              <div className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700">
                Read-only ad inspector. Use this to look up campaigns referenced in support tickets.
              </div>
              <div className="flex gap-2 mb-3">
                <label htmlFor="ads-support-search" className="sr-only">
                  Campaign ID or Advertiser ID
                </label>
                <input
                  id="ads-support-search"
                  data-testid="ads-support-search"
                  type="text"
                  placeholder="Campaign ID or Advertiser ID"
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                />
                <button
                  data-testid="ads-support-search-btn"
                  className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                >
                  Search
                </button>
              </div>
              <div
                data-testid="ads-support-result"
                className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
              >
                Enter a Campaign ID to inspect
              </div>
              <a
                href="/platform/escalate"
                data-testid="ads-support-escalate"
                className="inline-block mt-3 text-sm text-blue-600 hover:underline"
              >
                Escalate ad dispute to platform admin →
              </a>
            </div>
          </RoleScopedView.Case>

          {/* Fallback */}
          <RoleScopedView.Fallback>
            <div data-testid="ads-fallback-view" className="text-center py-8">
              <p className="text-gray-700 mb-3">
                Ad management is not available for your current role.
              </p>
              <a href="/" className="text-blue-600 hover:underline">
                Go to Dashboard →
              </a>
            </div>
          </RoleScopedView.Fallback>
        </RoleScopedView>
      </div>
    </div>
  );
};

export default AuctionDashboardPage;
