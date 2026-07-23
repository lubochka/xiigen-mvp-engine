// file: server/src/factories/platform/kyc-verification-service.interface.ts
// F567 — IKycVerificationService (PLATFORM-ONLY)
// DI token: PLATFORM_KYC_SERVICE

export const PLATFORM_KYC_SERVICE = Symbol('PLATFORM_KYC_SERVICE');

export type KycStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEW_REQUIRED';
export type KycSubjectType = 'BUYER' | 'SELLER';

export interface KycVerificationRequest {
  subjectId: string;
  subjectType: KycSubjectType;
  tenantId: string;
  /**
   * Document reference — platform retrieves from secure vault using this ID.
   * Never pass raw document bytes.
   */
  documentVaultRef: string;
  correlationId: string;
}

export interface KycVerificationResult {
  verificationId: string;
  subjectId: string;
  status: KycStatus;
  sanctionsMatch: boolean;
  reviewNotes?: string;
  completedAt: string;
}

export interface KycStatusRecord {
  subjectId: string;
  subjectType: KycSubjectType;
  currentStatus: KycStatus;
  lastVerifiedAt?: string;
  verificationId?: string;
}

/**
 * F567 — IKycVerificationService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: PLATFORM_KYC_SERVICE
 *
 * Handles identity verification and sanctions screening.
 * All document access goes via secure vault references, never raw bytes.
 */
export interface IKycVerificationService {
  /**
   * Submit identity documents for verification.
   * Asynchronous — returns a verificationId; result arrives via event kyc.{buyer|seller}.{verified|rejected}.
   */
  verifyIdentity(request: KycVerificationRequest): Promise<{ verificationId: string }>;

  /**
   * Run sanctions list check for a subject.
   * Synchronous — immediate result.
   */
  checkSanctions(
    subjectId: string,
    subjectType: KycSubjectType,
  ): Promise<{ sanctionsMatch: boolean; listRef?: string }>;

  /**
   * Get current KYC status for a subject.
   */
  getKycStatus(subjectId: string, subjectType: KycSubjectType): Promise<KycStatusRecord>;

  /**
   * Returns true if the subject has a current APPROVED KYC status with no active sanctions.
   * Convenience gate-check used in CF-256 enforcement.
   */
  isKycClear(subjectId: string, subjectType: KycSubjectType): Promise<boolean>;
}

/**
 * PLATFORM-ONLY factory descriptor.
 * Registered in factory registry with platformOnly:true.
 */
export const F567_FACTORY_DESCRIPTOR = {
  factoryId: 'F567',
  token: PLATFORM_KYC_SERVICE,
  interfaceName: 'IKycVerificationService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  bfaRules: ['CF-256', 'CF-257', 'CF-258'],
};
