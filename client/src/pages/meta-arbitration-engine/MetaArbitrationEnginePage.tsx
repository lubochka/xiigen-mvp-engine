/**
 * MetaArbitrationEnginePage — FLOW-35 admin console for Meta Arbitration Engine.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-meta-arbitration-engine
 *
 * Derived states (UX-FIX Track UX-2). Plan backbone:
 *   CONFLICT_DETECTED → ARBITERS_RUNNING → VERDICT_ISSUED → OVERRIDE_APPLIED
 * Plus states derived from engine/flows/meta-arbitration/ services
 * (five-arbiter-consensus-gate: 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED',
 *  implementation-status-registry: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW').
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { MetaArbitrationVerdictGrid } from '../../components/meta-arbitration-engine/MetaArbitrationVerdictGrid';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';

const MOCK_STATES: Record<string, BusinessState> = {
  'conflict-detected': {
    idx: 1,
    label: 'Cross-flow conflict detected — arbitration required',
    status: 'CONFLICT_DETECTED',
    fields: {
      conflictId: 'CFL-2026-0419-001',
      sourceFlow: 'FLOW-16',
      targetFlow: 'FLOW-12',
      ruleId: 'CF-842',
      detectedAt: '2026-04-19 09:10',
    },
  },
  'arbiters-running': {
    idx: 2,
    label: '5-policy-evaluator consensus \u2014 verdicts in progress',
    status: 'RUNNING',
    fields: {
      conflictId: 'CFL-2026-0419-001',
      arbiterCount: '5',
      verdictsReceived: '2',
      pendingArbiters: 'goal-delivery, iron-rule, branch-honest',
      startedAt: '2026-04-19 09:12',
    },
  },
  'verdict-approved': {
    idx: 3,
    label: 'Consensus verdict: APPROVED — no override needed',
    status: 'APPROVED',
    fields: {
      conflictId: 'CFL-2026-0419-001',
      verdict: 'APPROVED',
      approvingArbiters: '5/5',
      issuedAt: '2026-04-19 09:18',
    },
  },
  'verdict-needs-revision': {
    idx: 4,
    label: 'Consensus verdict: NEEDS_REVISION — 2 arbiters dissent',
    status: 'REVIEW_REQUESTED',
    fields: {
      conflictId: 'CFL-2026-0419-002',
      verdict: 'NEEDS_REVISION',
      dissentingArbiters: 'scope-isolation, iron-rule',
      issuedAt: '2026-04-19 09:25',
    },
  },
  'verdict-rejected': {
    idx: 5,
    label: 'Consensus verdict: REJECTED — cannot proceed',
    status: 'REJECTED',
    fields: {
      conflictId: 'CFL-2026-0419-003',
      verdict: 'REJECTED',
      majorityBlock: '4/5',
      reason: 'Cross-flow scope leak detected in FLOW-16 → FLOW-12 handoff',
    },
  },
  'override-applied': {
    idx: 6,
    label: 'Human override applied — verdict forced APPROVED',
    status: 'OVERRIDE_APPLIED',
    fields: {
      conflictId: 'CFL-2026-0419-002',
      overriddenBy: 'senior-architect-01',
      originalVerdict: 'NEEDS_REVISION',
      appliedVerdict: 'APPROVED',
      appliedAt: '2026-04-19 10:00',
    },
  },
  escalated: {
    idx: 7,
    label: 'Arbitration escalated — human review gate opened',
    status: 'ESCALATED',
    fields: {
      conflictId: 'CFL-2026-0419-004',
      escalationReason: 'Deadlock — 2/5 vs 2/5 with 1 abstention',
      escalatedTo: 'meta-arbitration-council',
      escalatedAt: '2026-04-19 10:15',
    },
  },
};

export function MetaArbitrationEnginePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="meta-arbitration-engine"
        flowId="FLOW-35"
        title="Meta Arbitration Engine"
        state={MOCK_STATES[mockState]}
        description="Admin view of cross-flow conflicts, 5-policy-evaluator consensus, verdicts, overrides, and escalations."
      />
    );
  }

  // RUN-72 Grammar 2 Verdict Grid rewrite — pending rounds × 5 meta-arbiter
  // policies (Cost / Security / Quality / Drift / Improvement) with
  // APPROVED / REJECTED / NEEDS_REVISION / PENDING per cell. Ref platform:
  // GitHub PR review + Linear issue approval + Gerrit code review.
  // V-R15 Wave 2 Fix #2: supply a custom `supportContent` so the
  // platform-support rendering does NOT include the RAW INDEX
  // (PLATFORM-ADMIN DEBUG) accordion. platform-support sees the verdict
  // grid as read-only (via PlatformOpsPage's ReadOnlyBanner) but the raw
  // debug surface is admin-only and was leaking to support in V-R14.
  return (
    <PlatformOpsPage
      flowSlug="meta-arbitration-engine"
      flowDisplayName="Meta Arbitration Engine"
      adminContent={
        <div className="space-y-4">
          <header className="px-2">
            <p className="text-sm text-gray-600">
              Cross-cutting policy-evaluator decisions for generation rounds. Each row is one
              round; each column is one policy. Click a row for rationale and action controls.
            </p>
          </header>
          <MetaArbitrationVerdictGrid />

          <details
            className="border border-gray-200 rounded bg-white"
            data-testid="mae-raw-index-details"
          >
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 uppercase tracking-wide hover:bg-gray-50">
              Raw policy-evaluation index (platform-admin debug)
            </summary>
            <AdminCrudPanel
              slug="meta-arbitration-engine"
              indexName="xiigen-meta-arbitration-engine"
              title="Meta Arbitration Engine"
              description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-meta-arbitration-engine."
              classification="ENGINE_INTERNAL"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' },
              ]}
              formFields={[
                { name: 'name', label: 'Name', required: true },
                { name: 'status', label: 'Status', required: true },
                { name: 'notes', label: 'Notes', type: 'textarea' },
              ]}
            />
          </details>
        </div>
      }
      supportContent={
        <div className="space-y-4">
          <header className="px-2">
            <p className="text-sm text-gray-600">
              Read-only inspector for policy-evaluator rounds. The raw debug surface and
              mutation controls are restricted to platform-admin.
            </p>
          </header>
          <fieldset
            disabled
            aria-disabled="true"
            aria-label="Meta Arbitration Engine (read-only)"
            className="m-0 p-0 border-0 opacity-75"
            style={{ pointerEvents: 'none' }}
          >
            <MetaArbitrationVerdictGrid />
          </fieldset>
        </div>
      }
    />
  );
}
