/**
 * FLOW-20 BFA Rules — Ads Platform
 *
 * CF-20-1: T625 ConsentGateEnforcer — consent check ORDER 1 unconditional, no business exception paths
 * CF-20-2: T626 AuctionBidProcessor — Redis SETNX bid lock + DECRBY/INCRBY budget atomicity; stateless
 * CF-20-3: T627 FraudPreBillingValidator — fraud score ORDER 1 before billing; budget restore via INCRBY; PCI zero-PAN
 * CF-20-4: T628 PoliticalContentReviewer — dual-gate political detection; Math.min convergence; human review mandatory
 */

export const ADS_PLATFORM_BFA_RULES = [
  {
    ruleId: 'CF-20-1',
    flowId: 'FLOW-20',
    description:
      'T625 ConsentGateEnforcer: Consent check at ORDER 1 unconditionally — ' +
      'consentRecord = await db.searchDocuments("consent-records", {userId}). ' +
      'If consentRecord absent OR adsConsent=false OR expiresAt < now(): ' +
      'emit ConsentGateFailed immediately. Zero exception paths for business logic override. ' +
      'GDPR/CCPA compliance gate. ' +
      'IConsentRecordService (F1561): read-only consent record fetch — PLATFORM_ONLY for audit. ' +
      'Violation: consent check buried inside ad delivery logic (ORDER 3+) = late guard allows unauthorized delivery.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-20-2',
    flowId: 'FLOW-20',
    description:
      'T626 AuctionBidProcessor: Redis SETNX(auction-bid-lock:{auctionId}) at ORDER 1 ' +
      '— prevents duplicate bids on concurrent requests. Lock held = unconditional return of previousBid. ' +
      'DECRBY(advertiser-budget:{advertiserId}, bidAmountCents) at ORDER 2 — atomic Redis operation. ' +
      'On newBudget < 0: INCRBY to restore full amount, emit BidRejected with BUDGET_INSUFFICIENT. ' +
      'Stateless auction: no Elasticsearch OCC (no state machine), only event log. ' +
      'IRedisAuctionLockService (F1562): SETNX provider. ' +
      'IAdvertiserBudgetService (F1563): DECRBY/INCRBY for budget ledger. ' +
      'IAuctionAuditService (F1564): append-only audit trail. ' +
      'Violation: Using Elasticsearch OCC for bid lock (race condition on concurrent bids); ' +
      'FIFO budget operations (Math subtract then add) instead of atomic DECRBY/INCRBY.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-20-3',
    flowId: 'FLOW-20',
    description:
      'T627 FraudPreBillingValidator: Fraud detection via AI at ORDER 1 before any billing commitment. ' +
      'fraudScore = await ai.detectFraud({bidAmount, advertiserId, bidHistory, ipAddress}). ' +
      'threshold from FREEDOM fraud_score_threshold — never hardcoded. ' +
      'If fraudScore > threshold: INCRBY(advertiser-budget:{advertiserId}, bidAmountCents) to restore, ' +
      'emit FraudDetected with fraudScore. ' +
      'PCI zero-PAN everywhere: card.number BLOCKED, card.cvv BLOCKED, bankAccountNumber BLOCKED. ' +
      'paymentMethodToken stored only (opaque reference to vault). ' +
      'IAiFraudDetectionService (F1565): AI fraud scoring. ' +
      'IAdvertiserBudgetService (F1563): INCRBY budget restore. ' +
      'IFraudAuditService (F1566): fraud audit trail with score for investigation. ' +
      'Violation: fraud check ORDER 3+ (after billing authorized = async refund); ' +
      'storing card.number in fraud logs (PCI DSS breach); hardcoded fraud_score_threshold.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-965..CF-968) — edge-case coverage from docs/flow-coverage/ads-platform/P10-server-specs.md
  {
    ruleId: 'CF-965',
    flowId: 'FLOW-20',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/ads-platform — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-966',
    flowId: 'FLOW-20',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-967',
    flowId: 'FLOW-20',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-968',
    flowId: 'FLOW-20',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-20-4',
    flowId: 'FLOW-20',
    description:
      'T628 PoliticalContentReviewer: Dual-model political content detection at ORDER 1. ' +
      'isPoliticalScores = [modelA.isPolitical, modelB.isPolitical] in parallel. ' +
      'Converge via Math.min(modelA, modelB) for conservative consensus. ' +
      'divergence = Math.max(scores) - Math.min(scores). ' +
      'If minScore > threshold AND divergence > divergence_threshold: ' +
      'escalate to human review queue, emit PoliticalContentReviewPending. ' +
      'Human reviewer decision stored in final_status field (immutable after human decides). ' +
      'No auto-block on ambiguous cases — human truth always wins. ' +
      'IAiPoliticalDetectionServiceA (F1567): Model A political detection. ' +
      'IAiPoliticalDetectionServiceB (F1567b): Model B political detection. ' +
      'IHumanReviewQueueService (F1568): escalation path for ambiguous cases. ' +
      'IPoliticalAuditService (F1568b): audit trail with model scores + human decision. ' +
      'Violation: Using Math.max instead of Math.min (too aggressive auto-block); ' +
      'no human review path (ambiguous auto-blocked); auto-blocking on divergence (human review mandatory).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
