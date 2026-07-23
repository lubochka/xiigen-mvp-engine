/**
 * Flow15MvpBuilderRagSeed — RAG patterns for FLOW-15 MVP Builder domain.
 * R1-1_F15 (R11): SESSION-GAP-R11
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow15MvpBuilderRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-15-mvp-builder';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F15-MB-PAT-001',
        namespace: 'mvp-builder',
        pattern: 'workspace-scoping',
        description:
          'Every workspace operation must be scoped to tenant via AsyncLocalStorage. ' +
          'Never pass tenantId as parameter (DNA-5).',
        codeExample: 'const tenantId = TenantContext.get(); // from AsyncLocalStorage',
        tags: ['workspace', 'provision', 'tenant', 'scope', 'DNA-5'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-MB-PAT-002',
        namespace: 'mvp-builder',
        pattern: 'scaffold-extends-base',
        description: 'All scaffolded services must extend MicroserviceBase (DNA-4).',
        codeExample: 'export class GeneratedService extends MicroserviceBase { }',
        tags: ['scaffold', 'generate', 'service', 'base', 'DNA-4'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-MB-PAT-003',
        namespace: 'mvp-builder',
        pattern: 'template-scoring',
        description:
          'Template selection threshold from FREEDOM config: flow15_template_score_weight (default 0.7).',
        codeExample: 'const threshold = await freedomConfig.get("flow15_template_score_weight");',
        tags: ['template', 'score', 'select', 'weight', 'FREEDOM'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-MB-PAT-004',
        namespace: 'mvp-builder',
        pattern: 'nlp-spec-dict',
        description:
          'NLP spec parsing uses domain-specific dictionary. App spec text maps to archetype via keyword extraction.',
        codeExample:
          '// "build me an e-commerce store" → archetype: TEMPLATE, features: [BILLING, PUBLISHING]',
        tags: ['nlp', 'spec', 'parse', 'intent', 'archetype'],
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
