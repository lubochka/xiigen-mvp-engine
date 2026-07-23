/**
 * KnowledgePolicyService — resolves knowledge scope for each write context.
 *
 * Scope hierarchy (most specific wins):
 *   (tenantId, flowId, phase, station, depth)
 *   > (tenantId, flowId, phase, station)
 *   > (tenantId, flowId, phase)
 *   > (tenantId, flowId)
 *   > platform MODULE policy (ownerId=platform, same specificity chain)
 *   > default: PRIVATE
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-5: tenantId sourced from CLS — no parameter on fabric calls.
 * CF-POLICY-01: default scope = PRIVATE when no policy found.
 * CF-POLICY-02: platform policy (ownerId=platform) applies to all tenants
 *               when no tenant-specific override exists.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

export const KNOWLEDGE_POLICY_INDEX = 'xiigen-knowledge-policy';
export const PLATFORM_OWNER_ID = 'platform';

export type KnowledgeScope = 'PRIVATE' | 'MODULE' | 'GLOBAL';
export type PricingModel = 'FREE' | 'PER_USE' | 'ONE_TIME' | 'SUBSCRIPTION';
export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KnowledgePolicy {
  policyId: string;
  tenantId: string;
  flowId: string;
  phase: string;
  station: string | null;
  depth: number | null;
  scope: KnowledgeScope;
  pricingModel: PricingModel | null;
  pricePerUse: number | null;
  ownerId: string;
  approvalState: ApprovalState;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export interface PolicyResolution {
  scope: KnowledgeScope;
  ownerId: string;
  pricingModel: PricingModel | null;
  moduleId: string | null;
}

const DEFAULT_RESOLUTION = (tenantId: string): PolicyResolution => ({
  scope: 'PRIVATE',
  ownerId: tenantId,
  pricingModel: null,
  moduleId: null,
});

@Injectable()
export class KnowledgePolicyService {
  private readonly logger = new Logger(KnowledgePolicyService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string | null {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve scope for a given write context.
   * Returns PRIVATE default on any db failure (CF-POLICY-01).
   */
  async resolveScope(
    tenantId: string,
    flowId: string,
    phase: string,
    station?: string,
    depth?: number,
  ): Promise<PolicyResolution> {
    try {
      const allResult = await this.db.searchDocuments(KNOWLEDGE_POLICY_INDEX, {
        flowId,
        phase,
      });
      if (!allResult.isSuccess) {
        return DEFAULT_RESOLUTION(tenantId);
      }

      const policies = (allResult.data as unknown as KnowledgePolicy[]).filter(
        (p) => p.tenantId === tenantId || p.ownerId === PLATFORM_OWNER_ID,
      );

      // Score each policy by specificity — tenant policies beat platform at same level
      const scored = policies
        .map((p) => ({ policy: p, score: this.specificityScore(p, station, depth, tenantId) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        return DEFAULT_RESOLUTION(tenantId);
      }

      const winner = scored[0]!.policy;
      return {
        scope: winner.scope,
        ownerId: winner.ownerId === PLATFORM_OWNER_ID ? tenantId : winner.ownerId,
        pricingModel: winner.pricingModel,
        moduleId: null,
      };
    } catch {
      return DEFAULT_RESOLUTION(tenantId);
    }
  }

  /**
   * Specificity score: higher = more specific.
   * Tenant policy always beats platform policy at same specificity (+1000 bonus).
   */
  private specificityScore(
    policy: KnowledgePolicy,
    station: string | undefined,
    depth: number | undefined,
    tenantId: string,
  ): number {
    // Base match: must match flowId + phase
    let score = 10;
    const isTenant = policy.tenantId === tenantId;
    const tenantBonus = isTenant ? 1000 : 0;

    if (policy.station !== null) {
      if (station === undefined || policy.station !== station) return 0;
      score += 100;
    }
    if (policy.depth !== null) {
      if (depth === undefined || policy.depth !== depth) return 0;
      score += 10;
    }
    return score + tenantBonus;
  }

  /** Store a policy record. DNA-3: never throws. */
  async setPolicy(
    policy: Omit<KnowledgePolicy, 'policyId' | 'createdAt'>,
  ): Promise<DataProcessResult<KnowledgePolicy>> {
    try {
      const record: KnowledgePolicy = {
        ...policy,
        policyId: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const result = await this.db.storeDocument(
        KNOWLEDGE_POLICY_INDEX,
        { ...record },
        record.policyId,
      );
      if (!result.isSuccess) {
        return DataProcessResult.failure('STORE_FAILED', result.errorMessage ?? '');
      }
      return DataProcessResult.success(record);
    } catch (err) {
      return DataProcessResult.failure('UNEXPECTED', String(err));
    }
  }

  /**
   * Bootstrap MODULE policies for platform flows (FLOW-01..40).
   * Idempotent: skips flowId if a platform policy already exists.
   */
  async bootstrapPlatformPolicies(
    flowIds: string[],
  ): Promise<DataProcessResult<{ registered: number }>> {
    let registered = 0;
    try {
      for (const flowId of flowIds) {
        const existing = await this.db.searchDocuments(KNOWLEDGE_POLICY_INDEX, {
          flowId,
          ownerId: PLATFORM_OWNER_ID,
        });
        const records = existing.isSuccess ? (existing.data as unknown as KnowledgePolicy[]) : [];
        if (records.some((r) => r.ownerId === PLATFORM_OWNER_ID && r.flowId === flowId)) {
          continue;
        }
        await this.setPolicy({
          tenantId: PLATFORM_OWNER_ID,
          flowId,
          phase: '*',
          station: null,
          depth: null,
          scope: 'MODULE',
          pricingModel: 'FREE',
          pricePerUse: null,
          ownerId: PLATFORM_OWNER_ID,
          approvalState: 'APPROVED',
          approvedAt: new Date().toISOString(),
          approvedBy: PLATFORM_OWNER_ID,
        });
        registered++;
      }
      return DataProcessResult.success({ registered });
    } catch (err) {
      return DataProcessResult.failure('BOOTSTRAP_FAILED', String(err));
    }
  }
}
