/**
 * HybridGenesisPrompt — Option C structure for genesis seed prompts.
 *
 * Business purpose: Separates universal iron rules (Section 1) from
 * stack-specific generation instructions (Section 4). The NestJS-specific
 * text in existing prompts ("Generate a NestJS service...") moves to
 * Section 4 entry for "node-nestjs:server". Section 1 contains only
 * business rules that any developer on any stack can apply directly.
 *
 * Section 4 is keyed by StackKey — the same open "{stackType}:{side}" map
 * as TaskTypeStackCoupling. Platform entries are first-class.
 *
 * D-STACK-2: Option C approved 2026-03-22.
 */

import type { StackKey } from './stack-coupling';

export interface HybridGenesisPrompt {
  taskType: string;
  version: string;
  flowId: string;
  flowName: string;

  /**
   * Section 1 — NEUTRAL IRON RULES
   * Delivered verbatim to every stack.
   *
   * INVARIANT: no framework names, language keywords, library calls,
   * async primitives, decorator syntax, ORM method names, or any term
   * that belongs to one technology may appear here.
   *
   * Only XIIGen vocabulary is permitted:
   *   DNA-N references, FABRIC names, FREEDOM config references,
   *   MACHINE/FREEDOM split declarations, atomic set-if-not-exists idempotency concept (IScopedMemoryService.setIfAbsent()),
   *   INJECTABLE/PLATFORM-ONLY classifications,
   *   tenantId, correlationId, idempotency key concepts.
   *
   * Test: can a developer who knows only the business domain (no specific tech)
   * read every rule and know exactly what to enforce? If yes → it belongs here.
   */
  neutralIronRules: string[];

  /**
   * Section 2 — CONCEPT DESCRIPTION
   * Plain English. What this service does for tenants.
   * No technology references. No framework names.
   */
  conceptDescription: string;

  /**
   * Section 3 — EVENT CONTRACTS (always stack-neutral)
   * CONSUMES, EMITS, INTEGRATION BOUNDARY.
   * Event names are plain strings — not TypeScript types or Python dataclasses.
   * All CONSUMES are via QUEUE FABRIC — no HTTP endpoints in this section.
   */
  eventContracts: {
    consumes: string[];
    emits: string[];
    integrationBoundary: Record<string, 'INJECTABLE' | 'PLATFORM-ONLY'>;
    note?: string;
  };

  /**
   * Section 4 — STACK IMPLEMENTATIONS
   * Keyed by StackKey: "{stackType}:{side}".
   *
   * The priority key ("node-nestjs:server") must always be present.
   * Platform entries ("jest:platform", "redis:platform") describe
   * infrastructure setup required regardless of server/client choice.
   * INCOMPATIBLE entries must have incompatibleReason and mitigation.
   */
  stackImplementations: Partial<Record<StackKey, StackImplementationEntry>>;

  /**
   * Section 5 — STATE ARCHITECTURE NOTES (optional)
   * Present only for task types with direct client interaction.
   * Keyed by StackKey for the client entries.
   * These notes feed directly into topology.json stateNotes.
   */
  clientStateNotes?: Partial<Record<StackKey, import('./stack-coupling').StateArchitectureNotes>>;
}

export interface StackImplementationEntry {
  /** The generation instruction — framework names belong here, not in Section 1. */
  generationFrame: string;
  /** Rules that apply only on this stack (platform constraints, timeout guards). */
  additionalIronRules?: string[];
  incompatible?: boolean;
  incompatibleReason?: string;
  mitigation?: string;
  degraded?: boolean;
  degradedReason?: string;
  architectureNotes?: string;
}
