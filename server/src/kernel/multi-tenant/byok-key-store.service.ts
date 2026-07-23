/**
 * ByokKeyStoreService — Encrypt/decrypt per-tenant provider keys in xiigen-byok-keys.
 *
 * Shared between:
 *   - TenantController: writeKeys() called on PUT /tenants/:id/keys
 *   - TenantContextMiddleware: readKeys() called per request to populate TenantContext.apiKeys
 *
 * Encryption: AES-256-GCM (same as BootstrapSeeder).
 * Secret: TENANT_KEY_ENCRYPTION_SECRET env var (SHA-256 derived → 32-byte key).
 * Format: base64(iv[16] + authTag[16] + ciphertext).
 *
 * DNA-3: never throws, always returns DataProcessResult.
 * DNA-8: storeDocument before returning from writeKeys.
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../data-process-result';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const BYOK_INDEX = 'xiigen-byok-keys';

interface ByokProviderEntry {
  id: string;
  type: string;
  encryptedKey: string;
  availableModels: string[];
  addedAt: string;
}

@Injectable()
export class ByokKeyStoreService {
  private readonly logger = new Logger(ByokKeyStoreService.name);

  constructor(@Optional() @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService | null) {}

  /**
   * Encrypt provider keys and persist to xiigen-byok-keys.
   * keys = { anthropic: 'sk-ant-...', openai: 'sk-...', gemini: 'AIza...' }
   */
  async writeKeys(
    tenantId: string,
    keys: Record<string, string>,
  ): Promise<DataProcessResult<void>> {
    if (!this.db) {
      return DataProcessResult.failure(
        'BYOK_NO_DB',
        'Database not available — keys stored in memory only',
      );
    }

    const secret = process.env['TENANT_KEY_ENCRYPTION_SECRET'];
    if (!secret) {
      this.logger.warn('TENANT_KEY_ENCRYPTION_SECRET not set — skipping byok-keys persistence');
      return DataProcessResult.failure('BYOK_NO_SECRET', 'TENANT_KEY_ENCRYPTION_SECRET not set');
    }

    const secretKey = createHash('sha256').update(secret).digest();
    const providers: ByokProviderEntry[] = [];
    let idx = 1;

    for (const [type, plainKey] of Object.entries(keys)) {
      if (!plainKey) continue;
      const encResult = this.encrypt(plainKey, secretKey);
      if (!encResult.isSuccess) {
        return DataProcessResult.failure(encResult.errorCode!, encResult.errorMessage!);
      }
      providers.push({
        id: `p${idx++}`,
        type,
        encryptedKey: encResult.data!,
        availableModels: this.modelsFor(type),
        addedAt: new Date().toISOString(),
      });
    }

    // DNA-8: storeDocument before returning
    const doc: Record<string, unknown> = {
      tenantId,
      providers,
      updatedAt: new Date().toISOString(),
    };
    const storeResult = await this.db.storeDocument(BYOK_INDEX, doc, `${tenantId}::byok`);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
    }

    this.logger.log(
      `byok-keys written for tenant ${tenantId}: ${providers.map((p) => p.type).join(', ')}`,
    );
    return DataProcessResult.success(undefined as unknown as void);
  }

  /**
   * Read and decrypt provider keys for a tenant.
   * Returns Record<providerType, plaintextKey> — empty if not found or decryption fails.
   */
  async readKeys(tenantId: string): Promise<DataProcessResult<Record<string, string>>> {
    if (!this.db) return DataProcessResult.success({});

    const secret = process.env['TENANT_KEY_ENCRYPTION_SECRET'];
    if (!secret) return DataProcessResult.success({});

    const secretKey = createHash('sha256').update(secret).digest();
    const result = await this.db.getDocument(BYOK_INDEX, `${tenantId}::byok`);
    if (!result.isSuccess || !result.data) return DataProcessResult.success({});

    const providers = (result.data['providers'] as ByokProviderEntry[]) ?? [];
    const keys: Record<string, string> = {};

    for (const p of providers) {
      const decResult = this.decrypt(p.encryptedKey, secretKey);
      if (decResult.isSuccess && decResult.data) {
        keys[p.type] = decResult.data;
      }
    }

    return DataProcessResult.success(keys);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private encrypt(plaintext: string, secretKey: Buffer): DataProcessResult<string> {
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

  private decrypt(ciphertext: string, secretKey: Buffer): DataProcessResult<string> {
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

  private modelsFor(type: string): string[] {
    switch (type) {
      case 'anthropic':
        return ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001'];
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini'];
      case 'gemini':
        return ['gemini-2.0-flash', 'gemini-1.5-pro'];
      default:
        return [];
    }
  }
}
