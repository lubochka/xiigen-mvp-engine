/**
 * FT-M1 — Miro AI Architect Adapter
 * Barrel exports for @xiigen/miro-ai-architect
 */
export { mapMiroToElement, mapMiroToStyle, mapStyleToMiro, readBoard, writeToBoard, applyWriteBackToItem, } from './miro-adapter';
export { classifyMiroShape, classifyMiroShapes } from './shape-classifier';
export { analyzeSpatialLayout, containsItem, inferLayoutMode } from './spatial-analyzer';
export { parseMiroContent } from './html-content-parser';
export type { MiroBoardItem, SharedArchitectElement, SharedArchitectStyle, MiroAdapterReadResult, MiroAdapterWriteResult, ArchitectEnhancedOutput, MiroShapeClassification, MiroSpatialAnalysis, MiroSpatialNode, MiroLayoutMode, } from './types';
//# sourceMappingURL=index.d.ts.map