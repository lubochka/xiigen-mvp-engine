/**
 * P13.2 Tests — ESLint + Prettier Configuration + LintValidator
 */

import * as fs from 'fs';
import * as path from 'path';
import { LintValidator, getServerScripts, getClientScripts } from '../../src/devops/lint-validator';

// ── Test Helpers ────────────────────────────────────

/** Read a config file. Resolves from server root (../../) or project root (../../../). */
function readConfig(filePath: string): string | null {
  // __dirname = server/test/devops
  const serverRoot = path.resolve(__dirname, '../../'); // server/
  const projectRoot = path.resolve(__dirname, '../../../'); // xiigen/

  const candidates = [
    path.resolve(serverRoot, filePath), // e.g., server/.eslintrc.json
    path.resolve(projectRoot, filePath), // e.g., client/.eslintrc.json
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, 'utf-8');
    } catch {
      /* try next */
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════
// LintValidator
// ══════════════════════════════════════════════════════

describe('LintValidator', () => {
  let validator: LintValidator;

  beforeEach(() => {
    validator = new LintValidator();
  });

  // ── checkNoConsoleLog ─────────────────────────────

  it('should detect console.log', () => {
    const result = validator.checkNoConsoleLog('console.log("debug info");');
    expect(result.pass).toBe(false);
    expect(result.rule).toBe('no-console-log');
    expect(result.message).toContain('StructuredLogger');
    expect(result.line).toBe(1);
  });

  it('should pass code without console.log', () => {
    const result = validator.checkNoConsoleLog('logger.info("debug info");');
    expect(result.pass).toBe(true);
  });

  it('should allow console.warn and console.error', () => {
    const code = 'console.warn("warning");\nconsole.error("error");';
    const result = validator.checkNoConsoleLog(code);
    expect(result.pass).toBe(true);
  });

  // ── checkNoDirectImports ──────────────────────────

  it('should detect direct pg import', () => {
    const result = validator.checkNoDirectImports("import { Client } from 'pg';");
    expect(result.pass).toBe(false);
    expect(result.message).toContain('pg');
  });

  it('should detect direct openai import', () => {
    const result = validator.checkNoDirectImports("import OpenAI from 'openai';");
    expect(result.pass).toBe(false);
    expect(result.message).toContain('openai');
  });

  it('should detect direct anthropic import', () => {
    const result = validator.checkNoDirectImports("import Anthropic from '@anthropic-ai/sdk';");
    expect(result.pass).toBe(false);
    expect(result.message).toContain('@anthropic-ai');
  });

  it('should pass code with fabric imports', () => {
    const code = "import { IDatabaseService } from '../fabrics/interfaces';";
    const result = validator.checkNoDirectImports(code);
    expect(result.pass).toBe(true);
  });

  // ── checkExportsPresent ───────────────────────────

  it('should detect exports', () => {
    const result = validator.checkExportsPresent('export class MyService {}');
    expect(result.pass).toBe(true);
  });

  it('should detect missing exports', () => {
    const result = validator.checkExportsPresent('class MyService {}');
    expect(result.pass).toBe(false);
    expect(result.message).toContain('No exports');
  });

  it('should detect various export types', () => {
    expect(validator.checkExportsPresent('export function foo() {}').pass).toBe(true);
    expect(validator.checkExportsPresent('export const X = 1;').pass).toBe(true);
    expect(validator.checkExportsPresent('export enum Status {}').pass).toBe(true);
    expect(validator.checkExportsPresent('export interface I {}').pass).toBe(true);
  });

  // ── checkNoVar ────────────────────────────────────

  it('should detect var declarations', () => {
    const result = validator.checkNoVar('var x = 1;');
    expect(result.pass).toBe(false);
    expect(result.message).toContain('const or let');
  });

  it('should pass const and let', () => {
    const result = validator.checkNoVar('const x = 1;\nlet y = 2;');
    expect(result.pass).toBe(true);
  });

  it('should ignore var in comments', () => {
    const result = validator.checkNoVar('// var x = old style');
    expect(result.pass).toBe(true);
  });

  // ── validateAll + isClean ─────────────────────────

  it('should pass clean code through all checks', () => {
    const clean = `
export class InventoryService {
  private readonly logger: StructuredLogger;
  async run(): Promise<void> {
    const result = await this.db.storeDocument('t1', 'idx', {});
    this.logger.info('done');
  }
}
`;
    expect(validator.isClean(clean)).toBe(true);
  });

  it('should fail dirty code', () => {
    const dirty = "import { Client } from 'pg';\nconsole.log('debug');\nvar x = 1;";
    const results = validator.validateAll(dirty);
    const failures = results.filter((r) => !r.pass);
    expect(failures.length).toBeGreaterThanOrEqual(3);
  });

  it('validateAll returns all 4 checks', () => {
    const results = validator.validateAll('export const x = 1;');
    expect(results).toHaveLength(4);
    const rules = results.map((r) => r.rule);
    expect(rules).toContain('no-console-log');
    expect(rules).toContain('no-direct-imports');
    expect(rules).toContain('exports-present');
    expect(rules).toContain('no-var');
  });
});

// ══════════════════════════════════════════════════════
// Config Files Validation
// ══════════════════════════════════════════════════════

describe('Config Files', () => {
  // ── ESLint configs ────────────────────────────────

  describe('Server .eslintrc.json', () => {
    const raw = readConfig('server/.eslintrc.json');

    it('should be valid JSON', () => {
      expect(raw).not.toBeNull();
      expect(() => JSON.parse(raw!)).not.toThrow();
    });

    it('should extend typescript-eslint recommended', () => {
      const config = JSON.parse(raw!);
      expect(config.extends).toContain('plugin:@typescript-eslint/recommended');
    });

    it('should have no-console rule', () => {
      const config = JSON.parse(raw!);
      expect(config.rules['no-console']).toBeDefined();
    });

    it('should ignore dist and node_modules', () => {
      const config = JSON.parse(raw!);
      expect(config.ignorePatterns).toContain('dist/');
      expect(config.ignorePatterns).toContain('node_modules/');
    });
  });

  describe('Client .eslintrc.json', () => {
    const raw = readConfig('client/.eslintrc.json');

    it('should be valid JSON', () => {
      expect(raw).not.toBeNull();
      expect(() => JSON.parse(raw!)).not.toThrow();
    });

    it('should extend react and react-hooks plugins', () => {
      const config = JSON.parse(raw!);
      expect(config.extends).toContain('plugin:react/recommended');
      expect(config.extends).toContain('plugin:react-hooks/recommended');
    });

    it('should have react version detect setting', () => {
      const config = JSON.parse(raw!);
      expect(config.settings?.react?.version).toBe('detect');
    });
  });

  // ── Prettier configs ──────────────────────────────

  describe('Server .prettierrc', () => {
    const raw = readConfig('server/.prettierrc');

    it('should be valid JSON', () => {
      expect(raw).not.toBeNull();
      expect(() => JSON.parse(raw!)).not.toThrow();
    });

    it('should use single quotes and trailing commas', () => {
      const config = JSON.parse(raw!);
      expect(config.singleQuote).toBe(true);
      expect(config.trailingComma).toBe('all');
    });

    it('should have printWidth 100', () => {
      const config = JSON.parse(raw!);
      expect(config.printWidth).toBe(100);
    });
  });

  describe('Client .prettierrc', () => {
    const raw = readConfig('client/.prettierrc');

    it('should be valid JSON', () => {
      expect(raw).not.toBeNull();
      expect(() => JSON.parse(raw!)).not.toThrow();
    });

    it('should match server config for consistency', () => {
      const serverRaw = readConfig('server/.prettierrc');
      const serverConfig = JSON.parse(serverRaw!);
      const clientConfig = JSON.parse(raw!);
      expect(clientConfig.singleQuote).toBe(serverConfig.singleQuote);
      expect(clientConfig.trailingComma).toBe(serverConfig.trailingComma);
      expect(clientConfig.printWidth).toBe(serverConfig.printWidth);
    });
  });
});

// ══════════════════════════════════════════════════════
// Package.json Script Definitions
// ══════════════════════════════════════════════════════

describe('Package Scripts', () => {
  it('should define server lint/format scripts', () => {
    const scripts = getServerScripts();
    expect(scripts.lint).toContain('eslint');
    expect(scripts['lint:fix']).toContain('--fix');
    expect(scripts.format).toContain('prettier');
    expect(scripts['format:check']).toContain('--check');
  });

  it('should define client lint/format scripts', () => {
    const scripts = getClientScripts();
    expect(scripts.lint).toContain('eslint');
    expect(scripts.lint).toContain('.tsx');
    expect(scripts.format).toContain('prettier');
  });

  it('server scripts should target src and test dirs', () => {
    const scripts = getServerScripts();
    expect(scripts.lint).toContain('src/');
    expect(scripts.lint).toContain('test/');
  });

  it('client scripts should target src dir', () => {
    const scripts = getClientScripts();
    expect(scripts.lint).toContain('src/');
  });
});
