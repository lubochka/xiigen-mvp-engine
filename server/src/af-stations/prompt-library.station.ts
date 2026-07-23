/**
 * PromptLibraryStation — AF-3 three-tier prompt resolution.
 * P22: Resolves prompts via tenant override → global default → hardcoded fallback.
 *
 * Tier 1: Tenant-specific override (xiigen-prompts, tenantId scoped)
 * Tier 2: Global system default (xiigen-prompts, tenantId = '')
 * Tier 3: Hardcoded FALLBACK_PROMPTS map (always available, zero DB dependency)
 *
 * DNA-3: Returns DataProcessResult — never throws.
 * DNA-2: buildSearchFilter() for all queries.
 * Rule 1: No SDK imports — only fabric interfaces.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { buildSearchFilter } from '../kernel/build-search-filter';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';

export interface PromptResolutionOptions {
  domainId: string;
  taskType: string;
  role: string;
  tenantId?: string;
}

/** Hardcoded fallback prompts keyed by `${taskType}::${role}`. */
const FALLBACK_PROMPTS = new Map<string, string>([
  [
    'FLOW_GENERATE::architect',
    'You are a senior software architect. Analyze the requirements and design a clean, maintainable flow that follows the XIIGen DNA principles. Output a structured flow specification.',
  ],
  [
    'FLOW_GENERATE::reviewer',
    'You are a code reviewer specializing in XIIGen engine flows. Review the generated flow for compliance with DNA rules, BFA constraints, and architectural correctness.',
  ],
  [
    'CODE_REVIEW::security',
    'You are a security engineer. Review the provided code for vulnerabilities, injection risks, and compliance with the engine security guardrails.',
  ],
  [
    'RAG_QUERY::retrieval',
    'You are a RAG retrieval specialist. Given the user query, identify the most relevant patterns and design records from the knowledge base to inform code generation.',
  ],
  [
    'TASK_PLAN::planner',
    'You are a planning assistant for the XIIGen engine. Break down the user request into discrete, implementable tasks following the flow execution order and artifact boundaries.',
  ],
]);

@Injectable()
export class PromptLibraryStation {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Resolve a prompt using three-tier fallback strategy.
   * Returns the prompt text string on success, or PROMPT_NOT_FOUND failure.
   */
  async resolve(options: PromptResolutionOptions): Promise<DataProcessResult<string>> {
    const { domainId, taskType, role, tenantId } = options;

    // Tier 1: tenant-specific override
    if (tenantId) {
      const tier1 = await this.queryPrompt({ domainId, taskType, role, tenantId });
      if (!tier1.isSuccess) {
        return DataProcessResult.failure(
          tier1.errorCode ?? 'DB_ERROR',
          tier1.errorMessage ?? 'Tier 1 query failed',
        );
      }
      if (tier1.data) {
        return DataProcessResult.success(tier1.data['promptText'] as string);
      }
    }

    // Tier 2: global default (tenantId = '')
    const tier2 = await this.queryPrompt({ domainId, taskType, role, tenantId: '' });
    if (!tier2.isSuccess) {
      return DataProcessResult.failure(
        tier2.errorCode ?? 'DB_ERROR',
        tier2.errorMessage ?? 'Tier 2 query failed',
      );
    }
    if (tier2.data) {
      return DataProcessResult.success(tier2.data['promptText'] as string);
    }

    // Tier 3: hardcoded fallback
    const fallbackKey = `${taskType}::${role}`;
    const fallback = FALLBACK_PROMPTS.get(fallbackKey);
    if (fallback) {
      return DataProcessResult.success(fallback);
    }

    return DataProcessResult.failure(
      'PROMPT_NOT_FOUND',
      `No prompt found for taskType=${taskType} role=${role} domainId=${domainId}`,
    );
  }

  /**
   * Query a single prompt record by criteria.
   * Returns the most recent version (sortBy version desc, topK 1).
   * DNA-2: buildSearchFilter() skips empty tenantId automatically.
   */
  private async queryPrompt(opts: {
    domainId: string;
    taskType: string;
    role: string;
    tenantId: string;
  }): Promise<DataProcessResult<Record<string, unknown> | null>> {
    const { domainId, taskType, role, tenantId } = opts;

    const filter = buildSearchFilter({
      domainId,
      taskType,
      role,
      // When tenantId is empty string, DNA-2 buildSearchFilter skips it,
      // so the query naturally returns global (no-tenant) prompts.
      // We explicitly include it only when non-empty.
      ...(tenantId !== '' ? { tenantId } : {}),
      isActive: true,
    });

    const searchResult = await this.db.searchDocuments('xiigen-prompts', {
      ...filter,
      sortBy: 'version',
      sortDir: 'desc',
      topK: 1,
    });

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        searchResult.errorCode ?? 'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Prompt search failed',
      );
    }

    const docs = searchResult.data ?? [];
    if (docs.length === 0) {
      return DataProcessResult.success(null);
    }

    return DataProcessResult.success(docs[0]);
  }
}
