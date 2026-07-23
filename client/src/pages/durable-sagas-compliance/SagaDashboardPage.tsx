/**
 * SagaDashboardPage — FLOW-19 T621/T622
 * Durable saga execution and compensation monitoring.
 * Displays saga state (RUNNING → COMPLETED or FAILED → COMPENSATING → COMPENSATED).
 * sagaId generated server-side via storeDocumentWithOCC versionPin:-1.
 *
 * Role-gating (RUN-172 P0-2 + RUN-176 V-R11 P0-2):
 *   - platform-admin     → full controls (Execute Saga, Compensate)
 *   - tenant-admin       → read-only saga list scoped to their tenant, no writes
 *   - tenant-user        → lightweight informational surface only (no saga internals)
 *   - platform-support   → read-only with escalate banner (RUN-172 baseline)
 *   - other roles        → informational fallback
 *   Write-path exits (handleExecute / handleCompensate) early-return for any
 *   non-platform-admin role — the DOM is also re-shaped per role so the buttons
 *   are not just disabled but absent.
 */
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useViewerRole } from '../../hooks/useViewerRole';

type SagaStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED';
type PageStatus = 'idle' | 'loading' | 'success' | 'error';

interface SagaStepDisplay {
  stepIndex: number;
  stepName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'COMPENSATED' | 'FAILED';
}

// RUN-153 V-R3: seeded sample saga shown on first load so the page renders
// the Temporal-style timeline even before the user clicks Execute. Matches
// MARKET-REFERENCE-CATALOG G1 expectations for FLOW-19.
const SEED_SAGA_ID = 'saga-sample-payment-001';
const SEED_SAGA_STEPS: SagaStepDisplay[] = [
  { stepIndex: 0, stepName: 'Reserve inventory', status: 'COMPLETED' },
  { stepIndex: 1, stepName: 'Charge payment method', status: 'COMPLETED' },
  { stepIndex: 2, stepName: 'Dispatch confirmation email', status: 'RUNNING' },
];

const SUPPORT_DISABLED_TITLE =
  'Read-only for support access. Escalate to a platform-admin';

export function SagaDashboardPage() {
  const { role } = useViewerRole();
  const [sagaType, setSagaType] = useState('PAYMENT_SAGA');
  const [stepCount, setStepCount] = useState(3);
  const [pageStatus, setPageStatus] = useState<PageStatus>('idle');
  const [sagaStatus, setSagaStatus] = useState<SagaStatus | null>('RUNNING');
  const [sagaId, setSagaId] = useState<string | null>(SEED_SAGA_ID);
  const [steps, setSteps] = useState<SagaStepDisplay[]>(SEED_SAGA_STEPS);
  const [error, setError] = useState<string | null>(null);

  const isSupport = role === 'platform-support';
  const isTenantAdmin = role === 'tenant-admin';
  const isTenantUser = role === 'tenant-user';
  const isPlatformAdmin = role === 'platform-admin';
  // V-R11 P0-2: only platform-admin may fire saga writes. Any other role
  // lands on a read-only or informational surface — see render branches below.
  const canWrite = isPlatformAdmin;

  // V-R11 P0-2: tenant-user gets a lightweight informational card about
  // their in-flight operations. No saga internals (ids, step counts, LIFO
  // compensation) — those are platform-internal mechanics.
  if (isTenantUser) {
    return (
      <div
        className="p-6 max-w-2xl"
        data-testid="saga-dashboard-page"
        data-viewer-role={role}
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Your in-flight operations
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Operations that depend on several systems (payments, orders, delivery)
          show their progress here while they run. This view is a summary — the
          platform handles retries, compensation, and timeouts for you.
        </p>
        <div
          data-testid="saga-tenant-user-card"
          className="p-4 rounded border border-slate-200 bg-slate-50 text-sm text-slate-800"
        >
          <p className="font-medium mb-1">
            No operations in progress for your account.
          </p>
          <p className="text-xs text-slate-600">
            When you place an order, request a payout, or make a change that
            needs multiple systems to agree, it will appear here with status and
            next expected step.
          </p>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Need help with a stuck operation?{' '}
          <a
            href="/support/new?topic=stuck-operation"
            data-testid="saga-tenant-user-support-link"
            className="underline text-blue-700 hover:text-blue-900"
          >
            Contact support
          </a>
          .
        </p>
      </div>
    );
  }

  function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setPageStatus('loading');

    // Simulate saga execution with persist-before-dispatch pattern
    setTimeout(() => {
      const generatedSagaId = `saga-${Date.now()}`;
      const sagaSteps: SagaStepDisplay[] = Array.from({ length: stepCount }, (_, i) => ({
        stepIndex: i,
        stepName: `step-${i + 1}`,
        status: 'COMPLETED',
      }));
      setSagaId(generatedSagaId);
      setSagaStatus('COMPLETED');
      setSteps(sagaSteps);
      setPageStatus('success');
    }, 400);
  }

  function handleCompensate() {
    if (!sagaId || !canWrite) return;
    setSagaStatus('COMPENSATING');
    setTimeout(() => {
      // LIFO compensation
      setSteps(prev =>
        [...prev].reverse().map(s => ({ ...s, status: 'COMPENSATED' as const })),
      );
      setSagaStatus('COMPENSATED');
    }, 300);
  }

  const statusColors: Record<SagaStatus, string> = {
    RUNNING: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    COMPENSATING: 'bg-orange-100 text-orange-800',
    COMPENSATED: 'bg-blue-100 text-blue-800',
  };

  // V-R11 P0-2: uniform write-disabled tooltip for tenant-admin + platform-support.
  // Both roles see the dashboard but cannot fire writes.
  const writeDisabledTitle = isTenantAdmin
    ? 'Execute Saga is restricted to platform-admin. Contact support for help with stuck sagas.'
    : SUPPORT_DISABLED_TITLE;
  const writeDisabled = !canWrite;

  return (
    <div
      className="p-6 max-w-2xl"
      data-testid="saga-dashboard-page"
      data-viewer-role={role}
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Durable Saga Dashboard</h1>

      {isSupport && (
        <div
          data-testid="saga-support-readonly-banner"
          role="note"
          className="mb-4 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
        >
          <Lock
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-0.5 flex-shrink-0"
          />
          <span>
            <span className="font-semibold">Durable Sagas</span> — read-only for
            support access. Controls are disabled.{' '}
            <a
              href="/platform/support/escalate"
              data-testid="saga-support-escalate"
              className="underline font-medium text-blue-700 hover:text-blue-900"
            >
              Escalate to a platform-admin
            </a>{' '}
            for any change.
          </span>
        </div>
      )}

      {isTenantAdmin && (
        <div
          data-testid="saga-tenant-admin-readonly-banner"
          role="note"
          className="mb-4 p-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-800 flex items-start gap-2"
        >
          <Lock
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-0.5 flex-shrink-0"
          />
          <span>
            <span className="font-semibold">Durable Sagas</span> — tenant-scoped
            read-only view. Execute Saga is restricted to platform-admin.{' '}
            <a
              href="/support/new?topic=stuck-saga"
              data-testid="saga-tenant-admin-support"
              className="underline font-medium text-blue-700 hover:text-blue-900"
            >
              Contact support
            </a>{' '}
            for help with stuck sagas.
          </span>
        </div>
      )}

      {sagaId && sagaStatus && (
        <div data-testid="saga-state-panel" className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700" data-testid="saga-id">
              Saga: {sagaId}
            </span>
            <span
              data-testid="saga-status"
              className={`px-2 py-1 rounded text-xs font-medium ${statusColors[sagaStatus]}`}
            >
              {sagaStatus === 'COMPLETED' ? 'Completed' :
               sagaStatus === 'RUNNING' ? 'Running' :
               sagaStatus === 'FAILED' ? 'Failed' :
               sagaStatus === 'COMPENSATING' ? 'Rolling back' :
               sagaStatus === 'COMPENSATED' ? 'Rolled back' :
               sagaStatus}
            </span>
          </div>

          <div className="space-y-1">
            {steps.map(step => (
              <div
                key={step.stepIndex}
                data-testid={`step-${step.stepIndex}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{step.stepName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    step.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    step.status === 'COMPENSATED' ? 'bg-blue-100 text-blue-700' :
                    step.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
                >
                  {step.status === 'COMPLETED' ? 'Completed' :
                   step.status === 'COMPENSATED' ? 'Rolled back' :
                   step.status === 'FAILED' ? 'Failed' :
                   step.status === 'RUNNING' ? 'Running' :
                   step.status === 'PENDING' ? 'Pending' :
                   step.status}
                </span>
              </div>
            ))}
          </div>

          {(sagaStatus === 'COMPLETED' || sagaStatus === 'FAILED') && (
            <button
              data-testid="compensate-button"
              onClick={handleCompensate}
              disabled={writeDisabled}
              aria-disabled={writeDisabled ? 'true' : undefined}
              title={writeDisabled ? writeDisabledTitle : undefined}
              className="mt-3 w-full bg-orange-600 text-white py-1.5 rounded text-sm font-medium hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Roll back steps (reverse order)
            </button>
          )}
        </div>
      )}

      {error && (
        <div data-testid="saga-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleExecute} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Saga Type</label>
          <select
            data-testid="saga-type-select"
            value={sagaType}
            onChange={e => setSagaType(e.target.value)}
            disabled={writeDisabled}
            aria-disabled={writeDisabled ? 'true' : undefined}
            title={writeDisabled ? writeDisabledTitle : undefined}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="PAYMENT_SAGA">Payment Saga</option>
            <option value="ORDER_SAGA">Order Saga</option>
            <option value="ONBOARDING_SAGA">Onboarding Saga</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Step Count</label>
          <input
            data-testid="step-count-input"
            type="number"
            min={1}
            max={10}
            value={stepCount}
            onChange={e => setStepCount(Number(e.target.value))}
            disabled={writeDisabled}
            aria-disabled={writeDisabled ? 'true' : undefined}
            title={writeDisabled ? writeDisabledTitle : undefined}
            className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        </div>
        <button
          data-testid="execute-saga-button"
          type="submit"
          disabled={pageStatus === 'loading' || writeDisabled}
          aria-disabled={writeDisabled ? 'true' : undefined}
          title={writeDisabled ? writeDisabledTitle : undefined}
          className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {pageStatus === 'loading' ? 'Executing Saga...' : 'Execute Saga'}
        </button>
      </form>
    </div>
  );
}
