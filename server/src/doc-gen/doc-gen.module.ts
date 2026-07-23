/**
 * DocGenModule — NestJS module for auto-generated documentation.
 *
 * Provides: OpenApiGenerator, ModuleReadmeGenerator, ServiceCatalogGenerator, DiagramGenerator.
 * Exports: All generators.
 *
 * Phase 11.5: Module wiring.
 */

import { Module } from '@nestjs/common';
import { OpenApiGenerator } from './openapi-generator';
import { ModuleReadmeGenerator } from './module-readme-generator';
import { ServiceCatalogGenerator } from './service-catalog-generator';
import { DiagramGenerator } from './diagram-generator';

@Module({
  providers: [OpenApiGenerator, ModuleReadmeGenerator, ServiceCatalogGenerator, DiagramGenerator],
  exports: [OpenApiGenerator, ModuleReadmeGenerator, ServiceCatalogGenerator, DiagramGenerator],
})
export class DocGenModule {}
