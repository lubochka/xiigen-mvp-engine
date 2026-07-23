/**
 * T670 UserPreferencesManager [DATA_PIPELINE]
 * FLOW-48: i18n-translation
 *
 * GET/PUT user locale preferences. userOverride flag controls whether tenant
 * defaultLocale changes propagate.
 *
 * Iron rules:
 *   CF-810: tenantId on every write reads from ALS, never from payload.
 *   DNA-8:  storeDocument completes before method returns (no async side effects).
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';
import { USER_PREFERENCES_INDEX } from './constants';

export const USER_PREFERENCES_MANAGER_SERVICE = 'USER_PREFERENCES_MANAGER_SERVICE';

export interface UserPreferencesRead {
  locale: string | null;
  userOverride: boolean;
}

export interface UserPreferencesWrite {
  locale: string;
  userOverride?: boolean;
}

@Injectable()
export class UserPreferencesManagerService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async getPreferences(userId: string): Promise<DataProcessResult<UserPreferencesRead>> {
    try {
      if (!userId) {
        return DataProcessResult.failure('MISSING_USER_ID', 'userId is required');
      }
      const tenantId = this.getTenantId();
      const result = await this.db.searchDocuments(USER_PREFERENCES_INDEX, {
        userId,
        tenantId,
      });
      if (!result.isSuccess || (result.data ?? []).length === 0) {
        return DataProcessResult.success({ locale: null, userOverride: false });
      }
      const doc = result.data![0] as Record<string, unknown>;
      const locale = typeof doc['locale'] === 'string' ? (doc['locale'] as string) : null;
      const userOverride = doc['userOverride'] === true;
      return DataProcessResult.success({ locale, userOverride });
    } catch (err) {
      return DataProcessResult.failure(
        'USER_PREFERENCES_GET_ERROR',
        `UserPreferencesManager.getPreferences threw: ${String(err)}`,
      );
    }
  }

  async setPreferences(
    userId: string,
    payload: UserPreferencesWrite,
  ): Promise<DataProcessResult<UserPreferencesRead>> {
    try {
      if (!userId) {
        return DataProcessResult.failure('MISSING_USER_ID', 'userId is required');
      }
      if (!payload?.locale || typeof payload.locale !== 'string') {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'locale is required and must be a string',
        );
      }

      // CF-810: tenantId from ALS
      const tenantId = this.getTenantId();
      const userOverride = payload.userOverride ?? true;
      const doc: Record<string, unknown> = {
        userId,
        tenantId,
        locale: payload.locale,
        userOverride,
        updatedAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      };

      // DNA-8: store before return. docId = userId for idempotent upsert.
      const stored = await this.db.storeDocument(USER_PREFERENCES_INDEX, doc, userId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(
          stored.errorCode ?? 'USER_PREFERENCES_STORE_FAILED',
          stored.errorMessage ?? 'failed to store user preferences',
        );
      }

      return DataProcessResult.success({
        locale: payload.locale,
        userOverride,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'USER_PREFERENCES_SET_ERROR',
        `UserPreferencesManager.setPreferences threw: ${String(err)}`,
      );
    }
  }
}
