import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateNursingAssessmentDto } from './dto/create-nursing-assessment.dto.js';
import { NurseDashboardService } from './nurse-dashboard.service.js';

@Controller('api')
@Roles('NURSE')
export class NurseDashboardController {
  constructor(private readonly nurseDashboardService: NurseDashboardService) {}

  @Get('visits/queue')
  @HttpCode(HttpStatus.OK)
  getTodayQueue() {
    return this.nurseDashboardService.findTodayQueue();
  }

  @Post('nursing-assessment')
  @HttpCode(HttpStatus.CREATED)
  createNursingAssessment(@Body() dto: CreateNursingAssessmentDto) {
    return this.nurseDashboardService.createNursingAssessment(dto);
  }
}