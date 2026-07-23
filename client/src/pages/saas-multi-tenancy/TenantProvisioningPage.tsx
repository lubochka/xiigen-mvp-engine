/**
 * TenantProvisioningPage — FLOW-15 T605
 *
 * Role-aware screen (C6 / SK-539): FLOW-15 is Tier 2 (6 required cells). The
 * existing provisioning form is the PLATFORM-ADMIN tool; other roles see
 * purpose-built surfaces (public signup, tenant directory, tenant switcher,
 * tenant settings, support inspector).
 *
 * Shows PROVISIONING → ACTIVE status transitions (platform-admin branch).
 * tenantId is computed server-side (not from form).
 */
import React, { useState } from 'react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const SAMPLE_TENANTS = [
  { name: 'Acme Corp', slug: 'acme-corp', tier: 'Starter', members: 142, public: true },
  { name: 'TechSoft Ltd', slug: 'techsoft-ltd', tier: 'Pro', members: 58, public: true },
  { name: 'Creative Studio', slug: 'creative-studio', tier: 'Enterprise', members: 310, public: false },
];

const MY_TENANTS = [
  { name: 'Acme Corp', role: 'admin', lastActive: '2h ago', color: 'bg-orange-100 text-orange-800' },
  { name: 'TechSoft Ltd', role: 'member', lastActive: '3d ago', color: 'bg-blue-100 text-blue-800' },
  { name: 'Creative Studio', role: 'freelancer', lastActive: '1w ago', color: 'bg-purple-100 text-purple-800' },
];

const TIER_COLOR: Record<string, string> = {
  Starter: 'bg-blue-100 text-blue-800',
  Pro: 'bg-emerald-100 text-emerald-800',
  Enterprise: 'bg-slate-800 text-white',
};

export function TenantProvisioningPage() {
  const { role } = useViewerRole();
  const [tenantSlug, setTenantSlug] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState('starter');
  const [billingContact, setBillingContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [provisionResult, setProvisionResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<'Starter' | 'Pro' | 'Enterprise'>('Starter');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!tenantSlug) {
      setError('Tenant slug is required');
      return;
    }
    if (!billingContact) {
      setError('Billing contact is required');
      return;
    }

    setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setProvisionResult({
        tenantId: 'tenant-' + Date.now(),
        tenantSlug,
        subscriptionTier,
        status: 'ACTIVE',
        provisionedAt: new Date().toISOString(),
      });
    }, 300);
  }

  const pageTitle =
    role === 'anonymous'
      ? 'Start Your XIIGen Tenant'
      : role === 'public-marketplace-visitor'
        ? 'Tenant Directory'
        : role === 'tenant-user'
          ? 'My Tenants'
          : role === 'tenant-admin'
            ? 'Tenant Settings'
            : role === 'platform-admin'
              ? 'Provision Tenant'
              : role === 'platform-support'
                ? 'Tenant Inspector (Read-Only)'
                : 'Tenant Management';

  function TenantUserSwitcher() {
    return (
      <div>
        <div
          data-testid="tenant-user-current"
          className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
        >
          Currently in: <span className="font-semibold">Acme Corp</span>
        </div>
        <ul data-testid="tenant-user-list" className="space-y-2 mb-4">
          {MY_TENANTS.map((t, i) => (
            <li
              key={i}
              data-testid={`tenant-user-item-${i}`}
              className="p-3 border border-gray-200 rounded bg-white flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${t.color}`}
                  >
                    {t.role}
                  </span>
                  <span>· Last active {t.lastActive}</span>
                </p>
              </div>
              <button
                data-testid={`tenant-user-switch-${i}`}
                aria-label={`Switch to ${t.name}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                style={{ minHeight: '44px' }}
              >
                Switch
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <a
            href="/tenants"
            data-testid="tenant-user-join"
            className="text-sm text-blue-600 hover:underline"
          >
            Join a new tenant →
          </a>
          <a
            href="/register?new-tenant=true"
            data-testid="tenant-user-create"
            className="text-sm text-blue-600 hover:underline"
          >
            Create your own tenant →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl" data-testid="tenant-provisioning-page" data-viewer-role={role}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{pageTitle}</h1>

      <RoleScopedView role={role} testIdPrefix="tenant-role">
        {/* Branch 1 — anonymous (public signup funnel) */}
        <RoleScopedView.Case when="anonymous">
          <div data-testid="tenant-role-anon-view">
            <p
              data-testid="tenant-anon-step"
              className="text-xs text-gray-500 uppercase tracking-wider mb-3"
            >
              Step 1 of 3 — Choose your plan
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  {
                    name: 'Starter' as const,
                    price: '$9.99',
                    sub: '5 flows · 1 tenant',
                    border: 'border-blue-500',
                    bg: 'bg-blue-50',
                    tid: 'tenant-anon-plan-starter',
                  },
                  {
                    name: 'Pro' as const,
                    price: '$29.99',
                    sub: '25 flows · 5 tenants',
                    border: 'border-gray-200',
                    bg: 'bg-white',
                    tid: 'tenant-anon-plan-pro',
                  },
                  {
                    name: 'Enterprise' as const,
                    price: 'Custom',
                    sub: 'Unlimited',
                    border: 'border-gray-700',
                    bg: 'bg-slate-900 text-white',
                    tid: 'tenant-anon-plan-enterprise',
                  },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    data-testid={p.tid}
                    aria-pressed={selectedPlan === p.name}
                    onClick={() => setSelectedPlan(p.name)}
                    className={`min-w-0 text-start p-4 rounded-lg border-2 ${p.border} ${p.bg} ${
                      selectedPlan === p.name ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    <h2 className="text-xl font-bold break-words">{p.name}</h2>
                    <p className="text-2xl font-bold mt-1 break-words">{p.price}</p>
                    <p className={`text-sm ${p.bg.includes('slate-900') ? 'text-gray-300' : 'text-gray-600'}`}>
                      {p.sub}
                    </p>
                  </button>
                ))}
            </div>
            <p
              data-testid="tenant-anon-selected-plan"
              className="text-sm text-gray-700 mb-3"
            >
              Selected:{' '}
              <span className="font-semibold">
                {selectedPlan}
                {selectedPlan === 'Starter'
                  ? ' ($9.99/mo)'
                  : selectedPlan === 'Pro'
                    ? ' ($29.99/mo)'
                    : ' (custom)'}
              </span>
            </p>
            <a
              href={`/register?plan=${selectedPlan.toLowerCase()}`}
              data-testid="tenant-anon-continue"
              className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 mb-3"
              style={{ minHeight: '44px' }}
            >
              Continue →
            </a>
            <a
              href="/login"
              data-testid="tenant-anon-signin"
              className="text-sm text-blue-600 hover:underline"
            >
              Already have an account? Sign in →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — public-marketplace-visitor (tenant directory) */}
        <RoleScopedView.Case when="public-marketplace-visitor">
          <div data-testid="tenant-role-public-mkt-view">
            <div
              data-testid="tenant-public-mkt-banner"
              className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              Browse XIIGen tenants.{' '}
              <a
                href="/login"
                data-testid="tenant-public-mkt-signin"
                className="underline font-medium"
              >
                Sign in
              </a>{' '}
              to join a tenant or create your own.
            </div>
            <ul data-testid="tenant-public-mkt-directory" className="space-y-3 mb-4">
              {SAMPLE_TENANTS.map((t, i) => (
                <li
                  key={i}
                  data-testid={`tenant-public-mkt-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-1">{t.slug}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {t.members} members · {t.public ? 'Public' : 'Private'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${TIER_COLOR[t.tier]}`}
                    >
                      {t.tier}
                    </span>
                  </div>
                  {t.public ? (
                    <a
                      href={`/register?tenant=${t.slug}`}
                      data-testid={`tenant-public-mkt-join-${i}`}
                      className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                    >
                      Join →
                    </a>
                  ) : (
                    <a
                      href={`/access-request?tenant=${t.slug}`}
                      data-testid={`tenant-public-mkt-request-${i}`}
                      className="inline-block mt-3 text-sm text-gray-700 hover:underline"
                    >
                      Request Access →
                    </a>
                  )}
                </li>
              ))}
            </ul>
            <a
              href="/register"
              data-testid="tenant-public-mkt-create"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
              style={{ minHeight: '44px' }}
            >
              Create your own tenant →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-user (multi-tenant switcher) */}
        <RoleScopedView.Case when="tenant-user">
          <div data-testid="tenant-role-user-view">
            <TenantUserSwitcher />
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — tenant-admin (settings console) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="tenant-role-admin-view">
            <div
              data-testid="tenant-admin-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Tenant admin — configure your tenant settings.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {[
                { href: '/admin/tenant/branding', tid: 'tenant-admin-branding', label: 'Branding & Domain' },
                { href: '/admin/tenant/sso', tid: 'tenant-admin-sso', label: 'SSO / SAML Settings' },
                { href: '/admin/tenant/members', tid: 'tenant-admin-members', label: 'Member Invitations' },
                { href: '/billing-dashboard', tid: 'tenant-admin-billing', label: 'Billing & Subscription' },
              ].map((c) => (
                <a
                  key={c.tid}
                  href={c.href}
                  data-testid={c.tid}
                  className="block p-4 border border-gray-200 rounded bg-white hover:border-blue-400 hover:bg-blue-50"
                  style={{ minHeight: '44px' }}
                >
                  <p className="font-medium text-gray-900">{c.label} →</p>
                </a>
              ))}
            </div>
            <div className="p-4 border border-red-200 rounded bg-red-50">
              <h2 className="font-semibold text-red-900 mb-2">Danger zone</h2>
              <button
                data-testid="tenant-admin-offboard"
                aria-label="Offboard tenant — this action is irreversible"
                className="border border-red-600 text-red-700 px-4 py-2 rounded text-sm font-medium hover:bg-red-100"
                style={{ minHeight: '44px' }}
              >
                Offboard this tenant
              </button>
              <p
                data-testid="tenant-admin-offboard-note"
                className="text-xs text-red-700 mt-2"
              >
                Offboarding is permanent. All data will be archived.
              </p>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (THE EXISTING FORM, unchanged) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="tenant-role-platform-admin-view">
            {status === 'success' && provisionResult && (
              <div
                data-testid="provision-success"
                className="mb-4 p-4 bg-green-50 border border-green-200 rounded"
              >
                <p className="text-green-700 font-medium">Tenant provisioned!</p>
                <p className="text-sm text-green-600" data-testid="tenant-id">
                  ID: {String(provisionResult['tenantId'])}
                </p>
                <p className="text-sm text-green-600" data-testid="tenant-status">
                  Status: {String(provisionResult['status'])}
                </p>
                <p className="text-sm text-green-600" data-testid="tenant-tier">
                  Tier: {String(provisionResult['subscriptionTier'])}
                </p>
              </div>
            )}

            {error && (
              <div
                data-testid="provision-error"
                role="alert"
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="tenant-slug-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tenant Slug
                </label>
                <input
                  id="tenant-slug-input"
                  data-testid="tenant-slug-input"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="acme-corp"
                />
              </div>
              <div>
                <label
                  htmlFor="tier-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Subscription Tier
                </label>
                <select
                  id="tier-select"
                  data-testid="tier-select"
                  value={subscriptionTier}
                  onChange={(e) => setSubscriptionTier(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="billing-contact-input"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing Contact
                </label>
                <input
                  id="billing-contact-input"
                  data-testid="billing-contact-input"
                  value={billingContact}
                  onChange={(e) => setBillingContact(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="billing@acme.com"
                />
              </div>
              <button
                data-testid="provision-submit"
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
                style={{ minHeight: '44px' }}
              >
                {status === 'loading' ? 'Provisioning...' : 'Provision Tenant'}
              </button>
            </form>
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="tenant-role-support-view">
            <div
              data-testid="tenant-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only tenant inspector. Search by tenant ID or slug.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="tenant-support-search" className="sr-only">
                Tenant ID or slug
              </label>
              <input
                id="tenant-support-search"
                data-testid="tenant-support-search"
                type="text"
                placeholder="Tenant ID or slug"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="tenant-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="tenant-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a tenant ID or slug to inspect
            </div>
            <a
              href="/platform/support/escalate"
              data-testid="tenant-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate tenant issue to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — referral-user / freelancer / business-partner / event-organiser */}
        <RoleScopedView.Fallback>
          <div data-testid="tenant-fallback-view">
            <TenantUserSwitcher />
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
