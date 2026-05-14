import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Replicates the corsAllowedOrigins parsing logic from server.ts.
 * This schema parses the CORS_ALLOWED_ORIGINS environment variable,
 * splitting by comma and validating each entry as a URL.
 * Falls back to ['http://localhost:5173'] on any parse error.
 */
function parseCorsAllowedOrigins(value: string | undefined): string[] {
  return z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.string().url()).min(1))
    .catch(['http://localhost:5173'])
    .parse(value);
}

describe('CORS_ALLOWED_ORIGINS parsing logic', () => {
  describe('valid single origin', () => {
    it('parses a single valid URL into a one-element array', () => {
      const result = parseCorsAllowedOrigins('http://localhost:3000');
      expect(result).toEqual(['http://localhost:3000']);
    });

    it('parses the default localhost:5173 origin', () => {
      const result = parseCorsAllowedOrigins('http://localhost:5173');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('parses an https production URL', () => {
      const result = parseCorsAllowedOrigins('https://app.example.com');
      expect(result).toEqual(['https://app.example.com']);
    });
  });

  describe('multiple origins (comma-separated)', () => {
    it('parses two comma-separated URLs', () => {
      const result = parseCorsAllowedOrigins('http://localhost:5173,https://app.example.com');
      expect(result).toEqual(['http://localhost:5173', 'https://app.example.com']);
    });

    it('trims whitespace around each origin', () => {
      const result = parseCorsAllowedOrigins('  http://localhost:5173 ,  https://app.example.com  ');
      expect(result).toEqual(['http://localhost:5173', 'https://app.example.com']);
    });

    it('parses three origins separated by commas', () => {
      const result = parseCorsAllowedOrigins(
        'http://localhost:5173,https://staging.example.com,https://app.example.com'
      );
      expect(result).toHaveLength(3);
      expect(result).toContain('http://localhost:5173');
      expect(result).toContain('https://staging.example.com');
      expect(result).toContain('https://app.example.com');
    });
  });

  describe('fallback to default on invalid input', () => {
    it('falls back to ["http://localhost:5173"] when value is undefined', () => {
      const result = parseCorsAllowedOrigins(undefined);
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('falls back when value is an empty string', () => {
      const result = parseCorsAllowedOrigins('');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('falls back when value is only whitespace', () => {
      const result = parseCorsAllowedOrigins('   ');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('falls back when value is not a valid URL', () => {
      const result = parseCorsAllowedOrigins('not-a-url');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('falls back when value contains an invalid URL among valid ones', () => {
      const result = parseCorsAllowedOrigins('http://localhost:5173,not-a-url');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('falls back when value is just a hostname without protocol', () => {
      const result = parseCorsAllowedOrigins('localhost:5173');
      expect(result).toEqual(['http://localhost:5173']);
    });

    it('returns an array (not a string) when falling back', () => {
      const result = parseCorsAllowedOrigins(undefined);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('whitespace trimming of the full value', () => {
    it('trims leading and trailing whitespace before parsing', () => {
      const result = parseCorsAllowedOrigins('  https://app.example.com  ');
      expect(result).toEqual(['https://app.example.com']);
    });
  });

  describe('output shape', () => {
    it('always returns an array', () => {
      expect(Array.isArray(parseCorsAllowedOrigins('https://app.example.com'))).toBe(true);
      expect(Array.isArray(parseCorsAllowedOrigins(undefined))).toBe(true);
    });

    it('always returns at least one element', () => {
      expect(parseCorsAllowedOrigins('https://app.example.com').length).toBeGreaterThanOrEqual(1);
      expect(parseCorsAllowedOrigins(undefined).length).toBeGreaterThanOrEqual(1);
    });

    it('all returned elements are strings', () => {
      const result = parseCorsAllowedOrigins('http://localhost:5173,https://app.example.com');
      for (const origin of result) {
        expect(typeof origin).toBe('string');
      }
    });
  });
});