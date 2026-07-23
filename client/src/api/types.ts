/**
 * XIIGen Client — Shared API Types
 *
 * Mirrors backend DNA patterns:
 *   DNA-3: DataProcessResult<T> — structured success/failure
 *   DNA-5: Every request carries tenantId
 *   DNA-1: Data as Record<string, unknown>
 */

// ── DNA-3: DataProcessResult<T> ─────────────────────

export interface DataProcessResult<T> {
  readonly isSuccess: boolean;
  readonly data: T | null;
  readonly error: ProcessError | null;
  readonly metadata: ResultMetadata;
}

export interface ProcessError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ResultMetadata {
  readonly timestamp: string;
  readonly traceId?: string;
  readonly duration_ms?: number;
}

export function successResult<T>(data: T, meta?: Partial<ResultMetadata>): DataProcessResult<T> {
  return {
    isSuccess: true,
    data,
    error: null,
    metadata: { timestamp: new Date().toISOString(), ...meta },
  };
}

export function failureResult<T>(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): DataProcessResult<T> {
  return {
    isSuccess: false,
    data: null,
    error: { code, message, details },
    metadata: { timestamp: new Date().toISOString() },
  };
}

// ── API Config ──────────────────────────────────────

export interface ApiRequestOptions {
  tenantId: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiConfig {
  baseUrl: string;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  defaultTenantId: string;
}

// ── Domain Types ────────────────────────────────────

export type EngineDocument = Record<string, unknown>;

export type BootstrapPhase =
  | 'secrets'
  | 'config'
  | 'database'
  | 'queue'
  | 'ai_engine'
  | 'rag'
  | 'flow_engine';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';

export type PromotionTier = 'GENERATED' | 'INJECTED' | 'MINIMAL' | 'CORE';

export type FabricType =
  | 'DATABASE'
  | 'QUEUE'
  | 'AI_ENGINE'
  | 'RAG'
  | 'CORE'
  | 'FLOW_ENGINE'
  | 'SECRETS';

export type RunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type NodeStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type TenantStatus = 'active' | 'inactive' | 'suspended';

// ── Page Names ──────────────────────────────────────

export type PageName =
  | 'Dashboard'
  | 'Designer'
  | 'Monitor'
  | 'Registry'
  | 'Ledger'
  | 'Tenants'
  | 'GenerationLab'
  | 'ModelLeaderboard'
  | 'PromptLab'
  | 'QualityDashboard';

export const PAGE_NAMES: readonly PageName[] = [
  'Dashboard',
  'Designer',
  'Monitor',
  'Registry',
  'Ledger',
  'Tenants',
  'GenerationLab',
  'ModelLeaderboard',
  'PromptLab',
  'QualityDashboard',
] as const;
