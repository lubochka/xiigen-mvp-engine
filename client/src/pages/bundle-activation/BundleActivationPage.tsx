/**
 * BundleActivationPage — FLOW-00 admin console for Bundle Activation.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → role-scoped view (RUN-47d)
 *
 * Role-aware (RUN-47d — closes FLEET-VALIDATION-v5 §6 item #1, 2+1 cells):
 *   - tenant-admin     → bundle activation wizard (select → configure → activate)
 *   - platform-admin   → cross-tenant provisioning ops (status, force-activate, revoke)
 *   - platform-support → read-only cross-tenant bundle status (disabled controls)
 *   - others           → fallback "not available for your role"
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - Plan states: VALIDATION_PENDING → ACTIVE → DEGRADED → RESTORED
 *   - bundle-activation-orchestrator.service.ts → 'ACTIVE' | mode: 'DRY_RUN' | 'FULL'
 *   - bundle-status-tracker.service.ts          → 'DEGRADED' | 'ACTIVE' (recomputed)
 *   - bundle-validator.service.ts               → 'INVALID_BUNDLE' | 'BUNDLE_NOT_FOUND' | 'EMPTY_REQUIRED_FLOWS'
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Lock,
  Ban,
  PlayCircle,
  Activity,
} from 'lucide-react';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'validation-pending': {
    idx: 1,
    label: 'Bundle activation requested — validation in progress',
    status: 'PENDING',
    fields: {
      bundleId: 'BDL-core-platform-v2',
      requiredFlowCount: '7',
      requestedBy: 'platform-admin',
      requestedAt: '2026-04-19 08:00',
    },
  },
  'dry-run-running': {
    idx: 2,
    label: 'Dry run executing — required flows being bootstrapped in shadow',
    status: 'RUNNING',
    fields: {
      bundleId: 'BDL-core-platform-v2',
      mode: 'DRY_RUN',
      flowsChecked: '4 of 7',
      startedAt: '2026-04-19 08:02',
    },
  },
  'active': {
    idx: 3,
    label: 'Bundle active — all required flows activated and healthy',
    status: 'ACTIVE',
    fields: {
      bundleId: 'BDL-core-platform-v2',
      activeVersion: '2.1.3',
      requiredFlowCount: '7',
      activatedAt: '2026-04-19 08:08',
    },
  },
  'degraded': {
    idx: 4,
    label: 'Bundle degraded — flow version below minimum, health compromised',
    status: 'DEGRADED',
    fields: {
      bundleId: 'BDL-core-platform-v2',
      degradedFlow: 'Visual flow engine',
      currentVersion: '1.9.0',
      minimumVersion: '2.0.0',
      degradedAt: '2026-04-19 08:20',
    },
  },
  'restored': {
    idx: 5,
    label: 'Bundle restored — all flow versions meet minimum, status ACTIVE',
    status: 'ACTIVE',
    fields: {
      bundleId: 'BDL-core-platform-v2',
      restoredFlow: 'Visual flow engine',
      restoredVersion: '2.1.0',
      restoredAt: '2026-04-19 08:35',
    },
  },
  'validation-failed': {
    idx: 6,
    label: 'Validation failed — bundle has no required flows configured',
    status: 'FAILED',
    fields: {
      bundleId: 'BDL-experimental-x',
      errorCode: 'EMPTY_REQUIRED_FLOWS',
      validatedAt: '2026-04-19 08:40',
    },
  },
  'activation-failed': {
    idx: 7,
    label: 'Activation halted — dry run failure on required flow',
    status: 'FAILED',
    fields: {
      bundleId: 'BDL-partner-v1',
      failedFlow: 'CMS publishing',
      errorCode: 'DRY_RUN_FAILED',
      failedAt: '2026-04-19 08:45',
    },
  },
  'bundle-not-found': {
    idx: 8,
    label: 'Bundle not found — activation request rejected',
    status: 'REJECTED',
    fields: {
      bundleId: 'BDL-unknown-99',
      errorCode: 'BUNDLE_NOT_FOUND',
      rejectedAt: '2026-04-19 08:50',
    },
  },
};

interface Bundle {
  id: string;
  name: string;
  status: 'active' | 'degraded' | 'pending' | 'failed';
  version: string;
  requiredFlowCount: number;
  tenantId: string;
}

const SAMPLE_BUNDLES: Bundle[] = [
  {
    id: 'BDL-core-platform-v2',
    name: 'Core Platform v2',
    status: 'active',
    version: '2.1.3',
    requiredFlowCount: 7,
    tenantId: 'platform',
  },
  {
    id: 'BDL-marketplace-pack',
    name: 'Marketplace Pack',
    status: 'active',
    version: '1.4.0',
    requiredFlowCount: 4,
    tenantId: 'TNT-acme-corp',
  },
  {
    id: 'BDL-compliance-gate',
    name: 'Compliance Gate',
    status: 'degraded',
    version: '3.0.1',
    requiredFlowCount: 3,
    tenantId: 'TNT-bluebird',
  },
  {
    id: 'BDL-experimental-x',
    name: 'Experimental X',
    status: 'failed',
    version: '0.9.2',
    requiredFlowCount: 0,
    tenantId: 'TNT-castle',
  },
];

const TENANT_A_ADAPTATION = {
  cascade: 'tenant-a-v1.0.1',
  title: 'Acme launch policy',
  readinessLabel: 'Check bundle readiness',
  supportRoute: 'Acme launch desk',
  launchEstimate: 'about 9 seconds',
};

const TENANT_B_INSTALLED_FROM_A = {
  ...TENANT_A_ADAPTATION,
  cascade: 'tenant-b-installed-from-a',
  title: 'Northwind installed launch policy',
  sourceLabel: 'Installed from Acme launch bundles',
};

const TENANT_B_ADAPTATION = {
  cascade: 'tenant-b-v1.0.2',
  title: 'Northwind branch launch policy',
  readinessLabel: 'Confirm branch readiness',
  supportRoute: 'Northwind branch ops',
  launchEstimate: 'about 11 seconds',
  sourceLabel: 'Adapted from Acme launch bundles',
};

const TENANT_C_INSTALLED_FROM_B = {
  ...TENANT_B_ADAPTATION,
  cascade: 'tenant-c-installed-from-b',
  title: 'Tessera installed branch launch policy',
  sourceLabel: 'Installed from Northwind launch bundles',
};

const TENANT_C_ADAPTATION = {
  cascade: 'tenant-c-v1.0.3',
  title: 'Tessera community launch policy',
  readinessLabel: 'Confirm circle readiness',
  supportRoute: 'Tessera community ops',
  launchEstimate: 'about 12 seconds',
  sourceLabel: 'Adapted from Northwind launch bundles',
};

const CASCADE_ADAPTATIONS = [
  TENANT_A_ADAPTATION,
  TENANT_B_INSTALLED_FROM_A,
  TENANT_B_ADAPTATION,
  TENANT_C_INSTALLED_FROM_B,
  TENANT_C_ADAPTATION,
];

function StatusBadge({ status }: { status: Bundle['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : status === 'degraded'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : status === 'pending'
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : 'bg-red-100 text-red-800 border-red-200';
  return (
    <span
      data-testid={`ba-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function renderBundleList(disabled: boolean, testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {SAMPLE_BUNDLES.map((b) => (
        <li
          key={b.id}
          data-testid={`${testIdPrefix}-row-${b.id}`}
          className="p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-500">{b.id}</span>
              <StatusBadge status={b.status} />
              <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                v{b.version}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">{b.name}</p>
            <p className="text-xs text-gray-600 mt-1">
              Required flows: {b.requiredFlowCount} · Tenant:{' '}
              <span className="font-mono">{b.tenantId}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`${testIdPrefix}-force-activate-${b.id}`}
              aria-label={`Force-activate ${b.name}${disabled ? ' (disabled for support)' : ''}`}
              aria-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              className={
                disabled
                  ? 'inline-flex items-center gap-1 border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-xs cursor-not-allowed'
                  : 'inline-flex items-center gap-1 border border-blue-300 text-blue-800 bg-blue-50 rounded px-3 py-2 text-xs hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }
              style={{ minHeight: '44px' }}
            >
              <Zap size={12} strokeWidth={2} aria-hidden="true" />
              Force-activate
            </button>
            <button
              type="button"
              data-testid={`${testIdPrefix}-revoke-${b.id}`}
              aria-label={`Revoke ${b.name}${disabled ? ' (disabled for support)' : ''}`}
              aria-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              className={
                disabled
                  ? 'inline-flex items-center gap-1 border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-xs cursor-not-allowed'
                  : 'inline-flex items-center gap-1 border border-red-300 text-red-800 bg-red-50 rounded px-3 py-2 text-xs hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500'
              }
              style={{ minHeight: '44px' }}
            >
              <Ban size={12} strokeWidth={2} aria-hidden="true" />
              Revoke
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BundleActivationPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const cascadeSegment = searchParams.get('cascade');
  const { role } = useViewerRole();
  const tenantAdaptation =
    CASCADE_ADAPTATIONS.find((adaptation) => adaptation.cascade === cascadeSegment) ?? null;

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedBundleId, setSelectedBundleId] = useState<string>('BDL-marketplace-pack');
  const [dryRunMode, setDryRunMode] = useState(true);
  const [activateResult, setActivateResult] = useState<string | null>(null);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="bundle-activation"
        flowId="FLOW-00"
        title="Bundle Activation"
        state={MOCK_STATES[mockState]}
        description="Admin view of bundle lifecycle: validation, dry run, activation, degradation, and restoration."
      />
    );
  }

  function handleWizardActivate() {
    const bundle = SAMPLE_BUNDLES.find((b) => b.id === selectedBundleId);
    if (!bundle) return;
    setActivateResult(
      `${bundle.name} activation started in ${dryRunMode ? 'DRY_RUN' : 'FULL'} mode. Dry run will complete in ~2 minutes.`,
    );
    setWizardStep(3);
  }

  return (
    <div data-testid="page-bundle-activation" data-viewer-role={role} className="p-4">
      {tenantAdaptation && (
        <section
          data-testid="ba-tenant-adaptation"
          className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
          aria-label={tenantAdaptation.title}
        >
          <h2 className="text-sm font-semibold text-emerald-950">
            {tenantAdaptation.title}
          </h2>
          <p data-testid="ba-tenant-adaptation-summary" className="mt-1 text-sm">
            Readiness step: {tenantAdaptation.readinessLabel}. Support route:{' '}
            {tenantAdaptation.supportRoute}. Full launch estimate:{' '}
            {tenantAdaptation.launchEstimate}.
            {'sourceLabel' in tenantAdaptation ? ` ${tenantAdaptation.sourceLabel}.` : ''}
          </p>
        </section>
      )}
      <RoleScopedView role={role} testIdPrefix="ba-role">
        {/* ─────────── Tenant-admin — activation wizard ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          <main
            data-testid="ba-tenant-wizard"
            className="max-w-2xl mx-auto space-y-4"
          >
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} strokeWidth={2} aria-hidden="true" />
                Activate a bundle
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Bundles package together pre-configured flows for your workspace.
                Run a dry run first to see what will change before activating.
              </p>
            </header>

            {/* Wizard stepper */}
            <ol
              data-testid="ba-wizard-stepper"
              className="flex items-center gap-2 text-xs"
              aria-label="Bundle activation steps"
            >
              {[
                { n: 1, label: 'Select bundle' },
                { n: 2, label: 'Configure' },
                { n: 3, label: 'Activate' },
              ].map((s) => (
                <li
                  key={s.n}
                  data-testid={`ba-wizard-step-${s.n}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded border ${
                    wizardStep >= s.n
                      ? 'border-blue-400 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="font-bold">{s.n}</span>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>

            {wizardStep === 1 && (
              <section
                data-testid="ba-wizard-select"
                className="p-4 border border-gray-200 rounded bg-white"
              >
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Choose a bundle
                </h2>
                <div className="space-y-2">
                  {SAMPLE_BUNDLES.filter((b) => b.status !== 'failed').map((b) => (
                    <label
                      key={b.id}
                      data-testid={`ba-wizard-option-${b.id}`}
                      className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${
                        selectedBundleId === b.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bundle"
                        value={b.id}
                        checked={selectedBundleId === b.id}
                        onChange={() => setSelectedBundleId(b.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {b.name}
                          </span>
                          <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            v{b.version}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {b.requiredFlowCount} required flows
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="ba-wizard-next"
                  onClick={() => setWizardStep(2)}
                  className="mt-3 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ minHeight: '44px' }}
                >
                  Continue → Configure
                </button>
              </section>
            )}

            {wizardStep === 2 && (
              <section
                data-testid="ba-wizard-configure"
                className="p-4 border border-gray-200 rounded bg-white"
              >
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Configure activation
                </h2>
                <label className="flex items-start gap-3 p-3 rounded border border-gray-200 bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dryRunMode}
                    onChange={(e) => setDryRunMode(e.target.checked)}
                    data-testid="ba-wizard-dryrun-toggle"
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Run dry-run first (recommended)
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Bootstraps the required flows in a shadow workspace so you can
                      review changes before they affect your live workspace.
                    </p>
                  </div>
                </label>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    data-testid="ba-wizard-back"
                    onClick={() => setWizardStep(1)}
                    className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    style={{ minHeight: '44px' }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    data-testid="ba-wizard-activate"
                    onClick={handleWizardActivate}
                    className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    style={{ minHeight: '44px' }}
                  >
                    <PlayCircle size={14} strokeWidth={2} aria-hidden="true" />
                    {dryRunMode ? 'Run dry-run' : 'Activate bundle'}
                  </button>
                </div>
              </section>
            )}

            {wizardStep === 3 && activateResult && (
              <section
                data-testid="ba-wizard-result"
                role="status"
                aria-live="polite"
                className="p-4 border border-emerald-200 rounded bg-emerald-50"
              >
                <p className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />
                  Activation started
                </p>
                <p className="text-xs text-emerald-800 mt-1">{activateResult}</p>
                <button
                  type="button"
                  data-testid="ba-wizard-reset"
                  onClick={() => {
                    setWizardStep(1);
                    setActivateResult(null);
                  }}
                  className="mt-3 inline-flex items-center text-xs font-medium text-emerald-700 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                  style={{ minHeight: '44px' }}
                >
                  Activate another bundle →
                </button>
              </section>
            )}
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Platform-admin — cross-tenant provisioning ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="ba-admin-console" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} strokeWidth={2} aria-hidden="true" />
                Bundle Activation
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Cross-tenant bundle provisioning and status.
              </p>
            </header>

            <section
              data-testid="ba-admin-bundle-list"
              aria-labelledby="ba-admin-bundles-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ba-admin-bundles-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Bundles across all tenants ({SAMPLE_BUNDLES.length})
              </h2>
              {renderBundleList(false, 'ba-admin-bundles')}
            </section>

            <section data-testid="ba-admin-operations-panel" className="mt-6">
              <div className="border border-gray-200 rounded bg-white">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Activity size={16} strokeWidth={2} aria-hidden="true" />
                      Activation operations
                    </h2>
                    <p className="text-xs text-gray-600 mt-1">
                      Review validation, dry-run, and activation checkpoints before taking action.
                    </p>
                  </div>
                  <span className="text-xs font-semibold rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-2 py-1">
                    Live workflow
                  </span>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-3">
                  {[
                    {
                      label: 'Validation queue',
                      value: '2 pending',
                      note: 'Oldest request 6 min',
                    },
                    {
                      label: 'Dry runs',
                      value: '4 running',
                      note: 'All within timeout',
                    },
                    {
                      label: 'Activations',
                      value: '11 today',
                      note: '0 rollback events',
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded border border-gray-200 bg-gray-50 p-3"
                    >
                      <p className="text-xs font-medium text-gray-500">{item.label}</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{item.value}</p>
                      <p className="text-xs text-gray-600 mt-1">{item.note}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 px-4 py-3">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Next checkpoints
                  </h3>
                  <ol className="mt-3 space-y-2">
                    {[
                      'Validate required flows exist and are activatable',
                      'Run dry-run before full activation for every flow',
                      'Store activation record before notifying subscribers',
                    ].map((label, index) => (
                      <li key={label} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
                          {index + 1}
                        </span>
                        <span>{label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Platform-support — read-only ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="ba-support-view" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} strokeWidth={2} aria-hidden="true" />
                Bundle Activation (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Read-only bundle status inspector for tenant support.
              </p>
            </header>

            <div
              data-testid="ba-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Force-activate / revoke controls are disabled for support access.
                Escalate to a platform-admin for any bundle change.
              </span>
            </div>

            <section
              data-testid="ba-support-bundle-list"
              aria-labelledby="ba-support-bundles-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="ba-support-bundles-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Bundles across all tenants ({SAMPLE_BUNDLES.length})
              </h2>
              {renderBundleList(true, 'ba-support-bundles')}
            </section>

            <a
              href="/support/escalate?topic=bundle-activation"
              data-testid="ba-support-escalate"
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
            data-testid="ba-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50 max-w-2xl mx-auto mt-8"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Bundle Activation
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Bundle activation is managed by tenant administrators and the platform
              team. This page is not available for your current role.
            </p>
            <div
              data-testid="ba-degraded-hint"
              role="note"
              className="mt-3 p-2 rounded border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-1"
            >
              <AlertTriangle
                size={12}
                strokeWidth={2}
                aria-hidden="true"
                className="mt-0.5"
              />
              If a feature in your workspace is behaving unexpectedly, ask your
              tenant-admin to check bundle status.
            </div>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
