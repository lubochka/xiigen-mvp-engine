/**
 * Stack Coupling Types — FLOW-00.2
 *
 * Business purpose: Every task type, topology node, and plugin adapter is labelled
 * with exactly how much of its design is universal versus technology-specific.
 * XIIGen uses this to generate correct code for any stack, flag incompatibilities
 * before implementation begins, and route FLOW-34 adapter work automatically.
 *
 * Key design decisions:
 *   D-STACK-1: Three-tier taxonomy (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE)
 *   D-STACK-2: Option C hybrid genesis prompt format
 *   D-STACK-3: node-nestjs (server) + react-web (client) are priority stacks
 *   D-STACK-7: stackCategory is the closed enum; stackType is an open string
 *   D-STACK-8: @xiigen/plugin-sdk is the canonical platform-side neutral layer
 *
 * Authoritative: DECISIONS-LOCKED.md → D-STACK-1 through D-STACK-8
 */

// ── Tier ──────────────────────────────────────────────────────────────────────

/**
 * How much of an element's design depends on the technology stack.
 *
 * CONCEPT_NEUTRAL:
 *   The rule applies identically on every stack.
 *   Arbitrary developer reading it in any language can apply it without translation.
 *   Examples: DNA-8 outbox-before-queue, no PII in events, atomic set-if-not-exists idempotency concept (IScopedMemoryService.setIfAbsent()),
 *             FREEDOM config for parameters, tenant isolation principle.
 *
 * IMPL_VARIES:
 *   The concept is identical. The syntax or mechanism differs by coupling dimension.
 *   The genesis prompt becomes a parameterized template.
 *   Generator substitutes stack-specific syntax at build time.
 *   Examples: "extend MicroserviceBase" (syntax differs per SERVER_LANGUAGE),
 *             "persist before emit" (ORM transaction call differs per SERVER_DATA_ACCESS).
 *
 * STACK_COUPLED:
 *   Implementation differs fundamentally between stacks.
 *   No shared template is possible.
 *   Separate implementationNotes entry required per stack.
 *   Examples: fan-in parallel execution (Promise.allSettled vs asyncio.gather vs Bus::batch),
 *             realtime push (WebSocket vs FCM vs APNs vs Canva polling).
 *
 * INCOMPATIBLE:
 *   Cannot be implemented on this stack within XIIGen's architecture model.
 *   Must be flagged before implementation begins with reason and mitigation.
 *   Examples: WordPress fan-in, PHP server-rendered offline queue,
 *             Canva persistent WebSocket (sandbox constraint).
 */
export type CouplingTier = 'CONCEPT_NEUTRAL' | 'IMPL_VARIES' | 'STACK_COUPLED' | 'INCOMPATIBLE';

// ── Side ──────────────────────────────────────────────────────────────────────

/**
 * Which side of the system this stack entry describes.
 *
 * server:    Code that runs on the XIIGen backend or a tenant's server.
 *            Examples: NestJS service, FastAPI route, Laravel controller.
 *
 * client:    Code that runs in a user's browser, mobile device, or
 *            inside a host platform's plugin sandbox.
 *            Examples: React SPA, Angular app, Figma plugin iframe,
 *                      Canva App, Android Activity, iOS View.
 *
 * platform:  Infrastructure and services that both sides depend on but
 *            neither side IS.
 *            Examples: Redis (anti-replay store), Firebase FCM (push delivery),
 *                      @xiigen/plugin-sdk (shared adapter layer for all 65 plugins),
 *                      GitHub Actions (CI gate), Gradle (Android build),
 *                      Xcode (iOS signing + entitlements), Jest (test runner),
 *                      AWS SES (email delivery for T48 verification),
 *                      webpack (Canva mandates this bundler).
 *
 * other:     Everything else. Tenant-defined. Examples: SAP ABAP RFC layer,
 *            Salesforce APEX trigger, Oracle APEX page process, legacy mainframe adapter.
 */
export type StackSide = 'server' | 'client' | 'platform' | 'other';

// ── StackCategory ─────────────────────────────────────────────────────────────

/**
 * The KIND of technology — closed enum.
 * Drives which coupling dimensions are relevant.
 * The specific technology name is the open-string stackType field.
 *
 * D-STACK-7: stackCategory is closed; stackType is open.
 */
export type StackCategory =
  // Plugin/extension marketplaces
  | 'design-platform-plugin' // Figma Plugin API, Canva Apps SDK, Framer Plugin API
  | 'whiteboard-plugin' // Miro Web SDK, FigJam (Figma Nodes API)
  | 'ecommerce-app' // Shopify Polaris+GraphQL, Wix Blocks, Webflow Apps
  | 'productivity-plugin' // Google Workspace AppScript, Atlassian Forge, Monday SDK
  | 'browser-extension' // Chrome MV3, Firefox WebExtension
  | 'crm-extension' // Salesforce LWC, HubSpot
  | 'automation-node' // n8n Community Node, Zapier CLI, Make App
  | 'payment-plugin' // Stripe Apps SDK

  // Application stacks
  | 'web-framework' // NestJS, FastAPI, Laravel, Rails, Django, Spring, Express
  | 'cms-plugin' // WordPress, Joomla, Drupal plugins
  | 'erp-extension' // SAP ABAP, Oracle APEX, Dynamics, Salesforce APEX
  | 'mobile-native' // iOS Swift/ObjC, Android Kotlin/Java
  | 'mobile-cross' // React Native, Flutter, Expo
  | 'desktop-native' // WPF, WinUI, AppKit, Qt, GTK
  | 'client-spa' // React, Angular, Vue, Svelte
  | 'client-ssr' // Next.js, Nuxt, SvelteKit, Remix

  // Platform services
  | 'platform-service' // Redis, Firebase, AWS SES, Stripe API, Twilio, ElevenLabs
  | 'sdk-package' // @xiigen/plugin-sdk, shared npm/pip packages

  // Dev toolchain
  | 'build-tool' // Vite, webpack, Gradle, Xcode, MSBuild, cargo
  | 'test-runner' // Jest, pytest, xUnit, Espresso, XCTest
  | 'ci-cd' // GitHub Actions, GitLab CI, Jenkins

  // Tenant-defined
  | 'custom'; // Requires StackCapabilityDeclaration

// ── CouplingDimension ─────────────────────────────────────────────────────────

/**
 * The specific technical dimension that drives implementation variation.
 * Multiple dimensions can apply to one element.
 */
export type CouplingDimension =
  | 'SERVER_LANGUAGE' // typescript | python | php | csharp | rust | java | go | ruby
  | 'SERVER_DI_FRAMEWORK' // nestjs | fastapi | laravel | wordpress | aspnet | axum | spring
  | 'SERVER_ASYNC_MODEL' // eventloop | asyncio | laravel-jobs | sync-php | task-async | tokio
  | 'SERVER_DATA_ACCESS' // typeorm/prisma | sqlalchemy | eloquent | wpdb | efcore | sqlx
  | 'CLIENT_FRAMEWORK' // react-web | angular | vue | figma-plugin | canva-app | miro-app
  // | android-kotlin | ios-swift | react-native | flutter | chrome-ext
  | 'CLIENT_LIFECYCLE' // react-hooks | angular-lifecycle | vue-composable
  // | plugin-sandbox | android-activity | ios-viewcontroller
  | 'CLIENT_STATE_MODEL' // useState-zustand | rxjs-subject | pinia | plugin-storage
  // | stateflow | combine-published | canva-app-storage
  | 'CLIENT_ROUTING' // react-router | angular-router | vue-router | php-redirect
  // | jetpack-navigation | uinavigation-controller
  | 'CLIENT_BUILD' // vite | angular-cli | webpack | gradle-agp | xcode | cargo
  | 'PLATFORM_SERVICE' // which platform service (Redis, Firebase, AWS SES, FCM, APNs)
  | 'TEST_FRAMEWORK' // jest | pytest | phpunit | rust-test | xunit | espresso-junit
  | 'PLUGIN_SANDBOX'; // sandbox constraints (Figma, Canva, Chrome MV3, etc.)

// ── StackKey ──────────────────────────────────────────────────────────────────

/**
 * The map key: "{stackType}:{side}"
 *
 * stackType is an OPEN STRING — any tenant can name their stack.
 * XIIGen ships with well-known stackTypes for the 14 marketplace platforms and
 * the canonical server/client stacks. Tenants add their own.
 *
 * Examples:
 *   "node-nestjs:server"              canonical server (priority)
 *   "react-web:client"                canonical client (priority)
 *   "canva-app:client"                Canva Apps SDK
 *   "figma-plugin:client"             Figma Plugin API
 *   "miro-app:client"                 Miro Web SDK
 *   "shopify-polaris:client"          Shopify Polaris + GraphQL
 *   "atlassian-forge:client"          Atlassian Forge (server-side plugin)
 *   "chrome-extension:client"         Chrome MV3
 *   "redis:platform"                  Redis anti-replay store, setIfAbsent (IScopedMemoryService)
 *   "@xiigen/plugin-sdk:platform"     Shared neutral adapter layer (D-STACK-8)
 *   "firebase-fcm:platform"           Firebase Cloud Messaging (push signals)
 *   "aws-ses:platform"                Email delivery for T48 verification
 *   "webpack:platform"                Canva mandates webpack — not a choice
 *   "gradle:platform"                 Android build — QR scanner dependencies
 *   "xcode:platform"                  iOS entitlements before any Swift code
 *   "jest:platform"                   virtualClock injection (T005, T008)
 *   "github-actions:platform"         lint:naming, tsc, SK-418 gates in CI
 *   "sap-abap-extension:other"        tenant-defined ERP extension
 *   "our-internal-go-service:server"  tenant-defined custom stack
 */
export type StackKey = `${string}:${StackSide}`;

// ── StateArchitectureNotes ────────────────────────────────────────────────────

/**
 * State architecture notes for any client-side entry with observable/reactive state.
 *
 * These notes apply when:
 *   - side === 'client'
 *   - tier !== 'CONCEPT_NEUTRAL'
 *   - the element has optimisticActions, appReopenBehavior, backgroundSteps,
 *     or requiresDraftState
 *
 * Field names are framework-neutral. The VALUES carry the framework-specific term.
 * The field name 'stateHolderType' is neutral.
 * The VALUE 'BehaviorSubject' tells an Angular developer what to use.
 * The VALUE 'StateFlow' tells an Android developer what to use.
 * The VALUE 'useState' tells a React developer what to use.
 */
export interface StateArchitectureNotes {
  /**
   * Which reactive state holder to use for this node's state.
   * Value is the framework-specific term — no enum, tenant writes exactly what they need.
   *
   * Angular:        'Subject' | 'BehaviorSubject' | 'ReplaySubject'
   * React/RN:       'useState' | 'useReducer' | 'zustand-store' | 'context'
   * Vue:            'ref' | 'reactive' | 'pinia-store' | 'composable'
   * Android:        'StateFlow' | 'SharedFlow'
   * iOS:            '@State' | '@StateObject' | '@ObservedObject' | '@EnvironmentObject'
   * Figma plugin:   'React.useState' (plugin runs React in iframe)
   * Canva app:      'React.useState' + '@canva/app-storage' for persistence
   */
  stateHolderType: string;
  stateHolderTypeReason: string;

  /**
   * Where the state lives in the framework's scope hierarchy.
   *
   * 'feature-scoped': destroyed when the feature/screen/route unloads. Preferred.
   *   Angular: feature-module service
   *   React:   component useState or feature-level context
   *   Android: Fragment-scoped ViewModel
   *   iOS:     @StateObject local to View
   *   Canva:   component useState (plugin destroys on close)
   *
   * 'root-scoped': persists across navigation. Requires explicit reset on flow exit.
   *   Angular: providedIn:'root' service
   *   React:   root Context or global Zustand store
   *   Android: SharedViewModel via activityViewModels()
   *   iOS:     @EnvironmentObject injected at App level
   */
  stateScope: 'feature-scoped' | 'root-scoped';
  stateScopeReason: string;

  /**
   * How far a state change travels when it fires.
   * LOW:    1 consumer — local to one component/view/screen.
   * MEDIUM: 2–3 consumers — document each in stateConsumerMap.
   * HIGH:   4+ consumers OR root-scoped — full blast radius analysis required.
   */
  propagationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  propagationRiskReason: string;

  /**
   * Whether a navigation entry guard is needed.
   * Angular: CanActivateFn  |  React: loader  |  iOS: segue condition
   * Android: NavController check  |  Canva: plugin entry check
   */
  routeGuardRequired: boolean;

  /**
   * Whether a navigation exit guard is needed (confirm before leaving).
   * Angular: CanDeactivateFn  |  React Router: useBlocker  |  Vue: beforeRouteLeave
   * Android: onBackPressed override  |  iOS: willMove(toParent:)
   */
  exitGuardRequired?: boolean;

  /** For HIGH propagationRisk: document each consumer and its cleanup mechanism. */
  stateConsumerMap?: Record<string, string>;

  note?: string;
}

// ── StackCouplingEntry ────────────────────────────────────────────────────────

/**
 * One entry in the coupling map — describes how ONE element behaves
 * on ONE specific "{stackType}:{side}" combination.
 */
export interface StackCouplingEntry {
  tier: CouplingTier;
  stackCategory: StackCategory;

  /** Which dimensions drive the variation. Empty for CONCEPT_NEUTRAL. */
  dimensions: CouplingDimension[];

  /**
   * What this element does — described in terms of the business or architectural
   * concept, not the implementation. Stack-neutral language.
   * Identical to neutralIronRules[] in HybridGenesisPrompt.
   */
  neutralConcepts: string[];

  /**
   * How to implement this element on THIS specific stackType.
   * Contains framework names, language syntax, library calls — that is correct here.
   * Empty string for INCOMPATIBLE entries.
   */
  implementationNotes: string;

  /** True if this concept cannot be implemented on this stack. */
  incompatible?: boolean;
  incompatibleReason?: string;

  /**
   * Mitigation when incompatible: alternative stack recommendation,
   * degraded fallback description, or architectural workaround.
   */
  mitigation?: string;

  /** True if achievable but with degraded semantics vs the canonical implementation. */
  degraded?: boolean;
  degradedReason?: string;

  /**
   * State architecture notes — present when:
   *   side === 'client' AND tier !== 'CONCEPT_NEUTRAL'
   *   AND the element has reactive state (optimistic actions, reopen behavior,
   *   background signals, draft state)
   */
  stateNotes?: StateArchitectureNotes;
}

// ── TaskTypeStackCoupling ─────────────────────────────────────────────────────

/**
 * Full stack coupling annotation for one task type or topology node.
 *
 * A flat map keyed by "{stackType}:{side}".
 * No hardcoded 'server' or 'client' top-level keys.
 * Platform entries (Redis, @xiigen/plugin-sdk, webpack, jest) are first-class.
 *
 * Minimum required: an entry for the priority server stack ("node-nestjs:server")
 * and priority client stack ("react-web:client") if client-facing.
 *
 * Example keys present in a typical user-facing task type:
 *   "node-nestjs:server"          — canonical server implementation
 *   "react-web:client"            — canonical client implementation
 *   "angular:client"              — Angular state architecture notes
 *   "android-kotlin:client"       — Android StateFlow pattern
 *   "redis:platform"              — setIfAbsent anti-replay (IScopedMemoryService), TTL management
 *   "@xiigen/plugin-sdk:platform" — neutral plugin adapter layer
 *   "jest:platform"               — virtualClock injection for TTL tests
 *   "canva-app:client"            — Canva Apps SDK adapter pattern
 *   "wordpress-plugin:server"     — INCOMPATIBLE flags
 */
export interface TaskTypeStackCoupling {
  /**
   * Top-level classification for this task type's coupling tier.
   * Z-4: 'IMPL_VARIES_WITH_PROVIDER' means implementation varies by which
   * fabric provider is active (e.g., ISchedulerService for T48).
   */
  tier?: 'IMPL_VARIES_WITH_PROVIDER' | 'IMPL_VARIES' | 'CONCEPT_NEUTRAL' | 'INCOMPATIBLE';

  /**
   * Top-level fabric interface this task type depends on.
   * Set when tier = 'IMPL_VARIES_WITH_PROVIDER' to identify the fabric.
   */
  fabricInterface?: string;

  entries: Partial<Record<StackKey, StackCouplingEntry>>;

  /**
   * For custom or previously unknown stacks.
   * Tenant provides a StackCapabilityDeclaration; XIIGen auto-derives the entry.
   * See stack-capability-declaration.ts.
   */
  customStackDeclarations?: import('./stack-capability-declaration').StackCapabilityDeclaration[];

  /**
   * Which server stacks this task type can generate full implementation for.
   * Minimum: ['nestjs'] for backward compat.
   * Does not include platform or other sides.
   */
  supportedServerStacks: string[];
}

// ── Well-known StackKey constants ─────────────────────────────────────────────

/** Priority server stack — D-STACK-3 */
export const PRIORITY_SERVER_KEY: StackKey = 'node-nestjs:server';
/** Priority client stack — D-STACK-3 */
export const PRIORITY_CLIENT_KEY: StackKey = 'react-web:client';
/** Canonical plugin SDK platform entry — D-STACK-8 */
export const PLUGIN_SDK_KEY: StackKey = '@xiigen/plugin-sdk:platform';
/** Redis platform entry — used by setIfAbsent (IScopedMemoryService) idempotency and anti-replay */
export const REDIS_PLATFORM_KEY: StackKey = 'redis:platform';
/** Jest platform entry — used by virtualClock test injection */
export const JEST_PLATFORM_KEY: StackKey = 'jest:platform';

/**
 * All 14 marketplace platform client keys.
 * Each corresponds to a StackCapabilityDeclaration in Phase D of FLOW-00.2.
 */
export const MARKETPLACE_CLIENT_KEYS: readonly StackKey[] = [
  'figma-plugin:client', // Figma Plugin API
  'canva-app:client', // Canva Apps SDK
  'miro-app:client', // Miro Web SDK
  'shopify-polaris:client', // Shopify Polaris + GraphQL
  'wix-blocks:client', // Wix Blocks
  'webflow-app:client', // Webflow Apps
  'monday-sdk:client', // Monday.com SDK
  'google-workspace:client', // Google Workspace AppScript
  'framer-plugin:client', // Framer Plugin API
  'atlassian-forge:client', // Atlassian Forge
  'chrome-extension:client', // Chrome MV3
  'n8n-node:client', // n8n Community Node
  'stripe-app:client', // Stripe Apps SDK
  'salesforce-lwc:client', // Salesforce Lightning Web Components
];
