// server/src/engine/rag/pattern-extractor.service.ts
// Extracts reusable architectural patterns from generated code for RAG learning loop.
// CN-15: closes the write side of the RAG learning loop.
//
// DNA-3: returns DataProcessResult, never throws
// Rule 1: uses fabric interface IAiProvider

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface RagPattern {
  patternId: string;
  taskTypeId: string;
  stageTarget: 'genesis' | 'review' | 'judge';
  targetStack: string;
  patternType: 'arch' | 'anti-pattern' | 'REVIEW_CRITERIA' | 'JUDGE_RUBRIC';
  codeSnippet: string;
  applicableWhen: string;
  ironRule: string | null;
  patternVersion: string;
  source: string;
  seededAt: string;
  [key: string]: unknown;
}

@Injectable()
export class PatternExtractorService {
  private readonly logger = new Logger(PatternExtractorService.name);

  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider) {}

  async extractFromGeneratedCode(
    generatedCode: string,
    taskTypeId: string,
    stageTarget: 'genesis' | 'review' | 'judge',
    targetStack: string,
  ): Promise<DataProcessResult<RagPattern[]>> {
    const prompt = [
      `You are extracting reusable architectural patterns from generated ${targetStack} code.`,
      `Task type: ${taskTypeId}. Stage: ${stageTarget}.`,
      `Extract 1-3 concise patterns from this code:`,
      `\`\`\`\n${generatedCode.slice(0, 3000)}\n\`\`\``,
      `For each pattern return JSON: { codeSnippet, applicableWhen, patternType, ironRule? }`,
      `patternType must be one of: arch, anti-pattern, REVIEW_CRITERIA, JUDGE_RUBRIC`,
    ].join('\n');

    const result = await this.aiProvider.generate(prompt);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'AI_ERROR',
        result.errorMessage ?? 'Pattern extraction AI call failed',
      );
    }

    const patterns = this.parsePatterns(
      (result.data?.['text'] as string) ?? '{}',
      taskTypeId,
      stageTarget,
      targetStack,
    );
    return DataProcessResult.success(patterns);
  }

  private parsePatterns(
    aiOutput: string,
    taskTypeId: string,
    stageTarget: 'genesis' | 'review' | 'judge',
    targetStack: string,
  ): RagPattern[] {
    try {
      const parsed = JSON.parse(aiOutput) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return (items as Record<string, unknown>[]).map((p, i) => ({
        patternId: `${taskTypeId}-${stageTarget}-auto-${Date.now()}-${i}`,
        taskTypeId,
        stageTarget,
        targetStack,
        patternType: (p['patternType'] ?? 'arch') as RagPattern['patternType'],
        codeSnippet: (p['codeSnippet'] as string) ?? '',
        applicableWhen: (p['applicableWhen'] as string) ?? '',
        ironRule: (p['ironRule'] as string | null) ?? null,
        patternVersion: '1.0.0',
        source: 'auto-extracted',
        seededAt: new Date().toISOString(),
      }));
    } catch {
      this.logger.warn(`Pattern extraction parse failed for ${taskTypeId}`);
      return [];
    }
  }
}
