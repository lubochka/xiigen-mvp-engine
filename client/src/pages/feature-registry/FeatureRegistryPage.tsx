/**
 * FeatureRegistryPage — FLOW-36 admin console for Feature Registry (FT-NN feature records).
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from P1+svc)
 *   no ?mock     → real CRUD panel against xiigen-feature-registry index
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - P1 inventory (feature-registry/P1-business-logic-inventory.md) — 22 transition rows.
 *   - Server status enums:
 *       feature-signal-aggregator.service.ts  → SignalMode: 'MODE_A' | 'MODE_B'
 *       porting-decision-gate.service.ts      → decision: APPROVE / DEFER / BLOCK
 *       platform-adapter-generator.service.ts → 'PORTING_PROHIBITED'
 *       platform-simulator.service.ts         → SimulationStatus: 'PASS' | 'FAIL' | 'RETRY_EXHAUSTED'
 *   - Draft lifecycle: FEATURE_REGISTERED → VALIDATED → ACTIVE → DEPRECATED → REMOVED, plus blocked branch.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { FeatureMatrixScreen } from '../../components/feature-registry/FeatureMatrixScreen';
import type { FeatureRecord } from '../../components/feature-registry/FeatureMatrixRow';

// CFI-05 close: seed FT records covering the full porting-lifecycle spectrum.
// Reference: LaunchDarkly + Split.io + Unleash (feature flag dashboards).
const SEED_FEATURES: FeatureRecord[] = [
  {
    ftId: 'FT-024',
    name: 'Event capacity overflow',
    description: 'Handle overflow bookings when event hits its capacity limit.',
    portingCandidate: true,
    platforms: [
      {
        platformId: 'web',
        status: 'active',
        adapterMode: 'production',
        signals: { installs: 3247, activeUsers30d: 1892, signalScore: 0.84 },
      },
    ],
  },
  {
    ftId: 'FT-031',
    name: 'Gig milestone escrow',
    description: 'Escrow-locked milestone payments for freelancer deliverables.',
    portingCandidate: true,
    platforms: [
      {
        platformId: 'web',
        status: 'active',
        adapterMode: 'production',
        signals: { installs: 1428, activeUsers30d: 847, signalScore: 0.72 },
      },
      {
        platformId: 'mobile-ios',
        status: 'pilot',
        adapterMode: 'beta',
        signals: { installs: 213, activeUsers30d: 186, signalScore: 0.61 },
      },
    ],
  },
  {
    ftId: 'FT-047',
    name: 'Adaptive RAG deep research',
    description: 'Engine-internal multi-hop retrieval with adaptive planning.',
    portingCandidate: false,
    portingCandidateReason:
      'Engine-internal: depends on XIIGen cycle architecture and cannot be ported to external platforms.',
    platforms: [],
  },
  {
    ftId: 'FT-052',
    name: 'Marketplace template gallery',
    description: 'Sharable flow templates with install count + version badge.',
    portingCandidate: true,
    platforms: [],
  },
  {
    ftId: 'FT-063',
    name: 'Meta-arbitration consensus',
    description: 'Five-policy-evaluator consensus panel for engine self-modification gates.',
    portingCandidate: false,
    portingCandidateReason:
      'Engine governance: uses cross-flow policies and tenant-boundary evaluators specific to XIIGen.',
    platforms: [],
  },
  {
    ftId: 'FT-071',
    name: 'Tenant onboarding wizard',
    description: 'Typeform-style multi-step tenant profile questionnaire.',
    portingCandidate: true,
    platforms: [
      {
        platformId: 'web',
        status: 'active',
        adapterMode: 'production',
        signals: { installs: 5812, activeUsers30d: 4207, signalScore: 0.91 },
      },
    ],
  },
];
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';

const MOCK_STATES: Record<string, BusinessState> = {
  'feature-registered': {
    idx: 1,
    label: 'Feature extracted from source — FT record created',
    status: 'REGISTERED',
    fields: {
      featureId: 'FT-024',
      name: 'event-attendance capacity-overflow',
      source: 'FLOW-04',
      registeredAt: '2026-04-19 09:00',
    },
  },
  'decision-pending': {
    idx: 2,
    label: 'Porting decision gate — awaiting cost estimate',
    status: 'PENDING',
    fields: {
      featureId: 'FT-024',
      targetPlatform: 'marketplace',
      decisionGate: 'portingDecisionGate',
      enteredAt: '2026-04-19 09:15',
    },
  },
  'feature-verified': {
    idx: 3,
    label: 'Platform simulator PASS — feature verified for target platform',
    status: 'VERIFIED',
    fields: {
      featureId: 'FT-024',
      targetPlatform: 'marketplace',
      simulationStatus: 'PASS',
      verifiedAt: '2026-04-19 10:00',
    },
  },
  'feature-active': {
    idx: 4,
    label: 'Platform adapter installed — feature active on target',
    status: 'ACTIVE',
    fields: {
      featureId: 'FT-024',
      targetPlatform: 'marketplace',
      adapterMode: 'MODE_B',
      activatedAt: '2026-04-19 10:30',
    },
  },
  'feature-blocked': {
    idx: 5,
    label: 'Porting blocked — decision gate returned BLOCK',
    status: 'BLOCKED',
    fields: {
      featureId: 'FT-031',
      decision: 'BLOCK',
      reason: 'PORTING_PROHIBITED',
      blockedAt: '2026-04-19 10:45',
    },
  },
  'feature-deprecated': {
    idx: 6,
    label: 'Feature deprecated — replacement FT-041 scheduled',
    status: 'DEPRECATED',
    fields: {
      featureId: 'FT-024',
      replacedBy: 'FT-041',
      deprecatedAt: '2026-04-19 11:20',
      removalDate: '2026-05-19',
    },
  },
  'feature-removed': {
    idx: 7,
    label: 'Feature removed — adapter uninstalled, FT record archived',
    status: 'REMOVED',
    fields: {
      featureId: 'FT-012',
      targetPlatform: 'marketplace',
      removedAt: '2026-04-19 12:00',
      archiveRef: 'ARCH-2026-FT-012',
    },
  },
};

export function FeatureRegistryPage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="feature-registry"
        flowId="FLOW-36"
        title="Feature Registry"
        state={MOCK_STATES[mockState]}
        description="Admin view of FT-XXX records — registration, porting decision, verification, activation, deprecation."
      />
    );
  }

  // CFI-05 close — default view renders the purpose-built FeatureMatrixScreen
  // with seeded FT records. AdminCrudPanel is retained in the imports for
  // potential future use but NOT mounted as the default (REPAIR-GUIDANCE
  // must-not-do #1). Reference: LaunchDarkly / Split.io / Unleash.
  return (
    <PlatformOpsPage
      flowSlug="feature-registry"
      flowDisplayName="Feature Registry"
      adminContent={<FeatureMatrixScreen features={SEED_FEATURES} />}
    />
  );
}

// Retained export for flow-internal use; explicitly not mounted as default.
void AdminCrudPanel;
