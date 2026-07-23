/**
 * FLOW-16 Marketplace & Payments — EC-5 type extensions and task type contracts.
 * Task types: T219-T226 (Family 74)
 * BFA rules: CF-256 through CF-269
 */

// ── EC-5 Type Extensions ──────────────────────────────────────────────────────

export interface CompensationSagaDefinition {
  steps: Array<{
    name: string;
    forward: string; // method name on the generated service
    compensate: string; // compensation method name
  }>;
  lifoEnforced: true; // always true — LIFO is non-negotiable
}

export interface CrossTaskEventTrigger {
  onEvent: string; // CloudEvent type that triggers
  targetTaskType: string; // task type that handles it
  synchronous: boolean; // CF-265 pattern: synchronous = same handler
}

export interface ReadOnlyConstraint {
  description: string;
  prohibitedOperations: string[]; // e.g. ['write', 'update', 'delete']
  cfRule: string; // e.g. 'CF-267'
}

export interface EngineContractEC5Extension {
  ep5Required?: boolean;
  dna9Required?: boolean;
  compensationSaga?: CompensationSagaDefinition;
  crossTaskEventTriggers?: CrossTaskEventTrigger[];
  prohibitedImports?: string[]; // factory slots or module paths
  readOnlyConstraints?: ReadOnlyConstraint[];
}

// ── T219 — BuyerKycVerification ───────────────────────────────────────────────

export const T219_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T219',
  name: 'BuyerKycVerification',
  family: 74,
  flowId: 'FLOW-16',
  description:
    'Verify buyer identity and sanctions status before allowing purchase on marketplace.',
  dna9Required: true,
  ep5Required: false,
  crossTaskEventTriggers: [
    {
      onEvent: 'kyc.buyer.verified',
      targetTaskType: 'T221',
      synchronous: false,
    },
    {
      onEvent: 'kyc.buyer.rejected',
      targetTaskType: 'T220',
      synchronous: false,
    },
  ],
  requiredFactories: ['F567'],
  bfaRules: ['CF-256', 'CF-257'],
};

// ── T220 — SellerKycVerification ──────────────────────────────────────────────

export const T220_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T220',
  name: 'SellerKycVerification',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Verify seller identity and sanctions status before allowing payout release.',
  dna9Required: true,
  ep5Required: false,
  crossTaskEventTriggers: [
    {
      onEvent: 'kyc.seller.verified',
      targetTaskType: 'T225',
      synchronous: false,
    },
  ],
  requiredFactories: ['F567'],
  bfaRules: ['CF-256', 'CF-258'],
};

// ── T221 — CheckoutSaga (Full EC-5) ───────────────────────────────────────────

export const T221_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T221',
  name: 'CheckoutSaga',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Five-step checkout saga with LIFO compensation. EP-5 and DNA-9 mandatory.',
  ep5Required: true,
  dna9Required: true,
  compensationSaga: {
    steps: [
      { name: 'S1:LockCart', forward: 'lockCart', compensate: 'unlockCart' },
      { name: 'S2:HoldCoupon', forward: 'holdCoupon', compensate: 'releaseCouponHold' },
      {
        name: 'S3:ReserveInventory',
        forward: 'reserveInventory',
        compensate: 'releaseReservation',
      },
      { name: 'S4:AuthorizePayment', forward: 'authorizePayment', compensate: 'voidPaymentAuth' },
      { name: 'S5:ConfirmOrder', forward: 'confirmOrder', compensate: '' }, // no compensation
    ],
    lifoEnforced: true,
  },
  crossTaskEventTriggers: [
    {
      onEvent: 'checkout.order.confirmed',
      targetTaskType: 'T222',
      synchronous: false,
    },
  ],
  requiredFactories: ['F571', 'F578', 'F579'],
  bfaRules: ['CF-259', 'CF-260', 'CF-261'],
};

// ── T222 — OrderConfirmation ──────────────────────────────────────────────────

export const T222_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T222',
  name: 'OrderConfirmation',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Order confirmation notifications and seller order receipt.',
  ep5Required: true,
  dna9Required: false,
  requiredFactories: ['F579'],
  bfaRules: ['CF-259'],
};

// ── T223 — DisputeInitiation ──────────────────────────────────────────────────

export const T223_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T223',
  name: 'DisputeInitiation',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Buyer initiates dispute — triggers seller payout freeze (CF-262).',
  ep5Required: false,
  dna9Required: false,
  crossTaskEventTriggers: [
    {
      onEvent: 'dispute.buyer.initiated',
      targetTaskType: 'T225',
      synchronous: true, // CF-262: payout freeze is synchronous
    },
  ],
  bfaRules: ['CF-262', 'CF-263'],
};

// ── T224 — PaymentCapture ─────────────────────────────────────────────────────

export const T224_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T224',
  name: 'PaymentCapture',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Capture authorized payment after order fulfillment confirmation.',
  ep5Required: true,
  dna9Required: true,
  requiresCompletedTask: 'T221',
  requiredFactories: ['F571', 'F578', 'F579'],
  bfaRules: ['CF-264'],
};

// ── T225 — PayoutRelease ──────────────────────────────────────────────────────

export const T225_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T225',
  name: 'PayoutRelease',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Release held payout to seller after KYC + dispute window + payment capture.',
  ep5Required: true,
  dna9Required: true,
  requiresCompletedTask: 'T220',
  crossTaskEventTriggers: [
    {
      onEvent: 'payout.seller.held',
      targetTaskType: 'T225',
      synchronous: true, // CF-265: PayoutHoldNotified is synchronous
    },
  ],
  requiredFactories: ['F575', 'F578', 'F579'],
  bfaRules: ['CF-265', 'CF-266'],
};

// ── T226 — MarketplaceAnalyticsQuery (Strictest Read-Only) ────────────────────

export const T226_CONTRACT: Record<string, unknown> & EngineContractEC5Extension = {
  taskTypeId: 'T226',
  name: 'MarketplaceAnalyticsQuery',
  family: 74,
  flowId: 'FLOW-16',
  description: 'Read-only analytics queries for marketplace performance data.',
  ep5Required: false,
  dna9Required: false,
  prohibitedImports: [
    'F234', // CF-268: zero F234 imports = build failure
    '@elastic/elasticsearch', // no direct ES SDK import
  ],
  readOnlyConstraints: [
    {
      description: 'No PUBLISHED filter allowed on T226 queries',
      prohibitedOperations: ['filterByPublished', 'statusFilter:PUBLISHED'],
      cfRule: 'CF-267',
    },
    {
      description: 'No write operations permitted in analytics task',
      prohibitedOperations: ['write', 'update', 'delete', 'insert'],
      cfRule: 'CF-268',
    },
  ],
  bfaRules: ['CF-267', 'CF-268', 'CF-269'],
};

// ── Registry Export ───────────────────────────────────────────────────────────

export const FLOW_16_CONTRACTS: Record<string, Record<string, unknown>> = {
  T219: T219_CONTRACT,
  T220: T220_CONTRACT,
  T221: T221_CONTRACT,
  T222: T222_CONTRACT,
  T223: T223_CONTRACT,
  T224: T224_CONTRACT,
  T225: T225_CONTRACT,
  T226: T226_CONTRACT,
};
