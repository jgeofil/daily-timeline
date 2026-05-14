import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const eslintYmlPath = resolve(__dirname, '../.github/workflows/eslint.yml');
const mainYmlPath = resolve(__dirname, '../.github/workflows/main.yml');

const eslintYml = readFileSync(eslintYmlPath, 'utf-8');
const mainYml = readFileSync(mainYmlPath, 'utf-8');

describe('.github/workflows/eslint.yml (new workflow)', () => {
  describe('file existence', () => {
    it('eslint.yml workflow file exists', () => {
      expect(existsSync(eslintYmlPath)).toBe(true);
    });
  });

  describe('workflow name', () => {
    it('workflow is named "ESLint"', () => {
      expect(eslintYml).toMatch(/^name:\s*ESLint\s*$/m);
    });
  });

  describe('trigger configuration', () => {
    it('triggers on push to main branch', () => {
      expect(eslintYml).toContain('"main"');
      expect(eslintYml).toMatch(/push:/);
    });

    it('triggers on pull_request targeting main', () => {
      expect(eslintYml).toMatch(/pull_request:/);
    });

    it('has a scheduled cron trigger', () => {
      expect(eslintYml).toMatch(/schedule:/);
      expect(eslintYml).toMatch(/cron:/);
    });

    it('cron schedule is "34 4 * * 1" (weekly on Monday)', () => {
      expect(eslintYml).toContain("'34 4 * * 1'");
    });
  });

  describe('job configuration', () => {
    it('defines an eslint job', () => {
      expect(eslintYml).toMatch(/^\s*eslint:/m);
    });

    it('job runs on ubuntu-latest', () => {
      expect(eslintYml).toContain('runs-on: ubuntu-latest');
    });

    it('has contents: read permission', () => {
      expect(eslintYml).toMatch(/contents:\s*read/);
    });

    it('has security-events: write permission (required for SARIF upload)', () => {
      expect(eslintYml).toMatch(/security-events:\s*write/);
    });

    it('has actions: read permission', () => {
      expect(eslintYml).toMatch(/actions:\s*read/);
    });
  });

  describe('checkout step', () => {
    it('uses actions/checkout@v4', () => {
      expect(eslintYml).toContain('actions/checkout@v4');
    });
  });

  describe('ESLint install step', () => {
    it('installs eslint at version 8.10.0', () => {
      expect(eslintYml).toContain('npm install eslint@8.10.0');
    });

    it('installs @microsoft/eslint-formatter-sarif at version 3.1.0', () => {
      expect(eslintYml).toContain('npm install @microsoft/eslint-formatter-sarif@3.1.0');
    });
  });

  describe('ESLint run step', () => {
    it('sets SARIF_ESLINT_IGNORE_SUPPRESSED env var to "true"', () => {
      expect(eslintYml).toContain('SARIF_ESLINT_IGNORE_SUPPRESSED: "true"');
    });

    it('runs eslint with SARIF formatter', () => {
      expect(eslintYml).toContain('@microsoft/eslint-formatter-sarif');
    });

    it('outputs to eslint-results.sarif', () => {
      expect(eslintYml).toContain('eslint-results.sarif');
    });

    it('scans .js, .jsx, .ts, .tsx extensions', () => {
      expect(eslintYml).toContain('.js,.jsx,.ts,.tsx');
    });

    it('has continue-on-error: true so workflow proceeds even with lint errors', () => {
      expect(eslintYml).toMatch(/continue-on-error:\s*true/);
    });
  });

  describe('SARIF upload step', () => {
    it('uses github/codeql-action/upload-sarif@v3', () => {
      expect(eslintYml).toContain('github/codeql-action/upload-sarif@v3');
    });

    it('uploads eslint-results.sarif', () => {
      expect(eslintYml).toMatch(/sarif_file:\s*eslint-results\.sarif/);
    });

    it('has wait-for-processing: true', () => {
      expect(eslintYml).toMatch(/wait-for-processing:\s*true/);
    });
  });

  describe('regression: no config file flag passed to eslint', () => {
    it('does not pass --config or -c flag (config file removed in this PR)', () => {
      // The PR commit message references removing the config file reference
      expect(eslintYml).not.toMatch(/--config\s/);
      expect(eslintYml).not.toMatch(/ -c /);
    });
  });
});

describe('.github/workflows/main.yml (simplified megalinter workflow)', () => {
  describe('file existence', () => {
    it('main.yml workflow file exists', () => {
      expect(existsSync(mainYmlPath)).toBe(true);
    });
  });

  describe('workflow name', () => {
    it('workflow is named "megalinter"', () => {
      expect(mainYml).toMatch(/^name:\s*megalinter\s*$/m);
    });

    it('workflow name is lowercase "megalinter" (not "MegaLinter")', () => {
      expect(mainYml).not.toMatch(/^name:\s*MegaLinter\s*$/m);
    });
  });

  describe('trigger configuration', () => {
    it('triggers on push to main branch', () => {
      expect(mainYml).toMatch(/push:/);
      expect(mainYml).toContain('main');
    });

    it('triggers on push to develop branch', () => {
      expect(mainYml).toContain('develop');
    });

    it('triggers on pull_request', () => {
      expect(mainYml).toMatch(/pull_request:/);
    });

    it('supports workflow_dispatch (manual trigger)', () => {
      expect(mainYml).toMatch(/workflow_dispatch:/);
    });

    it('does not restrict pull_request to master-only (old config removed)', () => {
      expect(mainYml).not.toMatch(/branches:\s*\[master\]/);
    });
  });

  describe('job configuration', () => {
    it('defines a megalinter job', () => {
      expect(mainYml).toMatch(/^\s*megalinter:/m);
    });

    it('job runs on ubuntu-latest', () => {
      expect(mainYml).toContain('runs-on: ubuntu-latest');
    });

    it('has contents: write permission', () => {
      expect(mainYml).toMatch(/contents:\s*write/);
    });

    it('has issues: write permission', () => {
      expect(mainYml).toMatch(/issues:\s*write/);
    });

    it('has pull-requests: write permission', () => {
      expect(mainYml).toMatch(/pull-requests:\s*write/);
    });
  });

  describe('checkout step', () => {
    it('uses actions/checkout@v4', () => {
      expect(mainYml).toContain('actions/checkout@v4');
    });

    it('does not use actions/checkout@v6 (old invalid version removed)', () => {
      expect(mainYml).not.toContain('actions/checkout@v6');
    });
  });

  describe('MegaLinter action step', () => {
    it('uses jgeofil/_mega_linter@v1', () => {
      expect(mainYml).toContain('jgeofil/_mega_linter@v1');
    });

    it('does not use oxsecurity/megalinter@v9 (old action removed)', () => {
      expect(mainYml).not.toContain('oxsecurity/megalinter@v9');
    });

    it('passes github-token from GITHUB_TOKEN secret', () => {
      expect(mainYml).toContain('github-token:');
      expect(mainYml).toContain('secrets.GITHUB_TOKEN');
    });

    it('enables apply-fixes: true', () => {
      expect(mainYml).toMatch(/apply-fixes:\s*['"]?true['"]?/);
    });

    it('sets apply-fixes-mode to commit', () => {
      expect(mainYml).toMatch(/apply-fixes-mode:\s*['"]?commit['"]?/);
    });

    it('sets apply-fixes-event to pull_request', () => {
      expect(mainYml).toMatch(/apply-fixes-event:\s*['"]?pull_request['"]?/);
    });
  });

  describe('artifact upload step', () => {
    it('uses actions/upload-artifact@v4', () => {
      expect(mainYml).toContain('actions/upload-artifact@v4');
    });

    it('does not use actions/upload-artifact@v7 (old version removed)', () => {
      expect(mainYml).not.toContain('actions/upload-artifact@v7');
    });

    it('runs always() to upload even on linting failures', () => {
      expect(mainYml).toContain('if: always()');
    });

    it('uploads to megalinter-reports artifact name', () => {
      expect(mainYml).toContain('name: megalinter-reports');
    });

    it('uploads from megalinter-reports/ path', () => {
      expect(mainYml).toMatch(/path:\s*megalinter-reports\//);
    });
  });

  describe('removed features from old workflow', () => {
    it('does not have APPLY_FIXES env var at top level (moved to action inputs)', () => {
      expect(mainYml).not.toMatch(/^env:/m);
    });

    it('does not have concurrency group configuration', () => {
      expect(mainYml).not.toMatch(/^concurrency:/m);
    });

    it('does not use peter-evans/create-pull-request action', () => {
      expect(mainYml).not.toContain('peter-evans/create-pull-request');
    });

    it('does not use stefanzweifel/git-auto-commit-action', () => {
      expect(mainYml).not.toContain('stefanzweifel/git-auto-commit-action');
    });
  });
});
