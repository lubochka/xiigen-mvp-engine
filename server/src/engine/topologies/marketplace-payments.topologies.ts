// file: server/src/engine/topologies/flow-16.topologies.ts
// FLOW-16 topology definitions for T219-T226.

import { TaskTopology } from './topology.types';

// ── T219 — BuyerKycVerification ───────────────────────────────────────────────

export const T219_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T219',
  variant: 'action-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'FetchBuyerProfile', canWrite: false },
    { id: 'n2', type: 'action', label: 'SubmitToKycProvider', canWrite: false },
    { id: 'n3', type: 'decision', label: 'KycDecision', canWrite: false },
    { id: 'n4', type: 'action', label: 'RecordKycApproved', canWrite: true },
    { id: 'n5', type: 'action', label: 'RecordKycRejected', canWrite: true },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward' },
    { from: 'n3', to: 'n4', type: 'forward' }, // approved branch
    { from: 'n3', to: 'n5', type: 'forward' }, // rejected branch
    { from: 'n4', to: 'n1', type: 'event-trigger' }, // kyc.buyer.verified
    { from: 'n5', to: 'n1', type: 'event-trigger' }, // kyc.buyer.rejected
  ],
};

// ── T220 — SellerKycVerification ──────────────────────────────────────────────

export const T220_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T220',
  variant: 'action-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'FetchSellerProfile', canWrite: false },
    { id: 'n2', type: 'action', label: 'SubmitToKycProvider', canWrite: false },
    { id: 'n3', type: 'decision', label: 'KycDecision', canWrite: false },
    { id: 'n4', type: 'action', label: 'RecordSellerKycApproved', canWrite: true },
    { id: 'n5', type: 'action', label: 'RecordSellerKycRejected', canWrite: true },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward' },
    { from: 'n3', to: 'n4', type: 'forward' },
    { from: 'n3', to: 'n5', type: 'forward' },
    { from: 'n4', to: 'n1', type: 'event-trigger' }, // kyc.seller.verified
  ],
};

// ── T221 — CheckoutSaga (Saga Sequential + Compensation Branches) ─────────────

export const T221_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T221',
  variant: 'saga-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    // Forward saga steps
    { id: 'S1', type: 'saga-step', label: 'LockCart', canWrite: true },
    { id: 'S2', type: 'saga-step', label: 'HoldCoupon', canWrite: true },
    { id: 'S3', type: 'saga-step', label: 'ReserveInventory', canWrite: true },
    { id: 'S4', type: 'saga-step', label: 'AuthorizePayment', canWrite: true },
    { id: 'S5', type: 'saga-step', label: 'ConfirmOrder', canWrite: true },
    // Compensation nodes (LIFO)
    { id: 'C1', type: 'action', label: 'UnlockCart', canWrite: true, compensationTarget: 'S1' },
    {
      id: 'C2',
      type: 'action',
      label: 'ReleaseCouponHold',
      canWrite: true,
      compensationTarget: 'S2',
    },
    {
      id: 'C3',
      type: 'action',
      label: 'ReleaseInventory',
      canWrite: true,
      compensationTarget: 'S3',
    },
    {
      id: 'C4',
      type: 'action',
      label: 'VoidPaymentAuth',
      canWrite: true,
      compensationTarget: 'S4',
    },
    // Note: C5 does not exist — S5 ConfirmOrder is terminal, no compensation
  ],
  edges: [
    // Forward path
    { from: 'S1', to: 'S2', type: 'forward' },
    { from: 'S2', to: 'S3', type: 'forward' },
    { from: 'S3', to: 'S4', type: 'forward' },
    { from: 'S4', to: 'S5', type: 'forward' },
    // Compensation branches (triggered on failure at each step)
    { from: 'S1', to: 'C1', type: 'compensation' },
    { from: 'S2', to: 'C2', type: 'compensation' },
    { from: 'S3', to: 'C3', type: 'compensation' },
    { from: 'S4', to: 'C4', type: 'compensation' },
    // LIFO compensation chain
    { from: 'C4', to: 'C3', type: 'compensation' },
    { from: 'C3', to: 'C2', type: 'compensation' },
    { from: 'C2', to: 'C1', type: 'compensation' },
    // Post-confirm event trigger
    { from: 'S5', to: 'S1', type: 'event-trigger' }, // checkout.order.confirmed → T222
  ],
};

// ── T222 — OrderConfirmation ──────────────────────────────────────────────────

export const T222_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T222',
  variant: 'action-sequential',
  parallelismAllowed: true, // buyer + seller notifications can be parallel
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'NotifyBuyer', canWrite: false },
    { id: 'n2', type: 'action', label: 'NotifySeller', canWrite: false },
    { id: 'n3', type: 'action', label: 'RecordConfirmation', canWrite: true },
  ],
  edges: [
    { from: 'n1', to: 'n3', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward' },
  ],
};

// ── T223 — DisputeInitiation ──────────────────────────────────────────────────

export const T223_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T223',
  variant: 'action-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'ValidateDisputeEligibility', canWrite: false },
    { id: 'n2', type: 'action', label: 'RecordDispute', canWrite: true },
    { id: 'n3', type: 'action', label: 'FreezeSellerPayout', canWrite: true }, // CF-262 synchronous
    { id: 'n4', type: 'action', label: 'NotifySellerOfDispute', canWrite: false },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward', synchronous: true }, // CF-262
    { from: 'n3', to: 'n4', type: 'forward' },
  ],
};

// ── T224 — PaymentCapture ─────────────────────────────────────────────────────

export const T224_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T224',
  variant: 'action-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'ValidateAuthorizationExists', canWrite: false },
    { id: 'n2', type: 'action', label: 'RegisterIdempotencyKey', canWrite: false },
    { id: 'n3', type: 'action', label: 'CapturePayment', canWrite: true },
    { id: 'n4', type: 'action', label: 'RecordCaptureOutbox', canWrite: true },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward' },
    { from: 'n3', to: 'n4', type: 'forward' },
  ],
};

// ── T225 — PayoutRelease ──────────────────────────────────────────────────────

export const T225_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T225',
  variant: 'action-sequential',
  parallelismAllowed: false,
  writePermitted: true,
  nodes: [
    { id: 'n1', type: 'action', label: 'ValidateKycCompleted', canWrite: false },
    { id: 'n2', type: 'action', label: 'CheckDisputeWindowClosed', canWrite: false },
    { id: 'n3', type: 'action', label: 'HoldPayout', canWrite: true },
    { id: 'n4', type: 'action', label: 'NotifySellerPayoutHeld', canWrite: false }, // CF-265 synchronous
    { id: 'n5', type: 'action', label: 'ReleasePayout', canWrite: true },
    { id: 'n6', type: 'action', label: 'RecordPayoutOutbox', canWrite: true },
  ],
  edges: [
    { from: 'n1', to: 'n2', type: 'forward' },
    { from: 'n2', to: 'n3', type: 'forward' },
    { from: 'n3', to: 'n4', type: 'forward', synchronous: true }, // CF-265
    { from: 'n4', to: 'n5', type: 'forward' },
    { from: 'n5', to: 'n6', type: 'forward' },
  ],
};

// ── T226 — MarketplaceAnalyticsQuery (Read-Only Terminal) ─────────────────────

export const T226_TOPOLOGY: TaskTopology = {
  taskTypeId: 'T226',
  variant: 'read-only-terminal',
  parallelismAllowed: true, // multiple analytics queries can run in parallel
  writePermitted: false, // CF-268: NO write operations
  nodes: [
    {
      id: 'n1',
      type: 'read-only',
      label: 'ExecuteAnalyticsQuery',
      canWrite: false,
    },
  ],
  edges: [], // terminal node — no outgoing edges permitted
};

// ── Registry Export ───────────────────────────────────────────────────────────

export const FLOW_16_TOPOLOGIES: Record<string, TaskTopology> = {
  T219: T219_TOPOLOGY,
  T220: T220_TOPOLOGY,
  T221: T221_TOPOLOGY,
  T222: T222_TOPOLOGY,
  T223: T223_TOPOLOGY,
  T224: T224_TOPOLOGY,
  T225: T225_TOPOLOGY,
  T226: T226_TOPOLOGY,
};
