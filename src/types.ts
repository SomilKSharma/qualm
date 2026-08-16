export type Severity = 'error' | 'warning' | 'info';

export type ViolationCategory =
  | 'document_structure'
  | 'heading_hierarchy'
  | 'landmark_structure'
  | 'interactive_semantics'
  | 'aria_correctness'
  | 'form_semantics';

export interface Location {
  line: number;
  column: number;
  lineEnd?: number;
  columnEnd?: number;
}

export interface Violation {
  ruleId: string;
  category: ViolationCategory;
  severity: Severity;
  message: string;
  fixSuggestion: string;
  location: Location;
  snippet?: string;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maxJsxNestingDepth: number;
  linesOfCode: number;
  nodeCount: number;
  propsCount: number;
  propDrillingDepth: number;
}

export interface FileAnalysisResult {
  filePath: string;
  violations: Violation[];
  metrics: ComplexityMetrics;
  semanticScore: number;
}

export interface DiffResult {
  filePath: string;
  before: { violationsCount: number; semanticScore: number; metrics: ComplexityMetrics } | null;
  after: { violationsCount: number; semanticScore: number; metrics: ComplexityMetrics };
  deltaSemanticScore: number;
  addedViolations: Violation[];
  removedViolations: Violation[];
  regressionDetected: boolean;
  regressionCategories: ViolationCategory[];
}

export interface Rule {
  id: string;
  category: ViolationCategory;
  severity: Severity;
  meta: {
    description: string;
    docsUrl?: string;
  };
  create(context: RuleContext): Record<string, (node: any) => void>;
}

export interface RuleContext {
  report(violation: Omit<Violation, 'ruleId' | 'category' | 'severity'>): void;
  getSourceCode(node: any): string;
  getLoc(node: any): Location;
}

export class QualmParserError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly filePath: string
  ) {
    super(message);
    this.name = 'QualmParserError';
  }
}

// Category weights are SEVERITY-based, not effect-size based.
//
// An earlier version weighted these by per-category DiD coefficients taken from
// the originating 74-repo study. That is withdrawn: none of those per-category
// estimates was statistically significant, three of the six weights were
// interpolated rather than measured, and the 446-repo follow-up returns a null
// on every WCAG category (Sharma 2026, Table 5 reports BH-adjusted q = 0.658 on
// every axis). There is therefore no empirical basis for ranking categories by
// estimated effect size, and qualm does not attempt to.
//
// Weights now follow WCAG user impact, mirroring the severity-weighted axis of
// that study: error = 2, warning = 1. See RESEARCH.md.
export const CATEGORY_WEIGHTS: Record<ViolationCategory, number> = {
  document_structure:    2, // error   — interactive element unreachable by keyboard
  interactive_semantics: 2, // error   — unlabelled image or control
  aria_correctness:      2, // error   — malformed ARIA is worse than absent ARIA
  form_semantics:        2, // error   — control with no accessible name
  landmark_structure:    1, // warning — navigation is harder, not impossible
  heading_hierarchy:     1, // warning — document outline degraded
};
