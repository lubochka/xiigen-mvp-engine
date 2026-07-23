/**
 * FabricType — which fabric layer a factory resolves through.
 *
 * Every factory declares its FabricType. This is the bridge
 * between Layer 1 (Factory Pattern) and Layer 0 (Fabric Interfaces).
 *
 * 8 fabric types matching the 7 fabric modules from P1–P5 + AUTH (FLOW-01 Phase A0.5).
 *
 * Phase 6.1: Foundation type.
 * FLOW-01 Phase A0.5: added AUTH for TokenServiceFactory + PasswordHasherServiceFactory.
 */

export enum FabricType {
  DATABASE = 'database',
  QUEUE = 'queue',
  AI_ENGINE = 'ai_engine',
  RAG = 'rag',
  FLOW_ENGINE = 'flow_engine',
  CORE = 'core',
  SECRETS = 'secrets',
  AUTH = 'auth',
}

/** All valid fabric type values, for validation. */
export const ALL_FABRIC_TYPES: readonly FabricType[] = Object.values(FabricType);

/** Check if a string is a valid FabricType. */
export function isValidFabricType(value: string): value is FabricType {
  return ALL_FABRIC_TYPES.includes(value as FabricType);
}
