/**
 * T654 AgentActionPublisher — FLOW-46 Phase B
 *
 * Branches by actionType:
 *   ADVISE        — store private TenantTopology under MASTER (record-only).
 *   PROPOSE_EDIT  — via T651, fork to private + update draft on target tenant.
 *   CREATE_FLOW   — via T651, store new private DRAFT on target tenant.
 *   APPLY_GLOBAL  — pre-check CLS = MASTER_TENANT_ID; store global template.
 *
 * Iron rules:
 *   IR-1: DNA-8 — storeDocument BEFORE enqueue on every branch.
 *   IR-2: APPLY_GLOBAL pre-checks CLS = MASTER_TENANT_ID at branch entry.
 *   IR-3: PROPOSE_EDIT uses forkToPrivate + updateDraft, never direct storePrivate.
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  IDatabaseService,
  DATABASE_SERVICE,
} from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';
import { TenantScopeGateway } from './tenant-scope-gateway.service';

const AGENT_ACTIONS_INDEX = 'xiigen-agent-actions';
const TENANT_TOPOLOGIES_INDEX = 'xiigen-tenant-topologies';
const FLOW_TEMPLATES_INDEX = 'xiigen-flow-templates';

export type AgentActionType = 'ADVISE' | 'PROPOSE_EDIT' | 'CREATE_FLOW' | 'APPLY_GLOBAL';

export interface AgentActionInput {
  actionId: string;
  sessionId: string;
  actionType: AgentActionType;
  adminTenantId: string;
  targetTenantId?: string;
  payload: Record<string, unknown>;
  draftFlowId?: string;
  reason?: string;
}

export interface AgentActionRecord {
  actionId: string;
  sessionId: string;
  actionType: AgentActionType;
  adminTenantId: string;
  targetTenantId: string;
  tenantId: string;
  knowledgeScope: 'PRIVATE' | 'GLOBAL';
  status: 'STORED' | 'EMITTED';
  storedAt: string;
  draftFlowId?: string;
}

interface DraftWriteResult {
  draftFlowId?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class AgentActionPublisher {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly scope: TenantScopeGateway,
  ) {}

  async publish(
    input: AgentActionInput,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    switch (input.actionType) {
      case 'ADVISE':
        return this.publishAdvise(input);
      case 'PROPOSE_EDIT':
        return this.publishProposeEdit(input);
      case 'CREATE_FLOW':
        return this.publishCreateFlow(input);
      case 'APPLY_GLOBAL':
        return this.publishApplyGlobal(input);
      default:
        return DataProcessResult.failure(
          'UNKNOWN_ACTION_TYPE',
          `actionType=${String(input.actionType)} not supported`,
        );
    }
  }

  private async publishAdvise(
    input: AgentActionInput,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    const record = this.buildRecord(input, MASTER_TENANT_ID, 'PRIVATE');
    const adviseDoc: Record<string, unknown> = {
      ...record,
      sourceType: 'AGENT_RUN',
      payload: input.payload,
      connectionType: 'FLOW_SCOPED',
    };
    return this.storeAndEmit(adviseDoc, record);
  }

  private async publishProposeEdit(
    input: AgentActionInput,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    if (!input.targetTenantId) {
      return DataProcessResult.failure('MISSING_TARGET', 'PROPOSE_EDIT requires targetTenantId');
    }
    const record = this.buildRecord(input, input.targetTenantId, 'PRIVATE');
    const draftFlowId = input.draftFlowId ?? `draft-${input.actionId}`;
    record.draftFlowId = draftFlowId;

    const switchResult = await this.scope.switch<DraftWriteResult>({
      targetTenantId: input.targetTenantId,
      reason: input.reason ?? `T654 PROPOSE_EDIT for action ${input.actionId}`,
      sessionId: input.sessionId,
      inner: async () => {
        const draftDoc: Record<string, unknown> = {
          ...record,
          flowId: draftFlowId,
          tenantId: input.targetTenantId,
          status: 'DRAFT',
          forkedFromMaster: true,
          payload: input.payload,
          connectionType: 'FLOW_SCOPED',
        };
        const stored = await this.db.storeDocument(TENANT_TOPOLOGIES_INDEX, draftDoc, draftFlowId);
        if (!stored.isSuccess) {
          return {
            errorCode: stored.errorCode ?? 'FORK_TO_PRIVATE_FAILED',
            errorMessage: stored.errorMessage ?? 'forkToPrivate write failed',
          };
        }
        return { draftFlowId };
      },
    });
    if (!switchResult.isSuccess) {
      return DataProcessResult.failure(
        switchResult.errorCode ?? 'SCOPE_SWITCH_FAILED',
        switchResult.errorMessage ?? 'PROPOSE_EDIT scope switch failed',
      );
    }
    const draftWrite = switchResult.data?.innerResult;
    if (!draftWrite?.draftFlowId) {
      return DataProcessResult.failure(
        draftWrite?.errorCode ?? 'FORK_TO_PRIVATE_FAILED',
        draftWrite?.errorMessage ?? 'forkToPrivate write failed',
      );
    }

    return this.storeAndEmit(record as unknown as Record<string, unknown>, record);
  }

  private async publishCreateFlow(
    input: AgentActionInput,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    if (!input.targetTenantId) {
      return DataProcessResult.failure('MISSING_TARGET', 'CREATE_FLOW requires targetTenantId');
    }
    const record = this.buildRecord(input, input.targetTenantId, 'PRIVATE');
    const draftFlowId = input.draftFlowId ?? `flow-${input.actionId}`;
    record.draftFlowId = draftFlowId;

    const switchResult = await this.scope.switch<DraftWriteResult>({
      targetTenantId: input.targetTenantId,
      reason: input.reason ?? `T654 CREATE_FLOW for action ${input.actionId}`,
      sessionId: input.sessionId,
      inner: async () => {
        const flowDoc: Record<string, unknown> = {
          ...record,
          flowId: draftFlowId,
          tenantId: input.targetTenantId,
          status: 'DRAFT',
          payload: input.payload,
          connectionType: 'FLOW_SCOPED',
        };
        const stored = await this.db.storeDocument(TENANT_TOPOLOGIES_INDEX, flowDoc, draftFlowId);
        if (!stored.isSuccess) {
          return {
            errorCode: stored.errorCode ?? 'STORE_PRIVATE_FAILED',
            errorMessage: stored.errorMessage ?? 'storePrivate write failed',
          };
        }
        return { draftFlowId };
      },
    });
    if (!switchResult.isSuccess) {
      return DataProcessResult.failure(
        switchResult.errorCode ?? 'SCOPE_SWITCH_FAILED',
        switchResult.errorMessage ?? 'CREATE_FLOW scope switch failed',
      );
    }
    const flowWrite = switchResult.data?.innerResult;
    if (!flowWrite?.draftFlowId) {
      return DataProcessResult.failure(
        flowWrite?.errorCode ?? 'STORE_PRIVATE_FAILED',
        flowWrite?.errorMessage ?? 'storePrivate write failed',
      );
    }
    return this.storeAndEmit(record as unknown as Record<string, unknown>, record);
  }

  private async publishApplyGlobal(
    input: AgentActionInput,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    const masterCheck = this.scope.requireMasterTenant('APPLY_GLOBAL');
    if (!masterCheck.isSuccess) {
      return DataProcessResult.failure(
        masterCheck.errorCode ?? 'NOT_ADMIN',
        masterCheck.errorMessage ?? 'APPLY_GLOBAL requires MASTER_TENANT_ID',
      );
    }
    const record = this.buildRecord(input, MASTER_TENANT_ID, 'GLOBAL');
    const templateDoc: Record<string, unknown> = {
      ...record,
      template: input.payload,
      connectionType: 'FLOW_SCOPED',
    };
    const stored = await this.db.storeDocument(FLOW_TEMPLATES_INDEX, templateDoc, input.actionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'TEMPLATE_WRITE_FAILED',
        stored.errorMessage ?? 'storeGlobalTemplate write failed',
      );
    }
    return this.storeAndEmit(templateDoc, record);
  }

  private buildRecord(
    input: AgentActionInput,
    tenantId: string,
    knowledgeScope: 'PRIVATE' | 'GLOBAL',
  ): AgentActionRecord {
    return {
      actionId: input.actionId,
      sessionId: input.sessionId,
      actionType: input.actionType,
      adminTenantId: input.adminTenantId,
      targetTenantId: input.targetTenantId ?? input.adminTenantId,
      tenantId,
      knowledgeScope,
      status: 'STORED',
      storedAt: new Date().toISOString(),
    };
  }

  private async storeAndEmit(
    auditDoc: Record<string, unknown>,
    record: AgentActionRecord,
  ): Promise<DataProcessResult<AgentActionRecord>> {
    const auditOnly: Record<string, unknown> = {
      ...record,
      timestamp: new Date().toISOString(),
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: record.knowledgeScope,
    };
    const auditStored = await this.db.storeDocument(AGENT_ACTIONS_INDEX, auditOnly, record.actionId);
    if (!auditStored.isSuccess) {
      return DataProcessResult.failure(
        auditStored.errorCode ?? 'AUDIT_WRITE_FAILED',
        auditStored.errorMessage ?? 'audit record write failed',
      );
    }

    const enqueued = await this.queue.enqueue('platform-agent.AgentActionProposed', {
      actionId: record.actionId,
      sessionId: record.sessionId,
      actionType: record.actionType,
      adminTenantId: record.adminTenantId,
      targetTenantId: record.targetTenantId,
      tenantId: record.tenantId,
      knowledgeScope: record.knowledgeScope,
      payload: auditDoc['payload'] ?? auditDoc['template'] ?? {},
      draftFlowId: record.draftFlowId,
    });
    if (!enqueued.isSuccess) {
      return DataProcessResult.failure(
        enqueued.errorCode ?? 'EMIT_FAILED',
        enqueued.errorMessage ?? 'AgentActionProposed enqueue failed',
      );
    }

    record.status = 'EMITTED';
    return DataProcessResult.success(record);
  }
}
