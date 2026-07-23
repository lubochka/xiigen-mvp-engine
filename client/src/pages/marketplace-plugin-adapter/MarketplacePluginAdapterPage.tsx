/**
 * MarketplacePluginAdapterPage — FLOW-34 admin console for Marketplace Plugin Adapter.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-marketplace-plugin-adapter
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   ADAPTER_REGISTERED → PLUGIN_CONNECTED → PAYLOAD_TRANSLATED → SYNCED
 * Plus states derived from adapter pattern for external marketplace plugins
 * (WordPress, Shopify, etc.) — covers auth, schema mismatch, rate limit.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { AdapterLifecycleCanvas } from '../../components/marketplace-plugin-adapter/AdapterLifecycleCanvas';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const SAMPLE_PLUGINS = [
  {
    id: 'PLG-shopify-sync-v2',
    name: 'Shopify Sync',
    category: 'E-commerce',
    installs: 1847,
    rating: 4.9,
    vendor: 'payments-co',
    version: 'v2.3.1',
    security: 'VERIFIED' as const,
    free: true,
    price: '',
  },
  {
    id: 'PLG-wordpress-bridge-v1',
    name: 'WordPress Bridge',
    category: 'CMS',
    installs: 923,
    rating: 4.7,
    vendor: 'content-tools',
    version: 'v1.4.0',
    security: 'VERIFIED' as const,
    free: false,
    price: '$4.99/mo',
  },
  {
    id: 'PLG-hubspot-crm-v3',
    name: 'HubSpot CRM',
    category: 'CRM',
    installs: 612,
    rating: 4.6,
    vendor: 'integrations-co',
    version: 'v3.0.0',
    security: 'PENDING_REVIEW' as const,
    free: false,
    price: '$9.99/mo',
  },
];

const MOCK_STATES: Record<string, BusinessState> = {
  'adapter-registered': {
    idx: 1,
    label: 'Adapter registered — credentials stored, not yet connected',
    status: 'REGISTERED',
    fields: {
      adapterId: 'ADP-shopify-01',
      pluginType: 'shopify',
      tenantId: 'TNT-acme-corp',
      registeredAt: '2026-04-19 09:00',
    },
  },
  'handshake-pending': {
    idx: 2,
    label: 'OAuth handshake in progress — awaiting external consent',
    status: 'PENDING',
    fields: {
      adapterId: 'ADP-shopify-01',
      handshakeId: 'HS-2026-0419-001',
      redirectUrl: 'https://acme.myshopify.com/oauth',
      initiatedAt: '2026-04-19 09:02',
    },
  },
  'plugin-connected': {
    idx: 3,
    label: 'Plugin connected — token exchange succeeded',
    status: 'CONNECTED',
    fields: {
      adapterId: 'ADP-shopify-01',
      externalScope: 'read_products,write_orders',
      connectedAt: '2026-04-19 09:05',
      tokenExpiresAt: '2026-05-19',
    },
  },
  'payload-translating': {
    idx: 4,
    label: 'Inbound payload being translated to engine schema',
    status: 'TRANSFORMING',
    fields: {
      adapterId: 'ADP-shopify-01',
      payloadId: 'PLD-2026-0419-042',
      sourceSchema: 'shopify.order.v2',
      targetIndex: 'xiigen-marketplace-payments',
      startedAt: '2026-04-19 09:10',
    },
  },
  'payload-translated': {
    idx: 5,
    label: 'Payload translation COMPLETE — ready for enqueue',
    status: 'COMPLETE',
    fields: {
      adapterId: 'ADP-shopify-01',
      payloadId: 'PLD-2026-0419-042',
      fieldsMapped: '23',
      fieldsSkipped: '2',
      translatedAt: '2026-04-19 09:10',
    },
  },
  synced: {
    idx: 6,
    label: 'Plugin SYNCED — engine reflects external state',
    status: 'SYNCED',
    fields: {
      adapterId: 'ADP-shopify-01',
      recordsSynced: '142',
      lastSyncAt: '2026-04-19 10:00',
      nextSyncAt: '2026-04-19 10:15',
    },
  },
  'schema-mismatch': {
    idx: 7,
    label: 'Schema mismatch — adapter rejected payload',
    status: 'FAILED',
    fields: {
      adapterId: 'ADP-wordpress-02',
      payloadId: 'PLD-2026-0419-043',
      errorCode: 'SCHEMA_INVALID',
      missingFields: 'order_id, currency',
      failedAt: '2026-04-19 10:05',
    },
  },
  'rate-limited': {
    idx: 8,
    label: 'External API rate-limited — sync paused',
    status: 'DEGRADED',
    fields: {
      adapterId: 'ADP-shopify-01',
      throttleWindow: '60s',
      retryAt: '2026-04-19 10:06',
      remainingQuota: '0/40',
    },
  },
};

export function MarketplacePluginAdapterPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const slotsFull = searchParams.get('slots-full') === 'true';

  // Path A: mock states — UNCHANGED, accessible to all roles
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="marketplace-plugin-adapter"
        flowId="FLOW-34"
        title="Marketplace Plugin Adapter"
        state={MOCK_STATES[mockState]}
        description="Admin view of adapter registration, plugin handshake, payload translation, sync, and error states."
      />
    );
  }

  // Path B: role-aware — dual-sided plugin marketplace
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="mpa-role">
        {/* Branch 1 — anonymous + public-marketplace-visitor (consumer read-only browse) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          <div data-testid="mpa-role-browse-view" className="max-w-5xl mx-auto p-6">
            <div
              data-testid="mpa-browse-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              Sign in to install plugins or publish your own.{' '}
              <a href="/login" data-testid="mpa-browse-signin" className="underline font-medium">
                Sign in →
              </a>
            </div>
            <h1 data-testid="mpa-browse-heading" className="text-2xl font-bold text-gray-900 mb-4">
              Plugin Catalog
            </h1>
            <div data-testid="mpa-browse-categories" className="flex gap-3 mb-4 text-sm">
              <span className="text-gray-500">All</span>
              <span className="text-gray-500">E-commerce</span>
              <span className="text-gray-500">CMS</span>
              <span className="text-gray-500">CRM</span>
              <span className="text-gray-500">Analytics</span>
            </div>
            <div data-testid="mpa-browse-list" className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_PLUGINS.map((p, i) => (
                <div
                  key={p.id}
                  data-testid={`mpa-browse-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.category} · by {p.vendor}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span aria-label={`${p.rating} out of 5 stars`}>★ {p.rating}</span> (
                    {p.installs} installs) · {p.version}
                  </p>
                  <p
                    data-testid={`mpa-security-badge-${i}`}
                    className={`text-xs mt-2 font-medium ${p.security === 'VERIFIED' ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {p.security === 'VERIFIED' ? '✓ Security Verified' : '⏳ Pending Review'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{p.free ? 'Free' : p.price}</p>
                  <a
                    href="/login"
                    data-testid={`mpa-browse-install-${i}`}
                    className="inline-block mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Sign in to install
                  </a>
                </div>
              ))}
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — tenant-user + tenant-admin (consumer with install/manage) */}
        <RoleScopedView.Case when={['tenant-user', 'tenant-admin', 'referral-user']}>
          <div data-testid="mpa-role-consumer-view" className="max-w-5xl mx-auto p-6">
            <h1
              data-testid="mpa-consumer-heading"
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Plugin Catalog
            </h1>
            <div
              data-testid="mpa-consumer-list"
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
            >
              {SAMPLE_PLUGINS.map((p, i) => (
                <div
                  key={p.id}
                  data-testid={`mpa-consumer-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.category} · {p.version} · by {p.vendor}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    ★ {p.rating} ({p.installs} installs)
                  </p>
                  <p
                    className={`text-xs mt-2 font-medium ${p.security === 'VERIFIED' ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {p.security === 'VERIFIED' ? '✓ Security Verified' : '⏳ Pending Review'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{p.free ? 'Free' : p.price}</p>
                  {p.security === 'PENDING_REVIEW' ? (
                    <>
                      <button
                        disabled
                        data-testid={`mpa-consumer-install-${i}`}
                        aria-label={`Install ${p.name} (disabled — pending security review)`}
                        className="mt-3 w-full bg-gray-200 text-gray-500 px-3 py-2 rounded text-sm font-medium cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        Install
                      </button>
                      <p
                        data-testid={`mpa-consumer-pending-note-${i}`}
                        className="text-xs text-amber-700 mt-1"
                      >
                        Security review pending
                      </p>
                    </>
                  ) : (
                    <button
                      data-testid={`mpa-consumer-install-${i}`}
                      aria-label={`Install ${p.name}`}
                      className="mt-3 w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                      style={{ minHeight: '44px' }}
                    >
                      Install
                    </button>
                  )}
                </div>
              ))}
            </div>

            {role === 'referral-user' && (
              <div
                data-testid="mpa-referral-note"
                className="mb-3 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700"
              >
                Referral tracked: Installing plugins via your referral link earns rewards.
              </div>
            )}

            <div data-testid="mpa-consumer-installed">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Installed Plugins (2)</h2>
              {[
                {
                  name: 'Shopify Sync',
                  version: 'v2.3.1',
                  status: 'Connected',
                  statusColor: 'text-green-700',
                  lastSync: '2h ago',
                },
                {
                  name: 'WordPress Bridge',
                  version: 'v1.4.0',
                  status: 'Synced',
                  statusColor: 'text-blue-700',
                  lastSync: '30min ago',
                },
              ].map((plugin, i) => (
                <div
                  key={i}
                  data-testid={`mpa-consumer-plugin-${i}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white mb-2"
                >
                  <div>
                    <p className="font-medium">
                      {plugin.name} {plugin.version}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className={`${plugin.statusColor} font-medium`}>
                        <span aria-hidden="true">●</span> {plugin.status}
                      </span>{' '}
                      · Last sync: {plugin.lastSync}
                    </p>
                  </div>
                  <button
                    data-testid={`mpa-consumer-disconnect-${i}`}
                    aria-label={`Disconnect ${plugin.name}`}
                    className="border border-red-400 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-50"
                    style={{ minHeight: '44px' }}
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>

            {role === 'tenant-admin' && (
              <div
                data-testid="mpa-admin-config"
                className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm"
              >
                <a
                  href="/admin/plugins/configure"
                  data-testid="mpa-admin-config-link"
                  className="text-orange-700 hover:underline"
                >
                  Configure plugin permissions for this tenant →
                </a>
              </div>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — business-partner (PRIMARY VENDOR) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="mpa-role-vendor-view" className="max-w-4xl mx-auto p-6">
            <div
              data-testid="mpa-vendor-banner"
              className="mb-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              Vendor dashboard — manage your plugin listings.
            </div>
            <div data-testid="mpa-vendor-my-plugins" className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">My Published Plugins</h2>
              {[
                {
                  name: 'Shopify Sync v2.3.1',
                  installs: '1,847',
                  price: '$0 (free)',
                  security: 'VERIFIED',
                  status: 'Listed',
                  statusColor: 'text-green-700',
                },
                {
                  name: 'HubSpot CRM v3.0.0',
                  installs: '612',
                  price: '$9.99/mo',
                  security: 'PENDING_REVIEW',
                  status: 'Under review',
                  statusColor: 'text-amber-700',
                },
              ].map((p, i) => (
                <div
                  key={i}
                  data-testid={`mpa-vendor-plugin-${i}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white mb-2"
                >
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {p.installs} installs · {p.price} ·{' '}
                      <span className={`${p.statusColor} font-medium`}>
                        <span aria-hidden="true">●</span> {p.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <a
                      href={`/plugins/manage/${i}`}
                      data-testid={`mpa-vendor-manage-${i}`}
                      className="text-blue-600 hover:underline"
                    >
                      Manage →
                    </a>
                    <a
                      href={`/plugins/release/${i}`}
                      data-testid={`mpa-vendor-version-${i}`}
                      className="text-blue-600 hover:underline"
                    >
                      New version →
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* RUN-102: vendor revenue panel refactored from a 3-tile
                "big number + caption" grid to a compact summary row.
                The panel now reads as a tight operator-facing line
                rather than a marketing-style metric card. */}
            <div
              data-testid="mpa-vendor-revenue"
              className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-t border-slate-200 pt-3"
            >
              <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1">
                Revenue
              </span>
              <span data-testid="mpa-vendor-revenue-total">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  This month
                </span>
                <span className="tabular-nums font-semibold text-slate-900">$1,847.50</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-vendor-installs-total">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Total installs
                </span>
                <span className="tabular-nums font-semibold text-slate-900">2,459</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-vendor-active-subscriptions">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active subscriptions
                </span>
                <span className="tabular-nums font-semibold text-slate-900">612</span>
              </span>
            </div>

            <div className="mt-4 flex gap-3 flex-wrap">
              <a
                href="/plugins/publish"
                data-testid="mpa-vendor-publish"
                className="inline-flex items-center bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium hover:bg-slate-800"
                style={{ minHeight: '44px' }}
              >
                Publish new plugin →
              </a>
              <a
                href="/plugins/docs"
                data-testid="mpa-vendor-docs"
                className="text-sm text-blue-600 hover:underline self-center"
              >
                Vendor developer docs →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — freelancer (NICHE VENDOR, lighter path) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="mpa-role-niche-vendor-view" className="max-w-3xl mx-auto p-6">
            <div
              data-testid="mpa-niche-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Niche publisher — you can publish up to 3 plugins.
            </div>
            <p data-testid="mpa-niche-count" className="text-sm text-gray-700 mb-3">
              <span className="font-semibold">{slotsFull ? '3' : '1'} of 3</span> plugin slots used
            </p>

            <div
              data-testid="mpa-niche-plugin-0"
              className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white mb-4"
            >
              <div>
                <p className="font-medium">Task Reminder v1.0.0</p>
                <p className="text-xs text-gray-600 mt-1">
                  47 installs · Free ·{' '}
                  <span className="text-green-700 font-medium">
                    <span aria-hidden="true">●</span> Listed
                  </span>
                </p>
              </div>
              <a
                href="/plugins/manage/task-reminder"
                data-testid="mpa-niche-manage-0"
                className="text-sm text-blue-600 hover:underline"
              >
                Manage →
              </a>
            </div>

            {slotsFull ? (
              <>
                <button
                  disabled
                  data-testid="mpa-niche-publish"
                  aria-label="Publish new plugin (slot limit reached)"
                  className="w-full bg-gray-200 text-gray-500 px-4 py-2 rounded text-sm font-medium cursor-not-allowed"
                  style={{ minHeight: '44px' }}
                >
                  Publish a new plugin →
                </button>
                <p data-testid="mpa-niche-limit-note" className="text-xs text-amber-700 mt-2">
                  Slot limit reached. Remove an existing plugin or upgrade to vendor account.
                </p>
              </>
            ) : (
              <a
                href="/plugins/publish"
                data-testid="mpa-niche-publish"
                className="inline-flex items-center justify-center w-full bg-purple-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-purple-700"
                style={{ minHeight: '44px' }}
              >
                Publish a new plugin →
              </a>
            )}

            <a
              href="/contact"
              data-testid="mpa-niche-upgrade"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Upgrade to vendor account for unlimited plugins →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (CURATOR) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="mpa-role-curator-view">
            <div
              data-testid="mpa-curator-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform curator — plugin security reviews and approval queue.
            </div>
            {/* RUN-102: platform-curator hero tiles \u2192 summary row (RUN-91 pattern).
                Action-required state (amber Pending, rose Failed) preserved via
                tabular-nums colouring, not via coloured background cards. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="mpa-curator-pending-scan">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Pending security scan
                </span>
                <span className="tabular-nums font-semibold text-amber-700">8</span>
                <span className="text-slate-400 ml-1">plugins</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-curator-failed">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Failed security review
                </span>
                <span className="tabular-nums font-semibold text-rose-700">2</span>
                <span className="ml-1 text-slate-400 text-[11px]">requires action</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-curator-approved-count">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Approved this week
                </span>
                <span className="tabular-nums font-semibold text-slate-900">23</span>
              </span>
            </div>
            {/* RUN-70: Grammar 4 topology canvas rebuild (FLOW-34 adapter lifecycle).
                Replaces CRUD-default with an 8-state lifecycle DAG showing
                adapter-registered -> handshake -> translation -> synced, plus
                schema-mismatch + rate-limited error branches.
                Reference: Zapier + Stripe Connect + n8n adapter view. */}
            <section
              data-testid="mpa-curator-adapter-lifecycle-section"
              aria-labelledby="mpa-adapter-lifecycle-heading"
              className="mx-4 mb-4 border border-gray-200 rounded bg-white"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2
                  id="mpa-adapter-lifecycle-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
                >
                  Adapter lifecycle ·{' '}
                  <span className="font-normal text-gray-500 normal-case">
                    8 states · click a node for details
                  </span>
                </h2>
              </div>
              <AdapterLifecycleCanvas />
            </section>

            {/* Preserved: raw CRUD index as a secondary admin surface */}
            <details
              className="mx-4 border border-gray-200 rounded bg-white"
              data-testid="mpa-curator-raw-index-details"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
                Raw plugin index (admin debug)
              </summary>
              <AdminCrudPanel
                slug="marketplace-plugin-adapter"
                indexName="xiigen-marketplace-plugin-adapter"
                title="Marketplace Plugin Adapter"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-marketplace-plugin-adapter."
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

        {/* Branch 6 — platform-support (V-R12-A3: read-only adapter lifecycle inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="mpa-role-platform-support-view">
            <div
              data-testid="mpa-support-readonly-banner"
              role="note"
              className="mx-4 mt-4 mb-3 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <span aria-hidden="true" className="mt-0.5 flex-shrink-0">🔒</span>
              <span>
                <span className="font-semibold">Marketplace Plugin Adapter</span> — read-only
                for support access. Controls are disabled. Escalate to a platform-admin for
                any change.
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 px-4 py-3 border-b border-slate-200">
              <span data-testid="mpa-support-pending-scan">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Pending security scan
                </span>
                <span className="tabular-nums font-semibold text-amber-700">8</span>
                <span className="text-slate-400 ml-1">plugins</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-support-failed">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Failed security review
                </span>
                <span className="tabular-nums font-semibold text-rose-700">2</span>
                <span className="ml-1 text-slate-400 text-[11px]">requires action</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="mpa-support-approved-count">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Approved this week
                </span>
                <span className="tabular-nums font-semibold text-slate-900">23</span>
              </span>
            </div>
            <fieldset
              data-testid="mpa-support-readonly-canvas"
              disabled
              aria-disabled="true"
              aria-label="Adapter lifecycle (read-only)"
              className="m-0 p-0 border-0 opacity-75"
              style={{ pointerEvents: 'none' }}
            >
              <section
                data-testid="mpa-support-adapter-lifecycle-section"
                aria-labelledby="mpa-support-adapter-lifecycle-heading"
                className="mx-4 mb-4 border border-gray-200 rounded bg-white"
              >
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h2
                    id="mpa-support-adapter-lifecycle-heading"
                    className="text-sm font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Adapter lifecycle ·{' '}
                    <span className="font-normal text-gray-500 normal-case">
                      8 states · read-only inspector
                    </span>
                  </h2>
                </div>
                <AdapterLifecycleCanvas />
              </section>
            </fieldset>
            <div className="mx-4 mb-4">
              <a
                href="/support/escalate?topic=marketplace-plugin-adapter"
                data-testid="mpa-support-escalate"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                style={{ minHeight: '44px' }}
              >
                Escalate to platform-admin →
              </a>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — event-organiser (V-R12-A4: curated event-relevant plugins) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="mpa-role-event-organiser-view" className="max-w-4xl mx-auto p-6">
            <div
              data-testid="mpa-event-organiser-banner"
              className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
            >
              Plugins relevant to events — connect your event tools to automate ticketing,
              webinars, and attendee communications.
            </div>
            <h1
              data-testid="mpa-event-organiser-heading"
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Event-ready plugins
            </h1>
            <div
              data-testid="mpa-event-organiser-list"
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
            >
              {[
                {
                  id: 'PLG-eventbrite-sync',
                  name: 'Eventbrite Sync',
                  category: 'Events',
                  description:
                    'Sync your events and attendee lists directly from Eventbrite.',
                  price: 'Free',
                  verified: true,
                },
                {
                  id: 'PLG-zoom-webinars',
                  name: 'Zoom Webinars',
                  category: 'Webinars',
                  description:
                    'Auto-create Zoom webinar rooms from your event schedule.',
                  price: '$4.99/mo',
                  verified: true,
                },
                {
                  id: 'PLG-stripe-tickets',
                  name: 'Stripe Tickets',
                  category: 'Payments',
                  description:
                    'Accept ticket payments with Stripe — no separate processor needed.',
                  price: 'Free',
                  verified: true,
                },
              ].map((p, i) => (
                <div
                  key={p.id}
                  data-testid={`mpa-event-organiser-card-${i}`}
                  className="p-4 border border-gray-200 rounded bg-white"
                >
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{p.category}</p>
                  <p className="text-sm text-gray-600 mt-2">{p.description}</p>
                  <p
                    data-testid={`mpa-event-organiser-verified-${i}`}
                    className="text-xs mt-2 font-medium text-green-700"
                  >
                    ✓ Security Verified
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{p.price}</p>
                  <a
                    href="/admin/event-management"
                    data-testid={`mpa-event-organiser-install-${i}`}
                    className="inline-block mt-3 w-full text-center bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                    style={{ minHeight: '44px' }}
                  >
                    Install via Events →
                  </a>
                </div>
              ))}
            </div>
            <p
              data-testid="mpa-event-organiser-note"
              className="text-xs text-gray-500"
            >
              Looking for more? The full plugin catalog is available once installed via your
              event workspace.
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — others */}
        <RoleScopedView.Fallback>
          <div data-testid="mpa-fallback-view" className="p-4 text-sm text-gray-400">
            Plugin marketplace is not available for your current role.
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
