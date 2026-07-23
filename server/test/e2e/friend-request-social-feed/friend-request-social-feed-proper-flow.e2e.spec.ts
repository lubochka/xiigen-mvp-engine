/**
 * FLOW-07 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that the FLOW-07 T73-T82 design contracts satisfy the
 * FLOW-07 design simulation's iron rules. They close the loop:
 * "do the contracts we authored honour what the design simulation required?"
 *
 * DC-01: T73 ironRules contain 'inline' AND T81 reference (privacy gate first)
 * DC-02: T75 ironRules contain 'transaction' AND 'bidirectional' (both edges atomic)
 * DC-03: T77 ironRules contain 'score' AND 'passthrough' (zero-score valid)
 * DC-04: T78 ironRules contain 'independent' AND T81 reference (two-phase)
 * DC-05: T80 ironRules contain 'recompute' AND absence of 'delta' or 'increment'
 * DC-06: T81 executionModel is 'INLINE_ONLY' AND no EventPattern
 * DC-07: SocialConnectionEstablished emitted by T75 (gates on T75 only)
 * DC-08: Behaviour sim — T80 full recompute idempotency (same result on multiple calls)
 * DC-09: Behaviour sim — T77 score=0 does not return failure or skipped
 * DC-10: Behaviour sim — T78 calls T81 independently even when T76 check would pass
 *
 * Design refs: FLOW-07-DR-01..DR-06, FLOW-07-DESIGN-SIMULATION-R1
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Contract path helpers ────────────────────────────────────────────────────

const CONTRACTS_DIR = path.join(__dirname, '../../../../fixtures/contracts');

function loadContract(filename: string): Record<string, unknown> {
  const fullPath = path.join(CONTRACTS_DIR, filename);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as Record<string, unknown>;
}

function getIronRuleStrings(contract: Record<string, unknown>): string[] {
  const ironRules = contract['ironRules'];
  if (!ironRules || !Array.isArray(ironRules)) return [];
  return ironRules.map((r: unknown) => {
    if (typeof r === 'string') return r.toLowerCase();
    if (typeof r === 'object' && r !== null && 'rule' in r) {
      return String((r as Record<string, unknown>)['rule']).toLowerCase();
    }
    return '';
  });
}

// ── Behaviour simulation helpers ─────────────────────────────────────────────

/**
 * Simulates T80 MutualConnectionCounter full recompute behaviour.
 * Returns mutualCount from intersection of two adjacency lists.
 */
function simulateT80FullRecompute(
  connectionsA: string[],
  connectionsB: string[],
): DataProcessResult<{ mutualCount: number }> {
  // Full recompute — never delta
  const mutualCount = connectionsA.filter((id) => connectionsB.includes(id)).length;
  return DataProcessResult.success({ mutualCount });
}

/**
 * Simulates T77 FeedScorer — scores item, returns score for EVERY item including score=0.
 */
function simulateT77Score(
  feedItemId: string,
  score: number,
): DataProcessResult<{ feedItemId: string; score: number }> {
  // score=0 is valid — pass through regardless
  return DataProcessResult.success({ feedItemId, score });
}

/**
 * Simulates T78 FeedDeliveryOrchestrator with independent T81 call.
 */
function simulateT78Delivery(opts: {
  privacyAllowed: boolean;
  score: number;
  deliveryThreshold: number;
  t76ResultField?: boolean; // field that SHOULD NOT be trusted
}): DataProcessResult<{ deliveryStatus: 'delivered' | 'suppressed' }> {
  // T78 calls T81 INDEPENDENTLY — ignores any t76ResultField
  const privacyPassed = opts.privacyAllowed; // represents T81 independent call result

  if (!privacyPassed) {
    return DataProcessResult.success({ deliveryStatus: 'suppressed' });
  }
  if (opts.score < opts.deliveryThreshold) {
    return DataProcessResult.success({ deliveryStatus: 'suppressed' });
  }
  return DataProcessResult.success({ deliveryStatus: 'delivered' });
}

// ─────────────────────────────────────────────────────────────────────────────

describe('FLOW-07 Design Contracts', () => {
  // ── DC-01 ──────────────────────────────────────────────────────────────────
  describe('DC-01: T73 ironRules contain inline AND T81 reference (privacy gate first)', () => {
    it('T73 contract ironRules reference inline privacy gate invocation', () => {
      const contract = loadContract('t73.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/inline/);
      expect(rulesText).toMatch(/t81|privacygatekeeper/i);
    });

    it('T73 namedChecks contains privacy_gate_before_emit', () => {
      const contract = loadContract('t73.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('privacy_gate_before_emit');
    });

    it('T73 namedChecks contains store_before_enqueue (DNA-8)', () => {
      const contract = loadContract('t73.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('store_before_enqueue');
    });
  });

  // ── DC-02 ──────────────────────────────────────────────────────────────────
  describe('DC-02: T75 ironRules contain transaction AND bidirectional (both edges atomic)', () => {
    it('T75 contract ironRules reference atomic ORM transaction', () => {
      const contract = loadContract('t75.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/transaction/);
    });

    it('T75 contract ironRules reference bidirectional edges', () => {
      const contract = loadContract('t75.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/bidirectional/);
    });

    it('T75 namedChecks contains social_graph_bidirectional_atomic', () => {
      const contract = loadContract('t75.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('social_graph_bidirectional_atomic');
    });

    it('T75 namedChecks contains connection_id_direction_independent', () => {
      const contract = loadContract('t75.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('connection_id_direction_independent');
    });
  });

  // ── DC-03 ──────────────────────────────────────────────────────────────────
  describe('DC-03: T77 ironRules contain score AND passthrough (zero-score valid)', () => {
    it('T77 contract ironRules reference score passthrough', () => {
      const contract = loadContract('t77.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/score/);
      expect(rulesText).toMatch(/pass.*through|passthrough/);
    });

    it('T77 namedChecks contains feed_score_zero_passthrough', () => {
      const contract = loadContract('t77.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('feed_score_zero_passthrough');
    });

    it('T77 freedomComponents lists at least one scoring weight key', () => {
      const contract = loadContract('t77.contract.json');
      const freedomComponents = contract['freedomComponents'] as string[];
      expect(freedomComponents).toBeDefined();
      expect(freedomComponents.length).toBeGreaterThan(0);
      expect(freedomComponents.some((k) => /weight/i.test(k))).toBe(true);
    });
  });

  // ── DC-04 ──────────────────────────────────────────────────────────────────
  describe('DC-04: T78 ironRules contain independent AND T81 reference (two-phase)', () => {
    it('T78 contract ironRules reference independent T81 call', () => {
      const contract = loadContract('t78.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/independent/);
      expect(rulesText).toMatch(/t81|privacygatekeeper/i);
    });

    it('T78 namedChecks contains two_phase_privacy_independent', () => {
      const contract = loadContract('t78.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('two_phase_privacy_independent');
    });

    it('T78 namedChecks contains privacy_gate_before_emit', () => {
      const contract = loadContract('t78.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('privacy_gate_before_emit');
    });
  });

  // ── DC-05 ──────────────────────────────────────────────────────────────────
  describe('DC-05: T80 ironRules contain recompute AND absence of delta or increment', () => {
    it('T80 contract ironRules reference full recompute', () => {
      const contract = loadContract('t80.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/recompute/);
    });

    it('T80 contract ironRules explicitly prohibit delta increment', () => {
      const contract = loadContract('t80.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      // Must contain 'delta' or 'increment' as a forbidden pattern reference
      expect(rulesText).toMatch(/delta|increment/);
      // The rule must contain 'never' or 'forbidden' alongside delta
      expect(rulesText).toMatch(/never.*delta|never.*increment|delta.*forbidden/);
    });

    it('T80 namedChecks contains mutual_count_full_recompute', () => {
      const contract = loadContract('t80.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('mutual_count_full_recompute');
    });
  });

  // ── DC-06 ──────────────────────────────────────────────────────────────────
  describe('DC-06: T81 executionModel is INLINE_ONLY AND no EventPattern', () => {
    it('T81 contract executionModel is INLINE_ONLY', () => {
      const contract = loadContract('t81.contract.json');
      expect(contract['executionModel']).toBe('INLINE_ONLY');
    });

    it('T81 contract ironRules prohibit @EventPattern', () => {
      const contract = loadContract('t81.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/eventpattern|@eventpattern/i);
      // Must state it as a prohibition
      expect(rulesText).toMatch(/no.*eventpattern|eventpattern.*build_failure/i);
    });

    it('T81 namedChecks contains inline_only_no_event_pattern', () => {
      const contract = loadContract('t81.contract.json');
      const namedChecks = contract['namedChecks'] as string[];
      expect(namedChecks).toContain('inline_only_no_event_pattern');
    });

    it('T81 archetype is GUARD', () => {
      const contract = loadContract('t81.contract.json');
      expect(contract['archetype']).toBe('GUARD');
    });
  });

  // ── DC-07 ──────────────────────────────────────────────────────────────────
  describe('DC-07: SocialConnectionEstablished emitted by T75 — gates on T75 only', () => {
    it('T75 contract ironRules reference SocialConnectionEstablished emitted after graph write', () => {
      const contract = loadContract('t75.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/socialconnectionestablished/i);
    });

    it('T75 contract ironRules state T76-T78 are time-decoupled (not waited on)', () => {
      const contract = loadContract('t75.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      expect(rulesText).toMatch(/time-decoupled|decoupled|not.*wait/i);
    });

    it('SocialConnectionEstablished schema source is connection-graph-writer (T75)', () => {
      const schemaPath = path.join(
        __dirname,
        '../../../../fixtures/event-schemas/friend-request-social-feed/SocialConnectionEstablished.schema.json',
      );
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;
      expect(schema['source']).toBe('connection-graph-writer');
    });
  });

  // ── DC-08 ──────────────────────────────────────────────────────────────────
  describe('DC-08: Behaviour sim — T80 full recompute idempotency', () => {
    it('T80 same inputs produce same mutualCount on first call', () => {
      const connectionsA = ['user-2', 'user-3', 'user-4'];
      const connectionsB = ['user-1', 'user-3', 'user-5'];

      const result = simulateT80FullRecompute(connectionsA, connectionsB);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.mutualCount).toBe(1); // only user-3 is mutual
    });

    it('T80 same inputs produce same mutualCount on second call (idempotent)', () => {
      const connectionsA = ['user-2', 'user-3', 'user-4'];
      const connectionsB = ['user-1', 'user-3', 'user-5'];

      // Call twice — idempotent by full recompute
      const result1 = simulateT80FullRecompute(connectionsA, connectionsB);
      const result2 = simulateT80FullRecompute(connectionsA, connectionsB);

      expect(result1.data!.mutualCount).toBe(result2.data!.mutualCount);
    });

    it('T80 returns success even when mutualCount is 0', () => {
      const connectionsA = ['user-2', 'user-4'];
      const connectionsB = ['user-3', 'user-5'];

      const result = simulateT80FullRecompute(connectionsA, connectionsB);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.mutualCount).toBe(0);
    });

    it('T80 count only — no user ID list in output', () => {
      const connectionsA = ['user-2', 'user-3', 'user-4'];
      const connectionsB = ['user-1', 'user-3', 'user-5'];

      const result = simulateT80FullRecompute(connectionsA, connectionsB);
      expect(result.isSuccess).toBe(true);
      // Result contains mutualCount but no user ID list
      expect(result.data).toHaveProperty('mutualCount');
      expect(result.data).not.toHaveProperty('mutualUserIds');
      expect(result.data).not.toHaveProperty('sharedConnectionIds');
    });
  });

  // ── DC-09 ──────────────────────────────────────────────────────────────────
  describe('DC-09: Behaviour sim — T77 score=0 does not return failure or skipped', () => {
    it('T77 score=0 returns success with score=0 (not failure)', () => {
      const result = simulateT77Score('feed-item-001', 0);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.score).toBe(0);
    });

    it('T77 score=0 returns the feedItemId (item passes through)', () => {
      const result = simulateT77Score('feed-item-001', 0);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.feedItemId).toBe('feed-item-001');
    });

    it('T77 score=0 is same success structure as score=1', () => {
      const result0 = simulateT77Score('item-a', 0);
      const result1 = simulateT77Score('item-b', 1);

      // Both are success — same shape
      expect(result0.isSuccess).toBe(true);
      expect(result1.isSuccess).toBe(true);
      expect(Object.keys(result0.data!)).toEqual(Object.keys(result1.data!));
    });

    it('T77 all scores from 0 to 1 produce success result', () => {
      const scores = [0, 0.1, 0.5, 0.75, 1.0];
      for (const score of scores) {
        const result = simulateT77Score(`item-score-${score}`, score);
        expect(result.isSuccess).toBe(true);
        expect(result.data!.score).toBe(score);
      }
    });
  });

  // ── DC-10 ──────────────────────────────────────────────────────────────────
  describe('DC-10: Behaviour sim — T78 calls T81 independently even when T76 check would pass', () => {
    it('T78 delivers when both T76 and T81 checks pass and score above threshold', () => {
      const result = simulateT78Delivery({
        privacyAllowed: true, // T81 independent call result
        score: 0.8,
        deliveryThreshold: 0.5,
        t76ResultField: true, // T76 result — T78 ignores this
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.deliveryStatus).toBe('delivered');
    });

    it('T78 suppresses when T81 denies even if T76 would have passed', () => {
      const result = simulateT78Delivery({
        privacyAllowed: false, // T81 returns denied at delivery time
        score: 0.8,
        deliveryThreshold: 0.5,
        t76ResultField: true, // T76 had passed — T78 must NOT trust this
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.deliveryStatus).toBe('suppressed');
    });

    it('T78 suppressed result is still DataProcessResult.success (not failure)', () => {
      const result = simulateT78Delivery({
        privacyAllowed: false,
        score: 0.3,
        deliveryThreshold: 0.5,
        t76ResultField: false,
      });
      // Suppression is a valid delivery outcome — not a failure
      expect(result.isSuccess).toBe(true);
      expect(result.errorCode).toBeUndefined();
    });

    it('T78 suppresses below delivery threshold even when privacy passes', () => {
      const result = simulateT78Delivery({
        privacyAllowed: true,
        score: 0.2,
        deliveryThreshold: 0.5,
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.deliveryStatus).toBe('suppressed');
    });

    it('T78 iron rules reference independent T81 call at delivery (not T76 stale result)', () => {
      const contract = loadContract('t78.contract.json');
      const rules = getIronRuleStrings(contract);
      const rulesText = rules.join(' ');

      // Must explicitly prohibit trusting T76 cached result
      expect(rulesText).toMatch(/unconditional|t76.*irrelev|privacycheckpassedatgeneration|stale/i);
    });
  });
});
