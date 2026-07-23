/**
 * T517 PackageVersionManager [ORCHESTRATION]
 * FLOW-32: Sharable Flows & RAG Template Marketplace
 *
 * Manages package versions with immutability (DD-325).
 * Forced security patches create new versions (DD-328).
 *
 * Iron rules:
 *   IR-1: Immutable versions — published versions cannot be modified (DD-325)
 *   IR-2: Security patches create new version (DD-328, CREATE_NEW_VERSION policy)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_VERSIONS_INDEX = 'xiigen-marketplace-versions';

@Injectable()
export class PackageVersionManagerService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T517',
        serviceName: 'PackageVersionManagerService',
        flowId: 'FLOW-32',
      }),
    });
  }

  /**
   * Creates immutable package version.
   * Security patches trigger CREATE_NEW_VERSION (DD-328).
   */
  async createVersion(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const versionTag = input['versionTag'] as string;
    const packageContent = input['packageContent'] as Record<string, unknown>;
    const securityPatch = input['securityPatch'] as boolean | undefined;

    if (!packageId || !versionTag || !packageContent) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'packageId, versionTag, packageContent required',
      );
    }

    // Check if version already exists (immutable)
    const existingResult = await this.dbFabric.searchDocuments(MARKETPLACE_VERSIONS_INDEX, {
      packageId,
      versionTag,
    });

    if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
      return DataProcessResult.failure(
        'VERSION_IMMUTABLE',
        `Version ${versionTag} already published and is immutable (DD-325)`,
      );
    }

    const versionId = `ver-${packageId}-${versionTag}-${Date.now()}`;

    // Handle security patch (DD-328): always create new version
    const patchPolicy = securityPatch ? 'CREATE_NEW_VERSION' : 'INHERIT';

    await this.dbFabric.storeDocument(
      MARKETPLACE_VERSIONS_INDEX,
      {
        versionId,
        packageId,
        versionTag,
        packageContent,
        isPublished: false,
        patchPolicy,
        isSecurityPatch: securityPatch ?? false,
        createdAt: new Date().toISOString(),
      },
      versionId,
    );

    return DataProcessResult.success({
      versionId,
      packageId,
      versionTag,
      patchPolicy,
      isImmutable: false,
    });
  }

  /**
   * Publishes version (becomes immutable).
   */
  async publishVersion(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const versionId = input['versionId'] as string;

    if (!versionId) {
      return DataProcessResult.failure('INVALID_INPUT', 'versionId required');
    }

    const result = await this.dbFabric.searchDocuments(MARKETPLACE_VERSIONS_INDEX, {
      versionId,
    });

    if (!result.isSuccess || !result.data?.length) {
      return DataProcessResult.failure('NOT_FOUND', `Version ${versionId} not found`);
    }

    const version = result.data[0] as Record<string, unknown>;

    // Mark as published (now immutable)
    await this.dbFabric.storeDocument(
      MARKETPLACE_VERSIONS_INDEX,
      { ...version, isPublished: true, publishedAt: new Date().toISOString() },
      versionId,
    );

    return DataProcessResult.success({
      versionId,
      isPublished: true,
      isImmutable: true,
    });
  }
}
