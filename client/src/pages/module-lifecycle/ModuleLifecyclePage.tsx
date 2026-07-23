/**
 * ModuleLifecyclePage — FLOW-47 admin console for Module Lifecycle.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-41)
 *
 * Role-aware (RUN-41, engine-internal standard pattern, 3 cells):
 *   - platform-admin   → full registry: create, publish, deprecate, retire; version history
 *   - tenant-admin     → own-tenant installed modules: upgrade + rollback with changelog
 *   - platform-support → read-only registry + audit log; controls DISABLED (not absent)
 *   - others           → fallback "internal platform tool" notice
 *
 * NOTE: This is standard disabled-not-absent (Runs 34-36 pattern), NOT compliance-
 * grade (Runs 39-40). Module lifecycle is operational, not legally mandated.
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Lock,
  Plus,
  Archive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  RotateCcw,
  History,
  Users,
} from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'module-installing': {
    idx: 1,
    label: 'Module installing — dependencies resolving',
    status: 'PROVISIONING',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      version: '2.3.1',
      tenantId: 'tenant-042',
      startedAt: '2026-04-18 08:00',
    },
  },
  'module-installed': {
    idx: 2,
    label: 'Module installed — ready to activate',
    status: 'INSTALLED',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      version: '2.3.1',
      installedAt: '2026-04-18 08:05',
      installedBy: 'tenant-admin-01',
    },
  },
  'module-active': {
    idx: 3,
    label: 'Module active — feature flags enabled for tenant',
    status: 'ACTIVE',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      version: '2.3.1',
      featureFlags: 'FT-204, FT-205, FT-208',
      activatedAt: '2026-04-18 08:07',
    },
  },
  'module-suspended': {
    idx: 4,
    label: 'Module suspended — billing lapse, features disabled',
    status: 'SUSPENDED',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      suspendReason: 'billing_lapse',
      suspendedAt: '2026-04-18 09:30',
      gracePeriodEnds: '2026-04-25',
    },
  },
  'module-upgrading': {
    idx: 5,
    label: 'Module upgrading — migrating to new version',
    status: 'RUNNING',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      fromVersion: '2.3.1',
      toVersion: '2.4.0',
      migrationStep: '3 of 5',
      startedAt: '2026-04-18 10:15',
    },
  },
  'module-upgraded': {
    idx: 6,
    label: 'Module upgraded — new version active',
    status: 'ACTIVE',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      version: '2.4.0',
      previousVersion: '2.3.1',
      upgradedAt: '2026-04-18 10:22',
    },
  },
  'module-uninstall-pending': {
    idx: 7,
    label: 'Module uninstall requested — awaiting data retention window',
    status: 'PENDING',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      requestedBy: 'tenant-admin-01',
      requestedAt: '2026-04-18 11:00',
      retentionEnds: '2026-05-18',
    },
  },
  'module-uninstalled': {
    idx: 8,
    label: 'Module uninstalled — tenant data purged',
    status: 'REMOVED',
    fields: {
      moduleId: 'MOD-analytics-dashboard',
      uninstalledAt: '2026-05-18 00:00',
      dataRowsPurged: '18430',
      featureFlagsDisabled: 'FT-204, FT-205, FT-208',
    },
  },
};

interface Module {
  id: string;
  name: string;
  description: string;
  currentVersion: string;
  status: 'active' | 'deprecated' | 'retired';
  installCount: number;
}

interface ModuleVersion {
  version: string;
  releasedAt: string;
  changelog: string;
}

interface InstalledModule {
  moduleId: string;
  name: string;
  installedVersion: string;
  latestAvailable: string;
  installedAt: string;
  rollbackTarget: string | null;
}

interface LifecycleAuditEntry {
  id: string;
  timestamp: string;
  action: 'CREATED' | 'PUBLISHED' | 'DEPRECATED' | 'RETIRED';
  moduleId: string;
  actor: string;
  details: string;
}

const SAMPLE_MODULES: Module[] = [
  {
    id: 'MOD-analytics-dashboard',
    name: 'Analytics Dashboard',
    description: 'Pre-built charts and filters for event data.',
    currentVersion: '2.4.0',
    status: 'active',
    installCount: 142,
  },
  {
    id: 'MOD-smart-inbox',
    name: 'Smart Inbox',
    description: 'AI-prioritised notification inbox with triage rules.',
    currentVersion: '1.2.3',
    status: 'active',
    installCount: 89,
  },
  {
    id: 'MOD-legacy-export',
    name: 'Legacy CSV Export',
    description: 'CSV export for legacy tools. Superseded by built-in export.',
    currentVersion: '0.9.7',
    status: 'deprecated',
    installCount: 14,
  },
  {
    id: 'MOD-v1-payments',
    name: 'Payments v1 (EOL)',
    description: 'First-generation payments module. End-of-life 2026-03-31.',
    currentVersion: '1.0.9',
    status: 'retired',
    installCount: 3,
  },
];

const SAMPLE_VERSIONS: Record<string, ModuleVersion[]> = {
  'MOD-analytics-dashboard': [
    { version: '2.4.0', releasedAt: '2026-04-10', changelog: 'New funnel chart + CSV export' },
    { version: '2.3.1', releasedAt: '2026-03-22', changelog: 'Fix timezone bug in UTC display' },
    { version: '2.3.0', releasedAt: '2026-03-01', changelog: 'Added filter chips and presets' },
  ],
};

const SAMPLE_INSTALLED: InstalledModule[] = [
  {
    moduleId: 'MOD-analytics-dashboard',
    name: 'Analytics Dashboard',
    installedVersion: '2.3.1',
    latestAvailable: '2.4.0',
    installedAt: '2026-03-22',
    rollbackTarget: '2.3.0',
  },
  {
    moduleId: 'MOD-smart-inbox',
    name: 'Smart Inbox',
    installedVersion: '1.2.3',
    latestAvailable: '1.2.3',
    installedAt: '2026-02-14',
    rollbackTarget: null,
  },
];

const SAMPLE_AUDIT: LifecycleAuditEntry[] = [
  {
    id: 'MLA-2026-0410-001',
    timestamp: '2026-04-10 09:15',
    action: 'PUBLISHED',
    moduleId: 'MOD-analytics-dashboard',
    actor: 'platform-admin-03',
    details: 'Published v2.4.0',
  },
  {
    id: 'MLA-2026-0331-014',
    timestamp: '2026-03-31 17:00',
    action: 'RETIRED',
    moduleId: 'MOD-v1-payments',
    actor: 'platform-admin-01',
    details: 'Retired after end-of-life; 3 tenants notified.',
  },
  {
    id: 'MLA-2026-0301-002',
    timestamp: '2026-03-01 10:00',
    action: 'DEPRECATED',
    moduleId: 'MOD-legacy-export',
    actor: 'platform-admin-02',
    details: 'Deprecated; migration to built-in export suggested.',
  },
];

function ModuleStatusBadge({ status }: { status: Module['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'deprecated'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span
      data-testid={`ml-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ModuleLifecyclePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();

  // Platform-admin: retire-module modal state
  const [retireTarget, setRetireTarget] = useState<Module | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [retireError, setRetireError] = useState('');
  const [retiredResult, setRetiredResult] = useState<string | null>(null);

  // Tenant-admin: upgrade + rollback modal state
  const [upgradeTarget, setUpgradeTarget] = useState<InstalledModule | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<InstalledModule | null>(null);
  const [tenantActionResult, setTenantActionResult] = useState<string | null>(null);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="module-lifecycle"
        flowId="FLOW-47"
        title="Module Lifecycle"
        state={MOCK_STATES[mockState]}
        description="Tenant admin view of marketplace module lifecycle — install, activate, suspend, upgrade, uninstall."
      />
    );
  }

  function confirmRetire() {
    if (!retireTarget) return;
    if (!retireReason.trim()) {
      setRetireError('Please enter a retirement reason — this action affects all tenants.');
      return;
    }
    setRetiredResult(
      `Module ${retireTarget.name} (${retireTarget.id}) retired — ${retireTarget.installCount} tenants will be notified.`,
    );
    setRetireTarget(null);
    setRetireReason('');
  }

  function confirmUpgrade() {
    if (!upgradeTarget) return;
    setTenantActionResult(
      `${upgradeTarget.name} upgraded to ${upgradeTarget.latestAvailable}. Rollback available for 7 days.`,
    );
    setUpgradeTarget(null);
  }

  function confirmRollback() {
    if (!rollbackTarget || !rollbackTarget.rollbackTarget) return;
    setTenantActionResult(
      `${rollbackTarget.name} rolled back to ${rollbackTarget.rollbackTarget}.`,
    );
    setRollbackTarget(null);
  }

  return (
    <div data-testid="page-module-lifecycle" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="ml-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full registry ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="ml-admin-console" className="space-y-4">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Package size={20} strokeWidth={2} aria-hidden="true" />
                  Module Registry
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage modules across the platform: create, publish,
                  deprecate, and retire.
                </p>
              </div>
              <button
                type="button"
                data-testid="ml-create-button"
                aria-label="Register a new module"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Create module
              </button>
            </header>

            {retiredResult && (
              <div
                data-testid="ml-retire-result"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-900"
              >
                {retiredResult}
              </div>
            )}

            <section
              data-testid="ml-admin-modules-list"
              aria-labelledby="ml-admin-modules-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ml-admin-modules-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Modules ({SAMPLE_MODULES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_MODULES.map((m) => (
                  <li
                    key={m.id}
                    data-testid={`ml-admin-row-${m.id}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-500">{m.id}</span>
                        <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          v{m.currentVersion}
                        </span>
                        <ModuleStatusBadge status={m.status} />
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          <Users size={10} strokeWidth={2} aria-hidden="true" />
                          {m.installCount}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{m.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        data-testid={`ml-publish-${m.id}`}
                        aria-label={`Publish a new version of ${m.name}`}
                        disabled={m.status === 'retired'}
                        className="inline-flex items-center gap-1 border border-blue-300 text-blue-800 bg-blue-50 rounded px-3 py-2 text-xs hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        <Upload size={12} strokeWidth={2} aria-hidden="true" />
                        Publish
                      </button>
                      <button
                        type="button"
                        data-testid={`ml-deprecate-${m.id}`}
                        aria-label={`Deprecate ${m.name}`}
                        disabled={m.status !== 'active'}
                        className="inline-flex items-center gap-1 border border-amber-300 text-amber-800 bg-amber-50 rounded px-3 py-2 text-xs hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        <Archive size={12} strokeWidth={2} aria-hidden="true" />
                        Deprecate
                      </button>
                      <button
                        type="button"
                        data-testid={`ml-retire-${m.id}`}
                        aria-label={`Retire ${m.name} — affects all installed tenants`}
                        onClick={() => setRetireTarget(m)}
                        disabled={m.status === 'retired'}
                        className="inline-flex items-center gap-1 border border-red-400 text-red-900 bg-red-50 rounded px-3 py-2 text-xs hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ minHeight: '44px' }}
                      >
                        <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                        Retire
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Version history panel for MOD-analytics-dashboard as example */}
            <section
              data-testid="ml-admin-version-history"
              aria-labelledby="ml-admin-versions-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ml-admin-versions-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200 flex items-center gap-2"
              >
                <History size={14} strokeWidth={2} aria-hidden="true" />
                Version history · Analytics Dashboard
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_VERSIONS['MOD-analytics-dashboard'].map((v) => (
                  <li
                    key={v.version}
                    data-testid={`ml-version-${v.version}`}
                    className="p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      v{v.version}{' '}
                      <span className="text-xs font-normal text-gray-500">
                        · {v.releasedAt}
                      </span>
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">{v.changelog}</p>
                  </li>
                ))}
              </ul>
            </section>

            {/* Retire confirmation modal */}
            {retireTarget && (
              <div
                data-testid="ml-retire-modal"
                role="alertdialog"
                aria-labelledby="ml-retire-title"
                aria-describedby="ml-retire-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="ml-retire-title"
                    className="text-lg font-bold text-red-900 flex items-center gap-2"
                  >
                    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                    Retire module — affects {retireTarget.installCount} tenants
                  </h3>
                  <p id="ml-retire-desc" className="text-sm text-gray-700 mt-2">
                    Retiring <span className="font-semibold">{retireTarget.name}</span>{' '}
                    prevents new installations. Existing installs continue to work but
                    the {retireTarget.installCount} tenants currently running this
                    module will receive a migration notice.
                  </p>
                  <label
                    htmlFor="ml-retire-reason"
                    className="block text-sm font-medium text-gray-700 mt-4 mb-1"
                  >
                    Retirement reason <span className="text-red-600">(required)</span>
                  </label>
                  <textarea
                    id="ml-retire-reason"
                    data-testid="ml-retire-reason-input"
                    value={retireReason}
                    onChange={(e) => {
                      setRetireReason(e.target.value);
                      if (retireError) setRetireError('');
                    }}
                    rows={3}
                    aria-invalid={retireError ? 'true' : 'false'}
                    aria-describedby={retireError ? 'ml-retire-reason-err' : undefined}
                    placeholder="e.g. Superseded by built-in analytics; EOL notice sent 2026-03-15."
                    className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {retireError && (
                    <p
                      id="ml-retire-reason-err"
                      data-testid="ml-retire-error"
                      role="alert"
                      className="text-xs text-red-700 mt-1"
                    >
                      {retireError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="ml-retire-cancel"
                      onClick={() => {
                        setRetireTarget(null);
                        setRetireReason('');
                        setRetireError('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="ml-retire-confirm"
                      onClick={confirmRetire}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Retire module
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section data-testid="ml-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="module-lifecycle"
                indexName="xiigen-module-lifecycle"
                title="Module Lifecycle — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-module-lifecycle."
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

        {/* ─────────── Branch 2 — TENANT-ADMIN: own-tenant upgrade/rollback ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main data-testid="ml-tenant-panel" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} strokeWidth={2} aria-hidden="true" />
                My Modules
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Modules installed in your workspace. Upgrade to the latest version or
                roll back a recent upgrade if it caused issues.
              </p>
            </header>

            {tenantActionResult && (
              <div
                data-testid="ml-tenant-action-result"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
              >
                {tenantActionResult}
              </div>
            )}

            <section
              data-testid="ml-tenant-installed-list"
              aria-labelledby="ml-tenant-installed-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ml-tenant-installed-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Installed modules ({SAMPLE_INSTALLED.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_INSTALLED.map((m) => {
                  const upgradeAvailable = m.installedVersion !== m.latestAvailable;
                  return (
                    <li
                      key={m.moduleId}
                      data-testid={`ml-tenant-row-${m.moduleId}`}
                      className="p-4 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Running v{m.installedVersion} · Installed {m.installedAt}
                          {upgradeAvailable && (
                            <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-800 font-semibold">
                              v{m.latestAvailable} available
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          data-testid={`ml-tenant-upgrade-${m.moduleId}`}
                          aria-label={`Upgrade ${m.name} to v${m.latestAvailable}`}
                          onClick={() => setUpgradeTarget(m)}
                          disabled={!upgradeAvailable}
                          className="inline-flex items-center gap-1 bg-blue-600 text-white rounded px-3 py-2 text-xs hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                          style={{ minHeight: '44px' }}
                        >
                          <Upload size={12} strokeWidth={2} aria-hidden="true" />
                          Upgrade
                        </button>
                        <button
                          type="button"
                          data-testid={`ml-tenant-rollback-${m.moduleId}`}
                          aria-label={`Roll back ${m.name} to v${m.rollbackTarget ?? 'previous version'}`}
                          onClick={() => setRollbackTarget(m)}
                          disabled={!m.rollbackTarget}
                          className="inline-flex items-center gap-1 border border-amber-300 text-amber-900 bg-amber-50 rounded px-3 py-2 text-xs hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ minHeight: '44px' }}
                        >
                          <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
                          Rollback
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Upgrade modal with changelog (UX-8: show changelog before confirming) */}
            {upgradeTarget && (
              <div
                data-testid="ml-upgrade-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ml-upgrade-title"
                aria-describedby="ml-upgrade-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="ml-upgrade-title"
                    className="text-lg font-bold text-gray-900 flex items-center gap-2"
                  >
                    <Upload size={18} strokeWidth={2} aria-hidden="true" />
                    Upgrade {upgradeTarget.name}
                  </h3>
                  <p id="ml-upgrade-desc" className="text-sm text-gray-700 mt-2">
                    Upgrading from v{upgradeTarget.installedVersion} to v
                    {upgradeTarget.latestAvailable}.
                  </p>
                  <div
                    data-testid="ml-upgrade-changelog"
                    className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
                  >
                    <p className="font-semibold uppercase tracking-wide text-slate-600 mb-1">
                      What's new
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>New funnel chart + CSV export</li>
                      <li>Fix timezone bug in UTC display</li>
                      <li>Added filter chips and presets</li>
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    After upgrade, a rollback to v{upgradeTarget.installedVersion} will
                    remain available for 7 days.
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="ml-upgrade-cancel"
                      onClick={() => setUpgradeTarget(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="ml-upgrade-confirm"
                      onClick={confirmUpgrade}
                      className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Upgrade now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Rollback modal with explicit consequences (UX-14) */}
            {rollbackTarget && (
              <div
                data-testid="ml-rollback-modal"
                role="alertdialog"
                aria-labelledby="ml-rollback-title"
                aria-describedby="ml-rollback-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="ml-rollback-title"
                    className="text-lg font-bold text-amber-900 flex items-center gap-2"
                  >
                    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                    Roll back {rollbackTarget.name}?
                  </h3>
                  <p id="ml-rollback-desc" className="text-sm text-gray-700 mt-2">
                    This reverts from v{rollbackTarget.installedVersion} back to v
                    {rollbackTarget.rollbackTarget}.
                  </p>
                  <div
                    role="note"
                    className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900"
                  >
                    <p className="font-semibold mb-1">What this will affect:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        Features added in v{rollbackTarget.installedVersion} will be
                        removed from your workspace.
                      </li>
                      <li>
                        Data changes made by the newer version that are not backward-
                        compatible may become unavailable.
                      </li>
                      <li>
                        You can upgrade again later, but rollback-window timing resets.
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="ml-rollback-cancel"
                      onClick={() => setRollbackTarget(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="ml-rollback-confirm"
                      onClick={confirmRollback}
                      className="px-4 py-2 text-sm font-bold text-white bg-amber-700 rounded hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Roll back anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: read-only + audit log ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="ml-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} strokeWidth={2} aria-hidden="true" />
                Module Registry (Read-Only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Investigate module-related tenant issues. Escalate to
                platform-admin for any lifecycle change.
              </p>
            </header>

            <div
              data-testid="ml-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Lifecycle controls are disabled for support access. Layout preserved so
                you can describe the exact remediation to a platform-admin.
              </span>
            </div>

            <section
              data-testid="ml-support-modules-list"
              aria-labelledby="ml-support-modules-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ml-support-modules-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Modules ({SAMPLE_MODULES.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_MODULES.map((m) => (
                  <li
                    key={m.id}
                    data-testid={`ml-support-row-${m.id}`}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-500">{m.id}</span>
                        <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          v{m.currentVersion}
                        </span>
                        <ModuleStatusBadge status={m.status} />
                        <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                          <Users size={10} strokeWidth={2} aria-hidden="true" />
                          {m.installCount}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{m.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{m.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['publish', 'deprecate', 'retire'].map((action) => (
                        <button
                          key={action}
                          type="button"
                          data-testid={`ml-support-${action}-${m.id}`}
                          aria-label={`${action} ${m.name} (disabled for support)`}
                          aria-disabled="true"
                          disabled
                          className="inline-flex items-center gap-1 border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-xs cursor-not-allowed"
                          style={{ minHeight: '44px' }}
                        >
                          {action === 'publish' && (
                            <Upload size={12} strokeWidth={2} aria-hidden="true" />
                          )}
                          {action === 'deprecate' && (
                            <Archive size={12} strokeWidth={2} aria-hidden="true" />
                          )}
                          {action === 'retire' && (
                            <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
                          )}
                          <span className="capitalize">{action}</span>
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section
              data-testid="ml-support-audit-log"
              aria-labelledby="ml-support-audit-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ml-support-audit-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Lifecycle audit ({SAMPLE_AUDIT.length})
              </h2>
              <ul className="divide-y divide-gray-100">
                {SAMPLE_AUDIT.map((e) => (
                  <li
                    key={e.id}
                    data-testid={`ml-audit-entry-${e.id}`}
                    className="p-4"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {e.action === 'CREATED' && (
                        <CheckCircle2
                          size={14}
                          strokeWidth={2}
                          className="text-emerald-600"
                          aria-hidden="true"
                        />
                      )}
                      {e.action === 'PUBLISHED' && (
                        <Upload
                          size={14}
                          strokeWidth={2}
                          className="text-blue-600"
                          aria-hidden="true"
                        />
                      )}
                      {e.action === 'DEPRECATED' && (
                        <Archive
                          size={14}
                          strokeWidth={2}
                          className="text-amber-600"
                          aria-hidden="true"
                        />
                      )}
                      {e.action === 'RETIRED' && (
                        <XCircle
                          size={14}
                          strokeWidth={2}
                          className="text-red-600"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-xs font-mono text-gray-500">{e.id}</span>
                      <span className="text-xs text-gray-500">· {e.timestamp}</span>
                      <span className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-slate-100 text-slate-700 font-semibold">
                        {e.action}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">{e.details}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Module: {e.moduleId} · Actor: {e.actor}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <a
              href="/support/escalate?topic=module-lifecycle"
              data-testid="ml-support-escalate"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              style={{ minHeight: '44px' }}
            >
              Escalate to platform-admin →
            </a>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Fallback — any other role ─────────── */}
        <RoleScopedView.Fallback>
          <div
            data-testid="ml-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Module lifecycle management is an internal platform tool. This page is
              not available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
