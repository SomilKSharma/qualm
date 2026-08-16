import { execFileSync, spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * End-to-end tests that actually launch the binary.
 *
 * Four published versions of this package could not start at all — the compiled
 * entrypoint threw on import — and the suite stayed green throughout, because
 * nothing here ever executed it. Every test below spawns the real CLI.
 */

const repoRoot = join(__dirname, '..');
const cliPath = join(repoRoot, 'dist', 'cli.js');

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[], cwd: string = repoRoot): CliResult {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

/** A throwaway git repo with one committed component. */
function makeRepo(initialSource: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'qualm-cli-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'A.tsx'), initialSource, 'utf-8');
  git(['init', '-q'], dir);
  git(['config', 'user.email', 'test@example.com'], dir);
  git(['config', 'user.name', 'test'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-qm', 'base'], dir);
  // init.defaultBranch varies by git version and user config; pin it so the
  // tests do not depend on the host's setting.
  git(['branch', '-M', 'master'], dir);
  return dir;
}

const VIOLATING = 'export const A = () => <div onClick={() => {}}>hi</div>;\n';
const CLEAN = 'export const A = () => <button onClick={() => {}}>hi</button>;\n';

const tempDirs: string[] = [];

beforeAll(() => {
  execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'ignore' });
}, 180_000);

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe('CLI startup', () => {
  it('starts and prints its version', () => {
    const { status, stdout } = runCli(['--version']);
    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints help without error', () => {
    const { status, stdout } = runCli(['--help']);
    expect(status).toBe(0);
    expect(stdout).toContain('--diff-branch');
  });
});

describe('CLI exit codes', () => {
  it('exits 1 on a violating file', () => {
    expect(runCli(['tests/fixtures/document-structure-violating.tsx']).status).toBe(1);
  });

  it('exits 0 on a compliant file', () => {
    expect(runCli(['tests/fixtures/document-structure-compliant.tsx']).status).toBe(0);
  });

  it('exits 2 on an unknown format', () => {
    const { status, stderr } = runCli([
      'tests/fixtures/document-structure-compliant.tsx', '--format', 'yaml',
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('unknown format');
  });

  it('exits 2 on an unknown --fail-on level', () => {
    const { status, stderr } = runCli([
      'tests/fixtures/document-structure-compliant.tsx', '--fail-on', 'nitpick',
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('unknown --fail-on');
  });

  it('exits 2 on a missing path', () => {
    const { status, stderr } = runCli(['./definitely/not/here']);
    expect(status).toBe(2);
    expect(stderr).toContain('path not found');
  });
});

describe('CLI output formats', () => {
  it('emits parseable JSON with a summary', () => {
    const { stdout } = runCli([
      'tests/fixtures/document-structure-violating.tsx', '--format', 'json',
    ]);
    const parsed = JSON.parse(stdout);
    expect(parsed.summary.scannedFiles).toBe(1);
    expect(parsed.summary.totalViolations).toBeGreaterThan(0);
  });

  it('emits SARIF carrying the real package version and a relative path', () => {
    const { stdout } = runCli([
      'tests/fixtures/document-structure-violating.tsx', '--format', 'sarif',
    ]);
    const sarif = JSON.parse(stdout);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../package.json');

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].tool.driver.version).toBe(version);

    // GitHub Code Scanning resolves URIs against the repo root; an absolute
    // path leaves every annotation unattached.
    const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uri.startsWith('/')).toBe(false);
    expect(uri).toBe('tests/fixtures/document-structure-violating.tsx');
  });
});

describe('--diff-branch regression gating', () => {
  it('does not report a regression for an untouched pre-existing violation', () => {
    const dir = makeRepo(VIOLATING);
    tempDirs.push(dir);
    // The file is byte-identical to the commit. The defect is in the baseline,
    // so the gate must stay green.
    expect(runCli(['src', '--diff-branch', 'master'], dir).status).toBe(0);
  });

  it('reports a regression when a new violation is introduced', () => {
    const dir = makeRepo(CLEAN);
    tempDirs.push(dir);
    writeFileSync(join(dir, 'src', 'A.tsx'), CLEAN + VIOLATING, 'utf-8');
    expect(runCli(['src', '--diff-branch', 'master'], dir).status).toBe(1);
  });

  it('does not report a regression when a violation is removed', () => {
    const dir = makeRepo(VIOLATING);
    tempDirs.push(dir);
    writeFileSync(join(dir, 'src', 'A.tsx'), CLEAN, 'utf-8');
    expect(runCli(['src', '--diff-branch', 'master'], dir).status).toBe(0);
  });

  it('exits 2 on an unresolvable ref rather than treating every file as new', () => {
    const dir = makeRepo(VIOLATING);
    tempDirs.push(dir);
    const { status, stderr } = runCli(['src', '--diff-branch', 'no-such-branch'], dir);
    expect(status).toBe(2);
    expect(stderr).toContain('cannot resolve');
  });

  it('does not pass the branch name through a shell', () => {
    const dir = makeRepo(VIOLATING);
    tempDirs.push(dir);
    const marker = join(dir, 'pwned');
    runCli(['src', '--diff-branch', `master; touch ${marker}`], dir);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('fs').existsSync(marker)).toBe(false);
  });

  it('emits a single JSON document covering every compared file', () => {
    const dir = makeRepo(CLEAN);
    tempDirs.push(dir);
    writeFileSync(join(dir, 'src', 'B.tsx'), VIOLATING, 'utf-8');
    const { stdout } = runCli(
      ['src', '--diff-branch', 'master', '--format', 'json'], dir
    );
    // Previously one object was printed per file, producing a stream no parser
    // would accept.
    const parsed = JSON.parse(stdout);
    expect(parsed.files).toHaveLength(2);
    expect(parsed.summary.regressionDetected).toBe(true);
  });
});

describe('--ignore', () => {
  it('excludes matching files while still analysing the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qualm-ignore-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'Bad.tsx'), VIOLATING, 'utf-8');
    writeFileSync(join(dir, 'Good.tsx'), CLEAN, 'utf-8');

    expect(runCli([dir]).status).toBe(1);

    const ignored = runCli([dir, '--ignore', '**/Bad.tsx']);
    expect(ignored.status).toBe(0);
    expect(ignored.stdout).toContain('Good.tsx');
    expect(ignored.stdout).not.toContain('Bad.tsx');
  });

  it('reports clearly when every file has been excluded', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qualm-ignore-all-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'Bad.tsx'), VIOLATING, 'utf-8');

    const { status, stderr } = runCli([dir, '--ignore', '**/*.tsx']);
    expect(status).toBe(1);
    expect(stderr).toContain('No TypeScript/React files found');
  });

  it('skips declaration files by default', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qualm-dts-'));
    tempDirs.push(dir);
    writeFileSync(join(dir, 'types.d.ts'), 'export type X = string;\n', 'utf-8');
    writeFileSync(join(dir, 'Good.tsx'), CLEAN, 'utf-8');

    const { status, stdout } = runCli([dir]);
    expect(status).toBe(0);
    expect(stdout).not.toContain('types.d.ts');
  });
});
