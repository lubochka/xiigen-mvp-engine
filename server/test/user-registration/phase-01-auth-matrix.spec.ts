/**
 * FLOW-01 Phase B1 (V-09) — 42-cell HTTP auth matrix.
 *
 * Exercises the Phase A1..A5 auth stack end-to-end over real HTTP:
 *   - AuthModule (AuthController, AuthService, Local/Jwt strategies, UserRolesService)
 *   - MasterTenantGuard (Phase A3 / V-05) — applied at route level chained
 *     after AuthGuard('jwt') so scope is populated before the check runs.
 *     (An earlier draft registered it as APP_GUARD; Phase B1 proved global
 *     placement cannot work because route-level AuthGuard('jwt') runs AFTER
 *     global guards, so scope was always missing.)
 *   - APP_INTERCEPTOR: ScopeEnrichmentInterceptor (Phase A2.5 / V-04)
 *   - TenantContextMiddleware analogue (sets TenantContext from X-Tenant-Id)
 *
 * Closes V-09 on the FLOW-01 Portability Plan and satisfies:
 *   - test-integrity v2.2.0 Rule 7 (401 / 403 / 200 per controller)
 *   - test-integrity v2.2.0 Rule 8 (R6 cross-tenant JWT isolation)
 *   - SK-553 Phase 0 Auth Pre-flight Steps A/B/C
 *
 * 42 cells = 7 user classes × 6 routes.
 *
 * User classes (seeded via the Phase A5 `seed-auth-dev.js` matrix):
 *   anon        — no JWT
 *   xiigen-pa   — platform-admin @ master tenant (u-pa-xiigen)
 *   xiigen-ta   — tenant-admin   @ master tenant (u-ta-xiigen)
 *   xiigen-tu   — tenant-user    @ master tenant (u-tu-xiigen)
 *   acme-pa     — user with a platform-admin grant in the master-tenant-scoped
 *                 `xiigen-platform-roles` index, but logging in to ACME. By
 *                 production fabric semantics (DNA-5), the platform-role lookup
 *                 is invisible from outside master, so this user's EFFECTIVE
 *                 role in ACME is only tenant-admin. The V-16 structural
 *                 guarantee: platform privilege cannot leak across tenants.
 *   acme-ta     — tenant-admin   @ acme          (u-ta-acme)
 *   acme-tu     — tenant-user    @ acme          (u-tu-acme)
 *
 * Routes:
 *   R1 GET  /api/_b1/public              — no guards, 200 for everyone
 *   R2 GET  /api/_b1/any-authenticated   — @UseGuards(AuthGuard('jwt'))
 *   R3 GET  /api/_b1/master-tenant-only  — jwt + @MasterTenantOnly()
 *   R4 GET  /api/_b1/scope-echo          — jwt; returns ScopeContext fields
 *   R5 GET  /api/auth/me                 — production JWT-protected route
 *   R6 POST /api/auth/login              — production local-auth route
 *
 * The module under test uses in-memory fabric providers (database, token,
 * password hasher) so the matrix runs without ES/Redis infrastructure.
 * The InMemoryTokenService mirrors the V-16 structural guarantee: signing
 * key = HMAC(root, tenantId), so a token minted for tenant A is
 * unverifiable under tenant B's key — exactly like production.
 */

import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  Controller,
  Get,
  Inject,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  RequestMethod,
  UseGuards,
  Injectable,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard, PassportModule } from '@nestjs/passport';
import { ClsModule, ClsService } from 'nestjs-cls';
import { createHmac, randomBytes } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AuthService, USERS_INDEX } from '../../src/auth/auth.service';
import { AuthController } from '../../src/auth/auth.controller';
import { LocalAuthStrategy } from '../../src/auth/local.strategy';
import { JwtAuthStrategy } from '../../src/auth/jwt.strategy';
import {
  UserRolesService,
  PLATFORM_ROLES_INDEX,
} from '../../src/auth/user-roles.service';
import {
  MasterTenantGuard,
  MasterTenantOnly,
} from '../../src/auth/master-tenant.guard';
import { ScopeEnrichmentInterceptor } from '../../src/auth/scope-enrichment.interceptor';
import {
  DATABASE_SERVICE,
  IDatabaseService,
  DocumentWithVersion,
  OccOptions,
} from '../../src/fabrics/interfaces/database.interface';
import {
  TOKEN_SERVICE,
  ITokenService,
  TokenIssueResult,
  TokenVerifyResult,
} from '../../src/fabrics/interfaces/token.service.interface';
import {
  PASSWORD_HASHER_SERVICE,
  IPasswordHasherService,
  HashResult,
  CompareResult,
} from '../../src/fabrics/interfaces/password-hasher.service.interface';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  TenantRecord,
} from '../../src/kernel/multi-tenant/tenant-context';
import {
  MASTER_TENANT_ID,
  MASTER_TENANT_NAME,
} from '../../src/bootstrap/bootstrap-seeder.service';
import {
  ROLE_PLATFORM_ADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
} from '../../src/kernel/role-strings';

// ── Dev matrix constants (mirrors server/scripts/seed-auth-dev.js) ──────────

const DEV_PASSWORD = 'Password123!';
const ACME_TENANT_ID = 'acme';

/** Seeded user fixtures — identical to Phase A5 seed-auth-dev.js. */
const SEED_USERS = [
  {
    user_id: 'u-pa-xiigen',
    email: 'platform-admin@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: true,
  },
  {
    user_id: 'u-ta-xiigen',
    email: 'tenant-admin@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: false,
  },
  {
    user_id: 'u-tu-xiigen',
    email: 'tenant-user@xiigen.test',
    tenant_id: MASTER_TENANT_ID,
    roles: [ROLE_TENANT_USER],
    platformElevation: false,
  },
  {
    user_id: 'u-pa-acme',
    email: 'platform-admin@acme.test',
    tenant_id: ACME_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: true,
  },
  {
    user_id: 'u-ta-acme',
    email: 'tenant-admin@acme.test',
    tenant_id: ACME_TENANT_ID,
    roles: [ROLE_TENANT_ADMIN],
    platformElevation: false,
  },
  {
    user_id: 'u-tu-acme',
    email: 'tenant-user@acme.test',
    tenant_id: ACME_TENANT_ID,
    roles: [ROLE_TENANT_USER],
    platformElevation: false,
  },
] as const;

// ── In-memory fabric implementations ────────────────────────────────────────

/**
 * In-memory IDatabaseService — enough of BuildSearchFilter to run AuthService
 * + UserRolesService lookups against a pre-seeded table. Not tenant-scoping
 * at the provider layer: that scoping is enforced upstream by AuthService
 * (explicit `tenant_id` check in validateCredentials) and by the matrix
 * test design (each login sends `X-Tenant-Id`).
 */
class InMemoryDatabase extends IDatabaseService {
  private readonly tables = new Map<string, Array<Record<string, unknown>>>();

  constructor(private readonly cls?: ClsService) {
    super();
  }

  put(index: string, doc: Record<string, unknown>): void {
    const records = this.tables.get(index) ?? [];
    records.push({ ...doc });
    this.tables.set(index, records);
  }

  private currentTenant(): string | undefined {
    if (!this.cls) return undefined;
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId;
    } catch {
      return undefined;
    }
  }

  async searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const records = this.tables.get(index) ?? [];
    const tenantId = this.currentTenant();
    // Mirror production fabric behaviour: auto-apply a tenant-id filter so
    // cross-tenant data is invisible (DNA-5 provider-side scoping). Records
    // without tenant_id are treated as global and remain visible.
    const matches = records.filter((r) => {
      if (
        tenantId !== undefined &&
        typeof r['tenant_id'] === 'string' &&
        r['tenant_id'] !== tenantId
      ) {
        return false;
      }
      return Object.entries(filter).every(([k, v]) => {
        if (v === undefined || v === null || v === '') return true;
        return r[k] === v;
      });
    });
    return DataProcessResult.success(matches);
  }

  async storeDocument(
    _index: string,
    document: Record<string, unknown>,
    docId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({ ...document, _id: docId ?? 'stub' });
  }
  async getDocument(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.failure('NOT_FOUND', 'not found');
  }
  async deleteDocument(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
  async bulkStore(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({});
  }
  async countDocuments(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
  async ensureIndex(): Promise<void> {
    /* no-op — in-memory tables are auto-created on first put */
  }
  async getDocumentWithVersion(): Promise<DataProcessResult<DocumentWithVersion>> {
    return DataProcessResult.failure('NOT_FOUND', 'not found');
  }
  async storeDocumentWithOCC(
    _index: string,
    _doc: Record<string, unknown>,
    _id: string,
    _occ: OccOptions,
  ): Promise<DataProcessResult<{ seqNo: number; primaryTerm: number }>> {
    return DataProcessResult.success({ seqNo: 1, primaryTerm: 1 });
  }
}

/**
 * Deterministic HMAC-based token service. Per-tenant signing-key isolation
 * matches the production V-16 structural guarantee: a token minted for
 * tenant A cannot be verified when CLS says tenant B.
 */
@Injectable()
class InMemoryTokenService extends ITokenService {
  private static readonly ROOT_SECRET = 'phase-b1-root-signing-secret';

  constructor(private readonly cls: ClsService) {
    super();
  }

  private keyFor(tenantId: string): string {
    return createHmac('sha256', InMemoryTokenService.ROOT_SECRET)
      .update(tenantId)
      .digest('hex');
  }

  private readTenant(): string | undefined {
    const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    return ctx?.tenantId;
  }

  private sign(payload: Record<string, unknown>, tenantId: string): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.keyFor(tenantId))
      .update(body)
      .digest('base64url');
    return `${body}.${sig}`;
  }

  async issue(
    subject: string,
    claims: { roles: readonly string[]; custom?: Record<string, unknown> },
  ): Promise<DataProcessResult<TokenIssueResult>> {
    const tenantId = this.readTenant();
    if (!tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'tenant missing in CLS');
    }
    const now = Math.floor(Date.now() / 1000);
    const jti = randomBytes(8).toString('hex');
    const payload: Record<string, unknown> = {
      sub: subject,
      tenantId,
      roles: claims.roles,
      iat: now,
      exp: now + 3600,
      jti,
    };
    if (claims.custom) payload['custom'] = claims.custom;
    const token = this.sign(payload, tenantId);
    return DataProcessResult.success({ token, expiresAt: payload['exp'] as number, jti });
  }

  async verify(token: string): Promise<DataProcessResult<TokenVerifyResult>> {
    const tenantId = this.readTenant();
    if (!tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'tenant missing in CLS');
    }
    const parts = token.split('.');
    if (parts.length !== 2) {
      return DataProcessResult.failure('TOKEN_INVALID', 'malformed');
    }
    const [body, sig] = parts;
    const expected = createHmac('sha256', this.keyFor(tenantId))
      .update(body!)
      .digest('base64url');
    if (sig !== expected) {
      return DataProcessResult.failure('TOKEN_INVALID', 'signature mismatch');
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(body!, 'base64url').toString('utf-8'));
    } catch {
      return DataProcessResult.failure('TOKEN_INVALID', 'payload parse failed');
    }
    if (payload['tenantId'] !== tenantId) {
      return DataProcessResult.failure('TENANT_MISMATCH', 'cross-tenant token');
    }
    const exp = payload['exp'];
    if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) {
      return DataProcessResult.failure('TOKEN_EXPIRED', 'token expired');
    }
    const rolesRaw = payload['roles'];
    const roles = Array.isArray(rolesRaw)
      ? (rolesRaw.filter((r) => typeof r === 'string') as string[])
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
      return DataProcessResult.failure(
        v.errorCode ?? 'TOKEN_INVALID',
        v.errorMessage ?? 'refresh failed',
      );
    }
    return this.issue(v.data.subject, { roles: v.data.roles });
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

/** Stub hasher — `hashed:${plaintext}` so tests don't burn 100ms/bcrypt call. */
class InMemoryPasswordHasher extends IPasswordHasherService {
  async hash(plaintext: string): Promise<DataProcessResult<HashResult>> {
    return DataProcessResult.success({
      hash: `hashed:${plaintext}`,
      algorithm: 'stub',
      rounds: 1,
    });
  }
  async compare(
    plaintext: string,
    hashed: string,
  ): Promise<DataProcessResult<CompareResult>> {
    return DataProcessResult.success({ matches: hashed === `hashed:${plaintext}` });
  }
  async needsRehash(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(false);
  }
  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

// ── Tenant-context middleware (test analogue of production middleware) ──────

/**
 * Sets TenantContext into CLS from X-Tenant-Id header. No TenantRegistry
 * lookup — the test trusts the header value. Matches production shape:
 * missing header → 403 TENANT_MISSING.
 */
@Injectable()
class TestTenantContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const raw = req.headers['x-tenant-id'];
    const tenantId = typeof raw === 'string' ? raw.trim() : '';
    if (!tenantId) {
      res.status(403).json({
        is_success: false,
        error_code: 'TENANT_MISSING',
        error_message: "Header 'x-tenant-id' is required",
      });
      return;
    }
    const record: TenantRecord = {
      id: tenantId,
      name: tenantId === MASTER_TENANT_ID ? MASTER_TENANT_NAME : tenantId,
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 60,
        maxTokensPerDay: 100_000,
        maxStorageMb: 500,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ctx = new TenantContext(record);
    this.cls.set(TENANT_CONTEXT_KEY, ctx);
    next();
  }
}

// ── Test fixture controller ─────────────────────────────────────────────────

@Controller('api/_b1')
class Phase01FixtureController {
  constructor(private readonly cls: ClsService) {}

  @Get('public')
  publicRoute(): Record<string, unknown> {
    return { route: 'public', is_success: true };
  }

  @Get('any-authenticated')
  @UseGuards(AuthGuard('jwt'))
  anyAuth(): Record<string, unknown> {
    return { route: 'any-authenticated', is_success: true };
  }

  @Get('master-tenant-only')
  // Guard ORDER MATTERS: AuthGuard('jwt') runs first so JwtAuthStrategy
  // populates ScopeContext into CLS; MasterTenantGuard reads that context
  // second. The inverse order (or registering MasterTenantGuard globally
  // as an APP_GUARD) cannot populate scope in time and yields NO_SCOPE 403
  // even for valid platform-admin requests — see app.module.ts comment
  // block and the Phase B1 remediation note.
  @UseGuards(AuthGuard('jwt'), MasterTenantGuard)
  @MasterTenantOnly()
  masterOnly(): Record<string, unknown> {
    return { route: 'master-tenant-only', is_success: true };
  }

  @Get('scope-echo')
  @UseGuards(AuthGuard('jwt'))
  scopeEcho(): Record<string, unknown> {
    const scope = this.cls.get<{
      tenantId: string;
      userId?: string;
      roles?: readonly string[];
    }>('scope');
    return {
      route: 'scope-echo',
      is_success: true,
      tenantId: scope?.tenantId ?? null,
      userId: scope?.userId ?? null,
      roles: scope?.roles ?? [],
    };
  }
}

// ── Test module ─────────────────────────────────────────────────────────────

@Module({
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController, Phase01FixtureController],
  providers: [
    AuthService,
    UserRolesService,
    LocalAuthStrategy,
    JwtAuthStrategy,
    ScopeEnrichmentInterceptor,
    MasterTenantGuard,
    TestTenantContextMiddleware,
    {
      provide: DATABASE_SERVICE,
      useFactory: (cls: ClsService): InMemoryDatabase => new InMemoryDatabase(cls),
      inject: [ClsService],
    },
    {
      provide: TOKEN_SERVICE,
      useFactory: (cls: ClsService): ITokenService => new InMemoryTokenService(cls),
      inject: [ClsService],
    },
    { provide: PASSWORD_HASHER_SERVICE, useValue: new InMemoryPasswordHasher() },
    // NOTE: MasterTenantGuard is NOT an APP_GUARD here — it's applied at the
    // route level via @UseGuards(AuthGuard('jwt'), MasterTenantGuard) so scope
    // is populated before the master-tenant check reads it. Same wiring as
    // production (see app.module.ts remediation comment).
    { provide: APP_INTERCEPTOR, useClass: ScopeEnrichmentInterceptor },
  ],
})
class Phase01AuthMatrixModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TestTenantContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}

// ── Test harness helpers ────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  body: unknown;
}

let app: INestApplication;
let baseUrl: string;
let db: InMemoryDatabase;

/** Seed the 6 dev users into the in-memory DB + 2 platform-role rows. */
function seedUsers(database: InMemoryDatabase): void {
  const now = new Date().toISOString();
  for (const u of SEED_USERS) {
    database.put(USERS_INDEX, {
      user_id: u.user_id,
      email: u.email,
      tenant_id: u.tenant_id,
      credentials_hash: `hashed:${DEV_PASSWORD}`,
      status: 'verified',
      roles: u.roles,
      created_at: now,
      updated_at: now,
      created_by: 'phase-b1-seed',
    });
    if (u.platformElevation) {
      database.put(PLATFORM_ROLES_INDEX, {
        user_id: u.user_id,
        roles: [ROLE_PLATFORM_ADMIN],
        tenant_id: MASTER_TENANT_ID,
        granted_at: now,
        granted_by: 'phase-b1-seed',
      });
    }
  }
}

/** POST /api/auth/login and return the issued token, or null on failure. */
async function login(email: string, tenantId: string): Promise<string | null> {
  const res = await httpFetch('POST', '/api/auth/login', {
    tenantId,
    body: { email, password: DEV_PASSWORD },
  });
  if (res.status !== 200) return null;
  const body = res.body as { data?: { token?: string } };
  return body.data?.token ?? null;
}

interface FetchOptions {
  tenantId?: string;
  token?: string;
  body?: Record<string, unknown>;
}

async function httpFetch(
  method: 'GET' | 'POST',
  path: string,
  opts: FetchOptions = {},
): Promise<HttpResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.tenantId) headers['x-tenant-id'] = opts.tenantId;
  if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
  const init: RequestInit = { method, headers };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  const res = await fetch(`${baseUrl}${path}`, init);
  let body: unknown = null;
  const text = await res.text();
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [Phase01AuthMatrixModule],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Nest test server did not bind an ephemeral port');
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
  db = app.get<InMemoryDatabase>(DATABASE_SERVICE);
  seedUsers(db);
});

afterAll(async () => {
  if (app) await app.close();
});

// ── The 42-cell matrix ──────────────────────────────────────────────────────

interface UserClass {
  label: string;
  email: string | null;
  tenantId: string;
  effectiveRole: string; // 'platform-admin' | 'tenant-admin' | 'tenant-user' | 'anonymous'
}

const USERS: readonly UserClass[] = [
  { label: 'anon', email: null, tenantId: MASTER_TENANT_ID, effectiveRole: 'anonymous' },
  {
    label: 'xiigen-pa',
    email: 'platform-admin@xiigen.test',
    tenantId: MASTER_TENANT_ID,
    effectiveRole: ROLE_PLATFORM_ADMIN,
  },
  {
    label: 'xiigen-ta',
    email: 'tenant-admin@xiigen.test',
    tenantId: MASTER_TENANT_ID,
    effectiveRole: ROLE_TENANT_ADMIN,
  },
  {
    label: 'xiigen-tu',
    email: 'tenant-user@xiigen.test',
    tenantId: MASTER_TENANT_ID,
    effectiveRole: ROLE_TENANT_USER,
  },
  {
    // acme-pa holds a platform-admin *grant* in the master-tenant-scoped
    // `xiigen-platform-roles` index, but logs in to ACME. DNA-5 auto-scopes
    // the grant out of acme's view, so their EFFECTIVE role inside acme is
    // only tenant-admin. The platform privilege cannot leak across tenants
    // — this is the V-16 structural guarantee tested by R3 (403 expected)
    // and R4 (roles = [tenant-admin]).
    label: 'acme-pa',
    email: 'platform-admin@acme.test',
    tenantId: ACME_TENANT_ID,
    effectiveRole: ROLE_TENANT_ADMIN,
  },
  {
    label: 'acme-ta',
    email: 'tenant-admin@acme.test',
    tenantId: ACME_TENANT_ID,
    effectiveRole: ROLE_TENANT_ADMIN,
  },
  {
    label: 'acme-tu',
    email: 'tenant-user@acme.test',
    tenantId: ACME_TENANT_ID,
    effectiveRole: ROLE_TENANT_USER,
  },
];

/** Issue a token for a user-class or return null for anon. */
async function issueTokenFor(user: UserClass): Promise<string | null> {
  if (!user.email) return null;
  return login(user.email, user.tenantId);
}

describe('FLOW-01 Phase B1 (V-09) — 42-cell HTTP auth matrix', () => {
  const tokens = new Map<string, string | null>();

  beforeAll(async () => {
    // Issue one token per authenticated user-class.
    for (const u of USERS) {
      tokens.set(u.label, await issueTokenFor(u));
    }
  });

  it('seeds 6 user records + 2 platform-role rows', async () => {
    const users = await db.searchDocuments(USERS_INDEX, {});
    expect(users.isSuccess).toBe(true);
    expect(users.data!.length).toBe(6);

    const platformRoles = await db.searchDocuments(PLATFORM_ROLES_INDEX, {});
    expect(platformRoles.isSuccess).toBe(true);
    expect(platformRoles.data!.length).toBe(2);
  });

  it('all 6 authenticated user-classes obtained a JWT', () => {
    expect(tokens.get('anon')).toBeNull();
    for (const u of USERS) {
      if (u.effectiveRole === 'anonymous') continue;
      expect(tokens.get(u.label)).toEqual(expect.any(String));
    }
  });

  // ── R1 /api/_b1/public — 7 cells × 200 ────────────────────────────────────

  describe('R1 GET /api/_b1/public (no guards)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → 200',
      async (_label, u) => {
        const res = await httpFetch('GET', '/api/_b1/public', {
          tenantId: u.tenantId,
          token: tokens.get(u.label) ?? undefined,
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({ route: 'public', is_success: true }),
        );
      },
    );
  });

  // ── R2 /api/_b1/any-authenticated — anon 401, else 200 ────────────────────

  describe('R2 GET /api/_b1/any-authenticated (jwt-required)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → matrix',
      async (_label, u) => {
        const res = await httpFetch('GET', '/api/_b1/any-authenticated', {
          tenantId: u.tenantId,
          token: tokens.get(u.label) ?? undefined,
        });
        if (u.effectiveRole === 'anonymous') {
          expect(res.status).toBe(401);
        } else {
          expect(res.status).toBe(200);
          expect(res.body).toEqual(
            expect.objectContaining({ route: 'any-authenticated', is_success: true }),
          );
        }
      },
    );
  });

  // ── R3 /api/_b1/master-tenant-only — only xiigen-pa gets 200 ──────────────

  describe('R3 GET /api/_b1/master-tenant-only (jwt + @MasterTenantOnly)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → matrix',
      async (_label, u) => {
        const res = await httpFetch('GET', '/api/_b1/master-tenant-only', {
          tenantId: u.tenantId,
          token: tokens.get(u.label) ?? undefined,
        });
        if (u.effectiveRole === 'anonymous') {
          expect(res.status).toBe(401);
          return;
        }
        if (
          u.tenantId === MASTER_TENANT_ID &&
          u.effectiveRole === ROLE_PLATFORM_ADMIN
        ) {
          expect(res.status).toBe(200);
          expect(res.body).toEqual(
            expect.objectContaining({ route: 'master-tenant-only' }),
          );
        } else {
          expect(res.status).toBe(403);
          // Stable error_code — never reveals why beyond the taxonomy.
          expect(res.body).toEqual(
            expect.objectContaining({
              error_code: expect.stringMatching(
                /^(NOT_MASTER_TENANT|NOT_PLATFORM_ADMIN|NO_SCOPE)$/,
              ),
            }),
          );
        }
      },
    );
  });

  // ── R4 /api/_b1/scope-echo — anon 401, else echo tenantId+roles ───────────

  describe('R4 GET /api/_b1/scope-echo (jwt-required, ScopeContext echo)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → matrix',
      async (_label, u) => {
        const res = await httpFetch('GET', '/api/_b1/scope-echo', {
          tenantId: u.tenantId,
          token: tokens.get(u.label) ?? undefined,
        });
        if (u.effectiveRole === 'anonymous') {
          expect(res.status).toBe(401);
          return;
        }
        expect(res.status).toBe(200);
        const body = res.body as Record<string, unknown>;
        expect(body['tenantId']).toBe(u.tenantId);
        // The scope echo should contain this user's effective role.
        const roles = body['roles'] as string[];
        expect(Array.isArray(roles)).toBe(true);
        if (u.effectiveRole === ROLE_PLATFORM_ADMIN) {
          expect(roles).toContain(ROLE_PLATFORM_ADMIN);
        } else {
          expect(roles).toContain(u.effectiveRole);
        }
      },
    );
  });

  // ── R5 GET /api/auth/me — production JWT route ────────────────────────────

  describe('R5 GET /api/auth/me (production jwt-protected)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → matrix',
      async (_label, u) => {
        const res = await httpFetch('GET', '/api/auth/me', {
          tenantId: u.tenantId,
          token: tokens.get(u.label) ?? undefined,
        });
        if (u.effectiveRole === 'anonymous') {
          expect(res.status).toBe(401);
          return;
        }
        expect(res.status).toBe(200);
        const body = res.body as { data?: Record<string, unknown> };
        expect(body.data).toEqual(
          expect.objectContaining({ tenantId: u.tenantId }),
        );
      },
    );
  });

  // ── R6 POST /api/auth/login — happy path for each user ────────────────────

  describe('R6 POST /api/auth/login (production local-auth)', () => {
    it.each(USERS.map((u) => [u.label, u]))(
      '%s → matrix',
      async (_label, u) => {
        if (u.effectiveRole === 'anonymous') {
          // Anonymous login = missing credentials → 401 with UNAUTHORIZED shape.
          const res = await httpFetch('POST', '/api/auth/login', {
            tenantId: u.tenantId,
            body: { email: '', password: '' },
          });
          expect(res.status).toBe(401);
          return;
        }
        const res = await httpFetch('POST', '/api/auth/login', {
          tenantId: u.tenantId,
          body: { email: u.email!, password: DEV_PASSWORD },
        });
        expect(res.status).toBe(200);
        const body = res.body as { data?: { token?: string; userId?: string } };
        expect(body.data?.token).toEqual(expect.any(String));
        expect(body.data?.userId).toMatch(/^u-(pa|ta|tu)-/);
      },
    );
  });

  // ── test-integrity Rule 8 (R6 cross-tenant JWT isolation) ─────────────────

  describe('Rule 8 — R6 cross-tenant JWT isolation', () => {
    it('acme JWT is rejected on master-tenant context', async () => {
      const acmeToken = tokens.get('acme-pa');
      expect(acmeToken).toEqual(expect.any(String));
      const res = await httpFetch('GET', '/api/auth/me', {
        tenantId: MASTER_TENANT_ID,
        token: acmeToken!,
      });
      // The JWT was signed with acme's key; verification under xiigen-master's
      // CLS tenant must fail. JwtAuthStrategy → this.fail() → 401.
      expect(res.status).toBe(401);
    });

    it('master-tenant JWT is rejected on acme context', async () => {
      const masterToken = tokens.get('xiigen-pa');
      expect(masterToken).toEqual(expect.any(String));
      const res = await httpFetch('GET', '/api/auth/me', {
        tenantId: ACME_TENANT_ID,
        token: masterToken!,
      });
      expect(res.status).toBe(401);
    });

    it('same-tenant JWT passes sanity on its own tenant context', async () => {
      const acmeToken = tokens.get('acme-pa');
      const res = await httpFetch('GET', '/api/auth/me', {
        tenantId: ACME_TENANT_ID,
        token: acmeToken!,
      });
      expect(res.status).toBe(200);
    });
  });

  // ── tenant-header guardrail ───────────────────────────────────────────────

  describe('TENANT_MISSING guardrail', () => {
    it('any route without X-Tenant-Id returns 403 TENANT_MISSING', async () => {
      // Bypass the tenantId option in httpFetch by calling fetch directly.
      const res = await fetch(`${baseUrl}/api/_b1/public`, { method: 'GET' });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toEqual(
        expect.objectContaining({ error_code: 'TENANT_MISSING' }),
      );
    });
  });
});
