// =============================================================================
// PLATFORM-ONLY Warehouse Security Factory Interfaces — FLOW-13
//
// ALL interfaces in this file are PLATFORM-ONLY:
//   - Tenants CANNOT disable, swap, or skip these services
//   - No FREEDOM config key can turn these off
//   - Factory IDs F422, F423, F411, F412, F424, F425 are resolved by the
//     platform at startup — not by tenant configuration
// =============================================================================

// -----------------------------------------------------------------------------
// F422 — IRowLevelSecurityService
// Applied as security gate LAYER 2 in T173 QueryExecutionEngine.
// Filters the query plan before execution to enforce row-level access control.
// PLATFORM-ONLY: cannot be disabled by tenant.
// -----------------------------------------------------------------------------
export const ROW_LEVEL_SECURITY_SERVICE = 'ROW_LEVEL_SECURITY_SERVICE';

export interface IRowLevelSecurityService {
  /**
   * Applies row-level security to a query plan.
   * Returns the filtered query (with tenant-scoped predicates injected)
   * or denies the query entirely.
   *
   * Called AFTER quota check (T187) and BEFORE query execution.
   * Result.allowed === false → emit QueryFailed with reason 'rls_denied', return immediately.
   */
  apply(
    tenantId: string,
    queryPlan: Record<string, unknown>,
  ): Promise<{
    allowed: boolean;
    filteredQuery: Record<string, unknown>;
    reason?: string;
  }>;
}

// -----------------------------------------------------------------------------
// F423 — IPIIMaskingService
// Applied as security gate LAYER 3 in T173 QueryExecutionEngine.
// Masks PII fields in query results BEFORE serialization.
// PLATFORM-ONLY: cannot be disabled by tenant. No opt-out flag accepted.
// -----------------------------------------------------------------------------
export const PII_MASKING_SERVICE = 'PII_MASKING_SERVICE';

export interface IPIIMaskingService {
  /**
   * Masks all PII fields in the provided data object.
   * MUST be called before any result serialization.
   *
   * Do NOT accept skipMasking, noMasking, or maskingDisabled flags.
   * Those fields are prohibited — see named check:
   *   pii_masking_platform_only_before_serialization
   */
  mask(tenantId: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
}

// -----------------------------------------------------------------------------
// F411 — IExportEncryptionService
// Used by T181 DataExportEngine.
// Encrypts export payloads before writing to storage or generating download URLs.
// PLATFORM-ONLY: all exports are encrypted unconditionally.
// -----------------------------------------------------------------------------
export const EXPORT_ENCRYPTION_SERVICE = 'EXPORT_ENCRYPTION_SERVICE';

export interface IExportEncryptionService {
  /**
   * Encrypts an export payload.
   * Returns the encrypted buffer and a key reference (stored in secrets vault).
   * The keyRef is included in the DataExportReady event for decryption at download time.
   */
  encrypt(
    tenantId: string,
    exportId: string,
    data: Buffer,
  ): Promise<{ encryptedData: Buffer; keyRef: string }>;
}

// -----------------------------------------------------------------------------
// F412 — IExportAuditService
// Used by T181 DataExportEngine.
// Records every export request for compliance and audit trail.
// PLATFORM-ONLY: audit records cannot be suppressed.
// -----------------------------------------------------------------------------
export const EXPORT_AUDIT_SERVICE = 'EXPORT_AUDIT_SERVICE';

export interface IExportAuditService {
  /**
   * Records an export event.
   * Must be called for every export, regardless of outcome.
   * requesterId is the user/service that initiated the export.
   */
  record(tenantId: string, exportId: string, requesterId: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// F424 — IDataGovernanceService
// Used by T186 DataRetentionEnforcer.
// Determines whether content should be purged or retention-extended based on policy.
// PLATFORM-ONLY: governance policies are platform-controlled, not tenant-editable.
// -----------------------------------------------------------------------------
export const DATA_GOVERNANCE_SERVICE = 'DATA_GOVERNANCE_SERVICE';

export interface IDataGovernanceService {
  /**
   * Evaluates a retention policy for a content item.
   * Returns purge=true only when all gates pass (legal hold check is separate —
   * T186 must check ILegalHoldService before calling this).
   *
   * If purge=false, extendUntil contains the next review date.
   */
  enforceRetention(
    tenantId: string,
    contentId: string,
    policyId: string,
  ): Promise<{ purge: boolean; extendUntil?: Date }>;
}

// -----------------------------------------------------------------------------
// F425 — IWarehouseAuditService
// Used by T169, T173, T181, T186 (all major warehouse operations).
// Records every significant warehouse operation for compliance.
// PLATFORM-ONLY: audit trail is unconditional.
// -----------------------------------------------------------------------------
export const WAREHOUSE_AUDIT_SERVICE = 'WAREHOUSE_AUDIT_SERVICE';

export interface IWarehouseAuditService {
  /**
   * Records a warehouse operation audit event.
   * operation: e.g. 'INGEST', 'QUERY', 'EXPORT', 'PURGE'
   * metadata: operation-specific details (batchId, queryId, exportId, contentId, etc.)
   */
  record(tenantId: string, operation: string, metadata: Record<string, unknown>): Promise<void>;
}
