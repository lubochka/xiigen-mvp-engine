// file: server/src/engine/compensation/t221-saga.definition.ts
// T221 Checkout Saga step definitions.
// LIFO compensation order is SACRED.

import { SagaStep } from './compensation-chain-executor.interface';

/**
 * T221 Saga Steps — LIFO compensation order is SACRED.
 *
 * Forward:
 *   S1 LockCart → S2 HoldCoupon → S3 ReserveInventory → S4 AuthorizePayment → S5 ConfirmOrder
 *
 * LIFO Compensation (if failure at S4):
 *   C4 VoidPaymentAuth → C3 ReleaseInventory → C2 ReleaseCouponHold → C1 UnlockCart
 *
 * S5 ConfirmOrder has NO compensation — it is the terminal commit step.
 * Steps S1-S4 all have compensation handlers.
 */
export function buildT221SagaSteps(context: {
  cartId: string;
  couponCode?: string;
  inventoryReservationId: string;
  paymentMethodToken: string;
  orderId: string;
  amount: number;
  cartService: {
    lockCart: (id: string) => Promise<{ lockId: string }>;
    unlockCart: (id: string) => Promise<void>;
  };
  couponService: {
    holdCoupon: (code: string) => Promise<{ holdId: string }>;
    releaseCouponHold: (code: string) => Promise<void>;
  };
  inventoryService: {
    reserve: (id: string) => Promise<{ id: string }>;
    releaseReservation: (id: string) => Promise<void>;
  };
  paymentAuthService: {
    authorize: (req: Record<string, unknown>) => Promise<{ authId: string; status: string }>;
    void: (req: Record<string, unknown>) => Promise<void>;
  };
  orderService: { confirm: (id: string) => Promise<{ confirmedAt: string }> };
}): SagaStep[] {
  return [
    {
      name: 'S1:LockCart',
      execute: async () => {
        const result = await context.cartService.lockCart(context.cartId);
        return { cartLockId: result.lockId };
      },
      compensate: async () => {
        // C1: UnlockCart
        await context.cartService.unlockCart(context.cartId);
      },
    },
    {
      name: 'S2:HoldCoupon',
      execute: async () => {
        if (!context.couponCode) return { couponHeld: false };
        const result = await context.couponService.holdCoupon(context.couponCode);
        return { couponHoldId: result.holdId };
      },
      compensate: async () => {
        // C2: ReleaseCouponHold
        if (context.couponCode) {
          await context.couponService.releaseCouponHold(context.couponCode);
        }
      },
    },
    {
      name: 'S3:ReserveInventory',
      execute: async () => {
        const result = await context.inventoryService.reserve(context.inventoryReservationId);
        return { reservationId: result.id };
      },
      compensate: async () => {
        // C3: ReleaseInventory
        await context.inventoryService.releaseReservation(context.inventoryReservationId);
      },
    },
    {
      name: 'S4:AuthorizePayment',
      execute: async () => {
        const result = await context.paymentAuthService.authorize({
          amount: context.amount,
          paymentMethodToken: context.paymentMethodToken,
          orderId: context.orderId,
        });
        return { authId: result.authId, status: result.status };
      },
      compensate: async () => {
        // C4: VoidPaymentAuth — this runs FIRST in LIFO compensation
        await context.paymentAuthService.void({ orderId: context.orderId });
      },
    },
    {
      name: 'S5:ConfirmOrder',
      execute: async () => {
        const result = await context.orderService.confirm(context.orderId);
        return { confirmedAt: result.confirmedAt };
      },
      compensate: async () => {
        // S5 has no compensation — order confirmation is the terminal commit
        // If S5 fails after auth, C4 will still run (S4 completed successfully)
      },
    },
  ];
}
