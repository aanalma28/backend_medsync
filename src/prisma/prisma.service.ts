import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaService dengan manajemen lifecycle pool.
 *
 * Sebelumnya Pool dibuat di constructor dan tidak pernah ditutup, sehingga
 * koneksi bocor saat aplikasi menerima SIGTERM/SIGINT. app.enableShutdownHooks()
 * di main.ts akan memicu onModuleDestroy di bawah ini.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    // Gagal cepat bila env tidak diset. Tanpa ini, `new Pool({ connectionString:
    // undefined })` diam-diam jatuh ke default libpq (localhost:5432 dengan
    // username OS) dan error yang muncul sangat membingungkan.
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL tidak diset. Periksa file .env sebelum menjalankan aplikasi.',
      );
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
