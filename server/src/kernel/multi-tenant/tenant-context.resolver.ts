import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';

@Injectable()
export class TenantContextResolver {
  constructor(private readonly cls: ClsService) {}

  getCurrentTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant || typeof tenant.tenantId !== 'string' || tenant.tenantId.length === 0) {
        return DataProcessResult.failure('NO_TENANT', 'Tenant context not found');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'Tenant context not available');
    }
  }
}
