/**
 * FLOW-34 — ST1 Stripe Payment Intelligence Adapter Tests
 * 26 tests: ST1-R-1..10, ST1-W-1..8, ST1-E-1..4, ST1-P-1..4
 */

import {
  mapStripeToPaymentElement,
  mapStripeToPaymentStyle,
  mapPaymentStyleToStripe,
  readPaymentEvents,
  writePaymentInsights,
} from '../../../adapters/stripe/FT-ST1/src/stripe-adapter';
import type {
  StripePaymentEvent,
  SharedPaymentElement,
  SharedPaymentStyle,
} from '../../../adapters/stripe/FT-ST1/src/types';

function makeStripeEvent(overrides: Partial<StripePaymentEvent> = {}): StripePaymentEvent {
  return {
    id: 'ch-001',
    type: 'charge',
    amount: 9900,
    currency: 'usd',
    status: 'succeeded',
    customerId: 'cus-001',
    description: 'XIIGen Pro Monthly',
    created: 1711152000,
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedPaymentElement = {
  type: 'PAYMENT',
  amount: 9900,
  currency: 'usd',
  description: 'XIIGen Pro Monthly',
  customerId: 'cus-001',
};
const CANONICAL_STYLE: SharedPaymentStyle = {
  status: 'SUCCESS',
  paymentType: 'PAYMENT',
  isRecurring: false,
};
const GENERATED_INSIGHT = 'Successful one-time charge: $99.00 USD from customer cus-001';

// ── READ: mapStripeToPaymentElement (ST1-R-1..5) ──────────────────────────────

describe('FLOW-34 ST1 — READ path: mapStripeToPaymentElement', () => {
  it('ST1-R-1: charge → PAYMENT', () => {
    expect(mapStripeToPaymentElement(makeStripeEvent({ type: 'charge' })).type).toBe('PAYMENT');
  });
  it('ST1-R-2: subscription→SUBSCRIPTION, invoice→INVOICE, payment_intent→INTENT, customer→CUSTOMER', () => {
    expect(mapStripeToPaymentElement(makeStripeEvent({ type: 'subscription' })).type).toBe(
      'SUBSCRIPTION',
    );
    expect(mapStripeToPaymentElement(makeStripeEvent({ type: 'invoice' })).type).toBe('INVOICE');
    expect(mapStripeToPaymentElement(makeStripeEvent({ type: 'payment_intent' })).type).toBe(
      'INTENT',
    );
    expect(mapStripeToPaymentElement(makeStripeEvent({ type: 'customer' })).type).toBe('CUSTOMER');
  });
  it('ST1-R-3: amount preserved', () => {
    expect(mapStripeToPaymentElement(makeStripeEvent({ amount: 9900 })).amount).toBe(9900);
  });
  it('ST1-R-4: currency preserved', () => {
    expect(mapStripeToPaymentElement(makeStripeEvent({ currency: 'usd' })).currency).toBe('usd');
  });
  it('ST1-R-5: customerId preserved', () => {
    expect(mapStripeToPaymentElement(makeStripeEvent({ customerId: 'cus-001' })).customerId).toBe(
      'cus-001',
    );
  });
});

// ── READ: mapStripeToPaymentStyle (ST1-R-6..10) ───────────────────────────────

describe('FLOW-34 ST1 — READ path: mapStripeToPaymentStyle', () => {
  it('ST1-R-6: succeeded → SUCCESS', () => {
    expect(mapStripeToPaymentStyle(makeStripeEvent({ status: 'succeeded' })).status).toBe(
      'SUCCESS',
    );
  });
  it('ST1-R-7: pending→PENDING, failed→FAILED, canceled→CANCELED', () => {
    expect(mapStripeToPaymentStyle(makeStripeEvent({ status: 'pending' })).status).toBe('PENDING');
    expect(mapStripeToPaymentStyle(makeStripeEvent({ status: 'failed' })).status).toBe('FAILED');
    expect(mapStripeToPaymentStyle(makeStripeEvent({ status: 'canceled' })).status).toBe(
      'CANCELED',
    );
  });
  it('ST1-R-8: charge → isRecurring false', () => {
    expect(mapStripeToPaymentStyle(makeStripeEvent({ type: 'charge' })).isRecurring).toBe(false);
  });
  it('ST1-R-9: subscription → isRecurring true', () => {
    expect(mapStripeToPaymentStyle(makeStripeEvent({ type: 'subscription' })).isRecurring).toBe(
      true,
    );
  });
  it('ST1-R-10: description preserved in element', () => {
    expect(
      mapStripeToPaymentElement(makeStripeEvent({ description: 'XIIGen Pro Monthly' })).description,
    ).toBe('XIIGen Pro Monthly');
  });
});

// ── WRITE: mapPaymentStyleToStripe (ST1-W-1..4) ───────────────────────────────

describe('FLOW-34 ST1 — WRITE path: mapPaymentStyleToStripe', () => {
  it('ST1-W-1: PAYMENT → charge type, SUCCESS → succeeded status', () => {
    const out = mapPaymentStyleToStripe({
      paymentType: 'PAYMENT',
      status: 'SUCCESS',
      isRecurring: false,
    });
    expect(out.type).toBe('charge');
    expect(out.status).toBe('succeeded');
  });
  it('ST1-W-2: SUBSCRIPTION→subscription, INVOICE→invoice, INTENT→payment_intent', () => {
    expect(
      mapPaymentStyleToStripe({ paymentType: 'SUBSCRIPTION', status: 'SUCCESS', isRecurring: true })
        .type,
    ).toBe('subscription');
    expect(
      mapPaymentStyleToStripe({ paymentType: 'INVOICE', status: 'PENDING', isRecurring: false })
        .type,
    ).toBe('invoice');
    expect(
      mapPaymentStyleToStripe({ paymentType: 'INTENT', status: 'PENDING', isRecurring: false })
        .type,
    ).toBe('payment_intent');
  });
  it('ST1-W-3: writer called once, written=1, failed=0', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writePaymentInsights(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedInsight: GENERATED_INSIGHT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('ST1-W-4: payload has type=PAYMENT_INSIGHT, amount, currency, paymentType, status, insight, isRecurring', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writePaymentInsights(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedInsight: GENERATED_INSIGHT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('PAYMENT_INSIGHT');
    expect(payload['amount']).toBe(9900);
    expect(payload['currency']).toBe('usd');
    expect(payload['paymentType']).toBe('PAYMENT');
    expect(payload['status']).toBe('SUCCESS');
    expect(payload['insight']).toBe(GENERATED_INSIGHT);
    expect(payload['isRecurring']).toBe(false);
  });
});

// ── WRITE: writePaymentInsights (ST1-W-5..8) ──────────────────────────────────

describe('FLOW-34 ST1 — WRITE path: writePaymentInsights (injected writer)', () => {
  it('ST1-W-5: writer failure → failed=1, no throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Stripe API error'));
    const result = await writePaymentInsights(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedInsight: GENERATED_INSIGHT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('ST1-W-6: writes multiple items in order', async () => {
    const amounts: number[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      amounts.push(p['amount'] as number);
    });
    await writePaymentInsights(
      [
        {
          element: { ...CANONICAL_ELEMENT, amount: 1000 },
          style: CANONICAL_STYLE,
          generatedInsight: GENERATED_INSIGHT,
        },
        {
          element: { ...CANONICAL_ELEMENT, amount: 2000 },
          style: CANONICAL_STYLE,
          generatedInsight: GENERATED_INSIGHT,
        },
      ],
      writer,
    );
    expect(amounts).toEqual([1000, 2000]);
  });
  it('ST1-W-7: PENDING → pending status in write payload', () => {
    const out = mapPaymentStyleToStripe({
      paymentType: 'PAYMENT',
      status: 'PENDING',
      isRecurring: false,
    });
    expect(out.status).toBe('pending');
  });
  it('ST1-W-8: CANCELED → canceled, FAILED → failed', () => {
    expect(
      mapPaymentStyleToStripe({ paymentType: 'PAYMENT', status: 'CANCELED', isRecurring: false })
        .status,
    ).toBe('canceled');
    expect(
      mapPaymentStyleToStripe({ paymentType: 'PAYMENT', status: 'FAILED', isRecurring: false })
        .status,
    ).toBe('failed');
  });
});

// ── Equivalence (ST1-E-1..4) ──────────────────────────────────────────────────

describe('FLOW-34 ST1 — Equivalence: adapter output = shared canonical', () => {
  const event = makeStripeEvent();
  it('ST1-E-1: mapStripeToPaymentElement output identical to CANONICAL_ELEMENT', () => {
    expect(mapStripeToPaymentElement(event)).toEqual(CANONICAL_ELEMENT);
  });
  it('ST1-E-2: mapStripeToPaymentStyle output identical to CANONICAL_STYLE', () => {
    expect(mapStripeToPaymentStyle(event)).toEqual(CANONICAL_STYLE);
  });
  it('ST1-E-3: readPaymentEvents elements[0]=CANONICAL_ELEMENT, styles[0]=CANONICAL_STYLE', () => {
    const { elements, styles } = readPaymentEvents([event]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('ST1-E-4: READ→WRITE round-trip: PAYMENT/SUCCESS → charge/succeeded', () => {
    const style = mapStripeToPaymentStyle(event);
    const back = mapPaymentStyleToStripe(style);
    expect(back.type).toBe('charge');
    expect(back.status).toBe('succeeded');
  });
});

// ── Packaging (ST1-P-1..4) ────────────────────────────────────────────────────

describe('FLOW-34 ST1 — Packaging + manifest checks', () => {
  it('ST1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapStripeToPaymentElement).toBe('function');
    expect(typeof mapStripeToPaymentStyle).toBe('function');
    expect(typeof mapPaymentStyleToStripe).toBe('function');
    expect(typeof readPaymentEvents).toBe('function');
    expect(typeof writePaymentInsights).toBe('function');
  });
  it('ST1-P-2: adapter importable without stripe SDK', () => {
    expect(mapStripeToPaymentElement).toBeDefined();
  });
  it('ST1-P-3: package.json name matches /^@xiigen\\/stripe-/', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/stripe/FT-ST1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/stripe-/);
  });
  it('ST1-P-4: FT-ST1 in manifest, stripe platform, MODE_B, path contains FT-ST1', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ft = manifest.features.find((f) => f.ftId === 'FT-ST1');
    expect(ft).toBeDefined();
    expect(ft!.portingCandidate).toBe(true);
    const platform = ft!.platforms.find((p) => p.platformId === 'stripe');
    expect(platform).toBeDefined();
    expect(platform!.adapterMode).toBe('MODE_B');
    expect(platform!.adapterPath).toContain('FT-ST1');
  });
});
