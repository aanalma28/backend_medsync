import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNursingAssessmentDto } from './dto/create-nursing-assessment.dto.js';

@Injectable()
export class NurseDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  async findTodayQueue() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfTomorrow = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    const visits = await this.db.visit.findMany({
      where: {
        appoinment: {
          slotPractice: {
            practice: {
              practice_date: {
                gte: startOfDay,
                lt: startOfTomorrow,
              },
            },
          },
        },
      },
      orderBy: [
        { appoinment: { slotPractice: { start_hour: 'asc' } } },
        { appoinment: { queue_number: 'asc' } },
      ],
      select: {
        id: true,
        createdAt: true,
        status: true,
        payerType: true,
        patient: {
          select: {
            medical_record_number: true,
            name: true,
            gender: true,
            age: true,
          },
        },
        appoinment: {
          select: {
            queue_number: true,
            slotPractice: {
              select: {
                name: true,
                start_hour: true,
                end_hour: true,
                practice: { select: { practice_date: true } },
              },
            },
          },
        },
      },
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil antrean pasien hari ini',
      data: visits.map((visit: any) => ({
        visitId: visit.id,
        registrationTime: visit.createdAt,
        status: visit.status,
        payerType: visit.payerType,
        queueNumber: visit.appoinment.queue_number,
        patient: {
          medicalRecordNumber: visit.patient.medical_record_number,
          name: visit.patient.name,
          gender: visit.patient.gender,
          age: visit.patient.age,
        },
        slot: {
          name: visit.appoinment.slotPractice.name,
          startHour: visit.appoinment.slotPractice.start_hour,
          endHour: visit.appoinment.slotPractice.end_hour,
        },
      })),
    };
  }

  async createNursingAssessment(dto: CreateNursingAssessmentDto) {
    return this.db.$transaction(async (tx: any) => {
      const visit = await tx.visit.findUnique({
        where: { id: dto.visitId },
        select: { id: true, status: true },
      });

      if (!visit) {
        throw new NotFoundException('Kunjungan pasien tidak ditemukan');
      }

      if (visit.status !== 'REGISTERED') {
        throw new ConflictException(
          'Tanda vital hanya dapat dicatat untuk kunjungan dengan status REGISTERED',
        );
      }

      const assessment = await tx.nursingAssesment.create({
        data: {
          visit_id: dto.visitId,
          sistolic: dto.systolic,
          diastolic: dto.diastolic,
          temperature: dto.temperature,
          heart_rate: dto.heartRate,
          weight: dto.weight,
          height: dto.height,
          notes: dto.notes,
        },
      });

      const updatedVisits = await tx.visit.updateMany({
        where: { id: dto.visitId, status: 'REGISTERED' },
        data: { status: 'NURSE_CHECKED' },
      });

      if (updatedVisits.count !== 1) {
        throw new ConflictException('Status kunjungan berubah sebelum disimpan');
      }

      return {
        statusCode: 201,
        message: 'Assessment perawat berhasil disimpan',
        data: { visitId: dto.visitId, status: 'NURSE_CHECKED', assessment },
      };
    });
  }
}