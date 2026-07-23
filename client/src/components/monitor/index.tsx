/**
 * Monitor Components — translated from React Native → React.js + Tailwind.
 *
 * RunListView — generation run history table
 * RunDetailView — single run with per-stage execution details
 * RunStatusBadge — pass/fail badge for a run
 * RunProgressBar — stage progress indicator
 * NodeSnapshotPanel — stage input/output viewer
 */

import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import type { FlowRun } from '../../hooks/useFlowRuns';

// ── RunStatusBadge ──────────────────────────────────

export function RunStatusBadge({ success }: { success: boolean }) {
  return <StatusBadge status={success ? 'COMPLETED' : 'FAILED'} />;
}

// ── RunProgressBar ──────────────────────────────────

export interface RunProgressBarProps {
  stages: Array<{ stage: string; success: boolean; elapsedMs: number }>;
}

export function RunProgressBar({ stages }: RunProgressBarProps) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="flex gap-1 h-2" data-testid="run-progress-bar">
      {stages.map((s, i) => (
        <div
          key={i}
          className={`flex-1 rounded ${s.success ? 'bg-green-500' : 'bg-red-500'}`}
          title={`${s.stage}: ${s.success ? 'pass' : 'fail'} (${s.elapsedMs}ms)`}
          data-testid={`progress-stage-${s.stage}`}
        />
      ))}
    </div>
  );
}

// ── RunListView ─────────────────────────────────────

export interface RunListViewProps {
  runs: FlowRun[];
  selectedRun: FlowRun | null;
  onSelect: (run: FlowRun) => void;
}

export function RunListView({ runs, selectedRun, onSelect }: RunListViewProps) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="run-list-empty">
        No generation runs yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100" data-testid="run-list-view">
      {runs.map((run, i) => {
        const isSelected = selectedRun === run;
        return (
          <button
            key={i}
            onClick={() => onSelect(run)}
            className={`w-full text-start px-4 py-3 hover:bg-gray-50 transition-colors ${
              isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : ''
            }`}
            data-testid={`run-row-${i}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-sm text-gray-900">{run.contractId}</span>
                <span className="text-xs text-gray-400 ml-2">{run.tenantId}</span>
              </div>
              <RunStatusBadge success={run.success} />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {run.elapsedMs}ms
              {run.promotionLevel && <span className="ml-2">→ {run.promotionLevel}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── NodeSnapshotPanel ───────────────────────────────

export interface NodeSnapshotPanelProps {
  stage: { stage: string; success: boolean; elapsedMs: number; details?: Record<string, unknown> };
}

export function NodeSnapshotPanel({ stage }: NodeSnapshotPanelProps) {
  return (
    <div className="bg-gray-50 rounded p-3 mb-2" data-testid={`node-snapshot-${stage.stage}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={stage.success ? 'SUCCESS' : 'FAILED'} />
          <span className="text-xs text-gray-400">{stage.elapsedMs}ms</span>
        </div>
      </div>
      {stage.details && (
        <pre className="text-xs text-gray-500 bg-white rounded p-2 overflow-auto max-h-40">
          {JSON.stringify(stage.details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── RunDetailView ───────────────────────────────────

export interface RunDetailViewProps {
  run: FlowRun;
}

export function RunDetailView({ run }: RunDetailViewProps) {
  return (
    <div data-testid="run-detail-view">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{run.contractId}</h3>
          <p className="text-sm text-gray-500">Tenant: {run.tenantId}</p>
        </div>
        <RunStatusBadge success={run.success} />
      </div>

      {/* Progress bar */}
      {run.stages && <RunProgressBar stages={run.stages} />}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="text-center">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-medium">{run.elapsedMs}ms</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Promotion</p>
          <p className="text-sm font-medium">{run.promotionLevel ?? '—'}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Pipeline</p>
          <p className="text-sm font-medium">{run.pipelinePassed ? 'Passed' : 'Failed'}</p>
        </div>
      </div>

      {/* Stage details */}
      {run.stages && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Stages</h4>
          {run.stages.map((s, i) => (
            <NodeSnapshotPanel key={i} stage={s} />
          ))}
        </div>
      )}

      {/* Errors */}
      {run.errors && run.errors.length > 0 && (
        <div className="mt-3" data-testid="run-errors">
          <h4 className="text-sm font-semibold text-red-600 mb-1">Errors</h4>
          {run.errors.map((e, i) => (
            <p key={i} className="text-xs text-red-500">
              {e}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {run.warnings && run.warnings.length > 0 && (
        <div className="mt-3" data-testid="run-warnings">
          <h4 className="text-sm font-semibold text-yellow-600 mb-1">Warnings</h4>
          {run.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-500">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
