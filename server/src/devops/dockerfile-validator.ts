/**
 * DockerfileValidator — parses Dockerfile content and validates structure.
 *
 * Checks:
 *   - hasMultiStageBuilds: at least 2 FROM instructions
 *   - hasHealthCheck: HEALTHCHECK instruction present
 *   - hasExposePort: EXPOSE instruction for a given port
 *   - hasCmdOrEntrypoint: CMD or ENTRYPOINT defined
 *   - usesAlpine: base images use alpine variants
 *   - hasInstruction: generic instruction check
 *
 * Also validates .dockerignore and nginx.conf content.
 *
 * Phase 13.3.
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class DockerfileValidator {
  /**
   * Check for multi-stage builds (at least 2 FROM instructions).
   */
  hasMultiStageBuilds(content: string): boolean {
    const fromCount = this.countInstruction(content, 'FROM');
    return fromCount >= 2;
  }

  /**
   * Check for HEALTHCHECK instruction.
   */
  hasHealthCheck(content: string): boolean {
    return this.hasInstruction(content, 'HEALTHCHECK');
  }

  /**
   * Check for EXPOSE instruction with a specific port.
   */
  hasExposePort(content: string, port: number): boolean {
    const regex = new RegExp(`^\\s*EXPOSE\\s+.*\\b${port}\\b`, 'm');
    return regex.test(content);
  }

  /**
   * Check for CMD or ENTRYPOINT instruction.
   */
  hasCmdOrEntrypoint(content: string): boolean {
    return this.hasInstruction(content, 'CMD') || this.hasInstruction(content, 'ENTRYPOINT');
  }

  /**
   * Check that all FROM images use alpine variants.
   */
  usesAlpine(content: string): boolean {
    const fromLines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^FROM\s+/i.test(l));

    if (fromLines.length === 0) return false;

    return fromLines.every((line) => /alpine/i.test(line));
  }

  /**
   * Check for a specific Dockerfile instruction.
   */
  hasInstruction(content: string, instruction: string): boolean {
    const regex = new RegExp(`^\\s*${instruction}\\b`, 'mi');
    return regex.test(content);
  }

  /**
   * Check that a COPY --from=<stage> instruction exists (multi-stage copy).
   */
  hasCopyFromStage(content: string, stageName?: string): boolean {
    if (stageName) {
      const regex = new RegExp(`COPY\\s+--from=${stageName}\\b`, 'i');
      return regex.test(content);
    }
    return /COPY\s+--from=/i.test(content);
  }

  /**
   * Check for a LABEL instruction with a specific key.
   */
  hasLabel(content: string, key: string): boolean {
    const regex = new RegExp(`^\\s*LABEL\\s+.*${key}`, 'mi');
    return regex.test(content);
  }

  /**
   * Count occurrences of a Dockerfile instruction.
   */
  countInstruction(content: string, instruction: string): number {
    const regex = new RegExp(`^\\s*${instruction}\\b`, 'gmi');
    return (content.match(regex) || []).length;
  }

  // ── .dockerignore Validation ──────────────────────

  /**
   * Check that .dockerignore includes required patterns.
   */
  dockerignoreHasPattern(content: string, pattern: string): boolean {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    return lines.some((l) => l === pattern || l.startsWith(pattern));
  }

  // ── nginx.conf Validation ─────────────────────────

  /**
   * Check that nginx.conf has SPA try_files routing.
   */
  nginxHasSpaRouting(content: string): boolean {
    return /try_files\s+\$uri\s+\$uri\/\s+\/index\.html/.test(content);
  }

  /**
   * Check that nginx.conf has gzip enabled.
   */
  nginxHasGzip(content: string): boolean {
    return /gzip\s+on/.test(content);
  }

  /**
   * Check that nginx.conf has cache headers for static assets.
   */
  nginxHasCacheHeaders(content: string): boolean {
    return /expires\s+\d+d/.test(content) && /Cache-Control/.test(content);
  }

  /**
   * Check that nginx.conf listens on a specific port.
   */
  nginxListensOn(content: string, port: number): boolean {
    const regex = new RegExp(`listen\\s+${port}\\b`);
    return regex.test(content);
  }
}
