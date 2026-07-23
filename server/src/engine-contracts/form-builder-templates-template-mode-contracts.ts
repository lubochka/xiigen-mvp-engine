/**
 * FLOW-23 GAP-23-2: Template Mode READ-ONLY Contracts
 * BFA Rules: CF-444
 * Data Decision: DD-209
 * Error Correction: score-zero
 * Task Types: T357 (TemplateModeRender)
 * Factories: F961 (ITemplateModeContext), F964 (ICmsContentReader)
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const TEMPLATE_MODE_CONTEXT = 'TEMPLATE_MODE_CONTEXT';

export interface ITemplateModeContext {
  /**
   * Enter READ-ONLY template mode for a canvas snapshot.
   * CF-444: After enter(), no mutation operations are permitted.
   * Must call exit() when done (use try-finally).
   */
  enter(canvasSnapshotId: string): Promise<
    DataProcessResult<{
      contextId: string;
      mode: 'template_readonly';
      enteredAt: string;
      snapshotVersion: string;
      tenantId: string; // From AsyncLocalStorage — CF-436 scoping
    }>
  >;

  /**
   * Exit template mode, releasing the read-only context.
   * Must be called even on error — use try-finally pattern.
   */
  exit(contextId: string): Promise<DataProcessResult<{ exited: boolean; exitedAt: string }>>;

  /**
   * Verify current execution context is in read-only template mode.
   * Returns failure if not in template context.
   * T357 MUST call this after enter() — CF-444.
   */
  verifyReadOnly(contextId: string): Promise<
    DataProcessResult<{
      readOnly: boolean;
      contextId: string;
      snapshotVersion: string;
    }>
  >;
}

export const CMS_CONTENT_READER = 'CMS_CONTENT_READER';

/**
 * READ-ONLY CMS content access.
 * CF-444: This interface intentionally has NO write methods.
 * updateContent, createContent, deleteContent are ABSENT by design.
 */
export interface ICmsContentReader {
  getContent(slug: string): Promise<DataProcessResult<Record<string, unknown>>>;
  getContentByPath(path: string): Promise<DataProcessResult<Record<string, unknown>>>;
  listContents(
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
  getContentVersion(
    slug: string,
    version: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  contentExists(slug: string): Promise<DataProcessResult<{ exists: boolean }>>;
  // NOTE: updateContent, createContent, deleteContent intentionally absent (CF-444)
}
