/**
 * FLOW-15 Named Checks — 8 security and architectural correctness checks.
 * V1-1_F15 (R3): Populated per SESSION-GAP-R3.
 *
 * All 8 checks registered with globalNamedCheckRegistry at module init.
 */
import { NamedCheckFn, globalNamedCheckRegistry } from '../named-check-registry';

export const flow15NamedChecks: Record<string, NamedCheckFn> = {
  oauth_pkce_per_exchange_verifier: async (ctx) => {
    const code = String(ctx.generatedCode ?? ctx.source ?? '');
    const staticPatterns = [/hash\(.*userId/i, /sha256\(.*userId/i, /md5\(.*userId/i];
    if (staticPatterns.some((p) => p.test(code))) return false;
    return /crypto\.randomBytes\((32|64)\)/.test(code);
  },

  timing_safe_hmac_comparison: async (ctx) => {
    const code = String(ctx.comparisonCode ?? ctx.source ?? '');
    if (/sig\w*\s*={2,3}\s*sig\w*/.test(code)) return false;
    if (/hmac\w*\s*={2,3}\s*hmac\w*/i.test(code)) return false;
    return /crypto\.timingSafeEqual/.test(code);
  },

  circuit_breaker_state_from_event_log: async (ctx) => {
    const code = String(ctx.stateUpdateCode ?? ctx.source ?? '');
    if (/db\.(update|set)\s*\(\s*\{.*state/i.test(code)) return false;
    if (/setState\s*\(/.test(code)) return false;
    return (
      /events\s*\.\s*reduce\s*\(/.test(code) ||
      /applyTransition\s*\(/.test(code) ||
      /replay/.test(code)
    );
  },

  dns_before_ssl_ordering: async (ctx) => {
    const steps = Array.isArray(ctx.steps) ? ctx.steps : [];
    const dnsIdx = steps.findIndex((s: unknown) => String(s).toLowerCase().includes('dns'));
    const sslIdx = steps.findIndex(
      (s: unknown) =>
        String(s).toLowerCase().includes('ssl') || String(s).toLowerCase().includes('certificate'),
    );
    if (dnsIdx === -1 || sslIdx === -1) return false;
    return dnsIdx < sslIdx;
  },

  github_sync_cursor_postgresql_not_redis: async (ctx) => {
    const code = String(ctx.cursorStoreCode ?? ctx.source ?? '');
    if (/redis\.(set|setEx|hset)\s*\(.*cursor/i.test(code)) return false;
    if (/redis\.(set|setEx|hset)\s*\(.*syncCursor/i.test(code)) return false;
    return (
      /\.update\s*\(.*syncCursor/i.test(code) ||
      /knex\s*\(.*cursor/i.test(code) ||
      /repository\.(save|update)/i.test(code)
    );
  },

  byok_rotation_creates_new_version_not_overwrites: async (ctx) => {
    const code = String(ctx.rotationCode ?? ctx.source ?? '');
    if (/key\.(update|overwrite|set)\s*\(/i.test(code)) return false;
    if (/\.update\s*\(\s*\{.*key/i.test(code)) return false;
    return /\.createVersion\s*\(/.test(code) || /createKeyVersion\s*\(/.test(code);
  },

  vault_isolation_flow15: async (ctx) => {
    const factoryRef = String(ctx.vaultFactory ?? ctx.factoryId ?? '');
    if (/F_SECRETS_VAULT/.test(factoryRef)) return false;
    if (/flow.?14.*vault/i.test(factoryRef)) return false;
    return /F_OAUTH_TOKEN_SERVICE/.test(factoryRef) || /F528/.test(factoryRef) || factoryRef === '';
  },

  silo_graduation_one_way: async (ctx) => {
    const code = String(ctx.graduationCode ?? ctx.source ?? '');
    const steps = Array.isArray(ctx.steps) ? ctx.steps : [];
    if (/downgrade|revert.*silo|rollback.*graduation/i.test(code)) return false;
    if (steps.some((s: unknown) => /downgrade|revert/i.test(String(s)))) return false;
    return true;
  },
};

// Register FLOW-15 named checks with the global registry at module init.
globalNamedCheckRegistry.registerFlow('FLOW-15', flow15NamedChecks);
