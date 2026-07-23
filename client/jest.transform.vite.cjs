/**
 * Vite-shim Jest transformer — FLOW-01 Phase A6 / GR-001 remediation.
 *
 * Problem: `ts-jest` compiles TypeScript to CommonJS. Any source file using
 * Vite-specific `import.meta.env.*` or `import.meta.glob(...)` syntax hits a
 * `SyntaxError: Cannot use 'import.meta' outside a module` at parse time.
 * Before this transformer existed, 11 client jest suites failed for that
 * reason alone (the files in question were transitively imported by routing,
 * feature-registry, push, history-bootstrap, rag-quality, and other test
 * fixtures). This violates GR-001 (zero tech debt, no pre-existing carve-out).
 *
 * Fix: rewrite the Vite-only constructs into Jest-safe equivalents BEFORE
 * ts-jest parses the source, then delegate to the standard ts-jest
 * transformer. The rewrites are behavior-preserving for test context:
 *
 *   import.meta.env.DEV                     → true   (tests behave as dev build)
 *   import.meta.env.VITE_BUILD_HASH         → 'test'
 *   import.meta.env.VITE_*                  → ''
 *   import.meta.env.<OTHER_UPPER_SNAKE>     → ''
 *   import.meta.glob('./pattern', {...})    → ({})   (empty map; tests that
 *                                                     need real fixtures must
 *                                                     mock the consumer module)
 *
 * Production code paths are unchanged — Vite's own transformer handles the
 * real substitutions during `vite build` and `vite dev`. This shim only
 * affects Jest.
 */

'use strict';

const tsJest = require('ts-jest');

// ts-jest v29 exposes createTransformer under `.default`. Support either
// shape so a future ts-jest bump that promotes the export does not break.
const createTransformer =
  (tsJest.default && tsJest.default.createTransformer) ||
  tsJest.createTransformer;

const tsJestTransformer = createTransformer({
  tsconfig: 'tsconfig.json',
  useESM: false,
});

/**
 * Rewrite Vite-only `import.meta.*` constructs in source text to Jest-safe
 * equivalents. Scoped to source files — the ts-jest transformer applies
 * after this rewrite.
 */
function shimViteImportMeta(src) {
  if (typeof src !== 'string') return src;
  if (!src.includes('import.meta')) return src;

  return (
    src
      // import.meta.glob('./locales/en/*.json', { eager: true }) → ({})
      // (strip the full glob call and any trailing `as T` cast)
      .replace(
        /import\.meta\.glob\s*\([^)]*\)(\s*as\s+[^;)\n]+)?/g,
        '({})',
      )
      // import.meta.env.DEV → true (dev-only banners render in tests)
      .replace(/import\.meta\.env\.DEV\b/g, 'true')
      // import.meta.env.PROD → false
      .replace(/import\.meta\.env\.PROD\b/g, 'false')
      // import.meta.env.MODE → 'test'
      .replace(/import\.meta\.env\.MODE\b/g, "'test'")
      // import.meta.env.BASE_URL → '/'
      .replace(/import\.meta\.env\.BASE_URL\b/g, "'/'")
      // import.meta.env.VITE_BUILD_HASH → 'test'
      .replace(/import\.meta\.env\.VITE_BUILD_HASH\b/g, "'test'")
      // Any other VITE_* or UPPER_SNAKE env var → '' (safe empty string)
      .replace(/import\.meta\.env\.([A-Z][A-Z0-9_]*)\b/g, "''")
      // Bare `import.meta.env` reads (rare) → empty object
      .replace(/import\.meta\.env\b/g, '({})')
  );
}

module.exports = {
  canInstrument: tsJestTransformer.canInstrument,
  process(src, filename, options) {
    return tsJestTransformer.process(
      shimViteImportMeta(src),
      filename,
      options,
    );
  },
  processAsync(src, filename, options) {
    if (typeof tsJestTransformer.processAsync === 'function') {
      return tsJestTransformer.processAsync(
        shimViteImportMeta(src),
        filename,
        options,
      );
    }
    return tsJestTransformer.process(
      shimViteImportMeta(src),
      filename,
      options,
    );
  },
  getCacheKey(src, filename, options) {
    return tsJestTransformer.getCacheKey(
      shimViteImportMeta(src),
      filename,
      options,
    );
  },
  getCacheKeyAsync(src, filename, options) {
    if (typeof tsJestTransformer.getCacheKeyAsync === 'function') {
      return tsJestTransformer.getCacheKeyAsync(
        shimViteImportMeta(src),
        filename,
        options,
      );
    }
    return tsJestTransformer.getCacheKey(
      shimViteImportMeta(src),
      filename,
      options,
    );
  },
};

// Expose the pure shim for unit tests.
module.exports.__shimViteImportMeta = shimViteImportMeta;
