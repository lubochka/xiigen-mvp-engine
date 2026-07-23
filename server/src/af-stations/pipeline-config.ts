/**
 * Pipeline Configuration — controls station enable/disable, retries, timeouts, halt behavior.
 *
 * StationConfig: per-station settings (enabled, maxRetries, timeoutSeconds, haltOnFailure).
 * PipelineConfig: aggregate config with station map + global settings.
 *
 * Presets: default() enables all, fastMode() skips AF-6 AI review.
 *
 * Phase 8.4: JUDGMENT engine support.
 */

import { StationId } from './base';

// ── Station Config ──────────────────────────────────

export interface StationConfig {
  /** Whether this station runs in the pipeline. */
  enabled: boolean;
  /** Max retries on transient failure. */
  maxRetries: number;
  /** Timeout per execution in seconds. */
  timeoutSeconds: number;
  /** If true, pipeline halts on this station's error-level failure. */
  haltOnFailure: boolean;
}

/** Default station config: enabled, 1 retry, 30s timeout, halts on failure. */
export function defaultStationConfig(overrides?: Partial<StationConfig>): StationConfig {
  return {
    enabled: true,
    maxRetries: 1,
    timeoutSeconds: 30,
    haltOnFailure: true,
    ...overrides,
  };
}

// ── Pipeline Config ─────────────────────────────────

export class PipelineConfig {
  /** Per-station configuration map. */
  readonly stations: Map<string, StationConfig>;
  /** Halt entire pipeline on first gate failure (any station). */
  readonly haltOnFirstGateFailure: boolean;
  /** Maximum total cost allowed across all AI calls. */
  readonly maxTotalCost: number;
  /** Logging verbosity: 'debug' | 'info' | 'warn' | 'error'. */
  readonly logLevel: string;

  constructor(
    params: {
      stations?: Map<string, StationConfig>;
      haltOnFirstGateFailure?: boolean;
      maxTotalCost?: number;
      logLevel?: string;
    } = {},
  ) {
    this.stations = params.stations ?? new Map();
    this.haltOnFirstGateFailure = params.haltOnFirstGateFailure ?? true;
    this.maxTotalCost = params.maxTotalCost ?? 10.0;
    this.logLevel = params.logLevel ?? 'info';
  }

  /** Check if a station is enabled. Defaults to true if not configured. */
  isEnabled(stationId: string): boolean {
    const cfg = this.stations.get(stationId);
    return cfg ? cfg.enabled : true;
  }

  /** Check if pipeline should halt on this station's failure. */
  shouldHalt(stationId: string): boolean {
    const cfg = this.stations.get(stationId);
    return cfg ? cfg.haltOnFailure : true;
  }

  /** Get station config, or default if not configured. */
  getStationConfig(stationId: string): StationConfig {
    return this.stations.get(stationId) ?? defaultStationConfig();
  }

  /** Serialize to dict (DNA-1). */
  toDict(): Record<string, unknown> {
    const stationEntries: Record<string, unknown> = {};
    for (const [k, v] of this.stations.entries()) {
      stationEntries[k] = { ...v };
    }
    return {
      stations: stationEntries,
      halt_on_first_gate_failure: this.haltOnFirstGateFailure,
      max_total_cost: this.maxTotalCost,
      log_level: this.logLevel,
    };
  }

  // ── Presets ─────────────────────────────────────

  /** Default config: all stations enabled, halt on failure. */
  static default(): PipelineConfig {
    const stations = new Map<string, StationConfig>();
    for (const id of Object.values(StationId)) {
      stations.set(id, defaultStationConfig());
    }
    return new PipelineConfig({ stations });
  }

  /**
   * Fast mode: disables AF-6 (Code Review) to skip AI-powered review.
   * Static checks and security still run.
   */
  static fastMode(): PipelineConfig {
    const stations = new Map<string, StationConfig>();
    for (const id of Object.values(StationId)) {
      stations.set(id, defaultStationConfig());
    }
    // Disable AF-6 Code Review
    stations.set(StationId.AF6_CODE_REVIEW, defaultStationConfig({ enabled: false }));
    return new PipelineConfig({ stations, logLevel: 'warn' });
  }

  /**
   * Minimal mode: only DNA compliance + security. No scoring, no feedback.
   */
  static minimal(): PipelineConfig {
    const stations = new Map<string, StationConfig>();
    for (const id of Object.values(StationId)) {
      stations.set(id, defaultStationConfig({ enabled: false }));
    }
    // Enable only AF-7 (Compliance) and AF-8 (Security)
    stations.set(StationId.AF7_COMPLIANCE, defaultStationConfig());
    stations.set(StationId.AF8_SECURITY, defaultStationConfig());
    return new PipelineConfig({ stations, haltOnFirstGateFailure: true, logLevel: 'error' });
  }
}
