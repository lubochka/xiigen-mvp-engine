/**
 * CycleChainExtensionPage — FLOW-45 admin console for Cycle Chain Extension.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → role-scoped view (RUN-38)
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - P1 business-logic inventory (cycle-chain-extension/P1-business-logic-inventory.md)
 *   - Domain: WordPress-style hook registrar — callbacks register to named cycle
 *     extension points ('fire at end of retrieval cycle', 'fire before arbitration').
 *
 * Role-aware + FREEDOM-gated (RUN-38, 3 cells — same pattern as RUN-37):
 *   - platform-admin            → cross-tenant hook registry + execution log + new hook
 *   - tenant-admin (flag ON)    → own-tenant hooks + register-new form
 *   - tenant-admin (flag OFF)   → friendly "Enable in Tenant Settings" upsell screen
 *   - platform-support          → read-only registry + log, controls DISABLED
 *   - others                    → fallback "internal platform tool" notice
 *
 * FREEDOM gate resolution order (matches RUN-37):
 *   1. URL param ?freedom-cycle-chain-extension=on|off (Playwright mock driver)
 *   2. useFreedomConfig() sections — look for field key 'cycle-chain-extension'
 *   3. Default: OFF (add-on feature)
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Link2,
  Sparkles,
  Lock,
  Pause,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { RoleScopedView } from '../../components/common/RoleScopedView';
import { useViewerRole } from '../../hooks/useViewerRole';
import { useFreedomConfig } from '../../hooks/useFreedomConfig';
import { flowHumanName } from '../../utils/flowHumanName';

function humanizeHookName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function humanizeCycleName(raw: string): string {
  return raw
    .replace(/-/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

function humanizeRegisteredBy(raw: string): string {
  if (/^FLOW-\d{2,3}$/.test(raw)) return flowHumanName(raw);
  if (raw === 'platform') return 'Platform';
  return raw;
}

const MOCK_STATES: Record<string, BusinessState> = {
  'cycle-registered': {
    idx: 1,
    label: 'Existing cycle chain registered — baseline captured',
    status: 'REGISTERED',
    fields: {
      cycleId: 'CYC-FLOW-12-v3',
      flowId: 'FLOW-12',
      baselineNodes: 'n1 → n8',
      registeredAt: '2026-04-18 08:00',
    },
  },
  'extension-proposed': {
    idx: 2,
    label: 'Extension proposal drafted — new node inserted',
    status: 'DRAFT',
    fields: {
      extensionId: 'EXT-2026-0418-001',
      cycleId: 'CYC-FLOW-12-v3',
      insertPoint: 'after n4',
      newNodeId: 'n4b-fraud-check',
      draftedBy: 'flow-architect-01',
    },
  },
  'node-added': {
    idx: 3,
    label: 'New node added to cycle — topology updated in draft graph',
    status: 'CAPTURED',
    fields: {
      extensionId: 'EXT-2026-0418-001',
      addedNodeId: 'n4b-fraud-check',
      totalNodes: '9',
      addedAt: '2026-04-18 08:30',
    },
  },
  'extension-validated': {
    idx: 4,
    label: 'Extended topology validated \u2014 cross-flow policy + design convention checks passed',
    status: 'VERIFIED',
    fields: {
      extensionId: 'EXT-2026-0418-001',
      policyRule: 'CF-830',
      conventionChecks: '9 / 9',
      validatedAt: '2026-04-18 09:00',
    },
  },
  'extension-applied': {
    idx: 5,
    label: 'Extension applied — new cycle version live',
    status: 'ACTIVE',
    fields: {
      extensionId: 'EXT-2026-0418-001',
      newCycleVersion: 'CYC-FLOW-12-v4',
      appliedAt: '2026-04-18 09:30',
      appliedBy: 'flow-architect-01',
    },
  },
  'extension-failed': {
    idx: 6,
    label: 'Extension validation failed — cycle rejected before apply',
    status: 'FAILED',
    fields: {
      extensionId: 'EXT-2026-0418-002',
      failedCheck: 'BFA_CF-830_cycle_acyclic',
      failedAt: '2026-04-18 10:15',
      rejectedNodeId: 'n6b-recursive-call',
    },
  },
  'extension-rolled-back': {
    idx: 7,
    label: 'Applied extension rolled back — regression on downstream flows',
    status: 'ROLLBACK_TRIGGERED',
    fields: {
      extensionId: 'EXT-2026-0418-001',
      rollbackReason: 'downstream_latency_spike',
      restoredVersion: 'CYC-FLOW-12-v3',
      rolledBackAt: '2026-04-18 11:45',
    },
  },
};

interface Hook {
  id: string;
  name: string;
  cycle: string;
  registeredBy: string;
  tenantId: string;
  callback: string;
  status: 'active' | 'paused';
  isOwnTenant?: boolean;
}

interface HookExecution {
  runId: string;
  hookId: string;
  hookName: string;
  cycle: string;
  startedAt: string;
  durationMs: number;
  outcome: 'success' | 'failure';
  errorMessage?: string;
}

const SAMPLE_HOOKS: Hook[] = [
  {
    id: 'HK-001',
    name: 'after_retrieval_log',
    cycle: 'post-retrieval',
    registeredBy: 'FLOW-29',
    tenantId: 'TNT-acme-corp',
    callback: 'queue://analytics-ingest',
    status: 'active',
    isOwnTenant: true,
  },
  {
    id: 'HK-002',
    name: 'pre_arbitration_audit',
    cycle: 'pre-arbitration',
    registeredBy: 'platform',
    tenantId: 'platform',
    callback: 'function://platform.auditArbitration',
    status: 'active',
  },
  {
    id: 'HK-003',
    name: 'on_payment_dispute',
    cycle: 'payment-post',
    registeredBy: 'FLOW-16',
    tenantId: 'TNT-bluebird',
    callback: 'queue://dispute-handler',
    status: 'paused',
  },
  {
    id: 'HK-004',
    name: 'custom_tenant_webhook',
    cycle: 'flow-complete',
    registeredBy: 'FLOW-09',
    tenantId: 'TNT-acme-corp',
    callback: 'https://acme.corp/webhook/xiigen-flow-complete',
    status: 'active',
    isOwnTenant: true,
  },
];

const SAMPLE_HOOK_EXECUTIONS: HookExecution[] = [
  {
    runId: 'HX-2026-0419-0142',
    hookId: 'HK-001',
    hookName: 'after_retrieval_log',
    cycle: 'post-retrieval',
    startedAt: '2026-04-19 14:22',
    durationMs: 82,
    outcome: 'success',
  },
  {
    runId: 'HX-2026-0419-0139',
    hookId: 'HK-003',
    hookName: 'on_payment_dispute',
    cycle: 'payment-post',
    startedAt: '2026-04-19 13:05',
    durationMs: 2140,
    outcome: 'failure',
    errorMessage: 'Queue timeout after 2s — dispute-handler did not ack.',
  },
  {
    runId: 'HX-2026-0419-0135',
    hookId: 'HK-004',
    hookName: 'custom_tenant_webhook',
    cycle: 'flow-complete',
    startedAt: '2026-04-19 12:44',
    durationMs: 312,
    outcome: 'success',
  },
];

const CYCLE_OPTIONS = [
  'post-retrieval',
  'pre-arbitration',
  'payment-post',
  'flow-complete',
  'compliance-check',
];

function HookStatusBadge({ status }: { status: Hook['status'] }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';
  return (
    <span
      data-testid={`cce-status-${status}`}
      data-status-code={status.toUpperCase()}
      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </span>
  );
}

function OutcomeIcon({ outcome }: { outcome: HookExecution['outcome'] }) {
  if (outcome === 'success') {
    return (
      <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-600" aria-label="Success" />
    );
  }
  return <XCircle size={14} strokeWidth={2} className="text-red-600" aria-label="Failure" />;
}

function renderHookList(
  hooks: Hook[],
  disabled: boolean,
  testIdPrefix: string,
  onDelete?: (h: Hook) => void,
) {
  return (
    <ul className="divide-y divide-gray-100">
      {hooks.map((h) => (
        <li
          key={h.id}
          data-testid={`${testIdPrefix}-row-${h.id}`}
          className="p-4 flex items-start justify-between gap-4"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <HookStatusBadge status={h.status} />
              <span className="text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                {humanizeCycleName(h.cycle)}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">{humanizeHookName(h.name)}</p>
            <p className="text-xs text-gray-600 mt-1">
              Registered by: <span className="font-medium">{humanizeRegisteredBy(h.registeredBy)}</span>
              {' · '}
              Callback: <span className="font-mono">{h.callback}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid={`${testIdPrefix}-toggle-${h.id}`}
              aria-label={`${h.status === 'active' ? 'Pause' : 'Activate'} hook ${h.name}${disabled ? ' (disabled for support)' : ''}`}
              aria-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              className={
                disabled
                  ? 'inline-flex items-center justify-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed'
                  : h.status === 'active'
                    ? 'inline-flex items-center justify-center border border-amber-300 text-amber-800 bg-amber-50 rounded px-3 py-2 text-sm hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'inline-flex items-center justify-center border border-emerald-300 text-emerald-800 bg-emerald-50 rounded px-3 py-2 text-sm hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500'
              }
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {h.status === 'active' ? (
                <Pause size={14} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Play size={14} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              data-testid={`${testIdPrefix}-delete-${h.id}`}
              aria-label={`Delete hook ${h.name}${disabled ? ' (disabled for support)' : ''}`}
              aria-disabled={disabled ? 'true' : undefined}
              disabled={disabled}
              onClick={() => !disabled && onDelete?.(h)}
              className={
                disabled
                  ? 'inline-flex items-center justify-center border border-gray-200 text-gray-400 bg-gray-50 rounded px-3 py-2 text-sm cursor-not-allowed'
                  : 'inline-flex items-center justify-center border border-red-300 text-red-800 bg-red-50 rounded px-3 py-2 text-sm hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500'
              }
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderExecutionLog(entries: HookExecution[], testIdPrefix: string) {
  return (
    <ul className="divide-y divide-gray-100">
      {entries.map((ex) => (
        <li key={ex.runId} data-testid={`${testIdPrefix}-run-${ex.runId}`} className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <OutcomeIcon outcome={ex.outcome} />
            <span className="text-xs text-gray-700 tabular-nums">{ex.startedAt}</span>
            <span className="text-xs text-gray-500">·</span>
            <Clock size={10} strokeWidth={2} className="text-gray-400" aria-hidden="true" />
            <span className="text-xs text-gray-700">{ex.durationMs}ms</span>
          </div>
          <p className="text-sm font-medium text-gray-900 mt-1">{humanizeHookName(ex.hookName)}</p>
          <p className="text-xs text-gray-600 mt-0.5">Cycle: {humanizeCycleName(ex.cycle)}</p>
          {ex.errorMessage && (
            <p
              data-testid={`${testIdPrefix}-run-error-${ex.runId}`}
              role="note"
              className="text-xs text-red-700 mt-1"
            >
              {ex.errorMessage}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function useCycleChainFlag(): { enabled: boolean; loading: boolean } {
  const [searchParams] = useSearchParams();
  const urlOverride = searchParams.get('freedom-cycle-chain-extension');
  const { sections, loading } = useFreedomConfig();

  if (urlOverride === 'on') return { enabled: true, loading: false };
  if (urlOverride === 'off') return { enabled: false, loading: false };

  for (const section of sections) {
    for (const field of section.fields) {
      if (
        field.key === 'cycle-chain-extension' ||
        field.key === 'cycle_chain_extension'
      ) {
        return { enabled: Boolean(field.value), loading: false };
      }
    }
  }
  return { enabled: false, loading };
}

export function CycleChainExtensionPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');
  const { role } = useViewerRole();
  const { enabled: cycleChainOn, loading: flagLoading } = useCycleChainFlag();

  const [deleteTarget, setDeleteTarget] = useState<Hook | null>(null);
  const [deletedHookId, setDeletedHookId] = useState<string | null>(null);
  const [hookName, setHookName] = useState('');
  const [hookCycle, setHookCycle] = useState(CYCLE_OPTIONS[0]);
  const [hookCallback, setHookCallback] = useState('');
  const [registerErr, setRegisterErr] = useState('');
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="cycle-chain-extension"
        flowId="FLOW-45"
        title="Cycle Chain Extension"
        state={MOCK_STATES[mockState]}
        description="Flow architect view of cycle chain extension — baseline registration, proposed nodes, validation, apply, and rollback."
      />
    );
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!hookName.trim()) {
      setRegisterErr('Hook name is required.');
      return;
    }
    if (!hookCallback.trim()) {
      setRegisterErr('Callback target is required.');
      return;
    }
    setRegisterErr('');
    const newId = `HK-NEW-${Date.now()}`;
    setRegisteredId(newId);
    setHookName('');
    setHookCallback('');
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDeletedHookId(deleteTarget.id);
    setDeleteTarget(null);
  }

  const ownTenantHooks = SAMPLE_HOOKS.filter((h) => h.isOwnTenant);

  return (
    <div data-testid="page-cycle-chain-extension" data-viewer-role={role} className="p-4">
      <RoleScopedView role={role} testIdPrefix="cce-role">
        {/* ─────────── Branch 1 — PLATFORM-ADMIN: full registry ─────────── */}
        <RoleScopedView.Case when="platform-admin">
          <main data-testid="cce-admin-console" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Link2 size={20} strokeWidth={2} aria-hidden="true" />
                Hook Registry
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage platform-wide cycle extension hooks. Register, pause,
                reactivate, and delete hooks across all tenants.
              </p>
            </header>

            {deletedHookId && (
              <div
                data-testid="cce-delete-confirmed"
                role="status"
                aria-live="polite"
                className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-900"
              >
                Hook has been deleted.
              </div>
            )}

            <section
              data-testid="cce-admin-hooks-list"
              aria-labelledby="cce-admin-hooks-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cce-admin-hooks-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Registered hooks ({SAMPLE_HOOKS.length})
              </h2>
              {renderHookList(SAMPLE_HOOKS, false, 'cce-admin-hooks', (h) =>
                setDeleteTarget(h),
              )}
            </section>

            <section
              data-testid="cce-admin-execution-log"
              aria-labelledby="cce-admin-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cce-admin-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Recent hook executions ({SAMPLE_HOOK_EXECUTIONS.length})
              </h2>
              {renderExecutionLog(SAMPLE_HOOK_EXECUTIONS, 'cce-admin-log')}
            </section>

            {/* Delete confirmation modal */}
            {deleteTarget && (
              <div
                data-testid="cce-delete-modal"
                role="alertdialog"
                aria-labelledby="cce-delete-title"
                aria-describedby="cce-delete-desc"
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              >
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5">
                  <h3
                    id="cce-delete-title"
                    className="text-lg font-bold text-red-900 flex items-center gap-2"
                  >
                    <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
                    Delete hook
                  </h3>
                  <p id="cce-delete-desc" className="text-sm text-gray-700 mt-2">
                    You are about to delete hook{' '}
                    <span className="font-semibold">{humanizeHookName(deleteTarget.name)}</span>.
                    The callback will stop firing immediately and cannot be restored from
                    this page.
                  </p>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      data-testid="cce-delete-cancel"
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="cce-delete-confirm"
                      onClick={confirmDelete}
                      className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      style={{ minHeight: '44px', minWidth: '44px' }}
                    >
                      Delete hook
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section data-testid="cce-admin-crud-panel" className="mt-6">
              <AdminCrudPanel
                slug="cycle-chain-extension"
                indexName="xiigen-cycle-chain-extension"
                title="Cycle Chain Extension — Raw Index"
                description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-cycle-chain-extension."
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

        {/* ─────────── Branch 2 — TENANT-ADMIN: FREEDOM-gated ─────────── */}
        <RoleScopedView.Case when="tenant-admin">
          {flagLoading ? (
            <div
              data-testid="cce-tenant-loading"
              role="status"
              aria-live="polite"
              className="p-4 text-sm text-gray-500"
            >
              Loading your workspace settings…
            </div>
          ) : cycleChainOn ? (
            <main data-testid="cce-tenant-console" className="space-y-4">
              <header>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Link2 size={20} strokeWidth={2} aria-hidden="true" />
                  My Hooks
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Register callbacks that fire at specific points in your flows' cycles.
                </p>
              </header>

              <section
                data-testid="cce-tenant-register-form"
                aria-labelledby="cce-tenant-register-heading"
                className="border border-gray-200 rounded bg-white p-4"
              >
                <h2
                  id="cce-tenant-register-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3"
                >
                  Register a new hook
                </h2>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label
                      htmlFor="cce-hook-name"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Hook name <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cce-hook-name"
                      data-testid="cce-hook-name-input"
                      type="text"
                      value={hookName}
                      onChange={(e) => setHookName(e.target.value)}
                      placeholder="e.g. after_booking_confirm"
                      className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cce-hook-cycle"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Fire in cycle <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="cce-hook-cycle"
                      data-testid="cce-hook-cycle-select"
                      value={hookCycle}
                      onChange={(e) => setHookCycle(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CYCLE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {humanizeCycleName(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="cce-hook-callback"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      Callback target <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cce-hook-callback"
                      data-testid="cce-hook-callback-input"
                      type="text"
                      value={hookCallback}
                      onChange={(e) => setHookCallback(e.target.value)}
                      placeholder="https://your-tenant.example/webhook"
                      className="w-full border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {registerErr && (
                    <p
                      data-testid="cce-register-error"
                      role="alert"
                      className="text-xs text-red-700"
                    >
                      {registerErr}
                    </p>
                  )}
                  <button
                    type="submit"
                    data-testid="cce-register-submit"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    style={{ minHeight: '44px' }}
                  >
                    Register hook
                  </button>
                  {registeredId && (
                    <p
                      data-testid="cce-register-success"
                      role="status"
                      aria-live="polite"
                      className="text-xs text-emerald-700"
                    >
                      Hook registered. It will start firing on the next matching cycle.
                    </p>
                  )}
                </form>
              </section>

              <section
                data-testid="cce-tenant-hooks-list"
                aria-labelledby="cce-tenant-hooks-heading"
                className="border border-gray-200 rounded bg-white"
              >
                <h2
                  id="cce-tenant-hooks-heading"
                  className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
                >
                  Your hooks ({ownTenantHooks.length})
                </h2>
                {ownTenantHooks.length === 0 ? (
                  <p
                    data-testid="cce-tenant-hooks-empty"
                    className="p-4 text-sm text-gray-500"
                  >
                    You have not registered any hooks yet.
                  </p>
                ) : (
                  renderHookList(ownTenantHooks, false, 'cce-tenant-hooks', (h) =>
                    setDeleteTarget(h),
                  )
                )}
              </section>
            </main>
          ) : (
            /* Flag OFF — upsell screen (same pattern as RUN-37) */
            <main
              data-testid="cce-tenant-upsell"
              className="max-w-xl mx-auto mt-8 p-6 border border-gray-200 rounded-lg bg-white"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-blue-50 text-blue-700">
                  <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  Cycle Chain Extension — Available as an add-on
                </h1>
              </div>
              <p className="text-sm text-gray-700 mt-4">
                Register your own callbacks at specific points in your flows'
                processing cycles. Useful for custom webhooks, analytics ingestion,
                compliance checks, and any logic that should fire 'around' a flow.
              </p>
              <ul className="text-sm text-gray-700 mt-3 space-y-1 pl-5 list-disc">
                <li>Hook into named cycle points (post-retrieval, flow-complete, …)</li>
                <li>Deliver payloads to your own webhooks or internal functions</li>
                <li>Full execution log with latency and outcome per hook firing</li>
              </ul>
              <a
                href="/settings/freedom?highlight=cycle-chain-extension"
                data-testid="cce-tenant-enable-cta"
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

        {/* ─────────── Branch 3 — PLATFORM-SUPPORT: read-only registry + log ─────────── */}
        <RoleScopedView.Case when="platform-support">
          <main data-testid="cce-support-inspector" className="space-y-4">
            <header>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Link2 size={20} strokeWidth={2} aria-hidden="true" />
                Hook Execution Log (read-only)
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Investigate misfiring hooks and escalate to platform-admin
                for pause/delete.
              </p>
            </header>

            <div
              data-testid="cce-support-readonly-notice"
              role="note"
              className="p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
            >
              <Lock size={14} strokeWidth={2} aria-hidden="true" className="mt-0.5" />
              <span>
                Hook management controls are disabled for support access. Escalate
                to platform-admin for any change.
              </span>
            </div>

            <section
              data-testid="cce-support-hooks-list"
              aria-labelledby="cce-support-hooks-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cce-support-hooks-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Registered hooks ({SAMPLE_HOOKS.length})
              </h2>
              {renderHookList(SAMPLE_HOOKS, true, 'cce-support-hooks')}
            </section>

            <section
              data-testid="cce-support-execution-log"
              aria-labelledby="cce-support-log-heading"
              className="border border-gray-200 rounded bg-white"
            >
              <h2
                id="cce-support-log-heading"
                className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-4 py-3 border-b border-gray-200"
              >
                Recent hook executions ({SAMPLE_HOOK_EXECUTIONS.length})
              </h2>
              {renderExecutionLog(SAMPLE_HOOK_EXECUTIONS, 'cce-support-log')}
            </section>

            <a
              href="/support/escalate?topic=cycle-chain-extension"
              data-testid="cce-support-escalate"
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
            data-testid="cce-not-available"
            role="note"
            className="p-6 border border-gray-200 rounded bg-gray-50"
          >
            <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Lock size={18} strokeWidth={2} aria-hidden="true" />
              Internal platform tool
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              The Cycle Chain Extension is an internal platform tool. This page is not
              available for your current role.
            </p>
          </div>
        </RoleScopedView.Fallback>
      </RoleScopedView>
    </div>
  );
}
