/**
 * ManifestUpdaterService — SS-03 self-sufficiency auto-updater.
 *
 * Called at Phase F completion. Updates xiigen-capability-manifest and
 * xiigen-fabric-registry with everything a flow produced:
 *   - New fabric interfaces (token + name + aliases for spec-language matching)
 *   - New task types
 *   - Flow completion status
 *
 * Phase F wiring status: DEFERRED — no Phase F completion hook exists in the
 * current codebase. This service is registered as a standalone injectable.
 * Wire into Phase F completion once FlowLifecycleManager emits a completion
 * event. Until then, run bootstrap-capability-manifest.sh after each Phase F
 * to keep the manifest current. Drift detection: manifest-drift-check.sh.
 *
 * Fail-open: errors are logged and returned, never thrown.
 * A failed manifest update does NOT block Phase F completion.
 *
 * DNA-3: never throws — returns result object.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface NewFabricInterface {
  token: string;
  name: string;
  category: string;
  /** Human-readable aliases for spec-language matching (e.g. "messaging", "queue service").
   *  Auto-derived from name if not provided; caller-provided aliases are merged in. */
  aliases?: string[];
}

export interface PhaseFOutput {
  newTaskTypes?: string[];
  newFabricInterfaces?: NewFabricInterface[];
  newNamedChecks?: string[];
  flowStatus: 'ACTIVE' | 'PARTIAL';
}

export interface ManifestUpdateResult {
  added: string[];
  updated: string[];
  errors: string[];
}

@Injectable()
export class ManifestUpdaterService {
  private readonly logger = new Logger(ManifestUpdaterService.name);
  private readonly esUrl = process.env.ES_URL || 'http://localhost:9200';

  /**
   * Called at Phase F completion. Updates the capability manifest with
   * everything this flow produced.
   *
   * Fail-open: errors are logged and returned, never thrown.
   * A failed manifest update does not block Phase F completion.
   */
  async updateAfterPhaseF(
    flowId: string,
    phaseOutput: PhaseFOutput,
  ): Promise<ManifestUpdateResult> {
    const result: ManifestUpdateResult = { added: [], updated: [], errors: [] };
    const timestamp = new Date().toISOString();

    // Update flow status in manifest
    try {
      await this.upsert('xiigen-capability-manifest', `flow-${flowId}`, {
        capability: flowId,
        type: 'FLOW_STATUS',
        status: phaseOutput.flowStatus,
        detectedAt: timestamp,
        lastVerifiedAt: timestamp,
        source: `phase-f-${flowId}`,
      });
      result.updated.push(`flow-${flowId}: ${phaseOutput.flowStatus}`);
    } catch (e) {
      result.errors.push(`Failed to update flow status: ${e}`);
    }

    // Register new fabric interfaces
    for (const iface of phaseOutput.newFabricInterfaces || []) {
      try {
        // Auto-derive human-readable alias from interface name
        const humanReadable = iface.name
          .replace(/^I/, '')
          .replace(/(?:Service|Provider|Pool)$/, '')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .toLowerCase();

        const allAliases = [
          iface.name, // IMessagingService
          iface.token, // MESSAGING_SERVICE
          humanReadable, // messaging
          ...(iface.aliases ?? []), // caller-provided alternates
        ].filter(Boolean);

        await this.upsert('xiigen-fabric-registry', iface.token, {
          interfaceToken: iface.token,
          interfaceName: iface.name,
          serviceCategory: iface.category,
          aliases: allAliases,
          status: 'ACTIVE',
          registeredAt: timestamp,
        });
        await this.upsert('xiigen-capability-manifest', iface.token, {
          capability: iface.name,
          type: 'FABRIC_INTERFACE',
          status: 'ACTIVE',
          detectedAt: timestamp,
          lastVerifiedAt: timestamp,
          source: `phase-f-${flowId}`,
        });
        result.added.push(`FABRIC: ${iface.name}`);
      } catch (e) {
        result.errors.push(`Failed to register interface ${iface.name}: ${e}`);
      }
    }

    // Register new task types
    for (const tt of phaseOutput.newTaskTypes || []) {
      try {
        await this.upsert('xiigen-capability-manifest', `tasktype-${tt}`, {
          capability: tt,
          type: 'TASK_TYPE',
          status: 'ACTIVE',
          detectedAt: timestamp,
          lastVerifiedAt: timestamp,
          source: `phase-f-${flowId}`,
        });
        result.added.push(`TASK_TYPE: ${tt}`);
      } catch (e) {
        result.errors.push(`Failed to register task type ${tt}: ${e}`);
      }
    }

    this.logger.log(
      `Manifest updated for ${flowId}: ${result.added.length} added, ` +
        `${result.updated.length} updated, ${result.errors.length} errors`,
    );

    return result;
  }

  private async upsert(index: string, id: string, doc: Record<string, unknown>): Promise<void> {
    const url = `${this.esUrl}/${index}/_update/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, doc_as_upsert: true }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ES upsert failed for ${index}/${id}: ${res.status} ${text}`);
    }
  }
}
