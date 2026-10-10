import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting full database seeding (All Tables with New Schema Updates)...');

  // ==========================================
  // 1. CLEANUP (Urutan terbalik dari relasi)
  //    Warehouses dihapus SEBELUM Departmen karena FK
  //    Warehouse.departmen_id memakai onDelete: Restrict.
  // ==========================================
  try {
    console.log('🧹 Cleaning existing data...');
    await prisma.billingItem.deleteMany();
    await prisma.billing.deleteMany();
    await prisma.recipeDetail.deleteMany();
    await prisma.doctorRecipe.deleteMany();
    await prisma.doctorAssesment.deleteMany();
    await prisma.nursingAssesment.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.doctorAppoinment.deleteMany();
    await prisma.slotPractice.deleteMany();
    await prisma.doctorPractice.deleteMany();
    await prisma.patientAllergy.deleteMany();
    await prisma.inventoryLogs.deleteMany();
    await prisma.stockBatch.deleteMany();
    await prisma.warehouseStock.deleteMany();
    await prisma.warehouses.deleteMany();
    await prisma.products.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.departmen.deleteMany();
    await prisma.hospital.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 Cleanup complete.');
  } catch (cleanupErr: any) {
    console.warn('⚠️ Cleanup warning (continuing):', cleanupErr.message || cleanupErr);
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('Medsync1Super2Admin3', saltRounds);

  // ==========================================
  // 2. SEED USERS (Tabel: User)
  //    Satu akun untuk SETIAP nilai enum Role.
  // ==========================================
  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@medsync.com',
      name: 'H. Bambang Sutrisno',
      password: await bcrypt.hash('OwnerPass123', saltRounds),
      role: 'OWNER',
      accepted_terms: true,
      address: 'Jl. Sunan Muria No. 1, Kudus',
      phone: '081200000001',
      birth_date: new Date('1975-02-11'),
      is_active: true,
    },
  });

  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@medsync.com',
      name: 'SuperAdmin Medsync',
      password: hashedPassword,
      role: 'SUPERADMIN',
      accepted_terms: true,
      address: 'Gedung Utama Lt. 1',
      phone: '081234567890',
      birth_date: new Date('1990-01-01'),
      is_active: true,
    },
  });

  const masterAdminUser = await prisma.user.create({
    data: {
      email: 'masteradmin@medsync.com',
      name: 'Dwi Prasetyo',
      password: await bcrypt.hash('MasterAdminPass123', saltRounds),
      role: 'MASTERADMIN',
      accepted_terms: true,
      address: 'Gedung Utama Lt. 1',
      phone: '081200000002',
      birth_date: new Date('1988-03-22'),
      is_active: true,
    },
  });

  const registerAdminUser = await prisma.user.create({
    data: {
      email: 'pendaftaran@medsync.com',
      name: 'Rina Kartika',
      password: await bcrypt.hash('RegisterPass123', saltRounds),
      role: 'REGISTER_ADMIN',
      accepted_terms: true,
      address: 'Loket Pendaftaran RS MedSync',
      phone: '081200000003',
      birth_date: new Date('1996-09-05'),
      is_active: true,
    },
  });

  const logisticUser = await prisma.user.create({
    data: {
      email: 'logistik@medsync.com',
      name: 'Agus Setiawan',
      password: await bcrypt.hash('LogisticPass123', saltRounds),
      role: 'LOGISTIC',
      accepted_terms: true,
      address: 'Instalasi Logistik & Gudang RS MedSync',
      phone: '081200000004',
      birth_date: new Date('1991-12-01'),
      is_active: true,
    },
  });

  const doctorUser = await prisma.user.create({
    data: {
      email: 'dokter@medsync.com',
      name: 'dr. Andi Wijaya',
      password: await bcrypt.hash('DoctorPass123', saltRounds),
      role: 'GENERAL_DOCTOR',
      accepted_terms: true,
      address: 'Poli Umum RS MedSync',
      phone: '081299887766',
      birth_date: new Date('1985-05-15'),
      is_active: true,
    },
  });

  const specialistDoctorUser = await prisma.user.create({
    data: {
      email: 'dokter.spesialis@medsync.com',
      name: 'dr. Maya Sari, Sp.OG',
      password: await bcrypt.hash('SpecialistPass123', saltRounds),
      role: 'SPECIALIST_DOCTOR',
      accepted_terms: true,
      address: 'Poli Spesialis RS MedSync',
      phone: '081299887700',
      birth_date: new Date('1983-06-30'),
      is_active: true,
    },
  });

  const pharmacistUser = await prisma.user.create({
    data: {
      email: 'apoteker@medsync.com',
      name: 'Apt. Rizky Hendra, S.Farm',
      password: await bcrypt.hash('PharmacistPass123', saltRounds),
      role: 'PHARMACIST',
      accepted_terms: true,
      address: 'Instalasi Farmasi RS MedSync',
      phone: '081388776655',
      birth_date: new Date('1992-08-20'),
      is_active: true,
    },
  });

  const nurseUser = await prisma.user.create({
    data: {
      email: 'perawat@medsync.com',
      name: 'Siti Nurhayati',
      password: await bcrypt.hash('NursePass123', saltRounds),
      role: 'NURSE',
      accepted_terms: true,
      address: 'Instalasi Rawat Jalan RS MedSync',
      phone: '081299001122',
      birth_date: new Date('1994-07-10'),
      is_active: true,
    },
  });

  const patientUser = await prisma.user.create({
    data: {
      email: 'ayu.putri@email.com',
      name: 'Ayu Putri Lestari',
      password: await bcrypt.hash('PatientPass123', saltRounds),
      role: 'PATIENT',
      accepted_terms: true,
      address: 'Jl. Pemuda No. 12, Kudus',
      phone: '081234567891',
      birth_date: new Date('1998-04-12'),
      is_active: true,
    },
  });

  const seededAccounts = [
    { role: 'OWNER', email: ownerUser.email, password: 'OwnerPass123' },
    { role: 'SUPERADMIN', email: superAdminUser.email, password: 'Medsync1Super2Admin3' },
    { role: 'MASTERADMIN', email: masterAdminUser.email, password: 'MasterAdminPass123' },
    { role: 'REGISTER_ADMIN', email: registerAdminUser.email, password: 'RegisterPass123' },
    { role: 'LOGISTIC', email: logisticUser.email, password: 'LogisticPass123' },
    { role: 'GENERAL_DOCTOR', email: doctorUser.email, password: 'DoctorPass123' },
    { role: 'SPECIALIST_DOCTOR', email: specialistDoctorUser.email, password: 'SpecialistPass123' },
    { role: 'PHARMACIST', email: pharmacistUser.email, password: 'PharmacistPass123' },
    { role: 'NURSE', email: nurseUser.email, password: 'NursePass123' },
    { role: 'PATIENT', email: patientUser.email, password: 'PatientPass123' },
  ];
  console.log('✅ 1. Tabel User seeded (10 akun, 10 role).');

  // ==========================================
  // 3. SEED HOSPITAL (Tabel: Hospital)
  //    user_id = OWNER (relasi "HospitalOwner")
  // ==========================================
  const hospital = await prisma.hospital.create({
    data: {
      hospital_code: 'HOSP-001',
      name: 'RS MedSync Central Kudus',
      address: 'Jl. R. Ageng Tirtayasa No. 88, Kudus',
      user_id: ownerUser.id,
      is_active: true,
    },
  });
  console.log('✅ 2. Tabel Hospital seeded.');

  // ==========================================
  // 4. SEED DEPARTMENTS (Tabel: Departmen)
  // ==========================================
  const adminDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Admin & Manajemen',
      departmen_code: 'ADM',
      category: 'ADMIN',
      address: 'Gedung Utama Lt. 1',
      city: 'Kudus',
      is_active: true,
    },
  });

  const poliUmumDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Poliklinik Umum',
      departmen_code: 'POL-UMU',
      category: 'GENERALIST',
      address: 'Gedung Poliklinik Lt. 1',
      city: 'Kudus',
      is_active: true,
    },
  });

  const poliSpesialisDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Poliklinik Spesialis',
      departmen_code: 'POL-SPE',
      category: 'SPECIALIST',
      address: 'Gedung Poliklinik Lt. 2',
      city: 'Kudus',
      is_active: true,
    },
  });

  const pharmacyDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Instalasi Farmasi',
      departmen_code: 'FAR',
      category: 'PHARMACY',
      address: 'Gedung Farmasi Lt. 1',
      city: 'Kudus',
      is_active: true,
    },
  });

  const nursingDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Instalasi Keperawatan',
      departmen_code: 'NRS',
      category: 'NURSING',
      address: 'Gedung Rawat Jalan Lt. 1',
      city: 'Kudus',
      is_active: true,
    },
  });

  const logisticDept = await prisma.departmen.create({
    data: {
      hospital_id: hospital.id,
      name: 'Instalasi Logistik & Gudang',
      departmen_code: 'LOG',
      category: 'LOGISTIC',
      address: 'Gedung Gudang Lt. 1',
      city: 'Kudus',
      is_active: true,
    },
  });
  console.log('✅ 3. Tabel Departmen seeded.');

  // ==========================================
  // 5. SEED EMPLOYEES (Tabel: Employee)
  //    Employee.departmen_id WAJIB -> setiap staf butuh departemen.
  //    OWNER & PATIENT tidak dibuatkan Employee.
  // ==========================================
  const doctorEmployee = await prisma.employee.create({
    data: {
      user_id: doctorUser.id,
      staff_code: 'POL-UMU-DOC01',
      gender: 'LAKILAKI',
      departmen_id: poliUmumDept.id,
    },
  });

  const pharmacistEmployee = await prisma.employee.create({
    data: {
      user_id: pharmacistUser.id,
      staff_code: 'FAR-PHR01',
      gender: 'PEREMPUAN',
      departmen_id: pharmacyDept.id,
    },
  });

  const nurseEmployee = await prisma.employee.create({
    data: {
      user_id: nurseUser.id,
      staff_code: 'NRS-NRS01',
      gender: 'PEREMPUAN',
      departmen_id: nursingDept.id,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: masterAdminUser.id,
      staff_code: 'ADM-MST01',
      gender: 'LAKILAKI',
      departmen_id: adminDept.id,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: registerAdminUser.id,
      staff_code: 'ADM-REG01',
      gender: 'PEREMPUAN',
      departmen_id: adminDept.id,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: logisticUser.id,
      staff_code: 'LOG-LOG01',
      gender: 'LAKILAKI',
      departmen_id: logisticDept.id,
    },
  });

  await prisma.employee.create({
    data: {
      user_id: specialistDoctorUser.id,
      staff_code: 'POL-SPE-DOC01',
      gender: 'PEREMPUAN',
      departmen_id: poliSpesialisDept.id,
    },
  });
  console.log('✅ 4. Tabel Employee seeded.');

  // ==========================================
  // 6. SEED PATIENTS (Tabel: Patient)
  // ==========================================
  const patient = await prisma.patient.create({
    data: {
      user_id: patientUser.id,
      medical_record_number: 'RM-2026-001',
      name: patientUser.name!,
      gender: 'PEREMPUAN',
      age: 28,
      is_active: true,
    },
  });
  console.log('✅ 5. Tabel Patient seeded.');

  // ==========================================
  // 7. SEED PRODUCTS (Tabel: Products)
  //    Field `is_active` kini di-seed secara eksplisit (default true),
  //    selaras dengan penambahan `is_active` pada model Products di
  //    prisma/schema.prisma. Nilai ini juga menjadi dasar fitur soft delete.
  // ==========================================
  const paracetamol = await prisma.products.create({
    data: {
      hospital_id: hospital.id,
      code: 'DRG-PCT-500',
      name: 'Paracetamol 500mg Tablet',
      category: 'DRUG',
      unit: 'Strip',
      buy_price: 2500,
      sell_price: 4000,
      is_active: true,
    },
  });

  const amlodipin = await prisma.products.create({
    data: {
      hospital_id: hospital.id,
      code: 'DRG-AML-5',
      name: 'Amlodipin 5mg Tablet',
      category: 'DRUG',
      unit: 'Strip',
      buy_price: 4000,
      sell_price: 6500,
      is_active: true,
    },
  });
  console.log('✅ 6. Tabel Products seeded.');

  // ==========================================
  // 8. SEED WAREHOUSES (Tabel: Warehouses - FLAT)
  //    Model WarehouseComponent sudah dihapus dan digabung ke sini.
  //    Gudang utama MAUPUN depo (farmasi, apotek, dsb) kini
  //    dibuat sebagai baris pada tabel Warehouses yang sama,
  //    dibedakan oleh kolom `type`.
  //    Setiap lokasi kini juga terikat ke departmen pemiliknya
  //    lewat `departmen_id` (FK -> Departmen).
  // ==========================================
  const centralWarehouse = await prisma.warehouses.create({
    data: {
      hospital_id: hospital.id,
      departmen_id: logisticDept.id,
      name: 'Gudang Utama Logistik Medis',
      type: 'MAIN',
      description: 'Pusat penyimpanan utama barang farmasi dan alkes',
    },
  });

  const prescriptionDepot = await prisma.warehouses.create({
    data: {
      hospital_id: hospital.id,
      departmen_id: pharmacyDept.id,
      name: 'Depo Farmasi Resep (Rawat Jalan)',
      type: 'PHARMACY',
      description: 'Depo farmasi untuk pelayanan resep rawat jalan',
    },
  });

  await prisma.warehouses.create({
    data: {
      hospital_id: hospital.id,
      departmen_id: pharmacyDept.id,
      name: 'Apotek Umum / Retail RS',
      type: 'PHARMACY',
      description: 'Apotek retail rumah sakit',
    },
  });
  console.log('✅ 7. Tabel Warehouses seeded (Gudang Utama + Depo Farmasi + Apotek Retail).');

  // ==========================================
  // 9. SEED WAREHOUSE STOCK (Tabel: WarehouseStock)
  //     PENTING: warehouse_id WAJIB diisi (String, bukan optional).
  //     Menghilangkannya membuat Prisma jatuh ke input "checked" dan
  //     memunculkan error menyesatkan: "Argument `product` is missing".
  //     warehouse_id kini langsung menunjuk ke tabel Warehouses.
  // ==========================================
  await prisma.warehouseStock.create({
    data: {
      product_id: paracetamol.id,
      warehouse_id: centralWarehouse.id,
      stock: 500,
      min_stock: 50,
    },
  });

  await prisma.warehouseStock.create({
    data: {
      product_id: amlodipin.id,
      warehouse_id: prescriptionDepot.id,
      stock: 150,
      min_stock: 15,
    },
  });
  console.log('✅ 8. Tabel WarehouseStock seeded.');

  // ==========================================
  // 10. SEED STOCK BATCH (Tabel: StockBatch - FEFO)
  //     warehouse_id juga WAJIB diisi di sini dan
  //     menunjuk langsung ke tabel Warehouses.
  // ==========================================
  await prisma.stockBatch.create({
    data: {
      hospital_id: hospital.id,
      product_id: paracetamol.id,
      warehouse_id: centralWarehouse.id,
      batch_number: 'BATCH-PCM-2026X',
      exp_date: new Date('2028-11-30'),
      initial_stock: 500,
      current_stock: 500,
    },
  });

  await prisma.stockBatch.create({
    data: {
      hospital_id: hospital.id,
      product_id: amlodipin.id,
      warehouse_id: prescriptionDepot.id,
      batch_number: 'BATCH-AML-2026Y',
      exp_date: new Date('2027-08-15'),
      initial_stock: 150,
      current_stock: 150,
    },
  });
  console.log('✅ 9. Tabel StockBatch seeded.');

  // ==========================================
  // 11. SEED INVENTORY LOGS (Tabel: InventoryLogs)
  //     PENTING: InventoryLogs.user_id mengarah ke tabel User
  //     (relasi "UserWriter"), BUKAN ke tabel Employee. Mengirim
  //     Employee.id ke sini memicu error:
  //     "Foreign key constraint violated: InventoryLogs_user_id_fkey".
  //     Kolom employee_id baru dipakai pada model VisitUsage.
  // ==========================================
  await prisma.inventoryLogs.create({
    data: {
      hospital_id: hospital.id,
      product_id: paracetamol.id,
      warehouse_id: centralWarehouse.id,
      user_id: logisticUser.id,
      type: 'PURCHASE',
      quantity: 500,
      source_destination: 'PT Kimia Farma Utama',
      reference_number: 'PO-2026-001',
      notes: 'Pembelian awal stok gudang utama',
    },
  });
  console.log('✅ 10. Tabel InventoryLogs seeded.');

  // ==========================================
  // 12. SEED PATIENT ALLERGY (Tabel: PatientAllergy)
  // ==========================================
  await prisma.patientAllergy.create({
    data: {
      hospital_id: hospital.id,
      patient_id: patient.id,
      employee_id: doctorEmployee.id,
      allergen: 'Penisilin',
      severity: 'SEVERE',
      reaction: 'Anafilaksis / Sesak napas & biduran',
    },
  });
  console.log('✅ 11. Tabel PatientAllergy seeded.');

  // ==========================================
  // 13. SEED DOCTOR PRACTICE (Tabel: DoctorPractice)
  // ==========================================
  const doctorPractice = await prisma.doctorPractice.create({
    data: {
      doctor_id: doctorEmployee.id,
      practice_date: new Date(),
    },
  });
  console.log('✅ 12. Tabel DoctorPractice seeded.');

  // ==========================================
  // 14. SEED SLOT PRACTICE (Tabel: SlotPractice)
  // ==========================================
  const slotPractice = await prisma.slotPractice.create({
    data: {
      practice_id: doctorPractice.id,
      name: 'Sesi Pagi (08.00 - 12.00)',
      start_hour: '08:00',
      end_hour: '12:00',
      status_slot: 'OPEN',
      max_patient: 20,
    },
  });
  console.log('✅ 13. Tabel SlotPractice seeded.');

  // ==========================================
  // 15. SEED DOCTOR APPOINTMENT (Tabel: DoctorAppoinment)
  // ==========================================
  const appointment = await prisma.doctorAppoinment.create({
    data: {
      slot_practice_id: slotPractice.id,
      patient_id: patient.id,
      status: 'COMPLETED',
      queue_number: 1,
    },
  });
  console.log('✅ 14. Tabel DoctorAppoinment seeded.');

  // ==========================================
  // 16. SEED VISIT (Tabel: Visit with service_unit)
  // ==========================================
  const visit = await prisma.visit.create({
    data: {
      patient_id: patient.id,
      appoinment_id: appointment.id,
      service_unit: 'POLI', // Field baru penanda unit awal kunjungan
      status: 'COMPLETED',
      payerType: 'Umum',
      complaint: 'Demam tinggi dan sakit tenggorokan',
      detail_sympton: 'Nyeri saat menelan ludah dan makanan',
    },
  });
  console.log('✅ 15. Tabel Visit seeded.');

  // ==========================================
  // 17. SEED NURSING ASSESSMENT (Tabel: NursingAssesment)
  // ==========================================
  await prisma.nursingAssesment.create({
    data: {
      visit_id: visit.id,
      nurse_id: nurseEmployee.id,
      service_unit: 'POLI', // Field baru
      sistolic: 120,
      diastolic: 80,
      heart_rate: 78,
      respiratory_rate: 20,
      temperature: 38.2,
      weight: 65.5,
      height: 165.0,
      notes: 'Triage awal: Pasien sadar, demam hangat.',
    },
  });
  console.log('✅ 16. Tabel NursingAssesment seeded.');

  // ==========================================
  // 18. SEED DOCTOR ASSESSMENT (Tabel: DoctorAssesment)
  // ==========================================
  await prisma.doctorAssesment.create({
    data: {
      visit_id: visit.id,
      doctor_id: doctorEmployee.id,
      service_unit: 'POLI', // Field baru
      subjective: 'Demam sejak 2 hari lalu disertai nyeri telan.',
      objective: 'Faring hiperemis, tonsil T1-T1 tenang.',
      assessment: 'Faringitis Akut (J02.9)',
      plan: 'Pemberian antibiotik dan antipiretik.',
      doctorNotes: 'Anjurkan banyak minum air putih dan istirahat total.',
    },
  });
  console.log('✅ 17. Tabel DoctorAssesment seeded.');

  // ==========================================
  // 19. SEED DOCTOR RECIPE (Tabel: DoctorRecipe)
  // ==========================================
  const doctorRecipe = await prisma.doctorRecipe.create({
    data: {
      visit_id: visit.id,
      no_trx: `TRX-RCP-${Date.now().toString().slice(-6)}`,
      recipe_date_exec: new Date(),
      patient_id: patient.id,
      doctor_id: doctorEmployee.id,
      pharmacist_id: pharmacistEmployee.id,
      status: 'COMPLETED',
      take_med_date: new Date(),
      match_product_recipe: true,
      verify_notes: 'Resep terverifikasi aman, tidak ada konflik alergi.',
    },
  });
  console.log('✅ 18. Tabel DoctorRecipe seeded.');

  // ==========================================
  // 20. SEED RECIPE DETAIL (Tabel: RecipeDetail)
  // ==========================================
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + 5);

  const RECIPE_QTY = 15;

  await prisma.recipeDetail.create({
    data: {
      recipe_id: doctorRecipe.id,
      product_id: amlodipin.id,
      qty: RECIPE_QTY,
      dosage: '3x1 Tablet sesudah makan',
      duration_days: 5,
      start_date: today,
      end_date: futureDate,
    },
  });
  console.log('✅ 19. Tabel RecipeDetail seeded.');

  // ==========================================
  // 21. SEED BILLING & BILLING ITEMS (Tabel Baru)
  //     qty obat disamakan dengan resep (15) supaya item_name,
  //     subtotal, dan total_amount konsisten.
  // ==========================================
  const DOCTOR_FEE = 80000;
  const DRUG_SUBTOTAL = amlodipin.sell_price * RECIPE_QTY; // 6.500 * 15 = 97.500

  const billing = await prisma.billing.create({
    data: {
      hospital_id: hospital.id,
      visit_id: visit.id,
      patient_id: patient.id,
      total_amount: DOCTOR_FEE + DRUG_SUBTOTAL, // 177.500
      status: 'PAID',
      payment_method: 'CASH',
    },
  });

  // Item 1: Jasa Konsultasi Dokter (Terikat ke employee_id dokter untuk payout/insentif)
  await prisma.billingItem.create({
    data: {
      billing_id: billing.id,
      employee_id: doctorEmployee.id, // Kunci untuk perhitungan insentif owner di akhir bulan
      item_name: 'Jasa Konsultasi Poli Umum - dr. Andi Wijaya',
      category: 'DOCTOR_SERVICE',
      price: DOCTOR_FEE,
      qty: 1,
      subtotal: DOCTOR_FEE,
    },
  });

  // Item 2: Penjualan Obat / Produk Farmasi (Terikat ke product_id)
  await prisma.billingItem.create({
    data: {
      billing_id: billing.id,
      product_id: amlodipin.id,
      item_name: `Amlodipin 5mg Tablet (${RECIPE_QTY} Strip)`,
      category: 'DRUG',
      price: amlodipin.sell_price,
      qty: RECIPE_QTY,
      subtotal: DRUG_SUBTOTAL,
    },
  });
  console.log('✅ 20. Tabel Billing & BillingItem seeded.');

  console.log('🎉 Seeding ALL TABLES (with new fields & billing) selesai dengan sukses!');
  console.log('🔑 Akun seed (email / password):');
  for (const account of seededAccounts) {
    console.log(`   ${account.role.padEnd(18)}: ${account.email} / ${account.password}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeder gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
