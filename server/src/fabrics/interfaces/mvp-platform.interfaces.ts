/**
 * FLOW-15 PLATFORM-ONLY Factory Interfaces
 * Factories: F511, F523, F537, F559, F561, F562, F563
 *
 * PLATFORM-ONLY: These interfaces cannot be resolved by tenant-level factory calls.
 * Services that need these must be registered with scope: 'PLATFORM' in the factory registry.
 * Attempting to inject these from tenant context must throw ForbiddenException.
 *
 * Z1-9_F15 (R4): SESSION-GAP-R4
 */

// ─── F511 SSL Certificate Service ─────────────────────────────────────────────
// PLATFORM-ONLY
export interface ISslCertificateService {
  issueCertificate(domain: string, tenantId: string): Promise<{ certId: string; expiresAt: Date }>;
  renewCertificate(certId: string): Promise<void>;
  revokeCertificate(certId: string): Promise<void>;
}
export const SSL_CERTIFICATE_SERVICE = 'SSL_CERTIFICATE_SERVICE'; // F511 PLATFORM-ONLY

// ─── F523 Plugin Sandbox Service ──────────────────────────────────────────────
// PLATFORM-ONLY
export interface IPluginSandboxService {
  createSandbox(tenantId: string, pluginId: string): Promise<{ sandboxId: string }>;
  destroySandbox(sandboxId: string): Promise<void>;
  forkSandbox(sandboxId: string, tenantId: string): Promise<{ newSandboxId: string }>;
}
export const PLUGIN_SANDBOX_SERVICE = 'PLUGIN_SANDBOX_SERVICE'; // F523 PLATFORM-ONLY

// ─── F537 Integration Rate Limit Service ──────────────────────────────────────
// PLATFORM-ONLY
export interface IIntegrationRateLimitService {
  checkLimit(connectorId: string, tenantId: string): Promise<boolean>;
  recordCall(connectorId: string, tenantId: string): Promise<void>;
}
export const INTEGRATION_RATE_LIMIT_SERVICE = 'INTEGRATION_RATE_LIMIT_SERVICE'; // F537 PLATFORM-ONLY

// ─── F559 RLS Policy Provision Service ────────────────────────────────────────
// PLATFORM-ONLY
export interface IRlsPolicyProvisionService {
  provisionPolicy(
    tenantId: string,
    resource: string,
    policy: Record<string, unknown>,
  ): Promise<void>;
  enforcePolicy(
    tenantId: string,
    resource: string,
    result: Record<string, unknown>[],
  ): Promise<Record<string, unknown>[]>;
}
export const RLS_POLICY_PROVISION_SERVICE = 'RLS_POLICY_PROVISION_SERVICE'; // F559 PLATFORM-ONLY

// ─── F561 WORM Audit Service ───────────────────────────────────────────────────
// PLATFORM-ONLY
// NOTE: Intentionally NO update/delete methods. WORM = Write Once Read Many.
export interface IWormAuditService {
  appendAuditRecord(tenantId: string, record: Record<string, unknown>): Promise<void>;
  queryAuditTrail(
    tenantId: string,
    filter: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]>;
}
export const WORM_AUDIT_SERVICE = 'WORM_AUDIT_SERVICE'; // F561 PLATFORM-ONLY

// ─── F562 BYOK Key Vault Service ──────────────────────────────────────────────
// PLATFORM-ONLY
// NOTE: Intentionally NO overwrite/update method. Key rotation creates new version only.
export interface IByokKeyVaultService {
  createKeyVersion(
    tenantId: string,
    keyMaterial: Buffer,
  ): Promise<{ keyId: string; version: number }>;
  rotateKey(
    tenantId: string,
    existingKeyId: string,
  ): Promise<{ newKeyId: string; newVersion: number }>;
}
export const BYOK_KEY_VAULT_SERVICE = 'BYOK_KEY_VAULT_SERVICE'; // F562 PLATFORM-ONLY

// ─── F563 Data Residency Service ──────────────────────────────────────────────
// PLATFORM-ONLY
export interface IDataResidencyService {
  classifyResidency(
    tenantId: string,
    data: Record<string, unknown>,
  ): Promise<{ zone: string; compliant: boolean }>;
  enforceResidency(tenantId: string, operation: string): Promise<boolean>;
}
export const DATA_RESIDENCY_SERVICE = 'DATA_RESIDENCY_SERVICE'; // F563 PLATFORM-ONLY
