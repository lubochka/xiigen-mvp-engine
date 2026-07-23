/**
 * FLOW-09: Transactional Event Participation — Canonical Contracts
 *
 * Single import point for all FLOW-09 engine contracts and BFA rules.
 *
 * Re-exports:
 *   - transactional-event-participation-transactional-event-contracts.ts (T99–T118 EngineContracts)
 *   - transactional-event-participation-bfa-rules.ts (FLOW_09_BFA_RULES)
 *
 * Task types: T99 EventParticipationOrchestrator, T100 TicketInventoryManager,
 *             T101 PaymentEligibilityGate, T102 TicketIssuer, T103 ReceiptValidator,
 *             T104 RefundOrchestrator, T105 ComplianceEscalationController,
 *             T106 SeatReservationManager, T107 AttendanceTokenService,
 *             T108 TokenRedemptionProcessor, T109 ParticipationDataPipeline,
 *             T110 ParticipationAggregator, T111 CrossFlowParticipationGate,
 *             T112 TicketFormatRenderer (inline-pure), T113 EligibilityCompositeChecker (inline),
 *             T114 RevenueAttributionTracker, T115 ParticipationAnalytics,
 *             T116 FraudSignalCollector, T117 ParticipationExportPipeline,
 *             T118 ParticipationReportGenerator
 *
 * Rule 16: file uses semantic slug "transactional-event-participation" — never "flow-09"
 */

export * from './transactional-event-participation-transactional-event-contracts';
