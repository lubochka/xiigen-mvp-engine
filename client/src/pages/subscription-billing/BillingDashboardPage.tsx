/**
 * BillingDashboardPage — FLOW-12 T211 + T212
 *
 * Role-aware screen (C6 / SK-539): FLOW-12 is Tier 1 (9 required + 1 conditional
 * = 10 total cells) and touches every persona that pays the platform or gets
 * paid by it. Existing admin dashboard is preserved as Branch 3 (tenant-admin);
 * all other roles see dedicated billing surfaces.
 *
 * Context: FLOW-16 (marketplace-payments) and FLOW-48 (i18n-translation) are
 * the two "universal-persona" flows at 10 cells each. FLOW-12 shares the top
 * density tier but is not universal — billing surfaces differ per persona.
 */
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { useViewerRole } from '../../hooks/useViewerRole';

// MOCK_STATES for ?mock=<key> business-state stub rendering.
// FLOW-12 populated visibility — previously the populated route 404'd because
// BillingDashboardPage never dispatched to BusinessStateCard.
const MOCK_STATES: Record<string, BusinessState> = {
  'active': {
    idx: 1,
    label: 'Subscription active — current period paid and auto-renewing',
    status: 'ACTIVE',
    fields: {
      planCode: 'STARTER',
      priceMonthly: '$9.99',
      currentPeriod: '2026-04',
      nextBillingDate: '2026-05-15',
      paymentMethod: 'Card ending 4242',
    },
  },
  'past-due': {
    idx: 2,
    label: 'Invoice failed — account past due, dunning retry scheduled',
    status: 'FAILED',
    fields: {
      invoiceId: 'inv-002',
      periodKey: '2026-04',
      amountDue: '$9.99',
      dunningAttempt: '1 of 3',
      nextRetryAt: '2026-04-22 09:00',
    },
  },
};

interface Invoice {
  invoiceId: string;
  status: 'PAID' | 'FAILED' | 'VOIDED';
  priceCents: number;
  billingInterval: string;
  periodKey: string;
  nextRetryAt?: string;
  dunningAttempt?: number;
}

const DEMO_INVOICES: Invoice[] = [
  {
    invoiceId: 'inv-001',
    status: 'PAID',
    priceCents: 999,
    billingInterval: 'MONTHLY',
    periodKey: '2026-03',
  },
  {
    invoiceId: 'inv-002',
    status: 'FAILED',
    priceCents: 999,
    billingInterval: 'MONTHLY',
    periodKey: '2026-04',
    nextRetryAt: new Date(Date.now() + 86400000).toISOString(),
    dunningAttempt: 1,
  },
  {
    invoiceId: 'inv-003',
    status: 'VOIDED',
    priceCents: 999,
    billingInterval: 'MONTHLY',
    periodKey: '2026-02',
  },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusBadge(status: Invoice['status']): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-700';
    case 'FAILED':
      return 'bg-red-100 text-red-700';
    case 'VOIDED':
      return 'bg-gray-100 text-gray-600';
  }
}

// V-R15 Wave 6: invoice status chips were ALL_CAPS (PAID/FAILED/VOIDED).
// Title-Case for consumer display while preserving the raw enum in data.
function statusLabel(status: Invoice['status']): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// V-R15 Wave 6: billingInterval ("MONTHLY") → "Monthly" for display.
function intervalLabel(interval: string): string {
  return interval.charAt(0) + interval.slice(1).toLowerCase();
}

// V-R15 Wave 6: invoice IDs like "inv-001" → "Invoice #001" for display.
function invoiceDisplayId(id: string): string {
  const m = id.match(/^inv-(\d+)$/);
  return m ? `Invoice #${m[1]}` : id;
}

export function BillingDashboardPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const cascade = searchParams.get('cascade');
  const variant = searchParams.get('variant');
  const isTenantBInstalled = cascade === 'tenant-b-installed-from-a';
  const isTenantBNorthwindBilling = cascade === 'tenant-b-v1.0.2';
  const isTenantCInstalledFromB = cascade === 'tenant-c-installed-from-b';
  const isTenantCTesseraBilling = cascade === 'tenant-c-v1.0.3';
  const isAcmeEnterpriseBilling =
    cascade === 'tenant-a-v1.0.1' ||
    isTenantBInstalled ||
    isTenantBNorthwindBilling ||
    isTenantCInstalledFromB ||
    isTenantCTesseraBilling ||
    variant === 'acme-enterprise-billing';
  const [invoices] = useState<Invoice[]>(DEMO_INVOICES);
  // MRR metric — normalized monthly equivalent
  const mrrCents = 999; // MONTHLY subscription contributes priceCents directly

  // Business-state stub rendering — ?mock=<key> dispatches to BusinessStateCard.
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="subscription-billing"
        flowId="FLOW-12"
        title="Subscription Billing"
        state={MOCK_STATES[mockState]}
        description="Admin view of subscription lifecycle: active, past-due, dunning, and recovery."
      />
    );
  }

  const pageTitle =
    role === 'anonymous' || role === 'public-marketplace-visitor'
      ? 'Plans & Pricing'
      : role === 'tenant-user' || role === 'referral-user'
        ? 'My Subscription'
        : role === 'freelancer'
          ? 'Earnings & Payouts'
          : role === 'business-partner'
            ? 'Partner Invoicing'
            : role === 'event-organiser'
              ? 'Event Revenue'
              : role === 'platform-admin'
                ? 'Platform Billing Overview'
                : role === 'platform-support'
                  ? 'Billing Inspector (Read-Only)'
                  : 'Billing Dashboard'; // tenant-admin — unchanged

  return (
    <div className="p-6 max-w-3xl" data-testid="billing-dashboard-page" data-viewer-role={role}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{pageTitle}</h1>

      {isAcmeEnterpriseBilling && (
        <section
          data-testid="billing-tenant-adaptation"
          className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
        >
          <p className="font-semibold">
            {isTenantCTesseraBilling
              ? 'Tessera community billing'
              : isTenantCInstalledFromB
              ? 'Tessera installed Northwind revenue recovery billing'
              : isTenantBNorthwindBilling
              ? 'Northwind revenue recovery billing'
              : isTenantBInstalled
                ? 'Northwind installed Acme enterprise billing'
                : 'Acme enterprise billing policy'}
          </p>
          <p data-testid="billing-tenant-adaptation-summary" className="mt-1 text-emerald-900">
            {isTenantCTesseraBilling
              ? '28-day trials, community-paced recovery at 72/168/336/504 hours, four-year plan audit retention, and 180-day analytics while preserving Acme and Northwind history.'
              : isTenantCInstalledFromB
              ? 'Tessera is running Northwind policy: 21-day trials, four-step recovery at 24/96/216/360 hours, three-year plan audit retention, and 120-day analytics while preserving Acme and Northwind history.'
              : isTenantBNorthwindBilling
              ? '21-day trials, four-step recovery at 24/96/216/360 hours, three-year plan audit retention, and 120-day analytics while preserving Acme history.'
              : isTenantBInstalled
                ? 'Northwind is running Acme policy: 30-day trial defaults, 48/120/240-hour retries, 730-day plan audit retention, and 90-day analytics.'
                : '30-day trial defaults, 48/120/240-hour retries, 730-day plan audit retention, and 90-day analytics.'}
          </p>
        </section>
      )}

      <RoleScopedView role={role} testIdPrefix="billing-role">
        {/* Branch 1 — anonymous + public-marketplace-visitor (pricing page) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <div data-testid="billing-pricing-view">
            {role === 'public-marketplace-visitor' && (
              <div
                data-testid="pricing-marketplace-note"
                className="mb-4 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-900"
              >
                You arrived from a marketplace listing. Start with the Pro plan to access
                marketplace features.
              </div>
            )}
            <div className="overflow-x-auto mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[680px]">
                {/* Starter — recommended */}
                <div className="border-2 border-blue-500 rounded-lg p-5 bg-blue-50 relative">
                  <span className="absolute -top-2 left-4 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                    Recommended
                  </span>
                  <h2 className="text-xl font-bold text-blue-900">Starter</h2>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    $9.99<span className="text-sm font-normal">/mo</span>
                  </p>
                  <ul className="text-sm text-blue-800 mt-3 space-y-1 mb-4">
                    <li>✓ 5 flows</li>
                    <li>✓ 1 tenant</li>
                    <li>✓ Email support</li>
                  </ul>
                  <a
                    href="/register?plan=starter"
                    data-testid="pricing-starter-cta"
                    className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
                  >
                    Start free trial
                  </a>
                </div>
                {/* Pro */}
                <div className="border border-gray-200 rounded-lg p-5 bg-white">
                  <h2 className="text-xl font-bold text-emerald-700">Pro</h2>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    $29.99<span className="text-sm font-normal">/mo</span>
                  </p>
                  <ul className="text-sm text-gray-700 mt-3 space-y-1 mb-4">
                    <li>✓ 25 flows</li>
                    <li>✓ 5 tenants</li>
                    <li>✓ Priority support</li>
                  </ul>
                  <a
                    href="/register?plan=pro"
                    data-testid="pricing-pro-cta"
                    className="block w-full text-center bg-emerald-600 text-white px-4 py-2 rounded font-medium hover:bg-emerald-700"
                  >
                    Start free trial
                  </a>
                </div>
                {/* Enterprise */}
                <div className="border border-gray-700 rounded-lg p-5 bg-slate-900 text-white">
                  <h2 className="text-xl font-bold">Enterprise</h2>
                  <p className="text-3xl font-bold mt-2">Custom</p>
                  <ul className="text-sm mt-3 space-y-1 mb-4">
                    <li>✓ Unlimited flows</li>
                    <li>✓ Unlimited tenants</li>
                    <li>✓ Dedicated CSM</li>
                  </ul>
                  <a
                    href="/contact"
                    data-testid="pricing-enterprise-cta"
                    className="block w-full text-center bg-white text-slate-900 px-4 py-2 rounded font-medium hover:bg-gray-100"
                  >
                    Contact sales
                  </a>
                </div>
              </div>
            </div>
            <p data-testid="pricing-annual-note" className="text-sm text-gray-600 text-center">
              Save 20% with annual billing
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user + referral-user (my-subscription slice) */}
        <RoleScopedView.Case when={['tenant-user', 'referral-user']}>
          <div data-testid="billing-my-subscription-view">
            {role === 'referral-user' && (
              <div
                data-testid="billing-referral-credits"
                className="mb-4 rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700"
              >
                Referral credits available: $5.00 — applied to your next invoice automatically.
              </div>
            )}
            <div
              data-testid="my-plan-summary"
              className="mb-4 p-4 border border-gray-200 rounded bg-white"
            >
              <p className="text-sm text-gray-600 uppercase tracking-wide">Current Plan</p>
              <p className="text-xl font-bold text-gray-900 mt-1">Starter — $9.99/month</p>
              <p data-testid="my-next-bill-date" className="text-sm text-gray-700 mt-2">
                Next billing date: <span className="font-medium">May 20, 2026</span>
              </p>
              <a
                href="/billing/plan"
                data-testid="my-plan-change-link"
                className="inline-block mt-3 text-sm text-blue-600 hover:underline"
              >
                Change plan →
              </a>
            </div>

            <h2 className="text-lg font-semibold text-gray-800 mb-3">Invoice History</h2>
            <div data-testid="invoice-list" className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.invoiceId}
                  data-testid={`invoice-${inv.invoiceId}`}
                  className={`p-4 border rounded bg-white ${
                    inv.status === 'FAILED' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{invoiceDisplayId(inv.invoiceId)}</span>
                      <span className="text-xs text-gray-500 ml-2">{inv.periodKey}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(inv.status)}`}
                      data-testid={`invoice-status-${inv.invoiceId}`}
                    >
                      {statusLabel(inv.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {formatCents(inv.priceCents)} · {intervalLabel(inv.billingInterval)}
                    </div>
                    {/* RUN-77: per-invoice actions. FAILED gets a Retry primary (Stripe billing portal rule). All invoices get a Download PDF secondary. */}
                    <div className="flex items-center gap-2">
                      {inv.status === 'FAILED' && (
                        <button
                          type="button"
                          data-testid={`invoice-retry-${inv.invoiceId}`}
                          className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                          aria-label={`Retry payment for invoice ${inv.invoiceId}`}
                        >
                          Retry payment
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`invoice-download-${inv.invoiceId}`}
                        className="text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-1 rounded"
                        aria-label={`Download PDF for invoice ${inv.invoiceId}`}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                  {inv.status === 'FAILED' && (
                    <div
                      className="mt-2 text-xs text-red-700"
                      data-testid={`invoice-retry-hint-${inv.invoiceId}`}
                    >
                      Your payment method may need updating.{' '}
                      <a href="/billing-dashboard/payment-method" className="underline font-medium">
                        Update payment method →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (invoice list + compact plan strip)
            RUN-93: the previous MRR metric "hero" card (big 3xl number, uppercase
            small-caps label, 'Normalized monthly equivalent — annual plans divided
            by 12' supporting text, blue-50/blue-200 background tile) was the
            textbook hero-metric AI-slop template named in every critique doc.
            Replaced with a compact plan strip so the invoice list — and
            specifically the FAILED invoice within it — becomes the page's
            dominant composition. See /.impeccable.md principle 2:
            state-first, action-required rises. */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="billing-admin-view">
            {/* Compact plan strip — Stripe billing portal convention */}
            <div
              data-testid="mrr-metric-card"
              className="mb-5 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3"
            >
              <span>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Current plan
                </span>
                <span className="font-semibold text-slate-900" data-testid="mrr-value">
                  {formatCents(mrrCents)}
                </span>
                <span className="text-slate-500">/mo</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Renews
                </span>
                <span className="font-medium text-slate-800">May 15, 2026</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <a
                href="/billing/plan"
                className="text-blue-600 hover:text-blue-700 hover:underline"
                data-testid="plan-change-link"
              >
                Change plan
              </a>
            </div>

            {/* Invoice List — T211 — the page's dominant composition */}
            <div data-testid="invoice-list">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Invoices</h2>
              {invoices.length === 0 ? (
                <p className="text-gray-500 text-sm" data-testid="invoice-empty">
                  No invoices yet
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div
                      key={inv.invoiceId}
                      data-testid={`invoice-${inv.invoiceId}`}
                      className="p-4 border border-gray-200 rounded bg-white"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{invoiceDisplayId(inv.invoiceId)}</span>
                          <span className="text-xs text-gray-500 ml-2">{inv.periodKey}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(inv.status)}`}
                          data-testid={`invoice-status-${inv.invoiceId}`}
                        >
                          {statusLabel(inv.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {formatCents(inv.priceCents)} · {intervalLabel(inv.billingInterval)}
                      </div>
                      {inv.status === 'FAILED' && inv.nextRetryAt && (
                        <>
                          <div
                            className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded"
                            data-testid={`dunning-status-${inv.invoiceId}`}
                          >
                            Dunning attempt {inv.dunningAttempt} — retry at{' '}
                            {new Date(inv.nextRetryAt).toLocaleString()}
                          </div>
                          <button
                            data-testid={`retry-payment-${inv.invoiceId}`}
                            aria-label={`Retry payment for invoice ${inv.invoiceId}`}
                            onClick={() => console.log('Retry payment for', inv.invoiceId)}
                            className="mt-2 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700"
                          >
                            Retry Now
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — freelancer (earnings ledger) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="billing-freelancer-view">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
              <p
                data-testid="freelancer-earnings-total"
                className="text-2xl font-bold text-green-900"
              >
                $850.00
              </p>
              <p className="text-sm text-green-700">Total earnings this month</p>
              <p data-testid="freelancer-next-payout" className="text-sm text-green-800 mt-2">
                Next payout: <span className="font-medium">May 25, 2026</span>
              </p>
              <p data-testid="freelancer-payout-method" className="text-sm text-green-800">
                Payout method: Direct deposit ••••1234
              </p>
            </div>
            <div className="overflow-x-auto mb-4">
              <table
                data-testid="freelancer-earnings-table"
                className="w-full text-sm min-w-[640px]"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Gig</th>
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Released</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      gig: 'Build REST API integration',
                      amount: '$1,000.00',
                      status: 'RELEASED',
                      date: '2026-04-15',
                      color: 'bg-green-100 text-green-800',
                    },
                    {
                      gig: 'Design mobile app UI',
                      amount: '$750.00',
                      status: 'PENDING',
                      date: '2026-05-01',
                      color: 'bg-amber-100 text-amber-800',
                    },
                    {
                      gig: 'Write API documentation',
                      amount: '$450.00',
                      status: 'IN_ESCROW',
                      date: '—',
                      color: 'bg-blue-100 text-blue-800',
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      data-testid={`freelancer-earning-${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="p-2">{row.gig}</td>
                      <td className="p-2 font-medium">{row.amount}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${row.color}`}
                        >
                          <span aria-hidden="true">●</span> {row.status}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/freelancer/tax"
              data-testid="freelancer-tax-link"
              className="text-sm text-blue-600 hover:underline"
            >
              Download tax forms (1099) →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — business-partner (B2B invoicing) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="billing-partner-view">
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500 uppercase">Contract</p>
                <p
                  data-testid="partner-contract-summary"
                  className="text-sm font-medium text-slate-900"
                >
                  CONTRACT-2026-042 · Annual
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Payment Terms</p>
                <p
                  data-testid="partner-payment-terms"
                  className="text-sm font-medium text-slate-900"
                >
                  Net-30
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Outstanding Balance</p>
                <p data-testid="partner-balance" className="text-sm font-medium text-slate-900">
                  $600.00
                </p>
              </div>
            </div>
            <div className="overflow-x-auto mb-3">
              <table data-testid="partner-invoice-table" className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Invoice</th>
                    <th className="p-2 font-medium">PO</th>
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      inv: 'Invoice #B-001',
                      po: 'PO #2026-0012',
                      amt: '$600.00',
                      st: 'Paid',
                      due: '2026-03-30',
                      color: 'bg-green-100 text-green-800',
                    },
                    {
                      inv: 'Invoice #B-002',
                      po: 'PO #2026-0015',
                      amt: '$600.00',
                      st: 'Paid',
                      due: '2026-04-30',
                      color: 'bg-green-100 text-green-800',
                    },
                    {
                      inv: 'Invoice #B-003',
                      po: 'PO #2026-0018',
                      amt: '$600.00',
                      st: 'Due',
                      due: '2026-05-30',
                      color: 'bg-amber-100 text-amber-800',
                    },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2 font-medium">{row.inv}</td>
                      <td className="p-2 text-gray-600">{row.po}</td>
                      <td className="p-2">{row.amt}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${row.color}`}
                        >
                          <span aria-hidden="true">●</span> {row.st}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600">{row.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <a
              href="/partner/invoices/export"
              data-testid="partner-invoices-download"
              className="text-sm text-blue-600 hover:underline"
            >
              Download all invoices (PDF) →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — event-organiser (per-event revenue) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="billing-organiser-view">
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-purple-600 uppercase">Gross Revenue</p>
                <p
                  data-testid="organiser-revenue-total"
                  className="text-xl font-bold text-purple-900"
                >
                  $4,260.00
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-600 uppercase">Platform Fee (15%)</p>
                <p
                  data-testid="organiser-platform-fee"
                  className="text-xl font-bold text-purple-900"
                >
                  $639.00
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-600 uppercase">Net Payout</p>
                <p data-testid="organiser-net-payout" className="text-xl font-bold text-purple-900">
                  $3,621.00
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table data-testid="organiser-events-table" className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Event</th>
                    <th className="p-2 font-medium">Tickets</th>
                    <th className="p-2 font-medium">Gross</th>
                    <th className="p-2 font-medium">Fee</th>
                    <th className="p-2 font-medium">Net</th>
                    <th className="p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      ev: 'Spring Networking Mixer',
                      n: 85,
                      gross: '$2,550',
                      fee: '$382.50',
                      net: '$2,167.50',
                      st: 'PAID',
                      color: 'bg-green-100 text-green-800',
                    },
                    {
                      ev: 'Tech Workshop April',
                      n: 57,
                      gross: '$1,710',
                      fee: '$256.50',
                      net: '$1,453.50',
                      st: 'PENDING',
                      color: 'bg-amber-100 text-amber-800',
                    },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2 font-medium">{row.ev}</td>
                      <td className="p-2">{row.n}</td>
                      <td className="p-2">{row.gross}</td>
                      <td className="p-2 text-gray-600">{row.fee}</td>
                      <td className="p-2 font-medium">{row.net}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${row.color}`}
                        >
                          <span aria-hidden="true">●</span> {row.st}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — platform-admin (cross-tenant revenue) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="billing-platform-admin-view">
            {/* RUN-113: platform-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="platform-mrr-total">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Total MRR (all tenants)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">$142,650</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="platform-subscription-count">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active subscriptions
                </span>
                <span className="tabular-nums font-semibold text-emerald-700">14,265</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="platform-failed-payments">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Failed payments (24h)
                </span>
                <span className="tabular-nums font-semibold text-rose-700">23</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs attention</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/platform/billing/report"
                data-testid="platform-revenue-report"
                className="text-sm text-blue-600 hover:underline"
              >
                Revenue reconciliation report →
              </a>
              <a
                href="/platform/billing/webhooks"
                data-testid="platform-webhook-audit"
                className="text-sm text-blue-600 hover:underline"
              >
                Stripe webhook audit →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 8 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="billing-support-view">
            <div className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700">
              Read-only billing inspector. Search by tenant ID or invoice ID.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="billing-support-search" className="sr-only">
                Tenant ID or invoice ID
              </label>
              <input
                id="billing-support-search"
                data-testid="billing-support-search"
                type="text"
                placeholder="tenant-xxx or inv-xxx"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="billing-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="billing-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a tenant ID or invoice ID
            </div>
            <a
              href="/platform/escalate"
              data-testid="billing-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate billing issue to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback */}
        <RoleScopedView.Fallback>
          <div data-testid="billing-fallback-view" className="text-center py-8">
            <p className="text-gray-700 mb-3">
              Billing information is not available for your current role.
            </p>
            <a href="/" className="text-blue-600 hover:underline">
              Go to Dashboard →
            </a>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
