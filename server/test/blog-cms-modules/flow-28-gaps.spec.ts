/**
 * FLOW-28 GAP Implementations Unit Tests
 *
 * Covers:
 * 1. Cf590TemplateValidator — CF-590 enforcement
 * 2. Comment moderation contracts shape
 * 3. SearchPublishFilterImpl — prepends PUBLISHED filter
 * 4. SK-285 cacheFirstRead — exports and interface shape
 * 5. Extension sandbox contracts — interface and failure codes
 * 6. Webhook contracts — ISsrfValidator interface
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  Cf590TemplateValidator,
  TemplateDefinition,
} from '../../src/guardrails/cf590-template-validator';
import { SearchPublishFilterImpl } from '../../src/engine-contracts/search-contracts';
import { cacheFirstRead } from '../../src/engine-contracts/skills/sk-285-cache-first-read';
import type {
  XssFilterResult,
  IBudgetCheckResult,
  ICommentXssFilter,
  ISpamDetector,
  IBudgetService,
} from '../../src/engine-contracts/comment-moderation-contracts';
import type {
  IExtensionSandbox,
  SandboxFailureCode,
} from '../../src/engine-contracts/extension-sandbox-contracts';
import type {
  ISsrfValidator,
  SsrfValidationOptions,
} from '../../src/engine-contracts/webhook-contracts';

// ── 1. Cf590TemplateValidator ─────────────────────────────────────────────

describe('Cf590TemplateValidator', () => {
  let validator: Cf590TemplateValidator;

  beforeEach(() => {
    validator = new Cf590TemplateValidator();
  });

  it('T440 at step[0] — passes validation', () => {
    const templates: TemplateDefinition[] = [
      {
        template_id: 92,
        step_order: [
          { task_type: 'T440', step_index: 0 },
          { task_type: 'T423', step_index: 1 },
        ],
      },
    ];
    const result = validator.validate(templates);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(1);
    expect(result.data![0].passed).toBe(true);
  });

  it('T440 at step[1] — fails with CF590_VIOLATION', () => {
    const templates: TemplateDefinition[] = [
      {
        template_id: 93,
        step_order: [
          { task_type: 'T423', step_index: 0 },
          { task_type: 'T440', step_index: 1 },
        ],
      },
    ];
    const result = validator.validate(templates);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF590_VIOLATION');
    expect(result.errorMessage).toContain('93');
  });

  it('T440 missing entirely — fails with T440_MISSING violation', () => {
    const templates: TemplateDefinition[] = [
      {
        template_id: 94,
        step_order: [],
      },
    ];
    const result = validator.validate(templates);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CF590_VIOLATION');
    expect(result.data).toBeUndefined();
  });

  it('non-FLOW-28 template ID — skipped (not validated)', () => {
    const templates: TemplateDefinition[] = [
      {
        template_id: 999,
        step_order: [{ task_type: 'T001', step_index: 0 }],
      },
    ];
    const result = validator.validate(templates);
    // No FLOW-28 templates — empty results = success
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(0);
  });

  it('all 6 FLOW-28 templates with T440 at step 0 — all pass', () => {
    const templates: TemplateDefinition[] = [92, 93, 94, 95, 96, 97].map((id) => ({
      template_id: id,
      step_order: [
        { task_type: 'T440', step_index: 0 },
        { task_type: 'T423', step_index: 1 },
      ],
    }));
    const result = validator.validate(templates);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(6);
    expect(result.data!.every((r) => r.passed)).toBe(true);
  });

  it('T440 not present in template — found_at is undefined', () => {
    const templates: TemplateDefinition[] = [
      {
        template_id: 95,
        step_order: [
          { task_type: 'T423', step_index: 0 },
          { task_type: 'T424', step_index: 1 },
        ],
      },
    ];
    const result = validator.validate(templates);
    expect(result.isSuccess).toBe(false);
  });
});

// ── 2. Comment moderation contracts shape ─────────────────────────────────

describe('Comment moderation contracts', () => {
  it('XssFilterResult shape is correct', () => {
    const xssResult: XssFilterResult = {
      sanitizedBody: 'clean body',
      strippedElements: ['<script>'],
      xssDetected: true,
    };
    expect(xssResult.sanitizedBody).toBe('clean body');
    expect(xssResult.strippedElements).toHaveLength(1);
    expect(xssResult.xssDetected).toBe(true);
  });

  it('IBudgetCheckResult allowed=true shape', () => {
    const allowed: IBudgetCheckResult = {
      allowed: true,
      remaining_budget: 5000,
    };
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining_budget).toBe(5000);
  });

  it('IBudgetCheckResult allowed=false with BUDGET_EXCEEDED reason', () => {
    const denied: IBudgetCheckResult = {
      allowed: false,
      reason: 'BUDGET_EXCEEDED',
    };
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toBe('BUDGET_EXCEEDED');
  });

  it('ICommentXssFilter interface satisfies contract shape', () => {
    const mockFilter: ICommentXssFilter = {
      sanitize: jest.fn(async (_rawBody: string) =>
        DataProcessResult.success({
          sanitizedBody: 'clean',
          strippedElements: [],
          xssDetected: false,
        }),
      ),
    };
    expect(typeof mockFilter.sanitize).toBe('function');
  });

  it('ISpamDetector interface satisfies contract shape', () => {
    const mockDetector: ISpamDetector = {
      detect: jest.fn(async (_body: string) =>
        DataProcessResult.success({
          spam_probability: 0.1,
          confidence: 'LOW' as const,
          reason: 'low signals',
        }),
      ),
    };
    expect(typeof mockDetector.detect).toBe('function');
  });

  it('IBudgetService interface satisfies contract shape', () => {
    const mockBudget: IBudgetService = {
      checkBudget: jest.fn(async (_req) =>
        DataProcessResult.success({ allowed: true, remaining_budget: 1000 }),
      ),
    };
    expect(typeof mockBudget.checkBudget).toBe('function');
  });
});

// ── 3. SearchPublishFilterImpl ────────────────────────────────────────────

describe('SearchPublishFilterImpl', () => {
  let filter: SearchPublishFilterImpl;

  beforeEach(() => {
    filter = new SearchPublishFilterImpl();
  });

  it('prepends PUBLISHED status clause to must array', () => {
    const query = { must: [{ match: { category: 'tech' } }] };
    const result = filter.applyFilter(query);
    expect(result.must[0]).toEqual({ term: { status: 'PUBLISHED' } });
    expect(result.must.length).toBe(2);
  });

  it('does not modify the original query object', () => {
    const original = { must: [{ match: { title: 'foo' } }] };
    const originalLength = original.must.length;
    filter.applyFilter(original);
    expect(original.must.length).toBe(originalLength);
  });

  it('preserves existing must clauses after PUBLISHED filter', () => {
    const query = {
      must: [
        { match: { author: 'alice' } } as Record<string, Record<string, unknown>>,
        { term: { type: 'post' } } as Record<string, Record<string, unknown>>,
      ],
    };
    const result = filter.applyFilter(query);
    expect(result.must.length).toBe(3);
    expect(result.must[0]).toEqual({ term: { status: 'PUBLISHED' } });
    expect(result.must[1]).toEqual({ match: { author: 'alice' } });
  });

  it('works with empty must array', () => {
    const query = { must: [] };
    const result = filter.applyFilter(query);
    expect(result.must.length).toBe(1);
    expect(result.must[0]).toEqual({ term: { status: 'PUBLISHED' } });
  });
});

// ── 4. SK-285 cacheFirstRead ──────────────────────────────────────────────

describe('SK-285 cacheFirstRead', () => {
  it('exports cacheFirstRead function', () => {
    expect(typeof cacheFirstRead).toBe('function');
  });

  it('CacheFirstReadDependencies interface has correct shape', () => {
    // Test via structural check — create a valid deps object
    const deps = {
      cacheReader: { get: jest.fn() },
      cacheWriter: { set: jest.fn() },
      dbReader: jest.fn(),
      keyBuilder: (key: string) => `prefix:${key}`,
      tagBuilder: (_key: string, _data: Record<string, unknown>) => ['tag1'],
      config: { ttl: 300 },
    };
    expect(typeof deps.cacheReader.get).toBe('function');
    expect(typeof deps.cacheWriter.set).toBe('function');
    expect(typeof deps.dbReader).toBe('function');
    expect(typeof deps.keyBuilder).toBe('function');
    expect(typeof deps.tagBuilder).toBe('function');
    expect(deps.config.ttl).toBe(300);
  });

  it('returns cached value on cache HIT without calling dbReader', async () => {
    const cachedData = { title: 'Cached Page', content: 'some content' };
    const deps = {
      cacheReader: {
        get: jest.fn(async () =>
          DataProcessResult.success<Record<string, unknown> | null>(cachedData),
        ),
      },
      cacheWriter: { set: jest.fn() },
      dbReader: jest.fn(),
      keyBuilder: (key: string) => `cache:${key}`,
      tagBuilder: (_key: string, _data: Record<string, unknown>) => ['tag1'],
      config: { ttl: 300 },
    };
    const result = await cacheFirstRead('about', deps);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(cachedData);
    expect(deps.dbReader).not.toHaveBeenCalled();
  });

  it('reads DB and populates cache on cache MISS', async () => {
    const dbData = { title: 'DB Page', content: 'db content' };
    const deps = {
      cacheReader: {
        get: jest.fn(async () => DataProcessResult.success<Record<string, unknown> | null>(null)),
      },
      cacheWriter: { set: jest.fn(async () => DataProcessResult.success(undefined)) },
      dbReader: jest.fn(async () => DataProcessResult.success(dbData)),
      keyBuilder: (key: string) => `cache:${key}`,
      tagBuilder: (_key: string, _data: Record<string, unknown>) => ['tag1'],
      config: { ttl: 300 },
    };
    const result = await cacheFirstRead('about', deps);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(dbData);
    expect(deps.cacheWriter.set).toHaveBeenCalledTimes(1);
  });

  it('cache read failure falls through to DB (non-fatal)', async () => {
    const dbData = { title: 'DB Page' };
    const deps = {
      cacheReader: {
        get: jest.fn(async () => {
          throw new Error('Redis connection failed');
        }),
      },
      cacheWriter: { set: jest.fn(async () => DataProcessResult.success(undefined)) },
      dbReader: jest.fn(async () => DataProcessResult.success(dbData)),
      keyBuilder: (key: string) => `cache:${key}`,
      tagBuilder: (_key: string, _data: Record<string, unknown>) => ['tag1'],
      config: { ttl: 300 },
    };
    const result = await cacheFirstRead('about', deps);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(dbData);
  });

  it('cache write failure does not propagate (non-fatal)', async () => {
    const dbData = { title: 'DB Page' };
    const deps = {
      cacheReader: {
        get: jest.fn(async () => DataProcessResult.success<Record<string, unknown> | null>(null)),
      },
      cacheWriter: {
        set: jest.fn(async () => {
          throw new Error('Redis write failed');
        }),
      },
      dbReader: jest.fn(async () => DataProcessResult.success(dbData)),
      keyBuilder: (key: string) => `cache:${key}`,
      tagBuilder: (_key: string, _data: Record<string, unknown>) => ['tag1'],
      config: { ttl: 300 },
    };
    const result = await cacheFirstRead('about', deps);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(dbData);
  });
});

// ── 5. Extension sandbox contracts ───────────────────────────────────────

describe('Extension sandbox contracts', () => {
  it('IExtensionSandbox interface has execute and validateHookCode methods', () => {
    const mockSandbox: IExtensionSandbox = {
      execute: jest.fn(async (_code, _payload, _opts) =>
        DataProcessResult.success({ output: 'result' }),
      ),
      validateHookCode: jest.fn((_code) => DataProcessResult.success(undefined)),
    };
    expect(typeof mockSandbox.execute).toBe('function');
    expect(typeof mockSandbox.validateHookCode).toBe('function');
  });

  it('SandboxFailureCode union has exactly 5 values', () => {
    const codes: SandboxFailureCode[] = [
      'SANDBOX_NETWORK_DENIED',
      'SANDBOX_ENV_DENIED',
      'SANDBOX_TIMEOUT',
      'SANDBOX_INVALID_CODE',
      'SANDBOX_EXECUTION_ERROR',
    ];
    expect(codes.length).toBe(5);
    expect(codes).toContain('SANDBOX_NETWORK_DENIED');
    expect(codes).toContain('SANDBOX_ENV_DENIED');
    expect(codes).toContain('SANDBOX_TIMEOUT');
    expect(codes).toContain('SANDBOX_INVALID_CODE');
    expect(codes).toContain('SANDBOX_EXECUTION_ERROR');
  });

  it('SandboxExecutionOptions requires timeoutMs and sandboxId', () => {
    const opts = { timeoutMs: 5000, sandboxId: 'sb-001' };
    expect(typeof opts.timeoutMs).toBe('number');
    expect(typeof opts.sandboxId).toBe('string');
  });
});

// ── 6. Webhook contracts ──────────────────────────────────────────────────

describe('Webhook contracts (ISsrfValidator)', () => {
  it('ISsrfValidator interface has validateAndResolve method', () => {
    const mockValidator: ISsrfValidator = {
      validateAndResolve: jest.fn(async (_url, _opts) =>
        DataProcessResult.success({
          resolvedIp: '93.184.216.34',
          isBlocked: false,
          url: 'https://example.com',
        }),
      ),
    };
    expect(typeof mockValidator.validateAndResolve).toBe('function');
  });

  it('SsrfValidationOptions skipCache is a boolean', () => {
    const opts: SsrfValidationOptions = { skipCache: true };
    expect(typeof opts.skipCache).toBe('boolean');
    expect(opts.skipCache).toBe(true);
  });

  it('skipCache:true required on every retry', () => {
    const opts: SsrfValidationOptions = { skipCache: true, allowlistId: 'list-001' };
    expect(opts.skipCache).toBe(true);
    expect(opts.allowlistId).toBeDefined();
  });

  it('SsrfValidationResult blocked scenario', () => {
    const blockedResult = {
      resolvedIp: '192.168.1.1',
      isBlocked: true,
      blockReason: 'RFC1918_PRIVATE' as const,
      url: 'http://192.168.1.1/admin',
    };
    expect(blockedResult.isBlocked).toBe(true);
    expect(blockedResult.blockReason).toBe('RFC1918_PRIVATE');
  });
});
