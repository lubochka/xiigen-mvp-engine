/**
 * T210 SubscriptionLifecycleManager [ORCHESTRATION]
 * FLOW-12: Subscription & Recurring Billing
 *
 * Iron rules:
 *   IR-1: IPaymentFabricService.validate() at ORDER 1 — invalid → failure(PAYMENT_INVALID), no state write.
 *   IR-2: Plan status must be ACTIVE at ORDER 2 — non-ACTIVE → failure(PLAN_NOT_ACTIVE).
 *   IR-3: SETNX at ORDER 3 — key=hash(tenantId+subscriberId+planId). Duplicate → failure(ALREADY_SUBSCRIBED).
 *   IR-4: storeDocument(subscription) at ORDER 4 BEFORE enqueue(SubscriptionActivated). DNA-8.
 *   IR-5: paymentMethodId (vault ref) stored — paymentMethodToken (raw) NEVER stored anywhere.
 *   IR-6: IPaymentFabricService is REUSED from FLOW-09 — not a new provider registration.
 *   IR-7: trialDays > 0 → status=TRIALING, trialEndsAt set. trialDays === 0 → status=ACTIVE.
 *
 * Emits: SubscriptionActivated
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

interface IPaymentService {
  validate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

const SUBSCRIPTIONS_INDEX = 'xiigen-subscriptions';
const PLANS_INDEX = 'xiigen-subscription-plans';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

/**
 * Injection token for the FLOW-09 payment service (reused by FLOW-12).
 * This is the same provider registered by FLOW-09 — not a new registration.
 * CF-12-4: IPaymentFabricService is REUSED from FLOW-09.
 */
export const FLOW09_PAYMENT_SERVICE = Symbol('IPaymentFabricService:FLOW09');

@Injectable()
export class SubscriptionLifecycleManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
    @Inject(FLOW09_PAYMENT_SERVICE) private readonly paymentService: IPaymentService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T210',
        serviceName: 'SubscriptionLifecycleManagerService',
        flowId: 'FLOW-12',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    return this.tenantContext.get?.('tenant')?.tenantId ?? 'unknown';
  }

  async subscribe(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const subscriberId = event['subscriberId'] as string;
    const planId = event['planId'] as string;
    const paymentMethodId = event['paymentMethodId'] as string; // vault ref — IR-5

    // ORDER 1: Payment method validation — IR-1
    const paymentValidation = await this.paymentService.validate({ paymentMethodId, tenantId });
    if (!paymentValidation || !paymentValidation.isSuccess) {
      return DataProcessResult.failure(
        'PAYMENT_INVALID',
        `Payment method validation failed: ${paymentValidation?.errorMessage ?? 'unknown'}`,
      );
    }

    // ORDER 2: Plan must be ACTIVE — IR-2
    const planResult = await this.dbService.searchDocuments(PLANS_INDEX, { planId, tenantId });
    if (!planResult.isSuccess || (planResult.data ?? []).length === 0) {
      return DataProcessResult.failure('PLAN_NOT_FOUND', `Plan ${planId} not found`);
    }
    const plan = planResult.data![0] as Record<string, unknown>;
    if (
      plan['status'] !== 'ACTIVE' &&
      plan['activeUntil'] !== null &&
      plan['activeUntil'] !== undefined
    ) {
      return DataProcessResult.failure('PLAN_NOT_ACTIVE', `Plan ${planId} is not active`);
    }
    // Plan is ACTIVE if status === 'ACTIVE' OR (has no status field but activeUntil is null — published plan)
    const planStatus = plan['status'] as string | undefined;
    if (planStatus && planStatus !== 'ACTIVE') {
      return DataProcessResult.failure('PLAN_NOT_ACTIVE', `Plan ${planId} is not active`);
    }

    // ORDER 3: SETNX — IR-3
    const setnxKey = createHash('sha256')
      .update(`${tenantId}:${subscriberId}:${planId}`)
      .digest('hex');
    const setnxResult = await this.dbService.searchDocuments(IDEMPOTENCY_INDEX, { key: setnxKey });
    if (setnxResult.isSuccess && Array.isArray(setnxResult.data) && setnxResult.data.length > 0) {
      return DataProcessResult.failure(
        'ALREADY_SUBSCRIBED',
        'Subscription already exists for this subscriber+plan',
      );
    }
    await this.dbService.storeDocument(
      IDEMPOTENCY_INDEX,
      { key: setnxKey, createdAt: new Date().toISOString() },
      setnxKey,
    );

    // ORDER 4: Build subscription record — IR-7
    const now = new Date().toISOString();
    const trialDays = (plan['trialDays'] as number) ?? (event['trialDays'] as number) ?? 0;
    const isTrialing = trialDays > 0;
    const status = isTrialing ? 'TRIALING' : 'ACTIVE';
    const trialEndsAt = isTrialing
      ? new Date(Date.now() + trialDays * 86400000).toISOString()
      : null;
    const subscriptionId = createHash('sha256')
      .update(`sub:${tenantId}:${subscriberId}:${planId}:${now}`)
      .digest('hex');

    const subscription: Record<string, unknown> = {
      subscriptionId,
      subscriberId,
      planId,
      tenantId,
      status,
      paymentMethodId, // vault ref only — NEVER paymentMethodToken (IR-5)
      priceCents: plan['priceCents'],
      billingInterval: plan['billingInterval'],
      trialDays,
      trialEndsAt,
      activatedAt: now,
      currentPeriodStart: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbService.storeDocument(
      SUBSCRIPTIONS_INDEX,
      subscription,
      subscriptionId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    // ORDER 5: Enqueue SubscriptionActivated
    await this.queueService.enqueue('SubscriptionActivated', {
      tenantId,
      subscriptionId,
      subscriberId,
      planId,
      priceCents: plan['priceCents'],
      billingInterval: plan['billingInterval'],
      status,
      trialEndsAt,
      activatedAt: now,
    });

    return DataProcessResult.success({ subscriptionId, status, trialEndsAt });
  }
}
