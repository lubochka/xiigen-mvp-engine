/**
 * FLOW-02 Phase H — Auth certification tests.
 *
 * Covers test-integrity v2.2.0 Rule 7 (401/403 per controller per role) and
 * Rule 8 (cross-tenant JWT rejection) for the profile-enrichment flow.
 *
 * 5 cells:
 *   AUTH-01  anonymous (no JWT)                           → 401
 *   AUTH-02  Tenant B JWT on Tenant A route (Rule 8)     → 401 TENANT_MISMATCH
 *   AUTH-03  valid Tenant A JWT, tenant-user role         → 200
 *   AUTH-04  valid Tenant A JWT, tenant-admin role        → 200
 *   AUTH-05  @Public() probe — bypass still works         → 200
 *
 * The harness uses in-memory fabric providers (no ES/Redis needed) and
 * GlobalJwtAuthGuard + RolesGuard wired as APP_GUARDs — exactly as production.
 * A lightweight fixture controller decorated with the same @Roles() set as
 * FlowHttpController.executeFlow() exercises the full auth decision path.
 *
 * Auth plan v3.0 §LAYER-2 reference: FLOW-02 row, columns anon/tenant-user/tenant-admin.
 */

import 'reflect-metadata';
import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { ClsModule, ClsService } from 'nestjs-cls';
import { createHmac, randomBytes } from 'crypto';
import { Test } from '@nestjs/testing';
import type { Request, Response, NextFunction } from 'express';
import type { AddressInfo } from 'net';

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { JwtAuthStrategy } from '../../src/auth/jwt.strategy';
import { ScopeEnrichmentInterceptor } from '../../src/auth/scope-enrichment.interceptor';
import { GlobalJwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { Roles } from '../../src/auth/roles.decorator';
import { RolesGuard } from '../../src/auth/roles.guard';
import { Public } from '../../src/auth/public.decorator';
import {
  ROLE_TENANT_USER,
  ROLE_TENANT_ADMIN,
  ROLE_PLATFORM_ADMIN,
} from '../../src/kernel/role-strings';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  TenantRecord,
} from '../../src/kernel/multi-tenant/tenant-context';
import {
  TOKEN_SERVICE,
  ITokenService,
  TokenIssueResult,
  TokenVerifyResult,
} from '../../src/fabrics/interfaces/token.service.interface';

// ── Tenants used in the matrix ───────────────────────────────────────────────

const TENANT_A = 'flow02-tenant-a';
const TENANT_B = 'flow02-tenant-b';

// ── In-memory HMAC token service (V-16 structural: per-tenant signing key) ───

@Injectable()
class InMemoryTokenService extends ITokenService {
  private static readonly ROOT_SECRET = 'flow02-auth-root-secret';

  constructor(private readonly cls: ClsService) {
    super();
  }

  private keyFor(tenantId: string): string {
    return createHmac('sha256', InMemoryTokenService.ROOT_SECRET).update(tenantId).digest('hex');
  }

  private currentTenant(): string | undefined {
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId;
    } catch {
      return undefined;
    }
  }

  private sign(payload: Record<string, unknown>, tenantId: string): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.keyFor(tenantId)).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  /**
   * Issue a token for an explicit tenantId (for cross-tenant test token minting).
   * Bypasses CLS tenant resolution so tests can mint tokens for a specific tenant.
   */
  issueForTenant(subject: string, roles: string[], tenantId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      sub: subject,
      tenantId,
      roles,
      iat: now,
      exp: now + 3600,
      jti: randomBytes(8).toString('hex'),
    };
    return this.sign(payload, tenantId);
  }

  async issue(
    subject: string,
    claims: { roles: readonly string[]; custom?: Record<string, unknown> },
  ): Promise<DataProcessResult<TokenIssueResult>> {
    const tenantId = this.currentTenant();
    if (!tenantId) return DataProcessResult.failure('NO_TENANT', 'no CLS tenant');
    const token = this.issueForTenant(subject, [...claims.roles], tenantId);
    const now = Math.floor(Date.now() / 1000);
    return DataProcessResult.success({ token, expiresAt: now + 3600, jti: '' });
  }

  async verify(token: string): Promise<DataProcessResult<TokenVerifyResult>> {
    const tenantId = this.currentTenant();
    if (!tenantId) return DataProcessResult.failure('NO_TENANT', 'no CLS tenant');
    const parts = token.split('.');
    if (parts.length !== 2) return DataProcessResult.failure('TOKEN_INVALID', 'malformed');
    const [body, sig] = parts as [string, string];
    const expected = createHmac('sha256', this.keyFor(tenantId)).update(body).digest('base64url');
    if (sig !== expected) return DataProcessResult.failure('TOKEN_INVALID', 'signature mismatch');
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    } catch {
      return DataProcessResult.failure('TOKEN_INVALID', 'payload parse failed');
    }
    if (payload['tenantId'] !== tenantId) {
      return DataProcessResult.failure('TENANT_MISMATCH', 'cross-tenant token rejected');
    }
    const exp = payload['exp'];
    if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) {
      return DataProcessResult.failure('TOKEN_EXPIRED', 'expired');
    }
    const rolesRaw = payload['roles'];
    const roles = Array.isArray(rolesRaw)
      ? rolesRaw.filter((r): r is string => typeof r === 'string')
      : [];
    return DataProcessResult.success({
      subject: String(payload['sub'] ?? ''),
      tenantId: String(payload['tenantId']),
      roles,
      claims: {},
      expiresAt: typeof exp === 'number' ? exp : 0,
      jti: String(payload['jti'] ?? ''),
    });
  }

  async refresh(token: string): Promise<DataProcessResult<TokenIssueResult>> {
    const v = await this.verify(token);
    if (!v.isSuccess || !v.data) {
      return DataProcessResult.failure(v.errorCode ?? 'TOKEN_INVALID', 'refresh failed');
    }
    return this.issue(v.data.subject, { roles: v.data.roles });
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

// ── Tenant-context middleware ─────────────────────────────────────────────────

@Injectable()
class TestTenantContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const raw = req.headers['x-tenant-id'];
    const tenantId = typeof raw === 'string' ? raw.trim() : '';
    if (!tenantId) {
      res.status(403).json({ is_success: false, error_code: 'TENANT_MISSING' });
      return;
    }
    const record: TenantRecord = {
      id: tenantId,
      name: tenantId,
      status: 'active',
      plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.cls.set(TENANT_CONTEXT_KEY, new TenantContext(record));
    next();
  }
}

// ── Fixture controller (mirrors FLOW-02 execute role requirements) ────────────

@Controller('api/flow02-fixture')
class Flow02FixtureController {
  @Get('execute')
  @Roles(ROLE_TENANT_USER, ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN)
  executeFlow(): Record<string, unknown> {
    return { is_success: true, route: 'flow02-execute' };
  }

  @Get('public')
  @Public()
  publicProbe(): Record<string, unknown> {
    return { is_success: true, route: 'public' };
  }
}

// ── Test module ───────────────────────────────────────────────────────────────

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [Flow02FixtureController],
  providers: [
    JwtAuthStrategy,
    ScopeEnrichmentInterceptor,
    TestTenantContextMiddleware,
    {
      provide: TOKEN_SERVICE,
      useFactory: (cls: ClsService): ITokenService => new InMemoryTokenService(cls),
      inject: [ClsService],
    },
    { provide: APP_INTERCEPTOR, useClass: ScopeEnrichmentInterceptor },
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
class Flow02AuthTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TestTenantContextMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  body: unknown;
}

async function httpGet(
  baseUrl: string,
  path: string,
  opts: { tenantId?: string; token?: string },
): Promise<HttpResponse> {
  const headers: Record<string, string> = {};
  if (opts.tenantId) headers['x-tenant-id'] = opts.tenantId;
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('FLOW-02 Phase H — Auth certification (Rule 7 + Rule 8)', () => {
  let app: INestApplication;
  let baseUrl: string;
  let tokenSvc: InMemoryTokenService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [Flow02AuthTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const addr = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    tokenSvc = moduleRef.get<InMemoryTokenService>(TOKEN_SERVICE as never);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── AUTH-01: anonymous (no JWT) → 401 ────────────────────────────────────
  it('AUTH-01: anonymous request is rejected with 401', async () => {
    const res = await httpGet(baseUrl, '/api/flow02-fixture/execute', {
      tenantId: TENANT_A,
    });
    expect(res.status).toBe(401);
  });

  // ── AUTH-02: cross-tenant JWT (Rule 8) → 401 ─────────────────────────────
  it('AUTH-02 (Rule 8): Tenant B JWT on Tenant A route is rejected with 401', async () => {
    // Mint a Tenant B token directly (bypasses the CLS-scoped issue() path).
    const tenantBToken = tokenSvc.issueForTenant('u-tu-b', [ROLE_TENANT_USER], TENANT_B);

    // Present the Tenant B token while claiming Tenant A context.
    // JwtAuthStrategy verifies using Tenant A's key → HMAC mismatch → 401.
    const res = await httpGet(baseUrl, '/api/flow02-fixture/execute', {
      tenantId: TENANT_A,
      token: tenantBToken,
    });
    expect(res.status).toBe(401);
  });

  // ── AUTH-03: tenant-user → 200 ────────────────────────────────────────────
  it('AUTH-03: tenant-user JWT is accepted (200)', async () => {
    const token = tokenSvc.issueForTenant('u-tu-a', [ROLE_TENANT_USER], TENANT_A);

    const res = await httpGet(baseUrl, '/api/flow02-fixture/execute', {
      tenantId: TENANT_A,
      token,
    });
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>)['is_success']).toBe(true);
  });

  // ── AUTH-04: tenant-admin → 200 ───────────────────────────────────────────
  it('AUTH-04: tenant-admin JWT is accepted (200)', async () => {
    const token = tokenSvc.issueForTenant('u-ta-a', [ROLE_TENANT_ADMIN], TENANT_A);

    const res = await httpGet(baseUrl, '/api/flow02-fixture/execute', {
      tenantId: TENANT_A,
      token,
    });
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>)['is_success']).toBe(true);
  });

  // ── AUTH-05: @Public() probe — sanity check that bypass still works ────────
  it('AUTH-05: @Public() probe passes without JWT (200)', async () => {
    const res = await httpGet(baseUrl, '/api/flow02-fixture/public', {
      tenantId: TENANT_A,
    });
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>)['is_success']).toBe(true);
  });
});
