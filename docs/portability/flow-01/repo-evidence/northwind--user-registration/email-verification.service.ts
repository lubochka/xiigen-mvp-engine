/**
 * EmailVerificationService (T48) — FLOW-01 Phase A
 * Nodes A4/A5: Token dispatch → Token validation; X1/X2/X3: Resend path
 *
 * Iron rules:
 *   CF-3:            Rate limit window from FREEDOM config (flow01_resend_rate_limit_minutes).
 *                    Enforcement rule is MACHINE; window duration is FREEDOM.
 *   D-01-1:          Expiry callback via ISchedulerService — NEVER via enqueue() directly.
 *   FLOW-01-RAG-02:  Token stored as sha256 hash — raw token appears ONLY in VerificationEmailRequested.
 *   FLOW-01-RAG-04:  Superseded token: status → 'superseded', never deleted.
 *   DNA-8:           storeDocument() BEFORE VerificationEmailRequested emit.
 *   DNA-3:           All methods return DataProcessResult<T>, never throw.
 *   DNA-5 (V-10):    tenantId is read from CLS via TenantContext — never accepted as
 *                    a method parameter. Callers MUST wrap their invocation inside
 *                    `cls.run({ TENANT_CONTEXT_KEY: { tenantId, ... } }, () => ...)`.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { createHash, randomBytes } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import {
  ISchedulerService,
  SCHEDULER_SERVICE,
} from '../../../fabrics/interfaces/scheduler.interface';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../../../freedom/config-schema';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
} from '../../../kernel/multi-tenant/tenant-context';

const VERIFICATION_TOKENS_INDEX = 'xiigen-verification-tokens';
const RESEND_ATTEMPTS_INDEX = 'xiigen-resend-attempts';

const DEFAULT_RESEND_LIMIT_MINUTES = 60;
/**
 * Token expiry fallback. Runtime value comes from FREEDOM key
 * `flow01_email_verification_ttl_seconds` (GAP-09) — see getTokenExpiryMs() below.
 * This constant is the backstop when FreedomConfigService is not injected.
 */
const DEFAULT_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface InitiateVerificationInput {
  memberId: string;
  email: string;
}

export interface VerifyTokenInput {
  memberId: string;
  rawToken: string;
}

export interface ResendVerificationInput {
  memberId: string;
  email: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className EmailVerificationService
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(SCHEDULER_SERVICE) private readonly scheduler: ISchedulerService,
    private readonly cls: ClsService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {}

  /**
   * Read the active tenantId from CLS (DNA-5). Returns NO_TENANT failure when
   * the caller forgot to wrap the invocation in `cls.run(...)` or middleware
   * never set TenantContext.
   */
  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant || typeof tenant.tenantId !== 'string' || tenant.tenantId.length === 0) {
        return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  /**
   * Issue a verification token and schedule expiry (called on AccountCreated).
   * D-01-1: Expiry scheduled via ISchedulerService — not via enqueue().
   */
  async initiateVerification(
    input: InitiateVerificationInput,
  ): Promise<DataProcessResult<{ jobId: string }>> {
    try {
      if (!input.memberId || !input.email) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'memberId and email are required',
        );
      }
      const tenantResult = this.getTenantId();
      if (!tenantResult.isSuccess || !tenantResult.data) {
        return DataProcessResult.failure(
          tenantResult.errorCode ?? 'NO_TENANT',
          tenantResult.errorMessage ?? 'tenant unavailable',
        );
      }
      return this.issueNewToken(input.memberId, input.email, tenantResult.data);
    } catch (err) {
      return DataProcessResult.failure(
        'VERIFICATION_ERROR',
        `initiateVerification threw: ${String(err)}`,
      );
    }
  }

  /**
   * Validate a raw token submitted by the user (called on VerificationLinkClicked).
   * EV-5: Token marked 'used' on EVERY submission — even if already expired.
   */
  async verifyToken(input: VerifyTokenInput): Promise<DataProcessResult<{ verified: boolean }>> {
    try {
      if (!input.memberId || !input.rawToken) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'memberId and rawToken are required',
        );
      }

      const tenantResult = this.getTenantId();
      if (!tenantResult.isSuccess || !tenantResult.data) {
        return DataProcessResult.failure(
          tenantResult.errorCode ?? 'NO_TENANT',
          tenantResult.errorMessage ?? 'tenant unavailable',
        );
      }
      const tenantId = tenantResult.data;

      const tokenHash = createHash('sha256').update(input.rawToken).digest('hex');

      const found = await this.db.searchDocuments(VERIFICATION_TOKENS_INDEX, {
        member_id: input.memberId,
        token_hash: tokenHash,
      });

      if (!found.isSuccess || (found.data ?? []).length === 0) {
        return DataProcessResult.failure('INVALID_TOKEN', 'Token not found');
      }

      const tokenRecord = found.data![0] as Record<string, unknown>;
      const priorStatus = tokenRecord['status'] as string;
      const expiresAt = new Date(tokenRecord['expires_at'] as string).getTime();

      // EV-5: Mark as 'used' on every submission — regardless of validity or expiry
      const updatedRecord: Record<string, unknown> = {
        ...tokenRecord,
        status: 'used',
        used_at: new Date().toISOString(),
      };
      // DNA-8: update record BEFORE any VerificationCompleted emit
      await this.db.storeDocument(
        VERIFICATION_TOKENS_INDEX,
        updatedRecord,
        tokenRecord['token_id'] as string,
      );

      // Reject if already used
      if (priorStatus === 'used') {
        return DataProcessResult.failure('USED_TOKEN', 'Token already used');
      }

      // Reject if superseded
      if (priorStatus === 'superseded') {
        return DataProcessResult.failure('INVALID_TOKEN', 'Token has been superseded');
      }

      // Reject if expired (EV-1: distinct error code)
      if (Date.now() > expiresAt || priorStatus === 'expired') {
        return DataProcessResult.failure('EXPIRED_TOKEN', 'Token has expired');
      }

      // Emit VerificationCompleted only after all checks pass
      await this.queue.enqueue('VerificationCompleted', {
        memberId: input.memberId,
        tenantId,
        verifiedAt: new Date().toISOString(),
      });

      return DataProcessResult.success({ verified: true });
    } catch (err) {
      return DataProcessResult.failure('VERIFICATION_ERROR', `verifyToken threw: ${String(err)}`);
    }
  }

  /**
   * Resend verification — rate limited, supersedes old token (FLOW-01-RAG-04 + CF-3).
   * EV-6: old token marked 'superseded' BEFORE new token created.
   * EV-7: rate limit window from FREEDOM config — not hardcoded.
   * EV-8: rate limit counter key is compound: tenantId + memberId.
   */
  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<DataProcessResult<{ jobId: string }>> {
    try {
      if (!input.memberId || !input.email) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'memberId and email are required',
        );
      }

      const tenantResult = this.getTenantId();
      if (!tenantResult.isSuccess || !tenantResult.data) {
        return DataProcessResult.failure(
          tenantResult.errorCode ?? 'NO_TENANT',
          tenantResult.errorMessage ?? 'tenant unavailable',
        );
      }
      const tenantId = tenantResult.data;

      // CF-3: Rate limit window from FREEDOM config — not hardcoded (FLOW-01-RAG-05)
      const limitMinutes = await this.getResendLimitMinutes();
      const windowStart = new Date(Date.now() - limitMinutes * 60 * 1000).toISOString();

      // EV-8: compound rate limit key — tenant_id + member_id
      const recentAttempts = await this.db.searchDocuments(RESEND_ATTEMPTS_INDEX, {
        tenant_id: tenantId,
        member_id: input.memberId,
        created_after: windowStart,
      });
      if (recentAttempts.isSuccess && (recentAttempts.data ?? []).length > 0) {
        return DataProcessResult.failure(
          'RATE_LIMIT_EXCEEDED',
          `ResendVerificationRequested rate limited — retry after ${limitMinutes} minutes`,
        );
      }

      // Record the resend attempt — DNA-8: store before any downstream op
      const attemptId = `resend-${input.memberId}-${Date.now()}`;
      await this.db.storeDocument(
        RESEND_ATTEMPTS_INDEX,
        {
          attempt_id: attemptId,
          member_id: input.memberId,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          connection_type: 'FLOW_SCOPED',
          knowledge_scope: 'PRIVATE',
        },
        attemptId,
      );

      // EV-6: Supersede previous active tokens BEFORE issuing new one (FLOW-01-RAG-04)
      await this.supersedePreviousTokens(input.memberId);

      return this.issueNewToken(input.memberId, input.email, tenantId);
    } catch (err) {
      return DataProcessResult.failure(
        'VERIFICATION_ERROR',
        `resendVerification threw: ${String(err)}`,
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async issueNewToken(
    memberId: string,
    email: string,
    tenantId: string,
  ): Promise<DataProcessResult<{ jobId: string }>> {
    // FLOW-01-RAG-02: raw token generated, stored ONLY as hash
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const tokenId = `tok-${tokenHash.slice(0, 12)}-${Date.now()}`;
    const tokenExpiryMs = await this.getTokenExpiryMs();
    const expiresAt = new Date(Date.now() + tokenExpiryMs).toISOString();

    const tokenRecord: Record<string, unknown> = {
      token_id: tokenId,
      member_id: memberId,
      token_hash: tokenHash, // FLOW-01-RAG-02: hash only — raw token never stored
      status: 'active',
      expires_at: expiresAt,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      connection_type: 'FLOW_SCOPED',
      knowledge_scope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE VerificationEmailRequested emit (EV-3)
    const stored = await this.db.storeDocument(VERIFICATION_TOKENS_INDEX, tokenRecord, tokenId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
    }

    // Emit VerificationEmailRequested — raw token in event body only (FLOW-01-RAG-02)
    await this.queue.enqueue('VerificationEmailRequested', {
      memberId,
      email,
      rawToken, // ← raw token goes to email service only; never persisted
      tenantId,
    });

    // D-01-1: Schedule expiry via ISchedulerService — NOT via enqueue() directly
    const scheduled = await this.scheduler.scheduleDelayed(
      'token-expiry',
      tokenExpiryMs,
      { tokenId, memberId, tenantId },
      `token-expiry-${tokenId}`,
    );

    const jobId = scheduled.jobId ?? `fallback-${tokenId}`;

    return DataProcessResult.success({ jobId });
  }

  private async supersedePreviousTokens(memberId: string): Promise<void> {
    const activeTokens = await this.db.searchDocuments(VERIFICATION_TOKENS_INDEX, {
      member_id: memberId,
      status: 'active',
    });
    if (!activeTokens.isSuccess || (activeTokens.data ?? []).length === 0) return;

    for (const token of activeTokens.data!) {
      const rec = token as Record<string, unknown>;
      await this.db.storeDocument(
        VERIFICATION_TOKENS_INDEX,
        { ...rec, status: 'superseded', superseded_at: new Date().toISOString() },
        rec['token_id'] as string,
      );
    }
  }

  private async getResendLimitMinutes(): Promise<number> {
    if (!this.freedomConfig) return DEFAULT_RESEND_LIMIT_MINUTES;
    const doc = await this.freedomConfig.get(XIIGEN_FREEDOM_KEYS.FLOW01_RESEND_RATE_LIMIT_MINUTES);
    return (doc?.['value'] as number) ?? DEFAULT_RESEND_LIMIT_MINUTES;
  }

  /**
   * GAP-09 (Fix Plan v4.9 Tier 2 A78) — token-expiry TTL from FREEDOM config.
   * Reads `flow01_email_verification_ttl_seconds` and converts to ms. Falls back
   * to 24h default when FreedomConfigService not injected or key unset.
   */
  private async getTokenExpiryMs(): Promise<number> {
    if (!this.freedomConfig) return DEFAULT_TOKEN_EXPIRY_MS;
    const doc = await this.freedomConfig.get(
      XIIGEN_FREEDOM_KEYS.FLOW01_EMAIL_VERIFICATION_TTL_SECONDS,
    );
    const seconds = (doc?.['value'] as number) ?? DEFAULT_TOKEN_EXPIRY_MS / 1000;
    return seconds * 1000;
  }
}
