import { Rule } from '../types';
import { documentStructureRule } from './document-structure';
import { headingHierarchyRule } from './heading-hierarchy';
import { landmarkStructureRule } from './landmark-structure';
import { interactiveSemanticsRule } from './interactive-semantics';
import { ariaCorrectnessRule } from './aria-correctness';
import { formSemanticsRule } from './form-semantics';

export const activeRules: Rule[] = [
  documentStructureRule,
  headingHierarchyRule,
  landmarkStructureRule,
  interactiveSemanticsRule,
  ariaCorrectnessRule,
  formSemanticsRule
];

export { calculateComplexityMetrics } from './complexity';
