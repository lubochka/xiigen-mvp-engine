/**
 * T367 ConsentAndEnrollmentGate [ORCHESTRATION]
 * FLOW-24: AI Safety & Content Moderation
 *
 * CF-461: Consent gate writes CONSENT_GATE entry for ALL outcomes (GRANTED/DENIED/PENDING/WITHDRAWN).
 * T368–T374 read this gate to determine downstream processing eligibility.
 * Missing CONSENT_GATE entry = fail-closed (treated as DENIED for all downstream TTs).
 *
 * Iron rules:
 *   IR-367-1: Must write CONSENT_GATE entry for ALL consent outcomes — not only GRANTED
 *   IR-367-2: storeDocument at ORDER 1 BEFORE emit
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CONSENT_GATES_INDEX = 'xiigen-consent-gates';
const CONSENT_OUTCOMES = ['GRANTED', 'DENIED', 'PENDING', 'WITHDRAWN'] as const;

type ConsentOutcome = (typeof CONSENT_OUTCOMES)[number];

@Injectable()
export class ConsentAndEnrollmentGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T367',
        serviceName: 'ConsentAndEnrollmentGateService',
        flowId: 'FLOW-24',
        familyId: 'Family-140',
      }),
    });
  }

  private getTenantId(): string {
    const tenantResult = this.tenantContext.getCurrentTenantId();
    return tenantResult.isSuccess && tenantResult.data ? tenantResult.data : 'unknown';
  }

  async evaluateConsent(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const studentId = event['studentId'] as string | undefined;
    const consentType = event['consentType'] as string | undefined;
    const consentData = event['consentData'] as Record<string, unknown> | undefined;

    if (!studentId || !consentType) {
      return DataProcessResult.failure('INVALID_INPUT', 'studentId and consentType are required');
    }

    // ── ORDER 1: Determine consent outcome ──────────────────────────────────────
    const outcome = this.determineConsentOutcome(consentData);

    // ── ORDER 2: Store CONSENT_GATE entry for ALL outcomes ─────────────────────
    const consentGateEntry: Record<string, unknown> = {
      gateType: 'CONSENT_GATE',
      studentId,
      consentType,
      outcome,
      timestamp: new Date().toISOString(),
      consentDetails: consentData ?? {},
      tenantId,
    };

    const storeResult = await this.dbFabric.storeDocument(CONSENT_GATES_INDEX, consentGateEntry);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store consent gate: ${storeResult.errorMessage}`,
      );
    }

    // ── ORDER 3: Emit outcome event ────────────────────────────────────────────
    const eventName = outcome === 'GRANTED' ? 'ConsentGranted' : 'ConsentDenied';
    await this.queueFabric.enqueue(eventName, {
      studentId,
      consentType,
      outcome,
      timestamp: consentGateEntry['timestamp'],
      tenantId,
    });

    return DataProcessResult.success({
      gateId: storeResult.data?.id ?? 'unknown',
      outcome,
      studentId,
      timestamp: consentGateEntry['timestamp'],
    });
  }

  private determineConsentOutcome(
    consentData: Record<string, unknown> | undefined,
  ): ConsentOutcome {
    if (!consentData) {
      return 'DENIED';
    }

    const consented = consentData['consented'] as boolean | undefined;
    const status = (consentData['status'] as string | undefined)?.toUpperCase();

    // Check explicit status field
    if (status && CONSENT_OUTCOMES.includes(status as ConsentOutcome)) {
      return status as ConsentOutcome;
    }

    // Check consented boolean
    if (consented === true) {
      return 'GRANTED';
    }
    if (consented === false) {
      return 'DENIED';
    }

    // Default to PENDING if uncertain
    return 'PENDING';
  }

  async checkConsentGate(
    studentId: string,
    consentType: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const searchResult = await this.dbFabric.searchDocuments(CONSENT_GATES_INDEX, {
      studentId,
      consentType,
      gateType: 'CONSENT_GATE',
    });

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure('SEARCH_FAILED', 'Failed to search consent gates');
    }

    const gateEntries = (searchResult.data ?? []) as Record<string, unknown>[];
    if (gateEntries.length === 0) {
      return DataProcessResult.success({ gateStatus: 'DENIED' }); // Fail-closed: no entry = DENIED
    }

    // Return most recent gate entry
    const latestGate = gateEntries[0];
    return DataProcessResult.success({
      gateStatus: latestGate['outcome'] ?? 'DENIED',
      gateId: latestGate['id'] ?? 'unknown',
      timestamp: latestGate['timestamp'],
    });
  }
}
