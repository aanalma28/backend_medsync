import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { DepartmenModule } from './modules/departmen/departmen.module.js';
import { HospitalModule } from './modules/hospital/hospital.module.js';
import { DoctorPracticeModule } from './modules/doctor-practice/doctor-practice.module.js';
import { PatientDashboardModule } from './modules/patient-dashboard/patient-dashboard.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { CsrfGuard } from './common/guards/csrf.guard.js';

@Module({
  imports: [
    // Global rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    HospitalModule,
    DepartmenModule,
    DoctorPracticeModule,
    PatientDashboardModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global Guards (order matters — throttler first, then auth, then roles, then csrf)
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
