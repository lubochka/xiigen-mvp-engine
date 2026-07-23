/**
 * BootstrapSeeder — One-time seed of the XIIGen platform master tenant.
 *
 * The platform master tenant is the engine's own admin identity — distinct from
 * regular user tenants, which receive random UUIDs on creation.
 *
 * On first startup:
 *   1. Ensures platform master tenant exists in TenantRegistry with MASTER_TENANT_ID
 *   2. Reads BOOTSTRAP_ANTHROPIC_KEY, BOOTSTRAP_OPENAI_KEY, BOOTSTRAP_GEMINI_KEY
 *   3. Encrypts each key using TENANT_KEY_ENCRYPTION_SECRET (AES-256-GCM)
 *   4. Writes providers record to xiigen-byok-keys keyed by MASTER_TENANT_ID::byok
 *
 * On subsequent startups:
 *   - findById(MASTER_TENANT_ID) succeeds → tenant already in registry
 *   - Idempotency check on MASTER_TENANT_ID key → skips BYOK write
 *
 * MASTER_TENANT_ID is a fixed well-known identifier (not random) so that:
 *   - BYOK lookup is stable across restarts (same UUID → same DB doc key)
 *   - Cross-service references to the platform tenant never break
 *   - No ES round-trip needed to recover the UUID
 *
 * Requests: use X-Tenant-Id: xiigen (name lookup) or X-Tenant-Id: <MASTER_TENANT_ID>
 * BYOK keys always stored and read by MASTER_TENANT_ID (UUID), not the name string.
 *
 * P26 A-0 BOOTSTRAP-SEEDER.
 */

import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { DataProcessResult } from '../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IIdempotencyStore, IDEMPOTENCY_STORE } from '../kernel/multi-tenant/idempotency.types';
import { TenantRegistry } from '../kernel/multi-tenant/tenant-registry.service';

/** Encryption algorithm. */
const ALGORITHM = 'aes-256-gcm';
/** IV length in bytes. */
const IV_LENGTH = 16;
/** Auth tag length in bytes. */
const AUTH_TAG_LENGTH = 16;
/** Index where provider pools are stored. */
const BYOK_INDEX = 'xiigen-byok-keys';
/** Idempotency key suffix for bootstrap BYOK write. */
const BOOTSTRAP_IDEMPOTENCY_KEY = 'bootstrap::master-tenant-byok';

/**
 * Fixed well-known UUID for the XIIGen platform master tenant.
 * Regular user tenants receive randomUUID() on creation. The platform
 * master tenant uses this deterministic ID so BYOK storage is stable
 * across restarts and cross-service references never break.
 */
export const MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';
export const MASTER_TENANT_NAME = 'xiigen';

export interface ProviderEntry {
  id: string;
  type: 'anthropic' | 'openai' | 'gemini' | string;
  encryptedKey: string;
  availableModels: string[];
  addedAt: string;
}

export interface BootstrapSeedResult {
  tenantId: string;
  tenantName: string;
  providerCount: number;
  skipped: boolean;
  warning?: string;
}

@Injectable()
export class BootstrapSeeder {
  private readonly logger = new Logger(BootstrapSeeder.name);

  constructor(
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
    @Optional() @Inject(IDEMPOTENCY_STORE) private readonly idempotency?: IIdempotencyStore,
    @Optional() private readonly registry?: TenantRegistry,
  ) {}

  /**
   * Run the bootstrap seed. Idempotent — safe to call on every startup.
   *
   * DNA-3: never throws. Returns DataProcessResult.
   * DNA-8: byok-keys record stored before any event/log marks completion.
   */
  async run(): Promise<DataProcessResult<BootstrapSeedResult>> {
    // ── Step 1: Ensure platform master tenant exists in TenantRegistry ─────────
    if (this.registry) {
      const existing = await this.registry.findById(MASTER_TENANT_ID);
      if (!existing.isSuccess) {
        const created = await this.registry.create({
          id: MASTER_TENANT_ID,
          name: MASTER_TENANT_NAME,
          plan: {
            name: 'enterprise',
            maxApiCallsPerMinute: 10000,
            maxTokensPerDay: 100_000_000,
            maxStorageMb: 100_000,
          },
        });
        if (!created.isSuccess) {
          return DataProcessResult.failure(
            'MASTER_TENANT_CREATE_FAILED',
            `BootstrapSeeder: cannot create platform master tenant: ${created.errorMessage}`,
          );
        }
        this.logger.log(
          `[BootstrapSeeder] Platform master tenant '${MASTER_TENANT_NAME}' created ` +
            `(id=${MASTER_TENANT_ID}). Use X-Tenant-Id: ${MASTER_TENANT_NAME} or ` +
            `X-Tenant-Id: ${MASTER_TENANT_ID}`,
        );
      } else {
        this.logger.log(
          `[BootstrapSeeder] Platform master tenant '${MASTER_TENANT_NAME}' ` +
            `(id=${MASTER_TENANT_ID}) found in registry`,
        );
      }
    }

    // ── Step 2: Idempotency check — skip BYOK write if already done ────────────
    if (this.idempotency) {
      const idempKey = { tenantId: MASTER_TENANT_ID, key: BOOTSTRAP_IDEMPOTENCY_KEY };
      const checkResult = await this.idempotency.checkAndSet(idempKey);
      if (!checkResult.isSuccess) {
        this.logger.log(`[BootstrapSeeder] Platform master tenant BYOK already seeded — skipping`);
        return DataProcessResult.success({
          tenantId: MASTER_TENANT_ID,
          tenantName: MASTER_TENANT_NAME,
          providerCount: 0,
          skipped: true,
        });
      }
    }

    // ── Step 3: Collect BOOTSTRAP_* keys from env ───────────────────────────────
    const providers = this.collectProviders();

    if (providers.length === 0) {
      const warning = `No BOOTSTRAP_* keys found in .env — no providers seeded for '${MASTER_TENANT_NAME}'.`;
      this.logger.warn(`[BootstrapSeeder] ${warning}`);
      if (this.idempotency) {
        await this.idempotency.release({
          tenantId: MASTER_TENANT_ID,
          key: BOOTSTRAP_IDEMPOTENCY_KEY,
        });
      }
      return DataProcessResult.success({
        tenantId: MASTER_TENANT_ID,
        tenantName: MASTER_TENANT_NAME,
        providerCount: 0,
        skipped: false,
        warning,
      });
    }

    if (providers.length === 1) {
      this.logger.warn(
        `[BootstrapSeeder] ⚠️  Single-provider pool for '${MASTER_TENANT_NAME}'. ` +
          `Add BOOTSTRAP_OPENAI_KEY + BOOTSTRAP_GEMINI_KEY for 3-provider calibration.`,
      );
    }

    // ── Step 4: Encrypt provider keys ──────────────────────────────────────────
    const encryptedProviders = this.encryptProviders(providers);
    if (!encryptedProviders.isSuccess) {
      if (this.idempotency) {
        await this.idempotency.release({
          tenantId: MASTER_TENANT_ID,
          key: BOOTSTRAP_IDEMPOTENCY_KEY,
        });
      }
      return DataProcessResult.failure(
        encryptedProviders.errorCode!,
        encryptedProviders.errorMessage!,
      );
    }

    // ── Step 5: DNA-8 — write byok-keys FIRST, keyed by MASTER_TENANT_ID ──────
    if (this.db) {
      const now = new Date().toISOString();
      const storeResult = await this.db.storeDocument(
        BYOK_INDEX,
        {
          tenantId: MASTER_TENANT_ID,
          tenantName: MASTER_TENANT_NAME,
          providers: encryptedProviders.data!,
          createdAt: now,
          updatedAt: now,
          seededBy: 'BootstrapSeeder',
        },
        `${MASTER_TENANT_ID}::byok`, // UUID-keyed — matches TenantContextMiddleware lookup
      );
      if (!storeResult.isSuccess) {
        if (this.idempotency) {
          await this.idempotency.release({
            tenantId: MASTER_TENANT_ID,
            key: BOOTSTRAP_IDEMPOTENCY_KEY,
          });
        }
        return DataProcessResult.failure(
          storeResult.errorCode ?? 'DB_WRITE_FAILED',
          `BootstrapSeeder: failed to write byok-keys — ${storeResult.errorMessage}`,
        );
      }
    }

    this.logger.log(
      `[BootstrapSeeder] ✅ Platform master tenant '${MASTER_TENANT_NAME}' ` +
        `(${MASTER_TENANT_ID}) seeded with ${providers.length} provider(s). ` +
        `BOOTSTRAP_* lines can be removed from .env after first run.`,
    );

    return DataProcessResult.success({
      tenantId: MASTER_TENANT_ID,
      tenantName: MASTER_TENANT_NAME,
      providerCount: providers.length,
      skipped: false,
    });
  }

  private encryptProviders(
    providers: Array<{ id: string; type: string; plainKey: string; availableModels: string[] }>,
  ): DataProcessResult<ProviderEntry[]> {
    const secret = process.env['TENANT_KEY_ENCRYPTION_SECRET'];
    if (!secret) {
      return DataProcessResult.failure(
        'MISSING_ENCRYPTION_SECRET',
        'TENANT_KEY_ENCRYPTION_SECRET not set — cannot encrypt provider keys',
      );
    }
    const secretKey = createHash('sha256').update(secret).digest();
    const entries: ProviderEntry[] = [];
    for (const p of providers) {
      const encResult = this.encrypt(p.plainKey, secretKey);
      if (!encResult.isSuccess)
        return DataProcessResult.failure(encResult.errorCode!, encResult.errorMessage!);
      entries.push({
        id: p.id,
        type: p.type,
        encryptedKey: encResult.data!,
        availableModels: p.availableModels,
        addedAt: new Date().toISOString(),
      });
    }
    return DataProcessResult.success(entries);
  }

  encrypt(plaintext: string, secretKey: Buffer): DataProcessResult<string> {
    try {
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, secretKey, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const authTag = cipher.getAuthTag();
      return DataProcessResult.success(Buffer.concat([iv, authTag, encrypted]).toString('base64'));
    } catch (e) {
      return DataProcessResult.failure('ENCRYPT_FAILED', `Encryption error: ${String(e)}`);
    }
  }

  decrypt(ciphertext: string, secretKey: Buffer): DataProcessResult<string> {
    try {
      const combined = Buffer.from(ciphertext, 'base64');
      if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        return DataProcessResult.failure('DECRYPT_FAILED', 'Ciphertext too short');
      }
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      const decipher = createDecipheriv(ALGORITHM, secretKey, iv);
      decipher.setAuthTag(authTag);
      return DataProcessResult.success(
        Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'),
      );
    } catch (e) {
      return DataProcessResult.failure('DECRYPT_FAILED', `Decryption error: ${String(e)}`);
    }
  }

  private collectProviders() {
    const providers: Array<{
      id: string;
      type: string;
      plainKey: string;
      availableModels: string[];
    }> = [];
    const anthropicKey = process.env['BOOTSTRAP_ANTHROPIC_KEY'];
    if (anthropicKey)
      providers.push({
        id: 'p1',
        type: 'anthropic',
        plainKey: anthropicKey,
        availableModels: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'],
      });
    const openaiKey = process.env['BOOTSTRAP_OPENAI_KEY'];
    if (openaiKey)
      providers.push({
        id: 'p2',
        type: 'openai',
        plainKey: openaiKey,
        availableModels: ['gpt-4o', 'gpt-4o-mini'],
      });
    const geminiKey = process.env['BOOTSTRAP_GEMINI_KEY'];
    if (geminiKey)
      providers.push({
        id: 'p3',
        type: 'gemini',
        plainKey: geminiKey,
        availableModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
      });
    return providers;
  }
}
