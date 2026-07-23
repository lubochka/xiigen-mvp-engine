// file: server/src/factories/platform/sbom-generator-service.interface.ts
// F1417 — ISBOMGeneratorService (PLATFORM-ONLY)
// DI token: SBOM_GENERATOR_SERVICE
// BFA: CF-715 (supply chain tripartite signing)

import { DataProcessResult } from '../../kernel/data-process-result';

export const SBOM_GENERATOR_SERVICE = 'SBOM_GENERATOR_SERVICE';

/**
 * F1417 — ISBOMGeneratorService
 * PLATFORM-ONLY — no tenant implementation permitted.
 * DI token: SBOM_GENERATOR_SERVICE
 *
 * Generates a software bill of materials (SBOM) for marketplace artifact packages.
 * Part of the tripartite supply chain signing protocol (CF-715).
 * Must be combined with F1416 (signing) and F1418 (SLSA) before publishing.
 */
export interface ISBOMGeneratorService {
  /**
   * Generates a software bill of materials for an artifact package.
   * Returns a reference ID and the SBOM format (CycloneDX or SPDX).
   * PLATFORM-ONLY — never tenant-injectable.
   */
  generate(params: { packageId: string; version: string; factoryDependencies: unknown[] }): Promise<
    DataProcessResult<{
      sbomRef: string;
      sbomFormat: 'cyclonedx' | 'spdx';
    }>
  >;
}

/**
 * F1417 stub implementation — dev/test only.
 * Returns deterministic stub values for T518 generation in dev environments.
 * Production implementation ships separately as PLATFORM-ONLY.
 */
export class SBOMGeneratorServiceStub implements ISBOMGeneratorService {
  async generate(params: {
    packageId: string;
    version: string;
    factoryDependencies: unknown[];
  }): Promise<DataProcessResult<{ sbomRef: string; sbomFormat: 'cyclonedx' | 'spdx' }>> {
    return DataProcessResult.success({
      sbomRef: `stub-sbom-${params.packageId}-${params.version}`,
      sbomFormat: 'cyclonedx',
    });
  }
}

/**
 * PLATFORM-ONLY factory descriptor.
 * Registered in factory registry with platformOnly: true.
 */
export const F1417_FACTORY_DESCRIPTOR = {
  factoryId: 'F1417',
  token: SBOM_GENERATOR_SERVICE,
  interfaceName: 'ISBOMGeneratorService',
  platformOnly: true,
  fabricLayer: 'platform-services',
  stubClass: 'SBOMGeneratorServiceStub',
  bfaRules: ['CF-715'],
  introducedByFlow: 'FLOW-32',
  description: 'Software bill of materials generation — marketplace supply chain',
};
