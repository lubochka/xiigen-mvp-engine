/**
 * CodeScaffoldGenerator — T393 [BUILD].
 *
 * Generates NestJS service scaffold from resolved templates.
 * Generated scaffold includes MicroserviceBase extension (DNA-4).
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface ScaffoldGenerationResult {
  scaffoldId: string;
  filesGenerated: number;
  generatedAt: string;
}

export class CodeScaffoldGenerator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async generate(
    tenantId: string,
    templateSetId: string,
    taskTypes: string[],
  ): Promise<DataProcessResult<ScaffoldGenerationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!templateSetId)
      return DataProcessResult.failure('MISSING_TEMPLATE_SET_ID', 'templateSetId is required');
    if (!taskTypes.length)
      return DataProcessResult.failure('MISSING_TASK_TYPES', 'taskTypes are required');

    // Generate scaffold with MicroserviceBase extension for each task type
    const scaffoldFiles: Record<string, unknown>[] = taskTypes.map((taskType) => ({
      taskType,
      className: `${taskType}Service`,
      extends: 'MicroserviceBase',
      imports: ['MicroserviceBase', 'DataProcessResult'],
      methods: ['execute'],
    }));

    const scaffoldId = randomUUID();
    const filesGenerated = taskTypes.length;
    const generatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      scaffoldId,
      tenantId,
      templateSetId,
      taskTypes,
      scaffoldFiles,
      filesGenerated,
      generatedAt,
    };

    const stored = await this.db.storeDocument('flow26-code-scaffolds', doc, scaffoldId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.scaffold.generated', {
      scaffoldId,
      tenantId,
      templateSetId,
      filesGenerated,
      generatedAt,
    });

    return DataProcessResult.success({ scaffoldId, filesGenerated, generatedAt });
  }
}
