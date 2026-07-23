/**
 * C5 Canva Text Elements Adapter — plugin entry point.
 *
 * FT-C5 | FLOW-34 | adapterMode: MODE-B-thin
 *
 * This is the Canva app entrypoint. In production it integrates with:
 *   - @xiigen/plugin-sdk (auth, AI gateway, usage tracking, freemium gate)
 *   - @canva/design (selection + canvas write)
 *   - @canva/app-storage (cross-session user preferences)
 *
 * Business logic is in XIIGen Mode A (server-side).
 * This file only coordinates: read → enhance (via gateway) → write.
 */

export { mapCanvaToElement, mapCanvaToStyle, mapStyleToCanva, readSelection, writeToCanvas } from './canva-adapter';
export type { CanvaTextElement, SharedElement, SharedStyle, CanvaAdapterReadResult, CanvaAdapterWriteResult, CanvaEnhancedOutput } from './types';
