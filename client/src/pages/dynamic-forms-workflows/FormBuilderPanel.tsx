/**
 * FormBuilderPanel — FLOW-21 G7 three-column form builder (V-R13).
 *
 * Route: /dynamic-forms-workflows?mock=build (tenant-admin / platform-admin)
 *
 * Layout (desktop): palette | canvas | preview
 *   - Palette (left, ~220px):   field types the builder can drag in
 *   - Canvas (center, ~1fr):    the ordered list of fields + inline config
 *   - Preview (right, ~320px):  render of the live form as tenant-user would see it
 *
 * Interaction is click-to-add (not drag-drop) for keyboard-accessibility and
 * for static-capture friendliness — the Playwright run doesn't simulate
 * drag gestures, and a click-to-add builder captures cleanly in a PNG.
 *
 * No real backend write — this is the shipping UX shell the builder
 * composes into. Persistence wiring lands in a follow-up.
 */

import React, { useState } from 'react';

type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'date';

interface BuilderField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  audience: 'everyone' | 'tenant-user' | 'tenant-admin' | 'freelancer' | 'business-partner';
}

const PALETTE: Array<{ type: FieldType; label: string; icon: string }> = [
  { type: 'text', label: 'Short text', icon: '—' },
  { type: 'textarea', label: 'Long text', icon: '¶' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'select', label: 'Dropdown', icon: '▾' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑' },
  { type: 'date', label: 'Date', icon: '📅' },
];

const AUDIENCE_OPTIONS: BuilderField['audience'][] = [
  'everyone',
  'tenant-user',
  'tenant-admin',
  'freelancer',
  'business-partner',
];

const INITIAL_FIELDS: BuilderField[] = [
  { id: 'fld-1', type: 'text', label: 'Full name', required: true, audience: 'everyone' },
  { id: 'fld-2', type: 'email', label: 'Email address', required: true, audience: 'everyone' },
  { id: 'fld-3', type: 'select', label: 'How did you hear about us?', required: false, audience: 'tenant-user' },
  { id: 'fld-4', type: 'number', label: 'Budget (USD)', required: false, audience: 'business-partner' },
];

function nextId(fields: BuilderField[]): string {
  const nums = fields
    .map((f) => f.id.match(/^fld-(\d+)$/)?.[1])
    .filter(Boolean)
    .map(Number);
  return `fld-${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export function FormBuilderPanel() {
  const [fields, setFields] = useState<BuilderField[]>(INITIAL_FIELDS);
  const [selectedId, setSelectedId] = useState<string>('fld-1');
  const [title, setTitle] = useState('Partnership intake form');
  const [previewRole, setPreviewRole] = useState<BuilderField['audience']>('tenant-user');

  const selected = fields.find((f) => f.id === selectedId) ?? fields[0];

  const visibleInPreview = fields.filter(
    (f) => f.audience === 'everyone' || f.audience === previewRole
  );

  function addField(type: FieldType, label: string) {
    const id = nextId(fields);
    setFields([...fields, { id, type, label: `New ${label.toLowerCase()}`, required: false, audience: 'everyone' }]);
    setSelectedId(id);
  }

  function updateSelected<K extends keyof BuilderField>(key: K, value: BuilderField[K]) {
    if (!selected) return;
    setFields(fields.map((f) => (f.id === selected.id ? { ...f, [key]: value } : f)));
  }

  function moveField(id: string, dir: -1 | 1) {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    const clone = [...fields];
    [clone[idx], clone[next]] = [clone[next], clone[idx]];
    setFields(clone);
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedId === id && fields[0]) setSelectedId(fields[0].id);
  }

  return (
    <div className="max-w-7xl mx-auto mt-6 p-4" data-testid="form-builder-panel">
      {/* Header */}
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Click a field type to add it. Configure audience, required, and order in the canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="builder-save-draft"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50"
          >
            Save draft
          </button>
          <button
            type="button"
            data-testid="builder-publish"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Publish form
          </button>
        </div>
      </div>

      {/* Three-column grid: palette | canvas | preview */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)_320px] gap-4">
        {/* Palette (left) */}
        <aside
          className="border border-gray-200 rounded-lg bg-white p-3"
          data-testid="builder-palette"
          aria-label="Field palette"
        >
          <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2 px-1">
            Field types
          </div>
          <ul className="space-y-1">
            {PALETTE.map((p) => (
              <li key={p.type}>
                <button
                  type="button"
                  onClick={() => addField(p.type, p.label)}
                  data-testid={`palette-add-${p.type}`}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-700 rounded hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <span className="w-5 text-center text-gray-500 font-mono" aria-hidden>
                    {p.icon}
                  </span>
                  <span className="flex-1 text-left">{p.label}</span>
                  <span className="text-blue-500 font-bold" aria-hidden>+</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-500 px-1">
            Tip: click a field on the canvas to edit it. Use the ↑/↓ arrows to reorder.
          </div>
        </aside>

        {/* Canvas (center) */}
        <section
          className="border border-gray-200 rounded-lg bg-white p-4 min-h-[560px]"
          data-testid="builder-canvas"
          aria-label="Form canvas"
        >
          <label className="block text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
            Form title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="builder-title"
            className="w-full text-xl font-semibold text-gray-900 border-b border-dashed border-gray-300 pb-1 mb-4 focus:outline-none focus:border-blue-500"
          />

          {fields.length === 0 && (
            <div
              data-testid="builder-empty"
              className="border-2 border-dashed border-gray-300 rounded p-8 text-center text-sm text-gray-500"
            >
              Click a field type from the palette to add it to the form.
            </div>
          )}

          <ol className="space-y-2" data-testid="builder-field-list">
            {fields.map((f, i) => {
              const isSelected = f.id === selectedId;
              return (
                <li
                  key={f.id}
                  data-testid={`builder-field-${f.id}`}
                  className={`group rounded border p-3 flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <span className="text-xs font-mono text-gray-400 tabular-nums w-6 pt-0.5">
                    {i + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{f.label}</span>
                      {f.required && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-medium">
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                      <span>Type: {f.type}</span>
                      <span>·</span>
                      <span>Audience: {f.audience}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(f.id, -1);
                      }}
                      aria-label="Move up"
                      className="px-1.5 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveField(f.id, 1);
                      }}
                      aria-label="Move down"
                      className="px-1.5 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(f.id);
                      }}
                      aria-label="Remove"
                      className="px-1.5 py-0.5 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Inline config for the selected field */}
          {selected && (
            <div
              data-testid="builder-field-config"
              className="mt-5 pt-4 border-t border-gray-200"
            >
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Field settings — {selected.id}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col text-xs text-gray-600">
                  <span className="mb-1">Label</span>
                  <input
                    type="text"
                    value={selected.label}
                    onChange={(e) => updateSelected('label', e.target.value)}
                    data-testid="config-label"
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
                <label className="flex flex-col text-xs text-gray-600">
                  <span className="mb-1">Audience (visibility)</span>
                  <select
                    value={selected.audience}
                    onChange={(e) =>
                      updateSelected('audience', e.target.value as BuilderField['audience'])
                    }
                    data-testid="config-audience"
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={selected.required}
                    onChange={(e) => updateSelected('required', e.target.checked)}
                    data-testid="config-required"
                  />
                  Required
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Preview (right) */}
        <aside
          className="border border-gray-200 rounded-lg bg-gray-50 p-4"
          data-testid="builder-preview"
          aria-label="Live preview"
        >
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Live preview
            </div>
            <select
              value={previewRole}
              onChange={(e) => setPreviewRole(e.target.value as BuilderField['audience'])}
              data-testid="preview-role-selector"
              className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
              aria-label="Preview as role"
            >
              {AUDIENCE_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  as {a}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
            {visibleInPreview.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No fields visible for this role.</p>
            ) : (
              <ol className="space-y-3">
                {visibleInPreview.map((f) => (
                  <li key={f.id} className="space-y-1">
                    <label className="block text-xs font-medium text-gray-700">
                      {f.label}
                      {f.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50"
                        rows={2}
                        disabled
                      />
                    ) : f.type === 'select' ? (
                      <select
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50"
                        disabled
                      >
                        <option>Choose one…</option>
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="checkbox" disabled /> Option
                      </label>
                    ) : (
                      <input
                        type={f.type}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-gray-50"
                        disabled
                      />
                    )}
                  </li>
                ))}
              </ol>
            )}
            <button
              type="button"
              disabled
              className="mt-4 w-full text-xs bg-gray-300 text-gray-600 rounded py-1.5"
            >
              Submit (preview disabled)
            </button>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Preview reflects audience rules. Switch the role above to see what each audience sees.
          </p>
        </aside>
      </div>
    </div>
  );
}
