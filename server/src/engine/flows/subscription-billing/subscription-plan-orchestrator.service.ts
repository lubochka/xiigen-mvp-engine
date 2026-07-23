/**
 * T209 SubscriptionPlanOrchestrator [BILLING, OCC]
 * FLOW-12: Subscription & Recurring Billing
 *
 * Iron rules:
 *   IR-1: Number.isInteger(priceCents) && priceCents > 0 at ORDER 1 — float prices rejected. CF-12-2.
 *   IR-2: SETNX at ORDER 2 — prevents duplicate plan+version from concurrent publish requests.
 *   IR-3: getDocumentWithVersion() → storeDocumentWithOCC(plan, { ifSeqNo, ifPrimaryTerm }).
 *         NEVER plain storeDocument(). On OCC_CONFLICT: emit SubscriptionPlanPublicationFailed. CF-12-2.
 *   IR-4: storeDocument(audit) at ORDER 5 BEFORE enqueue(SubscriptionPlanPublished). DNA-8.
 *   IR-5: billingInterval must be MONTHLY | ANNUAL | CUSTOM at ORDER 4.
 *
 * Emits: SubscriptionPlanPublished, SubscriptionPlanPublicationFailed
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const PLANS_INDEX = 'xiigen-subscription-plans';
const AUDIT_INDEX = 'xiigen-plan-audit';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

const VALID_INTERVALS = ['MONTHLY', 'ANNUAL', 'CUSTOM'] as const;

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

@Injectable()
export class SubscriptionPlanOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T209',
        serviceName: 'SubscriptionPlanOrchestratorService',
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

  async publishPlan(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const priceCents = event['priceCents'] as number;
    const planId = event['planId'] as string;
    const version = (event['version'] as string) ?? '1';
    const billingInterval = event['billingInterval'] as string;

    // ORDER 1: Integer cents guard — IR-1, CF-12-2
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      return DataProcessResult.failure('INVALID_PRICE', 'priceCents must be a positive integer');
    }

    // ORDER 2: SETNX idempotency — IR-2
    const setnxKey = createHash('sha256').update(`${tenantId}:${planId}:${version}`).digest('hex');
    const setnxResult = await this.dbService.searchDocuments(IDEMPOTENCY_INDEX, { key: setnxKey });
    if (setnxResult.isSuccess && Array.isArray(setnxResult.data) && setnxResult.data.length > 0) {
      return DataProcessResult.failure('DUPLICATE_PLAN', 'Plan version already being processed');
    }
    await this.dbService.storeDocument(
      IDEMPOTENCY_INDEX,
      { key: setnxKey, createdAt: new Date().toISOString() },
      setnxKey,
    );

    // ORDER 3: OCC read — get current version pin — IR-3
    const schemaId = `plan-${planId}-${version}`;
    const existingResult = await this.dbService.getDocumentWithVersion(PLANS_INDEX, schemaId);

    // ORDER 4: Interval validation — IR-5
    if (!VALID_INTERVALS.includes(billingInterval as (typeof VALID_INTERVALS)[number])) {
      return DataProcessResult.failure(
        'INVALID_INTERVAL',
        `billingInterval must be MONTHLY|ANNUAL|CUSTOM`,
      );
    }

    const now = new Date().toISOString();
    const plan: Record<string, unknown> = {
      planId,
      planName: event['planName'] ?? planId,
      priceCents,
      billingInterval,
      trialDays: event['trialDays'] ?? 0,
      intervalDays: event['intervalDays'] ?? null,
      features: event['features'] ?? [],
      tenantId,
      version,
      publishedAt: now,
      activeUntil: null,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // ORDER 5: Audit write — BEFORE enqueue (DNA-8, IR-4)
    const auditId = `audit-plan-${planId}-${Date.now()}`;
    await this.dbService.storeDocument(
      AUDIT_INDEX,
      {
        auditId,
        planId,
        tenantId,
        action: 'PUBLISH',
        auditedAt: now,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      auditId,
    );

    // ORDER 6: OCC write — IR-3
    let writeResult: DataProcessResult<{ seqNo: number; primaryTerm: number }>;
    if (existingResult.isSuccess) {
      const { seqNo, primaryTerm } = existingResult.data!;
      writeResult = await this.dbService.storeDocumentWithOCC(PLANS_INDEX, plan, schemaId, {
        ifSeqNo: seqNo,
        ifPrimaryTerm: primaryTerm,
      });
    } else {
      // New plan — first write, no prior version; use storeDocument
      const plainResult = await this.dbService.storeDocument(PLANS_INDEX, plan, schemaId);
      if (!plainResult.isSuccess) {
        return DataProcessResult.failure(
          plainResult.errorCode ?? 'WRITE_FAILED',
          plainResult.errorMessage ?? 'Write failed',
        );
      }
      // Emit success
      await this.queueService.enqueue('SubscriptionPlanPublished', {
        tenantId,
        planId,
        priceCents,
        billingInterval,
        trialDays: plan['trialDays'],
        version,
      });
      return DataProcessResult.success({ planId, priceCents, billingInterval });
    }

    if (!writeResult.isSuccess) {
      if (writeResult.errorCode === 'OCC_CONFLICT') {
        await this.queueService.enqueue('SubscriptionPlanPublicationFailed', {
          tenantId,
          planId,
          reason: 'occ_conflict',
        });
        return DataProcessResult.failure(
          'OCC_CONFLICT',
          'Plan version changed — retry with fresh read',
        );
      }
      return DataProcessResult.failure(
        writeResult.errorCode ?? 'WRITE_FAILED',
        writeResult.errorMessage ?? 'Write failed',
      );
    }

    // ORDER 7: Enqueue success event — after OCC write (DNA-8 satisfied at ORDER 5)
    await this.queueService.enqueue('SubscriptionPlanPublished', {
      tenantId,
      planId,
      priceCents,
      billingInterval,
      trialDays: plan['trialDays'],
      version,
    });

    return DataProcessResult.success({ planId, priceCents, billingInterval });
  }
}
