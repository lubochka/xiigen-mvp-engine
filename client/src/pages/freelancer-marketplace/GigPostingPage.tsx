/**
 * GigPostingPage — FLOW-17 T613/T614
 *
 * Role-aware screen (C6 / SK-539): the same URL renders a different
 * template per viewer role. The client-posting form is preserved exactly
 * (Branch 3) — freelancers see a bidding flow, tenants see moderation,
 * platform staff see read-only inspector surfaces, and unauthenticated
 * visitors see a public preview with sign-in CTAs.
 */
import React, { useState } from 'react';
import { User } from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

interface Milestone {
  milestoneId: string;
  description: string;
  amount: number;
}

interface SampleGig {
  title: string;
  category: string;
  budget: string;
  bids: number;
}

const SAMPLE_GIGS: SampleGig[] = [
  {
    title: 'Build a REST API integration',
    category: 'Development',
    budget: '$800–$1,500',
    bids: 3,
  },
  {
    title: 'Design a mobile app UI',
    category: 'Design',
    budget: '$500–$900',
    bids: 7,
  },
  {
    title: 'Write developer documentation',
    category: 'Writing',
    budget: '$300–$600',
    bids: 0,
  },
  {
    title: 'Migrate legacy PHP codebase to Node.js',
    category: 'Development',
    budget: '$2,000–$4,000',
    bids: 1,
  },
];

const ADMIN_GIG_ROWS = [
  { title: 'Build a REST API integration', poster: 'Member #1024', bids: 3 },
  { title: 'Design a mobile app UI', poster: 'Member #2048', bids: 7 },
] as const;

/**
 * RUN-94: competition indicator — the capacity-strip signature pattern
 * transposed to freelance gigs. Per /.impeccable.md principle 3, this
 * signal lives on the card itself, not in a separate metrics panel.
 * A freelancer scanning gigs should spot low-competition opportunities
 * at a glance.
 */
function gigCompetitionState(bids: number) {
  if (bids === 0) {
    return {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      label: 'New gig · no bids yet',
    };
  }
  if (bids <= 2) {
    return {
      dot: 'bg-emerald-500',
      text: 'text-slate-600',
      label: `${bids} ${bids === 1 ? 'bid' : 'bids'} · good opportunity`,
    };
  }
  if (bids <= 5) {
    return {
      dot: 'bg-amber-400',
      text: 'text-slate-600',
      label: `${bids} bids`,
    };
  }
  return {
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    label: `${bids} bids · competitive`,
  };
}

function PublicGigCard({
  gig,
  variant,
}: {
  gig: SampleGig;
  variant: 'anon' | 'public';
}) {
  const competition = gigCompetitionState(gig.bids);
  const testidPrefix = variant === 'anon' ? 'gig-anon-card' : 'gig-public-card';
  return (
    <article
      className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
      data-testid={`${testidPrefix}-${gig.title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-start justify-between gap-4 mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {gig.category}
        </p>
        <p className="text-base font-semibold text-slate-900 tabular-nums flex-shrink-0">
          {gig.budget}
        </p>
      </div>
      <h3 className="text-sm font-medium text-slate-800 leading-snug mb-2">
        {gig.title}
      </h3>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${competition.text}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${competition.dot}`}
          />
          {competition.label}
        </span>
        <span className="text-[11px] text-slate-400 italic">
          Sign in to bid
        </span>
      </div>
    </article>
  );
}

export function GigPostingPage() {
  const { role } = useViewerRole();
  const [gigTitle, setGigTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([
    { milestoneId: 'ms-1', description: 'Design', amount: 0 },
    { milestoneId: 'ms-2', description: 'Implementation', amount: 0 },
  ]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [bidStatus, setBidStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const totalBudget = parseFloat(budget) || 0;
  const milestonesSum = milestones.reduce((sum, m) => sum + m.amount, 0);
  const sumValid = Math.abs(milestonesSum - totalBudget) < 0.01;

  function updateMilestoneAmount(idx: number, amount: number) {
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, amount } : m)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!gigTitle) {
      setError('Gig title is required');
      return;
    }
    if (!budget || totalBudget <= 0) {
      setError('Budget must be a positive number');
      return;
    }
    if (!sumValid) {
      setError(`Milestone amounts (${milestonesSum}) must equal total budget (${totalBudget})`);
      return;
    }

    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setResult({
        gigId: 'gig-' + Date.now(),
        gigTitle,
        budget: totalBudget,
        status: 'POSTED',
        postedAt: new Date().toISOString(),
      });
    }, 300);
  }

  function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBidStatus('loading');
    setTimeout(() => setBidStatus('success'), 300);
  }

  const pageTitle =
    role === 'freelancer' ? 'Browse & Bid on Gigs' :
    role === 'tenant-admin' ? 'Gig Moderation' :
    role === 'platform-admin' ? 'Gig Platform Overview' :
    role === 'platform-support' ? 'Gig Inspector (Read-Only)' :
    (role === 'anonymous' || role === 'public-marketplace-visitor') ? 'Freelancer Gigs' :
    'Post a Gig';

  return (
    <div className="w-full max-w-2xl p-4 sm:p-6" data-testid="gig-posting-page" data-viewer-role={role}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{pageTitle}</h1>

      <RoleScopedView role={role} testIdPrefix="gig-role">
        {/* Branch 1 — anonymous */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="gig-anon-view">
            <div className="flex flex-col items-center text-center py-6 mb-6">
              <User className="w-16 h-16 text-gray-400 mb-3" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Sign in to post a gig or place a bid
              </h2>
              <p className="text-gray-600 mb-4 max-w-md">
                Browse available gigs below. To hire or bid, create a free account.
              </p>
              <div className="flex gap-3">
                <a
                  href="/login?return=/freelancer-marketplace"
                  data-testid="gig-anon-signin"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
                >
                  Sign in
                </a>
                <a
                  href="/register?return=/freelancer-marketplace"
                  data-testid="gig-anon-register"
                  className="border border-blue-600 text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50"
                >
                  Create account
                </a>
              </div>
            </div>
            <div className="space-y-3" data-testid="gig-anon-list">
              {SAMPLE_GIGS.map((g) => (
                <PublicGigCard key={g.title} gig={g} variant="anon" />
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — public-marketplace-visitor */}
        <RoleScopedView.Case when="public-marketplace-visitor">
          <div data-testid="gig-public-view">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              Browsing as a public visitor.{' '}
              <a
                href="/login?return=/freelancer-marketplace"
                data-testid="gig-public-signin-link"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to post or bid.
            </div>
            <div className="space-y-3" data-testid="gig-public-list">
              {SAMPLE_GIGS.map((g) => (
                <PublicGigCard key={g.title} gig={g} variant="public" />
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-user + business-partner + referral-user (the existing form, unchanged) */}
        <RoleScopedView.Case when={['tenant-user', 'business-partner', 'referral-user']}>
          <div data-testid="gig-client-view">
            {status === 'success' && result && (
              <div data-testid="gig-success" className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700 font-medium">Gig posted!</p>
                <p className="text-sm text-green-600" data-testid="gig-id">
                  ID: {String(result['gigId'])}
                </p>
                <p className="text-sm text-green-600" data-testid="gig-status">
                  Status: {String(result['status'])}
                </p>
              </div>
            )}

            {error && (
              <div data-testid="gig-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}

            {role === 'referral-user' && (
              <div
                data-testid="gig-referral-banner"
                className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700"
              >
                Referred users earn a bonus when their first hired freelancer completes a gig.
              </div>
            )}

            {/* RUN-153 V-R3: wrap gig-post form in a card per G3 catalog pattern */}
            <div
              className={`mb-4 p-3 rounded border ${sumValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}
              data-testid="sum-validation"
            >
              Milestones sum: {milestonesSum} / Budget: {totalBudget}
              {sumValid ? ' \u2713 Valid' : ' (must be equal)'}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-4 sm:p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div>
                <label htmlFor="gig-title-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Gig Title
                </label>
                <input
                  id="gig-title-input"
                  data-testid="gig-title-input"
                  value={gigTitle}
                  onChange={(e) => setGigTitle(e.target.value)}
                  className="w-full min-w-0 border border-gray-300 rounded px-3 py-2"
                  placeholder="Build a REST API"
                />
              </div>
              <div>
                <label htmlFor="budget-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Budget ($)
                </label>
                <input
                  id="budget-input"
                  data-testid="budget-input"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full min-w-0 border border-gray-300 rounded px-3 py-2"
                  placeholder="1000"
                  min="1"
                />
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-2">Milestones</h2>
                {milestones.map((m, idx) => (
                  <div key={m.milestoneId} className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center">
                    <label
                      htmlFor={`milestone-amount-${idx}`}
                      className="text-sm text-gray-600 py-1 sm:w-32 sm:py-2"
                    >
                      {m.description}
                    </label>
                    <input
                      id={`milestone-amount-${idx}`}
                      data-testid={`milestone-amount-${idx}`}
                      type="number"
                      value={m.amount || ''}
                      onChange={(e) => updateMilestoneAmount(idx, parseFloat(e.target.value) || 0)}
                      className="w-full min-w-0 flex-1 border border-gray-300 rounded px-3 py-2"
                      placeholder="500"
                      min="0"
                    />
                  </div>
                ))}
              </div>

              <button
                data-testid="post-gig-submit"
                type="submit"
                disabled={status === 'loading' || !sumValid}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {status === 'loading' ? 'Posting...' : 'Post Gig'}
              </button>
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — freelancer */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="gig-freelancer-view">
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-900">
              You're browsing as a freelancer. Find open gigs and submit a proposal.
            </div>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Open Gigs</h2>
              <div className="space-y-2">
                {SAMPLE_GIGS.map((g, i) => {
                  const amount = ['$1,000', '$750', '$450'][i];
                  return (
                    <div
                      key={g.title}
                      className="border border-gray-200 rounded p-3 flex items-center justify-between bg-white"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900">{g.title}</h3>
                        <p className="text-sm text-gray-600">
                          {amount} · {g.bids} bids
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        <span aria-hidden="true">●</span> Open
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Submit a Bid</h2>
              {bidStatus === 'success' && (
                <div
                  data-testid="bid-success"
                  className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700"
                >
                  Bid submitted! The client will review your proposal.
                </div>
              )}
              <form onSubmit={handleBidSubmit} className="space-y-3">
                <div>
                  <label htmlFor="bid-amount-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Bid Amount ($)
                  </label>
                  <input
                    id="bid-amount-input"
                    data-testid="bid-amount-input"
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="950"
                    min="1"
                  />
                </div>
                <div>
                  <label htmlFor="bid-proposal-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Proposal
                  </label>
                  <textarea
                    id="bid-proposal-input"
                    data-testid="bid-proposal-input"
                    value={bidProposal}
                    onChange={(e) => setBidProposal(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Describe your approach..."
                    rows={4}
                  />
                </div>
                <button
                  data-testid="submit-bid-btn"
                  type="submit"
                  disabled={bidStatus === 'loading'}
                  className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {bidStatus === 'loading' ? 'Submitting...' : 'Submit Bid'}
                </button>
              </form>
            </section>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — tenant-admin */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="gig-admin-view">
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-900">
              Admin view — all active gigs in your tenant.
            </div>
            <div className="space-y-3 sm:hidden">
              {ADMIN_GIG_ROWS.map((row, i) => (
                <article key={row.title} className="rounded border border-gray-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{row.title}</h3>
                      <p className="text-xs text-gray-600">{row.poster}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{row.bids}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800 [&>span]:hidden">
                      <i aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-green-700" />
                      <span aria-hidden="true">â—</span> Posted
                    </span>
                    <button
                      data-testid={`admin-mobile-remove-${i}`}
                      aria-label={`Remove gig: ${row.title}`}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden max-w-full overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50">
                <tr className="text-start text-gray-700">
                  <th className="p-2 font-medium">Gig Title</th>
                  <th className="p-2 font-medium">Posted By</th>
                  <th className="p-2 font-medium">Bids</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {ADMIN_GIG_ROWS.map((row, i) => (
                  <tr key={row.title} className="border-t border-gray-200">
                    <td className="p-2">{row.title}</td>
                    <td className="p-2 text-gray-600">{row.poster}</td>
                    <td className="p-2">{row.bids}</td>
                    <td className="p-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        <span aria-hidden="true">●</span> Posted
                      </span>
                    </td>
                    <td className="p-2">
                      <button
                        data-testid={`admin-remove-${i}`}
                        aria-label={`Remove gig: ${row.title}`}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — platform-admin */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="gig-platform-admin-view">
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-900">
              Platform admin — cross-tenant read-only. Use Ops Console for bulk actions.
            </div>
            <div className="space-y-2 mb-4">
              <p data-testid="platform-gig-total" className="text-sm text-gray-700">
                Total active gigs (all tenants): <span className="font-semibold">1,247</span>
              </p>
              <p data-testid="platform-gig-flagged" className="text-sm">
                Flagged for review:{' '}
                <span className="inline-flex items-center gap-1 text-orange-700 font-semibold">
                  <span aria-hidden="true">⚠</span> 3 flagged
                </span>
              </p>
            </div>
            <a
              href="/platform/gigs"
              data-testid="platform-gig-console-link"
              className="inline-block bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-800"
            >
              Open Gig Ops Console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — platform-support */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="gig-platform-support-view">
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
              Platform support — read-only inspector.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="gig-support-search" className="sr-only">
                Gig ID or title
              </label>
              <input
                id="gig-support-search"
                data-testid="gig-support-search"
                type="text"
                placeholder="Gig ID or title"
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
              <button
                data-testid="gig-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="gig-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a Gig ID to inspect
            </div>
            <a
              href="/platform/escalate"
              data-testid="gig-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — same as public-marketplace-visitor (safe default) */}
        <RoleScopedView.Fallback>
          <div data-testid="gig-public-view">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              Browsing as a public visitor.{' '}
              <a
                href="/login?return=/freelancer-marketplace"
                data-testid="gig-public-signin-link"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to post or bid.
            </div>
            <div className="space-y-3" data-testid="gig-public-list-fallback">
              {SAMPLE_GIGS.map((g) => (
                <PublicGigCard key={g.title} gig={g} variant="public" />
              ))}
            </div>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
