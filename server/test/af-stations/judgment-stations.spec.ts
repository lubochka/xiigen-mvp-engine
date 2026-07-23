/**
 * P8.3 Tests — AF-6 Code Review + AF-8 Security + AF-11 Feedback
 *
 * Tests:
 * AF-6 (static review: docstrings, error handling, hardcoded values;
 *        AI review when provider available; DNA-5 check; no code → failure)
 * AF-8 (hardcoded password, eval, SQL injection, insecure HTTP, clean code;
 *        DNA-5 check; code in generationResults)
 * AF-11 (records feedback, aggregates stats, calculates pass rate,
 *         handles empty scores, multiple task types, clear, DNA-5 check)
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { StationInput, StationId } from '../../src/af-stations/base';
import { CodeReviewStation } from '../../src/af-stations/af6-code-review';
import { SecurityStation } from '../../src/af-stations/af8-security';
import { FeedbackStation } from '../../src/af-stations/af11-feedback';

// ── Helpers ─────────────────────────────────────────

function makeInput(
  overrides: Partial<ConstructorParameters<typeof StationInput>[0]> = {},
): StationInput {
  return new StationInput({
    tenantId: 'tenant-test',
    taskType: 'T44',
    spec: { archetype: 'DATA_PIPELINE', description: 'inventory management' },
    ...overrides,
  });
}

function createMockAi(
  response: Record<string, unknown> = { text: 'Code looks good. No issues found.', model: 'mock' },
  shouldFail = false,
): IAiProvider {
  return {
    generate: jest.fn(async () => {
      if (shouldFail) {
        return DataProcessResult.failure<Record<string, unknown>>('AI_ERROR', 'AI review failed');
      }
      return DataProcessResult.success<Record<string, unknown>>(response);
    }),
    generateStructured: jest.fn(async () => DataProcessResult.success<Record<string, unknown>>({})),
    getModelInfo: jest.fn(() => ({ model: 'mock', provider: 'test' })),
  } as unknown as IAiProvider;
}

// Clean code that passes all checks
const CLEAN_CODE = `
/**
 * InventoryService — extends MicroserviceBase.
 * Resolves through Database Fabric.
 */
export class InventoryService extends MicroserviceBase {
  async createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const result = await this.databaseFabric.storeDocument(context.tenantId, doc);
      return DataProcessResult.success(result);
    } catch (error) {
      return DataProcessResult.failure('STORE_FAILED', error.message);
    }
  }
}
`;

// Code with security issues
const INSECURE_CODE = `
const password = "super_secret_123";
const apiKey = "sk-abc123def456";
const query = "SELECT * FROM users WHERE id = " + userId;
eval(userInput);
const url = "http://external-api.example.com/data";
`;

// ══════════════════════════════════════════════════════
// AF-6: Code Review Station
// ══════════════════════════════════════════════════════

describe('CodeReviewStation', () => {
  let review: CodeReviewStation;

  beforeEach(() => {
    review = new CodeReviewStation();
  });

  it('should have stationId AF-6', () => {
    expect(review.stationId).toBe(StationId.AF6_CODE_REVIEW);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const input = makeInput({ tenantId: '' });
    input.code = CLEAN_CODE;
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should fail when no code is present', async () => {
    const input = makeInput({ code: '' });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_CODE');
  });

  it('should pass clean code with zero errors', async () => {
    const input = makeInput({ code: CLEAN_CODE });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    const data = result.data!.data;
    expect(data.error_count).toBe(0);
    expect(result.data!.success).toBe(true);
  });

  it('should warn on missing docstrings', async () => {
    const input = makeInput({ code: 'async function noDoc() { try { } catch(e) {} }' });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    const issues = result.data!.data.issues as any[];
    const docIssue = issues.find((i: any) => i.rule_id === 'REV-1');
    expect(docIssue).toBeDefined();
    expect(docIssue.severity).toBe('warning');
  });

  it('should error on async code without error handling', async () => {
    const input = makeInput({
      code: '/** Documented */ async function doStuff() { await fetch("https://api.example.com"); }',
    });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    const issues = result.data!.data.issues as any[];
    const errHandling = issues.find((i: any) => i.rule_id === 'REV-2');
    expect(errHandling).toBeDefined();
    expect(errHandling.severity).toBe('error');
  });

  it('should error on hardcoded localhost URL', async () => {
    const input = makeInput({
      code: '/** doc */ const url = "http://localhost:3000/api";',
    });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    const issues = result.data!.data.issues as any[];
    const hardcoded = issues.find((i: any) => i.rule_id === 'REV-3');
    expect(hardcoded).toBeDefined();
    expect(hardcoded.severity).toBe('error');
  });

  it('should error on hardcoded loopback IP', async () => {
    const input = makeInput({
      code: '/** doc */ const host = "127.0.0.1";',
    });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    const issues = result.data!.data.issues as any[];
    const hardcoded = issues.find((i: any) => i.rule_id === 'REV-3');
    expect(hardcoded).toBeDefined();
  });

  it('should extract code from generationResults when code field is empty', async () => {
    const input = makeInput({
      code: '',
    });
    input.generationResults = [{ step_id: 's1', code: CLEAN_CODE }];
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.error_count).toBe(0);
  });

  it('should include AI review text when provider available', async () => {
    const mockAi = createMockAi();
    const reviewWithAi = new CodeReviewStation(mockAi);
    const input = makeInput({ code: CLEAN_CODE });
    const result = await reviewWithAi.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.has_ai_review).toBe(true);
    expect(result.data!.data.ai_review).toBe('Code looks good. No issues found.');
    expect(mockAi.generate).toHaveBeenCalled();
  });

  it('should work without AI provider (AI review is optional)', async () => {
    const input = makeInput({ code: CLEAN_CODE });
    const result = await review.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.has_ai_review).toBe(false);
    expect(result.data!.data.ai_review).toBeNull();
  });

  it('should handle AI provider failure gracefully', async () => {
    const mockAi = createMockAi({}, true);
    const reviewWithAi = new CodeReviewStation(mockAi);
    const input = makeInput({ code: CLEAN_CODE });
    const result = await reviewWithAi.execute(input);
    expect(result.isSuccess).toBe(true);
    // AI review fails silently — still returns
    expect(result.data!.data.has_ai_review).toBe(false);
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const input = makeInput({ code: CLEAN_CODE });
    const result = await review.execute(input);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// AF-8: Security Station
// ══════════════════════════════════════════════════════

describe('SecurityStation', () => {
  let security: SecurityStation;

  beforeEach(() => {
    security = new SecurityStation();
  });

  it('should have stationId AF-8', () => {
    expect(security.stationId).toBe(StationId.AF8_SECURITY);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const input = makeInput({ tenantId: '' });
    input.code = CLEAN_CODE;
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should pass clean code with zero findings', async () => {
    const input = makeInput({ code: CLEAN_CODE });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success).toBe(true);
    expect(result.data!.data.finding_count).toBe(0);
    expect(result.data!.data.error_count).toBe(0);
  });

  it('should succeed with no code (nothing to scan)', async () => {
    const input = makeInput({ code: '' });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.finding_count).toBe(0);
  });

  it('should catch hardcoded password (SEC-1) as error', async () => {
    const input = makeInput({ code: 'const password = "secret123";' });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success).toBe(false); // errors present
    const findings = result.data!.data.findings as any[];
    const sec1 = findings.find((f: any) => f.rule_id === 'SEC-1');
    expect(sec1).toBeDefined();
    expect(sec1.severity).toBe('error');
    expect(sec1.match_count).toBeGreaterThanOrEqual(1);
  });

  it('should catch hardcoded API key (SEC-1) as error', async () => {
    const input = makeInput({ code: 'const api_key = "sk-1234567890abcdef";' });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    const sec1 = findings.find((f: any) => f.rule_id === 'SEC-1');
    expect(sec1).toBeDefined();
    expect(sec1.severity).toBe('error');
  });

  it('should catch eval() usage (SEC-3) as error', async () => {
    const input = makeInput({ code: 'const result = eval(userInput);' });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    const sec3 = findings.find((f: any) => f.rule_id === 'SEC-3');
    expect(sec3).toBeDefined();
    expect(sec3.severity).toBe('error');
    expect(sec3.name).toBe('unsafe_eval');
  });

  it('should catch new Function() usage (SEC-3) as error', async () => {
    const input = makeInput({ code: 'const fn = new Function("return 1 + 2");' });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    const sec3 = findings.find((f: any) => f.rule_id === 'SEC-3');
    expect(sec3).toBeDefined();
  });

  it('should catch SQL injection pattern (SEC-2) as error', async () => {
    const input = makeInput({
      code: 'const query = "SELECT * FROM users WHERE id = " + userId;',
    });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    const sec2 = findings.find((f: any) => f.rule_id === 'SEC-2');
    expect(sec2).toBeDefined();
    expect(sec2.severity).toBe('error');
  });

  it('should catch insecure HTTP (SEC-4) as warning', async () => {
    const input = makeInput({
      code: 'fetch("http://external-api.example.com/data");',
    });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success).toBe(true); // warnings don't block
    const findings = result.data!.data.findings as any[];
    const sec4 = findings.find((f: any) => f.rule_id === 'SEC-4');
    expect(sec4).toBeDefined();
    expect(sec4.severity).toBe('warning');
  });

  it('should not flag localhost as insecure HTTP', async () => {
    const input = makeInput({
      code: 'fetch("http://localhost:3000/api");',
    });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    const sec4 = findings.find((f: any) => f.rule_id === 'SEC-4');
    expect(sec4).toBeUndefined(); // localhost is excluded from SEC-4
  });

  it('should detect multiple findings in insecure code', async () => {
    const input = makeInput({ code: INSECURE_CODE });
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success).toBe(false); // has errors
    const findings = result.data!.data.findings as any[];
    expect(findings.length).toBeGreaterThanOrEqual(3);
    expect(result.data!.data.error_count).toBeGreaterThanOrEqual(2);
  });

  it('should extract code from generationResults when code field is empty', async () => {
    const input = makeInput({ code: '' });
    input.generationResults = [{ step_id: 's1', code: 'const password = "secret";' }];
    const result = await security.execute(input);
    expect(result.isSuccess).toBe(true);
    const findings = result.data!.data.findings as any[];
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('should have 4 security rules', () => {
    expect(security.ruleCount).toBe(4);
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const input = makeInput({ code: CLEAN_CODE });
    const result = await security.execute(input);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// AF-11: Feedback Station
// ══════════════════════════════════════════════════════

describe('FeedbackStation', () => {
  let feedback: FeedbackStation;

  beforeEach(() => {
    feedback = new FeedbackStation();
  });

  it('should have stationId AF-11', () => {
    expect(feedback.stationId).toBe(StationId.AF11_FEEDBACK);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const input = makeInput({ tenantId: '' });
    const result = await feedback.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should record feedback and return stats', async () => {
    const input = makeInput({
      code: 'some code',
    });
    input.scores = [{ score: 0.85 }];
    const result = await feedback.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.feedback_recorded).toBe(true);
    expect(result.data!.data.task_type).toBe('T44');
    expect(result.data!.data.total_feedback).toBe(1);
  });

  it('should aggregate stats across multiple entries', async () => {
    const input1 = makeInput();
    input1.scores = [{ score: 0.8 }];
    await feedback.execute(input1);

    const input2 = makeInput();
    input2.scores = [{ score: 0.9 }];
    await feedback.execute(input2);

    const stats = feedback.getStats('T44');
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(2);
    expect(stats!.total_score).toBeCloseTo(1.7, 1); // sum of individual scores
    expect(stats!.average_score).toBeCloseTo(0.85, 1); // average
  });

  it('should calculate pass rate correctly', async () => {
    // Pass: no errors in review results
    const input1 = makeInput();
    input1.scores = [{ score: 0.9 }];
    input1.reviewResults = [{ error_count: 0, issue_count: 0 }];
    await feedback.execute(input1);

    // Fail: has errors
    const input2 = makeInput();
    input2.scores = [{ score: 0.3 }];
    input2.reviewResults = [{ error_count: 2, issue_count: 2 }];
    await feedback.execute(input2);

    const rate = feedback.getPassRate('T44');
    expect(rate).toBe(0.5); // 1 pass, 1 fail
  });

  it('should handle empty scores gracefully', async () => {
    const input = makeInput();
    input.scores = [];
    const result = await feedback.execute(input);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.data.score).toBe(0);
  });

  it('should return 0 pass rate for unknown task type', () => {
    expect(feedback.getPassRate('UNKNOWN')).toBe(0);
  });

  it('should return null stats for unknown task type', () => {
    expect(feedback.getStats('UNKNOWN')).toBeNull();
  });

  it('should track multiple task types separately', async () => {
    const input44 = makeInput({ taskType: 'T44' });
    input44.scores = [{ score: 0.9 }];
    await feedback.execute(input44);

    const input45 = makeInput({ taskType: 'T45' });
    input45.scores = [{ score: 0.7 }];
    await feedback.execute(input45);

    expect(feedback.totalFeedback).toBe(2);
    expect(feedback.getStats('T44')!.count).toBe(1);
    expect(feedback.getStats('T45')!.count).toBe(1);
  });

  it('should list all task types with feedback', async () => {
    const input44 = makeInput({ taskType: 'T44' });
    input44.scores = [{ score: 0.9 }];
    await feedback.execute(input44);

    const input45 = makeInput({ taskType: 'T45' });
    input45.scores = [{ score: 0.7 }];
    await feedback.execute(input45);

    const types = feedback.listTaskTypes();
    expect(types).toContain('T44');
    expect(types).toContain('T45');
  });

  it('should clear all feedback', async () => {
    const input = makeInput();
    input.scores = [{ score: 0.9 }];
    await feedback.execute(input);
    expect(feedback.totalFeedback).toBe(1);

    feedback.clear();
    expect(feedback.totalFeedback).toBe(0);
  });

  it('should record generation metadata in feedback', async () => {
    const input = makeInput({ code: 'some generated code' });
    input.scores = [{ score: 0.85 }];
    input.generationResults = [
      { step_id: 's1', code: 'step 1 code' },
      { step_id: 's2', code: 'step 2 code' },
    ];

    await feedback.execute(input);
    // Just verify it records without crashing
    expect(feedback.totalFeedback).toBe(1);
  });

  it('should use "unknown" when taskType is empty', async () => {
    const input = makeInput({ taskType: '' });
    input.scores = [{ score: 0.5 }];
    await feedback.execute(input);
    expect(feedback.getStats('unknown')).not.toBeNull();
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const input = makeInput();
    input.scores = [{ score: 0.9 }];
    const result = await feedback.execute(input);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
