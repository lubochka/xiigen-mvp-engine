/**
 * XIIGen Client — Endpoint Registry
 *
 * Fabric-first: endpoints resolved from config, never hardcoded.
 * Includes original endpoints + new P9 engine/tenant/health endpoints.
 */

export interface EndpointDefinition {
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly description: string;
  readonly fabric: string;
}

export const ENDPOINTS = {
  // ── Health (P9) ──
  healthLive: {
    path: '/health/live',
    method: 'GET' as const,
    description: 'Liveness probe',
    fabric: 'CORE',
  },
  healthReady: {
    path: '/health/ready',
    method: 'GET' as const,
    description: 'Readiness probe',
    fabric: 'CORE',
  },
  healthStatus: {
    path: '/health/status',
    method: 'GET' as const,
    description: 'Full fabric health',
    fabric: 'CORE',
  },

  // ── Tenants (P9) ──
  tenantCreate: {
    path: '/tenants',
    method: 'POST' as const,
    description: 'Create tenant',
    fabric: 'CORE',
  },
  tenantList: {
    path: '/tenants',
    method: 'GET' as const,
    description: 'List tenants',
    fabric: 'CORE',
  },
  tenantById: {
    path: '/tenants/:id',
    method: 'GET' as const,
    description: 'Get tenant by ID',
    fabric: 'CORE',
  },
  tenantConfig: {
    path: '/tenants/:id/config',
    method: 'PUT' as const,
    description: 'Update tenant config',
    fabric: 'CORE',
  },
  tenantKeys: {
    path: '/tenants/:id/keys',
    method: 'PUT' as const,
    description: 'Set tenant API keys',
    fabric: 'CORE',
  },
  tenantQuotas: {
    path: '/tenants/:id/quotas',
    method: 'PUT' as const,
    description: 'Set tenant quotas',
    fabric: 'CORE',
  },
  tenantDelete: {
    path: '/tenants/:id',
    method: 'DELETE' as const,
    description: 'Deactivate tenant',
    fabric: 'CORE',
  },
  // Turn 4 (MVP Plan v3, Goal 3) — admin reads target tenant's flow topologies
  // via deliberate CLS scope switch. Backend writes an xiigen-admin-audit
  // record before the switch. Requires caller context to be MASTER_TENANT_ID.
  tenantFlows: {
    path: '/api/tenants/:id/flows',
    method: 'GET' as const,
    description: 'Admin: list flows for a specific tenant (scope switch + audit)',
    fabric: 'FLOW_ENGINE',
  },

  // ── Engine (P9) ──
  engineGenerate: {
    path: '/engine/generate',
    method: 'POST' as const,
    description: 'Trigger generation',
    fabric: 'AI_ENGINE',
  },
  engineHistory: {
    path: '/engine/history',
    method: 'GET' as const,
    description: 'Generation history',
    fabric: 'CORE',
  },
  engineStatus: {
    path: '/engine/status',
    method: 'GET' as const,
    description: 'Engine stats',
    fabric: 'CORE',
  },
  engineContracts: {
    path: '/engine/contracts',
    method: 'GET' as const,
    description: 'List contracts',
    fabric: 'CORE',
  },
  engineContract: {
    path: '/engine/contracts/:id',
    method: 'GET' as const,
    description: 'Get contract',
    fabric: 'CORE',
  },

  // ── Registry ──
  registryFamilies: {
    path: '/api/registry/families',
    method: 'GET' as const,
    description: 'List families',
    fabric: 'DATABASE',
  },
  registryFactories: {
    path: '/api/registry/factories',
    method: 'GET' as const,
    description: 'List factories',
    fabric: 'DATABASE',
  },
  registryFactoryDetail: {
    path: '/api/registry/factories/:factoryId',
    method: 'GET' as const,
    description: 'Factory detail',
    fabric: 'DATABASE',
  },
  registryCounts: {
    path: '/api/registry/counts',
    method: 'GET' as const,
    description: 'Registry counts',
    fabric: 'DATABASE',
  },

  // ── Flow Definitions ──
  flowDefinitions: {
    path: '/api/flows/definitions',
    method: 'GET' as const,
    description: 'List flow definitions',
    fabric: 'FLOW_ENGINE',
  },
  flowDefinitionById: {
    path: '/api/flows/definitions/:flowId',
    method: 'GET' as const,
    description: 'Get flow definition',
    fabric: 'FLOW_ENGINE',
  },
  flowDefinitionSave: {
    path: '/api/flows/definitions',
    method: 'POST' as const,
    description: 'Save flow definition',
    fabric: 'FLOW_ENGINE',
  },
  // Track 0 Turn 6: fork a GLOBAL template → PRIVATE tenant flow
  flowDefinitionFork: {
    path: '/api/flows/definitions/:flowId/fork',
    method: 'POST' as const,
    description: 'Fork GLOBAL template to PRIVATE tenant flow',
    fabric: 'FLOW_ENGINE',
  },
  // Turn 5 (MVP Plan v3, Goal 4a) — structural editing of DRAFT topologies.
  flowDefinitionNodes: {
    path: '/api/flows/definitions/:flowId/nodes',
    method: 'PUT' as const,
    description: 'Replace nodes+edges of a DRAFT flow (IR-ADAPT-1: DRAFT only)',
    fabric: 'FLOW_ENGINE',
  },
  // Turn 5 (MVP Plan v3) — FREEDOM config swap is now implemented (PUT).
  // The previous 501 POST stub is replaced; clients must use PUT.
  flowDefinitionFreedom: {
    path: '/api/flows/definitions/:flowId/freedom',
    method: 'PUT' as const,
    description: 'Swap FREEDOM config for a DRAFT flow',
    fabric: 'FLOW_ENGINE',
  },
  // Track 0 Turn 8 (v15 Finding S): new CycleChain entry endpoint for RunFlowPage
  cycleChainRun: {
    path: '/api/cycle-chain/run',
    method: 'POST' as const,
    description: 'Run CycleChain (user intent → plan/nodes/topology)',
    fabric: 'AI_ENGINE',
  },

  // Turn 6 (MVP Plan v3, Goals 4b + 4c + 4d) — marketplace browse + install.
  marketplacePackages: {
    path: '/api/marketplace/packages',
    method: 'GET' as const,
    description: 'Browse published marketplace packages',
    fabric: 'FLOW_ENGINE',
  },
  marketplacePackageInstall: {
    path: '/api/marketplace/packages/:packageId/install',
    method: 'POST' as const,
    description: 'Install a marketplace package (Linked mode — registers, no topology copy)',
    fabric: 'FLOW_ENGINE',
  },

  // ── Flow Runs ──
  flowRuns: {
    path: '/api/flows/runs',
    method: 'GET' as const,
    description: 'List runs',
    fabric: 'FLOW_ENGINE',
  },
  flowRunById: {
    path: '/api/flows/runs/:runId',
    method: 'GET' as const,
    description: 'Get run',
    fabric: 'FLOW_ENGINE',
  },

  // ── FREEDOM Config ──
  freedomConfig: {
    path: '/api/freedom/config',
    method: 'GET' as const,
    description: 'Get FREEDOM config',
    fabric: 'DATABASE',
  },
  freedomConfigUpdate: {
    path: '/api/freedom/config',
    method: 'PUT' as const,
    description: 'Update config',
    fabric: 'DATABASE',
  },

  // ── Ledger ──
  ledgerEntries: {
    path: '/api/ledger/entries',
    method: 'GET' as const,
    description: 'List ledger entries',
    fabric: 'DATABASE',
  },

  // ── Stage 3: Prompt Editor ──
  promptGet: {
    path: '/api/prompts/:taskTypeId',
    method: 'GET' as const,
    description: 'Get prompt for taskType',
    fabric: 'DATABASE',
  },
  promptUpsert: {
    path: '/api/prompts/:taskTypeId',
    method: 'PUT' as const,
    description: 'Upsert prompt version',
    fabric: 'DATABASE',
  },
  promptDeactivate: {
    path: '/api/prompts/:taskTypeId',
    method: 'DELETE' as const,
    description: 'Deactivate prompt',
    fabric: 'DATABASE',
  },

  // ── Stage 3: Run Trace ──
  runTrace: {
    path: '/api/runs/:runId/trace',
    method: 'GET' as const,
    description: 'Get run trace',
    fabric: 'FLOW_ENGINE',
  },
  flowExecute: {
    path: '/api/flow/execute',
    method: 'POST' as const,
    description: 'Execute a flow run',
    fabric: 'FLOW_ENGINE',
  },

  // ── Stage 3: Lifecycle ──
  lifecycleGet: {
    path: '/api/lifecycle/flows/:flowId',
    method: 'GET' as const,
    description: 'Get flow lifecycle status',
    fabric: 'FLOW_ENGINE',
  },
  lifecycleUpdate: {
    path: '/api/lifecycle/flows/:flowId',
    method: 'PUT' as const,
    description: 'Update lifecycle status (CAS)',
    fabric: 'FLOW_ENGINE',
  },

  // ── Stage 3: Flow State + RAG ──
  flowState: {
    path: '/api/flow/:flowId/state',
    method: 'GET' as const,
    description: 'Get flow state snapshot',
    fabric: 'FLOW_ENGINE',
  },
  ragSearch: {
    path: '/api/rag/search',
    method: 'POST' as const,
    description: 'Search RAG patterns',
    fabric: 'RAG',
  },

  // ── Topology (Phase 3) ──
  topologyByFlow: {
    path: '/api/topology/:flowId',
    method: 'GET' as const,
    description: 'Get topology for flowId',
    fabric: 'FLOW_ENGINE',
  },
  topologyWithRun: {
    path: '/api/topology/:flowId/run/:runId',
    method: 'GET' as const,
    description: 'Get topology + run state',
    fabric: 'FLOW_ENGINE',
  },

  // ── FLOW-03: Event Management ──
  eventCreate: {
    path: '/api/flows/event-management/events',
    method: 'POST' as const,
    description: 'Create event (T59)',
    fabric: 'FLOW_ENGINE',
  },
  eventList: {
    path: '/api/dynamic/xiigen-events',
    method: 'GET' as const,
    description: 'List events (dynamic read)',
    fabric: 'DATABASE',
  },
  eventPromote: {
    path: '/api/flows/event-management/events/:eventId/promote',
    method: 'POST' as const,
    description: 'Promote event (T61)',
    fabric: 'FLOW_ENGINE',
  },
  eventRegistrations: {
    path: '/api/dynamic/xiigen-event-registrations',
    method: 'GET' as const,
    description: 'List registrations (dynamic read)',
    fabric: 'DATABASE',
  },

  // ── FLOW-04: Event Attendance ──
  rsvpCreate: {
    path: '/api/flows/event-attendance/rsvp',
    method: 'POST' as const,
    description: 'Create/retrieve RSVP (T63)',
    fabric: 'FLOW_ENGINE',
  },
  rsvpCancel: {
    path: '/api/flows/event-attendance/rsvp/:rsvpId/cancel',
    method: 'POST' as const,
    description: 'Cancel RSVP (T67)',
    fabric: 'FLOW_ENGINE',
  },
  checkIn: {
    path: '/api/flows/event-attendance/checkin',
    method: 'POST' as const,
    description: 'Check in attendee (T65)',
    fabric: 'FLOW_ENGINE',
  },
  rsvpList: {
    path: '/api/dynamic/xiigen-event-rsvps',
    method: 'GET' as const,
    description: 'List RSVPs (dynamic read)',
    fabric: 'DATABASE',
  },
  checkInList: {
    path: '/api/dynamic/xiigen-event-checkins',
    method: 'GET' as const,
    description: 'List check-ins (dynamic read)',
    fabric: 'DATABASE',
  },

  // ── FLOW-46 Platform Agent (Super Engine Assistant) ──
  agentRun: {
    path: '/api/agent/run',
    method: 'POST' as const,
    description: 'Submit a Super Engine Assistant run (MASTER only)',
    fabric: 'FLOW_ENGINE',
  },
  agentSession: {
    path: '/api/agent/sessions/:id',
    method: 'GET' as const,
    description: 'Read a single agent session by id',
    fabric: 'FLOW_ENGINE',
  },
  agentSessionList: {
    path: '/api/agent/sessions',
    method: 'GET' as const,
    description: 'List recent agent sessions (MASTER only)',
    fabric: 'FLOW_ENGINE',
  },
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;

/** Resolve path template with params: resolvePath('/tenants/:id', { id: '123' }) → '/tenants/123' */
export function resolvePath(pathTemplate: string, pathParams?: Record<string, string>): string {
  if (!pathParams) return pathTemplate;
  let resolved = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(value));
  }
  return resolved;
}
