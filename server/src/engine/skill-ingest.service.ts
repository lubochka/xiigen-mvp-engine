/**
 * SkillIngestService — persists skill blocks into the RAG index (xiigen-skills).
 *
 * Distinct from rag-init/SkillIndexer which does in-memory pattern extraction.
 * This service writes to the DB so the rag-retrieve node handler can search skills.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: storeDocument before any downstream enqueue.
 * Stage 2, S7.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface SkillBlock {
  skillId: string;
  name: string;
  description: string;
  tags: string[];
  namespace: string;
  content: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

const INDEX = 'xiigen-skills';

@Injectable()
export class SkillIngestService {
  private readonly logger = new Logger(SkillIngestService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  // ─── indexSkillBlock ───────────────────────────────────────────────────────

  async indexSkillBlock(
    block: Omit<SkillBlock, 'createdAt' | 'updatedAt'>,
  ): Promise<DataProcessResult<SkillBlock>> {
    if (!block.skillId || !block.name || !block.content) {
      return DataProcessResult.failure('MISSING_PARAMS', 'skillId, name, and content are required');
    }
    const now = new Date().toISOString();
    const record: SkillBlock = { ...block, createdAt: now, updatedAt: now };
    const result = await this.db.storeDocument(
      INDEX,
      record as unknown as Record<string, unknown>,
      block.skillId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    this.logger.log(`Indexed skill: ${block.skillId}`);
    return DataProcessResult.success(record);
  }

  // ─── bulkIndexSkills ───────────────────────────────────────────────────────

  async bulkIndexSkills(
    blocks: Array<Omit<SkillBlock, 'createdAt' | 'updatedAt'>>,
  ): Promise<DataProcessResult<{ indexed: number; failed: number }>> {
    if (!blocks.length) {
      return DataProcessResult.success({ indexed: 0, failed: 0 });
    }
    const now = new Date().toISOString();
    const docs = blocks.map((b) => ({
      ...b,
      createdAt: now,
      updatedAt: now,
    })) as unknown as Record<string, unknown>[];
    const result = await this.db.bulkStore(INDEX, docs);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    const indexed = Number(result.data?.['indexed'] ?? blocks.length);
    const failed = Number(result.data?.['failed'] ?? 0);
    this.logger.log(`Bulk indexed ${indexed} skills`);
    return DataProcessResult.success({ indexed, failed });
  }

  // ─── searchSkills ──────────────────────────────────────────────────────────

  async searchSkills(
    query: { namespace?: string; tags?: string[]; name?: string },
    size = 20,
  ): Promise<DataProcessResult<SkillBlock[]>> {
    const filters: Record<string, unknown> = {};
    if (query.namespace) filters['namespace'] = query.namespace;
    if (query.tags?.length) filters['tags'] = query.tags;
    if (query.name) filters['name'] = query.name;
    const result = await this.db.searchDocuments(INDEX, filters, size);
    if (!result.isSuccess) {
      return DataProcessResult.success([]);
    }
    return DataProcessResult.success((result.data ?? []) as unknown as SkillBlock[]);
  }

  // ─── getSkill ──────────────────────────────────────────────────────────────

  async getSkill(skillId: string): Promise<DataProcessResult<SkillBlock | null>> {
    if (!skillId) {
      return DataProcessResult.failure('MISSING_SKILL_ID', 'skillId is required');
    }
    const result = await this.db.getDocument(INDEX, skillId);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success(null);
    }
    return DataProcessResult.success(result.data as unknown as SkillBlock);
  }
}
