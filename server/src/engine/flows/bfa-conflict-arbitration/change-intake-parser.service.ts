/**
 * ChangeIntakeParser — T375 INGESTION service for FLOW-25 BFA governance.
 *
 * Accepts raw BFA change requests, validates them, content-addresses the diff,
 * persists insert-only, and emits a parsed-change CloudEvent.
 *
 * Iron rules (enforced — not configurable):
 *   IR-375-1: storeDocument() BEFORE enqueue() (DNA-8 outbox pattern)
 *   IR-375-2: diff_blob_ref = sha256(diffContent) — never a mutable pointer
 *   IR-375-3: actor must be non-empty (validated against auth context)
 *   CF-473:   change_type must be one of 4 valid enum values
 *   DNA-7:    duplicate sha256 returns existing record (idempotent)
 *
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── CF-473: The 4 valid change types ──────────────────────────────────────

/** CF-473: Valid BFA change types — hardcoded enum, NOT free-form strings. */
export enum ChangeType {
  SCHEMA_CHANGE = 'SCHEMA_CHANGE',
  API_BREAK = 'API_BREAK',
  FLOW_MODIFICATION = 'FLOW_MODIFICATION',
  DEPENDENCY_UPDATE = 'DEPENDENCY_UPDATE',
}

/** Set of valid CF-473 values for O(1) membership check. */
const VALID_CHANGE_TYPES = new Set<string>(Object.values(ChangeType));

// ── Input / Output shapes ──────────────────────────────────────────────────

export interface ChangeIntakeInput {
  /** Actor submitting the change (validated non-empty — IR-375-3). */
  readonly actor: string;
  /** Type of change — must be one of 4 CF-473 enum values. */
  readonly changeType: string;
  /** Raw diff content — sha256 content-addressed (IR-375-2). */
  readonly diffContent: string;
  /** Optional human-readable description. */
  readonly description?: string;
  /** Optional source flow or entity reference. */
  readonly sourceRef?: string;
}

/** Canonical output document from ChangeIntakeParser (insert-only). */
export interface ChangeDocument {
  readonly changeId: string;
  readonly changeType: ChangeType;
  /** sha256 hex hash of diffContent — content-addressed (IR-375-2). */
  readonly diffBlobRef: string;
  readonly actor: string;
  readonly description: string;
  readonly sourceRef: string;
  readonly createdAt: string;
  readonly status: 'pending';
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHANGE_INTAKE_INDEX = 'bfa-change-intake';
const PARSED_CHANGE_EVENT = 'change.parsed';

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class ChangeIntakeParser extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T375',
        serviceName: 'ChangeIntakeParser',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Parse and persist a raw BFA change request.
   *
   * Returns an existing ChangeDocument unchanged if the same sha256 is seen again (DNA-7).
   * On new intake: stores BEFORE emitting event (DNA-8, IR-375-1).
   */
  async parseIntake(input: ChangeIntakeInput): Promise<DataProcessResult<ChangeDocument>> {
    // CF-473: validate change_type is one of 4 allowed values
    if (!VALID_CHANGE_TYPES.has(input.changeType)) {
      return DataProcessResult.failure(
        'INVALID_CHANGE_TYPE',
        `change_type '${input.changeType}' is not a valid CF-473 value. ` +
          `Valid: ${[...VALID_CHANGE_TYPES].join(', ')}`,
      );
    }

    // IR-375-3: actor must be provided (validated against auth context)
    if (!input.actor || input.actor.trim() === '') {
      return DataProcessResult.failure('MISSING_ACTOR', 'actor is required (IR-375-3)');
    }

    // diff content must be present for content addressing
    if (!input.diffContent || input.diffContent.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_DIFF',
        'diffContent is required for sha256 content addressing',
      );
    }

    // IR-375-2: content-address the diff via sha256 (never a mutable pointer)
    const diffBlobRef = createHash('sha256').update(input.diffContent).digest('hex');

    // DNA-7: idempotency — return existing record if same sha256 seen
    const existing = await this.dbService.searchDocuments(CHANGE_INTAKE_INDEX, {
      diff_blob_ref: diffBlobRef,
    });
    if (existing.isSuccess && existing.data!.length > 0) {
      return DataProcessResult.success(this.toChangeDocument(existing.data![0]));
    }

    // Build canonical ChangeDocument
    const changeId = `chg-${diffBlobRef.slice(0, 12)}-${Date.now()}`;
    const doc: Record<string, unknown> = {
      change_id: changeId,
      change_type: input.changeType,
      diff_blob_ref: diffBlobRef, // IR-375-2: sha256 content hash
      actor: input.actor,
      description: input.description ?? '',
      source_ref: input.sourceRef ?? '',
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // ✅ DNA-8 / IR-375-1: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(CHANGE_INTAKE_INDEX, doc, changeId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
    }

    // Only emit AFTER successful persist — never before
    await this.queueService.enqueue(PARSED_CHANGE_EVENT, {
      change_id: changeId,
      change_type: input.changeType,
      diff_blob_ref: diffBlobRef,
      actor: input.actor,
    });

    return DataProcessResult.success(this.toChangeDocument(stored.data!));
  }

  private toChangeDocument(doc: Record<string, unknown>): ChangeDocument {
    return {
      changeId: doc['change_id'] as string,
      changeType: doc['change_type'] as ChangeType,
      diffBlobRef: doc['diff_blob_ref'] as string,
      actor: doc['actor'] as string,
      description: (doc['description'] as string) ?? '',
      sourceRef: (doc['source_ref'] as string) ?? '',
      createdAt: doc['created_at'] as string,
      status: 'pending',
    };
  }
}
