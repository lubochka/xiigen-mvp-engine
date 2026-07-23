/**
 * FLOW-22 GAP-22-03: Build-Time CSS Enforcement
 * BFA Rules: CF-411
 * Design Decision: DD-198
 * Task Types: T342 (GlobalStylePropagation)
 * Factory: F937
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const CSS_BUILD_SERVICE = 'CSS_BUILD_SERVICE';

export type CompileContext = 'publish-pipeline' | 'test';
// Note: 'http-request' is NOT a valid context — rejected at runtime

export interface ICssBuildOptions {
  /**
   * Compile context — enforces CF-411.
   * Only 'publish-pipeline' and 'test' are valid.
   * Any HTTP handler calling this will fail context validation.
   */
  context: CompileContext;
  publishJobId?: string;
}

export interface ICssBuildResult {
  css: string;
  sourceMap?: string;
  tokenCount: number;
  builtAt: string;
  compileContext: CompileContext;
}

export interface ICssBuildService {
  /**
   * Compile design tokens to CSS bundle.
   *
   * CF-411: MUST only be called in publish-pipeline context.
   * Returns DataProcessResult.failure('INVALID_COMPILE_CONTEXT') if called from HTTP handler.
   *
   * How context enforcement works:
   * - AsyncLocalStorage carries publish context from T336 Stage 5
   * - If no publish context in AsyncLocalStorage: reject with INVALID_COMPILE_CONTEXT
   * - Accepts explicit context parameter for testing (context: 'test')
   */
  compile(
    tokens: Record<string, unknown>,
    options: ICssBuildOptions,
  ): Promise<DataProcessResult<ICssBuildResult>>;

  /**
   * Validate that current execution context is publish pipeline.
   * Returns success if running within T336 Stage 5.
   */
  validateCompileContext(): Promise<
    DataProcessResult<{ validContext: boolean; contextType: string }>
  >;
}
