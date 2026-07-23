/**
 * TenantLifecycleManagerPage — FLOW-30 engine orchestration surface.
 *
 * IMPORTANT: This is NOT FLOW-15 (saas-multi-tenancy / user-facing signup).
 * FLOW-30 is the internal operations surface that platform-admins use to
 * provision, suspend, offboard, and health-check existing tenants.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → role-scoped view (RUN-36)
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   TENANT_CREATED → ONBOARDING → ACTIVE → SUSPENDED → OFFBOARDED
 *
 * Role-aware (RUN-36, 3 cells):
 *   - platform-admin   → full tenant list + provision/suspend/offboard/force-offboard/health
 *   - platform-support → read-only health inspector with ticket-linkage
 *   - tenant-admin     → self-service own-tenant-only (request-offboarding, export-data)
 *   - others           → fallback "internal platform tool" notice
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Pause,
  LogOut,
  AlertTriangle,
  Activity,
  Lock,
  Download,
  Search,
  Plus,
  Ticket,
} from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'tenant-created': {
    idx: 1,
    label: 'Tenant record created — awaiting provisioning',
    status: 'REGISTERED',
    fields: {
      tenantId: 'TNT-acme-corp',
      planId: 'plan-growth',
      createdBy: 'signup-flow',
      createdAt: '2026-04-19 09:00',
    },
  },
  provisioning: {
    idx: 2,
    label: 'Tenant workspace \u2014 data indices and configuration being provisioned',
    status: 'PROVISIONING',
    fields: {
      tenantId: 'TNT-acme-corp',
      indicesCount: '47',
      quotasAllocated: 'storage:50GB, events:1M/day',
      startedAt: '2026-04-19 09:02',
    },
  },
  onboarding: {
    idx: 3,
    label: 'Onboarding wizard in progress — 3 of 6 steps complete',
    status: 'ONBOARDING',
    fields: {
      tenantId: 'TNT-acme-corp',
      stepsCompleted: '3',
      totalSteps: '6',
      currentStep: 'admin-user-invite',
      updatedAt: '2026-04-19 09:30',
    },
  },
  active: {
    idx: 4,
    label: 'Tenant ACTIVE — production traffic enabled',
    status: 'ACTIVE',
    fields: {
      tenantId: 'TNT-acme-corp',
      activatedAt: '2026-04-19 10:00',
      healthScore: '98',
      dailyEvents: '42,150',
    },
  },
  'quota-exceeded': {
    idx: 5,
    label: 'Quota exceeded — writes throttled',
    status: 'BLOCKED',
    fields: {
      tenantId: 'TNT-acme-corp',
      resourceType: 'events',
      usage: '1,048,576',
      quota: '1,000,000',
      throttledAt: '2026-04-19 18:45',
    },
  },
  'policy-violation': {
    idx: 6,
    label: 'Tenant policy violation detected — compliance alert',
    status: 'VIOLATION',
    fields: {
      tenantId: 'TNT-acme-corp',
      policyId: 'POL-cross-tenant-read',
      violationCount: '3',
      detectedAt: '2026-04-19 19:00',
    },
  },
  suspended: {
    idx: 7,
    label: 'Tenant SUSPENDED — billing failure',
    status: 'SUSPENDED',
    fields: {
      tenantId: 'TNT-acme-corp',
      suspendedAt: '2026-04-19 20:00',
      reason: 'Invoice INV-2026-0419-42 unpaid after 14-day grace',
      gracePeriodEnds: '2026-05-03',
    },
  },
  offboarded: {
    idx: 8,
    label: 'Tenant OFFBOARDED — data purged, indices removed',
    status: 'OFFBOARDED',
    fields: {
      tenantId: 'TNT-acme-corp',
      requestedBy: 'tenant-admin-01',
      purgedAt: '2026-04-19 22:00',
      dataExportHash: 'sha256:a4f9...c21e',
    },
  },
};

interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'growth' | 'enterprise';
  created: string;
  status: 'active' | 'suspended' | 'offboarding';
  healthScore: number;
  isSelf?: boolean;
}

const SAMPLE_TENANTS: Tenant[] = [
  {
    id: 'TNT-acme-corp',
    name: 'Acme Corp',
    plan: 'enterprise',
    created: '2025-11-02',
    status: 'active',
    healthScore: 98,
    isSelf: true,
  },
  {
    id: 'TNT-bluebird',
    name: 'Bluebird Media',
    plan: 'growth',
    created: '2026-01-15',
    status: 'active',
    healthScore: 91,
  },
  {
    id: 'TNT-castle',
    name: 'Castle Analytics',
    plan: 'starter',
    created: '2026-02-20',
    status: 'suspended',
    healthScore: 62,
  },
  {
    id: 'TNT-delta',
    name: 'Delta Logistics',
    plan: 'growth',
    created: '2025-09-11',
    status: 'offboarding',
    healthScore: 54,
  },
];

function TenantStatusBadge({ status }: { status: Tenant['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'suspended'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span
      data-testid={`tlm-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function HealthScore({ score }: { score: number }) {
  const tone = score >= 85 ? 'text-emerald-700' : score >= 65 ? 'text-amber-700' : 'text-red-700';
  return (
    <span className={`text-xs font-semibold ${tone}`}>
      <Activity size={12} strokeWidth={2} className="inline" aria-hidden="true" /> {score}
    </span>
  );
}

// V-R7 cleanup: plan taxonomy renders as Title Case label in body copy,
// not as lowercase DSL value.
function planLabel(plan: Tenant['plan']): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function TenantLifecycleManagerPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  const [searchQuery, setSearchQuery] = useState('');
  const [forceOffboardTarget, setForceOffboardTarget] = useState<Tenant | null>(null);
  const [forceOffboardReason, setForceOffboardReason] = useState('');
  const [forceOffboardError, setForceOffboardError] = useState('');
  const [forceOffboardConfirmed, setForceOffboardConfirmed] = useState<Tenant | null>(null);

  const [tenantExportStatus, setTenantExportStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [tenantOffboardStatus, setTenantOffboardStatus] = useState<'idle' | 'requested'>('idle');

  // Preserve ?mock= early-return
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="tenant-lifecycle-manager"
        flowId="FLOW-30"
        title="Tenant Lifecycle Manager"
        state={MOCK_STATES[mockState]}
        description="Admin view of tenant provisioning, activation, policy enforcement, suspension, and offboarding."
      />
    );
  }

  function openForceOffboard(t: Tenant) {
    setForceOffboardTarget(t);
    setForceOffboardReason('');
    setForceOffboardError('');
  }

  function confirmForceOffboard() {
    if (!forceOffboardTarget) return;
    if (!forceOffboardReason.trim()) {
      setForceOffboardError('Please enter a reason — this field is required.');
      return;
    }
    setForceOffboardConfirmed(forceOffboardTarget);
    setForceOffboardTarget(null);
    setForceOffboardReason('');
  }

  function cancelForceOffboard() {
    setForceOffboardTarget(null);
    setForceOffboardReason('');
    setForceOffboardError('');
  }

  function handleRequestOffboarding() {
    setTenantOffboardStatus('requested');
  }

  function handleExportData() {
    setTenantExportStatus('running');
    window.setTimeout(() => setTenantExportStatus('done'), 1500);
  }

  const filteredTenants = searchQuery
    ? SAMPLE_TENANTS.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : SAMPLE_TENANTS;

  const selfTenant = SAMPLE_TENANTS.find((t) => t.isSelf) ?? SAMPLE_TENANTS[0];

  return (
    <div data-testid="page-tenant-lifecycle-manager" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="tlm-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full lifecycle ops ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="tlm-admin-console" className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 size={20} strokeWidth={2} aria-hidden="true" />
                  Tenant Operations
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Provision, suspend, offboard, and health-check tenants.
                </p>
              </div>
              <button
                type="button"
                data-testid="tlm-provision-button"
                aria-label="Provision a new tenant"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Provision tenant
              </button>
            </header>

            {forceOffboardConfirmed && (
              <div
                data-testid="tlm-force-offboard-confirmed"
                data-tenant-id={forceOffboardConfirmed.id}
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-red-300 bg-red-50 text-sm text-red-900"
              >
                Force-offboard initiated for {forceOffboardConfirmed.name}. Data purge is running;
                this cannot be undone.
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="tlm-admin-search" className="sr-only">
                Search tenants
              </label>
              <div className="relative flex-1 max-w-md">
                <Search
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="tlm-admin-search"
                  data-testid="tlm-admin-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by tenant name or ID"
                  className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <section
              data-testid="tlm-admin-tenant-list"
              aria-labelledby="tlm-admin-tenants-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="tlm-admin-tenants-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Tenants ({filteredTenants.length})
              </h2>
              {filteredTenants.length === 0 ? (
                <p data-testid="tlm-admin-tenants-empty" className="p-4 text-sm text-gray-500">
                  No tenants match "{searchQuery}".
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredTenants.map((t) => (
                    <li
                      key={t.id}
                      data-testid={`tlm-admin-tenant-row-${t.id}`}
                      data-tenant-id={t.id}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <TenantStatusBadge status={t.status} />
                          <HealthScore score={t.healthScore} />
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Plan: {planLabel(t.plan)} · Created: {t.created}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          data-testid={`tlm-health-check-${t.id}`}
                          aria-label={`Run health check for ${t.name}`}
                          className="inline-flex items-center gap-1 border border-gray-300 text-gray-700 rounded px-3 py-2 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{ minHeight: '44px' }}
                        >
                          <Activity size={12} strokeWidth={2} aria-hidden="true" />
                          Health
                        </button>
                        <button
                          type="button"
                          data-testid={`tlm-suspend-${t.id}`}
                          aria-label={`Suspend tenant ${t.name}`}
                          disabled={t.status !== 'active'}
                          className="inline-flex items-center gap-1 border border-amber-300 text-amber-800 bg-amber-50 rounded px-3 py-2 text-xs hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ minHeight: '44px' }}
                        >
                          <Pause size={12} strokeWidth={2} aria-hidden="true" />
                          Suspend
                        </button>
                        <button
                          type="button"
                          data-testid={`tlm-offboard-${t.id}`}
                          aria-label={`Initiate offboarding for ${t.name}`}
                          className="inline-flex items-center gap-1 border border-slate-300 text-slate-800 bg-slate-50 rounded px-3 py-2 text-xs hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          style={{ minHeight: '44px' }}
                        >
                          <LogOut size={12} strokeWidth={2} aria-hidden="true" />
                          Offboard
                        </button>
                        <button
                          type="button"
                          data-testid={`tlm-force-offboard-${t.id}`}
                          aria-label={`Force offboard ${t.name} — permanent`}
                          onClick={() => openForceOffboard(t)}
                          className="inline-flex items-center gap-1 border border-red-400 text-red-900 bg-red-50 rounded px-3 py-2 text-xs hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                          style={{ minHeight: '44px' }}
                        >
                          <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                          Force offboard
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Force-offboard confirmation modal */}
            {forceOffboardTarget && (
              <div
                data-testid="tlm-force-offboard-modal"
                role="alertdialog"
                aria-labelledby="tlm-force-offboard-title"
                aria-describedby="tlm-force-offboard-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="tlm-force-offboard-title"
                    className="text-lg font-bold text-red-900 flex items-center gap-2"
                  >
                    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                    PERMANENT — force offboard
                  </h3>
                  <p id="tlm-force-offboard-desc" className="text-sm text-gray-700 mt-2">
                    You are about to force-offboard{' '}
                    <span className="font-semibold" data-tenant-id={forceOffboardTarget.id}>
                      {forceOffboardTarget.name}
                    </span>
                    . All tenant data, indices, and billing will be purged IMMEDIATELY. This
                    bypasses the normal offboarding grace period and cannot be undone.
                  </p>
                  <label
                    htmlFor="tlm-force-offboard-reason"
                    className="block text-sm font-medium text-gray-700 mt-4 mb-1"
                  >
                    Reason <span className="text-red-600">(required)</span>
                  </label>
                  <textarea
                    id="tlm-force-offboard-reason"
                    data-testid="tlm-force-offboard-reason"
                    value={forceOffboardReason}
                    onChange={(e) => {
                      setForceOffboardReason(e.target.value);
                      if (forceOffboardError) setForceOffboardError('');
                    }}
                    rows={3}
                    aria-invalid={forceOffboardError ? 'true' : 'false'}
                    aria-describedby={forceOffboardError ? 'tlm-force-reason-err' : undefined}
                    placeholder="e.g., Confirmed fraudulent use, escalated via ADR-2026-017"
                    className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {forceOffboardError && (
                    <p
                      id="tlm-force-reason-err"
                      data-testid="tlm-force-offboard-error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {forceOffboardError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="tlm-force-offboard-cancel"
                      onClick={cancelForceOffboard}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="tlm-force-offboard-confirm"
                      onClick={confirmForceOffboard}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      PERMANENT — confirm force offboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section data-testid="tlm-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="tenant-lifecycle-manager"
                indexName="xiigen-tenant-lifecycle-manager"
                title="Tenant Lifecycle Manager — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-tenant-lifecycle-manager."
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
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — PLATFORM-SUPPORT: read-only health inspector ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="tlm-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity size={20} strokeWidth={2} aria-hidden="true" />
                Tenant Health Inspector
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Read-only investigation view. Use to verify tenant status and health when handling
                support requests.
              </p>
            </header>

            <div
              data-testid="tlm-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Lifecycle controls are disabled for support access. Escalate to a platform-admin for
                suspensions, offboarding, or force-offboarding.
              </span>
            </div>

            <section
              data-testid="tlm-support-tenant-list"
              aria-labelledby="tlm-support-tenants-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="tlm-support-tenants-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Tenants ({SAMPLE_TENANTS.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_TENANTS.map((t) => (
                  <li
                    key={t.id}
                    data-testid={`tlm-support-tenant-row-${t.id}`}
                    data-tenant-id={t.id}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <TenantStatusBadge status={t.status} />
                        <HealthScore score={t.healthScore} />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Plan: {planLabel(t.plan)} · Created: {t.created}
                      </p>
                      <a
                        href={`/support/tickets?tenantId=${t.id}`}
                        data-testid={`tlm-support-tickets-${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      >
                        <Ticket size={12} strokeWidth={2} aria-hidden="true" />
                        View support tickets
                      </a>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Lifecycle controls rendered but DISABLED — UX-18 disabled-not-absent */}
                      <button
                        type="button"
                        data-testid={`tlm-support-suspend-${t.id}`}
                        aria-label={`Suspend ${t.name} (disabled for support)`}
                        aria-disabled="true"
                        disabled
                        className="inline-flex items-center gap-1 border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-xs cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        <Pause size={12} strokeWidth={2} aria-hidden="true" />
                        Suspend
                      </button>
                      <button
                        type="button"
                        data-testid={`tlm-support-offboard-${t.id}`}
                        aria-label={`Offboard ${t.name} (disabled for support)`}
                        aria-disabled="true"
                        disabled
                        className="inline-flex items-center gap-1 border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-xs cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        <LogOut size={12} strokeWidth={2} aria-hidden="true" />
                        Offboard
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <a
              href="/support/escalate?topic=tenant-lifecycle"
              data-testid="tlm-support-escalate"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to platform-admin →
            </a>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — TENANT-ADMIN: self-service own tenant only ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="tlm-tenant-self-service" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} strokeWidth={2} aria-hidden="true" />
                Account Settings
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your workspace — request offboarding or export your data. For any other
                lifecycle action, contact platform support.
              </p>
            </header>

            <section
              data-testid="tlm-tenant-self-overview"
              aria-labelledby="tlm-tenant-overview-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="tlm-tenant-overview-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2"
              >
                Your workspace
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{selfTenant.name}</span>
                <TenantStatusBadge status={selfTenant.status} />
                <HealthScore score={selfTenant.healthScore} />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Plan: {planLabel(selfTenant.plan)} · Member since: {selfTenant.created}
              </p>
            </section>

            <section
              data-testid="tlm-tenant-actions"
              aria-labelledby="tlm-tenant-actions-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="tlm-tenant-actions-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
              >
                Self-service actions
              </h2>
              <div className="space-y-3">
                <div>
                  <button
                    type="button"
                    data-testid="tlm-tenant-request-offboarding"
                    onClick={handleRequestOffboarding}
                    disabled={tenantOffboardStatus === 'requested'}
                    className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-amber-400 disabled:cursor-not-allowed"
                    style={{ minHeight: '44px' }}
                  >
                    <LogOut size={14} strokeWidth={2} aria-hidden="true" />
                    {tenantOffboardStatus === 'requested'
                      ? 'Offboarding requested'
                      : 'Request offboarding'}
                  </button>
                  {tenantOffboardStatus === 'requested' && (
                    <p
                      data-testid="tlm-tenant-offboard-confirmation"
                      role="status"
                      aria-live="polite"
                      className="text-xs text-emerald-700 mt-1"
                    >
                      Offboarding request submitted. A platform admin will review and contact you
                      within 2 business days.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Opens a formal offboarding request. Requires platform admin approval.
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    data-testid="tlm-tenant-export-data"
                    onClick={handleExportData}
                    disabled={tenantExportStatus === 'running'}
                    className="inline-flex items-center gap-2 border border-blue-300 bg-blue-50 text-blue-800 px-4 py-2 rounded text-sm font-medium hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                    style={{ minHeight: '44px' }}
                  >
                    <Download size={14} strokeWidth={2} aria-hidden="true" />
                    {tenantExportStatus === 'running' ? 'Preparing export…' : 'Export my data'}
                  </button>
                  {tenantExportStatus === 'done' && (
                    <p
                      data-testid="tlm-tenant-export-done"
                      role="status"
                      aria-live="polite"
                      className="text-xs text-emerald-700 mt-1"
                    >
                      Export ready — a download link has been emailed to the account owner.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Download a copy of your workspace content and user records (GDPR).
                  </p>
                </div>
              </div>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — any other role ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="tlm-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Tenant lifecycle management is an internal platform tool. This page is not available
              for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
