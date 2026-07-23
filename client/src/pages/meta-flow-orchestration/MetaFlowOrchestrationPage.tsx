/**
 * MetaFlowOrchestrationPage — FLOW-43 admin console for Meta Flow Orchestration.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-meta-flow-orchestration
 *
 * Derived states (UX-FIX Track UX-2). Source:
 *   - P1 inventory is TOPOLOGY_MISSING + SPEC_MISSING — no server flow dir.
 *   - Draft lifecycle: ORCHESTRATION_QUEUED → DISPATCHING → ALL_DISPATCHED → COMPLETED → FAILED.
 *   - Mapped onto BusinessStateCard status vocabulary.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';

const MOCK_STATES: Record<string, BusinessState> = {
  'orchestration-queued': {
    idx: 1,
    label: 'Orchestration request queued — awaiting dispatcher',
    status: 'QUEUED',
    fields: {
      orchestrationId: 'MFO-2026-0419-001',
      targetFlows: 'FLOW-04, FLOW-08, FLOW-10',
      triggeredBy: 'platform-agent',
      enqueuedAt: '2026-04-19 09:00',
    },
  },
  'dispatching': {
    idx: 2,
    label: 'Dispatching child flows — 2 of 3 sent',
    status: 'DISPATCHED',
    fields: {
      orchestrationId: 'MFO-2026-0419-001',
      dispatchedFlows: '2',
      pendingFlows: '1',
      startedAt: '2026-04-19 09:01',
    },
  },
  'all-dispatched': {
    idx: 3,
    label: 'All child flows dispatched — running in parallel',
    status: 'RUNNING',
    fields: {
      orchestrationId: 'MFO-2026-0419-001',
      childFlows: '3',
      allDispatchedAt: '2026-04-19 09:03',
    },
  },
  'partial-complete': {
    idx: 4,
    label: 'Two child flows complete — awaiting FLOW-10 terminal state',
    status: 'IN_PROGRESS',
    fields: {
      orchestrationId: 'MFO-2026-0419-001',
      completedFlows: 'FLOW-04, FLOW-08',
      pendingFlow: 'FLOW-10',
      elapsedSec: '124',
    },
  },
  'orchestration-complete': {
    idx: 5,
    label: 'Orchestration complete — all child flows terminal',
    status: 'COMPLETE',
    fields: {
      orchestrationId: 'MFO-2026-0419-001',
      childFlows: '3',
      completedAt: '2026-04-19 09:05',
      totalDurationSec: '300',
    },
  },
  'orchestration-failed': {
    idx: 6,
    label: 'Orchestration failed — one child flow emitted FAIL terminal',
    status: 'FAILED',
    fields: {
      orchestrationId: 'MFO-2026-0419-002',
      failedChild: 'FLOW-08',
      errorCode: 'DISPATCH_TIMEOUT',
      failedAt: '2026-04-19 09:08',
    },
  },
};

export function MetaFlowOrchestrationPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="meta-flow-orchestration"
        flowId="FLOW-43"
        title="Meta Flow Orchestration"
        state={MOCK_STATES[mockState]}
        description="Admin view of meta-level flow orchestration — queueing, dispatching child flows, completion, failure."
      />
    );
  }

  return (
    <PlatformOpsPage
      flowSlug="meta-flow-orchestration"
      flowDisplayName="Meta Flow Orchestration"
      adminContent={
        <AdminCrudPanel
          slug="meta-flow-orchestration"
          indexName="xiigen-meta-flow-orchestration"
          title="Meta Flow Orchestration"
          description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-meta-flow-orchestration."
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
      }
    />
  );
}
