/**
 * T438 AiContentEnhancementGate [AI_ENRICHMENT]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentEnhancementRequested event (editor requests AI suggestions)
 *
 * Execution order is MACHINE (CF-28-16):
 *   ORDER 1: Fetch content and AI provider context
 *   ORDER 2: Generate AI suggestions (SEO title, meta description, readability score)
 *   ORDER 3: storeDocument(ai-suggestions)
 *   ORDER 4: enqueue(SuggestionsGenerated) — notify editor UI
 *
 * Iron rules:
 *   IR-1: AI suggestions include: SEO title, meta description, readability score
 *   IR-2: Editor must accept/reject suggestions (not auto-applied)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const AI_SUGGESTIONS_INDEX = 'xiigen-ai-suggestions';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class AiContentEnhancementGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T438',
        serviceName: 'AiContentEnhancementGateService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Generate AI-powered content enhancement suggestions.
   */
  async generateSuggestions(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const title = event['title'] as string;
    const excerpt = event['excerpt'] as string;
    const body = event['body'] as string;

    if (!contentId || !title || !body) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId, title, and body are required');
    }

    // ── ORDER 1: Fetch content and AI provider context ──────────────────
    const _contentSearchResult = await this.dbFabric.searchDocuments('xiigen-published-content', {
      contentId,
    });

    // ── ORDER 2: Generate AI suggestions ────────────────────────────────
    // Simulated AI suggestions (in production, would call AI fabric)
    const wordCount = body.split(/\s+/).length;
    const readabilityScore = Math.min(100, Math.max(0, 100 - Math.abs(wordCount - 500) / 10));

    const seoTitle = this.generateSeoTitle(title);
    const metaDescription = this.generateMetaDescription(excerpt || body);

    const suggestions: Record<string, unknown> = {
      seoTitle,
      metaDescription,
      readabilityScore,
      wordCount,
      headlineStrength: this.evaluateHeadline(title),
      keywordDensity: this.analyzeKeywords(body),
      recommendedLength: wordCount < 300 ? 'TOO_SHORT' : wordCount > 2000 ? 'TOO_LONG' : 'OPTIMAL',
    };

    // ── ORDER 3: storeDocument(ai-suggestions) ──────────────────────────
    const suggestionRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      suggestions,
      generatedAt: new Date().toISOString(),
      status: 'PENDING_REVIEW',
    };

    await this.dbFabric.storeDocument(
      AI_SUGGESTIONS_INDEX,
      suggestionRecord,
      `${contentId}:ai-suggestions`,
    );

    // ── ORDER 4: enqueue(SuggestionsGenerated) ──────────────────────────
    await this.queueFabric.enqueue('SuggestionsGenerated', {
      contentId,
      tenantId,
      suggestions,
      generatedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      suggestions,
      status: 'SUGGESTIONS_GENERATED',
      generatedAt: new Date().toISOString(),
    });
  }

  private generateSeoTitle(title: string): string {
    // SEO title should be 50-60 characters, include key terms
    if (title.length <= 60) {
      return title;
    }
    return title.substring(0, 57) + '...';
  }

  private generateMetaDescription(text: string): string {
    // Meta description should be 150-160 characters
    const words = text.split(/\s+/);
    let desc = '';
    for (const word of words) {
      if ((desc + ' ' + word).length <= 160) {
        desc += (desc ? ' ' : '') + word;
      } else {
        break;
      }
    }
    return desc + (desc.length >= 150 ? '.' : '');
  }

  private evaluateHeadline(title: string): string {
    if (title.length < 10) return 'WEAK';
    if (title.length > 75) return 'TOO_LONG';
    if (title.includes('?') || title.includes(':')) return 'STRONG';
    return 'GOOD';
  }

  private analyzeKeywords(body: string): Record<string, number> {
    const words = body.toLowerCase().split(/\s+/);
    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      if (word.length > 5) {
        wordFreq[word] = (wordFreq[word] ?? 0) + 1;
      }
    }
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .reduce(
        (acc, [word, count]) => {
          acc[word] = count;
          return acc;
        },
        {} as Record<string, number>,
      );
  }
}
