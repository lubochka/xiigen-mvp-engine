/**
 * QualityDashboardPage — is the engine getting smarter.
 * Phase 10.5: Learning page.
 */

import React from 'react';
import { PassRateChart, DnaComplianceGrid, FailureClusterList } from '../components/learning';
import { DataCard } from '../components/common/DataCard';

// Sample data — in production from FeedbackStation + DnaPatternValidator metrics
const SAMPLE_PASS_RATES = [
  { date: '2026-03-03', passRate: 0.78, total: 12 },
  { date: '2026-03-04', passRate: 0.82, total: 15 },
  { date: '2026-03-05', passRate: 0.85, total: 18 },
  { date: '2026-03-06', passRate: 0.89, total: 20 },
  { date: '2026-03-07', passRate: 0.92, total: 22 },
  { date: '2026-03-08', passRate: 0.93, total: 25 },
];

// RUN-133: DNA-1..DNA-9 keys replaced with human-readable design-convention
// names. The XIIGen 9 design conventions \u2014 no typed models, dynamic query
// filter, result pattern, microservice base, tenant scope isolation, dynamic
// controller, queue idempotency, outbox-then-emit, cloud-events envelope \u2014
// are tracked here as pass-rate percentages. A platform-admin quality dash
// reader now sees 'Tenant scope isolation' instead of 'DNA-5'.
const SAMPLE_DNA_COMPLIANCE: Record<string, number> = {
  'No typed models': 0.95,
  'Dynamic query filter': 0.88,
  'Result pattern (no throw)': 0.97,
  'Microservice base class': 0.92,
  'Tenant scope isolation': 0.98,
  'Dynamic controller': 0.85,
  'Queue idempotency': 0.72,
  'Outbox-then-emit': 0.8,
  'Cloud-events envelope': 0.68,
};

const SAMPLE_FAILURES = [
  {
    pattern: 'Cloud-events envelope \u2014 event published without wrapper',
    count: 8,
    severity: 'warning' as const,
    example: 'Event publishing without the CloudEvent envelope',
  },
  {
    pattern: 'Queue idempotency \u2014 mutation without idempotency key',
    count: 6,
    severity: 'warning' as const,
    example: 'A mutation call omits the idempotency-key header',
  },
  {
    pattern: 'Security \u2014 hardcoded credentials detected',
    count: 3,
    severity: 'error' as const,
    example: 'const password = "..." found in source',
  },
  {
    pattern: 'Dynamic controller \u2014 entity-specific controller detected',
    count: 2,
    severity: 'error' as const,
    example: 'class OrderController found (use DynamicController)',
  },
];

export function QualityDashboardPage() {
  const latestRate = SAMPLE_PASS_RATES[SAMPLE_PASS_RATES.length - 1];
  const totalRuns = SAMPLE_PASS_RATES.reduce((sum, d) => sum + d.total, 0);
  const avgCompliance = Object.values(SAMPLE_DNA_COMPLIANCE).reduce((a, b) => a + b, 0) / 9;

  return (
    <div data-testid="page-qualitydashboard">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Quality Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">
        Overall pass rates, design-convention compliance trends, and failure patterns
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <DataCard
          title="Current Pass Rate"
          value={`${(latestRate.passRate * 100).toFixed(0)}%`}
          trend="up"
        />
        <DataCard title="Total Runs" value={totalRuns} />
        <DataCard
          title="Convention compliance"
          value={`${(avgCompliance * 100).toFixed(0)}%`}
          trend={avgCompliance > 0.85 ? 'up' : 'flat'}
        />
        <DataCard
          title="Failure Patterns"
          value={SAMPLE_FAILURES.length}
          trend={SAMPLE_FAILURES.length <= 3 ? 'down' : 'flat'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pass rate trend */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <PassRateChart data={SAMPLE_PASS_RATES} />
        </div>

        {/* DNA compliance heatmap */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <DnaComplianceGrid compliance={SAMPLE_DNA_COMPLIANCE} />
        </div>
      </div>

      {/* Failure clusters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mt-4">
        <FailureClusterList clusters={SAMPLE_FAILURES} />
      </div>
    </div>
  );
}
