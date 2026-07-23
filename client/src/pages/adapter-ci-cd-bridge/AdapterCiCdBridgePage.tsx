/**
 * AdapterCiCdBridgePage — FLOW-41 missing scaffold created in RUN-43.
 *
 * This page is new. Unlike all previous RUN-pages which retrofitted role
 * branching into existing content, this file is created from scratch with
 * role-awareness built in from day one. The server-side FLOW-41 bridge logic
 * already exists; this is the minimal user-facing surface for it.
 *
 * Role branches:
 *   - platform-admin            → pipeline status + adapter config + manual trigger
 *   - tenant-admin (flag ON)    → own-tenant pipeline trigger + own history
 *   - tenant-admin (flag OFF)   → welcoming "Enable in Tenant Settings" upsell
 *   - platform-support          → read-only pipeline log; controls DISABLED
 *   - others                    → fallback "not available for your role" notice
 *
 * FREEDOM gate (reused from RUN-37 / RUN-38 pattern):
 *   1. URL param ?freedom-adapter-ci-cd-bridge=on|off (Playwright driver)
 *   2. useFreedomConfig() sections — look for key 'adapter-ci-cd-bridge'
 *   3. Default: OFF (add-on feature)
 *
 * Required testid for gate:
 *   data-testid="page-adapter-ci-cd"
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitBranch,
  Play,
  Lock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Settings,
  Webhook,
} from 'lucide-react';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';
import { useFreedomConfig } from '../../hooks/useFreedomConfig';

interface PipelineRun {
  id: string;
  startedAt: string;
  adapterVersion: string;
  status: 'success' | 'failure' | 'running';
  durationSec: number;
  affectedTenant: string;
  errorMessage?: string;
}

const SAMPLE_RUNS: PipelineRun[] = [
  {
    id: 'PR-2026-0419-0087',
    startedAt: '2026-04-19 14:22',
    adapterVersion: 'v3.2.1',
    status: 'success',
    durationSec: 142,
    affectedTenant: 'TNT-acme-corp',
  },
  {
    id: 'PR-2026-0419-0083',
    startedAt: '2026-04-19 13:11',
    adapterVersion: 'v3.2.0',
    status: 'failure',
    durationSec: 48,
    affectedTenant: 'TNT-bluebird',
    errorMessage: 'External CI returned 500 — retry scheduled.',
  },
  {
    id: 'PR-2026-0419-0081',
    startedAt: '2026-04-19 12:45',
    adapterVersion: 'v3.2.0',
    status: 'running',
    durationSec: 22,
    affectedTenant: 'TNT-castle',
  },
];

function PipelineStatusIcon({ status }: { status: PipelineRun['status'] }) {
  if (status === 'success') {
    return (
      <CheckCircle2
        size={14}
        strokeWidth={2}
        className="text-emerald-600"
        aria-label="Success"
      />
    );
  }
  if (status === 'failure') {
    return <XCircle size={14} strokeWidth={2} className="text-red-600" aria-label="Failure" />;
  }
  return (
    <Clock size={14} strokeWidth={2} className="text-blue-600" aria-label="Running" />
  );
}

function useAdapterCiCdFlag(): { enabled: boolean; loading: boolean } {
  const [searchParams] = useSearchParams();
  const urlOverride = searchParams.get('freedom-adapter-ci-cd-bridge');
  const { sections, loading } = useFreedomConfig();

  if (urlOverride === 'on') return { enabled: true, loading: false };
  if (urlOverride === 'off') return { enabled: false, loading: false };

  for (const section of sections) {
    for (const field of section.fields) {
      if (
        field.key === 'adapter-ci-cd-bridge' ||
        field.key === 'adapter_ci_cd_bridge'
      ) {
        return { enabled: Boolean(field.value), loading: false };
      }
    }
  }
  return { enabled: false, loading };
}

function renderPipelineLog(runs: PipelineRun[], testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {runs.map((r) => (
        <li
          key={r.id}
          data-testid={`${testIdPrefix}-run-${r.id}`}
          className="p-4"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <PipelineStatusIcon status={r.status} />
            <span className="text-xs font-mono text-gray-500">{r.id}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-700">{r.startedAt}</span>
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              {r.adapterVersion}
            </span>
            <span className="text-xs text-gray-500">· {r.durationSec}s</span>
          </div>
          <p className="text-sm text-gray-900 mt-1">
            Tenant: <span className="font-semibold">{r.affectedTenant}</span>
          </p>
          {r.errorMessage && (
            <p className="text-xs text-red-700 mt-1" role="note">
              {r.errorMessage}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AdapterCiCdBridgePage() {
  const { role } = useViewerRole();
  const { enabled: adapterFlagOn, loading: flagLoading } = useAdapterCiCdFlag();

  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [tenantTriggerResult, setTenantTriggerResult] = useState<string | null>(null);

  function handleTrigger() {
    const runId = `PR-NEW-${Date.now()}`;
    setTriggerResult(`Pipeline run ${runId} triggered.`);
  }

  function handleTenantTrigger() {
    const runId = `PR-NEW-${Date.now()}`;
    setTenantTriggerResult(
      `Deployment pipeline ${runId} triggered for your workspace.`,
    );
  }

  // Filter runs by own-tenant for the tenant-admin branch
  const ownTenantRuns = SAMPLE_RUNS.filter((r) => r.affectedTenant === 'TNT-acme-corp');

  return (
    <div data-testid="page-adapter-ci-cd" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="cicd-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="cicd-admin-console" className="space-y-4 max-w-4xl mx-auto">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <GitBranch size={20} strokeWidth={2} aria-hidden="true" />
                  Adapter CI/CD Bridge
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor the adapter pipeline connection, review recent
                  runs, and trigger deployments manually.
                </p>
              </div>
              <button
                type="button"
                data-testid="cicd-trigger-button"
                onClick={handleTrigger}
                aria-label="Trigger a pipeline run"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px', minWidth: '44px' }}
              >
                <Play size={16} strokeWidth={2} aria-hidden="true" />
                Trigger pipeline run
              </button>
            </header>

            {triggerResult && (
              <div
                data-testid="cicd-trigger-result"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
              >
                {triggerResult}
              </div>
            )}

            <section
              data-testid="cicd-admin-status"
              aria-labelledby="cicd-admin-status-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="cicd-admin-status-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
              >
                Connection status
              </h2>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2 border border-emerald-200 bg-emerald-50 rounded">
                  <dt className="text-emerald-700 uppercase">Bridge</dt>
                  <dd className="text-base font-bold text-emerald-900" data-status-code="CONNECTED">Connected</dd>
                </div>
                <div className="p-2 border border-gray-200 rounded">
                  <dt className="text-gray-500 uppercase">System</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    GitHub Actions
                  </dd>
                </div>
                <div className="p-2 border border-gray-200 rounded">
                  <dt className="text-gray-500 uppercase">Last sync</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    2026-04-19 14:22
                  </dd>
                </div>
                <div className="p-2 border border-blue-200 bg-blue-50 rounded">
                  <dt className="text-blue-700 uppercase">Current run</dt>
                  <dd className="text-sm font-bold text-blue-900">
                    PR-2026-0419-0081
                  </dd>
                </div>
              </dl>
            </section>

            <section
              data-testid="cicd-admin-config"
              aria-labelledby="cicd-admin-config-heading"
              className="border border-gray-200 rounded bg-white p-4"
            >
              <h2
                id="cicd-admin-config-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2"
              >
                <Settings size={14} strokeWidth={2} aria-hidden="true" />
                Adapter configuration
              </h2>
              <div className="space-y-2 text-xs text-gray-700">
                <p>
                  <span className="font-semibold">Credentials:</span>{' '}
                  <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    <Lock size={10} strokeWidth={2} aria-hidden="true" />
                    configured · ref: sec-gh-actions-01
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Webhook in:</span>{' '}
                  <span className="font-mono text-xs">
                    https://api.xiigen.dev/hooks/cicd/inbound
                  </span>
                </p>
                <p>
                  <span className="font-semibold">Webhook out:</span>{' '}
                  <span className="font-mono text-xs">
                    https://github.com/xiigen-mvp/actions/workflows/adapter-release.yml
                  </span>
                </p>
                <button
                  type="button"
                  data-testid="cicd-admin-config-edit"
                  aria-label="Edit adapter CI/CD configuration"
                  className="mt-2 inline-flex items-center gap-1 border border-gray-300 text-gray-700 rounded px-3 py-2 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ minHeight: '44px' }}
                >
                  <Webhook size={12} strokeWidth={2} aria-hidden="true" />
                  Edit configuration
                </button>
              </div>
            </section>

            <section
              data-testid="cicd-admin-history"
              aria-labelledby="cicd-admin-history-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cicd-admin-history-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Pipeline execution history ({SAMPLE_RUNS.length})
              </h2>
              {renderPipelineLog(SAMPLE_RUNS, 'cicd-admin-history')}
            </section>
          </main>
        </RoleScopedView.Case>

        {/* ─────────── Branch 2 — TENANT-ADMIN: FREEDOM-gated ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          {flagLoading ? (
            <div
              data-testid="cicd-tenant-loading"
              role="status"
              aria-live="polite"
              className="p-4 text-sm text-gray-500"
            >
              Loading your workspace settings…
            </div>
          ) : adapterFlagOn ? (
            <main data-testid="cicd-tenant-console" className="space-y-4 max-w-3xl mx-auto">
              <header className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <GitBranch size={20} strokeWidth={2} aria-hidden="true" />
                    My Pipeline
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Deploy the adapter configuration for your workspace.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="cicd-tenant-deploy"
                  onClick={handleTenantTrigger}
                  aria-label="Deploy adapter pipeline for your workspace"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  style={{ minHeight: '44px' }}
                >
                  <Play size={16} strokeWidth={2} aria-hidden="true" />
                  Deploy my adapter
                </button>
              </header>

              {tenantTriggerResult && (
                <div
                  data-testid="cicd-tenant-deploy-result"
                  role="status"
                  aria-live="polite"
                  className="p-3 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-900"
                >
                  {tenantTriggerResult}
                </div>
              )}

              <section
                data-testid="cicd-tenant-own-history"
                aria-labelledby="cicd-tenant-history-heading"
                className="border border-gray-200 rounded bg-white"
              >
                <h2
                  id="cicd-tenant-history-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
                >
                  Your pipeline runs ({ownTenantRuns.length})
                </h2>
                {ownTenantRuns.length === 0 ? (
                  <p
                    data-testid="cicd-tenant-empty"
                    className="p-4 text-sm text-gray-500"
                  >
                    You have not triggered any pipeline runs yet.
                  </p>
                ) : (
                  renderPipelineLog(ownTenantRuns, 'cicd-tenant-history')
                )}
              </section>
            </main>
          ) : (
            /* Flag OFF — welcoming upsell (same pattern as RUN-37 / RUN-38) */
            <main
              data-testid="cicd-tenant-upsell"
              className="max-w-xl mx-auto mt-8 p-6 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-50 text-blue-700">
                  <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Adapter CI/CD Bridge — Available as an add-on
                </h1>
              </div>
              <p className="text-sm text-gray-700 mt-4">
                Connect your workspace to an external CI/CD pipeline (GitHub Actions,
                GitLab CI, Jenkins) and deploy adapter changes directly from your
                tenant controls.
              </p>
              <ul className="text-sm text-gray-700 mt-3 space-y-1 pl-5 list-disc">
                <li>Trigger adapter deployments from your workspace</li>
                <li>Full execution log scoped to your tenant</li>
                <li>Automatic rollback on pipeline failure</li>
              </ul>
              <a
                href="/settings/freedom?highlight=adapter-ci-cd-bridge"
                data-testid="cicd-tenant-enable-cta"
                className="inline-flex items-center gap-2 mt-6 bg-blue-600 text-white px-5 py-3 rounded-md text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ minHeight: '44px' }}
              >
                Enable in Tenant Settings
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </a>
              <p className="text-xs text-gray-500 mt-3">
                This feature is optional and can be switched on or off at any time.
              </p>
            </main>
          )}
        </RoleScopedView.Case>

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: read-only, disabled-not-absent ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="cicd-support-inspector" className="space-y-4 max-w-4xl mx-auto">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <GitBranch size={20} strokeWidth={2} aria-hidden="true" />
                Pipeline Log (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Investigate adapter pipeline issues reported by tenants.
                Escalate to platform-admin for any trigger or configuration change.
              </p>
            </header>

            <div
              data-testid="cicd-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Trigger and configuration controls are disabled for support access.
                Layout is preserved so you can describe the exact remediation to a
                platform-admin when escalating.
              </span>
            </div>

            <div>
              <button
                type="button"
                data-testid="cicd-support-trigger"
                aria-label="Trigger pipeline run (disabled for support)"
                aria-disabled="true"
                disabled
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2 rounded text-sm font-medium cursor-not-allowed"
                style={{ minHeight: '44px' }}
              >
                <Play size={16} strokeWidth={2} aria-hidden="true" />
                Trigger pipeline run
              </button>
            </div>

            <section
              data-testid="cicd-support-history"
              aria-labelledby="cicd-support-history-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cicd-support-history-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Pipeline execution history ({SAMPLE_RUNS.length})
              </h2>
              {renderPipelineLog(SAMPLE_RUNS, 'cicd-support-history')}
            </section>

            <a
              href="/support/escalate?topic=adapter-ci-cd-bridge"
              data-testid="cicd-support-escalate"
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
            data-testid="cicd-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              This page is not available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
