/**
 * Flow15AiAddonsRagSeed — RAG patterns for FLOW-15 AI Add-ons domain.
 * R1-1_F15 (R11): SESSION-GAP-R11
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow15AiAddonsRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-15-ai-addons';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F15-AA-PAT-001',
        namespace: 'ai-addons',
        pattern: 'ai-engine-fabric',
        description:
          'AI add-ons use AI ENGINE FABRIC only: @Inject(AI_PROVIDER) ai: IAiProvider. ' +
          'Never direct API calls.',
        codeExample: '@Inject(AI_PROVIDER) private readonly ai: IAiProvider',
        tags: ['ai', 'engine', 'fabric', 'provider', 'IAiProvider'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-AA-PAT-002',
        namespace: 'ai-addons',
        pattern: 'token-budget-separation',
        description:
          'AI add-on token budgets (T_START+27..31) separate from platform AI calls. ' +
          'FREEDOM config: flow15_ai_token_budget_limit.',
        codeExample: 'const limit = await freedomConfig.get("flow15_ai_token_budget_limit");',
        tags: ['token', 'budget', 'limit', 'ai', 'addon', 'FREEDOM'],
        flowId: 'FLOW-15',
      },
      {
        patternId: 'F15-AA-PAT-003',
        namespace: 'ai-addons',
        pattern: 'pkce-per-exchange-ai',
        description:
          'AI add-on OAuth flows use per-exchange PKCE verifier (crypto.randomBytes). ' +
          'Named check: oauth_pkce_per_exchange_verifier.',
        codeExample: 'const codeVerifier = crypto.randomBytes(32).toString("base64url");',
        tags: ['pkce', 'oauth', 'exchange', 'verifier', 'oauth_pkce_per_exchange_verifier'],
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
