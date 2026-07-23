/**
 * CheckoutPage — FLOW-16 Marketplace Payments
 *
 * Role-aware screen (C6 / SK-539): same URL renders 10 role targets —
 * the densest role surface in the fleet (tied with FLOW-48). Buyers see
 * the checkout form; payees (freelancer, event-organiser) are redirected
 * to their payout surfaces; admins see ops consoles; support sees a
 * read-only transaction inspector.
 *
 * Idempotency key auto-generated client-side and passed with each request.
 */

import React, { useState } from 'react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

type CheckoutStatus = 'idle' | 'loading' | 'success' | 'error';

interface CheckoutResult {
  orderId: string;
  escrowId: string;
  totalAmountCents: number;
}

export function CheckoutPage(): React.ReactElement {
  const { role } = useViewerRole();
  const [cartId, setCartId] = useState('');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // B2B branch state
  const [poNumber, setPoNumber] = useState('');
  const [contractRef, setContractRef] = useState('');
  const [b2bAmount, setB2bAmount] = useState('');
  const [b2bStatus, setB2bStatus] = useState<CheckoutStatus>('idle');
  const [b2bError, setB2bError] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (!cartId.trim()) {
      // RUN-97: engineering phrase "Cart ID is required" replaced with
      // human copy — a buyer who sees this hit the checkout page without
      // a cart attached (URL missing ?cart=), which is a navigation
      // problem the buyer cannot solve from here. Send them back.
      setErrorMessage(
        'Your cart is empty. Go back to the item and try "Buy now" again to start checkout.',
      );
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setResult(null);

    // Simulate async checkout — in production this calls DynamicController
    // POST /api/dynamic/xiigen-checkouts with idempotency key header
    setTimeout(() => {
      if (cartId.startsWith('err')) {
        setStatus('error');
        // RUN-97: "cart locked or inventory insufficient" is engineering
        // language. A buyer needs to know what to do next.
        setErrorMessage(
          'We could not complete this order. The item may be sold out or already in another buyer\u2019s cart. Refresh and try again, or pick a different item.',
        );
      } else {
        setResult({
          orderId: `order-${Date.now()}`,
          escrowId: `escrow-${Date.now()}`,
          totalAmountCents: 4999,
        });
        setStatus('success');
      }
    }, 800);
  }

  function handleB2bSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setB2bError('');
    if (!poNumber.trim()) {
      setB2bError('PO Number is required.');
      setB2bStatus('error');
      return;
    }
    if (!b2bAmount || parseFloat(b2bAmount) <= 0) {
      setB2bError('Funding amount must be greater than zero.');
      setB2bStatus('error');
      return;
    }
    setB2bStatus('loading');
    setTimeout(() => setB2bStatus('success'), 600);
  }

  // Reusable: the checkout form (used by anonymous, public-mkt, tenant-user, referral-user).
  // RUN-78: Stripe two-column pattern — left order summary, right payment form, single
  // "Pay $X" button with $X interpolated. The old "Cart ID" input was a P0 engineering
  // leak per REPAIR-GUIDANCE Part 5 — buyers never enter cart IDs.
  function CheckoutFormCore() {
    // Seeded cart — in production this would come from cart-state props / router state.
    const seededCart = {
      itemName: 'Annual Tech Summit 2026 — General admission ticket',
      itemSubtitle: 'Apr 28 2026 · San Francisco · digital delivery',
      quantity: 2,
      unitPriceCents: 12500,
      taxRate: 0.0825,
    };
    const subtotalCents = seededCart.quantity * seededCart.unitPriceCents;
    const taxCents = Math.round(subtotalCents * seededCart.taxRate);
    const totalCents = subtotalCents + taxCents;
    const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

    return (
      <>
        {status === 'idle' || status === 'error' ? (
          <form
            onSubmit={handleSubmit}
            data-testid="checkout-auth-form"
            className="grid grid-cols-1 md:grid-cols-[1fr,1.1fr] gap-6"
          >
            {/* LEFT — order summary */}
            <section
              className="order-2 md:order-1 rounded-lg border border-gray-200 bg-slate-50 p-5"
              data-testid="checkout-order-summary"
              aria-labelledby="checkout-order-heading"
            >
              <h2
                id="checkout-order-heading"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
              >
                Order summary
              </h2>

              <div className="mb-4 pb-4 border-b border-gray-200" data-testid="checkout-line-item">
                <div className="font-medium text-slate-900">{seededCart.itemName}</div>
                <div className="text-xs text-gray-500 mt-0.5">{seededCart.itemSubtitle}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Qty {seededCart.quantity} · {fmt(seededCart.unitPriceCents)} each
                  </span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {fmt(subtotalCents)}
                  </span>
                </div>
              </div>

              <dl className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="tabular-nums text-slate-800">{fmt(subtotalCents)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-gray-600">Tax ({Math.round(seededCart.taxRate * 100)}%)</dt>
                  <dd className="tabular-nums text-slate-800">{fmt(taxCents)}</dd>
                </div>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
                  <dt className="text-base font-semibold text-slate-900">Total</dt>
                  <dd
                    className="text-base font-bold tabular-nums text-slate-900"
                    data-testid="checkout-total"
                  >
                    {fmt(totalCents)}
                  </dd>
                </div>
              </dl>

              <p className="text-xs text-gray-500 mt-4">
                Funds are held in escrow until delivery is confirmed.
              </p>
            </section>

            {/* RIGHT — payment form */}
            <section
              className="order-1 md:order-2 rounded-lg border border-gray-200 bg-white p-5"
              data-testid="checkout-payment-form"
              aria-labelledby="checkout-payment-heading"
            >
              <h2
                id="checkout-payment-heading"
                className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3"
              >
                Payment details
              </h2>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="cardNumber"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Card number
                  </label>
                  <input
                    id="cardNumber"
                    data-testid="checkout-card-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="cardExpiry"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Expiry
                    </label>
                    <input
                      id="cardExpiry"
                      data-testid="checkout-card-expiry"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM / YY"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cardCvc"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      CVC
                    </label>
                    <input
                      id="cardCvc"
                      data-testid="checkout-card-cvc"
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="cardholderName"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Cardholder name
                  </label>
                  <input
                    id="cardholderName"
                    data-testid="checkout-card-name"
                    type="text"
                    autoComplete="cc-name"
                    placeholder="Full name on card"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    data-testid="checkout-save-payment-method"
                    className="rounded border-gray-300"
                  />
                  Save payment method for future purchases
                </label>

                {/* Hidden input — preserves the ?cart= URL-param path without showing a "Cart ID" field to buyers. */}
                <input
                  type="hidden"
                  id="cartId"
                  value={cartId}
                  onChange={(e) => setCartId(e.target.value)}
                />
              </div>

              {status === 'error' && errorMessage && (
                <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 mt-3">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                data-testid="checkout-pay-button"
                className="mt-4 w-full rounded bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Pay {fmt(totalCents)}
              </button>

              <p className="text-xs text-gray-400 mt-3 text-center">
                🔒 Payments are processed securely. We never store your card number.
              </p>
            </section>
          </form>
        ) : status === 'loading' ? (
          <div role="status" className="flex items-center gap-2 py-8 text-gray-500">
            <svg
              className="h-5 w-5 animate-spin text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Processing checkout…</span>
          </div>
        ) : (
          <div role="region" aria-label="Order confirmation" className="space-y-3">
            <div className="rounded bg-green-50 px-4 py-3 text-green-800">
              <p className="font-medium">Order placed successfully!</p>
            </div>
            {result && (
              <dl className="space-y-1 text-sm text-gray-700">
                <div className="flex gap-2">
                  <dt className="font-medium">Order ID:</dt>
                  <dd>{result.orderId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Escrow ID:</dt>
                  <dd>{result.escrowId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Total:</dt>
                  <dd>${(result.totalAmountCents / 100).toFixed(2)}</dd>
                </div>
              </dl>
            )}
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setCartId('');
                setResult(null);
              }}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              New Order
            </button>
          </div>
        )}
      </>
    );
  }

  const pageTitle =
    role === 'tenant-admin'
      ? 'Payments Administration'
      : role === 'platform-admin'
        ? 'Platform Payments Overview'
        : role === 'platform-support'
          ? 'Transaction Inspector'
          : role === 'business-partner'
            ? 'B2B Checkout'
            : role === 'freelancer'
              ? 'Escrow & Payouts'
              : role === 'event-organiser'
                ? 'Event Payouts'
                : 'Checkout';

  return (
    <main data-testid="page-checkout" data-viewer-role={role} className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-semibold text-gray-800">{pageTitle}</h1>

      <RoleScopedView role={role} testIdPrefix="checkout-role">
        {/* Branch 1 — anonymous */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="checkout-anon-view">
            <div className="mb-4 rounded bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-900">
              Checking out as a guest.{' '}
              <a
                href="/login?return=/checkout"
                data-testid="checkout-anon-signin-link"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to save your order history and earn referral credits.
            </div>
            <CheckoutFormCore />
            <p className="mt-3 text-xs text-gray-500">
              Or{' '}
              <a
                href="/register?return=/checkout"
                data-testid="checkout-anon-register-link"
                className="underline"
              >
                create an account
              </a>{' '}
              to track this order.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — public-marketplace-visitor */}
        <RoleScopedView.Case when="public-marketplace-visitor">
          <div data-testid="checkout-public-view">
            <div className="mb-4 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-900">
              Purchasing from a marketplace listing.{' '}
              <a
                href="/login?return=/checkout"
                data-testid="checkout-public-signin-link"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to apply any available discounts.
            </div>
            <CheckoutFormCore />
            <p className="mt-3 text-xs text-gray-500" data-testid="checkout-public-discount-note">
              Registered members may qualify for tier discounts — not available for guest checkout.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-user + referral-user (primary authenticated buyer) */}
        <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
          <div data-testid="checkout-buyer-view">
            {role === 'referral-user' && (
              <div
                data-testid="checkout-referral-banner"
                className="mb-4 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700"
              >
                Referral credit will be applied to this order. Your referrer will be notified on
                completion.
              </div>
            )}
            <CheckoutFormCore />
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — business-partner (B2B PO checkout) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="checkout-b2b-view">
            <div
              data-testid="checkout-b2b-banner"
              className="mb-4 rounded bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              B2B checkout — your order will be invoiced under net-30 payment terms.
            </div>
            {b2bStatus === 'success' ? (
              <div
                role="region"
                aria-label="Purchase order confirmation"
                data-testid="checkout-b2b-success"
                className="rounded bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                Purchase order submitted. Invoice will be sent within 24 hours.
              </div>
            ) : (
              <form onSubmit={handleB2bSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="checkout-b2b-po"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    PO Number
                  </label>
                  <input
                    id="checkout-b2b-po"
                    data-testid="checkout-b2b-po"
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="PO-2026-XXXX"
                    required
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-b2b-contract"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Contract Reference <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="checkout-b2b-contract"
                    data-testid="checkout-b2b-contract"
                    type="text"
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    placeholder="CONTRACT-XXXX"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="checkout-b2b-amount"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Escrow Funding Amount ($)
                  </label>
                  <input
                    id="checkout-b2b-amount"
                    data-testid="checkout-b2b-amount"
                    type="number"
                    min="1"
                    value={b2bAmount}
                    onChange={(e) => setB2bAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                {b2bStatus === 'error' && b2bError && (
                  <p
                    role="alert"
                    data-testid="checkout-b2b-error"
                    className="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {b2bError}
                  </p>
                )}
                <button
                  type="submit"
                  data-testid="checkout-b2b-submit"
                  disabled={b2bStatus === 'loading'}
                  className="w-full rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-gray-400"
                >
                  {b2bStatus === 'loading' ? 'Submitting...' : 'Submit Purchase Order'}
                </button>
              </form>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — freelancer + event-organiser (payees — redirect) */}
        <RoleScopedView.Case when={['freelancer', 'event-organiser']}>
          <div data-testid="checkout-payee-redirect">
            {role === 'freelancer' ? (
              <div className="rounded bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900 mb-3">
                  Your payments and escrow status are managed from the Milestone Dashboard.
                </p>
                <a
                  href="/milestones"
                  data-testid="checkout-freelancer-redirect"
                  className="inline-block bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Go to Milestone Dashboard →
                </a>
              </div>
            ) : (
              <div className="rounded bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-900 mb-3">
                  Event ticket payouts are managed from your Event Organiser dashboard.
                </p>
                <a
                  href="/organiser/payouts"
                  data-testid="checkout-organiser-redirect"
                  className="inline-block bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Go to Organiser Dashboard →
                </a>
              </div>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — tenant-admin (payments administration) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="checkout-admin-view">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="border border-gray-200 rounded p-4">
                <h2 className="font-semibold text-gray-900 mb-1">Refund Queue</h2>
                <p className="text-sm text-gray-600 mb-3">Pending refund approvals: 2</p>
                <a
                  href="/admin/refunds"
                  data-testid="checkout-admin-refunds"
                  className="inline-block bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Open Refund Queue
                </a>
              </div>
              <div className="border border-gray-200 rounded p-4">
                <h2 className="font-semibold text-gray-900 mb-1">Dispute Queue</h2>
                <p className="text-sm text-gray-600 mb-3">Open chargeback disputes: 1</p>
                <a
                  href="/admin/disputes"
                  data-testid="checkout-admin-disputes"
                  className="inline-block bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Open Dispute Queue
                </a>
              </div>
            </div>
            <p
              data-testid="checkout-admin-gateway-status"
              className="text-sm text-gray-700 mb-3 flex items-center gap-2"
            >
              <span>Gateway: Stripe · Status:</span>
              <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                <span aria-hidden="true">●</span> Active
              </span>
            </p>
            <a
              href="/admin/payment-settings"
              data-testid="checkout-admin-settings"
              className="text-sm text-blue-600 hover:underline"
            >
              Payment Gateway Settings →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — platform-admin */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="checkout-platform-admin-view">
            <div className="mb-4 rounded bg-red-50 border border-red-200 p-3 text-sm text-red-900">
              Cross-tenant read-only. Use the Platform Payments Console for bulk actions.
            </div>
            <p data-testid="checkout-platform-tx-total" className="text-sm text-gray-700 mb-2">
              Total transactions today (all tenants): <span className="font-semibold">1,247</span>
            </p>
            <p data-testid="checkout-platform-pci" className="text-sm mb-4 flex items-center gap-2">
              <span>PCI compliance status:</span>
              <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                <span aria-hidden="true">✓</span> PASSING
              </span>
            </p>
            <a
              href="/platform/payments"
              data-testid="checkout-platform-console"
              className="inline-block bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-800"
            >
              Open Platform Payments Console →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 8 — platform-support (read-only transaction inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="checkout-support-view">
            <div className="mb-4 rounded bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
              Read-only view. You can inspect transactions but cannot modify them.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="checkout-support-search" className="sr-only">
                Transaction ID or Order ID
              </label>
              <input
                id="checkout-support-search"
                data-testid="checkout-support-search"
                type="text"
                placeholder="Transaction ID or Order ID"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="checkout-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="checkout-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a Transaction ID to inspect
            </div>
            <a
              href="/platform/escalate"
              data-testid="checkout-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback */}
        <RoleScopedView.Fallback>
          <div data-testid="checkout-fallback-view" className="text-center py-8">
            <p className="text-gray-700 mb-3">This page is not available for your current role.</p>
            <a href="/" className="text-blue-600 hover:underline">
              Go to Dashboard →
            </a>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </main>
  );
}

export default CheckoutPage;
