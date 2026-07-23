/**
 * FlowLifecyclePanel — displays flow lifecycle status and provides
 * transition buttons (PENDING → ACTIVE → DEPRECATED).
 *
 * Stage 3.
 */

import React from 'react';
import type { FlowLifecycleRecord, LifecycleStatus } from '../../hooks/useFlowLifecycle';

// ── Status colours ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LifecycleStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  DEPRECATED: 'bg-gray-100 text-gray-600 border-gray-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

const TRANSITION_LABELS: Record<LifecycleStatus, string> = {
  PENDING: 'Activate',
  ACTIVE: 'Deprecate',
  DEPRECATED: 'Deprecate',
  FAILED: 'Mark Failed',
};

// ── FlowLifecyclePanel ────────────────────────────────────────────────────────

export interface FlowLifecyclePanelProps {
  flowId: string;
  record: FlowLifecycleRecord | null;
  loading: boolean;
  error: string | null;
  allowedNext: LifecycleStatus[];
  onLoad: (flowId: string) => void;
  onTransition: (toStatus: LifecycleStatus) => void;
}

export function FlowLifecyclePanel({
  flowId,
  record,
  loading,
  error,
  allowedNext,
  onLoad,
  onTransition,
}: FlowLifecyclePanelProps) {
  return (
    <div className="space-y-3" data-testid="lifecycle-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Lifecycle Status</h3>
        <button
          onClick={() => onLoad(flowId)}
          disabled={loading}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          data-testid="lifecycle-refresh-btn"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Current status */}
      {record ? (
        <>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLES[record.status] ?? 'bg-gray-100 text-gray-600'}`}
              data-testid="lifecycle-status-badge"
            >
              {record.status}
            </span>
            {record.updatedAt && (
              <span className="text-xs text-gray-400">
                {new Date(record.updatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {record.updatedBy && (
            <p className="text-xs text-gray-400">Last updated by: {record.updatedBy}</p>
          )}

          {/* Transition buttons */}
          {allowedNext.length > 0 && (
            <div className="flex gap-2 flex-wrap" data-testid="transition-buttons">
              {allowedNext.map((next) => (
                <button
                  key={next}
                  onClick={() => onTransition(next)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs rounded border font-medium transition-colors disabled:opacity-50
                    ${
                      next === 'ACTIVE'
                        ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                        : next === 'DEPRECATED'
                          ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700'
                          : 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                    }`}
                  data-testid={`transition-to-${next.toLowerCase()}`}
                >
                  → {TRANSITION_LABELS[next] ?? next}
                </button>
              ))}
            </div>
          )}

          {allowedNext.length === 0 && (
            <p className="text-xs text-gray-400 italic" data-testid="terminal-state-msg">
              Terminal state — no further transitions allowed.
            </p>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-400" data-testid="lifecycle-no-record">
          {loading ? 'Loading…' : 'No lifecycle record found.'}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600"
          data-testid="lifecycle-error"
        >
          {error}
        </div>
      )}
    </div>
  );
}
