/**
 * T648 PermissionEnforcer [AUTH_GATE]
 * FLOW-23: Form Builder Templates
 *
 * Entry: TemplateAccessRequested event (user tries to access/modify template)
 *
 * Execution order is MACHINE (DD-216):
 *   ORDER 1: Extract role from auth context ONLY (never parameter) (DD-216, OWASP API1)
 *   ORDER 2: Lookup template + check role permission against ALLOWED_ROLES
 *   ORDER 3: storeDocument(permission check audit) (DNA-8)
 *   ORDER 4: Emit decision event (PermissionGranted or PermissionDenied)
 *
 * Iron rules:
 *   IR-1: Role from auth context ONLY (DD-216, OWASP API1) — NO role parameter
 *   IR-2: No role parameter accepted anywhere in method signature
 *   IR-3: Permission decision storeDocument BEFORE emit (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const TEMPLATES_INDEX = 'xiigen-templates';
const PERMISSION_AUDIT_INDEX = 'xiigen-permission-audit';
const _ALLOWED_ROLES = ['admin', 'editor', 'viewer'] as const;

@Injectable()
export class PermissionEnforcer {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getAuthContext(): Record<string, unknown> {
    try {
      const context = this.cls.get<Record<string, unknown>>(TENANT_CONTEXT_KEY) ?? {};
      return context;
    } catch {
      return {};
    }
  }

  async enforcePermission(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // ── ORDER 1: Extract role from auth context ONLY (DD-216, OWASP API1) ────────
    const authContext = this.getAuthContext();
    const userRole = (authContext['userRole'] as string | undefined) ?? 'viewer';
    const tenantId = (authContext['tenantId'] as string | undefined) ?? 'unknown';
    const userId = (authContext['userId'] as string | undefined) ?? 'unknown';

    const templateId = event['templateId'] as string;
    const action = event['action'] as string | undefined;

    if (!templateId || !action) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId and action are required');
    }

    const checkedAt = new Date().toISOString();

    // ── ORDER 2: Lookup template and check role permission ──────────────────────
    const templateResult = await this.db.searchDocuments(TEMPLATES_INDEX, { templateId });
    if (!templateResult.isSuccess || (templateResult.data ?? []).length === 0) {
      return DataProcessResult.failure('TEMPLATE_NOT_FOUND', `Template ${templateId} not found`);
    }

    const template = (templateResult.data ?? [])[0] as Record<string, unknown>;
    const templateOwner = (template['ownerId'] as string | undefined) ?? undefined;

    // Permission logic: admin can do anything, editor can read/edit, viewer can read
    const allowed = this.checkPermission(userRole, action, userId, templateOwner);

    // ── ORDER 3: Store permission check audit (DNA-8) ─────────────────────────────
    await this.db.storeDocument(PERMISSION_AUDIT_INDEX, {
      userId,
      userRole,
      templateId,
      tenantId,
      action,
      allowed,
      checkedAt,
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 4: Emit decision event ──────────────────────────────────────────────
    if (allowed) {
      await this.queue.enqueue('PermissionGranted', {
        userId,
        userRole,
        templateId,
        tenantId,
        action,
        checkedAt,
      });

      return DataProcessResult.success({
        userId,
        templateId,
        action,
        permitted: true,
        checkedAt,
      });
    } else {
      await this.queue.enqueue('PermissionDenied', {
        userId,
        userRole,
        templateId,
        tenantId,
        action,
        reason: `${userRole} cannot ${action}`,
        checkedAt,
      });

      return DataProcessResult.failure(
        'PERMISSION_DENIED',
        `User role ${userRole} cannot perform action: ${action}`,
      );
    }
  }

  private checkPermission(
    userRole: string,
    action: string,
    userId: string,
    templateOwner?: string,
  ): boolean {
    // Admin: all actions
    if (userRole === 'admin') {
      return true;
    }

    // Editor: read, write, but not delete
    if (userRole === 'editor') {
      if (action === 'read' || action === 'write') {
        return true;
      }
      // Owner can delete
      if (action === 'delete' && userId === templateOwner) {
        return true;
      }
      return false;
    }

    // Viewer: read-only
    if (userRole === 'viewer') {
      return action === 'read';
    }

    return false;
  }
}
