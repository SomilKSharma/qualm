import { FileAnalysisResult, DiffResult } from '../types';

export function renderJSON(results: FileAnalysisResult[]): string {
  return JSON.stringify({
    summary: {
      scannedFiles: results.length,
      totalViolations: results.reduce((a, r) => a + r.violations.length, 0),
      globalSemanticScore: results.length > 0
        ? results.reduce((a, r) => a + r.semanticScore, 0) / results.length
        : 1.0
    },
    results
  }, null, 2);
}

export function renderDiffJSON(diff: DiffResult): string {
  return JSON.stringify(diff, null, 2);
}
