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

/**
 * One document for the whole run. Emitting a separate object per file produced
 * a concatenated stream that no JSON parser would accept.
 */
export function renderDiffJSON(diffs: DiffResult[]): string {
  return JSON.stringify({
    summary: {
      comparedFiles: diffs.length,
      filesWithRegression: diffs.filter(d => d.regressionDetected).length,
      addedViolations: diffs.reduce((a, d) => a + d.addedViolations.length, 0),
      removedViolations: diffs.reduce((a, d) => a + d.removedViolations.length, 0),
      regressionDetected: diffs.some(d => d.regressionDetected)
    },
    files: diffs
  }, null, 2);
}
