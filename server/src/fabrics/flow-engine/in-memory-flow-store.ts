/**
 * InMemory Flow Store — IFlowDefinition implementation.
 * Stores flow definitions (JSON DAGs) in memory for dev/testing.
 * Supports versioning: each save creates a new version.
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IFlowDefinition } from '../interfaces/flow-orchestrator.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

@Injectable()
export class InMemoryFlowStore extends IFlowDefinition {
  /** Key: `${tenantId}:${flowId}` → versioned definitions[] */
  private readonly flows = new Map<string, Array<Record<string, unknown>>>();

  constructor(private readonly cls: ClsService) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private flowKey(tenantId: string, flowId: string): string {
    return `${tenantId}:${flowId}`;
  }

  async saveFlow(
    flowDefinition: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!flowDefinition || typeof flowDefinition !== 'object') {
      return DataProcessResult.failure(
        'INVALID_FLOW',
        'flow_definition must be a non-empty object',
      );
    }
    if (!flowDefinition['name']) {
      return DataProcessResult.failure('MISSING_NAME', "flow_definition must have a 'name'");
    }

    const flowId = (flowDefinition['flow_id'] as string) ?? randomUUID();
    const key = this.flowKey(tenantId, flowId);
    const versions = this.flows.get(key) ?? [];
    const version = String(versions.length + 1);
    const now = new Date().toISOString();

    const doc: Record<string, unknown> = structuredClone(flowDefinition);
    doc['flow_id'] = flowId;
    doc['tenant_id'] = tenantId;
    doc['version'] = version;
    doc['created_at'] = now;
    doc['updated_at'] = now;
    if (!doc['nodes']) doc['nodes'] = [];
    if (!doc['edges']) doc['edges'] = [];
    if (!doc['status']) doc['status'] = 'draft';

    versions.push(doc);
    this.flows.set(key, versions);
    return DataProcessResult.success(structuredClone(doc));
  }

  async loadFlow(
    flowId: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flow_id required');

    const key = this.flowKey(tenantId, flowId);
    const versions = this.flows.get(key);
    if (!versions || versions.length === 0) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow ${flowId} not found`);
    }

    if (version) {
      const match = versions.find((v) => v['version'] === version);
      if (!match) {
        return DataProcessResult.failure(
          'VERSION_NOT_FOUND',
          `Version ${version} not found for flow ${flowId}`,
        );
      }
      return DataProcessResult.success(structuredClone(match));
    }

    return DataProcessResult.success(structuredClone(versions[versions.length - 1]));
  }

  async listFlows(
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const results: Array<Record<string, unknown>> = [];
    for (const [key, versions] of this.flows.entries()) {
      if (!key.startsWith(`${tenantId}:`)) continue;
      const latest = versions[versions.length - 1];

      if (filters) {
        let match = true;
        for (const [fk, fv] of Object.entries(filters)) {
          if (fv === null || fv === undefined || fv === '') continue;
          if (latest[fk] !== fv) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      results.push(structuredClone(latest));
    }

    return DataProcessResult.success(results);
  }

  // ── Testing helpers ─────────────────────────────────

  get flowCount(): number {
    return this.flows.size;
  }

  clear(): void {
    this.flows.clear();
  }
}
