/**
 * AF Stations — Base types and interfaces.
 *
 * 11 AF stations (AF-1 through AF-11) form the AI pipeline that generates code.
 * Every station takes StationInput and returns StationOutput via DataProcessResult.
 *
 * Phase 8.1: Foundation types.
 */

import { DataProcessResult } from '../kernel/data-process-result';

// ── StationId ────────────────────────────────────────

/** All 11 AF station identifiers. */
export enum StationId {
  AF1_GENESIS = 'AF-1',
  AF2_PLANNING = 'AF-2',
  AF3_PROMPT_LIBRARY = 'AF-3',
  AF4_RAG_CONTEXT = 'AF-4',
  AF5_MULTI_MODEL = 'AF-5',
  AF6_CODE_REVIEW = 'AF-6',
  AF7_COMPLIANCE = 'AF-7',
  AF8_SECURITY = 'AF-8',
  AF9_JUDGE = 'AF-9',
  AF10_MERGE = 'AF-10',
  AF11_FEEDBACK = 'AF-11',
}

// ── StationInput ─────────────────────────────────────

/**
 * Input to an AF station.
 * Accumulates context as it flows through the pipeline.
 */
export class StationInput {
  tenantId: string;
  taskType: string;
  spec: Record<string, unknown>;
  code: string;
  prompts: Array<Record<string, unknown>>;
  ragContext: Array<Record<string, unknown>>;
  planSteps: Array<Record<string, unknown>>;
  generationResults: Array<Record<string, unknown>>;
  reviewResults: Array<Record<string, unknown>>;
  scores: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
  /**
   * Z-1: Project ID for PROJECT_UNDERSTANDING lookup.
   * When present, AF-1 derives context from intake output (SESSION-O-4).
   * No stack-label strings — context comes from what the system IS.
   */
  projectId?: string;

  constructor(params: {
    tenantId: string;
    taskType?: string;
    spec?: Record<string, unknown>;
    code?: string;
    prompts?: Array<Record<string, unknown>>;
    ragContext?: Array<Record<string, unknown>>;
    planSteps?: Array<Record<string, unknown>>;
    generationResults?: Array<Record<string, unknown>>;
    reviewResults?: Array<Record<string, unknown>>;
    scores?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    projectId?: string;
  }) {
    this.tenantId = params.tenantId;
    this.taskType = params.taskType ?? '';
    this.spec = params.spec ?? {};
    this.code = params.code ?? '';
    this.prompts = params.prompts ?? [];
    this.ragContext = params.ragContext ?? [];
    this.planSteps = params.planSteps ?? [];
    this.generationResults = params.generationResults ?? [];
    this.reviewResults = params.reviewResults ?? [];
    this.scores = params.scores ?? [];
    this.metadata = params.metadata ?? {};
    this.projectId = params.projectId;
  }

  /** Deep copy for passing to next station. */
  clone(): StationInput {
    return new StationInput({
      tenantId: this.tenantId,
      taskType: this.taskType,
      spec: JSON.parse(JSON.stringify(this.spec)),
      code: this.code,
      prompts: JSON.parse(JSON.stringify(this.prompts)),
      ragContext: JSON.parse(JSON.stringify(this.ragContext)),
      planSteps: JSON.parse(JSON.stringify(this.planSteps)),
      generationResults: JSON.parse(JSON.stringify(this.generationResults)),
      reviewResults: JSON.parse(JSON.stringify(this.reviewResults)),
      scores: JSON.parse(JSON.stringify(this.scores)),
      metadata: JSON.parse(JSON.stringify(this.metadata)),
    });
  }
}

// ── StationOutput ────────────────────────────────────

/** Output from an AF station. */
export class StationOutput {
  readonly stationId: string;
  readonly success: boolean;
  readonly data: Record<string, unknown>;
  readonly errors: string[];
  readonly warnings: string[];
  readonly elapsedMs: number;

  constructor(params: {
    stationId: string;
    success: boolean;
    data?: Record<string, unknown>;
    errors?: string[];
    warnings?: string[];
    elapsedMs?: number;
  }) {
    this.stationId = params.stationId;
    this.success = params.success;
    this.data = params.data ?? {};
    this.errors = params.errors ?? [];
    this.warnings = params.warnings ?? [];
    this.elapsedMs = params.elapsedMs ?? 0;
  }

  /** Serialize to dict (DNA-1: snake_case). */
  toDict(): Record<string, unknown> {
    return {
      station_id: this.stationId,
      success: this.success,
      data: this.data,
      errors: [...this.errors],
      warnings: [...this.warnings],
      elapsed_ms: this.elapsedMs,
    };
  }
}

// ── IAfStation ───────────────────────────────────────

/** Interface for all AF stations. */
export abstract class IAfStation {
  abstract readonly stationId: StationId;

  abstract execute(input: StationInput): Promise<DataProcessResult<StationOutput>>;

  get name(): string {
    return this.stationId;
  }
}
