/**
 * T221 IdentityJoinResolver [modeling]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Resolve identity joins with cross-tenant guard (CF-204).
 * All join inputs MUST carry tenantId. Cross-tenant joins rejected immediately.
 * Confidence threshold from FREEDOM config.
 *
 * Iron rules:
 *   IR-1: All join inputs MUST carry tenantId (CF-204).
 *   IR-2: Cross-tenant join MUST be rejected with CROSS_TENANT_JOIN_BLOCKED error.
 *   IR-3: Confidence score threshold from FREEDOM config (flow14_identity_confidence_threshold).
 *   IR-4: IdentityJoinCompleted includes crossTenantGuardPassed: true.
 *   IR-5: Results filtered by RLS (F463) before returning.
 *   IR-6: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: IdentityJoinCompleted
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { RLS_POLICY_SERVICE } from './etl-platform-tokens';
import { FREEDOM_CONFIG_SERVICE } from '../../../freedom/freedom-config.interface';

interface IRlsPolicyService {
  applyPolicies(
    connectorId: string,
    tenantId: string,
    records: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
}

interface IFreedomConfigService {
  get<T>(key: string, defaultValue?: T): T;
}

const IDENTITY_RESULTS_INDEX = 'xiigen-identity-join-results';
const CONFIDENCE_THRESHOLD_KEY = 'flow14_identity_confidence_threshold';
const DEFAULT_CONFIDENCE_THRESHOLD = 0.8;

export interface JoinInput {
  entityId: string;
  tenantId: string;
  fields: Record<string, unknown>;
}

@Injectable()
export class IdentityJoinResolverService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RLS_POLICY_SERVICE) private readonly rlsPolicy: IRlsPolicyService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T221',
        serviceName: 'IdentityJoinResolverService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  private getConfidenceThreshold(): number {
    return (
      this.freedomConfig?.get<number>(CONFIDENCE_THRESHOLD_KEY, DEFAULT_CONFIDENCE_THRESHOLD) ??
      DEFAULT_CONFIDENCE_THRESHOLD
    );
  }

  async resolve(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const joinInputs = (event['joinInputs'] as JoinInput[]) ?? [];

    if (!connectorId || joinInputs.length === 0) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and at least one joinInput are required',
      );
    }

    // IR-1: Validate all join inputs carry tenantId
    for (const input of joinInputs) {
      if (!input.tenantId) {
        return DataProcessResult.failure(
          'MISSING_TENANT_ID',
          `Join input ${input.entityId} is missing tenantId — CF-204 violation`,
        );
      }
    }

    // IR-2: Cross-tenant join guard (CF-204)
    const crossTenantInputs = joinInputs.filter((i) => i.tenantId !== tenantId);
    if (crossTenantInputs.length > 0) {
      return DataProcessResult.failure(
        'CROSS_TENANT_JOIN_BLOCKED',
        `Cross-tenant join attempt rejected — inputs from tenants: ${crossTenantInputs.map((i) => i.tenantId).join(', ')}`,
      );
    }

    // IR-3: Confidence threshold from FREEDOM config
    const confidenceThreshold = this.getConfidenceThreshold();

    // Resolve identity matches
    const resolvedMatches = this.resolveIdentities(joinInputs, confidenceThreshold);

    // IR-5: Apply RLS before returning
    const rlsFiltered = await this.rlsPolicy.applyPolicies(connectorId, tenantId, resolvedMatches);

    // IR-6: storeDocument BEFORE enqueue (DNA-8)
    const resultId = `identity-join:${tenantId}:${connectorId}:${Date.now()}`;
    const storeResult = await this.dbFabric.storeDocument(
      IDENTITY_RESULTS_INDEX,
      {
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        resolvedMatches: resolvedMatches.length,
        rlsFilteredMatches: rlsFiltered.length,
        confidenceThreshold,
        crossTenantGuardPassed: true,
        resolvedAt: new Date().toISOString(),
      },
      resultId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        storeResult.errorMessage ?? 'Identity join result store failed',
      );
    }

    // IR-4: IdentityJoinCompleted includes crossTenantGuardPassed: true
    await this.queueFabric.enqueue('IdentityJoinCompleted', {
      connectorId,
      tenantId,
      resolvedMatches: rlsFiltered.length,
      confidenceThreshold,
      crossTenantGuardPassed: true,
    });

    return DataProcessResult.success({
      matches: rlsFiltered,
      crossTenantGuardPassed: true,
      confidenceThreshold,
    });
  }

  private resolveIdentities(
    inputs: JoinInput[],
    confidenceThreshold: number,
  ): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];

    for (let i = 0; i < inputs.length; i++) {
      for (let j = i + 1; j < inputs.length; j++) {
        const a = inputs[i];
        const b = inputs[j];
        const confidence = this.computeMatchConfidence(a.fields, b.fields);
        if (confidence >= confidenceThreshold) {
          results.push({
            entityIdA: a.entityId,
            entityIdB: b.entityId,
            confidence,
            tenantId: a.tenantId,
            knowledgeScope: 'PRIVATE',
          });
        }
      }
    }

    return results;
  }

  private computeMatchConfidence(
    fieldsA: Record<string, unknown>,
    fieldsB: Record<string, unknown>,
  ): number {
    const keysA = Object.keys(fieldsA);
    const keysB = Object.keys(fieldsB);
    const commonKeys = keysA.filter((k) => keysB.includes(k));
    if (commonKeys.length === 0) return 0;

    const matches = commonKeys.filter((k) => fieldsA[k] === fieldsB[k]).length;
    return matches / commonKeys.length;
  }
}
