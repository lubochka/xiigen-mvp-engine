/**
 * FLOW-20 Engine Contracts — Ads Platform (Real-time & Streaming)
 *
 * T625  ConsentGateEnforcer           archetype: GUARD (consent check ORDER 1, unconditional, no business exception)
 * T626  AuctionBidProcessor           archetype: REQUEST_RESPONSE (Redis SETNX bid lock, DECRBY/INCRBY budget)
 * T627  FraudPreBillingValidator      archetype: GUARD (fraud score ORDER 1 before billing, PCI zero-PAN)
 * T628  PoliticalContentReviewer      archetype: ANALYSIS (isPolitical dual-gate, human review mandatory, Math.min)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-5: Tenant scope via AsyncLocalStorage. Fabric providers read TenantContext internally. No tenantId parameter.
 *
 * T-number note: Remapped to T625-T628 per CLAUDE.md artifact boundary to avoid collision.
 * Factory note: F1561-F1568 per CLAUDE.md boundary.
 *
 * CF-20-1: T625 consent check ORDER 1 unconditional, no business exception paths
 * CF-20-2: T626 Redis SETNX bid lock + DECRBY/INCRBY budget atomicity; stateless auction
 * CF-20-3: T627 fraud score ORDER 1 before billing; budget restore via INCRBY on rejection; PCI zero-PAN
 * CF-20-4: T628 dual-gate political detection; Math.min convergence; human review mandatory on divergence
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const ADS_PLATFORM_NEW_TASK_TYPES = ['T625', 'T626', 'T627', 'T628'] as const;

// ── T625: ConsentGateEnforcer ────────────────────────────────────────────────

export function createConsentGateEnforcerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T625',
    flowId: 'FLOW-20',
    flowName: 'Ads Platform',
    name: 'ConsentGateEnforcer',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered by AdDeliveryRequested event (ad system initiates user ad delivery)',
    purpose:
      'Unconditional consent gate at ORDER 1 — blocks all downstream ad processing on missing or revoked consent. ' +
      "consentRecord = await db.searchDocuments('consent-records', {userId, consentType:ads}). " +
      'If consentRecord absent or adsConsent=false or expiresAt < now, emit ConsentGateFailed immediately. ' +
      'Zero exception paths for business logic override. GDPR/CCPA compliance gate.',
    distinctFrom:
      'T626 AuctionBidProcessor (T625 guards consent; T626 runs auction if consent confirmed). ' +
      'T627 FraudPreBillingValidator (T625 checks user consent; T627 checks fraud signal).',

    ironRules: [
      'IR-1: Consent check at ORDER 1 unconditionally before any auction processing. ' +
        'Zero business exception paths. CF-20-1.',
      'IR-2: consentRecord absent OR adsConsent=false OR expiresAt < now() → emit ConsentGateFailed immediately. CF-20-1.',
      'IR-3: ConsentGateFailed includes userId, reason (MISSING|REVOKED|EXPIRED), timestamp. CF-20-1.',
      'IR-4: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ConsentCheck',
          description: 'Search consent-records for userId; verify adsConsent=true and not expired',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'EmitConsentGateFailedOrContinue',
          description:
            'On consent failure: emit ConsentGateFailed immediately. On success: proceed to auction.',
          ironRuleRef: 'IR-2',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1561',
        interfaceName: 'IConsentRecordService',
        fabricType: FabricType.DATABASE,
        description:
          'Consent record repository — read-only search for userId consent status. PLATFORM_ONLY for GDPR audit.',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ConsentGateFailed / AdDeliveryAuthorized emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-20-01',
        description: 'Consent check at ORDER 1 unconditionally — no exception paths (CF-20-1)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-02',
        description: 'ConsentGateFailed emitted on missing/revoked/expired consent (IR-2)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['consent_record'],
      events: ['consent.gate.failed', 'ad.delivery.authorized'],
      apiRoutes: [],
    },

    machineComponents: [
      'Consent check ORDER 1 unconditionally — no business exception paths (CF-20-1)',
      'consentRecord absent OR adsConsent=false OR expiresAt < now() → ConsentGateFailed (IR-2)',
      'tenantId from ALS only (DNA-5)',
    ],

    freedomComponents: ['consent_check_timeout_ms — max time to wait for consent service response'],
  });
}

// ── T626: AuctionBidProcessor ───────────────────────────────────────────────

export function createAuctionBidProcessorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T626',
    flowId: 'FLOW-20',
    flowName: 'Ads Platform',
    name: 'AuctionBidProcessor',
    archetype: ContractArchetype.REQUEST_RESPONSE,
    entry: 'Triggered by BidSubmissionRequested event (advertiser submits real-time auction bid)',
    purpose:
      'Synchronous real-time bid processing with Redis SETNX for atomicity. ' +
      'SETNX(auction-bid-lock:{auctionId}) at ORDER 1 ensures no duplicate bids. ' +
      'DECRBY(advertiser-budget:{advertiserId}, bidAmountCents) at ORDER 2 atomically decreases budget. ' +
      'On budget insufficient: INCRBY restores full amount. Stateless auction — no OCC, no Elasticsearch state machine. ' +
      'Audit trail only (event log). Sub-100ms response time.',
    distinctFrom:
      'T625 ConsentGateEnforcer (T625 gates consent; T626 runs auction if consent confirmed). ' +
      'T627 FraudPreBillingValidator (T626 processes bid; T627 checks fraud before billing).',

    ironRules: [
      'IR-1: SETNX(auction-bid-lock:{auctionId}) at ORDER 1. ' +
        'Lock held → unconditional return of previousBid (idempotent). No re-processing. CF-20-2.',
      'IR-2: DECRBY(advertiser-budget:{advertiserId}, bidAmountCents) at ORDER 2. ' +
        'Atomic Redis operation — no Elasticsearch OCC. CF-20-2.',
      'IR-3: newBudget < 0 → INCRBY to restore, emit BidRejected with BUDGET_INSUFFICIENT. CF-20-2.',
      'IR-4: No auction state machine in Elasticsearch — stateless design. Event log only. CF-20-2.',
      'IR-5: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'SetnxBidLock',
          description: 'SETNX(auction-bid-lock:{auctionId}) — prevent duplicate bids',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'DecrBudget',
          description:
            'DECRBY(advertiser-budget:{advertiserId}, bidAmountCents) — atomic budget deduction',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'ValidateBudget',
          description:
            'If newBudget < 0: INCRBY to restore; emit BidRejected with BUDGET_INSUFFICIENT',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'StoreAuditLog',
          description: 'storeDocument(auction-audit, {bidId, auctionId, bidAmountCents, status})',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitBidAcceptedOrRejected',
          description: 'enqueue(BidAccepted) on success; enqueue(BidRejected) on budget fail',
          ironRuleRef: 'IR-3',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1562',
        interfaceName: 'IRedisAuctionLockService',
        fabricType: FabricType.DATABASE,
        description: 'Redis SETNX provider for auction-bid-lock:{auctionId} atomicity',
      },
      {
        factoryId: 'F1563',
        interfaceName: 'IAdvertiserBudgetService',
        fabricType: FabricType.DATABASE,
        description:
          'Redis DECRBY/INCRBY for advertiser-budget:{advertiserId} — atomic budget ledger operations',
      },
      {
        factoryId: 'F1564',
        interfaceName: 'IAuctionAuditService',
        fabricType: FabricType.DATABASE,
        description:
          'Elasticsearch append-only auction audit trail — storeDocument only, no update/delete',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'BidAccepted / BidRejected emission',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: { template: 'request_response', max_tokens: 2800 },
      },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-20-03',
        description: 'Redis SETNX bid lock at ORDER 1 — no Elasticsearch OCC (CF-20-2)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-04',
        description: 'DECRBY for budget atomicity at ORDER 2 — not DB read+write (CF-20-2)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-05',
        description: 'Budget restoration via INCRBY on rejection (CF-20-2)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['auction_bid', 'advertiser_budget', 'auction_audit'],
      events: ['bid.accepted', 'bid.rejected'],
      apiRoutes: [],
    },

    machineComponents: [
      'Redis SETNX auction-bid-lock:{auctionId} at ORDER 1 — idempotent duplicate prevention (CF-20-2)',
      'DECRBY advertiser-budget at ORDER 2 — atomic ledger operation (CF-20-2)',
      'INCRBY to restore budget on BUDGET_INSUFFICIENT rejection (CF-20-2)',
      'Stateless auction: no Elasticsearch state machine, event log only (CF-20-2)',
    ],

    freedomComponents: [
      'auction_bid_lock_ttl_ms — duration of the SETNX auction bid lock in milliseconds',
      'auction_response_timeout_ms — max time to wait for bid response',
    ],
  });
}

// ── T627: FraudPreBillingValidator ──────────────────────────────────────────

export function createFraudPreBillingValidatorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T627',
    flowId: 'FLOW-20',
    flowName: 'Ads Platform',
    name: 'FraudPreBillingValidator',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered by BidAccepted event (after T626 auction succeeds, before billing)',
    purpose:
      'Fraud detection gate at ORDER 1 before any billing commitment. ' +
      'fraudScore = await ai.detectFraud({bidAmount, advertiserId, bidHistory, ipAddress}). ' +
      'If fraudScore > threshold_from_freedom: INCRBY(advertiser-budget) to restore bid amount, ' +
      'emit FraudDetected. PCI zero-PAN: card.number and card.cvv absent everywhere. ' +
      'paymentMethodToken stored, never raw credentials.',
    distinctFrom:
      'T626 AuctionBidProcessor (T626 processes bid; T627 validates fraud before billing). ' +
      'T628 PoliticalContentReviewer (T627 checks transaction fraud; T628 checks content policy).',

    ironRules: [
      'IR-1: AI fraud detection at ORDER 1 before any billing. fraudScore threshold from FREEDOM ' +
        'fraud_score_threshold — never hardcoded. CF-20-3.',
      'IR-2: fraudScore > threshold → INCRBY(advertiser-budget:{advertiserId}, bidAmountCents) ' +
        'to restore budget. emit FraudDetected. CF-20-3.',
      'IR-3: PCI zero-PAN: card.number BLOCKED, card.cvv BLOCKED. paymentMethodToken stored only. CF-20-3.',
      'IR-4: Fraud check output stored in audit — catch block includes fraudScore for investigation. CF-20-3.',
      'IR-5: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'FraudDetection',
          description: 'AI fraudScore evaluation with threshold from FREEDOM fraud_score_threshold',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ValidateFraudScore',
          description:
            'If fraudScore > threshold: restore budget via INCRBY and emit FraudDetected',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'PciZeroPan',
          description: 'Ensure paymentMethodToken used; card.number and card.cvv absent',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'StoreAuditWithScore',
          description: 'storeDocument(fraud-audit, {bidId, fraudScore, decision, timestamp})',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitFraudResultOrProceed',
          description: 'On fraud: emit FraudDetected; on pass: emit FraudCheckPassed',
          ironRuleRef: 'IR-2',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1565',
        interfaceName: 'IAiFraudDetectionService',
        fabricType: FabricType.AI_ENGINE,
        description:
          'AI fraud detection model — evaluate bidAmount, advertiserId, bidHistory, ipAddress',
      },
      {
        factoryId: 'F1563',
        interfaceName: 'IAdvertiserBudgetService',
        fabricType: FabricType.DATABASE,
        description: 'INCRBY to restore advertiser budget on fraud rejection',
      },
      {
        factoryId: 'F1566',
        interfaceName: 'IFraudAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Fraud audit trail — stores fraudScore, decision, and investigation notes',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'FraudDetected / FraudCheckPassed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: { template: 'guard', max_tokens: 2800 } },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-20-06',
        description: 'Fraud check at ORDER 1 before any billing (CF-20-3)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-07',
        description:
          'fraudScore threshold from FREEDOM fraud_score_threshold — never hardcoded (CF-20-3)',
        severity: 'error',
        checkType: 'freedom_config_required',
      },
      {
        gateId: 'QG-20-08',
        description: 'Budget restoration via INCRBY on fraud rejection (CF-20-3)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-09',
        description:
          'PCI zero-PAN: card.number and card.cvv absent; paymentMethodToken only (CF-20-3)',
        severity: 'error',
        checkType: 'pci_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['fraud_audit', 'advertiser_budget'],
      events: ['fraud.detected', 'fraud.check.passed'],
      apiRoutes: [],
    },

    machineComponents: [
      'AI fraud detection at ORDER 1 before billing commitment (CF-20-3)',
      'fraudScore threshold from FREEDOM config — never hardcoded (CF-20-3)',
      'INCRBY budget restoration on fraud rejection (CF-20-3)',
      'PCI zero-PAN: paymentMethodToken only, card data blocked (CF-20-3)',
      'Fraud audit trail with fraudScore for investigation',
    ],

    freedomComponents: [
      'fraud_score_threshold — minimum fraudScore to trigger FraudDetected (0.0-1.0)',
      'fraud_audit_retention_days — how long to retain fraud audit records',
    ],
  });
}

// ── T628: PoliticalContentReviewer ──────────────────────────────────────────

export function createPoliticalContentReviewerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T628',
    flowId: 'FLOW-20',
    flowName: 'Ads Platform',
    name: 'PoliticalContentReviewer',
    archetype: ContractArchetype.ANALYSIS,
    entry:
      'Triggered by AdContentSubmitted event (advertiser uploads ad creative for policy review)',
    purpose:
      'Dual-model political content detection with human escalation. ' +
      'ORDER 1: isPoliticalScores = [modelA.isPolitical, modelB.isPolitical]. ' +
      'ORDER 2: minScore = Math.min(...scores) to converge to conservative consensus. ' +
      'If minScore > threshold AND Math.max – Math.min > divergence_threshold: emit PoliticalContentReviewPending. ' +
      'Human reviewer decides final political classification. Decision immutable (updateDocument only on final status). ' +
      'No auto-block on ambiguous cases — human truth wins.',
    distinctFrom:
      'T627 FraudPreBillingValidator (T627 checks fraud transaction; T628 checks ad content policy).',

    ironRules: [
      'IR-1: Dual-model isPolitical detection at ORDER 1. At least 2 independent models required. CF-20-4.',
      'IR-2: Converge via Math.min(modelA.score, modelB.score) — conservative consensus. CF-20-4.',
      'IR-3: If minScore > threshold AND (Math.max - Math.min) > divergence_threshold: ' +
        'escalate to human review queue. Emit PoliticalContentReviewPending. CF-20-4.',
      'IR-4: Human decision stored in final status field (updateDocument only allowed on final_status transition). CF-20-4.',
      'IR-5: No auto-block on ambiguous cases — human review mandatory if divergence detected. CF-20-4.',
      'IR-6: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'DualModelDetection',
          description: 'Run modelA.isPolitical + modelB.isPolitical in parallel',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ConvergeToConsensus',
          description: 'minScore = Math.min(modelA, modelB); maxScore = Math.max(modelA, modelB)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'DivergenceCheck',
          description:
            'divergence = maxScore - minScore; if divergence > threshold: escalate to human',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'EscalateOrAutoApprove',
          description:
            'Divergence → PoliticalContentReviewPending; no divergence + minScore < threshold → auto-approve',
          ironRuleRef: 'IR-3',
        },
        {
          order: 5,
          name: 'StoreAuditAndEmit',
          description:
            'storeDocument(political-audit, {adId, modelA_score, modelB_score, minScore, human_decision})',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1567',
        interfaceName: 'IAiPoliticalDetectionServiceA',
        fabricType: FabricType.AI_ENGINE,
        description: 'First AI model — isPolitical detection (Model A)',
      },
      {
        factoryId: 'F1567b',
        interfaceName: 'IAiPoliticalDetectionServiceB',
        fabricType: FabricType.AI_ENGINE,
        description: 'Second AI model — isPolitical detection (Model B)',
      },
      {
        factoryId: 'F1568',
        interfaceName: 'IHumanReviewQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'Human review queue for ambiguous political classifications — escalation point',
      },
      {
        factoryId: 'F1568b',
        interfaceName: 'IPoliticalAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Political audit trail — stores model scores and human decisions',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'PoliticalContentReviewPending / PoliticalContentApproved / PoliticalContentRejected emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: { template: 'analysis', max_tokens: 3200 } },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-20-10',
        description: 'Dual-model isPolitical detection at ORDER 1 (CF-20-4)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-11',
        description: 'Math.min convergence for conservative consensus (CF-20-4)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-12',
        description: 'Divergence check triggers human review on ambiguous cases (CF-20-4)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-20-13',
        description: 'No auto-block on divergence — human review mandatory (CF-20-4)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['political_audit', 'human_review_queue'],
      events: [
        'political.content.review.pending',
        'political.content.approved',
        'political.content.rejected',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'Dual-model isPolitical detection at ORDER 1 (CF-20-4)',
      'Math.min convergence — conservative consensus (CF-20-4)',
      'Divergence-triggered human review escalation (CF-20-4)',
      'No auto-block on ambiguous cases (IR-5)',
      'Human decision immutable — updateDocument only on final status transition',
    ],

    freedomComponents: [
      'political_score_threshold — minScore to trigger political classification (0.0-1.0)',
      'political_divergence_threshold — max allowed divergence between models (0.0-1.0)',
      'political_human_review_sla_hours — SLA for human review completion',
    ],
  });
}

/**
 * ── Descriptor exports ──────────────────────────────────────────────────────
 * Used by EngineBootstrapper to register all contracts in a single operation.
 */

export const ADS_PLATFORM_NEW_CONTRACT_FACTORIES = [
  createConsentGateEnforcerContract,
  createAuctionBidProcessorContract,
  createFraudPreBillingValidatorContract,
  createPoliticalContentReviewerContract,
] as const;

export const ADS_PLATFORM_NEW_CONTRACT_DESCRIPTORS = [
  createConsentGateEnforcerContract(),
  createAuctionBidProcessorContract(),
  createFraudPreBillingValidatorContract(),
  createPoliticalContentReviewerContract(),
] as const;
