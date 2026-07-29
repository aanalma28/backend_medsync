import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Global Sanitization Pipe — XSS Prevention.
 *
 * Strips HTML tags and encodes dangerous characters from all string inputs.
 * Works recursively on objects and arrays.
 *
 * This prevents Stored XSS attacks where malicious scripts
 * could be saved to the database via user input.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only sanitize body parameters (not query params, route params, etc.)
    if (metadata.type !== 'body') {
      return value;
    }

    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value !== null && typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.sanitize(value[key]);
      }
      return sanitized;
    }

    return value;
  }

  /**
   * Sanitize a single string value:
   * 1. Trim whitespace
   * 2. Strip HTML tags
   * 3. Encode HTML entities for dangerous characters
   */
  private sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
