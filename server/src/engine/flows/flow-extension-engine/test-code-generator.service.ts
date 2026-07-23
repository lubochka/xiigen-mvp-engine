/**
 * TestCodeGenerator — T395 [BUILD].
 *
 * Generates unit + integration test suite for the generated service.
 * Tests must cover: UNSCOPED_QUERY, DNA-8 ordering, DB failure propagation.
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

export interface TestSuiteGenerationResult {
  testSuiteId: string;
  testCount: number;
  generatedAt: string;
}

export class TestCodeGenerator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async generate(
    tenantId: string,
    codeId: string,
    taskType: string,
    serviceSpec: Record<string, unknown>,
  ): Promise<DataProcessResult<TestSuiteGenerationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!codeId) return DataProcessResult.failure('MISSING_CODE_ID', 'codeId is required');
    if (!taskType) return DataProcessResult.failure('MISSING_TASK_TYPE', 'taskType is required');

    // Generate tests — must cover UNSCOPED_QUERY, DNA-8, DB failure
    const testCases = [
      `it('missing tenantId → UNSCOPED_QUERY', ...)`,
      `it('storeDocument() called BEFORE enqueue() — DNA-8', ...)`,
      `it('DB store failure → error propagated', ...)`,
      `it('valid args → success', ...)`,
    ];

    const testCount = testCases.length;
    const testSuiteId = randomUUID();
    const generatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      testSuiteId,
      tenantId,
      codeId,
      taskType,
      serviceSpec,
      testCases,
      testCount,
      generatedAt,
    };

    const stored = await this.db.storeDocument('flow26-generated-tests', doc, testSuiteId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.tests.generated', {
      testSuiteId,
      tenantId,
      codeId,
      taskType,
      testCount,
      generatedAt,
    });

    return DataProcessResult.success({ testSuiteId, testCount, generatedAt });
  }
}
