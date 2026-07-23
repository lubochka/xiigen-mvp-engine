/**
 * HistoryBootstrapPage — FLOW-45 admin console for History Bootstrap.
 *
 * Closes the CFI-05 gap for FLOW-45 (the one CFI-05 flow that had components but
 * neither a page nor a route in App.tsx). Per
 * `docs/screen-examination/SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md`:
 *
 *   Flow: FLOW-45 history-bootstrap
 *   user_intent: "Bootstrap the RAG history index by seeding architectural
 *                 patterns from past sessions, ingesting architecture decision
 *                 patterns, and digesting platform philosophy documents into
 *                 the knowledge graph."
 *   Grammar: G1 Progress Strip
 *   Reference: Flyway migration runner, Liquibase, Elasticsearch index rebuild
 *   Role: platform-admin (admin-only maintenance operation)
 *
 * Hybrid rendering (matches the admin-page pattern used by FLOW-36..FLOW-40):
 *   ?mock=<key>  → business-state stub (status card per canonical phase)
 *   no ?mock     → PlatformOpsPage wrapping HistoryBootstrapScreen with populated
 *                  seed data. Defaults to the purpose-built screen rather than a
 *                  generic CRUD table (REPAIR-GUIDANCE Part 4 build standard).
 *
 * NOTE: A proper G1 Progress Strip rebuild (COLD → SEEDING →
 * ARCH_PATTERNS_INGESTED → PHILOSOPHY_DIGESTED → WARM) is deferred to the
 * per-flow examination batch (Batch E in PNG-INVENTORY.md). This page fixes
 * routing + default-view; grammar-complete rebuild is the next step.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';
import {
  HistoryBootstrapScreen,
  type HistoryBootstrapScreenProps,
} from '../../components/history-bootstrap/HistoryBootstrapScreen';
import type { BootstrapCompletionStatus } from '../../components/history-bootstrap/BootstrapStatusBadge';

// Canonical ARCH_PATTERN seed set (4-6 patterns across the defined types).
// Derived from the architecture documentation principles that the bootstrap
// orchestrator would seed on a cold-start run.
const SEED_PATTERNS: HistoryBootstrapScreenProps['patterns'] = [
  {
    patternId: 'ARCH-2026-001',
    patternType: 'FABRIC_FIRST',
    description:
      'Every infrastructure dependency is reached through a fabric interface — never a vendor SDK import in service code.',
  },
  {
    patternId: 'ARCH-2026-002',
    patternType: 'DATA_INTEGRITY',
    description:
      'All business records stored via storeDocument BEFORE enqueue; outbox pattern guarantees at-least-once downstream delivery.',
  },
  {
    patternId: 'ARCH-2026-003',
    patternType: 'MULTI_TENANT',
    description:
      'Tenant scope propagates automatically via AsyncLocalStorage — no tenantId parameter on fabric methods.',
  },
  {
    patternId: 'ARCH-2026-004',
    patternType: 'RESULT_PATTERN',
    description:
      'Every service method returns a result object with a success flag and (if applicable) an error code \u2014 business failures travel with the result instead of raising exceptions. Callers always know what happened.',
  },
  {
    patternId: 'ARCH-2026-005',
    patternType: 'QUEUE_FIRST',
    description:
      'Inter-service communication uses CloudEvents on the queue fabric — no direct HTTP between services.',
  },
  {
    patternId: 'ARCH-2026-006',
    patternType: 'CONFIG_OVER_CODE',
    description:
      'If a business user might want to change it without a code release, store it as configuration that can be edited at runtime. If it is fixed engine behaviour, keep it in code.',
  },
];

const SEED_SUMMARIES: HistoryBootstrapScreenProps['summaries'] = [
  {
    summarizationRunId: 'SUMRUN-2026-04-20-a',
    patternType: 'FABRIC_FIRST',
    patternCount: 1,
  },
  {
    summarizationRunId: 'SUMRUN-2026-04-20-a',
    patternType: 'DATA_INTEGRITY',
    patternCount: 1,
  },
  {
    summarizationRunId: 'SUMRUN-2026-04-20-a',
    patternType: 'MULTI_TENANT',
    patternCount: 1,
  },
  {
    summarizationRunId: 'SUMRUN-2026-04-20-a',
    patternType: 'RESULT_PATTERN',
    patternCount: 1,
  },
];

// Canonical phase mock-states. Match the G1 Progress Strip reference for
// Flyway / Liquibase-style migration runners: each mock-key corresponds to
// a distinct phase in the cold-start run.
const MOCK_STATES: Record<string, BusinessState & { completionStatus: BootstrapCompletionStatus }> =
  {
    'cold-idle': {
      idx: 1,
      label: 'Cold start — no bootstrap run in progress',
      status: 'IDLE',
      completionStatus: 'COMPLETE',
      fields: {
        bootstrapRunId: '—',
        phase: 'COLD',
        patternsIngested: '0',
        summariesBuilt: '0',
      },
    },
    seeding: {
      idx: 2,
      label: 'Seeding in progress — architecture patterns being ingested',
      status: 'RUNNING',
      completionStatus: 'PARTIAL',
      fields: {
        bootstrapRunId: 'BOOT-2026-04-20-001',
        phase: 'SEEDING',
        patternsIngested: '3',
        summariesBuilt: '0',
      },
    },
    'arch-patterns-ingested': {
      idx: 3,
      label: 'Architecture patterns ingested — ready for philosophy digestion',
      status: 'RUNNING',
      completionStatus: 'PARTIAL',
      fields: {
        bootstrapRunId: 'BOOT-2026-04-20-001',
        phase: 'ARCH_PATTERNS_INGESTED',
        patternsIngested: '6',
        summariesBuilt: '0',
      },
    },
    'philosophy-digested': {
      idx: 4,
      label: 'Philosophy digestion complete — summaries distilled',
      status: 'RUNNING',
      completionStatus: 'PARTIAL',
      fields: {
        bootstrapRunId: 'BOOT-2026-04-20-001',
        phase: 'PHILOSOPHY_DIGESTED',
        patternsIngested: '6',
        summariesBuilt: '4',
      },
    },
    warm: {
      idx: 5,
      label: 'Bootstrap complete — knowledge graph is WARM',
      status: 'VERIFIED',
      completionStatus: 'COMPLETE',
      fields: {
        bootstrapRunId: 'BOOT-2026-04-20-001',
        phase: 'WARM',
        patternsIngested: '6',
        summariesBuilt: '4',
      },
    },
    failed: {
      idx: 6,
      label: 'Bootstrap run failed — history-index seeding interrupted',
      status: 'FAILED',
      completionStatus: 'FAILED',
      fields: {
        bootstrapRunId: 'BOOT-2026-04-20-001',
        phase: 'SEEDING',
        patternsIngested: '2',
        summariesBuilt: '0',
        errorCode: 'RAG_BACKEND_UNREACHABLE',
      },
    },
  };

export function HistoryBootstrapPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    const { completionStatus: _ignore, ...businessState } = MOCK_STATES[mockState];
    return (
      <BusinessStateCard
        slug="history-bootstrap"
        flowId="FLOW-45"
        title="History Bootstrap"
        state={businessState}
        description="Admin view of RAG history-index bootstrap run — seed architectural patterns, digest philosophy documents into the knowledge graph."
      />
    );
  }

  // Default (populated) view — renders the purpose-built HistoryBootstrapScreen
  // with the canonical WARM post-completion dataset. This intentionally avoids
  // defaulting to AdminCrudPanel (REPAIR-GUIDANCE must-not-do #1).
  return (
    <PlatformOpsPage
      flowSlug="history-bootstrap"
      flowDisplayName="History Bootstrap"
      adminContent={
        <HistoryBootstrapScreen
          bootstrapRunId="BOOT-2026-04-20-001"
          completionStatus="COMPLETE"
          patterns={SEED_PATTERNS}
          summaries={SEED_SUMMARIES}
        />
      }
    />
  );
}
