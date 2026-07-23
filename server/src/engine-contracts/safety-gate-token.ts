/**
 * SafetyGateToken (DR-168 / DD-224)
 *
 * Cryptographic proof that F1002 (IContentSafetyGate) executed a content
 * safety check on a specific lesson composition. F1003 (ILessonPublisher)
 * REQUIRES this token as a parameter — no token = compile error.
 *
 * The token is immutable (all fields readonly).
 * The signature prevents forgery — only F1002 (PLATFORM-ONLY) can produce valid tokens.
 */
export interface SafetyGateToken {
  /** UUID v4 — unique token identifier for audit trail */
  readonly tokenId: string;

  /** SHA-256 hash of the composed lesson content — binds token to specific composition */
  readonly lessonCompositionHash: string;

  /** ISO-8601 UTC — when the safety check ran */
  readonly safetyCheckTimestamp: string;

  /** F1002 version that produced this token */
  readonly safetyGateVersion: string;

  /** Tenant ID from AsyncLocalStorage — tenant-scoped */
  readonly tenantId: string;

  /** Content categories that passed safety check */
  readonly approvedCategories: string[];

  /** Content categories that failed safety check — MUST be empty for APPROVED verdict */
  readonly rejectedCategories: string[];

  /** Overall verdict — only APPROVED tokens may be passed to F1003 */
  readonly verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';

  /** HMAC-SHA256 signature of all above fields — prevents token forgery */
  readonly signature: string;
}
