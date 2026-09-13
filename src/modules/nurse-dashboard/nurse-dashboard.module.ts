import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { NurseDashboardController } from './nurse-dashboard.controller.js';
import { NurseDashboardService } from './nurse-dashboard.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [NurseDashboardController],
  providers: [NurseDashboardService],
})
export class NurseDashboardModule {}