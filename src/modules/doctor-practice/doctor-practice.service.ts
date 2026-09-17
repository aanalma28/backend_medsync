import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePracticeDto } from './dto/create-practice.dto.js';
import { QueryPracticeDto } from './dto/query-practice.dto.js';
import { QueryPatientHistoryDto } from './dto/query-patient-history.dto.js';
import { ToggleSlotActiveDto, UpdateSlotStatusDto } from './dto/update-slot.dto.js';
import { UpdateDoctorVisitStatusDto } from './dto/update-visit-status.dto.js';
import { CreateDoctorExaminationDto } from './dto/create-doctor-examination.dto.js';

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

  /**
   * Generate a transaction number when the client does not provide one.
   * Format: TRX-YYYYMMDD-HHmmss-<random>
   */
  private generateNoTrx(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `TRX-${date}-${time}-${rand}`;
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
                      id: true,
                      status: true,
                      complaint: true,
                      detail_sympton: true,
                      doctorRecord: {
                        select: {
                          objective: true,
                          assessment: true,
                          plan: true,
                          doctorNotes: true,
                        },
                      },
                      nursingRecord: {
                        select: {
                          sistolic: true,
                          diastolic: true,
                          heart_rate: true,
                          respiratory_rate: true,
                          temperature: true,
                          weight: true,
                          height: true,
                          notes: true,
                        },
                      },
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
            visit_id: apt.patientHistory?.id ?? null,
            visit_status: apt.patientHistory?.status ?? null,
            doctor_assesment: apt.patientHistory?.doctorRecord
              ? {
                objective: apt.patientHistory.doctorRecord.objective,
                assesment: apt.patientHistory.doctorRecord.assessment,
                plan: apt.patientHistory.doctorRecord.plan,
                notes: apt.patientHistory.doctorRecord.doctorNotes,
              }
              : null,
            nurse_assesment: apt.patientHistory?.nursingRecord
              ? {
                sistolic: apt.patientHistory.nursingRecord.sistolic,
                diastolic: apt.patientHistory.nursingRecord.diastolic,
                heart_rate: apt.patientHistory.nursingRecord.heart_rate,
                respiratory_rate: apt.patientHistory.nursingRecord.respiratory_rate,
                temperature: apt.patientHistory.nursingRecord.temperature,
                weight: apt.patientHistory.nursingRecord.weight,
                height: apt.patientHistory.nursingRecord.height,
                notes: apt.patientHistory.nursingRecord.notes,
              }
              : null,
            patient: {
              id: apt.patient.id,
              medical_record_number: apt.patient.medical_record_number,
              patient_name: apt.patient.name,
              patient_age: apt.patient.age,
              gender: apt.patient.gender,
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
                    id: true,
                    status: true,
                    complaint: true,
                    detail_sympton: true,
                    doctorRecord: {
                      select: {
                        objective: true,
                        assessment: true,
                        plan: true,
                        doctorNotes: true,
                      },
                    },
                    nursingRecord: {
                      select: {
                        sistolic: true,
                        diastolic: true,
                        heart_rate: true,
                        respiratory_rate: true,
                        temperature: true,
                        weight: true,
                        height: true,
                        notes: true,
                      },
                    },
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
            appointment: {
              id: apt.id,
              queue_number: apt.queue_number,
              status: apt.status,
              visit_id: apt.patientHistory?.id ?? null,
              visit_status: apt.patientHistory?.status ?? null,
              doctor_assesment: apt.patientHistory?.doctorRecord
                ? {
                  objective: apt.patientHistory.doctorRecord.objective,
                  assesment: apt.patientHistory.doctorRecord.assessment,
                  plan: apt.patientHistory.doctorRecord.plan,
                  notes: apt.patientHistory.doctorRecord.doctorNotes,
                }
                : null,
              nurse_assesment: apt.patientHistory?.nursingRecord
                ? {
                  sistolic: apt.patientHistory.nursingRecord.sistolic,
                  diastolic: apt.patientHistory.nursingRecord.diastolic,
                  heart_rate: apt.patientHistory.nursingRecord.heart_rate,
                  respiratory_rate: apt.patientHistory.nursingRecord.respiratory_rate,
                  temperature: apt.patientHistory.nursingRecord.temperature,
                  weight: apt.patientHistory.nursingRecord.weight,
                  height: apt.patientHistory.nursingRecord.height,
                  notes: apt.patientHistory.nursingRecord.notes,
                }
                : null,
            },
            slot: {
              id: slot.id,
              name: slot.name,
              start_hour: slot.start_hour,
              end_hour: slot.end_hour,
            },
            patient: {
              id: apt.patient.id,
              medical_record_number: apt.patient.medical_record_number,
              patient_name: apt.patient.name,
              email: apt.patient.user?.email,
              phone: apt.patient.user?.phone,
              gender: apt.patient.gender,
              patient_age: apt.patient.age,
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

    const where: any = {
      appoinment: {
        slotPractice: {
          practice: { doctor_id: employeeId },
        },
      },
    };

    // Search by patient name or medical record number
    if (queryDto.search && queryDto.search.trim() !== '') {
      const search = queryDto.search.trim();
      where.OR = [
        {
          patient: { name: { contains: search, mode: 'insensitive' } },
        },
        {
          patient: {
            medical_record_number: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.visit.count({ where }),
      this.db.visit.findMany({
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
                  address: true,
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
          nursingRecord: true,
          doctorRecord: true,
          medicalRecipe: {
            include: {
              recipeDetails: {
                include: {
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedData = items.map((history: any) => ({
      id: history.id,
      complaint: history.complaint,
      detail_sympton: history.detail_sympton,
      patient_name: history.patient.name,
      patient_age: history.patient.age,
      gender: history.patient.gender,
      createdAt: history.createdAt,
      patient: {
        id: history.patient.id,
        medical_record_number: history.patient.medical_record_number,
        name: history.patient.name,
        email: history.patient.user?.email,
        phone: history.patient.user?.phone,
        address: history.patient.user?.address,
        birth_date: history.patient.user?.birth_date,
      },
      appointment: {
        id: history.appoinment.id,
        queue_number: history.appoinment.queue_number,
        status: history.appoinment.status,
        visit_id: history.id,
        visit_status: history.status,
        practice_date: history.appoinment.slotPractice?.practice?.practice_date,
        slot_name: history.appoinment.slotPractice?.name,
        doctor_assesment: history.doctorRecord
          ? {
            objective: history.doctorRecord.objective,
            assesment: history.doctorRecord.assessment,
            plan: history.doctorRecord.plan,
            notes: history.doctorRecord.doctorNotes,
          }
          : null,
        nurse_assesment: history.nursingRecord
          ? {
            sistolic: history.nursingRecord.sistolic,
            diastolic: history.nursingRecord.diastolic,
            heart_rate: history.nursingRecord.heart_rate,
            respiratory_rate: history.nursingRecord.respiratory_rate,
            temperature: history.nursingRecord.temperature,
            weight: history.nursingRecord.weight,
            height: history.nursingRecord.height,
            notes: history.nursingRecord.notes,
          }
          : null,
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
  // 7. Update Visit Status
  // ─────────────────────────────────────────────

  /**
   * Doctors may manually set Visit.status to DOCTOR_EXAMINED or CANCELLED.
   * Verifies the visit's appointment belongs to the logged-in doctor's practice.
   * The associated DoctorAppoinment.status is not modified.
   */
  async updateVisitStatus(
    userId: string,
    visitId: string,
    dto: UpdateDoctorVisitStatusDto,
  ) {
    // Enforce allowed values even when called without HTTP DTO validation.
    if (dto.status !== 'DOCTOR_EXAMINED' && dto.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Dokter hanya dapat mengubah status kunjungan menjadi DOCTOR_EXAMINED atau CANCELLED',
      );
    }

    const employeeId = await this.resolveEmployeeId(userId);

    const visit = await this.db.visit.findUnique({
      where: { id: visitId },
      select: {
        id: true,
        status: true,
        appoinment: {
          select: {
            slotPractice: {
              select: {
                practice: {
                  select: { doctor_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException('Kunjungan pasien tidak ditemukan');
    }

    if (visit.appoinment.slotPractice.practice.doctor_id !== employeeId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk mengubah kunjungan ini',
      );
    }

    // Compare and update atomically so concurrent status changes are not lost.
    // Recheck practice ownership as part of the update.
    const updatedVisits = await this.db.visit.updateMany({
      where: {
        id: visitId,
        status: visit.status,
        appoinment: {
          slotPractice: {
            practice: { doctor_id: employeeId },
          },
        },
      },
      data: { status: dto.status },
    });

    if (updatedVisits.count !== 1) {
      throw new ConflictException(
        'Data kunjungan berubah sebelum disimpan. Silakan muat ulang data dan coba kembali.',
      );
    }

    return {
      statusCode: 200,
      message: `Status kunjungan berhasil diubah menjadi ${dto.status}`,
      data: {
        visitId,
        previousStatus: visit.status,
        status: dto.status,
      },
    };
  }

  // ─────────────────────────────────────────────
  // 8. Create Doctor Examination (SOAP + Prescription)
  // ─────────────────────────────────────────────

  /**
   * Record a doctor examination in one atomic transaction:
   *  1. Upsert DoctorAssesment (SOAP + doctorNotes) keyed on visit_id.
   *  2. Upsert DoctorRecipe (visit_id, no_trx, doctor_id, patient_id,
   *     pharmacist_id=null, recipe_date_exec, take_med_date,
   *     status=PENDING, match_product_recipe=null, verify_notes=null).
   *  3. Replace RecipeDetail rows for that recipe with the submitted
   *     product_id[] + rules_using[] pairs.
   *  4. Advance Visit.status to DOCTOR_EXAMINED.
   *
   * The visit must belong to the logged-in doctor's practice.
   */
  async createDoctorExamination(
    userId: string,
    dto: CreateDoctorExaminationDto,
  ) {
    const employeeId = await this.resolveEmployeeId(userId);

    // Verify visit exists and belongs to this doctor
    const visit = await this.db.visit.findUnique({
      where: { id: dto.visitId },
      select: {
        id: true,
        status: true,
        patient_id: true,
        appoinment: {
          select: {
            slotPractice: {
              select: {
                practice: {
                  select: { doctor_id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException('Kunjungan pasien tidak ditemukan');
    }

    if (visit.appoinment.slotPractice.practice.doctor_id !== employeeId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk mencatat pemeriksaan pada kunjungan ini',
      );
    }

    if (visit.status === 'CANCELLED' || visit.status === 'COMPLETED') {
      throw new ConflictException(
        `Kunjungan dengan status ${visit.status} tidak dapat diperiksa`,
      );
    }

    // Validate all product_ids exist before starting the transaction
    const productIds = dto.details.map((d) => d.product_id);
    const products = await this.db.products.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    const foundIds = new Set(products.map((p: any) => p.id));
    const missing = productIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Produk tidak ditemukan: ${missing.join(', ')}`,
      );
    }

    const noTrx = dto.no_trx || this.generateNoTrx();
    const recipeDateExec = dto.recipe_date_exec
      ? new Date(dto.recipe_date_exec)
      : new Date();
    const takeMedDate = dto.take_med_date ? new Date(dto.take_med_date) : null;

    const result = await this.db.$transaction(async (tx: any) => {
      // 1. Upsert SOAP assessment
      const assessment = await tx.doctorAssesment.upsert({
        where: { visit_id: dto.visitId },
        create: {
          visit_id: dto.visitId,
          doctor_id: employeeId,
          subjective: dto.subjective ?? null,
          objective: dto.objective ?? null,
          assessment: dto.assessment ?? null,
          plan: dto.plan ?? null,
          doctorNotes: dto.doctorNotes ?? null,
        },
        update: {
          doctor_id: employeeId,
          subjective: dto.subjective ?? null,
          objective: dto.objective ?? null,
          assessment: dto.assessment ?? null,
          plan: dto.plan ?? null,
          doctorNotes: dto.doctorNotes ?? null,
        },
      });

      // 2. Upsert the prescription header
      const recipe = await tx.doctorRecipe.upsert({
        where: { visit_id: dto.visitId },
        create: {
          visit_id: dto.visitId,
          no_trx: noTrx,
          recipe_date_exec: recipeDateExec,
          patient_id: visit.patient_id,
          doctor_id: employeeId,
          pharmacist_id: null,
          status: 'PENDING',
          take_med_date: takeMedDate,
          match_product_recipe: null,
          verify_notes: null,
        },
        update: {
          no_trx: noTrx,
          recipe_date_exec: recipeDateExec,
          patient_id: visit.patient_id,
          doctor_id: employeeId,
        },
      });

      // 3. Replace recipe details
      await tx.recipeDetail.deleteMany({
        where: { recipe_id: recipe.id },
      });

      await tx.recipeDetail.createMany({
        data: dto.details.map((detail) => ({
          recipe_id: recipe.id,
          product_id: detail.product_id,
          rules_using: detail.rules_using,
        })),
      });

      // 4. Advance visit status atomically (compare-and-set)
      const updatedVisits = await tx.visit.updateMany({
        where: {
          id: dto.visitId,
          status: { in: ['REGISTERED', 'NURSE_CHECKED'] },
        },
        data: { status: 'DOCTOR_EXAMINED' },
      });

      if (updatedVisits.count !== 1) {
        throw new ConflictException(
          'Status kunjungan berubah sebelum disimpan. Silakan muat ulang data dan coba kembali.',
        );
      }

      const fullRecipe = await tx.doctorRecipe.findUnique({
        where: { id: recipe.id },
        include: {
          recipeDetails: {
            include: {
              product: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      });

      return { assessment, recipe: fullRecipe };
    });

    return {
      statusCode: 201,
      message: 'Pemeriksaan dokter dan resep berhasil disimpan',
      data: {
        visitId: dto.visitId,
        status: 'DOCTOR_EXAMINED',
        doctorAssesment: result.assessment,
        recipe: {
          id: result.recipe.id,
          no_trx: result.recipe.no_trx,
          recipe_date_exec: result.recipe.recipe_date_exec,
          take_med_date: result.recipe.take_med_date,
          status: result.recipe.status,
          match_product_recipe: result.recipe.match_product_recipe,
          verify_notes: result.recipe.verify_notes,
          details: result.recipe.recipeDetails.map((d: any) => ({
            product_id: d.product_id,
            product_name: d.product?.name ?? null,
            unit: d.product?.unit ?? null,
            rules_using: d.rules_using,
          })),
        },
      },
    };
  }
}
