import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Keys yang tidak boleh disalin ke objek hasil sanitasi.
 * `JSON.parse` membuat `__proto__` sebagai own enumerable property, sehingga
 * `target[key] = value` akan memicu prototype setter.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Field yang diteruskan apa adanya.
 * Kredensial TIDAK boleh di-trim atau ditulis ulang di sini — melakukannya
 * akan mengubah nilai yang diketik pengguna sebelum sampai ke bcrypt.hash()
 * maupun bcrypt.compare().
 */
const SKIPPED_KEYS = new Set(['password', 'confirm_password']);

/**
 * Global Sanitization Pipe — pencegahan XSS.
 *
 * Menghapus tag HTML dari input string agar data tersimpan tidak membawa
 * payload script. Bekerja rekursif pada objek dan array.
 *
 * PENTING: pipe ini hanya melakukan normalisasi INPUT. Ia sengaja TIDAK
 * melakukan HTML entity encoding (`&` -> `&amp;`). Entity encoding adalah
 * urusan OUTPUT; melakukannya saat menulis akan menyimpan
 * `Rumah Sakit Ibu &amp; Anak` dan `O&#x27;Brien`, memaksa setiap konsumen
 * melakukan un-escape, dan menyebabkan double-escaping (`&amp;amp;`) ketika
 * frontend melakukan escape sekali lagi.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Hanya sanitasi body (query & route param dibiarkan)
    if (metadata.type !== 'body') {
      return value;
    }

    return this.sanitize(value, null);
  }

  private sanitize(value: any, key: string | null): any {
    if (key !== null && SKIPPED_KEYS.has(key)) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, null));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const childKey of Object.keys(value)) {
        if (FORBIDDEN_KEYS.has(childKey)) {
          continue;
        }
        sanitized[childKey] = this.sanitize(value[childKey], childKey);
      }
      return sanitized;
    }

    return value;
  }

  /**
   * 1. Hapus tag HTML
   * 2. Trim spasi di ujung
   */
  private sanitizeString(input: string): string {
    return input.replace(/<[^>]*>/g, '').trim();
  }
}
