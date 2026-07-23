/**
 * Flow17IpManagementRagSeed — RAG patterns for FLOW-17 IP Management & Licensing.
 * GAP-17-03 (R4): PAT-105 EP2_PERIODIC_EVIDENCE
 * GAP-17-06 (R3): PAT-104 DB_UNIQUE_IDEMPOTENCY
 * GAP-17-07 (R6): PAT-108 DERIVED_NEVER_STORED
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow17IpManagementRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-17-ip-management-licensing';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── PAT-104: DB_UNIQUE_IDEMPOTENCY (GAP-17-06 / R3) ──────────────────
      {
        patternId: 'PAT-104',
        name: 'DB_UNIQUE_IDEMPOTENCY',
        namespace: 'token-economy',
        pattern: 'db-unique-idempotency',
        description:
          'DB-level UNIQUE constraint for financial operation idempotency (T231). ' +
          'Not Redis SETNX alone — Redis can lose data on restart. ' +
          'DB UNIQUE is durable. Financial ops need durability. INV-17-3 / DR-90 / CF-279. ' +
          'UNIQUE constraint must be on (tenantId, idempotencyKey) — per-tenant uniqueness.',
        codeExample:
          'INSERT INTO token_spends (tenantId, proposalId, idempotencyKey, amount) ' +
          'VALUES ($1, $2, $3, $4) ON CONFLICT (tenantId, idempotencyKey) DO NOTHING\n' +
          '-- Index: CREATE UNIQUE INDEX IF NOT EXISTS idx_token_spends_idempotency ' +
          'ON token_spends (tenant_id, idempotency_key);',
        negativeExample: 'const acquired = await redis.setNX(idempotencyKey, 1, EX, 86400)',
        negativeReason:
          'Redis can lose data on restart. DB UNIQUE is durable. Financial ops need durability.',
        tags: [
          'T231',
          'idempotency',
          'DB-UNIQUE',
          'token-spend',
          'financial',
          'INV-17-3',
          'CF-279',
          'SK-135',
        ],
        flowId: 'FLOW-17',
        skillRef: 'SK-135',
        designRecord: 'DR-90',
        cfRules: ['CF-279'],
        irRules: ['IR-1', 'IR-2', 'IR-3'],
        archetype: 'MARKETPLACE',
        financialOp: true,
        violation: 'score-0',
        rule: 'INV-17-3',
      },

      // ── PAT-105: EP2_PERIODIC_EVIDENCE (GAP-17-03 / R4) ──────────────────
      {
        patternId: 'PAT-105',
        name: 'EP2_PERIODIC_EVIDENCE',
        namespace: 'evidence-capture',
        pattern: 'ep2-periodic-server-triggered',
        description:
          'EP-2 server-triggered periodic evidence capture (T243) with privacy controls (CF-293/CF-294). ' +
          'Must use @Interval server-side scheduler — NEVER a client-triggered HTTP POST. ' +
          'intervalSource from FREEDOM config: work_diary.capture.interval_ms. ' +
          'Screenshots stored as external object refs (URL/key), NEVER Buffer/base64/readFileSync. ' +
          'Activity counts NUMERIC ONLY: { keystrokes: 142, clicks: 18, scrolls: 7 } — ' +
          'no keystroke content, no coordinates, no click detail arrays. ' +
          'Privacy gate: on consent.revoked, stop @Interval timer AND emit work_diary.access.denied. DR-93.',
        codeExample:
          '@Interval(600000)\nasync captureWorkDiarySlot(): Promise<void> {\n' +
          '  const intervalMs = await this.freedom.get("work_diary.capture.interval_ms");\n' +
          '  const screenshotRef = await this.F612.putRef(tenantId, slotKey); // URL/key — never Buffer\n' +
          '  const activityCounts = { keystrokes: 142, clicks: 18, scrolls: 7 }; // numeric only\n' +
          '}',
        negativeExamples: [
          '@Post("/capture") // BUILD_FAILURE CF-293: EP-2 must be server-triggered',
          'screenshot.toString("base64") // BUILD_FAILURE CF-293: inline binary forbidden',
          'keystrokes: ["ctrl+c", "h", "e"] // BUILD_FAILURE CF-294: content arrays forbidden',
        ],
        tags: [
          'T243',
          'EP-2',
          'work-diary',
          'evidence-capture',
          'server-periodic',
          'screenshot-external-ref',
          'activity-counts',
          'privacy',
          'CF-293',
          'CF-294',
          'SK-141',
        ],
        flowId: 'FLOW-17',
        skillRef: 'SK-141',
        designRecord: 'DR-93',
        cfRules: ['CF-293', 'CF-294'],
        irRules: ['IR-1', 'IR-2', 'IR-3', 'IR-4'],
        archetype: 'EVIDENCE_CAPTURE',
        triggerType: 'server-periodic-scheduled',
        privacyControls: ['consent_check', 'work_diary.access.denied event'],
        violation: 'BUILD_FAILURE',
      },

      // ── PAT-108: DERIVED_NEVER_STORED (GAP-17-07 / R6) ───────────────────
      {
        patternId: 'PAT-108',
        name: 'DERIVED_NEVER_STORED',
        namespace: 'reputation',
        pattern: 'derived-never-stored',
        description:
          'Score derived at query time from immutable journal (F581) — NEVER stored mutably (T245). ' +
          'Journal entries ARE the state. Score is a VIEW computed on demand. ' +
          'On signal received: appendJournalEntry() to F581 — no score computation at write time. ' +
          'Emit reputation.updated with signalCount: N (NOT score: 4.73). ' +
          'On score query: const journal = await F581.getJournalEntries(); return computeWeightedScore(journal). ' +
          'QG-245-1 weight 0.35 threshold 1.00.',
        codeExample:
          '// CORRECT — derived at query time:\n' +
          'async getScore(freelancerId: string): Promise<DataProcessResult<number>> {\n' +
          '  const journalResult = await this.F581.getJournalEntries(tenantId, freelancerId);\n' +
          '  const score = this.computeWeightedScore(journalResult.value);\n' +
          '  return DataProcessResult.success(score); // score returned but NEVER persisted\n' +
          '}',
        negativeExamples: [
          'await db.update("freelancer_profiles", { reputationScore: computedScore }) // score-0: stale risk',
          'createCloudEvent("reputation.updated", { score: 4.73 }) // score-0: implies downstream cache',
          'const snap = await db.get("reputation_snapshots", id) // score-0: snapshots = stored score',
        ],
        tags: [
          'T245',
          'reputation',
          'derived',
          'never-stored',
          'journal',
          'F581',
          'QG-245-1',
          'SK-143',
        ],
        flowId: 'FLOW-17',
        skillRef: 'SK-143',
        archetype: 'REPUTATION',
        qualityGate: 'QG-245-1 weight 0.35 threshold 1.00',
        violation: 'score-0',
        corePrinciple: 'Journal entries ARE the state. Score is a VIEW computed on demand.',
      },
    ];

    let count = 0;
    for (const p of patterns) {
      const result = await this.upsertPattern(p);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    return DataProcessResult.success(0);
  }
}
