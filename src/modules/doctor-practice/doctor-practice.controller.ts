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
import { DoctorPracticeService } from './doctor-practice.service.js';
import { CreatePracticeDto } from './dto/create-practice.dto.js';
import { QueryPracticeDto } from './dto/query-practice.dto.js';
import { QueryPatientHistoryDto } from './dto/query-patient-history.dto.js';
import { ToggleSlotActiveDto, UpdateSlotStatusDto } from './dto/update-slot.dto.js';
import { UpdateDoctorVisitStatusDto } from './dto/update-visit-status.dto.js';
import { CreateDoctorExaminationDto } from './dto/create-doctor-examination.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { Request } from 'express';

/**
 * Doctor Practice Controller — handles doctor dashboard actions.
 *
 * Endpoints require a doctor role unless overridden at method level.
 * The logged-in employee's identity (from JWT) scopes data access.
 *
 * Prefix: /doctor/practice
 */
@Controller('doctor/practice')
@Roles('GENERAL_DOCTOR', 'SPECIALIST_DOCTOR')
export class DoctorPracticeController {
  constructor(private readonly doctorPracticeService: DoctorPracticeService) { }

  /**
   * POST /doctor/practice
   * Create a new practice schedule with slots.
   * Body: { practice_date, slots: [{ name, start_hour, end_hour, status_slot?, is_active?, max_patient }] }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPractice(
    @Req() request: Request,
    @Body() createDto: CreatePracticeDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.createPracticeWithSlots(user.id, createDto);
  }

  /**
   * GET /doctor/practice/schedules
   * View all practice schedules with slots and appointments.
   * Query: ?page=1&limit=10&date_from=2026-09-01&date_to=2026-09-30
   */
  @Get('schedules')
  @HttpCode(HttpStatus.OK)
  async getSchedules(
    @Req() request: Request,
    @Query() queryDto: QueryPracticeDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.findPracticeSchedules(user.id, queryDto);
  }

  /**
   * GET /doctor/practice/today-patients
   * View patients with appointments today.
   */
  @Roles('GENERAL_DOCTOR', 'SPECIALIST_DOCTOR', 'NURSE')
  @Get('today-patients')
  @HttpCode(HttpStatus.OK)
  async getTodayPatients(@Req() request: Request) {
    const user = (request as any).user;
    return this.doctorPracticeService.findTodayPatients(user.id);
  }

  /**
   * GET /doctor/practice/patient-history
   * View medical history of patients handled by this doctor.
   * Query: ?page=1&limit=10&search=nama_pasien
   */
  @Get('patient-history')
  @HttpCode(HttpStatus.OK)
  async getPatientHistory(
    @Req() request: Request,
    @Query() queryDto: QueryPatientHistoryDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.findPatientMedicalHistory(user.id, queryDto);
  }

  /**
   * PATCH /doctor/practice/slots/:id/toggle-active
   * Soft-delete (toggle is_active) a practice slot.
   * Body: { is_active: boolean }
   */
  @Patch('slots/:id/toggle-active')
  @HttpCode(HttpStatus.OK)
  async toggleSlotActive(
    @Req() request: Request,
    @Param('id') slotId: string,
    @Body() dto: ToggleSlotActiveDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.toggleSlotActive(user.id, slotId, dto);
  }

  /**
   * PATCH /doctor/practice/slots/:id/status
   * Update a slot's status (OPEN/CLOSED).
   * Body: { status_slot: "OPEN" | "CLOSED" }
   */
  @Patch('slots/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateSlotStatus(
    @Req() request: Request,
    @Param('id') slotId: string,
    @Body() dto: UpdateSlotStatusDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.updateSlotStatus(user.id, slotId, dto);
  }

  /**
   * PATCH /doctor/practice/visits/:visitId/status
   * Update Visit.status without changing the associated appointment status.
   * Body: { status: "DOCTOR_EXAMINED" | "CANCELLED" }
   */
  @Patch('visits/:visitId/status')
  @HttpCode(HttpStatus.OK)
  async updateVisitStatus(
    @Req() request: Request,
    @Param('visitId') visitId: string,
    @Body() dto: UpdateDoctorVisitStatusDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.updateVisitStatus(
      user.id,
      visitId,
      dto,
    );
  }

  /**
   * POST /doctor/practice/examinations
   * Record a doctor examination: SOAP assessment + prescription (header + details).
   * Body:
   * {
   *   visitId,
   *   subjective?, objective?, assessment?, plan?, doctorNotes?,
   *   no_trx?, recipe_date_exec?, take_med_date?,
   *   details: [{ product_id, rules_using }]
   * }
   */
  @Post('examinations')
  @HttpCode(HttpStatus.CREATED)
  async createExamination(
    @Req() request: Request,
    @Body() dto: CreateDoctorExaminationDto,
  ) {
    const user = (request as any).user;
    return this.doctorPracticeService.createDoctorExamination(user.id, dto);
  }
}
