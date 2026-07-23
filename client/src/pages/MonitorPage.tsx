/**
 * MonitorPage — generation run list + detail view.
 * Translated from React Native MonitorScreen.
 */

import React from 'react';
import { useFlowRuns } from '../hooks/useFlowRuns';
import { RunListView, RunDetailView } from '../components/monitor';
import { LoadingState } from '../components/common/LoadingState';

export function MonitorPage() {
  const { runs, selectedRun, loading, error, refresh, selectRun } = useFlowRuns();

  if (loading && runs.length === 0) {
    return (
      <div data-testid="page-monitor">
        <LoadingState message="Loading generation history..." />
      </div>
    );
  }

  return (
    <div data-testid="page-monitor">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monitor</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          data-testid="monitor-refresh"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600"
          data-testid="monitor-error"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Run list */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Generation Runs ({runs.length})</h2>
          </div>
          <RunListView runs={runs} selectedRun={selectedRun} onSelect={selectRun} />
        </div>

        {/* Run detail */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          {selectedRun ? (
            <RunDetailView run={selectedRun} />
          ) : (
            <div className="text-center py-12 text-gray-400" data-testid="monitor-no-selection">
              <p className="text-sm">Select a run to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
