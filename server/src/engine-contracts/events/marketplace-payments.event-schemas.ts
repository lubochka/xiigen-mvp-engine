// file: server/src/engine-contracts/events/flow-16.event-schemas.ts
// FLOW-16 CloudEvent schemas — 28 schemas for T219-T226.
// PII Rules: no paymentMethodToken, no amount, no payoutAmount in data fields.

export interface EventSchemaField {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'object' | 'array';
  required: boolean;
  piiSensitive?: boolean;
  description: string;
}

export interface Flow16EventSchema {
  eventType: string;
  taskTypeId: string;
  description: string;
  requiredFields: string[]; // always the 8 mandatory fields
  dataFields: EventSchemaField[];
  prohibitedFields: string[]; // PII violations
}

const REQUIRED_8 = [
  'eventType',
  'flowId',
  'correlationId',
  'tenantId',
  'timestamp',
  'source',
  'traceparent',
  'data',
];

// ── Group 1: KYC Events (T219, T220) — 6 schemas ─────────────────────────────

export const EVT_KYC_BUYER_VERIFICATION_SUBMITTED: Flow16EventSchema = {
  eventType: 'kyc.buyer.verification.submitted',
  taskTypeId: 'T219',
  description: 'Buyer has submitted identity documents for KYC verification.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer subject ID' },
    {
      name: 'documentVaultRef',
      type: 'string',
      required: true,
      description: 'Secure vault reference for documents',
    },
    {
      name: 'verificationId',
      type: 'string',
      required: true,
      description: 'Platform-assigned verification ID',
    },
  ],
  prohibitedFields: ['documentContent', 'documentBytes', 'ssn', 'dateOfBirth'],
};

export const EVT_KYC_BUYER_VERIFIED: Flow16EventSchema = {
  eventType: 'kyc.buyer.verified',
  taskTypeId: 'T219',
  description: 'Buyer KYC verification approved. No sanctions match.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer subject ID' },
    { name: 'verificationId', type: 'string', required: true, description: 'Verification ID' },
    {
      name: 'approvedAt',
      type: 'string',
      required: true,
      description: 'ISO timestamp of approval',
    },
  ],
  prohibitedFields: ['documentContent', 'kycScore', 'sanctionsListContent'],
};

export const EVT_KYC_BUYER_REJECTED: Flow16EventSchema = {
  eventType: 'kyc.buyer.rejected',
  taskTypeId: 'T219',
  description: 'Buyer KYC verification rejected or sanctions match found.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer subject ID' },
    { name: 'verificationId', type: 'string', required: true, description: 'Verification ID' },
    {
      name: 'rejectedAt',
      type: 'string',
      required: true,
      description: 'ISO timestamp of rejection',
    },
    {
      name: 'sanctionsMatch',
      type: 'boolean',
      required: true,
      description: 'Whether a sanctions match was found',
    },
  ],
  prohibitedFields: ['sanctionsListContent', 'rejectionReason', 'documentContent'],
};

export const EVT_KYC_SELLER_VERIFICATION_SUBMITTED: Flow16EventSchema = {
  eventType: 'kyc.seller.verification.submitted',
  taskTypeId: 'T220',
  description: 'Seller has submitted identity documents for KYC verification.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'sellerId', type: 'string', required: true, description: 'Seller subject ID' },
    {
      name: 'documentVaultRef',
      type: 'string',
      required: true,
      description: 'Secure vault reference',
    },
    { name: 'verificationId', type: 'string', required: true, description: 'Verification ID' },
  ],
  prohibitedFields: ['documentContent', 'documentBytes', 'ssn', 'taxId'],
};

export const EVT_KYC_SELLER_VERIFIED: Flow16EventSchema = {
  eventType: 'kyc.seller.verified',
  taskTypeId: 'T220',
  description: 'Seller KYC verification approved.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'sellerId', type: 'string', required: true, description: 'Seller subject ID' },
    { name: 'verificationId', type: 'string', required: true, description: 'Verification ID' },
    { name: 'approvedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['kycScore', 'documentContent'],
};

export const EVT_KYC_SELLER_REJECTED: Flow16EventSchema = {
  eventType: 'kyc.seller.rejected',
  taskTypeId: 'T220',
  description: 'Seller KYC verification rejected.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'sellerId', type: 'string', required: true, description: 'Seller subject ID' },
    { name: 'verificationId', type: 'string', required: true, description: 'Verification ID' },
    { name: 'rejectedAt', type: 'string', required: true, description: 'ISO timestamp' },
    {
      name: 'sanctionsMatch',
      type: 'boolean',
      required: true,
      description: 'Sanctions match flag',
    },
  ],
  prohibitedFields: ['rejectionReason', 'documentContent', 'taxId'],
};

// ── Group 2: Checkout Saga Events (T221) — 8 schemas ─────────────────────────

export const EVT_CHECKOUT_CART_LOCKED: Flow16EventSchema = {
  eventType: 'checkout.cart.locked',
  taskTypeId: 'T221',
  description: 'Cart locked at S1 of checkout saga.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'cartId', type: 'string', required: true, description: 'Cart ID' },
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'lockedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['cartContents', 'priceBreakdown'],
};

export const EVT_CHECKOUT_COUPON_HELD: Flow16EventSchema = {
  eventType: 'checkout.coupon.held',
  taskTypeId: 'T221',
  description: 'Coupon held at S2 of checkout saga.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'couponCode', type: 'string', required: true, description: 'Coupon code' },
    { name: 'heldAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['discountAmount', 'priceBreakdown'],
};

export const EVT_CHECKOUT_INVENTORY_RESERVED: Flow16EventSchema = {
  eventType: 'checkout.inventory.reserved',
  taskTypeId: 'T221',
  description: 'Inventory reserved at S3 of checkout saga.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'reservationId', type: 'string', required: true, description: 'Reservation ID' },
    { name: 'reservedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['stockLevel', 'warehouseLocation'],
};

export const EVT_CHECKOUT_PAYMENT_AUTHORIZED: Flow16EventSchema = {
  eventType: 'checkout.payment.authorized',
  taskTypeId: 'T221',
  description: 'Payment authorized at S4 of checkout saga.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'authId', type: 'string', required: true, description: 'Authorization ID' },
    { name: 'authorizedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['paymentMethodToken', 'paymentMethodTokenHash', 'amount', 'cardNumber'],
};

export const EVT_CHECKOUT_ORDER_CONFIRMED: Flow16EventSchema = {
  eventType: 'checkout.order.confirmed',
  taskTypeId: 'T221',
  description: 'Order confirmed at S5 (terminal commit). Triggers T222.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'confirmedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['paymentMethodToken', 'amount', 'payoutAmount'],
};

export const EVT_CHECKOUT_SAGA_COMPENSATED: Flow16EventSchema = {
  eventType: 'checkout.saga.compensated',
  taskTypeId: 'T221',
  description: 'Checkout saga compensation completed (partial or full rollback).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    {
      name: 'failedAtStep',
      type: 'string',
      required: true,
      description: 'Step name where failure occurred',
    },
    {
      name: 'compensatedSteps',
      type: 'array',
      required: true,
      description: 'List of compensated step names (LIFO order)',
    },
    { name: 'compensatedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['paymentMethodToken', 'amount'],
};

export const EVT_CHECKOUT_CART_UNLOCKED: Flow16EventSchema = {
  eventType: 'checkout.cart.unlocked',
  taskTypeId: 'T221',
  description: 'Cart unlocked during saga compensation (C1).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'cartId', type: 'string', required: true, description: 'Cart ID' },
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'unlockedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['cartContents'],
};

export const EVT_CHECKOUT_PAYMENT_VOIDED: Flow16EventSchema = {
  eventType: 'checkout.payment.voided',
  taskTypeId: 'T221',
  description: 'Payment authorization voided during saga compensation (C4).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    {
      name: 'authId',
      type: 'string',
      required: true,
      description: 'Authorization ID that was voided',
    },
    { name: 'voidedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['paymentMethodToken', 'amount', 'cardNumber'],
};

// ── Group 3: Order Confirmation Events (T222) — 2 schemas ────────────────────

export const EVT_ORDER_BUYER_NOTIFIED: Flow16EventSchema = {
  eventType: 'order.buyer.notified',
  taskTypeId: 'T222',
  description: 'Buyer notified of order confirmation.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer ID' },
    { name: 'notifiedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'paymentDetails'],
};

export const EVT_ORDER_SELLER_NOTIFIED: Flow16EventSchema = {
  eventType: 'order.seller.notified',
  taskTypeId: 'T222',
  description: 'Seller notified of new order receipt.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'notifiedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'payoutAmount'],
};

// ── Group 4: Dispute Events (T223) — 4 schemas ────────────────────────────────

export const EVT_DISPUTE_BUYER_INITIATED: Flow16EventSchema = {
  eventType: 'dispute.buyer.initiated',
  taskTypeId: 'T223',
  description: 'Buyer initiated a dispute. Triggers synchronous seller payout freeze (CF-262).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'disputeId', type: 'string', required: true, description: 'Dispute reference ID' },
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'buyerId', type: 'string', required: true, description: 'Buyer ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'initiatedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['disputeAmount', 'paymentDetails'],
};

export const EVT_DISPUTE_SELLER_PAYOUT_FROZEN: Flow16EventSchema = {
  eventType: 'dispute.seller.payout.frozen',
  taskTypeId: 'T223',
  description: 'Seller payouts frozen after dispute initiation.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'disputeId', type: 'string', required: true, description: 'Dispute reference ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    {
      name: 'frozenPayoutIds',
      type: 'array',
      required: true,
      description: 'IDs of frozen payouts',
    },
    { name: 'frozenAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['frozenAmount', 'payoutAmounts'],
};

export const EVT_DISPUTE_RESOLVED_BUYER: Flow16EventSchema = {
  eventType: 'dispute.resolved.buyer.favor',
  taskTypeId: 'T223',
  description: 'Dispute resolved in buyer favor.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'disputeId', type: 'string', required: true, description: 'Dispute reference ID' },
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'resolvedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['refundAmount', 'paymentDetails'],
};

export const EVT_DISPUTE_RESOLVED_SELLER: Flow16EventSchema = {
  eventType: 'dispute.resolved.seller.favor',
  taskTypeId: 'T223',
  description: 'Dispute resolved in seller favor.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'disputeId', type: 'string', required: true, description: 'Dispute reference ID' },
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'resolvedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['payoutAmount', 'paymentDetails'],
};

// ── Group 5: Payment Capture Events (T224) — 2 schemas ───────────────────────

export const EVT_PAYMENT_CAPTURED: Flow16EventSchema = {
  eventType: 'payment.captured',
  taskTypeId: 'T224',
  description: 'Payment successfully captured after authorization.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    {
      name: 'chargeId',
      type: 'string',
      required: true,
      description: 'Charge ID from payment provider',
    },
    { name: 'capturedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['paymentMethodToken', 'amount', 'cardNumber'],
};

export const EVT_PAYMENT_REFUNDED: Flow16EventSchema = {
  eventType: 'payment.refunded',
  taskTypeId: 'T224',
  description: 'Payment refunded to buyer.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
    { name: 'refundId', type: 'string', required: true, description: 'Refund reference ID' },
    { name: 'refundedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['refundAmount', 'paymentMethodToken', 'cardNumber'],
};

// ── Group 6: Payout Events (T225) — 4 schemas ────────────────────────────────

export const EVT_PAYOUT_SELLER_HELD: Flow16EventSchema = {
  eventType: 'payout.seller.held',
  taskTypeId: 'T225',
  description: 'Seller payout placed on hold. PayoutHoldNotified fires synchronously (CF-265).',
  requiredFields: REQUIRED_8,
  dataFields: [
    {
      name: 'payoutId',
      type: 'string',
      required: true,
      description: 'Payout reference ID (no amount)',
    },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'holdReason', type: 'string', required: true, description: 'Hold reason enum value' },
    { name: 'heldAt', type: 'string', required: true, description: 'ISO timestamp' },
    // CRITICAL: amount is NOT here — PII rule
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'sellerBankAccount'],
};

export const EVT_PAYOUT_SELLER_HOLD_NOTIFIED: Flow16EventSchema = {
  eventType: 'payout.seller.hold.notified',
  taskTypeId: 'T225',
  description: 'Seller notified synchronously that payout is held (CF-265).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'payoutId', type: 'string', required: true, description: 'Payout reference ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'holdReason', type: 'string', required: true, description: 'Hold reason' },
    { name: 'notifiedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'sellerBankAccount'],
};

export const EVT_PAYOUT_SELLER_RELEASED: Flow16EventSchema = {
  eventType: 'payout.seller.released',
  taskTypeId: 'T225',
  description: 'Seller payout released after all conditions met.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'payoutId', type: 'string', required: true, description: 'Payout reference ID' },
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'releasedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'sellerBankAccount', 'accountNumber'],
};

export const EVT_PAYOUT_SELLER_FROZEN: Flow16EventSchema = {
  eventType: 'payout.seller.frozen',
  taskTypeId: 'T225',
  description: 'Seller all payouts frozen (compliance or dispute).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'sellerId', type: 'string', required: true, description: 'Seller ID' },
    { name: 'frozenPayoutIds', type: 'array', required: true, description: 'Frozen payout IDs' },
    { name: 'frozenAt', type: 'string', required: true, description: 'ISO timestamp' },
    {
      name: 'frozenBy',
      type: 'string',
      required: true,
      description: 'Who initiated freeze: DISPUTE | COMPLIANCE | PLATFORM',
    },
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'sellerBankAccount'],
};

// ── Group 7: Analytics Events (T226) — 2 schemas ─────────────────────────────

export const EVT_ANALYTICS_QUERY_EXECUTED: Flow16EventSchema = {
  eventType: 'analytics.query.executed',
  taskTypeId: 'T226',
  description: 'Analytics query executed (read-only, no PUBLISHED filter).',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'queryId', type: 'string', required: true, description: 'Query reference ID' },
    {
      name: 'resultCount',
      type: 'number',
      required: true,
      description: 'Number of results returned',
    },
    { name: 'executedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'paymentDetails', 'filterPublished'],
};

export const EVT_ANALYTICS_REPORT_GENERATED: Flow16EventSchema = {
  eventType: 'analytics.report.generated',
  taskTypeId: 'T226',
  description: 'Analytics report generated from marketplace data.',
  requiredFields: REQUIRED_8,
  dataFields: [
    { name: 'reportId', type: 'string', required: true, description: 'Report reference ID' },
    { name: 'reportType', type: 'string', required: true, description: 'Type of analytics report' },
    { name: 'generatedAt', type: 'string', required: true, description: 'ISO timestamp' },
  ],
  prohibitedFields: ['amount', 'payoutAmount', 'paymentDetails'],
};

// ── Schema Registry Export ────────────────────────────────────────────────────

export const FLOW_16_EVENT_SCHEMAS: Record<string, Flow16EventSchema> = {
  'kyc.buyer.verification.submitted': EVT_KYC_BUYER_VERIFICATION_SUBMITTED,
  'kyc.buyer.verified': EVT_KYC_BUYER_VERIFIED,
  'kyc.buyer.rejected': EVT_KYC_BUYER_REJECTED,
  'kyc.seller.verification.submitted': EVT_KYC_SELLER_VERIFICATION_SUBMITTED,
  'kyc.seller.verified': EVT_KYC_SELLER_VERIFIED,
  'kyc.seller.rejected': EVT_KYC_SELLER_REJECTED,
  'checkout.cart.locked': EVT_CHECKOUT_CART_LOCKED,
  'checkout.coupon.held': EVT_CHECKOUT_COUPON_HELD,
  'checkout.inventory.reserved': EVT_CHECKOUT_INVENTORY_RESERVED,
  'checkout.payment.authorized': EVT_CHECKOUT_PAYMENT_AUTHORIZED,
  'checkout.order.confirmed': EVT_CHECKOUT_ORDER_CONFIRMED,
  'checkout.saga.compensated': EVT_CHECKOUT_SAGA_COMPENSATED,
  'checkout.cart.unlocked': EVT_CHECKOUT_CART_UNLOCKED,
  'checkout.payment.voided': EVT_CHECKOUT_PAYMENT_VOIDED,
  'order.buyer.notified': EVT_ORDER_BUYER_NOTIFIED,
  'order.seller.notified': EVT_ORDER_SELLER_NOTIFIED,
  'dispute.buyer.initiated': EVT_DISPUTE_BUYER_INITIATED,
  'dispute.seller.payout.frozen': EVT_DISPUTE_SELLER_PAYOUT_FROZEN,
  'dispute.resolved.buyer.favor': EVT_DISPUTE_RESOLVED_BUYER,
  'dispute.resolved.seller.favor': EVT_DISPUTE_RESOLVED_SELLER,
  'payment.captured': EVT_PAYMENT_CAPTURED,
  'payment.refunded': EVT_PAYMENT_REFUNDED,
  'payout.seller.held': EVT_PAYOUT_SELLER_HELD,
  'payout.seller.hold.notified': EVT_PAYOUT_SELLER_HOLD_NOTIFIED,
  'payout.seller.released': EVT_PAYOUT_SELLER_RELEASED,
  'payout.seller.frozen': EVT_PAYOUT_SELLER_FROZEN,
  'analytics.query.executed': EVT_ANALYTICS_QUERY_EXECUTED,
  'analytics.report.generated': EVT_ANALYTICS_REPORT_GENERATED,
};

// ── Compliance Validator ──────────────────────────────────────────────────────

export function validateFlow16EventCompliance(schema: Flow16EventSchema): string[] {
  const violations: string[] = [];
  for (const field of REQUIRED_8) {
    if (!schema.requiredFields.includes(field)) {
      violations.push(`Missing required field: ${field}`);
    }
  }
  // PII check — globally prohibited field names
  const globallyProhibited = [
    'paymentMethodToken',
    'cardNumber',
    'ssn',
    'taxId',
    'amount',
    'payoutAmount',
  ];
  for (const field of schema.dataFields) {
    if (globallyProhibited.includes(field.name)) {
      violations.push(
        `PII VIOLATION: field '${field.name}' is globally prohibited in event payloads`,
      );
    }
  }
  return violations;
}
