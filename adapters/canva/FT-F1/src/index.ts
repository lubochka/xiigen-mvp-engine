/**
 * FT-F1 — Canva Site Generator Adapter
 * Barrel exports for @xiigen/canva-site-generator
 */

export {
  mapCanvaToSiteElement,
  mapCanvaToSiteStyle,
  mapSiteStyleToCanva,
  readDesignForSite,
  writeGeneratedSite,
} from './canva-adapter';

export type {
  CanvaDesignElement,
  SharedSiteElement,
  SharedSiteStyle,
  SiteGenerationOutput,
  SiteAdapterReadResult,
  SiteAdapterWriteResult,
  SiteEnhancedOutput,
} from './types';
