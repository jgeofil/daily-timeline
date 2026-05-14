import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
);

describe('apps/api package.json manifest', () => {
  describe('@daily-timeline/types dependency version', () => {
    it('pins @daily-timeline/types to the fixed version "0.1.0"', () => {
      expect(pkg.dependencies['@daily-timeline/types']).toBe('0.1.0');
    });

    it('does not use a workspace protocol reference for @daily-timeline/types', () => {
      const version = pkg.dependencies['@daily-timeline/types'];
      expect(version).not.toMatch(/^workspace:/);
    });

    it('does not use a wildcard (*) for @daily-timeline/types', () => {
      const version = pkg.dependencies['@daily-timeline/types'];
      expect(version).not.toBe('workspace:*');
      expect(version).not.toBe('*');
    });

    it('uses a valid semver string for @daily-timeline/types', () => {
      const version = pkg.dependencies['@daily-timeline/types'];
      // Matches bare semver like "0.1.0", optionally prefixed with ^ or ~
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });
  });

  describe('dependencies object structure', () => {
    it('@daily-timeline/types is present in dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('@daily-timeline/types');
    });

    it('fastify dependency is still present', () => {
      expect(pkg.dependencies).toHaveProperty('fastify');
    });

    it('zod dependency is still present', () => {
      expect(pkg.dependencies).toHaveProperty('zod');
    });
  });

  describe('@fastify/cors dependency (added in this PR)', () => {
    it('@fastify/cors is present in dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('@fastify/cors');
    });

    it('@fastify/cors version is a valid semver range', () => {
      const version = pkg.dependencies['@fastify/cors'];
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });

    it('@fastify/cors is at version ^10.x or higher', () => {
      const version = pkg.dependencies['@fastify/cors'];
      expect(version).toMatch(/^\^(?:10|1[1-9]|\d{3})\./);
    });
  });

  describe('@fastify/jwt dependency (removed in this PR)', () => {
    it('@fastify/jwt is NOT present in dependencies', () => {
      expect(pkg.dependencies).not.toHaveProperty('@fastify/jwt');
    });

    it('no JWT-related fastify plugin is a direct dependency', () => {
      const depKeys = Object.keys(pkg.dependencies ?? {});
      const jwtDeps = depKeys.filter((k) => k.includes('jwt'));
      expect(jwtDeps).toHaveLength(0);
    });
  });
});