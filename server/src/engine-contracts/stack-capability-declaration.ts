/**
 * StackCapabilityDeclaration — the bridge for custom and unknown stacks.
 *
 * Business purpose: XIIGen cannot enumerate every stack that will ever exist.
 * WordPress, SAP ABAP, Joomla, a tenant's internal Go monolith, Salesforce APEX —
 * all are legitimate deployment targets. Rather than hardcoding incompatibilities,
 * the tenant declares what their stack CAN do, and XIIGen auto-derives the
 * CouplingTier for each task type.
 *
 * Who produces these declarations:
 *   - FLOW-00.2 Phase D: XIIGen ships 14 declarations for marketplace platforms
 *   - FLOW-37: Additional stacks (Python, .NET) get full declarations
 *   - Tenants: Any custom stack via the FREEDOM config layer
 *
 * Authoritative: DECISIONS-LOCKED.md → D-STACK-7
 */

import type { StackSide, StackCategory, CouplingDimension } from './stack-coupling';

export interface StackCapabilityDeclaration {
  /** Open string — the tenant's name for this stack. */
  stackType: string;

  /** Closed enum — the KIND of technology. Drives dimension selection. */
  stackCategory: StackCategory;

  /** Which side of the system this stack operates on. */
  side: StackSide;

  /**
   * What this stack CAN do.
   * XIIGen reads these flags to auto-derive CouplingTier:
   *   All required capabilities present → IMPL_VARIES (can be implemented)
   *   Any required capability missing   → INCOMPATIBLE (flag before session starts)
   *   Capability present but degraded   → STACK_COUPLED (special handling needed)
   */
  capabilities: StackCapabilities;

  /**
   * Known structural constraints — the tenant (or XIIGen) declares their own
   * incompatibilities explicitly. Each string is a human-readable constraint.
   * XIIGen uses these to populate incompatibleReason in auto-derived entries.
   */
  constraints: string[];

  /**
   * How this stack implements each relevant coupling dimension.
   * Only dimensions applicable to this stack need entries.
   * These become the implementationNotes in the auto-derived StackCouplingEntry.
   */
  dimensionImplementations: Partial<Record<CouplingDimension, string>>;

  /**
   * Human-readable description of this stack.
   * Shown in planning reports and Jira comments.
   */
  description: string;
}

export interface StackCapabilities {
  /**
   * Can this stack execute async/non-blocking operations?
   * False → any task with async flow (T48 wait state, T50 fan-in) is INCOMPATIBLE.
   */
  asyncExecution: boolean;

  /**
   * Can this stack run N operations in parallel and wait for all?
   * False → T50 ParallelProfileEnricher fan-in is INCOMPATIBLE.
   * Examples: False for WordPress (sync PHP), True for NestJS/FastAPI/Go.
   */
  parallelExecution: boolean;

  /**
   * Can this stack maintain a persistent connection (WebSocket, SSE, long-poll)?
   * False → realtime-push background signals (T51, T61) are INCOMPATIBLE or DEGRADED.
   * Examples: False for Canva plugin sandbox, True for NestJS with socket.io.
   */
  persistentConnection: boolean;

  /**
   * Can this stack hold client-side state between screens/views?
   * False → optimistic actions and appReopenBehavior are INCOMPATIBLE.
   * Examples: False for PHP server-rendered, True for all SPA frameworks.
   */
  localState: boolean;

  /**
   * Can this stack receive background signals when not in foreground?
   * False → backgroundSteps with realtime-push require degraded polling.
   * Examples: False for browser plugins when closed, True for mobile with FCM/APNs.
   */
  backgroundRefresh: boolean;

  /**
   * Can this stack write to local persistent storage (survive app restart)?
   * Examples: True for @canva/app-storage, True for Android Room,
   *           False for in-memory only plugin sandboxes.
   */
  nativeStorage: boolean;

  /**
   * Can this stack wrap multiple writes in a single atomic transaction?
   * False → T60/T63 atomic capacity operations are STACK_COUPLED (special handling).
   * Examples: False for WordPress ($wpdb raw), True for NestJS+TypeORM, True for FastAPI+SQLAlchemy.
   */
  transactionalWrites: boolean;

  /**
   * Does this stack have a dependency injection container?
   * False → all factory injection is manual (constructor params or global singletons).
   * Examples: False for vanilla JS plugins, False for Canva app,
   *           True for NestJS, True for Angular, True for FastAPI Depends().
   */
  hasDependencyInjection: boolean;

  /**
   * Does this stack run in a sandboxed environment with restricted APIs?
   * True → must declare sandboxConstraints.
   * Examples: True for Figma plugin, True for Canva app, True for Chrome MV3,
   *           True for Atlassian Forge (Jira).
   */
  isSandboxed: boolean;
  sandboxConstraints?: string[]; // required if isSandboxed: true
}

// ── 14 Marketplace Platform Declarations ─────────────────────────────────────
// Produced by FLOW-00.2 Phase D.
// Full implementations used by FLOW-34 Phase A for each platform's adapter plan.

export const CANVA_APP_DECLARATION: StackCapabilityDeclaration = {
  stackType: 'canva-app',
  stackCategory: 'design-platform-plugin',
  side: 'client',
  description:
    'Canva Apps SDK — TypeScript + React + webpack. Runs in sandboxed iframe within Canva editor.',
  capabilities: {
    asyncExecution: true,
    parallelExecution: false, // UI thread — no parallel fan-in
    persistentConnection: false, // no WebSocket in Canva sandbox
    localState: true, // React useState
    backgroundRefresh: false, // plugin only runs when open
    nativeStorage: true, // @canva/app-storage
    transactionalWrites: false, // no transaction concept in canvas writes
    hasDependencyInjection: false, // manual React imports
    isSandboxed: true,
    sandboxConstraints: [
      'No direct DOM access outside plugin iframe',
      'Canvas writes only via addNativeElement / setContent — no arbitrary CSS injection',
      'No persistent WebSocket — must poll or use @canva/app-storage',
      'Review requirement: free tier cannot require mandatory login for core features',
      'webpack bundler is mandatory — Vite is not supported',
    ],
  },
  constraints: [
    'Review: ~2 weeks. Free features must not require login.',
    'No WebSocket → realtime-push signals must use polling or @canva/app-storage subscription',
    'webpack mandatory (not Vite, not Rollup)',
    'No native parallel execution in UI thread',
  ],
  dimensionImplementations: {
    CLIENT_FRAMEWORK: 'React + TypeScript + Canva Apps SDK (@canva/design, @canva/app-ui-kit)',
    CLIENT_STATE_MODEL: 'React useState + @canva/app-storage for cross-session persistence',
    CLIENT_BUILD: 'webpack (mandated by Canva — no alternative)',
    CLIENT_LIFECYCLE: 'Plugin mounts/unmounts with Canva panel open/close',
    PLUGIN_SANDBOX: 'Iframe sandbox — restricted DOM, no direct canvas access',
    TEST_FRAMEWORK: 'Jest + @testing-library/react',
  },
};

export const FIGMA_PLUGIN_DECLARATION: StackCapabilityDeclaration = {
  stackType: 'figma-plugin',
  stackCategory: 'design-platform-plugin',
  side: 'client',
  description:
    'Figma Plugin API — TypeScript. Runs in sandbox. UI in iframe (HTML/React). Main thread has direct node access.',
  capabilities: {
    asyncExecution: true,
    parallelExecution: false,
    persistentConnection: false, // no WebSocket in sandbox
    localState: true, // figma.clientStorage + React useState in UI iframe
    backgroundRefresh: false,
    nativeStorage: true, // figma.clientStorage (per-file, NOT shared between users)
    transactionalWrites: false,
    hasDependencyInjection: false,
    isSandboxed: true,
    sandboxConstraints: [
      'figma.clientStorage is per-file — do NOT store user data here (security rule)',
      'All user data goes in figma.clientStorage keyed by scene:{nodeId}',
      'Main thread: direct Figma node access. UI thread: postMessage to main thread.',
      'No network calls from main thread — only from UI iframe',
      'No require() / dynamic imports in main thread',
    ],
  },
  constraints: [
    'Review: 1-3 days. AI category gets boosted visibility.',
    'Security: setPluginData shared with all users of the file — never store user data there',
    'Two execution contexts: main thread (node access) + UI iframe (React)',
  ],
  dimensionImplementations: {
    CLIENT_FRAMEWORK: 'TypeScript Plugin API (main) + React in UI iframe',
    CLIENT_STATE_MODEL: 'figma.clientStorage (persistence) + postMessage (thread comms)',
    CLIENT_BUILD: 'esbuild or webpack for UI iframe, tsc for main thread',
    PLUGIN_SANDBOX: 'Dual sandbox: main thread + iframe. postMessage bridge between them.',
    TEST_FRAMEWORK: 'Jest',
  },
};

export const MIRO_APP_DECLARATION: StackCapabilityDeclaration = {
  stackType: 'miro-app',
  stackCategory: 'whiteboard-plugin',
  side: 'client',
  description:
    'Miro Web SDK — TypeScript/JavaScript. React or vanilla JS. Board access via SDK API.',
  capabilities: {
    asyncExecution: true,
    parallelExecution: false,
    persistentConnection: false,
    localState: true,
    backgroundRefresh: false,
    nativeStorage: true, // miro.board.getAppData()
    transactionalWrites: false,
    hasDependencyInjection: false,
    isSandboxed: true,
    sandboxConstraints: [
      'Board access only via Miro Web SDK — no direct DOM manipulation of canvas',
      'Shape parsing is heuristic — freeform shapes need type inference',
      'Review: 1-3 weeks',
    ],
  },
  constraints: [
    'Shape parser for FLOW plugins: heuristic mapping required (medium complexity)',
    'No persistent connection — must use polling for background signals',
  ],
  dimensionImplementations: {
    CLIENT_FRAMEWORK: 'TypeScript + Miro Web SDK. React optional.',
    CLIENT_STATE_MODEL: 'miro.board.getAppData() for persistence',
    CLIENT_BUILD: 'webpack or Vite',
    TEST_FRAMEWORK: 'Jest',
  },
};

export const SHOPIFY_POLARIS_DECLARATION: StackCapabilityDeclaration = {
  stackType: 'shopify-polaris',
  stackCategory: 'ecommerce-app',
  side: 'client',
  description:
    'Shopify Polaris + GraphQL. React-based. Runs in Shopify admin iframe. 100% forced account creation.',
  capabilities: {
    asyncExecution: true,
    parallelExecution: false,
    persistentConnection: false,
    localState: true,
    backgroundRefresh: false,
    nativeStorage: true, // Shopify app metafields
    transactionalWrites: false,
    hasDependencyInjection: false,
    isSandboxed: true,
    sandboxConstraints: [
      'Must use Polaris component library for admin UI',
      'All data access via Shopify GraphQL Admin API',
      'Review: 2-4 weeks, 100-checkpoint review — strictest of all platforms',
      'Must handle webhooks for order/product events',
    ],
  },
  constraints: [
    'Strictest review process (100-checkpoint). Plan extra lead time.',
    '100% forced account creation — strongest traffic conversion of all platforms.',
    'Polaris design system mandatory — no custom UI frameworks.',
  ],
  dimensionImplementations: {
    CLIENT_FRAMEWORK: 'React + Polaris + Shopify App Bridge',
    CLIENT_STATE_MODEL: 'React useState + Shopify metafields for persistence',
    CLIENT_BUILD: 'Vite or webpack',
    TEST_FRAMEWORK: 'Jest + @shopify/polaris test utils',
  },
};

// Remaining 10 platforms (wix-blocks, webflow-app, monday-sdk, google-workspace,
// framer-plugin, atlassian-forge, chrome-extension, n8n-node, stripe-app,
// salesforce-lwc) follow the same pattern. Stubs in Phase D, full declarations
// in FLOW-34 Phase A for each respective platform adapter.

export const KNOWN_DECLARATIONS: readonly StackCapabilityDeclaration[] = [
  CANVA_APP_DECLARATION,
  FIGMA_PLUGIN_DECLARATION,
  MIRO_APP_DECLARATION,
  SHOPIFY_POLARIS_DECLARATION,
  // 10 more added in Phase D
];
