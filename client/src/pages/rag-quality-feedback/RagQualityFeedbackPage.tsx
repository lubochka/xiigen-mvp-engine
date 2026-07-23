/**
 * RagQualityFeedbackPage — FLOW-38 admin console for RAG Quality Feedback.
 *
 * Hybrid rendering (CFI-05 rewrite applying FLOW-45 RUN-52 template):
 *   ?mock=<key>  → business-state stub (status card per derived state from plan + svc)
 *   no ?mock     → PlatformOpsPage wrapping RagQualityScreen with populated seed
 *                  data (RAG patterns + cycle outcomes). NOT AdminCrudPanel —
 *                  REPAIR-GUIDANCE must-not-do #1.
 *
 * Reference platform (MARKET-REFERENCE-CATALOG §6): LangSmith + Humanloop +
 * PromptLayer — metric tiles + pattern cards + cycle-outcome log.
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - Plan states: FEEDBACK_RECEIVED → QUALITY_SCORED → PATTERN_EXTRACTED → INDEX_UPDATED
 *   - Server enums:
 *       cycle-outcome-classifier.service.ts       → 'SUCCESS_WITHIN_BUDGET' | 'WASTED_CYCLE' | 'ESCALATION_REQUIRED'
 *       shadow-run-orchestrator / rag updater     → 'PENDING' | 'PROMOTED'
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';
import { FeedbackWidget } from '../../components/rag-quality/FeedbackWidget';
import {
  RagQualityScreen,
  type RagPatternRecord,
  type CycleOutcomeRecord,
} from '../../components/rag-quality/RagQualityScreen';
import { useViewerRole } from '../../hooks/useViewerRole';

// Seed: recent RAG patterns with quality scores. Covers the quality-delta
// range (0.2..0.95) and multiple pattern types.
const SEED_PATTERNS: RagPatternRecord[] = [
  {
    patternId: 'PAT-2026-0419-011',
    patternType: 'RETRIEVAL_CONTEXT',
    qualityScore: 0.93,
    flowId: 'FLOW-18',
  },
  {
    patternId: 'PAT-2026-0419-012',
    patternType: 'DISTILLED_RULE',
    qualityScore: 0.88,
    flowId: 'FLOW-29',
  },
  {
    patternId: 'PAT-2026-0419-013',
    patternType: 'NODE_TEMPLATE',
    qualityScore: 0.76,
    flowId: 'FLOW-18',
  },
  {
    patternId: 'PAT-2026-0419-014',
    patternType: 'ARCHETYPE_HINT',
    qualityScore: 0.62,
    flowId: 'FLOW-26',
  },
  {
    patternId: 'PAT-2026-0419-015',
    patternType: 'CROSS_FLOW_RULE',
    qualityScore: 0.41,
    flowId: 'FLOW-25',
  },
  {
    patternId: 'PAT-2026-0419-016',
    patternType: 'RETRIEVAL_CONTEXT',
    qualityScore: 0.28,
    flowId: 'FLOW-17',
  },
];

// Seed: recent cycle outcomes feeding the learning loop. Mix of SUCCESS /
// WASTED / ESCALATION_REQUIRED outcomes across 24 hours.
const SEED_OUTCOMES: CycleOutcomeRecord[] = [
  {
    cycleId: 'CYC-2026-0420-001',
    outcome: 'SUCCESS_WITHIN_BUDGET',
    flowId: 'FLOW-18',
    createdAt: '2026-04-20 09:14',
  },
  {
    cycleId: 'CYC-2026-0420-002',
    outcome: 'SUCCESS_WITHIN_BUDGET',
    flowId: 'FLOW-29',
    createdAt: '2026-04-20 10:02',
  },
  {
    cycleId: 'CYC-2026-0420-003',
    outcome: 'WASTED_CYCLE',
    flowId: 'FLOW-17',
    createdAt: '2026-04-20 10:47',
  },
  {
    cycleId: 'CYC-2026-0420-004',
    outcome: 'SUCCESS_WITHIN_BUDGET',
    flowId: 'FLOW-26',
    createdAt: '2026-04-20 11:31',
  },
  {
    cycleId: 'CYC-2026-0420-005',
    outcome: 'ESCALATION_REQUIRED',
    flowId: 'FLOW-25',
    createdAt: '2026-04-20 12:08',
  },
  {
    cycleId: 'CYC-2026-0420-006',
    outcome: 'SUCCESS_WITHIN_BUDGET',
    flowId: 'FLOW-18',
    createdAt: '2026-04-20 13:22',
  },
];

const MOCK_STATES: Record<string, BusinessState> = {
  'feedback-received': {
    idx: 1,
    label: 'Cycle feedback received — outcome awaiting classification',
    status: 'RECEIVED',
    fields: {
      cycleId: 'CYC-2026-0419-001',
      flowId: 'FLOW-18',
      retrievalHits: '7',
      receivedAt: '2026-04-19 10:15',
    },
  },
  'quality-scored-success': {
    idx: 2,
    label: 'Cycle classified SUCCESS_WITHIN_BUDGET — quality delta computed',
    status: 'VERIFIED',
    fields: {
      cycleId: 'CYC-2026-0419-001',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      qualityDelta: '+0.15',
      classifiedAt: '2026-04-19 10:17',
    },
  },
  'quality-scored-wasted': {
    idx: 3,
    label: 'Cycle classified WASTED_CYCLE — negative delta applied to patterns',
    status: 'FAILED',
    fields: {
      cycleId: 'CYC-2026-0419-002',
      outcome: 'WASTED_CYCLE',
      qualityDelta: '-0.15',
      reason: 'Budget exceeded without winning node',
    },
  },
  'pattern-extracted': {
    idx: 4,
    label: 'Distilled rule extracted from winning node — pattern pending promotion',
    status: 'PENDING',
    fields: {
      cycleId: 'CYC-2026-0419-001',
      winningNodeId: 'NODE-847',
      ruleConfidence: '0.82',
      extractedAt: '2026-04-19 10:19',
    },
  },
  'index-updated': {
    idx: 5,
    label: 'RAG index updated — 4 patterns promoted, quality scores persisted',
    status: 'PUBLISHED',
    fields: {
      batchId: 'BATCH-2026-0419-A',
      patternsPromoted: '4',
      indexName: 'xiigen-rag-patterns',
      updatedAt: '2026-04-19 10:22',
    },
  },
  'escalation-required': {
    idx: 6,
    label: 'Cycle flagged ESCALATION_REQUIRED — quality loop halted pending review',
    status: 'ESCALATED',
    fields: {
      cycleId: 'CYC-2026-0419-003',
      outcome: 'ESCALATION_REQUIRED',
      reason: 'Classifier produced no dpo triple',
      escalatedAt: '2026-04-19 10:25',
    },
  },
  'dpo-promoted': {
    idx: 7,
    label: 'DPO triple promoted to RAG — available for future retrievals',
    status: 'REGISTERED',
    fields: {
      tripleId: 'DPO-2026-0419-011',
      promotedTo: 'xiigen-rag-patterns',
      promoterScore: '0.91',
      promotedAt: '2026-04-19 10:24',
    },
  },
};

export function RagQualityFeedbackPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="rag-quality-feedback"
        flowId="FLOW-38"
        title="RAG Quality Feedback"
        state={MOCK_STATES[mockState]}
        description="Admin view of cycle outcome classification, quality delta updates, pattern promotion, and index refresh."
      />
    );
  }

  // Default view — renders the purpose-built RagQualityScreen (CFI-05 close).
  // FeedbackWidget is preserved as a top-of-page cross-cutting tool — other
  // flows (FLOW-29, FLOW-13, etc.) import it and inherit role-aware behaviour.
  return (
    <div data-testid="page-rag-quality-feedback" data-viewer-role={role} className="p-4">
      <section
        data-testid="rag-quality-demo"
        className="mb-6 p-4 border border-gray-200 rounded bg-white"
      >
        <h1 className="text-xl font-bold text-gray-900 mb-1">RAG Quality Feedback</h1>
        <p className="text-sm text-gray-500 mb-4">
          Monitor how the quality-learning loop scores retrieval patterns and classifies cycle
          outcomes. The feedback widget below is the same shared component every flow embeds to
          collect signal from end users.
        </p>
        <FeedbackWidget contentId="DEMO-content-001" prompt="Was the AI response helpful?" />
      </section>

      <PlatformOpsPage
        flowSlug="rag-quality-feedback"
        flowDisplayName="RAG Quality Feedback"
        adminContent={<RagQualityScreen patterns={SEED_PATTERNS} outcomes={SEED_OUTCOMES} />}
      />
    </div>
  );
}
