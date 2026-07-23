/**
 * DesignSystemGovernancePage — FLOW-37 admin console for Design System Governance.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state)
 *   no ?mock     → real CRUD panel against xiigen-design-system-governance
 *
 * Derived states (UX-FIX Track UX-2). Sources:
 *   - Plan states: RULE_DRAFT → VALIDATED → PUBLISHED → VIOLATION_DETECTED → ENFORCED
 *   - Server enums:
 *       architecture-scorer.service.ts         → 'STRONG' | 'ADEQUATE' | 'WEAK'
 *       cross-design-impact-analyzer.service.ts → 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
 *       design-conflict-detector.service.ts     → 'DESIGN_CONFLICT_DETECTED'
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import {
  StackPortingScreen,
  type CouplingClassificationItem,
  type CompatibilityReportItem,
} from '../../components/stack-coupling/StackPortingScreen';

// CFI-05 close + SPEC-LOCATION-ADDENDUM correction:
// FLOW-37 is Multi-Stack Porting (coupling taxonomy), NOT Figma-style design
// system governance. Reference platforms: Flyway migration compatibility +
// SonarQube dependency audit + Percy visual diff matrix.

// Coupling classifications across target stacks. Category values:
// CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE
const PLATFORM_CLASSIFICATIONS: CouplingClassificationItem[] = [
  { stackId: 'node-express', category: 'CONCEPT_NEUTRAL' },
  { stackId: 'nestjs', category: 'CONCEPT_NEUTRAL' },
  { stackId: 'python-fastapi', category: 'IMPL_VARIES' },
  { stackId: 'python-flask', category: 'IMPL_VARIES' },
  { stackId: 'go-fiber', category: 'IMPL_VARIES' },
  { stackId: 'java-spring', category: 'STACK_COUPLED' },
  { stackId: 'rust-actix', category: 'STACK_COUPLED' },
  { stackId: 'dotnet-aspnet', category: 'INCOMPATIBLE' },
];

// Per-task-type compatibility reports with incompatible dimensions named.
// RUN-154 V-R5: taskTypeId renders a human capability name only — no T-NN
// suffix per 2026-04-21 "no XX-NN in user copy" directive.
const PLATFORM_REPORTS: CompatibilityReportItem[] = [
  {
    reportId: 'CMP-2026-0420-001',
    taskTypeId: 'Flow canvas \u2014 initialize',
    stackId: 'python-fastapi',
    compatibility: 'COMPATIBLE',
  },
  {
    reportId: 'CMP-2026-0420-002',
    taskTypeId: 'Flow canvas \u2014 initialize',
    stackId: 'go-fiber',
    compatibility: 'DEGRADED',
    incompatibleDimensions: ['runtime-async-model', 'test-framework'],
  },
  {
    reportId: 'CMP-2026-0420-003',
    taskTypeId: 'Code-injection guard',
    stackId: 'java-spring',
    compatibility: 'INCOMPATIBLE',
    incompatibleDimensions: ['build-system', 'dependency-resolution', 'runtime'],
  },
  {
    reportId: 'CMP-2026-0420-004',
    taskTypeId: 'Cross-flow policy auto-registration',
    stackId: 'nestjs',
    compatibility: 'COMPATIBLE',
  },
  {
    reportId: 'CMP-2026-0420-005',
    taskTypeId: 'Cross-flow policy auto-registration',
    stackId: 'dotnet-aspnet',
    compatibility: 'INCOMPATIBLE',
    incompatibleDimensions: ['event-bus', 'dependency-injection', 'config', 'tenant-isolation'],
  },
];
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { PlatformOpsPage } from '../../components/common/PlatformOpsPage';

const MOCK_STATES: Record<string, BusinessState> = {
  'rule-draft': {
    idx: 1,
    label: 'Design rule draft authored — awaiting validation',
    status: 'DRAFT',
    fields: {
      ruleId: 'DS-RULE-2026-0419-001',
      specId: 'SPEC-button-v3',
      author: 'design-council',
      draftedAt: '2026-04-19 09:15',
    },
  },
  validated: {
    idx: 2,
    label: 'Rule validated — architecture score STRONG, no conflicts',
    status: 'VERIFIED',
    fields: {
      ruleId: 'DS-RULE-2026-0419-001',
      architectureScore: '0.86',
      classification: 'STRONG',
      validatedAt: '2026-04-19 09:22',
    },
  },
  published: {
    idx: 3,
    label: 'Rule published to component catalog — now governing new specs',
    status: 'PUBLISHED',
    fields: {
      ruleId: 'DS-RULE-2026-0419-001',
      catalogVersion: 'v17.4',
      componentCount: '42',
      publishedAt: '2026-04-19 09:30',
    },
  },
  'violation-detected': {
    idx: 4,
    label: 'Violation detected — spec conflicts with published rule (severity HIGH)',
    status: 'VIOLATION_DETECTED',
    fields: {
      ruleId: 'DS-RULE-2026-0419-001',
      offendingSpec: 'SPEC-dialog-v2',
      severity: 'HIGH',
      detectedAt: '2026-04-19 09:45',
    },
  },
  enforced: {
    idx: 5,
    label: 'Rule enforced — offending spec blocked at deployment gate',
    status: 'ENFORCED',
    fields: {
      ruleId: 'DS-RULE-2026-0419-001',
      offendingSpec: 'SPEC-dialog-v2',
      action: 'DEPLOYMENT_BLOCKED',
      enforcedAt: '2026-04-19 09:47',
    },
  },
  'conflict-detected': {
    idx: 6,
    label: 'Cross-design conflict detected — two rules targeting same token',
    status: 'CONFLICT_DETECTED',
    fields: {
      ruleAId: 'DS-RULE-2026-0419-001',
      ruleBId: 'DS-RULE-2026-0418-007',
      token: 'color.primary.500',
      detectedAt: '2026-04-19 09:50',
    },
  },
  'impact-critical': {
    idx: 7,
    label: 'Cross-design impact CRITICAL — downstream components need audit',
    status: 'ESCALATED',
    fields: {
      ruleId: 'DS-RULE-2026-0419-002',
      severity: 'CRITICAL',
      affectedComponents: '18',
      escalatedAt: '2026-04-19 09:55',
    },
  },
  'rule-deprecated': {
    idx: 8,
    label: 'Rule deprecated — superseded by newer design-system revision',
    status: 'DEPRECATED',
    fields: {
      ruleId: 'DS-RULE-2026-0312-003',
      replacedBy: 'DS-RULE-2026-0419-001',
      catalogVersion: 'v17.4',
      deprecatedAt: '2026-04-19 10:00',
    },
  },
};

export function DesignSystemGovernancePage() {
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  if (mockState && MOCK_STATES[mockState]) {
    return (
      <BusinessStateCard
        slug="design-system-governance"
        flowId="FLOW-37"
        title="Design System Governance"
        state={MOCK_STATES[mockState]}
        description="Admin view of design rule authoring, validation, publication, violation detection, and enforcement."
      />
    );
  }

  // CFI-05 close — default view renders the purpose-built StackPortingScreen
  // (coupling classifications + compatibility reports). Per SPEC-LOCATION-
  // ADDENDUM correction: this flow is Multi-Stack Porting for engine
  // self-awareness, NOT Figma design governance.
  return (
    <PlatformOpsPage
      flowSlug="design-system-governance"
      flowDisplayName="Design System Governance"
      adminContent={
        <StackPortingScreen classifications={PLATFORM_CLASSIFICATIONS} reports={PLATFORM_REPORTS} />
      }
    />
  );
}

// Retained export for potential future use; explicitly not mounted as default.
void AdminCrudPanel;
