/**
 * RAG Init — Pattern Types
 *
 * Types for code patterns extracted from the engine's own codebase.
 * These patterns are ingested into the RAG store so AF-4 can find
 * real implementation examples when generating new code.
 *
 * DNA-1: toRagDocument() produces Record<string, unknown> with snake_case keys.
 *
 * Phase 11.1: Foundation types.
 */

import { randomUUID } from 'crypto';

// ── PatternCategory ─────────────────────────────────

export enum PatternCategory {
  SKILL = 'SKILL',
  DNA_PATTERN = 'DNA_PATTERN',
  FABRIC_USAGE = 'FABRIC_USAGE',
  FACTORY_INTERFACE = 'FACTORY_INTERFACE',
  SERVICE_IMPL = 'SERVICE_IMPL',
  TEST_PATTERN = 'TEST_PATTERN',
  MODULE_STRUCTURE = 'MODULE_STRUCTURE',
}

// ── CodePattern ─────────────────────────────────────

export interface CodePattern {
  /** Unique pattern ID: pat-<uuid>. */
  readonly id: string;
  /** Human-readable pattern name (e.g., 'InventoryService'). */
  readonly name: string;
  /** Source file path where this pattern was found. */
  readonly source: string;
  /** Pattern category. */
  readonly category: PatternCategory;
  /** Searchable tags (DNA-3, DATABASE, microservice, etc.). */
  readonly tags: readonly string[];
  /** Short description of what this pattern demonstrates. */
  readonly description: string;
  /** Trimmed code snippet (max 500 chars). */
  readonly codeSnippet: string;
  /**
   * Plain English description of what this pattern teaches.
   * Used as primary text for semantic embedding (IRagService.ingest).
   * content field (codeSnippet) remains for Claude Code execution reference.
   * A-0: without this, semantic retrieval degrades — embeddings receive code JSON.
   */
  readonly semanticContent?: string;
  /** Additional metadata. */
  readonly metadata: Record<string, unknown>;
}

/** Create a CodePattern with defaults and auto-generated ID. */
export function createPattern(params: {
  name: string;
  source: string;
  category: PatternCategory;
  tags?: string[];
  description?: string;
  codeSnippet?: string;
  /** A-0: plain English description for semantic embedding. Populated from skill.description. */
  semanticContent?: string;
  metadata?: Record<string, unknown>;
}): CodePattern {
  return {
    id: `pat-${randomUUID().substring(0, 8)}`,
    name: params.name,
    source: params.source,
    category: params.category,
    tags: Object.freeze(params.tags ?? []),
    description: params.description ?? '',
    codeSnippet: trimSnippet(params.codeSnippet ?? '', 500),
    semanticContent: params.semanticContent,
    metadata: params.metadata ?? {},
  };
}

// ── ExtractionResult ────────────────────────────────

export interface ExtractionResult {
  /** Total patterns extracted. */
  readonly totalPatterns: number;
  /** Breakdown by category. */
  readonly byCategory: Record<string, number>;
  /** Files scanned. */
  readonly filesScanned: number;
  /** Errors encountered (non-fatal). */
  readonly errors: string[];
  /** Extracted patterns. */
  readonly patterns: CodePattern[];
}

export function createExtractionResult(
  patterns: CodePattern[],
  filesScanned: number,
  errors: string[] = [],
): ExtractionResult {
  const byCategory: Record<string, number> = {};
  for (const p of patterns) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }
  return {
    totalPatterns: patterns.length,
    byCategory,
    filesScanned,
    errors,
    patterns,
  };
}

// ── toRagDocument ───────────────────────────────────

/**
 * Convert a CodePattern to the dict format IRagService.ingest() expects.
 * DNA-1: snake_case keys, Record<string, unknown> output.
 *
 * TIER1-S1: Data Connection Classification fields added.
 * Every RAG document must carry connection_type so export/import
 * decisions can be made without inspecting the content.
 */
export function toRagDocument(pattern: CodePattern): Record<string, unknown> {
  return {
    id: pattern.id,
    name: pattern.name,
    source: pattern.source,
    category: pattern.category,
    tags: [...pattern.tags],
    description: pattern.description,
    code_snippet: pattern.codeSnippet,
    // A-0: semantic_content is the primary text for IRagService embedding.
    // Falls back to description when not set.
    semantic_content: pattern.semanticContent ?? pattern.description,
    metadata: { ...pattern.metadata },
    type: 'code_pattern',
    indexed_at: new Date().toISOString(),
    // ── Data Connection Classification (TIER1-S1) ──────────────────────
    connection_type: (pattern.metadata.connectionType as string) ?? 'FLOW_SCOPED',
    tenant_id: (pattern.metadata.tenantId as string) ?? '',
    flow_id: (pattern.metadata.flowId as string) ?? '',
    flow_version: (pattern.metadata.flowVersion as string) ?? '1.0.0',
    exportable: (pattern.metadata.exportable as boolean) ?? true,
    export_group: (pattern.metadata.exportGroup as string) ?? '',
    dependencies: (pattern.metadata.dependencies as string[]) ?? [],
    created_by: (pattern.metadata.createdBy as string) ?? 'system',
    imported_from: (pattern.metadata.importedFrom as string) ?? '',
  };
}

// ── Helpers ─────────────────────────────────────────

/** Trim a code snippet to maxLen characters, keeping complete lines where possible. */
export function trimSnippet(code: string, maxLen: number): string {
  if (!code || code.length <= maxLen) return code;
  const trimmed = code.substring(0, maxLen);
  // Try to cut at last newline for cleaner output
  const lastNewline = trimmed.lastIndexOf('\n');
  if (lastNewline > maxLen * 0.6) {
    return trimmed.substring(0, lastNewline) + '\n// ... (trimmed)';
  }
  return trimmed + '... (trimmed)';
}
