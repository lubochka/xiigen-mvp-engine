/**
 * FLOW-19 — Durable Sagas & Compliance Platform Service Injection Tokens
 * Symbols for PLATFORM-ONLY fabric interfaces (F1554-F1560).
 * These are resolved by the platform factory — never instantiated in service code.
 */

export const SAGA_STATE_REPOSITORY = Symbol('ISagaStateRepository:F1554');
export const SAGA_STEP_LOCK_SERVICE = Symbol('ISagaStepLockService:F1555');
export const COMPENSATION_REGISTRY = Symbol('ICompensationRegistry:F1556');
export const COMPLIANCE_RETENTION_CONFIG = Symbol('IComplianceRetentionConfig:F1557');
export const RETENTION_ARCHIVE_SERVICE = Symbol('IRetentionArchiveService:F1558');
export const LEGAL_HOLD_SERVICE = Symbol('ILegalHoldService:F1559');
export const RETENTION_CRON_CONFIG = Symbol('IRetentionCronConfig:F1560');
