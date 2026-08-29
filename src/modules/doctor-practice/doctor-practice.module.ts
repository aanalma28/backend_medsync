import { Module } from '@nestjs/common';
import { DoctorPracticeService } from './doctor-practice.service.js';
import { DoctorPracticeController } from './doctor-practice.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DoctorPracticeController],
  providers: [DoctorPracticeService],
  exports: [DoctorPracticeService],
})
export class DoctorPracticeModule {}
