/**
 * RunFlowPage — submit a user intent; engine runs CycleChain 1→3 and publishes
 * the resulting topology to the tenant's flow library.
 *
 * Introduced by Track 0 Turn 8.
 *
 * Route: /run-flow (NAV_ITEMS entry added in App.tsx).
 * After a successful run, TopologyPublisher (Turn 3) writes a PRIVATE
 * TenantTopology record; FlowLibraryPage (Turn 6) picks it up on next refresh.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRunFlow } from '../hooks/useRunFlow';

export function RunFlowPage() {
  const navigate = useNavigate();
  const { result, loading, error, run } = useRunFlow();

  const [userIntent, setUserIntent] = useState('');
  const [domain, setDomain] = useState('');

  const handleRun = async () => {
    const r = await run({ userIntent, domain: domain || undefined });
    // On success, caller can navigate to library or topology viewer; we leave
    // the result panel visible so the tenant sees grade/plan/topology inline.
    if (!r) return;
  };

  return (
    <div className="p-8 max-w-4xl" data-testid="run-flow-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Run Flow</h1>
      <p className="text-sm text-gray-500 mb-6">
        Describe what you want the engine to build or analyze. The CycleChain will
        plan, generate a node topology, and publish the result to your Flow Library.
      </p>

      <div className="space-y-4 bg-white border border-gray-200 rounded p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">User intent</span>
          <textarea
            data-testid="user-intent-input"
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            rows={4}
            placeholder='e.g. "Build a user registration system with email verification"'
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Domain (optional)</span>
          <input
            data-testid="domain-input"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="e.g. auth, marketplace, events"
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </label>

        <button
          data-testid="run-button"
          onClick={() => void handleRun()}
          disabled={loading || !userIntent.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? 'Running…' : 'Run Flow'}
        </button>
      </div>

      {error && (
        <div
          data-testid="run-error"
          className="mt-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded"
        >
          {error}
        </div>
      )}

      {result && (
        <div data-testid="run-result" className="mt-6 bg-white border border-gray-200 rounded p-6">
          <h2 className="text-lg font-semibold mb-3">Result</h2>
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Flow ID</dt>
              <dd className="font-mono">{result.flowId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Run ID</dt>
              <dd className="font-mono text-xs">{result.runId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Grade</dt>
              <dd>{result.grade?.toFixed?.(1) ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Plan Steps</dt>
              <dd>{result.planSteps?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Topology Nodes</dt>
              <dd>{result.topology?.length ?? 0}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Cost (USD)</dt>
              <dd>${result.totalCostUsd?.toFixed?.(4) ?? '0.00'}</dd>
            </div>
          </dl>
          <div className="mt-4 space-x-3">
            <button
              data-testid="view-library-button"
              onClick={() => navigate('/flow-library')}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              View in Flow Library
            </button>
            <button
              data-testid="view-topology-button"
              onClick={() => navigate(`/flow-viewer/${result.flowId}`)}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              View Topology
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
