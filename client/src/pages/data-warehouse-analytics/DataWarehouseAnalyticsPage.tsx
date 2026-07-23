/**
 * DataWarehouseAnalyticsPage — FLOW-13 admin console for Data Warehouse & Analytics.
 *
 * Role-aware screen (C6 / SK-539): FLOW-13 is Tier 2 (5 required + 2 conditional
 * = 7 total cells). Existing AdminCrudPanel preserved for tenant-admin; specialised
 * analytics dashboards added for freelancer (gig KPIs), business-partner (hiring
 * funnel), event-organiser (event analytics), and platform-admin (cross-tenant
 * warehouse ops). Conditional branches for tenant-user (FREEDOM-gated) and
 * platform-support (read-only inspector).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from svc).
 *                   The 8 mock states remain accessible to ALL roles — they are a
 *                   developer/QA testing mechanism and are not role-gated.
 *   no ?mock     → role-aware live rendering (this file's main change).
 *
 * Derived states (UX-FIX Track UX-2):
 *   Plan backbone: PIPELINE_QUEUED → INGESTING → TRANSFORM_RUNNING → COMPLETE → FAILED
 *   Plus server-derived states from warehouse-health-monitor, data-export-engine,
 *   data-retention-enforcer, funnel-analysis-engine services.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'pipeline-queued': {
    idx: 1,
    label: 'Analytics pipeline queued — waiting for scheduler window',
    status: 'QUEUED',
    fields: {
      pipelineId: 'PIPE-2026-0419-014',
      sourceConnector: 'events-stream',
      targetDataset: 'warehouse.events_daily',
      queuedAt: '2026-04-19 02:00',
    },
  },
  ingesting: {
    idx: 2,
    label: 'Ingestion running — rows flowing into staging',
    status: 'INGESTING',
    fields: {
      pipelineId: 'PIPE-2026-0419-014',
      rowsRead: '482350',
      currentBatch: '12/40',
      startedAt: '2026-04-19 02:05',
    },
  },
  'transform-running': {
    idx: 3,
    label: 'Transformation running — materializing daily aggregates',
    status: 'RUNNING',
    fields: {
      pipelineId: 'PIPE-2026-0419-014',
      stage: 'aggregate_daily_events',
      durationMs: '18420',
      tenantId: 'tenant-master',
    },
  },
  'warehouse-degraded': {
    idx: 4,
    label: 'Warehouse health check — degraded (query latency elevated)',
    status: 'DEGRADED',
    fields: {
      checkType: 'FULL',
      p95LatencyMs: '4200',
      queueBacklog: '8',
      observedAt: '2026-04-19 02:20',
    },
  },
  complete: {
    idx: 5,
    label: 'Pipeline complete — downstream dashboards refreshed',
    status: 'COMPLETE',
    fields: {
      pipelineId: 'PIPE-2026-0419-014',
      rowsWritten: '482350',
      completedAt: '2026-04-19 02:30',
      durationMs: '1782000',
    },
  },
  failed: {
    idx: 6,
    label: 'Pipeline failed — transform stage errored, rollback triggered',
    status: 'FAILED',
    fields: {
      pipelineId: 'PIPE-2026-0419-019',
      stage: 'transform',
      errorCode: 'STORE_FAILED',
      failedAt: '2026-04-19 02:28',
    },
  },
  'retention-blocked': {
    idx: 7,
    label: 'Retention enforcer blocked purge — legal hold in effect',
    status: 'BLOCKED',
    fields: {
      contentId: 'EVT-2026-0301-99021',
      policyId: 'gdpr-90d',
      reason: 'HOLD_BLOCKED',
      tenantId: 'tenant-enterprise-7',
    },
  },
  'export-ready': {
    idx: 8,
    label: 'Data export ready — masking and encryption applied',
    status: 'READY',
    fields: {
      exportId: 'EXP-2026-0419-201',
      exportType: 'CSV_MASKED',
      encryptionKey: 'kms-***-02',
      availableAt: '2026-04-19 03:15',
    },
  },
};

const CASCADE_ADAPTATIONS: Record<
  string,
  { title: string; summary: string; metrics: string[] }
> = {
  'tenant-b-installed-from-a': {
    title: 'Northwind installed Acme enterprise warehouse analytics',
    summary:
      'Northwind is running Acme policy: 20,000 daily queries, 90-day retention cohorts, 4-hour export links, and earlier KPI alerts.',
    metrics: ['Source: Acme v1.0.1', 'Package: enterprise warehouse analytics', 'Install: linked'],
  },
  'tenant-b-v1.0.2': {
    title: 'Northwind analytics operations package',
    summary:
      'Northwind preserves Acme query capacity and export controls while adding exchange-partner warehouse reporting.',
    metrics: ['Source: Acme v1.0.1', 'Package: Northwind v1.0.2', 'Install: adapted'],
  },
  'tenant-c-installed-from-b': {
    title: 'Tessera installed Northwind analytics package',
    summary:
      'Tessera is running the inherited Northwind analytics policy before applying community reporting changes.',
    metrics: ['Source: Northwind v1.0.2', 'Package: inherited', 'Install: linked'],
  },
  'tenant-c-v1.0.3': {
    title: 'Tessera community warehouse analytics',
    summary:
      'Tessera preserves Acme and Northwind safeguards while tuning warehouse reporting for community programs.',
    metrics: ['Source: Northwind v1.0.2', 'Package: Tessera v1.0.3', 'Install: adapted'],
  },
};

export function DataWarehouseAnalyticsPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const cascadeAdaptation = CASCADE_ADAPTATIONS[searchParams.get('cascade') ?? ''] ?? null;
  // Conditional tenant-user gate: simulates FREEDOM-config for this demo
  const tenantUserAnalyticsEnabled = searchParams.get('tenant-analytics-enabled') === 'true';

  // Path A: mock state visualisation (unchanged — all roles can access mock states)
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="data-warehouse-analytics"
        flowId="FLOW-13"
        title="Data Warehouse & Analytics"
        state={MOCK_STATES[mockState]}
        description="Admin view of analytics pipelines, warehouse health, retention enforcement, and exports."
      />
    );
  }

  // Path B: role-aware live rendering
  return (
    <div data-viewer-role={role}>
      {cascadeAdaptation ? (
        <section
          data-testid="analytics-tenant-adaptation"
          className="mx-auto mt-4 max-w-5xl rounded border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-950"
        >
          <div className="text-sm font-semibold">{cascadeAdaptation.title}</div>
          <p data-testid="analytics-tenant-adaptation-summary" className="mt-1 text-sm">
            {cascadeAdaptation.summary}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            {cascadeAdaptation.metrics.map((metric) => (
              <span key={metric} className="rounded bg-white px-2 py-1 text-cyan-900">
                {metric}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <RoleScopedView role={role} testIdPrefix="analytics-role">
        {/* Branch 1 — tenant-admin (tenant analytics console, purpose-built).
            V-R15 Wave 2-followup fix (V-R14 CONCERN escalated to BLOCK in
            V-R15 Batch B): previously rendered raw AdminCrudPanel with
            "Raw index browser (admin debug)" label + /api/dynamic path +
            ui-NNNN IDs + Delete actions. Now renders a tenant-scoped
            analytics surface: KPIs (active pipelines / rows ingested /
            dashboards) + recent datasets + recent export requests, with
            the raw-index moved to a collapsible <details>. */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="analytics-admin-view" className="p-4 max-w-5xl mx-auto">
            <header className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Tenant analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                Your workspace datasets, pipelines, and exports. Cross-tenant warehouse
                operations are managed by platform administrators.
              </p>
            </header>

            <div
              className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6"
              data-testid="analytics-admin-kpis"
            >
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <div className="text-[11px] uppercase tracking-wide text-emerald-900 font-semibold">
                  Active pipelines
                </div>
                <div className="text-2xl font-bold text-emerald-700 tabular-nums">4</div>
              </div>
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="text-[11px] uppercase tracking-wide text-blue-900 font-semibold">
                  Rows ingested (24h)
                </div>
                <div className="text-2xl font-bold text-blue-700 tabular-nums">128,400</div>
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <div className="text-[11px] uppercase tracking-wide text-purple-900 font-semibold">
                  Dashboards
                </div>
                <div className="text-2xl font-bold text-purple-700 tabular-nums">7</div>
              </div>
              <div className="p-3 bg-amber-50 rounded border border-amber-200">
                <div className="text-[11px] uppercase tracking-wide text-amber-900 font-semibold">
                  Exports (7d)
                </div>
                <div className="text-2xl font-bold text-amber-700 tabular-nums">12</div>
              </div>
            </div>

            <section className="mb-6" data-testid="analytics-admin-datasets">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Datasets
                </h2>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  data-testid="analytics-admin-export"
                >
                  Request export
                </button>
              </div>
              <ul className="divide-y border border-gray-200 rounded">
                {[
                  { name: 'Orders — 2026', rows: '1.2M', freshness: '4 min ago', status: 'Active' },
                  { name: 'Users', rows: '54,820', freshness: '12 min ago', status: 'Active' },
                  { name: 'Payment events', rows: '284,102', freshness: '2 hr ago', status: 'Active' },
                  { name: 'Session replays', rows: '8,400', freshness: '1 day ago', status: 'Paused' },
                ].map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 text-sm"
                    data-testid={`analytics-admin-dataset-${i}`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-500">
                        {d.rows} rows · last updated {d.freshness}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        d.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section data-testid="analytics-admin-recent-exports">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">
                Recent exports
              </h2>
              <ul className="divide-y border border-gray-200 rounded">
                {[
                  { dataset: 'Orders — 2026', format: 'CSV', when: '2 hr ago', status: 'Completed' },
                  { dataset: 'Users', format: 'Parquet', when: 'Yesterday', status: 'Completed' },
                  { dataset: 'Payment events', format: 'CSV', when: '2 days ago', status: 'Completed' },
                ].map((e, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {e.dataset}{' '}
                        <span className="text-xs text-gray-500">({e.format})</span>
                      </div>
                      <div className="text-xs text-gray-500">Requested {e.when}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-800">
                      {e.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <details
              className="mt-8 border border-gray-200 rounded bg-white"
              data-testid="analytics-admin-raw-details"
            >
              <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50">
                Open raw dataset index (admin debug)
              </summary>
              <AdminCrudPanel
                slug="data-warehouse-analytics"
                indexName="xiigen-data-warehouse-analytics"
                title="Data Warehouse & Analytics"
                description="Raw index browser — reads /api/dynamic/xiigen-data-warehouse-analytics."
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
          </div>
        </RoleScopedView.Case>

        {/* Branch 2 — freelancer (gig-performance KPIs) */}
        <RoleScopedView.Case when="freelancer">
          <div data-testid="analytics-freelancer-view" className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-2">Gig Performance</h1>
            <div
              data-testid="analytics-freelancer-banner"
              className="mb-4 p-3 rounded bg-purple-50 border border-purple-200 text-sm text-purple-900"
            >
              Freelancer performance analytics for your active gigs.
            </div>
            {/* RUN-100: previous 3-tile hero-metric grid replaced with a
                compact summary row (Linear-style status bar). Same refactor
                pattern as FLOW-20 RUN-91. All three testids preserved on the
                `<span>` elements so existing specs continue to work. */}
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4"
            >
              <span data-testid="analytics-fl-bids-won">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Bids won (this month)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">3 of 12</span>
                <span className="ml-1 text-emerald-700" aria-label="trending up">
                  ↑
                </span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-fl-earnings-rate">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Avg earnings / hour
                </span>
                <span className="tabular-nums font-semibold text-slate-900">$47.50</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-fl-rating" className="inline-flex items-baseline">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Rating
                </span>
                <span className="text-amber-500 mr-0.5" aria-hidden="true">
                  ★
                </span>
                <span className="tabular-nums font-semibold text-slate-900">4.8</span>
                <span className="text-slate-400 ml-0.5">/ 5.0</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                data-testid="analytics-fl-gigs-table"
                className="w-full text-sm min-w-[720px]"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Gig</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Amount</th>
                    <th className="p-2 font-medium">Hours</th>
                    <th className="p-2 font-medium">$/hr</th>
                    <th className="p-2 font-medium">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { gig: 'Build REST API', st: 'RELEASED', color: 'bg-green-100 text-green-800', amt: '$1,000', hrs: '21h', rate: '$47.6', rating: '★ 5.0' },
                    { gig: 'Design mobile app', st: 'PENDING', color: 'bg-amber-100 text-amber-800', amt: '$750', hrs: '16h', rate: '$46.9', rating: '—' },
                    { gig: 'Write API docs', st: 'IN_ESCROW', color: 'bg-blue-100 text-blue-800', amt: '$450', hrs: '9h', rate: '$50.0', rating: '—' },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2 font-medium">{row.gig}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${row.color}`}>
                          <span aria-hidden="true">●</span> {row.st}
                        </span>
                      </td>
                      <td className="p-2">{row.amt}</td>
                      <td className="p-2 text-gray-600">{row.hrs}</td>
                      <td className="p-2 font-medium">{row.rate}</td>
                      <td className="p-2">{row.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — business-partner (hiring funnel + ad ROI) */}
        <RoleScopedView.Case when="business-partner">
          <div data-testid="analytics-partner-view" className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-2">Partner Analytics</h1>
            <div
              data-testid="analytics-partner-banner"
              className="mb-4 p-3 rounded bg-slate-50 border border-slate-200 text-sm text-slate-700"
            >
              Partner analytics — hiring performance and campaign ROI.
            </div>
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4"
            >
              <span data-testid="analytics-partner-hires">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Freelancers hired (30d)
                </span>
                <span className="tabular-nums font-semibold text-slate-900">4</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-partner-ad-roi">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Ad campaign ROI
                </span>
                <span className="tabular-nums font-semibold text-slate-900">2.4&times;</span>
                <span className="ml-1 text-emerald-700" aria-label="trending up">
                  ↑
                </span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                data-testid="analytics-partner-funnel"
                className="w-full text-sm min-w-[480px]"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Stage</th>
                    <th className="p-2 font-medium">Count</th>
                    <th className="p-2 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { stage: 'Gigs posted', n: 12, conv: '—' },
                    { stage: 'Bids received', n: 47, conv: '—' },
                    { stage: 'Shortlisted', n: 8, conv: '17%' },
                    { stage: 'Contracted', n: 4, conv: '50%' },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2">{row.stage}</td>
                      <td className="p-2 font-medium">{row.n}</td>
                      <td className="p-2 text-gray-600">{row.conv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 4 — event-organiser (event analytics) */}
        <RoleScopedView.Case when="event-organiser">
          <div data-testid="analytics-organiser-view" className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-2">Event Analytics</h1>
            <div
              data-testid="analytics-organiser-banner"
              className="mb-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-900"
            >
              Event analytics — attendance, tickets, and revenue.
            </div>
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4"
            >
              <span data-testid="analytics-org-attendees">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Total attendees
                </span>
                <span className="tabular-nums font-semibold text-slate-900">142</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-org-conversion">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Ticket conversion
                </span>
                <span className="tabular-nums font-semibold text-slate-900">68%</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-org-revenue">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Total revenue
                </span>
                <span className="tabular-nums font-semibold text-slate-900">$4,250</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                data-testid="analytics-org-events-table"
                className="w-full text-sm min-w-[640px]"
              >
                <thead className="bg-gray-50 text-start">
                  <tr>
                    <th className="p-2 font-medium">Event</th>
                    <th className="p-2 font-medium">Capacity</th>
                    <th className="p-2 font-medium">Sold</th>
                    <th className="p-2 font-medium">Revenue</th>
                    <th className="p-2 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { ev: 'Spring Mixer', cap: 100, sold: 85, rev: '$2,550', conv: '85%' },
                    { ev: 'Tech Workshop', cap: 80, sold: 57, rev: '$1,710', conv: '71%' },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-200">
                      <td className="p-2 font-medium">{row.ev}</td>
                      <td className="p-2">{row.cap}</td>
                      <td className="p-2">{row.sold}</td>
                      <td className="p-2 font-medium">{row.rev}</td>
                      <td className="p-2">{row.conv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </RoleScopedView.Case>

        {/* Branch 5 — platform-admin (cross-tenant warehouse ops) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="analytics-platform-admin-view" className="p-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-2">Platform Analytics Ops</h1>
            <div
              data-testid="analytics-platform-banner"
              className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-900"
            >
              Platform analytics ops — cross-tenant warehouse and pipeline management.
            </div>
            <div
              className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4"
            >
              <span data-testid="analytics-platform-pipelines">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Active pipelines
                </span>
                <span className="tabular-nums font-semibold text-slate-900">34</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span
                data-testid="analytics-platform-health"
                className="inline-flex items-center gap-1.5"
              >
                <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                  Warehouse
                </span>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                />
                <span className="font-semibold text-emerald-700">Healthy</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span data-testid="analytics-platform-failures">
                <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                  Failed pipelines (24h)
                </span>
                <span className="tabular-nums font-semibold text-amber-700">2</span>
                <span className="ml-1 text-slate-400 text-[11px]">needs review</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/platform/analytics/ops"
                data-testid="analytics-platform-console"
                className="text-sm text-blue-600 hover:underline"
              >
                Warehouse ops console →
              </a>
              <a
                href="/platform/analytics/schedule"
                data-testid="analytics-platform-schedule"
                className="text-sm text-blue-600 hover:underline"
              >
                Cube refresh schedule →
              </a>
            </div>
            {/* V-R15 Wave 8: removed dev-harness mock-state copy that exposed
                "The 8 pipeline-state mocks (QUEUED, INGESTING, ...) accessible
                at this route via ?mock=pipeline-queued etc." — developer
                routing aid rendered as user-facing copy. */}
          </div>
        </RoleScopedView.Case>

        {/* Branch 6 — platform-support (read-only inspector) */}
        <RoleScopedView.Case when="platform-support">
          <div data-testid="analytics-support-view" className="p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-2">Analytics Inspector</h1>
            <div
              data-testid="analytics-support-banner"
              className="mb-4 p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
            >
              Read-only analytics inspector. Search a tenant to debug their pipeline state.
            </div>
            <div className="flex gap-2 mb-3">
              <label htmlFor="analytics-support-search" className="sr-only">
                Tenant ID
              </label>
              <input
                id="analytics-support-search"
                data-testid="analytics-support-search"
                type="text"
                placeholder="Tenant ID"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
              />
              <button
                data-testid="analytics-support-search-btn"
                className="bg-gray-700 text-white px-3 py-2 rounded text-sm hover:bg-gray-800"
              >
                Search
              </button>
            </div>
            <div
              data-testid="analytics-support-result"
              className="p-4 border border-dashed border-gray-300 rounded text-sm text-gray-500"
            >
              Enter a tenant ID to inspect
            </div>
            <a
              href="/platform/escalate"
              data-testid="analytics-support-escalate"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Escalate analytics issue to platform admin →
            </a>
          </div>
        </RoleScopedView.Case>

        {/* Branch 7 — tenant-user (FREEDOM-gated personal analytics) */}
        <RoleScopedView.Case when="tenant-user">
          <div data-testid="analytics-user-view" className="p-6 max-w-3xl">
            <h1 className="text-2xl font-bold mb-2">My Activity</h1>
            {tenantUserAnalyticsEnabled ? (
              <>
                <div
                  data-testid="analytics-user-banner"
                  className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-900"
                >
                  Your activity analytics — personal data only.
                </div>
                {/* RUN-114: tenant-user 3 hero-tiles \u2192 summary row. */}
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3">
                  <span data-testid="analytics-user-events">
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                      Events attended (30d)
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900">4</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span data-testid="analytics-user-bids">
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                      Gigs bid on (30d)
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900">7</span>
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span data-testid="analytics-user-score">
                    <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                      Activity score
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900">72</span>
                  </span>
                </div>
              </>
            ) : (
              <div
                data-testid="analytics-user-disabled"
                className="p-4 rounded bg-gray-50 border border-gray-200 text-sm text-gray-700"
              >
                Personal analytics are not enabled for your tenant. Contact your admin to enable this feature.
                <br />
                <span className="text-xs text-gray-500 mt-2 block">
                  (Dev note: append <code>?tenant-analytics-enabled=true</code> to simulate the
                  enabled state in this mock.)
                </span>
              </div>
            )}
          </div>
        </RoleScopedView.Case>

        {/* Fallback */}
        <RoleScopedView.Fallback>
          <div data-testid="analytics-fallback-view" className="p-6 text-center py-8">
            <p className="text-gray-700 mb-3">
              Analytics are not available for your current role.
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
