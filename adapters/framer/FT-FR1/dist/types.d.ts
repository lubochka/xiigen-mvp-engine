export type FramerNodeType = 'text' | 'Text' | 'frame' | 'Frame' | 'component' | 'Component';
export interface FramerSolidPaint {
    type: 'solid';
    color: string;
    opacity: number;
}
export type FramerPaintInput = string | {
    type?: string;
    color?: string;
    opacity?: number;
};
export interface FramerNodeLike {
    id: string;
    type: FramerNodeType | string;
    name?: string;
    text?: string;
    characters?: string;
    width?: number;
    height?: number;
    fontFamily?: string;
    fontSize?: number | string;
    fontWeight?: number | string;
    fontStyle?: string;
    lineHeight?: number | string;
    letterSpacing?: number | string;
    color?: FramerPaintInput;
    fills?: readonly FramerPaintInput[];
    opacity?: number;
}
export interface FramerTextNode extends FramerNodeLike {
    type: 'text' | 'Text';
}
export interface SharedTextElement {
    id: string;
    name: string;
    text: string;
    width: number;
    height: number;
}
export interface SharedTextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyleName: string;
    lineHeight: number | string;
    letterSpacing: number | string;
    color: string;
    opacity: number;
    paint: FramerSolidPaint;
}
export interface FramerTextAttributes {
    text?: string;
    characters?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    fontStyle?: string;
    lineHeight?: number | string;
    letterSpacing?: number | string;
    fills?: FramerSolidPaint[];
    opacity?: number;
}
export interface FramerTextUpdate {
    nodeId: string;
    attributes: FramerTextAttributes;
}
export interface FramerTextAdapterOutput {
    element: SharedTextElement;
    style: SharedTextStyle;
    nextText?: string;
    generatedName?: string;
}
export interface FramerTextAdapterReadResult {
    elements: SharedTextElement[];
    styles: SharedTextStyle[];
    sourceNodes: FramerTextNode[];
}
export interface FramerTextAdapterWriteResult {
    written: number;
    failed: number;
    updates: FramerTextUpdate[];
}
export interface FramerPluginStorageFacade {
    getPluginData(key: string): string | undefined | Promise<string | undefined>;
    setPluginData(key: string, value: string): void | Promise<void>;
}
export interface FramerPluginRuntimeFacade extends FramerPluginStorageFacade {
    getSelection(): readonly FramerNodeLike[] | Promise<readonly FramerNodeLike[]>;
    setAttributes(nodeId: string, attributes: FramerTextAttributes): void | Promise<void>;
}
//# sourceMappingURL=types.d.ts.map