/**
 * TenantKeyGenerator — Tenant-namespaced document IDs and idempotency keys.
 *
 * All DATABASE FABRIC document IDs must encode their tenant so cross-tenant
 * collision is structurally impossible. All idempotency keys are tenant-scoped
 * so two tenants submitting identical payloads never conflate.
 *
 * P26 FIX-1.
 */

import { createHash, randomUUID } from 'crypto';

export class TenantKeyGenerator {
  /**
   * Generate a tenant-namespaced document ID.
   *
   * Format: "{tenantId}::{uuid}"
   * With hint: "{tenantId}::{hint}::{uuid}"
   *
   * The double-colon separator is chosen because tenantIds are typically
   * alphanumeric slugs that will not contain "::".
   */
  static generateDocId(tenantId: string, hint?: string): string {
    const uuid = randomUUID();
    if (hint) {
      return `${tenantId}::${hint}::${uuid}`;
    }
    return `${tenantId}::${uuid}`;
  }

  /**
   * Generate a deterministic tenant-scoped idempotency key.
   *
   * Format: "{tenantId}::{operationId}::{sha256(payload)}"
   *
   * Two calls with the same arguments always produce the same key.
   * Two calls with different tenantIds always produce different keys.
   */
  static generateIdempotencyKey(
    tenantId: string,
    operationId: string,
    payload: Record<string, unknown>,
  ): string {
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    return `${tenantId}::${operationId}::${hash}`;
  }

  /**
   * Extract tenantId from a generated doc ID or idempotency key.
   * Returns undefined if the key is not in tenant-namespaced format.
   */
  static extractTenantId(key: string): string | undefined {
    const parts = key.split('::');
    if (parts.length < 2) return undefined;
    return parts[0];
  }
}
