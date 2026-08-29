import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { PatientDashboardService } from './patient-dashboard.service.js';
import { QueryDoctorScheduleDto } from './dto/query-doctor-schedule.dto.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { QueryAppointmentDto } from './dto/query-appointment.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Patient Dashboard Controller — handles patient dashboard API operations.
 *
 * Endpoints are protected for PATIENT role.
 * Prefix: /patient/dashboard
 */
@Controller('patient/dashboard')
@Roles('PATIENT')
export class PatientDashboardController {
  constructor(
    private readonly patientDashboardService: PatientDashboardService,
  ) {}

  /**
   * GET /patient/dashboard/schedules
   * Search doctor practice schedules by date and/or department.
   * Query params: ?date=2026-09-01&departmen_id=cuid...&search=umum
   */
  @Get('schedules')
  @HttpCode(HttpStatus.OK)
  async getDoctorSchedules(@Query() queryDto: QueryDoctorScheduleDto) {
    return this.patientDashboardService.findDoctorSchedules(queryDto);
  }

  /**
   * POST /patient/dashboard/appointments
   * Assign/book a specific doctor practice slot to create an appointment.
   * Body: { slot_practice_id: "cuid..." }
   */
  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @Req() request: Request,
    @Body() createDto: CreateAppointmentDto,
  ) {
    const user = (request as any).user;
    return this.patientDashboardService.createAppointment(user.id, createDto);
  }

  /**
   * GET /patient/dashboard/appointments
   * View all appointments for the logged-in patient.
   * Query params: ?status=PENDING&page=1&limit=10
   */
  @Get('appointments')
  @HttpCode(HttpStatus.OK)
  async getPatientAppointments(
    @Req() request: Request,
    @Query() queryDto: QueryAppointmentDto,
  ) {
    const user = (request as any).user;
    return this.patientDashboardService.findPatientAppointments(user.id, queryDto);
  }

  /**
   * PATCH /patient/dashboard/appointments/:id/cancel
   * Cancel an appointment by appointment ID.
   */
  @Patch('appointments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Req() request: Request,
    @Param('id') appointmentId: string,
  ) {
    const user = (request as any).user;
    return this.patientDashboardService.cancelAppointment(user.id, appointmentId);
  }
}
