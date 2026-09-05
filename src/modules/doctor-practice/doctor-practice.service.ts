import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePracticeDto } from './dto/create-practice.dto.js';
import { QueryPracticeDto } from './dto/query-practice.dto.js';
import { QueryPatientHistoryDto } from './dto/query-patient-history.dto.js';
import { ToggleSlotActiveDto, UpdateSlotStatusDto } from './dto/update-slot.dto.js';
import { UpdateAppointmentStatusDto } from './dto/update-appointment.dto.js';

@Injectable()
export class DoctorPracticeService {
  constructor(private readonly prisma: PrismaService) { }

  // Helper cast for Prisma client access
  private get db() {
    return this.prisma as any;
  }

  /**
   * Resolve employee_id from user_id.
   * The JWT provides user.id (User table), but doctor-practice tables
   * use employee_id (Employee table). This lookup bridges the gap.
   */
  private async resolveEmployeeId(userId: string): Promise<string> {
    const employee = await this.db.employee.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!employee) {
      throw new ForbiddenException(
        'Data karyawan tidak ditemukan. Pastikan akun Anda terdaftar sebagai dokter.',
      );
    }

    return employee.id;
  }

  // ─────────────────────────────────────────────
  // 1. Create Practice Schedule with Slots
  // ─────────────────────────────────────────────

  /**
   * Create a DoctorPractice record + multiple SlotPractice records
   * in a single atomic transaction.
   */
  async createPracticeWithSlots(userId: string, createDto: CreatePracticeDto) {
    const employeeId = await this.resolveEmployeeId(userId);
    const practiceDate = new Date(createDto.practice_date);

    // Validate: no duplicate schedule on the same date for this doctor
    const existing = await this.db.doctorPractice.findFirst({
      where: {
        doctor_id: employeeId,
        practice_date: practiceDate,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Jadwal praktek pada tanggal ${createDto.practice_date} sudah ada. Silakan ubah jadwal yang sudah ada.`,
      );
    }

    // Atomic create: DoctorPractice + SlotPractice[]
    const result = await this.db.$transaction(async (tx: any) => {
      const practice = await tx.doctorPractice.create({
        data: {
          doctor_id: employeeId,
          practice_date: practiceDate,
        },
      });

      const slotsData = createDto.slots.map((slot) => ({
        practice_id: practice.id,
        name: slot.name,
        start_hour: slot.start_hour,
        end_hour: slot.end_hour,
        status_slot: slot.status_slot || 'OPEN',
        is_active: slot.is_active ?? true,
        max_patient: slot.max_patient,
      }));

      await tx.slotPractice.createMany({ data: slotsData });

      // Fetch the created practice with slots for the response
      const fullPractice = await tx.doctorPractice.findUnique({
        where: { id: practice.id },
        include: {
          slotsPractice: true,
        },
      });

      return fullPractice;
    });

    return {
      statusCode: 201,
      message: 'Jadwal praktek berhasil dibuat',
      data: result,
    };
  }

  // ─────────────────────────────────────────────
  // 2. View Practice Schedules (detail + slots + appointments)
  // ─────────────────────────────────────────────

  /**
   * Fetch all practice schedules for the logged-in doctor.
   * Includes nested slots → appointments → patient info.
   */
  async findPracticeSchedules(userId: string, queryDto: QueryPracticeDto) {
    const employeeId = await this.resolveEmployeeId(userId);

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { doctor_id: employeeId };

    // Date range filter
    if (queryDto.date_from || queryDto.date_to) {
      where.practice_date = {};
      if (queryDto.date_from) {
        where.practice_date.gte = new Date(queryDto.date_from);
      }
      if (queryDto.date_to) {
        where.practice_date.lte = new Date(queryDto.date_to);
      }
    }

    const [total, items] = await Promise.all([
      this.db.doctorPractice.count({ where }),
      this.db.doctorPractice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { practice_date: 'desc' },
        include: {
          slotsPractice: {
            orderBy: { start_hour: 'asc' },
            include: {
              appoinments: {
                orderBy: { queue_number: 'asc' },
                include: {
                  patientHistory: {
                    select: {
                      complaint: true,
                      patient_name: true,
                      patient_age: true,
                      gender: true,
                      detail_sympton: true,
                    },
                  },
                  patient: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          phone: true,
                        },
                      },
                    },
                  },
                },
              },
              _count: {
                select: { appoinments: true },
              },
            },
          },
        },
      }),
    ]);

    // Format the response and auto-close full slots
    const formattedData = items.map((practice: any) => ({
      id: practice.id,
      practice_date: practice.practice_date,
      slots: practice.slotsPractice.map((slot: any) => {
        const count = slot._count?.appoinments ?? 0;
        let effectiveStatus = slot.status_slot;

        // Auto update status close ketika mencapai maksimal limit pasien di suatu sesi
        if (count >= slot.max_patient && slot.status_slot === 'OPEN') {
          effectiveStatus = 'CLOSED';
          this.db.slotPractice
            .update({
              where: { id: slot.id },
              data: { status_slot: 'CLOSED' },
            })
            .catch((err: any) => console.warn(`Auto-close slot ${slot.id} failed:`, err));
        }

        return {
          id: slot.id,
          name: slot.name,
          start_hour: slot.start_hour,
          end_hour: slot.end_hour,
          status_slot: effectiveStatus,
          is_active: slot.is_active,
          max_patient: slot.max_patient,
          current_patient_count: count,
          appointments: slot.appoinments.map((apt: any) => ({
            id: apt.id,
            queue_number: apt.queue_number,
            status: apt.status,
            patient: {
              id: apt.patient.id,
              medical_record_number: apt.patient.medical_record_number,
              patient_name: apt.patientHistory?.patient_name,
              patient_age: apt.patientHistory?.patient_age,
              gender: apt.patientHistory?.gender,
              detail_sympton: apt.patientHistory?.detail_sympton,
              email: apt.patient.user?.email,
              phone: apt.patient.user?.phone,
              complaint: apt.patientHistory?.complaint,
            },
            createdAt: apt.createdAt,
          })),
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        };
      }),
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil data jadwal praktek',
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 3. View Today's Patients
  // ─────────────────────────────────────────────

  /**
   * Fetch patients who have appointments today for the logged-in doctor.
   */
  async findTodayPatients(userId: string) {
    const employeeId = await this.resolveEmployeeId(userId);

    // Get today's date range (start of day → end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayPractice = await this.db.doctorPractice.findMany({
      where: {
        doctor_id: employeeId,
        practice_date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        slotsPractice: {
          where: { is_active: true },
          orderBy: { start_hour: 'asc' },
          include: {
            appoinments: {
              where: {
                status: { in: ['PENDING', 'CONFIRMED'] },
              },
              orderBy: { queue_number: 'asc' },
              include: {
                patientHistory: {
                  select: {
                    complaint: true,
                    patient_name: true,
                    patient_age: true,
                    gender: true,
                    detail_sympton: true,
                  },
                },
                patient: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        birth_date: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: { appoinments: true },
            },
          },
        },
      },
    });

    // Flatten into a patient-centric list
    const patients: any[] = [];
    for (const practice of todayPractice) {
      for (const slot of practice.slotsPractice) {
        for (const apt of slot.appoinments) {
          patients.push({
            appointment_id: apt.id,
            queue_number: apt.queue_number,
            status: apt.status,
            slot: {
              id: slot.id,
              name: slot.name,
              start_hour: slot.start_hour,
              end_hour: slot.end_hour,
            },
            patient: {
              id: apt.patient.id,
              medical_record_number: apt.patient.medical_record_number,
              patient_name: apt.patientHistory?.patient_name,
              email: apt.patient.user?.email,
              phone: apt.patient.user?.phone,
              gender: apt.patientHistory?.gender,
              patient_age: apt.patientHistory?.patient_age,
              complaint: apt.patientHistory?.complaint,
              detail_sympton: apt.patientHistory?.detail_sympton,

            },
            createdAt: apt.createdAt,
          });
        }
      }
    }

    return {
      statusCode: 200,
      message: 'Berhasil mengambil data pasien hari ini',
      data: {
        date: startOfDay.toISOString().split('T')[0],
        total_patients: patients.length,
        patients,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 4. View Patient Medical History
  // ─────────────────────────────────────────────

  /**
   * Fetch medical history records for patients handled by the logged-in doctor.
   * Includes appointment detail and patient info.
   */
  async findPatientMedicalHistory(userId: string, queryDto: QueryPatientHistoryDto) {
    const employeeId = await this.resolveEmployeeId(userId);

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { doctor_id: employeeId };

    // Search by patient name or medical record number
    if (queryDto.search && queryDto.search.trim() !== '') {
      const search = queryDto.search.trim();
      where.OR = [
        {
          patient: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          patient: {
            medical_record_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.medicalHistory.count({ where }),
      this.db.medicalHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  birth_date: true,
                },
              },
            },
          },
          appoinment: {
            include: {
              slotPractice: {
                include: {
                  practice: {
                    select: {
                      id: true,
                      practice_date: true,
                    },
                  },
                },
              },
            },
          },
          medicalRecipe: {
            include: {
              recipeDetails: {
                include: {
                  product: {
                    select: {
                      name: true,
                    }
                  }
                },
              }
            },
          },
        },
      }),
    ]);

    const formattedData = items.map((history: any) => ({
      id: history.id,
      complaint: history.complaint,
      diagnosis: history.diagnosis,
      patient_name: history.patient_name,
      patient_age: history.patient_age,
      gender: history.gender,
      notes: history.notes,
      createdAt: history.createdAt,
      patient: {
        id: history.patient.id,
        medical_record_number: history.patient.medical_record_number,
        name: history.patient.user?.name,
        email: history.patient.user?.email,
        phone: history.patient.user?.phone,
        birth_date: history.patient.user?.birth_date,
      },
      appointment: {
        id: history.appoinment.id,
        queue_number: history.appoinment.queue_number,
        status: history.appoinment.status,
        practice_date: history.appoinment.slotPractice?.practice?.practice_date,
        slot_name: history.appoinment.slotPractice?.name,
      },
      recipe: history.medicalRecipe
        ? {
          id: history.medicalRecipe.id,
          no_trx: history.medicalRecipe.no_trx,
          recipe_date_exec: history.medicalRecipe.recipe_date_exec,
          status: history.medicalRecipe.status,
          detailRecipe: history.medicalRecipe.recipeDetails.map(detail => ({
            name: detail.product?.name ?? 'Obat tidak diketahui',
            rules_using: detail.rules_using,
          }))
        }
        : null,
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil riwayat medis pasien',
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 5. Soft-Delete Slot (toggle is_active)
  // ─────────────────────────────────────────────

  /**
   * Toggle a slot's is_active status (soft-delete).
   * Verifies the slot belongs to the logged-in doctor.
   */
  async toggleSlotActive(userId: string, slotId: string, dto: ToggleSlotActiveDto) {
    const employeeId = await this.resolveEmployeeId(userId);

    // Verify slot exists and belongs to this doctor
    const slot = await this.db.slotPractice.findUnique({
      where: { id: slotId },
      include: {
        practice: {
          select: { doctor_id: true },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot praktek tidak ditemukan');
    }

    if (slot.practice.doctor_id !== employeeId) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk mengubah slot ini');
    }

    const updated = await this.db.slotPractice.update({
      where: { id: slotId },
      data: { is_active: dto.is_active },
    });

    return {
      statusCode: 200,
      message: dto.is_active
        ? 'Slot praktek berhasil diaktifkan'
        : 'Slot praktek berhasil dinonaktifkan',
      data: updated,
    };
  }

  // ─────────────────────────────────────────────
  // 6. Update Slot Status (OPEN/CLOSED)
  // ─────────────────────────────────────────────

  /**
   * Update a slot's status_slot (OPEN/CLOSED).
   * Verifies the slot belongs to the logged-in doctor.
   */
  async updateSlotStatus(userId: string, slotId: string, dto: UpdateSlotStatusDto) {
    const employeeId = await this.resolveEmployeeId(userId);

    const slot = await this.db.slotPractice.findUnique({
      where: { id: slotId },
      include: {
        practice: {
          select: { doctor_id: true },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot praktek tidak ditemukan');
    }

    if (slot.practice.doctor_id !== employeeId) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk mengubah slot ini');
    }

    const updated = await this.db.slotPractice.update({
      where: { id: slotId },
      data: { status_slot: dto.status_slot },
    });

    return {
      statusCode: 200,
      message: `Status slot berhasil diubah menjadi ${dto.status_slot}`,
      data: updated,
    };
  }

  // ─────────────────────────────────────────────
  // 7. Update Appointment Status
  // ─────────────────────────────────────────────

  /**
   * Update an appointment's status (PENDING/CONFIRMED/CANCELLED/COMPLETED).
   * Verifies the appointment's slot belongs to the logged-in doctor.
   */
  async updateAppointmentStatus(
    userId: string,
    appointmentId: string,
    dto: UpdateAppointmentStatusDto,
  ) {
    const employeeId = await this.resolveEmployeeId(userId);

    const appointment = await this.db.doctorAppoinment.findUnique({
      where: { id: appointmentId },
      include: {
        slotPractice: {
          include: {
            practice: {
              select: { doctor_id: true },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Janji temu tidak ditemukan');
    }

    if (appointment.slotPractice.practice.doctor_id !== employeeId) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk mengubah janji temu ini');
    }

    const updated = await this.db.doctorAppoinment.update({
      where: { id: appointmentId },
      data: { status: dto.status },
    });

    return {
      statusCode: 200,
      message: `Status janji temu berhasil diubah menjadi ${dto.status}`,
      data: updated,
    };
  }
}
