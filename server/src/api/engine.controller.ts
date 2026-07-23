/**
 * EngineController — API for triggering and inspecting the engine.
 *
 * POST /engine/generate       — trigger a generation from engine contract spec
 * GET  /engine/history        — list generation run history
 * GET  /engine/status         — pipeline stats (runCount, passRate, registry sizes)
 * GET  /engine/contracts      — list registered engine contracts
 * GET  /engine/contracts/:id  — get single contract
 *
 * DNA-5: tenantId from param, validated before every operation.
 *
 * Phase 9.4: API module — part 2.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { EngineContract, EngineContractParams } from '../engine-contracts/contract-schema';
import { FlowGenerator } from '../engine/flow-generator';
import { IntakePipelineService, IntakeResult } from '../engine/intake/intake-pipeline.service';
import {
  RequirementExtractorService,
  CapabilityMap,
} from '../engine/requirement-extractor/requirement-extractor.service';
import { CrudGeneratorService, CrudResult } from '../engine/crud-generator/crud-generator.service';
import {
  TestGeneratorService,
  TestGeneratorInput,
  TestGeneratorResult,
} from '../engine/test-generator/test-generator.service';
import {
  DifficultyPredictorService,
  DifficultyPredictorInput,
  DifficultyPrediction,
} from '../engine/difficulty-predictor/difficulty-predictor.service';
import { ZipArchiveProvider } from '../fabrics/code-repository/zip-archive.provider';
import { ICodeRepositoryService } from '../fabrics/interfaces/code-repository.interface';

@Injectable()
export class EngineController {
  constructor(
    private readonly engine: FlowGenerator,
    private readonly intakePipeline: IntakePipelineService,
    private readonly requirementExtractor: RequirementExtractorService,
    private readonly crudGenerator: CrudGeneratorService,
    private readonly testGenerator: TestGeneratorService,
    private readonly difficultyPredictor: DifficultyPredictorService,
  ) {}

  /**
   * POST /engine/generate — trigger a generation.
   * Body: EngineContractParams + tenantId.
   */
  async generate(
    tenantId: string,
    contractParams: EngineContractParams,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    let contract: EngineContract;
    try {
      contract = new EngineContract(contractParams);
    } catch (err) {
      return DataProcessResult.failure(
        'INVALID_CONTRACT',
        `Failed to parse contract: ${String(err)}`,
      );
    }

    const result = await this.engine.generate(contract, tenantId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }

    return DataProcessResult.success(result.data!.toDict());
  }

  /** GET /engine/history — list generation run history. */
  async history(): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    return DataProcessResult.success(this.engine.generationHistory);
  }

  /** GET /engine/status — pipeline stats. */
  async status(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({
      generation_count: this.engine.generationCount,
      factory_count: this.engine.factoryRegistry.count,
      task_type_count: this.engine.taskRegistry.count,
      promotion_count: this.engine.promotionLadder.count,
      timestamp: Date.now(),
    });
  }

  /** GET /engine/contracts — list all registered contracts. */
  async listContracts(): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    return DataProcessResult.success(this.engine.taskRegistry.listAll());
  }

  /** GET /engine/contracts/:id — get single contract. */
  async getContract(taskTypeId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!taskTypeId) {
      return DataProcessResult.failure('MISSING_ID', 'task_type_id is required');
    }
    const result = this.engine.taskRegistry.get(taskTypeId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data!.toDict());
  }

  /**
   * POST /engine/intake — run the 6-stage intake pipeline for a project.
   *
   * Accepts a ZIP file (via `zipPath` param — the uploaded file's temp path)
   * or a repository URL (`repoUrl`). Returns the PROJECT_UNDERSTANDING document.
   *
   * CF-797: PROJECT_UNDERSTANDING must be present before AF-1 Tier 1 activates.
   * CF-793: All codebase reads via ICodeRepositoryService (never direct FS access).
   */
  async intake(params: {
    projectId: string;
    zipPath?: string;
    repoUrl?: string;
  }): Promise<DataProcessResult<IntakeResult>> {
    const { projectId, zipPath, repoUrl } = params;

    if (!projectId) {
      return DataProcessResult.failure('MISSING_PROJECT_ID', 'projectId is required');
    }
    if (!zipPath && !repoUrl) {
      return DataProcessResult.failure(
        'MISSING_SOURCE',
        'Either zipPath (ZIP upload) or repoUrl is required',
      );
    }

    let repoService: ICodeRepositoryService;

    if (zipPath) {
      // ZIP upload path: create a scoped ZipArchiveProvider for this request
      const provider = new ZipArchiveProvider();
      try {
        await provider.loadArchive(zipPath);
      } catch (err) {
        return DataProcessResult.failure(
          'ZIP_LOAD_FAILED',
          `Failed to load ZIP archive: ${String(err)}`,
        );
      }
      repoService = provider;
    } else {
      // Repo URL path: provider selection from URL pattern (future work — use ZIP for now)
      return DataProcessResult.failure(
        'REPO_URL_NOT_IMPLEMENTED',
        'Remote repository URL intake not yet implemented. Use ZIP upload.',
      );
    }

    const result = await this.intakePipeline.runIntake(projectId, repoService);
    return DataProcessResult.success(result);
  }

  /**
   * POST /engine/extract-requirements — convert a natural language description
   * into a structured capability map.
   *
   * CF-805: Output must be valid JSON matching the capability map schema.
   * CF-806: Every capability archetype must be one of the defined enum values.
   */
  async extractRequirements(params: {
    description: string;
    projectId?: string;
  }): Promise<DataProcessResult<CapabilityMap>> {
    const { description, projectId } = params;

    if (!description?.trim()) {
      return DataProcessResult.failure('MISSING_DESCRIPTION', 'description is required');
    }

    try {
      const capabilityMap = await this.requirementExtractor.extract(description, projectId);
      return DataProcessResult.success(capabilityMap);
    } catch (err) {
      return DataProcessResult.failure(
        'EXTRACTION_FAILED',
        `Requirement extraction failed: ${String(err)}`,
      );
    }
  }

  /**
   * POST /engine/generate-crud — generate 5 REST endpoint handlers for a simple entity.
   *
   * CRUD generation bypasses the AF pipeline — no orchestration, no events, no SLA.
   *
   * CF-807: List endpoint must support pagination.
   * CF-808: All endpoints must validate tenantId scope.
   * CF-809: No direct database imports — IDatabaseService only.
   */
  async generateCrud(params: {
    entity: string;
    attributes: string[];
    projectId?: string;
  }): Promise<DataProcessResult<CrudResult>> {
    const { entity, attributes, projectId } = params;

    if (!entity?.trim()) {
      return DataProcessResult.failure('MISSING_ENTITY', 'entity is required');
    }

    try {
      const result = await this.crudGenerator.generate(entity, attributes ?? [], projectId);
      return DataProcessResult.success(result);
    } catch (err) {
      return DataProcessResult.failure(
        'CRUD_GENERATION_FAILED',
        `CRUD generation failed: ${String(err)}`,
      );
    }
  }

  /**
   * POST /engine/generate-tests — generate unit and integration tests for a service.
   *
   * CF-816: At least N iron rules → at least N positive + N negative tests.
   * CF-817: REGISTRATION archetype always gets concurrent race test.
   */
  async generateTests(params: TestGeneratorInput): Promise<DataProcessResult<TestGeneratorResult>> {
    if (!params.generatedCode?.trim()) {
      return DataProcessResult.failure('MISSING_CODE', 'generatedCode is required');
    }

    try {
      const result = await this.testGenerator.generate(params);
      return DataProcessResult.success(result);
    } catch (err) {
      return DataProcessResult.failure(
        'TEST_GENERATION_FAILED',
        `Test generation failed: ${String(err)}`,
      );
    }
  }

  /**
   * POST /engine/predict-difficulty — predict cycle budget for a task type.
   *
   * Queries the RAG for archetype pattern occurrence count and computes
   * a cycle budget (1-3) based on novelty factors.
   *
   * Calibrated against FLOW-03: T59→1, T60→3, T61→2, T62→2.
   */
  async predictDifficulty(
    params: DifficultyPredictorInput,
  ): Promise<DataProcessResult<DifficultyPrediction>> {
    if (!params.taskTypeId?.trim()) {
      return DataProcessResult.failure('MISSING_TASK_TYPE_ID', 'taskTypeId is required');
    }
    if (!params.archetype?.trim()) {
      return DataProcessResult.failure('MISSING_ARCHETYPE', 'archetype is required');
    }

    try {
      const result = await this.difficultyPredictor.predict(params);
      return DataProcessResult.success(result);
    } catch (err) {
      return DataProcessResult.failure(
        'DIFFICULTY_PREDICTION_FAILED',
        `Difficulty prediction failed: ${String(err)}`,
      );
    }
  }
}
