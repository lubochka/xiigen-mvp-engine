export const LEGAL_HOLD_SERVICE = 'LEGAL_HOLD_SERVICE';

export interface LegalHoldCheckInput {
  tenantId: string;
  contentId: string;
}

export interface LegalHoldStatus {
  active: boolean;
  holdId?: string;
  expiresAt?: string;
  /**
   * Always 'FLOW-11'. Legal hold records originate exclusively from FLOW-11
   * (Content Lifecycle Management). T186 reads this flow's data cross-flow.
   * Never hardcode 'FLOW-13' here.
   */
  sourceFlow: 'FLOW-11';
}

export interface ILegalHoldService {
  /**
   * Checks whether a legal hold is currently active for the given content item.
   *
   * T186 DataRetentionEnforcer MUST call this BEFORE any purge operation.
   * If result.data.active === true, emit ContentRetentionExtended and return.
   * Never purge while a legal hold is active.
   */
  check(input: LegalHoldCheckInput): Promise<{ isSuccess: boolean; data?: LegalHoldStatus }>;
}
