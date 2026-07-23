import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { PhaseRequirementsSeeder } from './phase-requirements-seeder.service';

@Module({
  imports: [FabricsModule],
  providers: [PhaseRequirementsSeeder],
  exports: [PhaseRequirementsSeeder],
})
export class EngineSelfAwarenessPhaseAModule {}
