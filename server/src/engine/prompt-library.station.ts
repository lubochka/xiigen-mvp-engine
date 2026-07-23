/**
 * PromptLibraryStation — 3-tier prompt resolution.
 *
 * Tier 1: tenant-scoped override (tenantId + taskTypeId + promptType)
 * Tier 2: global version (no tenantId)
 * Tier 3: DataProcessResult.failure('PROMPT_NOT_FOUND', ...)
 *
 * This is the P22 station — all prompt access goes through here.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { randomUUID } from 'crypto';

export interface PromptRecord {
  promptId: string;
  taskTypeId: string;
  promptType: string; // 'genesis' | 'review' | 'compliance' | 'judge' | string
  version: string;
  content: string;
  systemPrompt?: string;
  flowId?: string;
  tenantId?: string; // undefined = global
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class PromptLibraryStation {
  private readonly logger = new Logger(PromptLibraryStation.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async resolvePrompt(
    taskTypeId: string,
    promptType: string,
    options?: { tenantId?: string; flowId?: string },
  ): Promise<DataProcessResult<PromptRecord>> {
    // Tier 1: tenant-scoped
    if (options?.tenantId) {
      const tier1 = await this.db.searchDocuments('xiigen-prompts', {
        taskTypeId,
        promptType,
        tenantId: options.tenantId,
        active: true,
      });
      if (tier1.isSuccess && tier1.data && tier1.data.length > 0) {
        const sorted = [...tier1.data].sort((a, b) =>
          String(b['version']).localeCompare(String(a['version'])),
        );
        return DataProcessResult.success(sorted[0] as unknown as PromptRecord);
      }
    }

    // Tier 2: global
    const tier2 = await this.db.searchDocuments('xiigen-prompts', {
      taskTypeId,
      promptType,
      active: true,
    });
    if (tier2.isSuccess && tier2.data) {
      const global = tier2.data.filter((p) => !p['tenantId']);
      if (global.length > 0) {
        const sorted = [...global].sort((a, b) =>
          String(b['version']).localeCompare(String(a['version'])),
        );
        return DataProcessResult.success(sorted[0] as unknown as PromptRecord);
      }
    }

    // Tier 3: not found
    return DataProcessResult.failure(
      'PROMPT_NOT_FOUND',
      `No prompt found for taskTypeId=${taskTypeId} promptType=${promptType}`,
    );
  }

  async storePrompt(
    record: Omit<PromptRecord, 'promptId' | 'createdAt' | 'updatedAt'>,
  ): Promise<DataProcessResult<PromptRecord>> {
    const now = new Date().toISOString();
    const prompt: PromptRecord = {
      ...record,
      promptId: randomUUID(),
      active: record.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.storeDocument(
      'xiigen-prompts',
      prompt as unknown as Record<string, unknown>,
      prompt.promptId,
    );
    return DataProcessResult.success(prompt);
  }

  async updatePrompt(
    taskTypeId: string,
    promptType: string,
    content: string,
    version: string,
    options?: { tenantId?: string; systemPrompt?: string },
  ): Promise<DataProcessResult<PromptRecord>> {
    return this.storePrompt({
      taskTypeId,
      promptType,
      content,
      version,
      systemPrompt: options?.systemPrompt,
      tenantId: options?.tenantId,
      active: true,
    });
  }

  async listPrompts(flowId?: string): Promise<DataProcessResult<PromptRecord[]>> {
    const filters: Record<string, unknown> = {};
    if (flowId) filters['flowId'] = flowId;
    const result = await this.db.searchDocuments('xiigen-prompts', filters);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success([]);
    }
    return DataProcessResult.success(result.data as unknown as PromptRecord[]);
  }
}
