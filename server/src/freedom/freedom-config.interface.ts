// server/src/freedom/freedom-config.interface.ts
// Interface for FREEDOM config service (injected into services).
// Async get() reads config by key, returning the value record or null.

export interface IFreedomConfigService {
  get(configKey: string): Promise<Record<string, unknown> | null>;
}

export const FREEDOM_CONFIG_SERVICE = Symbol('IFreedomConfigService');
