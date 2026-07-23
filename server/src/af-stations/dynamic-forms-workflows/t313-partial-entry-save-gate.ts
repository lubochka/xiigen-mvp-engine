/**
 * T313PartialEntrySaveGate — GAP-21-05
 *
 * DR-142: Two-phase durable draft storage.
 *   Phase 1: Redis (always — fast path for autosave, CF-387: TTL required)
 *   Phase 2: PG (on manual save — durable backup; Redis TTL extended after PG write)
 *
 * Before fix: Only Phase 1 (Redis TTL) was implemented.
 *   Workaround: PARTIAL_SAVE_TTL_SECONDS=604800 (7 days).
 * After fix: Phase 2 (PG) on manual save; resume falls back to PG on Redis miss.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-5: tenantId from AsyncLocalStorage (not a parameter)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';

const DEFAULT_TTL = 86400; // 24 hours

export interface PartialSaveResult {
  sessionId: string;
  phase: 'redis' | 'redis+pg';
  ttlSeconds: number;
}

/** Injection token for IPartialSaveService (Redis) */
export const PARTIAL_SAVE_SERVICE = 'PARTIAL_SAVE_SERVICE';

export interface IPartialSaveService {
  set(
    key: string,
    fields: Record<string, unknown>,
    ttlSeconds: number,
  ): Promise<DataProcessResult<void>>;
  get(key: string): Promise<DataProcessResult<Record<string, unknown> | null>>;
  extend(key: string, ttlSeconds: number): Promise<DataProcessResult<void>>;
}

/** Injection token for IPartialSavePgService (PostgreSQL two-phase) */
export const PARTIAL_SAVE_PG_SERVICE = 'PARTIAL_SAVE_PG_SERVICE';

export interface IPartialSavePgService {
  upsertPartialEntry(entry: {
    sessionId: string;
    formId: string;
    fieldData: Record<string, unknown>;
    expiresAt: string;
    savedAt: string;
  }): Promise<DataProcessResult<void>>;
  getPartialEntry(sessionId: string): Promise<DataProcessResult<Record<string, unknown> | null>>;
}

@Injectable()
export class T313PartialEntrySaveGate {
  private readonly logger = new Logger(T313PartialEntrySaveGate.name);

  constructor(
    @Inject(PARTIAL_SAVE_SERVICE) private readonly redisService: IPartialSaveService,
    @Inject(PARTIAL_SAVE_PG_SERVICE) private readonly pgService: IPartialSavePgService,
  ) {}

  async savePartialEntry(
    sessionId: string,
    formId: string,
    fields: Record<string, unknown>,
    saveType: 'auto' | 'manual',
  ): Promise<DataProcessResult<PartialSaveResult>> {
    const ttl = DEFAULT_TTL; // In production, read from FREEDOM config: PARTIAL_SAVE_TTL_SECONDS
    const key = `partial-entry:${sessionId}`;

    // Phase 1: Redis (always — fast path for autosave)
    const redisResult = await this.redisService.set(key, fields, ttl); // CF-387: TTL required
    if (!redisResult.isSuccess) {
      return DataProcessResult.failure('PARTIAL_SAVE_REDIS_FAILED', 'Redis write failed');
    }

    // Phase 2: PG two-phase commit (on trigger conditions)
    const shouldPersistToPg = this.shouldTriggerPgWrite(saveType);
    if (shouldPersistToPg) {
      const pgResult = await this.executePgTwoPhaseCommit(sessionId, formId, fields, ttl);
      if (pgResult.isSuccess) {
        // PG is now the durable backup; extend Redis TTL
        await this.redisService.extend(key, ttl * 2);
        this.logger.log(`T313: phase 2 PG write successful for session ${sessionId}`);
      } else {
        // PG failure does not fail the overall save — Redis is still live
        this.logger.warn(
          `T313: phase 2 PG write failed for session ${sessionId}`,
          pgResult.errorMessage,
        );
      }
    }

    return DataProcessResult.success({
      sessionId,
      phase: shouldPersistToPg ? 'redis+pg' : 'redis',
      ttlSeconds: ttl,
    });
  }

  async resumePartialEntry(sessionId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    const key = `partial-entry:${sessionId}`;

    // Try Redis first (fast path)
    const redisResult = await this.redisService.get(key);
    if (redisResult.isSuccess && redisResult.data) {
      return DataProcessResult.success(redisResult.data as Record<string, unknown>);
    }

    // Redis miss — fall back to PG (slow path, DR-142)
    const pgResult = await this.pgService.getPartialEntry(sessionId);
    if (pgResult.isSuccess && pgResult.data) {
      // Restore to Redis for subsequent fast access
      await this.redisService.set(key, pgResult.data as Record<string, unknown>, DEFAULT_TTL);
      this.logger.log(`T313: restored draft for session ${sessionId} from PG fallback`);
      return DataProcessResult.success(pgResult.data as Record<string, unknown>);
    }

    return DataProcessResult.failure(
      'PARTIAL_ENTRY_NOT_FOUND',
      'Draft has expired or was not found',
    );
  }

  private shouldTriggerPgWrite(saveType: 'auto' | 'manual'): boolean {
    if (saveType === 'manual') return true; // Always persist on explicit save
    // Auto-save: PG write NOT triggered on autosave (no overhead per save)
    return false;
  }

  private async executePgTwoPhaseCommit(
    sessionId: string,
    formId: string,
    fields: Record<string, unknown>,
    ttl: number,
  ): Promise<DataProcessResult<void>> {
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return this.pgService.upsertPartialEntry({
      sessionId,
      formId,
      fieldData: fields,
      expiresAt,
      savedAt: new Date().toISOString(),
    });
  }
}
