import { Injectable } from '@nestjs/common'; // Hapus OnModuleInit di sini
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({ adapter });
  }
}
