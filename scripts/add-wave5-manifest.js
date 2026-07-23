// One-time script: add Wave 5 FT records to marketplace manifest
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../contracts/features/feature-manifest-marketplace-plugins-v1.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const sig = {
  installs: 0, activeUsers30d: 0, likes: 0, citations: 0,
  signalScore: 0, portingThresholdMet: false, lastUpdated: '2026-03-23T00:00:00.000Z',
};
const impl = { flowId: 'FLOW-34', status: 'implemented' };

function plat(platformId, adapterPath) {
  return { platformId, status: 'implemented', version: '1.0.0', adapterPath, adapterMode: 'MODE_B', signals: sig };
}

const wave5 = [
  {
    ftId: 'FT-F-FLOW', name: 'FigmaFlowRouter',
    description: 'FT-F-FLOW — Figma adapter for XIIGen Flow Router. Reads Figma diagram nodes (RECTANGLE/ELLIPSE/POLYGON/CONNECTOR) and maps to SharedFlowNode (START/STEP/DECISION/END/CONNECTOR). FLOW family: diagram to system.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('figma', 'adapters/figma/FT-F-FLOW/src/figma-flow-adapter.ts')],
    portingConstraints: [
      'Figma shape types (RECTANGLE/ELLIPSE/POLYGON/CONNECTOR) - Figma Plugin API specific',
      'ELLIPSE name heuristic: name.toLowerCase().includes("start") -> START else END',
      'Name ending "?" heuristic -> DECISION (applies to RECTANGLE nodes)',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-M-FLOW', name: 'MiroFlowRouter',
    description: 'FT-M-FLOW — Miro adapter for XIIGen Flow Router. Reads Miro board items (card/shape/connector/sticky_note) and maps to SharedFlowNode. FLOW family: diagram to system.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('miro', 'adapters/miro/FT-M-FLOW/src/miro-flow-adapter.ts')],
    portingConstraints: [
      'Miro REST API item types: card/shape/connector/sticky_note',
      'shape+diamond -> DECISION; shape+circle+content("start") -> START; shape+circle -> END',
      'startItem.id -> fromId; endItem.id -> toId',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-WF-FLOW', name: 'WebflowFlowRouter',
    description: 'FT-WF-FLOW — Webflow adapter for XIIGen Flow Router. Reads Webflow page hierarchy (static/collection/folder/utility) and maps to SharedFlowNode. FLOW family: page-hierarchy to content-flow.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('webflow', 'adapters/webflow/FT-WF-FLOW/src/webflow-flow-adapter.ts')],
    portingConstraints: [
      'Webflow page types: static/collection/folder/utility',
      'slug="/" -> START; type=utility -> END; type=collection -> DECISION; static/folder -> STEP',
      'SharedFlowNode extended with optional slug field for URL preservation',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-N-AUTO', name: 'N8nAutoBuilder',
    description: 'FT-N-AUTO — n8n adapter for XIIGen Auto-Builder. Reads n8n workflow node specs and maps to SharedWorkflowStep (TRIGGER/ACTION/CONDITION/TRANSFORM/OUTPUT). AUTO family: text to workflow.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('n8n', 'adapters/n8n/FT-N-AUTO/src/n8n-auto-adapter.ts')],
    portingConstraints: [
      'n8n types: trigger/http_request/code/filter/merge/set/webhook/schedule',
      'no nextNodeIds (empty or undefined) -> OUTPUT type',
      'http_request/code/webhook -> requiresConfig:true; filter/merge/set -> requiresConfig:false',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-CH-AUTO', name: 'ChromeAutoBuilder',
    description: 'FT-CH-AUTO — Chrome extension adapter for XIIGen Auto-Builder. Reads Chrome automation actions and maps to SharedWorkflowStep. AUTO family: page-analysis to browser-automation.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('chrome', 'adapters/chrome/FT-CH-AUTO/src/chrome-auto-adapter.ts')],
    portingConstraints: [
      'Chrome action types: click/fill/navigate/scroll/extract/wait/screenshot',
      'navigate -> TRIGGER (isEntryPoint:true); extract -> TRANSFORM; screenshot -> OUTPUT',
      'readAutomationActions sorts actions by order field before processing',
      'fill/navigate -> requiresConfig:true; click/scroll/wait/screenshot -> false',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-MON1', name: 'MondayAITaskEnhancer',
    description: 'FT-MON1 — monday.com adapter for XIIGen AI Task Enhancer. Reads board items and maps to SharedTaskElement with status/priority normalization. UTILITY family.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('monday-com', 'adapters/monday-com/FT-MON1/src/monday-adapter.ts')],
    portingConstraints: [
      'monday.com status text values (Done/Working on it/Stuck) - not standardized; unmapped -> TODO',
      'priority field: critical/high/medium/low (lowercase) -> CRITICAL/HIGH/MEDIUM/LOW',
      'taskType always TASK; isOverdue requires dueDate field',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-A1', name: 'AtlassianJiraIssueEnhancer',
    description: 'FT-A1 — Atlassian Jira adapter for XIIGen AI Issue Enhancer. Reads Jira Cloud issues and maps to SharedIssueElement with priority/status/type normalization. UTILITY family.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('atlassian', 'adapters/atlassian/FT-A1/src/atlassian-adapter.ts')],
    portingConstraints: [
      'Jira issue types: Bug/Story/Task/Epic/Sub-task -> BUG/STORY/TASK/EPIC/SUBTASK',
      'Priority: Highest->CRITICAL, High->HIGH, Medium->MEDIUM, Low/Lowest->LOW',
      'Status: To Do->TODO, In Progress->IN_PROGRESS, In Review->IN_REVIEW, Done->DONE',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-ST1', name: 'StripePaymentIntelligence',
    description: 'FT-ST1 — Stripe adapter for XIIGen Payment Intelligence. Reads Stripe payment events and maps to SharedPaymentElement with status/type normalization. UTILITY family.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('stripe', 'adapters/stripe/FT-ST1/src/stripe-adapter.ts')],
    portingConstraints: [
      'Stripe event types: charge/subscription/invoice/payment_intent/customer -> PAYMENT/SUBSCRIPTION/INVOICE/INTENT/CUSTOMER',
      'subscription type -> isRecurring:true; all others -> false',
      'Amounts in cents (integer); currency lowercase (usd/eur)',
    ],
    platformIncompatibilities: [],
  },
  {
    ftId: 'FT-G1', name: 'GoogleWorkspaceDocsWriter',
    description: 'FT-G1 — Google Workspace adapter for XIIGen Docs AI Writer. Reads Google Docs paragraph elements and maps to SharedDocParagraph with type/alignment normalization. UTILITY family.',
    productScope: 'client-capability', portingCandidate: true,
    canonicalImplementation: impl,
    platforms: [plat('google-ws', 'adapters/google-ws/FT-G1/src/google-docs-adapter.ts')],
    portingConstraints: [
      'Google Docs types: heading1/heading2/heading3/title/paragraph/list_item',
      'Alignment: START->LEFT, END->RIGHT; CENTER and JUSTIFIED pass through',
      'fontSize: title=36, heading1=24, heading2=20, heading3=16, paragraph/list_item=12',
    ],
    platformIncompatibilities: [],
  },
];

// Check none already exist
const existingIds = new Set(manifest.features.map(f => f.ftId));
const newOnes = wave5.filter(f => !existingIds.has(f.ftId));
console.log(`Adding ${newOnes.length} new entries (${wave5.length - newOnes.length} already present)`);

manifest.features.push(...newOnes);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('Done. Total features:', manifest.features.length);
