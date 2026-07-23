/**
 * OnboardingDeliveryService (T49) — FLOW-01 Phase A
 * Nodes C1/C2/C3/D: Three independent delivery nodes + completion gate
 *
 * Iron rules:
 *   DR-02:            N independent deliveries = N separate node methods. Never parameterised.
 *   MACHINE-TYPES:    'workspace_setup', 'flow_tutorial', 'community_invitation' — string literals.
 *   DEGRADATION:      Each delivery independently failable — failure records status='failed', never throws.
 *   NODE-D-GATE:      All 3 materialTypes PRESENT required (failed ok; absent = incomplete).
 *   COMPLETION-EVENT: 'OnboardingCompleted' is MACHINE — string literal, never computed.
 *   FLOW-01-RAG-06:   Social params (inviterName, communityName) from FREEDOM config — not hardcoded.
 *   DNA-8:            storeDocument(completion record) BEFORE OnboardingCompleted emit.
 *   DNA-3:            All methods return DataProcessResult<T>, never throw.
 *   DNA-5 (V-10):     tenantId is read from CLS via TenantContext — never accepted as
 *                     a method parameter. Callers MUST wrap their invocation inside
 *                     `cls.run({ TENANT_CONTEXT_KEY: { tenantId, ... } }, () => ...)`.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../../../freedom/config-schema';
import { createCloudEvent } from '../../../kernel/cloud-events';
import { TenantContextResolver } from '../../../kernel/multi-tenant/tenant-context.resolver';

const ONBOARDING_DELIVERIES_INDEX = 'xiigen-onboarding-deliveries';

// MACHINE string literals — DR-02: never parameterised, never computed
const MATERIAL_WORKSPACE_SETUP = 'workspace_setup' as const;
const MATERIAL_FLOW_TUTORIAL = 'flow_tutorial' as const;
const MATERIAL_COMMUNITY_INVITE = 'community_invitation' as const;
const ALL_MATERIAL_TYPES = [
  MATERIAL_WORKSPACE_SETUP,
  MATERIAL_FLOW_TUTORIAL,
  MATERIAL_COMMUNITY_INVITE,
] as const;

// MACHINE event name — FLOW-01-RAG-01: cross-flow contract, exact string literal
const ONBOARDING_COMPLETED_EVENT = 'OnboardingCompleted' as const;

export interface DeliveryInput {
  memberId: string;
  userId: string;
}

export interface InvitationDeliveryInput extends DeliveryInput {
  email: string;
}

export interface CompletionGateInput {
  memberId: string;
  userId: string;
  email: string;
  /** MT-3: SSO bypass — if 3 materials already exist in user record, skip delivery + gate. */
  existingOnboardingMaterialsCount?: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className OnboardingDeliveryService
 */
@Injectable()
export class OnboardingDeliveryService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly database: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'onboarding-delivery.service',
        serviceName: 'OnboardingDeliveryService',
        flowId: 'FLOW-01',
      }),
    });
  }

  /**
   * Read the active tenantId from CLS (DNA-5). Returns NO_TENANT failure when
   * the caller forgot to wrap the invocation in `cls.run(...)` or middleware
   * never set TenantContext.
   */
  private getTenantId(): DataProcessResult<string> {
    return this.tenantContext.getCurrentTenantId();
  }

  /**
   * C1: Workspace setup delivery.
   * materialType: 'workspace_setup' — MACHINE literal (OD-1).
   * Failure records status='failed' — does not throw (OD-4).
   */
  async deliverWorkspace(
    input: DeliveryInput,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.storeDelivery({
      ...input,
      materialType: MATERIAL_WORKSPACE_SETUP,
    });
  }

  /**
   * C2: Flow tutorial delivery.
   * materialType: 'flow_tutorial' — MACHINE literal (OD-2).
   */
  async deliverTutorial(input: DeliveryInput): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.storeDelivery({
      ...input,
      materialType: MATERIAL_FLOW_TUTORIAL,
    });
  }

  /**
   * C3: Community invitation delivery.
   * materialType: 'community_invitation' — MACHINE literal (OD-3).
   * inviterName and communityName from FREEDOM config — not hardcoded (FLOW-01-RAG-06, OD-11).
   */
  async deliverInvitation(
    input: InvitationDeliveryInput,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const inviterName = await this.getFreedomString(
      XIIGEN_FREEDOM_KEYS.FLOW01_INVITATION_INVITER_NAME,
      'The Team',
    );
    const communityName = await this.getFreedomString(
      XIIGEN_FREEDOM_KEYS.FLOW01_INVITATION_COMMUNITY_NAME,
      'Community',
    );

    return this.storeDelivery({
      ...input,
      materialType: MATERIAL_COMMUNITY_INVITE,
      socialParams: { inviterName, communityName },
    });
  }

  /**
   * NODE D: Completion gate.
   * Checks that all 3 materialTypes are present in delivery records.
   * Presence gate: failed records count, absent records do not (OD-6/OD-7).
   * DNA-8: store completion record BEFORE OnboardingCompleted emit (OD-10).
   * MT-3: SSO bypass — if existingOnboardingMaterialsCount===3, skip everything.
   */
  async checkCompletionGate(
    input: CompletionGateInput,
  ): Promise<DataProcessResult<{ completed: boolean }>> {
    try {
      if (!input.memberId || !input.userId || !input.email) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'memberId, userId, and email are required',
        );
      }

      const tenantResult = this.getTenantId();
      if (!tenantResult.isSuccess || !tenantResult.data) {
        return DataProcessResult.failure(
          tenantResult.errorCode ?? 'NO_TENANT',
          tenantResult.errorMessage ?? 'tenant unavailable',
        );
      }
      const tenantId = tenantResult.data;

      // MT-3: SSO bypass — user already has 3 materials from SSO flow
      if ((input.existingOnboardingMaterialsCount ?? 0) >= 3) {
        return DataProcessResult.success({ completed: true });
      }

      // NODE D: query all delivery records for this member
      const deliveryRecords = await this.database.searchDocuments(ONBOARDING_DELIVERIES_INDEX, {
        member_id: input.memberId,
      });

      if (!deliveryRecords.isSuccess) {
        return DataProcessResult.failure(
          'DELIVERY_QUERY_FAILED',
          'Could not read delivery records',
        );
      }

      const records = (deliveryRecords.data ?? []) as Array<Record<string, unknown>>;
      const presentTypes = new Set(records.map((r) => r['material_type'] as string));

      // OD-6: Gate requires all 3 types PRESENT — failed records count, absent do not
      const allPresent = ALL_MATERIAL_TYPES.every((t) => presentTypes.has(t));
      if (!allPresent) {
        return DataProcessResult.failure(
          'DELIVERY_INCOMPLETE',
          'Not all onboarding materials delivered yet',
        );
      }

      const completedAt = new Date().toISOString();
      const completionId = `onb-complete-${input.memberId}-${Date.now()}`;

      const completionRecord: Record<string, unknown> = {
        completion_id: completionId,
        member_id: input.memberId,
        user_id: input.userId,
        email: input.email,
        tenant_id: tenantId,
        completed_at: completedAt,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
      };

      // DNA-8: store completion record BEFORE emit (OD-10)
      const stored = await this.database.storeDocument(
        ONBOARDING_DELIVERIES_INDEX,
        completionRecord,
        completionId,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // OD-8/OD-9: OnboardingCompleted is MACHINE literal; payload includes tenantId (FLOW-08)
      const cloudEvent = createCloudEvent({
        eventType: ONBOARDING_COMPLETED_EVENT, // OD-8: exact string literal
        source: 'onboarding-delivery-service',
        tenantId,
        data: {
          tenantId, // OD-9/MT-2: FLOW-08 reads this
          userId: input.userId,
          email: input.email,
          onboardingCompletedAt: completedAt,
        },
      });
      await this.queueService.enqueue(ONBOARDING_COMPLETED_EVENT, cloudEvent);

      return DataProcessResult.success({ completed: true });
    } catch (err) {
      return DataProcessResult.failure(
        'COMPLETION_GATE_ERROR',
        `checkCompletionGate threw: ${String(err)}`,
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async storeDelivery(params: {
    memberId: string;
    userId: string;
    materialType: string;
    socialParams?: Record<string, unknown>;
  }): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const tenantResult = this.getTenantId();
      if (!tenantResult.isSuccess || !tenantResult.data) {
        return DataProcessResult.failure(
          tenantResult.errorCode ?? 'NO_TENANT',
          tenantResult.errorMessage ?? 'tenant unavailable',
        );
      }
      const tenantId = tenantResult.data;

      const deliveryId = `del-${params.materialType}-${params.memberId}-${Date.now()}`;
      const doc: Record<string, unknown> = {
        delivery_id: deliveryId,
        member_id: params.memberId,
        user_id: params.userId,
        tenant_id: tenantId,
        material_type: params.materialType, // MACHINE literal from caller
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE', // MT-1
      };

      if (params.socialParams) {
        doc['social_params'] = params.socialParams;
      }

      const stored = await this.database.storeDocument(
        ONBOARDING_DELIVERIES_INDEX,
        doc,
        deliveryId,
      );
      if (!stored.isSuccess) {
        // OD-4/OD-5: delivery failure is recorded — does not throw or block siblings
        const failedDoc: Record<string, unknown> = {
          ...doc,
          status: 'failed',
          failed_at: new Date().toISOString(),
        };
        await this.database.storeDocument(ONBOARDING_DELIVERIES_INDEX, failedDoc, deliveryId);
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      return DataProcessResult.success(stored.data!);
    } catch (err) {
      return DataProcessResult.failure(
        'DELIVERY_ERROR',
        `storeDelivery(${params.materialType}) threw: ${String(err)}`,
      );
    }
  }

  private async getFreedomString(key: string, fallback: string): Promise<string> {
    if (!this.freedomConfig) return fallback;
    const doc = await this.freedomConfig.get(key);
    return (doc?.['value'] as string) ?? fallback;
  }
}
