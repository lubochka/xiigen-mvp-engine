/**
 * FLOW-14 — ETL Platform Service Injection Tokens
 * Symbols for PLATFORM-ONLY fabric interfaces (F427, F430, F462, F463).
 * These are resolved by the platform factory — never instantiated in service code.
 */

export const CREDENTIAL_VAULT_SERVICE = Symbol('ICredentialVaultService:F427');
export const RATE_LIMIT_GUARD_SERVICE = Symbol('IRateLimitGuardService:F430');
export const CURSOR_CHECKPOINT_SERVICE = Symbol('ICursorCheckpointService:CF193');
export const PII_CLASSIFICATION_SERVICE = Symbol('IPiiClassificationService:F462');
export const RLS_POLICY_SERVICE = Symbol('IRlsPolicyService:F463');
