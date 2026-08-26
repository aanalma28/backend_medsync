import { Module } from '@nestjs/common';
import { DepartmenService } from './departmen.service.js';
import { DepartmenController } from './departmen.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [DepartmenController],
  providers: [DepartmenService],
  exports: [DepartmenService],
})
export class DepartmenModule {}
