import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service.js';
import { LogisticsController } from './logistics.controller.js';

@Module({
  controllers: [LogisticsController],
  providers: [LogisticsService],
  exports: [LogisticsService],
})
export class LogisticsModule {}
