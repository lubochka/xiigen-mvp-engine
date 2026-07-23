/**
 * EtlDataIntegrationPage — FLOW-14 admin console for ETL Data Integration (etl-data-integration).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from svc)
 *   no ?mock     → real CRUD panel against xiigen-etl-data-integration
 *
 * Derived states (UX-FIX Track UX-2):
 *   Plan backbone: SOURCE_CONNECTED → EXTRACTION_RUNNING → TRANSFORM_APPLIED → LOADED → ERROR
 *   Plus server-derived states from:
 *     connector-registration-handler.service.ts → ACTIVE / RATE_LIMIT_EXCEEDED
 *     backfill-coordinator.service.ts           → BLACKOUT_WINDOW / CURSOR_NOT_MONOTONIC / COMPLETED
 *     cross-flow-analytics-executor.service     → PEER_FLOW_INACTIVE
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'source-connected': {
    idx: 1,
    label: 'Connector registered — credentials stored in vault, source reachable',
    status: 'CONNECTED',
    fields: {
      connectorId: 'CON-2026-0419-008',
      sourceType: 'postgres-replica',
      vaultKey: 'vault://connectors/CON-2026-0419-008',
      registeredAt: '2026-04-19 08:00',
    },
  },
  'extraction-running': {
    idx: 2,
    label: 'Extraction running — pulling rows from source',
    status: 'EXTRACTING',
    fields: {
      connectorId: 'CON-2026-0419-008',
      jobId: 'JOB-2026-0419-042',
      rowsExtracted: '128400',
      cursorValue: '2026-04-19T08:12:30Z',
    },
  },
  'rate-limited': {
    idx: 3,
    label: 'Source rate limit exceeded — extraction backing off',
    status: 'SUSPENDED',
    fields: {
      jobId: 'JOB-2026-0419-042',
      reason: 'RATE_LIMIT_EXCEEDED',
      retryAfterMs: '60000',
      observedAt: '2026-04-19 08:14',
    },
  },
  'blackout-window': {
    idx: 4,
    label: 'Backfill blocked — active blackout window (source-owner policy)',
    status: 'BLOCKED',
    fields: {
      jobId: 'JOB-2026-0419-042',
      reason: 'BLACKOUT_WINDOW',
      blackoutEnd: '2026-04-19 16:00',
      tenantId: 'tenant-master',
    },
  },
  'transform-applied': {
    idx: 5,
    label: 'Normalization and schema-mapping applied',
    status: 'TRANSFORMING',
    fields: {
      jobId: 'JOB-2026-0419-042',
      rowsTransformed: '128400',
      schemaVersion: 'v7',
      durationMs: '24100',
    },
  },
  loaded: {
    idx: 6,
    label: 'Load complete — rows written to warehouse, cursor advanced',
    status: 'COMPLETE',
    fields: {
      jobId: 'JOB-2026-0419-042',
      rowsLoaded: '128400',
      targetDataset: 'warehouse.events_raw',
      loadedAt: '2026-04-19 08:22',
    },
  },
  error: {
    idx: 7,
    label: 'Load failed — storage error, job halted for operator review',
    status: 'ERROR',
    fields: {
      jobId: 'JOB-2026-0419-058',
      errorCode: 'STORE_FAILED',
      errorMessage: 'disk full on warehouse node wh-03',
      failedAt: '2026-04-19 09:01',
    },
  },
  'peer-inactive': {
    idx: 8,
    label: 'Cross-flow analytics paused — peer flow FLOW-13 inactive',
    status: 'DEGRADED',
    fields: {
      analyticsJobId: 'XFA-2026-0419-011',
      peerFlowId: 'FLOW-13',
      reason: 'PEER_FLOW_INACTIVE',
      detectedAt: '2026-04-19 09:05',
    },
  },
};

const CASCADE_PROFILES: Record<string, { badge: string; title: string; summary: string }> = {
  'tenant-b-installed-from-a': {
    badge: 'Acme v1.0.1 installed',
    title: 'Northwind installed Acme enterprise data integration',
    summary:
      'Northwind is running the Acme integration profile with larger sync pages, 5,000-row backfill slices, stricter identity matching, and shorter reverse-sync lock windows.',
  },
  'tenant-b-v1.0.2': {
    badge: 'Northwind v1.0.2',
    title: 'Northwind exchange data integration package',
    summary:
      'Northwind keeps the Acme guardrails while tuning connector cadence, exchange-partner approval windows, and reverse-sync batches for its operating model.',
  },
  'tenant-c-installed-from-b': {
    badge: 'Northwind v1.0.2 installed',
    title: 'Tessera installed Northwind exchange data integration',
    summary:
      'Tessera is running the inherited Northwind exchange policy with partner-safe connector cadence, stricter identity matching, and queue-based reverse-sync controls for community data programs.',
  },
  'tenant-c-v1.0.3': {
    badge: 'Tessera v1.0.3',
    title: 'Tessera community ETL data integration package',
    summary:
      'Tessera keeps Acme and Northwind safeguards while tuning consent-aware sync pages, faster schema review, stricter identity matching, and lighter reverse-sync batches for member programs.',
  },
};

export function EtlDataIntegrationPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const cascadeProfile = CASCADE_PROFILES[searchParams.get('cascade') ?? ''];
  const lineageEnabled = searchParams.get('tenant-lineage-enabled') === 'true';

  // Path A: mock state — UNCHANGED, accessible to all roles for dev/QA
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="etl-data-integration"
        flowId="FLOW-14"
        title="ETL Data Integration"
        state={MOCK_STATES[mockState]}
        description="Admin view of connectors, extraction jobs, backfills, and cross-flow analytics."
      />
    );
  }

  // Path B: role-aware live rendering
  return (
    <div data-viewer-role={role}>
      {cascadeProfile && (
        <section
          data-testid="etl-tenant-adaptation"
          className="mx-auto mt-4 max-w-5xl rounded border border-cyan-200 bg-cyan-50 px-4 py-3 text-start"
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-800">
            {cascadeProfile.badge}
          </div>
          <h2 className="mt-1 text-lg font-semibold text-cyan-950">{cascadeProfile.title}</h2>
          <p
            data-testid="etl-tenant-adaptation-summary"
            className="mt-1 max-w-3xl text-sm text-cyan-900"
          >
            {cascadeProfile.summary}
          </p>
        </section>
      )}
      <RoleScopedView role={role} testIdPrefix="etl-role">
        {/* Branch 1 — tenant-admin (connector setup cards, NOT raw debug).
            V-R15 Wave 1 Fix #3: previous rendered AdminCrudPanel with
            "Raw index browser (admin debug) — reads /api/dynamic/...",
            ui-NNN IDs, Delete actions. Now renders a proper connector
            catalog with per-connector status + configure/disconnect. */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="etl-role-tenant-admin-view" className="p-4 max-w-5xl mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Connectors</h1>
              <p className="text-sm text-gray-500 mt-1">
                Data integrations for your workspace. Platform-level extraction, fraud checks,
                and schema evolution are managed by platform administrators.
              </p>
            </header>

            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
              data-testid="etl-admin-kpis"
            >
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <div className="text-[11px] uppercase tracking-wide text-emerald-900 font-semibold">
                  Active connectors
                </div>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">3</div>
              </div>
              <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <div className="text-[11px] uppercase tracking-wide text-amber-900 font-semibold">
                  Last sync
                </div>
                <div className="text-2xl font-bold text-amber-700 tabular-nums">12 min ago</div>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-[11px] uppercase tracking-wide text-blue-900 font-semibold">
                  Rows transferred (7d)
                </div>
                <div className="text-2xl font-bold text-blue-700 tabular-nums">1.2M</div>
              </div>
            </div>

            <section data-testid="etl-admin-catalog" className="mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Your connectors
                </h2>
                <button
                  type="button"
                  data-testid="etl-admin-add-connector"
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add connector
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: 'PostgreSQL replica — Production',
                    kind: 'Database',
                    last: '12 min ago',
                    rows: '828,400',
                    status: 'Active',
                    statusColor: 'emerald',
                  },
                  {
                    name: 'Stripe events',
                    kind: 'Payments webhook',
                    last: '3 hr ago',
                    rows: '14,820',
                    status: 'Active',
                    statusColor: 'emerald',
                  },
                  {
                    name: 'Segment analytics',
                    kind: 'Events stream',
                    last: '2 days ago',
                    rows: '412,000',
                    status: 'Paused',
                    statusColor: 'amber',
                  },
                  {
                    name: 'HubSpot CRM',
                    kind: 'CRM REST',
                    last: 'Not yet synced',
                    rows: '—',
                    status: 'Needs credentials',
                    statusColor: 'rose',
                  },
                ].map((c, i) => {
                  const pill =
                    c.statusColor === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.statusColor === 'amber'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800';
                  return (
                    <div
                      key={i}
                      className="p-3 border border-gray-200 rounded flex items-start gap-3"
                      data-testid={`etl-admin-connector-${i}`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.kind}</div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                          <span className={`inline-block px-2 py-0.5 rounded font-medium text-[11px] ${pill}`}>
                            {c.status}
                          </span>
                          <span>Last sync: {c.last}</span>
                          <span>· Rows: {c.rows}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                        >
                          Configure
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <p className="text-xs text-gray-500">
              Need a connector that's not listed?
              <a href="/admin/support" className="text-blue-600 hover:underline ml-1">Request a new integration →</a>
            </p>
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — platform-admin (cross-tenant ETL ops) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="etl-role-platform-admin-view" className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Platform ETL Ops</h1>
            <div
              data-testid="etl-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform ETL ops — cross-tenant job queue and connector health.
            </div>
            {/* RUN-106: platform-admin 3 hero-tiles \u2192 summary row. */}
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
              <span data-testid="etl-platform-active-jobs">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active extraction jobs
                </span>
                <span className="tabular-nums font-semibold text-slate-900">47</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="etl-platform-dlq">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Dead-letter queue
                </span>
                <span className="tabular-nums font-semibold text-amber-700">12</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs review</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span
                data-testid="etl-platform-connector-health"
                className="inline-flex items-center gap-1.5"
              >
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Connectors
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                />
                <span className="tabular-nums font-semibold text-amber-700">3 degraded</span>
                <span className="text-slate-400">of 142</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mb-5">
              <a
                href="/platform/etl/jobs"
                data-testid="etl-platform-queue-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Open ETL job queue &rarr;
              </a>
              <a
                href="/platform/etl/dlq"
                data-testid="etl-platform-redrive-link"
                className="text-sm text-blue-600 hover:underline"
              >
                Re-drive dead-letter queue &rarr;
              </a>
            </div>

            {/* RUN-154: Pipeline runs list per G1 Airbyte/Fivetran catalog */}
            <section
              className="bg-white border border-gray-200 rounded-lg"
              data-testid="etl-platform-runs"
            >
              <h2 className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Recent pipeline runs &middot; 5 most recent
              </h2>
              <ul className="divide-y divide-gray-100">
                {[
                  {
                    id: 'PIPE-2026-0420-102',
                    connector: 'postgres-replica',
                    tenant: 'Acme Corp',
                    rows: 128_400,
                    state: 'COMPLETE',
                    dur: '4m 12s',
                    at: '14:22',
                  },
                  {
                    id: 'PIPE-2026-0420-101',
                    connector: 'stripe-events',
                    tenant: 'Bluebird Media',
                    rows: 9_842,
                    state: 'COMPLETE',
                    dur: '58s',
                    at: '13:44',
                  },
                  {
                    id: 'PIPE-2026-0420-099',
                    connector: 'salesforce-accounts',
                    tenant: 'Castle Analytics',
                    rows: 3_221,
                    state: 'RUNNING',
                    dur: '42s',
                    at: '13:20',
                  },
                  {
                    id: 'PIPE-2026-0420-097',
                    connector: 'shopify-orders',
                    tenant: 'Delta Logistics',
                    rows: 512,
                    state: 'FAILED',
                    dur: '18s',
                    at: '12:58',
                  },
                  {
                    id: 'PIPE-2026-0420-095',
                    connector: 'google-analytics',
                    tenant: 'Acme Corp',
                    rows: 74_220,
                    state: 'COMPLETE',
                    dur: '3m 04s',
                    at: '10:11',
                  },
                ].map((r) => (
                  <li
                    key={r.id}
                    className="px-4 py-3 flex items-center justify-between gap-4 text-sm hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-mono text-xs text-gray-500">{r.id}</p>
                      <p className="font-medium text-gray-900 mt-0.5">
                        {r.connector} &middot; {r.tenant}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.rows.toLocaleString()} rows &middot; {r.dur} &middot; {r.at}
                      </p>
                    </div>
                    <span
                      className={
                        r.state === 'COMPLETE'
                          ? 'text-xs font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200'
                          : r.state === 'RUNNING'
                            ? 'text-xs font-semibold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200'
                            : 'text-xs font-semibold px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200'
                      }
                      data-run-state={r.state}
                    >
                      {r.state === 'COMPLETE'
                        ? 'Complete'
                        : r.state === 'RUNNING'
                          ? 'Running'
                          : 'Failed'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="etl-role-support-view" className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">ETL Inspector</h1>
            <div
              data-testid="etl-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only ETL inspector. Search a tenant to debug sync failures.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="etl-support-search" className="sr-only">
                Tenant ID or connector ID
              </label>
              <input
                id="etl-support-search"
                data-testid="etl-support-search"
                type="text"
                placeholder="Tenant ID or connector ID"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="etl-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
                style={{ minHeight: '44px' }}
              >
                Search
              </button>
            </div>
            <div
              data-testid="etl-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a tenant ID or connector ID to inspect
            </div>
            <a
              href="/platform/support/escalate"
              data-testid="etl-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate ETL issue to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — tenant-user (FREEDOM-gated data lineage) */}
        <RoleScopedView.Case when="tenant-user">
          <div data-testid="etl-role-user-view" className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">My Data Lineage</h1>
            {lineageEnabled ? (
              <>
                <div
                  data-testid="etl-user-lineage-banner"
                  className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
                >
                  Data lineage — where your personal data comes from.
                </div>
                <ul data-testid="etl-user-lineage-list" className="space-y-2">
                  {[
                    { label: 'Profile data', source: 'Profile questionnaire', updated: '2026-04-18' },
                    { label: 'Purchase history', source: 'Marketplace orders', updated: '2026-04-19' },
                    { label: 'Event attendance', source: 'Ticketing activity', updated: '2026-04-17' },
                  ].map((row, i) => (
                    <li
                      key={i}
                      data-testid={`etl-user-lineage-item-${i}`}
                      className="p-3 border border-gray-200 rounded bg-white text-sm"
                    >
                      <p className="font-medium text-gray-900">{row.label}</p>
                      <p className="text-gray-600 mt-1">
                        Source: <span>{row.source}</span> · Last updated: {row.updated}
                      </p>
                    </li>
                  ))}
                </ul>
                <a
                  href="/my/data-export"
                  data-testid="etl-user-export"
                  className="inline-block mt-4 text-sm text-blue-600 hover:underline"
                >
                  Request data export →
                </a>
              </>
            ) : (
              <>
                <div
                  data-testid="etl-user-disabled"
                  className="mb-3 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
                >
                  Data lineage visibility is not enabled for your tenant.
                </div>
                <p
                  data-testid="etl-user-disabled-note"
                  className="text-xs text-gray-500"
                >
                  Ask your workspace admin to turn this on for your account.
                </p>
              </>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Fallback — all other roles */}
        <RoleScopedView.Fallback>
          <div
            data-testid="etl-fallback-view"
            className="p-4 text-gray-500 text-sm"
          >
            <p>ETL data integration is not available for your current role.</p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
