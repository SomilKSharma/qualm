import chalk from 'chalk';
import { FileAnalysisResult, DiffResult, PAPER_BETA_COEFFICIENTS, ViolationCategory } from '../types';

export function renderTerminal(results: FileAnalysisResult[]): void {
  const totalViolations = results.reduce((a, r) => a + r.violations.length, 0);
  const avgScore = results.length > 0
    ? results.reduce((a, r) => a + r.semanticScore, 0) / results.length
    : 1.0;

  console.log(chalk.bold.cyan('\n qualm — Static Quality Analysis\n'));
  console.log(`Scanned ${chalk.bold(String(results.length))} file(s) · ${chalk.bold(String(totalViolations))} violation(s) found\n`);

  for (const result of results) {
    if (result.violations.length === 0) {
      console.log(chalk.green(`✓ ${result.filePath}`));
      continue;
    }

    console.log(chalk.bold.white(`\n${result.filePath}`));

    for (const v of result.violations) {
      const icon = v.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
      const loc = chalk.dim(`[${v.location.line}:${v.location.column}]`);
      const cat = chalk.dim(`[${v.category}]`);
      const sev = v.severity === 'error' ? chalk.red(v.severity) : chalk.yellow(v.severity);
      console.log(`  ${icon} ${loc} ${cat} ${sev}: ${v.message}`);
      console.log(`     ${chalk.cyan('→')} ${v.fixSuggestion}`);
      if (v.snippet) console.log(`     ${chalk.dim(v.snippet.trim().slice(0, 120))}`);
    }
  }

  console.log(chalk.bold('\n📊 Summary — Sharma (2026) Taxonomy'));
  console.log('─'.repeat(60));
  console.log(`Mean Semantic Score    : ${chalk.bold(avgScore.toFixed(4))} ${chalk.dim('(paper baseline: treated-pre=0.989, treated-post=0.983)')}`);
}

export function renderDiffTerminal(diff: DiffResult): void {
  const icon = diff.regressionDetected
    ? chalk.red('REGRESSION DETECTED')
    : chalk.green('✓ No regression');
  console.log(`\n${icon} · ${diff.filePath}`);
  console.log(`  Semantic Score: ${diff.before?.semanticScore.toFixed(4) ?? 'N/A'} → ${diff.after.semanticScore.toFixed(4)} (Δ ${diff.deltaSemanticScore.toFixed(4)})`);
  console.log(`  Violations: ${diff.before?.violationsCount ?? 0} → ${diff.after.violationsCount}`);

  if (diff.addedViolations.length > 0) {
    console.log(chalk.red(`\n  Added violations (${diff.addedViolations.length}):`));
    for (const v of diff.addedViolations) {
      console.log(`    + [${v.category}] ${v.message}`);
    }
  }

  if (diff.removedViolations.length > 0) {
    console.log(chalk.green(`\n  Removed violations (${diff.removedViolations.length}):`));
    for (const v of diff.removedViolations) {
      console.log(`    - [${v.category}] ${v.message}`);
    }
  }
}

export function renderResearchMode(results: FileAnalysisResult[]): void {
  console.log(chalk.bold.cyan('\nqualm Research Mode — Sharma (2026) Taxonomy\n'));
  console.log('─'.repeat(80));
  console.log(
    `${'Category'.padEnd(28)} | ${'Violations'.padEnd(12)} | ${'β (paper)'.padEnd(12)} | Weighted Score`
  );
  console.log('─'.repeat(80));

  const allViolations = results.flatMap(r => r.violations);
  const totalBeta = Object.values(PAPER_BETA_COEFFICIENTS).reduce((a, b) => a + b, 0);
  let compositeScore = 0;

  for (const [category, beta] of Object.entries(PAPER_BETA_COEFFICIENTS) as [ViolationCategory, number][]) {
    const count = allViolations.filter(v => v.category === category).length;
    const weight = beta / totalBeta;
    const weighted = weight * count * 0.05;
    compositeScore += weighted;

    const betaStr = (beta >= 0 ? '+' : '') + beta.toFixed(3);
    console.log(
      `${category.padEnd(28)} | ${String(count).padEnd(12)} | ${betaStr.padEnd(12)} | ${weighted.toFixed(4)}`
    );
  }

  console.log('─'.repeat(80));
  const avgBaseline = results.length > 0
    ? results.reduce((a, r) => a + r.semanticScore, 0) / results.length
    : 1.0;
  console.log(
    `${'Composite Regression Score'.padEnd(28)} | ${compositeScore.toFixed(4).padEnd(12)} | ${'Baseline'.padEnd(12)} | ${avgBaseline.toFixed(4)}`
  );
  console.log('─'.repeat(80));
  console.log(chalk.dim('Paper baseline (Table A1): treated-pre AST score = 0.989, treated-post = 0.983'));
}
