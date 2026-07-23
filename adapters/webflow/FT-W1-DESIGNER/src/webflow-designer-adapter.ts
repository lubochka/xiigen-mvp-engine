/**
 * webflow-designer-adapter.ts — Webflow Designer Extension (FT-W1-DESIGNER / FLOW-43)
 *
 * Maps Webflow Designer element types to pipeline-compatible SceneNode shape
 * and converts PropertyMap (Webflow native CSS) into the shared styles model.
 *
 * GAP-ENG-2: all Webflow element types covered including advanced UI and commerce types.
 *
 * Rules (FLOW-43 hard constraints):
 *   - styles.ts and element-code.ts are COPIED UNCHANGED — do not re-implement
 *   - All translation lives here only (CF-800: no translation in pipeline files)
 *   - No Figma runtime calls anywhere (CF-801)
 *   - No Webflow runtime calls outside the SDK facade (CF-802)
 *   - Validation diff: compare pipeline output against Webflow native CSS (CF-803)
 */

import { expandShorthands, type PropertyMap } from './css-parser';

// ── Element type taxonomy ─────────────────────────────────────────────────────

/**
 * All Webflow AnyElement types supported by this adapter.
 * GAP-ENG-2: advanced UI and commerce types added alongside common types.
 */
export type WebflowElementType =
  // ── Layout / containers
  | 'Section' | 'Container' | 'Div' | 'Block'
  // ── Text
  | 'Heading' | 'Paragraph' | 'TextBlock' | 'RichText'
  // ── Links + buttons
  | 'Link' | 'Button'
  // ── Media
  | 'Image' | 'Video' | 'BackgroundVideo'
  // ── Form
  | 'Form' | 'FormWrapper' | 'Input' | 'Textarea' | 'Select' | 'Checkbox' | 'Radio'
  // ── Navigation (GAP-ENG-2)
  | 'NavBar' | 'NavMenu' | 'NavLink' | 'NavButton'
  // ── Tabs (GAP-ENG-2)
  | 'Tab' | 'TabsMenu' | 'TabsContent' | 'TabLink' | 'TabPane'
  // ── Slider (GAP-ENG-2)
  | 'Slider' | 'SliderMask' | 'Slide' | 'SliderArrow' | 'SliderNav'
  // ── Dropdown (GAP-ENG-2)
  | 'Dropdown' | 'DropdownToggle' | 'DropdownList' | 'DropdownLink'
  // ── Lightbox (GAP-ENG-2)
  | 'LightboxLink' | 'LightboxContainer' | 'LightboxCaption'
  // ── Symbol / component (GAP-ENG-2)
  | 'Symbol'
  // ── Commerce (GAP-ENG-2)
  | 'CommerceCart' | 'CommerceCartWrapper' | 'CommerceCheckout' | 'CommerceOrderConfirm'
  | 'CommerceItem' | 'CommercePayments' | 'CommerceSubscriptions'
  // ── Utility
  | 'HtmlEmbed' | 'Map'
  // Fallback
  | 'Unknown';

// ── Property map helpers ──────────────────────────────────────────────────────

/** Shared container layout — flex, grid, sizing, spacing. */
function extractContainerProperties(pm: PropertyMap): PropertyMap {
  const expanded = expandShorthands(pm);
  const layout: PropertyMap = {};
  const layoutKeys = [
    'display', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap',
    'grid-template-columns', 'grid-template-rows', 'grid-gap',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'overflow', 'overflow-x', 'overflow-y',
    'background-color', 'background-image', 'background-size', 'background-position',
    'border-width', 'border-style', 'border-color', 'border-radius',
    'box-shadow', 'opacity', 'transform', 'transition',
  ];
  for (const key of layoutKeys) {
    if (expanded[key] !== undefined) layout[key] = expanded[key]!;
  }
  return layout;
}

/** Shared text/typography properties. */
function extractTextProperties(pm: PropertyMap): PropertyMap {
  const expanded = expandShorthands(pm);
  const text: PropertyMap = {};
  const textKeys = [
    'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-decoration',
    'text-transform', 'white-space', 'word-break',
    ...Object.keys(expanded).filter(k => k.startsWith('padding') || k.startsWith('margin')),
  ];
  for (const key of [...new Set(textKeys)]) {
    if (expanded[key] !== undefined) text[key] = expanded[key]!;
  }
  return text;
}

/** Interactive element properties — adds cursor, pointer-events. */
function extractInteractiveProperties(pm: PropertyMap): PropertyMap {
  const base = extractContainerProperties(pm);
  const expanded = expandShorthands(pm);
  if (expanded['cursor']) base['cursor'] = expanded['cursor'];
  if (expanded['pointer-events']) base['pointer-events'] = expanded['pointer-events'];
  return base;
}

/** Link-specific: inherits text + adds color, text-decoration. */
function extractLinkProperties(pm: PropertyMap): PropertyMap {
  return extractTextProperties(pm);
}

/** Media properties — object-fit, object-position, aspect-ratio. */
function extractMediaProperties(pm: PropertyMap): PropertyMap {
  const base = extractContainerProperties(pm);
  const expanded = expandShorthands(pm);
  if (expanded['object-fit']) base['object-fit'] = expanded['object-fit'];
  if (expanded['object-position']) base['object-position'] = expanded['object-position'];
  if (expanded['aspect-ratio']) base['aspect-ratio'] = expanded['aspect-ratio'];
  return base;
}

/** Form field properties — adds appearance, outline. */
function extractFormFieldProperties(pm: PropertyMap): PropertyMap {
  const base = extractTextProperties(pm);
  const expanded = expandShorthands(pm);
  if (expanded['appearance']) base['appearance'] = expanded['appearance'];
  if (expanded['outline']) base['outline'] = expanded['outline'];
  if (expanded['resize']) base['resize'] = expanded['resize'];
  return base;
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

/**
 * Map a Webflow element's PropertyMap to pipeline-compatible style properties.
 *
 * GAP-ENG-2: all 40+ element types handled — no element returns empty PropertyMap.
 */
export function mapElementProperties(
  elementType: WebflowElementType,
  propertyMap: PropertyMap,
): PropertyMap {
  switch (elementType) {
    // ── Layout / containers
    case 'Section':
    case 'Container':
    case 'Div':
    case 'Block':
      return extractContainerProperties(propertyMap);

    // ── Text
    case 'Heading':
    case 'Paragraph':
    case 'TextBlock':
    case 'RichText':
      return extractTextProperties(propertyMap);

    // ── Links + buttons
    case 'Link':
    case 'NavLink':
    case 'TabLink':
    case 'DropdownLink':
    case 'LightboxLink':
      return extractLinkProperties(propertyMap);

    case 'Button':
    case 'NavButton':
      return extractInteractiveProperties(propertyMap);

    // ── Media
    case 'Image':
    case 'Video':
      return extractMediaProperties(propertyMap);

    case 'BackgroundVideo':  // GAP-ENG-2
      return extractMediaProperties(propertyMap);

    // ── Form
    case 'Form':
    case 'FormWrapper':
      return extractContainerProperties(propertyMap);

    case 'Input':
    case 'Textarea':
    case 'Select':
    case 'Checkbox':
    case 'Radio':
      return extractFormFieldProperties(propertyMap);

    // ── Navigation (GAP-ENG-2)
    case 'NavBar':
    case 'NavMenu':
      return extractContainerProperties(propertyMap);

    // ── Tabs (GAP-ENG-2)
    case 'Tab':
    case 'TabsMenu':
    case 'TabsContent':
    case 'TabPane':
      return extractContainerProperties(propertyMap);

    // ── Slider (GAP-ENG-2)
    case 'Slider':
    case 'SliderMask':
    case 'Slide':
      return extractContainerProperties(propertyMap);

    case 'SliderArrow':
    case 'SliderNav':
      return extractInteractiveProperties(propertyMap);

    // ── Dropdown (GAP-ENG-2)
    case 'Dropdown':
    case 'DropdownToggle':
    case 'DropdownList':
      return extractInteractiveProperties(propertyMap);

    // ── Lightbox (GAP-ENG-2)
    case 'LightboxContainer':
      return extractContainerProperties(propertyMap);
    case 'LightboxCaption':
      return extractTextProperties(propertyMap);

    // ── Symbol / component (GAP-ENG-2)
    case 'Symbol':
      // Symbols inherit container layout; inner styles managed by their definition
      return extractContainerProperties(propertyMap);

    // ── Commerce (GAP-ENG-2)
    case 'CommerceCart':
    case 'CommerceCartWrapper':
    case 'CommerceCheckout':
    case 'CommerceOrderConfirm':
    case 'CommerceItem':
    case 'CommercePayments':
    case 'CommerceSubscriptions':
      return extractContainerProperties(propertyMap);

    // ── Utility
    case 'HtmlEmbed':
    case 'Map':
      return extractContainerProperties(propertyMap);

    case 'Unknown':
    default:
      // Pass through all expanded properties for unknown types
      return expandShorthands(propertyMap);
  }
}

// ── Validation diff ───────────────────────────────────────────────────────────

/**
 * Compare pipeline CSS output against Webflow native CSS (CF-803).
 * Returns a diff report: properties in pipeline but not in native, and vice versa.
 */
export interface ValidationDiff {
  /** Properties pipeline produces that are NOT in Webflow native CSS. */
  pipelineOnly: Record<string, string>;
  /** Properties in Webflow native CSS that pipeline did NOT produce. */
  nativeOnly: Record<string, string>;
  /** Properties where both agree on the key but differ in value. */
  valueDiff: Record<string, { pipeline: string; native: string }>;
}

export function computeValidationDiff(
  pipelineOutput: PropertyMap,
  webflowNative: PropertyMap,
): ValidationDiff {
  const pipelineOnly: Record<string, string> = {};
  const nativeOnly: Record<string, string> = {};
  const valueDiff: Record<string, { pipeline: string; native: string }> = {};

  for (const [key, pipelineValue] of Object.entries(pipelineOutput)) {
    if (!(key in webflowNative)) {
      pipelineOnly[key] = pipelineValue;
    } else if (webflowNative[key] !== pipelineValue) {
      valueDiff[key] = { pipeline: pipelineValue, native: webflowNative[key]! };
    }
  }

  for (const [key, nativeValue] of Object.entries(webflowNative)) {
    if (!(key in pipelineOutput)) {
      nativeOnly[key] = nativeValue;
    }
  }

  return { pipelineOnly, nativeOnly, valueDiff };
}
