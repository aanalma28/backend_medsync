# 🏥 MedSync Backend API

MedSync adalah sistem *backend* Manajemen Informasi Klinik / Rumah Sakit (SIMRS) berarsitektur *single-tenant*. Sistem ini dirancang untuk mendigitalisasi alur kerja medis, mulai dari pendaftaran pasien, penjadwalan janji temu dengan dokter, hingga pengelolaan resep obat oleh apoteker.

Dikembangkan dengan fokus pada keamanan data medis, sistem ini dilengkapi dengan pelacakan jejak audit (*audit trail*) untuk persetujuan privasi pasien dan standar autentikasi modern.

## 🚀 Teknologi Utama (Tech Stack)
* **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
* **ORM:** [Prisma v7](https://www.prisma.io/)
* **Database:** PostgreSQL (via [Supabase](https://supabase.com/))
* **Autentikasi:** JWT (Access Token & Refresh Token Strategy) + Passport.js
* **Keamanan Tambahan:** Role-Based Access Control (RBAC)

## ✨ Fitur Utama (MVP)
1. **Sistem Autentikasi & Otorisasi Aman**
   - *Login/Register* terenkripsi (Bcrypt).
   - *Refresh Token* tersimpan di *database* untuk keamanan *session*.
   - Pembatasan hak akses (RBAC) untuk 3 peran (Role): `Patient`, `Doctor`, dan `Pharmacist`.
   - Pencatatan waktu (*Audit Trail*) persetujuan Syarat & Ketentuan / Kebijakan Privasi (Kepatuhan UU PDP).
2. **Manajemen Medis & Janji Temu**
   - Penjadwalan pertemuan antara Pasien dan Dokter.
3. **Farmasi Digital (E-Prescription)**
   - Dokter dapat membuat resep digital (*Doctor Recipe*).
   - Apoteker dapat memverifikasi resep, mencocokkan stok obat, dan menambahkan catatan farmasi.
   - Manajemen inventaris data Obat (*Medicine*).

## 🛠️ Prasyarat (Prerequisites)
Pastikan sistem operasi Anda telah memasang:
* [Node.js](https://nodejs.org/) (v18 atau lebih baru)
* Akun [Supabase](https://supabase.com/) (untuk koneksi *database*)
* Git

## ⚙️ Variabel Lingkungan (Environment Variables)
Buat file `.env` di direktori utama projek (*root*), lalu salin dan sesuaikan nilai di bawah ini. Aplikasi ini menggunakan standar Prisma 7 yang memisahkan jalur koneksi *Pooling* dan *Direct*.

```env
# Koneksi Database (Supabase)
# Port 6543 digunakan untuk Pooling (Aplikasi)
DATABASE_URL="postgres://[USER]:[PASSWORD]@aws-0-[REGION][.pooler.supabase.com:6543/postgres?pgbouncer=true](https://.pooler.supabase.com:6543/postgres?pgbouncer=true)"

# Port 5432 digunakan khusus untuk Migrasi Skema (CLI)
DIRECT_URL="postgres://[USER]:[PASSWORD]@aws-0-[REGION][.pooler.supabase.com:5432/postgres](https://.pooler.supabase.com:5432/postgres)"

# JWT Secrets
JWT_ACCESS_SECRET="rahasia_access_token_medsync_super_aman"
JWT_REFRESH_SECRET="rahasia_refresh_token_medsync_super_aman"
```

## 📦 Instalasi & Menjalankan Aplikasi
1. **Kloing Repositori**
```bash
git clone https://github.com/aanalma28/backend_medsync.git
cd backend_medsync
```
2. **Install Dependencies**
```bash
npm install
```
3. **Buat Database**
```bash
npx prisma generate
npx prisma migrate dev --name init_db
```
4. **Jalankan Aplikasi**
```bash
# Mode pengembangan (Development mode)
npm run start:dev
```
Server akan berjalan di `http://localhost:3000` (atau port yang Anda tentukan).

## 🗄️ Gambaran Skema Database (Entity Relationship)
- `User`: Menyimpan data Pasien, Dokter, dan Apoteker beserta status Refresh Token dan jejak persetujuan privasi.

- `Medicine`: Katalog dan stok obat.

- `DoctorRecipe`: Rekam medis resep yang menghubungkan Pasien, Dokter (pembuat resep), dan Apoteker (pengeksekusi).

- `RecipeDetail`: Rincian obat dan aturan pakai pada setiap resep.

- `DoctorAppointment`: Jadwal temu Pasien dan Dokter.

(Untuk melihat antarmuka database secara visual, jalankan `npx prisma studio`)

## 📄 Lisensi
Projek ini didistribusikan di bawah lisensi MIT. Anda bebas untuk menggunakan, mengubah, dan mendistribusikan perangkat lunak ini. Lihat file [LICENSE](LICENSE) untuk informasi lebih lanjut.