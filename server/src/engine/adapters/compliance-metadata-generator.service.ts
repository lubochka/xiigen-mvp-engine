// server/src/engine/adapters/compliance-metadata-generator.service.ts
// Generates compliance arbiter metadata for adapters.
// GDPR basis is required — cannot be defaulted.
//
// DNA-3: returns DataProcessResult, never throws
// Rule 14: reads all compliance config from FREEDOM config

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';

export interface ComplianceArbiterMetadata {
  gdprBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  retentionDays: number;
  contentPolicyClass: string;
  dataSubjectRights: string[];
}

@Injectable()
export class ComplianceMetadataGeneratorService {
  private readonly logger = new Logger(ComplianceMetadataGeneratorService.name);

  constructor(
    @Inject(FREEDOM_CONFIG_SERVICE) private readonly freedomConfig: IFreedomConfigService,
  ) {}

  async generate(adapterTaskTypeId: string): Promise<DataProcessResult<ComplianceArbiterMetadata>> {
    const configKey = `adapter.${adapterTaskTypeId}.compliance`;
    const config = await this.freedomConfig.get(configKey);
    if (!config?.['gdprBasis']) {
      // Compliance metadata cannot be defaulted — requires explicit declaration
      return DataProcessResult.failure(
        'COMPLIANCE_CONFIG_MISSING',
        `GDPR basis must be explicitly configured for adapter ${adapterTaskTypeId}. ` +
          `Set FREEDOM config key: ${configKey}.gdprBasis. ` +
          `Valid values: consent | legitimate_interest | contract | legal_obligation`,
      );
    }
    return DataProcessResult.success({
      gdprBasis: config['gdprBasis'] as ComplianceArbiterMetadata['gdprBasis'],
      retentionDays: (config['retentionDays'] as number) ?? 90,
      contentPolicyClass: (config['contentPolicyClass'] as string) ?? 'GDPR-applicable',
      dataSubjectRights: (config['dataSubjectRights'] as string[]) ?? [
        'access',
        'erasure',
        'portability',
      ],
    });
  }
}
