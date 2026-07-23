/**
 * P5.1 Tests — RAG Base Types + Flow Engine Base Types
 *
 * Validates: RagStrategy (7), RagConfig, FlowNodeType (10), FlowConfig, FlowStatus re-export.
 * Pattern: Same structure as base-types.spec.ts (P2.1) and ai-engine-base.spec.ts (P4.1).
 */

import {
  RagStrategy,
  ALL_RAG_STRATEGIES,
  RagConfig,
  defaultRagConfig,
  isValidStrategy,
  ragConfigToDict,
} from '../../src/fabrics/rag/base';

import {
  FlowNodeType,
  ALL_FLOW_NODE_TYPES,
  FlowConfig,
  defaultFlowConfig,
  FlowStatus,
  isValidNodeType,
  flowConfigToDict,
  isWaitingNodeType,
  isParallelNodeType,
} from '../../src/fabrics/flow-engine/base';

// ═══════════════════════════════════════════════════════
// RAG Strategy Enum
// ═══════════════════════════════════════════════════════

describe('RagStrategy', () => {
  it('should have exactly 7 strategies', () => {
    expect(ALL_RAG_STRATEGIES).toHaveLength(7);
  });

  it.each([
    ['VECTOR', 'vector'],
    ['GRAPH', 'graph'],
    ['HYBRID', 'hybrid'],
    ['SPLIT', 'split'],
    ['FAN_OUT', 'fan_out'],
    ['TIERED', 'tiered'],
    ['MULTI', 'multi'],
  ])('should have %s = "%s"', (key, value) => {
    expect(RagStrategy[key as keyof typeof RagStrategy]).toBe(value);
  });

  it('should have unique values (no duplicates)', () => {
    const values = Object.values(RagStrategy);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ═══════════════════════════════════════════════════════
// RAG Config
// ═══════════════════════════════════════════════════════

describe('RagConfig', () => {
  describe('defaultRagConfig()', () => {
    it('should return sensible defaults', () => {
      const config = defaultRagConfig();
      expect(config.strategy).toBe(RagStrategy.VECTOR);
      expect(config.defaultTopK).toBe(10);
      expect(config.similarityThreshold).toBe(0.7);
      expect(config.maxContextTokens).toBe(4096);
      expect(config.provider).toBe('in_memory');
      expect(config.options).toEqual({});
    });

    it('should allow partial overrides', () => {
      const config = defaultRagConfig({
        strategy: RagStrategy.HYBRID,
        defaultTopK: 20,
      });
      expect(config.strategy).toBe(RagStrategy.HYBRID);
      expect(config.defaultTopK).toBe(20);
      // Non-overridden fields keep defaults
      expect(config.similarityThreshold).toBe(0.7);
      expect(config.maxContextTokens).toBe(4096);
    });

    it('should have no undefined fields', () => {
      const config = defaultRagConfig();
      for (const [key, value] of Object.entries(config)) {
        expect(value).not.toBeUndefined();
      }
    });
  });

  describe('isValidStrategy()', () => {
    it('should accept all 7 valid strategies', () => {
      for (const strategy of ALL_RAG_STRATEGIES) {
        expect(isValidStrategy(strategy)).toBe(true);
      }
    });

    it('should reject invalid strategies', () => {
      expect(isValidStrategy('nonexistent')).toBe(false);
      expect(isValidStrategy('')).toBe(false);
      expect(isValidStrategy('VECTOR')).toBe(false); // uppercase
    });
  });

  describe('ragConfigToDict() — DNA-1 compliance', () => {
    it('should serialize to snake_case dict', () => {
      const config = defaultRagConfig({ strategy: RagStrategy.GRAPH });
      const dict = ragConfigToDict(config);
      expect(dict['strategy']).toBe('graph');
      expect(dict['default_top_k']).toBe(10);
      expect(dict['similarity_threshold']).toBe(0.7);
      expect(dict['max_context_tokens']).toBe(4096);
      expect(dict['provider']).toBe('in_memory');
      expect(dict['options']).toEqual({});
    });
  });
});

// ═══════════════════════════════════════════════════════
// FlowNodeType Enum
// ═══════════════════════════════════════════════════════

describe('FlowNodeType', () => {
  it('should have exactly 10 node types', () => {
    expect(ALL_FLOW_NODE_TYPES).toHaveLength(10);
  });

  it.each([
    ['START', 'start'],
    ['END', 'end'],
    ['TASK', 'task'],
    ['DECISION', 'decision'],
    ['PARALLEL_SPLIT', 'parallel_split'],
    ['PARALLEL_JOIN', 'parallel_join'],
    ['HUMAN_APPROVAL', 'human_approval'],
    ['AI_GENERATION', 'ai_generation'],
    ['QUEUE_EVENT', 'queue_event'],
    ['SUBFLOW', 'subflow'],
  ])('should have %s = "%s"', (key, value) => {
    expect(FlowNodeType[key as keyof typeof FlowNodeType]).toBe(value);
  });

  it('should have unique values (no duplicates)', () => {
    const values = Object.values(FlowNodeType);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ═══════════════════════════════════════════════════════
// FlowConfig
// ═══════════════════════════════════════════════════════

describe('FlowConfig', () => {
  describe('defaultFlowConfig()', () => {
    it('should return sensible defaults', () => {
      const config = defaultFlowConfig();
      expect(config.maxConcurrentRuns).toBe(10);
      expect(config.nodeTimeoutSeconds).toBe(300);
      expect(config.maxRetriesPerNode).toBe(3);
      expect(config.enableAuditTrail).toBe(true);
      expect(config.maxDagDepth).toBe(50);
      expect(config.options).toEqual({});
    });

    it('should allow partial overrides', () => {
      const config = defaultFlowConfig({
        maxConcurrentRuns: 20,
        enableAuditTrail: false,
      });
      expect(config.maxConcurrentRuns).toBe(20);
      expect(config.enableAuditTrail).toBe(false);
      // Non-overridden fields keep defaults
      expect(config.nodeTimeoutSeconds).toBe(300);
      expect(config.maxRetriesPerNode).toBe(3);
    });

    it('should have no undefined fields', () => {
      const config = defaultFlowConfig();
      for (const [key, value] of Object.entries(config)) {
        expect(value).not.toBeUndefined();
      }
    });
  });

  describe('isValidNodeType()', () => {
    it('should accept all 10 valid node types', () => {
      for (const nodeType of ALL_FLOW_NODE_TYPES) {
        expect(isValidNodeType(nodeType)).toBe(true);
      }
    });

    it('should reject invalid node types', () => {
      expect(isValidNodeType('nonexistent')).toBe(false);
      expect(isValidNodeType('')).toBe(false);
      expect(isValidNodeType('START')).toBe(false); // uppercase
    });
  });

  describe('flowConfigToDict() — DNA-1 compliance', () => {
    it('should serialize to snake_case dict', () => {
      const config = defaultFlowConfig({ maxConcurrentRuns: 50 });
      const dict = flowConfigToDict(config);
      expect(dict['max_concurrent_runs']).toBe(50);
      expect(dict['node_timeout_seconds']).toBe(300);
      expect(dict['max_retries_per_node']).toBe(3);
      expect(dict['enable_audit_trail']).toBe(true);
      expect(dict['max_dag_depth']).toBe(50);
      expect(dict['options']).toEqual({});
    });
  });
});

// ═══════════════════════════════════════════════════════
// FlowStatus Re-export
// ═══════════════════════════════════════════════════════

describe('FlowStatus (re-export from base)', () => {
  it('should be accessible from flow-engine/base', () => {
    expect(FlowStatus).toBeDefined();
    expect(FlowStatus.RUNNING).toBe('running');
    expect(FlowStatus.PAUSED).toBe('paused');
    expect(FlowStatus.COMPLETED).toBe('completed');
    expect(FlowStatus.FAILED).toBe('failed');
    expect(FlowStatus.CANCELLED).toBe('cancelled');
  });

  it('should have exactly 5 statuses', () => {
    expect(Object.values(FlowStatus)).toHaveLength(5);
  });
});

// ═══════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════

describe('FlowNodeType helpers', () => {
  describe('isWaitingNodeType()', () => {
    it('should return true for HUMAN_APPROVAL', () => {
      expect(isWaitingNodeType(FlowNodeType.HUMAN_APPROVAL)).toBe(true);
    });

    it('should return true for QUEUE_EVENT', () => {
      expect(isWaitingNodeType(FlowNodeType.QUEUE_EVENT)).toBe(true);
    });

    it('should return false for TASK', () => {
      expect(isWaitingNodeType(FlowNodeType.TASK)).toBe(false);
    });

    it('should return false for START', () => {
      expect(isWaitingNodeType(FlowNodeType.START)).toBe(false);
    });
  });

  describe('isParallelNodeType()', () => {
    it('should return true for PARALLEL_SPLIT', () => {
      expect(isParallelNodeType(FlowNodeType.PARALLEL_SPLIT)).toBe(true);
    });

    it('should return true for PARALLEL_JOIN', () => {
      expect(isParallelNodeType(FlowNodeType.PARALLEL_JOIN)).toBe(true);
    });

    it('should return false for TASK', () => {
      expect(isParallelNodeType(FlowNodeType.TASK)).toBe(false);
    });
  });
});
