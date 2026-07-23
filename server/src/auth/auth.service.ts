/**
 * AuthService — FLOW-01 Phase A1.
 *
 * Orchestrates credential validation + token issuance using the Auth Fabric
 * providers shipped in Phase A0.5.
 *
 * V-02 requirement: extends MicroserviceBase (DNA-4).
 *
 * Fabric First (Rule 1): never touches jsonwebtoken or bcryptjs directly —
 * delegates to TOKEN_SERVICE + PASSWORD_HASHER_SERVICE + DATABASE_SERVICE.
 *
 * DNA-5: reads tenantId from CLS (TenantContext), never as a parameter.
 *
 * DNA-3: never throws for business conditions — always returns DataProcessResult.
 *
 * A1 role resolution (placeholder until A2 UserRolesService lands):
 *   - If user record has `roles: string[]`, use that verbatim.
 *   - Otherwise default to `['tenant-user']`.
 *   A2 swaps the placeholder for UserRolesService.resolveRolesForUser(userId).
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className AuthService
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../kernel/microservice-base';
import { TenantContext, TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import {
  DATABASE_SERVICE,
  IDatabaseService,
} from '../fabrics/interfaces/database.interface';
import {
  TOKEN_SERVICE,
  ITokenService,
  TokenIssueResult,
} from '../fabrics/interfaces/token.service.interface';
import {
  PASSWORD_HASHER_SERVICE,
  IPasswordHasherService,
} from '../fabrics/interfaces/password-hasher.service.interface';
import { DEFAULT_ROLE } from '../kernel/role-strings';
import { AuthenticatedUser, LoginResponseDto } from './auth.dto';
import { UserRolesService } from './user-roles.service';

/** Elasticsearch index holding verified + unverified user registrations (FLOW-01). */
export const USERS_INDEX = 'xiigen-user-registrations';

@Injectable()
export class AuthService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly database: IDatabaseService,
    @Inject(TOKEN_SERVICE) private readonly tokens: ITokenService,
    @Inject(PASSWORD_HASHER_SERVICE) private readonly hasher: IPasswordHasherService,
    private readonly userRoles: UserRolesService,
    private readonly cls: ClsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'auth.service',
        serviceName: 'AuthService',
        flowId: 'FLOW-01',
      }),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  // ── validateCredentials ────────────────────────────────────────────────────

  /**
   * Look up user by email + verify hashed password.
   *
   * Failure codes:
   *   - NO_TENANT            — CLS has no tenant context
   *   - INVALID_CREDENTIALS  — email not found OR password mismatch OR account unverified
   *                            (uniform shape — never leak which condition failed)
   *   - DB_ERROR             — database lookup errored
   *
   * Iron rule: never returns the credentials_hash — it stays inside this method.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<DataProcessResult<AuthenticatedUser>> {
    if (typeof email !== 'string' || email.length === 0) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }
    if (typeof password !== 'string' || password.length === 0) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return DataProcessResult.failure(
        tenantResult.errorCode ?? 'NO_TENANT',
        tenantResult.errorMessage ?? 'tenant unavailable',
      );
    }
    const tenantId = tenantResult.data;

    const searchResult = await this.database.searchDocuments(USERS_INDEX, { email });
    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        'DB_ERROR',
        searchResult.errorMessage ?? 'user lookup failed',
      );
    }

    const records = searchResult.data ?? [];
    if (records.length === 0) {
      // Uniform VALIDATION_FAILURE-style shape (FLOW-01-RAG-03) — no field-level info.
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const record = records[0]!;
    const recordTenant = record['tenant_id'];
    if (recordTenant !== tenantId) {
      // Cross-tenant guard — V-16 insurance layer. Never reveal to caller.
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const status = record['status'];
    if (status !== 'verified') {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const hashed = record['credentials_hash'];
    if (typeof hashed !== 'string' || hashed.length === 0) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const compareResult = await this.hasher.compare(password, hashed);
    if (!compareResult.isSuccess || !compareResult.data) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }
    if (!compareResult.data.matches) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    const userId = record['user_id'];
    if (typeof userId !== 'string' || userId.length === 0) {
      return DataProcessResult.failure('INVALID_CREDENTIALS', 'credentials rejected');
    }

    // Phase A2 (V-03): resolve full role set via UserRolesService — merges
    // tenant-scoped roles (from the user record) with any platform-scoped
    // elevated privileges (xiigen-platform-roles index). Falls back to the
    // default role string if the lookup fails for any reason so an auth
    // path is never broken by a transient platform-index outage.
    const rolesResult = await this.userRoles.resolveRolesForUser(userId);
    const roles = rolesResult.isSuccess && rolesResult.data && rolesResult.data.length > 0
      ? rolesResult.data
      : [DEFAULT_ROLE];

    const authenticated: AuthenticatedUser = {
      userId,
      email,
      tenantId,
      roles,
    };
    return DataProcessResult.success(authenticated);
  }

  // ── login ──────────────────────────────────────────────────────────────────

  /**
   * Full login flow: validateCredentials + issue fresh token. Never throws.
   */
  async login(email: string, password: string): Promise<DataProcessResult<LoginResponseDto>> {
    const userResult = await this.validateCredentials(email, password);
    if (!userResult.isSuccess || !userResult.data) {
      return DataProcessResult.failure(
        userResult.errorCode ?? 'INVALID_CREDENTIALS',
        userResult.errorMessage ?? 'credentials rejected',
      );
    }
    const user = userResult.data;

    const tokenResult = await this.tokens.issue(user.userId, { roles: user.roles });
    if (!tokenResult.isSuccess || !tokenResult.data) {
      return DataProcessResult.failure(
        tokenResult.errorCode ?? 'TOKEN_SIGN_FAILED',
        tokenResult.errorMessage ?? 'failed to issue token',
      );
    }
    const issued: TokenIssueResult = tokenResult.data;

    return DataProcessResult.success({
      token: issued.token,
      expiresAt: issued.expiresAt,
      jti: issued.jti,
      userId: user.userId,
      roles: user.roles,
    });
  }

  // ── refresh ────────────────────────────────────────────────────────────────

  /**
   * Re-issue a fresh token from an old (still valid) one. Delegates to
   * ITokenService.refresh which verifies + re-signs inside the fabric.
   */
  async refresh(token: string): Promise<DataProcessResult<LoginResponseDto>> {
    if (typeof token !== 'string' || token.length === 0) {
      return DataProcessResult.failure('INVALID_TOKEN', 'token cannot be empty');
    }

    // Verify the incoming token first so we recover sub + roles for the response payload.
    const verifyResult = await this.tokens.verify(token);
    if (!verifyResult.isSuccess || !verifyResult.data) {
      return DataProcessResult.failure(
        verifyResult.errorCode ?? 'TOKEN_INVALID',
        verifyResult.errorMessage ?? 'token verification failed',
      );
    }
    const verified = verifyResult.data;

    const refreshResult = await this.tokens.refresh(token);
    if (!refreshResult.isSuccess || !refreshResult.data) {
      return DataProcessResult.failure(
        refreshResult.errorCode ?? 'TOKEN_REFRESH_FAILED',
        refreshResult.errorMessage ?? 'token refresh failed',
      );
    }
    const issued = refreshResult.data;

    return DataProcessResult.success({
      token: issued.token,
      expiresAt: issued.expiresAt,
      jti: issued.jti,
      userId: verified.subject,
      roles: verified.roles,
    });
  }

  // ── health check ───────────────────────────────────────────────────────────

  async checkHealth(): Promise<DataProcessResult<Record<string, unknown>>> {
    const [tokensHealth, hasherHealth] = await Promise.all([
      this.tokens.healthCheck(),
      this.hasher.healthCheck(),
    ]);
    return DataProcessResult.success({
      service: 'AuthService',
      tokens_healthy: tokensHealth.isSuccess && tokensHealth.data === true,
      hasher_healthy: hasherHealth.isSuccess && hasherHealth.data === true,
    });
  }
}
