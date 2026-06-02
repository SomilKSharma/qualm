#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';
import { analyseFile } from './analyser';
import { diffFiles } from './diff';
import { renderTerminal, renderDiffTerminal, renderResearchMode } from './reporters/terminal';
import { renderJSON, renderDiffJSON } from './reporters/json';
import { renderSARIF } from './reporters/sarif';
import { FileAnalysisResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('qualm')
  .description(
    'Static AST-level quality analyser for LLM-generated React/TypeScript code.\n' +
    'Based on Sharma (2026) empirical study: https://doi.org/10.5281/zenodo.20482307'
  )
  .version(pkg.version);

program
  .argument('<paths...>', 'Files or directories to analyse (supports .tsx, .ts, .jsx, .js)')
  .option('-f, --format <format>', 'Output format: terminal, json, sarif', 'terminal')
  .option('-o, --output <file>', 'Write output to file instead of stdout')
  .option('--diff-branch <branch>', 'Compare current files against git branch to detect regressions')
  .option('--fail-on <level>', 'Exit with code 1 if violations of this severity exist: error, warning', 'error')
  .option('--research-mode', 'Output metrics in Sharma (2026) taxonomy format')
  .action(async (paths: string[], options: {
    format: string;
    output?: string;
    diffBranch?: string;
    failOn: string;
    researchMode?: boolean;
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

      for (const file of files) {
        if (!existsSync(file)) continue;
        const source = readFileSync(file, 'utf-8');

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
            process.exit(1);
          }
        } else {
          results.push(analyseFile(source, file));
        }
      }

      if (!options.diffBranch && results.length > 0) {
        let output: string | null = null;

        if (options.researchMode) {
          renderResearchMode(results);
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
