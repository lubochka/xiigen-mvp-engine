/**
 * DynamicFormsWorkflowsPage — FLOW-21 admin console for Dynamic Forms & Workflows (dynamic-forms-workflows).
 *
 * Role-awareness architecture (C6 / SK-539 — RUN-28 special pattern):
 *   FLOW-21 forms are authored by tenant-admins in a DSL. Rather than React-level
 *   RoleScopedView branching, this flow exposes `viewerRole` as a first-class
 *   variable inside the form-condition DSL. Admins write conditions like
 *   `viewerRole == 'freelancer'` to show/hide fields per role — without touching
 *   React code.
 *
 *   See `client/src/utils/formConditionEvaluator.ts` for the evaluator.
 *
 * Hybrid rendering:
 *   ?mock=<key>  → business-state stub (status card per derived state from svc)
 *   no ?mock     → live role-aware demo form + admin CRUD for authorised roles
 *
 * Derived states (UX-FIX Track UX-2):
 *   Plan backbone: FORM_DRAFT → PUBLISHED → SUBMISSION_RECEIVED → AUTOMATION_TRIGGERED
 *   Plus server-derived states from form-schema-publisher / form-submission-processor
 *   / submission-analytics-collector / automation-dispatcher.
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCrudPanel } from '../../components/admin/AdminCrudPanel';
import { BusinessStateCard, BusinessState } from '../../components/admin/BusinessStateCard';
import { FormBuilderPanel } from './FormBuilderPanel';
import { FormRespondentKiosk } from './FormRespondentKiosk';
import { useViewerRole } from '../../hooks/useViewerRole';
import {
  evaluateCondition,
  type FormConditionContext,
} from '../../utils/formConditionEvaluator';

const ROLE_LABELS: Record<string, string> = {
  'anonymous': 'an anonymous visitor',
  'tenant-user': 'a tenant user',
  'tenant-admin': 'a tenant administrator',
  'freelancer': 'a freelancer',
  'business-partner': 'a business partner',
  'event-organiser': 'an event organiser',
  'platform-admin': 'a platform administrator',
  'platform-support': 'platform support',
  'referral-user': 'a referred user',
  'public-marketplace-visitor': 'a marketplace visitor',
};
function humanizeRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function humanizeCondition(condition: string): string {
  const m = condition.match(/viewerRole\s*(==|!=)\s*['"]([^'"]+)['"]/);
  if (!m) return condition;
  const [, op, role] = m;
  const roleName = ROLE_LABELS[role] ?? role;
  return op === '==' ? `Shown only to ${roleName}.` : `Hidden from ${roleName}.`;
}

// Demo form schema showing viewerRole-aware conditional fields.
// This is what a tenant-admin would author in the form builder DSL (FLOW-23).
const DEMO_FORM_SCHEMA = {
  schemaId: 'FRM-demo-role-aware',
  title: 'Role-Aware Form Demo',
  fields: [
    {
      id: 'full-name',
      type: 'text',
      label: 'Full Name',
      required: true,
      condition: undefined as string | undefined,
    },
    {
      id: 'email',
      type: 'email',
      label: 'Email Address',
      required: true,
      condition: undefined as string | undefined,
    },
    {
      id: 'hourly-rate',
      type: 'number',
      label: 'Hourly Rate (USD)',
      required: false,
      condition: "viewerRole == 'freelancer'",
    },
    {
      id: 'company-name',
      type: 'text',
      label: 'Company Name',
      required: false,
      condition: "viewerRole != 'anonymous'",
    },
    {
      id: 'budget',
      type: 'number',
      label: 'Project Budget (USD)',
      required: false,
      condition: "viewerRole == 'business-partner'",
    },
    {
      id: 'internal-notes',
      type: 'textarea',
      label: 'Internal Notes',
      required: false,
      condition: "viewerRole == 'tenant-admin'",
    },
  ],
} as const;

const MOCK_STATES: Record<string, BusinessState> = {
  'form-draft': {
    idx: 1,
    label: 'Form schema saved as draft — builder still adding fields',
    status: 'DRAFT',
    fields: {
      schemaId: 'FRM-2026-0419-017',
      authorId: 'builder-priya',
      fieldCount: '5',
      lastSavedAt: '2026-04-19 10:30',
    },
  },
  'no-fields': {
    idx: 2,
    label: 'Publish blocked — schema has no fields defined',
    status: 'BLOCKED',
    fields: {
      schemaId: 'FRM-2026-0419-018',
      reason: 'NO_FIELDS_DEFINED',
      tenantId: 'tenant-master',
      gateStage: 'form-schema-publisher',
    },
  },
  published: {
    idx: 3,
    label: 'Form schema published — accepting submissions',
    status: 'PUBLISHED',
    fields: {
      schemaId: 'FRM-2026-0419-017',
      version: '3',
      publishedAt: '2026-04-19 11:00',
      publicUrl: '/forms/FRM-2026-0419-017',
    },
  },
  'occ-conflict': {
    idx: 4,
    label: 'Concurrent publish rejected — optimistic concurrency conflict',
    status: 'CONFLICT_DETECTED',
    fields: {
      schemaId: 'FRM-2026-0419-017',
      reason: 'OCC_CONFLICT',
      expectedVersion: '3',
      actualVersion: '4',
    },
  },
  'submission-received': {
    idx: 5,
    label: 'Form submission received — validation passed',
    status: 'RECEIVED',
    fields: {
      submissionId: 'SUB-2026-0419-0042',
      schemaId: 'FRM-2026-0419-017',
      submitterId: 'usr-3821',
      receivedAt: '2026-04-19 11:15',
    },
  },
  'submission-rejected': {
    idx: 6,
    label: 'Submission rejected — required fields missing',
    status: 'REJECTED',
    fields: {
      submissionId: 'SUB-2026-0419-0043',
      validationErrors: '2',
      firstError: 'REQUIRED_FIELD_MISSING:email',
      rejectedAt: '2026-04-19 11:16',
    },
  },
  'automation-triggered': {
    idx: 7,
    label: 'Automation dispatched — notification queued, CRM webhook fired',
    status: 'DISPATCHED',
    fields: {
      submissionId: 'SUB-2026-0419-0042',
      automationCount: '3',
      webhookTarget: 'https://crm.example/hook',
      dispatchedAt: '2026-04-19 11:16',
    },
  },
  'analytics-updated': {
    idx: 8,
    label: 'Submission analytics updated — daily metrics refreshed',
    status: 'SYNCED',
    fields: {
      schemaId: 'FRM-2026-0419-017',
      dateWindow: 'TODAY',
      submissionCount: '47',
      updatedAt: '2026-04-19 11:17',
    },
  },
};

// V-R11 P0-1 defense-in-depth: consumer-facing viewer roles must never see
// raw admin metadata on populated mock-state captures. BusinessStateCard has
// its own role-based redaction, but RUN-176 V-R10 verification showed DFW
// populated-anonymous + populated-tenant-user still leak schemaId/version/
// publishedAt/publicUrl. We strip the `fields` object at the page level as a
// second safety net so the populated captures cannot regress.
const DFW_CONSUMER_FACING_ROLES = new Set([
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
]);

export function DynamicFormsWorkflowsPage() {
  const { role } = useViewerRole();
  const [searchParams] = useSearchParams();
  const mockState = searchParams.get('mock');

  // V-R13 Path A0: G7 three-column builder (tenant-admin + platform-admin only).
  // Gated on role so consumer roles cannot access the schema-authoring UI via
  // a crafted URL. Anonymous/tenant-user/etc. fall through to Path B (live demo).
  if (mockState === 'build' && (role === 'tenant-admin' || role === 'platform-admin')) {
    return (
      <div data-testid="page-dynamic-forms-workflows" data-viewer-role={role}>
        <FormBuilderPanel />
      </div>
    );
  }

  // V-R13 Path A1: Typeform-style respondent kiosk (any role — this is the
  // public respondent surface that authenticated + anonymous users both use).
  if (mockState === 'respond') {
    return (
      <div data-testid="page-dynamic-forms-workflows" data-viewer-role={role}>
        <FormRespondentKiosk />
      </div>
    );
  }

  // Path A: mock states. BusinessStateCard already redacts for consumer-facing
  // roles, but we strip the `fields` prop at the page level as well so no
  // render path can regress and leak schemaId/version/publishedAt/publicUrl.
  if (mockState && MOCK_STATES[mockState]) {
    const rawState = MOCK_STATES[mockState];
    const redacted = DFW_CONSUMER_FACING_ROLES.has(role);
    const safeState: BusinessState = redacted
      ? { idx: rawState.idx, label: rawState.label, status: rawState.status }
      : rawState;
    return (
      <BusinessStateCard
        slug="dynamic-forms-workflows"
        flowId="FLOW-21"
        title="Dynamic Forms & Workflows"
        state={safeState}
        description="Admin view of form schemas, submissions, validation, and workflow automations."
      />
    );
  }

  // Path B: live role-aware demo form + admin panel for admin roles
  const conditionContext: FormConditionContext = { viewerRole: role };
  const visibleFields = DEMO_FORM_SCHEMA.fields.filter((f) =>
    evaluateCondition(f.condition, conditionContext)
  );

  return (
    <div
      data-testid="page-dynamic-forms-workflows"
      data-viewer-role={role}
      className="p-6 max-w-4xl"
    >
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dynamic forms &amp; workflows</h1>
      <p className="text-sm text-gray-500 mb-6">
        Build forms that show or hide fields based on who is filling them in. Each field can be
        targeted to a specific audience — anonymous visitors, registered users, freelancers,
        business partners, or tenant administrators.
      </p>

      {/* Role-aware demo form (live DSL evaluation) */}
      <section data-testid="dfwf-demo-section" className="mb-8 p-5 border rounded-lg bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{DEMO_FORM_SCHEMA.title}</h2>
          <span
            data-testid="dfwf-role-indicator"
            className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
          >
            Previewing as {humanizeRole(role)}
          </span>
        </div>

        {role === 'tenant-admin' && (
          <div
            data-testid="dfwf-admin-dsl-note"
            className="mb-4 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700"
          >
            <strong>Tenant-admin tip:</strong> Fields with a role-based visibility rule are
            shown or hidden based on who is filling in the form. Use the Form Builder to author
            these rules visually.
          </div>
        )}

        <form
          data-testid="dfwf-demo-form"
          onSubmit={(e) => e.preventDefault()}
          noValidate
          className="space-y-4"
        >
          {visibleFields.length === 0 && (
            <p data-testid="dfwf-no-fields" className="text-sm text-gray-400 italic">
              No fields are visible for this role.
            </p>
          )}

          {visibleFields.map((field) => (
            <div
              key={field.id}
              data-testid={`dfwf-field-${field.id}`}
              className="space-y-1"
            >
              <label
                htmlFor={`dfwf-input-${field.id}`}
                className="block text-sm font-medium text-gray-700"
              >
                {field.label}
                {field.required && (
                  <span aria-label="required" className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  id={`dfwf-input-${field.id}`}
                  data-testid={`dfwf-input-${field.id}`}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <input
                  id={`dfwf-input-${field.id}`}
                  data-testid={`dfwf-input-${field.id}`}
                  type={field.type}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {field.condition && (
                <p
                  data-testid={`dfwf-condition-${field.id}`}
                  className="text-xs text-gray-500 italic"
                >
                  {humanizeCondition(field.condition)}
                </p>
              )}
            </div>
          ))}

          {visibleFields.length > 0 && (
            <button
              data-testid="dfwf-submit-btn"
              type="submit"
              className="mt-2 px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              style={{ minHeight: '44px' }}
            >
              Submit
            </button>
          )}
        </form>

        <div
          data-testid="dfwf-visible-fields-summary"
          className="mt-4 p-2 rounded bg-gray-50 text-xs text-gray-600"
        >
          Showing {visibleFields.length} field{visibleFields.length === 1 ? '' : 's'} for this audience.
        </div>
      </section>

      {/* V-R15 Wave 8: AdminCrudPanel moved to collapsible <details> so the
          raw-index admin-debug surface (API path + ui-NNNN IDs) does not
          dominate the tenant-admin primary capture. Tenant-admin primary
          view leads with the role-aware demo form + visible-fields summary;
          this section is a last-resort "open the raw index" for debugging. */}
      {(role === 'tenant-admin' || role === 'platform-admin') && (
        <details className="mt-6 border border-gray-200 rounded bg-white" data-testid="dfwf-admin-panel">
          <summary className="cursor-pointer px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50">
            Open raw form-schema index (admin debug)
          </summary>
          <AdminCrudPanel
            slug="dynamic-forms-workflows"
            indexName="xiigen-dynamic-forms-workflows"
            title="Form Schemas — Admin Console"
            description="Raw index browser — reads /api/dynamic/xiigen-dynamic-forms-workflows."
            classification="ADMIN_FACING"
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'status', label: 'Status' },
              { key: 'notes', label: 'Notes' },
            ]}
            formFields={[
              { name: 'name', label: 'Name', required: true },
              { name: 'status', label: 'Status', required: true },
              { name: 'notes', label: 'Notes', type: 'textarea' },
            ]}
          />
        </details>
      )}
    </div>
  );
}
