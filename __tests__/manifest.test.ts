import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rootPkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

const lockFile = JSON.parse(
  readFileSync(resolve(__dirname, '../package-lock.json'), 'utf-8')
);

describe('root package.json manifest', () => {
  describe('production dependency versions (PR downgrade changes)', () => {
    it('pins better-sqlite3 to ^11.8.1 (downgraded from ^12.x)', () => {
      expect(rootPkg.dependencies['better-sqlite3']).toBe('^11.8.1');
    });

    it('does not use better-sqlite3 v12.x or higher', () => {
      const version = rootPkg.dependencies['better-sqlite3'];
      expect(version).not.toMatch(/^\^12\./);
      expect(version).not.toMatch(/^\^13\./);
    });

    it('pins zod to ^3.24.2 (downgraded from ^4.x)', () => {
      expect(rootPkg.dependencies['zod']).toBe('^3.24.2');
    });

    it('does not use zod v4.x or higher', () => {
      const version = rootPkg.dependencies['zod'];
      expect(version).not.toMatch(/^\^4\./);
      expect(version).not.toMatch(/^\^5\./);
    });

    it('zod version is a valid semver range', () => {
      const version = rootPkg.dependencies['zod'];
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });

    it('better-sqlite3 version is a valid semver range', () => {
      const version = rootPkg.dependencies['better-sqlite3'];
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });
  });

  describe('devDependency versions (PR downgrade changes)', () => {
    it('pins @types/node to ^22.13.8 (downgraded from ^25.x)', () => {
      expect(rootPkg.devDependencies['@types/node']).toBe('^22.13.8');
    });

    it('does not use @types/node v25.x or higher', () => {
      const version = rootPkg.devDependencies['@types/node'];
      expect(version).not.toMatch(/^\^25\./);
      expect(version).not.toMatch(/^\^26\./);
    });

    it('pins typescript to ^5.7.3 (downgraded from ^6.x)', () => {
      expect(rootPkg.devDependencies['typescript']).toBe('^5.7.3');
    });

    it('does not use typescript v6.x or higher', () => {
      const version = rootPkg.devDependencies['typescript'];
      expect(version).not.toMatch(/^\^6\./);
      expect(version).not.toMatch(/^\^7\./);
    });

    it('@types/node version is a valid semver range', () => {
      const version = rootPkg.devDependencies['@types/node'];
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });

    it('typescript version is a valid semver range', () => {
      const version = rootPkg.devDependencies['typescript'];
      expect(version).toMatch(/^[\^~]?\d+\.\d+\.\d+/);
    });
  });

  describe('unchanged production dependencies remain present', () => {
    it('cors dependency is still present', () => {
      expect(rootPkg.dependencies).toHaveProperty('cors');
    });

    it('dotenv dependency is still present', () => {
      expect(rootPkg.dependencies).toHaveProperty('dotenv');
    });

    it('express dependency is still present', () => {
      expect(rootPkg.dependencies).toHaveProperty('express');
    });
  });

  describe('unchanged devDependencies remain present', () => {
    it('@types/better-sqlite3 is still present', () => {
      expect(rootPkg.devDependencies).toHaveProperty('@types/better-sqlite3');
    });

    it('@types/express is still present', () => {
      expect(rootPkg.devDependencies).toHaveProperty('@types/express');
    });

    it('vitest is still present', () => {
      expect(rootPkg.devDependencies).toHaveProperty('vitest');
    });

    it('tsx is still present', () => {
      expect(rootPkg.devDependencies).toHaveProperty('tsx');
    });
  });

  describe('package.json structure', () => {
    it('has a name field', () => {
      expect(rootPkg.name).toBeDefined();
      expect(typeof rootPkg.name).toBe('string');
    });

    it('has a dependencies object', () => {
      expect(rootPkg.dependencies).toBeDefined();
      expect(typeof rootPkg.dependencies).toBe('object');
    });

    it('has a devDependencies object', () => {
      expect(rootPkg.devDependencies).toBeDefined();
      expect(typeof rootPkg.devDependencies).toBe('object');
    });

    it('has a test script defined', () => {
      expect(rootPkg.scripts).toHaveProperty('test');
    });
  });
});

describe('package-lock.json vite version (PR downgrade from 8.0.5 to 8.0.3)', () => {
  const viteEntry = lockFile.packages?.['node_modules/vite'];

  it('vite entry exists in package-lock.json', () => {
    expect(viteEntry).toBeDefined();
  });

  it('vite is pinned to version 8.0.3 (downgraded from 8.0.5)', () => {
    expect(viteEntry?.version).toBe('8.0.3');
  });

  it('vite is not at version 8.0.5 (old version)', () => {
    expect(viteEntry?.version).not.toBe('8.0.5');
  });

  it('vite entry has a resolved URL', () => {
    expect(viteEntry?.resolved).toBeDefined();
    expect(typeof viteEntry?.resolved).toBe('string');
  });

  it('vite resolved URL points to version 8.0.3 tarball', () => {
    expect(viteEntry?.resolved).toContain('vite-8.0.3.tgz');
  });

  it('vite resolved URL does not point to 8.0.5 tarball', () => {
    expect(viteEntry?.resolved).not.toContain('vite-8.0.5.tgz');
  });

  it('vite entry has an integrity hash', () => {
    expect(viteEntry?.integrity).toBeDefined();
    expect(typeof viteEntry?.integrity).toBe('string');
  });

  it('vite is marked as a devDependency', () => {
    expect(viteEntry?.dev).toBe(true);
  });

  it('vite esbuild peer dependency allows ^0.27.0 only (removed ^0.28.0)', () => {
    const esbuildPeer = viteEntry?.peerDependencies?.esbuild;
    expect(esbuildPeer).toBe('^0.27.0');
    expect(esbuildPeer).not.toContain('^0.28.0');
  });
});