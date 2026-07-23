// file: server/src/factories/platform/payment-authorization-service.interface.ts
// F571 — IPaymentAuthorizationService (PLATFORM-ONLY)
// DI token: PLATFORM_PAYMENT_AUTH_SERVICE

export const PLATFORM_PAYMENT_AUTH_SERVICE = Symbol('PLATFORM_PAYMENT_AUTH_SERVICE');

export type PaymentAuthStatus = 'AUTHORIZED' | 'DECLINED' | 'VOIDED' | 'CAPTURED' | 'REFUNDED';

export interface PaymentAuthRequest {
  orderId: string;
  amount: number;
  currency: string;
  /**
   * SHA-256 hash of the payment method token.
   * Never the raw token — PCI-DSS isolation.
   */
  paymentMethodTokenHash: string;
  correlationId: string;
  idempotencyKey: string; // DNA-9 required
}

export interface PaymentAuthResult {
  authId: string;
  orderId: string;
  status: PaymentAuthStatus;
  authorizedAt: string;
  expiresAt: string;
}

export interface PaymentCaptureRequest {
  authId: string;
  orderId: string;
  amount: number;
  idempotencyKey: string;
}

export interface PaymentVoidRequest {
  authId: string;
  orderId: string;
  reason: string;
  idempotencyKey: string;
}

export interface PaymentRefundRequest {
  chargeId: string;
  refundAmount: number;
  reason: string;
  idempotencyKey: string;
}

/**
 * F571 — IPaymentAuthorizationService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: PLATFORM_PAYMENT_AUTH_SERVICE
 *
 * IMPORTANT: paymentMethodToken must ALWAYS be SHA-256 hashed before passing.
 * Raw tokens are a PCI-DSS violation and will be rejected.
 *
 * All methods require an idempotencyKey (DNA-9 enforcement).
 */
export interface IPaymentAuthorizationService {
  /**
   * Authorize a payment amount. Does not capture funds.
   * Use IIdempotencyKeyRegistry to generate the idempotencyKey.
   */
  authorize(request: PaymentAuthRequest): Promise<PaymentAuthResult>;

  /**
   * Capture previously authorized funds.
   */
  capture(request: PaymentCaptureRequest): Promise<{ chargeId: string; capturedAt: string }>;

  /**
   * Void an authorization without capturing. T221 saga compensation C4.
   */
  void(request: PaymentVoidRequest): Promise<{ voidedAt: string }>;

  /**
   * Refund a captured charge.
   */
  refund(request: PaymentRefundRequest): Promise<{ refundId: string; refundedAt: string }>;

  /**
   * Get current status of an authorization.
   */
  getAuthStatus(
    authId: string,
  ): Promise<{ authId: string; status: PaymentAuthStatus; amount: number }>;
}

export const F571_FACTORY_DESCRIPTOR = {
  factoryId: 'F571',
  token: PLATFORM_PAYMENT_AUTH_SERVICE,
  interfaceName: 'IPaymentAuthorizationService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  bfaRules: ['CF-259', 'CF-264'],
};
