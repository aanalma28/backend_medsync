import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { PrescriptionsController } from './prescriptions.controller.js';
import { ProductsService } from './products.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, PrescriptionsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
