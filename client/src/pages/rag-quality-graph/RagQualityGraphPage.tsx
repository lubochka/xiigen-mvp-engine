/**
 * RagQualityGraphPage — FLOW-42 admin console for RAG Quality Graph.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-rag-quality-graph
 *
 * Derived states (UX-FIX Track UX-2). Source:
 *   - P1 inventory is TOPOLOGY_MISSING + SPEC_MISSING — no server flow dir.
 *   - Draft lifecycle: FEEDBACK_RECEIVED → EDGE_UPDATED → DECAY_APPLIED → GRAPH_VERSIONED → PRUNED.
 *   - Mapped onto BusinessStateCard status vocabulary.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';

const MOCK_STATES: Record<string, BusinessState> = {
  'feedback-received': {
    idx: 1,
    label: 'User feedback captured — edge update queued',
    status: 'CAPTURED',
    fields: {
      feedbackId: 'RQG-2026-0419-001',
      rating: '4',
      userId: 'u-admin-07',
      capturedAt: '2026-04-19 09:00',
    },
  },
  'edge-updated': {
    idx: 2,
    label: 'Graph edge weight updated — score propagated',
    status: 'ACTIVE',
    fields: {
      edgeId: 'edge-question-2374→answer-9817',
      weightBefore: '0.61',
      weightAfter: '0.73',
      updatedAt: '2026-04-19 09:01',
    },
  },
  'decay-applied': {
    idx: 3,
    label: 'Decay window scheduler running — stale edges dampening',
    status: 'RUNNING',
    fields: {
      windowId: 'DECAY-2026-0419',
      edgesProcessed: '1847',
      decayRate: '0.02',
      startedAt: '2026-04-19 09:02',
    },
  },
  'graph-versioned': {
    idx: 4,
    label: 'Graph snapshot published — version tag applied',
    status: 'PUBLISHED',
    fields: {
      versionId: 'RQG-v-2026.04.19.01',
      nodeCount: '14203',
      edgeCount: '42910',
      publishedAt: '2026-04-19 09:10',
    },
  },
  'graph-verified': {
    idx: 5,
    label: 'Graph quality verified — retrieval precision above floor',
    status: 'VERIFIED',
    fields: {
      versionId: 'RQG-v-2026.04.19.01',
      precisionAt5: '0.87',
      recallAt10: '0.79',
      verifiedAt: '2026-04-19 09:15',
    },
  },
  'edges-pruned': {
    idx: 6,
    label: 'Low-weight edges pruned — archived for audit',
    status: 'ARCHIVED',
    fields: {
      versionId: 'RQG-v-2026.04.19.01',
      edgesPruned: '312',
      weightThreshold: '0.05',
      prunedAt: '2026-04-19 09:20',
    },
  },
};

export function RagQualityGraphPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="rag-quality-graph"
        flowId="FLOW-42"
        title="RAG Quality Graph"
        state={MOCK_STATES[mockState]}
        description="Admin view of RAG graph-learning quality loop — feedback capture, edge updates, decay, versioning, pruning."
      />
    );
  }

  return (
    <PlatformOpsPage
      flowSlug="rag-quality-graph"
      flowDisplayName="RAG Quality Graph"
      adminContent={
        <AdminCrudPanel
          slug="rag-quality-graph"
          indexName="xiigen-rag-quality-graph"
          title="RAG Quality Graph"
          description="Raw index browser (admin debug) — reads /api/dynamic/xiigen-rag-quality-graph."
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
