/**
 * CompatibilityReportCard — displays a compatibility report for a task type + stack pair.
 *
 * CF-799: shows INCOMPATIBLE status prominently.
 */

import React from 'react';

export type CompatibilityStatus = 'COMPATIBLE' | 'INCOMPATIBLE' | 'DEGRADED';

export interface CompatibilityReportCardProps {
  reportId: string;
  taskTypeId: string;
  stackId: string;
  compatibility: CompatibilityStatus;
  incompatibleDimensions?: string[];
}

const STATUS_LABELS: Record<CompatibilityStatus, string> = {
  COMPATIBLE: 'Compatible',
  INCOMPATIBLE: 'Incompatible',
  DEGRADED: 'Degraded',
};

const STATUS_TONES: Record<CompatibilityStatus, string> = {
  COMPATIBLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DEGRADED: 'bg-amber-50 text-amber-700 border-amber-200',
  INCOMPATIBLE: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_ICONS: Record<CompatibilityStatus, string> = {
  COMPATIBLE: '✓',
  DEGRADED: '⚠',
  INCOMPATIBLE: '✕',
};

// RUN-154 V-R5: slug-to-human-label map for stack-coupling dimension chips.
// Unknown keys fall through to the raw value so legacy fixtures and tests
// (e.g. SC-16: 'data_model', 'event_schema') continue to render as-is.
const DIMENSION_LABELS: Record<string, string> = {
  'runtime-async-model': 'Async runtime model',
  'test-framework': 'Test framework',
  'build-system': 'Build system',
  'dependency-resolution': 'Dependency resolution',
  'dependency-injection': 'Dependency injection',
  'event-bus': 'Event bus',
  'tenant-isolation': 'Tenant isolation',
};

function humanizeDimension(dim: string): string {
  return DIMENSION_LABELS[dim] ?? dim;
}

export function CompatibilityReportCard({
  reportId,
  taskTypeId,
  stackId,
  compatibility,
  incompatibleDimensions,
}: CompatibilityReportCardProps): React.ReactElement {
  const hasDims = incompatibleDimensions && incompatibleDimensions.length > 0;
  return (
    <div
      className={`compatibility-report-card compatibility-report-card--${compatibility.toLowerCase()} rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors`}
      data-testid={`compatibility-card-${reportId}`}
      data-compatibility={compatibility}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-mono text-xs font-semibold text-gray-800"
          data-testid={`report-task-type-${reportId}`}
        >
          {taskTypeId}
        </span>
        <span className="text-xs text-gray-400">→</span>
        <span className="font-mono text-xs text-gray-600" data-testid={`report-stack-${reportId}`}>
          {stackId}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ms-auto ${STATUS_TONES[compatibility]}`}
          data-testid={`report-status-${reportId}`}
          aria-label={`Compatibility: ${STATUS_LABELS[compatibility]}`}
        >
          <span aria-hidden="true">{STATUS_ICONS[compatibility]}</span>
          {STATUS_LABELS[compatibility]}
        </span>
      </div>
      {hasDims && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Incompatible dimensions:</div>
          <ul
            className="flex flex-wrap gap-1 list-none"
            data-testid={`report-dimensions-${reportId}`}
            aria-label="Incompatible dimensions"
          >
            {incompatibleDimensions!.map((dim) => (
              <li
                key={dim}
                className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-xs"
                data-dimension={dim}
              >
                {humanizeDimension(dim)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
