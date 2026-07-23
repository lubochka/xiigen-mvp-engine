// file: server/src/factories/platform/artifact-signing-service.interface.ts
// F1416 — IArtifactSigningService (PLATFORM-ONLY)
// DI token: ARTIFACT_SIGNING_SERVICE
// BFA: CF-715 (supply chain tripartite signing)

import { DataProcessResult } from '../../kernel/data-process-result';

export const ARTIFACT_SIGNING_SERVICE = 'ARTIFACT_SIGNING_SERVICE';

/**
 * F1416 — IArtifactSigningService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: ARTIFACT_SIGNING_SERVICE
 *
 * Cryptographically signs marketplace artifact hashes.
 * Part of the tripartite supply chain signing protocol (CF-715).
 * Must be combined with F1417 (SBOM) and F1418 (SLSA) before publishing.
 */
export interface IArtifactSigningService {
  /**
   * Signs an artifact identified by its SHA-256 hash.
   * Returns signature, public key reference, and signing timestamp.
   * PLATFORM-ONLY — never tenant-injectable.
   */
  sign(params: {
    tenantId: string;
    artifactHash: string;
    packageId: string;
    version: string;
  }): Promise<
    DataProcessResult<{
      signature: string;
      publicKey: string;
      signedAt: string;
    }>
  >;

  /**
   * Verifies a signature against an artifact hash.
   * Returns valid: true if the signature matches the hash.
   */
  verify(
    signature: string,
    artifactHash: string,
  ): Promise<
    DataProcessResult<{
      valid: boolean;
    }>
  >;
}

/**
 * F1416 stub implementation — dev/test only.
 * Returns deterministic stub values for T518 generation in dev environments.
 * Production implementation ships separately as PLATFORM-ONLY.
 */
export class ArtifactSigningServiceStub implements IArtifactSigningService {
  async sign(params: {
    tenantId: string;
    artifactHash: string;
    packageId: string;
    version: string;
  }): Promise<DataProcessResult<{ signature: string; publicKey: string; signedAt: string }>> {
    return DataProcessResult.success({
      signature: `stub-sig-${params.artifactHash.substring(0, 16)}`,
      publicKey: 'stub-public-key-ed25519',
      signedAt: new Date().toISOString(),
    });
  }

  async verify(
    signature: string,
    _artifactHash: string,
  ): Promise<DataProcessResult<{ valid: boolean }>> {
    return DataProcessResult.success({
      valid: signature.startsWith('stub-sig-'),
    });
  }
}

/**
 * PLATFORM-ONLY factory descriptor.
 * Registered in factory registry with platformOnly: true.
 */
export const F1416_FACTORY_DESCRIPTOR = {
  factoryId: 'F1416',
  token: ARTIFACT_SIGNING_SERVICE,
  interfaceName: 'IArtifactSigningService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  stubClass: 'ArtifactSigningServiceStub',
  bfaRules: ['CF-715'],
  introducedByFlow: 'FLOW-32',
  description: 'Cryptographic artifact signing — marketplace supply chain',
};
