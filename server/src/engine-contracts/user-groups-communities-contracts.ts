/**
 * FLOW-06: User Groups & Communities — Canonical Contracts
 *
 * Single import point for all FLOW-06 engine contracts and BFA rules.
 *
 * Re-exports:
 *   - user-groups-communities-membership-group-feed-contracts.ts (T99–T118 EngineContracts)
 *   - user-groups-communities-bfa-rules.ts (FLOW_06_BFA_RULES)
 *
 * Task types: T99 JoinRequestValidator, T100 MembershipTierAssigner,
 *             T101 MembershipActivator, T102 MembershipRecorder,
 *             T103 MemberJoinedNotificationSender, T104 ContentFeedSeeder,
 *             T105 TierContentSelector, T106 FeedComposer,
 *             T107 FeedAnalyticsRecorder, T108 NotificationDispatcher,
 *             T109 WelcomeMessageSender, T110 GroupActivityNotifier,
 *             T111 AdminNotificationSender, T112 ApprovalRequestSender,
 *             T113 ApprovalStatusTracker, T114 AccessGrantedRecorder,
 *             T115 MembershipFinalizer, T116 TierUpgradeProcessor,
 *             T117 TierDowngradeProcessor, T118 TierChangeAnalytics
 *
 * Rule 16: file uses semantic slug "user-groups-communities" — never "flow-06"
 */

export * from './user-groups-communities-membership-group-feed-contracts';
