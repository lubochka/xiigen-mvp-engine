/**
 * Secret Reference Parser — detects and parses $secret: and $env: patterns.
 *
 * Used by ConfigBuilder to identify which config values need resolution.
 *
 * Reference syntax:
 *   $secret:path/to/key          → resolved via ISecretsService
 *   $secret:path/to/key@version  → resolved via ISecretsService with version
 *   $env:VARIABLE_NAME           → resolved via process.env
 *
 * Phase 7.3: FREEDOM foundation.
 */

// ── Reference Types ──────────────────────────────────

/** A parsed $secret: reference. */
export class SecretReference {
  readonly refType = 'secret' as const;
  readonly path: string;
  readonly version: string | undefined;

  constructor(path: string, version?: string) {
    this.path = path;
    this.version = version;
  }

  get cacheKey(): string {
    if (this.version) {
      return `secret::${this.path}@${this.version}`;
    }
    return `secret::${this.path}`;
  }
}

/** A parsed $env: reference. */
export class EnvReference {
  readonly refType = 'env' as const;
  readonly variable: string;

  constructor(variable: string) {
    this.variable = variable;
  }

  get cacheKey(): string {
    return `env::${this.variable}`;
  }
}

export type AnyReference = SecretReference | EnvReference;

// ── Regex Patterns ───────────────────────────────────

const SECRET_PATTERN = /^\$secret:(.+?)(?:@(.+))?$/;
const ENV_PATTERN = /^\$env:(.+)$/;

// ── Parse Functions ──────────────────────────────────

/**
 * Parse a string value into a reference object, or null if not a reference.
 *
 * Examples:
 *   "$secret:xiigen/ai/anthropic-key"     → SecretReference(path)
 *   "$secret:xiigen/ai/key@v2"            → SecretReference(path, version)
 *   "$env:ANTHROPIC_API_KEY"              → EnvReference(variable)
 *   "just a plain string"                 → null
 */
export function parseReference(value: unknown): AnyReference | null {
  if (typeof value !== 'string') return null;

  const secretMatch = SECRET_PATTERN.exec(value);
  if (secretMatch) {
    return new SecretReference(secretMatch[1], secretMatch[2] ?? undefined);
  }

  const envMatch = ENV_PATTERN.exec(value);
  if (envMatch) {
    return new EnvReference(envMatch[1]);
  }

  return null;
}

/**
 * Quick check: is this value a $secret: or $env: reference?
 */
export function isReference(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith('$secret:') || value.startsWith('$env:');
}

// ── Reference Discovery ──────────────────────────────

/** A found reference with its location in the config tree. */
export interface FoundReference {
  /** Dot-notation path to the value in the config (e.g., "db.connection.password"). */
  readonly configPath: string;
  /** The raw string value (e.g., "$secret:xiigen/db/password"). */
  readonly rawValue: string;
  /** The parsed reference object. */
  readonly ref: AnyReference;
}

/**
 * Walk a config dict recursively and find all $secret: and $env: references.
 * Returns a list of FoundReference entries for ConfigBuilder to resolve.
 */
export function findReferences(
  config: Record<string, unknown>,
  pathPrefix: string = '',
): FoundReference[] {
  const results: FoundReference[] = [];

  function walk(obj: unknown, currentPath: string): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
        const childPath = currentPath ? `${currentPath}.${key}` : key;
        walk(val, childPath);
      }
    } else if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const childPath = `${currentPath}[${i}]`;
        walk(obj[i], childPath);
      }
    } else if (typeof obj === 'string' && isReference(obj)) {
      const ref = parseReference(obj);
      if (ref) {
        results.push({
          configPath: currentPath,
          rawValue: obj,
          ref,
        });
      }
    }
  }

  walk(config, pathPrefix);
  return results;
}
