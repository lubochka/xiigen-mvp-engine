/**
 * FABRIC: IFlowAssembler
 *
 * Copies monorepo files for a given flowSlug into a staging directory that
 * will become the tenant fork repo's initial commit.
 *
 * Boundary: monorepo file system read.
 *
 * **Functional spec is MANDATORY** per session directive 2026-04-22: without
 * `docs/business-flows/{flowId}-{flowSlug}.md` in the staging dir, Phase 1
 * of AI adaptation cannot run for the tenant. The `includesFunctionalSpec`
 * flag must be true for the handler to proceed; otherwise the handler
 * returns failure with no external side-effects (no repo created).
 *
 * All methods return DataProcessResult (DNA-3).
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 1 — fabric interface.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const FLOW_ASSEMBLER_SERVICE = Symbol('IFlowAssembler');

export interface AssembleParams {
  flowSlug: string; // e.g. 'user-registration'
  flowId: string; // e.g. 'FLOW-01'
  tenantId?: string; // optional fork tenant for tenant.config.json provenance
  stagingDir: string; // absolute path — caller manages lifecycle
}

export interface AssembleResult {
  stagingDir: string;
  fileCount: number;
  /** True iff docs/business-flows/{flowId}-{flowSlug}.md was copied. Phase 1
   *  AI adaptation will fail silently if false — handler must gate on this. */
  includesFunctionalSpec: boolean;
  /** True iff docs/sessions/{flowId}/{flowId}-STEP-1-INVARIANTS.md was copied. */
  includesStepOneInvariants: boolean;
  /** True iff every required runtime, context, config, and build file is present. */
  includesCompleteModuleBundle?: boolean;
  includesAdaptationSurface?: boolean;
  includesFreedomDefaults?: boolean;
  includesTenantConfig?: boolean;
  includesRagSeeds?: boolean;
  includesStandalonePackage?: boolean;
  /** Manifest of every file copied, for audit + test assertions. */
  manifest: string[];
}

export interface IFlowAssembler {
  assemble(params: AssembleParams): Promise<DataProcessResult<AssembleResult>>;
}
