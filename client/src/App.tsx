/**
 * XIIGen Engine Client — App Shell
 *
 * React Router with sidebar navigation and 10 page routes.
 * Translated from React Navigation (stack/tab) → react-router-dom.
 */
import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import i18n from 'i18next';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  DashboardPage,
  DesignerPage,
  MonitorPage,
  RegistryPage,
  LedgerPage,
  TenantsPage,
  GenerationLabPage,
  ModelLeaderboardPage,
  PromptLabPage,
  QualityDashboardPage,
} from './pages';
import { RegistrationPage } from './pages/user-registration/RegistrationPage';
import { RegistrationPendingPage } from './pages/user-registration/RegistrationPendingPage';
import { VerifyTokenPage } from './pages/user-registration/VerifyTokenPage';
import { ResendPage } from './pages/user-registration/ResendPage';
import { OnboardingPage } from './pages/user-registration/OnboardingPage';
import { SsoPage } from './pages/user-registration/SsoPage';
import { QuestionnairePage } from './pages/profile-enrichment/QuestionnairePage';
import { MatchingPage } from './pages/profile-enrichment/MatchingPage';
import { PersonalizationPage } from './pages/profile-enrichment/PersonalizationPage';
import { EventListPage } from './pages/event-management/EventListPage';
import { EventCreationPage } from './pages/event-management/EventCreationPage';
import { RsvpPage } from './pages/event-attendance/RsvpPage';
import { AttendanceDashboardPage } from './pages/event-attendance/AttendanceDashboardPage';
import { TopologyViewerPage } from './pages/TopologyViewerPage';
// Track 0 Turn 6 (v14 Finding R + v15 Finding T): direct import, not barrel
import { FlowLibraryPage } from './pages/FlowLibraryPage';
// Track 0 Turn 8 (v14 Finding R + v15 Finding T): same direct-import pattern
import { RunFlowPage } from './pages/RunFlowPage';
// Turn 6 (MVP Plan v3, Goal 4d): marketplace browse + install in Linked mode
import { MarketplacePage } from './pages/MarketplacePage';
import { ReviewSubmissionPage } from './pages/reviews-reputation/ReviewSubmissionPage';
import { ReviewModerationPage } from './pages/reviews-reputation/ReviewModerationPage';
import { ReputationDashboardPage } from './pages/reviews-reputation/ReputationDashboardPage';
import { ReviewResponsePage } from './pages/reviews-reputation/ReviewResponsePage';
import { SchemaRegistryPage } from './pages/schema-registry-dag/SchemaRegistryPage';
import { SchemaSubmissionPage } from './pages/schema-registry-dag/SchemaSubmissionPage';
import { DagVisualizationPage } from './pages/schema-registry-dag/DagVisualizationPage';
import { SubscriptionPlanPage } from './pages/subscription-billing/SubscriptionPlanPage';
import { SubscribePage } from './pages/subscription-billing/SubscribePage';
import { BillingDashboardPage } from './pages/subscription-billing/BillingDashboardPage';
// FLOW-46 Phase B/C: Super Engine Assistant chat surface
import { ChatPage } from './pages/ChatPage';

// Key Provisioning (Phase A1): mount at app shell so banner appears on every page
import { KeyStatusBanner } from './components/KeyStatusBanner/KeyStatusBanner';
import { KeyProvisioningForm } from './components/KeyProvisioningForm/KeyProvisioningForm';

// FLOW-05: Completion Gamification
import { GamificationDashboardPage } from './pages/completion-gamification/GamificationDashboardPage';
import { LearningProgressPage } from './pages/completion-gamification/LearningProgressPage';
import { LessonCompletionPage } from './pages/completion-gamification/LessonCompletionPage';
import { SocialLearningPage } from './pages/completion-gamification/SocialLearningPage';

// FLOW-06: User Groups & Communities
import { GroupApprovalPage } from './pages/user-groups-communities/GroupApprovalPage';
import { GroupDiscoveryPage } from './pages/user-groups-communities/GroupDiscoveryPage';
import { GroupFeedPage } from './pages/user-groups-communities/GroupFeedPage';
import { MembershipStatusPage } from './pages/user-groups-communities/MembershipStatusPage';
import { TierManagementPage } from './pages/user-groups-communities/TierManagementPage';

// FLOW-07: Friend Requests & Social Feed
import { ConnectionsPage } from './pages/friend-request-social-feed/ConnectionsPage';
import { FriendRequestPage } from './pages/friend-request-social-feed/FriendRequestPage';
import { SocialFeedPage } from './pages/friend-request-social-feed/SocialFeedPage';
import { SocialGraphPage } from './pages/friend-request-social-feed/SocialGraphPage';

// FLOW-08: Marketplace (tenant)
import { BootstrapStatusPage } from './pages/marketplace/BootstrapStatusPage';
import { EventDiscoveryPage } from './pages/marketplace/EventDiscoveryPage';
import { EventRegistrationPage } from './pages/marketplace/EventRegistrationPage';
import { ParticipationStatusPage } from './pages/marketplace/ParticipationStatusPage';
import { PurchaseHistoryPage } from './pages/marketplace/PurchaseHistoryPage';

// FLOW-09: Transactional Event Participation
import { BookingConfirmationPage } from './pages/transactional-event-participation/BookingConfirmationPage';
import { QRCodePage } from './pages/transactional-event-participation/QRCodePage';
import { RefundPage } from './pages/transactional-event-participation/RefundPage';
import { TicketPurchasePage } from './pages/transactional-event-participation/TicketPurchasePage';
import { WaitlistPage } from './pages/transactional-event-participation/WaitlistPage';

// FLOW-15: SaaS Multi-Tenancy (admin)
import { TenantLifecyclePage } from './pages/saas-multi-tenancy/TenantLifecyclePage';
import { TenantProvisioningPage } from './pages/saas-multi-tenancy/TenantProvisioningPage';

// FLOW-16: Marketplace Payments
import { CheckoutPage } from './pages/marketplace-payments/CheckoutPage';
import { EscrowDashboardPage } from './pages/marketplace-payments/EscrowDashboardPage';

// FLOW-17: Freelancer Marketplace
import { GigPostingPage } from './pages/freelancer-marketplace/GigPostingPage';
import { MilestoneDashboardPage } from './pages/freelancer-marketplace/MilestoneDashboardPage';

// FLOW-19: Durable Sagas & Compliance (admin)
import { ComplianceAuditPage } from './pages/durable-sagas-compliance/ComplianceAuditPage';
import { SagaDashboardPage } from './pages/durable-sagas-compliance/SagaDashboardPage';

// FLOW-20: Ads Platform (admin) — default exports
import AuctionDashboardPage from './pages/ads-platform/AuctionDashboardPage';
import ConsentGatePage from './pages/ads-platform/ConsentGatePage';
import { AdsPlatformPage } from './pages/ads-platform/AdsPlatformPage';

// FLOW-18: Visual Flow Engine (admin)
import { FlowCanvasPage } from './pages/visual-flow-engine/FlowCanvasPage';
import { FlowPublisherPage } from './pages/visual-flow-engine/FlowPublisherPage';

// FLOW-23: Form Builder Templates
import { TemplateBuilder } from './pages/form-builder-templates/TemplateBuilder';

// MISSING flows — batch 2 stubs authored by scripts/gen-missing-stub-pages.py
import { DataWarehouseAnalyticsPage } from './pages/data-warehouse-analytics/DataWarehouseAnalyticsPage';
import { EtlDataIntegrationPage } from './pages/etl-data-integration/EtlDataIntegrationPage';
import { DynamicFormsWorkflowsPage } from './pages/dynamic-forms-workflows/DynamicFormsWorkflowsPage';
import { CmsPublishingPage } from './pages/cms-publishing/CmsPublishingPage';
import { AiSafetyModerationPage } from './pages/ai-safety-moderation/AiSafetyModerationPage';
import { BlogCmsModulesPage } from './pages/blog-cms-modules/BlogCmsModulesPage';
import { MarketplacePluginAdapterPage } from './pages/marketplace-plugin-adapter/MarketplacePluginAdapterPage';
import { PlatformAgentPage } from './pages/platform-agent/PlatformAgentPage';

// ADMIN_MISSING (ENGINE_INTERNAL) — batch 3 admin stubs
import { BundleActivationPage } from './pages/bundle-activation/BundleActivationPage';
import { BfaCrossFlowGovernancePage } from './pages/bfa-cross-flow-governance/BfaCrossFlowGovernancePage';
import { MetaFlowEnginePage } from './pages/meta-flow-engine/MetaFlowEnginePage';
import { HumanInteractionGatePage } from './pages/human-interaction-gate/HumanInteractionGatePage';
import { AdaptiveRagDeepResearchPage } from './pages/adaptive-rag-deep-research/AdaptiveRagDeepResearchPage';
import { TenantLifecycleManagerPage } from './pages/tenant-lifecycle-manager/TenantLifecycleManagerPage';
import { DesignIntelligenceEnginePage } from './pages/design-intelligence-engine/DesignIntelligenceEnginePage';
import { SharableFlowsMarketplacePage } from './pages/sharable-flows-marketplace/SharableFlowsMarketplacePage';
import { SystemInitiationBootstrapPage } from './pages/system-initiation-bootstrap/SystemInitiationBootstrapPage';
import { MetaArbitrationEnginePage } from './pages/meta-arbitration-engine/MetaArbitrationEnginePage';

// ADMIN_MISSING (ENGINE_INTERNAL) — batch 4 admin stubs
import { FeatureRegistryPage } from './pages/feature-registry/FeatureRegistryPage';
import { DesignSystemGovernancePage } from './pages/design-system-governance/DesignSystemGovernancePage';
import { RagQualityFeedbackPage } from './pages/rag-quality-feedback/RagQualityFeedbackPage';
import { OssCurriculumPage } from './pages/oss-curriculum/OssCurriculumPage';
import { ClientPushPage } from './pages/client-push/ClientPushPage';
import { RagQualityGraphPage } from './pages/rag-quality-graph/RagQualityGraphPage';
import { MetaFlowOrchestrationPage } from './pages/meta-flow-orchestration/MetaFlowOrchestrationPage';
import { AiSelfModificationPage } from './pages/ai-self-modification/AiSelfModificationPage';
import { CycleChainExtensionPage } from './pages/cycle-chain-extension/CycleChainExtensionPage';
import { ModuleLifecyclePage } from './pages/module-lifecycle/ModuleLifecyclePage';
import { AdapterCiCdBridgePage } from './pages/adapter-ci-cd-bridge/AdapterCiCdBridgePage';
// FLOW-45: History Bootstrap (RUN-52 — CFI-05 close, the one flow that had no page at all)
import { HistoryBootstrapPage } from './pages/history-bootstrap/HistoryBootstrapPage';
// FLOW-48 i18n-translation: shell switcher + 2 pages + useTranslation hook
import { useTranslation } from 'react-i18next';
// C6 role-aware navigation (RUN-09): Sidebar filters NAV_ITEMS per viewer role
import { useViewerRole } from './hooks/useViewerRole';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LanguageSettingsPage } from './pages/settings/LanguageSettingsPage';
import { AdminI18nPage } from './pages/admin-i18n/AdminI18nPage';

/** Navigation item definition. */
interface NavItem {
  path: string;
  label: string;
  section: 'engine' | 'admin' | 'learning';
  i18nKey: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', section: 'engine', i18nKey: 'nav_dashboard' },
  { path: '/designer', label: 'Designer', section: 'engine', i18nKey: 'nav_designer' },
  { path: '/flow-library', label: 'Flow Library', section: 'engine', i18nKey: 'nav_flow_library' },
  { path: '/run-flow', label: 'Run Flow', section: 'engine', i18nKey: 'nav_run_flow' },
  { path: '/marketplace', label: 'Marketplace', section: 'engine', i18nKey: 'nav_marketplace' },
  { path: '/monitor', label: 'Monitor', section: 'engine', i18nKey: 'nav_monitor' },
  { path: '/registry', label: 'Registry', section: 'engine', i18nKey: 'nav_registry' },
  { path: '/ledger', label: 'Ledger', section: 'engine', i18nKey: 'nav_ledger' },
  { path: '/events', label: 'Events', section: 'engine', i18nKey: 'nav_events' },
  { path: '/rsvp', label: 'RSVP', section: 'engine', i18nKey: 'nav_rsvp' },
  { path: '/attendance', label: 'Attendance', section: 'engine', i18nKey: 'nav_attendance' },
  { path: '/tenants', label: 'Tenants', section: 'admin', i18nKey: 'nav_tenants' },
  { path: '/chat', label: 'Super Agent', section: 'admin', i18nKey: 'nav_chat' },
  {
    path: '/generation-lab',
    label: 'Generation Lab',
    section: 'admin',
    i18nKey: 'nav_generation_lab',
  },
  {
    path: '/model-leaderboard',
    label: 'Model Leaderboard',
    section: 'learning',
    i18nKey: 'nav_model_leaderboard',
  },
  { path: '/prompt-lab', label: 'Prompt Lab', section: 'learning', i18nKey: 'nav_prompt_lab' },
  { path: '/quality', label: 'Quality Dashboard', section: 'learning', i18nKey: 'nav_quality' },
];

const SECTION_LABELS: Record<string, string> = {
  engine: 'Engine',
  admin: 'Administration',
  learning: 'Learning & Quality',
};

const SECTION_I18N_KEYS: Record<string, string> = {
  engine: 'section_engine',
  admin: 'section_admin',
  learning: 'section_learning',
};

/**
 * NAV_VISIBILITY — maps each ViewerRole to the set of paths visible in the sidebar.
 * 'all' means the role sees every item (platform-admin + platform-support).
 * Paths not listed for a role are hidden. Items whose path isn't in NAV_ITEMS are
 * simply no-ops (future-proof — if a path is registered in AppRoutes but not yet in
 * NAV_ITEMS, the filter still behaves correctly).
 *
 * Section headers auto-hide when all items in a section are filtered out.
 */
const NAV_VISIBILITY: Record<string, string[] | 'all'> = {
  anonymous: ['/dashboard', '/marketplace', '/events'],
  'public-marketplace-visitor': ['/dashboard', '/marketplace', '/events'],
  'tenant-user': ['/dashboard', '/marketplace', '/events', '/rsvp', '/attendance'],
  'referral-user': ['/dashboard', '/marketplace', '/events', '/rsvp', '/attendance'],
  freelancer: ['/dashboard', '/marketplace', '/events', '/gigs/post', '/gigs/milestones'],
  'business-partner': ['/dashboard', '/marketplace', '/events', '/ledger', '/billing-dashboard'],
  'event-organiser': ['/dashboard', '/events', '/rsvp', '/attendance', '/marketplace'],
  'tenant-admin': [
    '/dashboard',
    '/tenants',
    '/events',
    '/marketplace',
    '/billing-dashboard',
    '/monitor',
  ],
  'platform-admin': 'all',
  'platform-support': 'all',
};

function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { role } = useViewerRole();
  const sections = ['engine', 'admin', 'learning'] as const;
  // FLOW-48: nav namespace. Defaults fall back to the hardcoded labels for any
  // locale that is missing a key.
  const { t } = useTranslation('nav');

  // C6 (RUN-09): filter NAV_ITEMS by role
  const allowedPaths = NAV_VISIBILITY[role];
  const visibleItems =
    allowedPaths === 'all'
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => (allowedPaths ? allowedPaths.includes(item.path) : false));

  // RUN-147 V-R1 Fix S1: mobile-responsive sidebar.
  // Below md breakpoint the sidebar is a slide-over drawer behind a scrim.
  // At md+ it's the existing fixed column. Keyboard users can focus-trap the
  // drawer; clicking the scrim closes it. aria-hidden="true" on md+ so the
  // drawer doesn't appear twice to screen readers.
  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`${isOpen ? 'fixed' : 'hidden'} inset-0 bg-black/50 z-40 md:hidden`}
        data-testid="sidebar-scrim"
      />
      <aside
        role="navigation"
        aria-label="Primary"
        className={`
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          w-56 bg-gray-900 text-gray-300 flex flex-col h-screen fixed inset-y-0 start-0 z-50
          transition-transform duration-200 ease-out
          md:translate-x-0 md:z-auto
        `}
        data-testid="sidebar"
        data-viewer-role={role}
      >
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">XIIGen</h1>
        <p className="text-xs text-gray-500">
          {t('brand_subtitle', { defaultValue: 'Engine Client' })}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section) => {
          const sectionItems = visibleItems.filter((n) => n.section === section);
          // Hide the section header entirely when all its items are filtered out
          if (sectionItems.length === 0) return null;
          return (
            <div key={section} className="mb-2">
              <p className="px-4 py-1 text-xs uppercase tracking-wider text-gray-500">
                {t(SECTION_I18N_KEYS[section], { defaultValue: SECTION_LABELS[section] })}
              </p>
              {sectionItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  // RUN-49 CF-2 (Pro Max `nav-state-active` P9): Vercel / Linear /
                  // GitHub nav pattern — active item gets left accent border +
                  // bold weight + stronger background contrast so current location
                  // is unmistakable. aria-current="page" is set automatically by
                  // NavLink v6 when active.
                  //
                  // RUN-147 V-R1 Fix S1: min-h-[44px] for ui-ux-pro-max P2 touch target
                  className={({ isActive }) =>
                    `flex items-center pl-3 pr-4 py-2 min-h-[44px] text-sm border-l-2 transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-white font-semibold border-l-blue-400'
                        : 'hover:bg-gray-800 text-gray-300 border-l-transparent'
                    }`
                  }
                  data-testid={`nav-${item.path.replace('/', '')}`}
                >
                  {t(item.i18nKey, { defaultValue: item.label })}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
    </>
  );
}

function NotFoundPage() {
  return (
    <div className="p-6" data-testid="page-notfound">
      <h1 className="text-2xl font-bold text-gray-900">404 — Page Not Found</h1>
      <p className="text-gray-500 mt-2">The page you&apos;re looking for doesn&apos;t exist.</p>
      <NavLink to="/dashboard" className="text-blue-600 hover:underline mt-4 inline-block">
        Back to Dashboard
      </NavLink>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      {/* Track 0 Turn 6 (v9 Issue A): optional :flowId? param — DesignerPage loads that flow when present */}
      <Route path="/designer" element={<DesignerPage />} />
      <Route path="/designer/:flowId" element={<DesignerPage />} />
      {/* Track 0 Turn 6 (v14 Finding R + v15 Finding T): FlowLibraryPage route */}
      <Route path="/flow-library" element={<FlowLibraryPage />} />
      {/* Track 0 Turn 8: RunFlowPage route */}
      <Route path="/run-flow" element={<RunFlowPage />} />
      {/* Turn 6 (MVP Plan v3, Goal 4d): Marketplace route */}
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/monitor" element={<MonitorPage />} />
      <Route path="/registry" element={<RegistryPage />} />
      <Route path="/ledger" element={<LedgerPage />} />
      <Route path="/tenants" element={<TenantsPage />} />
      {/* FLOW-46 Phase B/C: Super Engine Assistant chat */}
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/generation-lab" element={<GenerationLabPage />} />
      <Route path="/model-leaderboard" element={<ModelLeaderboardPage />} />
      <Route path="/prompt-lab" element={<PromptLabPage />} />
      <Route path="/quality" element={<QualityDashboardPage />} />

      {/* FLOW-01: User Registration & Onboarding (T47/T48/T49) */}
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/register/pending-verification" element={<RegistrationPendingPage />} />
      <Route path="/verify" element={<VerifyTokenPage />} />
      <Route path="/verify/resend" element={<ResendPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/auth/sso/:provider" element={<SsoPage />} />

      {/* FLOW-02: Business Onboarding Intelligence */}
      <Route path="/questionnaire" element={<QuestionnairePage />} />
      <Route path="/matching" element={<MatchingPage />} />
      <Route path="/personalization" element={<PersonalizationPage />} />

      {/* FLOW-03: Event Management */}
      <Route path="/events" element={<EventListPage />} />
      <Route path="/events/create" element={<EventCreationPage />} />

      {/* FLOW-04: Event Attendance */}
      <Route path="/rsvp" element={<RsvpPage />} />
      <Route path="/attendance" element={<AttendanceDashboardPage />} />

      {/* FLOW-10: Reviews & Reputation */}
      <Route path="/reviews/submit" element={<ReviewSubmissionPage />} />
      <Route path="/reviews/moderation" element={<ReviewModerationPage />} />
      <Route path="/reviews/reputation/:entityId" element={<ReputationDashboardPage />} />
      <Route path="/reviews/respond/:reviewId" element={<ReviewResponsePage />} />

      {/* Phase 6 TVQ: Topology Visual QA viewer */}
      <Route path="/flow-viewer/:flowId" element={<TopologyViewerPage />} />

      {/* FLOW-11: Schema Registry & DAG */}
      <Route path="/schema-registry" element={<SchemaRegistryPage />} />
      <Route path="/schema-submission" element={<SchemaSubmissionPage />} />
      <Route path="/dag-visualization" element={<DagVisualizationPage />} />

      {/* FLOW-12: Subscription & Recurring Billing */}
      <Route path="/subscription-plans" element={<SubscriptionPlanPage />} />
      <Route path="/subscribe" element={<SubscribePage />} />
      <Route path="/billing-dashboard" element={<BillingDashboardPage />} />

      {/* FLOW-05: Completion Gamification */}
      <Route path="/gamification" element={<GamificationDashboardPage />} />
      <Route path="/learning/progress" element={<LearningProgressPage />} />
      <Route path="/lessons/complete" element={<LessonCompletionPage />} />
      <Route path="/learning/social" element={<SocialLearningPage />} />

      {/* FLOW-06: User Groups & Communities */}
      <Route path="/groups" element={<GroupDiscoveryPage />} />
      <Route path="/groups/:groupId/feed" element={<GroupFeedPage />} />
      <Route path="/groups/:groupId/membership" element={<MembershipStatusPage />} />
      <Route path="/groups/:groupId/tier" element={<TierManagementPage />} />
      <Route path="/groups/:groupId/admin/approvals" element={<GroupApprovalPage />} />

      {/* FLOW-07: Friend Requests & Social Feed */}
      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/friend-requests" element={<FriendRequestPage />} />
      <Route path="/social-feed" element={<SocialFeedPage />} />
      <Route path="/social-graph" element={<SocialGraphPage />} />

      {/* FLOW-08: Marketplace (tenant) — nested under /marketplace/* */}
      <Route path="/marketplace/bootstrap-status" element={<BootstrapStatusPage />} />
      <Route path="/marketplace/discovery" element={<EventDiscoveryPage />} />
      <Route path="/marketplace/register/:eventId" element={<EventRegistrationPage />} />
      <Route path="/marketplace/participation" element={<ParticipationStatusPage />} />
      <Route path="/marketplace/purchases" element={<PurchaseHistoryPage />} />

      {/* FLOW-09: Transactional Event Participation */}
      <Route path="/tickets/purchase" element={<TicketPurchasePage />} />
      <Route path="/tickets/waitlist" element={<WaitlistPage />} />
      <Route path="/tickets/booking" element={<BookingConfirmationPage />} />
      <Route path="/tickets/qr" element={<QRCodePage />} />
      <Route path="/tickets/refund" element={<RefundPage />} />

      {/* FLOW-15: SaaS Multi-Tenancy (admin) */}
      <Route path="/admin/tenants/lifecycle" element={<TenantLifecyclePage />} />
      <Route path="/admin/tenants/provisioning" element={<TenantProvisioningPage />} />

      {/* FLOW-16: Marketplace Payments */}
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/escrow" element={<EscrowDashboardPage />} />

      {/* FLOW-17: Freelancer Marketplace */}
      <Route path="/gigs/post" element={<GigPostingPage />} />
      <Route path="/gigs/milestones" element={<MilestoneDashboardPage />} />

      {/* FLOW-19: Durable Sagas & Compliance (admin) */}
      <Route path="/admin/sagas" element={<SagaDashboardPage />} />
      <Route path="/admin/compliance/audit" element={<ComplianceAuditPage />} />

      {/* FLOW-20: Ads Platform (admin) */}
      <Route path="/admin/ads/auction" element={<AuctionDashboardPage />} />
      <Route path="/admin/ads/consent" element={<ConsentGatePage />} />
      <Route path="/admin/ads-platform" element={<AdsPlatformPage />} />

      {/* FLOW-18: Visual Flow Engine (admin) */}
      <Route path="/admin/visual-flow/canvas" element={<FlowCanvasPage />} />
      <Route path="/admin/visual-flow/publisher" element={<FlowPublisherPage />} />

      {/* FLOW-23: Form Builder Templates */}
      <Route path="/form-templates" element={<TemplateBuilder />} />

      {/* MISSING flows — stub pages authored by gen-missing-stub-pages.py */}
      <Route path="/admin/data-warehouse-analytics" element={<DataWarehouseAnalyticsPage />} />
      <Route path="/admin/etl-data-integration" element={<EtlDataIntegrationPage />} />
      <Route path="/dynamic-forms-workflows" element={<DynamicFormsWorkflowsPage />} />
      <Route path="/cms-publishing" element={<CmsPublishingPage />} />
      <Route path="/ai-safety-moderation" element={<AiSafetyModerationPage />} />
      <Route path="/blog-cms-modules" element={<BlogCmsModulesPage />} />
      <Route path="/admin/marketplace-plugin-adapter" element={<MarketplacePluginAdapterPage />} />
      <Route path="/admin/platform-agent" element={<PlatformAgentPage />} />

      {/* ADMIN_MISSING (ENGINE_INTERNAL) — batch 3 admin consoles */}
      <Route path="/admin/bundle-activation" element={<BundleActivationPage />} />
      <Route path="/admin/bfa-cross-flow-governance" element={<BfaCrossFlowGovernancePage />} />
      <Route path="/admin/meta-flow-engine" element={<MetaFlowEnginePage />} />
      <Route path="/admin/human-interaction-gate" element={<HumanInteractionGatePage />} />
      <Route path="/admin/adaptive-rag-deep-research" element={<AdaptiveRagDeepResearchPage />} />
      <Route path="/admin/tenant-lifecycle-manager" element={<TenantLifecycleManagerPage />} />
      <Route path="/admin/design-intelligence-engine" element={<DesignIntelligenceEnginePage />} />
      <Route path="/admin/sharable-flows-marketplace" element={<SharableFlowsMarketplacePage />} />
      <Route
        path="/admin/system-initiation-bootstrap"
        element={<SystemInitiationBootstrapPage />}
      />
      <Route path="/admin/meta-arbitration-engine" element={<MetaArbitrationEnginePage />} />

      {/* ADMIN_MISSING (ENGINE_INTERNAL) — batch 4 admin consoles */}
      <Route path="/admin/feature-registry" element={<FeatureRegistryPage />} />
      <Route path="/admin/design-system-governance" element={<DesignSystemGovernancePage />} />
      <Route path="/admin/rag-quality-feedback" element={<RagQualityFeedbackPage />} />
      <Route path="/admin/oss-curriculum" element={<OssCurriculumPage />} />
      <Route path="/admin/client-push" element={<ClientPushPage />} />
      <Route path="/admin/rag-quality-graph" element={<RagQualityGraphPage />} />
      <Route path="/admin/meta-flow-orchestration" element={<MetaFlowOrchestrationPage />} />
      <Route path="/admin/ai-self-modification" element={<AiSelfModificationPage />} />
      <Route path="/admin/cycle-chain-extension" element={<CycleChainExtensionPage />} />
      <Route path="/admin/module-lifecycle" element={<ModuleLifecyclePage />} />
      <Route path="/admin/adapter-ci-cd-bridge" element={<AdapterCiCdBridgePage />} />

      {/* FLOW-45: History Bootstrap (RUN-52 — CFI-05 close) */}
      <Route path="/history-bootstrap" element={<HistoryBootstrapPage />} />
      <Route path="/admin/history-bootstrap" element={<HistoryBootstrapPage />} />

      {/* FLOW-48 i18n-translation */}
      <Route path="/settings/language" element={<LanguageSettingsPage />} />
      <Route path="/admin/i18n" element={<AdminI18nPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

const MASTER_TENANT = 'xiigen-master-00000000-0000-0000-0000-000000000001';

/**
 * RUN-147 V-R1 Fix S2: URL \u2192 i18n language sync.
 *
 * Reads `?lang=<xx>` from the current URL and calls i18n.changeLanguage if
 * the URL language differs from the current i18n language. The existing
 * `languageChanged` handler in i18n.ts already flips
 * `document.documentElement.dir` to "rtl" for Hebrew / Arabic, so wiring
 * this hook makes deep-links like `?lang=he` actually render right-to-left.
 *
 * Does NOT run during initial i18n.init(), which has its own detection.
 */
function useURLLanguageSync(): void {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang');
  React.useEffect(() => {
    if (!lang) return;
    const supported = ['en', 'he', 'fr'];
    if (!supported.includes(lang)) return;
    if (i18n.language === lang) return;
    void i18n.changeLanguage(lang);
  }, [lang]);
}

function AppShell() {
  useURLLanguageSync();
  const [showProvisioning, setShowProvisioning] = React.useState(false);
  const [bannerRefresh, setBannerRefresh] = React.useState(0);
  // RUN-147 V-R1 Fix S1: mobile sidebar drawer state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { role } = useViewerRole();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const chromeHidden = searchParams.get('hideChrome') === '1';

  // RUN-49 CF-3: Anonymous / public-marketplace visitors never see the admin
  // Sidebar. Market ref: Stripe, Vercel, GitHub public pages.
  //
  // RUN-120 (Luba directive, 2026-04-20): extend the "no XIIGen admin chrome"
  // set to include tenant-user + referral-user. These are pure consumers of
  // tenant-owned MODULES (marketplace, events, social feed, reviews, gigs)
  // \u2014 they are not administrators of the XIIGen engine, and the XIIGen
  // sidebar labelled "ENGINE / Dashboard / Designer / Run Flow" is misleading
  // and wrong as chrome for their experience. Tenant-owned module surfaces
  // render as the tenant's own product: wordmark-only top chrome, full-width
  // content, no engine-admin left-nav.
  //
  // Roles that STILL see the Sidebar (they administer the platform or tenant):
  //   platform-admin   (XIIGen ops)
  //   platform-support (XIIGen ops)
  //   tenant-admin     (administers their tenant on XIIGen)
  //   event-organiser  (administers events on their tenant)
  //
  // Roles that do NOT see the Sidebar (module-facing users):
  //   anonymous
  //   public-marketplace-visitor
  //   tenant-user      (NEW v120)
  //   referral-user    (NEW v120)
  //   freelancer       (FLOW-07 social/module operator)
  //   business-partner (FLOW-07 social/module operator)
  const isConsumerShell =
    role === 'anonymous' ||
    role === 'public-marketplace-visitor' ||
    role === 'tenant-user' ||
    role === 'referral-user' ||
    role === 'freelancer' ||
    role === 'business-partner';
  const isFlowOneKioskRoute =
    location.pathname === '/register' ||
    location.pathname === '/register/pending-verification' ||
    location.pathname === '/verify' ||
    location.pathname === '/verify/resend' ||
    location.pathname === '/onboarding' ||
    location.pathname.startsWith('/auth/sso/');
  const isPublicVisitor = isConsumerShell || isFlowOneKioskRoute; // back-compat alias

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* UI/UX Pro Max P1 — skip-to-main-content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
        data-testid="skip-to-main"
      >
        Skip to main content
      </a>
      {!isPublicVisitor && !chromeHidden && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
      <main
        id="main-content"
        // RUN-119: ms-56 (margin-inline-start) instead of ml-56 so the main-content
        // offset flips correctly when dir=rtl is set by the i18n languageChanged
        // handler.
        //
        // RUN-147 V-R1 Fix S1: ms-0 below md so mobile main content uses full
        // viewport width; the sidebar is a drawer on mobile and only overlays
        // when the hamburger is tapped.
        className={`flex-1 p-4 md:p-6 ${isPublicVisitor || chromeHidden ? '' : 'ms-0 md:ms-56'}`}
        data-testid="main-content"
      >
        {!chromeHidden && (
          <>
            {/* FLOW-48: LanguageSwitcher lives in the App shell, NOT a Route (P5 spec Arbiter 2) */}
            <div className="flex items-center justify-between mb-4" data-testid="app-shell-topbar">
              {/* RUN-147 V-R1 Fix S1: hamburger button, only visible below md */}
              {!isPublicVisitor && (
                <button
                  type="button"
                  aria-label="Open navigation"
                  aria-expanded={isSidebarOpen}
                  aria-controls="sidebar"
                  onClick={() => setIsSidebarOpen((v) => !v)}
                  className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="sidebar-toggle"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              )}
              {/* Flex spacer for consumer shells so the language switcher still sits right */}
              {isPublicVisitor && <div />}
              <LanguageSwitcher />
            </div>
          </>
        )}
        <KeyStatusBanner
          key={bannerRefresh}
          tenantId={MASTER_TENANT}
          onProvisionClick={() => setShowProvisioning(true)}
        />
        {showProvisioning && (
          <KeyProvisioningForm
            tenantId={MASTER_TENANT}
            onSuccess={() => {
              setBannerRefresh((v) => v + 1);
            }}
          />
        )}
        <AppRoutes />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export { NAV_ITEMS };
