/**
 * MarketplacePage — browse marketplace packages + install in Linked mode.
 *
 * V-R15 Wave 1 Fix #6: previously rendered an identical dynamic-CRUD table
 * with TITLE/DESCRIPTION/NODES/PUBLISHER/ACTION columns to ALL 7 roles
 * (anon/public-visitor/tenant-user/business-partner/tenant-admin/...)
 * with an "Install" button visible to anonymous. V-R14 flagged this as
 * auto-BLOCK (Layer 4: dyn_crud_table_on_tenant_or_public + NODES
 * engineering-term column + identical-across-roles).
 *
 * Fix:
 *   - Card-based grid instead of CRUD table
 *   - Role-branched:
 *       anonymous / public-visitor → "Sign in to install" on each card
 *       tenant-user               → "Ask your admin" (no install button)
 *       tenant-admin / platform-* → Install button
 *   - Publisher IDs humanized (tenant-acme → "Acme Corp")
 *   - NODES column dropped — replaced with tag chips
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMarketplace, MarketplacePackageSummary } from '../hooks/useMarketplace';
import { useViewerRole } from '../hooks/useViewerRole';

const ACME_USER_REGISTRATION_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-user-registration-acme-pro-members',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-04-30',
  title: 'Acme Pro Members Registration',
  description:
    'User registration adapted for Acme Pro Members with one-hour verification links, a fifteen-minute resend window, and Acme-branded community invitations.',
  sourceFlowId: 'user-registration',
  sourceVersion: '1.0.1',
  tags: ['Registration', 'Verification', 'Onboarding', 'Acme'],
};

const NORTHWIND_USER_REGISTRATION_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-user-registration-northwind-guild',
  publisherTenantId: 'northwind',
  publishedAt: '2026-04-30',
  title: 'Northwind Guild Registration',
  description:
    'User registration that preserves Acme Pro Members invitation copy and one-hour verification links while tightening the resend window to five minutes for Northwind Guild.',
  sourceFlowId: 'user-registration',
  sourceVersion: '1.0.2',
  tags: ['Registration', 'Verification', 'Northwind', 'Five-minute resend'],
};

const ACME_PROFILE_ENRICHMENT_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-profile-enrichment-acme-pro-matching',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-04-29',
  title: 'Acme Pro Matching',
  description:
    'Profile enrichment tuned for industry-first peer matching, faster match targets, and remote-friendly professional communities.',
  sourceFlowId: 'profile-enrichment',
  sourceVersion: '1.0.1',
  tags: ['Profile', 'Matching', 'Industry-first', 'Remote-friendly'],
};

const NORTHWIND_PROFILE_ENRICHMENT_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-profile-enrichment-northwind-partner-matching',
  publisherTenantId: 'northwind',
  publishedAt: '2026-04-29',
  title: 'Northwind Partner Matching',
  description:
    'Profile enrichment that preserves Acme Pro Matching and adds stronger team-size fit for partner discovery.',
  sourceFlowId: 'profile-enrichment',
  sourceVersion: '1.0.2',
  tags: ['Profile', 'Matching', 'Partners', 'Team fit'],
};

const TESSERA_PROFILE_ENRICHMENT_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-profile-enrichment-tessera-community-matching',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-04-29',
  title: 'Tessera Community Matching',
  description:
    'Profile enrichment that preserves the Acme and Northwind cascade while raising location fit for community-based matching.',
  sourceFlowId: 'profile-enrichment',
  sourceVersion: '1.0.3',
  tags: ['Profile', 'Matching', 'Community', 'Location fit'],
};

const ACME_COMPLETION_GAMIFICATION_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-completion-gamification-acme-learning-rewards',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-03',
  title: 'Acme Learning Rewards',
  description:
    'Completion gamification adapted for Acme learners with a stronger high-score reward: fifteen base points, ten bonus points, and a clear next-lesson handoff.',
  sourceFlowId: 'completion-gamification',
  sourceVersion: '1.0.1',
  tags: ['Completion', 'Rewards', 'Acme', 'High-score bonus'],
};

const NORTHWIND_COMPLETION_GAMIFICATION_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-completion-gamification-northwind-momentum-rewards',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-03',
  title: 'Northwind Momentum Rewards',
  description:
    'Completion gamification that preserves Acme Learning Rewards and adds a four-hour streak grace window for late-night learners.',
  sourceFlowId: 'completion-gamification',
  sourceVersion: '1.0.2',
  tags: ['Completion', 'Rewards', 'Northwind', 'Four-hour grace'],
};

const ACME_QUIET_COMMUNITY_FEED_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-friend-request-social-feed-acme-quiet-community-feed',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-03',
  title: 'Acme Quiet Community Feed',
  description:
    'Friend requests and social feed adapted for quieter Acme communities: relevance score 0.35, up to 12 updates per accepted connection, and unchanged privacy checks.',
  sourceFlowId: 'friend-request-social-feed',
  sourceVersion: '1.0.1',
  tags: ['Social feed', 'Friend requests', 'Acme', 'Quiet feed'],
};

const NORTHWIND_FRESH_TRUST_FEED_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-friend-request-social-feed-northwind-fresh-trust-feed',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-03',
  title: 'Northwind Fresh Trust Feed',
  description:
    'Northwind version preserves Acme quiet delivery at score 0.35 and 12 updates, then adds freshness-weighted scoring with 0.65 recency, 0.25 relationship, and 0.10 activity.',
  sourceFlowId: 'friend-request-social-feed',
  sourceVersion: '1.0.2',
  tags: ['Social feed', 'Friend requests', 'Northwind', 'Fresh trust'],
};

const TESSERA_COMMUNITY_BRIDGE_FEED_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-friend-request-social-feed-tessera-community-bridge-feed',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-03',
  title: 'Tessera Community Bridge Feed',
  description:
    'Tessera version preserves Acme quiet delivery and Northwind freshness scoring, then adds bridge notifications through push and email.',
  sourceFlowId: 'friend-request-social-feed',
  sourceVersion: '1.0.0',
  tags: ['Social feed', 'Friend requests', 'Tessera', 'Bridge notifications'],
};

const ACME_LAUNCH_BUNDLES_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-bundle-activation-acme-launch-bundles',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-04',
  title: 'Acme Launch Bundles',
  description:
    'Acme launch teams use Check bundle readiness, support through Acme launch desk, and about 9 seconds for full launches.',
  sourceFlowId: 'bundle-activation',
  sourceVersion: '1.0.1',
  tags: ['Bundles', 'Launch readiness', 'Acme', 'Support desk'],
};

const NORTHWIND_LAUNCH_BUNDLES_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-bundle-activation-northwind-launch-bundles',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-05',
  title: 'Northwind Launch Bundles',
  description:
    'Northwind branch teams use Confirm branch readiness, support through Northwind branch ops, and about 11 seconds for full launches.',
  sourceFlowId: 'bundle-activation',
  sourceVersion: '1.0.2',
  tags: ['Bundles', 'Branch readiness', 'Northwind', 'Branch ops'],
};

const TESSERA_COMMUNITY_BUNDLES_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-bundle-activation-tessera-community-bundles',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-05',
  title: 'Tessera Community Bundles',
  description:
    'Tessera coordinators use Confirm circle readiness, support through Tessera community ops, and about 12 seconds for full launches.',
  sourceFlowId: 'bundle-activation',
  sourceVersion: '1.0.3',
  tags: ['Bundles', 'Circle readiness', 'Tessera', 'Community ops'],
};

const ACME_CURATED_MARKETPLACE_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-marketplace-acme-curated-marketplace',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-05',
  title: 'Acme Curated Marketplace',
  description:
    'Acme curated marketplace: service-first listings, partner-friendly presentation, and launch-stage price cap of 5000.',
  sourceFlowId: 'marketplace',
  sourceVersion: '1.0.1',
  tags: ['Marketplace', 'Service listings', 'Acme', 'Price cap'],
};

const NORTHWIND_PARTNER_MARKETPLACE_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-marketplace-northwind-partner-marketplace',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-05',
  title: 'Northwind Partner Marketplace',
  description:
    'Northwind partner marketplace: preserves Acme service-first listings, raises launch price cap to 7500, and adds sponsor-ready partner positioning.',
  sourceFlowId: 'marketplace',
  sourceVersion: '1.0.2',
  tags: ['Marketplace', 'Partner listings', 'Northwind', 'Price cap'],
};

const TESSERA_COMMUNITY_MARKETPLACE_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-marketplace-tessera-community-marketplace',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-05',
  title: 'Tessera Community Marketplace',
  description:
    'Tessera community marketplace: preserves Acme and Northwind cascade history, raises community launch price cap to 9000, and adds cooperative curation signals.',
  sourceFlowId: 'marketplace',
  sourceVersion: '1.0.3',
  tags: ['Marketplace', 'Community', 'Tessera', 'Curation'],
};

const ACME_FAST_RELEASE_TICKETING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-transactional-event-participation-acme-fast-release-ticketing',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-05',
  title: 'Acme Fast-Release Ticketing',
  description:
    'Transactional event participation adapted for Acme: 3-minute seat holds, 48-hour refunds, 4% platform fee, 3.1% processing fee, and same-day capacity updates.',
  sourceFlowId: 'transactional-event-participation',
  sourceVersion: '1.0.1',
  tags: ['Ticketing', 'Fast release', 'Acme', 'Refund policy'],
};

const NORTHWIND_EXCHANGE_TICKETING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-transactional-event-participation-northwind-exchange-ticketing',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-05',
  title: 'Northwind Exchange Ticketing',
  description:
    'Transactional event participation adapted for Northwind: 4-minute seat holds, 72-hour refunds, 3.5% platform fee, 2.8% processing fee, and reviewed capacity changes.',
  sourceFlowId: 'transactional-event-participation',
  sourceVersion: '1.0.2',
  tags: ['Ticketing', 'Exchange', 'Northwind', 'Refund policy'],
};

const TESSERA_INSTALLED_NORTHWIND_EXCHANGE_TICKETING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-transactional-event-participation-tessera-installed-northwind-exchange-ticketing',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-05',
  title: 'Tessera Installed Northwind Exchange Ticketing',
  description:
    'Tessera installed Northwind exchange ticketing with 4-minute seat holds, 72-hour refunds, 3.5% platform fee, 2.8% processing fee, and reviewed capacity changes.',
  sourceFlowId: 'transactional-event-participation',
  sourceVersion: '1.0.2',
  tags: ['Ticketing', 'Tessera', 'Northwind policy', 'Install proof'],
};

const TESSERA_COMMUNITY_TICKETING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-transactional-event-participation-tessera-community-ticketing',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-05',
  title: 'Tessera Community Ticketing',
  description:
    'Transactional event participation adapted for Tessera: 5-minute seat holds, 96-hour refunds, 3.2% platform fee, 2.5% processing fee, and steward-led same-day capacity updates.',
  sourceFlowId: 'transactional-event-participation',
  sourceVersion: '1.0.3',
  tags: ['Ticketing', 'Community', 'Tessera', 'Steward updates'],
};

const ACME_VERIFIED_TRUST_REVIEWS_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-reviews-reputation-acme-verified-trust-reviews',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-05',
  title: 'Acme Verified-Trust Reviews',
  description:
    'Reviews and reputation adapted for Acme: 92% auto-approve threshold, 20% quarantine floor, and stronger recent-review weighting.',
  sourceFlowId: 'reviews-reputation',
  sourceVersion: '1.0.1',
  tags: ['Reviews', 'Reputation', 'Acme', 'Trust policy'],
};

const NORTHWIND_TRUST_SIGNAL_REVIEWS_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-reviews-reputation-northwind-trust-signal-reviews',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-05',
  title: 'Northwind Trust-Signal Reviews',
  description:
    'Reviews and reputation adapted for Northwind: 88% auto-approve threshold, 15% quarantine floor, and longer-tail reputation weighting while preserving Acme history.',
  sourceFlowId: 'reviews-reputation',
  sourceVersion: '1.0.2',
  tags: ['Reviews', 'Reputation', 'Northwind', 'Trust signals'],
};

const TESSERA_COMMUNITY_TRUST_REVIEWS_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-reviews-reputation-tessera-community-trust-reviews',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-05',
  title: 'Tessera Community-Trust Reviews',
  description:
    'Reviews and reputation adapted for Tessera: 90% auto-approve threshold, 12% quarantine floor, and community-weighted reputation decay while preserving Acme and Northwind history.',
  sourceFlowId: 'reviews-reputation',
  sourceVersion: '1.0.3',
  tags: ['Reviews', 'Reputation', 'Tessera', 'Community trust'],
};

const ACME_ENTERPRISE_BILLING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-subscription-billing-acme-enterprise-billing',
  publisherTenantId: 'acme-corp',
  publishedAt: '2026-05-06',
  title: 'Acme Enterprise Billing',
  description:
    'Subscription billing adapted for Acme: 30-day trial defaults, gentler failed-payment retries, two-year plan audit retention, and quarterly billing analytics.',
  sourceFlowId: 'subscription-billing',
  sourceVersion: '1.0.1',
  tags: ['Billing', 'Subscriptions', 'Acme', 'Enterprise policy'],
};

const NORTHWIND_REVENUE_RECOVERY_BILLING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-subscription-billing-northwind-revenue-recovery-billing',
  publisherTenantId: 'northwind',
  publishedAt: '2026-05-06',
  title: 'Northwind Revenue Recovery Billing',
  description:
    'Subscription billing adapted for Northwind: 21-day trials, four-step recovery, three-year audit retention, and 120-day analytics while preserving Acme history.',
  sourceFlowId: 'subscription-billing',
  sourceVersion: '1.0.2',
  tags: ['Billing', 'Subscriptions', 'Northwind', 'Revenue recovery'],
};

const TESSERA_COMMUNITY_BILLING_PACKAGE: MarketplacePackageSummary = {
  packageId: 'pkg-subscription-billing-tessera-community-billing',
  publisherTenantId: 'tessera-collective',
  publishedAt: '2026-05-06',
  title: 'Tessera Community Billing',
  description:
    'Subscription billing adapted for Tessera: 28-day trials, community-paced recovery, four-year audit retention, and 180-day analytics while preserving Acme and Northwind history.',
  sourceFlowId: 'subscription-billing',
  sourceVersion: '1.0.3',
  tags: ['Billing', 'Subscriptions', 'Tessera', 'Community billing'],
};

const SEED_PACKAGES: MarketplacePackageSummary[] = [
  TESSERA_COMMUNITY_BILLING_PACKAGE,
  NORTHWIND_REVENUE_RECOVERY_BILLING_PACKAGE,
  ACME_ENTERPRISE_BILLING_PACKAGE,
  TESSERA_COMMUNITY_TRUST_REVIEWS_PACKAGE,
  NORTHWIND_TRUST_SIGNAL_REVIEWS_PACKAGE,
  ACME_VERIFIED_TRUST_REVIEWS_PACKAGE,
  TESSERA_COMMUNITY_TICKETING_PACKAGE,
  TESSERA_INSTALLED_NORTHWIND_EXCHANGE_TICKETING_PACKAGE,
  NORTHWIND_EXCHANGE_TICKETING_PACKAGE,
  ACME_FAST_RELEASE_TICKETING_PACKAGE,
  TESSERA_COMMUNITY_MARKETPLACE_PACKAGE,
  NORTHWIND_PARTNER_MARKETPLACE_PACKAGE,
  ACME_CURATED_MARKETPLACE_PACKAGE,
  TESSERA_COMMUNITY_BUNDLES_PACKAGE,
  NORTHWIND_LAUNCH_BUNDLES_PACKAGE,
  ACME_LAUNCH_BUNDLES_PACKAGE,
  TESSERA_COMMUNITY_BRIDGE_FEED_PACKAGE,
  NORTHWIND_FRESH_TRUST_FEED_PACKAGE,
  ACME_QUIET_COMMUNITY_FEED_PACKAGE,
  NORTHWIND_COMPLETION_GAMIFICATION_PACKAGE,
  ACME_COMPLETION_GAMIFICATION_PACKAGE,
  NORTHWIND_USER_REGISTRATION_PACKAGE,
  ACME_USER_REGISTRATION_PACKAGE,
  TESSERA_PROFILE_ENRICHMENT_PACKAGE,
  NORTHWIND_PROFILE_ENRICHMENT_PACKAGE,
  ACME_PROFILE_ENRICHMENT_PACKAGE,
  {
    packageId: 'pkg-flow-event-raffle',
    publisherTenantId: 'tenant-acme',
    publishedAt: '2026-04-12',
    title: 'Event Raffle Manager',
    description: 'End-to-end raffle workflow for events: entries, draws, winner announcements.',
    sourceFlowId: 'flow-raffle-manager',
    sourceVersion: '1.2.0',
    tags: ['Events', 'Raffle', 'Automation'],
  },
  {
    packageId: 'pkg-stripe-payment-gateway',
    publisherTenantId: 'tenant-payments-co',
    publishedAt: '2026-04-08',
    title: 'Stripe Payment Gateway',
    description: 'Drop-in checkout + escrow release + refund workflow powered by Stripe.',
    sourceFlowId: 'flow-stripe-payments',
    sourceVersion: '2.1.0',
    tags: ['Payments', 'Stripe', 'Checkout'],
  },
  {
    packageId: 'pkg-analytics-dashboard-pro',
    publisherTenantId: 'tenant-insights',
    publishedAt: '2026-04-02',
    title: 'Analytics Dashboard Pro',
    description: 'Multi-tenant analytics with cohort retention, funnel charts, and CSV export.',
    sourceFlowId: 'flow-analytics-pro',
    sourceVersion: '3.0.1',
    tags: ['Analytics', 'Dashboard', 'Reporting'],
  },
];

// Humanize publisher tenant IDs to display-friendly names. Falls back to
// the raw ID if no mapping known.
const PUBLISHER_DISPLAY_NAMES: Record<string, string> = {
  'tenant-acme': 'Acme Corp',
  'acme-corp': 'Acme Corp',
  northwind: 'Northwind',
  'tessera-collective': 'Tessera Collective',
  'tenant-payments-co': 'Payments Co',
  'tenant-insights': 'Insights Labs',
};

function humanizePublisher(id: string): string {
  return (
    PUBLISHER_DISPLAY_NAMES[id] ??
    // Last-ditch: strip 'tenant-' and title-case words
    id
      .replace(/^tenant-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { role } = useViewerRole();
  const { packages, loading, error, installing, refresh, install } = useMarketplace();
  const showcase = searchParams.get('showcase');
  const basePackages = packages.length > 0 ? packages : SEED_PACKAGES;
  const showcasedPackage =
    showcase === 'user-registration-v1.0.1'
      ? ACME_USER_REGISTRATION_PACKAGE
      : showcase === 'user-registration-v1.0.2'
      ? NORTHWIND_USER_REGISTRATION_PACKAGE
      : showcase === 'profile-enrichment-v1.0.3'
      ? TESSERA_PROFILE_ENRICHMENT_PACKAGE
      : showcase === 'profile-enrichment-v1.0.2'
      ? NORTHWIND_PROFILE_ENRICHMENT_PACKAGE
      : showcase === 'profile-enrichment-v1.0.1'
        ? ACME_PROFILE_ENRICHMENT_PACKAGE
        : showcase === 'completion-gamification-v1.0.1'
          ? ACME_COMPLETION_GAMIFICATION_PACKAGE
        : showcase === 'completion-gamification-v1.0.2'
          ? NORTHWIND_COMPLETION_GAMIFICATION_PACKAGE
        : showcase === 'friend-request-social-feed-v1.0.1'
          ? ACME_QUIET_COMMUNITY_FEED_PACKAGE
        : showcase === 'friend-request-social-feed-v1.0.2'
          ? NORTHWIND_FRESH_TRUST_FEED_PACKAGE
        : showcase === 'friend-request-social-feed-tenant-c-v1.0.0'
          ? TESSERA_COMMUNITY_BRIDGE_FEED_PACKAGE
        : showcase === 'bundle-activation-v1.0.1'
          ? ACME_LAUNCH_BUNDLES_PACKAGE
        : showcase === 'bundle-activation-v1.0.2'
          ? NORTHWIND_LAUNCH_BUNDLES_PACKAGE
        : showcase === 'bundle-activation-v1.0.3'
          ? TESSERA_COMMUNITY_BUNDLES_PACKAGE
        : showcase === 'marketplace-v1.0.1'
          ? ACME_CURATED_MARKETPLACE_PACKAGE
        : showcase === 'marketplace-v1.0.2'
          ? NORTHWIND_PARTNER_MARKETPLACE_PACKAGE
        : showcase === 'marketplace-v1.0.3'
          ? TESSERA_COMMUNITY_MARKETPLACE_PACKAGE
        : showcase === 'transactional-event-participation-v1.0.1'
          ? ACME_FAST_RELEASE_TICKETING_PACKAGE
        : showcase === 'transactional-event-participation-v1.0.2'
          ? NORTHWIND_EXCHANGE_TICKETING_PACKAGE
        : showcase === 'transactional-event-participation-tenant-c-installed-v1.0.2'
          ? TESSERA_INSTALLED_NORTHWIND_EXCHANGE_TICKETING_PACKAGE
        : showcase === 'transactional-event-participation-v1.0.3'
          ? TESSERA_COMMUNITY_TICKETING_PACKAGE
        : showcase === 'reviews-reputation-v1.0.1'
          ? ACME_VERIFIED_TRUST_REVIEWS_PACKAGE
        : showcase === 'reviews-reputation-v1.0.2'
          ? NORTHWIND_TRUST_SIGNAL_REVIEWS_PACKAGE
        : showcase === 'reviews-reputation-v1.0.3'
          ? TESSERA_COMMUNITY_TRUST_REVIEWS_PACKAGE
        : showcase === 'subscription-billing-v1.0.1'
          ? ACME_ENTERPRISE_BILLING_PACKAGE
        : showcase === 'subscription-billing-v1.0.2'
          ? NORTHWIND_REVENUE_RECOVERY_BILLING_PACKAGE
        : showcase === 'subscription-billing-v1.0.3'
          ? TESSERA_COMMUNITY_BILLING_PACKAGE
        : null;
  const displayedPackages = showcasedPackage
    ? [showcasedPackage, ...basePackages.filter((p) => p.packageId !== showcasedPackage.packageId)]
    : basePackages;

  const handleInstall = async (packageId: string) => {
    const ok = await install(packageId);
    if (ok) {
      navigate('/flow-library');
    }
  };

  const canInstall =
    role === 'tenant-admin' || role === 'platform-admin' || role === 'platform-support';
  const isAuthenticated =
    role !== 'anonymous' && role !== 'public-marketplace-visitor';

  return (
    <div className="p-6 max-w-6xl" data-testid="marketplace-page" data-viewer-role={role}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-500">
            {loading
              ? 'Loading packages…'
              : `${displayedPackages.length} published package${displayedPackages.length === 1 ? '' : 's'} available`}
          </p>
        </div>
        <button
          data-testid="marketplace-refresh"
          onClick={() => void refresh()}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          data-testid="marketplace-error"
          role="status"
          className="p-4 mb-4 bg-slate-50 border border-slate-200 text-slate-700 rounded"
        >
          <p className="text-sm">
            Live packages are unavailable right now — showing a sample of popular listings below.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800 underline"
            data-testid="marketplace-error-retry"
          >
            Try again
          </button>
        </div>
      )}

      {/* Role-aware banner */}
      {!isAuthenticated && (
        <div
          className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
          data-testid="marketplace-signin-banner"
        >
          Browsing as a guest.{' '}
          <a href="/login" className="font-medium text-blue-700 hover:underline">
            Sign in
          </a>{' '}
          to install a package into your workspace.
        </div>
      )}
      {isAuthenticated && !canInstall && (
        <div
          className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-sm text-amber-900"
          data-testid="marketplace-admin-only-banner"
        >
          Packages can be installed by your workspace administrator. You can browse the catalog
          and request an install below.
        </div>
      )}

      {/* Card grid */}
      {displayedPackages.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="marketplace-cards"
        >
          {displayedPackages.map((p) => (
            <MarketplaceCard
              key={p.packageId}
              pkg={p}
              installing={installing === p.packageId}
              canInstall={canInstall}
              isAuthenticated={isAuthenticated}
              onInstall={() => void handleInstall(p.packageId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  pkg: MarketplacePackageSummary;
  installing: boolean;
  canInstall: boolean;
  isAuthenticated: boolean;
  onInstall: () => void;
}

function MarketplaceCard({ pkg, installing, canInstall, isAuthenticated, onInstall }: CardProps) {
  return (
    <div
      data-testid={`marketplace-card-${pkg.packageId}`}
      className="border border-gray-200 rounded-lg bg-white p-4 hover:border-blue-300 transition flex flex-col"
    >
      <div className="flex-1">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{pkg.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
          {pkg.description ?? 'No description provided.'}
        </p>
        {Array.isArray(pkg.tags) && pkg.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {pkg.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 pt-3 mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          by{' '}
          <span className="text-gray-700 font-medium">{humanizePublisher(pkg.publisherTenantId)}</span>
        </span>
        <span className="tabular-nums">v{pkg.sourceVersion}</span>
      </div>
      <div className="mt-3">
        {canInstall ? (
          <button
            data-testid={`install-button-${pkg.packageId}`}
            onClick={onInstall}
            disabled={installing}
            className={`w-full px-3 py-2 text-sm rounded font-medium ${
              installing
                ? 'bg-gray-200 text-gray-400 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {installing ? 'Installing…' : 'Install'}
          </button>
        ) : isAuthenticated ? (
          <button
            type="button"
            className="w-full px-3 py-2 text-sm rounded font-medium border border-blue-300 text-blue-700 hover:bg-blue-50"
            data-testid={`request-button-${pkg.packageId}`}
          >
            Request install from admin
          </button>
        ) : (
          <a
            href="/login"
            className="block text-center w-full px-3 py-2 text-sm rounded font-medium bg-blue-600 text-white hover:bg-blue-700"
            data-testid={`signin-button-${pkg.packageId}`}
          >
            Sign in to install
          </a>
        )}
      </div>
    </div>
  );
}
