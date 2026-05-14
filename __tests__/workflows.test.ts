import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflowsDir = resolve(__dirname, '../.github/workflows');

function readWorkflow(name: string): string {
  return readFileSync(resolve(workflowsDir, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// auto-approve.yml – new file added in this PR
// ---------------------------------------------------------------------------
describe('.github/workflows/auto-approve.yml', () => {
  let content: string;

  beforeAll(() => {
    content = readWorkflow('auto-approve.yml');
  });

  describe('file existence', () => {
    it('can be read without errors', () => {
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('workflow trigger', () => {
    it('is triggered by pull_request_target', () => {
      expect(content).toContain('pull_request_target');
    });

    it('does not trigger on plain pull_request event (security: uses pull_request_target for token access)', () => {
      // The workflow must use pull_request_target (not the less-privileged pull_request)
      // so that the GITHUB_TOKEN has write access for approvals
      const lines = content.split('\n');
      const onIndex = lines.findIndex((l) => l.match(/^on:/));
      expect(onIndex).toBeGreaterThanOrEqual(0);
      // Within the trigger block the value must be pull_request_target
      const triggerBlock = lines.slice(onIndex, onIndex + 3).join('\n');
      expect(triggerBlock).toMatch(/pull_request_target/);
    });
  });

  describe('permissions', () => {
    it('declares a top-level permissions block', () => {
      expect(content).toMatch(/^permissions:/m);
    });

    it('grants contents: read (least privilege for read-only checkout)', () => {
      expect(content).toMatch(/contents:\s*read/);
    });

    it('grants pull-requests: write (required to post a review)', () => {
      expect(content).toMatch(/pull-requests:\s*write/);
    });

    it('does not grant contents: write (unnecessary elevation)', () => {
      // contents permission must be read, not write
      const contentsMatch = content.match(/contents:\s*(\w+)/);
      expect(contentsMatch).not.toBeNull();
      expect(contentsMatch![1]).toBe('read');
    });
  });

  describe('job configuration', () => {
    it('defines an auto-approve job', () => {
      expect(content).toContain('auto-approve:');
    });

    it('runs on ubuntu-latest', () => {
      expect(content).toMatch(/runs-on:\s*ubuntu-latest/);
    });

    it('restricts execution to dependabot[bot] actor', () => {
      expect(content).toContain("github.actor == 'dependabot[bot]'");
    });

    it('does not run unconditionally (the if condition must be present)', () => {
      expect(content).toMatch(/\bif:\s*.+dependabot/);
    });
  });

  describe('action usage', () => {
    it('uses hmarr/auto-approve-action@v4', () => {
      expect(content).toContain('hmarr/auto-approve-action@v4');
    });

    it('passes a github-token input to the action', () => {
      expect(content).toMatch(/github-token:/);
    });

    it('uses the SOME_USERS_PAT secret for the token', () => {
      expect(content).toContain('secrets.SOME_USERS_PAT');
    });

    it('sets a review-message', () => {
      expect(content).toMatch(/review-message:/);
    });

    it('review-message mentions Dependabot', () => {
      const match = content.match(/review-message:\s*(.+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/[Dd]ependabot/);
    });
  });
});

// ---------------------------------------------------------------------------
// main.yml – modified in this PR (simplified from original MegaLinter config)
// ---------------------------------------------------------------------------
describe('.github/workflows/main.yml', () => {
  let content: string;

  beforeAll(() => {
    content = readWorkflow('main.yml');
  });

  describe('file existence', () => {
    it('can be read without errors', () => {
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('workflow name', () => {
    it('is named megalinter', () => {
      expect(content).toMatch(/^name:\s*megalinter/m);
    });
  });

  describe('trigger events', () => {
    it('triggers on push events', () => {
      expect(content).toMatch(/\bpush:/);
    });

    it('triggers on pull_request events', () => {
      expect(content).toMatch(/\bpull_request:/);
    });

    it('triggers on workflow_dispatch', () => {
      expect(content).toMatch(/\bworkflow_dispatch/);
    });

    it('includes main in push branches', () => {
      // branches list must include main
      const branchesSection = content.match(/push:\s*\n\s*branches:\s*\[([^\]]+)\]/);
      expect(branchesSection).not.toBeNull();
      expect(branchesSection![1]).toContain('main');
    });

    it('includes develop in push branches', () => {
      const branchesSection = content.match(/push:\s*\n\s*branches:\s*\[([^\]]+)\]/);
      expect(branchesSection).not.toBeNull();
      expect(branchesSection![1]).toContain('develop');
    });

    it('includes main in pull_request branches', () => {
      const branchesSection = content.match(/pull_request:\s*\n\s*branches:\s*\[([^\]]+)\]/);
      expect(branchesSection).not.toBeNull();
      expect(branchesSection![1]).toContain('main');
    });

    it('includes develop in pull_request branches', () => {
      const branchesSection = content.match(/pull_request:\s*\n\s*branches:\s*\[([^\]]+)\]/);
      expect(branchesSection).not.toBeNull();
      expect(branchesSection![1]).toContain('develop');
    });

    it('does not restrict triggers to only master branch', () => {
      // The new config uses main/develop, not master
      expect(content).not.toMatch(/branches:\s*\[\s*master/);
    });
  });

  describe('job permissions', () => {
    it('grants contents: write', () => {
      expect(content).toMatch(/contents:\s*write/);
    });

    it('grants issues: write', () => {
      expect(content).toMatch(/issues:\s*write/);
    });

    it('grants pull-requests: write', () => {
      expect(content).toMatch(/pull-requests:\s*write/);
    });
  });

  describe('checkout step', () => {
    it('uses actions/checkout@v4', () => {
      expect(content).toContain('actions/checkout@v4');
    });

    it('does not use an older checkout version (v2 or v3)', () => {
      expect(content).not.toMatch(/actions\/checkout@v[23]\b/);
    });
  });

  describe('MegaLinter step', () => {
    it('uses jgeofil/_mega_linter@v1', () => {
      expect(content).toContain('jgeofil/_mega_linter@v1');
    });

    it('passes github-token to the linter action', () => {
      // Must use GITHUB_TOKEN (not a PAT) for linter
      expect(content).toMatch(/github-token:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
    });

    it('enables apply-fixes', () => {
      expect(content).toMatch(/apply-fixes:\s*'true'/);
    });

    it('sets apply-fixes-mode to commit', () => {
      expect(content).toMatch(/apply-fixes-mode:\s*'commit'/);
    });

    it('sets apply-fixes-event to pull_request', () => {
      expect(content).toMatch(/apply-fixes-event:\s*'pull_request'/);
    });
  });

  describe('artifact upload step', () => {
    it('uses actions/upload-artifact@v4', () => {
      expect(content).toContain('actions/upload-artifact@v4');
    });

    it('does not use an older upload-artifact version (v2 or v3)', () => {
      expect(content).not.toMatch(/actions\/upload-artifact@v[23]\b/);
    });

    it('uploads with if: always() so reports are preserved on failure', () => {
      expect(content).toMatch(/if:\s*always\(\)/);
    });

    it('names the artifact megalinter-reports', () => {
      expect(content).toMatch(/name:\s*megalinter-reports/);
    });

    it('uploads from the megalinter-reports/ path', () => {
      expect(content).toMatch(/path:\s*megalinter-reports\//);
    });
  });

  describe('removed legacy configuration', () => {
    it('no longer uses the old oxsecurity/megalinter@v9 action', () => {
      expect(content).not.toContain('oxsecurity/megalinter');
    });

    it('no longer uses peter-evans/create-pull-request action', () => {
      expect(content).not.toContain('peter-evans/create-pull-request');
    });

    it('no longer uses stefanzweifel/git-auto-commit-action', () => {
      expect(content).not.toContain('stefanzweifel/git-auto-commit-action');
    });

    it('no longer defines APPLY_FIXES env var at workflow level', () => {
      // Old config had top-level env: block with APPLY_FIXES
      expect(content).not.toMatch(/^env:/m);
    });

    it('no longer has a concurrency block', () => {
      expect(content).not.toMatch(/^concurrency:/m);
    });
  });
});
