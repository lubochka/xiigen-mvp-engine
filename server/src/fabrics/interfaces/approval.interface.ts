export const APPROVAL_SERVICE = 'APPROVAL_SERVICE';

export interface ApprovalValidationInput {
  tenantId: string;
  contentId: string;
  /**
   * The approval token provided by the requester.
   * Must be present. Missing token = reject without purging.
   * T186 must check token presence BEFORE calling validate().
   */
  approvalToken: string;
  /**
   * The operation requiring approval.
   * For T186: use 'DATA_PURGE'.
   */
  operation: string;
}

export interface ApprovalValidationResult {
  valid: boolean;
  approvedBy?: string;
  approvedAt?: string;
  /**
   * ISO 8601 timestamp. If now() > expiresAt, the token is expired.
   * An expired token must be treated as invalid — do not purge.
   */
  expiresAt?: string;
}

export interface IApprovalService {
  /**
   * Validates an approval token for an irreversible operation.
   *
   * T186 DataRetentionEnforcer MUST call this AFTER checking legal hold
   * (ILegalHoldService) and BEFORE executing any purge.
   *
   * Call sequence in T186:
   *   1. ILegalHoldService.check() — abort if hold active
   *   2. IApprovalService.validate() — abort if token invalid/missing/expired
   *   3. IDataGovernanceService.enforceRetention() — get purge decision
   *   4. Execute purge — emit DataPurged with tombstoneRef only (no raw data)
   *
   * On failure:
   *   - isSuccess: false
   *   - errorCode: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'OPERATION_MISMATCH'
   */
  validate(input: ApprovalValidationInput): Promise<{
    isSuccess: boolean;
    data?: ApprovalValidationResult;
    errorCode?: string;
  }>;
}
