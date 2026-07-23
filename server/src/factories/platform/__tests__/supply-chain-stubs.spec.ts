/**
 * Supply chain factory stub tests (GAP-32-01 / CF-715)
 * F1416 (ArtifactSigningServiceStub)
 * F1417 (SBOMGeneratorServiceStub)
 * F1418 (SLSAAttestationServiceStub)
 */

import {
  ArtifactSigningServiceStub,
  F1416_FACTORY_DESCRIPTOR,
} from '../artifact-signing-service.interface';
import {
  SBOMGeneratorServiceStub,
  F1417_FACTORY_DESCRIPTOR,
} from '../sbom-generator-service.interface';
import {
  SLSAAttestationServiceStub,
  F1418_FACTORY_DESCRIPTOR,
} from '../slsa-attestation-service.interface';

describe('ArtifactSigningServiceStub (F1416 — CF-715)', () => {
  let stub: ArtifactSigningServiceStub;

  beforeEach(() => {
    stub = new ArtifactSigningServiceStub();
  });

  it('sign() returns DataProcessResult.success with signature, publicKey, signedAt', async () => {
    const result = await stub.sign({
      tenantId: 'tenant-1',
      artifactHash: 'abc123def456789012345678901234567890abcdef',
      packageId: 'pkg-flow32-template-v1',
      version: '1.0.0',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.signature).toBeDefined();
    expect(result.data?.publicKey).toBe('stub-public-key-ed25519');
    expect(result.data?.signedAt).toBeDefined();
  });

  it('sign() embeds first 16 chars of artifactHash in stub signature', async () => {
    const artifactHash = 'deadbeef12345678aabbccddeeff0011';
    const result = await stub.sign({
      tenantId: 'tenant-1',
      artifactHash,
      packageId: 'pkg-1',
      version: '1.0.0',
    });
    expect(result.data?.signature).toContain(artifactHash.substring(0, 16));
  });

  it('verify() returns valid:true for stub-sig- prefix', async () => {
    const result = await stub.verify('stub-sig-deadbeef12345678', 'any-hash');
    expect(result.isSuccess).toBe(true);
    expect(result.data?.valid).toBe(true);
  });

  it('verify() returns valid:false for non-stub signature', async () => {
    const result = await stub.verify('real-production-signature-xyz', 'any-hash');
    expect(result.data?.valid).toBe(false);
  });

  it('F1416_FACTORY_DESCRIPTOR has platformOnly:true', () => {
    expect(F1416_FACTORY_DESCRIPTOR.platformOnly).toBe(true);
    expect(F1416_FACTORY_DESCRIPTOR.factoryId).toBe('F1416');
    expect(F1416_FACTORY_DESCRIPTOR.interfaceName).toBe('IArtifactSigningService');
  });
});

describe('SBOMGeneratorServiceStub (F1417 — CF-715)', () => {
  let stub: SBOMGeneratorServiceStub;

  beforeEach(() => {
    stub = new SBOMGeneratorServiceStub();
  });

  it('generate() returns DataProcessResult.success with sbomRef and sbomFormat', async () => {
    const result = await stub.generate({
      packageId: 'pkg-marketplace-v1',
      version: '2.0.0',
      factoryDependencies: ['F1342', 'F1353'],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.sbomRef).toBeDefined();
    expect(result.data?.sbomFormat).toBe('cyclonedx');
  });

  it('generate() sbomRef contains packageId and version', async () => {
    const result = await stub.generate({
      packageId: 'my-template',
      version: '1.2.3',
      factoryDependencies: [],
    });
    expect(result.data?.sbomRef).toContain('my-template');
    expect(result.data?.sbomRef).toContain('1.2.3');
  });

  it('F1417_FACTORY_DESCRIPTOR has platformOnly:true', () => {
    expect(F1417_FACTORY_DESCRIPTOR.platformOnly).toBe(true);
    expect(F1417_FACTORY_DESCRIPTOR.factoryId).toBe('F1417');
    expect(F1417_FACTORY_DESCRIPTOR.interfaceName).toBe('ISBOMGeneratorService');
  });
});

describe('SLSAAttestationServiceStub (F1418 — CF-715)', () => {
  let stub: SLSAAttestationServiceStub;

  beforeEach(() => {
    stub = new SLSAAttestationServiceStub();
  });

  it('attest() returns DataProcessResult.success with slsaRef and slsaLevel', async () => {
    const result = await stub.attest({
      packageId: 'pkg-marketplace-v1',
      version: '1.0.0',
      artifactHash: 'abc123def456',
      buildConfig: { builder: 'github-actions', workflow: 'build.yml' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.slsaRef).toBeDefined();
    expect(result.data?.slsaLevel).toBe(1);
  });

  it('attest() slsaRef contains packageId and version', async () => {
    const result = await stub.attest({
      packageId: 'flow32-template',
      version: '3.0.0',
      artifactHash: 'hash-abc',
      buildConfig: {},
    });
    expect(result.data?.slsaRef).toContain('flow32-template');
    expect(result.data?.slsaRef).toContain('3.0.0');
  });

  it('F1418_FACTORY_DESCRIPTOR has platformOnly:true', () => {
    expect(F1418_FACTORY_DESCRIPTOR.platformOnly).toBe(true);
    expect(F1418_FACTORY_DESCRIPTOR.factoryId).toBe('F1418');
    expect(F1418_FACTORY_DESCRIPTOR.interfaceName).toBe('ISLSAAttestationService');
  });
});

describe('Supply chain tripartite signing protocol (CF-715)', () => {
  it('all three factory descriptors reference CF-715', () => {
    expect(F1416_FACTORY_DESCRIPTOR.bfaRules).toContain('CF-715');
    expect(F1417_FACTORY_DESCRIPTOR.bfaRules).toContain('CF-715');
    expect(F1418_FACTORY_DESCRIPTOR.bfaRules).toContain('CF-715');
  });

  it('all three are introduced by FLOW-32', () => {
    expect(F1416_FACTORY_DESCRIPTOR.introducedByFlow).toBe('FLOW-32');
    expect(F1417_FACTORY_DESCRIPTOR.introducedByFlow).toBe('FLOW-32');
    expect(F1418_FACTORY_DESCRIPTOR.introducedByFlow).toBe('FLOW-32');
  });
});
