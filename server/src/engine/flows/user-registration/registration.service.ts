/**
 * RegistrationService (T47) — FLOW-01 Phase A
 * Nodes A1/A2/A3: Intake → Email uniqueness → User record creation
 *
 * Iron rules:
 *   CF-1:            Email uniqueness MUST be checked BEFORE user record created.
 *   VALIDATION:      Uniform VALIDATION_FAILURE shape — no field names in error (FLOW-01-RAG-03).
 *   SCHEMA (DR-03):  onboardingMaterials:[] present from creation — downstream nodes read it.
 *   DNA-7:           Idempotency key — same key returns same result, no duplicate record.
 *   DNA-8:           storeDocument() BEFORE AccountCreated emit.
 *   DNA-3:           All methods return DataProcessResult<T>, never throw.
 *   DNA-4 (V-10):    extends MicroserviceBase — 19 architectural components inherited.
 *   DNA-5 (V-10):    tenantId is read from CLS via TenantContext — never accepted as
 *                    a method parameter. Callers MUST wrap their invocation inside
 *                    `cls.run({ TENANT_CONTEXT_KEY: { tenantId, ... } }, () => ...)`.
 *   Rule 1 (V-10):   Fabric First — credentials hashed via IPasswordHasherService
 *                    (bcryptjs rounds=12), never with Node-stdlib `crypto.createHash`.
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className RegistrationService
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import {
  PASSWORD_HASHER_SERVICE,
  IPasswordHasherService,
} from '../../../fabrics/interfaces/password-hasher.service.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant/tenant-context.resolver';

const USER_REGISTRATIONS_INDEX = 'xiigen-user-registrations';

export interface RegisterInput {
  email: string;
  credentials: string;
  inviteCode?: string;
  idempotencyKey?: string;
}

export interface RegisterResult {
  memberId: string;
  accountStatus: 'PENDING_VERIFICATION';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className RegistrationService
 */
@Injectable()
export class RegistrationService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly database: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    @Inject(PASSWORD_HASHER_SERVICE) private readonly hasher: IPasswordHasherService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'registration.service',
        serviceName: 'RegistrationService',
        flowId: 'FLOW-01',
      }),
    });
  }

  /**
   * Read the active tenantId from CLS (DNA-5). Returns NO_TENANT failure when
   * the caller forgot to wrap the invocation in `cls.run(...)` or middleware
   * never set TenantContext.
   */
  private getTenantId(): DataProcessResult<string> {
    return this.tenantContext.getCurrentTenantId();
  }

  async register(input: RegisterInput): Promise<DataProcessResult<RegisterResult>> {
    try {
      // Uniform VALIDATION_FAILURE — same shape regardless of which field failed (FLOW-01-RAG-03)
      if (!input.email || !input.credentials) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Registration input validation failed',
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

      // DNA-7: idempotency — return existing result if same key was previously processed
      if (input.idempotencyKey) {
        const existing = await this.database.searchDocuments(USER_REGISTRATIONS_INDEX, {
          idempotency_key: input.idempotencyKey,
        });
        if (existing.isSuccess && (existing.data ?? []).length > 0) {
          const rec = existing.data![0] as Record<string, unknown>;
          return DataProcessResult.success({
            memberId: rec['user_id'] as string,
            accountStatus: 'PENDING_VERIFICATION',
          });
        }
      }

      // CF-1: Email uniqueness MUST be checked BEFORE any write
      const emailCheck = await this.database.searchDocuments(USER_REGISTRATIONS_INDEX, {
        email: input.email,
      });
      if (emailCheck.isSuccess && (emailCheck.data ?? []).length > 0) {
        return DataProcessResult.failure('DUPLICATE_EMAIL', 'Email already registered');
      }

      // Build user record — schema includes onboardingMaterials:[] (DR-03: downstream reads this)
      const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      // Rule 1 (V-10): hash credentials via IPasswordHasherService (bcryptjs rounds=12)
      const hashResult = await this.hasher.hash(input.credentials);
      if (!hashResult.isSuccess || !hashResult.data) {
        return DataProcessResult.failure(
          hashResult.errorCode ?? 'HASH_FAILED',
          hashResult.errorMessage ?? 'failed to hash credentials',
        );
      }
      const credentialsHash = hashResult.data.hash;

      const doc: Record<string, unknown> = {
        user_id: userId,
        email: input.email,
        credentials_hash: credentialsHash,
        status: 'unverified',
        onboarding_materials: [], // DR-03: present from creation for downstream reads
        invite_code: input.inviteCode ?? '',
        idempotency_key: input.idempotencyKey ?? '',
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE', // MT-1: user data is per-tenant private
      };

      // DNA-8: storeDocument BEFORE AccountCreated emit
      const stored = await this.database.storeDocument(USER_REGISTRATIONS_INDEX, doc, userId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // Emit AccountCreated only after successful persist
      await this.queueService.enqueue('AccountCreated', {
        userId,
        email: input.email,
        tenantId,
        status: 'unverified',
      });

      return DataProcessResult.success({ memberId: userId, accountStatus: 'PENDING_VERIFICATION' });
    } catch (err) {
      return DataProcessResult.failure(
        'REGISTRATION_ERROR',
        `RegistrationService threw: ${String(err)}`,
      );
    }
  }
}
