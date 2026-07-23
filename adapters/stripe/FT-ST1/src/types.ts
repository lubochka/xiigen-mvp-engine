// FT-ST1 — Stripe Payment Intelligence (UTILITY family)
// Platform: Stripe Apps Marketplace. ST prefix per master plan.

export interface StripePaymentEvent {
  id: string;
  type: 'charge' | 'subscription' | 'invoice' | 'payment_intent' | 'customer';
  amount?: number;     // in cents
  currency?: string;
  status: 'succeeded' | 'pending' | 'failed' | 'canceled';
  customerId?: string;
  description?: string;
  created: number;     // Unix timestamp
}

export interface SharedPaymentElement {
  type: 'PAYMENT' | 'SUBSCRIPTION' | 'INVOICE' | 'INTENT' | 'CUSTOMER';
  amount?: number;
  currency?: string;
  description?: string;
  customerId?: string;
}

export interface SharedPaymentStyle {
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELED';
  paymentType: 'PAYMENT' | 'SUBSCRIPTION' | 'INVOICE' | 'INTENT' | 'CUSTOMER';
  isRecurring: boolean;
}

export interface PaymentIntelligenceOutput {
  element: SharedPaymentElement;
  style: SharedPaymentStyle;
  generatedInsight: string;
}

export interface PaymentReadResult {
  elements: SharedPaymentElement[];
  styles: SharedPaymentStyle[];
  sourceEvents: StripePaymentEvent[];
}

export interface PaymentWriteResult {
  written: number;
  failed: number;
}
