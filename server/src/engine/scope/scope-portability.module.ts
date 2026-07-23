/**
 * ScopePortabilityModule — wires all 5 scope/portability services.
 *
 * Exported for use by CalibrationModule and EngineModule.
 * Imports DatabaseModule for db fabric access.
 */

import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '../../fabrics/database/database.module';
import { FreedomModule } from '../../freedom/freedom.module';
import { KnowledgePolicyService } from './knowledge-policy.service';
import { ModuleLibraryService } from './module-library.service';
import { ModuleAdoptionService } from './module-adoption.service';
import { ModuleSnapshotService } from './module-snapshot.service';
import { FreshTenantTestService } from './fresh-tenant-test.service';
import { CalibrationModule } from '../calibration/calibration.module';
// FLOW-47 Turn 3+4: design-time snapshot + install validation services
import { DesignTimeSnapshotService } from './design-time-snapshot.service';
import { InstallValidationService } from './install-validation.service';

@Module({
  imports: [DatabaseModule, FreedomModule, forwardRef(() => CalibrationModule)],
  providers: [
    KnowledgePolicyService,
    ModuleLibraryService,
    ModuleAdoptionService,
    ModuleSnapshotService,
    FreshTenantTestService,
    // FLOW-47 Turn 3 (T659)
    DesignTimeSnapshotService,
    // FLOW-47 Turn 4 (T660)
    InstallValidationService,
  ],
  exports: [
    KnowledgePolicyService,
    ModuleLibraryService,
    ModuleAdoptionService,
    ModuleSnapshotService,
    FreshTenantTestService,
    DesignTimeSnapshotService,
    InstallValidationService,
  ],
})
export class ScopePortabilityModule {}
