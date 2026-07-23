/**
 * FT-M1 — Miro AI Architect Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Miro Apps SDK.
 * Maps Miro board items → shared architecture engine model.
 * 90% shared architecture engine is UNCHANGED from platform to platform.
 *
 * Three-layer architecture:
 *   Layer 1 CONCEPT_NEUTRAL: @xiigen/plugin-sdk:platform (auth, AI gateway, freemium)
 *   Layer 2 IMPL_VARIES:     Shared architecture engine (arch-builder.ts, diagram-tree.ts)
 *   Layer 3 STACK_COUPLED:   THIS FILE — Miro SDK API surface only
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Miro Apps SDK constraint).
 * FLOW-34 FC-26: API mapping — Miro board items → shared architecture model.
 *
 * Property mapping (Miro → Shared):
 *   item.type 'card'      → SharedArchitectElement.type 'COMPONENT'
 *   item.type 'connector' → SharedArchitectElement.type 'RELATION'
 *   item.type 'shape'     → SharedArchitectElement.type 'STRUCTURE'
 *   item.type 'text'      → SharedArchitectElement.type 'LABEL'
 *   item.type 'frame'     → SharedArchitectElement.type 'BOUNDARY'
 *   item.title ?? content → SharedArchitectElement.label
 *   item.style.fillColor  → SharedArchitectElement.color
 *   item.position.x/y     → SharedArchitectElement.x/y
 *   item.geometry.w/h     → SharedArchitectElement.width/height
 *   item.startItem.id     → SharedArchitectElement.fromId
 *   item.endItem.id       → SharedArchitectElement.toId
 */
import type { MiroBoardItem, SharedArchitectElement, SharedArchitectStyle, MiroAdapterReadResult, MiroAdapterWriteResult, ArchitectEnhancedOutput } from './types';
export declare function mapMiroToElement(item: MiroBoardItem): SharedArchitectElement;
export declare function mapMiroToStyle(item: MiroBoardItem): SharedArchitectStyle;
export declare function mapStyleToMiro(style: SharedArchitectStyle): Partial<MiroBoardItem>;
export declare function readBoard(items: MiroBoardItem[]): MiroAdapterReadResult;
export declare function writeToBoard(enhanced: ArchitectEnhancedOutput[], writer: (payload: Record<string, unknown>) => Promise<void>): Promise<MiroAdapterWriteResult>;
export declare function applyWriteBackToItem(target: MiroBoardItem & {
    sync?: () => Promise<void>;
}, enhanced: ArchitectEnhancedOutput): Promise<void>;
//# sourceMappingURL=miro-adapter.d.ts.map