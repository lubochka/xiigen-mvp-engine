/**
 * T641 LayoutSolverInvoke [COMPUTATION]
 * FLOW-23: Form Builder Templates
 *
 * Entry: LayoutConstraintUpdateRequested event (user updates layout constraints)
 *
 * Execution order is MACHINE (CF-445):
 *   ORDER 1: Validate layout constraints against schema — no invalid references
 *   ORDER 2: Solve constraint system — pure computation, no state mutation
 *   ORDER 3: Return solved layout (no storeDocument, no enqueue — pure computation)
 *
 * Iron rules:
 *   IR-1: NO AI_PROVIDER injection (CF-433) — purely computational
 *   IR-2: validateConstraints() at ORDER 1 before solve() (CF-445)
 *   IR-3: Pure computation — returns result directly, no storage ops
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const ALLOWED_CONSTRAINT_TYPES = ['column', 'row', 'flex', 'grid', 'absolute'] as const;

@Injectable()
export class LayoutSolverInvokeService {
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

  async solveLayout(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const constraints = event['constraints'] as Record<string, unknown> | undefined;

    if (!templateId || !constraints) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId and constraints are required');
    }

    // ── ORDER 1: Validate constraints ────────────────────────────────────────────
    const constraintType = constraints['type'] as string | undefined;
    if (
      !constraintType ||
      !ALLOWED_CONSTRAINT_TYPES.includes(
        constraintType as (typeof ALLOWED_CONSTRAINT_TYPES)[number],
      )
    ) {
      return DataProcessResult.failure(
        'INVALID_CONSTRAINT_TYPE',
        `Constraint type must be one of: ${ALLOWED_CONSTRAINT_TYPES.join(', ')}`,
      );
    }

    const children = constraints['children'] as Record<string, unknown>[] | undefined;
    if (children) {
      for (const child of children) {
        const childType = child['type'] as string | undefined;
        if (
          childType &&
          !ALLOWED_CONSTRAINT_TYPES.includes(childType as (typeof ALLOWED_CONSTRAINT_TYPES)[number])
        ) {
          return DataProcessResult.failure(
            'INVALID_CHILD_CONSTRAINT',
            `Child constraint type ${childType} is not allowed`,
          );
        }
      }
    }

    // ── ORDER 2: Solve constraint system ────────────────────────────────────────
    const solvedLayout = this.computeLayout(constraints);

    // ── ORDER 3: Return solved layout (pure computation, no persistence) ────────
    return DataProcessResult.success({
      templateId,
      tenantId,
      solvedLayout,
      solvedAt: new Date().toISOString(),
    });
  }

  private computeLayout(constraints: Record<string, unknown>): Record<string, unknown> {
    // Pure computation: no side effects, no I/O
    const layout: Record<string, unknown> = {
      type: constraints['type'],
      computed: true,
      dimensions: {
        width: constraints['maxWidth'] ?? 'auto',
        height: constraints['maxHeight'] ?? 'auto',
      },
    };

    const children = constraints['children'] as Record<string, unknown>[] | undefined;
    if (children && children.length > 0) {
      layout['children'] = children.map((child) => ({
        type: child['type'],
        flex: child['flex'] ?? 1,
        gap: child['gap'] ?? 0,
      }));
    }

    return layout;
  }
}
