/**
 * FLOW-23 GAP-23-4: JSONPath Dynamic Binding Contracts
 * BFA Rules: DNA-1 (Rule 2), CF-435
 * Data Decision: DD-208
 * Error Correction: score-zero
 * Task Types: T353 (CmsDataBindingSet), T356 (DynamicDataSlotResolve), T359 (DataPanelSlotMap)
 * Factories: F960, F958, F957, F959
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const CMS_DATA_BINDING_SERVICE = 'CMS_DATA_BINDING_SERVICE';

/**
 * CMS data binding via JSONPath expressions.
 * DNA-1: ALL parameters use Record<string, unknown> — no typed binding classes.
 * DD-208: JSONPath expressions e.g., '$.skill_05.latest_post.title'
 */
export interface ICmsDataBindingService {
  setBinding(
    canvasElementId: string,
    property: string, // e.g., 'textContent', 'src', 'href'
    expression: string, // JSONPath: '$.skill_05.latest_post.title'
    dataSourceId: string,
  ): Promise<
    DataProcessResult<{
      bindingId: string;
      expression: string;
      resolvedValue: Record<string, unknown>; // DNA-1: no typed BindingResult
      boundAt: string;
    }>
  >;

  resolveBinding(
    bindingId: string,
    context: Record<string, unknown>, // DNA-1: no typed Context interface
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  removeBinding(bindingId: string): Promise<DataProcessResult<{ removed: boolean }>>;
}

export const DYNAMIC_DATA_SLOT_RESOLVER = 'DYNAMIC_DATA_SLOT_RESOLVER';

/**
 * Dynamic data slot resolver — DD-208.
 * DNA-1: All definitions as Record<string, unknown>.
 * CF-435: Slot schema validated against data source schema.
 */
export interface IDynamicDataSlotResolver {
  resolve(
    slotId: string,
    expression: string, // JSONPath e.g., '$.user.profile.avatar_url'
    context: Record<string, unknown>, // DNA-1: no typed context
  ): Promise<
    DataProcessResult<{
      slotId: string;
      expression: string;
      resolvedValue: unknown;
      resolvedAt: string;
      fromCache: boolean;
    }>
  >;

  registerSlot(
    slotDefinition: Record<string, unknown>, // DNA-1: no typed SlotDefinition
  ): Promise<DataProcessResult<{ slotId: string; registeredAt: string }>>;

  /**
   * CF-435: Validate slot schema against data source schema.
   * Must return valid: true before binding is permitted.
   */
  validateAgainstSource(
    slotId: string,
    dataSourceId: string,
  ): Promise<
    DataProcessResult<{
      valid: boolean;
      reason?: string;
      slotSchema: Record<string, unknown>;
      sourceSchema: Record<string, unknown>;
    }>
  >;
}

export const DATA_PANEL_SERVICE = 'DATA_PANEL_SERVICE';

/**
 * Data panel slot mapping.
 * DNA-1: All panel definitions as Record<string, unknown>.
 */
export interface IDataPanelService {
  mapSlots(
    panelId: string,
    slotMappings: Record<string, string>, // slotName → JSONPath expression
  ): Promise<
    DataProcessResult<{
      panelId: string;
      mappings: Record<string, string>;
      mappedAt: string;
    }>
  >;

  resolvePanel(
    panelId: string,
    dataContext: Record<string, unknown>, // DNA-1: no typed DataContext
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

export const DATA_BINDING_VALIDATOR = 'DATA_BINDING_VALIDATOR';

/**
 * JSONPath expression validator.
 * Validates expressions BEFORE they are stored (CF-434 pattern applied to binding).
 */
export interface IDataBindingValidator {
  validate(expression: string): Promise<
    DataProcessResult<{
      valid: boolean;
      expression: string;
      error?: string;
      parsedPath?: Record<string, unknown>[];
    }>
  >;
}
