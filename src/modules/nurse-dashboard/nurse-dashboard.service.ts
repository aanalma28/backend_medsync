import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateNursingAssessmentDto } from './dto/create-nursing-assessment.dto.js';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto.js';

@Injectable()
export class NurseDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  /**
   * Resolve hospital membership from the authenticated user.
   * Never accept the hospital ID from the client for access scoping.
   */
  private async resolveNurseHospitalId(userId: string): Promise<string> {
    if (!userId) {
      throw new ForbiddenException('Identitas perawat tidak ditemukan');
    }

    const employee = await this.db.employee.findUnique({
      where: { user_id: userId },
      select: {
        departmen: {
          select: {
            hospital_id: true,
          },
        },
      },
    });

    const hospitalId = employee?.departmen?.hospital_id;

    if (!hospitalId) {
      throw new ForbiddenException(
        'Data rumah sakit perawat tidak ditemukan. Pastikan akun Anda terhubung dengan data karyawan dan departemen.',
      );
    }

    return hospitalId;
  }

  /**
   * Return all visits associated with the nurse's hospital.
   *
   * Hospital attribution follows:
   * Visit -> appointment -> slot -> practice -> doctor -> department.
   *
   * This uses the doctor's current department because Visit does not
   * store a historical hospital ID.
   */
  async findPatientHistory(userId: string) {
    const hospitalId = await this.resolveNurseHospitalId(userId);

    const visits = await this.db.visit.findMany({
      where: {
        appoinment: {
          slotPractice: {
            practice: {
              doctor: {
                is: {
                  departmen: {
                    hospital_id: hospitalId,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        createdAt: true,
        complaint: true,
        status: true,
        patient: {
          select: {
            id: true,
            medical_record_number: true,
            name: true,
            gender: true,
            age: true,
          },
        },
        nursingRecord: {
          select: {
            sistolic: true,
            diastolic: true,
            temperature: true,
            heart_rate: true,
            weight: true,
            height: true,
            notes: true,
          },
        },
      },
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil riwayat pasien',
      data: {
        visits: visits.map((visit: any) => ({
          visitId: visit.id,
          date: visit.createdAt,
          complaint: visit.complaint,
          status: visit.status,
          patient: {
            id: visit.patient.id,
            medicalRecordNumber: visit.patient.medical_record_number,
            name: visit.patient.name,
            gender: visit.patient.gender,
            age: visit.patient.age,
          },
          nursingAssessment: visit.nursingRecord
            ? {
                systolic: visit.nursingRecord.sistolic,
                diastolic: visit.nursingRecord.diastolic,
                temperature: visit.nursingRecord.temperature,
                heartRate: visit.nursingRecord.heart_rate,
                weight: visit.nursingRecord.weight,
                height: visit.nursingRecord.height,
                notes: visit.nursingRecord.notes,
              }
            : null,
        })),
      },
    };
  }

  async findTodayQueue() {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
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

  /**
   * Save the assessment, advance the visit to NURSE_CHECKED, and confirm
   * the appointment linked through the visit's one-to-one relationship.
   * All operations are committed or rolled back together.
   */
  async createNursingAssessment(dto: CreateNursingAssessmentDto) {
    return this.db.$transaction(async (tx: any) => {
      const visit = await tx.visit.findUnique({
        where: { id: dto.visitId },
        select: { id: true, status: true, appoinment_id: true },
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

      await tx.doctorAppoinment.update({
        where: { id: visit.appoinment_id },
        data: { status: 'CONFIRMED' },
      });

      return {
        statusCode: 201,
        message: 'Assessment perawat berhasil disimpan',
        data: { visitId: dto.visitId, status: 'NURSE_CHECKED', assessment },
      };
    });
  }

  /**
   * Manual nurse status updates only allow cancellation.
   * NURSE_CHECKED is set exclusively by assessment creation in this service.
   * Calling a patient must not change the visit status.
   */
  async updateVisitStatus(visitId: string, dto: UpdateVisitStatusDto) {
    // Enforce the restriction even when called without HTTP DTO validation.
    if (dto.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Perawat hanya dapat mengubah status secara manual menjadi CANCELLED',
      );
    }

    const visit = await this.db.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        patient_id: true,
        status: true,
      },
    });

    if (!visit) {
      throw new NotFoundException('Kunjungan pasien tidak ditemukan');
    }

    const cancellableStatuses: readonly string[] = [
      'REGISTERED',
      'NURSE_CHECKED',
      'DOCTOR_EXAMINED',
    ];

    if (!cancellableStatuses.includes(visit.status)) {
      throw new ConflictException(
        `Kunjungan dengan status ${visit.status} tidak dapat dibatalkan`,
      );
    }

    // Compare and update atomically so concurrent status changes are not lost.
    const updatedVisits = await this.db.visit.updateMany({
      where: {
        id: visitId,
        status: visit.status,
      },
      data: {
        status: 'CANCELLED',
      },
    });

    if (updatedVisits.count !== 1) {
      throw new ConflictException(
        'Data kunjungan berubah sebelum disimpan. Silakan muat ulang data dan coba kembali.',
      );
    }

    return {
      statusCode: 200,
      message: 'Kunjungan pasien berhasil dibatalkan',
      data: {
        visitId,
        patientId: visit.patient_id,
        previousStatus: visit.status,
        status: 'CANCELLED',
      },
    };
  }
}
