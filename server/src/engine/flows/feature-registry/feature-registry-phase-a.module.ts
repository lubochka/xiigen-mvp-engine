/**
 * FeatureRegistryPhaseAModule — FLOW-36 Phase A
 *
 * Provides FeatureRegistryScanner for engine-level task type → FT record bootstrap.
 * Imported by EngineModule.
 */

import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { FeatureRegistryScanner } from './feature-registry-scanner.service';

@Module({
  imports: [FabricsModule],
  providers: [FeatureRegistryScanner],
  exports: [FeatureRegistryScanner],
})
export class FeatureRegistryPhaseAModule {}
