/**
 * ModuleAdoptionService — copy-on-adopt for MODULE-scope templates.
 *
 * Adoption copies the module's RAG snapshot into the adopter's private namespace.
 * Dev mode: no pricing enforcement.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: adoption record stored before RAG copy dispatch.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { PricingModel } from './knowledge-policy.service';
import {
  ModuleLibraryEntry,
  ModuleLibraryService,
  MODULE_LIBRARY_INDEX,
} from './module-library.service';

export const MODULE_ADOPTIONS_INDEX = 'xiigen-module-adoptions';

export interface ModuleAdoption {
  adoptionId: string;
  moduleId: string;
  adoptingTenantId: string;
  ownerTenantId: string;
  flowId: string;
  phase: string;
  adoptedAt: string;
  pricingModel: PricingModel | null;
  copiedToRag: boolean;
  ragNamespace: string;
}

@Injectable()
export class ModuleAdoptionService {
  private readonly logger = new Logger(ModuleAdoptionService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    private readonly moduleLibrary: ModuleLibraryService,
  ) {}

  /**
   * Adopt a module into the adopting tenant's namespace.
   * 1. Look up module in library
   * 2. Check for duplicate adoption
   * 3. Write adoption record (DNA-8: before RAG copy)
   * 4. Copy RAG patterns to adopter namespace
   * 5. Increment adoptionCount (non-blocking)
   */
  async adopt(
    adoptingTenantId: string,
    moduleId: string,
  ): Promise<DataProcessResult<ModuleAdoption>> {
    try {
      // 1. Look up module
      const moduleResult = await this.db.getDocument(MODULE_LIBRARY_INDEX, moduleId);
      if (!moduleResult.isSuccess) {
        return DataProcessResult.failure('MODULE_NOT_FOUND', `Module ${moduleId} not found`);
      }
      const module = moduleResult.data as unknown as ModuleLibraryEntry;

      // 2. Duplicate check
      const existingResult = await this.db.searchDocuments(MODULE_ADOPTIONS_INDEX, {
        moduleId,
        adoptingTenantId,
      });
      if (existingResult.isSuccess) {
        const already = (existingResult.data as unknown as ModuleAdoption[]).find(
          (a) => a.moduleId === moduleId && a.adoptingTenantId === adoptingTenantId,
        );
        if (already) {
          return DataProcessResult.failure(
            'ALREADY_ADOPTED',
            `Tenant ${adoptingTenantId} already adopted ${moduleId}`,
          );
        }
      }

      const ragNamespace = `adopted::${adoptingTenantId}::${moduleId}`;
      const adoption: ModuleAdoption = {
        adoptionId: randomUUID(),
        moduleId,
        adoptingTenantId,
        ownerTenantId: module.ownerId,
        flowId: module.flowId,
        phase: module.phase,
        adoptedAt: new Date().toISOString(),
        pricingModel: module.pricingModel,
        copiedToRag: false,
        ragNamespace,
      };

      // 3. DNA-8: store adoption record before RAG copy
      const storeResult = await this.db.storeDocument(
        MODULE_ADOPTIONS_INDEX,
        { ...adoption },
        adoption.adoptionId,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure('STORE_FAILED', storeResult.errorMessage ?? '');
      }

      // 4. Copy RAG to adopter namespace (best-effort in dev mode)
      const copied = await this.copyRagToNamespace(module, ragNamespace, adoptingTenantId);
      if (copied) {
        // Update copiedToRag flag
        await this.db
          .storeDocument(
            MODULE_ADOPTIONS_INDEX,
            { ...adoption, copiedToRag: true },
            adoption.adoptionId,
          )
          .catch(() => {
            /* non-blocking */
          });
        adoption.copiedToRag = true;
      }

      // 5. Increment adoptionCount (non-blocking)
      this.moduleLibrary.incrementAdoptionCount(moduleId).catch(() => {
        /* non-blocking */
      });

      return DataProcessResult.success({ ...adoption, copiedToRag: copied });
    } catch (err) {
      return DataProcessResult.failure('UNEXPECTED', String(err));
    }
  }

  /**
   * Copy RAG patterns from the module owner's namespace into the adopter's namespace.
   * Queries xiigen-rag-patterns for records tagged with (moduleId OR ragSnapshotId),
   * writes each into the adopter's private namespace with ragNamespace label.
   * If no source records found, writes a single marker record so copiedToRag = true.
   * Best-effort: returns false only on total failure; partial copies still return true.
   */
  private async copyRagToNamespace(
    module: ModuleLibraryEntry,
    ragNamespace: string,
    adoptingTenantId: string,
  ): Promise<boolean> {
    try {
      // Find source RAG records: owned by module owner and tagged with this moduleId
      const sourceResult = await this.db.searchDocuments('xiigen-rag-patterns', {
        ownerId: module.ownerId,
        moduleId: module.moduleId,
      });

      const sources = sourceResult.isSuccess
        ? (sourceResult.data as Array<Record<string, unknown>>)
        : [];

      if (sources.length === 0) {
        // No source records yet (module has no RAG content) — write marker only
        await this.db.storeDocument(
          'xiigen-rag-patterns',
          {
            namespace: ragNamespace,
            tenantId: adoptingTenantId,
            moduleId: module.moduleId,
            sourceSnapshotId: module.ragSnapshotId ?? null,
            knowledgeScope: 'PRIVATE',
            ownerId: adoptingTenantId,
            copiedFromOwner: module.ownerId,
            createdAt: new Date().toISOString(),
          },
          `adopted-rag::${adoptingTenantId}::${module.moduleId}::marker`,
        );
        return true;
      }

      // Copy each source record into the adopter's namespace
      let copied = 0;
      for (const src of sources) {
        const copyId = `adopted-rag::${adoptingTenantId}::${module.moduleId}::${src['_id'] ?? copied}`;
        const writeResult = await this.db.storeDocument(
          'xiigen-rag-patterns',
          {
            ...src,
            _id: undefined,
            namespace: ragNamespace,
            tenantId: adoptingTenantId,
            knowledgeScope: 'PRIVATE',
            ownerId: adoptingTenantId,
            copiedFromOwner: module.ownerId,
            moduleId: module.moduleId,
            createdAt: new Date().toISOString(),
          },
          copyId,
        );
        if (writeResult.isSuccess) copied++;
      }
      return copied > 0;
    } catch {
      this.logger.warn(`ModuleAdoptionService: RAG copy failed for module ${module.moduleId}`);
      return false;
    }
  }

  /** List all adoptions by tenantId. DNA-3: never throws. */
  async listAdoptions(tenantId: string): Promise<DataProcessResult<ModuleAdoption[]>> {
    try {
      const result = await this.db.searchDocuments(MODULE_ADOPTIONS_INDEX, {
        adoptingTenantId: tenantId,
      });
      if (!result.isSuccess) {
        return DataProcessResult.failure('SEARCH_FAILED', result.errorMessage ?? '');
      }
      const adoptions = (result.data as unknown as ModuleAdoption[]).filter(
        (a) => a.adoptingTenantId === tenantId,
      );
      return DataProcessResult.success(adoptions);
    } catch (err) {
      return DataProcessResult.failure('UNEXPECTED', String(err));
    }
  }
}
