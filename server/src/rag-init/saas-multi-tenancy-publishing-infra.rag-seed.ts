/**
 * Flow15PublishingInfraRagSeed — RAG patterns for FLOW-15 Publishing Infrastructure domain.
 * R1-1_F15 (R11): SESSION-GAP-R11
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow15PublishingInfraRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-15-publishing-infra';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F15-PI-PAT-001',
        namespace: 'publishing-infra',
        pattern: 'dns-before-ssl',
        description:
          'DNS verification MUST happen before SSL certificate issuance. ' +
          'Order: verify DNS → issue SSL. Named check: dns_before_ssl_ordering.',
        codeExample:
          'await dnsService.verify(domain);\nawait sslService.issueCertificate(domain, tenantId);',
        tags: ['dns', 'ssl', 'certificate', 'order', 'verify', 'dns_before_ssl_ordering'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-PI-PAT-002',
        namespace: 'publishing-infra',
        pattern: 'ssl-platform-only',
        description:
          'SSL certificate management uses ISslCertificateService F511 — PLATFORM-ONLY. ' +
          'Never implement SSL logic in tenant services.',
        codeExample: '@Inject(SSL_CERTIFICATE_SERVICE) private ssl: ISslCertificateService',
        tags: ['ssl', 'certificate', 'platform', 'F511', 'PLATFORM-ONLY'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-PI-PAT-003',
        namespace: 'publishing-infra',
        pattern: 'blue-green-ep4-saga',
        description:
          'Blue-green deployment is an EP-4 durable saga with checkpoints at each step. ' +
          'Must use SagaCrashTestHarness in tests.',
        codeExample: 'await sagaCheckpoint.save(sagaId, stepIndex, result);',
        tags: ['blue-green', 'deploy', 'saga', 'checkpoint', 'EP4'],
        flowId: 'FLOW-15',
      },
    ];

    let count = 0;
    for (const p of patterns) {
      const result = await this.upsertPattern(p);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
}
