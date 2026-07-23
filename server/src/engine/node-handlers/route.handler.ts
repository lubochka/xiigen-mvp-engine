/**
 * route.handler — 7th node type (GAP-NEW-14).
 *
 * Dispatches to sub-topology branches based on field conditions.
 * Used by:
 *   - DUAL entry patterns (FLOW-04 T63)
 *   - Multi-source patterns (FLOW-06)
 *   - CONVERGENCE patterns (FLOW-02)
 *
 * nodeConfig.branches: Array of { condition: string; branch: string }
 * Evaluates condition against ctx.inputs, returns matching branch name.
 *
 * DNA-3: returns DataProcessResult, never throws
 */
import { Injectable, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';

export interface RouteBranch {
  /** Dot-notation field path (e.g., 'event.type') */
  field: string;
  /** Expected value or 'DEFAULT' for fallback */
  value: string;
  /** Branch name to route to */
  branch: string;
}

@Injectable()
export class RouteHandler implements INodeHandler {
  readonly nodeType = 'route';
  private readonly logger = new Logger(RouteHandler.name);

  // RouteHandler has no DB dependency — pure routing logic
  // Injectable with no constructor params

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { taskTypeId, inputs, nodeConfig } = ctx;

    const branches = (nodeConfig?.['branches'] as RouteBranch[]) ?? [];

    if (branches.length === 0) {
      this.logger.warn(`Route ${taskTypeId}: no branches configured, passing through`);
      return DataProcessResult.success({
        data: { selectedBranch: 'DEFAULT', inputs },
      });
    }

    // Evaluate branches in order — first match wins
    for (const branch of branches) {
      if (branch.value === 'DEFAULT') continue; // save for fallback

      const fieldValue = this.getFieldValue(inputs, branch.field);
      if (fieldValue === branch.value || String(fieldValue) === branch.value) {
        this.logger.debug(
          `Route ${taskTypeId}: field=${branch.field} value=${branch.value} → branch=${branch.branch}`,
        );
        return DataProcessResult.success({
          data: {
            selectedBranch: branch.branch,
            matchedField: branch.field,
            matchedValue: branch.value,
            inputs,
          },
        });
      }
    }

    // Fallback to DEFAULT branch if present
    const defaultBranch = branches.find((b) => b.value === 'DEFAULT');
    if (defaultBranch) {
      this.logger.debug(
        `Route ${taskTypeId}: no match, using DEFAULT branch=${defaultBranch.branch}`,
      );
      return DataProcessResult.success({
        data: {
          selectedBranch: defaultBranch.branch,
          matchedField: 'DEFAULT',
          matchedValue: 'DEFAULT',
          inputs,
        },
      });
    }

    return DataProcessResult.failure(
      'ROUTE_NO_MATCH',
      `No matching route branch for taskTypeId=${taskTypeId}. Branches: ${branches.map((b) => `${b.field}=${b.value}`).join(', ')}`,
    );
  }

  /** Traverse dot-notation path in an object. */
  private getFieldValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}
