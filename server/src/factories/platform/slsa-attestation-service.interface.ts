// file: server/src/factories/platform/slsa-attestation-service.interface.ts
// F1418 — ISLSAAttestationService (PLATFORM-ONLY)
// DI token: SLSA_ATTESTATION_SERVICE
// BFA: CF-715 (supply chain tripartite signing)

import { DataProcessResult } from '../../kernel/data-process-result';

export const SLSA_ATTESTATION_SERVICE = 'SLSA_ATTESTATION_SERVICE';

/**
 * F1418 — ISLSAAttestationService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: SLSA_ATTESTATION_SERVICE
 *
 * Creates an SLSA provenance attestation for marketplace artifact packages.
 * Part of the tripartite supply chain signing protocol (CF-715).
 * Must be combined with F1416 (signing) and F1417 (SBOM) before publishing.
 */
export interface ISLSAAttestationService {
  /**
   * Creates an SLSA provenance attestation for an artifact.
   * Returns a reference ID and the SLSA level achieved (1, 2, or 3).
   * PLATFORM-ONLY — never tenant-injectable.
   */
  attest(params: {
    packageId: string;
    version: string;
    artifactHash: string;
    buildConfig: unknown;
  }): Promise<
    DataProcessResult<{
      slsaRef: string;
      slsaLevel: 1 | 2 | 3;
    }>
  >;
}

/**
 * F1418 stub implementation — dev/test only.
 * Returns deterministic stub values for T518 generation in dev environments.
 * Production implementation ships separately as PLATFORM-ONLY.
 */
export class SLSAAttestationServiceStub implements ISLSAAttestationService {
  async attest(params: {
    packageId: string;
    version: string;
    artifactHash: string;
    buildConfig: unknown;
  }): Promise<DataProcessResult<{ slsaRef: string; slsaLevel: 1 | 2 | 3 }>> {
    void params.buildConfig; // not used in stub
    return DataProcessResult.success({
      slsaRef: `stub-slsa-${params.packageId}-${params.version}`,
      slsaLevel: 1,
    });
  }
}

/**
 * PLATFORM-ONLY factory descriptor.
 * Registered in factory registry with platformOnly: true.
 */
export const F1418_FACTORY_DESCRIPTOR = {
  factoryId: 'F1418',
  token: SLSA_ATTESTATION_SERVICE,
  interfaceName: 'ISLSAAttestationService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  stubClass: 'SLSAAttestationServiceStub',
  bfaRules: ['CF-715'],
  introducedByFlow: 'FLOW-32',
  description: 'SLSA provenance attestation — marketplace supply chain',
};
