/**
 * T516 MarketplacePackageCreator [ORCHESTRATION]
 * FLOW-32: Sharable Flows & RAG Template Marketplace
 *
 * Creates marketplace package from flow definition + RAG patterns.
 * Stores content by SHA-256 hash (DD-326).
 *
 * Iron rules:
 *   IR-1: Content-addressable storage via hash (DD-326, CF-717)
 *   IR-2: Logic plane only — no data plane writes (DD-323, CF-718)
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_PACKAGES_INDEX = 'xiigen-marketplace-packages';
const MARKETPLACE_CONTENT_HASHES_INDEX = 'xiigen-marketplace-content-hashes';

@Injectable()
export class MarketplacePackageCreatorService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T516',
        serviceName: 'MarketplacePackageCreatorService',
        flowId: 'FLOW-32',
      }),
    });
  }

  /**
   * Creates marketplace package with content-addressable storage.
   * Logic plane only (DD-323).
   */
  async createPackage(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageName = input['packageName'] as string;
    const flowDefinition = input['flowDefinition'] as Record<string, unknown>;
    const ragPatterns = input['ragPatterns'] as Record<string, unknown>[];
    const publisherId = input['publisherId'] as string;

    if (!packageName || !flowDefinition || !publisherId) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'packageName, flowDefinition, publisherId required',
      );
    }

    // ── Compute SHA-256 hash of content (IR-1, DD-326, CF-717) ──────────────────
    const contentData = JSON.stringify({
      flowDefinition,
      ragPatterns: ragPatterns ?? [],
    });
    const contentHash = createHash('sha256').update(contentData).digest('hex');

    // Check if content already stored
    const existingResult = await this.dbFabric.searchDocuments(MARKETPLACE_CONTENT_HASHES_INDEX, {
      contentHash,
    });

    if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
      const existing = existingResult.data![0] as Record<string, unknown>;
      return DataProcessResult.success({
        packageId: existing['packageId'],
        contentHash,
        alreadyExists: true,
      });
    }

    // Store content by hash
    const packageId = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_CONTENT_HASHES_INDEX,
      {
        packageId,
        contentHash,
        packageName,
        publisherId,
        createdAt: new Date().toISOString(),
      },
      contentHash,
    );

    // Store package metadata
    await this.dbFabric.storeDocument(
      MARKETPLACE_PACKAGES_INDEX,
      {
        packageId,
        packageName,
        publisherId,
        flowDefinition,
        ragPatterns: ragPatterns ?? [],
        contentHash,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
      },
      packageId,
    );

    return DataProcessResult.success({
      packageId,
      packageName,
      contentHash,
      status: 'DRAFT',
    });
  }
}
