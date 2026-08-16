#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve, extname, relative, sep } from 'path';
import { execFileSync } from 'child_process';
import { glob } from 'glob';
import { analyseFile } from './analyser';
import { diffFiles } from './diff';
import { renderTerminal, renderDiffTerminal, renderReport } from './reporters/terminal';
import { renderJSON, renderDiffJSON } from './reporters/json';
import { renderSARIF } from './reporters/sarif';
import { DiffResult, FileAnalysisResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const VALID_FORMATS = ['terminal', 'json', 'sarif'];
const VALID_FAIL_LEVELS = ['error', 'warning'];

const DEFAULT_IGNORES = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/storybook-static/**',
  // Declaration files contain no JSX and never carry a WCAG defect.
  '**/*.d.ts',
];

/** Repository root for the given file, or null when it is not inside a git repo. */
function findGitRoot(fromPath: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: fromPath,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** True when the ref resolves in this repository. */
function refExists(gitRoot: string, ref: string): boolean {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
      cwd: gitRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a file's content at a git ref.
 *
 * `git show <ref>:<path>` requires a path relative to the repository root —
 * an absolute path fails with "exists on disk, but not in <ref>". Passing the
 * absolute path made every lookup fail, every file look newly added, and the
 * regression gate fire on defects that were already in the baseline.
 *
 * Arguments go through execFileSync rather than a template string so a branch
 * name cannot break out into the shell.
 */
function readFileAtRef(
  gitRoot: string,
  ref: string,
  absoluteFilePath: string
): string | null {
  const repoRelative = relative(gitRoot, absoluteFilePath).split(sep).join('/');
  if (repoRelative.startsWith('..')) return null;

  try {
    return execFileSync('git', ['show', `${ref}:${repoRelative}`], {
      cwd: gitRoot,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    // Genuinely absent at that ref — a newly added file.
    return null;
  }
}

function writeOrPrint(content: string, outputPath?: string): void {
  if (outputPath) {
    writeFileSync(outputPath, content, 'utf-8');
  } else {
    console.log(content);
  }
}

const program = new Command();

program
  .name('qualm')
  .description(
    'Static AST-level accessibility linter for React/TypeScript.\n' +
    'Render-independent: finds WCAG defects in component source, with no DOM runtime.'
  )
  .version(pkg.version);

program
  .argument('<paths...>', 'Files or directories to analyse (supports .tsx, .ts, .jsx, .js)')
  .option('-f, --format <format>', `Output format: ${VALID_FORMATS.join(', ')}`, 'terminal')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('--diff-branch <branch>', 'Compare current files against git branch to detect regressions')
  .option('--fail-on <level>', `Exit with code 1 if violations of this severity exist: ${VALID_FAIL_LEVELS.join(', ')}`, 'error')
  .option('--ignore <globs...>', 'Additional glob patterns to exclude')
  .option('--report', 'Print a WCAG category breakdown across all analysed files')
  .action(async (paths: string[], options: {
    format: string;
    output?: string;
    diffBranch?: string;
    failOn: string;
    ignore?: string[];
    report?: boolean;
  }) => {
    try {
      if (!VALID_FORMATS.includes(options.format)) {
        console.error(
          `qualm: unknown format "${options.format}". Expected one of: ${VALID_FORMATS.join(', ')}.`
        );
        process.exitCode = 2;
        return;
      }

      if (!VALID_FAIL_LEVELS.includes(options.failOn)) {
        console.error(
          `qualm: unknown --fail-on level "${options.failOn}". Expected one of: ${VALID_FAIL_LEVELS.join(', ')}.`
        );
        process.exitCode = 2;
        return;
      }

      const ignore = [...DEFAULT_IGNORES, ...(options.ignore ?? [])];
      const files: string[] = [];

      for (const p of paths) {
        const resolved = resolve(p);

        if (!existsSync(resolved)) {
          console.error(`qualm: path not found: ${p}`);
          process.exitCode = 2;
          return;
        }

        // Decide by what the path *is*, not by its extension — a directory
        // named "components.js" is still a directory.
        if (statSync(resolved).isDirectory()) {
          const found = await glob('**/*.{tsx,ts,jsx,js}', {
            cwd: resolved,
            absolute: true,
            ignore,
            nodir: true,
            follow: false,
          });
          files.push(...found);
        } else if (SOURCE_EXTENSIONS.includes(extname(resolved))) {
          files.push(resolved);
        } else {
          console.error(
            `qualm: skipping ${p} — not a supported source file (${SOURCE_EXTENSIONS.join(', ')}).`
          );
        }
      }

      if (files.length === 0) {
        console.error('qualm: No TypeScript/React files found at the specified paths.');
        process.exitCode = 1;
        return;
      }

      const results: FileAnalysisResult[] = [];
      const diffs: DiffResult[] = [];
      const skipped: { file: string; reason: string }[] = [];

      let gitRoot: string | null = null;
      if (options.diffBranch) {
        gitRoot = findGitRoot(resolve(paths[0]));
        if (!gitRoot) {
          console.error(
            'qualm: --diff-branch requires the analysed path to be inside a git repository.'
          );
          process.exitCode = 2;
          return;
        }

        // Without this, an unresolvable ref silently reads as "every file is
        // new" — the gate would pass or fail for the wrong reason, and a typo
        // in a CI config would never be noticed.
        if (!refExists(gitRoot, options.diffBranch)) {
          console.error(
            `qualm: cannot resolve "${options.diffBranch}" in this repository. ` +
            'In CI, check out enough history for the ref to exist (actions/checkout with fetch-depth: 0).'
          );
          process.exitCode = 2;
          return;
        }
      }

      for (const file of files) {
        let source: string;
        try {
          source = readFileSync(file, 'utf-8');
        } catch (err: any) {
          skipped.push({ file, reason: err.message });
          continue;
        }

        try {
          if (options.diffBranch && gitRoot) {
            const beforeContent = readFileAtRef(gitRoot, options.diffBranch, file);
            diffs.push(diffFiles(beforeContent, source, file));
          } else {
            results.push(analyseFile(source, file));
          }
        } catch (err: any) {
          // A single unparseable file must not abort the run. qualm's premise is
          // 100% coverage; crashing on one exotic file defeats it in CI.
          skipped.push({ file, reason: err.message });
        }
      }

      if (skipped.length > 0) {
        console.error(`qualm: skipped ${skipped.length} file(s) that could not be parsed:`);
        for (const s of skipped) console.error(`  ${s.file}: ${s.reason}`);
      }

      if (options.diffBranch) {
        // Aggregate, then emit once. Writing inside the loop meant --output
        // ended up holding only the last file's diff.
        if (options.format === 'json') {
          writeOrPrint(renderDiffJSON(diffs), options.output);
        } else {
          for (const diff of diffs) renderDiffTerminal(diff);
        }

        process.exitCode = diffs.some(d => d.regressionDetected) ? 1 : 0;
        return;
      }

      if (options.report) {
        renderReport(results);
      } else if (options.format === 'json') {
        writeOrPrint(renderJSON(results), options.output);
      } else if (options.format === 'sarif') {
        writeOrPrint(renderSARIF(results, process.cwd()), options.output);
      } else {
        renderTerminal(results);
      }

      const hasFailure = results.some(r =>
        r.violations.some(v =>
          options.failOn === 'warning'
            ? v.severity === 'error' || v.severity === 'warning'
            : v.severity === 'error'
        )
      );

      // Assigning exitCode rather than calling process.exit() lets Node flush
      // stdout first; process.exit() truncates large piped output.
      process.exitCode = hasFailure ? 1 : 0;
    } catch (err: any) {
      console.error('qualm error:', err.message);
      process.exitCode = 2;
    }
  });

program.parse();
