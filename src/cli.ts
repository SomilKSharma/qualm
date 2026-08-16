#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { analyseFile } from './analyser';
import { diffFiles } from './diff';
import { renderTerminal, renderDiffTerminal, renderReport } from './reporters/terminal';
import { renderJSON, renderDiffJSON } from './reporters/json';
import { renderSARIF } from './reporters/sarif';
import { FileAnalysisResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

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
  .option('-f, --format <format>', 'Output format: terminal, json, sarif', 'terminal')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('--diff-branch <branch>', 'Compare current files against git branch to detect regressions')
  .option('--fail-on <level>', 'Exit with code 1 if violations of this severity exist: error, warning', 'error')
  .option('--report', 'Print a WCAG category breakdown across all analysed files')
  .action(async (paths: string[], options: {
    format: string;
    output?: string;
    diffBranch?: string;
    failOn: string;
    report?: boolean;
  }) => {
    try {
      const files: string[] = [];

      for (const p of paths) {
        const resolved = resolve(p);
        const ext = extname(resolved);

        if (['.tsx', '.ts', '.jsx', '.js'].includes(ext)) {
          files.push(resolved);
        } else {
          // Directory — glob for React/TS files
          const found = await glob(`${resolved}/**/*.{tsx,ts,jsx,js}`, {
            ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**']
          });
          files.push(...found);
        }
      }

      if (files.length === 0) {
        console.error('qualm: No TypeScript/React files found at the specified paths.');
        process.exit(1);
      }

      const results: FileAnalysisResult[] = [];
      const skipped: { file: string; reason: string }[] = [];
      let anyRegression = false;

      for (const file of files) {
        if (!existsSync(file)) continue;
        let source: string;
        try {
          source = readFileSync(file, 'utf-8');
        } catch (err: any) {
          skipped.push({ file, reason: err.message });
          continue;
        }

        try {
        if (options.diffBranch) {
          let beforeContent: string | null = null;
          try {
            beforeContent = execSync(`git show ${options.diffBranch}:${file}`, {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe']
            });
          } catch {
            beforeContent = null;
          }

          const diff = diffFiles(beforeContent, source, file);

          if (options.format === 'json') {
            const out = renderDiffJSON(diff);
            if (options.output) {
              writeFileSync(options.output, out, 'utf-8');
            } else {
              console.log(out);
            }
          } else {
            renderDiffTerminal(diff);
          }

          if (diff.regressionDetected) {
            anyRegression = true;
          }
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
        console.error(
          `qualm: skipped ${skipped.length} file(s) that could not be parsed:`
        );
        for (const s of skipped) console.error(`  ${s.file}: ${s.reason}`);
      }

      if (options.diffBranch) {
        process.exit(anyRegression ? 1 : 0);
      }

      if (!options.diffBranch && results.length > 0) {
        let output: string | null = null;

        if (options.report) {
          renderReport(results);
        } else if (options.format === 'json') {
          output = renderJSON(results);
        } else if (options.format === 'sarif') {
          output = renderSARIF(results);
        } else {
          renderTerminal(results);
        }

        if (output !== null) {
          if (options.output) {
            writeFileSync(options.output, output, 'utf-8');
          } else {
            console.log(output);
          }
        }
      }

      // Determine exit code
      if (!options.diffBranch) {
        const failLevel = options.failOn;
        const hasFailure = results.some(r =>
          r.violations.some(v => {
            if (failLevel === 'warning') {
              return v.severity === 'error' || v.severity === 'warning';
            }
            return v.severity === 'error';
          })
        );

        process.exit(hasFailure ? 1 : 0);
      }
    } catch (err: any) {
      console.error('qualm error:', err.message);
      process.exit(2);
    }
  });

program.parse();
