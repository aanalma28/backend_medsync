import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PatientDashboardController } from './patient-dashboard.controller.js';
import { PatientDashboardService } from './patient-dashboard.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [PatientDashboardController],
  providers: [PatientDashboardService],
  exports: [PatientDashboardService],
})
export class PatientDashboardModule {}
