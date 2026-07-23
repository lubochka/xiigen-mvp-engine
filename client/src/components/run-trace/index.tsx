/**
 * Run Trace Components — displays a run trace with per-node status.
 *
 * RunTracePanel  — full panel with summary header + node list
 * NodeTraceRow   — single node row (status badge, score, duration)
 *
 * Stage 3.
 */

import React from 'react';
import type { RunTrace, NodeTrace } from '../../hooks/useRunTrace';

// ── Status colour helpers ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  SKIP: 'bg-gray-100 text-gray-500',
  RUNNING: 'bg-blue-100 text-blue-700',
  HELD: 'bg-yellow-100 text-yellow-700',
};

function statusBadge(status: string) {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';
}

// ── NodeTraceRow ──────────────────────────────────────────────────────────────

export interface NodeTraceRowProps {
  node: NodeTrace;
}

export function NodeTraceRow({ node }: NodeTraceRowProps) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 border-b border-gray-100 last:border-0"
      data-testid={`node-trace-${node.nodeId}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(node.status)}`}
          data-testid="node-status-badge"
        >
          {node.status}
        </span>
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-800">{node.nodeType}</span>
          <span className="text-xs text-gray-400 ml-2">{node.nodeId}</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
        {node.score !== undefined && (
          <span data-testid="node-score">
            Score: <span className="font-medium text-gray-700">{node.score.toFixed(2)}</span>
          </span>
        )}
        <span data-testid="node-duration">{node.durationMs}ms</span>
        {node.errorCode && (
          <span className="text-red-500" data-testid="node-error-code">
            {node.errorCode}
          </span>
        )}
      </div>
    </div>
  );
}

// ── RunTracePanel ─────────────────────────────────────────────────────────────

export interface RunTracePanelProps {
  trace: RunTrace | null;
  polling: boolean;
  loading: boolean;
  error: string | null;
}

export function RunTracePanel({ trace, polling, loading, error }: RunTracePanelProps) {
  if (loading && !trace) {
    return (
      <div
        className="flex items-center justify-center py-8 text-sm text-gray-400"
        data-testid="run-trace-loading"
      >
        Loading trace…
      </div>
    );
  }

  if (error && !trace) {
    return (
      <div
        className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600"
        data-testid="run-trace-error"
      >
        {error}
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="text-center py-8 text-sm text-gray-400" data-testid="run-trace-empty">
        No trace loaded. Enter a Run ID to inspect.
      </div>
    );
  }

  const passCount = trace.nodes.filter((n) => n.status === 'PASS').length;
  const failCount = trace.nodes.filter((n) => n.status === 'FAIL').length;
  const skipCount = trace.nodes.filter((n) => n.status === 'SKIP').length;

  return (
    <div className="space-y-3" data-testid="run-trace-panel">
      {/* Summary header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <span className="text-xs text-gray-500">Run ID: </span>
          <span className="text-xs font-mono text-gray-700">{trace.runId}</span>
        </div>
        <div className="flex items-center gap-2">
          {polling && (
            <span className="text-xs text-blue-500 animate-pulse" data-testid="polling-indicator">
              ● Live
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(trace.status)}`}
            data-testid="run-status-badge"
          >
            {trace.status}
          </span>
          {trace.score !== undefined && (
            <span className="text-xs text-gray-600" data-testid="run-score">
              Score: {trace.score.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-gray-500 px-1">
        <span>
          Nodes: <b className="text-gray-700">{trace.nodes.length}</b>
        </span>
        <span className="text-green-600">✓ {passCount} PASS</span>
        {failCount > 0 && <span className="text-red-600">✗ {failCount} FAIL</span>}
        {skipCount > 0 && <span className="text-gray-400">— {skipCount} SKIP</span>}
      </div>

      {/* Node list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid="node-list">
        {trace.nodes.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-400">No nodes executed yet</div>
        ) : (
          trace.nodes.map((node) => <NodeTraceRow key={node.nodeId} node={node} />)
        )}
      </div>

      {/* Timing */}
      {trace.startedAt && (
        <div className="text-xs text-gray-400 px-1">
          Started: {new Date(trace.startedAt).toLocaleTimeString()}
          {trace.completedAt && (
            <span> · Completed: {new Date(trace.completedAt).toLocaleTimeString()}</span>
          )}
        </div>
      )}
    </div>
  );
}
