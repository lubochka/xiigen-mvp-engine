/**
 * FLOW-02: Profile Enrichment & Matching — Canonical Contracts
 *
 * Single import point for all FLOW-02 engine contracts and BFA rules.
 *
 * Re-exports:
 *   - profile-enrichment-matching-contracts.ts (T50, T51, T52 EngineContracts)
 *   - profile-enrichment-bfa-rules.ts (FLOW_02_BFA_RULES)
 *
 * Task types: T50 ProfileEnrichmentFanIn, T51 MatchingConvergenceGate,
 *             T52 OnboardingCompletionBroadcast
 *
 * Rule 16: file uses semantic slug "profile-enrichment" — never "flow-02"
 */

export * from './profile-enrichment-matching-contracts';
export * from './profile-enrichment-bfa-rules';
