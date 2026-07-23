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
import { type PropertyMap } from './css-parser';
/**
 * All Webflow AnyElement types supported by this adapter.
 * GAP-ENG-2: advanced UI and commerce types added alongside common types.
 */
export type WebflowElementType = 'Section' | 'Container' | 'Div' | 'Block' | 'Heading' | 'Paragraph' | 'TextBlock' | 'RichText' | 'Link' | 'Button' | 'Image' | 'Video' | 'BackgroundVideo' | 'Form' | 'FormWrapper' | 'Input' | 'Textarea' | 'Select' | 'Checkbox' | 'Radio' | 'NavBar' | 'NavMenu' | 'NavLink' | 'NavButton' | 'Tab' | 'TabsMenu' | 'TabsContent' | 'TabLink' | 'TabPane' | 'Slider' | 'SliderMask' | 'Slide' | 'SliderArrow' | 'SliderNav' | 'Dropdown' | 'DropdownToggle' | 'DropdownList' | 'DropdownLink' | 'LightboxLink' | 'LightboxContainer' | 'LightboxCaption' | 'Symbol' | 'CommerceCart' | 'CommerceCartWrapper' | 'CommerceCheckout' | 'CommerceOrderConfirm' | 'CommerceItem' | 'CommercePayments' | 'CommerceSubscriptions' | 'HtmlEmbed' | 'Map' | 'Unknown';
/**
 * Map a Webflow element's PropertyMap to pipeline-compatible style properties.
 *
 * GAP-ENG-2: all 40+ element types handled — no element returns empty PropertyMap.
 */
export declare function mapElementProperties(elementType: WebflowElementType, propertyMap: PropertyMap): PropertyMap;
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
    valueDiff: Record<string, {
        pipeline: string;
        native: string;
    }>;
}
export declare function computeValidationDiff(pipelineOutput: PropertyMap, webflowNative: PropertyMap): ValidationDiff;
//# sourceMappingURL=webflow-designer-adapter.d.ts.map