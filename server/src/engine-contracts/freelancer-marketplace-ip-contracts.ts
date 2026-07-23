/**
 * FLOW-17 Freelancer Marketplace Platform — EC-5 type extensions and task type contracts.
 * Task types: T227-T246 (Families 75-83)
 * BFA rules: CF-270 through CF-294
 *
 * GAP-17-08: T229 rag-retrieve topology config (multi_factor scoring, FREEDOM weights)
 * GAP-17-09: T236 DNA-5 PromptPatch — tenantId must come from AsyncLocalStorage, NOT parameter
 * GAP-17-10: T234 field naming — shortlistCorrelationId (not offeredProposalRef) per CF-283
 */

import { EngineContractEC5Extension } from './marketplace-payments-marketplace-contracts';

// ── FLOW-17 topology node types ───────────────────────────────────────────────

export interface RagRetrieveNodeConfig {
  nodeId: string;
  type: 'rag-retrieve';
  config: {
    resolution: 'scored' | 'ranked' | 'simple';
    scoring_strategy?: 'multi_factor' | 'single_factor';
    scoring_weights_source?: 'FREEDOM' | 'STATIC';
    scoring_factors?: string[];
  };
}

export interface Flow17TopologyExtension {
  topology?: {
    nodes: Array<RagRetrieveNodeConfig | Record<string, unknown>>;
  };
}

export interface Flow17ContractExtension
  extends EngineContractEC5Extension, Flow17TopologyExtension {
  /** GAP-17-09: tenantId must NOT appear as a parameter — AsyncLocalStorage only. */
  dna5TenantFromAls?: true;
  /** GAP-17-10: Event data field names must match CF-283 exactly. */
  cfFieldConstraints?: Array<{ field: string; required: string; cfRule: string }>;
  /** IRules for PromptPatch additions. */
  irAdditions?: string[];
}

// ── T227 — JobDraftEnrichmentGate ─────────────────────────────────────────────

export const T227_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T227',
  name: 'JobDraftEnrichmentGate',
  family: 75,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'AI skill extraction and enrichment of job draft. Emits job.enriched.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F580', 'F581'],
  bfaRules: ['CF-270', 'CF-271'],
};

// ── T228 — JobPublishSearchIndexGate ──────────────────────────────────────────

export const T228_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T228',
  name: 'JobPublishSearchIndexGate',
  family: 75,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Index published job into search. Idempotent outbox publish. Emits job.published.',
  dna9Required: true,
  ep5Required: false,
  // Cross-flow outbox pattern reference (F579 = IOutboxPublishService, cross-flow)
  crossFlowFactoryDependencies: ['F579'],
  requiredFactories: ['F589'],
  bfaRules: ['CF-270', 'CF-272'],
};

// ── T229 — TalentMatchOrchestrator ────────────────────────────────────────────
// GAP-17-08: rag-retrieve topology node must use multi_factor scoring with FREEDOM weights.

export const T229_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T229',
  name: 'TalentMatchOrchestrator',
  family: 75,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'AI-powered talent matching with multi-factor scoring. Emits talent.matched.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F582', 'F583'],
  bfaRules: ['CF-273'],
  // GAP-17-08: Topology node config — rag-retrieve must use multi_factor + FREEDOM weights
  topology: {
    nodes: [
      {
        nodeId: 'rag-retrieve-talent',
        type: 'rag-retrieve',
        config: {
          resolution: 'scored',
          scoring_strategy: 'multi_factor',
          scoring_weights_source: 'FREEDOM',
          scoring_factors: ['skill_match', 'experience_relevance', 'availability', 'budget_fit'],
        },
      } satisfies RagRetrieveNodeConfig,
    ],
  },
};

// ── T230 — InvitePipelineGate ─────────────────────────────────────────────────

export const T230_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T230',
  name: 'InvitePipelineGate',
  family: 75,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Send talent invitations after shortlist match. Emits invite.sent.',
  dna9Required: false,
  ep5Required: false,
  requiredFactories: ['F584'],
  bfaRules: ['CF-273'],
};

// ── T231 — ProposalSubmissionGate ─────────────────────────────────────────────
// Token spend: DB-level UNIQUE constraint on (tenantId, idempotencyKey). INV-17-3.

export const T231_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T231',
  name: 'ProposalSubmissionGate',
  family: 76,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description:
    'Token-gated proposal submission. Token spend idempotent via DB UNIQUE constraint (INV-17-3).' +
    ' F585 ITokenWalletService wraps the DB UNIQUE logic.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F585', 'F586'],
  bfaRules: ['CF-274'],
  namedChecks: ['db_unique_idempotency', 'escrow_idempotency_key_on_all_money_ops'],
};

// ── T232 — TokenSpendBoostAuctionGate ────────────────────────────────────────

export const T232_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T232',
  name: 'TokenSpendBoostAuctionGate',
  family: 76,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Optional proposal boost via token spend auction. Emits proposal.boosted.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F585', 'F587'],
  bfaRules: ['CF-274'],
};

// ── T233 — ProposalShortlistSaga ──────────────────────────────────────────────

export const T233_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T233',
  name: 'ProposalShortlistSaga',
  family: 76,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description:
    'Shortlist proposals for client review. Emits proposal.shortlisted with correlationId.',
  dna9Required: false,
  ep5Required: false,
  requiredFactories: ['F586'],
  bfaRules: ['CF-274', 'CF-283'],
};

// ── T234 — ContractOfferActivationGate ───────────────────────────────────────
// GAP-17-10: Event data must contain shortlistCorrelationId (NOT offeredProposalRef). CF-283.

export const T234_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T234',
  name: 'ContractOfferActivationGate',
  family: 77,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description:
    'Contract offer activation. contract.offered event must reference shortlistCorrelationId (CF-283).',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F588'],
  bfaRules: ['CF-275', 'CF-283'],
  // GAP-17-10: Field name constraint — shortlistCorrelationId, not offeredProposalRef
  cfFieldConstraints: [
    {
      field: 'shortlistCorrelationId',
      required:
        'Contract offer event data MUST contain shortlistCorrelationId (not offeredProposalRef)',
      cfRule: 'CF-283',
    },
  ],
  // IR-8 addition from GAP-17-10:
  irAdditions: [
    'IR-8 addition: Event data must contain shortlistCorrelationId (not offeredProposalRef) ' +
      'as required by CF-283. This correlates the contract offer to the proposal shortlist.',
  ],
};

// ── T235 — ContractActivationComplianceGate ───────────────────────────────────

export const T235_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T235',
  name: 'ContractActivationComplianceGate',
  family: 77,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description:
    'KYC + compliance gate before contract activation (CF-281). Emits contract.activated.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F588', 'F589'],
  bfaRules: ['CF-275', 'CF-281'],
};

// ── T236 — MilestoneCreationFundingGate ───────────────────────────────────────
// ESCROW_SAGA: 3-step LIFO compensation chain (C3→C2→C1). INV-17-8 idempotency key on all money ops.
// GAP-17-09: tenantId must NOT be passed as F607.appendEntry() parameter — AsyncLocalStorage (DNA-5).

export const T236_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T236',
  name: 'MilestoneCreationFundingGate',
  family: 78,
  flowId: 'FLOW-17',
  archetype: 'ESCROW_SAGA',
  description:
    'Escrow-protected milestone funding. 3-step LIFO compensation: ' +
    'C1=MarkFundingFailed, C2=ReverseFeeCalc(no-op), C3=ReleaseEscrowHold. ' +
    'Runs as C3→C2→C1 (LIFO). INV-17-8: all money ops carry idempotency key. ' +
    'Atomic PG transaction for S4+S5.',
  ep5Required: true,
  dna9Required: true,
  // GAP-17-09: DNA-5 — no tenantId param on fabric calls; F607 reads from AsyncLocalStorage
  dna5TenantFromAls: true,
  compensationSaga: {
    // Registered in FORWARD order (C1→C2→C3). Executor runs C3→C2→C1 (LIFO). SACRED.
    steps: [
      {
        name: 'C1:MarkFundingFailed',
        forward: 'markFundingFailed',
        compensate: 'markFundingFailed',
      },
      { name: 'C2:ReverseFeeCalc', forward: 'reverseFeeCalc', compensate: 'reverseFeeCalc' },
      {
        name: 'C3:ReleaseEscrowHold',
        forward: 'releaseEscrowHold',
        compensate: 'releaseEscrowHold',
      },
    ],
    lifoEnforced: true,
  },
  requiredFactories: ['F606', 'F607'],
  bfaRules: ['CF-276', 'CF-277'],
  namedChecks: [
    'escrow_lifo_order',
    'append_only_ledger',
    'atomic_pg_transaction',
    'escrow_idempotency_key_on_all_money_ops',
  ],
};

// ── T237 — DeliverableSubmissionGate ─────────────────────────────────────────
// F613 IDeliverableImmutableStore — write-once. DR-94/INV-17-9.

export const T237_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T237',
  name: 'DeliverableSubmissionGate',
  family: 78,
  flowId: 'FLOW-17',
  archetype: 'ESCROW_SAGA',
  description:
    'Deliverable submission through F613 IDeliverableImmutableStore. ' +
    'Write-once: immutable after submission (DR-94/INV-17-9). ' +
    'NOT optimistic — server confirmation required. ' +
    'Resubmission requires a NEW milestone, not an update.',
  ep5Required: false,
  dna9Required: true,
  requiredFactories: ['F613'],
  bfaRules: ['CF-276', 'CF-278'],
  namedChecks: ['immutable_after_submit'],
};

// ── T238 — MilestoneReviewReleaseSaga ────────────────────────────────────────

export const T238_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T238',
  name: 'MilestoneReviewReleaseSaga',
  family: 78,
  flowId: 'FLOW-17',
  archetype: 'ESCROW_SAGA',
  description:
    'Client reviews deliverable; triggers escrow release (F607 HOLD_RELEASE append) or refund.',
  ep5Required: true,
  dna9Required: true,
  requiredFactories: ['F606', 'F607', 'F608'],
  bfaRules: ['CF-276', 'CF-277'],
  namedChecks: ['append_only_ledger', 'escrow_idempotency_key_on_all_money_ops'],
};

// ── T239 — DisputeOpenEscrowHoldGate ─────────────────────────────────────────

export const T239_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T239',
  name: 'DisputeOpenEscrowHoldGate',
  family: 79,
  flowId: 'FLOW-17',
  archetype: 'ESCROW_SAGA',
  description: 'Atomic escrow hold on dispute open (CF-275). F616+F617 in atomic PG transaction.',
  ep5Required: false,
  dna9Required: true,
  requiredFactories: ['F609', 'F616', 'F617'],
  bfaRules: ['CF-275', 'CF-279'],
  namedChecks: ['atomic_pg_transaction', 'escrow_idempotency_key_on_all_money_ops'],
};

// ── T240 — EvidenceCollectionOrchestrator ────────────────────────────────────

export const T240_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T240',
  name: 'EvidenceCollectionOrchestrator',
  family: 79,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Package evidence for dispute. Emits evidence.packaged.',
  dna9Required: false,
  ep5Required: false,
  requiredFactories: ['F610'],
  bfaRules: ['CF-279'],
};

// ── T241 — DisputeResolutionGate ─────────────────────────────────────────────

export const T241_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T241',
  name: 'DisputeResolutionGate',
  family: 79,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Resolve dispute — triggers escrow release or refund via F608.',
  ep5Required: false,
  dna9Required: true,
  requiredFactories: ['F608', 'F609', 'F610'],
  bfaRules: ['CF-280'],
};

// ── T242 — KycComplianceVerificationGate ─────────────────────────────────────

export const T242_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T242',
  name: 'KycComplianceVerificationGate',
  family: 80,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Worker classification + KYC compliance gate. Emits kyc.verified.',
  dna9Required: true,
  ep5Required: false,
  requiredFactories: ['F611'],
  bfaRules: ['CF-281'],
};

// ── T243 — WorkDiaryEvidenceCycle ─────────────────────────────────────────────
// EVIDENCE_CAPTURE: EP-2 server-triggered periodic. CF-293/CF-294.

export const T243_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T243',
  name: 'WorkDiaryEvidenceCycle',
  family: 80,
  flowId: 'FLOW-17',
  archetype: 'EVIDENCE_CAPTURE',
  description:
    'EP-2 server-triggered periodic work diary capture (CF-293). ' +
    'Screenshots stored as external object refs ONLY — never inline binary/base64 (CF-293). ' +
    'Activity counts NUMERIC ONLY — no keystroke content, no coordinates (CF-294). ' +
    'intervalSource from FREEDOM: work_diary.capture.interval_ms. ' +
    'Privacy gate: on consent.revoked, stop timer and emit work_diary.access.denied.',
  ep5Required: true,
  dna9Required: false,
  requiredFactories: ['F612'],
  bfaRules: ['CF-282', 'CF-293', 'CF-294'],
  namedChecks: [
    'ep2_server_triggered',
    'screenshot_external_ref_only',
    'activity_counts_numeric_only',
  ],
};

// ── T244 — ContestEntryHandoverGate ──────────────────────────────────────────
// IP transfer: immutable after CERTIFIED. PLATFORM-ONLY (F630). INV-17-5.

export const T244_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T244',
  name: 'ContestEntryHandoverGate',
  family: 81,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description:
    'IP transfer + ownership handover after contest entry (CF-283). ' +
    'Transfer immutable after CERTIFIED (INV-17-5, F630 PLATFORM-ONLY). No rollback.',
  ep5Required: false,
  dna9Required: true,
  requiredFactories: ['F630'],
  bfaRules: ['CF-283'],
  namedChecks: ['ip_transfer_immutable_after_certified'],
};

// ── T245 — ReputationSignalAggregateGate ─────────────────────────────────────
// REPUTATION: derived score, never stored. QG-245-1.

export const T245_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T245',
  name: 'ReputationSignalAggregateGate',
  family: 82,
  flowId: 'FLOW-17',
  archetype: 'REPUTATION',
  description:
    'Aggregate reputation signals via appendJournalEntry() to F581. ' +
    'Score DERIVED at query time from journal (computeWeightedScore) — NEVER stored. ' +
    'Event emits signalCount:N — NOT score:4.73. QG-245-1 weight 0.35.',
  ep5Required: false,
  dna9Required: false,
  requiredFactories: ['F581'],
  bfaRules: ['CF-284'],
  namedChecks: ['derived_never_stored'],
};

// ── T246 — EnterpriseComplianceReportGate ────────────────────────────────────

export const T246_CONTRACT: Record<string, unknown> & Flow17ContractExtension = {
  taskTypeId: 'T246',
  name: 'EnterpriseComplianceReportGate',
  family: 83,
  flowId: 'FLOW-17',
  archetype: 'MARKETPLACE',
  description: 'Enterprise compliance reporting. Emits compliance.report.ready.',
  ep5Required: false,
  dna9Required: false,
  requiredFactories: ['F618', 'F619'],
  bfaRules: ['CF-285'],
};

// ── Registry Export ───────────────────────────────────────────────────────────

export const FLOW_17_CONTRACTS: Record<string, Record<string, unknown>> = {
  T227: T227_CONTRACT,
  T228: T228_CONTRACT,
  T229: T229_CONTRACT,
  T230: T230_CONTRACT,
  T231: T231_CONTRACT,
  T232: T232_CONTRACT,
  T233: T233_CONTRACT,
  T234: T234_CONTRACT,
  T235: T235_CONTRACT,
  T236: T236_CONTRACT,
  T237: T237_CONTRACT,
  T238: T238_CONTRACT,
  T239: T239_CONTRACT,
  T240: T240_CONTRACT,
  T241: T241_CONTRACT,
  T242: T242_CONTRACT,
  T243: T243_CONTRACT,
  T244: T244_CONTRACT,
  T245: T245_CONTRACT,
  T246: T246_CONTRACT,
};
