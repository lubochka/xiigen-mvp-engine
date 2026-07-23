/**
 * All FREEDOM config keys for the Dynamic AI Decision Architecture.
 * Values come from Elasticsearch FREEDOM config documents at runtime.
 * These are the defaults used when no tenant override is present.
 */
export const GRAPH_FREEDOM_CONFIG_DEFAULTS = {
  // Provider selection
  'engine.graphRag.provider': 'elasticsearch', // 'elasticsearch' | 'lightrag' | 'pinecone+es' | 'azure-ai-search' | 'neo4j'
  'engine.embedding.provider': 'mock', // 'mock' | 'openai' | 'sentence-transformers' | 'azure'
  'engine.embedding.model': 'sentence-transformers/all-MiniLM-L6-v2',
  'engine.embedding.endpoint': 'http://embedding-svc:8080',

  // Decision thresholds
  'engine.decision.mode': 'bootstrap', // 'bootstrap' | 'ai-driven'
  'engine.decision.confidenceThreshold': 0.9, // above → graph only; below → AI pipeline
  'engine.decision.aiThreshold': 0.9, // alias for clarity

  // Graph learning
  'engine.graph.confidenceDelta': 0.05, // per-observation confidence update
  'engine.graph.minConfidence': 0.6, // below this → edge is unreliable
  'engine.graph.solidificationAt': 5, // observations to solidify a discovered edge
  'engine.graph.optionalToPromotedThreshold': 3, // OPTIONAL → PROMOTED arbiter promotion
  'engine.graph.promotedToRequiredThreshold': 5, // PROMOTED → REQUIRES_MINIMUM_ARBITER
  'engine.graph.decayWindow': 5, // recent N runs can't override accumulated history

  // Node validation
  'engine.nodeValidation.completenessThreshold': 0.75, // min AI grade for NODE to proceed to Phase B

  // FLOW-48 i18n-translation — tenant-configurable locale policy
  // (Decision 3 / MACHINE vs FREEDOM separation; all four keys are FREEDOM.)
  'i18n.defaultLocale': 'en',                 // tenant-level default locale
  'i18n.enabledLocales': ['en'] as string[],  // permitted locales for this tenant (union grows via T665)
  'i18n.autoDetectFromRegistrations': true,   // AccountCreated with acceptLanguage triggers translation request
  'i18n.module.overrides': {} as Record<string, string>, // per-module locale override {moduleSlug: 'fr' | 'he' | ...}
} as const;

export type GraphFreedomConfigKey = keyof typeof GRAPH_FREEDOM_CONFIG_DEFAULTS;
