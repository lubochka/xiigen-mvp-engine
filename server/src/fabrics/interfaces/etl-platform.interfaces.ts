/**
 * FLOW-14 ETL Platform-Only Fabric Interfaces
 * All interfaces in this file are PLATFORM-ONLY.
 * They MUST NOT be implemented in application service code.
 * Resolution via IExternalServiceFactory.createAsync() only.
 */

/**
 * ICredentialVaultService — F427 PLATFORM-ONLY
 * Stores and retrieves connector credentials.
 * Only opaque connectorId appears in event payloads — never raw credentials.
 */
export interface ICredentialVaultService {
  storeCredential(connectorId: string, credential: Record<string, unknown>): Promise<void>;
  retrieveCredential(connectorId: string): Promise<Record<string, unknown>>;
  rotateCredential(connectorId: string): Promise<void>;
}

/**
 * IRateLimitGuardService — F430 PLATFORM-ONLY
 * Rate limit check MUST be called before any external API call (enforced by named check).
 */
export interface IRateLimitGuardService {
  checkRateLimit(
    connectorId: string,
    operation: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }>;
  recordUsage(connectorId: string, operation: string): Promise<void>;
}

// IWarehouseAuditService is declared in warehouse-security.interfaces.ts (F425) — no duplicate here.

/**
 * IPiiClassificationService — F462 PLATFORM-ONLY
 * Must be called BEFORE any mart write (DR-63).
 * Returns masked record with PII field count.
 */
export interface IPiiClassificationService {
  classifyFields(record: Record<string, unknown>): Promise<{
    piiFieldsDetected: number;
    maskedRecord: Record<string, unknown>;
  }>;
}

/**
 * IRlsPolicyService — F463 PLATFORM-ONLY
 * Enforces row-level security on warehouse query results.
 * Must be applied before returning any cross-tenant analytics result.
 */
export interface IRlsPolicyService {
  enforceRls(
    result: Record<string, unknown>[],
    tenantId: string,
  ): Promise<Record<string, unknown>[]>;
  registerPolicy(zone: string, tenantId: string, policy: Record<string, unknown>): Promise<void>;
}
