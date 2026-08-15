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

// β coefficients from Sharma (2026) Table 5 — DiD estimates by axe-core violation category.
// The paper reports three direct categories. The remaining three (heading_hierarchy,
// landmark_structure, form_semantics) are derived from the semantic_naming β split
// and the document_structure finding. Weights are normalised so total β sums to a
// meaningful composite. See RESEARCH.md for derivation.
//
// Direct from Table 5:
//   document_structure:   β = +0.007  (largest point estimate — dominant AI-gen failure mode)
//   aria_correctness:     β = +0.002  (aria_specific in paper taxonomy)
//   interactive_semantics: β = −0.003 (semantic_naming in paper; negative = AI may IMPROVE naming)
//
// Derived (no individual paper estimate; set to plausible midpoints):
//   heading_hierarchy:    β = +0.003
//   landmark_structure:   β = +0.004  (structural, close to document_structure)
//   form_semantics:       β = +0.002  (similar to aria_correctness)
export const CATEGORY_WEIGHTS: Record<ViolationCategory, number> = {
  // Severity-based, NOT effect-size based. Earlier versions weighted these by
  // per-category DiD coefficients from the 74-repo study, but none of those
  // estimates was statistically significant (p = 0.15, 0.56, 0.82), three of the
  // six weights were interpolated rather than measured, and the 446-repo
  // follow-up returns a null on every WCAG category. There is therefore no
  // empirical basis for ranking categories by estimated effect size.
  //
  // Weights now follow WCAG user impact, mirroring the severity-weighted axis
  // of the follow-up study: error = 2, warning = 1.
  document_structure:    2, // error   — interactive element unreachable by keyboard
  interactive_semantics: 2, // error   — unlabelled image or control
  aria_correctness:      2, // error   — malformed ARIA is worse than absent ARIA
  form_semantics:        2, // error   — control with no accessible name
  landmark_structure:    1, // warning — navigation is harder, not impossible
  heading_hierarchy:     1, // warning — document outline degraded
};
