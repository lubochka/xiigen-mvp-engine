import type { FramerNodeLike, FramerPaintInput, FramerPluginRuntimeFacade, FramerPluginStorageFacade, FramerSolidPaint, FramerTextAdapterOutput, FramerTextAdapterReadResult, FramerTextAdapterWriteResult, FramerTextAttributes, FramerTextNode, FramerTextUpdate, SharedTextElement, SharedTextStyle } from './types';
export declare const FONT_WEIGHT_STYLE_MAP: Readonly<Record<number, string>>;
export declare function isFramerTextNode(node: FramerNodeLike): node is FramerTextNode;
export declare function normalizeFontWeight(value: number | string | undefined): number;
export declare function fontWeightToStyle(value: number | string | undefined): string;
export declare function normalizeNumber(value: number | string | undefined, fallback: number): number;
export declare function rgbaToPaint(value: string): FramerSolidPaint | null;
export declare function normalizePaint(input: FramerPaintInput | undefined, fallbackOpacity?: number): FramerSolidPaint;
export declare function mapFramerTextNodeToElement(node: FramerTextNode): SharedTextElement;
export declare function mapFramerTextNodeToStyle(node: FramerTextNode): SharedTextStyle;
export declare function readTextNodes(nodes: readonly FramerNodeLike[]): FramerTextAdapterReadResult;
export declare function buildFramerTextAttributes(style: SharedTextStyle, nextText?: string): FramerTextAttributes;
export declare function createTextUpdate(output: FramerTextAdapterOutput): FramerTextUpdate;
export declare function writeTextElements(outputs: readonly FramerTextAdapterOutput[], writer: (update: FramerTextUpdate) => Promise<void> | void): Promise<FramerTextAdapterWriteResult>;
export declare function readStoredTextAdapterState(storage: FramerPluginStorageFacade, key: string): Promise<Record<string, unknown>>;
export declare function writeStoredTextAdapterState(storage: FramerPluginStorageFacade, key: string, value: Record<string, unknown>): Promise<void>;
export declare function readSelectionWithFramer(framer: FramerPluginRuntimeFacade): Promise<FramerTextAdapterReadResult>;
export declare function writeSelectionWithFramer(framer: FramerPluginRuntimeFacade, outputs: readonly FramerTextAdapterOutput[]): Promise<FramerTextAdapterWriteResult>;
//# sourceMappingURL=framer-adapter.d.ts.map