/**
 * ModuleLibraryService — registry of shareable MODULE-scope templates.
 *
 * MODULE entries are visible to all tenants for adoption.
 * GLOBAL entries are platform-approved and searchable without adoption.
 * PRIVATE entries never appear in browse results.
 *
 * DNA-3: all methods return DataProcessResult or void, never throw.
 * DNA-8: storeDocument before any downstream dispatch.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { KnowledgeScope, PricingModel } from './knowledge-policy.service';

export const MODULE_LIBRARY_INDEX = 'xiigen-module-library';

export interface ModuleLibraryEntry {
  moduleId: string;
  flowId: string;
  phase: string;
  title: string;
  description: string;
  ownerId: string;
  scope: KnowledgeScope;
  pricingModel: PricingModel | null;
  pricePerUse: number | null;
  adoptionCount: number;
  ragSnapshotId: string | null;
  graphSnapshotId: string | null;
  promptVersions: string[];
  calibrationIds: string[];
  version: string;
  approvedForGlobal: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
}

export interface ModuleRegistrationInput {
  flowId: string;
  phase: string;
  title: string;
  description: string;
  ownerId: string;
  ragSnapshotId?: string;
  graphSnapshotId?: string;
  promptVersions?: string[];
  calibrationIds?: string[];
}

@Injectable()
export class ModuleLibraryService {
  private readonly logger = new Logger(ModuleLibraryService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  /**
   * Register a module. Scope = MODULE at registration.
   * Idempotent by (ownerId, flowId, phase): returns existing entry if found.
   */
  async registerModule(
    input: ModuleRegistrationInput,
  ): Promise<DataProcessResult<ModuleLibraryEntry>> {
    try {
      // Idempotency check
      const existingResult = await this.db.searchDocuments(MODULE_LIBRARY_INDEX, {
        ownerId: input.ownerId,
        flowId: input.flowId,
        phase: input.phase,
      });
      if (existingResult.isSuccess) {
        const existing = (existingResult.data as unknown as ModuleLibraryEntry[]).find(
          (e) =>
            e.ownerId === input.ownerId && e.flowId === input.flowId && e.phase === input.phase,
        );
        if (existing) {
          return DataProcessResult.success(existing);
        }
      }

      const entry: ModuleLibraryEntry = {
        moduleId: randomUUID(),
        flowId: input.flowId,
        phase: input.phase,
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        scope: 'MODULE',
        pricingModel: null,
        pricePerUse: null,
        adoptionCount: 0,
        ragSnapshotId: input.ragSnapshotId ?? null,
        graphSnapshotId: input.graphSnapshotId ?? null,
        promptVersions: input.promptVersions ?? [],
        calibrationIds: input.calibrationIds ?? [],
        version: '1.0.0',
        approvedForGlobal: false,
        approvedAt: null,
        approvedBy: null,
        createdAt: new Date().toISOString(),
      };

      const storeResult = await this.db.storeDocument(
        MODULE_LIBRARY_INDEX,
        { ...entry },
        entry.moduleId,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure('STORE_FAILED', storeResult.errorMessage ?? '');
      }
      return DataProcessResult.success(entry);
    } catch (err) {
      return DataProcessResult.failure('UNEXPECTED', String(err));
    }
  }

  /**
   * Browse MODULE + GLOBAL entries. PRIVATE entries excluded.
   * Optional filter by flowId, phase, ownerId.
   */
  async browse(filter?: {
    flowId?: string;
    phase?: string;
    ownerId?: string;
  }): Promise<DataProcessResult<ModuleLibraryEntry[]>> {
    try {
      const result = await this.db.searchDocuments(MODULE_LIBRARY_INDEX, filter ?? {});
      if (!result.isSuccess) {
        return DataProcessResult.failure('SEARCH_FAILED', result.errorMessage ?? '');
      }
      const entries = (result.data as unknown as ModuleLibraryEntry[]).filter(
        (e) => e.scope === 'MODULE' || e.scope === 'GLOBAL',
      );
      return DataProcessResult.success(entries);
    } catch (err) {
      return DataProcessResult.failure('UNEXPECTED', String(err));
    }
  }

  /** Increment adoptionCount. Non-blocking — failure is cosmetic. */
  async incrementAdoptionCount(moduleId: string): Promise<void> {
    try {
      const result = await this.db.getDocument(MODULE_LIBRARY_INDEX, moduleId);
      if (!result.isSuccess) return;
      const entry = result.data as unknown as ModuleLibraryEntry;
      await this.db.storeDocument(
        MODULE_LIBRARY_INDEX,
        { ...entry, adoptionCount: (entry.adoptionCount ?? 0) + 1 },
        moduleId,
      );
    } catch {
      this.logger.warn(`ModuleLibraryService: incrementAdoptionCount failed for ${moduleId}`);
    }
  }
}
