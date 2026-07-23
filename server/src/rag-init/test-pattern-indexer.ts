/**
 * TestPatternIndexer — extracts reusable test patterns from test source files.
 *
 * Extracts: describe/it blocks, mock creation, assertion patterns, setup patterns.
 * Tags: mock_pattern, dna3_test, setup_pattern, assertion_pattern.
 *
 * DNA-3: returns DataProcessResult.
 * Phase 11.2.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { type CodePattern, PatternCategory, createPattern } from './pattern-types';

@Injectable()
export class TestPatternIndexer {
  /**
   * Extract test patterns from a single test source file.
   */
  extractTestPatterns(source: string, filePath: string): DataProcessResult<CodePattern[]> {
    if (!source || !source.trim()) {
      return DataProcessResult.success([]);
    }

    const patterns: CodePattern[] = [];

    // Extract describe blocks
    patterns.push(...this.extractDescribeBlocks(source, filePath));

    // Extract mock patterns
    patterns.push(...this.extractMockPatterns(source, filePath));

    // Extract setup patterns (beforeEach/beforeAll)
    patterns.push(...this.extractSetupPatterns(source, filePath));

    return DataProcessResult.success(patterns);
  }

  /**
   * Extract from multiple test files.
   */
  extractFromTestSources(sources: Map<string, string>): DataProcessResult<CodePattern[]> {
    const allPatterns: CodePattern[] = [];

    for (const [filePath, source] of sources.entries()) {
      const result = this.extractTestPatterns(source, filePath);
      if (result.isSuccess && result.data) {
        allPatterns.push(...result.data);
      }
    }

    return DataProcessResult.success(allPatterns);
  }

  // ── Describe Block Extraction ─────────────────────

  private extractDescribeBlocks(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    const regex = /describe\(['"`](.+?)['"`],\s*\(\)\s*=>\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const suiteName = match[1];
      // Count it blocks within this describe
      const blockStart = match.index;
      const blockSnippet = this.extractApproxBlock(source, blockStart, 600);
      const itCount = (blockSnippet.match(/\bit\s*\(/g) ?? []).length;

      const tags = ['test_suite', 'describe'];
      // Detect what's being tested
      if (blockSnippet.includes('DataProcessResult')) tags.push('dna3_test');
      if (blockSnippet.includes('tenantId') || blockSnippet.includes('tenant_id'))
        tags.push('dna5_test');
      if (blockSnippet.includes('jest.fn')) tags.push('uses_mocks');
      if (blockSnippet.includes('MicroserviceBase')) tags.push('dna4_test');

      patterns.push(
        createPattern({
          name: `Test: ${suiteName}`,
          source: filePath,
          category: PatternCategory.TEST_PATTERN,
          tags,
          description: `Test suite: ${suiteName} (${itCount} test cases)`,
          codeSnippet: blockSnippet,
          metadata: { suite_name: suiteName, test_count: itCount },
        }),
      );
    }

    return patterns;
  }

  // ── Mock Pattern Extraction ───────────────────────

  private extractMockPatterns(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    // Find jest.fn() / jest.spyOn / mock declarations
    const regex = /(?:const|let)\s+(\w+)\s*=\s*(?:jest\.fn\(|jest\.spyOn\(|\{[\s\S]*?jest\.fn)/g;
    let match: RegExpExecArray | null;
    const seen = new Set<string>();

    while ((match = regex.exec(source)) !== null) {
      const mockName = match[1];
      if (seen.has(mockName)) continue;
      seen.add(mockName);

      const snippet = source
        .substring(match.index, Math.min(match.index + 200, source.length))
        .trim();
      const tags = ['mock_pattern', 'jest'];

      // Detect what's being mocked
      if (snippet.includes('DataProcessResult.success')) tags.push('dna3_mock');
      if (snippet.includes('database') || snippet.includes('Database')) tags.push('database_mock');
      if (snippet.includes('queue') || snippet.includes('Queue')) tags.push('queue_mock');

      patterns.push(
        createPattern({
          name: `Mock: ${mockName}`,
          source: filePath,
          category: PatternCategory.TEST_PATTERN,
          tags,
          description: `Mock declaration: ${mockName}`,
          codeSnippet: snippet,
          metadata: { mock_name: mockName },
        }),
      );
    }

    return patterns;
  }

  // ── Setup Pattern Extraction ──────────────────────

  private extractSetupPatterns(source: string, filePath: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    const regex = /before(?:Each|All)\s*\(\s*(?:async\s*)?\(\)\s*=>\s*\{/g;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = regex.exec(source)) !== null) {
      count++;
      const snippet = this.extractApproxBlock(source, match.index, 300);
      const isAsync = snippet.includes('async');
      const tags = ['setup_pattern'];
      if (isAsync) tags.push('async_setup');
      if (snippet.includes('new ')) tags.push('instance_setup');
      if (snippet.includes('jest.fn')) tags.push('mock_setup');

      patterns.push(
        createPattern({
          name: `Setup: beforeEach #${count}`,
          source: filePath,
          category: PatternCategory.TEST_PATTERN,
          tags,
          description: `Test setup pattern (beforeEach/beforeAll)`,
          codeSnippet: snippet,
          metadata: { setup_index: count, is_async: isAsync },
        }),
      );
    }

    return patterns;
  }

  // ── Helpers ───────────────────────────────────────

  private extractApproxBlock(source: string, start: number, maxLen: number): string {
    let depth = 0;
    let end = start;
    let foundOpen = false;

    for (let i = start; i < source.length && i < start + maxLen * 2; i++) {
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

    if (end <= start) end = Math.min(start + maxLen, source.length);
    const block = source.substring(start, end);
    if (block.length <= maxLen) return block.trim();
    return block.substring(0, maxLen).trim() + '\n// ... (trimmed)';
  }
}
