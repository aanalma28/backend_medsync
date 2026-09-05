import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QueryDoctorScheduleDto } from './dto/query-doctor-schedule.dto.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { QueryAppointmentDto } from './dto/query-appointment.dto.js';
import { QueryPatientPrescriptionDto } from './dto/query-prescription.dto.js';

@Injectable()
export class PatientDashboardService {
  constructor(private readonly prisma: PrismaService) { }

  private get db() {
    return this.prisma as any;
  }

  /**
   * Resolve patient_id from logged in user_id.
   */
  private async resolvePatientId(userId: string): Promise<string> {
    const patient = await this.db.patient.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException(
        'Data pasien tidak ditemukan. Pastikan akun Anda terdaftar sebagai pasien.',
      );
    }

    return patient.id;
  }

  /**
   * Query doctor practice schedules filtered by specific date, date range, department, or doctor search.
   */
  async findDoctorSchedules(queryDto: QueryDoctorScheduleDto) {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      doctor: {
        user: { is_active: true },
        departmen: { is_active: true },
      },
    };

    // Date filtering logic
    if (queryDto.date) {
      const dateStr = queryDto.date.split('T')[0];
      where.practice_date = {
        gte: new Date(`${dateStr}T00:00:00.000Z`),
        lte: new Date(`${dateStr}T23:59:59.999Z`),
      };
    } else if (queryDto.date_from || queryDto.date_to) {
      where.practice_date = {};
      if (queryDto.date_from) {
        const fromStr = queryDto.date_from.split('T')[0];
        where.practice_date.gte = new Date(`${fromStr}T00:00:00.000Z`);
      }
      if (queryDto.date_to) {
        const toStr = queryDto.date_to.split('T')[0];
        where.practice_date.lte = new Date(`${toStr}T23:59:59.999Z`);
      }
    }

    // Department filtering logic
    if (queryDto.departmen_id) {
      where.doctor.departmen_id = queryDto.departmen_id;
    }

    // Search query logic (doctor name or department name)
    if (queryDto.search && queryDto.search.trim() !== '') {
      const search = queryDto.search.trim();
      where.OR = [
        {
          doctor: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          doctor: {
            departmen: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.doctorPractice.count({ where }),
      this.db.doctorPractice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { practice_date: 'asc' },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
              departmen: {
                select: {
                  id: true,
                  name: true,
                  departmen_code: true,
                  address: true,
                  city: true,
                },
              },
            },
          },
          slotsPractice: {
            where: { is_active: true },
            orderBy: { start_hour: 'asc' },
            include: {
              appoinments: {
                where: { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
                select: { id: true },
              },
            },
          },
        },
      }),
    ]);

    // Format response data & auto-close full slots
    const formattedData = items.map((practice: any) => ({
      id: practice.id,
      practice_date: practice.practice_date,
      doctor: {
        id: practice.doctor.id,
        name: practice.doctor.user?.name,
        email: practice.doctor.user?.email,
        phone: practice.doctor.user?.phone,
        staff_code: practice.doctor.staff_code,
        department: practice.doctor.departmen,
      },
      slots: practice.slotsPractice.map((slot: any) => {
        const bookedCount = slot.appoinments?.length || 0;
        let effectiveStatus = slot.status_slot;

        if (bookedCount >= slot.max_patient && slot.status_slot === 'OPEN') {
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
          current_patient_count: bookedCount,
          remaining_quota: Math.max(0, slot.max_patient - bookedCount),
        };
      }),
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil data jadwal praktek dokter',
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Assign/book a specific doctor practice slot to create an appointment.
   */
  async createAppointment(userId: string, createDto: CreateAppointmentDto) {
    const patientId = await this.resolvePatientId(userId);

    return this.db.$transaction(async (tx: any) => {
      const slot = await tx.slotPractice.findUnique({
        where: { id: createDto.slot_practice_id },
        include: {
          practice: {
            include: {
              doctor: {
                include: {
                  user: { select: { id: true, name: true, email: true, phone: true } },
                  departmen: { select: { id: true, name: true, departmen_code: true, city: true } },
                },
              },
            },
          },
          appoinments: {
            where: { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
          },
        },
      });

      if (!slot) {
        throw new NotFoundException('Slot jadwal praktik dokter tidak ditemukan');
      }

      if (!slot.is_active) {
        throw new BadRequestException('Slot jadwal praktik ini sedang tidak aktif');
      }

      if (slot.status_slot === 'CLOSED') {
        throw new BadRequestException('Slot jadwal praktik ini sudah ditutup atau penuh');
      }

      const activeAppointmentsCount = slot.appoinments.length;

      if (activeAppointmentsCount >= slot.max_patient) {
        await tx.slotPractice.update({
          where: { id: slot.id },
          data: { status_slot: 'CLOSED' },
        });
        throw new BadRequestException('Slot jadwal praktik dokter ini sudah penuh (kuota habis)');
      }

      const alreadyBooked = slot.appoinments.some(
        (apt: any) => apt.patient_id === patientId,
      );

      if (alreadyBooked) {
        throw new ConflictException('Anda sudah mendaftar janji temu pada slot jadwal praktik ini');
      }

      const queueNumber = activeAppointmentsCount + 1;

      const appointment = await tx.doctorAppoinment.create({
        data: {
          slot_practice_id: slot.id,
          patient_id: patientId,
          status: 'PENDING',
          queue_number: queueNumber,
        },
        include: {
          patient: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      });

      // Tambahkan pembuatan riwayat medis saat appointment dibuat beserta keluhan (complaint)
      await tx.medicalHistory.create({
        data: {
          patient_id: patientId,
          doctor_id: slot.practice.doctor.id,
          appoinment_id: appointment.id,
          patient_name: createDto.patient_name,
          patient_age: createDto.patient_age,
          gender: createDto.gender,
          detail_sympton: createDto.detail_sympton,
          complaint: createDto.complaint || '',
          diagnosis: '',
          notes: '',
        },
      });

      if (activeAppointmentsCount + 1 >= slot.max_patient) {
        await tx.slotPractice.update({
          where: { id: slot.id },
          data: { status_slot: 'CLOSED' },
        });
      }

      return {
        statusCode: 201,
        message: 'Janji temu berhasil dibuat',
        data: {
          id: appointment.id,
          queue_number: appointment.queue_number,
          status: appointment.status,
          createdAt: appointment.createdAt,
          patient: {
            id: appointment.patient.id,
            medical_record_number: appointment.patient.medical_record_number,
            name: appointment.patient.user?.name,
          },
          schedule: {
            practice_date: slot.practice.practice_date,
            slot_name: slot.name,
            start_hour: slot.start_hour,
            end_hour: slot.end_hour,
            doctor: {
              id: slot.practice.doctor.id,
              name: slot.practice.doctor.user?.name,
              staff_code: slot.practice.doctor.staff_code,
              department: slot.practice.doctor.departmen,
            },
          },
        },
      };
    });
  }

  /**
   * Fetch patient's appointments list.
   */
  async findPatientAppointments(userId: string, queryDto: QueryAppointmentDto) {
    const patientId = await this.resolvePatientId(userId);

    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = { patient_id: patientId };

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    const [total, items] = await Promise.all([
      this.db.doctorAppoinment.count({ where }),
      this.db.doctorAppoinment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          slotPractice: {
            include: {
              practice: {
                include: {
                  doctor: {
                    include: {
                      user: { select: { id: true, name: true, email: true, phone: true } },
                      departmen: { select: { id: true, name: true, departmen_code: true, city: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedData = items.map((apt: any) => ({
      id: apt.id,
      queue_number: apt.queue_number,
      status: apt.status,
      createdAt: apt.createdAt,
      updatedAt: apt.updatedAt,
      slot: {
        id: apt.slotPractice?.id,
        name: apt.slotPractice?.name,
        start_hour: apt.slotPractice?.start_hour,
        end_hour: apt.slotPractice?.end_hour,
      },
      practice_date: apt.slotPractice?.practice?.practice_date,
      doctor: {
        id: apt.slotPractice?.practice?.doctor?.id,
        name: apt.slotPractice?.practice?.doctor?.user?.name,
        staff_code: apt.slotPractice?.practice?.doctor?.staff_code,
        department: apt.slotPractice?.practice?.doctor?.departmen,
      },
    }));

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar janji temu pasien',
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Cancel an appointment by patient.
   */
  async cancelAppointment(userId: string, appointmentId: string) {
    const patientId = await this.resolvePatientId(userId);

    const appointment = await this.db.doctorAppoinment.findUnique({
      where: { id: appointmentId },
      include: {
        slotPractice: {
          include: {
            appoinments: {
              where: { status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] } },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Janji temu tidak ditemukan');
    }

    if (appointment.patient_id !== patientId) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk membatalkan janji temu ini');
    }

    if (appointment.status === 'CANCELLED') {
      throw new BadRequestException('Janji temu sudah dibatalkan sebelumnya');
    }

    if (appointment.status === 'COMPLETED') {
      throw new BadRequestException('Janji temu yang sudah selesai tidak dapat dibatalkan');
    }

    return this.db.$transaction(async (tx: any) => {
      const updated = await tx.doctorAppoinment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
      });

      const slot = appointment.slotPractice;
      const currentActiveCount = (slot.appoinments?.length || 1) - 1;

      if (slot.status_slot === 'CLOSED' && slot.is_active && currentActiveCount < slot.max_patient) {
        await tx.slotPractice.update({
          where: { id: slot.id },
          data: { status_slot: 'OPEN' },
        });
      }

      return {
        statusCode: 200,
        message: 'Janji temu berhasil dibatalkan',
        data: updated,
      };
    });
  }

  /**
   * GET /patient/dashboard/prescriptions
   * Fetch doctor prescriptions for the logged-in patient with status & type filtering.
   */
  async findPatientPrescriptions(userId: string, queryDto: QueryPatientPrescriptionDto) {
    const patientId = await this.resolvePatientId(userId);

    const where: any = {
      patient_id: patientId,
    };

    if (queryDto.status) {
      where.status = queryDto.status;
    } else if (queryDto.type === 'active') {
      where.status = { in: ['PENDING', 'CONFIRMED'] };
    } else if (queryDto.type === 'history') {
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    }

    const recipes = await this.db.doctorRecipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            departmen: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pharmacist: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        recipeDetails: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const data = recipes.map((recipe: any) => {
      const isReady = recipe.status === 'COMPLETED' || recipe.status === 'CONFIRMED';

      const medicines = recipe.recipeDetails.map((detail: any) => ({
        id: detail.id,
        product_id: detail.product?.id || detail.product_id,
        name: detail.product?.name || 'Obat',
        unit: detail.product?.unit || '',
        category: detail.product?.category || '',
        rules_using: detail.rules_using,
      }));

      return {
        id: recipe.id,
        no_trx: recipe.no_trx,
        recipe_date_exec: recipe.recipe_date_exec,
        status: recipe.status,
        is_ready: isReady,
        take_med_date: recipe.take_med_date,
        verify_notes: recipe.verify_notes || null,
        doctor: {
          id: recipe.doctor?.id,
          name: recipe.doctor?.user?.name || 'Dokter',
          department_name: recipe.doctor?.departmen?.name || 'Poli Umum',
        },
        pharmacist: recipe.pharmacist
          ? {
            id: recipe.pharmacist.id,
            name: recipe.pharmacist.user?.name || 'Apoteker',
          }
          : null,
        medicines,
      };
    });

    return {
      statusCode: 200,
      message: 'Berhasil mengambil daftar resep obat pasien',
      data,
    };
  }

  /**
   * GET /patient/dashboard/prescriptions/:id
   * Fetch detail for a specific prescription owned by the logged-in patient.
   */
  async findPatientPrescriptionById(userId: string, recipeId: string) {
    const patientId = await this.resolvePatientId(userId);

    const recipe = await this.db.doctorRecipe.findUnique({
      where: { id: recipeId },
      include: {
        medicalHistory: true,
        doctor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
            departmen: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        pharmacist: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        recipeDetails: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                unit: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Resep obat tidak ditemukan');
    }

    if (recipe.patient_id !== patientId) {
      throw new ForbiddenException('Anda tidak memiliki akses ke data resep obat ini');
    }

    const isReady = recipe.status === 'COMPLETED' || recipe.status === 'CONFIRMED';
    const notes =
      recipe.medicalHistory?.notes ||
      recipe.medicalHistory?.complaint ||
      recipe.verify_notes ||
      null;

    const medicines = recipe.recipeDetails.map((detail: any) => ({
      id: detail.id,
      product_id: detail.product?.id || detail.product_id,
      name: detail.product?.name || 'Obat',
      code: detail.product?.code || '',
      unit: detail.product?.unit || '',
      category: detail.product?.category || '',
      rules_using: detail.rules_using,
    }));

    return {
      statusCode: 200,
      message: 'Detail resep berhasil ditemukan',
      data: {
        id: recipe.id,
        no_trx: recipe.no_trx,
        recipe_date_exec: recipe.recipe_date_exec,
        status: recipe.status,
        is_ready: isReady,
        take_med_date: recipe.take_med_date,
        verify_notes: recipe.verify_notes || null,
        notes,
        doctor: {
          id: recipe.doctor?.id,
          name: recipe.doctor?.user?.name || 'Dokter',
          department_name: recipe.doctor?.departmen?.name || 'Poli Umum',
        },
        pharmacist: recipe.pharmacist
          ? {
            id: recipe.pharmacist.id,
            name: recipe.pharmacist.user?.name || 'Apoteker',
          }
          : null,
        medicines,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      },
    };
  }
}

