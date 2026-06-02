import { TSESTree } from '@typescript-eslint/utils';
import { Rule } from '../types';

const LANDMARK_PATTERNS: { pattern: RegExp; suggestion: string }[] = [
  { pattern: /\bnav(igation|bar)?\b/i, suggestion: '<nav>' },
  { pattern: /\b(header|masthead|banner)\b/i, suggestion: '<header>' },
  { pattern: /\b(footer|foot)\b/i, suggestion: '<footer>' },
  { pattern: /\b(main|primary-content|page-content)\b/i, suggestion: '<main>' },
  { pattern: /\b(aside|sidebar|complementary)\b/i, suggestion: '<aside>' },
  { pattern: /\b(article|post|entry|blog-post)\b/i, suggestion: '<article>' },
];

function getAttrStringValue(attr: TSESTree.JSXAttribute): string | null {
  if (!attr.value) return null;
  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }
  return null;
}

export const landmarkStructureRule: Rule = {
  id: 'landmark-structure',
  category: 'landmark_structure',
  severity: 'warning',
  meta: {
    description: 'Replace generic containers that serve landmark roles with semantic HTML5 elements'
  },
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
        if (name !== 'div' && name !== 'span') return;

        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute') continue;
          const attrName = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
          // Only match className — id values are too often scroll anchors or JS hooks
          // (e.g. id="onboarding-checklist-header") and produce false positives.
          if (attrName !== 'className') continue;

          const value = getAttrStringValue(attr);
          if (!value) continue;

          for (const { pattern, suggestion } of LANDMARK_PATTERNS) {
            if (pattern.test(value)) {
              context.report({
                message: `<${name} ${attrName}="${value}"> appears to serve a landmark role. Use the semantic element ${suggestion} instead.`,
                fixSuggestion: `Replace <${name}> with ${suggestion} to provide explicit landmark navigation for assistive technology users.`,
                location: context.getLoc(node),
                snippet: context.getSourceCode(node)
              });
              return;
            }
          }
        }
      }
    };
  }
};
