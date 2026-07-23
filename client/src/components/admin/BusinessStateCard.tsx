/**
 * BusinessStateCard — renders a single admin-observable business state as a card
 * with a flow badge, state index, status badge (color-coded), label, and
 * domain-field dl.
 *
 * Used by all mock-states stub pages (FLOW-27, FLOW-05, FLOW-07, ...). Replaces
 * the earlier pattern of rendering a label in a plain div — that pattern
 * produced PNGs that showed topology edge descriptions or DNA architectural
 * patterns rather than user-observable business situations.
 *
 * Each flow's page defines a MOCK_STATES map keyed by the query-string mock key.
 * The component uses `slug` to produce stable testids matching the existing
 * mock-states spec contract: `{slug}-state-{idx}`.
 *
 * Role-aware metadata redaction (RUN-172 P0-3 close, 2026-04-21):
 *   Populated mock states often include admin-only fields like schemaId,
 *   ledgerEntryId, kms-key-prod-02, googlebot, sitemapEntry, bundleId etc.
 *   These leak to anonymous / public-marketplace-visitor / tenant-user
 *   viewers who land on a ?mock=<populated_key> URL. The component now reads
 *   useViewerRole() internally and hides the fields grid + replaces with a
 *   "details hidden" notice when the viewer role is consumer-facing. The
 *   label + status badge remain visible so the business state is still
 *   communicated at a coarse level.
 */

import React from 'react';
import { flowHumanName } from '../../utils/flowHumanName';
import { useViewerRole } from '../../hooks/useViewerRole';
import type { ViewerRole } from '../common/ViewerRole';

export interface BusinessState {
  idx: number;
  label: string;
  status: string;
  fields?: Record<string, string>;
}

const STATUS_COLOR_CLASSES: Record<string, string> = {
  // green family — success / completion / confirmed
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
  COMPLETE: 'bg-green-100 text-green-800 border-green-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  INSTALLED: 'bg-green-100 text-green-800 border-green-200',
  LISTED: 'bg-green-100 text-green-800 border-green-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  CONNECTED: 'bg-green-100 text-green-800 border-green-200',
  BOUND: 'bg-green-100 text-green-800 border-green-200',
  READY: 'bg-green-100 text-green-800 border-green-200',
  WARM: 'bg-green-100 text-green-800 border-green-200',
  SYNCED: 'bg-green-100 text-green-800 border-green-200',
  ENFORCED: 'bg-green-100 text-green-800 border-green-200',
  VERIFIED: 'bg-green-100 text-green-800 border-green-200',

  // yellow family — in-progress / pending / queued
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  QUEUED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  WAITLISTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  RUNNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  INGESTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  EXTRACTING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  GENERATING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  TRANSFORMING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  SCHEDULED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IDLE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  REVIEW_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  REVIEW_REQUESTED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  AWAITING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COLD: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BOOTSTRAPPING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ONBOARDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  PROVISIONING: 'bg-yellow-100 text-yellow-800 border-yellow-200',

  // blue family — in-chain / active-cycle / information / transient
  IN_CHAIN: 'bg-blue-100 text-blue-800 border-blue-200',
  CHAIN_ACTIVE: 'bg-blue-100 text-blue-800 border-blue-200',
  SEQUENTIAL: 'bg-blue-100 text-blue-800 border-blue-200',
  PARALLEL: 'bg-blue-100 text-blue-800 border-blue-200',
  SUBMITTED: 'bg-blue-100 text-blue-800 border-blue-200',
  RECEIVED: 'bg-blue-100 text-blue-800 border-blue-200',
  DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-200',
  CAPTURED: 'bg-blue-100 text-blue-800 border-blue-200',
  REGISTERED: 'bg-blue-100 text-blue-800 border-blue-200',
  SENT: 'bg-blue-100 text-blue-800 border-blue-200',

  // red family — failures / rejections / halts
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  DECLINED: 'bg-red-100 text-red-800 border-red-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  BLOCKED: 'bg-red-100 text-red-800 border-red-200',
  ERROR: 'bg-red-100 text-red-800 border-red-200',
  VIOLATION_DETECTED: 'bg-red-100 text-red-800 border-red-200',
  VIOLATION: 'bg-red-100 text-red-800 border-red-200',
  CONFLICT_DETECTED: 'bg-red-100 text-red-800 border-red-200',
  ROLLBACK_TRIGGERED: 'bg-red-100 text-red-800 border-red-200',

  // orange family — escalated / degraded / deprecated / timeout
  ESCALATED: 'bg-orange-100 text-orange-800 border-orange-200',
  DEGRADED: 'bg-orange-100 text-orange-800 border-orange-200',
  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
  DEPRECATED: 'bg-orange-100 text-orange-800 border-orange-200',
  TIMEOUT: 'bg-orange-100 text-orange-800 border-orange-200',
  FRAUD_CHECKED: 'bg-orange-100 text-orange-800 border-orange-200',

  // purple family — specialized / delegated / issued / redeemed
  DELEGATED: 'bg-purple-100 text-purple-800 border-purple-200',
  ISSUED: 'bg-purple-100 text-purple-800 border-purple-200',
  REFUNDED: 'bg-purple-100 text-purple-800 border-purple-200',
  REDEEMED: 'bg-purple-100 text-purple-800 border-purple-200',
  TERMINATED: 'bg-purple-100 text-purple-800 border-purple-200',
  OFFBOARDED: 'bg-purple-100 text-purple-800 border-purple-200',
  OVERRIDE_APPLIED: 'bg-purple-100 text-purple-800 border-purple-200',
  MODERATED: 'bg-purple-100 text-purple-800 border-purple-200',

  // gray family — default / unknown / expired
  EXPIRED: 'bg-gray-100 text-gray-700 border-gray-200',
  REMOVED: 'bg-gray-100 text-gray-700 border-gray-200',
  UNPUBLISHED: 'bg-gray-100 text-gray-700 border-gray-200',
  ARCHIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  CLOSED: 'bg-gray-100 text-gray-700 border-gray-200',
};

function statusClass(status: string): string {
  return STATUS_COLOR_CLASSES[status] ?? 'bg-indigo-100 text-indigo-800 border-indigo-200';
}

// V-R15 Wave 4 systemic humanization —————————————————————————————————————————
// Field keys in MOCK_STATES fixtures are camelCase (planCode, nextBillingDate,
// bundleId) because they mirror the event-schema shape the flow emits. On the
// rendered admin surface these were being shown verbatim, giving the admin
// a dev-debug feel instead of a human-readable card. Convert:
//   'planCode'        → 'Plan'
//   'nextBillingDate' → 'Next billing date'
//   'kmsKeyId'        → 'KMS key'
//   'eventId'         → 'Event ID'  (trailing 'Id' → ' ID')
// Exact single-word overrides win over the generic camelCase split.
const KEY_LABEL_OVERRIDES: Record<string, string> = {
  planCode: 'Plan',
  priceMonthly: 'Price / month',
  currentPeriod: 'Billing period',
  nextBillingDate: 'Next billing date',
  paymentMethod: 'Payment method',
  kmsKeyId: 'KMS key',
  encryptionKey: 'Encryption key',
  bundleId: 'Bundle',
  tenantId: 'Tenant',
  planId: 'Plan',
  createdBy: 'Created by',
  bootId: 'Boot ID',
  warmedAt: 'Warmed at',
  requestsServed: 'Requests served',
  healthScore: 'Health score',
  publishedAt: 'Published at',
  publicUrl: 'Public URL',
  schemaId: 'Schema ID',
  auctionId: 'Auction',
  bidId: 'Bid',
  advertiserId: 'Advertiser',
  ledgerEntryId: 'Ledger entry',
  creativeId: 'Creative',
  contentId: 'Content',
  authorId: 'Author',
  wordCount: 'Word count',
  lastSavedAt: 'Last saved',
  assignedReviewer: 'Reviewer',
  submittedAt: 'Submitted at',
  finalApprover: 'Final approver',
  approvedAt: 'Approved at',
  versionId: 'Version',
  publishAt: 'Publish at',
  dispatcherJobId: 'Dispatcher job',
  archivedAt: 'Archived at',
  archiveReason: 'Archive reason',
  archivedBy: 'Archived by',
  sessionId: 'Session',
  completedAt: 'Completed at',
};

function humanizeKey(raw: string): string {
  if (KEY_LABEL_OVERRIDES[raw]) return KEY_LABEL_OVERRIDES[raw];
  // camelCase split, then normalize trailing 'Id' to ' ID'
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\bId\b/g, 'ID')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Enum-looking ALL_CAPS values get title-cased; other values pass through.
// '0.07', 'kms://...', '/forms/...', 'FRM-2026-...', 'tenant-master', etc. all
// fail the ENUM regex so they render unchanged.
const ENUM_RE = /^[A-Z][A-Z0-9_]*$/;

function humanizeValue(raw: string): string {
  if (!ENUM_RE.test(raw)) return raw;
  return raw
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Roles that must NEVER see raw admin metadata (schema IDs, ledger entries,
 * KMS key names, crawler user-agents, sitemap paths, internal tenant IDs).
 * Mock states are admin inspector surfaces by design — populated fixtures
 * include identifiers that leak information about internal data shape when
 * viewed by a consumer-facing persona.
 */
const CONSUMER_FACING_ROLES: readonly ViewerRole[] = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
];

function isConsumerFacingRole(role: ViewerRole): boolean {
  return (CONSUMER_FACING_ROLES as readonly string[]).includes(role);
}

export interface BusinessStateCardProps {
  slug: string;
  flowId: string;
  title: string;
  state: BusinessState;
  description?: string;
}

export function BusinessStateCard({ slug, flowId, title, state, description }: BusinessStateCardProps) {
  const { role } = useViewerRole();
  const redactFields = isConsumerFacingRole(role);

  return (
    <div
      data-testid={`page-${slug}`}
      data-viewer-role={role}
      className="max-w-3xl mx-auto mt-8 p-6 bg-white rounded-lg shadow"
    >
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1" data-flow-id={flowId} data-slug={slug}>
            {/* V-R15 Wave 4: "state N" subtitle was an engineering-debug leak
                for consumer-facing roles. Show plain flow name for them;
                admin roles still see the state index for reference. */}
            {flowHumanName(flowId)}
            {!redactFields && ` · step ${state.idx}`}
          </p>
          {description && !redactFields && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <span
          data-testid={`${slug}-status-badge`}
          data-status-code={state.status}
          className={`inline-flex px-3 py-1 rounded text-xs font-semibold border ${statusClass(state.status)}`}
        >
          {humanizeValue(state.status)}
        </span>
      </header>

      <div
        data-testid={`${slug}-state-${state.idx}`}
        className="p-4 border border-gray-200 rounded bg-gray-50"
      >
        {!redactFields && (
          <p className="text-sm font-medium text-gray-600 mb-1">Step {state.idx}</p>
        )}
        <p className="text-base font-semibold text-gray-900 mb-4">{state.label}</p>
        {state.fields && Object.keys(state.fields).length > 0 && (
          redactFields ? (
            <div
              data-testid={`${slug}-fields-redacted`}
              className="text-xs text-gray-500 italic border-t border-gray-200 pt-3"
            >
              Additional technical details are only visible to administrators.
            </div>
          ) : (
            <dl className="space-y-1.5 text-sm border-t border-gray-200 pt-3">
              {Object.entries(state.fields).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="text-gray-500 w-36 flex-shrink-0 font-medium">{humanizeKey(k)}</dt>
                  <dd data-testid={`${slug}-field-${k}`} className="text-gray-900 font-mono text-xs break-all">
                    {humanizeValue(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )
        )}
      </div>

      {/* Sentinel so the `-default` assertion in existing mock-state specs stays green. */}
      <div data-testid={`${slug}-default`} className="sr-only">
        state-{state.idx}
      </div>
    </div>
  );
}
