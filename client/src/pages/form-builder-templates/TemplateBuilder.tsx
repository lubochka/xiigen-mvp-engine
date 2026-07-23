/**
 * FLOW-23 — Form Builder Templates
 * Client UI for template validation, publication, instantiation, and analytics.
 *
 * Role-awareness architecture (C6 / SK-539 — RUN-29 special pattern):
 *   Same DSL pattern as FLOW-21 (RUN-28). This run surfaces the `viewerRole`
 *   variable in the form builder UI so tenant-admins can visually author
 *   conditions like `viewerRole == 'freelancer'` via dropdowns rather than
 *   raw JSON.
 *
 * Components:
 * - TemplateValidator: schema validation UI with field-by-field feedback
 * - TemplatePublisher: version publication with immutability lock indicator
 * - FormInstantiator: form creation from template with variable binding
 * - MetricsViewer: usage analytics and popularity ranking
 * - Condition Palette: viewerRole variable for drag-into-field authoring (tenant-admin)
 * - Condition Builder: visual builder that generates DSL expression strings (tenant-admin)
 * - Role Preview: live evaluator preview using formConditionEvaluator (tenant-admin)
 */

import React, { useState } from 'react';
import { type ViewerRole } from '../../components/common/ViewerRole';
import {
  evaluateCondition,
  type FormConditionContext,
} from '../../utils/formConditionEvaluator';
import { useViewerRole } from '../../hooks/useViewerRole';

// Reference schema for the role preview panel.
// Mirrors the DEMO_FORM_SCHEMA in DynamicFormsWorkflowsPage (FLOW-21 RUN-28).
const PREVIEW_FIELDS: ReadonlyArray<{ id: string; condition: string | undefined }> = [
  { id: 'full-name', condition: undefined },
  { id: 'email', condition: undefined },
  { id: 'hourly-rate', condition: "viewerRole == 'freelancer'" },
  { id: 'company-name', condition: "viewerRole != 'anonymous'" },
  { id: 'budget', condition: "viewerRole == 'business-partner'" },
  { id: 'internal-notes', condition: "viewerRole == 'tenant-admin'" },
];

export function TemplateBuilder() {
  const { role } = useViewerRole();
  const [, setTemplateId] = useState<string>('');
  const [status] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [version] = useState<number>(1);

  // Condition builder state
  const [cbVariable, setCbVariable] = useState<string>('viewerRole');
  const [cbOperator, setCbOperator] = useState<'==' | '!='>('==');
  const [cbValue, setCbValue] = useState<ViewerRole>('freelancer');

  // Preview role for live-preview
  const [previewRole, setPreviewRole] = useState<ViewerRole>('tenant-user');

  // Silence unused-setter warning from the original state
  void setTemplateId;

  const generatedExpression = `${cbVariable} ${cbOperator} '${cbValue}'`;
  const isAuthor = role === 'tenant-admin' || role === 'platform-admin';

  // V-R15 Wave 1 Fix #4: gate authoring controls (Validate / Publish /
  // Create / Analytics) to tenant-admin + platform-admin. Consumer roles
  // (anonymous, public-marketplace-visitor, tenant-user, referral-user,
  // freelancer, business-partner, event-organiser, platform-support) see
  // a read-only browse-templates surface instead.
  if (!isAuthor) {
    const catalogIntro =
      role === 'anonymous' || role === 'public-marketplace-visitor'
        ? 'Browse templates the community has published. Sign in to use one in your workspace.'
        : 'Browse templates published by your workspace admins. Install a template to start a new form.';
    return (
      <div
        data-testid="page-templatebuilder.tsx"
        data-viewer-role={role}
        className="p-6 max-w-3xl mx-auto"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form templates</h1>
        <p className="text-sm text-gray-500 mb-6">{catalogIntro}</p>

        <ul className="divide-y border border-gray-200 rounded" data-testid="fbt-consumer-catalog">
          {[
            { name: 'Partnership intake', fields: 6, installs: 142 },
            { name: 'Customer feedback', fields: 4, installs: 89 },
            { name: 'Event RSVP confirmation', fields: 5, installs: 214 },
          ].map((t, i) => (
            <li
              key={t.name}
              className="flex items-center justify-between p-3 text-sm"
              data-testid={`fbt-consumer-template-${i}`}
            >
              <div>
                <div className="font-medium text-gray-900">{t.name}</div>
                <div className="text-xs text-gray-500">
                  {t.fields} fields · {t.installs} installs
                </div>
              </div>
              {role === 'anonymous' || role === 'public-marketplace-visitor' ? (
                <a
                  href="/login"
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Sign in to use
                </a>
              ) : (
                <button
                  type="button"
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Use template
                </button>
              )}
            </li>
          ))}
        </ul>

        <p className="text-xs text-gray-500 mt-4">
          Template authoring (validate, publish, analytics) is available to workspace administrators.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="page-templatebuilder.tsx" data-viewer-role={role} className="p-6">
      <h1 className="text-3xl font-bold mb-6">Form Builder Templates</h1>

      {/* RUN-123 plain-language sweep: removed internal engineering IDs
          from user-visible h2s. Body copy
          (JSON Schema, OCC, SETNX, PII, schema evolution, append-only
          metrics) also replaced with human descriptions. Emoji state
          icons replaced with coloured state pills. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-base font-semibold mb-1 text-slate-900">Validate template</h2>
          <p className="text-sm text-slate-600 mb-4">
            Check required fields, field types, and that constraints are consistent before you
            publish.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            style={{ minHeight: '44px' }}
          >
            Validate template
          </button>
        </div>

        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-base font-semibold mb-1 text-slate-900">Publish version</h2>
          <p className="text-sm text-slate-600 mb-4">
            Locks this version so other tenants can safely install it. Published versions
            cannot be edited &mdash; future changes start a new version.
          </p>
          <div className="mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                status === 'PUBLISHED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  status === 'PUBLISHED' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              v{version} &middot; {status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>
          <button
            className="px-4 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500"
            disabled={status === 'PUBLISHED'}
            style={{ minHeight: '44px' }}
          >
            Publish version
          </button>
        </div>

        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-base font-semibold mb-1 text-slate-900">Create a form</h2>
          <p className="text-sm text-slate-600 mb-4">
            Create a new form instance from this template. You can fill in default values and
            customise per use case.
          </p>
          <button
            className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:bg-slate-300 disabled:text-slate-500"
            disabled={status !== 'PUBLISHED'}
            style={{ minHeight: '44px' }}
          >
            Create form
          </button>
        </div>

        <div className="border border-slate-200 rounded p-4 bg-white">
          <h2 className="text-base font-semibold mb-1 text-slate-900">Usage &amp; popularity</h2>
          <p className="text-sm text-slate-600 mb-4">
            See how many tenants have installed this template and how it ranks against other
            templates in the catalog.
          </p>
          <button
            className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700"
            style={{ minHeight: '44px' }}
          >
            View analytics
          </button>
        </div>
      </div>

      <div className="mt-8 border rounded p-4 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Recent Templates</h3>
        <p className="text-gray-600">No templates yet. Create one to get started.</p>
      </div>

      {/* ── tenant-admin: Condition Palette ─────────────────────────────────── */}
      {role === 'tenant-admin' && (
        <div
          data-testid="tb-condition-palette"
          className="mt-8 border rounded-lg p-4 bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Available Condition Variables
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            These variables can be used in field conditions. Drag to a field or use the
            Condition Builder below.
          </p>
          <div data-testid="tb-palette-items" className="flex flex-wrap gap-3">
            <div
              data-testid="tb-palette-viewerRole"
              className="flex items-center gap-2 px-3 py-2 border-2 border-blue-300 rounded-lg bg-blue-50 cursor-grab select-none"
              draggable
              title="Drag to a field to add a viewerRole condition"
            >
              <span className="text-blue-700 font-mono text-sm font-semibold">viewerRole</span>
              <span className="text-xs text-blue-500">string · 10 values</span>
            </div>
            <div
              data-testid="tb-palette-future"
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 italic"
            >
              + more variables coming
            </div>
          </div>
        </div>
      )}

      {/* ── tenant-admin: Condition Builder ─────────────────────────────────── */}
      {role === 'tenant-admin' && (
        <div
          data-testid="tb-condition-builder"
          className="mt-4 border rounded-lg p-4 bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Condition Builder</h3>
          <p className="text-sm text-gray-500 mb-4">
            Build a field visibility condition. The generated expression can be pasted into a
            field's <code>condition</code> property.
          </p>

          <div
            data-testid="tb-builder-row"
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <div className="flex-1 min-w-[140px]">
              <label
                htmlFor="tb-cb-variable"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Variable <span aria-label="required" className="text-red-500">*</span>
              </label>
              <select
                id="tb-cb-variable"
                data-testid="tb-cb-variable"
                value={cbVariable}
                onChange={(e) => setCbVariable(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="viewerRole">viewerRole</option>
              </select>
            </div>

            <div className="flex-1 min-w-[100px]">
              <label
                htmlFor="tb-cb-operator"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Operator <span aria-label="required" className="text-red-500">*</span>
              </label>
              <select
                id="tb-cb-operator"
                data-testid="tb-cb-operator"
                value={cbOperator}
                onChange={(e) => setCbOperator(e.target.value as '==' | '!=')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="==">is (==)</option>
                <option value="!=">is not (!=)</option>
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <label
                htmlFor="tb-cb-value"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Value <span aria-label="required" className="text-red-500">*</span>
              </label>
              <select
                id="tb-cb-value"
                data-testid="tb-cb-value"
                value={cbValue}
                onChange={(e) => setCbValue(e.target.value as ViewerRole)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="anonymous">Anonymous Visitor</option>
                <option value="public-marketplace-visitor">Public Marketplace Visitor</option>
                <option value="tenant-user">Tenant User</option>
                <option value="tenant-admin">Tenant Admin</option>
                <option value="referral-user">Referral User</option>
                <option value="freelancer">Freelancer</option>
                <option value="business-partner">Business Partner</option>
                <option value="event-organiser">Event Organiser</option>
                <option value="platform-admin">Platform Admin</option>
                <option value="platform-support">Platform Support</option>
              </select>
            </div>
          </div>

          <div
            data-testid="tb-generated-expression"
            className="p-3 rounded bg-gray-50 border border-gray-200 font-mono text-sm text-gray-800"
          >
            {generatedExpression}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Copy this expression into a field's <code>condition.if</code> property.
          </p>
        </div>
      )}

      {/* ── tenant-admin: Role Preview ──────────────────────────────────────── */}
      {role === 'tenant-admin' && (
        <div
          data-testid="tb-role-preview"
          className="mt-4 border rounded-lg p-4 bg-white"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Role Preview</h3>
          <p className="text-sm text-gray-500 mb-4">
            Preview which fields are visible for a given viewer role.
          </p>

          <div className="flex items-center gap-3 mb-4">
            <label
              htmlFor="tb-preview-role"
              className="text-sm font-medium text-gray-700 whitespace-nowrap"
            >
              Preview as:
            </label>
            <select
              id="tb-preview-role"
              data-testid="tb-preview-role-select"
              value={previewRole}
              onChange={(e) => setPreviewRole(e.target.value as ViewerRole)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="anonymous">Anonymous Visitor</option>
              <option value="public-marketplace-visitor">Public Marketplace Visitor</option>
              <option value="tenant-user">Tenant User</option>
              <option value="tenant-admin">Tenant Admin</option>
              <option value="referral-user">Referral User</option>
              <option value="freelancer">Freelancer</option>
              <option value="business-partner">Business Partner</option>
              <option value="event-organiser">Event Organiser</option>
              <option value="platform-admin">Platform Admin</option>
              <option value="platform-support">Platform Support</option>
            </select>
          </div>

          {(() => {
            const previewCtx: FormConditionContext = { viewerRole: previewRole };
            const visibleIds = PREVIEW_FIELDS.filter((f) =>
              evaluateCondition(f.condition, previewCtx)
            ).map((f) => f.id);
            const hiddenIds = PREVIEW_FIELDS.filter(
              (f) => !evaluateCondition(f.condition, previewCtx)
            ).map((f) => f.id);
            return (
              <div className="space-y-1 text-sm" data-testid="tb-preview-result">
                <p data-testid="tb-preview-visible" className="text-green-700">
                  ✓ Visible ({visibleIds.length}): {visibleIds.join(', ') || '(none)'}
                </p>
                <p data-testid="tb-preview-hidden" className="text-gray-400">
                  ✗ Hidden ({hiddenIds.length}): {hiddenIds.join(', ') || '(none)'}
                </p>
              </div>
            );
          })()}
        </div>
      )}

      {/* V-R15 Wave 1 Fix #4: consumer role-specific blocks (tenant-user
          catalogue, freelancer-submit, business-partner-enterprise,
          event-organiser) moved into the unified consumer-catalog early-
          return above. Reaching this code requires role to be tenant-admin
          or platform-admin. */}
    </div>
  );
}
