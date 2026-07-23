import type { MiroBoardItem, MiroLayoutMode, MiroSpatialAnalysis } from './types';
export declare function containsItem(parent: MiroBoardItem, child: MiroBoardItem, tolerance?: number): boolean;
export declare function inferLayoutMode(items: MiroBoardItem[]): MiroLayoutMode;
export declare function analyzeSpatialLayout(items: MiroBoardItem[], tolerance?: number): MiroSpatialAnalysis;
//# sourceMappingURL=spatial-analyzer.d.ts.map