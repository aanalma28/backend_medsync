import { Module } from '@nestjs/common';
import { HospitalController } from './hospital.controller.js';
import { HospitalService } from './hospital.service.js';

@Module({
  controllers: [HospitalController],
  providers: [HospitalService],
  exports: [HospitalService],
})
export class HospitalModule {}
