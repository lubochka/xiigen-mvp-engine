// FT-ST1 — Stripe Payment Intelligence — Layer 3: STACK_COUPLED

import type {
  StripePaymentEvent, SharedPaymentElement, SharedPaymentStyle,
  PaymentReadResult, PaymentIntelligenceOutput, PaymentWriteResult,
} from './types';

const EVENT_TYPE_MAP: Record<StripePaymentEvent['type'], SharedPaymentElement['type']> = {
  charge: 'PAYMENT', subscription: 'SUBSCRIPTION', invoice: 'INVOICE',
  payment_intent: 'INTENT', customer: 'CUSTOMER',
};

const STATUS_MAP: Record<StripePaymentEvent['status'], SharedPaymentStyle['status']> = {
  succeeded: 'SUCCESS', pending: 'PENDING', failed: 'FAILED', canceled: 'CANCELED',
};

export function mapStripeToPaymentElement(event: StripePaymentEvent): SharedPaymentElement {
  return {
    type: EVENT_TYPE_MAP[event.type],
    amount: event.amount,
    currency: event.currency,
    description: event.description,
    customerId: event.customerId,
  };
}

export function mapStripeToPaymentStyle(event: StripePaymentEvent): SharedPaymentStyle {
  return {
    status: STATUS_MAP[event.status],
    paymentType: EVENT_TYPE_MAP[event.type],
    isRecurring: event.type === 'subscription',
  };
}

export function mapPaymentStyleToStripe(style: SharedPaymentStyle): Partial<StripePaymentEvent> {
  const TYPE_BACK: Record<SharedPaymentStyle['paymentType'], StripePaymentEvent['type']> = {
    PAYMENT: 'charge', SUBSCRIPTION: 'subscription', INVOICE: 'invoice',
    INTENT: 'payment_intent', CUSTOMER: 'customer',
  };
  const STATUS_BACK: Record<SharedPaymentStyle['status'], StripePaymentEvent['status']> = {
    SUCCESS: 'succeeded', PENDING: 'pending', FAILED: 'failed', CANCELED: 'canceled',
  };
  return { type: TYPE_BACK[style.paymentType], status: STATUS_BACK[style.status] };
}

export function readPaymentEvents(events: StripePaymentEvent[]): PaymentReadResult {
  return {
    elements: events.map(mapStripeToPaymentElement),
    styles: events.map(mapStripeToPaymentStyle),
    sourceEvents: events,
  };
}

export async function writePaymentInsights(
  outputs: PaymentIntelligenceOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<PaymentWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapPaymentStyleToStripe(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'PAYMENT_INSIGHT',
        amount: output.element.amount,
        currency: output.element.currency,
        paymentType: output.style.paymentType,
        status: output.style.status,
        insight: output.generatedInsight,
        isRecurring: output.style.isRecurring,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
