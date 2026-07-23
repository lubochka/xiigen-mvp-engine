import 'reflect-metadata';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { SecurityCircuitBreakerService } from './security-circuit-breaker.service';

const makeDb = () => ({
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
});

const makeFreedom = (forbiddenImports: string[] = []) => ({
  getConfig: jest.fn().mockResolvedValue(DataProcessResult.success(forbiddenImports)),
});

const CLEAN_CODE = `
import { Injectable } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';

@Injectable()
export class MyService {
  constructor(private readonly db: IDatabaseService) {}
  async run() { return { ok: true }; }
}
`;

describe('SecurityCircuitBreakerService', () => {
  // ── POSITIVE ───────────────────────────────────────────────────────────────

  it('CONTINUE on clean code with no violations', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const result = await svc.scanBundle(CLEAN_CODE, 'sess-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
    expect(result.data!.violations).toHaveLength(0);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('HALT when Elasticsearch client import detected (fabric violation)', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = `import { Client } from '@elastic/elasticsearch';`;
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.violations.length).toBeGreaterThan(0);
  });

  it('HALT when hardcoded password detected', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = `const password = 'super_secret_pass';`;
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
  });

  it('HALT when hardcoded API key detected', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = `const api_key = 'sk-abc123xyz987qwertyuiop';`;
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
  });

  it('HALT when FREEDOM config adds a custom forbidden import', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(['moment']),
    );
    const code = `import moment from 'moment';`;
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.violations.some((v) => v.includes('moment'))).toBe(true);
  });

  it('DNA-8: stores to security-violations index before returning HALT', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = `import { Client } from '@elastic/elasticsearch';`;
    await svc.scanBundle(code, 'sess-001');
    expect(db.storeDocument).toHaveBeenCalledWith(
      'security-violations',
      expect.objectContaining({ sessionId: 'sess-001', violations: expect.any(Array) }),
    );
  });

  it('reports all violations when multiple patterns match', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = [
      `import { Client } from '@elastic/elasticsearch';`,
      `const password = 'hunter2_long_pass';`,
    ].join('\n');
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.data!.violations.length).toBeGreaterThanOrEqual(2);
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('DNA-3: CONTINUE when FREEDOM config fetch fails (graceful degradation)', async () => {
    const db = makeDb();
    const badFreedom = {
      getConfig: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('FREEDOM_ERR', 'unreachable')),
    };
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      badFreedom,
    );
    const result = await svc.scanBundle(CLEAN_CODE, 'sess-001');
    // Built-in patterns still checked; clean code passes
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
  });

  it('PRIVATE_KEY secret detection', async () => {
    const db = makeDb();
    const svc = new SecurityCircuitBreakerService(
      db as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      makeFreedom(),
    );
    const code = `const PRIVATE_KEY = 'BEGIN RSA PRIVATE KEY longvalue';`;
    const result = await svc.scanBundle(code, 'sess-001');
    expect(result.data!.verdict).toBe('HALT');
  });
});
