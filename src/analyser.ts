import { simpleTraverse } from '@typescript-eslint/typescript-estree';
import { parseTSX } from './parser';
import { activeRules } from './rules/index';
import { calculateComplexityMetrics } from './rules/complexity';
import {
  FileAnalysisResult,
  Violation,
  ViolationCategory,
  RuleContext,
  CATEGORY_WEIGHTS
} from './types';

export function analyseFile(sourceCode: string, filePath: string): FileAnalysisResult {
  const ast = parseTSX(sourceCode, filePath);
  const violations: Violation[] = [];

  const createContext = (
    ruleId: string,
    category: ViolationCategory,
    severity: Violation['severity']
  ): RuleContext => ({
    report(v) {
      violations.push({ ...v, ruleId, category, severity });
    },
    getSourceCode(node: any) {
      if (node.range) {
        return sourceCode.slice(node.range[0], node.range[1]);
      }
      return '';
    },
    getLoc(node: any) {
      return {
        line: node.loc.start.line,
        column: node.loc.start.column,
        lineEnd: node.loc.end.line,
        columnEnd: node.loc.end.column
      };
    }
  });

  // Build a listener map: nodeType -> list of callbacks
  const listeners: Record<string, ((node: any) => void)[]> = {};

  for (const rule of activeRules) {
    const ctx = createContext(rule.id, rule.category, rule.severity);
    const ruleListeners = rule.create(ctx);
    for (const [nodeType, callback] of Object.entries(ruleListeners)) {
      if (!listeners[nodeType]) listeners[nodeType] = [];
      listeners[nodeType].push(callback as (node: any) => void);
    }
  }

  // Collect Program:exit callbacks separately — they run after traversal
  const exitCallbacks = listeners['Program:exit'] ?? [];
  delete listeners['Program:exit'];

  simpleTraverse(ast, {
    enter(node) {
      const callbacks = listeners[node.type];
      if (callbacks) {
        for (const cb of callbacks) cb(node);
      }
    }
  });

  // Fire Program:exit listeners
  for (const cb of exitCallbacks) {
    cb(ast);
  }

  const metrics = calculateComplexityMetrics(ast, sourceCode);

  // Weighted semantic score using paper β coefficients from Table 5 (Sharma 2026).
  // Each violation deducts (weight_i / Σweight) * 0.05 from the score.
  // The 0.05-per-violation constant is calibrated so that the treated-post mean
  // of ~0.983 (Table A1) is reachable with a small number of violations.
  const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);

  const violationsByCategory = violations.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<ViolationCategory, number>>);

  let totalDeduction = 0;
  for (const [category, count] of Object.entries(violationsByCategory)) {
    const weightRaw = CATEGORY_WEIGHTS[category as ViolationCategory] ?? 0;
    const weight = weightRaw / totalWeight;
    totalDeduction += weight * (count as number) * 0.05;
  }

  const semanticScore = Math.max(0.0, Math.min(1.0, 1.0 - totalDeduction));

  return { filePath, violations, metrics, semanticScore };
}
