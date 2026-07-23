/**
 * ReviewSubmissionPage — FLOW-10 T169
 *
 * Role-aware screen (C6 / SK-539): FLOW-10 is Tier 2 (6 required + 2 conditional
 * = 8 total cells). Submit a review with rating [1,5] + text; role branches surface
 * public read-only views, moderation queues, and reviewee response flows.
 */
import React, { useState } from 'react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const SAMPLE_REVIEWS = [
  { rating: 5, text: 'Excellent service — delivered on time and exceeded expectations.', verified: true, time: '3 days ago' },
  { rating: 4, text: 'Very good overall. Minor communication delays but final result was great.', verified: true, time: '1 week ago' },
  { rating: 3, text: 'Adequate work. Some revisions required but resolved quickly.', verified: false, time: '2 weeks ago' },
];

const FLAGGED_REVIEWS = [
  { text: 'Suspicious: 5★ reviews in 10 minutes from same IP', flag: 'Spam wave', action: 'remove' as const },
  { text: 'Off-topic content, no purchase recorded', flag: 'Unverified', action: 'hide' as const },
  { text: 'Profanity detected in review text', flag: 'Policy violation', action: 'remove' as const },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} out of 5 stars`} className="text-yellow-400 text-lg">
      {'★'.repeat(rating)}
      <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function ReviewSubmissionPage() {
  const { role } = useViewerRole();
  const [rating, setRating] = useState<string>('');
  const [reviewText, setReviewText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const ratingNum = Number(rating);
  const ratingValid = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5;

  const searchParams = new URLSearchParams(window.location.search);
  const isVerified = searchParams.get('verified') === 'true';
  const cascadeSegment = searchParams.get('cascade');
  const tenantAdaptation =
    cascadeSegment === 'tenant-a-v1.0.1'
      ? {
          title: 'Acme verified-trust reviews',
          summary:
            '92% auto-approve threshold, 20% quarantine floor, and stronger recent-review weighting while preserving tenant-scoped moderation.',
        }
      : cascadeSegment === 'tenant-b-installed-from-a'
        ? {
            title: 'Northwind installed Acme verified-trust reviews',
            summary:
              'Northwind is running Acme policy: 92% auto-approve threshold, 20% quarantine floor, and stronger recent-review weighting.',
          }
        : cascadeSegment === 'tenant-b-v1.0.2'
          ? {
              title: 'Northwind trust-signal reviews',
              summary:
                '88% auto-approve threshold, 15% quarantine floor, and longer-tail reputation weighting while preserving Acme history.',
            }
          : cascadeSegment === 'tenant-c-installed-from-b'
            ? {
                title: 'Tessera installed Northwind trust-signal reviews',
                summary:
                  'Tessera is running Northwind policy: 88% auto-approve threshold, 15% quarantine floor, and longer-tail reputation weighting.',
              }
            : cascadeSegment === 'tenant-c-v1.0.3'
              ? {
                  title: 'Tessera community-trust reviews',
                  summary:
                    '90% auto-approve threshold, 12% quarantine floor, and community-weighted reputation decay while preserving Acme and Northwind history.',
                }
              : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!rating) {
      setError('Rating is required');
      return;
    }
    if (!ratingValid) {
      setError('Rating must be between 1 and 5');
      return;
    }

    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setReviewId('review-' + Date.now());
    }, 300);
  }

  const pageTitle =
    role === 'anonymous' || role === 'public-marketplace-visitor'
      ? 'Reviews'
      : role === 'tenant-admin'
        ? 'Review Moderation'
        : role === 'platform-admin'
          ? 'Platform Reputation Overview'
          : role === 'platform-support'
            ? 'Review Inspector (Read-Only)'
            : 'Submit a Review';

  return (
    <div className="p-6 max-w-xl" data-testid="review-submission-page" data-viewer-role={role}>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{pageTitle}</h1>

      {tenantAdaptation && (
        <div
          data-testid="review-tenant-adaptation"
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950"
        >
          <p className="text-sm font-semibold">{tenantAdaptation.title}</p>
          <p data-testid="review-tenant-adaptation-summary" className="mt-1 text-sm">
            {tenantAdaptation.summary}
          </p>
        </div>
      )}

      <RoleScopedView role={role} testIdPrefix="review-role">
        {/* Branch 1 — anonymous */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="review-role-anon-view">
            <div
              data-testid="review-anon-signin-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              Sign in to write a review or flag inappropriate content.{' '}
              <a
                href="/login?return=/reviews/submit"
                data-testid="review-anon-signin"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              ·{' '}
              <a
                href="/register"
                data-testid="review-anon-register"
                className="underline font-medium"
              >
                Register
              </a>
            </div>
            <ul data-testid="review-anon-list" className="space-y-3 max-w-prose">
              {SAMPLE_REVIEWS.map((r, i) => (
                <li
                  key={i}
                  data-testid={`review-anon-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StarDisplay rating={r.rating} />
                    <span className="text-xs text-gray-500">({r.rating}/5)</span>
                  </div>
                  <p className="text-sm text-gray-800 line-clamp-2">{r.text}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    {r.verified && (
                      <span className="text-green-700 font-medium">
                        <span aria-hidden="true">✓</span> Verified Purchase
                      </span>
                    )}
                    <span>· {r.time}</span>
                  </p>
                </li>
              ))}
            </ul>
            <a
              href="/login?return=/reviews/submit"
              data-testid="review-anon-write-cta"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Sign in to write your own review →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — public-marketplace-visitor */}
        <RoleScopedView.Case when="public-marketplace-visitor">
          <div data-testid="review-role-public-mkt-view">
            <div
              data-testid="review-public-mkt-banner"
              className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              You're viewing a public review.{' '}
              <a
                href="/login?return=/reviews/submit"
                data-testid="review-public-mkt-signin"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to reply or flag.
            </div>
            <div
              data-testid="review-public-mkt-featured"
              className="p-4 border border-gray-200 rounded bg-white max-w-prose"
            >
              <div className="flex items-center gap-2 mb-1">
                <StarDisplay rating={SAMPLE_REVIEWS[0].rating} />
                <span className="text-xs text-gray-500">({SAMPLE_REVIEWS[0].rating}/5)</span>
              </div>
              <p className="text-sm text-gray-800 line-clamp-2">{SAMPLE_REVIEWS[0].text}</p>
              <p className="text-xs text-green-700 font-medium mt-2">
                <span aria-hidden="true">✓</span> Verified Purchase
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/reviews"
                data-testid="review-public-mkt-all"
                className="text-sm text-blue-600 hover:underline"
              >
                See all reviews →
              </a>
              <a
                href="/register"
                data-testid="review-public-mkt-register"
                className="text-sm text-blue-600 hover:underline"
              >
                Create an account to write a review →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (moderation queue) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="review-role-admin-view">
            <div
              data-testid="review-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Admin view — review moderation and authenticity enforcement.
            </div>
            <ul data-testid="review-admin-queue" className="space-y-3">
              {FLAGGED_REVIEWS.map((r, i) => (
                <li
                  key={i}
                  data-testid={`review-admin-item-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <p className="text-sm text-gray-800 line-clamp-2">{r.text}</p>
                  <p className="text-xs text-gray-600 mt-2">
                    Flag type:{' '}
                    <span className="font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {r.flag}
                    </span>
                  </p>
                  <div className="mt-3 flex gap-3">
                    <button
                      data-testid={`review-admin-review-${i}`}
                      aria-label={`Review flagged item: ${r.flag}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Review
                    </button>
                    {r.action === 'remove' ? (
                      <button
                        data-testid={`review-admin-remove-${i}`}
                        aria-label={`Remove review flagged ${r.flag}`}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        data-testid={`review-admin-hide-${i}`}
                        aria-label={`Hide review flagged ${r.flag}`}
                        className="text-sm text-amber-700 hover:underline"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <a
              href="/reviews/moderation"
              data-testid="review-admin-console"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Open full moderation console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — platform-admin */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="review-role-platform-admin-view">
            <div
              data-testid="review-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform admin — cross-tenant reputation oversight.
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <p data-testid="review-platform-total" className="text-gray-700">
                Reviews submitted (all tenants, 24h):{' '}
                <span className="font-semibold">1,284</span>
              </p>
              <p data-testid="review-platform-bombing" className="text-orange-700">
                Suspected review bombing incidents:{' '}
                <span className="font-semibold">2</span> — needs review
              </p>
              <p data-testid="review-platform-fraud" className="text-gray-700">
                Accounts under reputation-fraud investigation:{' '}
                <span className="font-semibold">5</span>
              </p>
            </div>
            <a
              href="/platform/reviews"
              data-testid="review-platform-console"
              className="text-sm text-blue-600 hover:underline"
            >
              Open platform reputation console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="review-role-support-view">
            <div
              data-testid="review-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only review inspector. No modifications permitted.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="review-support-search" className="sr-only">
                Review ID or Entity ID
              </label>
              <input
                id="review-support-search"
                data-testid="review-support-search"
                type="text"
                placeholder="Review ID or Entity ID"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="review-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="review-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a Review ID to inspect
            </div>
            <p
              data-testid="review-support-restore-note"
              className="text-xs text-gray-500 mt-3"
            >
              To restore a removed review, escalate to platform admin.
            </p>
            <a
              href="/platform/support/escalate"
              data-testid="review-support-escalate"
              className="inline-block mt-2 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — freelancer (reviewee with portfolio action) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="review-role-freelancer-view">
            <div
              data-testid="review-fl-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              You're viewing a review of your service.
            </div>
            <div
              data-testid="review-fl-review-card"
              className="p-4 border border-gray-200 rounded bg-white max-w-prose mb-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <StarDisplay rating={5} />
                <span className="text-xs text-gray-500">(5/5)</span>
              </div>
              <p className="text-sm text-gray-800">
                Exceptional API work, clean code, delivered 2 days early.
              </p>
              <p className="text-xs text-green-700 font-medium mt-2">
                <span aria-hidden="true">✓</span> Verified Purchase
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/reviews/respond"
                data-testid="review-fl-reply-btn"
                aria-label="Reply publicly to this review"
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Reply publicly
              </a>
              <button
                data-testid="review-fl-portfolio-btn"
                aria-label="Add this review to portfolio highlights"
                onClick={() => console.log('Add to portfolio highlights')}
                className="border border-purple-600 text-purple-700 px-4 py-2 rounded text-sm font-medium hover:bg-purple-50"
                style={{ minHeight: '44px' }}
              >
                Add to portfolio highlights
              </button>
            </div>
            <a
              href="/reviews/flag"
              data-testid="review-fl-flag"
              className="inline-block mt-3 text-sm text-gray-600 hover:underline"
            >
              Flag this review as inappropriate →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — business-partner (reviewee with share-to-network) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="review-role-partner-view">
            <div
              data-testid="review-bp-banner"
              className="mb-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              Review of a partner's product or service.
            </div>
            <div
              data-testid="review-bp-review-card"
              className="p-4 border border-gray-200 rounded bg-white max-w-prose mb-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <StarDisplay rating={4} />
                <span className="text-xs text-gray-500">(4/5)</span>
              </div>
              <p className="text-sm text-gray-800">
                Solid integration work. Would engage again for our next project.
              </p>
              <p className="text-xs text-green-700 font-medium mt-2">
                <span aria-hidden="true">✓</span> Verified Purchase
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a
                href="/reviews/respond"
                data-testid="review-bp-reply-btn"
                aria-label="Reply publicly to this review"
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Reply publicly
              </a>
              <button
                data-testid="review-bp-share-btn"
                aria-label="Share this review to my network"
                className="border border-slate-600 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-50"
                style={{ minHeight: '44px' }}
              >
                Share to my network
              </button>
            </div>
            <a
              href="/reviews/flag"
              data-testid="review-bp-flag"
              className="inline-block mt-3 text-sm text-gray-600 hover:underline"
            >
              Flag this review →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — tenant-user / referral-user / event-organiser (THE EXISTING FORM + verified badge + star selector) */}
        <RoleScopedView.Fallback>
          <>
            {isVerified ? (
              <div
                data-testid="verified-purchase-badge"
                className="mb-4 p-2 rounded bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2"
              >
                <span aria-hidden="true">✓</span>
                <span>Verified Purchase — your review will display a credibility badge</span>
              </div>
            ) : (
              <div
                data-testid="unverified-disclaimer"
                className="mb-4 p-2 rounded bg-amber-50 border border-amber-200 text-sm text-amber-700"
              >
                No verified purchase found. Your review will be marked as unverified.
              </div>
            )}

            {status === 'success' ? (
              <div
                data-testid="submission-success"
                className="p-4 bg-green-50 border border-green-200 rounded"
              >
                <p className="text-green-700 font-medium">Review submitted successfully!</p>
                <p className="text-sm text-green-600 mt-1">Review ID: {reviewId}</p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                data-testid="review-form"
                noValidate
                className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="mb-5">
                  <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-2">
                    Your rating
                  </label>
                  {/* RUN-153 V-R3: single star selector (removed redundant 1-5 number input).
                      Hidden input preserves the same form submission contract + keeps the
                      `rating-input` test hook so e2e specs don't break. */}
                  <div
                    data-testid="star-selector"
                    role="group"
                    aria-label="Rating selector"
                    className="flex gap-1 mb-1"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        data-testid={`star-${n}`}
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => {
                          setRating(String(n));
                          setError(null);
                        }}
                        className={`text-3xl leading-none transition-colors ${
                          ratingNum >= n ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'
                        }`}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {ratingValid ? `${ratingNum} out of 5 stars` : 'Tap a star to rate'}
                  </p>
                  <input
                    id="rating"
                    type="hidden"
                    value={rating}
                    data-testid="rating-input"
                    readOnly
                  />
                  {error && (
                    <p className="mt-2 text-sm text-red-600" data-testid="rating-error">
                      {error}
                    </p>
                  )}
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="review-text"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Your review
                  </label>
                  <textarea
                    id="review-text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={5}
                    data-testid="review-text-input"
                    placeholder="What did you like? What could be better?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                  data-testid="submit-review-button"
                  style={{ minHeight: '44px' }}
                >
                  {status === 'loading' ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}
          </>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
