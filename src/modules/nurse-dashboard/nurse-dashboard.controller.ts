import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateNursingAssessmentDto } from './dto/create-nursing-assessment.dto.js';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto.js';
import { NurseDashboardService } from './nurse-dashboard.service.js';

@Controller('nurse/dashboard')
@Roles('NURSE')
export class NurseDashboardController {
  constructor(private readonly nurseDashboardService: NurseDashboardService) {}

  @Get('visits/queue')
  @HttpCode(HttpStatus.OK)
  getTodayQueue() {
    return this.nurseDashboardService.findTodayQueue();
  }

  /**
   * GET /nurse/dashboard/patient-history
   *
   * Return all visit history associated with the authenticated nurse's
   * hospital, ordered newest first.
   * The hospital is resolved server-side from the authenticated user.
   * Limited to 10 requests per minute per IP.
   */
  @Get('patient-history')
  @Roles('NURSE')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  getPatientHistory(@Req() request: Request & { user: { id: string } }) {
    return this.nurseDashboardService.findPatientHistory(request.user.id);
  }

  /**
   * Save the nursing assessment and automatically change the visit
   * from REGISTERED to NURSE_CHECKED in one transaction.
   */
  @Post('nursing-assesment')
  @HttpCode(HttpStatus.CREATED)
  createNursingAssessment(@Body() dto: CreateNursingAssessmentDto) {
    return this.nurseDashboardService.createNursingAssessment(dto);
  }

  /**
   * PATCH /nurse/dashboard/visits/:visitId/status
   *
   * Body: { status: "CANCELLED" }
   * Manual nurse status updates only support cancellation.
   * Requires an authenticated nurse through the global guards.
   * Limited to 10 requests per minute per IP.
   */
  @Patch('visits/:visitId/status')
  @Roles('NURSE')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  updateVisitStatus(
    @Param('visitId') visitId: string,
    @Body() dto: UpdateVisitStatusDto,
  ) {
    return this.nurseDashboardService.updateVisitStatus(visitId, dto);
  }
}
