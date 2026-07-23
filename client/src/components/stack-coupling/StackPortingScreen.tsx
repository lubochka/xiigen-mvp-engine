/**
 * StackPortingScreen — root screen for the stack coupling & porting dashboard.
 *
 * Displays:
 *   - List of coupling classifications per stack
 *   - List of compatibility reports
 *   - Empty states when lists are empty
 */

import React from 'react';
import { StackCouplingBadge, CouplingCategory } from './StackCouplingBadge';
import { CompatibilityReportCard, CompatibilityStatus } from './CompatibilityReportCard';

export interface CouplingClassificationItem {
  stackId: string;
  category: CouplingCategory;
}

export interface CompatibilityReportItem {
  reportId: string;
  taskTypeId: string;
  stackId: string;
  compatibility: CompatibilityStatus;
  incompatibleDimensions?: string[];
}

export interface StackPortingScreenProps {
  classifications: CouplingClassificationItem[];
  reports: CompatibilityReportItem[];
}

export function StackPortingScreen({
  classifications,
  reports,
}: StackPortingScreenProps): React.ReactElement {
  // Classification counts by category for the header distribution summary.
  const catCounts = classifications.reduce<Record<CouplingCategory, number>>(
    (acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + 1;
      return acc;
    },
    { CONCEPT_NEUTRAL: 0, IMPL_VARIES: 0, STACK_COUPLED: 0, INCOMPATIBLE: 0 },
  );

  const categoryDefs: { key: CouplingCategory; label: string; tone: string }[] = [
    { key: 'CONCEPT_NEUTRAL', label: 'Neutral', tone: 'text-emerald-700' },
    { key: 'IMPL_VARIES', label: 'Impl varies', tone: 'text-amber-700' },
    { key: 'STACK_COUPLED', label: 'Stack coupled', tone: 'text-orange-700' },
    { key: 'INCOMPATIBLE', label: 'Incompatible', tone: 'text-red-700' },
  ];

  // CompatibilityStatus is imported but unused directly — reports render via
  // CompatibilityReportCard which handles the status typing itself.
  void (null as unknown as CompatibilityStatus);

  return (
    <div className="p-6 space-y-6" data-testid="stack-porting-screen">
      <section data-testid="classifications-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Stack coupling classifications
          <span className="ml-2 text-xs font-normal text-gray-400">
            {classifications.length} target stacks audited
          </span>
        </h2>

        {classifications.length > 0 && (
          <div className="flex items-stretch gap-2 mb-3" data-testid="category-distribution">
            {categoryDefs.map((def) => (
              <div
                key={def.key}
                className="flex-1 rounded border border-gray-200 bg-white px-3 py-2"
              >
                <div className="text-xs text-gray-500">{def.label}</div>
                <div className={`text-lg font-semibold tabular-nums ${def.tone}`}>
                  {catCounts[def.key]}
                </div>
              </div>
            ))}
          </div>
        )}

        {classifications.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="classifications-empty"
          >
            No classifications available yet.
          </p>
        ) : (
          <ul className="space-y-1.5 list-none" data-testid="classifications-list">
            {classifications.map((item) => (
              <li key={item.stackId} data-testid={`classification-item-${item.stackId}`}>
                <StackCouplingBadge stackId={item.stackId} category={item.category} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="reports-section">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Compatibility reports
          <span className="ml-2 text-xs font-normal text-gray-400">
            {reports.length} task-type × stack audits
          </span>
        </h2>
        {reports.length === 0 ? (
          <p
            className="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-200 rounded"
            data-testid="reports-empty"
          >
            No compatibility reports yet.
          </p>
        ) : (
          <ul className="space-y-2 list-none" data-testid="reports-list">
            {reports.map((item) => (
              <li key={item.reportId} data-testid={`report-item-${item.reportId}`}>
                <CompatibilityReportCard
                  reportId={item.reportId}
                  taskTypeId={item.taskTypeId}
                  stackId={item.stackId}
                  compatibility={item.compatibility}
                  incompatibleDimensions={item.incompatibleDimensions}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
