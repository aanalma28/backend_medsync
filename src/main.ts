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
    credentials: true, // Allow cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With'],
  });

  // ===== Global Validation Pipe (input limiting & type safety) =====
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Reject unknown properties with error
      transform: true, // Auto-transform payload to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ===== Global Sanitization Pipe (XSS prevention on inputs) =====
  app.useGlobalPipes(new SanitizePipe());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🏥 MedSync API running on http://localhost:${port}`);
}
bootstrap();
