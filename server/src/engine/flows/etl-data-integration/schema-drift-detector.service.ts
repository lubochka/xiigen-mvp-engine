/**
 * T218 SchemaDriftDetector [transform]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Compare incoming schema against baseline, score drift, quarantine or
 * proceed to approval. Drift threshold from FREEDOM config. Pipeline paused until
 * SchemaApproved received.
 *
 * Iron rules:
 *   IR-1: Drift score threshold MUST come from FREEDOM config (flow14_schema_drift_quarantine_threshold).
 *   IR-2: SchemaDriftDetected emitted for any drift above threshold.
 *   IR-3: SchemaApproved emitted after operator approval (approve() method).
 *   IR-4: Pipeline paused until SchemaApproved received.
 *   IR-5: Drift detection runs on staging zone only.
 *   IR-6: Schema version tracked on approval.
 *   IR-7: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: SchemaDriftDetected, SchemaApproved
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { FREEDOM_CONFIG_SERVICE } from '../../../freedom/freedom-config.interface';

interface IFreedomConfigService {
  get<T>(key: string, defaultValue?: T): T;
}

const SCHEMA_BASELINES_INDEX = 'xiigen-schema-baselines';
const SCHEMA_VERSIONS_INDEX = 'xiigen-schema-versions';

const DRIFT_THRESHOLD_KEY = 'flow14_schema_drift_quarantine_threshold';
const DEFAULT_DRIFT_THRESHOLD = 0.3;

export interface SchemaField {
  name: string;
  type: string;
}

export interface DriftResult {
  driftScore: number;
  addedFields: string[];
  removedFields: string[];
  typeChanges: string[];
  aboveThreshold: boolean;
}

@Injectable()
export class SchemaDriftDetectorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T218',
        serviceName: 'SchemaDriftDetectorService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  private getDriftThreshold(): number {
    return (
      this.freedomConfig?.get<number>(DRIFT_THRESHOLD_KEY, DEFAULT_DRIFT_THRESHOLD) ??
      DEFAULT_DRIFT_THRESHOLD
    );
  }

  /**
   * IR-5: Detect schema drift on incoming staging record against stored baseline.
   * IR-1: Threshold from FREEDOM config.
   * IR-2: Emit SchemaDriftDetected if above threshold.
   */
  async detect(event: Record<string, unknown>): Promise<DataProcessResult<DriftResult>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const incomingSchema = event['incomingSchema'] as SchemaField[] | undefined;

    if (!connectorId || !incomingSchema) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and incomingSchema are required',
      );
    }

    // IR-1: Load threshold from FREEDOM config
    const threshold = this.getDriftThreshold();

    // Load schema baseline
    const baselineSearch = await this.dbFabric.searchDocuments(SCHEMA_BASELINES_INDEX, {
      connectorId,
      tenantId,
    });

    let baselineFields: SchemaField[] = [];
    if (
      baselineSearch.isSuccess &&
      Array.isArray(baselineSearch.data) &&
      baselineSearch.data.length > 0
    ) {
      baselineFields =
        ((baselineSearch.data[0] as Record<string, unknown>)['fields'] as SchemaField[]) ?? [];
    } else {
      // No baseline — store incoming as first baseline, no drift
      await this.dbFabric.storeDocument(
        SCHEMA_BASELINES_INDEX,
        {
          connectorId,
          tenantId,
          knowledgeScope: 'PRIVATE',
          fields: incomingSchema,
          createdAt: new Date().toISOString(),
        },
        `baseline:${tenantId}:${connectorId}`,
      );
      return DataProcessResult.success({
        driftScore: 0,
        addedFields: [],
        removedFields: [],
        typeChanges: [],
        aboveThreshold: false,
      });
    }

    // Compare schemas
    const driftResult = this.computeDrift(baselineFields, incomingSchema);
    driftResult.aboveThreshold = driftResult.driftScore > threshold;

    if (driftResult.aboveThreshold) {
      // IR-7: storeDocument BEFORE enqueue (DNA-8)
      await this.dbFabric.storeDocument(
        SCHEMA_VERSIONS_INDEX,
        {
          connectorId,
          tenantId,
          knowledgeScope: 'PRIVATE',
          incomingSchema,
          driftScore: driftResult.driftScore,
          status: 'PENDING_APPROVAL',
          detectedAt: new Date().toISOString(),
          addedFields: driftResult.addedFields,
          removedFields: driftResult.removedFields,
          typeChanges: driftResult.typeChanges,
        },
        `drift:${tenantId}:${connectorId}:${Date.now()}`,
      );

      // IR-2: Emit SchemaDriftDetected
      await this.queueFabric.enqueue('SchemaDriftDetected', {
        connectorId,
        tenantId,
        driftScore: driftResult.driftScore,
        threshold,
        addedFields: driftResult.addedFields,
        removedFields: driftResult.removedFields,
        typeChanges: driftResult.typeChanges,
      });
    }

    return DataProcessResult.success(driftResult);
  }

  /**
   * IR-3: SchemaApproved after operator approval.
   * IR-6: Schema version tracked on approval.
   * IR-7: storeDocument BEFORE enqueue.
   */
  async approve(event: Record<string, unknown>): Promise<DataProcessResult<{ approved: boolean }>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const newSchema = event['newSchema'] as SchemaField[] | undefined;
    const approvedBy = event['approvedBy'] as string;

    if (!connectorId || !newSchema) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and newSchema are required',
      );
    }

    // IR-6: Track schema version on approval (DNA-8: store before emit)
    await this.dbFabric.storeDocument(
      SCHEMA_BASELINES_INDEX,
      {
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        fields: newSchema,
        approvedBy: approvedBy ?? 'operator',
        approvedAt: new Date().toISOString(),
        version: Date.now().toString(),
      },
      `baseline:${tenantId}:${connectorId}`,
    );

    // IR-3: Emit SchemaApproved
    await this.queueFabric.enqueue('SchemaApproved', {
      connectorId,
      tenantId,
      approvedBy: approvedBy ?? 'operator',
      approvedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({ approved: true });
  }

  /** Compute drift score and diff between baseline and incoming schemas */
  private computeDrift(baseline: SchemaField[], incoming: SchemaField[]): DriftResult {
    const baseMap = new Map(baseline.map((f) => [f.name, f.type]));
    const incomMap = new Map(incoming.map((f) => [f.name, f.type]));

    const addedFields = incoming.filter((f) => !baseMap.has(f.name)).map((f) => f.name);
    const removedFields = baseline.filter((f) => !incomMap.has(f.name)).map((f) => f.name);
    const typeChanges = baseline
      .filter((f) => incomMap.has(f.name) && incomMap.get(f.name) !== f.type)
      .map((f) => `${f.name}:${f.type}→${incomMap.get(f.name)}`);

    const totalFields = Math.max(baseline.length, incoming.length, 1);
    const changedFields = addedFields.length + removedFields.length + typeChanges.length;
    const driftScore = Math.min(changedFields / totalFields, 1.0);

    return { driftScore, addedFields, removedFields, typeChanges, aboveThreshold: false };
  }
}
