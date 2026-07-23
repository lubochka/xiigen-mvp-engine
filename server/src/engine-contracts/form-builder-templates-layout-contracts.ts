/**
 * FLOW-23 GAP-23-3: Pure Computation Layout Contracts
 * BFA Rules: CF-433, CF-445
 * Error Correction: score-zero
 * Task Types: T349 (LayoutSolverInvoke), T354 (GridColumnReflow)
 * Factories: F953 (ILayoutSolverService), F949 (IGridSystemService)
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const LAYOUT_SOLVER_SERVICE = 'LAYOUT_SOLVER_SERVICE';

/**
 * PURE COMPUTATION — deterministic layout solver.
 * CF-445: Validate constraints before solve.
 * NO AI methods. NO write methods.
 * Same inputs ALWAYS produce same outputs.
 */
export interface ILayoutSolverService {
  /**
   * Solve layout constraints. Pure computation, no side effects.
   * CF-445: validateConstraints() MUST be called before solve().
   */
  solve(
    constraints: Record<string, unknown>,
    canvasState: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<
    DataProcessResult<{
      resolvedLayout: Record<string, unknown>;
      algorithm: string;
      iterations: number;
      cacheKey: string; // Deterministic hash — same inputs = same key
    }>
  >;

  /**
   * CF-445: Validate constraints before solve. NOT optional.
   */
  validateConstraints(
    constraints: Record<string, unknown>,
  ): Promise<DataProcessResult<{ valid: boolean; errors?: string[] }>>;

  // NOTE: No AI methods (no generate, no suggest, no enhance)
  // NOTE: No write methods (no storeDocument, no enqueue)
}

export const GRID_SYSTEM_SERVICE = 'GRID_SYSTEM_SERVICE';

/**
 * PURE COMPUTATION — deterministic grid column calculator.
 * CF-433: No side effects. Read and compute only.
 * NO AI methods. NO write methods.
 */
export interface IGridSystemService {
  /**
   * Reflow grid columns. Pure math, no AI, no DB writes.
   * CF-433: No side effects permitted.
   */
  reflow(
    columnConfig: Record<string, unknown>,
    viewportWidth: number,
    breakpoints: Record<string, unknown>,
  ): Promise<
    DataProcessResult<{
      columns: Record<string, unknown>[];
      gutterWidth: number;
      totalWidth: number;
      columnWidth: number;
      algorithm: 'css-grid' | 'flexbox' | 'custom';
    }>
  >;

  // NOTE: No AI methods — deterministic math only
  // NOTE: No storeDocument — caller persists if needed (CF-433)
}
