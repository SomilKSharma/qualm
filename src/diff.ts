import { analyseFile } from './analyser';
import { DiffResult, Violation, ViolationCategory } from './types';

// Fingerprint uses ruleId + column offset + snippet to identify a violation
// across refactors. Line numbers are intentionally excluded because they are
// unstable when code is reformatted; column + snippet provides sufficient
// structural identity within a file.
function fingerprintViolation(v: Violation): string {
  return `${v.ruleId}::${v.location.column}::${(v.snippet ?? '').slice(0, 60)}`;
}

export function diffFiles(
  beforeContent: string | null,
  afterContent: string,
  filePath: string
): DiffResult {
  const afterResult = analyseFile(afterContent, filePath);

  if (!beforeContent) {
    return {
      filePath,
      before: null,
      after: {
        violationsCount: afterResult.violations.length,
        semanticScore: afterResult.semanticScore,
        metrics: afterResult.metrics
      },
      deltaSemanticScore: 0,
      addedViolations: afterResult.violations,
      removedViolations: [],
      regressionDetected: afterResult.violations.length > 0,
      regressionCategories: [...new Set(afterResult.violations.map(v => v.category))] as ViolationCategory[]
    };
  }

  const beforeResult = analyseFile(beforeContent, filePath);

  const beforeFingerprints = new Set(beforeResult.violations.map(fingerprintViolation));
  const afterFingerprints = new Set(afterResult.violations.map(fingerprintViolation));

  const addedViolations = afterResult.violations.filter(
    v => !beforeFingerprints.has(fingerprintViolation(v))
  );
  const removedViolations = beforeResult.violations.filter(
    v => !afterFingerprints.has(fingerprintViolation(v))
  );

  const deltaSemanticScore = afterResult.semanticScore - beforeResult.semanticScore;

  const regressionDetected =
    deltaSemanticScore < 0 ||
    addedViolations.some(
      v => v.category === 'document_structure' || v.category === 'landmark_structure'
    );

  const regressionCategories = [
    ...new Set(addedViolations.map(v => v.category))
  ] as ViolationCategory[];

  return {
    filePath,
    before: {
      violationsCount: beforeResult.violations.length,
      semanticScore: beforeResult.semanticScore,
      metrics: beforeResult.metrics
    },
    after: {
      violationsCount: afterResult.violations.length,
      semanticScore: afterResult.semanticScore,
      metrics: afterResult.metrics
    },
    deltaSemanticScore,
    addedViolations,
    removedViolations,
    regressionDetected,
    regressionCategories
  };
}
