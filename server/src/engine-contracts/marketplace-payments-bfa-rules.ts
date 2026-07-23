/**
 * FLOW-16 BFA Rules — Marketplace Payments
 *
 * CF-16-1: T609 MarketplaceCheckoutGateway — BOLA ORDER 1, SETNX cart lock ORDER 2, OCC inventory (F1528/F1529/F1530)
 * CF-16-2: T610 MarketplacePaymentSplitter — SETNX idempotency, non-repudiation append-only, PII scrub, platformFeeBps FREEDOM (F1531/F1532/F1533/F1534)
 * CF-16-3: T611 MarketplaceEscrowController — LIFO compensation, dispute=updateDocument only; T612 SETNX payout + vault ref only (F1533/F1535/F1536)
 * CF-16-4: scope_isolation FC-32 across all 4 services
 */

export const MARKETPLACE_PAYMENTS_BFA_RULES = [
  {
    ruleId: 'CF-16-1',
    flowId: 'FLOW-16',
    description:
      'T609 MarketplaceCheckoutGateway: BOLA identity assertion at ORDER 1 — ' +
      'cart.buyerTenantId === ALS.tenantId checked before any resource mutation. ' +
      'CheckoutForbidden emitted immediately on mismatch — no lock attempt, no inventory read. ' +
      'SETNX(checkout-lock:{cartId}) at ORDER 2 with TTL from FREEDOM checkout_lock_ttl_ms — ' +
      'never hardcoded TTL value. ' +
      'OCC inventory reservation via IInventoryOccService (F1529): getDocumentWithVersion + ' +
      'storeDocumentWithOCC — never plain storeDocument for inventory. ' +
      'IAuditTrailService (F1530): storeDocument(audit) at ORDER 4 BEFORE CheckoutReserved emit (DNA-8). ' +
      'ICartService (F1528): read-only cart fetch used only for BOLA check. ' +
      'Violation: lock acquired before identity confirmed = BOLA denial-of-service against cart owner.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-16-2',
    flowId: 'FLOW-16',
    description:
      'T610 MarketplacePaymentSplitter: SETNX(hash(tenantId+cartId+totalAmountCents)) at ORDER 1. ' +
      'On SETNX=false: unconditional return of previous result — no re-validation, no second capture. ' +
      'platformFeeBps from FREEDOM marketplace_platform_fee_bps exclusively — never hardcoded. ' +
      'sellerAmount = totalAmountCents - Math.round(totalAmountCents * platformFeeBps / 10000). ' +
      'IPaymentCaptureService (F1531): processes payment authorization and capture. ' +
      'IFeeSplitService (F1532): computes fee split using FREEDOM-sourced platformFeeBps. ' +
      'IEscrowService (F1533): storeDocument(escrow, {status:HELD}) before MarketplaceOrderConfirmed emit (DNA-8). ' +
      'INonRepudiationAuditService (F1534): append-only audit index — deleteDocument BLOCKED, ' +
      'updateDocument BLOCKED. PII scrub: card.number → masked last 4, card.cvv → absent, ' +
      'bankAccountNumber → absent. Hash chain: prevHash + recordHash on every record. ' +
      'Violation: double-charge on retry if SETNX absent; platformFeeBps hardcoded bypasses operator config.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-16-3',
    flowId: 'FLOW-16',
    description:
      'T611 MarketplaceEscrowController: LIFO compensation order is machine-fixed = ' +
      '[REFUND_PAYMENT, RESTORE_INVENTORY]. FIFO is prohibited — reversing order creates capacity-before-money window. ' +
      'Compensation order is NOT configurable via FREEDOM. ' +
      'ISagaCompensationService (F1535): executes LIFO steps in order; FIFO rejected at build time. ' +
      'IEscrowService (F1533, shared with T610): dispute path = updateDocument(status:DISPUTED) ONLY — ' +
      'deleteDocument on escrow index is permanently forbidden on all paths including compensation. ' +
      'escrow_auto_release_days from FREEDOM config — never hardcoded. ' +
      'storeDocument(audit) before every escrow state event emit (DNA-8) on all 3 paths: RELEASE, DISPUTE, COMPENSATION. ' +
      'T612 SellerPayoutWriter: SETNX(payout-lock:{orderId}) at ORDER 1 before any storeDocument. ' +
      'IPayoutVaultService (F1536): payoutVaultRef stored — bankAccountNumber, IBAN, routingNumber, ' +
      'sortCode NEVER stored in any index. ' +
      'storeDocument(audit) before PayoutCompleted emit (DNA-8). ' +
      'Violation: FIFO compensation = oversell window; deleteDocument on escrow = evidence destruction; ' +
      'raw bank credentials stored = PCI DSS breach.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-949..CF-952) — edge-case coverage from docs/flow-coverage/marketplace-payments/P10-server-specs.md
  {
    ruleId: 'CF-949',
    flowId: 'FLOW-16',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-8 Optimistic concurrency on POST /api/dynamic/marketplace-payments — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-950',
    flowId: 'FLOW-16',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-9 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-951',
    flowId: 'FLOW-16',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-11 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-952',
    flowId: 'FLOW-16',
    type: 'DNA8_ORDERING',
    description:
      'EC-12 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-16-4',
    flowId: 'FLOW-16',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks across T609, T610, T611, T612 (FC-32 / SK-526). ' +
      'marketplace-escrow records are PRIVATE per tenant — cross-tenant escrow read is forbidden. ' +
      'marketplace-payouts records are PRIVATE per tenant — seller payout records isolated by ALS tenantId. ' +
      'marketplace-payment-audit records are PRIVATE per tenant — cross-tenant audit read blocked. ' +
      'ICartService (F1528), IInventoryOccService (F1529): read-only operations scoped to ALS tenantId. ' +
      'IPaymentCaptureService (F1531): payment operations scoped to ALS tenantId — no cross-tenant capture. ' +
      'INonRepudiationAuditService (F1534) is PLATFORM_ONLY for cross-tenant dispute resolution. ' +
      'ALS tenantId exclusively on all 4 services — request body tenantId ignored if present.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
