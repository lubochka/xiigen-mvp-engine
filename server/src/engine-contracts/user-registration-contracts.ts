/**
 * FLOW-01: User Registration & Onboarding — Canonical Contracts
 *
 * Single import point for all FLOW-01 engine contracts and BFA rules.
 *
 * Re-exports:
 *   - user-registration-bfa-rules.ts (FLOW_01_BFA_RULES: CF-01-1..CF-01-4)
 *
 * Task types: T47 UserRegistrationService, T48 EmailVerificationService,
 *             T49 OnboardingOrchestrationService
 *
 * Rule 16: file uses semantic slug "user-registration" — never "flow-01"
 */

export * from './user-registration-bfa-rules';

/**
 * AccountCreatedPayload — cross-flow event payload extended by FLOW-48
 * i18n-translation per DR-48-6 (FLOW-48-DESIGN-R2 Decision 4 / Code Review C-2).
 *
 * Optional acceptLanguage carries the raw HTTP Accept-Language header from the
 * registration request. FLOW-48 T665 TranslationRequestRegistrar normalises
 * this via BCP-47 parsing. A null/undefined/unparseable value triggers the
 * CF-814 no-op branch.
 */
export interface AccountCreatedPayload {
  userId: string;
  email: string;
  tenantId: string;
  status: 'unverified';
  /** Raw HTTP Accept-Language header value, unparsed. FLOW-48 T665 normalises. */
  acceptLanguage?: string | null;
}
