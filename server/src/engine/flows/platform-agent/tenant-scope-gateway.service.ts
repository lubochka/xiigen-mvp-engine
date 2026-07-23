/**
 * T651 TenantScopeGateway — FLOW-46 Phase B
 *
 * Audited cross-tenant CLS scope switch. Caller must already be in
 * MASTER_TENANT_ID context (super-admin only). Switch wraps an inner
 * callback in `cls.runWith({ tenant: target })`; outer MASTER context
 * is restored automatically when the callback returns or throws.
 *
 * Iron rules (from T651_CONTRACT):
 *   IR-1: caller CLS context MUST equal MASTER_TENANT_ID at entry.
 *   IR-2: xiigen-agent-actions audit written BEFORE cls.run (CF-839, DNA-8).
 *   IR-3: targetTenantId !== MASTER_TENANT_ID (no-op switch forbidden).
 */

import { Inject, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

const AGENT_ACTIONS_INDEX = 'xiigen-agent-actions';

export interface ScopeSwitchInput<T> {
  targetTenantId: string;
  reason: string;
  sessionId: string;
  inner: () => Promise<T>;
}

export interface ScopeSwitchResult<T> {
  innerResult: T;
  auditId: string;
}

@Injectable()
export class TenantScopeGateway {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  getCallerTenantId(): string | undefined {
    return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
  }

  requireMasterTenant(operation: string): DataProcessResult<string> {
    const callerTenantId = this.getCallerTenantId();
    if (callerTenantId !== MASTER_TENANT_ID) {
      return DataProcessResult.failure(
        'NOT_ADMIN',
        `${operation} requires MASTER_TENANT_ID; got ${callerTenantId ?? 'undefined'}`,
      );
    }
    return DataProcessResult.success(callerTenantId);
  }

  async switch<T>(
    input: ScopeSwitchInput<T>,
  ): Promise<DataProcessResult<ScopeSwitchResult<T>>> {
    const masterCheck = this.requireMasterTenant('TenantScopeGateway');
    if (!masterCheck.isSuccess) {
      return DataProcessResult.failure(
        masterCheck.errorCode ?? 'NOT_ADMIN',
        masterCheck.errorMessage ?? 'TenantScopeGateway requires MASTER_TENANT_ID',
      );
    }
    const callerTenantId = masterCheck.data!;
    if (!input.targetTenantId) {
      return DataProcessResult.failure('INVALID_TARGET', 'targetTenantId is required');
    }
    if (input.targetTenantId === MASTER_TENANT_ID) {
      return DataProcessResult.failure(
        'INVALID_TARGET',
        'targetTenantId must differ from MASTER_TENANT_ID',
      );
    }

    const auditId = `scope-switch-${input.sessionId}-${Date.now()}`;
    const auditDoc: Record<string, unknown> = {
      auditId,
      actionId: auditId,
      sessionId: input.sessionId,
      actionType: 'SCOPE_SWITCH',
      adminTenantId: callerTenantId,
      targetTenantId: input.targetTenantId,
      tenantId: callerTenantId,
      reason: input.reason,
      status: 'AUDITED',
      timestamp: new Date().toISOString(),
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'GLOBAL',
    };

    const auditStored = await this.db.storeDocument(AGENT_ACTIONS_INDEX, auditDoc, auditId);
    if (!auditStored.isSuccess) {
      return DataProcessResult.failure(
        auditStored.errorCode ?? 'AUDIT_WRITE_FAILED',
        auditStored.errorMessage ?? 'Failed to write scope-switch audit record',
      );
    }

    const targetContext = new TenantContext({
      id: input.targetTenantId,
      name: input.targetTenantId,
      status: 'active',
      plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const innerResult = await this.cls.runWith(
      { [TENANT_CONTEXT_KEY]: targetContext } as Record<string, unknown>,
      () => input.inner(),
    );

    return DataProcessResult.success({ innerResult, auditId });
  }
}
