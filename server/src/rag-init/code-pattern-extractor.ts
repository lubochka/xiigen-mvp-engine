/**
 * CodePatternExtractor — scans TypeScript source strings for extractable patterns.
 *
 * Extracts: class definitions, interfaces, exported functions, enums, decorators.
 * Auto-tags by DNA pattern and fabric type.
 *
 * DNA-3: returns DataProcessResult.
 *
 * Phase 11.1: RAG Init foundation.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import {
  type CodePattern,
  PatternCategory,
  createPattern,
  createExtractionResult,
  type ExtractionResult,
} from './pattern-types';

// ── DNA Pattern Detection ───────────────────────────

interface DnaDetector {
  id: string;
  name: string;
  patterns: RegExp[];
}

const DNA_DETECTORS: DnaDetector[] = [
  { id: 'DNA-1', name: 'ParseDocument', patterns: [/Record<string,\s*unknown>/] },
  { id: 'DNA-2', name: 'BuildQueryFilters', patterns: [/buildSearchFilter/i, /BuildQueryFilter/i] },
  { id: 'DNA-3', name: 'DataProcessResult', patterns: [/DataProcessResult/] },
  { id: 'DNA-4', name: 'MicroserviceBase', patterns: [/MicroserviceBase/] },
  { id: 'DNA-5', name: 'ScopeIsolation', patterns: [/tenantId|tenant_id|scopeId|TenantContext/] },
  { id: 'DNA-6', name: 'DynamicController', patterns: [/DynamicController/] },
  { id: 'DNA-7', name: 'Idempotency', patterns: [/idempotency|IdempotencyKey/i] },
  { id: 'DNA-8', name: 'OutboxBeforeQueue', patterns: [/storeDocument.*enqueueAsync|outbox/i] },
  { id: 'DNA-9', name: 'CloudEvents', patterns: [/CloudEvent/] },
];

// ── Fabric Detection ────────────────────────────────

interface FabricDetector {
  fabric: string;
  patterns: RegExp[];
}

const FABRIC_DETECTORS: FabricDetector[] = [
  {
    fabric: 'DATABASE',
    patterns: [/IDatabaseService|DatabaseFabric|storeDocument|searchDocuments/],
  },
  { fabric: 'QUEUE', patterns: [/IQueueService|QueueFabric|enqueueAsync|dequeueAsync/] },
  { fabric: 'AI_ENGINE', patterns: [/IAiProvider|AiDispatcher|generate\(/] },
  { fabric: 'RAG', patterns: [/IRagService|RagFabric|buildContextPack/] },
  { fabric: 'FLOW_ENGINE', patterns: [/IFlowDefinition|IFlowOrchestrator|FlowStore/] },
  { fabric: 'SECRETS', patterns: [/ISecretsService|SecretsFabric/] },
];

// ── Extractor ───────────────────────────────────────

@Injectable()
export class CodePatternExtractor {
  /**
   * Extract patterns from a single TypeScript source file.
   */
  extractFromSource(source: string, filePath: string): DataProcessResult<CodePattern[]> {
    if (!source || !source.trim()) {
      return DataProcessResult.success([]);
    }

    const patterns: CodePattern[] = [];
    const errors: string[] = [];

    try {
      // Extract class definitions
      patterns.push(...this.extractClasses(source, filePath));

      // Extract interface declarations
      patterns.push(...this.extractInterfaces(source, filePath));

      // Extract exported functions
      patterns.push(...this.extractFunctions(source, filePath));

      // Extract enum declarations
      patterns.push(...this.extractEnums(source, filePath));

      // Extract @Module decorators
      patterns.push(...this.extractModules(source, filePath));
    } catch (err) {
      errors.push(`Error extracting from ${filePath}: ${String(err)}`);
    }

    return DataProcessResult.success(patterns);
  }

  /**
   * Extract patterns from multiple source files.
   */
  extractFromSources(sources: Map<string, string>): DataProcessResult<ExtractionResult> {
    const allPatterns: CodePattern[] = [];
    const errors: string[] = [];

    for (const [filePath, source] of sources.entries()) {
      const result = this.extractFromSource(source, filePath);
      if (result.isSuccess && result.data) {
        allPatterns.push(...result.data);
      } else {
        errors.push(`Failed: ${filePath}: ${result.errorMessage}`);
      }
    }

    return DataProcessResult.success(createExtractionResult(allPatterns, sources.size, errors));
  }

  // ── Class Extraction ────────────────────────────

  private extractClasses(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    const regex =
      /export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const className = match[1];
      const extendsClass = match[2] ?? '';
      const implementsStr = match[3]?.trim() ?? '';

      // Skip *Module classes — handled by extractModules
      if (className.endsWith('Module')) continue;

      const snippet = this.extractBlock(source, match.index, 500);
      const tags = this.detectTags(snippet);
      const category = this.classifyClass(className, extendsClass, tags);

      if (extendsClass) tags.push(extendsClass.toLowerCase());
      if (implementsStr) {
        for (const iface of implementsStr.split(',').map((s) => s.trim())) {
          if (iface) tags.push(iface.toLowerCase());
        }
      }

      patterns.push(
        createPattern({
          name: className,
          source: filePath,
          category,
          tags: [...new Set(tags)],
          description: this.buildClassDescription(className, extendsClass, implementsStr),
          codeSnippet: snippet,
        }),
      );
    }

    return patterns;
  }

  // ── Interface Extraction ────────────────────────

  private extractInterfaces(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    // Match names like IAiProvider, IDatabaseService — I followed by uppercase letter
    const regex =
      /export\s+(?:abstract\s+)?(?:class|interface)\s+(I[A-Z]\w+)\s*(?:extends\s+\w+\s*)?\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const name = match[1];

      const snippet = this.extractBlock(source, match.index, 400);
      const tags = this.detectTags(snippet);
      tags.push('interface');

      const isFabricInterface =
        /IDatabaseService|IQueueService|IAiProvider|IRagService|IFlowDefinition|ISecretsService/.test(
          name,
        );
      const category = isFabricInterface
        ? PatternCategory.FABRIC_USAGE
        : PatternCategory.FACTORY_INTERFACE;

      patterns.push(
        createPattern({
          name,
          source: filePath,
          category,
          tags: [...new Set(tags)],
          description: `Interface: ${name}`,
          codeSnippet: snippet,
        }),
      );
    }

    return patterns;
  }

  // ── Function Extraction ─────────────────────────

  private extractFunctions(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    const regex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const funcName = match[1];
      const snippet = this.extractBlock(source, match.index, 300);
      const tags = this.detectTags(snippet);
      tags.push('function');

      patterns.push(
        createPattern({
          name: funcName,
          source: filePath,
          category: PatternCategory.DNA_PATTERN,
          tags: [...new Set(tags)],
          description: `Exported function: ${funcName}`,
          codeSnippet: snippet,
        }),
      );
    }

    return patterns;
  }

  // ── Enum Extraction ─────────────────────────────

  private extractEnums(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    const regex = /export\s+enum\s+(\w+)\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const enumName = match[1];
      const snippet = this.extractBlock(source, match.index, 300);
      const tags = ['enum', ...this.detectTags(snippet)];

      patterns.push(
        createPattern({
          name: enumName,
          source: filePath,
          category: PatternCategory.MODULE_STRUCTURE,
          tags: [...new Set(tags)],
          description: `Enum: ${enumName}`,
          codeSnippet: snippet,
        }),
      );
    }

    return patterns;
  }

  // ── Module Extraction ───────────────────────────

  private extractModules(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    // Two-pass: find @Module in source, then find the export class that follows
    const lines = source.split('\n');
    let inModuleBlock = false;
    let moduleStart = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@Module')) {
        inModuleBlock = true;
        moduleStart = i;
      }
      if (inModuleBlock) {
        const classMatch = lines[i].match(/export\s+class\s+(\w+Module)/);
        if (classMatch) {
          const moduleName = classMatch[1];
          const startIdx = source.indexOf(lines[moduleStart]);
          const snippet = source
            .substring(startIdx, Math.min(startIdx + 500, source.length))
            .trim();
          const tags = ['module', 'nestjs', ...this.detectTags(snippet)];

          const hasImports = snippet.includes('imports:');
          const hasExports = snippet.includes('exports:');
          if (hasImports) tags.push('has_imports');
          if (hasExports) tags.push('has_exports');

          patterns.push(
            createPattern({
              name: moduleName,
              source: filePath,
              category: PatternCategory.MODULE_STRUCTURE,
              tags: [...new Set(tags)],
              description: `NestJS module: ${moduleName}`,
              codeSnippet: snippet,
              metadata: { has_imports: hasImports, has_exports: hasExports },
            }),
          );

          inModuleBlock = false;
        }
      }
    }

    return patterns;
  }

  // ── Tag Detection ───────────────────────────────

  /** Detect DNA pattern and fabric tags from a code snippet. */
  public detectTags(code: string): string[] {
    const tags: string[] = [];

    for (const detector of DNA_DETECTORS) {
      if (detector.patterns.some((p) => p.test(code))) {
        tags.push(detector.id);
        tags.push(detector.name.toLowerCase());
      }
    }

    for (const detector of FABRIC_DETECTORS) {
      if (detector.patterns.some((p) => p.test(code))) {
        tags.push(detector.fabric.toLowerCase());
      }
    }

    return tags;
  }

  // ── Helpers ─────────────────────────────────────

  /** Extract a code block starting at offset, trying to capture the full block. */
  private extractBlock(source: string, startOffset: number, maxLen: number): string {
    let depth = 0;
    let end = startOffset;
    let foundOpen = false;

    for (let i = startOffset; i < source.length && i < startOffset + maxLen * 2; i++) {
      if (source[i] === '{') {
        depth++;
        foundOpen = true;
      }
      if (source[i] === '}') {
        depth--;
      }
      if (foundOpen && depth === 0) {
        end = i + 1;
        break;
      }
    }

    if (end <= startOffset) end = Math.min(startOffset + maxLen, source.length);

    const block = source.substring(startOffset, end);
    if (block.length <= maxLen) return block.trim();
    return block.substring(0, maxLen).trim() + '\n// ... (trimmed)';
  }

  /** Classify a class into a PatternCategory based on its name and parents. */
  private classifyClass(className: string, extendsClass: string, tags: string[]): PatternCategory {
    if (className.endsWith('Module')) return PatternCategory.MODULE_STRUCTURE;
    if (extendsClass === 'MicroserviceBase') return PatternCategory.SERVICE_IMPL;
    if (className.endsWith('Factory')) return PatternCategory.FACTORY_INTERFACE;
    if (/^I[A-Z]/.test(className)) return PatternCategory.FACTORY_INTERFACE;
    if (tags.includes('DNA-3') || tags.includes('DNA-4') || tags.includes('DNA-5'))
      return PatternCategory.DNA_PATTERN;
    if (tags.some((t) => FABRIC_DETECTORS.some((fd) => fd.fabric.toLowerCase() === t)))
      return PatternCategory.FABRIC_USAGE;
    return PatternCategory.SERVICE_IMPL;
  }

  /** Build a human-readable description for a class. */
  private buildClassDescription(
    className: string,
    extendsClass: string,
    implementsStr: string,
  ): string {
    let desc = `Class: ${className}`;
    if (extendsClass) desc += ` extends ${extendsClass}`;
    if (implementsStr) desc += ` implements ${implementsStr}`;
    return desc;
  }
}
