/**
 * T535 SandboxEnvironmentProvisioner [PROVISIONING]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_SANDBOXES_INDEX = 'xiigen-marketplace-sandboxes';

@Injectable()
export class SandboxEnvironmentProvisionerService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T535',
        serviceName: 'SandboxEnvironmentProvisionerService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async provisionSandbox(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const publisherId = input['publisherId'] as string;
    const ttlMinutes = input['ttlMinutes'] as number | undefined;
    if (!packageId || !publisherId) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, publisherId required');
    }
    const sandboxId = `sandbox-${packageId}-${Date.now()}`;
    const ttl = ttlMinutes ?? 60;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);
    const sandboxTenantId = `sandbox-${sandboxId}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_SANDBOXES_INDEX,
      {
        sandboxId,
        packageId,
        publisherId,
        sandboxTenantId,
        ttlMinutes: ttl,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'ACTIVE',
      },
      sandboxId,
    );
    return DataProcessResult.success({
      sandboxId,
      packageId,
      sandboxTenantId,
      ttlMinutes: ttl,
      expiresAt: expiresAt.toISOString(),
      status: 'PROVISIONED',
    });
  }
  async deprovisionSandbox(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const sandboxId = input['sandboxId'] as string;
    if (!sandboxId) {
      return DataProcessResult.failure('INVALID_INPUT', 'sandboxId required');
    }
    await this.dbFabric.storeDocument(
      MARKETPLACE_SANDBOXES_INDEX,
      {
        sandboxId,
        status: 'DEPROVISIONED',
        deprovisionedAt: new Date().toISOString(),
      },
      sandboxId,
    );
    return DataProcessResult.success({ sandboxId, status: 'DEPROVISIONED' });
  }
}
