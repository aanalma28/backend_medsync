import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { SanitizePipe } from './common/pipes/sanitize.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ===== SECURITY: HTTP Headers (XSS, Clickjacking, MIME sniffing, etc.) =====
  app.use(helmet());

  // ===== Cookie Parser (untuk JWT & remember_me di cookies) =====
  app.use(cookieParser());

  // ===== CORS (untuk integrasi frontend) =====
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  });

  // ===== TRUST PROXY =====
  // Tanpa ini, ThrottlerGuard melihat IP proxy untuk semua request sehingga
  // rate limit menjadi satu bucket global (login 5/menit menjadi 5/menit untuk
  // SELURUH pengguna). Hanya aktifkan bila benar-benar di belakang proxy.
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // ===== Global Pipes =====
  // PENTING: ApplicationConfig.useGlobalPipes() MENGGANTI array pipe, bukan
  // menambah. Versi sebelumnya memanggilnya dua kali:
  //
  //   app.useGlobalPipes(new ValidationPipe({ ... }));   // <-- tertimpa
  //   app.useGlobalPipes(new SanitizePipe());            // <-- hanya ini yang hidup
  //
  // Akibatnya ValidationPipe TIDAK PERNAH berjalan: seluruh decorator DTO
  // (@IsString, @IsEnum, @Min, ...) menjadi kode mati, whitelist dan
  // forbidNonWhitelisted tidak aktif, dan transform tidak terjadi.
  //
  // Kedua pipe harus diberikan dalam SATU pemanggilan, SanitizePipe lebih dulu
  // agar payload mentah disanitasi SEBELUM ValidationPipe mengubahnya menjadi
  // instance DTO dan memvalidasinya.
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ===== Graceful shutdown (SIGTERM/SIGINT) =====
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🏥 MedSync API running on http://localhost:${port}`);
}
bootstrap();
