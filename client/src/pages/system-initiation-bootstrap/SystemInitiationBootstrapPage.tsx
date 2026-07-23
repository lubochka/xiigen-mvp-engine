/**
 * SystemInitiationBootstrapPage — FLOW-33 admin console for System Initiation Bootstrap.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-system-initiation-bootstrap
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   ENGINE_COLD → BOOTSTRAP_RUNNING → INDICES_READY → ENGINE_WARM
 * Plus states derived from bootstrap-orchestrator and graphrag-two-layer-seeder
 * (LayerStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED') —
 * covers kernel load, factory registry hydrate, seed corpus ingest, failures.
 */

import React, { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';

const MOCK_STATES: Record<string, BusinessState> = {
  'engine-cold': {
    idx: 1,
    label: 'Engine COLD — no fabrics resolved, no indices confirmed',
    status: 'COLD',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      detectedAt: '2026-04-19 08:55',
      fabricsResolved: '0/6',
      indicesConfirmed: '0/47',
    },
  },
  'bootstrap-running': {
    idx: 2,
    label: 'Bootstrap orchestrator running — loading kernel + fabrics',
    status: 'BOOTSTRAPPING',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      phase: 'fabric-resolution',
      startedAt: '2026-04-19 09:00',
      fabricsResolved: '4/6',
    },
  },
  'seeding-corpus': {
    idx: 3,
    label: 'GraphRAG seed corpus ingesting — layer 1 of 2',
    status: 'INGESTING',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      layer: '1',
      batchSize: '500',
      recordsIngested: '1,250',
      totalRecords: '3,400',
    },
  },
  'indices-ready': {
    idx: 4,
    label: 'All 47 indices confirmed — data plane ready',
    status: 'READY',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      indicesConfirmed: '47/47',
      factoryRegistryCount: '1,606',
      taskTypeCount: '657',
      confirmedAt: '2026-04-19 09:15',
    },
  },
  'engine-warm': {
    idx: 5,
    label: 'Engine WARM — API accepting traffic',
    status: 'WARM',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      warmedAt: '2026-04-19 09:20',
      uptime: '0h 02m',
      requestsServed: '12',
      healthScore: '100',
    },
  },
  'bootstrap-failed': {
    idx: 6,
    label: 'Bootstrap FAILED — fabric resolution error',
    status: 'FAILED',
    fields: {
      bootId: 'BOOT-2026-0419-002',
      failedPhase: 'fabric-resolution',
      failedFactory: 'F1203-elasticsearch-client',
      errorCode: 'CONNECTION_REFUSED',
      failedAt: '2026-04-19 09:22',
    },
  },
  'engine-degraded': {
    idx: 7,
    label: 'Engine DEGRADED — queue fabric disconnected, DB intact',
    status: 'DEGRADED',
    fields: {
      bootId: 'BOOT-2026-0419-001',
      healthyFabrics: 'database, ai-engine, rag, secrets, flow-engine',
      unhealthyFabrics: 'queue',
      degradedAt: '2026-04-19 09:45',
    },
  },
};

export function SystemInitiationBootstrapPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  // Zero-state guard: anonymous wizard only appears when no tenants exist.
  // Simulated via URL param ?system-initialised=true (defaults to false = no tenants yet).
  const systemInitialised = searchParams.get('system-initialised') === 'true';

  // Setup wizard state
  const [wizardName, setWizardName] = useState('');
  const [wizardEmail, setWizardEmail] = useState('');
  const [wizardPassword, setWizardPassword] = useState('');
  const [wizardStatus, setWizardStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [wizardErrors, setWizardErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  // Re-run bootstrap confirmation state (platform-admin)
  const [rerunConfirming, setRerunConfirming] = useState(false);

  // Path A: mock states — UNCHANGED, all roles
  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="system-initiation-bootstrap"
        flowId="FLOW-33"
        title="System Initiation Bootstrap"
        state={MOCK_STATES[mockState]}
        description="Admin view of engine cold-start, fabric resolution, index hydration, warm-up, and degraded states."
      />
    );
  }

  function validateWizard(): boolean {
    const errs: typeof wizardErrors = {};
    if (wizardName.trim().length < 2) errs.name = 'Tenant name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wizardEmail))
      errs.email = 'Please enter a valid email address.';
    if (wizardPassword.length < 8)
      errs.password = 'Password must be at least 8 characters.';
    setWizardErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleWizardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateWizard()) return;
    setWizardStatus('loading');
    setTimeout(() => setWizardStatus('success'), 600);
  }

  // Path B: role-aware rendering
  return (
    <div data-viewer-role={role}>
      <RoleScopedView role={role} testIdPrefix="sib-role">
        {/* Branch 1 — anonymous (zero-state setup wizard, or redirect) */}
        <RoleScopedView.Case when={['anonymous', 'public-marketplace-visitor']}>
          {systemInitialised ? (
            <Navigate to="/login" replace />
          ) : (
            <main
              data-testid="sib-role-anon-wizard"
              className="max-w-md mx-auto py-12 px-4"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to XIIGen</h1>
              <p className="text-sm text-gray-600 mb-6">
                Let's create your workspace. This takes less than a minute.
              </p>

              {wizardStatus === 'success' ? (
                <div
                  data-testid="sib-wizard-success"
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-lg bg-green-50 border border-green-200"
                >
                  <p className="text-sm font-medium text-green-900">
                    <span aria-hidden="true">✓</span> Workspace created!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Redirecting to your dashboard…
                  </p>
                </div>
              ) : (
                <form
                  data-testid="sib-wizard-form"
                  onSubmit={handleWizardSubmit}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="sib-wizard-name"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tenant name{' '}
                      <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      id="sib-wizard-name"
                      data-testid="sib-wizard-name"
                      type="text"
                      value={wizardName}
                      onChange={(e) => {
                        setWizardName(e.target.value);
                        if (wizardErrors.name)
                          setWizardErrors((p) => ({ ...p, name: undefined }));
                      }}
                      aria-invalid={!!wizardErrors.name}
                      aria-describedby={wizardErrors.name ? 'sib-wizard-name-error' : undefined}
                      placeholder="Acme Labs"
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${wizardErrors.name ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {wizardErrors.name && (
                      <p
                        id="sib-wizard-name-error"
                        data-testid="sib-wizard-name-error"
                        role="alert"
                        className="mt-1 text-xs text-red-600"
                      >
                        {wizardErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sib-wizard-email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Admin email{' '}
                      <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      id="sib-wizard-email"
                      data-testid="sib-wizard-email"
                      type="email"
                      autoComplete="email"
                      value={wizardEmail}
                      onChange={(e) => {
                        setWizardEmail(e.target.value);
                        if (wizardErrors.email)
                          setWizardErrors((p) => ({ ...p, email: undefined }));
                      }}
                      aria-invalid={!!wizardErrors.email}
                      aria-describedby={wizardErrors.email ? 'sib-wizard-email-error' : undefined}
                      placeholder="you@example.com"
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${wizardErrors.email ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {wizardErrors.email && (
                      <p
                        id="sib-wizard-email-error"
                        data-testid="sib-wizard-email-error"
                        role="alert"
                        className="mt-1 text-xs text-red-600"
                      >
                        {wizardErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="sib-wizard-password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password{' '}
                      <span className="text-red-500" aria-label="required">*</span>
                    </label>
                    <input
                      id="sib-wizard-password"
                      data-testid="sib-wizard-password"
                      type="password"
                      autoComplete="new-password"
                      value={wizardPassword}
                      onChange={(e) => {
                        setWizardPassword(e.target.value);
                        if (wizardErrors.password)
                          setWizardErrors((p) => ({ ...p, password: undefined }));
                      }}
                      aria-invalid={!!wizardErrors.password}
                      aria-describedby={
                        wizardErrors.password ? 'sib-wizard-password-error' : 'sib-wizard-password-hint'
                      }
                      placeholder="At least 8 characters"
                      className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${wizardErrors.password ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    {wizardErrors.password ? (
                      <p
                        id="sib-wizard-password-error"
                        data-testid="sib-wizard-password-error"
                        role="alert"
                        className="mt-1 text-xs text-red-600"
                      >
                        {wizardErrors.password}
                      </p>
                    ) : (
                      <p
                        id="sib-wizard-password-hint"
                        className="mt-1 text-xs text-gray-500"
                      >
                        Use at least 8 characters.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    data-testid="sib-wizard-submit"
                    disabled={wizardStatus === 'loading'}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
                    style={{ minHeight: '44px' }}
                  >
                    {wizardStatus === 'loading' ? (
                      <span
                        data-testid="sib-wizard-loading"
                        role="status"
                        aria-live="polite"
                      >
                        Setting up your workspace…
                      </span>
                    ) : (
                      'Create your workspace'
                    )}
                  </button>
                </form>
              )}
            </main>
          )}
        </RoleScopedView.Case>

        {/* Branch 2 — platform-admin (bootstrap status monitor + existing AdminCrudPanel) */}
        <RoleScopedView.Case when="platform-admin">
          <div data-testid="sib-role-platform-admin-view">
            <div
              data-testid="sib-platform-banner"
              className="px-4 py-2 bg-red-50 border-b border-red-200 text-xs text-red-900"
            >
              Platform admin — bootstrap status monitor &amp; controls.
            </div>

            <div className="p-4">
              {/* RUN-103: 4 hero-metric tiles \u2192 compact summary row.
                  Current Phase stays as a state chip with dot + label.
                  Counts use tabular-nums emerald-600 for completed totals. */}
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs text-slate-600 border-b border-slate-200 pb-3 mb-4">
                <span
                  data-testid="sib-platform-phase"
                  className="inline-flex items-center gap-1.5"
                >
                  <span className="text-slate-400 uppercase tracking-wider text-[10px]">
                    Phase
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                  />
                  <span className="font-semibold text-slate-900">Warm</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="sib-platform-fabrics">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Fabrics resolved
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-700">6 / 6</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="sib-platform-indices">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Indices confirmed
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-700">47 / 47</span>
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span data-testid="sib-platform-smoke">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] mr-1.5">
                    Smoke tests
                  </span>
                  <span className="tabular-nums font-semibold text-emerald-700">12 / 12</span>
                </span>
              </div>

              {/* Phase progress list (reserved space — no layout shift) */}
              <div
                data-testid="sib-platform-phases"
                className="mb-4 border border-gray-200 rounded bg-white"
                aria-label="Bootstrap phase progress"
              >
                {[
                  { name: 'Kernel load', pct: 100, status: 'COMPLETE', color: 'bg-green-500', tc: 'text-green-700' },
                  { name: 'Fabric resolution', pct: 100, status: 'COMPLETE', color: 'bg-green-500', tc: 'text-green-700' },
                  { name: 'Seed corpus ingest', pct: 100, status: 'COMPLETE', color: 'bg-green-500', tc: 'text-green-700' },
                  { name: 'Schema init', pct: 100, status: 'COMPLETE', color: 'bg-green-500', tc: 'text-green-700' },
                  { name: 'Smoke tests', pct: 100, status: 'COMPLETE', color: 'bg-green-500', tc: 'text-green-700' },
                ].map((phase, i) => (
                  <div
                    key={phase.name}
                    data-testid={`sib-platform-phase-${i}`}
                    className="p-3 border-b last:border-b-0 border-gray-200"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-800">{phase.name}</span>
                      <span className={`text-xs font-medium ${phase.tc} flex items-center gap-1`}>
                        <span aria-hidden="true">●</span> {phase.status}
                      </span>
                    </div>
                    <div
                      className="w-full bg-gray-200 rounded-full h-2"
                      role="progressbar"
                      aria-valuenow={phase.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${phase.name} progress`}
                    >
                      <div className={`${phase.color} h-2 rounded-full`} style={{ width: `${phase.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Destructive re-run bootstrap with confirmation */}
              {rerunConfirming ? (
                <div
                  data-testid="sib-platform-rerun-confirm"
                  role="alertdialog"
                  aria-labelledby="sib-platform-rerun-confirm-title"
                  className="p-4 rounded bg-red-50 border border-red-300 mb-4"
                >
                  <p
                    id="sib-platform-rerun-confirm-title"
                    className="text-sm font-semibold text-red-900 mb-1"
                  >
                    Re-run full bootstrap?
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    This drops all indices, re-seeds the corpus, and restarts every fabric. Live
                    traffic will be interrupted.
                  </p>
                  <div className="flex gap-2">
                    <button
                      data-testid="sib-platform-rerun-confirm-yes"
                      aria-label="Confirm re-run full bootstrap"
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700"
                      style={{ minHeight: '44px' }}
                    >
                      Yes, re-run bootstrap
                    </button>
                    <button
                      data-testid="sib-platform-rerun-confirm-cancel"
                      aria-label="Cancel re-run"
                      onClick={() => setRerunConfirming(false)}
                      className="border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-50"
                      style={{ minHeight: '44px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  data-testid="sib-platform-rerun-btn"
                  aria-label="Re-run bootstrap — destructive, requires confirmation"
                  onClick={() => setRerunConfirming(true)}
                  className="border border-red-600 text-red-700 px-4 py-2 rounded text-sm font-medium hover:bg-red-50 mb-4"
                  style={{ minHeight: '44px' }}
                >
                  Re-run bootstrap
                </button>
              )}
            </div>

            <AdminCrudPanel
              slug="system-initiation-bootstrap"
              indexName="xiigen-system-initiation-bootstrap"
              title="System Initiation Bootstrap"
              description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-system-initiation-bootstrap."
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
          </div>
        </RoleScopedView.Case>

        {/* Branch 3 — tenant-admin (module-scoped re-run only; NO full bootstrap control) */}
        <RoleScopedView.Case when="tenant-admin">
          <div data-testid="sib-role-tenant-admin-view" className="max-w-3xl mx-auto p-4">
            <div
              data-testid="sib-tenant-banner"
              className="mb-4 p-3 rounded bg-orange-50 border border-orange-200 text-sm text-orange-900"
            >
              Tenant admin — re-run individual module setup. Full-system bootstrap is only
              available to platform admins.
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Your installed modules</h2>
            <ul data-testid="sib-tenant-modules" className="space-y-2 mb-4">
              {[
                { name: 'Event Management', slug: 'event-management', lastRun: '2026-04-18 10:00', status: 'OK' },
                { name: 'Marketplace Payments', slug: 'marketplace-payments', lastRun: '2026-04-19 02:00', status: 'OK' },
                { name: 'OSS Curriculum', slug: 'oss-curriculum', lastRun: '2026-04-15 14:22', status: 'DEGRADED' },
              ].map((m, i) => (
                <li
                  key={m.slug}
                  data-testid={`sib-tenant-module-${i}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded bg-white"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last run: {m.lastRun} ·{' '}
                      <span
                        className={
                          m.status === 'OK' ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'
                        }
                      >
                        <span aria-hidden="true">●</span> {m.status}
                      </span>
                    </p>
                  </div>
                  <button
                    data-testid={`sib-tenant-rerun-${i}`}
                    aria-label={`Re-run setup for ${m.name}`}
                    className="border border-orange-500 text-orange-700 px-3 py-2 rounded text-sm font-medium hover:bg-orange-50"
                    style={{ minHeight: '44px' }}
                  >
                    Re-run setup
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </RoleScopedView.Case>

        {/* Fallback — all other roles */}
        <RoleScopedView.Fallback>
          <div data-testid="sib-fallback-view" className="p-4 text-sm text-gray-400">
            System bootstrap surfaces are not available for your role.
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
