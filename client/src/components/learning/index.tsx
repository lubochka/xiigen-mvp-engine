/**
 * Learning Components — NEW engine analytics pages.
 *
 * Model Leaderboard: ModelScoreTable, ScoreTrendChart
 * Prompt Lab: PromptVersionList, PromptDiffViewer, ABTestStatus
 * Quality Dashboard: PassRateChart, DnaComplianceGrid, FailureClusterList
 *
 * Phase 10.5: Learning & Quality.
 */

import React from 'react';
import { StatusBadge } from '../common/StatusBadge';
import { DataCard } from '../common/DataCard';
import type {
  ModelScore,
  ModelTrendPoint,
  PromptVersion,
  ABTestResult,
} from '../../hooks/useLearningData';

// ══════════════════════════════════════════════════════
// Model Leaderboard Components
// ══════════════════════════════════════════════════════

interface ModelScoreTableProps {
  scores: ModelScore[];
}

export function ModelScoreTable({ scores }: ModelScoreTableProps) {
  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="model-table-empty">
        No model data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="model-score-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-start text-xs text-gray-500 uppercase">
            <th className="py-2 px-3">#</th>
            <th className="py-2 px-3">Model</th>
            <th className="py-2 px-3">Provider</th>
            <th className="py-2 px-3">Runs</th>
            <th className="py-2 px-3">Avg Score</th>
            <th className="py-2 px-3">Pass Rate</th>
            <th className="py-2 px-3">Avg Cost</th>
            <th className="py-2 px-3">Latency</th>
            <th className="py-2 px-3">Trend</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s, i) => (
            <tr
              key={`${s.modelId}-${s.taskType}`}
              className="border-b border-gray-100 hover:bg-gray-50"
              data-testid={`model-row-${i}`}
            >
              <td className="py-2.5 px-3 text-gray-400 font-medium">{i + 1}</td>
              <td className="py-2.5 px-3 font-mono text-xs font-medium text-gray-900">
                {s.modelId}
              </td>
              <td className="py-2.5 px-3 text-gray-600 capitalize">{s.provider}</td>
              <td className="py-2.5 px-3 text-gray-600">{s.totalRuns}</td>
              <td className="py-2.5 px-3 font-semibold text-gray-900">
                {(s.averageScore * 100).toFixed(1)}%
              </td>
              <td className="py-2.5 px-3">
                <span
                  className={
                    s.passRate >= 0.9
                      ? 'text-green-600'
                      : s.passRate >= 0.8
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }
                >
                  {(s.passRate * 100).toFixed(0)}%
                </span>
              </td>
              <td className="py-2.5 px-3 text-gray-500">${s.averageCost.toFixed(3)}</td>
              <td className="py-2.5 px-3 text-gray-500">{s.averageLatencyMs}ms</td>
              <td className="py-2.5 px-3">
                <span
                  className={
                    s.trend === 'up'
                      ? 'text-green-600'
                      : s.trend === 'down'
                        ? 'text-red-600'
                        : 'text-gray-400'
                  }
                >
                  {s.trend === 'up' ? '↑' : s.trend === 'down' ? '↓' : '→'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ScoreTrendChartProps {
  trends: ModelTrendPoint[];
}

export function ScoreTrendChart({ trends }: ScoreTrendChartProps) {
  // Simple text-based chart (real app would use recharts)
  const models = [...new Set(trends.map((t) => t.modelId))];

  return (
    <div data-testid="score-trend-chart">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Score Trends</h3>
      {models.length === 0 ? (
        <p className="text-sm text-gray-400">No trend data</p>
      ) : (
        <div className="space-y-3">
          {models.map((modelId) => {
            const points = trends
              .filter((t) => t.modelId === modelId)
              .sort((a, b) => a.date.localeCompare(b.date));
            const latest = points[points.length - 1]?.score ?? 0;
            const first = points[0]?.score ?? 0;
            const delta = latest - first;

            return (
              <div
                key={modelId}
                className="flex items-center gap-3"
                data-testid={`trend-${modelId}`}
              >
                <span className="text-xs font-mono text-gray-600 w-48 truncate">{modelId}</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${latest * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-16 text-end">
                  {(latest * 100).toFixed(1)}%
                </span>
                <span
                  className={`text-xs w-12 text-end ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'}`}
                >
                  {delta > 0 ? '+' : ''}
                  {(delta * 100).toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Prompt Lab Components
// ══════════════════════════════════════════════════════

interface PromptVersionListProps {
  versions: PromptVersion[];
  selectedVersion: PromptVersion | null;
  onSelect: (v: PromptVersion) => void;
}

export function PromptVersionList({ versions, selectedVersion, onSelect }: PromptVersionListProps) {
  if (versions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="prompt-list-empty">
        No prompt versions
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100" data-testid="prompt-version-list">
      {versions.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className={`w-full text-start px-4 py-3 hover:bg-gray-50 ${selectedVersion?.id === v.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
          data-testid={`prompt-row-${v.id}`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{v.version}</span>
              <span className="text-xs text-gray-400">{v.taskType}</span>
              <span className="text-xs text-gray-400">{v.role}</span>
            </div>
            <div className="flex gap-1">
              {v.isChampion && <StatusBadge status="CHAMPION" />}
              {v.isCandidate && <StatusBadge status="CANDIDATE" />}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{v.runs} runs</span>
            <span className={v.passRate >= 0.9 ? 'text-green-600' : 'text-gray-500'}>
              {(v.passRate * 100).toFixed(0)}% pass
            </span>
            <span>{v.createdAt}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

interface PromptDiffViewerProps {
  version: PromptVersion;
}

export function PromptDiffViewer({ version }: PromptDiffViewerProps) {
  return (
    <div data-testid="prompt-diff-viewer">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {version.version} — {version.taskType} / {version.role}
        </h3>
        <div className="flex gap-1">
          {version.isChampion && <StatusBadge status="CHAMPION" />}
          {version.isCandidate && <StatusBadge status="CANDIDATE" />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <DataCard title="Runs" value={version.runs} />
        <DataCard title="Pass Rate" value={`${(version.passRate * 100).toFixed(0)}%`} />
        <DataCard title="Created" value={version.createdAt} />
      </div>
      <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
        <pre
          className="text-xs text-green-400 font-mono whitespace-pre-wrap"
          data-testid="prompt-content"
        >
          {version.content}
        </pre>
      </div>
    </div>
  );
}

interface ABTestStatusProps {
  tests: ABTestResult[];
}

export function ABTestStatus({ tests }: ABTestStatusProps) {
  if (tests.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400" data-testid="ab-test-empty">
        No A/B tests running
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="ab-test-status">
      <h3 className="text-sm font-semibold text-gray-700">A/B Tests</h3>
      {tests.map((t, i) => (
        <div key={i} className="bg-gray-50 rounded-lg p-3" data-testid={`ab-test-${i}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t.taskType}</span>
            <StatusBadge
              status={
                t.status === 'running'
                  ? 'RUNNING'
                  : t.status === 'champion_wins'
                    ? 'COMPLETED'
                    : 'PENDING'
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xs text-gray-400">Champion</p>
              <p className="text-lg font-semibold text-gray-900">
                {(t.championPassRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-400">{t.championRuns} runs</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Candidate</p>
              <p className="text-lg font-semibold text-blue-600">
                {(t.candidatePassRate * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-400">{t.candidateRuns} runs</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// Quality Dashboard Components
// ══════════════════════════════════════════════════════

interface PassRateChartProps {
  data: Array<{ date: string; passRate: number; total: number }>;
}

export function PassRateChart({ data }: PassRateChartProps) {
  return (
    <div data-testid="pass-rate-chart">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Pass Rate Trend</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">No data yet</p>
      ) : (
        <div className="space-y-1">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-3" data-testid={`pass-rate-row-${i}`}>
              <span className="text-xs text-gray-400 w-20">{d.date}</span>
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.passRate >= 0.9 ? 'bg-green-500' : d.passRate >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${d.passRate * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-12 text-end">
                {(d.passRate * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-gray-400 w-12 text-end">{d.total} runs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DNA_PATTERNS = [
  { id: 'DNA-1', name: 'ParseDocument' },
  { id: 'DNA-2', name: 'BuildQueryFilters' },
  { id: 'DNA-3', name: 'DataProcessResult' },
  { id: 'DNA-4', name: 'MicroserviceBase' },
  { id: 'DNA-5', name: 'ScopeIsolation' },
  { id: 'DNA-6', name: 'DynamicController' },
  { id: 'DNA-7', name: 'Idempotency' },
  { id: 'DNA-8', name: 'OutboxBeforeQueue' },
  { id: 'DNA-9', name: 'CloudEvents' },
];

interface DnaComplianceGridProps {
  compliance: Record<string, number>; // pattern_id → compliance rate 0-1
}

export function DnaComplianceGrid({ compliance }: DnaComplianceGridProps) {
  return (
    <div data-testid="dna-compliance-grid">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">DNA Pattern Compliance</h3>
      <div className="grid grid-cols-3 gap-2">
        {DNA_PATTERNS.map((p) => {
          const rate = compliance[p.id] ?? 0;
          const color =
            rate >= 0.9
              ? 'bg-green-100 text-green-700'
              : rate >= 0.7
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700';

          return (
            <div
              key={p.id}
              className={`rounded-lg p-2 text-center ${color}`}
              data-testid={`dna-cell-${p.id}`}
            >
              <p className="text-xs font-semibold">{p.id}</p>
              <p className="text-lg font-bold">{(rate * 100).toFixed(0)}%</p>
              <p className="text-[10px]">{p.name}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FailureClusterListProps {
  clusters: Array<{
    pattern: string;
    count: number;
    severity: 'error' | 'warning';
    example: string;
  }>;
}

export function FailureClusterList({ clusters }: FailureClusterListProps) {
  return (
    <div data-testid="failure-cluster-list">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Failure Patterns</h3>
      {clusters.length === 0 ? (
        <p className="text-sm text-gray-400">No failures recorded</p>
      ) : (
        <div className="space-y-2">
          {clusters.map((c, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
              data-testid={`failure-cluster-${i}`}
            >
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">{c.pattern}</span>
                <p className="text-xs text-gray-400 truncate">{c.example}</p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-semibold text-gray-900">{c.count}</span>
                <StatusBadge status={c.severity === 'error' ? 'FAILED' : 'DEGRADED'} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
