/**
 * FLOW-16 Engine Contracts — Marketplace Payments (New Services)
 *
 * T609  MarketplaceCheckoutGateway   archetype: VALIDATION    (BOLA + SETNX cart lock + OCC inventory)
 * T610  MarketplacePaymentSplitter   archetype: BILLING       (SETNX idempotency + fee split + non-repudiation)
 * T611  MarketplaceEscrowController  archetype: ORCHESTRATION (LIFO saga + dispute state machine)
 * T612  SellerPayoutWriter           archetype: DATA_PIPELINE (SETNX payout + vault ref only)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * T-number note: Design documents reference T225-T228, but those collide with existing contracts.
 *   Remapped to T609-T612 per CLAUDE.md boundary (Next Task Type: T605 was FLOW-15; T609+ available).
 * Factory note: Design documents reference F239-F247, but those collide with earlier flows.
 *   Remapped to F1528-F1536 per CLAUDE.md boundary (Next Factory: F1519 was FLOW-15; F1528+ available).
 *
 * CF-16-1: T609 BOLA at ORDER 1, SETNX cart lock ORDER 2, OCC inventory, audit before CheckoutReserved
 * CF-16-2: T610 SETNX idempotency + non-repudiation append-only + PII scrub + platformFeeBps FREEDOM
 * CF-16-3: T611 LIFO compensation + dispute=updateDocument only + T612 SETNX payout + vault ref only
 * CF-16-4: scope_isolation FC-32 across all 4 services
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const MARKETPLACE_PAYMENTS_NEW_TASK_TYPES = ['T609', 'T610', 'T611', 'T612'] as const;

// ── T609: MarketplaceCheckoutGateway ────────────────────────────────────────

export function createMarketplaceCheckoutGatewayContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T609',
    flowId: 'FLOW-16',
    flowName: 'Marketplace Payments',
    name: 'MarketplaceCheckoutGateway',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by CheckoutInitiated event (buyer submits cart for purchase)',
    purpose:
      'Two-stage checkout gate: BOLA identity assertion at ORDER 1 before any resource mutation, ' +
      'SETNX cart lock with FREEDOM-configured TTL at ORDER 2, OCC inventory reservation at ORDER 3. ' +
      'BOLA check ensures cart.buyerTenantId === ALS.tenantId — mismatch emits CheckoutForbidden immediately. ' +
      'SETNX prevents duplicate concurrent checkout attempts on the same cart. ' +
      'OCC inventory reservation prevents double-reservation on concurrent requests from different carts.',
    distinctFrom:
      'T610 MarketplacePaymentSplitter (T609 validates and reserves; T610 captures payment and splits fees after T609 succeeds)',

    ironRules: [
      'IR-1: BOLA assert at ORDER 1 — cart.buyerTenantId === ALS.tenantId. ' +
        'CheckoutForbidden emitted immediately on mismatch. Zero resource writes before identity confirmed. CF-16-1.',
      'IR-2: SETNX(checkout-lock:{cartId}) at ORDER 2 with TTL from FREEDOM checkout_lock_ttl_ms. ' +
        'Never hardcoded TTL. Duplicate checkout attempt returns CheckoutAlreadyInProgress. CF-16-1.',
      'IR-3: OCC inventory reservation via IInventoryOccService (F1529): ' +
        'getDocumentWithVersion + storeDocumentWithOCC — never plain storeDocument for inventory. ' +
        'OCC_CONFLICT emits InventoryReservationConflict. CF-16-1.',
      'IR-4: storeDocument(audit) via IAuditTrailService (F1530) at ORDER 4 BEFORE CheckoutReserved emit. DNA-8. CF-16-1.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'BolaCheck',
          description:
            'Assert cart.buyerTenantId === ALS.tenantId — emit CheckoutForbidden on mismatch',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'SetnxCartLock',
          description: 'SETNX(checkout-lock:{cartId}) with TTL from FREEDOM checkout_lock_ttl_ms',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'OccInventoryReservation',
          description: 'getDocumentWithVersion + storeDocumentWithOCC for inventory item',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before CheckoutReserved emit',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitCheckoutReserved',
          description: 'enqueue(CheckoutReserved) — only after BOLA, lock, OCC, and audit confirm',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1528',
        interfaceName: 'ICartService',
        fabricType: FabricType.DATABASE,
        description: 'Read-only cart fetch for BOLA check — cart.buyerTenantId validation',
      },
      {
        factoryId: 'F1529',
        interfaceName: 'IInventoryOccService',
        fabricType: FabricType.DATABASE,
        description: 'OCC inventory reservation: getDocumentWithVersion + storeDocumentWithOCC',
      },
      {
        factoryId: 'F1530',
        interfaceName: 'IAuditTrailService',
        fabricType: FabricType.DATABASE,
        description:
          'Checkout audit trail — append-only, storeDocument before CheckoutReserved emit',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'CheckoutReserved / CheckoutForbidden / CheckoutAlreadyInProgress / InventoryReservationConflict emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-16-01',
        description: 'BOLA check at ORDER 1 — no resource write before identity confirmed (IR-1)',
        severity: 'error',
        checkType: 'bola_order_1',
      },
      {
        gateId: 'QG-16-02',
        description: 'SETNX cart lock at ORDER 2 with FREEDOM TTL (IR-2)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-16-03',
        description: 'storeDocumentWithOCC not plain storeDocument for inventory (IR-3)',
        severity: 'error',
        checkType: 'occ_inventory_reservation',
      },
      {
        gateId: 'QG-16-04',
        description: 'storeDocument(audit) before CheckoutReserved emit (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    bfaRegistration: {
      entities: ['cart', 'inventory', 'checkout_audit'],
      events: [
        'checkout.reserved',
        'checkout.forbidden',
        'checkout.already.in.progress',
        'inventory.reservation.conflict',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'BOLA_ORDER_1: cart.buyerTenantId === ALS.tenantId at ORDER 1 — zero writes before identity confirmed (CF-16-1)',
      'CART_LOCK_SETNX_WITH_TTL: SETNX(checkout-lock:{cartId}) at ORDER 2 — TTL from FREEDOM only (CF-16-1)',
      'OCC_INVENTORY_RESERVATION: getDocumentWithVersion + storeDocumentWithOCC — never plain storeDocument (CF-16-1)',
      'Outbox: storeDocument(audit) before CheckoutReserved enqueue (DNA-8)',
      'CheckoutForbidden with BOLA violation detail on tenant mismatch',
    ],

    freedomComponents: ['checkout_lock_ttl_ms — duration of the SETNX cart lock in milliseconds'],
  });
}

// ── T610: MarketplacePaymentSplitter ────────────────────────────────────────

export function createMarketplacePaymentSplitterContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T610',
    flowId: 'FLOW-16',
    flowName: 'Marketplace Payments',
    name: 'MarketplacePaymentSplitter',
    archetype: ContractArchetype.BILLING,
    entry: 'Triggered by CheckoutReserved event (T609 MarketplaceCheckoutGateway output)',
    purpose:
      'Idempotent payment capture and fee split. ' +
      'SETNX(hash(tenantId+cartId+totalAmountCents)) at ORDER 1 — unconditional return on false prevents double-charge on retry. ' +
      'platformFeeBps loaded from FREEDOM marketplace_platform_fee_bps — never hardcoded. ' +
      'sellerAmount = totalAmountCents - Math.round(totalAmountCents * platformFeeBps / 10000). ' +
      'PII fields scrubbed before any storeDocument: card.number → masked, card.cvv → absent, bankAccountNumber → absent. ' +
      'Non-repudiation audit is append-only with hash chain — deleteDocument and updateDocument BLOCKED. ' +
      'Escrow hold storeDocument before MarketplaceOrderConfirmed emit (DNA-8).',
    distinctFrom:
      'T609 MarketplaceCheckoutGateway (T609 validates and reserves; T610 captures and splits after T609 succeeds). ' +
      'T611 MarketplaceEscrowController (T611 manages escrow state and disputes; T610 creates the initial escrow hold)',

    ironRules: [
      'IR-1: SETNX(hash(tenantId+cartId+totalAmountCents)) at ORDER 1. ' +
        'On SETNX=false: unconditional return of previous result — no re-validation, no second capture. CF-16-2.',
      'IR-2: platformFeeBps from FREEDOM marketplace_platform_fee_bps exclusively — never hardcoded. ' +
        'sellerAmount = totalAmountCents - Math.round(totalAmountCents * platformFeeBps / 10000). CF-16-2.',
      'IR-3: card.number, card.cvv, bankAccountNumber NEVER in storeDocument. ' +
        'Masked card stored as last 4 digits only. PII scrub applied before every write. CF-16-2.',
      'IR-4: Append-only nonRepudiationAudit via INonRepudiationAuditService (F1534). ' +
        'deleteDocument BLOCKED. updateDocument BLOCKED. Hash chain: prevHash + recordHash on each record. CF-16-2.',
      'IR-5: IEscrowService (F1533) storeDocument(escrow, {status:HELD}) BEFORE MarketplaceOrderConfirmed emit. DNA-8. CF-16-2.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'SetnxIdempotency',
          description:
            'SETNX(hash(tenantId+cartId+totalAmountCents)) — unconditional return on false',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'LoadPlatformFeeBps',
          description: 'Read marketplace_platform_fee_bps from FREEDOM config',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'CaptureAndSplit',
          description:
            'IPaymentCaptureService capture + IFeeSplitService compute sellerAmount and platformFee',
          ironRuleRef: 'IR-2',
        },
        {
          order: 4,
          name: 'ScrubAndAuditWrite',
          description:
            'Scrub PII then storeDocument(nonRepudiationAudit) — append-only, hash chain',
          ironRuleRef: 'IR-3',
        },
        {
          order: 5,
          name: 'EscrowHold',
          description:
            'storeDocument(escrow, {status:HELD, sellerAmount, platformFee}) — DNA-8 before emit',
          ironRuleRef: 'IR-5',
        },
        {
          order: 6,
          name: 'EmitOrderConfirmed',
          description: 'enqueue(MarketplaceOrderConfirmed) — only after escrow hold confirmed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1531',
        interfaceName: 'IPaymentCaptureService',
        fabricType: FabricType.DATABASE,
        description: 'Payment authorization and capture — tenant-scoped, idempotency-gated',
      },
      {
        factoryId: 'F1532',
        interfaceName: 'IFeeSplitService',
        fabricType: FabricType.DATABASE,
        description: 'Fee split computation using FREEDOM-sourced platformFeeBps',
      },
      {
        factoryId: 'F1533',
        interfaceName: 'IEscrowService',
        fabricType: FabricType.DATABASE,
        description:
          'Escrow hold creation — storeDocument(escrow, {status:HELD}) before MarketplaceOrderConfirmed (shared with T611)',
      },
      {
        factoryId: 'F1534',
        interfaceName: 'INonRepudiationAuditService',
        fabricType: FabricType.DATABASE,
        description:
          'Append-only payment audit with hash chain — deleteDocument and updateDocument BLOCKED',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'MarketplaceOrderConfirmed / PaymentCaptureFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-16-05',
        description: 'SETNX at ORDER 1 — unconditional return on false, no second capture (IR-1)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-16-06',
        description: 'platformFeeBps from FREEDOM only — no hardcoded fee values (IR-2)',
        severity: 'error',
        checkType: 'no_hardcoded_values',
      },
      {
        gateId: 'QG-16-07',
        description:
          'PII scrub before storeDocument — card.number/cvv/bankAccountNumber absent (IR-3)',
        severity: 'error',
        checkType: 'pii_scrub_before_write',
      },
      {
        gateId: 'QG-16-08',
        description: 'Append-only audit — deleteDocument and updateDocument BLOCKED (IR-4)',
        severity: 'error',
        checkType: 'append_only_audit',
      },
      {
        gateId: 'QG-16-09',
        description:
          'Escrow hold storeDocument before MarketplaceOrderConfirmed emit (IR-5, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    bfaRegistration: {
      entities: ['marketplace_escrow', 'payment_audit', 'payment_capture'],
      events: ['marketplace.order.confirmed', 'payment.capture.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'SPLIT_PAYMENT_SETNX: SETNX(hash(tenantId+cartId+totalAmountCents)) at ORDER 1 — unconditional return on false (CF-16-2)',
      'PLATFORM_FEE_FROM_FREEDOM: platformFeeBps from FREEDOM marketplace_platform_fee_bps — never hardcoded (CF-16-2)',
      'APPEND_ONLY_AUDIT: deleteDocument BLOCKED, updateDocument BLOCKED on audit index (CF-16-2)',
      'PII_SCRUB_BEFORE_WRITE: card.number → masked last 4, card.cvv → absent, bankAccountNumber → absent (CF-16-2)',
      'Hash chain: prevHash + recordHash on every audit record (CF-16-2)',
      'Outbox: escrow storeDocument before MarketplaceOrderConfirmed enqueue (DNA-8)',
    ],

    freedomComponents: [
      'marketplace_platform_fee_bps — platform fee in basis points (e.g. 290 = 2.90%)',
    ],
  });
}

// ── T611: MarketplaceEscrowController ───────────────────────────────────────

export function createMarketplaceEscrowControllerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T611',
    flowId: 'FLOW-16',
    flowName: 'Marketplace Payments',
    name: 'MarketplaceEscrowController',
    archetype: ContractArchetype.ORCHESTRATION,
    entry:
      'Triggered by MarketplaceOrderConfirmed (T610 output), EscrowDisputeInitiated, or EscrowReleaseRequested events',
    purpose:
      'Escrow state machine with LIFO saga compensation. ' +
      'Manages HELD → RELEASED, HELD → DISPUTED, DISPUTED → RELEASED, DISPUTED → REFUNDED transitions. ' +
      'LIFO compensation order is machine-fixed: [REFUND_PAYMENT, RESTORE_INVENTORY] — never FIFO. ' +
      'Dispute path = updateDocument(status:DISPUTED) ONLY — deleteDocument on escrow is permanently forbidden. ' +
      'escrow_auto_release_days from FREEDOM config. ' +
      'storeDocument(audit) before every state event emit (DNA-8) on all 3 paths.',
    distinctFrom:
      'T610 MarketplacePaymentSplitter (T610 creates the initial HELD escrow; T611 manages all subsequent state transitions). ' +
      'T612 SellerPayoutWriter (T611 triggers the RELEASED state; T612 executes the actual payout transfer)',

    ironRules: [
      'IR-1: LIFO compensation order = [REFUND_PAYMENT, RESTORE_INVENTORY] — machine-fixed. ' +
        'FIFO is prohibited — reversing creates capacity-before-money window. ' +
        'Compensation order NOT configurable via FREEDOM. ISagaCompensationService (F1535). CF-16-3.',
      'IR-2: Dispute path = updateDocument(status:DISPUTED) ONLY via IEscrowService (F1533). ' +
        'deleteDocument on escrow index is permanently forbidden on all paths including compensation. CF-16-3.',
      'IR-3: escrow_auto_release_days from FREEDOM config — never hardcoded. ' +
        'Auto-release triggers EscrowAutoReleaseScheduled. CF-16-3.',
      'IR-4: storeDocument(audit) BEFORE every state event emit. DNA-8 on RELEASE, DISPUTE, and COMPENSATION paths.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ReadEventPath',
          description: 'Determine path: RELEASE, DISPUTE, or COMPENSATION from incoming event type',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'UpdateEscrowStatus',
          description: 'updateDocument(status: RELEASED | DISPUTED) — never deleteDocument',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before state event emit',
          ironRuleRef: 'IR-4',
        },
        {
          order: 4,
          name: 'EmitStateEvent',
          description: 'EscrowReleased / EscrowDisputed / EscrowAutoReleaseScheduled',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'ExecuteLifoCompensation',
          description:
            'On compensation path: execute [REFUND_PAYMENT, RESTORE_INVENTORY] in LIFO order',
          ironRuleRef: 'IR-1',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1533',
        interfaceName: 'IEscrowService',
        fabricType: FabricType.DATABASE,
        description:
          'Escrow state transitions — updateDocument only (shared with T610); deleteDocument BLOCKED',
      },
      {
        factoryId: 'F1535',
        interfaceName: 'ISagaCompensationService',
        fabricType: FabricType.DATABASE,
        description:
          'LIFO saga compensation executor — [REFUND_PAYMENT, RESTORE_INVENTORY] order enforced',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'EscrowReleased / EscrowDisputed / EscrowAutoReleaseScheduled / EscrowCompensationCompleted emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-16-10',
        description:
          'LIFO compensation = [REFUND_PAYMENT, RESTORE_INVENTORY] — FIFO prohibited (IR-1)',
        severity: 'error',
        checkType: 'lifo_compensation_order',
      },
      {
        gateId: 'QG-16-11',
        description:
          'Dispute = updateDocument(status:DISPUTED) only — no deleteDocument on escrow (IR-2)',
        severity: 'error',
        checkType: 'dispute_not_delete',
      },
      {
        gateId: 'QG-16-12',
        description: 'escrow_auto_release_days from FREEDOM config — not hardcoded (IR-3)',
        severity: 'error',
        checkType: 'no_hardcoded_values',
      },
      {
        gateId: 'QG-16-13',
        description: 'storeDocument(audit) before every state event emit (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'COMPENSATION_STEPS',
        value: ['REFUND_PAYMENT', 'RESTORE_INVENTORY'],
        type: 'ordering',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['marketplace_escrow', 'escrow_audit'],
      events: [
        'escrow.released',
        'escrow.disputed',
        'escrow.auto.release.scheduled',
        'escrow.compensation.completed',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'LIFO_COMPENSATION_ORDER: [REFUND_PAYMENT, RESTORE_INVENTORY] — machine-fixed, FIFO prohibited (CF-16-3)',
      'DISPUTE_NOT_DELETE: updateDocument(status:DISPUTED) ONLY — deleteDocument permanently forbidden on escrow (CF-16-3)',
      'ESCROW_STATE_MACHINE: HELD → RELEASED, HELD → DISPUTED, DISPUTED → RELEASED, DISPUTED → REFUNDED',
      'Outbox: storeDocument(audit) before every state event emit (DNA-8)',
      'EscrowAutoReleaseScheduled triggered when escrow_auto_release_days elapses',
    ],

    freedomComponents: [
      'escrow_auto_release_days — days after order confirmation before automatic escrow release',
    ],
  });
}

// ── T612: SellerPayoutWriter ────────────────────────────────────────────────

export function createSellerPayoutWriterContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T612',
    flowId: 'FLOW-16',
    flowName: 'Marketplace Payments',
    name: 'SellerPayoutWriter',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by EscrowReleased event (T611 MarketplaceEscrowController output)',
    purpose:
      'Idempotent seller payout write. ' +
      'SETNX(payout-lock:{orderId}) at ORDER 1 before any storeDocument. ' +
      'payoutVaultRef stored — bankAccountNumber, IBAN, routingNumber, sortCode NEVER stored in any index. ' +
      'IPayoutVaultService (F1536) returns the vault ref after credential lookup — raw credentials never touch the engine. ' +
      'storeDocument(audit) before PayoutCompleted emit (DNA-8).',
    distinctFrom:
      'T611 MarketplaceEscrowController (T611 releases the escrow; T612 executes the actual payout transfer to the seller)',

    ironRules: [
      'IR-1: SETNX(payout-lock:{orderId}) at ORDER 1 BEFORE any storeDocument. ' +
        'Duplicate payout requests rejected idempotently. CF-16-3.',
      'IR-2: payoutVaultRef ONLY stored in marketplace-payouts index. ' +
        'bankAccountNumber, IBAN, routingNumber, sortCode NEVER stored — PCI DSS. CF-16-3.',
      'IR-3: storeDocument(audit) via IAuditTrailService BEFORE PayoutCompleted emit. DNA-8. CF-16-3.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'SetnxPayoutLock',
          description:
            'SETNX(payout-lock:{orderId}) — reject duplicate payout attempts idempotently',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ResolveVaultRef',
          description:
            'IPayoutVaultService.resolveRef(sellerId) — returns payoutVaultRef, never raw credentials',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'StorePayout',
          description:
            'storeDocument(marketplace-payouts, {orderId, sellerId, amountCents, currency, payoutVaultRef, status:PENDING})',
          ironRuleRef: 'IR-2',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before PayoutCompleted emit',
          ironRuleRef: 'IR-3',
        },
        {
          order: 5,
          name: 'EmitPayoutCompleted',
          description: 'enqueue(PayoutCompleted) — only after storeDocument confirms',
          ironRuleRef: 'IR-3',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1536',
        interfaceName: 'IPayoutVaultService',
        fabricType: FabricType.DATABASE,
        description:
          'Payout vault ref resolution — returns opaque ref, never returns raw credentials',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'PayoutCompleted / PayoutFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-16-14',
        description: 'SETNX payout lock at ORDER 1 before any storeDocument (IR-1)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-16-15',
        description:
          'payoutVaultRef only — bankAccountNumber/IBAN/routingNumber/sortCode never stored (IR-2)',
        severity: 'error',
        checkType: 'vault_ref_only',
      },
      {
        gateId: 'QG-16-16',
        description: 'storeDocument(audit) before PayoutCompleted emit (IR-3, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    bfaRegistration: {
      entities: ['marketplace_payout', 'payout_audit'],
      events: ['payout.completed', 'payout.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'PAYOUT_SETNX_IDEMPOTENCY: SETNX(payout-lock:{orderId}) at ORDER 1 — duplicate payout rejected (CF-16-3)',
      'VAULT_REF_ONLY: payoutVaultRef stored — bankAccountNumber/IBAN/routingNumber/sortCode never stored (CF-16-3)',
      'PII_SCRUB_PAYOUT: IPayoutVaultService returns opaque ref; raw credentials never enter engine memory (CF-16-3)',
      'Outbox: storeDocument(audit) before PayoutCompleted enqueue (DNA-8)',
    ],

    freedomComponents: [],
  });
}

// ── Contract factories array (for bootstrapper wiring) ──────────────────────

export const MARKETPLACE_PAYMENTS_NEW_CONTRACT_FACTORIES = [
  createMarketplaceCheckoutGatewayContract,
  createMarketplacePaymentSplitterContract,
  createMarketplaceEscrowControllerContract,
  createSellerPayoutWriterContract,
];

export const MARKETPLACE_PAYMENTS_NEW_CONTRACT_DESCRIPTORS =
  MARKETPLACE_PAYMENTS_NEW_CONTRACT_FACTORIES.map((f) => {
    const c = f();
    return {
      taskTypeId: c.taskTypeId,
      name: c.name,
      flowId: c.flowId,
      version: 'v1',
    };
  });
