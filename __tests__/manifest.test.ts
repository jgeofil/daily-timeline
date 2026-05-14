import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

describe('root package.json manifest', () => {
  describe('dependencies – version constraints changed in PR', () => {
    describe('better-sqlite3', () => {
      it('is present in dependencies', () => {
        expect(pkg.dependencies).toHaveProperty('better-sqlite3');
      });

      it('targets the ^11 major series (downgraded from ^12)', () => {
        const version: string = pkg.dependencies['better-sqlite3'];
        expect(version).toMatch(/^\^11\./);
      });

      it('is at least ^11.8.1', () => {
        const version: string = pkg.dependencies['better-sqlite3'];
        // Semver range must be >= 11.8.1 within the ^11 series
        const [, major, minor, patch] = version.match(/^[\^~]?(\d+)\.(\d+)\.(\d+)/)!;
        expect(Number(major)).toBe(11);
        expect(Number(minor)).toBeGreaterThanOrEqual(8);
        if (Number(minor) === 8) {
          expect(Number(patch)).toBeGreaterThanOrEqual(1);
        }
      });

      it('does not target the ^12 major series', () => {
        const version: string = pkg.dependencies['better-sqlite3'];
        expect(version).not.toMatch(/^\^12\./);
      });
    });

    describe('zod', () => {
      it('is present in dependencies', () => {
        expect(pkg.dependencies).toHaveProperty('zod');
      });

      it('targets the ^3 major series (downgraded from ^4)', () => {
        const version: string = pkg.dependencies['zod'];
        expect(version).toMatch(/^\^3\./);
      });

      it('is at least ^3.24.2', () => {
        const version: string = pkg.dependencies['zod'];
        const [, major, minor, patch] = version.match(/^[\^~]?(\d+)\.(\d+)\.(\d+)/)!;
        expect(Number(major)).toBe(3);
        expect(Number(minor)).toBeGreaterThanOrEqual(24);
        if (Number(minor) === 24) {
          expect(Number(patch)).toBeGreaterThanOrEqual(2);
        }
      });

      it('does not target the ^4 major series', () => {
        const version: string = pkg.dependencies['zod'];
        expect(version).not.toMatch(/^\^4\./);
      });
    });
  });

  describe('devDependencies – version constraints changed in PR', () => {
    describe('@types/node', () => {
      it('is present in devDependencies', () => {
        expect(pkg.devDependencies).toHaveProperty('@types/node');
      });

      it('targets the ^22 major series (downgraded from ^25)', () => {
        const version: string = pkg.devDependencies['@types/node'];
        expect(version).toMatch(/^\^22\./);
      });

      it('is at least ^22.13.8', () => {
        const version: string = pkg.devDependencies['@types/node'];
        const [, major, minor, patch] = version.match(/^[\^~]?(\d+)\.(\d+)\.(\d+)/)!;
        expect(Number(major)).toBe(22);
        expect(Number(minor)).toBeGreaterThanOrEqual(13);
        if (Number(minor) === 13) {
          expect(Number(patch)).toBeGreaterThanOrEqual(8);
        }
      });

      it('does not target the ^25 major series', () => {
        const version: string = pkg.devDependencies['@types/node'];
        expect(version).not.toMatch(/^\^25\./);
      });
    });

    describe('typescript', () => {
      it('is present in devDependencies', () => {
        expect(pkg.devDependencies).toHaveProperty('typescript');
      });

      it('targets the ^5 major series (downgraded from ^6)', () => {
        const version: string = pkg.devDependencies['typescript'];
        expect(version).toMatch(/^\^5\./);
      });

      it('is at least ^5.7.3', () => {
        const version: string = pkg.devDependencies['typescript'];
        const [, major, minor, patch] = version.match(/^[\^~]?(\d+)\.(\d+)\.(\d+)/)!;
        expect(Number(major)).toBe(5);
        expect(Number(minor)).toBeGreaterThanOrEqual(7);
        if (Number(minor) === 7) {
          expect(Number(patch)).toBeGreaterThanOrEqual(3);
        }
      });

      it('does not target the ^6 major series', () => {
        const version: string = pkg.devDependencies['typescript'];
        expect(version).not.toMatch(/^\^6\./);
      });
    });
  });

  describe('unchanged dependencies still present', () => {
    it('cors is still in dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('cors');
    });

    it('dotenv is still in dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('dotenv');
    });

    it('express is still in dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('express');
    });

    it('vitest is still in devDependencies', () => {
      expect(pkg.devDependencies).toHaveProperty('vitest');
    });

    it('supertest is still in devDependencies', () => {
      expect(pkg.devDependencies).toHaveProperty('supertest');
    });
  });

  describe('package.json structural integrity', () => {
    it('has a name field', () => {
      expect(pkg.name).toBeDefined();
      expect(typeof pkg.name).toBe('string');
    });

    it('has a dependencies object', () => {
      expect(pkg.dependencies).toBeDefined();
      expect(typeof pkg.dependencies).toBe('object');
    });

    it('has a devDependencies object', () => {
      expect(pkg.devDependencies).toBeDefined();
      expect(typeof pkg.devDependencies).toBe('object');
    });

    it('all dependency version strings start with ^ or ~', () => {
      for (const [name, version] of Object.entries(pkg.dependencies as Record<string, string>)) {
        expect(version, `${name} version should start with ^ or ~`).toMatch(/^[\^~]/);
      }
    });

    it('all devDependency version strings start with ^ or ~', () => {
      for (const [name, version] of Object.entries(pkg.devDependencies as Record<string, string>)) {
        expect(version, `${name} version should start with ^ or ~`).toMatch(/^[\^~]/);
      }
    });
  });
});