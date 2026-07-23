/**
 * TenantsPage — tenant management.
 * NEW engine admin page (P10.4).
 */

import React, { useState } from 'react';
import { useTenants } from '../hooks/useTenants';
import { useTenantFlows } from '../hooks/useTenantFlows';
import { useAgentSessions } from '../hooks/useAgentSessions';
import type { AgentSessionSummary } from '../hooks/useAgentSessions';
import {
  TenantListView,
  CreateTenantDialog,
  TenantConfigPanel,
  TenantKeysPanel,
  TenantQuotaPanel,
} from '../components/tenants';
import { LoadingState } from '../components/common/LoadingState';

type TenantTab = 'config' | 'keys' | 'quotas' | 'flows' | 'agent';

export function TenantsPage() {
  const t = useTenants();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<TenantTab>('config');
  // Turn 4 (MVP Plan v3, Goal 3) — admin cross-tenant flow view via
  // authorised CLS scope switch. Only fetches when the Flows tab is active
  // and a tenant is selected.
  const flowsTarget = tab === 'flows' && t.selectedTenant ? t.selectedTenant.id : null;
  const tf = useTenantFlows(flowsTarget);
  // FLOW-46 Phase D — Agent Sessions tab; fetches recent platform-agent sessions
  // (filtering by tenant deferred to a future iteration once session record carries
  // the targetTenantId join key explicitly).
  const ag = useAgentSessions(20);

  if (t.loading && t.tenants.length === 0) {
    return (
      <div data-testid="page-tenants">
        <LoadingState message="Loading tenants..." />
      </div>
    );
  }

  return (
    <div data-testid="page-tenants">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          data-testid="create-tenant-button"
        >
          + Create Tenant
        </button>
      </div>

      {t.error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600"
          data-testid="tenants-error"
        >
          {t.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tenant list */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              All Tenants ({t.tenants.length})
            </h2>
          </div>
          <TenantListView
            tenants={t.tenants}
            selectedTenant={t.selectedTenant}
            onSelect={t.selectTenant}
            onDeactivate={t.deactivate}
          />
        </div>

        {/* Tenant detail */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {t.selectedTenant ? (
            <div>
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">{t.selectedTenant.name}</h2>
                <p className="text-xs text-gray-400">{t.selectedTenant.id}</p>
              </div>
              <div className="flex border-b border-gray-100">
                {(['config', 'keys', 'quotas', 'flows', 'agent'] as const).map((tb) => {
                  const label =
                    tb === 'config'
                      ? 'Config'
                      : tb === 'keys'
                        ? 'API Keys'
                        : tb === 'quotas'
                          ? 'Quotas'
                          : tb === 'flows'
                            ? 'Flows'
                            : 'Agent Sessions';
                  // Turn 4 — include flow count on the Flows tab label when loaded.
                  const showCount = tb === 'flows' && tab === 'flows' && !tf.loading;
                  return (
                    <button
                      key={tb}
                      onClick={() => setTab(tb)}
                      className={`flex-1 py-2 text-xs text-center ${
                        tab === tb
                          ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                          : 'text-gray-500'
                      }`}
                      data-testid={`detail-tab-${tb}`}
                    >
                      {label}
                      {showCount && (
                        <span className="ml-1 text-[10px] text-gray-400">({tf.flows.length})</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-4">
                {tab === 'config' && (
                  <TenantConfigPanel
                    tenant={t.selectedTenant}
                    onUpdateConfig={(cfg) => t.updateConfig(t.selectedTenant!.id, cfg)}
                  />
                )}
                {tab === 'keys' && (
                  <TenantKeysPanel
                    tenant={t.selectedTenant}
                    onSetKeys={(keys) => t.setKeys(t.selectedTenant!.id, keys)}
                  />
                )}
                {tab === 'quotas' && (
                  <TenantQuotaPanel
                    tenant={t.selectedTenant}
                    onSetQuotas={(quotas) => t.setQuotas(t.selectedTenant!.id, quotas)}
                  />
                )}
                {tab === 'flows' && (
                  <TenantFlowsPanel
                    loading={tf.loading}
                    error={tf.error}
                    flows={tf.flows}
                    onRefresh={() => void tf.refresh()}
                  />
                )}
                {tab === 'agent' && (
                  <AgentSessionsPanel
                    loading={ag.loading}
                    error={ag.error}
                    sessions={ag.sessions}
                    onRefresh={() => void ag.refresh()}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400" data-testid="tenants-no-selection">
              Select a tenant to view details
            </div>
          )}
        </div>
      </div>

      <CreateTenantDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={t.createTenant}
      />
    </div>
  );
}

/**
 * Turn 4 (MVP Plan v3, Goal 3) — read-only flow list for the admin tenants
 * panel. Mirrors the row schema of FlowLibraryPage but with no actions per
 * ARCH-025 ("operators observe, don't modify").
 */
interface TenantFlowsPanelProps {
  loading: boolean;
  error: string | null;
  flows: Array<{
    flow_id: string;
    name: string;
    version: string;
    status: string;
    node_count: number;
    source_type?: string;
  }>;
  onRefresh: () => void;
}

function TenantFlowsPanel({ loading, error, flows, onRefresh }: TenantFlowsPanelProps) {
  return (
    <div data-testid="tenant-flows-panel">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Read-only view of the selected tenant&apos;s flows. Admin scope switches are audited.
        </p>
        <button
          onClick={onRefresh}
          className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          data-testid="tenant-flows-refresh"
        >
          Refresh
        </button>
      </div>
      {loading && <LoadingState message="Loading tenant flows…" />}
      {error && (
        <div
          className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded"
          data-testid="tenant-flows-error"
        >
          {error}
        </div>
      )}
      {!loading && !error && flows.length === 0 && (
        <p className="text-sm text-gray-400 italic" data-testid="tenant-flows-empty">
          This tenant has no flows yet.
        </p>
      )}
      {!loading && flows.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded bg-white">
          {flows.map((f) => (
            <li
              key={`${f.flow_id}:${f.version}`}
              data-testid={`tenant-flow-row-${f.flow_id}`}
              className="p-3 text-sm"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="font-mono text-xs text-gray-500 truncate">{f.flow_id}</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  {f.source_type && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        f.source_type === 'DESIGN_SIM'
                          ? 'bg-blue-100 text-blue-700'
                          : f.source_type === 'TEACH_RUN'
                            ? 'bg-emerald-100 text-emerald-700'
                            : f.source_type === 'QA_RUN'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {f.source_type === 'DESIGN_SIM'
                        ? 'Simulation'
                        : f.source_type === 'TEACH_RUN'
                          ? 'Teach'
                          : f.source_type === 'QA_RUN'
                            ? 'QA'
                            : f.source_type}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      f.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : f.status === 'DRAFT'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {f.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {f.version} · {f.node_count} node{f.node_count === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * FLOW-46 Phase D — Agent Sessions panel.
 * Read-only summary of recent platform-agent sessions. Per-tenant filtering is
 * deferred until session records carry an explicit targetTenantId join key
 * (today the join lives in xiigen-agent-actions, not the session record).
 */
interface AgentSessionsPanelProps {
  loading: boolean;
  error: string | null;
  sessions: AgentSessionSummary[];
  onRefresh: () => void;
}

function AgentSessionsPanel({ loading, error, sessions, onRefresh }: AgentSessionsPanelProps) {
  return (
    <div data-testid="tenant-agent-sessions-panel">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Recent Super Engine Assistant sessions. Sessions are MASTER-tenant scoped; per-tenant
          filtering arrives in a follow-up.
        </p>
        <button
          onClick={onRefresh}
          className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          data-testid="agent-sessions-refresh"
        >
          Refresh
        </button>
      </div>
      {loading && <LoadingState message="Loading agent sessions…" />}
      {error && (
        <div
          className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded"
          data-testid="agent-sessions-error"
        >
          {error}
        </div>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-sm text-gray-400 italic" data-testid="agent-sessions-empty">
          No agent sessions yet.
        </p>
      )}
      {!loading && sessions.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded bg-white">
          {sessions.map((s) => (
            <li
              key={s.sessionId}
              data-testid={`agent-session-row-${s.sessionId}`}
              className="p-3 text-sm"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.userIntent}</p>
                  <p className="font-mono text-xs text-gray-500 truncate">{s.sessionId}</p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      s.grade === 'PASSED'
                        ? 'bg-green-100 text-green-700'
                        : s.grade === 'BLOCKED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.grade}
                  </span>
                  <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                    {s.superJudgeVerdict}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                AF-9: {s.af9Verdict} · {s.actionsProposed} action
                {s.actionsProposed === 1 ? '' : 's'} · {s.contributionsRecorded} contrib
                {s.contributionsRecorded === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
