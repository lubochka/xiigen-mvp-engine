/**
 * RequiredProviderValidator unit tests — SS-02
 *
 * Covers:
 *   Pass 1: @Inject(TOKEN) extraction + fabric registry lookup by token
 *   Pass 2: : IXxxService constructor type extraction + lookup by interfaceName
 *   Fail-open: registry unreachable → assume valid
 *   Mixed sets: only missing providers reported
 *   Double-report prevention: @Inject + constructor type for same service = 1 entry
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RequiredProviderValidator } from './required-provider-validator';

// Minimal fetch mock helpers
function makeTokenResponse(found: boolean, status = 'ACTIVE') {
  return Promise.resolve({
    ok: found || status === 'ACTIVE',
    json: () => Promise.resolve({ found, _source: found ? { status } : undefined }),
  } as unknown as Response);
}

function makeSearchResponse(count: number) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ hits: { total: { value: count } } }),
  } as unknown as Response);
}

describe('RequiredProviderValidator', () => {
  let validator: RequiredProviderValidator;
  let fetchMock: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequiredProviderValidator],
    }).compile();

    validator = module.get(RequiredProviderValidator);
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  // ── Pass 1: @Inject(TOKEN) extraction ──

  it('should pass when all @Inject tokens have registered ACTIVE providers', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ found: true, _source: { status: 'ACTIVE' } }),
    } as unknown as Response);

    const code = `@Inject(DATABASE_SERVICE) private db: IDatabaseService`;
    const result = await validator.validate(code);

    expect(result.valid).toBe(true);
    expect(result.code).toBe('PROVIDERS_VALID');
    expect(result.missingProviders).toHaveLength(0);
  });

  it('should flag missing providers from @Inject without blocking', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ found: false }),
    } as unknown as Response);

    const code = `@Inject(MESSAGING_SERVICE) private msg: IMessagingService`;
    const result = await validator.validate(code);

    expect(result.valid).toBe(false);
    expect(result.code).toBe('INVALID_MISSING_DEPENDENCY');
    expect(result.missingProviders).toContain('MESSAGING_SERVICE');
  });

  // ── Pass 2: Constructor type extraction ──

  it('should detect missing providers from constructor type annotations', async () => {
    // No @Inject decorator — just typed constructor parameter
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: { total: { value: 0 } } }),
    } as unknown as Response);

    const code = `
      @Injectable()
      export class RegistrationService {
        constructor(
          private readonly messaging: IMessagingService,
          private readonly auth: IOAuthService,
        ) {}
      }
    `;
    const result = await validator.validate(code);

    expect(result.valid).toBe(false);
    expect(result.missingProviders).toContain('IMessagingService');
    expect(result.missingProviders).toContain('IOAuthService');
  });

  it('should pass constructor types that ARE registered', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ hits: { total: { value: 1 } } }),
    } as unknown as Response);

    const code = `
      constructor(private readonly db: IDatabaseService) {}
    `;
    const result = await validator.validate(code);

    expect(result.valid).toBe(true);
  });

  // ── General behavior ──

  it('should pass when code has no injection tokens or typed constructors', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ found: false }),
    } as unknown as Response);

    const code = `export class SimpleService { hello() { return 'hi'; } }`;
    const result = await validator.validate(code);

    expect(result.valid).toBe(true);
    expect(result.message).toContain('No injection tokens');
  });

  it('should fail-open when registry is unreachable (token lookup)', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const code = `@Inject(DATABASE_SERVICE) private db: IDatabaseService`;
    const result = await validator.validate(code);

    expect(result.valid).toBe(true); // fail-open: assume valid
  });

  it('should fail-open when registry is unreachable (interface lookup)', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const code = `constructor(private readonly db: IDatabaseService) {}`;
    const result = await validator.validate(code);

    expect(result.valid).toBe(true); // fail-open: assume valid
  });

  it('should report only missing providers in a mixed set', async () => {
    // DATABASE_SERVICE and QUEUE_SERVICE registered; MESSAGING_SERVICE not
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('MESSAGING_SERVICE')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ found: false }),
          } as unknown as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ found: true, _source: { status: 'ACTIVE' } }),
        } as unknown as Response);
      });

    const code = `
      @Inject(DATABASE_SERVICE) private db: IDatabaseService;
      @Inject(MESSAGING_SERVICE) private msg: IMessagingService;
      @Inject(QUEUE_SERVICE) private queue: IQueueService;
    `;
    const result = await validator.validate(code);

    expect(result.valid).toBe(false);
    expect(result.missingProviders).toEqual(['MESSAGING_SERVICE']);
  });

  it('should not double-report when both @Inject and constructor type match the same service', async () => {
    fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ found: false }),
    } as unknown as Response);

    const code = `
      @Inject(MESSAGING_SERVICE)
      private readonly messaging: IMessagingService;
    `;
    const result = await validator.validate(code);

    // Should report MESSAGING_SERVICE once, not twice
    const reportedCount = result.missingProviders.filter(
      (p) => p === 'MESSAGING_SERVICE' || p === 'IMessagingService',
    ).length;
    expect(reportedCount).toBe(1);
  });
});
